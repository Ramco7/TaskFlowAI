# Feature 3 · 任务可视化与数据分析

## 1. 目标

把任务数据变成可读的视图：

- 日历视图：任务/日程按日期映射；
- Dashboard：完成率、状态分布、优先级分布、逾期任务；
- 时间线：按时间顺序展示关键任务；
- 可选：每周完成趋势、标签/来源分布。

## 2. 交付物

1. 可运行的日历界面；
2. Dashboard 图表；
3. 时间线；
4. Mock 数据版本 + 接入 `TaskFlow.getTasks()` 的版本；
5. 数据映射/统计口径说明；
6. 移动端截图；
7. 模块集成说明。

## 3. 技术建议

- 日历：FullCalendar；
- 图表：ECharts；
- 时间线：原生 CSS/JS 或 ECharts custom series；
- 不引入前端框架也可以，直接 ES module / 独立 JS；
- 所有库通过 CDN 或本地 vendor 引入，注意版本固定。

## 4. 数据来源

### 先 Mock

用 `mock/tasks.json` 和 `mock/analytics.json` 开发：

```js
const tasks = await fetch("/mock/tasks.json").then(r => r.json());
```

### 后接入

```js
const tasks = window.TaskFlow.getTasks();
const unsubscribe = window.TaskFlow.subscribe((nextTasks) => {
  renderDashboard(nextTasks);
});
```

不要在图表模块里直接读 `localStorage`，否则 Feature 1 切换到云端后要重写。

## 5. 日期映射规则

| 任务字段 | 日历中的含义 |
|---|---|
| `dueAt` + `dueHasTime=true` | 具体时间点的事件/截止 |
| `dueAt` + `dueHasTime=false` | 当天全天事项 |
| `dueAt=null` | 不进入日历，进入“未排期”列表 |
| `completed` | 完成态（灰色/勾选） |
| `priority` | 颜色：1 红 / 2 橙 / 3 灰蓝 |

- 逾期未完成：红色边框或红色圆点；
- 日程和任务都先按 `dueAt` 映射，Feature 2 未来有 `start_at` 时可扩展；
- 时区统一按浏览器本地时区显示。

## 6. Dashboard 统计口径

| 指标 | 定义 |
|---|---|
| 总任务 | 全部任务数 |
| 未完成 | `completed=false` |
| 已完成 | `completed=true` |
| 逾期 | 未完成且 `dueAt < now` |
| 完成率 | 已完成 / 总数 |
| 状态分布 | 未完成 / 已完成 / 逾期（注意逾期是未完成的子集，图表要注明） |
| 优先级分布 | priority 1/2/3 数量 |
| 每周完成趋势 | 按 `updatedAt` 或 `createdAt` 所在周统计完成数，口径必须写清楚 |
| 逾期任务列表 | 未完成且已过截止时间，按截止时间升序 |

> 状态分布如果同时放“未完成”和“逾期”，两者会重叠；建议：
> - 图 A：完成/未完成；
> - 图 B：未完成中逾期/未逾期；
> - 或注明“逾期是未完成的子集”。

## 7. 页面结构建议

在现有清单上方加 Tab：

```text
[清单] [日历] [统计] [时间线]
```

每个 Tab 一个独立 `section`：

```html
<section id="view-list">...</section>
<section id="view-calendar" hidden>...</section>
<section id="view-dashboard" hidden>...</section>
<section id="view-timeline" hidden>...</section>
```

- 默认显示清单，不破坏 V0.2 交互；
- Tab 切换只改 `hidden`，不重新渲染整个页面；
- Feature 3 只维护自己的 section 和 JS/CSS 文件。

## 8. 文件建议

```text
src/visualization/
  README.md
  visualization.js
  visualization.css
  calendar.js
  dashboard.js
  timeline.js
  mock-adapter.js
```

如果使用 FullCalendar/ECharts CDN，在 `index.html` 里加一次，不要重复加载。

## 9. 验收清单

- [ ] 12 条 Mock 任务能按日期出现在日历；
- [ ] 无截止时间任务进入“未排期”；
- [ ] 优先级颜色区分；
- [ ] 逾期任务明显标识；
- [ ] Dashboard 总数、完成率、状态分布、优先级分布与 Mock 数据一致；
- [ ] 每周完成趋势有口径说明；
- [ ] 时间线按时间排序；
- [ ] 空数据/全部完成/全部逾期有空状态；
- [ ] 390px 手机宽度不横向溢出；
- [ ] 切换到实时数据后，新增/完成/删除任务图表会更新；
- [ ] 不直接读写 `localStorage`，只通过 `TaskFlow` API。

## 10. 交付格式

- 分支：`feature/visualization`
- 代码：`src/visualization/`
- 文档：`src/visualization/README.md`
- 截图：日历、Dashboard、时间线、手机端
- 演示：Mock 数据 → 切实时数据 → 新增任务 → 图表更新
- 统计口径：写在 README 里，特别是“完成率”和“每周趋势”的基准字段

## 11. 注意事项

- 图表不要为了好看伪造数据；
- Mock 数据要标注“演示数据”；
- 统计口径不同会导致数字对不上，必须先对齐；
- 不要引入第二个前端框架；保持原生 JS/CSS 即可；
- 不要修改 `index.html` 的核心任务逻辑，集成点由项目负责人合并。
