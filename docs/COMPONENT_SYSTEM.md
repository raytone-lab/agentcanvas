# AgentCanvas 组件体系规范（Component System Spec）

> 本文档是组件扩建的唯一事实来源。所有新组件、重构、导出模板更新都必须遵循本规范。
> 产品边界见 AGENTS.md：schema 驱动、区域受限（main/composer/right-panel/bottom-dock/overlay）、组件必须可导出为真实代码。

---

## 1. 三层架构

```
Layer 3  框架/区域组件   AppShell · Topbar · PresetRail · 区域容器 · StatusBar
Layer 2  Agent 专属块    ChatFrame · ToolCallCard · PlanBlock · DiffBlock …
Layer 1  基础组件        Button · Input · Dialog · Tabs · Badge …（src/components/ui/）
Layer 0  设计令牌        颜色（themeTokens，按主题切换）+ 结构令牌（:root，主题无关）
```

规则：

- Layer 2/3 **只能**通过 Layer 1 组件与 Layer 0 令牌构建，禁止裸 `<button>`、裸 hex、裸 px 动效时长。
- Layer 1 组件**不感知** AgentUX 事件与 project schema，纯展示 + 受控交互。
- Layer 2 组件消费 AgentUX view model（来自 `@agent-ux/render-core`），不直接消费 provider 流。

## 2. 设计令牌（Layer 0）

### 2.1 颜色令牌（已存在，本期不动）

`src/theme/themeTokens.ts` 的 6 套主题预设：surface / text / border / accent / status。

### 2.2 结构令牌（本期新增，写入 `:root`，主题无关）

```css
:root {
  /* 间距阶梯（4px 基准） */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-7: 32px; --space-8: 40px;

  /* 圆角阶梯（--radius: 8px 已存在，保持别名兼容） */
  --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-full: 999px;

  /* 字号阶梯（界面整体为紧凑密度） */
  --text-xs: 11px; --text-sm: 12.5px; --text-md: 13.5px; --text-lg: 15px; --text-xl: 18px;

  /* 行高 */
  --leading-tight: 1.3; --leading-normal: 1.55;

  /* 动效（所有 transition/animation 必须引用，禁止硬编码时长） */
  --motion-fast: 120ms; --motion-base: 160ms; --motion-slow: 240ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.45, 0, 0.25, 1);

  /* 阴影阶梯（--shadow 已存在 = lg 别名） */
  --shadow-sm: 0 1px 2px rgba(21, 25, 34, 0.06);
  --shadow-md: 0 4px 12px rgba(21, 25, 34, 0.08);
  --shadow-lg: 0 18px 42px rgba(21, 25, 34, 0.08);

  /* 层级 */
  --z-dropdown: 50; --z-overlay: 100; --z-modal: 110; --z-toast: 200; --z-tooltip: 300;

  /* 焦点环（统一配方，所有可交互组件复用） */
  --focus-ring: 0 0 0 2px var(--surface-panel), 0 0 0 4px color-mix(in srgb, var(--accent) 72%, white);
}
```

> motion 值未来可下放到主题预设（如 terminal-green 使用 steps() 曲线），本期先全局统一。

## 3. 交互状态标准（精致度的硬性验收线）

每个可交互的 Layer 1 组件**必须**实现全部适用状态，缺一不收：

| 状态 | 实现要求 |
|---|---|
| hover | 背景或边框可感知变化，transition 用 `--motion-fast` |
| active | 按压反馈（背景加深一档，或 `transform: translateY(0.5px)`） |
| focus-visible | `box-shadow: var(--focus-ring)`，**禁止** `outline: none` 裸删 |
| disabled | `opacity: 0.52` + `cursor: not-allowed`（沿用现有全局约定），同时阻断 hover/active |
| loading | 仅 Button：内嵌 Spinner，宽度不跳动（保留原文案占位），`aria-busy="true"` |
| selected/checked | Switch/Tabs/DropdownMenu item：accent 着色 + `aria-checked`/`aria-selected` |

可访问性底线：图标按钮必须 `aria-label`；Dialog/Popover 用 Radix 保证焦点圈闭与 Esc 关闭；装饰性元素 `aria-hidden`。

## 4. Layer 1 组件 API 约定

- 目录：`src/components/ui/<name>.tsx` + 同目录 `<name>.css`（组件内 `import "./<name>.css"`）。
- 类名：`ui-<name>` 前缀（与存量 app.css 的全局类隔离）；变体/尺寸用 data 属性，与项目现有风格一致：

```tsx
<button className="ui-button" data-variant="primary" data-size="sm" data-loading="true">
```

- 变体集合：
  - Button `variant: primary | secondary | ghost | danger`，`size: sm | md | lg`（高度 26 / 32 / 40px）
  - IconButton `size: sm | md`（26 / 32px 正方形），必填 `label`（写入 aria-label + Tooltip）
  - Badge `tone: neutral | accent | success | warning | danger | info`
  - Input/Textarea：含前后缀插槽；Textarea 支持 `autoGrow`
- 统一从 `src/components/ui/index.ts` 桶导出。
- 受控优先：组件不持有业务状态；开合类（Dialog/Popover）同时支持非受控默认值。
- 依赖策略：交互复杂组件用 Radix（dialog/popover/dropdown-menu/switch/slider/tabs），Select 沿用原生 `<select>` 样式化（保持可导出的轻量性）。

## 5. 组件清单与状态

图例：✅ 已有可用 · 🔶 已有需重构 · ⬜ 待新建

### Layer 1 基础组件（P1）

| 组件 | 状态 | 说明 |
|---|---|---|
| Button | ⬜ | 4 变体 × 3 尺寸 + loading |
| IconButton | ⬜ | 替换全部裸 `.icon-button` |
| Badge / StatusPill | ⬜ | 吸收现有 `.status-pill` |
| Input / Textarea | ⬜ | Textarea 支持 autoGrow |
| Select | ⬜ | 原生 select 包装 |
| Switch | ⬜ | Radix |
| Slider | ⬜ | Radix（思考预算用） |
| Tabs | ⬜ | Radix |
| Dialog | ⬜ | Radix，modal + 非 modal |
| Popover | ⬜ | Radix，吸收 ProviderFloatingSettings 手写浮层 |
| DropdownMenu | ⬜ | Radix |
| Tooltip | 🔶 | 已有 IconTooltip（Radix），收编进 ui/ 并统一样式 |
| Spinner | 🔶 | 已有 AgentActivitySpinner，ui/ 重导出薄封装 |
| Skeleton | ⬜ | 文本行 / 块 / 圆形三种形态 |
| Kbd / Separator | ⬜ | 快捷键提示、分隔线 |

### Layer 2 Agent 专属块

**对话流（P2）**

| 组件 | 状态 | 说明 |
|---|---|---|
| MarkdownRenderer | ⬜ | 流式安全（未闭合 fence 容错），无重型依赖 |
| CodeBlock | ⬜ | 复制按钮 / 语言标签 / 行号 / 折行开关 |
| DiffBlock | ⬜ | +/- 行底色、行号槽、文件头；供 ToolCallCard 与 OutputFrame 共用 |
| TableRenderer | ⬜ | Markdown 表格 |
| SystemNotice | ⬜ | 上下文压缩 / 中断 / 重连提示条 |
| StreamingCursor | ⬜ | 打字游标，接 `streaming: true` |
| ScrollToBottom | ⬜ | 悬浮按钮 + 自动吸底逻辑 |
| MessageBubble | 🔶 | 从 ChatFrame 内联 JSX 抽出，接 MarkdownRenderer |
| CitationChip | ⬜ | 引用来源（P4 可延后） |

**Agent 活动（P3）**

| 组件 | 状态 | 说明 |
|---|---|---|
| PlanBlock / TodoList | ⬜ | Agent 任务清单（pending/in_progress/done），对应新增 preset 组 |
| ToolCallGroup | ⬜ | 连续工具调用折叠为"执行了 N 个操作" |
| TerminalBlock | ⬜ | 流式命令输出（黑底、自动滚动、退出码） |
| StepTimeline | ⬜ | 消费 SDK 已支持的 step 事件；需补 step fixture |
| SubagentCard | ⬜ | 子代理运行卡片 |
| FileChangesSummary | ⬜ | "修改 3 个文件 +48 −12" 汇总条 |
| SearchResultsCard | ⬜ | 搜索类工具结果卡 |
| ReasoningBlock | 🔶 | 迁移到 Layer 1 基座 + Markdown summary |
| ToolCallCard | 🔶 | 迁移 + 输入/输出块换 CodeBlock/DiffBlock |
| ApprovalSurface | 🔶 | 审批按钮接事件续推（让 mock 审批流可点） |

**Composer / 会话（P4）**

| 组件 | 状态 | 说明 |
|---|---|---|
| SlashCommandMenu | ⬜ | 复用 cmdk |
| MentionPicker | ⬜ | @文件 / @工具 |
| AttachmentPicker | ⬜ | 替换假文件 chips |
| ThinkingBudgetControl | ⬜ | Slider + Popover，替换死按钮 |
| ToolToggleMenu | ⬜ | DropdownMenu，替换死按钮 |
| TokenCounter | ⬜ | 估算展示 |
| ConversationList | ⬜ | 会话历史侧栏（新 slot 组件 + preset 组） |
| ComposerFrame | 🔶 | P1 试点重构对象 |

**输出 / Git（P3-P4）**

| 组件 | 状态 | 说明 |
|---|---|---|
| JsonTreeViewer | ⬜ | 替换 `JSON.stringify` 直出 |
| ArtifactTabs | ⬜ | 多产物切换 |
| FileTree | ⬜ | Git/项目文件树 |
| CommitHistory | ⬜ | 提交列表 |
| DiffViewer | ⬜ | DiffBlock 的整页形态 |
| OutputFrame / GitFrame | 🔶 | 迁移基座 + 接新渲染组件 |

### Layer 3 框架（P4）

StatusBar ⬜ · KeyboardShortcutsSheet ⬜（Dialog + Kbd）· AppShell/Topbar/PresetRail 🔶（迁移基座）

## 6. 与 preset / slot / export 体系的衔接

- 每个新 Layer 2 组件如引入可配置 UX 行为，必须注册对应 preset option（`src/schema/presets.ts`），归入现有组：UX Effects / Tool Calls / Blocks / Composer / Output / Git / Theme；PlanBlock、ConversationList 各自新增 preset 组。
- 进入布局的组件（ConversationList、StatusBar）需注册到 `src/slots/slotRegistry.tsx`，并遵守五区域约束。
- **导出同步**：预览组件升级后，`src/export/scaffoldManifest.ts` 的模板必须同步（Layer 1 的 ui/ 目录整体随导出包输出），保持"导出即真实可运行代码"。

## 7. 分期计划

| 期 | 内容 | 验收 |
|---|---|---|
| **P1** | 结构令牌 + Layer 1 全部 15 个 + 试点重构 ComposerFrame、ProviderFloatingSettings | `npm test` / `typecheck` 全绿；存量测试断言的类名/aria/文案不破坏 |
| **P2** | 渲染三件套（Markdown/CodeBlock/DiffBlock）+ MessageBubble/SystemNotice/StreamingCursor，打通 ChatFrame/OutputFrame/ToolCallCard | 新组件单测 + 既有 fixture 全部正确渲染 |
| **P3** | Agent 活动块（PlanBlock/ToolCallGroup/TerminalBlock/StepTimeline 等）+ 对应 preset 组 + step fixture | 每个块有 fixture 驱动的预览 + preset 可切换 |
| **P4** | Composer 增强 + ConversationList + 框架层 + 导出模板全量同步 | 导出包 smoke 测试通过 |

## 8. 验收清单（每个组件合入前自查）

- [ ] 全部适用交互状态（§3）实现且用令牌驱动
- [ ] 无裸 hex / 裸 px 时长 / `outline: none`
- [ ] 类名 `ui-` 前缀（L1）或语义前缀（L2），变体走 data 属性
- [ ] aria 完整；键盘可达
- [ ] `npm test` + `npm run typecheck` 通过
- [ ] 若改动预览组件：检查 export 模板是否需要同步
