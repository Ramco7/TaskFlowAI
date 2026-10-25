# CloudBase AI function

`index.js` is the public `POST /api/extract` adapter. It uses the same Qwen
model, system prompt, JSON Schema, evidence check and error codes as the local
FastAPI service, but has no npm dependencies and runs on `Nodejs18.15`.

## Endpoint

```text
https://bumpy-damselfly-d5fm66ql428df3c9-1516532038.ap-shanghai.app.tcloudbase.com/api/extract
```

`cloudbaserc.json` declares both the function and the `/api/extract` gateway
route. `src/ai/ai-config.js` points the public page at this endpoint; localhost
still uses the local FastAPI service.

## Deploy

Set `BDCCP_API` in the function environment first (CloudBase console → 云函数 →
`ai-extract` → 函数配置 → 环境变量). Never commit the key.

```powershell
cd taskflow
.\src\ai\cloud_function\deploy.cmd
```

The script:

1. stages `index.js`, `package.json`, and `extraction.schema.json`;
2. deploys/updates the `ai-extract` event function;
3. applies the `/api/extract` gateway route from `cloudbaserc.json`.

## Verify

```powershell
Invoke-WebRequest `
  -Method Post `
  -Uri "https://bumpy-damselfly-d5fm66ql428df3c9-1516532038.ap-shanghai.app.tcloudbase.com/api/extract" `
  -ContentType "application/json" `
  -Body '{"text":"明天提交报告","sourceType":"chat","receivedAt":"2026-10-25T09:30:00+08:00","timezone":"Asia/Shanghai"}'
```

Without `BDCCP_API`, the endpoint returns `503 API_KEY_MISSING`. With a valid key,
it returns the same `{ items, model, durationMs, referenceTime, referenceSource }`
shape as the local service.

## Limits

- 20,000 character input limit;
- 10 requests/minute per function instance by default (`AI_RATE_LIMIT_PER_MINUTE`);
- CORS allows `*`;
- for production, add CloudBase authentication/API Gateway throttling and rotate
  the key if it is ever exposed.
