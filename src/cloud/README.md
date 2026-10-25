# src/cloud

Feature 1 的代码目录。

建议文件：

```text
src/cloud/
  README.md
  store.js          # TaskStore 适配器（local / cloud）
  auth.js           # 登录/退出/当前用户
  sync.js           # 增量同步/冲突
  migrate.js        # localStorage → 云端
```

## 集成约定

- 不要直接改 `index.html` 里的私有 `tasks` 变量；
- 通过 `window.TaskFlow.getTasks()` / `replaceTasks()` 读写；
- 云端接口按 `docs/DATA-CONTRACTS.md` 第 4 节；
- 环境 ID 可以写在前端配置，数据库密码/Secret 不可以；
- 未登录时不创建“匿名云端任务”。

## 交付前

- [ ] 两设备同步演示
- [ ] 用户隔离演示
- [ ] 本地迁移演示
- [ ] 冲突提示演示
- [ ] 更新 `docs/FEATURE-1-CLOUD.md` 的云操作记录
