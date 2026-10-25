# CloudBase 配置指南

## 1. 当前环境

```text
环境 ID：bumpy-damselfly-d5fm66ql428df3c9
套餐：体验版
区域：ap-shanghai
静态托管：Online
默认域名：https://bumpy-damselfly-d5fm66ql428df3c9-1516532038.tcloudbaseapp.com/
```

CloudBase 是 Serverless，不存在“登录云服务器”；配置的是**腾讯云账号权限 + CloudBase 环境资源**。

## 2. 本地 CLI

### 安装

```powershell
npm install -g @cloudbase/cli
tcb --version
```

### 登录

```powershell
tcb login
tcb env list
```

如果使用本仓库之前的本地 wrapper，请确认 `tcb` 已在 PATH；否则就用全局安装。

### 查看静态托管

```powershell
tcb hosting detail -e bumpy-damselfly-d5fm66ql428df3c9
tcb hosting list -e bumpy-damselfly-d5fm66ql428df3c9
```

## 3. 部署静态网站

```powershell
.\deploy.cmd
```

它只上传 `index.html`，不会上传 README、截图和 Mock。

等价手动命令：

```powershell
# 先准备一个只含 index.html 的目录
New-Item -ItemType Directory -Force .\dist
Copy-Item .\index.html .\dist\index.html -Force
tcb hosting deploy .\dist -e bumpy-damselfly-d5fm66ql428df3c9 --safe
```

## 4. 团队权限（需要时）

### 4.1 创建 CAM 子账号

1. 腾讯云控制台 → 访问管理 CAM → 用户 → 新建子用户；
2. 勾选控制台登录/编程访问；
3. 记录登录信息，要求子用户首次登录改密码并绑定 MFA。

### 4.2 授权

给这个环境所需权限：

- 只部署静态页：尽量给最小权限；
- 需要数据库/云函数：再单独给数据库/云函数权限；
- 不要一上来给主账号/全账号权限。

如果控制台只能给较粗的 CloudBase 权限，接受“能部署的人也能看到环境资源”，或拆环境。

### 4.3 组员登录

```powershell
tcb login
tcb env list
```

确认能看到 `bumpy-damselfly...` 后，再部署。

## 5. V0.3 身份认证

1. CloudBase 控制台 → 环境 → 身份认证；
2. 选择课程可用的登录方式（邮箱/手机号/微信，以控制台为准）；
3. 配置允许的域名/回调；
4. 前端初始化使用环境 ID（不是密钥）：

```js
const CLOUD_ENV_ID = "bumpy-damselfly-d5fm66ql428df3c9";
```

5. 登录后才能读写任务；退出登录清空本地用户缓存。

## 6. V0.3 数据库

以控制台实际数据库类型为准：

### PostgreSQL

- 创建数据库/表；
- 建索引：`(user_id, updated_at)`、`(user_id, due_at)`；
- 开启 RLS 或等价安全规则；
- 应用连接使用受限 DB 用户，不用管理员账号；
- 连接串只放服务端/本地 `.env`。

### 文档数据库

- 创建集合 `tasks`；
- 配置安全规则：`doc.user_id == auth.uid`；
- 前端只通过 SDK/云函数访问；
- 不开放“所有人可写”。

## 7. V0.4 云函数

1. CloudBase 控制台 → 云函数 → 新建 HTTP 函数；
2. 环境变量配置 `DEEPSEEK_API_KEY`（不要写进代码）；
3. 函数内调用模型、校验 JSON、返回结构化结果；
4. 前端只调函数 URL；
5. 设置超时、并发和日志脱敏。

## 8. 默认域名提示页

CloudBase 测试默认域名首次访问会出现「页面访问提示」，点「确定访问」后进入。平台合规要求，**代码无法去掉**；要移除只能绑定已备案的自定义域名。

课程演示可以接受，答辩时提前点一次或使用已确认的浏览器。

## 9. 不要提交的东西

```text
.env
*.local
tools/cloudbase-cli/home/
cloudbase 登录态
数据库密码
模型 API Key
真实用户聊天记录
```

## 10. 常见问题

| 问题 | 处理 |
|---|---|
| `tcb` 找不到 | `npm install -g @cloudbase/cli` |
| 登录后看不到环境 | 检查 CAM 权限/区域（ap-shanghai） |
| 部署 403 | 子账号没有静态托管权限 |
| 页面旧版本 | 强制刷新/加 query；CDN 几分钟 |
| 默认域名提示页 | 点确定访问；或绑自定义域名 |
| 数据库连不上 | 检查白名单、SSL、账号权限、网络 |
