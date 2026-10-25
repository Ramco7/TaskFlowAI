# src/visualization

Feature 3 的代码目录。

建议文件：

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

## 集成约定

- 先用 `mock/tasks.json` / `mock/analytics.json`；
- 实时版用 `window.TaskFlow.getTasks()` + `subscribe()`；
- 不直接读写 `localStorage`；
- 不改 `index.html` 的核心任务逻辑；
- Tab 容器和 `hidden` 切换由 Feature 3 负责，项目负责人只合并一次挂载点。

## 交付前

- [ ] 日历截图
- [ ] Dashboard 截图
- [ ] 时间线截图
- [ ] 390px 手机截图
- [ ] 统计口径说明
- [ ] Mock → 实时数据切换说明
