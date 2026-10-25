# TaskFlow AI · 项目说明

## 1. 项目定位

TaskFlow AI 是一个**面向碎片化信息的任务收集与时间管理云应用**：

- 用户粘贴聊天记录或通知正文，通知正文也可以从网页复制；
- AI 识别其中的待办、日程和重要备忘；
- 用户预览、修改、确认；
- 数据进入可搜索、可提醒、可跨设备访问的云端任务系统。

课程重点不是训练模型，而是把 **前端交互、结构化数据、云数据库/登录、AI 提取、可视化** 串成一条完整的数据流。

## 2. 当前基线（V0.2.1）

当前仓库里的 `index.html` 是一个可直接运行的单文件前端：

- 添加 / 完成 / 删除 / 清除已完成
- 截止日期：无截止日期 / 今天 / 明天 / 本周末 / 自定义
- 自定义日期 + 可选时间；时间留空按当天 23:59 判定
- 优先级高 / 中 / 低
- 全部 / 未完成 / 已完成筛选
- 智能 / 优先级 / 截止时间 / 创建时间排序
- 编辑标题、优先级、截止日期；清除截止日期
- 关键词搜索
- 逾期高亮
- `localStorage` 持久化
- V0.1 数据迁移
- 390px 手机布局
- `window.TaskFlow` 供后续模块接入的最小 API

**当前数据只在浏览器本地，不跨设备。** 云端登录、数据库和 AI 是后续 Feature。

## 3. 三个 Feature 的边界

| Feature | 负责 | 主要文件 | 是否依赖云平台 |
|---|---|---|---|
| Feature 1 · 云端数据管理 | 登录、数据库、CRUD、同步、隔离、迁移、冲突 | `src/cloud/` + 核心存储适配 | 是 |
| Feature 2 · AI 信息提取 | 文本→结构化、预览确认、Schema 校验、评测 | `src/ai/` + 独立 AI 面板 | 本地可做，最终接云函数 |
| Feature 3 · 可视化与分析 | 日历、Dashboard、时间线 | `src/visualization/` + 独立视图 | 否，先 Mock |

### Feature 之间的依赖

```text
Feature 1 提供统一数据接口
        ↑                 ↑
Feature 2 写入任务    Feature 3 读取任务
```

- Feature 2 不直接操作 `localStorage`，通过 `window.TaskFlow.addTasks()` 或统一的 `TaskStore` 写入；
- Feature 3 不直接读私有变量，通过 `window.TaskFlow.getTasks()` / `subscribe()` 读取；
- Feature 1 负责把 `window.TaskFlow` 的本地实现替换/桥接为云端实现。

## 4. 目标架构

```text
Browser
  ├── 任务清单 / 日历 / Dashboard / AI 预览（静态前端）
  ├── TaskFlow API（当前为 localStorage 适配器）
  │       └── 后续替换为 CloudBase SDK / HTTP API
  └── CloudBase
        ├── Auth（用户登录）
        ├── Database（任务、来源、用户隔离）
        ├── Cloud Function（AI 提取，保护 API Key）
        └── Static Hosting（index.html）
```

## 5. 开发阶段

### 已完成：V0.1 / V0.2.1

- 任务 CRUD、本地持久化、时间管理、筛选排序搜索、移动端适配。

### 进行中：三个 Feature

- Feature 1：CloudBase 登录 + 数据库 + 同步；
- Feature 2：AI 提取 + 预览确认 + 评测；
- Feature 3：日历 + Dashboard + 时间线。

### 集成目标：V0.4

- 三个 Feature 合并到 `main`；
- 真实登录、云端任务、AI 提取、可视化都能演示；
- 移动端和桌面端都能用；
- 有验收数据和演示脚本。

## 6. 非目标

- 不训练自己的大模型；
- 不做微信/QQ 聊天记录的自动读取；
- 不做复杂自动排程（P2）；
- 不为了“大数据”强行引入 Kafka/Spark；
- 不把 DeepSeek Key、数据库密码写进前端或 Git。

## 7. 课程交付物

1. 可公网访问的 Web 应用；
2. 三个 Feature 的可演示功能；
3. 数据契约、接口说明、部署说明；
4. AI 提取的 100 条评测结果；
5. 架构图、测试记录、演示视频/截图。

## 8. 文档索引

- [HTML 逻辑](HTML-LOGIC.md)
- [数据契约](DATA-CONTRACTS.md)
- [Feature 1 · 云端数据](FEATURE-1-CLOUD.md)
- [Feature 2 · AI 提取](FEATURE-2-AI.md)
- [Feature 3 · 可视化](FEATURE-3-VISUALIZATION.md)
- [团队协作](TEAM-WORKFLOW.md)
- [CloudBase 配置](CLOUD-SETUP.md)
- [验收清单](ACCEPTANCE.md)
- [交付模板](DELIVERY-TEMPLATE.md)
