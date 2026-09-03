# 应用架构与模块说明（App Architecture）

> 本文档是 `src/app` 分层与 `agent-preview` 模块边界的唯一事实来源。改动 App 编排、
> 工作区状态机或随导出包发布的组件前，先读本文档的约束（§8）。
> 组件分层规范见 [COMPONENT_SYSTEM.md](./COMPONENT_SYSTEM.md)，产品边界见 [AGENTS.md](../AGENTS.md)。

---

## 1. 总览：MVVM 分层

2026-09 重构后，App 不再是一个 3784 行的上帝组件，而是组合根（composition root）。
编排逻辑按 MVVM 拆到 `src/app/`：

```
Model       src/schema（AgentFrontendProject、presets）+ AgentUX runtime / render-core
              ↓ 类型化 schema 与事件流，本层不感知 UI
ViewModel   src/app/state       工作区状态机（reducer，纯函数，37 个具名 action）
            src/app/viewmodel   控制器：动作工厂 + 领域 hook（provider / style switch）
            src/app/projection  纯函数投影：预置数据、事件构造、滚动、输出面板、选中组件
              ↓ props / dispatch / 回调
View        src/app/view        Topbar · PresetRail · InlineApprovalDemo（构建器 chrome）
            components/agent-preview/*  画布组件（ChatFrame、OutputFrame、ComposerFrame…）
              ↑ 组合根只做接线
App.tsx     696 行：hooks → 派生 view model → controller → slotContext → JSX
```

设计模式对应：

| 模式 | 落点 |
|---|---|
| Command | `workspaceState.ts` 的 action —— 每个具名意图对应旧 App() 里一段 setState 序列 |
| Facade | `ChatFrame.tsx` / `OutputFrame.tsx` 保留原路径再导出子模块公共 API；`createWorkspaceController` 合并 preview/run 动作 |
| Strategy | 运行模式三策略：replay / live / pi（`runActions.ts`） |
| Observer | AgentUX 事件流（AsyncIterable → runtime → view model），本层不变 |

## 2. `src/app/state` —— 工作区状态机

`workspaceState.ts`（552 行）持有编辑器 UI 与预览运行的全部非 project 状态：
surface 模式、预设轨选择、运行事件与来源、replay/live/pi 运行态、审批覆盖层、
输出面板条目、Pi 会话、savedPreview 快照等（见 `WorkspaceState` 类型，30+ 字段）。

**不进 reducer 的状态**：project 本体（`App.tsx` 的 `useState`，schema 是事实来源）、
commandMenu 开关、图标集（context）、provider sessionKeys（provider hook）。

action 语义分组（共 37 个）：

- **通用**：`patch`（单字段 UI 设置）、`bump`（writingReplayKey / toolCollapseSignal 自增）
- **进入预览**：`beginStandardStream` · `previewStateCard` · `showToolActionsOverview` ·
  `thinkingPreview` · `conversationWritingPreview` · `mediaPreviewStarted` · `replayConversationFixture` ·
  `replayStandardScenario` · `presetFixtureSelected` · `replayWritingOutput`
- **运行编排**：`resetRun` · `enterWelcome` · `streamEvents` · `replayCurrent` ·
  `savedPreviewEntered` · `savedReplayStarted` · `liveTurnStarted` · `liveFinished` ·
  `piTurnStarted` · `piConversationUpdated` · `piConfigurationFailed` · `piConversationSelected` ·
  `newPiConversationStarted` · `runModeChanged`
- **面板/轨道**：`presetGroupSelected` · `fixtureSelected` · `outputItemOpened` · `outputItemClosed` ·
  `outputPanelAutoFilled` · `outputPanelReset` · `gitOverrideCommitted` · `autoRailsHidden` · `recordPrompt` · `updateSavedProject` · `localeDefaultPromptSwapped`

约定：

- reducer 必须**纯**（StrictMode 双调用下安全）：不写 ref、不发 toast、不滚 DOM。
  副作用一律放在 viewmodel 层。
- 多字段转移一次 dispatch 完成（等价于旧代码一次事件处理器里被 React 批处理的多个 setState）。
- 保留原语义的守卫：`autoRailsHidden` 值不变时返回原引用；`replayCurrent` 沿用
  `runEvents` 为 `[]`（truthy）时不回退 fixture 的分支；`outputItemClosed` 复刻
  激活 tab 的前移规则。
- 每个有行为的转移在 `workspaceState.test.ts`（180 行）有过渡测试；改 reducer 先改测试。

## 3. `src/app/viewmodel` —— 控制器层

| 文件 | 职责 |
|---|---|
| `useWorkspaceState.ts` | `useReducer` + 副作用 ref（流取消、abort、rAF 合并、刷新定时器、输出面板签名）+ locale 默认提示词置换 effect + 卸载清理。**状态先于动作**：App 先拿到 state 做派生，再创建控制器，避免循环依赖 |
| `createWorkspaceController.ts` | 门面（94 行）：组装共享上下文 + preview/run 两半 + git/output/export 胶水函数，返回统一动作 API |
| `previewActions.ts` | 构建器侧意图（642 行）：预设选择、状态卡、书写模式、媒体预览、provider 快捷切换、消息操作 |
| `runActions.ts` | 运行编排（524 行）：保存预览、replay 流式揭示、live 帧合并提交、Pi 回合与会话生命周期 |
| `controllerShared.ts` | `WorkspaceControllerDeps` / `ControllerContext` 类型、`createProjectUpdater`（saved-preview 模式下改快照而非编辑工程）、`bumpPreviewRefresh` |
| `useProviderSettings.ts` | provider 连接 CRUD + 模型探测/拉取（网络与 toast）；不含运行态写操作 |
| `useStyleSwitch.ts` | 风格确认对话框 + 450ms 切换动画 + 确认后重置主题与头像默认值 |

约定：

- 动作工厂是**普通函数不是 hook**（不持有响应式状态），每轮渲染重建闭包 —— 与旧 App()
  内联函数的更新语义逐字一致。**不要**给它们加 `useMemo`/`useCallback`，那会引入旧值闭包。
- 每个 action 函数体是旧 App() 同名函数的逐行转录（setState → dispatch）。
  修 bug 时保持这种一一对应，方便对照 git 历史。

## 4. `src/app/projection` —— 纯函数投影

| 模块 | 内容 |
|---|---|
| `presetRailData.ts` | 预设轨数据与分类：分组图标/分区、必需项集合、思考/媒体判定、AgentMatrix 状态卡表（V1 可见集）、`STYLE_AVATAR_DEFAULTS`、响应式断点 |
| `previewDefaults.ts` | 预览文案默认值：默认提示词、live 回退提示、Pi 配置失败文案、标准场景标题/摘要、场景标签、`formatCopy`、live 模式 git 占位态 |
| `previewEventBuilders.ts` | 演示事件流构造器：工具总览、书写模式预览、思考预览（AgentUX 标准事件名） |
| `previewReplayPacing.ts` | replay 揭示节奏：首屏揭示条数、逐事件延迟 |
| `previewScroll.ts` | 预览滚动与聚焦：锚点回退链、嵌套容器滚动、`data-preview-focus` 高亮 |
| `outputPanelProjection.ts` | 输出面板条目投影：tool/artifact → 面板项、可打开文件名白名单、媒体风格映射、条目签名（自动填充去重） |
| `selectedComponents.ts` | 「已选组件」清单投影：有效选中判定、分组排序（跟随轨道分区顺序）、消息操作字典派生 |

约定：projection 只做 **(state, props) → 数据** 的纯计算，不 import React。

## 5. `src/app/view` —— 构建器 chrome

| 组件 | 说明 |
|---|---|
| `Topbar.tsx` | 顶栏。自带局部状态：语言菜单、已选组件弹层（含外点关闭）；其余全部 props |
| `PresetRail.tsx` | 左侧预设轨：风格卡 + 确认对话框、分组图标栏、分组面板（状态卡、Git 占位、Provider 面板、选项网格、消息操作） |
| `InlineApprovalDemo.tsx` | 审批演示覆盖层 + `findPendingApprovalTool` / `demoApprovalTool` 工具 |

View 只通过 props 回调触发控制器动作，不 dispatch、不读 reducer 原始状态。

## 6. `App.tsx` —— 组合根接线顺序

```
context hooks（copy / locale / iconSet）
→ project useState（Model）
→ useWorkspaceState(locale)                    # reducer + refs
→ createProjectUpdater + useProviderSettings   # 需要 updater 的领域 hook
→ useStyleSwitch
→ useAgentUXViewModel / 派生 memo              # displayViewModel、面板默认项、可见分组…
→ effects（准入日志、输出自动填充、replay、主题、ResizeObserver、模板组、⌘K）
→ createWorkspaceController(deps)              # 依赖上面的派生值，所以放最后
→ 审批覆盖层 JSX、slotContext、renderSlots
→ JSX（Topbar / PresetRail / 画布区域）
```

控制器在派生之后创建是**有意的**（控制器消费 `isWelcome`、`rightPanelAvailable` 等派生值）。

## 7. `agent-preview` 模块边界

两个大门面 + 两个子目录，子目录文件随 scaffold 导出 glob 一并进导出包：

- **`ChatFrame.tsx`（441 行）**：保留会话列表渲染核心（entries 构建、turn 分组、
  TimelineItem 分派、错误/步骤图标槽位、空态）与 `externalApprovalPlacement = "overlay"`
  默认值；`chatframe/` 承载 `approval.tsx`（内联/外层审批三组件）、`ArtifactLaunch.tsx`
  （产物/媒体卡片）、`MessageActions.tsx`（消息操作条）。公共 API 从 ChatFrame 再导出。
- **`OutputFrame.tsx`（113 行）**：面板壳 + 展开态 + 再导出；
  `outputframe/` 承载 panelItem 规范化、renderKind 分类、媒体预览、打开项渲染体、
  tabs、modal、artifact 渲染分支、source 切换、labels、`markdown/`（补全的
  Markdown 渲染，见 §7.1）。

### 7.1 Markdown 渲染（`outputframe/markdown/`）

| 文件 | 职责 |
|---|---|
| `renderMarkdown.tsx` | 块级渲染器：标题（# → h4 阶梯）、列表、引用、分割线、围栏代码块（`mermaid` 围栏 → 图）、单行/多行 `$$` 块公式、段落折叠 |
| `inline.tsx` | 内联解析：行内代码（优先保护）、`$…$` 与 `\(…\)` 公式、粗体、斜体、http(s) 链接；未知语法原样输出 |
| `Math.tsx` | KaTeX 渲染组件（`throwOnError: false`，出错回退为 `code` 显示源码） |
| `MermaidDiagram.tsx` | 懒加载 mermaid：动态 import、首次 `initialize({ startOnLoad: false, securityLevel: "strict" })`，加载/解析失败回退为源码块 |

约定：解析器是自研轻量实现（不引 remark/markdown-it），覆盖 Agent 产物常见语法；
SSR/测试环境下 mermaid 渲染为 pending 占位，真实渲染走客户端动态 import。语义：
`.md-math-*`/`.md-mermaid`/`.md-code-block` 等样式类均定义于 `styles/app.css`（语义令牌），
随导出 glob 一并打包。

## 8. 硬约束（改这些之前必读）

1. **scaffold 断言**：`scaffoldManifest.test.ts` 断言导出包含
   `src/components/agent-preview/ChatFrame.tsx`、内容含字面量 `"chat-frame"` 与
   `externalApprovalPlacement = "overlay"`、且 >5000 字节；`exportFacts.test.ts` 把
   落地页公示的文件数（`EXPORT_FILE_COUNT = 202`）钉到真实快照。清单变化必须同步常量。
2. **新文件只能放 `src/components/agent-preview/` 内**（含子目录）：导出 glob 只打包该
   目录，移出去会让导出工程编译失败。
3. **markdown 渲染依赖随导出包发布**：`katex`、`mermaid`、`@types/katex` 已在编辑器
   `package.json` 与 `scaffoldManifest` 的导出 package.json 两边同时声明；mermaid 走
   动态 import，不进主 chunk。
4. **reducer 纯函数**（见 §2）；副作用归 viewmodel。
5. **行为等价优先**：本轮重构是逐行转录（setState → dispatch），不要在转录中顺手
   改变行为；发现的 bug 单独修并注明（例：模板 `pendingApprovalTool` 类型谓词修复）。
6. `icons.tsx`（1366 行）是 SVG 图标注册表，数据型代码，**不拆**。

## 9. 如何扩展

**新增一个预置意图**（例：新的预览入口）：
1. `workspaceState.ts` 加 action 类型 + handler（对照旧 setState 序列写）；
2. `workspaceState.test.ts` 加过渡测试；
3. `previewActions.ts` / `runActions.ts` 加动作函数并加入对应工厂的 return；
4. View 里挂回调。

**新增一种输出渲染器**：`outputframe/renderKind.tsx` 加分类 →
`openedItemBody.tsx` 或 `artifactPreview.ts` 加渲染 → 需要新 UI 时建子组件文件（留在
`outputframe/` 内）。

**新增构建器 chrome 面板**：放 `src/app/view/`，props 回调接控制器，不引入 reducer 直连。

## 10. 变更记录

- 2026-09-03：初始版本。App.tsx 3784→696、ChatFrame 1089→441、OutputFrame 1051→113，
  行为等价重构（四层验证：482 测试 / typecheck / 构建 / pnpm 导出冒烟 install→typecheck→build）。
  同批清理死代码（`ScenarioCards`、`mergedScenarios`、`sessionStatusSlot`、`runStatusLabel`、
  `fallbackOpenedItemBody`、`outputSubtitle`、`artifactStatusLabel`）并修复导出模板
  `pendingApprovalTool` 缺类型谓词导致的导出包 typecheck 失败。
