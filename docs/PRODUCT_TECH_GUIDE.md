# AgentCanvas 产品与技术栈交接文档

> 面向:前端/设计、后端、官网集成、产品迭代负责人。
> 目标:讲清楚「产品是什么、用户怎么用、每层技术栈怎么做、导出产物是什么、后续如何迭代组件与事件流、如何与官网融合、我们更新后官网如何同步」。
> 维护约定:UI 组件与事件流由设计侧主导迭代;本文件描述**契约与管道**,不锁死具体视觉。

---

## 0. 一句话定位

**AgentCanvas 是一个「Agent 前端可视化配置器」**:用户在里面**组合**出一套 Agent 交互界面(对话流、工具调用卡、思考过程、产物渲染、输出面板等),然后**一键导出**成一个可独立运行的前端工程。产物在任意 IDE(Codex / Claude / VS Code)里 `npm install && npm run dev` 就能跑;用户接上自己的模型与 Agent 底座后,这套界面就用来承载真实的 Agent 事件流。

**可售核心资产 = 组件定制 + 事件流效果组件**(工具卡/思考/产物的动效呈现)。协议与组件是我们的,底座是用户的。

---

## 1. 产品全貌:两个界面区,别混

打开应用看到的东西分两块,只有一块会被导出:

| 区域 | 是什么 | 会被导出吗 |
|---|---|---|
| **左侧配置器**(主题「原生风/极简风」、头像、输入区、书写流速、内容块、渲染、模型、Git 等控件) | **设计时工具**,用来组合界面 | ❌ 不导出 |
| **中间+右侧的 Agent 界面**(对话列表 / 对话流 + 工具卡 + CODE 产物 / 输出面板 / Git 面板) | 用户**组合出来的成品界面** | ✅ **这就是导出产物** |

一句话:**配置器是"模具",红框里的 Agent 界面是"产品"。**

---

## 2. 用户使用流程(端到端)

```
在官网打开 AgentCanvas 功能区
        │
        ▼
① 组合界面      选主题/组件/布局/动效/工具卡样式/思考&产物呈现方式/模型 provider
        │
        ▼
② 预览          右侧实时预览 = 一段内置 demo 事件流自动回放(离线,零配置)
        │
        ▼
③ 下载 Agent    点右上角「下载 Agent」→ 浏览器端打包出一个 zip(纯前端,无需后端)
        │
        ▼
④ 本地运行      解压 → npm install → npm run dev(或 build 后开 dist/index.html)
        │
        ▼
⑤ 接入          用户填自己的模型 provider(API key)+ 接自己的 Agent 底座事件流
        │
        ▼
⑥ 使用          真实事件流经"用户组合的那套组件与动效"呈现出来
```

**关键认知:用户"组合"的是展示层(组件 + 动效 + 布局 + 主题),不是事件数据本身。** 事件数据来自 demo(预览时)或真实底座(接入后);组合出来的组件是"容器",负责把事件渲染成界面。

---

## 3. 技术栈分层与「每层怎么做」

### 3.1 总体栈
- **构建/运行**:Vite 8 + React 19 + TypeScript(`type: module`,ESM)。
- **UI 基建**:Radix UI(dialog/dropdown/popover/slider/switch/tabs/tooltip)、`cmdk`(命令面板)、`react-resizable-panels`(分栏)、`sonner`(toast)、`lucide-react`(图标)。
- **动效**:`motion`(Framer Motion 内核)、`thinking-orbs`(思考动画)。
- **打包导出**:`jszip`(浏览器端生成 zip)。
- **事件/渲染核心**:见 3.3。

### 3.2 仓库结构(monorepo)
```
agentcanvas/                      ← git 仓库根 = 应用根
├── src/
│   ├── App.tsx                   配置器主界面
│   ├── agentmatrix/              ★ 新事件流标准层(go-forward)
│   ├── agentux/                  旧渲染运行时(legacy,预览与旧导出在用)
│   ├── components/               配置器 UI + 预览组件 + agentmatrix 组件
│   ├── export/                   ★ 导出管线(legacy scaffold)
│   │   ├── scaffoldManifest.ts        生成导出文件清单与内容
│   │   ├── scaffoldDownload.ts        浏览器端打 zip 下载
│   │   └── templates/                 导出工程的模板源(组件 + harness + vendored SDK)
│   ├── schema/agentuxConfig.ts   ★ AgentFrontendProject 配置对象(组合结果)
│   ├── slots/slotRegistry.tsx    区域/槽位 → 组件 的映射
│   ├── theme/themeTokens.ts      主题令牌(6 套预设)
│   └── ...
├── packages/{contract,react}     对外发布的嵌入式包(见 EMBEDDABLE_PACKAGES.md)
├── vendor/agent-ux/              内置 SDK(预构建 dist,已提交进仓库)
│   └── {protocol,react,render-core,runtime}
└── package.json                  @agent-ux/* 用 file: 指向 vendor/agent-ux/*
```

> ⚠️ 历史坑:SDK 的 `dist/` 一度被 `.gitignore` 忽略、且无 `src/`,导致 clone 后 `@agent-ux/*` 是空壳、应用跑不起来。现已把预构建 `dist` 提交进仓库,`.gitignore` 里有 `!vendor/**/dist/` 例外。**以后不要再把 SDK 的 dist 加回 .gitignore**,否则 clone 即坏。

### 3.3 事件流核心(重点)
存在**两套并行的世界**,当前主导出用的是 legacy,新标准是 agentmatrix:

| | legacy(`agentux` + `@agent-ux/*`) | agentmatrix(`src/agentmatrix/*`)★ 未来标准 |
|---|---|---|
| 事件协议 | `@agent-ux/protocol` 事件(`text.*`/`tool.call.*`/`reasoning.*`/`artifact.*`) | `protocol.ts`:版本化事件标准(见 §5) |
| 投影(事件→UI) | `@agent-ux/render-core` viewModel | `projector.ts` + `viewModel.ts` |
| 连后端 | 无(仅本地 harness 直连 provider) | `client.ts`:`createBackendStreamSource`(真 SSE)+ `createMockClient`,mock/live 同构 |
| 导出器 | `export/scaffoldManifest.ts` → `scaffoldDownload.ts` | `agentmatrix/export/exportProject.ts` → `downloadProjectZip` |
| 主「下载」按钮当前接的是 | ✅ 这套 | ❌ 尚未接主按钮(挂在 AgentMatrixApp) |

**结论:预览与主导出目前走 legacy;agentmatrix 是设计好的、更完整的未来标准(自带真后端 SSE、全事件类型),后续迭代要把主导出切到它。**

### 3.4 配置对象:`AgentFrontendProject`(组合结果的唯一数据源)
`src/schema/agentuxConfig.ts`。用户在配置器里的所有选择,最终都落成这个对象,导出时序列化进 `agentux.config.ts`。主要字段组:
- `template`、`runtime{transport: "replay"|"mock"|"sse", harness}`
- `theme{preset, density, radius, motion{reasoning, writing, toolCall, writingParams}}`(6 套主题:`console-light / graphite / oxide / studio-neutral / paper-trail / terminal-green`)
- `providers{connections[]}`、`layout{regions, slots}`
- `composer / conversation / sidebar / context / toolCalls / reasoning / blocks / output / git`(各种开关与呈现模式)

导出时,这些字段会**决定裁剪哪些文件**(如 `blocks.codeDiff`、`git.*`、`output.supportedArtifactRenderers` 控制对应组件文件是否进包)。

---

## 4. 导出产物是什么

**产物 = 一个 zip,不是 npm SDK。** 里面是一个**自带 SDK 的完整 Vite+React 工程**:

```
<项目名>.zip
├── package.json          依赖含 @agent-ux/* = file:./vendor/agent-ux/*(SDK 随包内置)
├── index.html
├── vite.config.ts        含 base: "./"(见 §9 修复)
├── agentux.config.ts     ← 用户这次组合的配置快照
├── src/
│   ├── main.tsx
│   └── agent/
│       ├── layout.tsx           成品界面(对话/工具卡/输出/git)
│       ├── replay.ts            内置 demo 事件流(自动回放)
│       ├── harness/liveTurn.ts  接真模型的 live 路径
│       ├── components/          ChatFrame / ComposerFrame / OutputFrame ...
│       ├── tool-calls/ blocks/ conversation/ output/ context/ git/ providers/
│       └── fixtures/            demo 事件数据
└── vendor/agent-ux/{protocol,react,render-core,runtime}/dist/   内置 SDK
```

**运行方式**(务必告知用户/官网):
- 开发预览:`npm install && npm run dev`
- 静态查看 / 交给 IDE:`npm install && npm run build`,打开 `dist/index.html`
- ⚠️ **不要直接双击源 `index.html`** —— 它指向 `/src/main.tsx`,必须经 Vite。

**产物已包含的事件流**:
- ✅ 事件流引擎(内置 SDK)+ 一段 demo 事件流(打开自动回放,离线可见)+ 渲染这些事件的全部组件与动效。
- ⚠️ 接真模型时,当前 `liveTurn` 只产出**文本事件**;工具卡/思考/产物在 live 下暂不点亮(demo 回放里能看到)。这是 §6 的迭代项。

---

## 5. 事件流标准(agentmatrix 协议,未来对外契约)

`src/agentmatrix/protocol.ts` 已定义一份**版本化(v0.1)**的固定事件标准,这是「无论用户接哪个底座都统一」的关键。事件类型全集:

- **用户侧**:`user.message`、`user.interrupt`、`user.tool_confirmation`
- **Agent 侧**:`agent.message` / `agent.message_delta`、`agent.thinking` / `agent.thinking_delta`、`agent.tool_use` / `agent.tool_result`、`agent.mcp_tool_use` / `agent.mcp_tool_result`、`agent.context_compacted`
- **会话侧**:`session.status_running/idle/rescheduled/terminated`、`session.updated`、`session.deleted`、`session.error`
- **运行时**:`runtime.status`、`runtime.progress`、`runtime.message`
- **Span**:`span.model_request_start`、`span.model_request_end`
- **传输帧**:durable event 帧 + ephemeral delta 帧(`StreamFrame` wire shape,SSE 每行一个 JSON)

**产品化三要素**(§6 会展开):① 冻结这份协议为 v1 + 出对外规范文档;② 每种底座一个薄适配器;③ 付费组件只吃这套事件。

---

## 6. 后续可迭代的组件与事件流(给设计/前端的路线图)

> 组件本质是**事件驱动**:来什么事件、渲染什么。新增组件的关键是「它消费哪个事件类型」。

### 6.1 组件层(设计侧可持续加)
现有效果组件(两套里都有对应):`ChatFrame`(对话流)、`ToolCallCard`(工具调用)、`ThinkingBlock/ReasoningBlock`(思考)、`OutputFrame`+产物渲染器(code/markdown/data/preview/diff)、`ContextChips`、`Composer`、`Sidebar`、`Git 面板`(现为「即将推出」占位)。

可迭代方向(建议):
- MCP 工具调用卡(对应 `agent.mcp_tool_use/result`,协议已留类型,组件可补)
- 多产物 / 产物版本对比(`artifact.*` / diff 视图增强)
- 会话生命周期可视化(`session.*` / `runtime.progress` → 进度、重试、终止态)
- 审批交互(`user.tool_confirmation` → 内联审批 UI)
- 上下文压缩提示(`agent.context_compacted`)
- Git 面板实装(当前占位)

**新增组件三步**:① 确定消费的事件类型;② 在 `projector`/viewModel 里把该事件投影成组件要的数据;③ 组件订阅并渲染。切忌在组件里写死数据。

### 6.2 事件流/管线层(工程侧,产品化必做的三刀)
1. **主导出切到 agentmatrix 管线** —— 让「下载」产出的是能吐全事件、能连真后端(`connectLive`)的版本,而非当前纯文本 legacy。
2. **升级 live harness** —— 把模型的 function-call / 思考 / 产物翻译成对应事件,真接模型时工具卡/思考/产物才会点亮。
3. **冻结协议 v1 + 出《事件流对接规范》+ 主流底座适配器**(Claude / Codex / OpenAI 兼容 / LangGraph…)。用户底座只要说这套"事件流普通话",组件即插即用。

---

## 7. 与官网融合的技术栈

**你们这边(AgentCanvas)交付两层产物,都不是 npm SDK:**
1. **集成产物** = AgentCanvas 应用本身(构建静态产物 / 源码仓库)→ 交给官网团队嵌入。
2. **导出产物** = 用户点下载得到的 zip(§4)→ 官网无需参与生成(打包是纯浏览器端)。

**嵌入方式(向官网团队确认二选一):**

| 方式 | 官网侧做什么 | 你们侧做什么 | 适配成本 |
|---|---|---|---|
| **iframe 嵌一个地址** | 用 iframe 指向你们部署的 URL | 独立部署 AgentCanvas,给出可访问地址 | 最低,跨技术栈通吃(官网 React/Vue/静态都行) |
| **作为子路由/子应用挂进官网工程** | 在其工程里挂载路由并加载资源 | 交源码 + 构建产物,配合调 `base` 路径 | 中,官网需是 React 或能承载 |

**推荐(9 月上线、时间紧、官网栈未知):优先 iframe**——改动最小、与官网技术栈解耦、最快上线;深度融合留待后续迭代。

> 因导出打包是浏览器端(JSZip + `URL.createObjectURL` + `a.click()`,见 `export/scaffoldDownload.ts`),无论哪种嵌入方式,「生成 zip 下载」都不需要官网后端。

---

## 8. 我们更新 → 官网如何同步最新产物

取决于 §7 的嵌入方式:

- **若走 iframe**:官网嵌的是你们的 URL。**你们重新部署 = 官网自动拿到最新**,官网侧零改动。这是同步成本最低的方案。
- **若走子应用/子路由**:每次更新需**重新构建并把静态产物交给官网**(或走同一条 CI 发布同一份构建物)。建议约定:
  1. 你们仓库打 tag / 出 release;
  2. CI 产出 `dist/` 静态产物(或发布到 CDN);
  3. 官网引用固定版本号,升级时替换版本。

**版本管理建议(重要):** 给「导出模板 + SDK + 事件协议」一个统一版本号。用户导出的 zip 里写入该版本,便于日后排查「某个用户的产物是哪版组件/协议」。

---

## 9. 已知问题与已修复项

- ✅ **导出产物样式全丢(已修)**:构建产物原用绝对资源路径 `/assets/...`,在 file:// / 子路径 / IDE 预览下 CSS 404。已在两个导出器生成的 `vite.config.ts` 加 `base: "./"`(相对路径):`export/scaffoldManifest.ts`、`agentmatrix/export/exportProject.ts`。**此修复须合入主仓库一次,后续所有导出自动继承。**
- ⚠️ **SDK dist 不可再被 gitignore**:否则 clone 即坏(见 §3.2)。
- ⚠️ **live 事件不全**:接真模型当前只吐文本(§6.2 第 2 刀)。
- ⚠️ **主导出仍是 legacy 管线**:agentmatrix 更完整但未接主按钮(§6.2 第 1 刀)。
- 🕗 **Git 面板为占位**(「即将推出」)。

---

## 10. 迭代注意事项(团队协作)

1. **分层解耦是纪律**:组件/动效改在 `components/**`、`agent/**`;事件协议/投影改在 `agentmatrix/**`;构建/导出配置改在 `export/**`。三者物理隔离,别互相渗透。
2. **组件必须事件驱动**:不在组件内写死内容,一律从 viewModel/事件取数,否则真接模型时无法复用。
3. **改导出模板后跑冒烟**:`npm run test:export-smoke`(真装真构建导出产物),以及 `npm run typecheck`。
4. **验证要模拟真实场景**:干净目录 `npm install && npm run build`,开 `dist/index.html`(file://)确认样式+事件流 demo 正常——这才是用户/IDE 的真实打开方式。
5. **协议是对外契约**:一旦冻结 v1,变更要走版本化,避免打破已导出用户的产物。
6. **端口占用**:本机 5173 常被别的项目占(历史上是 RdWork),本项目请用独立端口起 `dev` 避免误判。

---

## 附录:常用命令
```bash
# 应用(在仓库根目录下)
npm install
npm run dev            # 起配置器
npm run build          # tsc + vite build
npm run typecheck
npm run test:export-smoke   # 导出产物真装真构建冒烟测试

# 验证某个导出 zip
cd <解压目录> && npm install && npm run build && open dist/index.html
```
