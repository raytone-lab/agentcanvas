import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Transition } from "motion/react";
import { Check, Info, Plus, Sparkles, Trash2, Undo2 } from "lucide-react";

import { translatePresetGroupName, translatePresetOptionLabel } from "../../i18n/presetCopy";
import type { AppLocale } from "../../i18n/uiCopy";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";
import { isPresetOptionActive } from "../../schema/presetActions";
import { presetGroups, type PresetGroupId } from "../../schema/presets";
import {
  LAYER_EDIT_OPTIONS,
  LAYER_PRESENCE_OPTIONS,
  REGION_LAYERS,
  REQUIRED_GROUP_IDS,
  layerContentsForProject,
  presetGroupIcons,
  presetRailSections,
  visibleStateCards,
  type MissingRequirement,
} from "../projection/presetRailData";
import { hiddenSelectedComponentOptionIds, type SelectedComponentItem } from "../projection/selectedComponents";

/**
 * What the canvas is built from, at a glance, floating over its top edge.
 *
 * Closed it is a pill — how many components are picked, and what is left.
 * Open (hover, or click to pin) it grows into a card: the count split by the
 * rail's two axes, the interaction stages lit as a strip, and a to-do list
 * where every line says what filling it in will do and can do it.
 *
 * Two kinds of to-do, and the difference matters:
 *   - Required — a conversation and a composer (`missingRequirementsForProject`,
 *     the same check that stops Run and Export). Amber.
 *   - Interaction stages nobody has set up. Optional, neutral.
 *
 * A stage counts as set up when a component in it is picked *or* the reader
 * has chosen one of its state icons. Components alone were the first rule,
 * and it could not be met: 运行状态 has one countable option (`error-collapse`
 * is deliberately not counted as a component) and one that is still pending,
 * so its segment stayed grey however it was configured. A stage with neither
 * a component to pick nor an icon to choose is left out of the count, rather
 * than drawn as a gap no one can fill.
 *
 * One element morphing between the two shapes (`motion`'s layout animation on
 * a spring), with the contents cross-fading inside it.
 */

type IslandCopy = {
  selected: (n: number) => string;
  missing: (n: number) => string;
  optionalLeft: (n: number) => string;
  ready: string;
  total: string;
  structure: string;
  flow: string;
  stages: (done: number, all: number) => string;
  stageOn: string;
  stageOff: string;
  todo: string;
  required: string;
  optional: string;
  fillAll: string;
  fillOne: string;
  willEnable: (option: string) => string;
  useDefaultIcons: (n: number) => string;
  hiddenFlow: string;
  allSet: string;
  progress: string;
  layout: string;
  modules: (n: number) => string;
  turnOn: string;
  emptyColumn: string;
  willAdd: (options: string) => string;
  emptyColumnTodo: (column: string) => string;
  columnHint: Record<"left" | "right", string>;
  scope: string;
  clearAll: string;
  clearConfirm: string;
  cleared: (n: number) => string;
  undo: string;
};

const COPY: Record<AppLocale, IslandCopy> = {
  zh: {
    selected: (n) => `已选 ${n} 个组件`,
    missing: (n) => `${n} 项待补全`,
    optionalLeft: (n) => `可补充 ${n} 项`,
    ready: "已就绪",
    total: "已选组件",
    structure: "架构",
    flow: "交互流程",
    stages: (done, all) => `${done}/${all} 个阶段`,
    stageOn: "已配置",
    stageOff: "未配置",
    todo: "待补全",
    required: "必需",
    optional: "可选",
    fillAll: "补全基础项",
    fillOne: "补全",
    willEnable: (option) => `将启用「${option}」`,
    useDefaultIcons: (n) => `使用默认的 ${n} 个状态图标`,
    hiddenFlow: "对话区还没开启，交互流程里的组件暂时不会出现在画布上",
    allSet: "基础项都齐了，可以运行和导出",
    progress: "完成度",
    layout: "布局",
    modules: (n) => `${n} 个模块`,
    turnOn: "开启",
    emptyColumn: "去添加",
    willAdd: (options) => `将加入「${options}」`,
    emptyColumnTodo: (column) => `${column}是空的`,
    columnHint: { left: "会话列表", right: "产物面板" },
    scope: "补全只补能运行的基础项，其余请按需自定义",
    clearAll: "清空所有组件",
    clearConfirm: "确认清空？",
    cleared: (n) => `已清空 ${n} 个组件`,
    undo: "撤销",
  },
  en: {
    selected: (n) => `${n} component${n === 1 ? "" : "s"}`,
    missing: (n) => `${n} to fill in`,
    optionalLeft: (n) => `${n} optional`,
    ready: "Ready",
    total: "Components picked",
    structure: "Structure",
    flow: "Interaction",
    stages: (done, all) => `${done}/${all} stages`,
    stageOn: "set up",
    stageOff: "not set up",
    todo: "To fill in",
    required: "Required",
    optional: "Optional",
    fillAll: "Fill in basics",
    fillOne: "Add",
    willEnable: (option) => `Turns on “${option}”`,
    useDefaultIcons: (n) => `Uses the ${n} default state icons`,
    hiddenFlow: "The conversation is off, so interaction components are not on the canvas yet",
    allSet: "The basics are in — ready to run and export",
    progress: "Complete",
    layout: "Layout",
    modules: (n) => `${n} module${n === 1 ? "" : "s"}`,
    turnOn: "Turn on",
    emptyColumn: "Add",
    willAdd: (options) => `Adds ${options}`,
    emptyColumnTodo: (column) => `${column} is empty`,
    columnHint: { left: "Conversation list", right: "Output panel" },
    scope: "Only the basics a run needs; pick the rest yourself",
    clearAll: "Clear all components",
    clearConfirm: "Clear everything?",
    cleared: (n) => `Cleared ${n} component${n === 1 ? "" : "s"}`,
    undo: "Undo",
  },
  ja: {
    selected: (n) => `${n} 個のコンポーネント`,
    missing: (n) => `未設定 ${n} 件`,
    optionalLeft: (n) => `追加できる項目 ${n} 件`,
    ready: "準備完了",
    total: "選択中のコンポーネント",
    structure: "構成",
    flow: "インタラクション",
    stages: (done, all) => `${done}/${all} 段階`,
    stageOn: "設定済み",
    stageOff: "未設定",
    todo: "未設定",
    required: "必須",
    optional: "任意",
    fillAll: "基本項目を補完",
    fillOne: "補完",
    willEnable: (option) => `「${option}」を有効にします`,
    useDefaultIcons: (n) => `既定のステータスアイコン ${n} 個を使います`,
    hiddenFlow: "会話エリアがオフのため、インタラクションのコンポーネントはまだキャンバスに表示されません",
    allSet: "基本項目はそろっています。実行・エクスポートできます",
    progress: "完成度",
    layout: "レイアウト",
    modules: (n) => `${n} 個のモジュール`,
    turnOn: "オンにする",
    emptyColumn: "追加",
    willAdd: (options) => `「${options}」を追加します`,
    emptyColumnTodo: (column) => `${column}が空です`,
    columnHint: { left: "会話リスト", right: "出力パネル" },
    scope: "補完は実行に必要な基本項目のみ。ほかは自由に選んでください",
    clearAll: "すべてのコンポーネントをクリア",
    clearConfirm: "本当にクリアしますか？",
    cleared: (n) => `${n} 個のコンポーネントをクリアしました`,
    undo: "元に戻す",
  },
};

const SPRING: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 };
const CONTENT: Transition = { duration: 0.22, ease: [0.16, 1, 0.3, 1] };

function optionName(optionId: string, locale: AppLocale): string {
  const option = presetGroups.flatMap((group) => group.options).find((entry) => entry.id === optionId);
  return translatePresetOptionLabel(optionId, option?.label ?? optionId, locale);
}

function groupName(groupId: PresetGroupId, locale: AppLocale): string {
  const group = presetGroups.find((entry) => entry.id === groupId);
  return translatePresetGroupName(groupId, group?.label ?? groupId, locale);
}

/**
 * How a stage gets set up: an option that counts as a component, or — where
 * there is none, as in 运行状态 — its state icons, accepted as they are.
 *
 * The option already in force wins over the group's first: a style puts its
 * own thinking motion back when handed another, so filling 思考中 with the
 * generic first motion under 科技风 was undone at once and the stage stayed
 * unlit. Confirming what the style is already wearing is what the reader would
 * have picked anyway.
 *
 * Shared with `App`, which does the filling, so the line that says what will
 * happen and the thing that happens cannot drift apart.
 */
export function stageFillPlan(
  groupId: PresetGroupId,
  project?: AgentFrontendProject,
): { optionId?: string; slots: string[] } {
  const eligible = (presetGroups.find((group) => group.id === groupId)?.options ?? []).filter(
    (entry) => !entry.pending && !hiddenSelectedComponentOptionIds.has(entry.id),
  );
  const inForce = project ? eligible.find((entry) => isPresetOptionActive(project, entry.id)) : undefined;
  const option = inForce ?? eligible[0];
  return { optionId: option?.id, slots: visibleStateCards(groupId).map((card) => card.slot) };
}

/** A number that rolls to its new value instead of being swapped in place. */
function RollingNumber({ value, className }: { value: number; className?: string }) {
  return (
    <span className={["sel-island-roll", className].filter(Boolean).join(" ")}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "70%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-70%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 520, damping: 34 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

type Tone = "warn" | "todo" | "ok";

function Ring({ value, size, stroke, tone }: { value: number; size: number; stroke: number; tone: Tone }) {
  const r = (size - stroke) / 2;
  return (
    <svg className="sel-island-ring" data-tone={tone} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="sel-island-ring-track" />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        className="sel-island-ring-fill"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        initial={false}
        animate={{ pathLength: Math.max(0.001, value) }}
        transition={{ type: "spring", stiffness: 160, damping: 26 }}
      />
    </svg>
  );
}

/**
 * The pill's mark: progress while anything is left, then a filled check. The
 * finished ring on its own was a bare green circle — it said "complete" only
 * to someone who already knew what the ring meant.
 */
function PillMark({ value, tone }: { value: number; tone: Tone }) {
  return (
    <span className="sel-island-mark">
      <AnimatePresence mode="popLayout" initial={false}>
        {tone === "ok" ? (
          <motion.svg
            key="done"
            className="sel-island-mark-done"
            width={16}
            height={16}
            viewBox="0 0 16 16"
            aria-hidden="true"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 22 }}
          >
            <circle cx="8" cy="8" r="8" className="sel-island-mark-disc" />
            <motion.path
              d="M4.6 8.3l2.2 2.2 4.6-4.8"
              fill="none"
              stroke="#fff"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.32, ease: [0.65, 0, 0.35, 1], delay: 0.12 }}
            />
          </motion.svg>
        ) : (
          <motion.span
            key="ring"
            className="sel-island-mark-ring"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Ring value={value} size={16} stroke={2.4} tone={tone} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/**
 * What an empty side column gets when it is filled in: its skeleton, not its
 * every option. A conversation sidebar is a title, a way to start one and the
 * list; search, date groups and the version line are refinements the reader
 * adds when they want them.
 *
 * A column that is off is not a to-do — one column is a normal agent UI. A
 * column that is on and empty is: the canvas draws its frame with nothing in
 * it, and calling that 已就绪 was the contradiction.
 */
export const EMPTY_COLUMN_KITS: Record<"left" | "right", readonly string[]> = {
  left: ["sidebar-title", "sidebar-new-button", "sidebar-sessions"],
  right: ["workspace-files"],
};

type Todo = {
  key: string;
  groupId: PresetGroupId;
  kind: "required" | "optional";
  /** Shown instead of the group's name — an empty column is named as itself. */
  title?: string;
  hint: string;
  /** Where the name takes you: the card that fills it, when there is one. */
  jumpOptionId?: string;
  fill: () => void;
};

export function SelectionIsland({
  locale,
  appearance,
  project,
  pickedOptionIds,
  activeGroupId,
  items,
  layerItems,
  missing,
  pickedIconSlots,
  onFillRequired,
  onFillStage,
  onJumpToGroup,
  onEnableColumn,
  onFillOptions,
  onClearAll,
  onUndoClear,
}: {
  locale: AppLocale;
  /**
   * The canvas's appearance under the island. The glass is a tint over what
   * is behind it, and a white tint over 游戏风's near-black came out a muddy
   * grey with grey text on it; dark canvases get the dark material instead.
   */
  appearance: "light" | "dark";
  /** For the layout map, which counts modules the way the Layers tree does. */
  project: AgentFrontendProject;
  pickedOptionIds: readonly string[];
  /** The group the rail is open on, so a column can show it is the one being edited. */
  activeGroupId: PresetGroupId;
  /** The components the rail shows ticked — what the island counts. */
  items: readonly SelectedComponentItem[];
  /** Every option in force, which is what the Layers tree is built from. */
  layerItems: readonly SelectedComponentItem[];
  missing: readonly MissingRequirement[];
  /** State icons the reader has chosen — what sets up a stage with no component. */
  pickedIconSlots: readonly string[];
  /** Turn on one required, missing component. */
  onFillRequired: (item: MissingRequirement) => void;
  /** Set up one interaction stage, by `stageFillPlan`. */
  onFillStage: (groupId: PresetGroupId) => void;
  /** Open the rail on a group, with `optionId`'s card pinned when given. */
  onJumpToGroup: (groupId: PresetGroupId, optionId?: string) => void;
  /** Switch a side column on, by its presence option. */
  onEnableColumn: (optionId: string) => void;
  /** Put a column's starter kit into it (`EMPTY_COLUMN_KITS`). */
  onFillOptions: (optionIds: readonly string[]) => void;
  /** Take every component off the canvas. */
  onClearAll: () => void;
  /** Put back what the last clear took. */
  onUndoClear: () => void;
}) {
  const copy = COPY[locale] ?? COPY.zh;
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hoverStage, setHoverStage] = useState<PresetGroupId | null>(null);
  /*
   * The column the reader last opened from the map. Shown as selected only
   * while the rail is still on that column's group: the rail's own selection
   * starts on the sidebar group, so reading it alone would have shown 左栏
   * selected before anyone touched the map, and going elsewhere in the rail
   * would have left a stale ring here.
   */
  const [chosenColumn, setChosenColumn] = useState<string | null>(null);
  /*
   * Clearing is two clicks: the first arms it (the button turns red and asks),
   * the second does it, and an armed button disarms itself after a few
   * seconds. Then one step of undo, offered in the same place for a while —
   * a destructive action with a way back is cheaper than a dialog in front of
   * it.
   */
  /* `before` is the count at the click; what was cleared is measured against
     the count after, since an empty canvas still has its composer. */
  const [clearState, setClearState] = useState<"idle" | "armed" | { before: number }>("idle");
  useEffect(() => {
    if (clearState === "idle") return;
    const timer = window.setTimeout(() => setClearState("idle"), clearState === "armed" ? 3200 : 6000);
    return () => window.clearTimeout(timer);
  }, [clearState]);
  const open = hovered || pinned;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hoverTimer = useRef<number | null>(null);

  const structureIds = presetRailSections.find((section) => section.id === "structure")?.groupIds ?? [];
  const flowIds = presetRailSections.find((section) => section.id === "event-flow")?.groupIds ?? [];
  const structureCount = items.filter((item) => structureIds.includes(item.groupId)).length;
  const flowCount = items.filter((item) => flowIds.includes(item.groupId)).length;

  const stages = flowIds
    .map((groupId) => {
      const plan = stageFillPlan(groupId, project);
      const count = items.filter((item) => item.groupId === groupId).length;
      const iconPicked = plan.slots.some((slot) => pickedIconSlots.includes(slot));
      return {
        groupId,
        plan,
        name: groupName(groupId, locale),
        count,
        on: count > 0 || iconPicked,
        fillable: Boolean(plan.optionId) || plan.slots.length > 0,
      };
    })
    // A stage that cannot be set up is not a gap; leave it out of the count.
    .filter((stage) => stage.on || stage.fillable);
  const stagesDone = stages.filter((stage) => stage.on).length;


  /*
   * The three columns, counted by `layerContentsForProject` — the Layers
   * tree's own function — so the map and the tree cannot disagree. That is
   * the second half of a confusion the first version caused: the pill said 20
   * components while the tree said 中栏 2, because the total counts settings
   * (a thinking style, a motion) and the tree counts modules sitting in a
   * column. The total stays what it was; the map is the per-column answer.
   *
   * Side columns are deliberately not to-dos: plenty of agent UIs are one
   * column, so 补全 never turns them on. An off column is one click away
   * here instead.
   */
  const layerRows = layerContentsForProject(project, locale, layerItems, pickedOptionIds);
  const columns = (["left", "center", "right"] as const).map((id) => {
    const row = layerRows.find((layer) => layer.id === id);
    const editOption = LAYER_EDIT_OPTIONS[id];
    const editGroup = presetGroups.find((group) => group.options.some((option) => option.id === editOption))?.id;
    return {
      id,
      label: REGION_LAYERS.find((layer) => layer.id === id)?.label[locale] ?? id,
      on: Boolean(row),
      count: row?.children.length ?? 0,
      presence: LAYER_PRESENCE_OPTIONS[id]?.[0],
      editGroup,
      editOption,
    };
  });

  const todos: Todo[] = [
    ...missing.map<Todo>((item) => ({
      key: `req-${item.groupId}`,
      groupId: item.groupId,
      kind: "required",
      hint: copy.willEnable(optionName(item.optionId, locale)),
      jumpOptionId: item.optionId,
      fill: () => onFillRequired(item),
    })),
    ...columns
      .filter((column) => column.on && column.count === 0 && (column.id === "left" || column.id === "right"))
      .map<Todo>((column) => {
        const kit = EMPTY_COLUMN_KITS[column.id as "left" | "right"];
        return {
          key: `col-${column.id}`,
          groupId: column.editGroup ?? (column.id === "left" ? "sidebar" : "output"),
          kind: "optional",
          title: copy.emptyColumnTodo(column.label),
          hint: copy.willAdd(kit.map((id) => optionName(id, locale)).join(locale === "en" ? ", " : "、")),
          jumpOptionId: column.editOption,
          fill: () => onFillOptions(kit),
        };
      }),
    ...stages
      .filter((stage) => !stage.on)
      .map<Todo>((stage) => ({
        key: `stage-${stage.groupId}`,
        groupId: stage.groupId,
        kind: "optional",
        hint: stage.plan.optionId
          ? copy.willEnable(optionName(stage.plan.optionId, locale))
          : copy.useDefaultIcons(stage.plan.slots.length),
        jumpOptionId: stage.plan.optionId,
        fill: () => onFillStage(stage.groupId),
      })),
  ];
  const fillAll = () => {
    for (const todo of todos) todo.fill();
  };

  const requiredDone = REQUIRED_GROUP_IDS.length - missing.length;
  /* Nothing picked reads 0%. The composer is required and on the canvas from
     the start, so it counted as one step done and an untouched canvas showed
     "已选 0" beside an 11% ring — two answers to one question. */
  const progress =
    items.length === 0 ? 0 : (requiredDone + stagesDone) / (REQUIRED_GROUP_IDS.length + stages.length || 1);
  const tone: Tone = missing.length > 0 ? "warn" : todos.length > 0 ? "todo" : "ok";
  const conversationOff = missing.some((item) => item.groupId === "conversation");
  const shownStage = stages.find((stage) => stage.groupId === hoverStage);

  /* Hover opens after a beat and closes after a longer one, so crossing the
     pill on the way somewhere does not set it flapping, and the gap between
     pill and pointer on the way into the card does not shut it. */
  const schedule = (next: boolean, delay: number) => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHovered(next), delay);
  };
  useEffect(() => () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
  }, []);

  useEffect(() => {
    if (!pinned) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setPinned(false);
      setHovered(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPinned(false);
        setHovered(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [pinned]);

  const pillStatus =
    /* The same number as the card's 待补全 badge; the colour is what says
       whether any of it is required. */
    tone === "warn" ? copy.missing(todos.length) : tone === "todo" ? copy.optionalLeft(todos.length) : copy.ready;

  return (
    <div
      className="sel-island-anchor"
      ref={rootRef}
      onPointerEnter={() => schedule(true, 140)}
      onPointerLeave={() => schedule(false, 260)}
    >
      {/* `layoutDependency`: the shell's spring is the pill-to-card morph and
          nothing else. Left to measure on every render it also ran when the
          card's own content changed height — 清空 swapping the done note for
          ten rows — and a layout animation is a scale, so the text inside was
          stretched and snapped back: the hitch. */}
      <motion.div
        layout
        layoutDependency={open}
        className="sel-island"
        data-appearance={appearance}
        data-open={open ? "true" : undefined}
        data-tone={tone}
        transition={SPRING}
        style={{ borderRadius: open ? 20 : 999 }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {open ? (
            <motion.div
              key="card"
              layout="position"
              className="sel-island-card"
              /* A click inside a hover-opened card means the reader is using
                 it: keep it open when the pointer leaves. */
              onPointerDown={() => setPinned(true)}
              initial={{ opacity: 0, y: -6, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ ...CONTENT, delay: 0.04 }}
            >
              <div className="sel-island-head">
                <div className="sel-island-head-text">
                  <span className="sel-island-kicker">{copy.total}</span>
                  <RollingNumber value={items.length} className="sel-island-big" />
                </div>
                <div className="sel-island-progress" aria-label={`${copy.progress} ${Math.round(progress * 100)}%`}>
                  <Ring value={progress} size={46} stroke={4} tone={tone} />
                  <span className="sel-island-progress-value">
                    {Math.round(progress * 100)}
                    <small>%</small>
                  </span>
                </div>
              </div>

              <div className="sel-island-stats">
                <div className="sel-island-stat">
                  <span className="sel-island-stat-label">{copy.structure}</span>
                  <RollingNumber value={structureCount} className="sel-island-stat-value" />
                </div>
                <div className="sel-island-stat sel-island-stat-flow">
                  <span className="sel-island-stat-label">{copy.flow}</span>
                  <span className="sel-island-stat-line">
                    <RollingNumber value={flowCount} className="sel-island-stat-value" />
                    {/* The strip's caption: the count of stages, or the stage
                        under the pointer — a name for each segment without a
                        tooltip covering the strip. */}
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={shownStage ? shownStage.groupId : "all"}
                        className="sel-island-stat-sub"
                        data-on={shownStage ? (shownStage.on ? "true" : "false") : undefined}
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -3 }}
                        transition={{ duration: 0.14 }}
                      >
                        {shownStage
                          ? `${shownStage.name} · ${shownStage.on ? copy.stageOn : copy.stageOff}`
                          : copy.stages(stagesDone, stages.length)}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <div className="sel-island-strip" role="list" onPointerLeave={() => setHoverStage(null)}>
                    {stages.map((stage, index) => (
                      <motion.button
                        key={stage.groupId}
                        type="button"
                        role="listitem"
                        className="sel-island-strip-seg"
                        data-on={stage.on ? "true" : undefined}
                        aria-label={`${stage.name} ${stage.on ? copy.stageOn : copy.stageOff}`}
                        initial={{ scaleX: 0.3, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ ...CONTENT, delay: 0.08 + index * 0.03 }}
                        onPointerEnter={() => setHoverStage(stage.groupId)}
                        onFocus={() => setHoverStage(stage.groupId)}
                        onBlur={() => setHoverStage(null)}
                        onClick={() => onJumpToGroup(stage.groupId, stage.on ? undefined : stage.plan.optionId)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="sel-island-layout">
                <span className="sel-island-section-label">{copy.layout}</span>
                <div className="sel-island-map">
                  {columns.map((column, index) => (
                    <motion.button
                      key={column.id}
                      type="button"
                      className="sel-island-col"
                      data-col={column.id}
                      data-on={column.on ? "true" : undefined}
                      data-empty={column.on && column.count === 0 ? "true" : undefined}
                      data-selected={chosenColumn === column.id && column.editGroup === activeGroupId ? "true" : undefined}
                      aria-pressed={chosenColumn === column.id && column.editGroup === activeGroupId}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...CONTENT, delay: 0.1 + index * 0.04 }}
                      onClick={() => {
                        setChosenColumn(column.id);
                        // Switching a column on also opens its settings: the
                        // next thing to do with an empty column is fill it.
                        if (!column.on && column.presence) onEnableColumn(column.presence);
                        if (column.editGroup) onJumpToGroup(column.editGroup, column.editOption);
                      }}
                    >
                      <span className="sel-island-col-name">{column.label}</span>
                      {column.on && column.count > 0 ? (
                        <span className="sel-island-col-count">{copy.modules(column.count)}</span>
                      ) : column.on ? (
                        <span className="sel-island-col-add">
                          <Plus size={11} strokeWidth={2.2} aria-hidden="true" />
                          {copy.emptyColumn}
                        </span>
                      ) : (
                        <span className="sel-island-col-add">
                          <Plus size={11} strokeWidth={2.2} aria-hidden="true" />
                          {column.id === "left" || column.id === "right" ? copy.columnHint[column.id] : copy.turnOn}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {conversationOff && flowCount > 0 ? (
                <div className="sel-island-note">
                  <Info size={13} aria-hidden="true" />
                  <span>{copy.hiddenFlow}</span>
                </div>
              ) : null}

              {/* popLayout on both: the one leaving steps out of the flow at
                  once instead of holding its space while the other arrives. */}
              <AnimatePresence initial={false} mode="popLayout">
                {todos.length > 0 ? (
                  <motion.div
                    key="todo"
                    className="sel-island-todo"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.16 } }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  >
                    <div className="sel-island-todo-head">
                      <span className="sel-island-todo-title">
                        {copy.todo}
                        <RollingNumber value={todos.length} className="sel-island-todo-count" />
                      </span>
                      <button type="button" className="sel-island-fill" onClick={fillAll}>
                        <Sparkles size={12} aria-hidden="true" />
                        {copy.fillAll}
                      </button>
                    </div>
                    {/* Each row: the stage's own rail icon, its name (which
                        opens the rail on the card that fills it), what filling
                        it in will do, and a button that does just that. Filled
                        rows fold away, so the list visibly gets shorter. */}
                    <div className="sel-island-todo-list">
                    <AnimatePresence initial={false}>
                      {todos.map((todo, index) => {
                        const Icon = presetGroupIcons[todo.groupId];
                        return (
                          /* Staggered for the first few only: past the fold
                             nobody sees the cascade, and ten of them took
                             half a second to arrive. No per-row layout
                             measuring — ten rows correcting their own
                             positions fought the list as it filled. */
                          <motion.div
                            key={todo.key}
                            className="sel-island-row"
                            data-kind={todo.kind}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, transition: { duration: 0.2 } }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 4) * 0.03 }}
                          >
                            <span className="sel-island-row-icon" aria-hidden="true">
                              {Icon ? <Icon size={14} strokeWidth={1.8} /> : null}
                            </span>
                            <button
                              type="button"
                              className="sel-island-row-main"
                              onClick={() => onJumpToGroup(todo.groupId, todo.jumpOptionId)}
                            >
                              <span className="sel-island-row-name">
                                {todo.title ?? groupName(todo.groupId, locale)}
                                <span className="sel-island-row-tag" data-kind={todo.kind}>
                                  {todo.kind === "required" ? copy.required : copy.optional}
                                </span>
                              </span>
                              <span className="sel-island-row-hint">{todo.hint}</span>
                            </button>
                            <button type="button" className="sel-island-row-fill" onClick={todo.fill}>
                              {copy.fillOne}
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    </div>
                    <p className="sel-island-scope">{copy.scope}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AnimatePresence initial={false} mode="popLayout">
                {todos.length === 0 ? (
                  <motion.div
                    key="ok"
                    className="sel-island-ok"
                    initial={{ opacity: 0, scale: 0.94, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    transition={{ type: "spring", stiffness: 460, damping: 26 }}
                  >
                    <motion.span
                      className="sel-island-ok-check"
                      initial={{ scale: 0, rotate: -40 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 520, damping: 18, delay: 0.08 }}
                    >
                      <Check size={12} strokeWidth={2.6} aria-hidden="true" />
                    </motion.span>
                    <span className="sel-island-ok-text">
                      {copy.allSet}
                      <small>{copy.scope}</small>
                    </span>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="sel-island-foot">
                <AnimatePresence mode="popLayout" initial={false}>
                  {typeof clearState === "object" ? (
                    <motion.div
                      key="cleared"
                      className="sel-island-cleared"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={CONTENT}
                    >
                      <span>{copy.cleared(Math.max(0, clearState.before - items.length))}</span>
                      <button
                        type="button"
                        className="sel-island-undo"
                        onClick={() => {
                          onUndoClear();
                          setClearState("idle");
                        }}
                      >
                        <Undo2 size={12} aria-hidden="true" />
                        {copy.undo}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="clear"
                      type="button"
                      layout
                      className="sel-island-clear"
                      data-armed={clearState === "armed" ? "true" : undefined}
                      disabled={items.length === 0}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ ...CONTENT, layout: SPRING }}
                      onClick={() => {
                        if (clearState === "armed") {
                          const before = items.length;
                          onClearAll();
                          setClearState({ before });
                        } else {
                          setClearState("armed");
                        }
                      }}
                    >
                      <Trash2 size={12} aria-hidden="true" />
                      {clearState === "armed" ? copy.clearConfirm : copy.clearAll}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="pill"
              type="button"
              layout="position"
              className="sel-island-pill"
              aria-expanded={false}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              transition={CONTENT}
              onClick={() => setPinned(true)}
            >
              <PillMark value={progress} tone={tone} />
              <span className="sel-island-pill-count">
                {copy.selected(items.length).split(String(items.length)).map((part, index, parts) => (
                  <span key={index}>
                    {part}
                    {index < parts.length - 1 ? <RollingNumber value={items.length} /> : null}
                  </span>
                ))}
              </span>
              <span className="sel-island-pill-sep" aria-hidden="true" />
              <span className="sel-island-pill-status" data-tone={tone}>
                {pillStatus}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
