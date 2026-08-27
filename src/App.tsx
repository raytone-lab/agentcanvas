import { useEffect, useMemo, useRef, useState } from "react";
import type { AgentUXArtifactTimelineItem, AgentUXToolTimelineItem } from "@agent-ux/render-core";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import {
  Activity,
  Clock3,
  Copy,
  Download,
  ChevronDown,
  Frame,
  GitBranch,
  GitMerge,
  LayoutTemplate,
  MessagesSquare,
  Palette,
  PanelLeft,
  PanelRight,
  PanelsTopLeft,
  Pencil,
  PenLine,
  Plug,
  RotateCcw,
  Save,
  Settings2,
  Shapes,
  Sparkles,
  Eye,
  TriangleAlert,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Toaster, toast } from "sonner";

import { useAgentUXRuntime, useAgentUXViewModel, type AgentUXEvent } from "./agentux";
import {
  IconStyleProvider,
  scenarioById,
  stateDemoEvents,
  toAgentUXEvents,
  useIconSet,
  type IconSlot,
  type Scenario,
  type ScenarioId,
} from "./agentmatrix";
import {
  StateGallery,
  type StateCard,
  type StateCardAnim,
  type StateCardTone,
} from "./components/agentmatrix/StateGallery";
import { SelectMenu } from "./components/ui";
import { Dialog, DialogClose, DialogContent } from "./components/ui/dialog";
import { CommandMenu } from "./components/CommandMenu";
import { PresetOptionPreview } from "./components/PresetOptionPreview";
import { ProviderSettingsPanel } from "./components/ProviderSettingsPanel";
import { WelcomeSettingsPanel } from "./components/WelcomeSettingsPanel";
import { RightSidebarRailIcon, SidebarRailIcon } from "./components/common/RailIcons";
import { ProviderFloatingSettings } from "./components/agent-preview/ProviderFloatingSettings";
import { ExternalApprovalSurface } from "./components/agent-preview/ChatFrame";
import {
  OutputPanelModal,
  languageFromFileName,
  normalizeOutputPanelRequest,
  type OutputPanelItem,
  type OutputPanelOpenRequest,
} from "./components/agent-preview/OutputFrame";
import { outputPanelItemsFromTool } from "./components/agent-preview/ToolCallCard";
import { WritingParamControls, hasWritingParams } from "./components/agent-preview/WritingParamControls";
import { useCopy, useLocale } from "./i18n/LocaleContext";
import { localizePreviewText, localizePreviewViewModel } from "./i18n/previewLocalization";
import {
  translatePresetGroupName,
  translatePresetOptionDescription,
  translatePresetOptionLabel,
  translatePresetSection,
} from "./i18n/presetCopy";
import { previewCopy } from "./i18n/copy/preview";
import { APP_LOCALES } from "./i18n/locales";
import { uiCopy, type AppLocale, type UiCopy } from "./i18n/uiCopy";
import { downloadScaffold } from "./export/scaffoldDownload";
import { createScaffoldExportSnapshot, type ScaffoldExportSnapshot } from "./export/scaffoldManifest";
import { parsePreviewFixture, previewFixtures, type PreviewFixtureId } from "./preview/fixtures";
import { fixtureForPresetOption } from "./preview/presetFixture";
import { previewAnchorFallbacks, previewAnchorForPresetGroup, previewAnchorForPresetOption, type PreviewAnchor } from "./preview/presetPreviewTarget";
import { createReasoningRenderPolicy } from "./preview/reasoningPreviewPolicy";
import {
  collectPreviewRunEvents,
  commitGitPreviewState,
  createPureFrontendPreviewRunner,
  gitPreviewStateFromEvents,
  previewScenarios,
  resolveDefaultPreviewScenario,
  type GitPreviewState,
  type PreviewInputAttachment,
  type PreviewScenarioId,
} from "./preview-runner/PreviewRunner";
import {
  LIVE_TOOL_SIMULATION_DELAY_MS,
  providerRequestHeaders,
  providerRequestUrl,
  runLiveLlmPreview,
  type LiveLlmMessage,
} from "./preview-runner/LiveLlmPreviewRunner";
import {
  initialSavedPreviewRunMode,
  type LivePreviewState,
} from "./preview-runner/runModeState";
import {
  defaultCodingAgentProject,
  modelOptionsForProject,
  type AgentFrontendProject,
  type OutputSource,
  type PresetStyleId,
  type ProviderCatalogId,
  type ProviderConnection,
  type ProviderConnectionId,
} from "./schema/agentuxConfig";
import { applyPresetOption, isPresetOptionActive, togglePresetOption } from "./schema/presetActions";
import {
  presetGroupsForProject,
  resolvePresetGroupSelection,
  type PresetGroupId,
  type PresetOption,
  projectPresetSummary,
} from "./schema/presets";
import { aliasesForHarness, diagnosticMarkersForHarness } from "./harness/adapters/registry";
import {
  admissionSeverity,
  admitEvents,
  describeAdmission,
  hasAdmissionFindings,
} from "./runtime/admissionReport";
import { renderSlots, slotsForTemplate, type SlotRenderContext } from "./slots/slotRegistry";
import { applyTheme } from "./theme/applyTheme";
import { themeTokens } from "./theme/themeTokens";

function groupPresetOptions(options: PresetOption[], defaultSection: string) {
  const sections = new Map<string, PresetOption[]>();
  for (const option of options) {
    const section = option.section ?? defaultSection;
    sections.set(section, [...(sections.get(section) ?? []), option]);
  }
  return Array.from(sections.entries()).map(([label, items]) => ({ label, items }));
}

const presetGroupIcons: Record<PresetGroupId, LucideIcon> = {
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
const presetRailSections: { id: string; label: { zh: string; en: string }; groupIds: PresetGroupId[] }[] = [
  { id: "run-flow", label: { zh: "运行流程", en: "Run flow" }, groupIds: ["conversation", "ux-effects", "blocks", "tool-calls", "media-generation", "composer"] },
  { id: "layout-output", label: { zh: "布局输出", en: "Layout & output" }, groupIds: ["sidebar", "output"] },
  { id: "engineering", label: { zh: "工程配置", en: "Engineering" }, groupIds: ["provider", "git"] },
  { id: "theme", label: { zh: "主题", en: "Theme" }, groupIds: ["theme"] },
];

type MessageActionKey = keyof AgentFrontendProject["conversation"]["messageActions"];

const presetStyleOptions: Array<{
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
const presetGroupScenarios: Partial<Record<PresetGroupId, ScenarioId[]>> = {
  conversation: ["normal-turn"],
  "ux-effects": ["streamed-message"],
  composer: ["tool-approval"],
  blocks: ["retrying-incident", "exhausted-incident", "terminal-incident"],
};

const presentationOnlyPresetIds = new Set([
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

const forceOpenToolDetailPresetIds = new Set(["tool-detail-full", "tool-detail-output-only"]);

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

function isRequiredPresetOption(optionId: string) {
  return requiredPresetOptionIds.has(optionId) || Object.prototype.hasOwnProperty.call(themeTokens, optionId);
}

function isThinkingPreviewPreset(optionId: string) {
  return (
    optionId.startsWith("thinking-") ||
    optionId === "summary-first" ||
    optionId === "reasoning-auto-collapse" ||
    optionId === "reasoning-expanded" ||
    optionId === "reasoning-status-only" ||
    optionId === "reasoning-public-summary"
  );
}

function isMediaGenerationPreset(optionId: string) {
  return optionId.startsWith("media-image-") || optionId.startsWith("media-audio-") || optionId.startsWith("media-video-");
}

function mediaScenarioForPresetOption(optionId: string): PreviewScenarioId | undefined {
  if (optionId.startsWith("media-image-")) return "image-generation";
  if (optionId.startsWith("media-audio-")) return "audio-generation";
  if (optionId.startsWith("media-video-")) return "video-generation";
  return undefined;
}

// One card per standardized STATE that a group's components can be in — each
// with its swappable icon and motion. Field/state names follow the uploaded
// AgentMatrix standard verbatim.
type RawStateCard = {
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
    { slot: "error.unknown", title: { en: "Unknown error", zh: "未知错误", ja: "不明なエラー" }, code: "unknown_error", tone: "neutral" },
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

function visibleStateCards(groupId: PresetGroupId): RawStateCard[] {
  const cards = groupStateCards[groupId] ?? [];
  if (SHOW_ALL_STATES) return cards;
  const allowed = V1_BASIC_CODES[groupId];
  return allowed ? cards.filter((card) => allowed.includes(card.code)) : [];
}

function stateSectionTitle(groupId: PresetGroupId, locale: AppLocale): string {
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

function rawStateCardToStateCard(card: RawStateCard, locale: AppLocale): StateCard {
  return {
    slot: card.slot,
    title: card.title[locale],
    code: card.code,
    anim: card.anim,
    tone: card.tone,
    toggleKey: card.toggleKey,
  };
}

type ToolActionDemoSpec = {
  name: string;
  title: string;
  args: Record<string, unknown>;
  result: unknown;
  resultPreview: string;
};

function toolActionDemoSpec(card: StateCard, locale: AppLocale): ToolActionDemoSpec {
  const c = previewCopy[locale].toolAction;
  switch (card.code) {
    case "tool: read_image":
      return {
        name: "read_image",
        title: c.readImage,
        args: { path: "assets/chart.png" },
        result: "image/png · 1280x720 · support volume trend",
        resultPreview: "1280x720 image",
      };
    case "tool: modify_file":
      return {
        name: "apply_patch",
        title: c.modifyFile,
        args: { path: "src/SearchInput.tsx" },
        result: { changed: true, insertions: 18, deletions: 4 },
        resultPreview: "+18 -4",
      };
    case "tool: edit_file":
      return {
        name: "edit_file",
        title: c.editFile,
        args: { path: "src/components/ComposerFrame.tsx" },
        result: { changed: true, insertions: 9, deletions: 9 },
        resultPreview: "+9 -9",
      };
    case "tool: validate":
      return {
        name: "validate",
        title: c.validate,
        args: { path: "src/SearchInput.test.tsx", cmd: "npm test -- SearchInput" },
        result: "SearchInput.test.tsx\n✓ validates short queries\n✓ shows loading state",
        resultPreview: "2 passed",
      };
    case "tool: search":
      return {
        name: "search",
        title: c.search,
        args: { pattern: "useSearch" },
        result: "src/SearchInput.tsx:42\nsrc/hooks/useSearch.ts:10",
        resultPreview: "2 locations",
      };
    case "tool: run_command":
      return {
        name: "run_command",
        title: c.runCommand,
        args: { cmd: "npm run build" },
        result: "> npm run build\n✓ built in 8.4s",
        resultPreview: "build passed",
      };
    case "tool: read_file":
    default:
      return {
        name: "read_file",
        title: c.readFile,
        args: { path: "src/SearchInput.tsx" },
        result: "import { useState } from \"react\";\n\nexport function SearchInput() {\n  const [query, setQuery] = useState(\"\");\n  return <input value={query} onChange={(event) => setQuery(event.target.value)} />;\n}",
        resultPreview: "7 lines",
      };
  }
}

function toolActionsOverviewEvents(cards: readonly StateCard[], title: string, locale: AppLocale): AgentUXEvent[] {
  const c = previewCopy[locale];
  const runId = "tool-actions-overview";
  let seq = 0;
  const push = (type: string, payload: Record<string, unknown>, messageId?: string): AgentUXEvent => {
    seq += 1;
    return {
      protocol: "agent-ux",
      version: "0.1",
      id: `tool_actions_${seq}`,
      runId,
      messageId,
      seq,
      ts: 1760000100000 + seq,
      type,
      payload,
    };
  };

  const events: AgentUXEvent[] = [
    push("run.started", { title }),
    push("text.started", { textId: "user_tool_actions", role: "user", format: "plain" }, "message_user_tool_actions"),
    push("text.delta", {
      textId: "user_tool_actions",
      delta: c.toolActionsOverview.prompt,
    }, "message_user_tool_actions"),
    push("text.finished", { textId: "user_tool_actions" }, "message_user_tool_actions"),
  ];

  cards.forEach((card, index) => {
    const spec = toolActionDemoSpec(card, locale);
    const toolCallId = `tool_action_${index}_${card.code.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
    events.push(
      push("tool.call.started", { toolCallId, name: spec.name, title: spec.title }),
      push("tool.call.running", { toolCallId, args: spec.args }),
      push("tool.call.result", { toolCallId, result: spec.result, resultPreview: spec.resultPreview }),
      push("tool.call.finished", { toolCallId, status: "success" }),
    );
  });

  events.push(
    push("text.started", { textId: "assistant_tool_actions_demo", role: "assistant", format: "plain" }, "message_assistant_tool_actions_demo"),
    push("text.delta", {
      textId: "assistant_tool_actions_demo",
      delta: c.toolActionsOverview.reply.join("\n"),
    }, "message_assistant_tool_actions_demo"),
    push("text.finished", { textId: "assistant_tool_actions_demo" }, "message_assistant_tool_actions_demo"),
  );

  events.push(push("run.finished", { status: "success" }));
  return events;
}

function conversationWritingPreviewEvents(locale: AppLocale): AgentUXEvent[] {
  const c = previewCopy[locale];
  const runId = "conversation-writing-output-preview";
  let seq = 0;
  const push = (type: string, payload: Record<string, unknown>, messageId?: string): AgentUXEvent => {
    seq += 1;
    return {
      protocol: "agent-ux",
      version: "0.1",
      id: `conversation_writing_${seq}`,
      runId,
      messageId,
      seq,
      ts: 1760000200000 + seq,
      type,
      payload,
    };
  };

  return [
    push("run.started", { title: c.writing.runTitle }),
    push("text.started", { textId: "user_conversation_output_mode", role: "user", format: "plain" }, "message_user_conversation_output_mode"),
    push("text.delta", {
      textId: "user_conversation_output_mode",
      delta: c.writing.userPrompt,
    }, "message_user_conversation_output_mode"),
    push("text.finished", { textId: "user_conversation_output_mode" }, "message_user_conversation_output_mode"),
    push("text.started", { textId: "assistant_conversation_output_mode", role: "assistant", format: "plain" }, "message_assistant_conversation_output_mode"),
    push("text.delta", {
      textId: "assistant_conversation_output_mode",
      delta: c.writing.reply.join("\n"),
    }, "message_assistant_conversation_output_mode"),
    push("text.finished", { textId: "assistant_conversation_output_mode" }, "message_assistant_conversation_output_mode"),
    push("run.finished", { status: "success" }),
  ];
}

function thinkingPreviewEvents(locale: AppLocale): AgentUXEvent[] {
  const runId = "thinking-motion-preview";
  let seq = 0;
  const push = (type: string, payload: Record<string, unknown>, messageId?: string): AgentUXEvent => {
    seq += 1;
    return {
      protocol: "agent-ux",
      version: "0.1",
      id: `thinking_preview_${seq}`,
      runId,
      messageId,
      seq,
      ts: 1760000300000 + seq,
      type,
      payload,
    };
  };
  const c = previewCopy[locale].thinking;

  return [
    push("run.started", { title: c.runTitle }),
    push("text.started", { textId: "user_thinking_preview", role: "user", format: "plain" }, "message_user_thinking_preview"),
    push("text.delta", { textId: "user_thinking_preview", delta: c.userPrompt }, "message_user_thinking_preview"),
    push("text.finished", { textId: "user_thinking_preview" }, "message_user_thinking_preview"),
    push("reasoning.status", { reasoningId: "thinking-preview", status: "planning", label: c.statusLabel }),
    push("reasoning.delta", { reasoningId: "thinking-preview", kind: "summary", delta: c.summary, format: "plain", open: false }),
  ];
}

function ScenarioCards({
  scenarios,
  activeId,
  active,
  locale,
  onSelect,
}: {
  scenarios: Scenario[];
  activeId: ScenarioId;
  active: boolean;
  locale: AppLocale;
  onSelect: (id: ScenarioId) => void;
}) {
  return (
    <div className="preset-option-list">
      {scenarios.map((scenario) => {
        const isActive = active && scenario.id === activeId;
        return (
          <div className="preset-option-cell" key={scenario.id}>
            <button
              className="preset-option"
              data-active={isActive}
              aria-pressed={isActive}
              type="button"
              onClick={() => onSelect(scenario.id)}
            >
              <span className="preset-option-topline">
                <span>{standardScenarioTitle(scenario, locale)}</span>
              </span>
              <small>{standardScenarioSummary(scenario, locale)}</small>
            </button>
          </div>
        );
      })}
    </div>
  );
}

let previewFocusId = 0;

type SurfaceMode = "builder" | "saved-preview";
/**
 * Mirrors `PreviewRunMode` in `preview-runner/runModeState.ts`. It was missing `"harness"`,
 * which is why the harness branch there was unreachable: the run-mode indicator had a case for
 * it, but no code could ever set the value.
 */
type RunMode = "replay" | "live" | "harness";
type WritingMode = AgentFrontendProject["theme"]["motion"]["writing"];
const defaultPreviewPrompt = {
  en: "Add validation to the search input and show a loading state while results are fetched.",
  zh: "给搜索框加校验，并在获取结果时显示加载状态。",
  ja: "検索欄にバリデーションを追加し、結果の取得中はローディング状態を表示してください。",
} satisfies Record<AppLocale, string>;

const livePreviewFallbackPrompt = {
  en: "Test this AgentCanvas UI/UX.",
  zh: "测试这个 AgentCanvas UI/UX。",
  ja: "この AgentCanvas の UI/UX をテストします。",
} satisfies Record<AppLocale, string>;

const standardScenarioCopy: Record<ScenarioId, { title: Record<AppLocale, string>; summary: Record<AppLocale, string> }> = {
  "normal-turn": {
    title: { en: "Normal turn", zh: "普通回合", ja: "通常のターン" },
    summary: { en: "User message with a file reference and one final agent answer.", zh: "用户消息包含文件引用，Agent 给出最终回答。", ja: "ファイル参照を含むユーザーメッセージと、Agent の最終回答が 1 件。" },
  },
  "streamed-message": {
    title: { en: "Streaming thinking + message", zh: "流式思考 + 消息", ja: "ストリーミング思考 + メッセージ" },
    summary: { en: "Live deltas preview a thinking block and message, then durable Events replace them.", zh: "实时增量预览思考块和消息，随后由持久事件替换。", ja: "ライブの差分が思考ブロックとメッセージを先に見せ、その後に永続イベントが置き換えます。" },
  },
  "tool-approval": {
    title: { en: "Tool approval + completion", zh: "工具审批 + 完成", ja: "ツールの承認 + 完了" },
    summary: { en: "A native write pauses for confirmation, is allowed once, and completes with a diff.", zh: "原生写入暂停等待确认，允许一次后完成并生成 diff。", ja: "ネイティブの書き込みが確認のため一旦止まり、今回だけ許可され、差分付きで完了します。" },
  },
  "mcp-and-interrupt": {
    title: { en: "MCP success + interrupt", zh: "MCP 成功 + 打断", ja: "MCP 成功 + 中断" },
    summary: { en: "An MCP call returns a terminal reference; a later pending call is interrupted.", zh: "MCP 调用返回终端引用，后续待处理调用被打断。", ja: "MCP 呼び出しが終端の参照を返し、その後の保留中の呼び出しが中断されます。" },
  },
  "runtime-lifecycle": {
    title: { en: "Runtime boot + sync", zh: "Runtime 启动 + 同步", ja: "Runtime 起動 + 同期" },
    summary: { en: "Runtime status and one folded progress operation, plus an optional-resource warning.", zh: "Runtime 状态、折叠进度操作，以及可选资源 warning。", ja: "ランタイムの状態と折りたたまれた進行中の操作 1 件、加えて任意リソースの警告。" },
  },
  "retrying-incident": {
    title: { en: "Retrying incident", zh: "重试中的事件", ja: "リトライ中の障害" },
    summary: { en: "A rate-limit error auto-reschedules; the incident resolves on recovery.", zh: "限流错误自动重新调度，恢复后事件解决。", ja: "レート制限のエラーが自動で再スケジュールされ、復旧すると障害は解消します。" },
  },
  "exhausted-incident": {
    title: { en: "Exhausted incident", zh: "重试耗尽事件", ja: "リトライ上限の障害" },
    summary: { en: "Retries exhausted but the Session stays usable for a new turn.", zh: "重试耗尽，但 Session 仍可用于新回合。", ja: "リトライ上限に達しても、セッションは次のターンに使えるままです。" },
  },
  "terminal-incident": {
    title: { en: "Terminal incident", zh: "终止事件", ja: "停止した障害" },
    summary: { en: "An unrecoverable runtime resume terminates the Session; composer is read-only.", zh: "不可恢复的 runtime 恢复错误会终止 Session，输入区只读。", ja: "回復不能なランタイム再開でセッションが終了し、入力欄は読み取り専用になります。" },
  },
  "diagnostics-and-update": {
    title: { en: "Config, spans, deletion", zh: "配置、span、删除", ja: "設定・span・削除" },
    summary: { en: "Configuration audit, compaction, paired model spans, and session deletion.", zh: "配置审计、上下文压缩、模型 span 配对和 Session 删除。", ja: "設定の監査、コンパクション、対になるモデル span、セッションの削除。" },
  },
};

const previewScenarioLabels: Record<PreviewScenarioId, Record<AppLocale, string>> = {
  "simple-chat": { en: "Simple chat", zh: "简单对话", ja: "シンプルなチャット" },
  "coding-with-artifact": { en: "Coding with artifact", zh: "编码 + 产物", ja: "コーディング + アーティファクト" },
  "image-generation": { en: "Image generation", zh: "生成图片", ja: "画像生成" },
  "audio-generation": { en: "Audio generation", zh: "生成音频", ja: "音声生成" },
  "video-generation": { en: "Video generation", zh: "生成视频", ja: "動画生成" },
  "tool-approval": { en: "Tool approval", zh: "工具审批", ja: "ツールの承認" },
  "error-state": { en: "Error state", zh: "错误状态", ja: "エラー状態" },
  "long-reasoning": { en: "Long reasoning", zh: "长思考", ja: "長い推論" },
  "git-diff-preview": { en: "Git diff preview", zh: "Git diff 预览", ja: "Git 差分のプレビュー" },
};

function defaultPreviewPromptForLocale(locale: AppLocale): string {
  return defaultPreviewPrompt[locale];
}

function standardScenarioTitle(scenario: Scenario, locale: AppLocale): string {
  return standardScenarioCopy[scenario.id]?.title[locale] ?? scenario.title;
}

function standardScenarioSummary(scenario: Scenario, locale: AppLocale): string {
  return standardScenarioCopy[scenario.id]?.summary[locale] ?? scenario.summary;
}

function previewScenarioLabel(scenario: { id: PreviewScenarioId; label: string }, locale: AppLocale): string {
  return previewScenarioLabels[scenario.id]?.[locale] ?? scenario.label;
}

function formatCopy(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}




function findPendingApprovalTool(timeline: readonly unknown[]): AgentUXToolTimelineItem | undefined {
  return timeline.find((item): item is AgentUXToolTimelineItem => {
    if (!item || typeof item !== "object") {
      return false;
    }
    const record = item as Record<string, unknown>;
    return record.kind === "tool" && record.status === "awaiting_approval" && Boolean(record.approval);
  });
}

function demoExternalApprovalTool(locale: AppLocale): AgentUXToolTimelineItem {
  return {
    kind: "tool",
    id: "composer-external-approval-demo",
    name: "read_file",
    title: previewCopy[locale].approvalDemo.toolTitle,
    status: "awaiting_approval",
    approval: {
      prompt: previewCopy[locale].approvalDemo.prompt,
      argsPreview: { path: "AGENTS.md" },
    },
  } as AgentUXToolTimelineItem;
}

function InlineApprovalPrompt({
  locale,
  onDismiss,
}: {
  locale: AppLocale;
  onDismiss: () => void;
}) {
  const c = previewCopy[locale].inlineApproval;
  const options = c.options;

  return (
    <aside className="inline-approval-panel" data-preview-anchor="external-approval" aria-label={c.ariaLabel}>
      <div className="inline-approval-head">
        <div>
          <span>{c.kicker}</span>
          <strong>
            {c.question}
          </strong>
        </div>
      </div>

      <ol className="inline-approval-options">
        {options.map((option, index) => (
          <li key={option.title} data-placeholder={index === options.length - 1 ? "true" : undefined}>
            <span className="inline-approval-option-index">{index + 1}.</span>
            <div>
              <strong>{option.title}</strong>
              {option.body ? <span>{option.body}</span> : null}
            </div>
          </li>
        ))}
      </ol>

      <footer className="inline-approval-footer">
        <span>
          <span className="inline-approval-info" aria-hidden="true">i</span>
          {c.hint}
        </span>
        <div>
          <button type="button" className="inline-approval-secondary" onClick={onDismiss}>
            {c.ignore}
          </button>
          <button type="button" className="inline-approval-primary" onClick={onDismiss}>
            {c.continueLabel}
          </button>
        </div>
      </footer>
    </aside>
  );
}

const liveLlmGitPreviewState: GitPreviewState = {
  branch: "live-llm-chat",
  status: "committed",
  ahead: 0,
  changedFiles: [],
  changedFileCount: 0,
  diffTitle: "LiveLlmChat.diff",
  suggestedCommitMessage: "No git changes in Live LLM chat",
  mockOnly: true,
  pushEnabled: false,
};

function focusPreviewElement(element: HTMLElement) {
  previewFocusId += 1;
  const currentFocusId = String(previewFocusId);

  document.querySelectorAll<HTMLElement>("[data-preview-focus='true']").forEach((item) => {
    item.removeAttribute("data-preview-focus");
    item.removeAttribute("data-preview-focus-id");
  });
  element.setAttribute("data-preview-focus", "true");
  element.setAttribute("data-preview-focus-id", currentFocusId);
  window.setTimeout(() => {
    if (element.getAttribute("data-preview-focus-id") === currentFocusId) {
      element.removeAttribute("data-preview-focus");
      element.removeAttribute("data-preview-focus-id");
    }
  }, 1200);
}

function scrollNestedPreviewContainer(element: HTMLElement) {
  const scrollContainer = element.closest(".timeline-list, .preview-stack, .right-panel") as HTMLElement | null;
  if (!scrollContainer) {
    element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    return;
  }

  const containerRect = scrollContainer.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const centeredOffset = (containerRect.height - elementRect.height) / 2;
  const nextTop = scrollContainer.scrollTop + elementRect.top - containerRect.top - Math.max(12, centeredOffset);

  scrollContainer.scrollTo({
    top: Math.max(0, nextTop),
    behavior: "smooth",
  });
  element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
}

function scrollPreviewToAnchor(anchor: PreviewAnchor) {
  const findTarget = () =>
    previewAnchorFallbacks(anchor)
      .map((candidate) => document.querySelector<HTMLElement>(`[data-preview-anchor="${candidate}"]`))
      .find((element): element is HTMLElement => Boolean(element));

  const scrollWhenReady = (attempt = 0) => {
    window.requestAnimationFrame(() => {
      const target = findTarget();
      if (!target) {
        if (attempt < 4) {
          window.setTimeout(() => scrollWhenReady(attempt + 1), 60);
        }
        return;
      }

      scrollNestedPreviewContainer(target);
      focusPreviewElement(target);
    });
  };

  window.requestAnimationFrame(() => scrollWhenReady());
}

function scrollPreviewToAnchorAfterPreviewUpdate(anchor: PreviewAnchor) {
  window.setTimeout(() => scrollPreviewToAnchor(anchor), 80);
}

function scrollPreviewToToolActionAfterPreviewUpdate(action: string) {
  const scrollWhenReady = (attempt = 0) => {
    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`.tool-card[data-action="${action}"]`);
      if (!target) {
        if (attempt < 5) {
          window.setTimeout(() => scrollWhenReady(attempt + 1), 80);
        }
        return;
      }

      const scrollContainer = target.closest(".timeline-list, .preview-stack, .right-panel") as HTMLElement | null;
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        scrollContainer.scrollTo({
          top: Math.max(0, scrollContainer.scrollTop + targetRect.top - containerRect.top - 8),
          behavior: "smooth",
        });
      } else {
        target.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
      }
      focusPreviewElement(target);
      if (attempt < 3) {
        window.setTimeout(() => scrollWhenReady(attempt + 1), 180);
      }
    });
  };

  window.setTimeout(() => scrollWhenReady(), 100);
}

function scrollPreviewToPreset(optionId: string) {
  scrollPreviewToAnchor(previewAnchorForPresetOption(optionId));
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

const NATIVE_HIDDEN_USER_AVATAR_IDS = new Set(["user", "assistant-second-avatar", "user-third-avatar", "green-calm"]);
const PREVIEW_RESPONSIVE_WIDTHS = {
  hideRightPanel: 860,
  hideLeftSidebar: 660,
} as const;
const OPENABLE_OUTPUT_FILE_PATTERN = /\.(?:tsx?|jsx?|mjs|cjs|json|mdx?|css|scss|html?|py|sh|ya?ml|toml|txt|diff|patch|png|jpe?g|gif|webp|avif|svg|mp3|wav|m4a|aac|ogg|flac|mp4|webm|mov|m4v)$/i;

function mergeOutputPanelItems(current: OutputPanelItem[], incoming: readonly OutputPanelItem[]): OutputPanelItem[] {
  if (incoming.length === 0) {
    return current;
  }
  const next = [...current];
  for (const item of incoming) {
    const existingIndex = next.findIndex((entry) => entry.id === item.id);
    if (existingIndex >= 0) {
      next[existingIndex] = item;
      continue;
    }
    next.push(item);
  }
  return next;
}

function outputPanelItemFromArtifact(artifact: AgentUXArtifactTimelineItem, project: AgentFrontendProject): OutputPanelItem | undefined {
  const originalTitle = artifact.title ?? artifact.id;
  if (!OPENABLE_OUTPUT_FILE_PATTERN.test(originalTitle)) {
    return undefined;
  }
  const title = originalTitle.split("/").filter(Boolean).pop() ?? originalTitle;
  const mediaStyle = outputMediaStyleFromTitle(title, project);
  return {
    id: `file:${originalTitle}`,
    kind: "file",
    title,
    subtitle: originalTitle,
    language: languageFromFileName(title),
    body: artifact.content ?? (artifact.data ? JSON.stringify(artifact.data, null, 2) : undefined),
    mediaStyle,
  };
}

function outputMediaStyleFromTitle(title: string, project: AgentFrontendProject): string | undefined {
  const lower = title.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(lower)) {
    return project.mediaGeneration.imageStyle;
  }
  if (/\.(mp3|wav|m4a|aac|ogg|flac)$/.test(lower)) {
    return project.mediaGeneration.audioStyle;
  }
  if (/\.(mp4|webm|mov|m4v)$/.test(lower)) {
    return project.mediaGeneration.videoStyle;
  }
  return undefined;
}

function collectDefaultOutputPanelItems(
  timeline: readonly (AgentUXArtifactTimelineItem | AgentUXToolTimelineItem | { kind: string })[],
  locale: AppLocale,
  project: AgentFrontendProject,
): OutputPanelItem[] {
  const items: OutputPanelItem[] = [];
  for (const item of timeline) {
    if (item.kind === "tool") {
      items.push(...outputPanelItemsFromTool(item as AgentUXToolTimelineItem, locale));
      continue;
    }
    if (item.kind === "artifact") {
      const artifactItem = outputPanelItemFromArtifact(item as AgentUXArtifactTimelineItem, project);
      if (artifactItem) {
        items.push(artifactItem);
      }
    }
  }
  return mergeOutputPanelItems([], items);
}

function outputPanelItemsSignature(items: readonly OutputPanelItem[]): string {
  return items
    .map((item) => [item.id, item.language ?? "", item.body ?? "", item.imageSrc ?? "", item.mediaStyle ?? ""].join("\u001f"))
    .join("\u001e");
}

type SelectedComponentItem = {
  id: string;
  group: string;
  label: string;
  section?: string;
};

const selectedComponentGroupIds = new Set<PresetGroupId>([
  "media-generation",
  "conversation",
  "sidebar",
  "ux-effects",
  "tool-calls",
  "blocks",
  "composer",
  "output",
]);

const selectedProviderComponentIds = new Set(["provider-settings-launcher"]);
const hiddenSelectedComponentOptionIds = new Set([
  "message-actions",
  "reasoning-public-summary",
  "error-collapse",
]);

/**
 * Built from the dictionary rather than carrying its own copy.
 *
 * These seven labels are the same strings the message-action preset cards show, which the
 * editor now reads from `shell.editor.messageActions`. Duplicating them inline meant every
 * new locale had to be added in two places and could disagree with itself.
 */
const selectedMessageActionComponents: Array<{
  key: MessageActionKey;
  label: Record<AppLocale, string>;
  section: Record<AppLocale, string>;
}> = (() => {
  const byLocale = <T,>(pick: (actions: UiCopy["shell"]["editor"]["messageActions"]) => T) =>
    Object.fromEntries(APP_LOCALES.map((locale) => [locale, pick(uiCopy[locale].shell.editor.messageActions)])) as Record<AppLocale, T>;

  const sentSection = byLocale((a) => a.sentTitle);
  const generatedSection = byLocale((a) => a.generatedTitle);
  const copyLabel = byLocale((a) => a.copy);
  const editLabel = byLocale((a) => a.edit);
  const timeLabel = byLocale((a) => a.time);
  const regenerateLabel = byLocale((a) => a.regenerate);

  return [
    { key: "userCopy", label: copyLabel, section: sentSection },
    { key: "userEdit", label: editLabel, section: sentSection },
    { key: "userTime", label: timeLabel, section: sentSection },
    { key: "agentCopy", label: copyLabel, section: generatedSection },
    { key: "agentRegenerate", label: regenerateLabel, section: generatedSection },
    { key: "agentEdit", label: editLabel, section: generatedSection },
    { key: "agentTime", label: timeLabel, section: generatedSection },
  ];
})();

function componentSummaryLabel(count: number, locale: AppLocale): string {
  return uiCopy[locale].shell.editor.selectedComponentCount.replace("{count}", String(count));
}

function isEffectiveSelectedComponent(project: AgentFrontendProject, groupId: PresetGroupId, optionId: string): boolean {
  if (hiddenSelectedComponentOptionIds.has(optionId)) {
    return false;
  }
  if (!isPresetOptionActive(project, optionId)) {
    return false;
  }
  if (groupId === "sidebar" && optionId !== "sidebar-visible") {
    return isPresetOptionActive(project, "sidebar-visible");
  }
  if (groupId === "output" && optionId !== "output-visible") {
    return isPresetOptionActive(project, "output-visible");
  }
  return true;
}

function orderedSelectedComponentGroups(groups: ReturnType<typeof presetGroupsForProject>) {
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const seen = new Set<PresetGroupId>();
  const ordered: ReturnType<typeof presetGroupsForProject> = [];
  for (const groupId of presetRailSections.flatMap((section) => section.groupIds)) {
    const group = groupsById.get(groupId);
    if (!group) {
      continue;
    }
    ordered.push(group);
    seen.add(group.id);
  }
  for (const group of groups) {
    if (!seen.has(group.id)) {
      ordered.push(group);
    }
  }
  return ordered;
}

function selectedMessageActionActive(project: AgentFrontendProject, key: MessageActionKey): boolean {
  const actions = project.conversation.messageActions;
  if (key === "userCopy") return Boolean(actions.userCopy ?? actions.copy);
  if (key === "userEdit") return Boolean(actions.userEdit ?? actions.edit);
  if (key === "userTime") return Boolean(actions.userTime);
  if (key === "agentCopy") return Boolean(actions.agentCopy ?? actions.copy);
  if (key === "agentRegenerate") return Boolean(actions.agentRegenerate ?? actions.regenerate);
  if (key === "agentEdit") return Boolean(actions.agentEdit ?? actions.edit);
  if (key === "agentTime") return Boolean(actions.agentTime);
  return false;
}

export function selectedComponentItemsForProject(
  project: AgentFrontendProject,
  groups: ReturnType<typeof presetGroupsForProject>,
  locale: AppLocale,
): SelectedComponentItem[] {
  const items = new Map<string, SelectedComponentItem>();
  const c = previewCopy[locale];

  const addSelectedOption = (group: ReturnType<typeof presetGroupsForProject>[number], option: PresetOption) => {
    if (!isEffectiveSelectedComponent(project, group.id, option.id)) {
      return;
    }
    items.set(option.id, {
      id: option.id,
      group: translatePresetGroupName(group.id, group.label, locale),
      label: translatePresetOptionLabel(option.id, option.label, locale),
      section: option.section ? translatePresetSection(option.section, locale) : undefined,
    });
  };

  for (const group of orderedSelectedComponentGroups(groups)) {
    const includeGroup = selectedComponentGroupIds.has(group.id);
    const groupName = translatePresetGroupName(group.id, group.label, locale);

    if (group.id === "conversation") {
      const avatarSection = stateSectionTitle("conversation", locale);
      if (project.conversation.userAvatar) {
        items.set("state:author.user", {
          id: "state:author.user",
          group: groupName,
          label: c.avatarLabels.user,
          section: avatarSection,
        });
      }
      if (project.conversation.agentAvatar) {
        items.set("state:author.agent", {
          id: "state:author.agent",
          group: groupName,
          label: c.avatarLabels.agent,
          section: avatarSection,
        });
      }
      const speakerLabelsOption = group.options.find((option) => option.id === "speaker-labels");
      if (speakerLabelsOption) {
        addSelectedOption(group, speakerLabelsOption);
      }
    }

    for (const option of group.options) {
      if (!includeGroup && !selectedProviderComponentIds.has(option.id)) {
        continue;
      }
      if (group.id === "conversation" && option.id === "speaker-labels") {
        continue;
      }
      addSelectedOption(group, option);
    }

    if (group.id === "conversation") {
      for (const item of selectedMessageActionComponents) {
        if (!selectedMessageActionActive(project, item.key)) {
          continue;
        }
        const id = `message-action:${item.key}`;
        items.set(id, {
          id,
          group: groupName,
          label: item.label[locale],
          section: item.section[locale],
        });
      }
    }
  }

  return Array.from(items.values());
}

export function App() {
  const copy = useCopy();
  const { locale, setLocale } = useLocale();
  const { iconSet, setSlot } = useIconSet();
  const [project, setProject] = useState<AgentFrontendProject>(defaultCodingAgentProject);
  const [savedProject, setSavedProject] = useState<AgentFrontendProject | undefined>();
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>("builder");
  const [selectedGroup, setSelectedGroup] = useState<PresetGroupId>("conversation");
  // Single source of truth: the style preset lives on the project so it travels with
  // the export (168 rules in app.css branch on `data-style-preset`). Derived rather
  // than mirrored in local state so the two can never diverge.
  const selectedPresetStyle = project.theme.stylePreset;
  const setSelectedPresetStyle = (styleId: PresetStyleId) => {
    setProject((current) => ({ ...current, theme: { ...current.theme, stylePreset: styleId } }));
  };
  const [styleSwitching, setStyleSwitching] = useState(false);
  // Style switch is confirmed via a dialog (it also resets the theme set).
  const [pendingStyle, setPendingStyle] = useState<PresetStyleId | null>(null);
  // Resolved once rather than re-found inside each dialog string: the confirm copy names the
  // style twice, and the previous version looked it up separately in every branch.
  const pendingStyleLabel = pendingStyle
    ? presetStyleOptions.find((style) => style.id === pendingStyle)?.label[locale] ?? pendingStyle
    : "";
  const pendingStyleButtonRef = useRef<HTMLButtonElement | null>(null);
  // Canvas rails (left session sidebar / right output panel) can be collapsed.
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [autoHiddenRails, setAutoHiddenRails] = useState({ left: false, right: false });
  const [outputPanelItems, setOutputPanelItems] = useState<OutputPanelItem[]>([]);
  const [activeOutputPanelItemId, setActiveOutputPanelItemId] = useState<string | undefined>();
  const [outputModalOpen, setOutputModalOpen] = useState(false);
  const [externalApprovalOverlayActive, setExternalApprovalOverlayActive] = useState(false);
  const [inlineApprovalOverlayActive, setInlineApprovalOverlayActive] = useState(false);
  const [dismissedExternalApprovalId, setDismissedExternalApprovalId] = useState<string | null>(null);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [selectedComponentsOpen, setSelectedComponentsOpen] = useState(false);
  const [selectedFixtureId, setSelectedFixtureId] = useState<PreviewFixtureId>("coding-agent");
  const [commandOpen, setCommandOpen] = useState(false);
  const [exportSnapshot, setExportSnapshot] = useState<ScaffoldExportSnapshot | undefined>();
  const [workspaceView, setWorkspaceView] = useState<"preview" | "debug">("preview");
  const [presetDrawerOpen, setPresetDrawerOpen] = useState(false);
  const [standardScenarioId, setStandardScenarioId] = useState<ScenarioId>("normal-turn");
  // When true the center canvas is driven by a standardized AgentMatrix event
  // stream; preset options still restyle it live.
  const [showStandard, setShowStandard] = useState(false);
  // The standard state currently previewed live (highlights its card and
  // renders a real component in the center preview panel).
  const [activeStateCode, setActiveStateCode] = useState<string | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState(() => defaultPreviewPromptForLocale(locale));
  const [runEvents, setRunEvents] = useState<AgentUXEvent[] | undefined>([]);
  const [runEventSource, setRunEventSource] = useState<RunMode | undefined>();
  const [runMode, setRunMode] = useState<RunMode>("replay");
  const [writingReplayKey, setWritingReplayKey] = useState(0);
  const [previewRefreshing, setPreviewRefreshing] = useState(false);
  const [forcePreviewToolsOpen, setForcePreviewToolsOpen] = useState(false);
  const [toolCollapseSignal, setToolCollapseSignal] = useState(0);
  const [liveRunning, setLiveRunning] = useState(false);
  const [livePreviewState, setLivePreviewState] = useState<LivePreviewState>("idle");
  const [liveMessages, setLiveMessages] = useState<LiveLlmMessage[]>([]);
  const [sessionKeys, setSessionKeys] = useState<Record<string, string>>({});
  const [gitPreviewStateOverride, setGitPreviewStateOverride] = useState<GitPreviewState | undefined>();
  const liveAbortControllerRef = useRef<AbortController | undefined>(undefined);
  const styleSwitchTimerRef = useRef<number | undefined>(undefined);
  const previousLocaleRef = useRef(locale);
  const [selectedScenarioId, setSelectedScenarioId] = useState<PreviewScenarioId>(() => resolveDefaultPreviewScenario(defaultCodingAgentProject));
  const activeProject = surfaceMode === "saved-preview" && savedProject ? savedProject : project;
  const standardScenario = scenarioById(standardScenarioId);
  const standardStreamRef = useRef<{ cancel: () => void } | undefined>(undefined);
  const previewRefreshTimerRef = useRef<number | undefined>(undefined);
  const autoOutputPanelSignatureRef = useRef("");
  const selectedComponentsRef = useRef<HTMLDivElement | null>(null);
  const previewRunner = useMemo(() => createPureFrontendPreviewRunner(), []);
  const runtime = useAgentUXRuntime();
  const builderSurfaceRef = useRef<HTMLElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const fixture = previewFixtures.find((item) => item.id === selectedFixtureId) ?? previewFixtures[0];
  const fixtureEvents = useMemo(() => parsePreviewFixture(fixture), [fixture]);
  // Every event source converges here — fixture, replay, mock, live provider, harness adapter
  // — so admission happens in exactly one place and cannot be skipped for one of them. For a
  // stream that already speaks our protocol this is the identity function (pinned by
  // "leaves a well-formed stream untouched" in eventNormalizer.test.ts), so fixtures and
  // previews render exactly as before.
  const rawEvents = runEvents ?? fixtureEvents;
  const harness = activeProject.runtime.harness;
  const admission = useMemo(
    () =>
      admitEvents(rawEvents, {
        extraAliases: aliasesForHarness(harness),
        diagnosticMarkers: diagnosticMarkersForHarness(harness),
      }),
    [rawEvents, harness],
  );
  const events = admission.events;
  // A backend whose events are all held back renders an empty transcript, which looks exactly
  // like a working connection with nothing to say. In dev that gets said out loud; the live
  // paths throw via `assertRenderable`.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!hasAdmissionFindings(admission)) return;
    const severity = admissionSeverity(admission);
    const log = severity === "blocked" ? console.error : console.warn;
    log(`[AgentCanvas] 事件准入 ${severity}\n${describeAdmission(admission)}`);
  }, [admission]);
  const gitPreviewState = gitPreviewStateOverride ?? (runEventSource === "live" ? liveLlmGitPreviewState : gitPreviewStateFromEvents(events));
  const livePreviewPrompts = runEventSource === "live"
    ? liveMessages.filter((message) => message.role === "user").map((message) => message.content)
    : undefined;
  const reasoningRenderPolicy = useMemo(() => createReasoningRenderPolicy(activeProject), [activeProject]);
  const toolRenderPolicy = useMemo(() => ({
    showArgs: activeProject.toolCalls.detail === "summary" ? "safe" as const : "debug" as const,
    showResult: activeProject.toolCalls.detail === "summary" ? "summary" as const : "full" as const,
  }), [activeProject.toolCalls.detail]);
  const viewModel = useAgentUXViewModel(runtime, {
    policy: {
      reasoning: reasoningRenderPolicy,
      tool: toolRenderPolicy,
      error: { showDeveloperMessage: !activeProject.blocks.errorCollapse, showRawError: false },
      visibility: { show: "developer" },
    },
  });
  const displayViewModel = useMemo(
    () => {
      const titledViewModel = showStandard
        ? { ...viewModel, title: standardScenarioTitle(standardScenario, locale) }
        : viewModel;
      // Live preview localizes like replay, minus the model's own prose: the dictionary is a
      // substring rewriter over fixture copy, so running a live reply through it would swap
      // words like "Thinking" mid-sentence. Tool titles, approval prompts and error copy are
      // ours and do get localized — previously the whole live surface was pinned to English,
      // which meant a Chinese session flipped to English the moment a real key was used.
      return localizePreviewViewModel(titledViewModel, locale, {
        localizeMessageText: runEventSource !== "live",
      });
    },
    [locale, runEventSource, showStandard, standardScenario, viewModel],
  );
  const defaultOutputPanelItems = useMemo(
    () => collectDefaultOutputPanelItems(displayViewModel.timeline, locale, activeProject),
    [displayViewModel.timeline, locale, activeProject],
  );
  const defaultOutputPanelSignature = useMemo(
    () => outputPanelItemsSignature(defaultOutputPanelItems),
    [defaultOutputPanelItems],
  );
  const isWelcome = !showStandard && displayViewModel.timeline.length === 0;
  // "render" (Render) is temporarily hidden from the nav; its group definition
  // stays so previews/coverage keep working.
  const visiblePresetGroups = useMemo(
    () => presetGroupsForProject(project).filter((group) => group.id !== "render"),
    [project],
  );
  const selectedComponentItems = useMemo(
    () => selectedComponentItemsForProject(project, visiblePresetGroups, locale),
    [project, visiblePresetGroups, locale],
  );
  const selectedComponentSummary = componentSummaryLabel(selectedComponentItems.length, locale);
  const visibleLayoutSlots = useMemo(
    () => slotsForTemplate(activeProject.layout.slots, activeProject.template),
    [activeProject.layout.slots, activeProject.template],
  );
  const hasSidebar = visibleLayoutSlots.some((slot) => slot.enabled && slot.region === "sidebar");
  // The Output panel is the right region's driver (like SessionSidebar drives the
  // left rail): toggling Output off collapses the right panel and reflows the
  // canvas. GitFrame is a coming-soon co-tenant, so it doesn't keep the panel
  // open on its own.
  const hasRightPanel = visibleLayoutSlots.some(
    (slot) => slot.enabled && slot.region === "right-panel" && slot.component !== "GitFrame",
  );
  const loaderCanvasPreviewActive = surfaceMode === "builder" && selectedGroup === "media-generation";
  const leftSidebarVisible = hasSidebar && !leftCollapsed && !autoHiddenRails.left;
  const rightPanelVisible =
    hasRightPanel && !rightCollapsed && !autoHiddenRails.right && !isWelcome && !loaderCanvasPreviewActive;
  useEffect(() => {
    if (defaultOutputPanelItems.length === 0) {
      autoOutputPanelSignatureRef.current = "";
      return;
    }
    if (defaultOutputPanelSignature === autoOutputPanelSignatureRef.current) {
      return;
    }
    autoOutputPanelSignatureRef.current = defaultOutputPanelSignature;
    setOutputPanelItems((current) => mergeOutputPanelItems(current, defaultOutputPanelItems));
    setActiveOutputPanelItemId(defaultOutputPanelItems[defaultOutputPanelItems.length - 1]?.id);
    setOutputModalOpen(false);
    if (!loaderCanvasPreviewActive) {
      setRightCollapsed(false);
    }
    setProject((current) => ({
      ...current,
      output: { ...current.output, source: "artifact" },
      layout: {
        ...current.layout,
        slots: current.layout.slots.map((slot) =>
          slot.component === "OutputFrame" ? { ...slot, enabled: true, region: "right-panel" } : slot,
        ),
      },
    }));
  }, [defaultOutputPanelItems, defaultOutputPanelSignature, loaderCanvasPreviewActive]);
  const selectedPresetGroup = visiblePresetGroups.find((group) => group.id === selectedGroup) ?? visiblePresetGroups[0];
  const mergedScenarios: Scenario[] = (presetGroupScenarios[selectedPresetGroup.id] ?? []).map((id) => scenarioById(id));
  const stateCards: StateCard[] = visibleStateCards(selectedPresetGroup.id).map((card) => ({
    slot: card.slot,
    title: card.title[locale],
    code: card.code,
    anim: card.anim,
    tone: card.tone,
    toggleKey: card.toggleKey,
  }));
  const defaultStateCode = selectedPresetGroup.id === "blocks" ? stateCards[0]?.code ?? null : null;
  const selectedStateCode = activeStateCode ?? defaultStateCode;
  const selectedPresetSections = useMemo(
    () =>
      groupPresetOptions(
        // "名称标签" (speaker-labels) and "消息操作" (message-actions) are surfaced
        // as their own selectable blocks, so they don't render as plain options.
        selectedPresetGroup.options
          .filter((option) =>
            option.id !== "speaker-labels" &&
            option.id !== "message-actions" &&
            option.id !== "reasoning-public-summary" &&
            option.id !== "error-collapse"
          )
          .map((option) => selectedPresetGroup.id === "ux-effects" && option.id === "reasoning-status-only" ? { ...option, section: "Disclosure" } : option),
        copy.shell.presetRail.defaultSection,
      ),
    [selectedPresetGroup, copy.shell.presetRail.defaultSection],
  );
  const showPresetSectionLabels = selectedPresetGroup.options.some((option) => option.section);
  // Output group: the sub-sections (data source, …) only make sense when the
  // output panel is on, so hide everything but the Layout toggle when it's off.
  const outputPanelEnabled = isPresetOptionActive(project, "output-visible");
  const sidebarPanelEnabled = isPresetOptionActive(project, "sidebar-visible");
  const renderedPresetSections =
    selectedPresetGroup.id === "output" && !outputPanelEnabled
      ? selectedPresetSections.filter((section) => section.label === "Layout")
      : selectedPresetGroup.id === "sidebar" && !sidebarPanelEnabled
        ? selectedPresetSections.filter((section) => section.label === "Layout")
      : selectedPresetSections;
  const showDebugViewToggle = import.meta.env.DEV && surfaceMode === "builder";
  const builderUI = {
    showDebugBadges: showDebugViewToggle && workspaceView === "debug",
  };
  const selectedApprovalIconSlot = activeStateCode
    ? visibleStateCards("tool-calls").find((card) => card.code === activeStateCode)?.slot
    : undefined;
  const pendingExternalApprovalTool = activeProject.toolCalls.approval === "hidden"
    ? findPendingApprovalTool(displayViewModel.timeline)
    : undefined;
  const externalApprovalTool = pendingExternalApprovalTool ?? demoExternalApprovalTool(locale);
  const showExternalApprovalOverlay = Boolean(
    externalApprovalOverlayActive && externalApprovalTool.id !== dismissedExternalApprovalId,
  );
  const externalApprovalOverlay = showExternalApprovalOverlay ? (
    <div className="preview-approval-overlay" data-preview-region="approval-overlay">
      <ExternalApprovalSurface
        tool={externalApprovalTool}
        approvalIconSlot={selectedApprovalIconSlot}
        onConfirm={() => {
          setDismissedExternalApprovalId(externalApprovalTool.id);
          setExternalApprovalOverlayActive(false);
        }}
      />
    </div>
  ) : null;
  const inlineApprovalOverlay = inlineApprovalOverlayActive ? (
    <div className="preview-approval-overlay" data-preview-region="approval-overlay" data-approval-kind="inline">
      <InlineApprovalPrompt
        locale={locale}
        onDismiss={() => setInlineApprovalOverlayActive(false)}
      />
    </div>
  ) : null;

  useEffect(() => {
    runtime.replay(events);
  }, [events, runtime]);

  useEffect(() => () => {
    if (styleSwitchTimerRef.current) {
      window.clearTimeout(styleSwitchTimerRef.current);
    }
    if (previewRefreshTimerRef.current) {
      window.clearTimeout(previewRefreshTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const previousDefault = defaultPreviewPromptForLocale(previousLocaleRef.current);
    const nextDefault = defaultPreviewPromptForLocale(locale);
    setPreviewPrompt((current) => current === previousDefault ? nextDefault : current);
    previousLocaleRef.current = locale;
  }, [locale]);

  useEffect(() => {
    // Configurator chrome (topbar/left rail/preset panel) uses a neutral scheme
    // so its icons/controls stay neutral — never tinted by a preview accent.
    applyTheme(themeTokens["polar-mono"]);
    if (builderSurfaceRef.current) {
      applyTheme(themeTokens[activeProject.theme.preset], builderSurfaceRef.current);
    }
  }, [activeProject.theme.preset]);

  useEffect(() => {
    if (!showDebugViewToggle && workspaceView === "debug") {
      setWorkspaceView("preview");
    }
  }, [showDebugViewToggle, workspaceView]);

  useEffect(() => {
    if (!selectedComponentsOpen) {
      return;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && selectedComponentsRef.current?.contains(target)) {
        return;
      }
      setSelectedComponentsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedComponentsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedComponentsOpen]);

  useEffect(() => {
    const frame = previewFrameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateAutoHiddenRails = (width: number) => {
      const next = {
        right: width < PREVIEW_RESPONSIVE_WIDTHS.hideRightPanel,
        left: width < PREVIEW_RESPONSIVE_WIDTHS.hideLeftSidebar,
      };
      setAutoHiddenRails((current) =>
        current.left === next.left && current.right === next.right ? current : next,
      );
    };

    updateAutoHiddenRails(frame.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      updateAutoHiddenRails(entries[0]?.contentRect.width ?? frame.getBoundingClientRect().width);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [surfaceMode, workspaceView]);

  useEffect(() => {
    setSelectedGroup((current) => resolvePresetGroupSelection(current, project.template));
  }, [project.template]);

  useEffect(() => {
    if (selectedPresetStyle === "native" && NATIVE_HIDDEN_USER_AVATAR_IDS.has(iconSet["author.user"] ?? "")) {
      setSlot("author.user", STYLE_AVATAR_DEFAULTS.native["author.user"]);
    }
  }, [iconSet, selectedPresetStyle, setSlot]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function resetRunState(options: { mode?: RunMode; prompt?: string } = {}) {
    setRunEvents(undefined);
    setRunEventSource(undefined);
    setLiveMessages([]);
    setExternalApprovalOverlayActive(false);
    setDismissedExternalApprovalId(null);
    setLivePreviewState("idle");
    setGitPreviewStateOverride(undefined);
    setForcePreviewToolsOpen(false);
    if (options.mode) {
      setRunMode(options.mode);
    }
    if (options.prompt !== undefined) {
      setPreviewPrompt(options.prompt);
    }
  }

  // "New chat": clear the conversation to an empty timeline so the preview
  // shows the centered welcome greeting above the composer. runEvents is set to
  // an EMPTY array (not undefined) so `events` doesn't fall back to the fixture.
  function enterWelcomeState() {
    standardStreamRef.current?.cancel();
    setShowStandard(false);
    setActiveStateCode(null);
    setRunEvents([]);
    setRunEventSource(undefined);
    setLiveMessages([]);
    setLivePreviewState("idle");
    setGitPreviewStateOverride(undefined);
    setPreviewPrompt("");
    setWorkspaceView("preview");
  }

  // Focusing the greeting field lights up the linked preview: switch the canvas
  // to the welcome state and scroll it to the composer so the edit is visible.
  function previewWelcomeState() {
    enterWelcomeState();
    scrollPreviewToAnchor("composer");
  }

  function selectFixture(id: PreviewFixtureId) {
    setSelectedFixtureId(id);
    resetRunState();
    toast.success(copy.shell.toast.replayFixtureLoaded);
  }

  // Stream a standardized AgentMatrix scenario into the EXISTING preview
  // components: convert to AgentUX events and reveal them over time so the
  // current ChatFrame / ToolCallCard / OutputFrame animate live.
  function streamStandardScenario(id: ScenarioId) {
    standardStreamRef.current?.cancel();
    const scenario = scenarioById(id);
    const uxEvents = toAgentUXEvents(scenario.fixture.events, { title: standardScenarioTitle(scenario, locale) });

    setStandardScenarioId(id);
    setShowStandard(true);
    setActiveStateCode(null);
    setSurfaceMode("builder");
    setWorkspaceView("preview");
    setRunEventSource("replay");
    setLiveMessages([]);
    setExternalApprovalOverlayActive(id === "tool-approval");
    setDismissedExternalApprovalId(null);
    setGitPreviewStateOverride(undefined);
    setForcePreviewToolsOpen(false);

    let index = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const revealed: AgentUXEvent[] = [];

    const tick = () => {
      if (cancelled) return;
      revealed.push(uxEvents[index]);
      index += 1;
      setRunEvents([...revealed]);
      if (index >= uxEvents.length) return;
      const next = uxEvents[index];
      const fast = next.type === "text.delta" || next.type === "reasoning.delta" || next.type === "tool.call.args.delta";
      timer = setTimeout(tick, fast ? 110 : 380);
    };

    setRunEvents([]);
    timer = setTimeout(tick, 60);
    standardStreamRef.current = {
      cancel: () => {
        cancelled = true;
        clearTimeout(timer);
      },
    };
  }

  // Click a state card → render that exact state live in the center preview
  // panel via a real standard component (icon + animation + styling).
  function previewState(card: StateCard) {
    standardStreamRef.current?.cancel();
    setShowStandard(true);
    setSurfaceMode("builder");
    setWorkspaceView("preview");
    setRunEventSource("replay");
    setLiveMessages([]);
    setExternalApprovalOverlayActive(card.slot === "tool.pending_approval" || card.slot.startsWith("permission."));
    setDismissedExternalApprovalId(null);
    setGitPreviewStateOverride(undefined);
    setForcePreviewToolsOpen(false);
    setRunEvents(stateDemoEvents(card.slot, card.code, card.title) as AgentUXEvent[]);
    setActiveStateCode(card.code);
  }

  function previewToolActionsOverview(options: { forceOpen?: boolean } = {}) {
    const cards = visibleStateCards("tool-calls").map((card) => rawStateCardToStateCard(card, locale));
    standardStreamRef.current?.cancel();
    setShowStandard(true);
    setSurfaceMode("builder");
    setWorkspaceView("preview");
    setRunEventSource("replay");
    setLiveMessages([]);
    setExternalApprovalOverlayActive(false);
    setDismissedExternalApprovalId(null);
    setGitPreviewStateOverride(undefined);
    setForcePreviewToolsOpen(options.forceOpen ?? false);
    setRunEvents(toolActionsOverviewEvents(cards, stateSectionTitle("tool-calls", locale), locale));
    setActiveStateCode("tool-actions-overview");
    bumpPreviewRefresh();
    if (!options.forceOpen) {
      scrollPreviewToAnchor("tool-call");
    }
  }

  function previewToolActionsOverviewFromCard() {
    previewToolActionsOverview();
  }

  // Avatar cards double as enable toggles for the user / agent avatars. When a
  // card carries an avatar toggleKey its "selected" (white) state reflects that
  // flag — both can be off (no avatars), either can be on independently.
  function avatarFlagKey(card: StateCard): "userAvatar" | "agentAvatar" | null {
    return card.toggleKey === "userAvatar" || card.toggleKey === "agentAvatar" ? card.toggleKey : null;
  }

  function isStateCardSelected(card: StateCard): boolean {
    if (selectedPresetGroup.id === "tool-calls") {
      return true;
    }
    const key = avatarFlagKey(card);
    return key ? Boolean(project.conversation[key]) : selectedStateCode === card.code;
  }

  function setAvatarEnabled(key: "userAvatar" | "agentAvatar", enabled: boolean) {
    setProject((current) => ({
      ...current,
      conversation: { ...current.conversation, [key]: enabled },
    }));
  }

  function revealConversationPreview(anchor: PreviewAnchor = "conversation") {
    if (isWelcome) {
      replayConversationPreview(anchor);
      return;
    }
    scrollPreviewToAnchor(anchor);
  }

  function toggleSpeakerLabels() {
    setProject((current) => ({
      ...current,
      conversation: {
        ...current.conversation,
        speakerLabels: !current.conversation.speakerLabels,
      },
    }));
    bumpPreviewRefresh();
    revealConversationPreview();
  }

  function writingModeForPreset(optionId: string): WritingMode | null {
    if (optionId === "writing-smooth") return "smooth-stream";
    if (optionId === "writing-typewriter") return "typewriter";
    if (optionId === "writing-chunked") return "chunked";
    return null;
  }

  function setWritingMode(writing: WritingMode) {
    setProject((current) => ({
      ...current,
      theme: {
        ...current.theme,
        motion: {
          ...current.theme.motion,
          writing,
        },
      },
    }));
  }

  function replayWritingOutput() {
    setActiveStateCode(null);
    setSurfaceMode("builder");
    setWorkspaceView("preview");
    setWritingReplayKey((current) => current + 1);
    setExternalApprovalOverlayActive(false);
    scrollPreviewToAnchor("chat");
  }

  function bumpPreviewRefresh() {
    if (previewRefreshTimerRef.current) {
      window.clearTimeout(previewRefreshTimerRef.current);
    }
    setPreviewRefreshing(false);
    window.requestAnimationFrame(() => {
      setPreviewRefreshing(true);
      previewRefreshTimerRef.current = window.setTimeout(() => {
        setPreviewRefreshing(false);
        previewRefreshTimerRef.current = undefined;
      }, 420);
    });
  }

  function replayConversationPreview(anchor: PreviewAnchor = "chat") {
    standardStreamRef.current?.cancel();
    setShowStandard(false);
    setActiveStateCode(null);
    setSurfaceMode("builder");
    setWorkspaceView("preview");
    setRunEventSource("replay");
    setRunEvents(undefined);
    setSelectedFixtureId("coding-agent");
    setLiveMessages([]);
    setExternalApprovalOverlayActive(false);
    setDismissedExternalApprovalId(null);
    setGitPreviewStateOverride(undefined);
    setWritingReplayKey((current) => current + 1);
    bumpPreviewRefresh();
    scrollPreviewToAnchor(anchor);
  }

  function replayStandardScenarioPreview(id: ScenarioId, anchor: PreviewAnchor = "chat") {
    standardStreamRef.current?.cancel();
    const scenario = scenarioById(id);
    setStandardScenarioId(id);
    setShowStandard(true);
    setActiveStateCode(null);
    setSurfaceMode("builder");
    setWorkspaceView("preview");
    setRunEventSource("replay");
    setRunEvents(toAgentUXEvents(scenario.fixture.events, { title: standardScenarioTitle(scenario, locale) }) as AgentUXEvent[]);
    setLiveMessages([]);
    setExternalApprovalOverlayActive(false);
    setDismissedExternalApprovalId(null);
    setGitPreviewStateOverride(undefined);
    setWritingReplayKey((current) => current + 1);
    bumpPreviewRefresh();
    scrollPreviewToAnchor(anchor);
  }

  function previewConversationWritingMode(writing: WritingMode) {
    standardStreamRef.current?.cancel();
    setWritingMode(writing);
    setShowStandard(true);
    setActiveStateCode(null);
    setSurfaceMode("builder");
    setWorkspaceView("preview");
    setRunEventSource("replay");
    setRunEvents(conversationWritingPreviewEvents(locale));
    setLiveMessages([]);
    setExternalApprovalOverlayActive(false);
    setDismissedExternalApprovalId(null);
    setGitPreviewStateOverride(undefined);
    setForcePreviewToolsOpen(false);
    setWritingReplayKey((current) => current + 1);
    bumpPreviewRefresh();
    scrollPreviewToAnchor("chat");
  }

  function replayFixturePreview(optionId: string) {
    standardStreamRef.current?.cancel();
    setShowStandard(false);
    setActiveStateCode(null);
    setSurfaceMode("builder");
    setWorkspaceView("preview");
    setRunEventSource("replay");
    setRunEvents(undefined);
    setLiveMessages([]);
    setExternalApprovalOverlayActive(false);
    setDismissedExternalApprovalId(null);
    setGitPreviewStateOverride(undefined);
    setSelectedFixtureId((current) => fixtureForPresetOption(optionId, current));
    bumpPreviewRefresh();
  }

  async function previewMediaGenerationOption(optionId: string, nextProject: AgentFrontendProject) {
    const scenarioId = mediaScenarioForPresetOption(optionId);
    if (!scenarioId) {
      return;
    }
    standardStreamRef.current?.cancel();
    const prompt =
      scenarioId === "image-generation"
        ? previewCopy[locale].mediaPrompt.image
        : scenarioId === "audio-generation"
          ? previewCopy[locale].mediaPrompt.audio
          : previewCopy[locale].mediaPrompt.video;
    const nextEvents = await collectPreviewRunEvents(previewRunner.run({
      prompt,
      project: nextProject,
      scenarioId,
      locale,
    }));
    setShowStandard(false);
    setActiveStateCode(null);
    setSurfaceMode("builder");
    setWorkspaceView("preview");
    setRunEventSource("replay");
    setRunEvents(nextEvents);
    setLiveMessages([]);
    setExternalApprovalOverlayActive(false);
    setInlineApprovalOverlayActive(false);
    setDismissedExternalApprovalId(null);
    setGitPreviewStateOverride(undefined);
    setForcePreviewToolsOpen(false);
    setRightCollapsed(false);
    setOutputModalOpen(false);
    setSelectedScenarioId(scenarioId);
    setPreviewPrompt(prompt);
    setWritingReplayKey((current) => current + 1);
    bumpPreviewRefresh();
    scrollPreviewToAnchorAfterPreviewUpdate("chat");
  }

  function setOutputSource(source: OutputSource) {
    setOutputModalOpen(false);
    setProject((current) => ({
      ...current,
      output: { ...current.output, source },
      layout: {
        ...current.layout,
        slots: current.layout.slots.map((slot) =>
          slot.component === "OutputFrame" ? { ...slot, enabled: true, region: "right-panel" } : slot,
        ),
      },
    }));
    setRightCollapsed(false);
    bumpPreviewRefresh();
    scrollPreviewToAnchor("output");
  }

  // Card-body click: toggle the avatar on/off (both off → no avatars in chat).
  // Avatars update the *existing* canvas content live via their flag, so we
  // don't restream a demo (which would wipe what's listed) — we just scroll the
  // conversation (the "我" bubble / avatars) into view so the change is visible.
  function toggleStateCard(card: StateCard) {
    const key = avatarFlagKey(card);
    if (!key) {
      previewState(card);
      return;
    }
    setAvatarEnabled(key, !project.conversation[key]);
    revealConversationPreview();
  }

  // Icon-tile click: choose that icon and enable the avatar so the pick shows.
  function pickStateCardIcon(card: StateCard) {
    const key = avatarFlagKey(card);
    if (!key) {
      previewState(card);
      return;
    }
    setAvatarEnabled(key, true);
    revealConversationPreview();
  }

  // Re-click the selected icon: disable the avatar (it disappears from the chat).
  function disableStateCard(card: StateCard) {
    const key = avatarFlagKey(card);
    if (!key) {
      previewState(card);
      return;
    }
    setAvatarEnabled(key, false);
    revealConversationPreview();
  }

  function messageActionActive(key: MessageActionKey, projectSnapshot = project) {
    const actions = projectSnapshot.conversation.messageActions;
    switch (key) {
      case "userCopy":
        return actions.userCopy ?? actions.copy;
      case "userEdit":
        return actions.userEdit ?? actions.edit;
      case "userTime":
        return actions.userTime ?? false;
      case "agentCopy":
        return actions.agentCopy ?? actions.copy;
      case "agentRegenerate":
        return actions.agentRegenerate ?? actions.regenerate;
      case "agentEdit":
        return actions.agentEdit ?? false;
      case "agentTime":
        return actions.agentTime ?? false;
      default:
        return Boolean(actions[key]);
    }
  }

  // "消息操作" is a multi-select — each message action toggles independently.
  function messageActionPreviewAnchor(key: MessageActionKey): PreviewAnchor {
    return key.startsWith("agent") ? "agent-message-actions" : "user-message-actions";
  }

  function setMessageAction(key: MessageActionKey, enabled: boolean) {
    setProject((current) => ({
      ...current,
      conversation: {
        ...current.conversation,
        messageActions: {
          ...current.conversation.messageActions,
          [key]: enabled,
        },
      },
    }));
    bumpPreviewRefresh();
    revealConversationPreview(messageActionPreviewAnchor(key));
  }

  function replayCurrentPreview() {
    setRunEventSource("replay");
    setRunEvents((current) => (current ? [...current] : [...events]));
  }

  function selectPreset(optionId: string) {
    const wasActive = isPresetOptionActive(project, optionId);
    if (optionId === "speaker-labels") {
      toggleSpeakerLabels();
      return;
    }
    const keepSelected = wasActive && isRequiredPresetOption(optionId);
    if (Object.prototype.hasOwnProperty.call(themeTokens, optionId)) {
      setSurfaceMode("builder");
      setWorkspaceView("preview");
      setProject((current) => applyPresetOption(current, optionId));
      bumpPreviewRefresh();
      return;
    }
    const writingMode = writingModeForPreset(optionId);
    if (writingMode) {
      previewConversationWritingMode(writingMode);
      return;
    }
    if (optionId === "output-source-artifact" || optionId === "output-source-console") {
      setOutputSource(optionId === "output-source-console" ? "console" : "artifact");
      return;
    }
    if (selectedPresetGroup.id === "media-generation" && isMediaGenerationPreset(optionId)) {
      const nextProject = keepSelected ? applyPresetOption(project, optionId) : togglePresetOption(project, optionId);
      setProject(nextProject);
      void previewMediaGenerationOption(optionId, nextProject);
      return;
    }
    if (selectedPresetGroup.id === "output") {
      // Output layout / data-source options only reconfigure the output panel;
      // they must NOT switch or replay the canvas conversation. Keep the current
      // content and just refresh the output surface against it.
      setSurfaceMode("builder");
      setWorkspaceView("preview");
      setProject((current) => (keepSelected ? applyPresetOption(current, optionId) : togglePresetOption(current, optionId)));
      if (optionId === "output-visible" || optionId === "surface-right-panel") {
        setRightCollapsed(false);
      }
      bumpPreviewRefresh();
      scrollPreviewToAnchorAfterPreviewUpdate("output");
      return;
    }
    if (selectedPresetGroup.id === "sidebar") {
      standardStreamRef.current?.cancel();
      setActiveStateCode(null);
      setSurfaceMode("builder");
      setWorkspaceView("preview");
      setProject((current) => (keepSelected ? applyPresetOption(current, optionId) : togglePresetOption(current, optionId)));
      if (optionId === "sidebar-visible") {
        setLeftCollapsed(false);
      }
      bumpPreviewRefresh();
      scrollPreviewToAnchorAfterPreviewUpdate("sidebar");
      return;
    }

    if (selectedPresetGroup.id === "composer") {
      standardStreamRef.current?.cancel();
      setSurfaceMode("builder");
      setWorkspaceView("preview");
      setProject((current) => (keepSelected ? applyPresetOption(current, optionId) : togglePresetOption(current, optionId)));
      setForcePreviewToolsOpen(false);
      const opensExternalApproval = optionId === "tool-approval-hidden";
      const opensInlineApproval = optionId === "tool-approval-inline";
      setExternalApprovalOverlayActive(opensExternalApproval);
      setInlineApprovalOverlayActive(opensInlineApproval);
      setDismissedExternalApprovalId(opensExternalApproval || opensInlineApproval ? null : pendingExternalApprovalTool?.id ?? null);
      bumpPreviewRefresh();
      return;
    }

    if (
      selectedPresetGroup.id === "tool-calls" &&
      activeStateCode === "status: cancelled" &&
      (optionId === "command-cards" || optionId === "compact-chips")
    ) {
      standardStreamRef.current?.cancel();
      setShowStandard(true);
      setSurfaceMode("builder");
      setWorkspaceView("preview");
      setRunEventSource("replay");
      setLiveMessages([]);
      setExternalApprovalOverlayActive(false);
      setInlineApprovalOverlayActive(false);
      setDismissedExternalApprovalId(null);
      setGitPreviewStateOverride(undefined);
      setProject((current) => (keepSelected ? applyPresetOption(current, optionId) : togglePresetOption(current, optionId)));
      setForcePreviewToolsOpen(false);
      if (optionId === "command-cards") {
        setToolCollapseSignal((value) => value + 1);
      }
      setRunEvents(stateDemoEvents("tool.cancelled", "status: cancelled", previewCopy[locale].cancelledLabel) as AgentUXEvent[]);
      bumpPreviewRefresh();
      scrollPreviewToAnchorAfterPreviewUpdate("tool-call");
      return;
    }

    // Selecting a preset option always demos its effect live in the preview.
    standardStreamRef.current?.cancel();
    setActiveStateCode(null);
    setSurfaceMode("builder");
    setWorkspaceView("preview");
    setProject((current) => (keepSelected ? applyPresetOption(current, optionId) : togglePresetOption(current, optionId)));
    setForcePreviewToolsOpen(forceOpenToolDetailPresetIds.has(optionId));
    if (optionId === "command-cards") {
      setToolCollapseSignal((value) => value + 1);
    }
    const opensExternalApproval = optionId === "tool-approval-hidden";
    const opensInlineApproval = optionId === "tool-approval-inline";
    setExternalApprovalOverlayActive(opensExternalApproval);
    setInlineApprovalOverlayActive(false);
    setDismissedExternalApprovalId(opensExternalApproval ? null : pendingExternalApprovalTool?.id ?? null);

    if (opensInlineApproval) {
      setExternalApprovalOverlayActive(false);
      setInlineApprovalOverlayActive(true);
      setDismissedExternalApprovalId(null);
      bumpPreviewRefresh();
      scrollPreviewToAnchorAfterPreviewUpdate("external-approval");
      return;
    }

    if (optionId === "tool-approval-hidden") {
      setExternalApprovalOverlayActive(true);
      setInlineApprovalOverlayActive(false);
      setDismissedExternalApprovalId(null);
      bumpPreviewRefresh();
      scrollPreviewToAnchorAfterPreviewUpdate("external-approval");
      return;
    }

    if (selectedPresetGroup.id === "tool-calls") {
      previewToolActionsOverview({ forceOpen: forceOpenToolDetailPresetIds.has(optionId) });
      if (forceOpenToolDetailPresetIds.has(optionId)) {
        scrollPreviewToToolActionAfterPreviewUpdate("validate");
      }
    } else if (isThinkingPreviewPreset(optionId)) {
      // Thinking motion: show only the reasoning preview, not the surrounding
      // tool/message/artifact content from the coding fixture.
      setShowStandard(true);
      setRunEventSource("replay");
      setLiveMessages([]);
      setExternalApprovalOverlayActive(false);
      setDismissedExternalApprovalId(null);
      setGitPreviewStateOverride(undefined);
      setForcePreviewToolsOpen(false);
      setRunEvents(thinkingPreviewEvents(locale));
      bumpPreviewRefresh();
      scrollPreviewToAnchorAfterPreviewUpdate("reasoning");
      return;
    } else if (presentationOnlyPresetIds.has(optionId)) {
      replayFixturePreview(optionId);
    } else if (keepSelected) {
      replayCurrentPreview();
      bumpPreviewRefresh();
    } else {
      setShowStandard(false);
      resetRunState();
      setSelectedFixtureId((current) => fixtureForPresetOption(optionId, current));
      bumpPreviewRefresh();
    }
    scrollPreviewToPreset(optionId);
  }

  function updateWritingParam(key: keyof AgentFrontendProject["theme"]["motion"]["writingParams"], value: number) {
    updateActiveProject((current) => ({
      ...current,
      theme: {
        ...current.theme,
        motion: {
          ...current.theme.motion,
          writingParams: { ...current.theme.motion.writingParams, [key]: value },
        },
      },
    }));
  }

function selectPresetGroup(groupId: PresetGroupId) {
    setSelectedGroup(groupId);
    setSurfaceMode("builder");
    setWorkspaceView("preview");
    if (groupId === "tool-calls") {
      previewToolActionsOverview();
    } else if (groupId === "blocks") {
      const firstCard = visibleStateCards("blocks")[0];
      if (firstCard) {
        previewState(rawStateCardToStateCard(firstCard, locale));
      }
    }
  }

  // Two-level nav: the activity-bar icon toggles the drawer for the active
  // group and switches-and-opens for any other group.
  function handlePresetGroupClick(groupId: PresetGroupId) {
    if (groupId === selectedGroup && presetDrawerOpen) {
      setPresetDrawerOpen(false);
      return;
    }
    setPresetDrawerOpen(true);
    selectPresetGroup(groupId);
  }

  function updateActiveProject(mutator: (current: AgentFrontendProject) => AgentFrontendProject) {
    if (surfaceMode === "saved-preview") {
      setSavedProject((current) => current ? mutator(current) : current);
      return;
    }

    setProject(mutator);
  }

  function setDefaultProvider(id: ProviderConnectionId) {
    updateActiveProject((current) => ({
      ...current,
      providers: {
        ...current.providers,
        defaultProviderId: current.providers.connections.some((provider) => provider.id === id && provider.enabled)
          ? id
          : current.providers.defaultProviderId,
      },
    }));
  }

  function updateModel(model: string) {
    updateActiveProject((current) => ({
      ...current,
      providers: {
        ...current.providers,
        connections: current.providers.connections.map((provider) =>
          provider.id === current.providers.defaultProviderId
            ? {
              ...provider,
              defaultModel: model,
              models: provider.models.includes(model) ? provider.models : [model, ...provider.models],
            }
            : provider,
        ),
      },
    }));
  }

  function toggleProvider(id: ProviderCatalogId) {
    setWorkspaceView("preview");
    setProject((current) => applyPresetOption(current, `provider-${id}`));
    scrollPreviewToPreset(`provider-${id}`);
  }

  function toggleProviderSettingsLauncher() {
    selectPreset("provider-settings-launcher");
  }

  function updateProviderConnection(
    id: ProviderConnectionId,
    patch: Partial<Pick<ProviderConnection, "baseUrl" | "defaultModel" | "label" | "models">> & { authEnvVar?: string },
  ) {
    updateActiveProject((current) => ({
      ...current,
      providers: {
        ...current.providers,
        connections: current.providers.connections.map((provider) => {
          if (provider.id !== id) {
            return provider;
          }

          const defaultModel = patch.defaultModel ?? provider.defaultModel;
          return {
            ...provider,
            ...patch,
            auth: patch.authEnvVar && provider.auth.mode === "env"
              ? { ...provider.auth, envVar: patch.authEnvVar }
              : provider.auth,
            defaultModel,
            models: patch.models ?? (provider.models.includes(defaultModel) ? provider.models : [defaultModel, ...provider.models]),
          };
        }),
      },
    }));
  }

  function updateWelcomeGreeting(greeting: string) {
    updateActiveProject((current) => ({
      ...current,
      welcome: { ...current.welcome, greeting },
    }));
  }

  function updateSessionKey(id: ProviderConnectionId, value: string) {
    setSessionKeys((current) => ({ ...current, [id]: value }));
  }

  async function requestProviderModels(provider: ProviderConnection, sessionKey?: string): Promise<string[]> {
    const response = await fetch(providerRequestUrl(provider, "models", "agentcanvas-dev-proxy"), {
      headers: providerRequestHeaders(provider, sessionKey, "agentcanvas-dev-proxy"),
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim());
    }

    const data = await response.json() as {
      data?: Array<{ id?: string }>;
      models?: Array<{ id?: string; name?: string }>;
    };
    return (
      data.data?.map((model) => model.id).filter((model): model is string => Boolean(model)) ??
      data.models?.map((model) => model.id ?? model.name).filter((model): model is string => Boolean(model)) ??
      []
    );
  }

  async function testProvider(provider: ProviderConnection, sessionKey?: string) {
    if (provider.auth.mode !== "none" && !sessionKey?.trim()) {
      toast.error(formatCopy(copy.shell.toast.enterDevSessionKeyBeforeTesting, { provider: provider.label }));
      return;
    }

    try {
      const models = await requestProviderModels(provider, sessionKey);
      toast.success(
        `${formatCopy(copy.shell.toast.providerKeyWorks, { provider: provider.label })}${models.length ? ` · ${models.length} ${copy.shell.toast.modelsCountSuffix}` : ""}`,
      );
    } catch (error) {
      toast.error(formatCopy(copy.shell.toast.providerTestFailed, {
        provider: provider.label,
        message: error instanceof Error ? error.message : copy.shell.toast.unknownError,
      }));
    }
  }

  async function fetchProviderModels(provider: ProviderConnection, sessionKey?: string) {
    if (provider.auth.mode !== "none" && !sessionKey?.trim()) {
      toast.error(formatCopy(copy.shell.toast.enterDevSessionKeyBeforeFetchingModels, { provider: provider.label }));
      return;
    }

    try {
      const models = await requestProviderModels(provider, sessionKey);
      if (models.length === 0) {
        toast.info(formatCopy(copy.shell.toast.providerReturnedNoModels, { provider: provider.label }));
        return;
      }
      updateProviderConnection(provider.id, { models, defaultModel: models[0] });
      toast.success(formatCopy(copy.shell.toast.fetchedModelsForProvider, { count: models.length, provider: provider.label }));
    } catch (error) {
      toast.error(formatCopy(copy.shell.toast.providerModelFetchFailed, {
        provider: provider.label,
        message: error instanceof Error ? error.message : copy.shell.toast.unknownError,
      }));
    }
  }

  function saveProviderSettings() {
    if (surfaceMode === "saved-preview") {
      setRunMode(initialSavedPreviewRunMode({ project: activeProject, sessionKeys }));
      setLivePreviewState("idle");
    }
    toast.success(copy.shell.toast.providerSettingsSaved);
  }

  async function saveScaffoldPreview() {
    standardStreamRef.current?.cancel();
    setShowStandard(false);
    const saved = JSON.parse(JSON.stringify(project)) as AgentFrontendProject;
    const snapshot = createScaffoldExportSnapshot(saved);
    const defaultScenarioId = resolveDefaultPreviewScenario(saved);
    const initialRunMode = initialSavedPreviewRunMode({ project: saved, sessionKeys });
    setSavedProject(saved);
    setExportSnapshot(snapshot);
    setSelectedScenarioId(defaultScenarioId);
    setRunMode(initialRunMode);
    setSurfaceMode("saved-preview");
    setWorkspaceView("preview");

    if (initialRunMode === "live") {
      setActiveStateCode(null);
      setRunEvents([]);
      setRunEventSource("live");
      setLiveMessages([]);
      setLivePreviewState("idle");
      setGitPreviewStateOverride(undefined);
      setExternalApprovalOverlayActive(false);
      setDismissedExternalApprovalId(null);
      setForcePreviewToolsOpen(false);
      setPreviewPrompt("");
      bumpPreviewRefresh();
      toast.success(copy.shell.toast.uiUxSaved);
      return;
    }

    await runSavedReplayPreview({
      project: saved,
      prompt: defaultPreviewPromptForLocale(locale),
      scenarioId: defaultScenarioId,
      successMessage: copy.shell.toast.uiUxSaved,
    });
  }

  async function runCurrentPreview(
    prompt = previewPrompt,
    context?: { attachments?: readonly PreviewInputAttachment[] },
  ) {
    if (!savedProject) {
      toast.info(copy.shell.toast.saveBeforeLocalPreview);
      return;
    }
    standardStreamRef.current?.cancel();
    setShowStandard(false);

    if (runMode === "live") {
      await runLivePreview(prompt);
      return;
    }

    const normalizedPrompt = prompt.trim() || defaultPreviewPromptForLocale(locale);
    await runSavedReplayPreview({
      project: savedProject,
      prompt: normalizedPrompt,
      attachments: context?.attachments,
      scenarioId: selectedScenarioId,
      successMessage: copy.shell.toast.pureFrontendComplete,
    });
  }

  async function runSavedReplayPreview({
    project: saved,
    prompt,
    attachments,
    scenarioId,
    successMessage,
  }: {
    project: AgentFrontendProject;
    prompt: string;
    attachments?: readonly PreviewInputAttachment[];
    scenarioId: PreviewScenarioId;
    successMessage: string;
  }) {
    standardStreamRef.current?.cancel();
    setShowStandard(false);
    setActiveStateCode(null);
    const normalizedPrompt = prompt.trim() || defaultPreviewPromptForLocale(locale);
    const nextEvents = await collectPreviewRunEvents(previewRunner.run({
      prompt: normalizedPrompt,
      attachments,
      project: saved,
      scenarioId,
      locale,
    }));
    setPreviewPrompt(normalizedPrompt);
    streamSavedReplayEvents(nextEvents, successMessage);
    setRunEventSource("replay");
    setLiveMessages([]);
    setLivePreviewState("idle");
    setGitPreviewStateOverride(undefined);
    setExternalApprovalOverlayActive(scenarioId === "tool-approval");
    setDismissedExternalApprovalId(null);
    setForcePreviewToolsOpen(false);
    setWritingReplayKey((current) => current + 1);
    setSurfaceMode("saved-preview");
    setWorkspaceView("preview");
    bumpPreviewRefresh();
  }

  function streamSavedReplayEvents(nextEvents: AgentUXEvent[], successMessage: string) {
    standardStreamRef.current?.cancel();
    if (nextEvents.length === 0) {
      setRunEvents([]);
      toast.success(successMessage);
      return;
    }

    let index = initialPreviewRevealCount(nextEvents);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const revealed = nextEvents.slice(0, index);
    setRunEvents([...revealed]);

    const tick = () => {
      if (cancelled) return;
      revealed.push(nextEvents[index]);
      index += 1;
      setRunEvents([...revealed]);
      if (index >= nextEvents.length) {
        standardStreamRef.current = undefined;
        toast.success(successMessage);
        return;
      }
      timer = setTimeout(tick, previewReplayDelay(nextEvents[index]));
    };

    if (index >= nextEvents.length) {
      toast.success(successMessage);
      return;
    }

    timer = setTimeout(tick, previewReplayDelay(nextEvents[index]));
    standardStreamRef.current = {
      cancel: () => {
        cancelled = true;
        if (timer) {
          clearTimeout(timer);
        }
      },
    };
  }

  function initialPreviewRevealCount(nextEvents: AgentUXEvent[]): number {
    const firstVisibleIndex = nextEvents.findIndex((event) => event.type !== "run.started");
    if (firstVisibleIndex < 0) {
      return Math.min(1, nextEvents.length);
    }
    return Math.min(firstVisibleIndex + 1, nextEvents.length);
  }

  function previewReplayDelay(event: AgentUXEvent): number {
    if (event.type === "reasoning.delta" || event.type === "tool.call.args.delta") return 220;
    if (event.type === "reasoning.summary") return 760;
    if (event.type === "reasoning.finished") return 480;
    if (event.type === "tool.call.started" || event.type === "tool.call.running") return 420;
    if (event.type === "tool.call.result") return 680;
    if (event.type.startsWith("artifact.")) return 360;
    if (event.type === "text.delta") return 520;
    if (event.type === "run.finished") return 240;
    return 320;
  }

  async function runLivePreview(prompt = previewPrompt) {
    if (!savedProject) {
      toast.info(copy.shell.toast.saveBeforeLiveLlm);
      return;
    }
    if (liveRunning) {
      stopLivePreview();
      return;
    }

    const normalizedPrompt = prompt.trim() || livePreviewFallbackPrompt[locale];
    const history = liveMessages;
    const controller = new AbortController();
    liveAbortControllerRef.current = controller;
    setLiveRunning(true);
    setLivePreviewState("streaming");
    setPreviewPrompt(normalizedPrompt);
    setLiveMessages([...history, { role: "user", content: normalizedPrompt }]);
    setGitPreviewStateOverride(undefined);
    setSurfaceMode("saved-preview");
    setWorkspaceView("preview");

    try {
      const result = await runLiveLlmPreview({
        prompt: normalizedPrompt,
        project: savedProject,
        sessionKeys,
        history,
        fetchMode: "agentcanvas-dev-proxy",
        signal: controller.signal,
        toolSimulationDelayMs: LIVE_TOOL_SIMULATION_DELAY_MS,
        onEvents(nextEvents) {
          if (controller.signal.aborted || liveAbortControllerRef.current !== controller) {
            return;
          }
          const eventsSnapshot = [...nextEvents];
          setRunEvents(eventsSnapshot);
          setRunEventSource("live");
        },
      });
      if (controller.signal.aborted || liveAbortControllerRef.current !== controller) {
        return;
      }
      setLiveMessages(result.messages);
      setRunEvents(result.events);
      setRunEventSource("live");
      setLivePreviewState("finished");
      toast.success(formatCopy(copy.shell.toast.liveLlmResponseReceived, { provider: result.provider.label }));
    } catch (error) {
      if (controller.signal.aborted) {
        setLivePreviewState("stopped");
        toast.info(copy.shell.toast.liveLlmStopped);
      } else {
        setLivePreviewState("error");
        toast.error(error instanceof Error ? error.message : copy.shell.toast.liveLlmFailed);
      }
    } finally {
      if (liveAbortControllerRef.current === controller) {
        liveAbortControllerRef.current = undefined;
      }
      setLiveRunning(false);
    }
  }

  function stopLivePreview() {
    liveAbortControllerRef.current?.abort();
    setLivePreviewState("stopped");
    setLiveRunning(false);
  }

  function updateScenario(id: PreviewScenarioId) {
    setSelectedScenarioId(id);
    setGitPreviewStateOverride(undefined);
  }

  function updateRunMode(mode: RunMode) {
    setRunMode(mode);
    setLivePreviewState("idle");
    setGitPreviewStateOverride(undefined);
  }

  function switchPresetStyle(styleId: PresetStyleId, tabButton?: HTMLButtonElement | null) {
    if (styleId !== selectedPresetStyle) {
      if (styleSwitchTimerRef.current) {
        window.clearTimeout(styleSwitchTimerRef.current);
      }
      setSelectedPresetStyle(styleId);
      setSlot("author.user", STYLE_AVATAR_DEFAULTS[styleId]["author.user"]);
      setSlot("author.agent", STYLE_AVATAR_DEFAULTS[styleId]["author.agent"]);
      setStyleSwitching(true);
      window.requestAnimationFrame(() => {
        styleSwitchTimerRef.current = window.setTimeout(() => {
          setStyleSwitching(false);
          styleSwitchTimerRef.current = undefined;
        }, 450);
      });
    }
    if (tabButton) {
      window.requestAnimationFrame(() => {
        tabButton.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      });
    }
  }

  // Each style owns its own theme set, so switching style also moves to that
  // style's default theme after confirmation.
  function defaultThemeForStyle(styleId: PresetStyleId) {
    if (styleId === "native") return "soft-glass" as const;
    if (styleId === "illustrated") return "ice-white" as const;
    return null; // studio (under construction) keeps the current theme
  }

  function requestStyleSwitch(styleId: PresetStyleId, tabButton: HTMLButtonElement) {
    if (styleId === selectedPresetStyle) {
      return;
    }
    pendingStyleButtonRef.current = tabButton;
    setPendingStyle(styleId);
  }

  function confirmStyleSwitch() {
    const target = pendingStyle;
    if (!target) {
      return;
    }
    setPendingStyle(null);
    const button = pendingStyleButtonRef.current;
    pendingStyleButtonRef.current = null;
    switchPresetStyle(target, button);
    const themeId = defaultThemeForStyle(target);
    if (themeId) {
      setProject((current) => ({ ...current, theme: { ...current.theme, preset: themeId } }));
    }
  }

  function commitGitPreview() {
    if (!gitPreviewState) {
      toast.info(copy.shell.toast.runGitDiffBeforeCommit);
      return;
    }
    setGitPreviewStateOverride(commitGitPreviewState(gitPreviewState));
    toast.success(copy.shell.toast.mockCommitRecorded);
  }

  function openArtifactFromTool(request: OutputPanelOpenRequest) {
    const item = normalizeOutputPanelRequest(request);
    setOutputPanelItems((current) => mergeOutputPanelItems(current, [item]));
    setActiveOutputPanelItemId(item.id);
    setProject((current) => ({
      ...current,
      output: { ...current.output, source: "artifact" },
    }));
    if (rightPanelVisible) {
      setOutputModalOpen(false);
      setRightCollapsed(false);
      window.setTimeout(() => scrollPreviewToAnchor("output"), 80);
      return;
    }
    setOutputModalOpen(true);
  }

  function closeOutputPanelItem(id: string) {
    setOutputPanelItems((current) => {
      const index = current.findIndex((entry) => entry.id === id);
      if (index < 0) {
        return current;
      }
      const next = current.filter((entry) => entry.id !== id);
      if (next.length === 0) {
        setOutputModalOpen(false);
      }
      setActiveOutputPanelItemId((activeId) => {
        if (activeId !== id) {
          return activeId;
        }
        return next[Math.max(0, index - 1)]?.id ?? next[0]?.id;
      });
      return next;
    });
  }

  async function generateExport() {
    const snapshot = createScaffoldExportSnapshot(activeProject);
    setExportSnapshot(snapshot);
    try {
      await downloadScaffold(snapshot);
      toast.success(formatCopy(copy.shell.toast.exportDownloaded, { name: snapshot.packageJson.name }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.shell.toast.scaffoldExportFailed);
    }
  }

  const slotContext: SlotRenderContext = {
    project: activeProject,
    viewModel: displayViewModel,
    events,
    admission,
    exportSnapshot,
    showDebugBadges: builderUI.showDebugBadges,
    previewPrompt: showStandard ? "" : previewPrompt,
    previewPrompts: livePreviewPrompts,
    writingReplayKey,
    forceToolsOpen: forcePreviewToolsOpen,
    toolCollapseSignal,
    gitPreviewState,
    modelOptions: modelOptionsForProject(activeProject),
    isRunning: liveRunning,
    onSubmit(prompt, context) {
      void runCurrentPreview(prompt, context);
    },
    onStop: stopLivePreview,
    onExport: generateExport,
    onGitCommit: commitGitPreview,
    onProviderChange: setDefaultProvider,
    onModelChange: updateModel,
    onCollapseLeft: () => setLeftCollapsed(true),
    onCollapseRight: () => setRightCollapsed(true),
    onOpenArtifact: openArtifactFromTool,
    outputPanelItems,
    activeOutputPanelItemId,
    onSelectOutputPanelItem: setActiveOutputPanelItemId,
    onCloseOutputPanelItem: closeOutputPanelItem,
    onOutputSourceChange: setOutputSource,
    activeSessionPrompt: previewPrompt,
    sessionPrompts: copy.workspace.sessionSidebar.sessions,
    onSelectSession(prompt) {
      if (isWelcome) {
        // From the welcome state, clicking a session switches back to the
        // normal conversation view instead of staying on the empty canvas.
        streamStandardScenario(standardScenarioId);
        return;
      }
      void runCurrentPreview(prompt);
    },
    onNewSession: enterWelcomeState,
    welcomeGreeting: activeProject.welcome.greeting,
    isWelcome,
    providerSettingsControl: (
      <ProviderFloatingSettings
        project={activeProject}
        sessionKeys={sessionKeys}
        onFetchModels={fetchProviderModels}
        onSave={saveProviderSettings}
        onSetDefaultProvider={setDefaultProvider}
        onSessionKeyChange={updateSessionKey}
        onTestProvider={testProvider}
        onUpdateProvider={updateProviderConnection}
      />
    ),
    externalApprovalPlacement: "overlay",
  };
  const previewOverlaySlots = renderSlots(
    visibleLayoutSlots.filter((slot) => slot.component === "OutputFrame"),
    "overlay",
    { ...slotContext, onCollapseRight: undefined },
  );

  return (
    <>
      <Toaster richColors position="bottom-left" />
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} onSelectFixture={selectFixture} />
      <IconStyleProvider value={selectedPresetStyle === "native" ? "bold" : "line"}>
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar-leading">
            <div className="brand-block">
              <h1 className="brand-logo" aria-label="AgentCanvas">AgentCanvas<span>．</span></h1>
            </div>
            <div
              className="language-picker"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setLanguageMenuOpen(false);
                }
              }}
            >
              <button
                className="language-trigger"
                type="button"
                aria-label={copy.shell.topbar.languageSwitchAria}
                aria-haspopup="menu"
                aria-expanded={languageMenuOpen}
                onClick={() => setLanguageMenuOpen((open) => !open)}
              >
                <span>{copy.shell.topbar.languageLabels[locale]}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              {languageMenuOpen ? (
                <div className="language-menu" role="menu">
                  {APP_LOCALES.map((option) => (
                    <button
                      key={option}
                      className="language-option"
                      type="button"
                      role="menuitemradio"
                      aria-checked={locale === option}
                      data-active={locale === option}
                      onClick={() => {
                        setLocale(option);
                        setLanguageMenuOpen(false);
                      }}
                    >
                      {copy.shell.topbar.languageLabels[option]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="topbar-controls">
            {surfaceMode === "saved-preview" ? (
              <label className="run-mode-picker">
                <SelectMenu
                  size="sm"
                  ariaLabel={copy.shell.topbar.runModeLabel}
                  value={runMode}
                  onValueChange={(value) => updateRunMode(value as RunMode)}
                  options={[
                    { value: "replay", label: copy.shell.topbar.runModeReplay },
                    { value: "live", label: copy.shell.topbar.runModeLive },
                  ]}
                />
              </label>
            ) : null}
            {surfaceMode === "saved-preview" && runMode === "replay" ? (
              <label className="scenario-picker">
                <SelectMenu
                  size="sm"
                  ariaLabel={copy.shell.topbar.scenarioLabel}
                  value={selectedScenarioId}
                  onValueChange={(value) => updateScenario(value as PreviewScenarioId)}
                  options={previewScenarios.map((scenario) => ({
                    value: scenario.id,
                    label: previewScenarioLabel(scenario, locale),
                  }))}
                />
              </label>
            ) : null}
            {showDebugViewToggle ? (
              <button
                className="mode-toggle-button"
                type="button"
                data-mode={workspaceView}
                aria-label={workspaceView === "preview" ? copy.shell.topbar.viewDebug : copy.shell.topbar.viewPreview}
                title={workspaceView === "preview" ? copy.shell.topbar.viewDebug : copy.shell.topbar.viewPreview}
                onClick={() => setWorkspaceView((current) => current === "preview" ? "debug" : "preview")}
              >
                {workspaceView === "preview" ? <Eye size={21} /> : <Activity size={22} />}
              </button>
            ) : surfaceMode === "saved-preview" ? (
              <button className="secondary-button" type="button" onClick={() => setSurfaceMode("builder")}>
                <Settings2 size={16} />
                {copy.shell.topbar.editUiUx}
              </button>
            ) : null}
            {surfaceMode === "builder" ? (
              <div className="topbar-action-group" role="group" aria-label={`${copy.shell.topbar.save} / ${selectedComponentSummary}`}>
                <button
                  className="topbar-group-button"
                  type="button"
                  aria-label={copy.shell.topbar.save}
                  title={copy.shell.topbar.save}
                  onClick={saveScaffoldPreview}
                >
                  <Save size={21} />
                </button>
                <div className="selected-components-menu" ref={selectedComponentsRef}>
                  <button
                    className="topbar-group-button selected-components-trigger"
                    type="button"
                    aria-label={selectedComponentSummary}
                    aria-haspopup="dialog"
                    aria-expanded={selectedComponentsOpen}
                    onClick={() => setSelectedComponentsOpen((open) => !open)}
                  >
                    <span>{selectedComponentSummary}</span>
                    <ChevronDown size={14} aria-hidden="true" />
                  </button>
                  {selectedComponentsOpen ? (
                    <div className="selected-components-popover" role="dialog" aria-label={selectedComponentSummary}>
                      <div className="selected-components-popover-header">
                        <span>{selectedComponentSummary}</span>
                      </div>
                      {selectedComponentItems.length > 0 ? (
                        <div className="selected-components-list" role="list">
                          {selectedComponentItems.map((item) => (
                            <div className="selected-component-item" role="listitem" key={item.id}>
                              <span className="selected-component-name">{item.group} - {item.label}</span>
                              {item.section ? <span className="selected-component-section">{item.section}</span> : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="selected-components-empty">
                          {copy.shell.editor.noSelectedComponents}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            <button className="primary-button topbar-deploy-button" type="button" onClick={() => void generateExport()}>
              <Download size={16} />
              {copy.shell.topbar.exportScaffold}
            </button>
          </div>
        </header>

        <div className="workspace-layout" data-mode={surfaceMode} data-drawer-open={surfaceMode === "builder" ? presetDrawerOpen : undefined}>
          {surfaceMode === "builder" ? (
            <div className="preset-nav" data-open={presetDrawerOpen}>
              <div className="preset-style-cards" role="tablist" aria-label={copy.shell.editor.chooseStyle}>
                {presetStyleOptions.map((style) => (
                  <button
                    key={style.id}
                    className="preset-style-card"
                    type="button"
                    role="tab"
                    data-style={style.id}
                    data-active={style.id === selectedPresetStyle}
                    aria-selected={style.id === selectedPresetStyle}
                    onClick={(event) => requestStyleSwitch(style.id, event.currentTarget)}
                  >
                    <span className="preset-style-card-swatch" aria-hidden="true" />
                    <span className="preset-style-card-name">{style.label[locale]}</span>
                  </button>
                ))}
              </div>
              <Dialog
                open={pendingStyle !== null}
                onOpenChange={(open) => {
                  if (!open) {
                    setPendingStyle(null);
                  }
                }}
              >
                {pendingStyle === "studio" ? (
                  <DialogContent
                    title={copy.shell.editor.styleSwitch.unbuiltTitle.replace("{style}", pendingStyleLabel)}
                    description={copy.shell.editor.styleSwitch.unbuiltDescription}
                    width={380}
                  >
                    <div className="style-switch-actions">
                      <DialogClose className="primary-button">
                        {copy.shell.editor.styleSwitch.gotIt}
                      </DialogClose>
                    </div>
                  </DialogContent>
                ) : pendingStyle ? (
                  <DialogContent
                    title={copy.shell.editor.styleSwitch.confirmTitle.replace("{style}", pendingStyleLabel)}
                    description={copy.shell.editor.styleSwitch.confirmDescription.replaceAll("{style}", pendingStyleLabel)}
                    width={380}
                  >
                    <div className="style-switch-actions">
                      <DialogClose className="secondary-button">
                        {copy.shell.editor.styleSwitch.cancel}
                      </DialogClose>
                      <button type="button" className="primary-button" onClick={confirmStyleSwitch}>
                        {copy.shell.editor.styleSwitch.confirm}
                      </button>
                    </div>
                  </DialogContent>
                ) : null}
              </Dialog>
              <div className="preset-columns">
              <aside className="preset-iconbar" aria-label={copy.shell.presetRail.title}>
                {presetRailSections.map((section) => {
                  const groups = section.groupIds
                    .map((id) => visiblePresetGroups.find((group) => group.id === id))
                    .filter((group): group is (typeof visiblePresetGroups)[number] => Boolean(group));
                  if (groups.length === 0) return null;
                  return (
                    <div className="preset-iconbar-group" key={section.id}>
                      {groups.map((group) => {
                        const TabIcon = presetGroupIcons[group.id];
                        const groupName = translatePresetGroupName(group.id, copy.shell.presetRail.groups[group.id].label, locale);
                        const isActive = group.id === selectedGroup;
                        return (
                          <button
                            key={group.id}
                            className="preset-icon-tile"
                            data-preset-group={group.id}
                            data-active={isActive}
                            type="button"
                            aria-pressed={isActive}
                            aria-label={groupName}
                            title={groupName}
                            onClick={() => selectPresetGroup(group.id)}
                          >
                            <span className="preset-icon-glyph" aria-hidden="true"><TabIcon size={16} /></span>
                            <span className="preset-icon-label">{groupName}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </aside>

              <aside
                className="preset-panel"
                data-preset-group={selectedPresetGroup.id}
                data-style-preset={selectedPresetStyle}
                data-appearance={themeTokens[activeProject.theme.preset].appearance}
                data-theme-preset={activeProject.theme.preset}
                aria-label={translatePresetGroupName(selectedPresetGroup.id, copy.shell.presetRail.groups[selectedPresetGroup.id].label, locale)}
              >
                <div className="preset-panel-header">
                  <span className="preset-panel-title">{translatePresetGroupName(selectedPresetGroup.id, copy.shell.presetRail.groups[selectedPresetGroup.id].label, locale)}</span>
                  <p className="preset-panel-desc">{copy.shell.presetRail.groups[selectedPresetGroup.id].description}</p>
                </div>
                <div className="preset-panel-body">
                  {styleSwitching ? (
                    <div className="preset-panel-skeleton" aria-hidden="true">
                      <span className="preset-skel-line" />
                      <span className="preset-skel-card" />
                      <span className="preset-skel-card" />
                      <span className="preset-skel-card" />
                      <span className="preset-skel-card" />
                      <span className="preset-skel-card" />
                    </div>
                  ) : selectedPresetStyle === "studio" ? (
                    <div className="preset-panel-building">{copy.shell.editor.underConstruction}</div>
                  ) : (
                    <>
                  {stateCards.length && selectedPresetGroup.id === "tool-calls" ? (
                    <section className="preset-option-section">
                      <h3>{stateSectionTitle(selectedPresetGroup.id, locale)}</h3>
                      <StateGallery
                        cards={stateCards}
                        activeCode={selectedStateCode}
                        isSelected={isStateCardSelected}
                        onSelect={previewToolActionsOverviewFromCard}
                        onPickIcon={previewToolActionsOverviewFromCard}
                        onDeselect={previewToolActionsOverviewFromCard}
                      />
                    </section>
                  ) : null}
                  {stateCards.length && selectedPresetGroup.id !== "tool-calls" ? (
                    <section className="preset-option-section">
                      <h3>{stateSectionTitle(selectedPresetGroup.id, locale)}</h3>
                      <StateGallery
                        cards={stateCards}
                        activeCode={selectedStateCode}
                        isSelected={isStateCardSelected}
                        onSelect={toggleStateCard}
                        onPickIcon={pickStateCardIcon}
                        onDeselect={disableStateCard}
                      />
                      {selectedPresetGroup.id === "conversation" ? (
                        <div className="preset-option-cell" data-option-id="speaker-labels">
                          <button
                            className="preset-option"
                            data-active={isPresetOptionActive(project, "speaker-labels")}
                            aria-pressed={isPresetOptionActive(project, "speaker-labels")}
                            aria-label={translatePresetOptionLabel("speaker-labels", "Name label", locale)}
                            type="button"
                            onClick={() => selectPreset("speaker-labels")}
                          >
                            <PresetOptionPreview optionId="speaker-labels" />
                          </button>
                          <span className="preset-option-name">
                            <span>{translatePresetOptionLabel("speaker-labels", "Name label", locale)}</span>
                          </span>
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                  {selectedPresetGroup.id === "git" ? (
                    <div className="am-comingsoon">
                      <span className="am-comingsoon-icon" aria-hidden="true">
                        <GitMerge size={18} strokeWidth={1.5} />
                      </span>
                      <strong>{copy.workspace.gitFrame.comingSoonTitle}</strong>
                      <p>{copy.workspace.gitFrame.comingSoonBody}</p>
                    </div>
                  ) : selectedPresetGroup.id === "provider" ? (
                    <ProviderSettingsPanel
                      project={project}
                      sessionKeys={sessionKeys}
                      onFetchModels={fetchProviderModels}
                      onSave={saveProviderSettings}
                      onSetDefaultProvider={setDefaultProvider}
                      onSessionKeyChange={updateSessionKey}
                      onTestProvider={testProvider}
                      onToggleProvider={toggleProvider}
                      onToggleSettingsLauncher={toggleProviderSettingsLauncher}
                      onUpdateProvider={updateProviderConnection}
                    />
                  ) : (
                    <>
                    {renderedPresetSections.map((section) => (
                      <section className="preset-option-section" key={section.label}>
                        {showPresetSectionLabels && section.label !== "Scaffold theme" ? (
                          <h3>{translatePresetSection(section.label, locale)}</h3>
                        ) : null}
                        <div className="preset-option-list">
                          {section.items.map((option) => {
                            const active = isPresetOptionActive(project, option.id);
                            const showParams = active && hasWritingParams(option.id);
                            return (
                              <div className="preset-option-cell" key={option.id} data-option-id={option.id}>
                                <button
                                  className="preset-option"
                                  data-active={active}
                                  aria-pressed={active}
                                  aria-label={translatePresetOptionLabel(option.id, option.label, locale)}
                                  type="button"
                                  onClick={() => selectPreset(option.id)}
                                >
                                  <PresetOptionPreview optionId={option.id} />
                                </button>
                                {showParams ? (
                                  <WritingParamControls
                                    optionId={option.id}
                                    params={project.theme.motion.writingParams}
                                    onChange={updateWritingParam}
                                  />
                                ) : null}
                                <span className="preset-option-name">
                                  <span>{translatePresetOptionLabel(option.id, option.label, locale)}</span>
                                  {active && builderUI.showDebugBadges ? (
                                    <em className="preset-option-badge">{copy.shell.presetRail.activeBadge}</em>
                                  ) : null}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                    {selectedPresetGroup.id === "composer" ? (
                      <WelcomeSettingsPanel
                        greeting={project.welcome.greeting}
                        onChange={updateWelcomeGreeting}
                        onActivate={previewWelcomeState}
                      />
                    ) : null}
                    </>
                  )}
                  {selectedPresetGroup.id === "conversation" ? (
                    <>
                      {(
                        [
                          {
                            title: copy.shell.editor.messageActions.sentTitle,
                            items: [
                              { key: "userCopy", label: copy.shell.editor.messageActions.copy, Icon: Copy },
                              { key: "userEdit", label: copy.shell.editor.messageActions.edit, Icon: Pencil },
                              { key: "userTime", label: copy.shell.editor.messageActions.time, Icon: Clock3 },
                            ],
                          },
                          {
                            title: copy.shell.editor.messageActions.generatedTitle,
                            items: [
                              { key: "agentCopy", label: copy.shell.editor.messageActions.copy, Icon: Copy },
                              { key: "agentRegenerate", label: copy.shell.editor.messageActions.regenerate, Icon: RotateCcw },
                              { key: "agentEdit", label: copy.shell.editor.messageActions.edit, Icon: Pencil },
                              { key: "agentTime", label: copy.shell.editor.messageActions.time, Icon: Clock3 },
                            ],
                          },
                        ] as const
                      ).map((group) => (
                        <section className="preset-option-section" key={group.title}>
                          <h3>{group.title}</h3>
                          <div className="message-action-picker" role="group" aria-label={group.title}>
                            {group.items.map((item) => {
                              const active = messageActionActive(item.key);
                              return (
                                <button
                                  key={item.key}
                                  type="button"
                                  className="message-action-choice"
                                  data-active={active}
                                  aria-pressed={active}
                                  aria-label={item.label}
                                  title={item.label}
                                  onClick={() => setMessageAction(item.key, !active)}
                                >
                                  <item.Icon size={14} />
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </>
                  ) : null}
                    </>
                  )}
                </div>
              </aside>
              </div>
            </div>
          ) : null}

          <main ref={builderSurfaceRef} className="builder-surface" data-output-zone="generated-scaffold">
            {workspaceView === "preview" || surfaceMode === "saved-preview" ? (
              <>
                <div
                  ref={previewFrameRef}
                  className="preview-frame"
                  data-has-sidebar={hasSidebar}
                  data-has-right-panel={rightPanelVisible}
                  data-left-collapsed={leftCollapsed}
                  data-right-collapsed={rightCollapsed}
                  data-style-preset={selectedPresetStyle}
                  data-appearance={themeTokens[activeProject.theme.preset].appearance}
                  data-theme-preset={activeProject.theme.preset}
                  data-preview-refreshing={previewRefreshing}
                >
                  {leftSidebarVisible ? renderSlots(visibleLayoutSlots, "sidebar", slotContext) : null}
                  {rightPanelVisible ? (
                    <PanelGroup className="preview-panels" orientation="horizontal">
                      <Panel defaultSize={`${activeProject.layout.mainSize}%`} minSize="52%">
                        <section className="preview-stack" data-welcome={isWelcome ? "true" : undefined}>
                          {renderSlots(visibleLayoutSlots, "main", slotContext)}
                          {renderSlots(visibleLayoutSlots, "composer", slotContext)}
                          {externalApprovalOverlay}
                          {inlineApprovalOverlay}
                        </section>
                      </Panel>
                      <PanelResizeHandle className="resize-handle" />
                      <Panel defaultSize={`${activeProject.layout.rightPanelSize}%`} minSize="24%">
                        <aside className="right-panel">
                          {renderSlots(visibleLayoutSlots, "right-panel", slotContext)}
                        </aside>
                      </Panel>
                    </PanelGroup>
                  ) : (
                    <section className="preview-stack preview-stack-solo" data-welcome={isWelcome ? "true" : undefined}>
                      {renderSlots(visibleLayoutSlots, "main", slotContext)}
                      {renderSlots(visibleLayoutSlots, "composer", slotContext)}
                      {externalApprovalOverlay}
                      {inlineApprovalOverlay}
                    </section>
                  )}
                  {hasSidebar && leftCollapsed && !autoHiddenRails.left ? (
                    <button
                      type="button"
                      className="rail-icon-btn preview-rail-float"
                      data-side="left"
                      aria-label={copy.shell.editor.expandSidebar}
                      onClick={() => setLeftCollapsed(false)}
                    >
                      <span className="native-rail-icon"><SidebarRailIcon size={15} /></span>
                      <span className="legacy-rail-icon"><PanelLeft size={15} /></span>
                    </button>
                  ) : null}
                  {hasRightPanel && rightCollapsed && !autoHiddenRails.right && !isWelcome ? (
                    <button
                      type="button"
                      className="rail-icon-btn preview-rail-float"
                      data-side="right"
                      aria-label={copy.shell.editor.expandPanel}
                      onClick={() => setRightCollapsed(false)}
                    >
                      <span className="native-rail-icon"><RightSidebarRailIcon size={15} /></span>
                      <span className="legacy-rail-icon"><PanelRight size={15} /></span>
                    </button>
                  ) : null}
                  {outputModalOpen ? (
                    <OutputPanelModal
                      items={outputPanelItems}
                      activeId={activeOutputPanelItemId}
                      onSelectItem={setActiveOutputPanelItemId}
                      onCloseItem={closeOutputPanelItem}
                      onClose={() => setOutputModalOpen(false)}
                    />
                  ) : null}
                </div>
                {previewOverlaySlots.length > 0 ? (
                  <aside className="preview-overlay-surface" data-preview-region="overlay">
                    {previewOverlaySlots}
                  </aside>
                ) : null}
              </>
            ) : (
              <section className="debug-surface">
                {renderSlots(visibleLayoutSlots, "bottom-dock", slotContext)}
              </section>
            )}
          </main>
        </div>

        {builderUI.showDebugBadges ? (
          <footer className="schema-strip">
            {projectPresetSummary(project).map((item) => (
              <code key={item}>{item}</code>
            ))}
          </footer>
        ) : null}
      </div>
      </IconStyleProvider>
    </>
  );
}
