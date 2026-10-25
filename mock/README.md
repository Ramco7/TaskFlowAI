# Mock Data

三个 Feature 的联调数据都放在这里。**Mock 数据不写入线上环境**。

| 文件 | 用途 | 使用方 |
|---|---|---|
| `tasks.json` | 12 条任务，覆盖优先级、截止时间、逾期、完成态 | Feature 1 / 3 |
| `ai-input.json` | 一段含多个待办/日程/备忘的聊天文本 | Feature 2 |
| `ai-output.json` | 对应的期望结构化结果 | Feature 2 |
| `analytics.json` | Dashboard 统计结果的形状 | Feature 3 |

## 使用方式

- **Feature 1**：把 `tasks.json` 当作云端数据库初始数据，导入后验证 CRUD 和同步。
- **Feature 2**：用 `ai-input.json` 调提取接口，比对 `ai-output.json` 的字段和证据。
- **Feature 3**：先用 `analytics.json` 做图表，再切到 `TaskFlow.getTasks()` 实时计算。

## 约束

- Mock 里的时间统一用 ISO 8601；`dueAt` 用 UTC 或带时区偏移都可以，前端统一转本地显示。
- `dueHasTime: false` 表示“全天”，按当天 23:59 判定逾期。
- 不要把真实用户聊天记录、手机号、邮箱提交到 Git。
