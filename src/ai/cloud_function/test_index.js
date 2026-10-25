"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const handler = require("./index").main;
const root = path.join(__dirname, "..", "..", "..");
const sampleInput = JSON.parse(fs.readFileSync(path.join(root, "mock", "ai-input.json"), "utf8"));
const sampleOutput = JSON.parse(fs.readFileSync(path.join(root, "mock", "ai-output.json"), "utf8"));

function event(body, method = "POST") {
  return {
    httpMethod: method,
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.20" },
    body: JSON.stringify(body),
    isBase64Encoded: false,
  };
}

function parsed(response) {
  return JSON.parse(response.body);
}

test("OPTIONS returns CORS", async () => {
  const response = await handler({ httpMethod: "OPTIONS", headers: {} });
  assert.equal(response.statusCode, 204);
  assert.equal(response.headers["Access-Control-Allow-Origin"], "*");
});

test("valid request returns items", async () => {
  process.env.BDCCP_API = "test-key";
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(sampleOutput) } }] }) });
  try {
    const response = await handler(event(sampleInput));
    assert.equal(response.statusCode, 200);
    assert.equal(parsed(response).items.length, 4);
    assert.equal(parsed(response).model, "qwen3.8-flash");
  } finally {
    global.fetch = originalFetch;
  }
});

test("missing key returns 503", async () => {
  process.env.BDCCP_API = "";
  const response = await handler(event(sampleInput));
  assert.equal(response.statusCode, 503);
  assert.equal(parsed(response).error.code, "API_KEY_MISSING");
});

test("invalid evidence retries then fails", async () => {
  process.env.BDCCP_API = "test-key";
  const invalid = JSON.parse(JSON.stringify(sampleOutput));
  invalid.items[0].evidence = "不存在的原文";
  let calls = 0;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    calls += 1;
    return { ok: true, json: async () => ({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(invalid) } }] }) };
  };
  try {
    const response = await handler(event(sampleInput));
    assert.equal(response.statusCode, 502);
    assert.equal(calls, 2);
  } finally {
    global.fetch = originalFetch;
  }
});
