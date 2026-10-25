# 数据契约

三个 Feature 必须按同一套对象和接口交付，避免“前端字段对不上”。

## 1. 任务对象

```json
{
  "id": "uuid",
  "title": "提交项目报告",
  "completed": false,
  "priority": 1,
  "dueAt": "2026-11-02T12:00:00.000Z",
  "dueHasTime": true,
  "kind": "task",
  "startAt": null,
  "createdAt": "2026-10-25T11:00:00.000Z",
  "updatedAt": null,
  "userId": "user-123",
  "version": 1
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 客户端或服务端生成的稳定 ID |
| `title` | string | 是 | 1–200 字符 |
| `completed` | boolean | 是 | 完成状态 |
| `priority` | 1/2/3 | 是 | 高/中/低 |
| `dueAt` | string/null | 否 | ISO 8601；统一存 UTC |
| `dueHasTime` | boolean | 否 | false = 全天，按当天 23:59 判定 |
| `kind` | `task`/`event`/`note` | 否 | 任务类型，默认 `task`；AI 日程/备忘投影用 |
| `startAt` | string/null | 否 | 日程开始时间；普通任务为 null |
| `createdAt` | string | 是 | ISO 8601 |
| `updatedAt` | string/null | 否 | 最后修改时间，冲突检测用 |
| `userId` | string/null | 云端必填 | 数据隔离 |
| `version` | integer | 云端建议 | 乐观锁版本号，从 1 开始 |

JSON Schema：`src/shared/task.schema.json`

## 2. 本地存储

| 键 | 内容 |
|---|---|
| `taskflow.v2.tasks` | 任务数组 |
| `taskflow.v1.tasks` | 旧数据，只读迁移 |

规则：

- `loadTasks` 优先 V0.2；
- 读到 V0.1 后写一份 V0.2；
- 云端接入后，localStorage 只作为缓存，不再作为权威数据源。

## 3. 统一前端数据接口

当前页面暴露：

```js
window.TaskFlow.getTasks(): Task[]
window.TaskFlow.subscribe(fn): () => void
window.TaskFlow.replaceTasks(tasks): void
window.TaskFlow.addTasks(tasks): void
```

Feature 1 如果替换为云端实现，必须保留同样的语义：

- `getTasks()` 返回副本；
- `replaceTasks()` 整体替换并持久化；
- `addTasks()` 批量追加；
- `subscribe()` 在数据变化后回调最新数组。

## 4. 云端 REST 契约（建议）

Base URL 由 Feature 1 决定（CloudBase HTTP 访问服务 / 云函数 / 自建 API 均可）。所有请求带登录态（Cookie / Authorization），服务端从登录态解析 `userId`，**不接受前端传入的 `userId` 作为身份依据**。

### 4.1 拉取任务

```http
GET /api/tasks?updatedSince=2026-10-25T00:00:00Z
```

响应：

```json
{
  "tasks": [ /* Task[] */ ],
  "serverTime": "2026-10-25T12:00:00Z",
  "nextCursor": null
}
```

### 4.2 创建任务

```http
POST /api/tasks
Content-Type: application/json

{
  "title": "买牛奶",
  "priority": 3,
  "dueAt": null,
  "dueHasTime": false,
  "clientMutationId": "uuid"
}
```

响应：

```json
{ "task": { /* Task */ } }
```

### 4.3 更新任务

```http
PATCH /api/tasks/{id}
Content-Type: application/json

{
  "title": "买牛奶和鸡蛋",
  "completed": true,
  "priority": 3,
  "dueAt": null,
  "dueHasTime": false,
  "version": 3,
  "clientMutationId": "uuid"
}
```

- `version` 用于乐观锁；
- 版本冲突返回 `409`，响应带 `serverTask`；
- 删除用 `DELETE /api/tasks/{id}`，建议软删除或至少保留 `updatedAt` 墓碑。

### 4.4 批量同步（可选但推荐）

```http
POST /api/tasks/sync
Content-Type: application/json

{
  "lastSyncAt": "2026-10-25T10:00:00Z",
  "changes": [
    { "op": "upsert", "task": { /* Task */ } },
    { "op": "delete", "id": "uuid", "updatedAt": "..." }
  ]
}
```

响应：

```json
{
  "tasks": [ /* 服务端最新 */ ],
  "conflicts": [
    {
      "id": "uuid",
      "client": { /* 客户端版本 */ },
      "server": { /* 服务端版本 */ },
      "resolution": "server_wins"
    }
  ],
  "serverTime": "..."
}
```

### 4.5 错误格式

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "任务已在其他设备修改",
    "details": { "serverTask": { } }
  }
}
```

| HTTP | code | 含义 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 字段不合法 |
| 401 | `UNAUTHENTICATED` | 未登录/登录过期 |
| 403 | `FORBIDDEN` | 不是该任务所属用户 |
| 404 | `NOT_FOUND` | 任务不存在 |
| 409 | `CONFLICT` | 版本冲突 |
| 429 | `RATE_LIMITED` | 频率限制 |
| 500 | `INTERNAL` | 服务端错误 |

## 5. 冲突处理

课程项目建议用**乐观锁 + 服务端优先**，不要做复杂的 CRDT：

1. 客户端更新时带 `version`；
2. 服务端 `version` 不一致 → 409 + `serverTask`；
3. 客户端提示“任务已在其他设备修改”，让用户选择：
   - 使用服务端版本；
   - 用自己的版本覆盖（重新提交，版本号用服务端最新）；
4. 删除冲突：服务端已删除时，客户端不要“复活”，提示已删除。

最低要求：

- 同一任务在两台设备同时改标题，不能静默丢失；
- 至少能检测到冲突并给出提示；
- `updatedAt` / `version` 必须有一个可用于检测。

## 6. AI 提取契约

### 输入

```json
{
  "text": "班长：下周二上午 10 点在教学楼 A301 开项目讨论会……",
  "sourceType": "chat",
  "receivedAt": "2026-10-25T09:30:00+08:00",
  "capturedAt": "2026-10-25T10:05:00+08:00",
  "timezone": "Asia/Shanghai"
}
```

- `sourceType`：`chat`（聊天）或 `notice`（通知）；
- `receivedAt`：消息原始时间，能提供就提供；相对时间以它为基准；
- `capturedAt`：用户粘贴进系统的时间；
- 如果只有正文，没有来源时间，明确以 `capturedAt` 为基准，并在 UI 提示。

### 输出

```json
{
  "items": [
    {
      "type": "task",
      "title": "提交项目汇报 PPT",
      "priority": "normal",
      "start_at": null,
      "due_at": "2026-10-26T20:00:00+08:00",
      "location": null,
      "assignee": null,
      "evidence": "请大家在下周一晚上 8 点之前把汇报 PPT 发给我",
      "time_precision": "minute",
      "date_expression": "下周一晚上 8 点",
      "confidence": 0.95,
      "needs_review": true
    }
  ]
}
```

| 字段 | 说明 |
|---|---|
| `type` | `task` / `event` / `note` |
| `priority` | `high` / `normal` / `low` |
| `start_at` | 日程开始时间，任务可为 null |
| `due_at` | 截止时间，日程可为 null |
| `location` | 地点，没有则 null |
| `assignee` | 负责人，无法确认则 null |
| `evidence` | 必须能在原文中找到的片段 |
| `time_precision` | `minute` / `day` / `unknown` |
| `date_expression` | 原文时间表达，如“下周二” |
| `confidence` | 0–1，模型自评，不是客观概率 |
| `needs_review` | 是否必须人工确认 |

JSON Schema：`src/ai/extraction.schema.json`

### AI 输出规则

- 不允许编造原文没有的日期、地点、负责人；
- 时间不确定时用 `null` + `needs_review=true`；
- 区分 `start_at` 和 `due_at`；
- 区分 `task` / `event` / `note`；
- 每条必须有 `evidence`，且 `evidence` 是原文子串；
- 模型返回 JSON 后，后端必须用 Pydantic/JSON Schema 再校验一次。

## 7. 可视化数据契约

Feature 3 可以自己计算，也可以消费下面的结构：

```json
{
  "generatedAt": "2026-10-25T20:00:00+08:00",
  "range": { "start": "2026-10-19", "end": "2026-10-25" },
  "totals": { "all": 12, "open": 8, "completed": 4, "overdue": 1 },
  "completionRate": 0.3333,
  "priorityDistribution": { "high": 4, "normal": 5, "low": 3 },
  "statusDistribution": { "open": 8, "completed": 4, "overdue": 1 },
  "weeklyCompleted": [
    { "week": "2026-W43", "completed": 1 }
  ],
  "overdueTasks": [
    { "id": "mock-002", "title": "整理纪要", "dueAt": "...", "priority": 2 }
  ]
}
```

示例：`mock/analytics.json`

## 8. 兼容性

- 新增字段必须可选，旧任务没有该字段时前端要有默认值；
- `priority` 只接受 1/2/3，AI 的 high/normal/low 在写入前映射；
- `dueAt` 只接受 ISO 8601 或 null；
- 任何破坏性字段变更必须同时更新本文件、Schema 和 Mock。
