# Feature 1 · 云端数据管理（CloudBase）

## 1. 目标

把当前 `localStorage` 任务系统升级为真正的云端数据服务：

- 用户登录；
- 云数据库存储任务；
- 任务 CRUD；
- 跨设备同步；
- 用户数据隔离；
- localStorage → 云端迁移；
- 简单版本冲突处理；
- 向 Feature 2/3 提供统一数据读写接口。

## 2. 交付物

1. 可运行的云端数据服务（CloudBase 环境 + 前端适配层）；
2. 登录、任务 CRUD、跨设备同步演示；
3. 接口说明（按 `docs/DATA-CONTRACTS.md` 第 4 节实现）；
4. 数据迁移说明；
5. 冲突处理说明 + 演示；
6. 安全规则/权限说明；
7. 验收记录。

## 3. 前置条件（需要你操作云平台）

### 3.1 腾讯云账号与邀请

Feature 负责人需要：

1. 注册腾讯云账号并实名认证；
2. 主账号（项目负责人）通过 **CAM 访问管理** 创建子用户/协作者；
3. 只授予这个 CloudBase 环境所需权限；
4. 负责人用自己的账号登录，不要使用主账号密码/SecretKey。

> 具体菜单以腾讯云控制台实际界面为准。参考：[CloudBase 环境级访问控制](https://docs.cloudbase.net/cam/access-manage)、[CloudBase 子账号预设策略](https://docs.cloudbase.net/faq/sub-account/preset-policy)。

### 3.2 环境信息

```text
环境 ID：bumpy-damselfly-d5fm66ql428df3c9
默认域名：https://bumpy-damselfly-d5fm66ql428df3c9-1516532038.tcloudbaseapp.com/
区域：ap-shanghai
```

### 3.3 CLI

```powershell
npm install -g @cloudbase/cli
tcb login
tcb env list
```

或使用仓库内约定的 `tcb` 命令。不要提交 `~/.config/.cloudbase/auth.json`。

## 4. 云端配置步骤

### 4.1 开启身份认证

在 CloudBase 控制台：

1. 进入环境；
2. 打开「身份认证」；
3. 选择课程可用的登录方式（邮箱/手机号/微信等，以控制台可用为准）；
4. 配置允许的登录域名/回调；
5. 记录前端初始化需要的参数。

### 4.2 创建数据库

按控制台实际提供的数据库类型操作：

- 如果是 **PostgreSQL**：创建数据库/表，记录连接方式；
- 如果是**文档数据库**：创建集合。

建议表/集合：

```text
tasks
  id            string / uuid
  user_id       string
  title         string
  completed     boolean
  priority      int
  due_at        timestamp / string
  due_has_time  boolean
  created_at    timestamp
  updated_at    timestamp
  version       int
  deleted_at    timestamp/null   // 可选软删除
```

索引建议：

- `(user_id, updated_at)`；
- `(user_id, due_at)`；
- `(user_id, completed)`。

### 4.3 安全规则 / RLS

必须满足：

- 用户只能读写 `user_id = 当前登录用户` 的记录；
- 不能信任前端传入的 `user_id`；
- 服务端/规则从登录态解析用户身份；
- 未登录请求全部拒绝。

如果使用 PostgreSQL RLS，示例思路（具体语法按 CloudBase 版本调整）：

```sql
-- 伪代码：以当前登录用户为策略条件
CREATE POLICY task_owner ON tasks
  USING (user_id = current_setting('app.user_id')::text)
  WITH CHECK (user_id = current_setting('app.user_id')::text);
```

不要直接照抄；以 CloudBase 控制台生成的规则为准。

### 4.4 前端 SDK 初始化

把环境 ID 放在配置常量中（环境 ID 不是密钥）：

```js
const CLOUD_ENV_ID = "bumpy-damselfly-d5fm66ql428df3c9";
```

初始化代码放 `src/cloud/`，不要写进 `index.html` 的私有逻辑。

## 5. 实现任务

### 5.1 存储适配层

建议定义统一接口：

```js
// src/cloud/store.js
export const cloudStore = {
  async listTasks(),
  async createTask(input),
  async updateTask(id, patch),
  async deleteTask(id),
  async sync(localTasks, lastSyncAt),
  subscribe(callback),
};
```

要求：

- 页面仍能通过 `window.TaskFlow.getTasks()` 读取；
- 云端模式下 `saveTasks` 应改为调用 cloudStore；
- localStorage 仅作离线缓存；
- 网络失败时给出明确提示，不要静默丢数据。

### 5.2 登录

- 登录成功后才能拉取/写入任务；
- 未登录显示登录入口，不显示空任务列表造成误解；
- 退出登录要清空本地缓存中的用户数据；
- 切换账号不能看到上一个账号的任务。

### 5.3 CRUD

按 `docs/DATA-CONTRACTS.md` 第 4 节实现：

- 创建：客户端生成 `id` + `clientMutationId`，服务端幂等；
- 更新：带 `version`；
- 删除：软删除或墓碑；
- 列表：支持 `updatedSince` 增量同步。

### 5.4 数据迁移

首次登录时：

1. 读取 `taskflow.v2.tasks`；
2. 如果云端该用户没有任务，询问用户是否导入本地任务；
3. 逐条创建，记录成功/失败；
4. 导入成功后标记 `migrated=true`，避免重复导入；
5. 不要直接删除本地数据，保留一次回滚机会。

### 5.5 冲突处理

最低要求：

- 更新带 `version`；
- 409 时提示“任务已在其他设备修改”；
- 展示服务端版本，让用户选择保留哪边；
- 不允许静默覆盖。

## 6. 验收清单

- [ ] 两个浏览器/两台设备登录同一账号，看到同一批任务；
- [ ] 设备 A 新增，设备 B 刷新可见；
- [ ] 设备 A 完成，设备 B 刷新状态正确；
- [ ] 设备 A 删除，设备 B 不会“复活”；
- [ ] 用户 A 看不到用户 B 的任务；
- [ ] 未登录不能读写；
- [ ] 本地旧任务可导入；
- [ ] 两设备同时改同一任务，能检测冲突并提示；
- [ ] 网络断开/恢复有提示，不静默丢数据；
- [ ] 退出登录后本地不残留上一用户数据。

## 7. 交付格式

- 分支：`feature/cloud`
- 代码：`src/cloud/` + 必要的 `index.html` 集成点
- 文档：`src/cloud/README.md`（如何运行、环境变量、接口）
- 演示：登录 → 新增 → 另一设备刷新 → 完成 → 冲突提示
- 数据：使用 `mock/tasks.json` 或测试账号数据，不提交真实用户数据
- 云操作记录：环境 ID、开启的认证方式、数据库类型、安全规则摘要（不写密钥）

## 8. 禁止事项

- 不把主账号密码、SecretKey、数据库密码写进代码/Git；
- 不把 `userId` 从前端当身份依据；
- 不做“所有人共用一个账号”的伪隔离；
- 不在前端直连数据库管理员账号。
