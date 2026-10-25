import json
import os
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from src.ai.server.app import ExtractRequest, app, normalize_output, sanitize_source_fields, validate_output
from src.ai.eval.evaluate import load_samples


ROOT = Path(__file__).resolve().parents[3]
SAMPLE_INPUT = json.loads((ROOT / "mock/ai-input.json").read_text(encoding="utf-8"))
SAMPLE_OUTPUT = json.loads((ROOT / "mock/ai-output.json").read_text(encoding="utf-8"))


class ExtractionTests(unittest.TestCase):
    def test_real_endpoint_contract_with_stubbed_model(self):
        with patch.dict(os.environ, {"BDCCP_API": "test-key"}):
            with patch("src.ai.server.app.call_qwen", new=AsyncMock(return_value=SAMPLE_OUTPUT)) as model_call:
                response = TestClient(app).post("/api/extract", json=SAMPLE_INPUT)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["model"], "qwen3.8-flash")
        self.assertEqual(len(response.json()["items"]), 4)
        self.assertEqual(response.json()["referenceSource"], "receivedAt")
        self.assertEqual(model_call.await_count, 1)

    def test_missing_key_has_clear_error(self):
        with patch.dict(os.environ, {"BDCCP_API": ""}):
            response = TestClient(app).post("/api/extract", json=SAMPLE_INPUT)
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "API_KEY_MISSING")

    def test_schema_and_evidence(self):
        result = validate_output(SAMPLE_OUTPUT, SAMPLE_INPUT["text"])
        self.assertEqual(len(result.items), 4)
        corrupted = {"items": [dict(SAMPLE_OUTPUT["items"][0], evidence="不存在的原文")]}
        with self.assertRaises(ValueError):
            validate_output(corrupted, SAMPLE_INPUT["text"])
        missing = dict(SAMPLE_OUTPUT["items"][0])
        missing.pop("priority")
        with self.assertRaises(ValueError):
            validate_output({"items": [missing]}, SAMPLE_INPUT["text"])
        naive = dict(SAMPLE_OUTPUT["items"][0], due_at="2026-10-26T20:00:00")
        with self.assertRaises(ValueError):
            validate_output({"items": [naive]}, SAMPLE_INPUT["text"])

    def test_unsupported_source_fields_are_cleared(self):
        candidate = dict(SAMPLE_OUTPUT["items"][0], date_expression="relative", location="不存在的地点")
        sanitized = sanitize_source_fields({"items": [candidate]}, SAMPLE_INPUT["text"])["items"][0]
        self.assertIsNone(sanitized["date_expression"])
        self.assertIsNone(sanitized["location"])
        self.assertTrue(sanitized["needs_review"])

    def test_day_deadline_and_ambiguous_assignee_are_normalized(self):
        payload = ExtractRequest.model_validate(SAMPLE_INPUT)
        raw = {"items": [dict(SAMPLE_OUTPUT["items"][0], assignee="班长", evidence="请在11月5日前提交项目报告", date_expression="11月5日", time_precision="day", due_at="2026-11-05T00:00:00+08:00")]}
        item = normalize_output(raw, payload)["items"][0]
        self.assertIsNone(item["assignee"])
        self.assertEqual(item["due_at"], "2026-11-05T23:59:00+08:00")
        self.assertTrue(item["needs_review"])

    def test_relative_date_and_explicit_clock(self):
        payload = ExtractRequest.model_validate(SAMPLE_INPUT)
        event = dict(SAMPLE_OUTPUT["items"][1], start_at="2026-11-03T10:00:00+08:00")
        corrected = normalize_output({"items": [event]}, payload)["items"][0]
        self.assertEqual(corrected["start_at"], "2026-10-27T10:00:00+08:00")
        self.assertTrue(corrected["needs_review"])
        task = dict(SAMPLE_OUTPUT["items"][0], evidence="周一18点前完成项目报告", due_at="2026-10-26T18:00:00+08:00", time_precision="day")
        kept = normalize_output({"items": [task]}, payload)["items"][0]
        self.assertEqual(kept["time_precision"], "minute")
        self.assertEqual(kept["due_at"], "2026-10-26T18:00:00+08:00")

    def test_invalid_model_evidence_fails_after_one_retry(self):
        invalid = {"items": [dict(SAMPLE_OUTPUT["items"][0], evidence="不存在的原文")]}
        with patch.dict(os.environ, {"BDCCP_API": "test-key"}):
            with patch("src.ai.server.app.call_qwen", new=AsyncMock(return_value=invalid)) as model_call:
                response = TestClient(app).post("/api/extract", json=SAMPLE_INPUT)
        self.assertEqual(response.status_code, 502)
        self.assertEqual(model_call.await_count, 2)

    def test_input_rejects_bad_timezone(self):
        response = TestClient(app).post("/api/extract", json=dict(SAMPLE_INPUT, timezone="Invalid/Zone"))
        self.assertEqual(response.status_code, 422)

    def test_gold_dataset(self):
        self.assertEqual(len(load_samples()), 100)

    def test_static_file_allowlist(self):
        client = TestClient(app)
        self.assertEqual(client.get("/").status_code, 200)
        self.assertEqual(client.get("/src/ai/ai-panel.js").status_code, 200)
        self.assertEqual(client.get("/mock/ai-input.json").status_code, 404)
        self.assertEqual(client.get("/.env").status_code, 404)


if __name__ == "__main__":
    unittest.main()
