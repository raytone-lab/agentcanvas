# AgentCanvas Design System

> 本产品 UI/UX 的**视觉 + 交互事实来源**。遵循 [Google Stitch DESIGN.md 格式](https://stitch.withgoogle.com/docs/design-md/overview/)。
> 所有颜色、字号、间距、圆角、阴影、动效值均**从现有实现抽取**（`src/theme/themeTokens.ts` + `src/styles/app.css`），不臆造。
>
> **分工**：本文件规范「设计语言与交互」；`docs/COMPONENT_SYSTEM.md` 规范「组件三层架构与花名册」；`AGENTS.md` 规范「产品边界」。三者互不重复。
> **约束**：生成任何 UI 前必须读本文件。只用语义 token，禁止裸 hex、裸 px 动效时长、`outline: none`。

---

## 1. Visual Theme & Atmosphere

**情绪关键词**：工程化 · 克制 · 高信息密度 · 冷静克制（纯白内容区 + 冷灰中性 + OpenAI 蓝点睛，极致扁平、留白充足）。

**产品语境**：AgentCanvas 是 Agent 前端脚手架的**可视化配置器**——用户在此调 UX 预设、实时预览、再导出可运行工程。因此 UI 必须：
- 让"预览区"像**真实的 Agent 产品**（对话、工具调用、产物、Git 都要有产品级质感）；
- 让"配置区"（预设轨、topbar）保持工具化的低调，不与预览争夺注意力。

**参考坐标**：OpenAI Codex / ChatGPT 桌面端——纯白 + 冷中性灰的分层，**单一 OpenAI 蓝**作为唯一动作色（发送、开关、链接、焦点），选中态是中性浅灰药丸而非彩色底，阴影几乎不可见。默认主题 `console-light`（Codex Light）即由其派生。

**Don't**
- ❌ 大圆角、强渐变、拟物投影、彩色霓虹
- ❌ 暖奶油/暖色底（回归冷中性白灰）
- ❌ 蓝色滥用（蓝只给动作/选中/焦点/链接；选中项底用中性灰药丸，不用蓝底大填充）
- ❌ 装饰性插画、emoji 当图标
- ❌ 动效超过 240ms 或带弹跳

---

## 2. Color Palette

颜色**随主题切换**：所有语义角色是 CSS 变量，具体 hex 由当前主题预设决定。下表记录**默认主题 `console-light`** 的精确值，作为设计参考基准。6 套预设见 §2.6。

### 2.1 Primary (Brand / Accent)
| Token | Hex (console-light) | 用途 |
|---|---|---|
| `--accent` | `#0d6efd` | 主操作、发送、开关开启、焦点、链接（OpenAI 蓝） |
| `--accent-hover` | `#0a58cc` | accent 悬停/按压加深 |
| `--accent-soft` | `#e8f0fe` | accent 低饱和底（Agent 头像底、极轻蓝提示） |

> 用户消息气泡**不用 accent 填充**（用中性 `--surface-inset` + `--text-primary`）。选中项优先用中性浅灰药丸（`--surface-hover`）而非蓝底。
>
> **主按钮 = 墨黑，不是蓝**：primary / send（发送、导出脚手架）用 `background: var(--text-primary)`（亮主题即近黑）+ `--text-inverse` 白字；蓝 `--accent` 只保留给**开关、焦点环、链接**等小面积交互。黑=主操作、蓝=交互点缀，层级分明。

### 2.2 Surface（层级底色，由浅入深）
| Token | Hex | 用途 |
|---|---|---|
| `--surface-canvas` | `#f5f5f7` | 应用最底层画布（冷中性浅灰） |
| `--surface-panel` | `#ffffff` | 面板/卡片/气泡主体（纯白） |
| `--surface-raised` | `#fbfbfc` | 抬升面（frame 容器） |
| `--surface-inset` | `#f0f0f3` | 凹陷面（chip、model-picker、代码块底、用户气泡） |
| `--surface-hover` | `#e8e8ec` | 通用悬停底 / 选中项药丸底 |

### 2.3 Text
| Token | Hex | 用途 |
|---|---|---|
| `--text-primary` | `#0d0d0d` | 标题、正文强调（近黑） |
| `--text-secondary` | `#40414f` | 正文（冷灰） |
| `--text-muted` | `#8e8ea0` | 次要信息、区块标签、占位（冷灰） |
| `--text-inverse` | `#ffffff` | 深底/accent 底上的文字（如按钮白字） |

### 2.4 Border
| Token | Hex | 用途 |
|---|---|---|
| `--border-subtle` | `#ececee` | 卡片内分隔、hairline |
| `--border-strong` | `#dcdce0` | 面板外框、输入框边界 |

### 2.5 Semantic / State
| Token | Hex | 语义 |
|---|---|---|
| `--success` | `#10a37f` | 工具成功、Git 已提交（OpenAI 绿） |
| `--warning` | `#b7791f` | 待审批、告警 |
| `--danger` | `#dc2626` | 错误、停止、破坏性操作 |
| `--info` | `#2563eb` | 进行中、信息提示（蓝） |

> 状态色仅用于**语义指示**（状态点、工具卡左边条、状态 pill），不做大面积填充。

### 2.6 Theming Axis（6 套主题预设）
定义于 `src/theme/themeTokens.ts`，通过 `applyTheme()` 注入到预览容器。每套只改上述语义 token 的取值，**结构不变**。

| id | 名称 | 基调 | accent |
|---|---|---|---|
| `console-light` | Codex Light | 默认 · 冷中性白（Codex/ChatGPT 派生） | `#0d6efd` OpenAI 蓝 |
| `graphite` | Graphite Mono | 暗色 · 石墨 | `#75b7a5` |
| `oxide` | Oxide Workbench | 暖白 | `#326f5a` |
| `studio-neutral` | Studio Neutral | 冷白 | `#5b648f` |
| `paper-trail` | Paper Trail | 暖纸 · 衬线 | `#8d5039` |
| `terminal-green` | Terminal Green | 暗色 · 等宽终端 | `#7acb83` |

### 2.7 Guardrails（色彩禁令）
- 组件内**禁止裸 hex**；一律用语义 token。
- 需要"基于 accent 的半透明/混合色"时用 `color-mix(in srgb, var(--accent) N%, ...)`，不要手写新 hex。
- 状态色不参与主题品牌表达，跨主题保持"红=danger、绿=success"的稳定语义。

---

## 3. Typography

### 3.1 Font Stack（随主题切换）
| Token | console-light 取值 | 用途 |
|---|---|---|
| `--font-ui` | `Inter, system-ui, …` | 界面正文与控件 |
| `--font-display` | `Inter, …` | 标题（frame header、topbar） |
| `--font-mono` | `SFMono-Regular, Consolas, …` | 代码、路径、diff、计数、状态元信息 |

> 各主题可替换字体栈（如 `paper-trail` 用 Source Serif、`terminal-green` 全等宽），但角色（ui/display/mono）不变。

### 3.2 Type Scale（紧凑密度，主题无关）
| Token | 值 | 用途 |
|---|---|---|
| `--text-xs` | `11px` | eyebrow / 标签 / chip / 元信息 |
| `--text-sm` | `12.5px` | 次要正文、说明 |
| `--text-md` | `13.5px` | 正文默认、卡片标题 |
| `--text-lg` | `15px` | 区块标题 |
| `--text-xl` | `18px` | 页面级标题（少用） |
| Frame header | `14px` | `--font-display`，`line-height:1.2` |

### 3.3 Leading
`--leading-tight: 1.3`（标题/单行）· `--leading-normal: 1.55`（正文段落）。

### 3.4 权重与字形约定
- eyebrow / role 标签：`font-weight: 700`，`text-transform: uppercase`，`letter-spacing: 0.02–0.03em`。
- 卡片标题：`font-weight: 640–660`（不过粗）。
- 数字/路径/计数：走 `--font-mono`，保持对齐。

---

## 4. Geometry & Shape

### 4.1 Border Radius
| Token | 值 | 用途 |
|---|---|---|
| `--radius-sm` | `6px` | 内部小元素、气泡"说话方向"缺角 |
| `--radius-md` | `8px` | 控件默认（按钮、输入、chip、pre） |
| `--radius-lg` | `12px` | 卡片、气泡、Composer 外壳、面板内卡 |
| `--radius-full` | `999px` | pill、头像、状态点、Send 键 |
| `--radius`（别名）| `8px` | = `--radius-md`，历史别名，勿新增用法 |

### 4.2 Spacing Scale（4px 基准 / 8dp 节奏）
`--space-1:4` · `--space-2:8` · `--space-3:12` · `--space-4:16` · `--space-5:20` · `--space-6:24` · `--space-7:32` · `--space-8:40`。
所有内外边距、gap **优先取阶梯值**；非阶梯值（如 10/14px）仅作微调，需逐步收敛。

### 4.3 Layout
- 三段式 app-shell：`topbar / workspace / (schema-strip)`，`gap 12px`，`padding 12px`。
- Builder 模式：`preset-rail`（分组 tab）+ `preset-detail-rail`（预设卡）+ `builder-surface`（预览）。
- 预览区五区域约束（见 AGENTS.md）：`main / composer / right-panel / bottom-dock / overlay`。主/右面板用 `react-resizable-panels`，主区 min 52%、右区 min 24%。

### 4.4 Responsive
移动窄屏（<1024px）：预设轨折叠、预览单列、避免横向滚动。`body { min-width: 320px }`。

---

## 5. Depth & Elevation

| Token | 值 | 用途 |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(21,25,34,.06)` | 卡片、气泡、工具卡、Composer 外壳 |
| `--shadow-md` | `0 4px 12px rgba(21,25,34,.08)` | 悬浮控件、下拉 |
| `--shadow-lg` | `0 18px 42px rgba(21,25,34,.08)` | 弹窗、命令面板、浮层设置 |
| `--shadow`（别名）| = `--shadow-lg` | 历史别名 |

原则：**低阴影、靠边框分层**。工程感来自清晰的 1px 边界，而非大投影。无 ambient glow / 无 film grain。

---

## 6. Components（视觉契约）

> Layer 1 基础组件的 API 与状态见 `docs/COMPONENT_SYSTEM.md §4`。此处规范**视觉表现与签名模式**。

### 6.1 Button（`ui-button`，data 属性变体）
- 变体：`primary`（accent 实心）· `secondary`（描边）· `ghost`（透明，hover 显底）· `danger`（danger 实心）。
- 尺寸：`sm/md/lg` = 高 `26/32/40px`。
- `loading`：内嵌 Spinner，宽度不跳动，`aria-busy`。
- 圆角默认 `--radius-md`；pill 场景用 `--radius-full`。

### 6.2 IconButton
正方形 `26/32px`，必填 `label`（→ `aria-label` + Tooltip）。装饰图标 `aria-hidden`。

### 6.3 Badge / StatusPill
`tone: neutral | accent | success | warning | danger | info`，`--radius-full`，`--text-xs`，字重 700。状态语义用 §2.5 色。

### 6.4 Input / Textarea / Select
- 边框 `--border-strong`，圆角 `--radius-md`，底 `--surface-panel`。
- focus：`box-shadow: var(--focus-ring)`。
- Textarea 支持 `autoGrow`；含前/后缀插槽。

**下拉框（强制）**：所有用户可见的下拉一律用 **`SelectMenu`**（`ui/select-menu.tsx`，基于 Radix DropdownMenu 的单选弹层，复用 `.ui-dropdown-menu` 弹层样式 + 勾选指示器）。
- ❌ **禁止裸 `<select>`**：原生 `<select>` 的展开列表是**操作系统 chrome，CSS 无法样式化**——展开后必然破坏设计一致性（这是历史 bug 的根因）。
- 旧的 `ui/select.tsx`（原生 select 皮肤）**仅保留触发器视觉**，已从所有 app UI 迁出；新代码不要再用它做可展开选择。
- `SelectMenu` API：`value / onValueChange / options[{value,label}] / size / ariaLabel`；触发器沿用 `.ui-select` 外观 + chevron，弹层白底、hairline、`--shadow-md`、hover=`--surface-hover`、选中项打勾。

### 6.5 Switch / Slider / Tabs / Dialog / Popover / DropdownMenu / Tooltip
交互复杂者基于 Radix；选中/checked 用 accent 着色 + 对应 aria。Dialog/Popover 由 Radix 保证焦点圈闭 + Esc 关闭。

### 6.6 签名模式 — Conversation（Layer 2）
产品的视觉核心，务必保持一致：

- **用户气泡**：靠右，实心 `--accent` + `--text-inverse` 文字，`--radius-lg`、右上角 `--radius-sm` 缺角，配右侧圆形头像（`--surface-inset` 底）。
- **Assistant 泳道（turn）**：**一个头像 + 一个 role 标签统管整轮**——推理块 → 工具卡 → 产物 → 回复气泡共处一条左对齐泳道（`.assistant-turn` = 头像列 + `.assistant-lane` 内容列，`gap 10px`）。头像 `--accent-soft` 底、accent 图标。不给每条消息重复头像。
- **Assistant 回复气泡**：`--surface-panel` 面板底，左上角 `--radius-sm` 缺角，`--shadow-sm`。
- **工具卡（ToolCallCard）**：卡片语言统一（`--radius-lg` + `--border-subtle` + `--shadow-sm`），**左侧 3px 状态色边条**（success/info/danger/warning，见 §2.5）；header 可折叠，hover 显 `--surface-hover`。
- **推理块（ReasoningBlock）**：同卡片语言的 disclosure，状态指示器按主题动效变体。

### 6.7 签名模式 — Composer
- **统一输入外壳** `.composer-shell`：附件头部行 + 无边框 textarea + 底部工具条**共处一个** `--radius-lg` 边框容器；`:focus-within` 时整壳出现 accent 焦点环。
- 附件作为**头部行**，用 `--border-subtle` hairline 与输入区分隔。
- 工具控件（思考预算/工具/provider/model）为**安静的 ghost/inset**，不与主操作争视觉。
- **Send 键**：`--radius-full` 实心 accent 药丸；运行时切 `danger` 药丸显示 Stop。
- 上方建议起手 pill（可选）置于外壳**之外**。

### 6.8 Context Chip
`--surface-inset` 底、`--radius-full`、`--text-xs`、含图标；用于附件、上下文引用。附件 chip 带**删除 ×**（hover 显 danger 色底），可移除。

### 6.9 Output 面板展开
Output/artifact 面板右上角 Maximize 按钮切换**浮层展开**（`--z-modal` 卡片 + `--z-overlay` 半透明遮罩 + `overlay-pop-in`），再点 Minimize 或遮罩收起。属自包含的安全交互。

---

## 7. Motion & Interactions

### 7.1 Duration & Easing（主题无关，禁止硬编码）
| Token | 值 | 用途 |
|---|---|---|
| `--motion-fast` | `120ms` | hover / 颜色 / 边框反馈 |
| `--motion-base` | `160ms` | 折叠展开、chevron 旋转 |
| `--motion-slow` | `240ms` | 较大位移/进场（上限） |
| `--ease-out` | `cubic-bezier(0.16,1,0.3,1)` | 进入/展开 |
| `--ease-in-out` | `cubic-bezier(0.45,0,0.25,1)` | 双向过渡 |

### 7.2 交互状态（精致度硬性验收线，见 COMPONENT_SYSTEM §3）
每个可交互元素**必须**实现全部适用状态：`hover`（`--motion-fast`）· `active`（加深一档或 `translateY(0.5px)`）· `focus-visible`（`box-shadow: var(--focus-ring)`，禁止裸删 outline）· `disabled`（`opacity:.52` + `not-allowed`）· `loading`（Button 内嵌 Spinner + `aria-busy`）· `selected/checked`（accent + aria）。

### 7.3 焦点环（统一配方）
```css
--focus-ring: 0 0 0 2px var(--surface-panel),
              0 0 0 4px color-mix(in srgb, var(--accent) 72%, white);
```

### 7.4 签名动效
- **写作动效**（assistant 文本进场）：`smooth-stream / typewriter / chunked` 三变体，绑主题 `motion.writing`。
- **推理指示器**：`pulse / terminal / minimal / bars / orbit / shimmer` 变体，绑主题 `motion.reasoning`。
- **工具卡展开**：`motion/react` 高度+透明度过渡，160ms。
- 动效栈：SaaS 配置界面用 **Tailwind/CSS transitions + Radix 内置 + motion**；不引 GSAP（无滚动叙事需求）。

### 7.5 全局 UX 规则
- 遵守 `prefers-reduced-motion`（关键动效降级为即时/淡入）。
- 可点击目标 ≥ 44×44px（图标按钮用透明命中区补足）。
- 图标库统一 **Lucide React**；默认静态，仅焦点场景按需动效化，一屏 ≤ 3 个（见 design-workflow Phase 2.0.1）。
- 层级：`--z-dropdown:50 / overlay:100 / modal:110 / toast:200 / tooltip:300`。
- Toast（sonner）：`richColors`，左下，3–5s 自动消失。

---

## 8. Design Guardrails

### Do ✅
- 只用语义 token（颜色/间距/圆角/阴影/动效）；跨主题自动适配。
- 卡片/气泡/输入统一走 §6 的圆角+边框+阴影语言。
- 新可配置 UX 行为→注册 preset option（`src/schema/presets.ts`）并归入现有预设组。
- 预览组件升级→同步导出模板（`src/export/…`），保证"导出即真实可运行代码"。
- 交互元素补全 §7.2 全部状态 + aria + 键盘可达。

### Don't ❌
- 裸 hex / 裸 px 动效时长 / `outline: none` 裸删。
- Figma 式自由画布、拖拽拼装（违反 schema 驱动 + 区域约束，见 AGENTS.md）。
- 每条消息重复头像、多套并存的卡片样式、等重堆叠的控件。
- 引入与产品语境不符的重型动效/装饰。

---

## 9. Copywriting Voice
- 简洁、工程化、动词开头的操作文案（"Run"、"Export scaffold"、"Commit"）。
- 中英双语由 `src/i18n` 提供；规范文本走 copy 表，不硬编码。
- 状态陈述如实（进行中/成功/失败/已停止），不夸张。

---

## 10. Version & Assets

- **版本**：v1.0（首版正式设计规范）· 2026-07-13。
- **事实来源文件**：`src/theme/themeTokens.ts`（颜色，6 主题）、`src/styles/app.css :root`（结构 token）。
- **已实现并固化**：6 主题预设 · 结构 token 全集 · Layer 1 ui/ 组件 · 对话泳道/气泡/头像 · 工具卡状态边条 · Composer 统一外壳 + Send 药丸。
- **待收敛**：`app.css` 存量裸 px（非 8dp 阶梯值如 10/14px、头像 30px）逐步替换为 token；motion 值未来可下放主题预设。
- **关联文档**：`docs/COMPONENT_SYSTEM.md`（组件架构/花名册/分期）· `AGENTS.md`（产品边界）。
