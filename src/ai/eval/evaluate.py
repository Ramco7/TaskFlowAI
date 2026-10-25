"""Audit gold labels or score a real extraction API against 100 labeled texts."""

from __future__ import annotations

import argparse
import asyncio
import json
from datetime import datetime
from pathlib import Path

import httpx

from src.ai.server.app import validate_output


SAMPLES = Path(__file__).with_name("samples.jsonl")


def load_samples() -> list[dict]:
    samples = [json.loads(line) for line in SAMPLES.read_text(encoding="utf-8").splitlines() if line]
    if len(samples) != 100 or len({row["id"] for row in samples}) != 100:
        raise ValueError("expected 100 unique labeled samples")
    for row in samples:
        validate_output(row["expected"], row["input"]["text"])
    return samples


def span(text: str, evidence: str) -> set[int]:
    position = text.find(evidence)
    return set(range(position, position + len(evidence))) if position >= 0 else set()


def matches(text: str, gold: list[dict], predicted: list[dict]) -> list[tuple[int, int]]:
    candidates = []
    for gi, g in enumerate(gold):
        gs = span(text, g["evidence"])
        for pi, p in enumerate(predicted):
            if g["type"] != p["type"]:
                continue
            ps = span(text, p["evidence"])
            overlap = len(gs & ps) / min(len(gs), len(ps)) if gs and ps else 0
            if overlap >= 0.5:
                candidates.append((overlap, gi, pi))
    paired = []
    used_g, used_p = set(), set()
    for _, gi, pi in sorted(candidates, reverse=True):
        if gi not in used_g and pi not in used_p:
            paired.append((gi, pi)); used_g.add(gi); used_p.add(pi)
    return paired


def same_time(left: str | None, right: str | None) -> bool:
    if left is None or right is None:
        return left == right
    return datetime.fromisoformat(left.replace("Z", "+00:00")) == datetime.fromisoformat(right.replace("Z", "+00:00"))


def score(samples: list[dict], predictions: dict[str, dict]) -> dict:
    tp = fp = fn = 0
    fields = {name: [0, 0] for name in ("start_at", "due_at", "location", "assignee", "priority", "time_precision")}
    asserted = unsupported = 0
    failures = []
    latencies = []
    for row in samples:
        predicted = predictions.get(row["id"])
        if predicted is None or "items" not in predicted:
            failures.append({"id": row["id"], "error": predicted.get("error") if predicted else "missing prediction"}); continue
        try:
            validate_output({"items": predicted["items"]}, row["input"]["text"])
        except (ValueError, TypeError) as exc:
            failures.append(f"{row['id']}: {exc}"); continue
        if isinstance(predicted.get("durationMs"), (int, float)):
            latencies.append(predicted["durationMs"])
        text = row["input"]["text"]
        gold_items, pred_items = row["expected"]["items"], predicted["items"]
        pairs = matches(text, gold_items, pred_items)
        tp += len(pairs); fp += len(pred_items) - len(pairs); fn += len(gold_items) - len(pairs)
        for gi, pi in pairs:
            g, p = gold_items[gi], pred_items[pi]
            for name, counts in fields.items():
                if name in ("start_at", "due_at", "location", "assignee") and g[name] is None and p[name] is None:
                    continue
                counts[1] += 1
                correct = same_time(g[name], p[name]) if name in ("start_at", "due_at") else g[name] == p[name]
                counts[0] += int(correct)
        for p in pred_items:
            for name in ("evidence", "location", "assignee", "date_expression"):
                value = p.get(name)
                if value:
                    asserted += 1
                    unsupported += int(value not in text)
    if failures:
        return {"status": "incomplete", "failed_samples": failures, "reason": "No accuracy metrics are reported until all 100 predictions validate."}
    precision = tp / (tp + fp) if tp + fp else 1.0
    recall = tp / (tp + fn) if tp + fn else 1.0
    ordered_latency = sorted(latencies)
    def percentile(fraction: float) -> int | None:
        if not ordered_latency:
            return None
        index = round((len(ordered_latency) - 1) * fraction)
        return round(ordered_latency[index])
    return {
        "status": "complete", "sampleCount": len(samples), "goldItems": sum(len(r["expected"]["items"]) for r in samples),
        "truePositive": tp, "falsePositive": fp, "falseNegative": fn,
        "precision": round(precision, 4), "recall": round(recall, 4),
        "f1": round(2 * precision * recall / (precision + recall), 4) if precision + recall else 0,
        "fieldAccuracy": {name: round(ok / total, 4) if total else None for name, (ok, total) in fields.items()},
        "unsupportedSourceFieldRate": round(unsupported / asserted, 4) if asserted else 0,
        "latencyMs": {"p50": percentile(0.5), "p95": percentile(0.95)},
        "metricNote": "Unsupported-source rate checks quoted evidence/location/assignee/date expression; inferred dates are judged against gold labels.",
    }


async def collect_predictions(samples: list[dict], url: str, concurrency: int) -> dict[str, dict]:
    predictions = {}
    sem = asyncio.Semaphore(concurrency)
    completed = 0
    async with httpx.AsyncClient(timeout=90) as client:
        async def one(row: dict) -> None:
            nonlocal completed
            async with sem:
                try:
                    response = await client.post(url, json=row["input"])
                    data = response.json()
                    if response.is_success:
                        predictions[row["id"]] = data
                    else:
                        predictions[row["id"]] = {"error": {"httpStatus": response.status_code, "code": data.get("error", {}).get("code")}}
                except (httpx.HTTPError, ValueError) as exc:
                    predictions[row["id"]] = {"error": type(exc).__name__}
                completed += 1
                if completed % 10 == 0 or completed == len(samples):
                    print(f"completed {completed}/{len(samples)}", flush=True)
        await asyncio.gather(*(one(row) for row in samples))
    return predictions


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", help="POST /api/extract URL for real-model evaluation")
    parser.add_argument("--predictions", type=Path, help="JSON file mapping sample ID to extraction output")
    parser.add_argument("--save-predictions", type=Path, help="Save API outputs for reproducibility")
    parser.add_argument("--concurrency", type=int, default=4, help="Concurrent API calls; default 4")
    args = parser.parse_args()
    samples = load_samples()
    print(f"Gold audit passed: {len(samples)} unique samples, {sum(len(r['expected']['items']) for r in samples)} labeled items")
    if not args.url and not args.predictions:
        return
    if args.url and args.predictions:
        parser.error("choose either --url or --predictions")
    if not 1 <= args.concurrency <= 8:
        parser.error("--concurrency must be between 1 and 8")
    if args.predictions:
        predictions = json.loads(args.predictions.read_text(encoding="utf-8"))
    else:
        predictions = asyncio.run(collect_predictions(samples, args.url, args.concurrency))
        if args.save_predictions:
            args.save_predictions.write_text(json.dumps(predictions, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(score(samples, predictions), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
