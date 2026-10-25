# 团队协作流程

## 1. 仓库与分支

```text
main                       可部署、可演示
feature/cloud              Feature 1
feature/ai                 Feature 2
feature/visualization      Feature 3
```

规则：

- 每个人从 `main` 开自己的 `feature/*`；
- 不直接改 `main`；
- 通过 PR 合并到 `main`；
- 项目负责人负责最终合并和线上部署；
- 如果组员要自己部署测试，先从 `main` 合并/拉取最新代码，再运行 `deploy.cmd`。

## 2. 文件所有权（避免冲突）

| 文件/目录 | 负责人 | 其他人 |
|---|---|---|
| `index.html` 核心清单逻辑 | 项目负责人 | 不改，除非集成 |
| `src/cloud/` | Feature 1 | 不改 |
| `src/ai/` | Feature 2 | 不改 |
| `src/visualization/` | Feature 3 | 不改 |
| `docs/` | 各自补充自己 Feature 的文档 | 可读 |
| `mock/` | 项目负责人维护公共 Mock | 可新增自己的 Mock |

Feature 2/3 尽量做独立页面/面板，通过 `window.TaskFlow` 接入，避免三个人同时改 `index.html`。

## 3. 开发流程

```text
1. git pull
2. git checkout -b feature/xxx
3. 本地开发 + 自测
4. git push origin feature/xxx
5. 开 PR，写清楚：
   - 改了什么
   - 怎么运行
   - 数据契约有没有变
   - 截图/录屏
6. 项目负责人 review
7. 合并到 main
8. 部署 main
```

### PR 必须包含

- [ ] 本地能运行；
- [ ] 没有提交 `.env`、Key、数据库密码；
- [ ] 没有改别人的 Feature 目录；
- [ ] 数据字段符合 `docs/DATA-CONTRACTS.md`；
- [ ] 有截图或演示步骤；
- [ ] 新增依赖/外部服务写清楚。

## 4. 部署规则

当前只有一个 CloudBase 环境：

```text
bumpy-damselfly-d5fm66ql428df3c9
```

- 线上以 `main` 为准；
- 部署前必须 `git pull`，确认在 `main`；
- 组员自己部署测试可以，但部署后要在群里说一声；
- 不要同时在云控制台手动改 `index.html`；
- 部署命令：

```powershell
.\deploy.cmd
```

> 默认域名首次访问会有 CloudBase「页面访问提示」，点「确定访问」；这是平台合规页，代码去不掉。

## 5. 云平台权限

### 谁需要云账号

| 角色 | 需要 CloudBase 权限 | 说明 |
|---|---|---|
| Feature 1 | ✅ | 登录、数据库、安全规则 |
| Feature 2 | ❌ | 本地 mock/API；最终由负责人接云函数 |
| Feature 3 | ❌ | 只读 `TaskFlow` 数据 |
| 项目负责人 | ✅ | 环境、部署、密钥、最终集成 |

### 邀请方式

- 主账号通过腾讯云 **CAM** 创建子用户；
- 只授予该环境需要的权限；
- 组员用自己的账号登录，不共享主账号/SecretKey；
- 权限最小化：能部署静态页的人，不一定是数据库管理员。

## 6. 密钥与敏感数据

- DeepSeek/模型 API Key：只放本地 `.env` 或云函数环境变量；
- 数据库密码：只放 Secret Manager/云函数环境变量；
- 不把 Key 写进 `index.html`、`docs/`、`mock/`；
- `.env`、`*.local` 必须在 `.gitignore`；
- 如果 Key 误提交：立刻撤销/轮换，并清理 Git 历史。

## 7. 合并节奏

不要等到最后一天才合并。建议：

- 每完成一个小模块就 push/PR；
- 项目负责人每周至少 merge 一次；
- 每次 merge 后部署一次测试地址；
- 答辩前从最新 `main` 部署正式版。

## 8. 冲突处理

- 同一文件被多人改：以文件所有权为准，先沟通再改；
- `index.html` 核心逻辑冲突：由项目负责人合并；
- 数据字段冲突：以 `docs/DATA-CONTRACTS.md` 为准；
- 不确定时先开 issue/群里说，不要强行覆盖。

## 9. 提交信息建议

```text
feat(cloud): add login and task sync
feat(ai): add extraction preview
feat(visualization): add calendar view
fix(task): correct due date display
docs: update feature 2 contract
```

## 10. 当前验收基线

- V0.2.1 日期/移动端专项 18/18；
- `window.TaskFlow` API 测试通过；
- 线上静态托管 Online；
- 详细见 `docs/ACCEPTANCE.md`。
