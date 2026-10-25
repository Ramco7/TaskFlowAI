# TaskFlow AI

面向碎片化信息的任务收集与时间管理应用。课程项目分三个 Feature 并行开发：

- **Feature 1 · 云端数据管理**：登录、CloudBase 数据库、CRUD、跨设备同步、用户隔离；
- **Feature 2 · AI 智能信息提取**：聊天记录或通知正文（可从网页复制）→ 待办/日程/备忘；
- **Feature 3 · 可视化与分析**：日历、Dashboard、时间线。

当前 `index.html` 保留 V0.2.1 待办基线；Feature 2 已接入千问 `qwen3.8-flash` 的本地服务、Mock 演示和人工确认界面。云端来源记录仍待负责人合并。

## 线上地址

main 基线：

```text
https://bumpy-damselfly-d5fm66ql428df3c9-1516532038.tcloudbaseapp.com/
```

Feature 2 预览（AI 面板，默认 Mock）：

```text
https://bumpy-damselfly-d5fm66ql428df3c9-1516532038.tcloudbaseapp.com/preview-ai/
```

CloudBase 测试默认域名首次访问会有「页面访问提示」，点「确定访问」进入。环境 ID：

```text
bumpy-damselfly-d5fm66ql428df3c9
```

## 当前基线功能

- 添加 / 完成 / 删除 / 清除已完成
- 截止日期：无 / 今天 / 明天 / 本周末 / 自定义
- 自定义日期 + 可选时间；不选时间按当天 23:59
- 过去时间即时提示
- 优先级高 / 中 / 低
- 筛选、排序、搜索、编辑、逾期高亮
- `localStorage` 持久化 + V0.1 迁移
- 390px 手机布局
- `window.TaskFlow` 集成 API
- 本地千问信息提取、预览、编辑、人工确认及证据留存

![手机端列表](screenshots/v021-mobile.png)

## 快速开始

### 只看待办 / AI Mock 演示（不需要 Key）

```powershell
python -m http.server 8766
```

打开 `http://127.0.0.1:8766/`。AI 面板默认是 **Mock 演示**，不需要服务或 API Key；点「填入示例」再点「调用千问提取」即可看到完整预览/确认流程。

### 真实模型（需要服务端 Key）

Windows：

```powershell
$env:BDCCP_API = "你的百炼 Key"
.\run-ai.cmd
```

或者手动：

```powershell
python -m pip install -r src/ai/server/requirements.txt
python -m uvicorn src.ai.server.app:app --host 127.0.0.1 --port 8766
```

打开 `http://127.0.0.1:8766/`，把 AI 模式切到「真实模型」。依赖安装和接口说明见 [src/ai/README.md](src/ai/README.md)。

## 仓库结构

```text
.
├── index.html                 当前 V0.2.1 单文件应用
├── deploy.cmd                 CloudBase 静态部署（根路径）
├── deploy-preview.cmd         AI 预览部署（/preview-ai/）
├── run-ai.cmd                 Windows 本地 AI 服务
├── .github/workflows/ai-tests.yml
├── docs/
│   ├── PROJECT.md             项目定位、架构、Feature 边界
│   ├── HTML-LOGIC.md          当前 HTML/JS 逻辑与扩展点
│   ├── DATA-CONTRACTS.md      任务/AI/统计/云 API 数据契约
│   ├── FEATURE-1-CLOUD.md     Feature 1 要求与云操作
│   ├── FEATURE-2-AI.md        Feature 2 要求与本地开发
│   ├── FEATURE-3-VISUALIZATION.md
│   ├── TEAM-WORKFLOW.md       Git/PR/部署/权限
│   ├── CLOUD-SETUP.md         CloudBase 配置步骤
│   ├── ACCEPTANCE.md          验收清单
│   └── DELIVERY-TEMPLATE.md   交付模板
├── src/
│   ├── shared/task.schema.json
│   ├── cloud/README.md        Feature 1 目录
│   ├── ai/                   Feature 2 界面、接口、校验、评测
│   └── visualization/README.md
├── mock/
│   ├── tasks.json             12 条任务
│   ├── ai-input.json          示例聊天文本
│   ├── ai-output.json         期望结构化结果
│   └── analytics.json         Dashboard 数据形状
└── screenshots/
```

## 三个 Feature 的入口

- [Feature 1 · 云端数据管理](docs/FEATURE-1-CLOUD.md)
- [Feature 2 · AI 信息提取](docs/FEATURE-2-AI.md)
- [Feature 3 · 可视化与分析](docs/FEATURE-3-VISUALIZATION.md)

协作规则、分支、部署、云权限见 [TEAM-WORKFLOW.md](docs/TEAM-WORKFLOW.md)。

## 集成 API

页面加载后提供：

```js
window.TaskFlow = {
  version: "0.2.1",
  getTasks(),                 // Task[]
  getStorageKey(),            // "taskflow.v2.tasks"
  subscribe(listener),        // 立即回调 + 变化回调，返回 unsubscribe
  replaceTasks(nextTasks),    // 整体替换（云端同步）
  addTasks(nextTasks),        // 批量追加（AI 确认）
};
```

- Feature 2 确认后调用 `addTasks()`；
- Feature 3 用 `getTasks()` / `subscribe()`；
- Feature 1 负责把本地实现替换/桥接为云端；
- 不要直接改页面私有变量。

## 数据契约

任务对象、云 API、AI JSON、统计口径都在 [DATA-CONTRACTS.md](docs/DATA-CONTRACTS.md)。Schema：

- `src/shared/task.schema.json`
- `src/ai/extraction.schema.json`

## 部署

先安装 CloudBase CLI：

```powershell
npm install -g @cloudbase/cli
tcb login
```

然后：

```powershell
.\deploy.cmd            # 根路径（main 演示）
.\deploy-preview.cmd    # /preview-ai/ AI 预览，不影响根路径
```

静态脚本上传 `index.html` 和 AI 面板资源（含 Mock 示例）；`/api/extract` 的公网云函数尚未由负责人接入，因此公网 AI 默认使用 Mock，真实提取流程以本地服务运行。

## 验收

V0.2.1 基线：

- 日期/移动端专项 18/18；
- `TaskFlow` API 测试通过；
- 线上文件与本地哈希一致。

完整清单见 [ACCEPTANCE.md](docs/ACCEPTANCE.md)。

## 安全

- 不提交 `.env`、API Key、数据库密码、CloudBase 登录态；
- AI Key 只由启动本地服务的环境变量提供；云端集成时改由云函数环境变量提供；
- 不提交真实聊天记录、手机号、邮箱；
- 数据库用户/密钥最小权限，离职/结束后轮换。

## 下一步

1. 创建 Git 私有仓库并 push；
2. 三个 Feature 按各自文档开分支；
3. Feature 1 负责登录/数据库，Feature 2 本地使用真实模型，Feature 3 先用 Mock；
4. 项目负责人按周合并、部署、验收。
