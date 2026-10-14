import {
  Blocks,
  CheckCheck,
  CircleAlert,
  CircleStop,
  Cpu,
  GitBranch,
  LayoutTemplate,
  Layers,
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

import { ICON_OPTIONS, type IconSlot, type ScenarioId } from "../../agentmatrix";
import type { StateCard, StateCardAnim, StateCardTone } from "../../components/agentmatrix/StateGallery";
import { previewCopy } from "../../i18n/copy/preview";
import type { AppLocale } from "../../i18n/uiCopy";
import type { PreviewScenarioId } from "../../preview-runner/PreviewRunner";
import type { PresetStyleId } from "../../schema/agentuxConfig";
import { isPresetOptionActive, togglePresetOption } from "../../schema/presetActions";
import {
  gameThemePresetIds,
  handdrawnThemePresetIds,
  inkwashThemePresetIds,
  techThemePresetIds,
  pixelThemePresetIds,
  pixeldeskThemePresetIds,
  retroThemePresetIds,
  studioThemePresetIds,
  type ThemePresetId,
} from "../../theme/themeTokens";
import { presetGroups } from "../../schema/presets";
import type { PresetGroupId, PresetOption } from "../../schema/presets";
import { themeTokens } from "../../theme/themeTokens";

/**
 * The rail's top level, modelled on Figma's left rail (Assets / Tools /
 * Variables): a destination per question, each owning what the panel shows.
 *
 * This replaces the previous top level — four quiet section labels over
 * thirteen preset groups — which put every one of the thirteen at the same
 * depth as its neighbours. `presetRailSections` is not deleted; it moves down a
 * level and becomes the structure *inside* "components".
 */
export type NavSectionId = "layers" | "structure" | "components" | "model" | "git";

export const navSections: {
  id: NavSectionId;
  icon: LucideIcon;
  label: Record<AppLocale, string>;
}[] = [
  // Layers is back as the first destination, and Theme has left the column.
  //
  // The list spent a round in the canvas's own panel on the right, on the
  // grounds that it answers "what is on the canvas" while this column answers
  // "what could be". True, and the right panel now answers a third question —
  // which skin and which palette the whole thing wears — which is a *choice of
  // starting point*, not an inventory. So the inventory comes back to the
  // column it is read beside, and the two entry paths sit opposite each other:
  // build it up on the left, pick a ready-made look on the right.
  // Structure and Components were the two halves of one list; splitting them
  // into destinations puts the same question at the top level — am I shaping
  // the layout, or what happens inside it — instead of inside a panel.
  /*
   * Labels are cut to fit the rail rather than the rail widened to fit them.
   *
   * The icon column is 56px (`--iconbar-col`) and the tile keeps 1px of side
   * padding, so a 10px label has about 54px — roughly eight Latin characters.
   * "Structure" and "Components" are nine and ten, and both were clipped
   * mid-word. Neither can wrap out of it either: they are single words, so
   * there is no break opportunity, and `overflow-wrap` would only hyphenate
   * them in a worse place.
   *
   * Japanese was the worse case and is easy to miss from an English screen:
   * 「コンポーネント」is seven full-width characters, wider than the English it
   * translates. 部品 carries the same meaning in two.
   *
   * Chinese already fitted — two or three characters each — so it is unchanged.
   */
  { id: "layers", icon: Layers, label: { en: "Layers", zh: "图层", ja: "レイヤー" } },
  { id: "structure", icon: LayoutTemplate, label: { en: "Layout", zh: "架构", ja: "構成" } },
  // "Modules" rather than "Parts": the canvas toolbar already calls these
  // things modules (`ModuleToolbar`, 编辑/删除模块), and the two places the
  // reader meets them should agree.
  { id: "components", icon: Blocks, label: { en: "Modules", zh: "组件", ja: "部品" } },
  // 模型 rather than 大模型: two characters like the rest of the column, and
  // the same word the panel is titled with.
  { id: "model", icon: Cpu, label: { en: "Model", zh: "模型", ja: "モデル" } },
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
 * Model and Git own a single group each. Layers owns none — it shows the
 * canvas's layer list, not a preset group — so `resolveGroupForNavSection`
 * leaves whatever group was open alone, and glancing at the list does not lose
 * your place. Theme is no longer a destination here at all: its palettes are in
 * the canvas's own panel, beside the style they recolour.
 */
export function groupsForNavSection(section: NavSectionId): PresetGroupId[] {
  if (section === "layers") return [];
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

/** Layer rows for a set of regions: a row shows when the layout declares it. */
export function layersForRegions(regions: readonly AgentCanvasRegion[]) {
  return REGION_LAYERS.filter((layer) => layer.regions.some((region) => regions.includes(region)));
}

/**
 * The columns a project actually has — the single answer to "which columns
 * exist", for the canvas, the region labels and the layer tree alike.
 *
 * Declaring the region is not enough for a side column: it also needs a
 * component in it, which is what deleting the column takes away. The tree and
 * the labels used to read `layout.regions` directly while the canvas applied
 * this extra condition, so deleting 左栏 removed it from the canvas and left it
 * listed in the tree with its label still drawn over empty space.
 *
 * The centre column is exempt: it cannot be deleted, so it stays even when
 * empty — an empty centre still reads as the place a conversation will go.
 */
export function layersForProject(
  project: {
    layout: { regions: readonly AgentCanvasRegion[]; slots: readonly SlotConfig[] };
  },
  mounted?: ReadonlySet<SlotConfig["component"]>,
) {
  return layersForRegions(project.layout.regions).filter((layer) => {
    if (layer.id === "center") return true;
    return layer.regions.some((region) =>
      project.layout.slots.some(
        (slot) =>
          slot.region === region &&
          // Either its presence toggle is on — which is what the side columns'
          // toggles mean — or something in it has been picked, which brings the
          // column back along with the component.
          (slot.enabled || (mounted?.has(slot.component) ?? false)),
      ),
    );
  });
}

/**
 * Components whose presence toggle mounts them rather than creating a column.
 *
 * The presence toggles mean two different things, and which one depends on
 * whether the column can be deleted. 显示侧边栏 and 显示输出面板 put the left
 * and right *columns* on the canvas — untick either and the column is gone and
 * the centre takes the width. The centre column cannot be deleted, so its two
 * toggles have nothing to create: 显示对话流 and 显示输入框 mount the
 * conversation and the composer instead.
 *
 * That asymmetry is why the canvas can open with all three columns present and
 * nothing in them: the side columns' toggles are on, and mounting waits for
 * something to actually be picked.
 */
const PRESENCE_MOUNTS_COMPONENT = new Set<SlotConfig["component"]>(["ChatFrame", "ComposerFrame"]);

/**
 * Components that will not appear until their own toggle is ticked.
 *
 * Their toggle is visible in the rail, so mounting them because something
 * inside them was picked would put a thing on the canvas the reader had not
 * selected, while the control for it sat there unticked. Picking 思考中 used to
 * conjure a whole conversation that way.
 *
 * The components missing from this list are the ones whose toggle is hidden
 * (`RAIL_HIDDEN_OPTION_IDS`) — there is no control to bypass, so their contents
 * bring them along.
 */
const REQUIRES_OWN_PRESENCE = new Set<SlotConfig["component"]>(["ChatFrame", "GitFrame"]);

/**
 * Things in a component's own group that still do not summon it.
 *
 * The two avatars, and only them. They are on from the first frame in every
 * style — asked for, and recorded as a deliberate exception in
 * `emptyStructureProject` — which turned out to defeat the premise of the empty
 * canvas: the projection emits `state:author.*` whenever those fields are set,
 * the rule below reads "something in the conversation's own group is picked",
 * and so the conversation mounted at boot with nothing clicked. The replay then
 * streamed a full turn into it — a question, a reasoning block, five tool rows,
 * a reply, an artifact card and an image — on a canvas that is supposed to open
 * blank for the reader to assemble. Measured on a fresh profile, not inferred.
 *
 * Reported as "初次打开，对话区应该是空的，是可以让用户自己选、自己搭配的".
 *
 * Excluding them here rather than turning them off keeps both answers true: a
 * face is not content the reader adds to a column, it is *who is speaking*, so
 * it should be ready the moment there is a conversation and should not be the
 * thing that creates one. Every other option in the group still summons the
 * component — picking 说话人标签 or a bubble style brings the conversation with
 * it, which is the rule this set is a hole in, not a repeal of.
 */
const SUMMONS_NOTHING: ReadonlySet<string> = new Set(["state:author.user", "state:author.agent"]);

/**
 * The group each component belongs to — the one holding its presence toggle.
 *
 * Several groups render *into* a component: a thinking effect and a tool card
 * both appear in the conversation. Only one group is the conversation's own,
 * and that distinction is what decides whether picking something summons the
 * component it needs.
 */
const COMPONENT_OWNER_GROUP: Record<string, PresetGroupId> = {
  SessionSidebar: "sidebar",
  ChatFrame: "conversation",
  ComposerFrame: "composer",
  OutputFrame: "output",
  GitFrame: "git",
};

/**
 * What the canvas should render.
 *
 * A component appears as soon as something inside it is picked — no second step
 * of ticking its own presence toggle first, which is what made picking 我的头像
 * or 名称标签 look broken: the option was on and had nowhere to show.
 */
export function mountedComponentsForProject(
  project: AgentFrontendProject,
  items: readonly { id: string; groupId: PresetGroupId }[],
  picked: readonly string[] = [],
): Set<SlotConfig["component"]> {
  const mounted = componentsWithChosenContent(project, items, picked);
  for (const slot of project.layout.slots) {
    if (slot.enabled && PRESENCE_MOUNTS_COMPONENT.has(slot.component)) mounted.add(slot.component);
  }
  /*
   * Anything that needs its own toggle drops out again unless it has one — or
   * unless the pick came from its own group.
   *
   * Picking 用户头像 is configuring the conversation, in the very group that
   * turns the conversation on, so it should appear; the reader is not being
   * surprised by a component they were not looking at. Picking 思考中 is a
   * different destination reaching in, and that stays refused — the event flow
   * says what is missing instead.
   */
  for (const component of REQUIRES_OWN_PRESENCE) {
    const enabled = project.layout.slots.some((slot) => slot.component === component && slot.enabled);
    const ownGroup = COMPONENT_OWNER_GROUP[component];
    const pickedInOwnGroup = [...items, ...picked.flatMap((id) => {
      const groupId = OPTION_GROUP_IDS.get(id);
      return groupId ? [{ id, groupId }] : [];
    })].some(
      (item) =>
        item.groupId === ownGroup
        && !SUMMONS_NOTHING.has(item.id)
        && isAddedContentOption(project, item.id),
    );
    if (!enabled && !pickedInOwnGroup) mounted.delete(component);
  }
  return mounted;
}

/**
 * Whether the event-flow destination can be used yet.
 *
 * Every stage renders inside the conversation, and the conversation no longer
 * appears just because a stage was picked — so without one, a pick there would
 * change nothing on the canvas. The rail says so instead of accepting a pick
 * that does nothing.
 */
export function isEventFlowReady(
  project: AgentFrontendProject,
  items: readonly { id: string; groupId: PresetGroupId }[],
  picked: readonly string[] = [],
): boolean {
  return mountedComponentsForProject(project, items, picked).has("ChatFrame");
}

/** The project's slots, enabled exactly where the canvas should draw them. */
export function canvasSlotsForProject(
  project: AgentFrontendProject,
  items: readonly { id: string; groupId: PresetGroupId }[],
  picked: readonly string[] = [],
): SlotConfig[] {
  const mounted = mountedComponentsForProject(project, items, picked);
  return project.layout.slots.map((slot) => ({ ...slot, enabled: mounted.has(slot.component) }));
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
  "thinking-done": "main",
  approval: "main",
  "tool-calls": "main",
  blocks: "main",
  interrupt: "main",
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
 * contains it. The conversation list is the reason this map exists: it used to
 * highlight the whole `.session-sidebar`, which lit the entire left column when
 * what the row says is "the conversation list".
 *
 * The sidebar has no component row of its own here (see
 * `FULLY_ENUMERATED_COMPONENTS`): every part of it is a module below, and a
 * `.session-sidebar` entry would swallow every click in the column — the empty
 * left column renders with that same class, so it would also answer for a
 * component that is not there.
 *
 * CSS cannot be generated from this, so `app.css` carries one rule per entry;
 * `layerHighlightCoverage.test.ts` holds the two in step.
 */
export const LAYER_HIGHLIGHT_SELECTORS: Record<string, string> = {
  // Components.
  chat: ".chat-frame",
  composer: ".composer-frame",
  output: ".artifact-frame",
  git: ".git-panel",
  // Modules inside the left column, top to bottom.
  "sidebar-title": ".session-brand-name",
  "sidebar-collapse": ".session-collapse",
  "sidebar-new-button": ".session-new",
  "sidebar-search": ".session-search-menu",
  "sidebar-sessions": ".session-list",
  "sidebar-grouping": ".session-group > h4",
  "sidebar-footer": ".session-footer",
  /*
   * The finer things a turn is made of, keyed by the option that put them
   * there.
   *
   * That key is the whole trick: `optionIdForModule` answers with the module id
   * itself when it is a real option id, so an entry here needs nothing else —
   * the toolbar finds the option, Edit jumps to it in the rail
   * (`railLocationForOption`), and Delete appears only when the option is
   * currently on (`isPresetOptionActive`). Which is also the "some can be
   * deleted, some can only be edited" the reader described: an on/off feature
   * offers both, and anything that is not a toggle offers Edit alone.
   *
   * Avatars, the thinking glyph, the tool status mark and the row marks are
   * deliberately *not* here: those are state cards driven by a `toggleKey` on
   * the project rather than by a preset option, so the toolbar cannot resolve
   * them yet. They need a second kind of target, which is a change to the
   * toolbar rather than a line in this map.
   */
  /*
   * The two avatars, keyed `card:*`.
   *
   * They are the one kind of canvas element whose rail counterpart is a *state
   * card* rather than a preset option: the gallery in 组件 → 对话区 → 头像 flips
   * `conversation.userAvatar` / `agentAvatar` directly. So the key cannot be an
   * option id — `optionIdForModule` would answer null and the toolbar would
   * have nothing to act on — and it must not be mistaken for one either, which
   * is what the prefix is for. `avatarFlagForModule` below reads it back.
   */
  "card:userAvatar": '.msg-avatar[data-role="user"]',
  "card:agentAvatar": '.msg-avatar[data-role="assistant"]',
  "speaker-labels": ".message-role, .assistant-turn-label",
  "message-actions": ".message-actions",
  "prompt-shortcuts": ".prompt-shortcuts",
  // The right panel's three run sections, each keyed by the option that adds it.
  "task-list": ".run-task-list",
  "exec-progress": ".run-progress",
  "workspace-files": ".workspace-files",

  /*
   * The parts a component is *made of*, keyed `group:<groupId>`.
   *
   * The third kind of target, after an option id and `card:`. It exists because
   * the CSS that draws the hover outline and this map had drifted apart: the
   * outline rule in app.css lists forty elements, this map covered twelve of
   * them, and for the other twenty-eight `moduleIdAtTarget` found nothing and
   * fell back to the *column*. Measured: hovering 正在读取文件 drew an 84×18
   * outline around the title and put the toolbar 306px away at the top of the
   * centre column, where its Delete acted on everything in that column. The
   * same for 思考中, the tool status mark, the file row, the reply surface, the
   * artifact card, the output panel's tabs — reported as "these can each be
   * selected on their own, do they all have something in the left panel?".
   * They did not.
   *
   * These twenty-eight are not options, and most of them cannot be: a tool
   * card's title, its status mark and its file row are what a tool card *is* —
   * there is no toggle that removes the title and leaves the card. So they get
   * the reader's own rule: Edit jumps to the group that governs them, Delete is
   * not offered. `groupForModule` reads the prefix back, and
   * `moduleActions.test.ts` pins that every outlined element resolves to one of
   * the three kinds.
   */
  // A turn's own parts.
  "group:conversation/msg-surface": ".msg-surface",
  // 思考中 and 思考完成 both configure the reasoning block; the glyph belongs to
  // the first, which is where its gallery is.
  "group:ux-effects/reasoning-indicator": ".reasoning-indicator-slot",
  "group:thinking-done/reasoning-title": ".reasoning-title",
  "group:thinking-done/reasoning-body": ".reasoning-body",
  // The tool card, and the four things inside it.
  "group:tool-calls/tool-card": ".tool-card",
  "group:tool-calls/tool-status": ".tool-status-icon",
  "group:tool-calls/tool-title": ".tool-title",
  "group:tool-calls/tool-file-row": ".tool-file-row",
  "group:tool-calls/tool-body": ".tool-card-body",
  // Run state: the error rows and the step rows.
  "group:blocks/error-item": ".error-item",
  "group:blocks/step-item": ".step-item",
  // Delivery: the artifact card and what it launches.
  "group:delivery/artifact-card": ".artifact-launch-card",
  "group:delivery/artifact-icon": ".artifact-inline-icon",
  "group:delivery/artifact-open": ".artifact-action-open",
  "group:media-generation/image-inline": ".generated-image-inline",
  "group:media-generation/media-inline": ".generated-media-inline",
  // The right panel's chrome and its four preview surfaces.
  "group:output/utility-header": ".utility-header",
  "group:delivery/source-switch": ".output-source-switch",
  "group:output/tabs": ".output-tabs",
  "group:output/opened-item": ".opened-output-item",
  "group:delivery/markdown": ".markdown-preview",
  "group:delivery/image": ".image-output-preview",
  "group:delivery/html": ".html-output-preview",
  "group:media-generation/player": ".media-player-card",
  // The composer's own controls.
  "group:approval/permission-trigger": ".permission-mode-trigger",
  "group:composer/prompt-row": ".composer-prompt-row",
  "group:composer/send": ".ui-button.send-button",
  upload: ".composer-upload",
  mic: ".composer-voice",
  budget: ".budget-mode-trigger",
  "model-config": ".provider-model-picker, .combined-model-budget-trigger",
  /*
   * ── Rows that pointed at nothing ────────────────────────────────────────
   *
   * Measured against every row the tree can show: 44 rows, 18 with a
   * highlight, 26 without. Clicking one of those 26 selected it in the rail
   * and left the canvas unchanged — which reads as the canvas being broken
   * rather than as the row having nothing to point at.
   *
   * Three different problems, not 26 missing selectors. See each note.
   * ──────────────────────────────────────────────────────────────────────── */
  /* Row marks — the glyph in front of each conversation row. */
  "sidebar-row-icon": ".session-item-icon",
  /* The two avatars were a *key* mismatch, not a missing target: the same
     elements are already here under `card:*`, which is what the gallery in
     组件 uses. The layer rows arrive keyed `state:author.*`. Both kept, so
     each surface reaches the element by its own name. */
  "state:author.user": ".msg-avatar[data-role=\"user\"]",
  "state:author.agent": ".msg-avatar[data-role=\"assistant\"]",
  /* A row per action, but the actions share one strip — so each points at
     its own turn's strip. `message-actions` above stays for the component
     row that owns the whole set. */
  "message-action:userCopy": ".message-item[data-role=\"user\"] .message-actions",
  "message-action:userEdit": ".message-item[data-role=\"user\"] .message-actions",
  "message-action:agentCopy": ".message-item[data-role=\"assistant\"] .message-actions",
  "message-action:agentRegenerate": ".message-item[data-role=\"assistant\"] .message-actions",
  "message-action:agentEdit": ".message-item[data-role=\"assistant\"] .message-actions",
  "message-action:agentTime": ".message-item[data-role=\"assistant\"] .message-actions",
  /* Variants have no element of their own, so they point at the thing they
     configure. A row that says 分块 cannot light a cadence — but it can light
     the block whose cadence it is, which is what a reader needs in order to
     see where the choice lands. */
  "thinking-sketch-page": ".reasoning-indicator-slot",
  "thinking-bars": ".reasoning-indicator-slot",
  "reasoning-writing-chunked": ".reasoning-body",
  "reasoning-model-thinking": ".reasoning-body",
  "reasoning-done-conclusion": ".reasoning-title",
  "reasoning-done-first-line": ".reasoning-body",
  "reasoning-done-rule": ".reasoning-body",
  "compact-chips": ".tool-card",
  "timeline-rail": ".tool-card",
  "tool-detail-output-only": ".tool-card-body",
  "tool-progress-bar": ".tool-card",
  "model-tools": ".tool-card",
  "tool-approval-hidden": ".tool-card",
  "media-image-layers": ".generated-image-inline",
  /* Each to its own block. These pointed at `.generated-media-inline`, which
     both kinds carry, so a video variant lit the audio block above it. */
  "media-audio-skeleton": ".generated-audio-inline",
  "media-audio-waveform": ".generated-audio-inline",
  "media-video-storyboard": ".generated-video-inline",
  "media-video-cinema": ".generated-video-inline",
  "media-video-timeline": ".generated-video-inline",
  "media-video-frames": ".generated-video-inline",
  "writing-chunked": ".msg-surface",
  "renderer-data": ".artifact-frame",
};

/**
 * Components whose every part is a preset option.
 *
 * The sidebar is nothing but its modules — title, collapse control, new chat,
 * search, conversation list, date headings, version — so a component row for it
 * would be a second name for the column that holds it, sitting directly above
 * the seven rows that say what is actually in there. Worse, it competed with
 * 内容模块 for which row means the list: both would point at `.session-list`,
 * and a canvas click has to resolve to one of them.
 */
/*
 * Components the tree lists the *parts* of rather than the container.
 *
 * `SessionSidebar` was here first: every piece of the left column — title,
 * search, list, footer — is its own row, so a row for the column itself would
 * have been a parent with nothing of its own to say.
 *
 * `ChatFrame` and `ComposerFrame` join it on the same grounds. Their parts are
 * already enumerated from the conversation and composer groups (speaker labels,
 * avatars, message actions, the upload and model controls), and neither is a
 * module the reader put in the centre column — the column *is* those two. A row
 * for each was a row that could not be removed and did not point at a choice.
 */
const FULLY_ENUMERATED_COMPONENTS = new Set<SlotConfig["component"]>([
  "SessionSidebar",
  "ChatFrame",
  "ComposerFrame",
]);

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
 * Which component each group configures.
 *
 * Finer than `PRESET_GROUP_REGIONS`, and the map the canvas mounts from: the
 * right column holds two components, so picking a Git option should bring the
 * Git panel and not the output panel with it.
 *
 * This is what makes "pick it and it appears" work. Mounting used to need the
 * component's own presence toggle *as well*, so picking 我的头像 or 名称标签
 * did nothing until 显示对话流 was ticked first — the option was on and had
 * nowhere to show.
 */
/** Every id the preset schema knows, so synthetic ids can be told apart. */
const presetOptionIds = new Set(
  presetGroups.flatMap((group) => group.options.map((option) => option.id)),
);

/**
 * Stages that are exits rather than steps — marked on the axis, but not claimed
 * to be part of the sequence.
 *
 * Empty for now. It held 结果报错 and 中断: an error can land while thinking,
 * mid tool call or at delivery, so neither was "after tools and before media".
 * Failure is part of 运行状态 now, which is the frame around the whole flow
 * rather than a stage in it, and 中断 is withheld (see below). The set stays
 * because the distinction is real and the next failure-only group will need it.
 */
export const FLOW_EXIT_GROUP_IDS = new Set<PresetGroupId>([]);

/**
 * Groups held back from the rail.
 *
 * `interrupt` is four unbuilt placeholders about stopping and resuming a turn.
 * In the protocol the stages now follow, stopping is part of the run's own
 * state and picking a turn back up is the next run's job — so its contents
 * belong in 运行状态 and 人机协作 as they get built, and until then the group
 * has nothing to show. Nothing is deleted: the options are still in
 * `presetGroups` with their behaviour, and putting the group back is deleting
 * a line from this set.
 */
export const RAIL_WITHHELD_GROUP_IDS = new Set<PresetGroupId>(["interrupt"]);

/** Whether a group belongs in the rail at all. */
export function isGroupShownInRail(groupId: PresetGroupId): boolean {
  return !RAIL_WITHHELD_GROUP_IDS.has(groupId);
}

/** Option id to the group that owns it. */
export const OPTION_GROUP_IDS = new Map(
  presetGroups.flatMap((group) => group.options.map((option) => [option.id, group.id] as const)),
);

export const PRESET_GROUP_COMPONENTS: Partial<Record<PresetGroupId, SlotConfig["component"]>> = {
  sidebar: "SessionSidebar",
  conversation: "ChatFrame",
  "ux-effects": "ChatFrame",
  "thinking-done": "ChatFrame",
  approval: "ChatFrame",
  "tool-calls": "ChatFrame",
  blocks: "ChatFrame",
  interrupt: "ChatFrame",
  "media-generation": "ChatFrame",
  composer: "ComposerFrame",
  output: "OutputFrame",
  delivery: "OutputFrame",
  git: "GitFrame",
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
  // Not every row in the selected-components list is a preset option. Avatars
  // arrive as `state:author.user` and message actions as `message-action:*`,
  // ids `isPresetOptionActive` has never heard of — it answered false, so
  // picking 用户头像 counted as nothing and the conversation stayed off the
  // canvas. The projection only emits these when the underlying field is on,
  // so their presence in the list *is* the answer.
  if (!presetOptionIds.has(optionId)) return true;
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
export function componentsWithChosenContent(
  project: AgentFrontendProject,
  items: readonly { id: string; groupId: PresetGroupId }[],
  /**
   * Clicked option ids. Needed for the same reason the timeline needs them: a
   * variant is always active, so only the click says it was asked for. Without
   * this, picking a thinking animation composed a conversation and then had no
   * conversation component to draw it in.
   */
  picked: readonly string[] = [],
): Set<SlotConfig["component"]> {
  const components = new Set<SlotConfig["component"]>();
  for (const item of items) {
    if (!isAddedContentOption(project, item.id)) continue;
    const component = PRESET_GROUP_COMPONENTS[item.groupId];
    if (component) components.add(component);
  }
  for (const optionId of picked) {
    const groupId = OPTION_GROUP_IDS.get(optionId);
    const component = groupId ? PRESET_GROUP_COMPONENTS[groupId] : undefined;
    if (component) components.add(component);
  }
  return components;
}

/** The same answer as a set of regions, for callers that think in columns. */
export function regionsWithChosenContent(
  project: AgentFrontendProject,
  items: readonly { id: string; groupId: PresetGroupId }[],
): Set<AgentCanvasRegion> {
  const components = componentsWithChosenContent(project, items);
  const regions = new Set<AgentCanvasRegion>();
  for (const slot of project.layout.slots) {
    if (components.has(slot.component)) regions.add(slot.region);
  }
  return regions;
}

/**
 * The option the toolbar's Edit jumps to for a whole column.
 *
 * Separate from `LAYER_PRESENCE_OPTIONS` because the two answer different
 * questions. Delete needs the options that put the column *there*, and the
 * centre has none — that is what makes it undeletable. Edit only needs
 * somewhere useful to land, and for the centre that is the conversation group:
 * reading Edit off the delete list left the centre's Edit button doing nothing.
 */
export const LAYER_EDIT_OPTIONS: Record<string, string> = {
  left: "sidebar-visible",
  center: "chat-visible",
  right: "output-visible",
};

/**
 * What a project needs before it can be previewed or exported.
 *
 * A conversation and a composer: an agent frontend the reader cannot read or
 * type into is not a frontend. The side columns are genuinely optional — plenty
 * of agent UIs are a single column — so they are not required here.
 *
 * Each entry carries the option that would satisfy it, which is the first
 * option of its group: the group's presence toggle, ordered first on purpose.
 */
export const REQUIRED_GROUP_IDS: readonly PresetGroupId[] = ["conversation", "composer"];

export type MissingRequirement = { groupId: PresetGroupId; optionId: string };

export function missingRequirementsForProject(
  project: AgentFrontendProject,
  items: readonly { id: string; groupId: PresetGroupId }[],
): MissingRequirement[] {
  const mounted = mountedComponentsForProject(project, items);
  const missing: MissingRequirement[] = [];
  for (const groupId of REQUIRED_GROUP_IDS) {
    const component = PRESET_GROUP_COMPONENTS[groupId];
    if (!component || mounted.has(component)) continue;
    const optionId = presetGroups.find((group) => group.id === groupId)?.options[0]?.id;
    if (optionId) missing.push({ groupId, optionId });
  }
  return missing;
}

/**
 * Whether an option should read as selected in the rail.
 *
 * Not simply "is it active in the project". For the variant groups one option
 * is always active by construction — `reasoning.show` has no off value, so some
 * thinking style is always set — and showing those as selected meant the rail
 * claimed a dozen picks while the canvas showed nothing. That is the
 * contradiction: selected has to mean the canvas is showing it.
 *
 * So: an additive option reads its own state, and a variant reads as selected
 * only if it was picked *and* is the one currently in force — picking a second
 * variant in the same section must unselect the first.
 *
 * Themes are the exception. A palette is a variant with no off state, but the
 * canvas genuinely shows it, so the project's own answer is the honest one.
 */
export function isOptionSelectedInRail(
  project: AgentFrontendProject,
  option: { id: string },
  groupId: PresetGroupId,
  picked: readonly string[] = [],
  /** Components the canvas is drawing, for the presence toggles below. */
  mounted?: ReadonlySet<SlotConfig["component"]>,
): boolean {
  if (groupId === "theme") return isPresetOptionActive(project, option.id);
  // A presence toggle ticks when its component is on the canvas, however it
  // got there. Picking 思考中 brings the conversation with it, and reading only
  // the toggle's own state left 显示对话流 unticked while a conversation was
  // plainly showing — the rule broken in the other direction: the canvas
  // showing something no control claims.
  if (PRESENCE_OPTION_IDS.has(option.id)) {
    const component = PRESET_GROUP_COMPONENTS[groupId];
    if (mounted && component) return mounted.has(component);
    return isPresetOptionActive(project, option.id);
  }
  /*
   * A thinking motion is a style's look before it is anyone's choice: every
   * style puts its own on when it is entered. Turning one off falls back to a
   * different motion, so it passed the added-content test below and counted
   * as picked — switching style added one to 已选 and ticked a card the
   * reader never touched. Picked, or not selected.
   */
  if (ALL_STYLE_MOTION_IDS.has(option.id)) {
    return picked.includes(option.id) && isPresetOptionActive(project, option.id);
  }
  if (isAddedContentOption(project, option.id)) return true;
  return picked.includes(option.id) && isPresetOptionActive(project, option.id);
}

/**
 * Options hidden from the rail.
 *
 * Controls that can only ever be on, which is not a choice. The two side
 * columns' toggles, because the canvas opens with three columns; and the
 * composer's, because an agent frontend without a way to type is not one, so
 * it is there from the start.
 *
 * All three stay in the schema. The canvas toolbar's delete still turns the
 * column ones off — a column is removed there, not here.
 */
export const RAIL_HIDDEN_OPTION_IDS = new Set([
  "sidebar-visible",
  "output-visible",
  "composer-visible",
  /*
   * `chat-visible` was here, on the reasoning that an agent frontend with
   * nowhere to read the reply is not one, so the conversation should be a thing
   * the canvas simply has.
   *
   * It had to come back out when 空白 became the opening style. The three above
   * are hidden because they can only ever be on — hiding a control that cannot
   * be off is honest. The conversation *is* off at the start now, so hiding it
   * left the canvas with no way to turn the middle column's contents on at all.
   * A control that is the only route to a state cannot be hidden.
   *
   * The conversation group's own options reach it too — picking 说话人标签 or an
   * avatar mounts the ChatFrame, via the `pickedInOwnGroup` branch in
   * `mountedComponentsForProject` — so this is the plainest of several routes,
   * not the only one.
   */
]);

/**
 * Options held back from the rail by choice.
 *
 * Not always-on controls and not unbuilt — these work, but they are scope the
 * product is not asking the reader to think about yet. Which reasoning kinds a
 * provider exposes, and whether a summary precedes the detail, are decisions
 * about the model's output rather than about the interface being drawn here.
 *
 * They stay wired to their project fields, so the values they set still hold
 * and putting them back is deleting a line from this set.
 */
const RAIL_WITHHELD_OPTION_IDS = new Set([
  "reasoning-status-only",
  "reasoning-public-summary",
  "reasoning-model-thinking",
  "summary-first",
  // The Disclosure pair. Folding and unfolding the thinking block is something
  // the reader does *on the block* — hover the header, click the chevron — so
  // offering it a second time as two cards in the rail is the same decision
  // presented twice, in the place where it cannot be seen taking effect.
  //
  // Withheld rather than deleted, like the four above: the fields they set are
  // still live and the style kit still chooses between them, so a project keeps
  // a sensible starting fold. Putting the cards back is deleting two lines.
  "reasoning-auto-collapse",
  "reasoning-expanded",
  /*
   * 设置齿轮 — the provider-settings launcher in the generated agent's
   * bottom-left corner. Pulled on request ("先不要了"), and withheld rather
   * than deleted for exactly the reason this set exists: the id is referenced
   * from seven other places — `previewActions`, `selectedComponents`,
   * `presetFixture`, `presetPreviewTarget`, the preset copy and the exported
   * scaffold's own `ProviderSettings` — so deleting it would leave dangling
   * references behind a change that was described as temporary.
   *
   * `providers.settingsLauncher` defaults to `false`, so with no control left
   * the launcher never appears. Putting it back is deleting this entry — and
   * restoring the row in `ProviderSettingsPanel`, which went with it.
   */
  "provider-settings-launcher",
]);

/**
 * Whether an option belongs in the rail at all.
 *
 * Named-but-unbuilt options are out. They were there to show the shape of what
 * is coming, but as inert dimmed cards among live ones they read as things that
 * ought to work — a choice that cannot be made is not worth the space. They
 * stay in the schema, so the list of what this product intends to cover is
 * still complete in one place.
 */
export function isOptionShownInRail(
  option: { id: string; pending?: boolean },
  stylePreset?: PresetStyleId,
): boolean {
  /*
   * The style's own motions, and only those.
   *
   * Filtered here rather than in the rail so there is one place an option can
   * be hidden. A motion not in this style's list is not merely a worse choice —
   * outside the style it was drawn for it has no keyframes at all, so the card
   * would set a value the canvas cannot animate.
   *
   * Keyed off membership in *any* style's list, so a non-motion option is never
   * touched by this branch.
   */
  if (stylePreset && ALL_STYLE_MOTION_IDS.has(option.id)) {
    if (!styleMotionOptionIds(stylePreset).includes(option.id)) return false;
  }
  return (
    !option.pending &&
    !RAIL_HIDDEN_OPTION_IDS.has(option.id) &&
    !RAIL_WITHHELD_OPTION_IDS.has(option.id)
  );
}

/** The option a layer row edits or deletes, or null if it maps to none. */
/**
 * The project flag a `card:*` module id names, or null for everything else.
 *
 * One reader for the prefix, so the toolbar's three consumers — where it
 * points, whether Delete is offered, what Delete does — cannot disagree about
 * what a card target is.
 */
export function avatarFlagForModule(moduleId: string): "userAvatar" | "agentAvatar" | null {
  if (moduleId === "card:userAvatar") return "userAvatar";
  if (moduleId === "card:agentAvatar") return "agentAvatar";
  /*
   * The same two things under the name the *layer tree* gives them.
   *
   * The gallery in 组件 → 对话区 calls them `card:*`; `selectedComponents` emits
   * `state:author.*` for the same avatars, because there they are project state
   * (`conversation.userAvatar` / `agentAvatar`) rather than cards. One function
   * answering to both spellings is what lets a layer row resolve to the avatar
   * at all — it returned null for `state:*`, so the toolbar had nothing to act
   * on and Edit could not jump to the gallery.
   */
  if (moduleId === "state:author.user") return "userAvatar";
  if (moduleId === "state:author.agent") return "agentAvatar";
  return null;
}

/**
 * The message-action rows, by the action they name.
 *
 * The third kind of row id that is not a preset option, after `card:*` and
 * `state:*` — `selectedComponents` emits one per action from
 * `conversation.messageActions`, which is project state rather than a card in
 * a group. `isAddedContentOption` already carries the note about why these ids
 * exist; this is what lets a caller tell them apart from an option id.
 */
export function messageActionKeyForModule(moduleId: string): string | null {
  return moduleId.startsWith("message-action:")
    ? moduleId.slice("message-action:".length)
    : null;
}

/** The group whose gallery holds the avatars, for "edit". */
export const AVATAR_CARD_GROUP_ID: PresetGroupId = "conversation";

/**
 * The group a canvas part belongs to, for the `group:<groupId>/<name>` targets.
 *
 * The name after the slash is only there to keep the keys unique — two parts of
 * one component would otherwise collide. Nothing reads it.
 */
export function groupForModule(moduleId: string): PresetGroupId | null {
  if (!moduleId.startsWith("group:")) return null;
  const groupId = moduleId.slice("group:".length).split("/")[0] as PresetGroupId;
  return presetGroups.some((group) => group.id === groupId) ? groupId : null;
}

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

/** Where a whole group lives, so "edit" can land on it without an option. */
export function railLocationForGroup(
  groupId: PresetGroupId,
): { navSection: NavSectionId; groupId: PresetGroupId } | null {
  const navSection = navSections
    .map((section) => section.id)
    .find((section) => groupsForNavSection(section).includes(groupId));
  return navSection ? { navSection, groupId } : null;
}

/**
 * The option a part's Edit should *land on*, where one owns it.
 *
 * Landing on the group is enough to be useful; landing on the card that
 * configures the thing you pointed at is the difference between "here is the
 * panel" and "here is the setting". So: the error row lands on 错误收起, the
 * settled title on 纯文字标签, the markdown surface on Markdown 渲染器, the
 * permission pill on 请求权限.
 *
 * Deliberately partial, and the line is not taste: a part is pinned only when
 * one option — or the section it belongs to — *is* that element. A tool card's
 * title has no such option, and `.tool-card` has three alternatives for how it
 * displays, so pinning one of them would flash a card the reader may not have
 * chosen. Those stay at group level.
 *
 * Every id here has to live in the group its key names, or Edit would navigate
 * to one place and highlight something in another; `moduleActions.test.ts`
 * checks that.
 */
export const PART_PINNED_OPTIONS: Record<string, string> = {
  "group:conversation/msg-surface": "chat-visible",
  "group:thinking-done/reasoning-title": "reasoning-done-label",
  "group:thinking-done/reasoning-body": "reasoning-done-expandable",
  "group:tool-calls/tool-file-row": "tool-detail-full",
  "group:blocks/error-item": "error-collapse",
  "group:delivery/source-switch": "output-source-artifact",
  "group:delivery/markdown": "renderer-markdown",
  "group:delivery/html": "renderer-preview",
  "group:media-generation/image-inline": "media-image-grid",
  "group:media-generation/media-inline": "media-video-storyboard",
  "group:approval/permission-trigger": "model-tools",
  "group:composer/prompt-row": "prompt-shortcuts",
};

/** The option Edit should highlight for a part, if one owns it. */
export function pinnedOptionForModule(moduleId: string): string | null {
  return PART_PINNED_OPTIONS[moduleId] ?? null;
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
  picked: readonly string[] = [],
) {
  // The same rule the canvas draws by, so the tree lists exactly what is on it.
  const mounted = mountedComponentsForProject(project, selectedOptions ?? [], picked);
  return layersForProject(project, mounted).map((layer) => {
    const slots = project.layout.slots.filter(
      (slot) => layer.regions.includes(slot.region) && mounted.has(slot.component),
    );
    const children: LayerChild[] = slots
      .filter((slot) => !FULLY_ENUMERATED_COMPONENTS.has(slot.component))
      .map((slot) => ({
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
      // Only if the component it lives in is actually on the canvas. Checked
      // against the mounting rule rather than the project's own enabled flags:
      // picking an option mounts its component without switching that flag on,
      // so reading the flag hid the very option that had just been picked.
      // Per region, not per layer: the centre merges `main` and `composer`, and
      // a composer with no conversation should list composer options only.
      const regionMounted = project.layout.slots.some(
        (slot) => slot.region === region && mounted.has(slot.component),
      );
      if (!regionMounted) continue;
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
  "thinking-done": CheckCheck,
  approval: ShieldQuestionMark,
  "tool-calls": Wrench,
  blocks: CircleAlert,
  interrupt: CircleStop,
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
    /*
     * The interaction, in the order it happens: the run opens → the agent
     * thinks → it reports progress → it calls tools → it hands back to the
     * reader and the run closes → the next run delivers.
     *
     * Re-ordered and re-named from the previous reading (思考 → 审批 → 工具 →
     * 结果报错 → 中断 → 生成中 → 交付), which was one linear turn. The protocol
     * these stages describe does not work that way: several of them run at the
     * same time, and two of them *end the run* and continue in the next one.
     * Ids are left alone on purpose — in this file they are stable internal
     * names and the reader sees `presetGroupNameZh` (see the note there).
     */
    id: "event-flow",
    label: { zh: "交互流程", en: "Interaction flow", ja: "インタラクション" },
    /*
     * The reader's journey, in their own words: 思考中 → 思考完成 → 工具调用 →
     * 审批 → 加载 → 运行状态 → 交付.
     *
     * The previous order opened on 运行状态, which is where a run *ends* — the
     * first group in the list was the last thing that happens. Two of these do
     * end the run and continue in the next one (审批 and 运行状态), and the note
     * above still holds: the stages are not one linear turn. But the list has to
     * start somewhere, and starting where the reader starts beats starting at
     * the outcome.
     *
     * `ux-effects` stays ahead of `thinking-done`, and that is load-bearing
     * rather than aesthetic: both groups write `reasoning.*`, and
     * `styleKitOptionIds` resolves two groups writing one field by last-writer
     * in *this* order. Swapping them would hand every style the settled
     * block's choices for the running one.
     */
    groupIds: [
      "ux-effects",
      "thinking-done",
      "tool-calls",
      "approval",
      "media-generation",
      "blocks",
      "delivery",
    ],
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
  /**
   * Kept in the schema but out of the picker.
   *
   * Not deleted: a project already saved with one of these still has to render,
   * and its theme set, CSS branch and icon mapping are all still wired. Hiding
   * it only removes the way *in* — which does mean a project saved as one of
   * these cannot be switched back to it from the UI.
   */
  hidden?: boolean;
}> = [
  // First, and what the configurator opens on. See `PresetStyleId` for why it
  // has no CSS branch, and `styleKitIndex` for why it is not counted.
  { id: "blank", label: { en: "Blank", zh: "空白", ja: "ブランク" } },
  { id: "native", label: { en: "Native", zh: "原生风", ja: "ネイティブ" } },
  { id: "illustrated", label: { en: "Minimal", zh: "极简风", ja: "ミニマル" }, hidden: true },
  // The id stays `studio`. It is not user-visible, and renaming it would ripple
  // through the CSS branch, the theme ids, the style kit and their tests for no
  // gain — this is a label change.
  /* Hidden on request. Its CSS branch, its four colourways, its comic icon set
     and its card plate all stay — a project saved as this style still renders,
     and unhiding it is deleting `hidden` here. */
  { id: "studio", label: { en: "Comic", zh: "漫画风", ja: "コミック" }, hidden: true },
  { id: "zine", label: { en: "Zine", zh: "牛皮纸", ja: "ジン" }, hidden: true },
  { id: "game", label: { en: "Quest", zh: "游戏风", ja: "クエスト" } },
  /* Hidden in favour of 复古像素风 below, which is the same resolution language
     without the game: this one ships sprites, a mushroom mascot and a brick
     vocabulary. Not deleted — a project saved as `pixel` still has to render,
     and its CSS branch, themes and sprites are all still wired. */
  { id: "pixel", label: { en: "Pixel", zh: "像素风", ja: "ピクセル" }, hidden: true },
  { id: "retro", label: { en: "Retro", zh: "复古风", ja: "レトロ" } },
  /* Appended, and that matters: `styleKitIndex` numbers the non-blank
     selectable styles by position, so inserting one earlier would shift what
     every style after it opens with. At 5 the index clamps to the last option of
     each exclusive section — deterministic, and nothing else moves. */
  { id: "handdrawn", label: { en: "Sketch", zh: "手绘风", ja: "手描き" } },
  // Appended for the same reason as the one above: `styleKitIndex` numbers by
  // position, so this goes last and nothing before it moves.
  /* Hidden on request, like 漫画风 above. */
  { id: "pixeldesk", label: { en: "Pixel Desk", zh: "复古像素风", ja: "レトロピクセル" }, hidden: true },
  /* Appended for the same reason as the two above: `styleKitIndex` numbers by
     position, so a new style goes last and nothing before it moves. */
  { id: "inkwash", label: { en: "Ink Wash", zh: "水墨风", ja: "水墨" } },
  // Product name, so it is not translated.
  { id: "workbuddy", label: { en: "WorkBuddy", zh: "WorkBuddy", ja: "WorkBuddy" }, hidden: true },
  /*
   * The 8th selectable style, and it goes after WorkBuddy rather than before
   * it — which looks wrong and is not.
   *
   * `styleKitIndex` numbers by declaration order, so putting it above the
   * hidden entry moved WorkBuddy's kit from 10 to 11 and changed what that
   * style opens with. Caught by `styleKit.test.ts`, which pins every number for
   * exactly this reason. The picker's own order is a separate list
   * (`selectablePresetStyleOptions`, sorted by `PICKER_ORDER` with declaration
   * order as the fallback), so this still shows up last among the cards.
   */
  { id: "tech", label: { en: "Tech", zh: "科技风", ja: "テック" } },
];

/**
 * The order the picker lists the styles in, asked for directly:
 * 原生风 → 水墨风 → 游戏风 → 手绘风 → 复古风.
 *
 * A list of its own, and *not* a reordering of `presetStyleOptions`, which is
 * the thing that must not move. `styleKitIndex` numbers a style that is absent
 * from `KIT_NUMBERED_STYLE_IDS` by its declaration order there — 水墨风 is one
 * of those — so moving it up that list would have changed the configuration it
 * opens with. Measured before touching anything: index 9 → 6, and with it the
 * thinking motion from 墨点扩散 to 焦点传递. Display order and kit order are two
 * different questions, and this answers the display one only.
 *
 * 空白 stays at the head. It is not a card (see `styleCardOptions`), but it is
 * in this list for the label lookups, and first is where it belongs.
 */
const PICKER_ORDER: readonly PresetStyleId[] = [
  "blank",
  "native",
  "inkwash",
  "game",
  "handdrawn",
  "retro",
];

/**
 * The styles the picker offers, in picker order.
 *
 * Separate from `presetStyleOptions` rather than replacing it: label lookups
 * have to answer for hidden styles too — the switch dialog names the style it
 * is switching to, and a project loaded as a hidden style still needs a name.
 *
 * Note for anyone reading an older copy of this comment: the index into this
 * list used to be the style's kit position as well. It is not any more —
 * `KIT_NUMBERED_STYLE_IDS` froze that numbering as data precisely so hiding or
 * reordering a style in the picker could stop changing what every style after
 * it opens with.
 */
export const selectablePresetStyleOptions = presetStyleOptions
  .filter((style) => !style.hidden)
  .sort((a, b) => {
    // Anything the order does not name keeps its declaration order, after the
    // ones it does — so a style added tomorrow appears without an edit here.
    const rank = (id: PresetStyleId) => {
      const at = PICKER_ORDER.indexOf(id);
      return at < 0 ? PICKER_ORDER.length : at;
    };
    return rank(a.id) - rank(b.id);
  });

/**
 * The styles the picker shows as cards, and the four colourways each card
 * offers.
 *
 * 空白 is absent on purpose: it is where the editor *opens*, so offering it as
 * a card is offering the reader what they already have, and it has no
 * colourways to show — it wears 原生风's looks precisely because nothing has
 * been built yet.
 *
 * Four a style, which for most of them is simply the style's own list. Two are
 * curated here instead:
 *
 * `native` carries twenty-two — its own six plus the atlas ten and the minimal
 * six, which ride along with it in the rail's theme group. Four is the count
 * the card is built for, so these are two light and two dark: the default, a
 * warmer paper, and the two darks that are furthest apart.
 *
 * The rail's 主题 group still lists every palette a style owns. This is the
 * quick path — pick a look, pick a colourway, apply — not a replacement for it.
 */
export const STYLE_CARD_THEMES: Partial<Record<PresetStyleId, readonly ThemePresetId[]>> = {
  native: ["soft-glass", "sand-workspace", "warm-graphite", "cocoa-system"],
  studio: [...studioThemePresetIds],
  game: [...gameThemePresetIds],
  pixel: [...pixelThemePresetIds],
  pixeldesk: [...pixeldeskThemePresetIds],
  retro: [...retroThemePresetIds],
  handdrawn: [...handdrawnThemePresetIds],
  inkwash: [...inkwashThemePresetIds],
  tech: [...techThemePresetIds],
};

/** The cards, in picker order, with 空白 struck. */
export const styleCardOptions = selectablePresetStyleOptions.filter((style) => style.id !== "blank");

/** The four colourways a style's card offers, first one being its default. */
export function styleCardThemeIds(stylePreset: PresetStyleId): readonly ThemePresetId[] {
  return STYLE_CARD_THEMES[stylePreset] ?? [];
}

/**
 * The styles the index rule numbers.
 *
 * `blank` sits first in the picker and is left out of here, because the rule
 * counts *positions*: including it would move native to 1, 漫画 to 2, 游戏 to 3
 * and 像素 to 4 — silently changing the opening configuration of every style,
 * for a style that opens on nothing.
 */
/**
 * The numbering the kit rule reads, frozen as data.
 *
 * It used to be *derived* from the picker's contents — the selectable styles
 * minus 空白 — which meant hiding a style renumbered every style after it, and
 * renumbering changes which option each of them opens with. Hiding 漫画风 and
 * 复古像素风 would have quietly moved 游戏风 from 2 to 1, 复古风 from 3 to 2 and
 * 手绘风 from 4 to 3: three styles' starting configuration changed by an edit
 * that was supposed to be about what the picker lists.
 *
 * So the order is written down instead. Append to the end for a new style (that
 * is safe, and it is what the original note promised); do not insert.
 */
const KIT_NUMBERED_STYLE_IDS: readonly PresetStyleId[] = [
  "native",
  "studio",
  "game",
  "retro",
  "handdrawn",
  "pixeldesk",
];

/**
 * …and anything added after that list was written, appended in declaration
 * order rather than dropped to 0.
 *
 * Caught immediately: 水墨风 landed while this was being changed, was not in the
 * frozen list, and `indexOf` answered -1 — which the old fallback turned into 0,
 * the same kit as 原生风. Two styles opening on an identical configuration is
 * exactly what the kit exists to prevent, and `styleKit.test.ts` said so.
 *
 * So a frozen order for the styles that have one, and the end of the queue for
 * the ones that do not: existing styles never renumber, new ones are distinct
 * the day they appear, and adding a style needs no edit here.
 */
const kitNumberedStyles = (): readonly PresetStyleId[] => [
  ...KIT_NUMBERED_STYLE_IDS,
  ...presetStyleOptions
    .map((style) => style.id)
    .filter((id) => id !== "blank" && !KIT_NUMBERED_STYLE_IDS.includes(id)),
];

/**
 * Sentinel returned for a style that takes no kit. Out of range of any section,
 * so `styleKitOptionIds` can recognise it without a second parameter.
 */
export const NO_STYLE_KIT_INDEX = -1;

/**
 * The style whose *looks* a style wears — what `data-style-preset` carries.
 *
 * 空白 wears 原生风's. It is a content state, not a visual one: nothing is on
 * the canvas, and what the reader adds should look like the product rather than
 * like an unstyled draft. Aliasing here rather than copying the branch means
 * the ~168 rules keyed on this attribute, *and* the theme cards (which pair
 * `[data-style-preset="X"]` with `[data-theme-style="X"]`), both follow with no
 * duplication — so 空白 also offers 原生风's palettes.
 *
 * `data-style-id` carries the real id alongside it, for anything that needs
 * identity rather than appearance.
 *
 * When 原生风 gets its new look, this alias comes out: today's `native` rules
 * get re-scoped to `blank`, which is where they will then belong, and the new
 * ones are written under `native`. That is the moment the two diverge — this
 * function is the single place that has to change.
 */
export function visualStylePreset(styleId: PresetStyleId): PresetStyleId {
  return styleId === "blank" ? "native" : styleId;
}

/** A style's position among the styles that have a kit, or the sentinel. */
export function styleKitIndex(styleId: PresetStyleId): number {
  if (styleId === "blank") return NO_STYLE_KIT_INDEX;
  const index = kitNumberedStyles().indexOf(styleId);
  return index < 0 ? 0 : index;
}

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
  /* The row mark used to be a gallery here — eleven glyphs to choose between,
     on the reasoning that an icon should be picked where it is used. It is
     gone, and the reason is that it was the wrong kind of choice: every other
     mark in a style is fixed *by* the style, and this one asked the reader to
     hand-match a glyph to a skin that already has an answer. Eleven tiles, of
     which ten were wrong for whatever style was on screen.
     So the sidebar's "Row marks" toggle is the whole control now, and the glyph
     comes from `rowMarkOptionForStyle` — one per style, drawn in that style's
     own set. See `SessionSidebar`. */
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
    /*
     * The three results a call can end on, moved here from 运行状态.
     *
     * They are the tool call's own lifecycle — `tool.call.finished` with
     * success, error or cancelled — so they belong beside the actions that
     * produce them rather than beside the run-level incidents (`run.error`:
     * retrying, exhausted, terminal), which are a different layer. The shapes
     * had already made it obvious: these three rendered as tool rows because
     * they *are* tool rows, while the incidents had become one-sentence cards.
     */
    { slot: "tool.completed", title: { en: "Completed", zh: "完成", ja: "完了" }, code: "status: completed", tone: "success" },
    { slot: "tool.failed", title: { en: "Failed", zh: "失败", ja: "失敗" }, code: "status: failed", tone: "danger" },
    { slot: "tool.cancelled", title: { en: "Cancelled", zh: "已取消", ja: "キャンセル" }, code: "status: cancelled", tone: "neutral" },
    /*
     * Four cards became two.
     *
     * Read file / Read image and Modify file / Edit file were each one idea
     * offered twice, so the reader picked a glyph, then picked again for the
     * near-identical neighbour. The surviving card of each pair carries the
     * merged gallery (see `ICON_OPTIONS` in agentmatrix/icons.tsx) and a label
     * that names both halves.
     *
     * `content.image` and `tool.file_modified` still exist as slots — the event
     * stream distinguishes a modify from an edit, and an image from a file —
     * they just no longer have a card of their own here, so they keep their
     * default glyph. That is the same trade the withheld rail options make:
     * fewer decisions on screen, the schema untouched.
     */
    { slot: "tool.file_read", title: { en: "View / read", zh: "查看/读取", ja: "閲覧・読み取り" }, code: "tool: read_file", tone: "info" },
    { slot: "tool.file_edit", title: { en: "Edit / modify", zh: "编辑/修改", ja: "編集・変更" }, code: "tool: edit_file", tone: "info" },
    { slot: "tool.validate", title: { en: "Validate", zh: "验证", ja: "検証" }, code: "tool: validate", tone: "info" },
    { slot: "tool.search", title: { en: "Search", zh: "搜索/检索", ja: "検索" }, code: "tool: search", tone: "neutral" },
    { slot: "content.terminal", title: { en: "Run command", zh: "运行命令", ja: "コマンド実行" }, code: "tool: run_command", tone: "neutral" },
  ],
  // 内容块 = incidents + all session errors + diagnostics/audit facts.
  // (Provider group is intentionally left as pure provider/model config.)
  blocks: [
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
  /*
   * The four confirmation replies belong to the group that asks the question,
   * not to the composer they happen to be rendered above.
   *
   * These five existed and still rendered as nothing, because a gallery needs
   * three tables to agree and only two did: the cards are here and the 确认动作
   * heading is in `stateSectionTitle`, but `V1_BASIC_CODES` had no `approval`
   * key — and its own comment says what that costs, "without an entry here a
   * group's gallery renders nothing at all, whatever `groupStateCards` says".
   * So the canvas drew all five marks with no picker anywhere. Reported as
   * 人机协作没关联上画布的 icon; the entry is now in that table.
   */
  approval: [
    /* The question first, then the four answers: a card that is waiting is the
       state this section is about, and its mark (`tool.pending_approval`) is
       the one the canvas draws most — `ToolCallCard` puts it on every call that
       stops for a decision. It had no tile anywhere. */
    { slot: "tool.pending_approval", title: { en: "Awaiting approval", zh: "等待确认", ja: "承認待ち" }, code: "tool.call.pending_approval", tone: "warning" },
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
  /* Without an entry here a group's gallery renders nothing at all, whatever
     `groupStateCards` says — the filter answers `[]` for an unlisted group. */
  conversation: ["avatar · user", "avatar · agent"],
  "tool-calls": [
    /*
     * The three call results are defined above but deliberately not surfaced.
     *
     * Each is already said by something else on the canvas: the incident cards
     * (retry → give up) are the failure, the interrupt is the cancellation, and
     * a first turn that delivers a document is the completion. A card for each
     * meant three invented calls whose only job was to be pointed at.
     */
    "tool: read_file",
    "tool: read_image",
    "tool: modify_file",
    "tool: edit_file",
    "tool: validate",
    "tool: search",
    "tool: run_command",
  ],
  /*
   * 人机协作 — the section that had cards, a heading and no entry here.
   *
   * `tool.call.pending_approval` first: that is the mark `ToolCallCard` puts on
   * every call that stops for a decision, so it is the one on screen most, and
   * it had no tile at all. The four replies follow it.
   */
  approval: [
    "tool.call.pending_approval",
    "user.tool_confirmation · allow_once",
    "user.tool_confirmation · allow_always",
    "user.tool_confirmation · deny",
    "user.tool_confirmation · cancel",
  ],
  blocks: [
    /*
     * 结果报错 — the card the canvas was drawing without one.
     *
     * The failure card on the canvas takes its glyph from
     * `errorDomainSlot(code)`, so this has to name the domain the canvas
     * actually sends or the reader is offered a glyph that never appears.
     *
     * It was `unknown_error`, and that was the wrong half of the fix: the
     * canvas sent an invented `E_WRITE_FILE`, which matched no domain and so
     * drew `error.unknown`, and this list was changed to match it. That put a
     * question mark next to "磁盘配额已满" and called it correct. The code is
     * `resource_quota_exceeded_error` now — a hard-drive beside a sentence
     * about a full disk — and this follows it.
     *
     * The other eighteen error domains stay unsurfaced: each would need its own
     * specimen on the canvas, and one failure is enough to choose a glyph by.
     */
    "resource_quota_exceeded_error",
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
  /* In the list's order, not the data's: the list is written in the order the
     canvas shows them, and filtering the data kept 资源配额 last in the rail
     while it is the first failure on the canvas — reported as the rail and the
     canvas not reading in the same order. */
  return allowed
    ? cards
        .filter((card) => allowed.includes(card.code))
        .sort((a, b) => allowed.indexOf(a.code) - allowed.indexOf(b.code))
    : [];
}

export function stateSectionTitle(groupId: PresetGroupId, locale: AppLocale): string {
  const titles: Partial<Record<PresetGroupId, Record<AppLocale, string>>> = {
    sidebar: { zh: "行内标记", en: "Row marks", ja: "行のマーク" },
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

/**
 * The reader's four, the same in every style.
 *
 * Every style used to pick its own reader avatars, which made the reader's side
 * a second mascot slot. Those characters moved to the agent's gallery in the
 * style they were drawn for (below); the reader gets four plain people and an
 * upload tile (`UPLOADED_AVATAR_ID`, which the gallery adds itself).
 */
export const DEFAULT_USER_AVATAR_IDS = ["default-sky", "default-sage", "default-apricot", "default-ink"] as const;

const DEFAULT_USER_AVATAR = DEFAULT_USER_AVATAR_IDS[0];

export const STYLE_AVATAR_DEFAULTS = {
  // 原生风's, because 空白 wears 原生风's looks (`visualStylePreset`). Both
  // avatar slots start switched off, so this is what the reader gets the moment
  // they turn one on.
  blank: {
    "author.user": DEFAULT_USER_AVATAR,
    "author.agent": "orange-blob",
  },
  native: {
    "author.user": DEFAULT_USER_AVATAR,
    "author.agent": "orange-blob",
  },
  illustrated: {
    "author.user": DEFAULT_USER_AVATAR,
    "author.agent": "orange-blob",
  },
  studio: {
    "author.user": DEFAULT_USER_AVATAR,
    "author.agent": "bot",
  },
  // A machine rather than a creature for the agent: the style's own signature
  // is the monospace section label, and a rounded mascot beside it would be
  // arguing with it.
  //
  // This said `square-terminal` and had done nothing. That id belongs to
  // `content.terminal`, not to `author.agent`, and `resolveIcon` answers an
  // unknown id with `options[0]` — so the style had been quietly showing the
  // orange blob, the exact mascot the note above rules out. `bot` is the
  // nearest thing the agent slot actually offers.
  zine: {
    "author.user": DEFAULT_USER_AVATAR,
    "author.agent": "bot",
  },
  game: {
    "author.user": DEFAULT_USER_AVATAR,
    "author.agent": "game-orb-bot",
  },
  // Its own sprites, drawn on the same 16-cell grid as the style's bricks and
  // coins.
  pixel: {
    "author.user": DEFAULT_USER_AVATAR,
    "author.agent": "pixel-mushroom",
  },
  /* Office software had no mascot. The plainest agent glyph the registry has,
     which in this style renders through pixelarticons like everything else. */
  pixeldesk: {
    "author.user": DEFAULT_USER_AVATAR,
    "author.agent": "bot",
  },
  retro: {
    "author.user": DEFAULT_USER_AVATAR,
    "author.agent": "bot",
  },
  handdrawn: {
    "author.user": DEFAULT_USER_AVATAR,
    "author.agent": "sketch-bot-classic",
  },
  /* The supplied plates: a painted robot head for the agent, in the same ink
     as everything else. */
  inkwash: {
    "author.user": DEFAULT_USER_AVATAR,
    "author.agent": "ink-bot-leaf",
  },
  // The client shows no avatar on either side — the user's turn is a gray pill
  // and the agent's is bare text — so this is the plainest agent glyph; the
  // workbuddy stylesheet hides the avatar slots outright.
  workbuddy: {
    "author.user": DEFAULT_USER_AVATAR,
    "author.agent": "bot",
  },
  /* A moulded shell with an LED matrix for a face is the register the rest of
     the style is already in, and `robot-heads` draws one. */
  tech: {
    "author.user": DEFAULT_USER_AVATAR,
    "author.agent": "robot-head-tv",
  },
} as const satisfies Record<PresetStyleId, Record<"author.user" | "author.agent", string>>;

/**
 * The avatars each style offers.
 *
 * The reader's side is `DEFAULT_USER_AVATAR_IDS` everywhere. The agent's side
 * is the style's own marks, then the characters the style used to give the
 * reader — its washes, animals, sprites, gummy bots — since those were drawn
 * for the style and still belong in it. Rows of four, so eight is two rows.
 *
 * Styles whose reader avatars were the registry's plain person glyphs did not
 * pass them on: a person outline is not an agent.
 *
 * Avatars are exempt from the pixel icon remapping (see the
 * `!AVATAR_SLOTS.has(slot)` guard in `IconSetContext`), so a borrowed glyph
 * stays smooth — which is why each list stays inside its own style's register.
 *
 * Invariant: a style's `STYLE_AVATAR_DEFAULTS` entry has to appear in its own
 * list here. Otherwise the canvas opens showing an avatar its gallery cannot
 * select, and re-picking it is impossible. Pinned by a test.
 */
export const STYLE_AVATAR_OPTIONS = {
  // Same as 原生风: 空白 is that style's looks with nothing built in them yet.
  blank: {
    "author.user": DEFAULT_USER_AVATAR_IDS,
    "author.agent": [
      "orange-blob", "bot", "orb", "spark-avatar",
      "blue-smile", "heart-eyes", "golden-joy", "purple-bored",
    ],
  },
  // The coloured expression faces join the agent's four.
  native: {
    "author.user": DEFAULT_USER_AVATAR_IDS,
    "author.agent": [
      "orange-blob", "bot", "orb", "spark-avatar",
      "blue-smile", "heart-eyes", "golden-joy", "purple-bored",
    ],
  },
  // Heavy outline and flat fill; the mood faces were the reader's, and the
  // plain `user` glyph stays behind.
  studio: {
    "author.user": DEFAULT_USER_AVATAR_IDS,
    "author.agent": [
      "bot", "orange-blob", "work-bot", "robot",
      "mood-joyful", "mood-excited", "mood-grateful", "mood-energized",
    ],
  },
  /* The supplied art, eight framed plates: constructs first, then the
     creatures that used to be the reader's. */
  game: {
    "author.user": DEFAULT_USER_AVATAR_IDS,
    "author.agent": [
      "game-orb-bot", "game-mage", "game-sprout", "game-tome",
      "game-wolf", "game-cat", "game-eagle", "game-golem",
    ],
  },
  pixel: {
    "author.user": DEFAULT_USER_AVATAR_IDS,
    "author.agent": [
      "pixel-mushroom", "pixel-machine", "pixel-crystal", "pixel-slime",
      "pixel-explorer", "pixel-knight", "pixel-ranger", "pixel-diver",
    ],
  },
  /* No sprites here: the pixel *game* style owns those. The registry's plain
     glyphs, which the pixel icon branch draws from pixelarticons. */
  pixeldesk: {
    "author.user": DEFAULT_USER_AVATAR_IDS,
    "author.agent": ["bot", "orb", "robot", "spark-avatar"],
  },
  retro: {
    "author.user": DEFAULT_USER_AVATAR_IDS,
    "author.agent": ["bot", "orb", "robot", "work-bot"],
  },
  /*
   * The supplied washes: four painted robot heads, then the landscapes that
   * were the reader's — peaks, a bridge, bamboo, a sun with birds.
   *
   * Pictures, so they arrive as files, which is the opposite call from this
   * style's *icons* (drawn, `currentColor`, see `inkIcons.tsx`). An avatar
   * renders at 34px where the granulation is most of what you see, and it is a
   * picture rather than a mark, so it has no business taking the palette's ink.
   */
  inkwash: {
    "author.user": DEFAULT_USER_AVATAR_IDS,
    "author.agent": [
      "ink-bot-leaf", "ink-bot-hat", "ink-bot-bamboo", "ink-bot-cloud",
      "ink-peaks", "ink-bridge", "ink-bamboo", "ink-sun",
    ],
  },
  /* The supplied art, eight pencil-shaded heads: robots, then the animals that
     were the reader's. */
  handdrawn: {
    "author.user": DEFAULT_USER_AVATAR_IDS,
    "author.agent": [
      "sketch-bot-classic", "sketch-bot-sprint", "sketch-bot-warm", "sketch-bot-headset",
      "sketch-cat-portrait", "sketch-rabbit", "sketch-panda", "sketch-fox",
    ],
  },
  // The three hidden styles still need entries — a project saved as one of them
  // has to render, and the gallery still has to offer it something.
  illustrated: {
    "author.user": DEFAULT_USER_AVATAR_IDS,
    "author.agent": ["orange-blob", "bot", "orb", "spark-avatar"],
  },
  zine: {
    "author.user": DEFAULT_USER_AVATAR_IDS,
    "author.agent": ["bot", "orb", "robot", "work-bot"],
  },
  workbuddy: {
    "author.user": DEFAULT_USER_AVATAR_IDS,
    "author.agent": ["bot", "orb", "robot", "spark-avatar"],
  },
  /* Four outlines of the one TV head, then the lit gummy bots that were the
     reader's — the same moulded, lit register. */
  tech: {
    "author.user": DEFAULT_USER_AVATAR_IDS,
    "author.agent": [
      "robot-head-tv", "robot-head-square", "robot-head-round", "robot-head-hex",
      "tech-user-cloud", "tech-user-gummy", "tech-user-block", "tech-user-hex",
    ],
  },
} as const satisfies Record<PresetStyleId, Record<"author.user" | "author.agent", readonly string[]>>;

/**
 * The icons a style offers for a slot that is not an avatar.
 *
 * Only 游戏风 declares any, and only for the eight slots its own set covers:
 * the design it was rebuilt from draws a compass, a scroll, a shield, crossed
 * swords, a quill and a lens, and those are registered in `ICON_OPTIONS` beside
 * the lucide alternatives. Without this table they would be offered in every
 * style, which would put a fantasy scroll in the 像素风 gallery.
 *
 * Two of the style's own plus two lucide per slot, rather than four of its own:
 * the set has one drawing for most meanings, and padding to four would mean
 * inventing marks the design never made.
 *
 * Every other style, and every slot not named here, stays unfiltered — the
 * function answers `undefined` and the gallery shows the whole registry.
 */
/**
 * The Handdrawn style's own marks, same shape and same reason as the Game
 * table below: `sketchIcons.tsx` registers them in `ICON_OPTIONS` for every
 * style, and without a per-style list a pen-drawn balloon would turn up in the
 * 像素风 gallery.
 *
 * One of its own plus three lucide per slot, because the set draws one mark per
 * meaning. Padding to four would mean inventing marks the design never made —
 * the same call as the Game set.
 */
/**
 * 手绘风's galleries: four drawn choices a slot, no lucide.
 *
 * It started as one sketch glyph plus three lucide, the shape the Game lists
 * still have — and in this style that is worse than it sounds. A lucide icon is
 * a 24-grid outline with true circles and constant stroke; beside a pen drawing
 * it does not read as a different option, it reads as the drawing having failed
 * to load. So the other three were drawn (`sketchIcons.tsx`).
 *
 * Each slot's four are four *ideas*, not four takes on one object — read is a
 * sheet, a book, an eye and a stack. Four drawings of the same thing are four
 * tiles nobody can tell apart at 16px, which is the trap `pixelIconForOption`
 * was written to get out of.
 */
const SKETCH_SLOT_OPTIONS: Partial<Record<string, readonly string[]>> = {
  "tool.file_read": ["sketch-sheet", "sketch-book", "sketch-eye", "sketch-stack"],
  "tool.file_edit": ["sketch-pencil", "sketch-quill", "sketch-eraser", "sketch-brush"],
  "tool.validate": ["sketch-shield", "sketch-tick", "sketch-clipboard", "sketch-double-tick"],
  "tool.search": ["sketch-glass", "sketch-binoculars", "sketch-lantern", "sketch-trail"],
  "content.thinking": ["sketch-thought", "sketch-bulb", "sketch-spiral", "sketch-cloud"],
  "content.terminal": ["sketch-wrench", "sketch-console", "sketch-cog", "sketch-hammer"],
  "content.text": ["sketch-chat", "sketch-note", "sketch-quote", "sketch-letter"],
};

/**
 * 漫画风's galleries: four of its own marks a slot.
 *
 * Same shape and same argument as `SKETCH_SLOT_OPTIONS`. The style draws every
 * slot from its own sheet now (`comicSlots.ts`), so a gallery offering lucide
 * ids would show four tiles that all render the same comic mark — the sheet is
 * keyed by slot, and an id it does not know falls back to the slot's drawing.
 * These are the ids `comicIconForOption` actually distinguishes.
 */
const COMIC_SLOT_OPTIONS: Partial<Record<string, readonly string[]>> = {
  "tool.file_read": ["comic-doc", "comic-docs", "comic-doc-search", "comic-panels"],
  "tool.file_edit": ["comic-pencil", "comic-doc", "comic-docs", "comic-cycle"],
  "tool.validate": ["comic-shield", "comic-sparkle", "comic-doc", "comic-cog"],
  "tool.search": ["comic-search", "comic-doc-search", "comic-folder", "comic-panels"],
  "content.thinking": ["comic-thought", "comic-sparkle", "comic-cog", "comic-cycle"],
  "content.terminal": ["comic-wrench", "comic-cog", "comic-panels", "comic-plus"],
  "content.text": ["comic-message", "comic-doc", "comic-docs", "comic-folder"],
  "session.item": ["comic-message", "comic-chat-new", "comic-doc", "comic-sparkle"],
  "tool.completed": ["comic-sparkle", "comic-shield", "comic-cycle", "comic-bell"],
  "tool.failed": ["comic-bell", "comic-panels", "comic-cycle", "comic-wrench"],
};

const GAME_SLOT_OPTIONS: Partial<Record<string, readonly string[]>> = {
  "tool.file_read": ["game-reading-file", "game-vellum", "file-read-action", "eye"],
  "tool.file_edit": ["game-quill", "game-note", "file-modified-action", "replace"],
  "tool.validate": ["game-task", "game-shield", "search-check", "hammer"],
  "tool.search": ["game-lens", "game-glass", "file-search", "waypoints"],
  "content.thinking": ["game-compass", "bulb", "sparkles", "loader"],
  "content.terminal": ["game-wrench", "terminal", "square-terminal", "cpu"],
  /* `message`, not `quote`: `quote` is not an option in this slot, so that
     tile resolved to nothing and the gallery quietly showed three. Caught by
     `gameSlots.test.ts`. */
  "content.text": ["game-scroll", "file", "layers", "message"],
  "tool.failed": ["game-swords", "x", "alert", "bug"],
};

/**
 * The options a style offers for a slot, or `undefined` for "all of them".
 *
 * Covers avatars and the Game style's own marks through one lookup, because the
 * gallery asks one question — "what may I show for this slot?" — and had no
 * reason to learn that avatars are answered by a different table than icons.
 */
/**
 * The slots a style answers for itself, and the mark it opens on.
 *
 * The allow-list already orders each list with the style's own mark first —
 * that ordering was doing nothing until now. Registering an icon as an option
 * makes it *reachable*; it does not make it *chosen*, and the icon set the
 * canvas opens with is `defaultIconSet()`, which reads the global registry
 * order and knows nothing about styles. So 手绘风 opened wearing the Game
 * style's compass on its artifact card while its own drawn sheet sat one tile
 * away in the gallery.
 *
 * Derived from the same table the gallery reads, so a style cannot open on a
 * mark its own gallery does not offer — the invariant the avatar tables are
 * pinned to, extended to the rest of the slots.
 *
 * Only styles that *have* a table appear here. A style with none keeps whatever
 * the registry defaults to, which is deliberately unchanged: the global icon
 * order is the reader's open question about 原生风, and this is not the place to
 * decide it.
 */
export function styleSlotDefaults(stylePreset: PresetStyleId): Record<string, string> {
  /*
   * Read off the gallery rather than off a fourth curated table.
   *
   * It used to name 游戏风 and 手绘风 by hand, which left the same gap open for
   * every style that shipped a set afterwards: 漫画风, 水墨风 and 复古风 all had
   * their own marks reachable from the gallery and none of them chosen. Since
   * `styleAvatarOptionIds` already orders each list with the style's own mark
   * first — the property this function exists to exploit — asking it is both
   * shorter and closed under the next set someone draws.
   *
   * The `startsWith` guard is what keeps it honest: a style with no set of its
   * own gets its four filled with plain lucide ids, and defaulting to those
   * would be this function deciding 原生风's icon order, which is the reader's
   * open question and not ours.
   */
  const prefix = STYLE_ICON_PREFIX[stylePreset];
  if (!prefix) return {};
  const defaults: Record<string, string> = {};
  for (const slot of Object.keys(ICON_OPTIONS)) {
    if (slot === "author.user" || slot === "author.agent") continue;
    const first = styleAvatarOptionIds(stylePreset, slot)?.[0];
    if (first?.startsWith(prefix)) defaults[slot] = first;
  }
  return defaults;
}

/**
 * Which drawn vocabulary a style's galleries prefer.
 *
 * The registry is shared: every set a style has ever shipped is registered as
 * options on the same slots, so `tool.search` now holds fourteen tiles —
 * lucide's four, four hand-drawn, two painted, four comic. Three styles had a
 * curated list and the rest fell through to "all of them", which is the
 * fourteen-tile gallery that was reported ("每个风格这块只展示 4 个").
 *
 * So every style names its own prefix and takes four: its own marks first,
 * then the plain lucide ids to fill. `null` means the plain set *is* this
 * style's vocabulary.
 *
 * Styles whose icons are drawn by a branch rather than by option id still work
 * through this. The Game and Pixel branches redraw whatever id is listed
 * (`gameIconForOption` / `pixelIconForOption`), and Retro paints its own SVGs
 * from CSS — what this controls is how many tiles there are and which ids they
 * carry, and four of the reader's own style beats fourteen of everyone's.
 */
const STYLE_ICON_PREFIX: Record<PresetStyleId, string | null> = {
  blank: null,
  native: null,
  illustrated: null,
  studio: "comic-",
  zine: null,
  game: "game-",
  pixel: null,
  pixeldesk: null,
  /* Its own 33, drawn in the idiom its exported chrome already uses: a filled
     mass in the paper tint with a 1.38 ink outline and line detail on top. */
  retro: "retro-",
  handdrawn: "sketch-",
  /* The supplied sheet's 24 redrawn as washes, plus the eight states it has no
     mark for — a tick, crossed strokes, an exclamation, a thought, a seal, a
     plus, a drop and a broken ring. */
  inkwash: "ink-",
  /* No prefix: this style has no marks of its own. It draws 原生风's set with a
     heavier stroke, which is a CSS override rather than a second vocabulary —
     so its galleries offer the same ids every unprefixed style offers. */
  tech: null,
  workbuddy: null,
};

/** The prefixes that mark an id as belonging to one style's own set. */
const OWNED_PREFIXES = ["comic-", "game-", "sketch-", "pixel-", "campfire-", "retro-", "ink-"] as const;

const isPlainOptionId = (id: string) => !OWNED_PREFIXES.some((prefix) => id.startsWith(prefix));

/**
 * Four ids for a slot, in this style's vocabulary.
 *
 * Own marks first, then plain ones, capped at four — the count the galleries
 * are built for. A style with fewer than four of its own is topped up rather
 * than left short: the Game set has two vellums and no third, and three tiles
 * in a row of four reads as a rendering failure.
 */
function styleSlotOptionIds(stylePreset: PresetStyleId, slot: string): readonly string[] | undefined {
  const options = ICON_OPTIONS[slot as IconSlot];
  if (!options) return undefined;
  const ids = options.map((option) => option.id);
  const prefix = STYLE_ICON_PREFIX[stylePreset];
  const own = prefix ? ids.filter((id) => id.startsWith(prefix)) : [];
  return [...own, ...ids.filter(isPlainOptionId)].slice(0, 4);
}

export function styleAvatarOptionIds(
  stylePreset: PresetStyleId,
  slot: string,
): readonly string[] | undefined {
  if (slot === "author.user" || slot === "author.agent") {
    return STYLE_AVATAR_OPTIONS[stylePreset][slot];
  }
  /*
   * The three curated lists stay, and they earn it by *ordering* rather than by
   * membership: the rule below picks the same four, but not always in the order
   * the set was drawn to be read in — Handdrawn's search reads glass →
   * binoculars → lantern → trail, which is not registry order. Every other
   * style, and every slot those three do not name, takes the rule.
   */
  if (stylePreset === "game" && GAME_SLOT_OPTIONS[slot]) return GAME_SLOT_OPTIONS[slot];
  if (stylePreset === "studio" && COMIC_SLOT_OPTIONS[slot]) return COMIC_SLOT_OPTIONS[slot];
  if (stylePreset === "handdrawn" && SKETCH_SLOT_OPTIONS[slot]) return SKETCH_SLOT_OPTIONS[slot];
  return styleSlotOptionIds(stylePreset, slot);
}

/**
 * The thinking motions each style offers, four a side.
 *
 * Same shape and same reason as `STYLE_AVATAR_OPTIONS`: the Motion section held
 * eight options in every style, and three of them (`orb-s1`, `orb-b5`,
 * `orb-m2`) have their geometry and keyframes written only under
 * `[data-style-preset="native"]` — so outside 原生风 those three cards picked a
 * motion that had no size and no animation. Not dimmed. Absent.
 *
 * So the eleven new ones are scoped the same way, each to the style it was
 * drawn for, and this table is what the rail reads.
 *
 * 复古风 has its own four now (watch, record, metronome, telegraph tape); the
 * static `/retro/thinking-dots.svg` it used to show is kept only for a project
 * still set to `wave`.
 *
 * Invariant: a style's own motion has to appear in its own list, or the canvas
 * shows one the gallery cannot select. Pinned by a test.
 */
export const STYLE_MOTION_OPTIONS = {
  // 空白 wears 原生风's looks, so it wears its motions too.
  blank: ["thinking-wave", "thinking-orbit", "thinking-shimmer", "thinking-orb-m2"],
  // The four that read most differently: dots, a ring, the text sweep with no
  // glyph at all, and the morphing ring.
  native: ["thinking-wave", "thinking-orbit", "thinking-shimmer", "thinking-orb-m2"],
  studio: [
    "thinking-comic-halftone",
    "thinking-comic-inkblot",
    "thinking-comic-bubble",
    "thinking-comic-flip",
  ],
  game: [
    "thinking-hourglass",
    "thinking-quest-torch",
    "thinking-quest-rune",
    "thinking-quest-coins",
  ],
  pixel: [
    "thinking-pixel-cursor",
    "thinking-pixel-bars",
    "thinking-pixel-spin",
    "thinking-pixel-bricks",
  ],
  /* The same four, shared rather than copied. They are whole-cell `steps()`
     jumps — a language about resolution, not about play — so a blinking block
     cursor and a filling bar belong to 90s software at least as much as to a
     platformer. Sharing the ids means no new options, patches, reverts or
     preview cards; the CSS scope is widened to match both styles instead. */
  pixeldesk: [
    "thinking-pixel-cursor",
    "thinking-pixel-bars",
    "thinking-pixel-spin",
    "thinking-pixel-bricks",
  ],
  /* Its own four: pocket watch, record, metronome, telegraph tape. It used to
     offer one — `thinking-wave`, which this style drew as a static three-dot
     SVG over the indicator, so it did not move and could not be changed. */
  retro: ["thinking-retro-watch", "thinking-retro-record", "thinking-retro-metronome", "thinking-retro-telegraph"],
  /* The mock's thinking row is three ink dots — `thinking-wave` — so these are
     the four unscoped motions for now. Ink-specific ones (a dot spreading into
     the paper, a brush stroke drawn across) are a separate piece of work: a
     motion needs its own keyframes under this style's selector, and offering
     one that has none renders nothing at all (learned when three native-only
     motions were offered in every style). */
  /* Its own four, drawn for it: an ink drop bleeding into the paper, one brush
     stroke, rings on water, and the cinnabar seal. It used to borrow shared
     motions, one of which (`orb-m2`) is native-only and fell back to the plain
     dots — the same picture as 圆点. */
  inkwash: ["thinking-ink-drop", "thinking-ink-stroke", "thinking-ink-ripple", "thinking-ink-seal"],
  handdrawn: [
    "thinking-sketch-bubble",
    "thinking-sketch-pencil",
    "thinking-sketch-blot",
    "thinking-sketch-page",
  ],
  // The three hidden styles keep the plainest of the originals — a project
  // saved as one of them still has to render something that moves.
  illustrated: ["thinking-wave", "thinking-orbit", "thinking-shimmer", "thinking-pulse"],
  zine: ["thinking-wave", "thinking-orbit", "thinking-shimmer", "thinking-pulse"],
  workbuddy: ["thinking-wave", "thinking-orbit", "thinking-shimmer", "thinking-pulse"],
  /* Four of the shared motions for now — the ones whose geometry is a dot, a
     line or a ring rather than a drawing, which is what this style can wear.
     Its own four are still to come; this keeps the table total (a missing style
     is a compile error) and the rail honest in the meantime. */
  /* Its own four now, drawn for it: an LED matrix, signal bars, a scan line
     and segment loading. It used to borrow four shared motions, and one of
     them — `orb-m2` — has keyframes only under 原生风, so outside it the card
     fell back to the plain dots and drew exactly what 圆点 drew. */
  tech: ["thinking-tech-matrix", "thinking-tech-signal", "thinking-tech-scan", "thinking-tech-segments"],
} as const satisfies Record<PresetStyleId, readonly string[]>;

/** The motion option ids a style offers. */
export function styleMotionOptionIds(stylePreset: PresetStyleId): readonly string[] {
  return STYLE_MOTION_OPTIONS[stylePreset];
}

/**
 * The `theme.motion.reasoning` values whose CSS is written under one style.
 *
 * These are the ones that genuinely break outside their style — no keyframes,
 * so the indicator stops rather than degrading. Everything else (`wave`,
 * `pulse`, `shimmer`, `orbit`, `bars`, `minimal`, `terminal`) has unscoped
 * rules and works anywhere.
 *
 * The distinction is load-bearing and was learned the hard way: the fallback in
 * `App.tsx` first treated "not in this style's list" as "must be replaced",
 * which instantly reverted 文字切换 (`bars`) every time it was picked. That one
 * lives in the Done-style section, is offered in every style on purpose, and
 * animates fine — it was never a style-scoped motion.
 */
export const STYLE_SCOPED_REASONING_MOTIONS: ReadonlySet<string> = new Set([
  // Native-only since they were written; see the `[data-style-preset="native"]`
  // block in app.css.
  "orb-s1",
  "orb-b5",
  "orb-m2",
  "comic-halftone",
  "comic-inkblot",
  "comic-bubble",
  "comic-flip",
  "quest-torch",
  "quest-rune",
  "quest-coins",
  "pixel-cursor",
  "pixel-bars",
  "pixel-spin",
  "pixel-bricks",
  // 手绘风's four: their keyframes live under `[data-style-preset="handdrawn"]`
  // alone, so they stop dead in any other style.
  "sketch-bubble",
  "sketch-pencil",
  "sketch-blot",
  "sketch-page",
  // 科技风's four, scoped the same way.
  "tech-matrix",
  "tech-signal",
  "tech-scan",
  "tech-segments",
  // 水墨风's four, then 复古风's.
  "retro-watch",
  "retro-record",
  "retro-metronome",
  "retro-telegraph",
  "ink-drop",
  "ink-stroke",
  "ink-ripple",
  "ink-seal",
]);

/**
 * Every option in the Motion section, so `isOptionShownInRail` can tell a
 * motion from everything else.
 *
 * Read off the schema rather than off `STYLE_MOTION_OPTIONS`, which is the
 * version that was wrong: a table-derived set only contains ids some style
 * offers, so the two originals no style offers — `orb-s1` (格点波) and `orb-b5`
 * (焦点传递) — matched nothing and leaked into every style. Measured as 空白
 * showing six motions where its list has four.
 *
 * Which also settles what happens to those two: nobody offers them, so nobody
 * shows them. They stay in the schema and in `app.css`, and putting either back
 * is adding its id to a style's list.
 *
 * Read at call time, which is why it can be declared after the function that
 * uses it.
 */
const ALL_STYLE_MOTION_IDS: ReadonlySet<string> = new Set(
  presetGroups
    .flatMap((group) => group.options)
    .filter((option) => option.section === "Motion")
    .map((option) => option.id),
);

export const PREVIEW_RESPONSIVE_WIDTHS = {
  hideRightPanel: 860,
  hideLeftSidebar: 660,
} as const;
