import {
  Blocks,
  CircleAlert,
  Cpu,
  File,
  GitBranch,
  LayoutTemplate,
  ImagePlay,
  MessagesSquare,
  PackageCheck,
  Palette,
  PanelLeft,
  PanelRightOpen,
  PenLine,
  Plug,
  ShieldQuestionMark,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { AgentCanvasRegion, AgentFrontendProject, SlotConfig } from "../../schema/agentuxConfig";

import type { IconSlot, ScenarioId } from "../../agentmatrix";
import type { StateCard, StateCardAnim, StateCardTone } from "../../components/agentmatrix/StateGallery";
import { previewCopy } from "../../i18n/copy/preview";
import type { AppLocale } from "../../i18n/uiCopy";
import type { PreviewScenarioId } from "../../preview-runner/PreviewRunner";
import type { PresetStyleId } from "../../schema/agentuxConfig";
import { isPresetOptionActive, togglePresetOption } from "../../schema/presetActions";
import { presetGroups } from "../../schema/presets";
import type { PresetGroupId, PresetOption } from "../../schema/presets";
import { themeTokens } from "../../theme/themeTokens";

/**
 * The rail's top level, modelled on Figma's left rail (File / Assets / Tools /
 * Variables): four destinations, each owning what the second column shows.
 *
 * This replaces the previous top level — four quiet section labels over
 * thirteen preset groups — which put every one of the thirteen at the same
 * depth as its neighbours. `presetRailSections` is not deleted; it moves down a
 * level and becomes the structure *inside* "components".
 */
export type NavSectionId = "file" | "structure" | "theme" | "components" | "model" | "git";

export const navSections: {
  id: NavSectionId;
  icon: LucideIcon;
  label: Record<AppLocale, string>;
}[] = [
  { id: "file", icon: File, label: { en: "File", zh: "File", ja: "File" } },
  // Structure and Components were the two halves of one list; splitting them
  // into destinations puts the same question at the top level — am I shaping
  // the layout, or what happens inside it — instead of inside a panel.
  { id: "structure", icon: LayoutTemplate, label: { en: "Structure", zh: "架构", ja: "構成" } },
  { id: "theme", icon: Palette, label: { en: "Theme", zh: "主题", ja: "テーマ" } },
  { id: "components", icon: Blocks, label: { en: "Components", zh: "组件", ja: "コンポーネント" } },
  { id: "model", icon: Cpu, label: { en: "Model", zh: "大模型", ja: "モデル" } },
  { id: "git", icon: GitBranch, label: { en: "Git", zh: "Git", ja: "Git" } },
];

/**
 * Which preset groups a destination owns.
 *
 * `presetRailSections` still holds the grouping; this maps a destination onto
 * the section it shows, so a destination's group list and the "which group do I
 * open when switching here" answer come from one place rather than two.
 *
 * A function, not a const: `presetRailSections` is declared further down this
 * file, and an eagerly-initialised object reading it would throw at module load
 * — a temporal dead zone that typechecks cleanly and fails at runtime.
 *
 * Theme, Model and Git own a single group each.
 */
export function groupsForNavSection(section: NavSectionId): PresetGroupId[] {
  if (section === "theme") return ["theme"];
  if (section === "model") return ["provider"];
  if (section === "git") return ["git"];
  const sectionId = section === "structure" ? "structure" : "event-flow";
  return presetRailSections.find((entry) => entry.id === sectionId)?.groupIds ?? [];
}

/** The group a destination should open on, keeping the current one if it fits. */
export function resolveGroupForNavSection(section: NavSectionId, current: PresetGroupId): PresetGroupId | null {
  const groups = groupsForNavSection(section);
  if (groups.length === 0) return null;
  return groups.includes(current) ? current : groups[0];
}

/**
 * Canvas regions as layer rows.
 *
 * Derived from `layout.regions`, which the schema has always declared and
 * validated (`agentuxConfig.ts`) but never used to drive anything — the canvas
 * inferred its columns from whichever slots happened to be enabled. Reading the
 * field directly is what lets an empty configuration still show three columns.
 *
 * `main` and `composer` are one row: they are two regions in the schema but one
 * column on screen, and the reference draws three frames, not four.
 */
export const REGION_LAYERS: { id: string; regions: AgentCanvasRegion[]; label: Record<AppLocale, string> }[] = [
  { id: "left", regions: ["sidebar"], label: { en: "Left column", zh: "左栏", ja: "左カラム" } },
  { id: "center", regions: ["main", "composer"], label: { en: "Center column", zh: "中栏", ja: "中央カラム" } },
  { id: "right", regions: ["right-panel"], label: { en: "Right column", zh: "右栏", ja: "右カラム" } },
  { id: "bottom", regions: ["bottom-dock"], label: { en: "Bottom dock", zh: "底部坞", ja: "下部ドック" } },
  { id: "overlay", regions: ["overlay"], label: { en: "Overlay", zh: "浮层", ja: "オーバーレイ" } },
];

/** Layer rows for a project: a row shows when the layout declares its region. */
export function layersForRegions(regions: readonly AgentCanvasRegion[]) {
  return REGION_LAYERS.filter((layer) => layer.regions.some((region) => regions.includes(region)));
}

/**
 * Display name per slot component. These are the things a column can hold, so
 * they are what a layer expands to show.
 *
 * `layout.slots` already carries `{ region, component, enabled }` — what is in
 * which column is recorded data, not something to be inferred. An untouched
 * project has every slot disabled, which is why the layer list starts empty.
 */
export const SLOT_COMPONENT_LABELS: Record<SlotConfig["component"], Record<AppLocale, string>> = {
  SessionSidebar: { en: "Session list", zh: "会话列表", ja: "セッション一覧" },
  ChatFrame: { en: "Conversation", zh: "对话流", ja: "会話フロー" },
  ComposerFrame: { en: "Composer", zh: "输入框", ja: "入力欄" },
  OutputFrame: { en: "Output panel", zh: "输出面板", ja: "出力パネル" },
  GitFrame: { en: "Git panel", zh: "Git 面板", ja: "Git パネル" },
  ExportFrame: { en: "Export panel", zh: "导出面板", ja: "エクスポート" },
  DebugDock: { en: "Debug dock", zh: "调试坞", ja: "デバッグドック" },
  CapabilityTray: { en: "Capability tray", zh: "能力托盘", ja: "機能トレイ" },
};

/**
 * A layer and the components currently placed in it.
 *
 * This is what the topbar's "已选组件 N 套" counter describes, arranged by
 * column instead of by preset group — the question a layer list answers is
 * "what is in the left column", not "which groups did I touch".
 */
/**
 * Slot component → the CSS selector its root renders with.
 *
 * The canvas highlight has to find the element a Layers row refers to, and the
 * components render their own roots (`renderSlots` returns them directly, with
 * no wrapper to tag). Reading the class they already use avoids threading a
 * data attribute through five component signatures.
 */
export const SLOT_COMPONENT_SELECTORS: Partial<Record<SlotConfig["component"], string>> = {
  SessionSidebar: ".session-sidebar",
  ChatFrame: ".chat-frame",
  ComposerFrame: ".composer-frame",
  OutputFrame: ".artifact-frame",
  GitFrame: ".git-panel",
};

/**
 * Which column a preset group configures.
 *
 * Every group in Structure names a column outright. The event-flow groups all
 * describe the conversation column — a thinking indicator, an approval panel, a
 * tool card and a delivery block all render in `main`, so that is where their
 * options belong in the layer tree.
 *
 * `theme` and `provider` are absent on purpose: a palette and a model
 * connection are not modules in a column.
 */
export const PRESET_GROUP_REGIONS: Partial<Record<PresetGroupId, AgentCanvasRegion>> = {
  sidebar: "sidebar",
  conversation: "main",
  composer: "composer",
  output: "right-panel",
  git: "right-panel",
  "ux-effects": "main",
  approval: "main",
  "tool-calls": "main",
  blocks: "main",
  "media-generation": "main",
  // Output source and renderer describe the right panel's contents, which is
  // also how `isEffectiveSelectedComponent` treats them — they stop counting
  // when the panel is hidden.
  delivery: "right-panel",
};

/**
 * Presence toggles. Each one is the slot it turns on, so the slot child already
 * stands for it — listing both would put "会话列表" and "显示侧边栏" in the tree
 * as if they were two things.
 */
export const PRESENCE_OPTION_IDS = new Set([
  "sidebar-visible",
  "chat-visible",
  "composer-visible",
  "output-visible",
  "git-visible",
]);

/**
 * The element each layer row highlights on the canvas, by row id.
 *
 * Keyed by slot id and preset option id — the two things a layer row can be —
 * so a row points at the module it names rather than at the column that
 * contains it. `sessions` is the reason this map exists: it used to highlight
 * the whole `.session-sidebar`, which lit the entire left column when what the
 * row says is "the conversation list".
 *
 * CSS cannot be generated from this, so `app.css` carries one rule per entry;
 * `layerHighlightCoverage.test.ts` holds the two in step.
 */
export const LAYER_HIGHLIGHT_SELECTORS: Record<string, string> = {
  // Components.
  sessions: ".session-list",
  chat: ".chat-frame",
  composer: ".composer-frame",
  output: ".artifact-frame",
  git: ".git-panel",
  // Modules inside the left column.
  "sidebar-new-button": ".session-new",
  "sidebar-search": ".session-search-menu",
  "sidebar-grouping": ".session-group > h4",
  "sidebar-footer": ".session-footer",
};

/**
 * The preset option a slot row stands for.
 *
 * A slot row names a component, and the thing that puts that component on the
 * canvas is its presence toggle — so deleting the row is unticking that option,
 * which is exactly what "the component on the left goes unselected" means.
 */
const SLOT_PRESENCE_OPTIONS: Record<string, string> = {
  sessions: "sidebar-visible",
  chat: "chat-visible",
  composer: "composer-visible",
  output: "output-visible",
  git: "git-visible",
};

/**
 * The options that put a whole column on the canvas.
 *
 * The centre column is absent on purpose: it cannot be deleted, from the rail
 * or from the canvas. The right column lists both of its components, because
 * the column is gone only when nothing is left in it.
 */
export const LAYER_PRESENCE_OPTIONS: Record<string, readonly string[]> = {
  left: ["sidebar-visible"],
  right: ["output-visible", "git-visible"],
};

/**
 * Whether an option is something you *add*, as opposed to a variant you pick.
 *
 * Derived rather than listed: an additive option can be turned off, so toggling
 * it makes it inactive. A variant (the media placeholder style, the output
 * source, a motion curve) is one of a mutually exclusive set — applying it
 * again just re-picks the same value, so it stays active and no "none" state
 * exists. Listing them by hand would have been wrong within a release; this
 * cannot drift.
 *
 * It matters because variants are always active. Counting them as content would
 * mean the centre and right columns could never be empty, and the layer tree
 * would list a motion curve as if it were a module in a column.
 */
export function isAddedContentOption(project: AgentFrontendProject, optionId: string): boolean {
  if (PRESENCE_OPTION_IDS.has(optionId)) return false;
  if (!isPresetOptionActive(project, optionId)) return false;
  return !isPresetOptionActive(togglePresetOption(project, optionId), optionId);
}

/**
 * Which regions have had something chosen for them.
 *
 * The canvas shows only what has been picked: a column's presence toggle puts
 * the column there, and the components inside it appear as their contents are
 * chosen. Until then the column is an empty frame in the project's theme —
 * which is what makes the canvas what-you-see-is-what-you-get rather than a
 * demo that happens to be editable.
 *
 * Presence toggles are excluded, or every column would count as filled by
 * virtue of existing.
 */
export function regionsWithChosenContent(
  project: AgentFrontendProject,
  items: readonly { id: string; groupId: PresetGroupId }[],
): Set<AgentCanvasRegion> {
  const regions = new Set<AgentCanvasRegion>();
  for (const item of items) {
    if (!isAddedContentOption(project, item.id)) continue;
    const region = PRESET_GROUP_REGIONS[item.groupId];
    if (region) regions.add(region);
  }
  return regions;
}

/** The option a layer row edits or deletes, or null if it maps to none. */
export function optionIdForModule(moduleId: string): string | null {
  const presence = SLOT_PRESENCE_OPTIONS[moduleId];
  if (presence) return presence;
  const known = presetGroups.some((group) => group.options.some((option) => option.id === moduleId));
  return known ? moduleId : null;
}

/** Where in the rail an option lives, so "edit" can jump straight to it. */
export function railLocationForOption(
  optionId: string,
): { navSection: NavSectionId; groupId: PresetGroupId } | null {
  const group = presetGroups.find((entry) => entry.options.some((option) => option.id === optionId));
  if (!group) return null;
  const navSection = navSections
    .map((section) => section.id)
    .find((section) => groupsForNavSection(section).includes(group.id));
  return navSection ? { navSection, groupId: group.id } : null;
}

/** A row under a column: either the component itself, or something inside it. */
export type LayerChild = {
  /** Slot id, or preset option id. */
  id: string;
  label: string;
  kind: "slot" | "option";
};

/**
 * What each column holds, as rows.
 *
 * Two sources, because the canvas has two granularities. `layout.slots` records
 * the components a column contains (a session list, a composer). The preset
 * options record what is *inside* those components — a new-chat button, a
 * search field, date grouping. Both are modules on the canvas, so both belong
 * under the column: listing only the slots left "左栏" claiming to hold one
 * thing while the Structure panel offered four more inside it.
 */
export function layerContentsForProject(
  project: AgentFrontendProject,
  locale?: AppLocale,
  selectedOptions?: readonly { id: string; groupId: PresetGroupId; label: string }[],
) {
  return layersForRegions(project.layout.regions).map((layer) => {
    const filled = regionsWithChosenContent(project, selectedOptions ?? []);
    const slots = project.layout.slots.filter(
      (slot) => slot.enabled && layer.regions.includes(slot.region) && filled.has(slot.region),
    );
    const children: LayerChild[] = slots.map((slot) => ({
      id: slot.id,
      label: locale ? SLOT_COMPONENT_LABELS[slot.component][locale] : slot.component,
      kind: "slot",
    }));
    for (const option of selectedOptions ?? []) {
      // Variants are settings, not modules: a motion curve is not a thing
      // sitting in a column.
      if (!isAddedContentOption(project, option.id)) continue;
      const region = PRESET_GROUP_REGIONS[option.groupId];
      if (!region || !layer.regions.includes(region)) continue;
      // Only if the component it lives in is actually on the canvas. Several
      // groups have defaults enabled with no presence toggle of their own (an
      // avatar, a thinking effect), so without this the centre column listed a
      // dozen modules while holding nothing. Checked per region, not per layer:
      // the centre layer merges `main` and `composer`, and a composer with no
      // conversation should list composer options only.
      const regionFilled = project.layout.slots.some(
        (slot) => slot.enabled && slot.region === region,
      );
      if (!regionFilled) continue;
      children.push({ id: option.id, label: option.label, kind: "option" });
    }
    return { ...layer, components: slots, children };
  });
}

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
  "media-generation": ImagePlay,
  sidebar: PanelLeft,
  "ux-effects": Sparkles,
  approval: ShieldQuestionMark,
  "tool-calls": Wrench,
  blocks: CircleAlert,
  composer: PenLine,
  provider: Plug,
  // PanelRight is all but indistinguishable from the left nav's PanelLeft at
  // 16px; the open-arrow variant reads as a different glyph at a glance.
  output: PanelRightOpen,
  delivery: PackageCheck,
  theme: Palette,
  git: GitBranch,
};

/**
 * The rail is split along exactly two axes, and each one is named on screen, so
 * "which icon do I want?" has an answer the reader can reach without guessing:
 *
 *   架构 / Structure  — what the screen looks like when NOTHING is running.
 *                       One entry per layout region (see `layout.regions`).
 *   事件流 / Event flow — what appears, in order, once a turn IS running.
 *
 * The test a reader can apply themselves: can I see this in an empty new chat?
 * Yes → Structure. Only after sending a message → Event flow.
 *
 * Event-flow order follows the turn itself (thinking → tools → errors →
 * delivery), so the order is the onboarding: the top of the section is where a
 * turn starts.
 *
 * Known imprecision, deliberate for now: `conversation` and `output` each hold
 * options from BOTH axes (writing cadence is event flow; avatars and panel
 * visibility are structure). Both groups sit under Structure here because that
 * is their dominant content. Splitting them needs a `PresetGroupId` change,
 * which is the next step — not this one.
 */
export const presetRailSections: {
  id: string;
  label: Record<AppLocale, string>;
  groupIds: PresetGroupId[];
  /** Rendered collapsed on first paint — for groups that do not change the preview. */
  defaultCollapsed?: boolean;
}[] = [
  {
    id: "structure",
    label: { zh: "架构", en: "Structure", ja: "構成" },
    groupIds: ["sidebar", "conversation", "composer", "output"],
  },
  {
    // Turn order, so reading the section top to bottom is reading a run:
    // thinking → the reader is asked → tools execute → how it ended → the wait
    // for generated media → what comes back.
    id: "event-flow",
    label: { zh: "事件流", en: "Event flow", ja: "イベント" },
    groupIds: ["ux-effects", "approval", "tool-calls", "blocks", "media-generation", "delivery"],
  },
  {
    id: "appearance",
    label: { zh: "外观", en: "Appearance", ja: "外観" },
    groupIds: ["theme"],
  },
  {
    id: "integration",
    label: { zh: "接入", en: "Integration", ja: "接続" },
    groupIds: ["provider", "git"],
    defaultCollapsed: true,
  },
];

export const presetStyleOptions: Array<{
  id: PresetStyleId;
  label: Record<AppLocale, string>;
}> = [
  { id: "native", label: { en: "Native", zh: "原生风", ja: "ネイティブ" } },
  { id: "illustrated", label: { en: "Minimal", zh: "极简风", ja: "ミニマル" } },
  { id: "studio", label: { en: "Illustrated", zh: "插画风", ja: "イラスト" } },
  // Product name, so it is not translated.
  { id: "workbuddy", label: { en: "WorkBuddy", zh: "WorkBuddy", ja: "WorkBuddy" } },
];

// Every standard scenario is demoed under the existing UX preset group it
// exercises — no standalone blocks. Selecting one streams it into the current
// preview components.
export const presetGroupScenarios: Partial<Record<PresetGroupId, ScenarioId[]>> = {
  conversation: ["normal-turn"],
  "ux-effects": ["streamed-message"],
  // Follows the group that asks for the confirmation, not the composer that
  // renders it. A group whose components only appear in an edge case needs the
  // scenario that produces that edge case, or clicking it changes nothing on
  // screen and the reader cannot tell what they are configuring.
  approval: ["tool-approval"],
  "tool-calls": ["tool-approval", "mcp-and-interrupt"],
  blocks: ["retrying-incident", "exhausted-incident", "terminal-incident", "mcp-and-interrupt"],
  delivery: ["normal-turn", "runtime-lifecycle"],
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
    // A run the reader stopped is an outcome, so it sits with the other
    // terminal states rather than under the composer that hosts the button.
    { slot: "surface.interrupt", title: { en: "Interrupted", zh: "已中断", ja: "中断済み" }, code: "user.interrupt", tone: "warning" },
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
  // The four confirmation replies belong to the group that asks the question,
  // not to the composer they happen to be rendered above.
  approval: [
    { slot: "permission.allow", title: { en: "Allow once", zh: "允许一次", ja: "今回だけ許可" }, code: "user.tool_confirmation · allow_once", tone: "success" },
    { slot: "permission.allow_always", title: { en: "Allow always", zh: "始终允许", ja: "常に許可" }, code: "user.tool_confirmation · allow_always", tone: "success" },
    { slot: "permission.deny", title: { en: "Deny", zh: "拒绝", ja: "拒否" }, code: "user.tool_confirmation · deny", tone: "danger" },
    { slot: "permission.cancel", title: { en: "Cancel", zh: "取消", ja: "キャンセル" }, code: "user.tool_confirmation · cancel", tone: "neutral" },
  ],
  delivery: [
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
  blocks: [
    "status: cancelled",
    "retry_status: retrying",
    "retry_status: exhausted",
    "retry_status: terminal",
    "user.interrupt",
  ],
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
    approval: { zh: "确认动作", en: "Confirmation replies", ja: "確認の操作" },
    output: { zh: "运行状态", en: "Runtime states", ja: "実行時の状態" },
    delivery: { zh: "内容类型", en: "Content types", ja: "コンテンツの種類" },
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
  // The client shows no avatar on either side — the user's turn is a gray pill
  // and the agent's is bare text — so these are the plainest glyphs available;
  // the workbuddy stylesheet hides the avatar slots outright.
  workbuddy: {
    "author.user": "user",
    "author.agent": "bot",
  },
} as const satisfies Record<PresetStyleId, Record<"author.user" | "author.agent", string>>;

export const NATIVE_HIDDEN_USER_AVATAR_IDS = new Set(["user", "assistant-second-avatar", "user-third-avatar", "green-calm"]);
export const PREVIEW_RESPONSIVE_WIDTHS = {
  hideRightPanel: 860,
  hideLeftSidebar: 660,
} as const;
