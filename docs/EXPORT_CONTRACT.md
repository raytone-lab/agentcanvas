# 导出契约 — 改 UI 前先读这页

> 面向在 `am/welcome-greeting` 上做 UI/UX 的人。
>
> **一句话**：配置器预览和导出包渲染的是**同一套组件、同一份 `slotRegistry`、同一份 `app.css`**。你在配置器里改的东西会自动进导出包 —— 但只有落在下面「自动进包」清单里的文件才会。
>
> 分工：`DESIGN.md` 管设计语言，`docs/COMPONENT_SYSTEM.md` 管组件架构，`AGENTS.md` 管产品边界，本文件管**「我改的 UI 会不会跟着导出包走」**。

---

## 1. 拉取

已在 `am/welcome-greeting`：

```bash
git pull
npm install     # package-lock 变了，必须跑
```

在别的分支：

```bash
git fetch origin
git rebase origin/am/welcome-greeting     # 或 merge
```

不要推 main，不要 force push。

---

## 2. 一个会让你编译失败的改动

`AgentFrontendProject.theme` 新增**必填**字段 `stylePreset: PresetStyleId`（`"native" | "illustrated" | "studio"`）。

如果你手写过 project 字面量（新 preset、新 fixture、测试夹具），typecheck 会报缺字段，补上即可：

```ts
theme: { preset: "soft-glass", stylePreset: "native", density: "compact", /* … */ }
```

为什么加：这个值原来只是 `App.tsx` 的一个 `useState`，导出端读不到，于是被写死成 `"native"`。而 `app.css` 有 **168 条**规则按 `data-style-preset` 分叉（native 118 / illustrated 49），所以选 illustrated 的项目导出后有 49 条规则走错分支。现在它随 project 走。

配套变化：`selectedPresetStyle` 不再是独立 state，而是从 `project.theme.stylePreset` 派生，`setSelectedPresetStyle()` 会写入 project。

---

## 3. 三处代码搬出了 App.tsx（改 App.tsx 可能撞冲突）

`App.tsx` 不进导出包，所以导出端需要的东西不能只存在于它里面。以下已原样搬移，**函数体和 SVG 逐字未改**：

| 原位置 | 现位置 |
| --- | --- |
| `SidebarRailIcon` / `RightSidebarRailIcon` | `components/common/RailIcons.tsx` |
| `previewTextZh` 词典 + `localizePreviewText` / `localizeTimelineItem` / `localizePreviewViewModel` | `i18n/previewLocalization.ts` |
| `normalizeOutputPanelRequest` / `languageFromFileName` / `fallbackOutputPanelBody` | `components/agent-preview/OutputFrame.tsx` |

**最容易踩的**：给 fixture 加中文翻译时，`previewTextZh` 已经不在 `App.tsx` 里了，改 `i18n/previewLocalization.ts`。

`app.css` 也有一处：`.builder-surface` 的选择器列表多了 `.exported-shell`（`app.css` 约 2652 行，另一处在 `@media (max-width: 980px)` 里）。**规则体一行未改，别把这个别名删掉** —— 导出包的根容器靠它拿到 `.preview-frame` 依赖的 grid 尺寸上下文。

---

## 4. 自动进包 vs 需要额外一步

### 自动进包（改了就跟着走）

```
components/agent-preview/**      components/ui/**（含 .css）
components/common/**             components/activity/**
components/debug-dock/**         components/ShimmerText.tsx
components/ErrorBoundary.tsx     i18n/**
theme/**                         agentmatrix/**（含 fixtures/*.json）
agentux/**                       runtime/toolDisplaySpec.ts
schema/agentuxConfig.ts          schema/presets.ts
slots/slotRegistry.tsx           preview/fixtures.ts
preview/reasoningPreviewPolicy.ts        fixtures/agentux/**/*.jsonl
preview-runner/PreviewRunner.ts  harness/gitAdapter.ts
pi/**                          harness/adapters/**
styles/app.css                   styles/agentmatrix.css
```

排除：`*.test.*`、`components/agent-preview/ExportFrame.tsx`、`agentmatrix/export/**`。

清单在 `src/export/scaffoldManifest.ts` 的 `import.meta.glob`。

### 需要额外一步

| 你做了什么 | 还要做什么 |
| --- | --- |
| 新增一个 slot 组件 | 在 `slots/slotRegistry.tsx` 注册，并加进 `SlotConfig["component"]`。导出包**只**经 `renderSlots()` 渲染，没注册就不出现 |
| 往 `public/` 加图片 | 加进 `scaffoldManifest.ts` 的 `SCAFFOLD_PUBLIC_ASSETS`。否则导出包里是 404 碎图（`app.css` 的 `url()` 和 `OutputFrame` 的 `src="/…"` 都算） |
| 写了个 helper 给导出端用 | 别只放 `App.tsx`。放进上面的自动进包目录 |
| 新增目录放组件 | 加 glob 模式，并确认它不引入 configurator-only 依赖（jszip、导出管线本身） |

Pi 是一个特例但已经接好：`piClient.ts` 进入浏览器包，`piHost.ts` 和 `piVitePlugin.ts`
只在 Node/Vite 侧运行。导出包要求 Node `>=22.19.0`，API key 只通过同源本地接口进入
Pi 的进程内运行时，不会写入 `exported-project.ts`、ZIP 或浏览器 bundle。

---

## 5. 三条硬规矩

1. **组件里不许出现 fixture / demo 数据。** 所有事件（模拟或真实）都走 `事件协议 → projector/viewModel → slotRegistry/renderSlots → 组件`。组件只消费标准化后的 viewModel，不关心来源。
2. **下拉必须用 `components/ui/select-menu.tsx`**，不许裸 `<select>`（原生 select 的展开列表是 OS chrome，没法跟设计系统对齐）。
3. **只用语义 token**，禁止裸 hex、裸 px 动效时长 —— 见 `DESIGN.md`。

fixture 切换器只在 `npm run dev` 且 `runtime.transport` 为 `replay`/`mock` 时出现，是 `position: fixed` 浮层，不占布局；`npm run build` 产物里完全没有它。要指定场景可用 `?stream=tool-approval` 这样的地址参数。

---

## 6. 改完怎么确认没把导出弄坏

```bash
npm run typecheck
npm run test:export-smoke        # 需要 RUN_SCAFFOLD_SMOKE=1，见 package.json
```

`test:export-smoke` 会真的生成一份包并跑 install → typecheck → build。它能挡住依赖缺失、断链、空样式表。

**但它挡不住视觉问题。** 视觉改动请真的导出一份跑起来看：

```bash
# 配置器里点导出下载 zip，或在 vitest 里生成到临时目录
cd <解开的包> && npm install && npm run dev
```

历史上有两个 bug 只有真人看页面才发现：导出的 `app.css` 是 0 字节（cwd 相关，已修并加了回归测试）、根容器用内联样式伪造导致布局不适配（已改成复用 `.builder-surface`）。**构建全绿不等于页面对。**

多份导出包同时起 dev server 时，各自独立 `npm install`，**不要共用/软链 `node_modules`** —— 它们会抢同一份 `.vite/deps` 缓存，表现为 `Cannot read properties of null (reading 'useMemo')`（React 双实例）。

---

## 7. 已知红灯（不是你弄坏的）

全量 `npm test` 有 **14 个既存失败**：`components/agent-preview/presetRendering.test.tsx` 13 个 + `slots/slotRegistry.test.tsx` 1 个。原因是断言期望英文而渲染是中文、以及 class 字符串断言过紧。与导出链路无关，尚未修。

另一个已知未完成项：`agentmatrix/icons.tsx` 里 400+ 个 `IconOption` **一个 `bold` 变体都没填**（`bold:` 出现 0 次，`boldIcon()` 从未被调用）。消费端已接好（`App.tsx` 的 `IconStyleProvider`、`StateGallery.tsx:73`），所以 native 预设下会静默回退成 line 图标 —— 看起来像没生效。
