# HTML 逻辑说明

当前 `index.html` 是单文件应用：HTML + CSS + 原生 JS 全部内联。没有构建步骤，直接打开或静态服务器即可运行。

## 1. 页面结构

```text
<main class="shell">
  <header> TaskFlow AI / V0.2.1 </header>
  <section class="card">
    <form id="task-form">            添加任务
      #task-input                    标题
      #task-priority                 优先级 1/2/3
      #add-due-picker                DuePicker（日期快捷选项）
    </form>
    .stats                           #stat-total / #stat-open / #stat-overdue
    .toolbar
      #filters                       全部 / 未完成 / 已完成
      #search-input                  搜索
      #sort-select                   排序
      #clear-completed               清除已完成
    #sort-hint                       当前排序规则说明
    #list-wrap
      #task-list                     任务列表
      #empty-state                   空状态
  </section>
</main>
#toast                               全局提示
```

## 2. 前端状态

全部状态都在 IIFE 内，不暴露为全局变量：

| 变量 | 含义 |
|---|---|
| `tasks` | 任务数组，唯一数据源 |
| `filter` | `all` / `open` / `done` |
| `sortMode` | `smart` / `priority` / `due` / `created` |
| `query` | 搜索关键词 |
| `editingId` | 当前正在编辑的任务 id |
| `lastAdd` | 1.2 秒内防重复提交 |
| `addDuePicker` | 添加区的日期选择器实例 |
| `activeEditPicker` | 编辑区的日期选择器实例 |
| `subscribers` | `window.TaskFlow.subscribe` 的监听器 |

## 3. 存储

| 键 | 用途 |
|---|---|
| `taskflow.v2.tasks` | 当前任务数组 |
| `taskflow.v1.tasks` | 旧版数据，只读迁移 |

- `loadTasks()` 优先 V0.2，找不到再读 V0.1；
- 读到 V0.1 后，页面初始化末尾会写一份 V0.2；
- 写入失败（隐私模式/配额）会 toast，页面仍可在内存中使用；
- **不存 token、密码、API Key**。

## 4. 任务对象

```js
{
  id: "uuid",
  title: "提交项目报告",
  completed: false,
  priority: 1,                 // 1 高 / 2 中 / 3 低
  dueAt: "2026-11-02T12:00:00.000Z", // UTC ISO 或 null
  dueHasTime: true,            // false = 全天，按当天 23:59 判定
  createdAt: "2026-10-25T11:00:00.000Z",
  updatedAt: null
}
```

`dueAt` 统一存 UTC；展示时用本地时区。`dueHasTime=false` 只影响显示和“全天”语义，逾期判定仍用 23:59。

## 5. 主要函数

### 初始化 / 存储

| 函数 | 作用 |
|---|---|
| `uid()` | `crypto.randomUUID()`，降级随机 id |
| `normalizeDate(value)` | 任意日期 → UTC ISO 或 null |
| `normalizeTask(item)` | 校验/补全任务字段 |
| `loadTasks()` | 从 localStorage 读取并 normalize |
| `saveTasks()` | 写入 localStorage + 通知订阅者 |
| `taskSnapshot()` | 返回任务副本 |
| `notifySubscribers()` | 逐个调用订阅者，单个报错不影响列表 |

### 日期 / DuePicker

`DuePicker` 是一个可复用组件，添加区和编辑区各实例化一次：

- `今天 / 明天 / 本周末`：当天 23:59，`dueHasTime=false`
- `自定义`：显示 `<input type="date">` + `<input type="time">` + 确定/取消
- 时间留空：`dueHasTime=false`，23:59
- 选到过去时间：显示警告，但允许保存
- `getDue()` / `setDue()` / `reset()`
- 编辑区额外有「清除截止日期」按钮

日期显示：

```text
今天 · 10月25日 · 全天
明天 · 10月26日 · 09:00
2027年1月2日 · 14:00
```

### 查询 / 排序

| 函数 | 作用 |
|---|---|
| `filteredTasks()` | 按 filter + query 过滤 |
| `sortedTasks()` | 按 sortMode 排序，完成项沉底 |
| `isOverdue(task)` | 未完成且 `dueAt < now` |
| `dueValue(task)` | 无截止时间用 `MAX_SAFE_INTEGER` |
| `priorityValue(task)` | 1/2/3，异常值回退 2 |

### 变更

| 函数 | 作用 |
|---|---|
| `addTask()` | 校验标题、读 DuePicker、插入、保存、render |
| `toggleTask(id)` | 切换完成 |
| `deleteTask(id)` | 删除 |
| `clearCompleted()` | 确认后清理已完成 |
| `startEdit(id)` | 设置 editingId 并 render |
| `saveEdit(id)` | 读编辑表单 + DuePicker，更新并保存 |
| `cancelEdit()` | 退出编辑 |

### 渲染

| 函数 | 作用 |
|---|---|
| `renderTask(task)` | 列表行：checkbox、标题、优先级、逾期、截止、编辑/删除 |
| `renderEdit(task)` | 编辑表单：标题、保存/取消、优先级、清除日期、DuePicker |
| `render()` | 统计、筛选按钮、排序提示、列表、空状态 |

`render()` 会重建 `#task-list`，但不会重建搜索框/筛选按钮，所以输入焦点不受影响。

## 6. 事件流

```text
提交 #task-form
  → addTask()
  → tasks.unshift
  → saveTasks()（写 localStorage + notify）
  → render()
  → 重置标题/日期/优先级

点击筛选 / 输入搜索 / 切换排序
  → 改 filter/query/sortMode
  → render()

勾选 / 删除 / 保存编辑
  → 改 tasks
  → saveTasks()
  → render()
```

## 7. 对外集成 API

页面加载后暴露：

```js
window.TaskFlow = {
  version: "0.2.1",
  getTasks(),                 // 任务副本数组
  getStorageKey(),            // "taskflow.v2.tasks"
  subscribe(listener),        // 立即回调一次，返回 unsubscribe
  replaceTasks(nextTasks),    // 整体替换（云端同步/初始化用）
  addTasks(nextTasks),        // 批量追加（AI 提取确认用）
};
```

约定：

- Feature 2 用 `addTasks()` 写入确认后的任务；
- Feature 3 用 `getTasks()` / `subscribe()` 读数据；
- Feature 1 可以在自己的适配层调用 `replaceTasks()`，或后续把存储层替换成云端；
- 任何模块都不要直接改 `tasks`、`filter` 等私有变量。

## 8. 如何扩展

### 添加一个独立模块

1. 在 `src/<feature>/` 下新建 JS/CSS；
2. 在 `index.html` 底部按顺序加载：

```html
<link rel="stylesheet" href="src/ai/ai.css">
<script src="src/ai/ai.js" defer></script>
```

3. 模块内只通过 `window.TaskFlow` 读写任务；
4. 不要修改 `saveTasks` / `render` 的内部逻辑，除非集成人确认。

### 加一个 Tab（清单 / 日历 / 统计）

建议在 `.card` 上方加一个 `nav.tabs`，每个 Tab 对应一个独立 `section`，默认显示清单。Feature 3 负责自己的 section，避免改清单 DOM。

### 重构建议

如果后续代码超过 1000 行，集成人再把 `index.html` 的内联 CSS/JS 拆到：

```text
assets/app.css
assets/app.js
assets/date.js
assets/store.js
```

拆分前先保证 `window.TaskFlow` 契约不变，避免三个 Feature 同时改核心。
