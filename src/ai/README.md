# src/ai

Feature 2 的代码目录。

建议文件：

```text
src/ai/
  README.md
  extraction.schema.json
  ai-panel.js       # 粘贴、预览、确认
  ai.css
  mock.js           # mock 模式
  server/           # 本地 FastAPI/Node 服务（可选）
```

## 本地模式

- `mock.js`：直接返回 `mock/ai-output.json`，用于 UI 开发；
- 本地服务：`POST /api/extract`，Key 放 `.env`；
- 前端不要直接调模型 API，避免 Key 泄露。

## 集成约定

- 确认后调用 `window.TaskFlow.addTasks(items)`；
- 候选数据必须符合 `extraction.schema.json`；
- `priority` 的 high/normal/low 在写入前映射为 1/2/3；
- `event`/`note` 如果当前任务模型不支持，先映射为 task + 标题前缀，或在数据契约中扩展 `type` 字段（需项目负责人确认）。

## 交付前

- [ ] `docs/AI-EVAL.md`
- [ ] 100 条样本
- [ ] 提示词注入测试
- [ ] 预览/确认截图
