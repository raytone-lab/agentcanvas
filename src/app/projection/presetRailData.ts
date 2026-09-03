import {
  Frame,
  GitBranch,
  LayoutTemplate,
  MessagesSquare,
  Palette,
  PanelLeft,
  PanelsTopLeft,
  PenLine,
  Plug,
  Shapes,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { IconSlot, ScenarioId } from "../../agentmatrix";
import type { StateCard, StateCardAnim, StateCardTone } from "../../components/agentmatrix/StateGallery";
import { previewCopy } from "../../i18n/copy/preview";
import type { AppLocale } from "../../i18n/uiCopy";
import type { PreviewScenarioId } from "../../preview-runner/PreviewRunner";
import type { PresetStyleId } from "../../schema/agentuxConfig";
import type { PresetGroupId, PresetOption } from "../../schema/presets";
import { themeTokens } from "../../theme/themeTokens";

export function groupPresetOptions(options: PresetOption[], defaultSection: string) {
  const sections = new Map<string, PresetOption[]>();
  for (const option of options) {
    const section = option.section ?? defaultSection;
    sections.set(section, [...(sections.get(section) ?? []), option]);
  }
  return Array.from(sections.entries()).map(([label, items]) => ({ label, items }));
}

export const presetGroupIcons: Record<PresetGroupId, LucideIcon> = {
  conversation: MessagesSquare,
  "media-generation": Shapes,
  sidebar: PanelLeft,
  "ux-effects": Sparkles,
  "tool-calls": Wrench,
  blocks: LayoutTemplate,
  composer: PenLine,
  provider: Plug,
  output: PanelsTopLeft,
  render: Frame,
  theme: Palette,
  git: GitBranch,
};

// The preset groups are clustered into a few small, flat sections so newcomers
// grasp them at a glance. Every section reinforces the same idea: here you only
// shape the VISUAL layer — never the agent's underlying logic or content.
// Section names are kept small/quiet; all groups stay flat & always visible.
export const presetRailSections: { id: string; label: { zh: string; en: string }; groupIds: PresetGroupId[] }[] = [
  { id: "run-flow", label: { zh: "运行流程", en: "Run flow" }, groupIds: ["conversation", "ux-effects", "blocks", "tool-calls", "media-generation", "composer"] },
  { id: "layout-output", label: { zh: "布局输出", en: "Layout & output" }, groupIds: ["sidebar", "output"] },
  { id: "engineering", label: { zh: "工程配置", en: "Engineering" }, groupIds: ["provider", "git"] },
  { id: "theme", label: { zh: "主题", en: "Theme" }, groupIds: ["theme"] },
];

export const presetStyleOptions: Array<{
  id: PresetStyleId;
  label: Record<AppLocale, string>;
}> = [
  { id: "native", label: { en: "Native", zh: "原生风", ja: "ネイティブ" } },
  { id: "illustrated", label: { en: "Minimal", zh: "极简风", ja: "ミニマル" } },
  { id: "studio", label: { en: "Illustrated", zh: "插画风", ja: "イラスト" } },
];

// Every standard scenario is demoed under the existing UX preset group it
// exercises — no standalone blocks. Selecting one streams it into the current
// preview components.
export const presetGroupScenarios: Partial<Record<PresetGroupId, ScenarioId[]>> = {
  conversation: ["normal-turn"],
  "ux-effects": ["streamed-message"],
  composer: ["tool-approval"],
  blocks: ["retrying-incident", "exhausted-incident", "terminal-incident"],
};

export const presentationOnlyPresetIds = new Set([
  "command-cards",
  "compact-chips",
  "timeline-rail",
  "tool-detail-full",
  "tool-detail-output-only",
  "tool-progress-bar",
  "tool-approval-inline",
  "tool-approval-hidden",
  "error-collapse",
]);

export const forceOpenToolDetailPresetIds = new Set(["tool-detail-full", "tool-detail-output-only"]);

const requiredPresetOptionIds = new Set([
  "media-image-grid",
  "media-image-blur",
  "media-image-palette",
  "media-image-layers",
  "media-audio-skeleton",
  "media-audio-waveform",
  "media-video-storyboard",
  "media-video-cinema",
  "media-video-timeline",
  "media-video-frames",
  "writing-smooth",
  "writing-typewriter",
  "writing-chunked",
  "thinking-wave",
  "thinking-pulse",
  "thinking-terminal",
  "thinking-minimal",
  "thinking-shimmer",
  "thinking-bars",
  "thinking-orbit",
  "thinking-orb-s1",
  "thinking-orb-b5",
  "thinking-orb-m2",
  "summary-first",
  "reasoning-auto-collapse",
  "reasoning-expanded",
  "reasoning-status-only",
  "reasoning-public-summary",
  "reasoning-model-thinking",
  "command-cards",
  "compact-chips",
  "timeline-rail",
  "tool-detail-full",
  "tool-detail-output-only",
  "tool-approval-inline",
  "tool-approval-hidden",
  "output-source-artifact",
  "output-source-console",
  "renderer-auto",
  "renderer-code",
  "renderer-diff",
  "renderer-markdown",
  "renderer-preview",
  "renderer-data",
  "surface-right-panel",
  "surface-overlay",
]);

export function isRequiredPresetOption(optionId: string) {
  return requiredPresetOptionIds.has(optionId) || Object.prototype.hasOwnProperty.call(themeTokens, optionId);
}

export function isThinkingPreviewPreset(optionId: string) {
  return (
    optionId.startsWith("thinking-") ||
    optionId === "summary-first" ||
    optionId === "reasoning-auto-collapse" ||
    optionId === "reasoning-expanded" ||
    optionId === "reasoning-status-only" ||
    optionId === "reasoning-public-summary" ||
    optionId === "reasoning-model-thinking"
  );
}

export function isMediaGenerationPreset(optionId: string) {
  return optionId.startsWith("media-image-") || optionId.startsWith("media-audio-") || optionId.startsWith("media-video-");
}

export function mediaScenarioForPresetOption(optionId: string): PreviewScenarioId | undefined {
  if (optionId.startsWith("media-image-")) return "image-generation";
  if (optionId.startsWith("media-audio-")) return "audio-generation";
  if (optionId.startsWith("media-video-")) return "video-generation";
  return undefined;
}

// One card per standardized STATE that a group's components can be in — each
// with its swappable icon and motion. Field/state names follow the uploaded
// AgentMatrix standard verbatim.
export type RawStateCard = {
  slot: IconSlot;
  title: Record<AppLocale, string>;
  code: string;
  anim?: StateCardAnim;
  tone?: StateCardTone;
  toggleKey?: string;
};

const groupStateCards: Partial<Record<PresetGroupId, RawStateCard[]>> = {
  conversation: [
    { slot: "author.user", title: { en: "User avatar", zh: "用户头像", ja: "ユーザーのアバター" }, code: "avatar · user", tone: "neutral", toggleKey: "userAvatar" },
    { slot: "author.agent", title: { en: "Agent avatar", zh: "Agent 头像", ja: "Agent のアバター" }, code: "avatar · agent", tone: "info", toggleKey: "agentAvatar" },
    // Note: streaming (agent.message_delta) is controlled by the existing
    // "书写 / Writing" options, so it is not duplicated as a state card here.
    // Session lifecycle drives the conversation-header status pill.
    { slot: "session.running", title: { en: "Session running", zh: "会话运行中", ja: "セッション実行中" }, code: "session.status_running", anim: "spin", tone: "info" },
    { slot: "session.idle", title: { en: "Session idle", zh: "会话空闲", ja: "セッション待機中" }, code: "session.status_idle", tone: "success" },
    { slot: "session.idle", title: { en: "End turn", zh: "回合结束", ja: "ターン終了" }, code: "stop_reason: end_turn", tone: "success" },
    { slot: "session.requires_action", title: { en: "Requires action", zh: "待操作", ja: "対応が必要" }, code: "stop_reason: requires_action", tone: "warning" },
    { slot: "incident.exhausted", title: { en: "Retries exhausted", zh: "重试耗尽", ja: "リトライ上限に到達" }, code: "stop_reason: retries_exhausted", tone: "danger" },
    { slot: "session.rescheduling", title: { en: "Rescheduling", zh: "重新调度", ja: "再スケジュール中" }, code: "session.status_rescheduled", anim: "spin", tone: "warning" },
    { slot: "session.terminated", title: { en: "Terminated", zh: "已终止", ja: "終了" }, code: "session.status_terminated", tone: "danger" },
    { slot: "session.deleted", title: { en: "Deleted", zh: "已删除", ja: "削除済み" }, code: "session.deleted", tone: "danger" },
  ],
  // 思考 (ux-effects): thinking visualization is already the existing 动效
  // options, so no duplicate state cards here.
  "tool-calls": [
    { slot: "tool.file_read", title: { en: "Read file", zh: "读取文件", ja: "ファイルを読む" }, code: "tool: read_file", tone: "info" },
    { slot: "content.image", title: { en: "Read image", zh: "读取图片", ja: "画像を読む" }, code: "tool: read_image", tone: "neutral" },
    { slot: "tool.file_modified", title: { en: "Modify file", zh: "修改文件", ja: "ファイルを変更" }, code: "tool: modify_file", tone: "info" },
    { slot: "tool.file_edit", title: { en: "Edit file", zh: "编辑文件", ja: "ファイルを編集" }, code: "tool: edit_file", tone: "info" },
    { slot: "tool.validate", title: { en: "Validate", zh: "验证", ja: "検証" }, code: "tool: validate", tone: "info" },
    { slot: "tool.search", title: { en: "Search", zh: "搜索/检索", ja: "検索" }, code: "tool: search", tone: "neutral" },
    { slot: "content.terminal", title: { en: "Run command", zh: "运行命令", ja: "コマンド実行" }, code: "tool: run_command", tone: "neutral" },
  ],
  // 内容块 = incidents + all session errors + diagnostics/audit facts.
  // (Provider group is intentionally left as pure provider/model config.)
  blocks: [
    { slot: "tool.completed", title: { en: "Completed", zh: "完成", ja: "完了" }, code: "status: completed", tone: "success" },
    { slot: "tool.failed", title: { en: "Failed", zh: "失败", ja: "失敗" }, code: "status: failed", tone: "danger" },
    { slot: "tool.cancelled", title: { en: "Cancelled", zh: "已取消", ja: "キャンセル" }, code: "status: cancelled", tone: "neutral" },
    { slot: "incident.retrying", title: { en: "Retrying", zh: "重试中", ja: "リトライ中" }, code: "retry_status: retrying", anim: "spin", tone: "warning" },
    { slot: "incident.exhausted", title: { en: "Exhausted", zh: "重试耗尽", ja: "リトライ上限" }, code: "retry_status: exhausted", tone: "danger" },
    { slot: "incident.terminal", title: { en: "Terminal", zh: "终止", ja: "停止" }, code: "retry_status: terminal", tone: "danger" },
    { slot: "tool.partial", title: { en: "Partial", zh: "部分完成", ja: "一部完了" }, code: "partial_lifecycle", tone: "neutral" },
    { slot: "error.model", title: { en: "Model rate limited", zh: "模型限流", ja: "モデルのレート制限" }, code: "session.error · model_rate_limited_error", anim: "spin", tone: "warning" },
    { slot: "error.model", title: { en: "Model overloaded", zh: "模型过载", ja: "モデルの過負荷" }, code: "model_overloaded_error", tone: "warning" },
    { slot: "error.model", title: { en: "Model request failed", zh: "模型请求失败", ja: "モデルのリクエスト失敗" }, code: "model_request_failed_error", tone: "danger" },
    { slot: "error.mcp", title: { en: "MCP connection failed", zh: "MCP 连接失败", ja: "MCP の接続失敗" }, code: "mcp_connection_failed_error", tone: "danger" },
    { slot: "error.mcp", title: { en: "MCP auth failed", zh: "MCP 认证失败", ja: "MCP の認証失敗" }, code: "mcp_authentication_failed_error", tone: "danger" },
    { slot: "error.billing", title: { en: "Billing", zh: "账单错误", ja: "課金エラー" }, code: "billing_error", tone: "warning" },
    { slot: "error.budget", title: { en: "Budget exceeded", zh: "预算超限", ja: "予算超過" }, code: "budget_exceeded_error", tone: "warning" },
    { slot: "error.resource", title: { en: "Resource quota", zh: "资源配额", ja: "リソース割り当て" }, code: "resource_quota_exceeded_error", tone: "warning" },
    { slot: "error.sandbox", title: { en: "Sandbox failed", zh: "沙箱失败", ja: "サンドボックスの失敗" }, code: "sandbox_failed_error", tone: "danger" },
    { slot: "error.timeout", title: { en: "Dispatch timeout", zh: "分发超时", ja: "ディスパッチのタイムアウト" }, code: "dispatch_execution_timeout", tone: "danger" },
    { slot: "error.sandbox", title: { en: "Runtime resume unrecoverable", zh: "运行时无法恢复", ja: "ランタイム再開が回復不能" }, code: "runtime_resume_unrecoverable_error", tone: "danger" },
    { slot: "error.unknown", title: { en: "Unknown error", zh: "未知错误", ja: "不明のエラー" }, code: "unknown_error", tone: "neutral" },
    { slot: "surface.model_span", title: { en: "Model request start", zh: "模型请求开始", ja: "モデルリクエスト開始" }, code: "span.model_request_start", tone: "info" },
    { slot: "surface.model_span", title: { en: "Model request end", zh: "模型请求结束", ja: "モデルリクエスト終了" }, code: "span.model_request_end", tone: "info" },
    { slot: "surface.config", title: { en: "Config updated", zh: "配置更新", ja: "設定を更新" }, code: "session.updated", tone: "info" },
    { slot: "surface.compaction", title: { en: "Context compacted", zh: "上下文压缩", ja: "コンテキストを圧縮" }, code: "agent.context_compacted", tone: "neutral" },
  ],
  output: [
    { slot: "runtime.booting", title: { en: "Booting", zh: "启动中", ja: "起動中" }, code: "runtime.status · booting", anim: "spin", tone: "info" },
    { slot: "runtime.ready", title: { en: "Ready", zh: "就绪", ja: "準備完了" }, code: "runtime.status · ready", tone: "success" },
    { slot: "runtime.degraded", title: { en: "Degraded", zh: "降级", ja: "機能低下" }, code: "runtime.status · degraded", tone: "warning" },
    { slot: "runtime.error", title: { en: "Error", zh: "错误", ja: "エラー" }, code: "runtime.status · error", tone: "danger" },
    { slot: "runtime.recovering", title: { en: "Recovering", zh: "恢复中", ja: "復旧中" }, code: "runtime.status · recovering", anim: "spin", tone: "warning" },
    { slot: "runtime.op", title: { en: "Operation started", zh: "操作开始", ja: "操作を開始" }, code: "runtime.progress: started", tone: "info" },
    { slot: "runtime.op", title: { en: "Operation running", zh: "操作进行中", ja: "操作を実行中" }, code: "runtime.progress: running", anim: "spin", tone: "info" },
    { slot: "runtime.op_done", title: { en: "Operation done", zh: "操作完成", ja: "操作が完了" }, code: "runtime.progress: completed", tone: "success" },
    { slot: "runtime.op_failed", title: { en: "Operation failed", zh: "操作失败", ja: "操作が失敗" }, code: "runtime.progress: failed", tone: "danger" },
    { slot: "runtime.op_skipped", title: { en: "Operation skipped", zh: "操作跳过", ja: "操作をスキップ" }, code: "runtime.progress: skipped", tone: "neutral" },
    { slot: "severity.info", title: { en: "Notice (info)", zh: "通知（info）", ja: "通知（info）" }, code: "runtime.message: info", tone: "info" },
    { slot: "severity.warning", title: { en: "Notice (warning)", zh: "通知（warning）", ja: "通知（warning）" }, code: "runtime.message: warning", tone: "warning" },
    { slot: "severity.error", title: { en: "Notice (error)", zh: "通知（error）", ja: "通知（error）" }, code: "runtime.message: error", tone: "danger" },
  ],
  composer: [
    { slot: "surface.interrupt", title: { en: "Interrupt", zh: "打断", ja: "中断" }, code: "user.interrupt", tone: "warning" },
    { slot: "permission.allow", title: { en: "Allow once", zh: "允许一次", ja: "今回だけ許可" }, code: "user.tool_confirmation · allow_once", tone: "success" },
    { slot: "permission.allow_always", title: { en: "Allow always", zh: "始终允许", ja: "常に許可" }, code: "user.tool_confirmation · allow_always", tone: "success" },
    { slot: "permission.deny", title: { en: "Deny", zh: "拒绝", ja: "拒否" }, code: "user.tool_confirmation · deny", tone: "danger" },
    { slot: "permission.cancel", title: { en: "Cancel", zh: "取消", ja: "キャンセル" }, code: "user.tool_confirmation · cancel", tone: "neutral" },
  ],
  render: [
    { slot: "content.text", title: { en: "Text / Markdown", zh: "文本 / Markdown", ja: "テキスト / Markdown" }, code: "content: text", tone: "neutral" },
    { slot: "content.diff", title: { en: "Diff", zh: "差异", ja: "差分" }, code: "content: diff", tone: "info" },
    { slot: "content.image", title: { en: "Image", zh: "图片", ja: "画像" }, code: "content: image", tone: "neutral" },
    { slot: "content.audio", title: { en: "Audio", zh: "音频", ja: "音声" }, code: "content: audio", tone: "neutral" },
    { slot: "content.terminal", title: { en: "Terminal", zh: "终端", ja: "ターミナル" }, code: "content: terminal", tone: "neutral" },
    { slot: "content.resource", title: { en: "Resource / link", zh: "资源 / 引用", ja: "リソース / リンク" }, code: "resource_link · resource", tone: "neutral" },
    { slot: "content.location", title: { en: "Locations", zh: "位置", ja: "該当箇所" }, code: "locations", tone: "neutral" },
  ],
};

// V1 launch scope: only the basic states a normal Agent client user actually
// sees. Advanced / diagnostic / ops states stay in the data above and can be
// re-enabled after launch by flipping SHOW_ALL_STATES.
const SHOW_ALL_STATES = false;
const V1_BASIC_CODES: Partial<Record<PresetGroupId, string[]>> = {
  conversation: ["avatar · user", "avatar · agent"],
  "tool-calls": [
    "tool: read_file",
    "tool: read_image",
    "tool: modify_file",
    "tool: edit_file",
    "tool: validate",
    "tool: search",
    "tool: run_command",
  ],
  blocks: ["status: cancelled", "retry_status: retrying", "retry_status: exhausted", "retry_status: terminal"],
};

export function visibleStateCards(groupId: PresetGroupId): RawStateCard[] {
  const cards = groupStateCards[groupId] ?? [];
  if (SHOW_ALL_STATES) return cards;
  const allowed = V1_BASIC_CODES[groupId];
  return allowed ? cards.filter((card) => allowed.includes(card.code)) : [];
}

export function stateSectionTitle(groupId: PresetGroupId, locale: AppLocale): string {
  const titles: Partial<Record<PresetGroupId, Record<AppLocale, string>>> = {
    conversation: { zh: "头像", en: "Avatars", ja: "アバター" },
    "tool-calls": { zh: "工具动作", en: "Tool actions", ja: "ツールの動作" },
    blocks: { zh: "状态展示", en: "States", ja: "ステータス表示" },
    composer: { zh: "交互状态", en: "Interaction states", ja: "操作の状態" },
    output: { zh: "运行状态", en: "Runtime states", ja: "実行時の状態" },
    render: { zh: "内容类型", en: "Content types", ja: "コンテンツの種類" },
  };
  return titles[groupId]?.[locale] ?? previewCopy[locale].stateCardFallbackTitle;
}

export function rawStateCardToStateCard(card: RawStateCard, locale: AppLocale): StateCard {
  return {
    slot: card.slot,
    title: card.title[locale],
    code: card.code,
    anim: card.anim,
    tone: card.tone,
    toggleKey: card.toggleKey,
  };
}

export const STYLE_AVATAR_DEFAULTS = {
  native: {
    "author.user": "blue-smile",
    "author.agent": "orange-blob",
  },
  illustrated: {
    "author.user": "user",
    "author.agent": "orange-blob",
  },
  studio: {
    "author.user": "user",
    "author.agent": "bot",
  },
} as const satisfies Record<PresetStyleId, Record<"author.user" | "author.agent", string>>;

export const NATIVE_HIDDEN_USER_AVATAR_IDS = new Set(["user", "assistant-second-avatar", "user-third-avatar", "green-calm"]);
export const PREVIEW_RESPONSIVE_WIDTHS = {
  hideRightPanel: 860,
  hideLeftSidebar: 660,
} as const;
