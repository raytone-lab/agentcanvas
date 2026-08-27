import type { AppLocale } from "../i18n/uiCopy";
import type { LandingProviderGroup, LandingProviderId } from "./providers";

/**
 * Landing-page copy.
 *
 * Deliberately NOT in `src/i18n/` — `src/export/scaffoldManifest.ts` globs `../i18n/**`
 * verbatim into every user's exported zip, so anything left there ships with (and must
 * typecheck inside) the generated project. The landing page is site-only, so it lives
 * outside that closure.
 *
 * Every claim here is checkable against the source: the 12 themes come from
 * `src/theme/themeTokens.ts`, the provider list from `providerCatalog` in
 * `src/schema/agentuxConfig.ts`, the event names from the canonical set in `AGENTS.md`,
 * and the file tree from `GENERATED_FILES` + the export globs in
 * `src/export/scaffoldManifest.ts`. No invented metrics.
 */

/** One key per composable surface, so the two locales cannot drift out of order. */
export type LandingPartKey =
  | "sessions"
  | "chat"
  | "thinking"
  | "tools"
  | "output"
  | "composer";

export const landingPartKeys: readonly LandingPartKey[] = [
  "sessions",
  "chat",
  "thinking",
  "tools",
  "output",
  "composer",
];

export type LandingCopy = {
  brandSuffix: string;
  nav: {
    localeAria: string;
    localeZh: string;
    localeEn: string;
    localeJa: string;
    github: string;
    skipToContent: string;
  };
  hero: {
    title: string;
    lede: string;
    primaryCta: string;
    secondaryCta: string;
    note: string;
    /** Two standalone facts. The rule between them is drawn, not typed. */
    eyebrowTags: string[];
    shotAlt: string;
    demoCaption: string;
    demoPause: string;
    demoPlay: string;
  };
  how: {
    title: string;
    steps: { title: string; body: string }[];
  };
  parts: {
    title: string;
    lede: string;
    /** `component` is the real file in src/components/agent-preview/, shown as the badge. */
    items: Record<LandingPartKey, { name: string; component: string; body: string }>;
  };
  events: {
    title: string;
    lede: string;
    /** The four stages the thesis actually describes, each naming its real file. */
    flow: { label: string; file?: string }[];
    columnCategory: string;
    columnEvent: string;
    columnMapping: string;
    columnTarget: string;
    /**
     * `label` names the family in the left rail, `component` is the real component that
     * renders it. The count in the rail is derived from `events.length`, never written out.
     */
    rows: { label: string; events: string[]; component: string; ui: string }[];
  };
  themes: {
    title: string;
    lede: string;
    groupNative: string;
    groupMinimal: string;
    styleNote: string;
    compareLabel: string;
    compareLight: string;
    compareDark: string;
    compareLightAlt: string;
    compareDarkAlt: string;
    compareHint: string;
    tabsLabel: string;
  };
  exported: {
    title: string;
    lede: string;
    /** The two commands, shown as numbered steps. Copied together as one block. */
    steps: string[];
    coreLabel: string;
    /** `path` is relative to `src/`; asserted against a real export in exportFacts.test.ts. */
    coreFiles: { path: string; note: string }[];
    expandLabel: string;
    /** Contains `{count}`, filled from `EXPORT_FILE_COUNT`. */
    expandNote: string;
    expandAction: string;
    collapseAction: string;
    tree: string;
    treeNote: string;
    scriptsLabel: string;
    copyLabel: string;
    copiedLabel: string;
    /** Verbatim from `createScaffoldPackageJson` in src/export/scaffoldManifest.ts. */
    scripts: { name: string; run: string }[];
  };
  providers: {
    title: string;
    lede: string;
    /** Contains `{count}`, filled from `landingProviders.length` so it cannot go stale. */
    countNote: string;
    /** Ledger rows beside the grid. Counts are derived, never written here. */
    groups: Record<LandingProviderGroup, string>;
    /** Display names keyed by catalog id; protocols live in `providers.ts`, not in copy. */
    names: Record<LandingProviderId, string>;
    protocolLabel: string;
    protocolNote: string;
    keyLabel: string;
    keyNote: string;
  };
  limits: {
    title: string;
    items: { title: string; body: string }[];
  };
  closing: {
    title: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
  };
  footer: {
    github: string;
    openEditor: string;
  };
  shotMissing: string;
};

const zh: LandingCopy = {
  brandSuffix: "．",
  nav: {
    localeAria: "切换语言",
    localeZh: "中文",
    localeEn: "EN",
    localeJa: "日本語",
    github: "GitHub",
    skipToContent: "跳到正文",
  },
  hero: {
    title: "在画布上组一个 Agent 的界面",
    lede:
      "AgentCanvas 是一个可视化编辑器：挑选会话栏、对话区、思考块、工具调用卡、产物预览和输入框，" +
      "接上事件流实时预览，然后导出成一个能直接跑起来的 Vite + React 项目。",
    primaryCta: "开始体验",
    secondaryCta: "在 GitHub 上 Star",
    note: "浏览器里直接用，不用 clone，不用装依赖。",
    eyebrowTags: ["开源", "导出即可运行"],
    shotAlt: "AgentCanvas 编辑器：左侧预设轨、中间对话画布中的工具调用卡、右侧产物面板中的 diff",
    demoCaption: "这段录屏是在真实编辑器里点出来的：选思考动效、开工具组、连换三套主题。",
    demoPause: "暂停演示",
    demoPlay: "播放演示",
  },
  how: {
    title: "三步",
    steps: [
      {
        title: "组界面",
        body: "从左侧按运行流程、布局输出、工程配置、主题四组挑组件。每选一项，画布立刻用真实组件重绘。",
      },
      {
        title: "喂事件流",
        body: "回放内置场景，或填自己的模型 Key 走一次真实调用。思考、工具调用、产物都按事件流渲染。",
      },
      {
        title: "导出项目",
        body: "下载 zip。里面是画布上那一套组件的源码本身，不是另写一份简化模板。",
      },
    ],
  },
  parts: {
    title: "能组的东西",
    lede: "每一块都是独立组件，可开可关，配色和动效跟着主题走。",
    items: {
      sessions: { name: "会话栏", component: "SessionSidebar", body: "左侧会话列表与新建会话入口，可整列收起。" },
      chat: { name: "对话区", component: "ChatFrame", body: "消息、头像、名称标签，以及复制、重试、编辑等操作。" },
      thinking: { name: "思考块", component: "ReasoningBlock", body: "思考动效与摘要。折叠或展开、只显状态或显公开摘要。" },
      tools: { name: "工具调用卡", component: "ToolCallCard", body: "读文件、改文件、搜索、跑命令的卡片形态，含审批与结果。" },
      output: { name: "产物预览面板", component: "OutputFrame", body: "右侧面板或浮层，预览代码、diff、Markdown、图片、音视频。" },
      composer: { name: "输入框", component: "ComposerFrame", body: "提交、打断、附件，以及工具审批的内联与浮层两种落位。" },
    },
  },
  events: {
    title: "事件流怎么变成界面",
    lede:
      "组件不直接读厂商的原始流。所有事件先收敛成一套标准事件名，再由这层映射决定谁渲染什么——" +
      "换后端不用改组件。",
    flow: [
      { label: "厂商原始流" },
      { label: "收敛与准入", file: "runtime/eventNormalizer.ts" },
      { label: "标准事件名", file: "@agent-ux/protocol" },
      { label: "界面组件", file: "slots/slotRegistry.tsx" },
    ],
    columnCategory: "事件族",
    columnEvent: "标准事件",
    columnMapping: "映射关系",
    columnTarget: "界面组件",
    rows: [
      { label: "运行事件", events: ["run.started", "run.finished", "run.error"], component: "ChatFrame", ui: "会话状态与本轮运行结果" },
      { label: "文本事件", events: ["text.started", "text.delta", "text.finished"], component: "ChatFrame", ui: "消息气泡，按所选书写动效出现" },
      { label: "推理事件", events: ["reasoning.status", "reasoning.summary", "reasoning.finished"], component: "ReasoningBlock", ui: "状态指示器与摘要" },
      { label: "工具调用", events: ["tool.call.started", "tool.call.args.delta", "tool.call.result"], component: "ToolCallCard", ui: "标题、参数与结果" },
      { label: "审批事件", events: ["tool.call.awaiting_approval"], component: "ExternalApprovalSurface", ui: "内联或浮层的审批界面" },
      { label: "产物事件", events: ["artifact.created", "artifact.delta", "artifact.finished"], component: "OutputFrame", ui: "标签页与内容" },
    ],
  },
  themes: {
    title: "主题与风格",
    lede: "12 套配色，改的只是同一批语义变量的取值，结构不变。下面的色卡直接读自主题源文件。",
    groupNative: "原生风",
    groupMinimal: "极简风",
    styleNote: "两种设计风格各带一套主题：原生风偏暖、字体走 IBM Plex；极简风偏冷、字体走 Inter。",
    compareLabel: "拖动对比浅色与深色主题",
    compareLight: "柔光玻璃",
    compareDark: "暖石墨",
    compareLightAlt: "同一个界面在浅色主题下的样子",
    compareDarkAlt: "同一个界面在深色主题下的样子",
    compareHint: "同一个界面、同一批组件，只换了主题的取值。拖动分割线，或用左右方向键。",
    tabsLabel: "按设计风格查看主题",
  },
  exported: {
    title: "导出包里有什么",
    lede: "不是配置清单，也不是预览摘要，是一个能装能跑能改的工程。",
    steps: ["npm install", "npm run dev"],
    coreLabel: "核心文件",
    coreFiles: [
      { path: "main.tsx", note: "生成的入口" },
      { path: "agent-shell.tsx", note: "生成的外壳" },
      { path: "exported-project.ts", note: "你在画布上的配置" },
      { path: "demo-events.ts", note: "可回放的事件流" },
      { path: "adapters/backendAdapter.ts", note: "接你自己后端的位置" },
    ],
    expandLabel: "完整项目目录",
    expandNote: "{count} 个文件",
    expandAction: "展开查看",
    collapseAction: "收起",
    tree: `your-agent/
├─ package.json
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
├─ src/
│  ├─ main.tsx
│  ├─ agent-shell.tsx
│  ├─ exported-project.ts
│  ├─ demo-events.ts
│  ├─ adapters/backendAdapter.ts
│  ├─ components/agent-preview/   画布上那批组件的源码
│  ├─ components/ui/              基础组件
│  ├─ runtime/  slots/  theme/  i18n/
│  └─ styles/app.css
└─ vendor/
   ├─ agent-ux/{protocol,runtime,render-core,react}
   └─ agentmatrix/agentcanvas-contract`,
    treeNote: "内部依赖已经随包打好，不需要额外配置 registry。12 套配色主题、中英双语文案，都跟着导出走。",
    scriptsLabel: "package.json scripts",
    copyLabel: "复制",
    copiedLabel: "已复制",
    scripts: [
      { name: "dev", run: "vite" },
      { name: "build", run: "tsc && vite build" },
      { name: "preview", run: "vite preview" },
      { name: "typecheck", run: "tsc --noEmit" },
    ],
  },
  providers: {
    title: "接你自己的模型",
    lede: "编辑器里填 Key 就能走一次真实调用，看自己的模型在这套界面里长什么样。",
    countNote: "支持 {count} 种接入方式",
    // Deliberately not "本地模型"/"自定义地址": those are the grid's item names, and the same
    // string standing for both a category and one of its members reads as a duplicate row.
    groups: {
      cloud: "云端模型",
      local: "本地运行",
      custom: "自定义接口",
    },
    names: {
      openai: "OpenAI",
      anthropic: "Anthropic",
      gemini: "Gemini",
      openrouter: "OpenRouter",
      deepseek: "DeepSeek",
      "z-ai": "Z.ai",
      moonshot: "MoonShot",
      local: "本地模型",
      custom: "自定义地址",
    },
    protocolLabel: "协议",
    protocolNote: "两种：openai-compatible 与 anthropic。前者覆盖下面绝大多数，也覆盖任何兼容该接口的自建服务。",
    keyLabel: "Key 存放",
    keyNote: "编辑器里只在内存，刷新即失效。导出的应用存 sessionStorage，关闭标签页失效。两处都不写 localStorage。",
  },
  limits: {
    title: "它不做什么",
    items: [
      {
        title: "不是自由画布",
        body: "区域是 schema 约束的，组件只能落在既定位置。这条限制换来的是导出代码干净、能被人接着写。",
      },
      {
        title: "不是托管运行时",
        body: "AgentCanvas 只负责生成脚手架。你的 Agent 长期跑在你导出的那个项目里，不依赖这个站点。",
      },
      {
        title: "不承诺没做完的集成",
        body: "已有的是回放、mock 传输与厂商适配器接口。没有落地实现和测试路径的集成，不会写在这里。",
      },
    ],
  },
  closing: {
    title: "组一个看看",
    body: "编辑器就在浏览器里，不用 clone，不用装依赖。组完导出，代码归你。",
    primaryCta: "开始体验",
    secondaryCta: "在 GitHub 上 Star",
  },
  footer: {
    github: "在 GitHub 上查看源码",
    openEditor: "打开编辑器",
  },
  shotMissing: "截图待补",
};

const en: LandingCopy = {
  brandSuffix: "．",
  nav: {
    localeAria: "Switch language",
    localeZh: "中文",
    localeEn: "EN",
    localeJa: "日本語",
    github: "GitHub",
    skipToContent: "Skip to content",
  },
  hero: {
    title: "Compose an agent's interface on a canvas",
    lede:
      "AgentCanvas is a visual editor. Pick a session sidebar, chat area, thinking block, tool-call cards, " +
      "an artifact preview panel and a composer; wire an event stream through them to preview it live; " +
      "then export a Vite + React project that runs as-is.",
    primaryCta: "Open the editor",
    secondaryCta: "Star on GitHub",
    note: "Runs in the browser. No clone, no install.",
    eyebrowTags: ["Open source", "Exports and runs"],
    shotAlt:
      "The AgentCanvas editor: preset rail on the left, tool-call cards in the canvas, a diff in the output panel",
    demoCaption:
      "Recorded by clicking through the real editor: pick a thinking motion, open the tool group, then swap three themes.",
    demoPause: "Pause the demo",
    demoPlay: "Play the demo",
  },
  how: {
    title: "Three steps",
    steps: [
      {
        title: "Compose",
        body:
          "Pick components from four groups: run flow, layout & output, engineering, theme. " +
          "Every choice redraws the canvas with the real component.",
      },
      {
        title: "Feed it events",
        body:
          "Replay a built-in scenario, or paste your own model key for a real call. " +
          "Thinking, tool calls and artifacts all render off the event stream.",
      },
      {
        title: "Export",
        body:
          "Download a zip. Inside is the source of the very components on the canvas — " +
          "not a second, simplified template.",
      },
    ],
  },
  parts: {
    title: "What you can compose",
    lede: "Each piece is its own component: toggle it on or off, and it follows the active theme.",
    items: {
      sessions: {
        name: "Session sidebar",
        component: "SessionSidebar",
        body: "Session list and new-session entry. The whole rail collapses.",
      },
      chat: {
        name: "Chat area",
        component: "ChatFrame",
        body: "User and agent messages, avatars, speaker labels, and copy / regenerate / edit actions.",
      },
      thinking: {
        name: "Thinking block",
        component: "ReasoningBlock",
        body: "Thinking motion and summary — collapsed or expanded, status-only or public summary.",
      },
      tools: {
        name: "Tool-call cards",
        component: "ToolCallCard",
        body: "Read, modify, search and run-command actions as cards, with approval and result detail.",
      },
      output: {
        name: "Artifact preview panel",
        component: "OutputFrame",
        body: "Right panel or overlay, previewing code, diffs, Markdown, images, audio and video.",
      },
      composer: {
        name: "Composer",
        component: "ComposerFrame",
        body: "Submit, interrupt, attachments, and inline or overlay tool approval.",
      },
    },
  },
  events: {
    title: "How an event stream becomes an interface",
    lede:
      "Components never read a vendor's raw stream. Events are narrowed to one canonical set first, " +
      "and this mapping decides what renders — so swapping backends does not touch a component.",
    flow: [
      { label: "Vendor stream" },
      { label: "Narrow and admit", file: "runtime/eventNormalizer.ts" },
      { label: "Canonical events", file: "@agent-ux/protocol" },
      { label: "Components", file: "slots/slotRegistry.tsx" },
    ],
    columnCategory: "Family",
    columnEvent: "Canonical event",
    columnMapping: "Maps to",
    columnTarget: "Component",
    rows: [
      {
        label: "Run",
        events: ["run.started", "run.finished", "run.error"],
        component: "ChatFrame",
        ui: "Session status and the outcome of the turn",
      },
      {
        label: "Text",
        events: ["text.started", "text.delta", "text.finished"],
        component: "ChatFrame",
        ui: "Message bubbles, revealed with the chosen writing motion",
      },
      {
        label: "Reasoning",
        events: ["reasoning.status", "reasoning.summary", "reasoning.finished"],
        component: "ReasoningBlock",
        ui: "Indicator and summary",
      },
      {
        label: "Tool calls",
        events: ["tool.call.started", "tool.call.args.delta", "tool.call.result"],
        component: "ToolCallCard",
        ui: "Title, arguments and result",
      },
      {
        label: "Approval",
        events: ["tool.call.awaiting_approval"],
        component: "ExternalApprovalSurface",
        ui: "The approval surface, inline or as an overlay",
      },
      {
        label: "Artifacts",
        events: ["artifact.created", "artifact.delta", "artifact.finished"],
        component: "OutputFrame",
        ui: "Tabs and content",
      },
    ],
  },
  themes: {
    title: "Themes and styles",
    lede:
      "Twelve palettes. Each one only changes the values of the same semantic variables; the structure is fixed. " +
      "The swatches below are read straight from the theme source.",
    groupNative: "Native",
    groupMinimal: "Minimal",
    styleNote:
      "Each style brings its own set: Native runs warm on an IBM Plex stack, Minimal runs cool on Inter.",
    compareLabel: "Wipe between the light and dark themes",
    compareLight: "Soft Glass",
    compareDark: "Warm Graphite",
    compareLightAlt: "The same interface on a light theme",
    compareDarkAlt: "The same interface on a dark theme",
    compareHint:
      "Same interface, same components — only the theme's values changed. Drag the divider, or use the arrow keys.",
    tabsLabel: "Browse themes by design style",
  },
  exported: {
    title: "What is in the export",
    lede: "Not a manifest, not a preview summary — a project you can install, run and edit.",
    steps: ["npm install", "npm run dev"],
    coreLabel: "Core files",
    coreFiles: [
      { path: "main.tsx", note: "generated entry" },
      { path: "agent-shell.tsx", note: "generated shell" },
      { path: "exported-project.ts", note: "your canvas configuration" },
      { path: "demo-events.ts", note: "a replayable event stream" },
      { path: "adapters/backendAdapter.ts", note: "where your backend goes" },
    ],
    expandLabel: "Full project tree",
    expandNote: "{count} files",
    expandAction: "Expand",
    collapseAction: "Collapse",
    tree: `your-agent/
├─ package.json
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
├─ src/
│  ├─ main.tsx
│  ├─ agent-shell.tsx
│  ├─ exported-project.ts
│  ├─ demo-events.ts
│  ├─ adapters/backendAdapter.ts
│  ├─ components/agent-preview/   source of the components on the canvas
│  ├─ components/ui/              primitives
│  ├─ runtime/  slots/  theme/  i18n/
│  └─ styles/app.css
└─ vendor/
   ├─ agent-ux/{protocol,runtime,render-core,react}
   └─ agentmatrix/agentcanvas-contract`,
    treeNote:
      "The internal packages are vendored into the zip, so there is no extra registry to configure. All 12 color themes and the bilingual copy travel with it.",
    scriptsLabel: "package.json scripts",
    copyLabel: "Copy",
    copiedLabel: "Copied",
    scripts: [
      { name: "dev", run: "vite" },
      { name: "build", run: "tsc && vite build" },
      { name: "preview", run: "vite preview" },
      { name: "typecheck", run: "tsc --noEmit" },
    ],
  },
  providers: {
    title: "Point it at your own model",
    lede: "Paste a key in the editor and make a real call, to see your own model inside this interface.",
    countNote: "{count} ways to connect",
    groups: {
      cloud: "Hosted APIs",
      local: "Local runtime",
      custom: "Custom endpoint",
    },
    names: {
      openai: "OpenAI",
      anthropic: "Anthropic",
      gemini: "Gemini",
      openrouter: "OpenRouter",
      deepseek: "DeepSeek",
      "z-ai": "Z.ai",
      moonshot: "MoonShot",
      local: "Local models",
      custom: "Custom endpoint",
    },
    protocolLabel: "Protocols",
    protocolNote:
      "Two: openai-compatible and anthropic. The first covers most of the list below, plus any self-hosted service speaking that API.",
    keyLabel: "Key handling",
    keyNote:
      "In-memory only in the editor, gone on reload. Exported apps use sessionStorage, cleared when the tab closes. Neither writes localStorage.",
  },
  limits: {
    title: "What it does not do",
    items: [
      {
        title: "Not a free-form canvas",
        body:
          "Regions are schema-constrained, so a component can only land in a defined slot. " +
          "That constraint is what keeps the exported code clean enough to keep working in.",
      },
      {
        title: "Not a hosted runtime",
        body:
          "AgentCanvas generates the scaffold. Your agent runs in the project you exported, with no dependency on this site.",
      },
      {
        title: "No promises about unfinished integrations",
        body:
          "What exists is replay, a mock transport, and the vendor-adapter interface. " +
          "Integrations without a real implementation and a test path are not listed here.",
      },
    ],
  },
  closing: {
    title: "Compose one and see",
    body:
      "The editor is right there in the browser — no clone, no install. Compose, export, and the code is yours.",
    primaryCta: "Open the editor",
    secondaryCta: "Star on GitHub",
  },
  footer: {
    github: "Source on GitHub",
    openEditor: "Open the editor",
  },
  shotMissing: "Screenshot pending",
};

/** PENDING NATIVE REVIEW — see the note in src/i18n/copy/shell.ts for the conventions used. */
const ja: LandingCopy = {
  brandSuffix: "．",
  nav: {
    localeAria: "言語を切り替える",
    localeZh: "中文",
    localeEn: "EN",
    localeJa: "日本語",
    github: "GitHub",
    skipToContent: "本文へスキップ",
  },
  hero: {
    title: "キャンバス上で Agent の画面を組む",
    lede:
      "AgentCanvas はビジュアルエディターです。セッションサイドバー、チャット領域、思考ブロック、" +
      "ツール呼び出しカード、アーティファクトのプレビューパネル、入力欄を選び、イベントストリームを流して" +
      "その場で確認し、そのまま動く Vite + React プロジェクトとしてエクスポートします。",
    primaryCta: "エディターを開く",
    secondaryCta: "GitHub で Star",
    note: "ブラウザだけで動きます。clone もインストールも不要。",
    eyebrowTags: ["オープンソース", "エクスポートしてそのまま動く"],
    shotAlt:
      "AgentCanvas のエディター：左にプリセットレール、キャンバスにツール呼び出しカード、出力パネルに差分",
    demoCaption:
      "実際のエディターを操作して録画したものです：思考のモーションを選び、ツールのグループを開き、テーマを 3 つ切り替えています。",
    demoPause: "デモを一時停止",
    demoPlay: "デモを再生",
  },
  how: {
    title: "3 ステップ",
    steps: [
      {
        title: "組む",
        body:
          "実行フロー、レイアウトと出力、エンジニアリング、テーマの 4 グループからコンポーネントを選びます。" +
          "選ぶたびに、キャンバスが実物のコンポーネントで描き直されます。",
      },
      {
        title: "イベントを流す",
        body:
          "組み込みのシナリオをリプレイするか、自分のモデルキーを貼って実際に 1 回呼び出します。" +
          "思考・ツール呼び出し・アーティファクトはすべてイベントストリームから描画されます。",
      },
      {
        title: "エクスポート",
        body:
          "zip をダウンロードします。中身はキャンバス上のコンポーネントそのもののソースで、" +
          "簡略化した別のテンプレートではありません。",
      },
    ],
  },
  parts: {
    title: "組めるもの",
    lede: "どの部品も独立したコンポーネントです。オン・オフを切り替えられ、配色と動きは選んだテーマに従います。",
    items: {
      sessions: {
        name: "セッションサイドバー",
        component: "SessionSidebar",
        body: "セッション一覧と新規セッションの入口。レール全体を畳めます。",
      },
      chat: {
        name: "チャット領域",
        component: "ChatFrame",
        body: "ユーザーと Agent のメッセージ、アバター、名前ラベル、コピー / 再生成 / 編集の操作。",
      },
      thinking: {
        name: "思考ブロック",
        component: "ReasoningBlock",
        body: "思考のモーションと要約。折りたたみ・展開、ステータスのみ・公開用要約を選べます。",
      },
      tools: {
        name: "ツール呼び出しカード",
        component: "ToolCallCard",
        body: "読み取り・変更・検索・コマンド実行をカードで表示し、承認と結果の詳細も含みます。",
      },
      output: {
        name: "アーティファクトのプレビューパネル",
        component: "OutputFrame",
        body: "右パネルまたはオーバーレイで、コード・差分・Markdown・画像・音声・動画をプレビューします。",
      },
      composer: {
        name: "入力欄",
        component: "ComposerFrame",
        body: "送信、中断、添付、そしてツール承認のインライン表示とオーバーレイ表示。",
      },
    },
  },
  events: {
    title: "イベントストリームが画面になるまで",
    lede:
      "コンポーネントはベンダーの生ストリームを直接読みません。イベントはまず 1 つの標準セットに収束され、" +
      "このマッピングが何を描画するかを決めます。だからバックエンドを差し替えてもコンポーネントには触りません。",
    flow: [
      { label: "ベンダーのストリーム" },
      { label: "収束と受け入れ", file: "runtime/eventNormalizer.ts" },
      { label: "標準イベント", file: "@agent-ux/protocol" },
      { label: "コンポーネント", file: "slots/slotRegistry.tsx" },
    ],
    columnCategory: "系統",
    columnEvent: "標準イベント",
    columnMapping: "対応先",
    columnTarget: "コンポーネント",
    rows: [
      {
        label: "実行",
        events: ["run.started", "run.finished", "run.error"],
        component: "ChatFrame",
        ui: "セッションの状態と、このターンの結果",
      },
      {
        label: "テキスト",
        events: ["text.started", "text.delta", "text.finished"],
        component: "ChatFrame",
        ui: "選んだ書き出しモーションで現れるメッセージの吹き出し",
      },
      {
        label: "推論",
        events: ["reasoning.status", "reasoning.summary", "reasoning.finished"],
        component: "ReasoningBlock",
        ui: "インジケーターと要約",
      },
      {
        label: "ツール呼び出し",
        events: ["tool.call.started", "tool.call.args.delta", "tool.call.result"],
        component: "ToolCallCard",
        ui: "タイトル、引数、結果",
      },
      {
        label: "承認",
        events: ["tool.call.awaiting_approval"],
        component: "ExternalApprovalSurface",
        ui: "インラインまたはオーバーレイの承認画面",
      },
      {
        label: "アーティファクト",
        events: ["artifact.created", "artifact.delta", "artifact.finished"],
        component: "OutputFrame",
        ui: "タブと内容",
      },
    ],
  },
  themes: {
    title: "テーマとスタイル",
    lede:
      "配色は 12 種類。どれも同じセマンティック変数の値だけを変えており、構造は固定です。" +
      "下のカラーチップはテーマのソースから直接読み出しています。",
    groupNative: "ネイティブ",
    groupMinimal: "ミニマル",
    styleNote:
      "スタイルごとに一式そろっています：ネイティブは暖色で IBM Plex、ミニマルは寒色で Inter を使います。",
    compareLabel: "ライトとダークのテーマを比べる",
    compareLight: "Soft Glass",
    compareDark: "Warm Graphite",
    compareLightAlt: "同じ画面をライトテーマで表示したもの",
    compareDarkAlt: "同じ画面をダークテーマで表示したもの",
    compareHint:
      "同じ画面、同じコンポーネントで、変えたのはテーマの値だけです。仕切りをドラッグするか、矢印キーを使ってください。",
    tabsLabel: "デザインスタイルごとにテーマを見る",
  },
  exported: {
    title: "エクスポートの中身",
    lede: "マニフェストでもプレビューの要約でもなく、インストールして実行して編集できるプロジェクトです。",
    steps: ["npm install", "npm run dev"],
    coreLabel: "主要ファイル",
    coreFiles: [
      { path: "main.tsx", note: "生成されたエントリー" },
      { path: "agent-shell.tsx", note: "生成されたシェル" },
      { path: "exported-project.ts", note: "キャンバスでの設定" },
      { path: "demo-events.ts", note: "リプレイできるイベントストリーム" },
      { path: "adapters/backendAdapter.ts", note: "自分のバックエンドを差し込む場所" },
    ],
    expandLabel: "プロジェクト全体のツリー",
    expandNote: "{count} 件のファイル",
    expandAction: "展開する",
    collapseAction: "畳む",
    tree: `your-agent/
├─ package.json
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
├─ src/
│  ├─ main.tsx
│  ├─ agent-shell.tsx
│  ├─ exported-project.ts
│  ├─ demo-events.ts
│  ├─ adapters/backendAdapter.ts
│  ├─ components/agent-preview/   キャンバス上のコンポーネントのソース
│  ├─ components/ui/              基本コンポーネント
│  ├─ runtime/  slots/  theme/  i18n/
│  └─ styles/app.css
└─ vendor/
   ├─ agent-ux/{protocol,runtime,render-core,react}
   └─ agentmatrix/agentcanvas-contract`,
    treeNote:
      "内部パッケージは zip に同梱されるので、レジストリの追加設定は不要です。12 種類のカラーテーマと多言語の文言もそのまま付いてきます。",
    scriptsLabel: "package.json scripts",
    copyLabel: "コピー",
    copiedLabel: "コピーしました",
    scripts: [
      { name: "dev", run: "vite" },
      { name: "build", run: "tsc && vite build" },
      { name: "preview", run: "vite preview" },
      { name: "typecheck", run: "tsc --noEmit" },
    ],
  },
  providers: {
    title: "自分のモデルにつなぐ",
    lede: "エディターでキーを貼れば実際に 1 回呼び出せます。自分のモデルがこの画面でどう見えるか確認できます。",
    countNote: "{count} 通りの接続方法",
    groups: {
      cloud: "ホスト型 API",
      local: "ローカル実行",
      custom: "カスタムエンドポイント",
    },
    names: {
      openai: "OpenAI",
      anthropic: "Anthropic",
      gemini: "Gemini",
      openrouter: "OpenRouter",
      deepseek: "DeepSeek",
      "z-ai": "Z.ai",
      moonshot: "MoonShot",
      local: "ローカルモデル",
      custom: "カスタムエンドポイント",
    },
    protocolLabel: "プロトコル",
    protocolNote:
      "2 つです：openai-compatible と anthropic。前者は下の一覧のほとんどに加え、その API を話す自前のサービスもカバーします。",
    keyLabel: "キーの扱い",
    keyNote:
      "エディターではメモリ上だけに保持し、リロードで消えます。エクスポートしたアプリは sessionStorage を使い、タブを閉じると消えます。どちらも localStorage には書きません。",
  },
  limits: {
    title: "やらないこと",
    items: [
      {
        title: "自由配置のキャンバスではありません",
        body:
          "領域はスキーマで制約されており、コンポーネントは決まった場所にしか置けません。" +
          "この制約があるからこそ、エクスポートされたコードは人が続けて書ける状態に保たれます。",
      },
      {
        title: "ホスティングされたランタイムではありません",
        body:
          "AgentCanvas が作るのはスキャフォールドです。あなたの Agent はエクスポートしたプロジェクトの中で動き、このサイトには依存しません。",
      },
      {
        title: "未完成の連携について約束はしません",
        body:
          "あるのはリプレイ、モックのトランスポート、そしてベンダーアダプターのインターフェースです。" +
          "実装とテスト経路のない連携はここには載せません。",
      },
    ],
  },
  closing: {
    title: "ひとつ組んでみる",
    body:
      "エディターはこのままブラウザで開けます。clone もインストールも不要。組んでエクスポートすれば、コードはあなたのものです。",
    primaryCta: "エディターを開く",
    secondaryCta: "GitHub で Star",
  },
  footer: {
    github: "GitHub でソースを見る",
    openEditor: "エディターを開く",
  },
  shotMissing: "スクリーンショット準備中",
};

export const landingCopy = { zh, en, ja } satisfies Record<AppLocale, LandingCopy>;
