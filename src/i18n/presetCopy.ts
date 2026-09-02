// Translations for the preset rail (groups, sections, option labels/descriptions).
// The preset schema in src/schema/presets.ts stays English — it is exported configuration.
// These maps are keyed by stable ids/names and fall back to the schema text when missing.
//
// Tables are keyed by locale with no entry for `en`: the schema text already *is* English, so
// the absence of a table is what produces the English reading. That is why the lookups at the
// bottom have no special case for it, and why a locale we have not translated yet degrades to
// English on its own rather than needing a branch.

import type { AppLocale } from "./locales";

type PresetTextTable = Record<string, string>;
type PresetOptionTable = Record<string, { label?: string; description?: string }>;

/** Preset group id → display name. */
const presetGroupNameZh: PresetTextTable = {
  conversation: "对话",
  "media-generation": "加载器",
  sidebar: "左侧栏",
  "ux-effects": "思考",
  "tool-calls": "工具",
  blocks: "状态",
  composer: "输入区",
  provider: "模型",
  output: "输出",
  render: "渲染",
  git: "Git",
  theme: "主题",
};


/** PENDING NATIVE REVIEW — see the note in ./copy/shell.ts for the conventions used. */
const presetGroupNameJa: PresetTextTable = {
  conversation: "チャット",
  "media-generation": "ローダー",
  sidebar: "左レール",
  "ux-effects": "思考",
  "tool-calls": "ツール",
  blocks: "ステータス",
  composer: "入力欄",
  provider: "モデル",
  output: "出力",
  render: "レンダリング",
  git: "Git",
  theme: "テーマ",
};

/** Section label (English schema text) → translated label. */
const presetSectionZh: PresetTextTable = {
  Writing: "消息输出模式",
  "Message chrome": "消息外观",
  Recovery: "消息操作",
  Motion: "动效",
  Disclosure: "展开方式",
  Visibility: "可见性",
  Layout: "布局",
  "Tool display": "工具展示",
  Details: "详情",
  Lifecycle: "生命周期",
  Composer: "输入区",
  "Approval placement": "审批位置",
  Content: "内容",
  "Failure states": "失败状态",
  Inputs: "输入",
  "Run controls": "运行控制",
  Features: "功能",
  Permissions: "权限",
  Shortcuts: "快捷方式",
  "Provider UI": "服务商界面",
  "Custom provider": "自定义服务商",
  "Local runtime": "本地运行时",
  "Hosted providers": "托管服务商",
  Source: "数据源",
  "Panel behavior": "面板行为",
  "Artifact renderer": "产物渲染器",
  Review: "审阅",
  Commit: "提交",
  "Scaffold theme": "脚手架主题",
  "Image loading": "图片加载",
  "Audio loading": "音频加载",
  "Video loading": "视频加载",
};


/** PENDING NATIVE REVIEW — see the note in ./copy/shell.ts for the conventions used. */
const presetSectionJa: PresetTextTable = {
  Writing: "メッセージの出力",
  "Message chrome": "メッセージの外観",
  Recovery: "メッセージの操作",
  Motion: "モーション",
  Disclosure: "開き方",
  Visibility: "表示",
  Layout: "レイアウト",
  "Tool display": "ツールの表示",
  Details: "詳細",
  Lifecycle: "ライフサイクル",
  Composer: "入力欄",
  "Approval placement": "承認の配置",
  Content: "内容",
  "Failure states": "失敗時の状態",
  Inputs: "入力",
  "Run controls": "実行コントロール",
  Features: "機能",
  Permissions: "権限",
  Shortcuts: "ショートカット",
  "Provider UI": "プロバイダーの画面",
  "Custom provider": "カスタムプロバイダー",
  "Local runtime": "ローカル実行",
  "Hosted providers": "ホスト型プロバイダー",
  Source: "ソース",
  "Panel behavior": "パネルの挙動",
  "Artifact renderer": "アーティファクトのレンダラー",
  Review: "レビュー",
  Commit: "コミット",
  "Scaffold theme": "スキャフォールドのテーマ",
  "Image loading": "画像の読み込み",
  "Audio loading": "音声の読み込み",
  "Video loading": "動画の読み込み",
};

/** Preset option id → translated label/description. */
const presetOptionZh: PresetOptionTable = {
  // Conversation
  "writing-smooth": { label: "平滑流式", description: "以稳定的流式方式呈现助手文本，不加额外修饰。" },
  "writing-typewriter": { label: "打字机", description: "采用逐字符的节奏书写，适合专注的对话。" },
  "writing-chunked": { label: "分块", description: "以易读的短语块逐步显示输出，适合长篇回答。" },
  "speaker-labels": { label: "名称标签", description: "在对话轮次上显示 YOU 与 AGENT 标签。" },
  // Sidebar
  "sidebar-visible": { label: "显示侧边栏", description: "在产品外壳中显示会话历史侧边栏。" },
  "sidebar-new-button": { label: "新建对话按钮", description: "在侧边栏顶部显示新建对话操作。" },
  "sidebar-search": { label: "搜索框", description: "显示用于筛选会话的搜索框。" },
  "sidebar-grouping": { label: "按日期分组", description: "把会话按「今天 / 更早」分组显示。" },
  "sidebar-footer": { label: "版本号", description: "在侧边栏底部显示当前版本号。" },
  "output-visible": { label: "显示输出面板", description: "在产品外壳中显示输出／产物面板。" },
  "git-visible": { label: "显示 Git 面板", description: "在产品外壳中显示 Git 面板。" },
  "message-actions": {
    label: "消息操作",
    description: "在消息级别提供按角色区分的复制、重新生成和编辑重跑控件。",
  },

  // Media generation
  "media-image-grid": { label: "网格扫光", description: "稳定网格占位，配合扫光动效展示图片生成中。" },
  "media-image-blur": { label: "点阵闪烁", description: "用满铺点阵和不规则明暗闪烁表现图片生成过程。" },
  "media-image-palette": { label: "模糊流动", description: "用灰色模糊渐变和缓慢流动表现图片生成过程。" },
  "media-image-layers": { label: "光晕加载", description: "去掉中间网格，用整体光晕流动表现图片正在生成。" },
  "media-audio-skeleton": { label: "骨架加载", description: "用两条横向骨架占位和柔和扫光表现音频生成中。" },
  "media-audio-waveform": { label: "音频波浪", description: "用动态波形条表现音频生成中，完成后展示音频播放器 demo。" },
  "media-video-storyboard": { label: "网格扫光", description: "复用图片网格扫光加载，完成后展示视频播放器 demo。" },
  "media-video-cinema": { label: "点阵闪烁", description: "复用图片点阵闪烁加载，完成后展示视频播放器 demo。" },
  "media-video-timeline": { label: "模糊流动", description: "复用图片模糊流动加载，完成后展示视频播放器 demo。" },
  "media-video-frames": { label: "光晕加载", description: "复用图片光晕加载，完成后展示视频播放器 demo。" },

  // Thinking (ux-effects)
  "thinking-wave": { label: "圆点", description: "对话流中的动画思考圆点。" },
  "thinking-pulse": { label: "无限轨迹", description: "用于活跃推理的无限路径动效。" },
  "thinking-shimmer": { label: "微光文字", description: "在“思考中”文字上扫过一道柔光。" },
  "thinking-bars": { label: "波形条", description: "用于活跃推理的小型均衡器条。" },
  "thinking-orbit": { label: "环绕圆点", description: "受环形加载器启发的紧凑圆点轨道。" },
  "thinking-orb-s1": { label: "格点波", description: "3×3 格点从中心向外扩散的思考动效。" },
  "thinking-orb-b5": { label: "焦点传递", description: "多层圆点在焦平面间柔和交接。" },
  "thinking-orb-m2": { label: "扩张环", description: "八个圆点在收缩和扩张之间旋转变形。" },
  "summary-first": {
    label: "先摘要后详情",
    description: "在工具和代码详情之前显示一段安全可公开的推理摘要。这不是原始思维链。",
  },
  "reasoning-auto-collapse": {
    label: "自动折叠",
    description: "运行后保持推理紧凑，同时保留展开控件。",
  },
  "reasoning-expanded": {
    label: "默认展开",
    description: "在工作流需要检视时打开推理区块。",
  },
  "reasoning-status-only": {
    label: "仅状态",
    description: "仅显示当前推理状态，呈现噪音最低的脚手架。",
  },
  "reasoning-public-summary": {
    label: "公开摘要",
    description: "显示开发者安全的摘要文本，不暴露隐藏的推理。",
  },
  "reasoning-model-thinking": {
    label: "模型原文",
    description: "显示模型实际输出的思考内容，仅对会返回思考的服务商生效。",
  },

  // Tool Calls
  "command-cards": {
    label: "折叠卡片",
    description: "工具调用默认收起，保留展开按钮用于查看详情。",
  },
  "compact-chips": {
    label: "默认展开",
    description: "工具调用默认展开，隐藏展开按钮，直接展示内容。",
  },
  "timeline-rail": {
    label: "时间线展开",
    description: "工具调用展开后左侧显示 1px 时间线。",
  },
  "terminal-log": {
    label: "终端抽屉",
    description: "在终端抽屉中以命令行风格渲染工具输出。",
  },
  "tool-detail-full": {
    label: "输入与输出",
    description: "在展开的工具中显示安全的工具参数和可见结果。",
  },
  "tool-detail-output-only": {
    label: "仅输出",
    description: "隐藏工具参数，仅保留结果区域可见。",
  },
  "tool-detail-summary": {
    label: "仅摘要",
    description: "将工具详情折叠到标题预览中。",
  },
  "tool-progress-icon": {
    label: "状态图标",
    description: "在工具标题中仅使用生命周期图标。",
  },
  "tool-progress-bar": {
    label: "进度条",
    description: "在工具标题下方添加紧凑的进度轨道。",
  },
  "tool-approval-inline": {
    label: "内联审批",
    description: "在输入框上方用紧凑的编号选项询问：是、始终、否，也可直接输入答案。",
  },
  "tool-approval-hidden": {
    label: "外部审批",
    description: "在输入框上方用完整的权限卡片询问，并一并展示工具参数。",
  },

  // Blocks
  "tool-log-tail": {
    label: "日志末尾",
    description: "在展开前为长工具日志切换显示紧凑的末尾内容。",
  },
  "error-collapse": {
    label: "错误折叠",
    description: "切换显示用户安全的错误文案，调试细节不进入主对话。",
  },

  // Composer
  upload: { label: "上传", description: "提供文件附件，用于仓库上下文、日志和截图。" },
  mic: { label: "麦克风", description: "添加可选的语音输入功能，不改变文本流程。" },
  budget: { label: "思考预算", description: "在高波动的编码运行中保持推理预算可见。" },
  "model-config": {
    label: "模型配置",
    description: "在输入区工具栏展示模型选择。",
  },
  "model-tools": {
    label: "替我审批",
    description: "在模型选择旁展示输入区审批权限入口。",
  },
  "prompt-shortcuts": {
    label: "提示词标签",
    description: "提供可复用的提示词，又不让输入区变成一个库。",
  },

  // Provider — labels are provider proper names (data); keep English by omitting label.
  "provider-settings-launcher": {
    label: "设置齿轮",
    description: "在生成的 Agent 界面左下角添加服务商设置入口。",
  },
  "provider-openai": { description: "面向通用编码 Agent 的默认 GPT 系列托管服务商。" },
  "provider-anthropic": {
    description: "面向长上下文编码与审阅工作流的 Claude 系列服务商。",
  },
  "provider-gemini": {
    description: "面向多模态和宽上下文 Agent 流程的 Google Gemini 服务商。",
  },
  "provider-openrouter": {
    description: "用于在托管模型系列之间切换的路由服务商。",
  },
  "provider-deepseek": { description: "DeepSeek 对话与推理服务商预设。" },
  "provider-z-ai": { description: "面向 Z.ai 兼容适配器的 GLM 系列服务商预设。" },
  "provider-moonshot": {
    description: "面向中文和长上下文 Agent 的 Kimi 与 Moonshot 服务商预设。",
  },
  "provider-local": {
    description: "面向 Ollama、LM Studio 等工具的 OpenAI 兼容本地运行时预设。",
  },
  "provider-custom": {
    description: "接入任意 OpenAI 兼容网关、私有端点或托管模型代理。",
  },

  // Output
  "output-source-artifact": {
    label: "最新产物",
    description: "使用最新的 AgentUX 产物作为输出源。",
  },
  "output-source-console": {
    label: "控制台日志",
    description: "使用运行和工具输出日志，而非产物内容。",
  },

  // Render
  "renderer-auto": {
    label: "自动渲染器",
    description: "根据产物元数据选择代码、diff、Markdown、预览或数据。",
  },
  "renderer-code": {
    label: "代码",
    description: "以可复制的开发者格式渲染代码产物。",
  },
  "renderer-diff": {
    label: "Diff",
    description: "以稳定的行号槽和变更标记渲染补丁产物。",
  },
  "renderer-markdown": {
    label: "Markdown",
    description: "将 Markdown 产物渲染为结构化文档输出。",
  },
  "renderer-preview": {
    label: "HTML / 应用预览",
    description: "将可视化或文档产物渲染为预览界面。",
  },
  "renderer-data": {
    label: "数据 / 表单",
    description: "渲染结构化数据、表单和基于 JSON 的产物。",
  },

  // Git
  "branch-status": {
    label: "分支状态",
    description: "显示当前分支、改动状态以及领先/落后概要。",
  },
  "changed-files": {
    label: "变更文件",
    description: "以紧凑的文件列表显示每个文件的变更状态。",
  },
  "diff-preview": {
    label: "Diff 预览",
    description: "在工具面板中保留有边界的内联 diff。",
  },
  "commit-message": {
    label: "提交信息",
    description: "建议提交文案，而不改变操作权限。",
  },
  "commit-action": {
    label: "提交操作",
    description: "允许脚手架界面提供提交命令。",
  },

  // Theme — Native (原生风)
  "warm-graphite": {
    label: "暖石墨",
    description: "暗灰 + 琥珀暖光",
  },
  "cocoa-system": {
    label: "可可系统",
    description: "深咖 + 玫瑰铜",
  },
  "forest-ember": {
    label: "森林余烬",
    description: "深绿黑 + 暖金",
  },
  "soft-glass": {
    label: "柔光玻璃",
    description: "苹果感浅灰 + 深蓝",
  },
  "sand-workspace": {
    label: "砂石工作台",
    description: "温白 + 粘土橙",
  },
  "apricot-agent": {
    label: "橙光助手",
    description: "清爽白橙 + 亮橙",
  },
  // Theme — Minimal (极简风)
  "cold-mono": {
    label: "冷调黑白",
    description: "黑白冷灰",
  },
  "slate-blue": {
    label: "石板蓝",
    description: "冷蓝控制台",
  },
  "cyan-grid": {
    label: "青色栅格",
    description: "深青黑 · 技术感",
  },
  "ice-white": {
    label: "冰白",
    description: "冷白 + 冰蓝",
  },
  "mist-blue": {
    label: "雾紫",
    description: "淡紫雾面 + 紫色主色",
  },
  "polar-mono": {
    label: "极地深蓝",
    description: "极冷白灰 + 深蓝主色",
  },
};

/**
 * Locale → table. A locale absent from these reads through to the schema's English text,
 * which is what makes adding a language a matter of adding an entry rather than a branch.
 */
const presetGroupNames: Partial<Record<AppLocale, PresetTextTable>> = {
  zh: presetGroupNameZh,
  ja: presetGroupNameJa,
};

const presetSections: Partial<Record<AppLocale, PresetTextTable>> = {
  zh: presetSectionZh,
  ja: presetSectionJa,
};

const presetOptions: Partial<Record<AppLocale, PresetOptionTable>> = {
  zh: presetOptionZh,
};

export function translatePresetGroupName(id: string, fallback: string, locale: AppLocale): string {
  return presetGroupNames[locale]?.[id] ?? fallback;
}

export function translatePresetSection(section: string, locale: AppLocale): string {
  return presetSections[locale]?.[section] ?? section;
}

export function translatePresetOptionLabel(id: string, fallback: string, locale: AppLocale): string {
  return presetOptions[locale]?.[id]?.label ?? fallback;
}

export function translatePresetOptionDescription(id: string, fallback: string, locale: AppLocale): string {
  return presetOptions[locale]?.[id]?.description ?? fallback;
}
