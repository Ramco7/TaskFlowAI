// Real-model endpoint used by the AI panel.
// Local FastAPI (run-ai.cmd) -> same-origin /api/extract.
// CloudBase deployment -> event function HTTP access service.
var isLocalPage = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
window.TASKFLOW_AI_API_URL = isLocalPage
  ? "/api/extract"
  : "https://bumpy-damselfly-d5fm66ql428df3c9-1516532038.ap-shanghai.app.tcloudbase.com/api/extract";
