import type { CSSProperties, ReactNode } from "react";

import type { AgentCanvasLocale, AgentCanvasSemanticTokens } from "./types.js";

export const copy = {
  en: {
    configure: "Experience",
    configureHint: "Choose the interface patterns your agent product needs.",
    preview: "Preview",
    loading: "Loading Experience…",
    migration:
      "This Experience uses an unsupported contract version. Migrate it before editing.",
    readOnly: "Read-only",
    unavailable: "Preview unavailable",
    sessions: "Sessions",
    newSession: "New session",
    user: "You",
    agent: "Agent",
    output: "Output",
    gitChanges: "Git changes",
    debugDiagnostics: "Debug diagnostics",
    send: "Send",
    selected: "Selected",
    search: "Search",
    today: "Today",
    synced: "Workspace synced",
    console: "Console",
    liveOutput: "Live output",
    errorsCollapsed: "Errors collapsed",
    startConversation: "Start a conversation",
    summarize: "Summarize files",
    buildDashboard: "Build dashboard",
    capabilityHint: "Attach context or ask the agent to use a tool.",
    upload: "Upload",
    mic: "Mic",
    budget: "Budget",
    tools: "Tools",
    on: "on",
    model: "model",
    working: "Working",
    reasoningSummary: "Reviewed the support issue groups",
    thinkingSummary: "Thinking summary",
    thinkingDetail: "Reviewing context and planning the next action.",
    messageActions: "Message actions",
    copyAction: "Copy",
    regenerateAction: "Regenerate",
    editAction: "Edit",
    toolProgress: "Tool progress",
    approve: "Approve",
    deny: "Deny",
    eventDiagnostics: "Event diagnostics",
    changedFilesReviewOnly: "3 changed files · review only",
    recordsProcessed: "48 records processed…",
    diff: "Diff",
    toolRunning: "running",
    toolSucceeded: "succeeded",
    toolFailed: "failed",
    toolApprovalRequired: "approval required",
    livePreview: "Live preview",
    appUi: "App UI",
    agentCanvasPresets: "AgentCanvas presets",
    completedRun: "Completed run",
    welcomeScreen: "Welcome screen",
    approvalNeeded: "Approval needed",
    desktopPreview: "Desktop preview",
    tabletPreview: "Tablet preview",
    mobilePreview: "Mobile preview",
    openPreview: "Open preview",
    uiUx: "UI / UX",
    controls: "controls",
    studioHint:
      "Choose a pattern, then review it in the product-sized preview.",
    appPreview: "App preview",
    browserAddress: "app-preview.agentmatrix.local",
    previewScenario: "Preview scenario",
    welcomeTitle: "How can your agent help?",
    welcomeDescription: "Start with a task or choose a suggested prompt.",
    approvalPrompt: "Allow the agent to analyze the selected files?",
    customUi: "Custom UI",
    customUiHint:
      "The host application owns the final interface. Brand and Welcome remain available for development handoff.",
    brand: "Brand",
    welcome: "Welcome",
    canvas: "Canvas",
    displayName: "Display name",
    builtinMark: "Built-in mark",
    accent: "Accent",
    themeAccent: "Use theme accent",
    corners: "Corners",
    attribution: "Show AgentMatrix attribution",
    headline: "Headline",
    supportingText: "Supporting text",
    suggestedPrompts: "Suggested prompts",
    suggestedPromptsHint: "One prompt per line, up to six.",
    showSuggestedPrompts: "Show suggested prompts",
    advancedAppearance: "Advanced appearance",
    colorMode: "Color mode",
    typeface: "UI typeface",
    canvasColor: "Canvas background",
    textColor: "Text color",
    customColor: "Use custom color",
    baseSize: "Base text size",
    spacing: "Spacing",
    radius: "Radius",
    border: "Border",
    resetInterface: "Reset interface",
    productUi: "Product UI",
    app: "App",
    appSettings: "App settings",
    identity: "Identity",
    shape: "Shape",
    content: "Content",
    suggestions: "Suggestions",
    attributionHint: "Show a quiet credit in the app sidebar.",
    openStudio: "Open studio",
    controlsUsePrimitives: "Controls use AgentCanvas primitives",
    useBuiltinMark: "Use built-in mark",
    logicalAssetId: "Logical brand asset ID",
    logicalAssetHint:
      "A host-resolved identifier only. URLs, paths, and image bytes are not stored here.",
    stylesheetAssets: "Stylesheet assets",
    stylesheetAssetsHint:
      "Optional host-resolved CSS assets. The host validates, isolates, and applies each cascade layer.",
    stylesheetLayer: "Cascade layer",
    addStylesheet: "Add stylesheet asset",
    removeStylesheet: "Remove stylesheet",
    invalidAssetId:
      "Use 1–64 letters, numbers, underscores, or hyphens; start with a letter.",
    themeCorners: "Theme",
    roundedCorners: "Rounded",
    squareCorners: "Square",
    canvasPageHint: "Configure the Canvas component system",
  },
  "zh-CN": {
    configure: "体验配置",
    configureHint: "选择 Agent 产品需要的界面模式。",
    preview: "预览",
    loading: "正在加载体验配置…",
    migration: "当前体验使用了不受支持的契约版本，请迁移后再编辑。",
    readOnly: "只读",
    unavailable: "预览不可用",
    sessions: "会话",
    newSession: "新建会话",
    user: "你",
    agent: "Agent",
    output: "输出",
    gitChanges: "Git 变更",
    debugDiagnostics: "调试诊断",
    send: "发送",
    selected: "已选择",
    search: "搜索",
    today: "今天",
    synced: "Workspace 已同步",
    console: "控制台",
    liveOutput: "实时输出",
    errorsCollapsed: "错误详情已折叠",
    startConversation: "开始对话",
    summarize: "总结文件",
    buildDashboard: "构建仪表盘",
    capabilityHint: "附加上下文，或让 Agent 使用工具。",
    upload: "上传",
    mic: "语音",
    budget: "预算",
    tools: "工具",
    on: "开启",
    model: "模型",
    working: "正在处理",
    reasoningSummary: "已检查支持问题分组",
    thinkingSummary: "思考摘要",
    thinkingDetail: "正在检查上下文并规划下一步操作。",
    messageActions: "消息操作",
    copyAction: "复制",
    regenerateAction: "重新生成",
    editAction: "编辑",
    toolProgress: "工具进度",
    approve: "批准",
    deny: "拒绝",
    eventDiagnostics: "事件诊断",
    changedFilesReviewOnly: "3 个文件已更改 · 仅供审阅",
    recordsProcessed: "已处理 48 条记录…",
    diff: "差异",
    toolRunning: "运行中",
    toolSucceeded: "已成功",
    toolFailed: "失败",
    toolApprovalRequired: "需要批准",
    livePreview: "实时预览",
    appUi: "应用界面",
    agentCanvasPresets: "AgentCanvas 预设",
    completedRun: "已完成运行",
    welcomeScreen: "欢迎页",
    approvalNeeded: "需要批准",
    desktopPreview: "桌面预览",
    tabletPreview: "平板预览",
    mobilePreview: "手机预览",
    openPreview: "打开预览",
    uiUx: "UI / UX",
    controls: "项设置",
    studioHint: "选择一种界面模式，并在产品尺寸的预览中检查效果。",
    appPreview: "应用预览",
    browserAddress: "app-preview.agentmatrix.local",
    previewScenario: "预览场景",
    welcomeTitle: "你的 Agent 可以如何帮助？",
    welcomeDescription: "输入一个任务，或选择建议提示词。",
    approvalPrompt: "允许 Agent 分析所选文件吗？",
    customUi: "自定义界面",
    customUiHint:
      "最终界面由宿主应用负责，品牌与欢迎页配置仍会保留用于开发交付。",
    brand: "品牌",
    welcome: "欢迎页",
    canvas: "Canvas",
    displayName: "产品名称",
    builtinMark: "内置图标",
    accent: "强调色",
    themeAccent: "使用主题强调色",
    corners: "圆角",
    attribution: "显示 AgentMatrix 标识",
    headline: "标题",
    supportingText: "辅助说明",
    suggestedPrompts: "建议提示词",
    suggestedPromptsHint: "每行一个，最多六条。",
    showSuggestedPrompts: "显示建议提示词",
    advancedAppearance: "高级外观",
    colorMode: "颜色模式",
    typeface: "界面字体",
    canvasColor: "画布背景色",
    textColor: "文字颜色",
    customColor: "使用自定义颜色",
    baseSize: "基础字号",
    spacing: "间距",
    radius: "圆角比例",
    border: "边框",
    resetInterface: "重置界面",
    productUi: "产品界面",
    app: "应用",
    appSettings: "应用设置",
    identity: "身份标识",
    shape: "形状",
    content: "内容",
    suggestions: "建议提示",
    attributionHint: "在应用侧边栏显示低调的 AgentMatrix 标识。",
    openStudio: "打开工作室",
    controlsUsePrimitives: "配置控件使用 AgentCanvas 基础组件",
    useBuiltinMark: "使用内置图标",
    logicalAssetId: "逻辑品牌素材 ID",
    logicalAssetHint:
      "这里只保存由宿主解析的标识，不保存 URL、文件路径或图片内容。",
    stylesheetAssets: "样式表素材",
    stylesheetAssetsHint:
      "可选的宿主样式素材；宿主负责校验、隔离，并按层级应用。",
    stylesheetLayer: "层叠层级",
    addStylesheet: "添加样式表素材",
    removeStylesheet: "移除样式表",
    invalidAssetId: "使用 1–64 位字母、数字、下划线或连字符，并以字母开头。",
    themeCorners: "跟随主题",
    roundedCorners: "圆角",
    squareCorners: "直角",
    canvasPageHint: "配置 Canvas 组件体系",
  },
} as const;

export function EmbedRoot({
  className,
  style,
  semanticTokens,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  semanticTokens?: Partial<AgentCanvasSemanticTokens>;
  children: ReactNode;
}) {
  return (
    <div
      className={["agentcanvas-embed", className].filter(Boolean).join(" ")}
      style={{ ...semanticTokenStyle(semanticTokens), ...style }}
    >
      {children}
    </div>
  );
}

export function statusContent(
  locale: AgentCanvasLocale,
  loading: boolean | undefined,
  migrationRequired: boolean | undefined,
  error: ReactNode,
): ReactNode | undefined {
  const messages = copy[locale];
  if (loading)
    return (
      <div className="agentcanvas-state" role="status">
        {messages.loading}
      </div>
    );
  if (migrationRequired)
    return (
      <div
        className="agentcanvas-state agentcanvas-state--warning"
        role="alert"
      >
        {messages.migration}
      </div>
    );
  if (error)
    return (
      <div className="agentcanvas-state agentcanvas-state--error" role="alert">
        {error}
      </div>
    );
  return undefined;
}

function semanticTokenStyle(
  tokens?: Partial<AgentCanvasSemanticTokens>,
): CSSProperties {
  if (!tokens) return {};
  const variables: Record<string, string> = {};
  const names: Record<keyof AgentCanvasSemanticTokens, string> = {
    canvas: "--agentcanvas-canvas",
    panel: "--agentcanvas-panel",
    raised: "--agentcanvas-raised",
    inset: "--agentcanvas-inset",
    hover: "--agentcanvas-hover",
    text: "--agentcanvas-text",
    textSecondary: "--agentcanvas-text-secondary",
    textMuted: "--agentcanvas-text-muted",
    border: "--agentcanvas-border",
    borderStrong: "--agentcanvas-border-strong",
    action: "--agentcanvas-action",
    actionText: "--agentcanvas-action-text",
    success: "--agentcanvas-success",
    warning: "--agentcanvas-warning",
    danger: "--agentcanvas-danger",
    focus: "--agentcanvas-focus",
    fontUi: "--agentcanvas-font-ui",
    fontDisplay: "--agentcanvas-font-display",
    fontMono: "--agentcanvas-font-mono",
    baseSize: "--agentcanvas-base-size",
    headingScale: "--agentcanvas-heading-scale",
    spacingScale: "--agentcanvas-spacing-scale",
    radiusScale: "--agentcanvas-radius-scale",
    borderScale: "--agentcanvas-border-scale",
  };
  for (const [key, value] of Object.entries(tokens) as Array<
    [keyof AgentCanvasSemanticTokens, string | undefined]
  >) {
    if (value) variables[names[key]] = value;
  }
  return variables as CSSProperties;
}

export function localeValue(locale?: AgentCanvasLocale): AgentCanvasLocale {
  return locale === "zh-CN" ? "zh-CN" : "en";
}
