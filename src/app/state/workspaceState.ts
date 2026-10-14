import type { Dispatch } from "react";

import type { AgentUXEvent } from "../../agentux";
import type { ScenarioId } from "../../agentmatrix";
import type { OutputPanelItem } from "../../components/agent-preview/OutputFrame";
import type { AppLocale } from "../../i18n/uiCopy";
import type { ScaffoldExportSnapshot } from "../../export/scaffoldManifest";
import { fixtureForPresetOption } from "../../preview/presetFixture";
import type { PreviewFixtureId } from "../../preview/fixtures";
import type { GitPreviewState, PreviewScenarioId } from "../../preview-runner/PreviewRunner";
import type { LiveLlmMessage } from "../../preview-runner/LiveLlmPreviewRunner";
import { resolveDefaultPreviewScenario } from "../../preview-runner/PreviewRunner";
import type { LivePreviewState } from "../../preview-runner/runModeState";
import {
  createEphemeralPiConversation,
  replacePiConversation,
  type EphemeralPiConversation,
} from "../../pi/piConversationState";
import type { PiRuntimeState } from "../../pi/piClient";
import { DEFAULT_CANVAS_BACKGROUND, type CanvasBackgroundId } from "../view/canvasBackgrounds";
import { defaultCodingAgentProject, type AgentFrontendProject } from "../../schema/agentuxConfig";
import { OPTION_GROUP_IDS, PRESET_GROUP_REGIONS, type NavSectionId } from "../projection/presetRailData";
import type { PresetGroupId } from "../../schema/presets";
import { mergeOutputPanelItems } from "../projection/outputPanelProjection";
import { defaultPreviewPromptForLocale } from "../projection/previewDefaults";
import type { RunMode } from "../appTypes";

/**
 * Workspace state machine (Command pattern).
 *
 * Every action handler transcribes, field for field, the setState sequence the
 * corresponding function in the old App() performed — the transitions are pure
 * and unit-testable, and the repeated "reset tail" shared by a dozen preview
 * entry points is written once per intent instead of twelve times.
 */
export type WorkspaceState = {
  surfaceMode: "builder" | "saved-preview";
  workspaceView: "preview" | "debug";
  /**
   * Which of the rail's four destinations is open (File / Theme / Components /
   * Model). Separate from `selectedGroup`, which still tracks the preset group
   * open *within* Components — collapsing the two would lose the group you were
   * editing every time you looked at Layers.
   */
  navSection: NavSectionId;
  /** Which canvas region the Layers list has selected, or null for none. */
  selectedLayerId: string | null;
  /** Which component inside a region is selected, by slot id. */
  selectedSlotId: string | null;
  /**
   * Canvas magnification, as a percentage. Scales what the canvas *shows*
   * without reflowing it — the frame keeps laying out at its real size, so
   * zooming in is not a way to see the narrow-viewport layout. That is what
   * resizing the frame is for.
   */
  canvasZoom: number;
  /**
   * What the canvas is painted with, from preferences. The editor's own
   * backdrop, not the project's — the agent being designed carries its theme,
   * and this is the room it is being looked at in.
   */
  canvasBackground: CanvasBackgroundId;
  /**
   * Whether the rail card is folded away to its wordmark row, giving the canvas
   * the width. Session state, like the canvas zoom: it is where the reader has
   * put the furniture, not part of the agent being designed.
   */
  railCollapsed: boolean;
  /**
   * Whether the canvas's panel — the layer list, and the zoom readout under it
   * — is open. Open to start: the panel is where the style cards live, and the
   * cards are one of the two ways into this product — "pick a ready-made look"
   * should be visible on arrival rather than behind a chevron. (It used to
   * start closed, on the grounds that a list of what is on the canvas is
   * something you ask for; the panel holds more than that list now.)
   */
  layersOpen: boolean;
  /**
   * Whether the canvas is being looked at as an interface rather than edited as
   * a design.
   *
   * Distinct from `surfaceMode: "saved-preview"`, which is a *run* preview: it
   * snapshots the project, builds an export snapshot, picks a scenario and
   * plays a transcript through it, and it is gated behind the completeness
   * dialog. This is the cheaper question the builder had no answer for — "what
   * does what I have right now look like, without my furniture on top of it" —
   * so it reads the live project, starts nothing, and gates on nothing.
   *
   * Session state: the chrome folds away, the canvas stops being inert, and
   * neither of those is part of the agent being designed.
   */
  uiPreview: boolean;
  /**
   * The option the rail should scroll to and flash, set by the canvas
   * toolbar's Edit. Cleared once the rail has shown it, so re-selecting the
   * same module flashes again rather than being a no-op.
   */
  pinnedOptionId: string | null;
  /**
   * Options the reader has actually clicked, this session.
   *
   * Needed because the project cannot answer it for some groups. A thinking
   * indicator, a tool-card layout and a media placeholder are each one of a
   * mutually exclusive set with no "off" value in the schema — `reasoning.show`
   * is "status" | "summary" | "thinking" and nothing else — so one is always
   * set and "has a thinking block been asked for?" is unanswerable from state.
   * Tracking the click is the only honest answer, and it is the rule anyway:
   * picked means picked.
   */
  pickedOptionIds: readonly string[];
  /**
   * Icon slots whose icon the reader has chosen, this session.
   *
   * Same problem as `pickedOptionIds` in a different place: every slot always
   * holds an icon, so the galleries had no way to tell a default apart from a
   * choice and showed every row's first tile as picked.
   */
  pickedIconSlots: readonly string[];
  /**
   * Whether the canvas is showing the product's welcome state.
   *
   * Asked for, not inferred. It used to be inferred from an empty timeline,
   * which is also what an unconfigured canvas looks like — so a new project
   * opened on a greeting nobody had written and a composer floating in the
   * middle of the column. The greeting field lights this up while it is being
   * edited, which is the only time the welcome state is the thing being
   * configured.
   */
  welcomeActive: boolean;
  /**
   * Sidebar width in px, or null for the style's own default.
   *
   * Session state, like the right split: `layout.mainSize` is the *default*
   * the panel group starts from, and dragging it does not write back either.
   */
  sidebarWidth: number | null;
  /** The right column's dragged width; `null` is the style's default, the sidebar's. */
  rightPanelWidth: number | null;
  selectedGroup: PresetGroupId;
  presetDrawerOpen: boolean;
  selectedFixtureId: PreviewFixtureId;
  standardScenarioId: ScenarioId;
  showStandard: boolean;
  activeStateCode: string | null;
  runEvents: AgentUXEvent[] | undefined;
  runEventSource: RunMode | undefined;
  runMode: RunMode;
  writingReplayKey: number;
  previewRefreshing: boolean;
  forcePreviewToolsOpen: boolean;
  toolCollapseSignal: number;
  liveRunning: boolean;
  livePreviewState: LivePreviewState;
  liveMessages: LiveLlmMessage[];
  gitPreviewStateOverride: GitPreviewState | undefined;
  externalApprovalOverlayActive: boolean;
  inlineApprovalOverlayActive: boolean;
  dismissedApprovalId: string | null;
  previewPrompt: string;
  selectedScenarioId: PreviewScenarioId;
  sentPrompts: readonly string[];
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  /**
   * The right column is mid-fold, in either direction.
   *
   * Transient, and it exists because that column cannot fold the way the left
   * one does. The left is a fixed-width flex item, so `data-left-collapsed`
   * slides it out on `margin-left` and the centre grows into the space for
   * free. The right column is a `Panel` of a `react-resizable-panels` group
   * whose width is an inline percentage, and closing it swapped the whole
   * subtree for a solo stack — a remount, so there was nothing to transition
   * and the centre snapped to full width in one frame.
   *
   * With this flag the panel stays mounted for `COLUMN_EXIT_MS` while CSS
   * drives both tracks (right to 0%, centre to 100%), then the subtree swaps.
   * Same two-phase idiom the left column's *delete* already uses.
   */
  rightCollapsing: boolean;
  autoHiddenRails: { left: boolean; right: boolean };
  piConversations: readonly EphemeralPiConversation[];
  activePiConversationId: string;
  piRuntimeState: PiRuntimeState | undefined;
  savedProject: AgentFrontendProject | undefined;
  exportSnapshot: ScaffoldExportSnapshot | undefined;
  outputPanelItems: OutputPanelItem[];
  activeOutputPanelItemId: string | undefined;
  outputModalOpen: boolean;
};

export type WorkspaceAction =
  | { type: "patch"; patch: Partial<WorkspaceState> }
  | { type: "bump"; key: "writingReplayKey" | "toolCollapseSignal" }
  | { type: "recordPrompt"; prompt: string }
  | { type: "updateSavedProject"; mutator: (current: AgentFrontendProject) => AgentFrontendProject }
  | { type: "resetRun"; mode?: RunMode; prompt?: string }
  | { type: "enterWelcome" }
  | { type: "leaveWelcome" }
  | { type: "fixtureSelected"; fixtureId: PreviewFixtureId }
  | { type: "optionPicked"; optionId: string }
  | { type: "iconSlotPicked"; slot: string }
  | { type: "presetFixtureSelected"; optionId: string }
  | { type: "beginStandardStream"; scenarioId: ScenarioId; externalApproval: boolean }
  | { type: "streamEvents"; events: AgentUXEvent[] }
  | { type: "previewStateCard"; events: AgentUXEvent[]; code: string; externalApproval: boolean }
  | { type: "showToolActionsOverview"; events: AgentUXEvent[]; forceOpen: boolean }
  | { type: "replayWritingOutput" }
  | { type: "replayConversationFixture" }
  | { type: "replayStandardScenario"; scenarioId: ScenarioId; events: AgentUXEvent[] }
  | { type: "conversationWritingPreview"; events: AgentUXEvent[] }
  | { type: "mediaPreviewStarted"; events: AgentUXEvent[]; scenarioId: PreviewScenarioId; prompt: string }
  | { type: "replayCurrent"; fallback: AgentUXEvent[] }
  | { type: "presetGroupSelected"; groupId: PresetGroupId }
  | { type: "uiPreviewToggled"; active: boolean }
  | { type: "savedPreviewEntered"; saved: AgentFrontendProject; snapshot: ScaffoldExportSnapshot; scenarioId: PreviewScenarioId; runMode: RunMode; live: boolean }
  | { type: "savedReplayStarted"; prompt: string; externalApproval: boolean }
  | { type: "liveTurnStarted"; prompt: string; messages: LiveLlmMessage[] }
  | { type: "liveFinished"; messages: LiveLlmMessage[]; events: AgentUXEvent[] }
  | { type: "piTurnStarted"; prompt: string; conversation: EphemeralPiConversation; events: AgentUXEvent[] }
  | { type: "piConversationUpdated"; conversation: EphemeralPiConversation; events: AgentUXEvent[] }
  | { type: "piConfigurationFailed"; conversation: EphemeralPiConversation; events: AgentUXEvent[] }
  | { type: "piConversationSelected"; conversationId: string; events: AgentUXEvent[] }
  | { type: "newPiConversationStarted"; conversation: EphemeralPiConversation }
  | { type: "runModeChanged"; mode: RunMode; restoreEvents?: AgentUXEvent[] }
  | { type: "gitOverrideCommitted"; state: GitPreviewState }
  | { type: "outputItemOpened"; item: OutputPanelItem; inModal: boolean }
  | { type: "outputItemClosed"; id: string }
  | { type: "outputPanelAutoFilled"; items: OutputPanelItem[] }
  | { type: "outputPanelReset" }
  | { type: "autoRailsHidden"; rails: { left: boolean; right: boolean } }
  | { type: "localeDefaultPromptSwapped"; from: AppLocale; to: AppLocale };

export type WorkspaceDispatch = Dispatch<WorkspaceAction>;

export function createInitialWorkspaceState(locale: AppLocale): WorkspaceState {
  const initialConversation = createEphemeralPiConversation();
  return {
    surfaceMode: "builder",
    workspaceView: "preview",
    // The first question the rail asks: what is the screen made of. (It opened
    // on File until the layer list moved to the canvas's own panel.)
    navSection: "structure",
    selectedLayerId: null,
    selectedSlotId: null,
    /*
     * 100, and it has to be.
     *
     * A previous pass set this to 110 to make the drawing bigger. It does — and
     * the frame then renders larger than the surface, which collapses its
     * `margin: auto` and pins it to the top left, so the canvas overflows and
     * loses its bottom gap entirely. Measured: for 110% to still leave the
     * 8px the floating cards leave, the surface would have to be under ~492px
     * tall.
     *
     * The frame is already `min(100cqw, (100cqh - gutters) * ratio)` — as large
     * as the free space allows inside its 16:10 cap — so "bigger and fully
     * visible" is not available from zoom. What is available is the 16px the
     * bottom padding was over-reserving, which `--canvas-pad-bottom` now gives
     * back.
     */
    canvasZoom: 100,
    canvasBackground: DEFAULT_CANVAS_BACKGROUND,
    railCollapsed: false,
    layersOpen: true,
    uiPreview: false,
    pinnedOptionId: null,
    pickedOptionIds: [],
    pickedIconSlots: [],
    welcomeActive: false,
    sidebarWidth: null,
    rightPanelWidth: null,
    // First group of the Structure destination, so opening 架构 shows 左栏
    // expanded rather than whichever group happened to be the old default.
    selectedGroup: "sidebar",
    presetDrawerOpen: false,
    // The smallest complete conversation. A full coding run put reasoning, two
    // tool cards and an artifact on the canvas before anything had been
    // configured; presets that need that richer content switch to it
    // themselves (see `presetFixture.ts`).
    selectedFixtureId: "simple-chat",
    standardScenarioId: "normal-turn",
    showStandard: false,
    activeStateCode: null,
    runEvents: [],
    runEventSource: undefined,
    runMode: "replay",
    writingReplayKey: 0,
    previewRefreshing: false,
    forcePreviewToolsOpen: false,
    toolCollapseSignal: 0,
    liveRunning: false,
    livePreviewState: "idle",
    liveMessages: [],
    gitPreviewStateOverride: undefined,
    externalApprovalOverlayActive: false,
    inlineApprovalOverlayActive: false,
    dismissedApprovalId: null,
    previewPrompt: defaultPreviewPromptForLocale(locale),
    selectedScenarioId: resolveDefaultPreviewScenario(defaultCodingAgentProject),
    sentPrompts: [],
    leftCollapsed: false,
    rightCollapsing: false,
    /*
     * Folded on first entry. The right column is part of the structure — it is
     * there to be configured — but nothing has been put in it yet, and an empty
     * column taking a third of the page says less than a wider centre plus a
     * control that says "there is a column here". That control sits at the
     * centre column's top right, which is where the column's own edge is; it
     * used to open unfolded, on the grounds that the editor should show all
     * three on first paint.
     */
    rightCollapsed: true,
    autoHiddenRails: { left: false, right: false },
    piConversations: [initialConversation],
    activePiConversationId: initialConversation.id,
    piRuntimeState: undefined,
    savedProject: undefined,
    exportSnapshot: undefined,
    outputPanelItems: [],
    activeOutputPanelItemId: undefined,
    outputModalOpen: false,
  };
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.patch };
    case "bump":
      return { ...state, [action.key]: state[action.key] + 1 };
    case "recordPrompt": {
      const trimmed = action.prompt.trim();
      if (!trimmed) {
        return state;
      }
      // Deduped and capped: re-sending the same text should move it to the top rather than add a
      // second identical row, and the sidebar is a preview surface, not a transcript store.
      return {
        ...state,
        // Typing into a new chat is how a reader leaves the welcome state; it
        // is the one thing that screen is asking for.
        welcomeActive: false,
        sentPrompts: [trimmed, ...state.sentPrompts.filter((entry) => entry !== trimmed)].slice(0, 12),
      };
    }
    case "updateSavedProject":
      return { ...state, savedProject: state.savedProject ? action.mutator(state.savedProject) : state.savedProject };
    case "resetRun":
      return {
        ...state,
        runEvents: undefined,
        runEventSource: undefined,
        liveMessages: [],
        externalApprovalOverlayActive: false,
        dismissedApprovalId: null,
        livePreviewState: "idle",
        gitPreviewStateOverride: undefined,
        forcePreviewToolsOpen: false,
        ...(action.mode !== undefined ? { runMode: action.mode } : {}),
        ...(action.prompt !== undefined ? { previewPrompt: action.prompt } : {}),
      };
    /*
     * Back to the conversation, without starting a run.
     *
     * The sidebar's rows used to leave the welcome state by streaming a
     * standard scenario, which the builder's canvas ignores — it shows the
     * project's own reply, not a canned demo (see `usesCanvasTimeline`). So the
     * click appeared to do nothing. Clearing the flag is the whole of it: the
     * reply is already playing underneath.
     */
    case "leaveWelcome":
      return state.welcomeActive ? { ...state, welcomeActive: false } : state;
    case "enterWelcome":
      return {
        ...state,
        welcomeActive: true,
        showStandard: false,
        activeStateCode: null,
        runEvents: [],
        runEventSource: undefined,
        liveMessages: [],
        livePreviewState: "idle",
        gitPreviewStateOverride: undefined,
        previewPrompt: "",
        workspaceView: "preview",
      };
    case "fixtureSelected":
      return {
        ...state,
        selectedFixtureId: action.fixtureId,
        runEvents: undefined,
        runEventSource: undefined,
        liveMessages: [],
        externalApprovalOverlayActive: false,
        dismissedApprovalId: null,
        livePreviewState: "idle",
        gitPreviewStateOverride: undefined,
        forcePreviewToolsOpen: false,
      };
    case "iconSlotPicked":
      return state.pickedIconSlots.includes(action.slot)
        ? state
        : { ...state, pickedIconSlots: [...state.pickedIconSlots, action.slot] };
    case "optionPicked": {
      const picking = !state.pickedOptionIds.includes(action.optionId);
      const groupId = OPTION_GROUP_IDS.get(action.optionId);
      const livesInRightColumn = groupId ? PRESET_GROUP_REGIONS[groupId] === "right-panel" : false;
      return {
        ...state,
        /*
         * And out of the welcome state, which is a canvas with no conversation
         * in it — so a component picked while it is on would have nowhere to
         * appear. A pick that changes nothing is the one thing this canvas must
         * never do (same reasoning as the right column below).
         *
         * Editing the greeting does not come through here: that field
         * re-enters the welcome state on focus (`previewWelcomeState`) and
         * writes the project, not a pick. So the one case where the welcome
         * state *is* the thing being configured keeps it.
         */
        welcomeActive: false,
        // Toggled, not appended: clicking the same option again un-picks it,
        // and the canvas has to follow that back down.
        pickedOptionIds: picking
          ? [...state.pickedOptionIds, action.optionId]
          : state.pickedOptionIds.filter((id) => id !== action.optionId),
        // Picking something that lives in the right column unfolds it. The
        // column starts folded, so otherwise the pick would put the thing on a
        // surface nobody can see — and a pick that changes nothing is the one
        // thing this canvas must never do.
        rightCollapsed: picking && livesInRightColumn ? false : state.rightCollapsed,
      };
    }
    case "presetFixtureSelected":
      return {
        ...state,
        selectedFixtureId: fixtureForPresetOption(action.optionId, state.selectedFixtureId),
      };
    case "beginStandardStream":
      return {
        ...state,
        standardScenarioId: action.scenarioId,
        showStandard: true,
        activeStateCode: null,
        surfaceMode: "builder",
        workspaceView: "preview",
        runEventSource: "replay",
        liveMessages: [],
        externalApprovalOverlayActive: action.externalApproval,
        // One approval surface at a time: opening the permission card closes
        // the inline question. Leaving it open put both above the composer,
        // side by side in one grid row, and squeezed the column to half.
        inlineApprovalOverlayActive: action.externalApproval ? false : state.inlineApprovalOverlayActive,
        dismissedApprovalId: null,
        gitPreviewStateOverride: undefined,
        forcePreviewToolsOpen: false,
        runEvents: [],
      };
    case "streamEvents":
      return { ...state, runEvents: [...action.events] };
    case "previewStateCard":
      return {
        ...state,
        showStandard: true,
        surfaceMode: "builder",
        workspaceView: "preview",
        runEventSource: "replay",
        liveMessages: [],
        externalApprovalOverlayActive: action.externalApproval,
        // One approval surface at a time: opening the permission card closes
        // the inline question. Leaving it open put both above the composer,
        // side by side in one grid row, and squeezed the column to half.
        inlineApprovalOverlayActive: action.externalApproval ? false : state.inlineApprovalOverlayActive,
        dismissedApprovalId: null,
        gitPreviewStateOverride: undefined,
        forcePreviewToolsOpen: false,
        runEvents: action.events,
        activeStateCode: action.code,
      };
    case "showToolActionsOverview":
      return {
        ...state,
        showStandard: true,
        surfaceMode: "builder",
        workspaceView: "preview",
        runEventSource: "replay",
        liveMessages: [],
        externalApprovalOverlayActive: false,
        dismissedApprovalId: null,
        gitPreviewStateOverride: undefined,
        forcePreviewToolsOpen: action.forceOpen,
        runEvents: action.events,
        activeStateCode: "tool-actions-overview",
      };
    case "replayWritingOutput":
      return {
        ...state,
        activeStateCode: null,
        surfaceMode: "builder",
        workspaceView: "preview",
        writingReplayKey: state.writingReplayKey + 1,
        externalApprovalOverlayActive: false,
      };
    case "replayConversationFixture":
      return {
        ...state,
        showStandard: false,
        activeStateCode: null,
        surfaceMode: "builder",
        workspaceView: "preview",
        runEventSource: "replay",
        runEvents: undefined,
        selectedFixtureId: "coding-agent",
        liveMessages: [],
        externalApprovalOverlayActive: false,
        dismissedApprovalId: null,
        gitPreviewStateOverride: undefined,
        writingReplayKey: state.writingReplayKey + 1,
      };
    case "replayStandardScenario":
      return {
        ...state,
        standardScenarioId: action.scenarioId,
        showStandard: true,
        activeStateCode: null,
        surfaceMode: "builder",
        workspaceView: "preview",
        runEventSource: "replay",
        runEvents: action.events,
        liveMessages: [],
        externalApprovalOverlayActive: false,
        dismissedApprovalId: null,
        gitPreviewStateOverride: undefined,
        writingReplayKey: state.writingReplayKey + 1,
      };
    case "conversationWritingPreview":
      return {
        ...state,
        showStandard: true,
        activeStateCode: null,
        surfaceMode: "builder",
        workspaceView: "preview",
        runEventSource: "replay",
        runEvents: action.events,
        liveMessages: [],
        externalApprovalOverlayActive: false,
        dismissedApprovalId: null,
        gitPreviewStateOverride: undefined,
        forcePreviewToolsOpen: false,
        writingReplayKey: state.writingReplayKey + 1,
      };
    case "mediaPreviewStarted":
      return {
        ...state,
        showStandard: false,
        activeStateCode: null,
        surfaceMode: "builder",
        workspaceView: "preview",
        runEventSource: "replay",
        runEvents: action.events,
        liveMessages: [],
        externalApprovalOverlayActive: false,
        inlineApprovalOverlayActive: false,
        dismissedApprovalId: null,
        gitPreviewStateOverride: undefined,
        forcePreviewToolsOpen: false,
        rightCollapsed: false,
        outputModalOpen: false,
        selectedScenarioId: action.scenarioId,
        previewPrompt: action.prompt,
        writingReplayKey: state.writingReplayKey + 1,
      };
    case "replayCurrent":
      return {
        ...state,
        runEventSource: "replay",
        runEvents: state.runEvents ? [...state.runEvents] : [...action.fallback],
      };
    case "presetGroupSelected":
      return {
        ...state,
        selectedGroup: action.groupId,
        surfaceMode: "builder",
        workspaceView: "preview",
        // Opening a group is a request to edit, and the rail it opens in is
        // folded away while the interface is being looked at.
        uiPreview: false,
      };
    case "uiPreviewToggled":
      return {
        ...state,
        uiPreview: action.active,
        // Selection is an editor mark and it paints *on the canvas* — a ring
        // round a module, a lit row in the layer list. Carrying it into a look
        // at the interface would leave the design surface's annotations on the
        // one view that is meant to be free of them. Not restored on the way
        // out: a ring the reader has stopped thinking about is worse than one
        // click to put it back.
        ...(action.active ? { selectedLayerId: null, selectedSlotId: null } : {}),
      };
    case "savedPreviewEntered":
      return {
        ...state,
        // The run preview is its own surface with its own chrome; the builder's
        // folded-away state must not follow it in.
        uiPreview: false,
        savedProject: action.saved,
        exportSnapshot: action.snapshot,
        selectedScenarioId: action.scenarioId,
        runMode: action.runMode,
        surfaceMode: "saved-preview",
        workspaceView: "preview",
        showStandard: false,
        ...(action.live
          ? {
              activeStateCode: null,
              runEvents: [],
              runEventSource: "live",
              liveMessages: [],
              livePreviewState: "idle",
              gitPreviewStateOverride: undefined,
              externalApprovalOverlayActive: false,
              dismissedApprovalId: null,
              forcePreviewToolsOpen: false,
              previewPrompt: "",
              // Nothing the builder had open belongs to a session that has not
              // produced anything yet.
              outputPanelItems: [],
              activeOutputPanelItemId: undefined,
              // A live run has nothing to show until the reader sends something,
              // so it opens on the product's own welcome screen — what the
              // exported app opens on. Without it the empty transcript fell
              // through to the replay placeholder, 未加载回放事件, under a run
              // mode that said 实时 LLM.
              welcomeActive: true,
            }
          : {}),
      };
    case "savedReplayStarted":
      return {
        ...state,
        showStandard: false,
        activeStateCode: null,
        previewPrompt: action.prompt,
        runEventSource: "replay",
        liveMessages: [],
        livePreviewState: "idle",
        gitPreviewStateOverride: undefined,
        externalApprovalOverlayActive: action.externalApproval,
        // One approval surface at a time: opening the permission card closes
        // the inline question. Leaving it open put both above the composer,
        // side by side in one grid row, and squeezed the column to half.
        inlineApprovalOverlayActive: action.externalApproval ? false : state.inlineApprovalOverlayActive,
        dismissedApprovalId: null,
        forcePreviewToolsOpen: false,
        writingReplayKey: state.writingReplayKey + 1,
        surfaceMode: "saved-preview",
        workspaceView: "preview",
      };
    case "liveTurnStarted":
      return {
        ...state,
        liveRunning: true,
        livePreviewState: "streaming",
        previewPrompt: action.prompt,
        liveMessages: action.messages,
        gitPreviewStateOverride: undefined,
        surfaceMode: "saved-preview",
        workspaceView: "preview",
      };
    case "liveFinished":
      return {
        ...state,
        liveMessages: action.messages,
        runEvents: action.events,
        runEventSource: "live",
        livePreviewState: "finished",
      };
    case "piTurnStarted":
      return {
        ...state,
        liveRunning: true,
        livePreviewState: "streaming",
        previewPrompt: action.prompt,
        piConversations: replacePiConversation(state.piConversations, action.conversation),
        gitPreviewStateOverride: undefined,
        surfaceMode: "saved-preview",
        workspaceView: "preview",
        runEvents: action.events,
        runEventSource: "pi",
      };
    case "piConversationUpdated":
      return {
        ...state,
        piConversations: replacePiConversation(state.piConversations, action.conversation),
        runEvents: action.events,
      };
    case "piConfigurationFailed":
      return {
        ...state,
        piConversations: replacePiConversation(state.piConversations, action.conversation),
        runEvents: action.events,
        livePreviewState: "error",
        liveRunning: false,
      };
    case "piConversationSelected":
      return {
        ...state,
        activePiConversationId: action.conversationId,
        runMode: "pi",
        runEventSource: "pi",
        runEvents: action.events,
        previewPrompt: "",
        liveMessages: [],
        livePreviewState: "idle",
        outputPanelItems: [],
        activeOutputPanelItemId: undefined,
        gitPreviewStateOverride: undefined,
      };
    case "newPiConversationStarted":
      return {
        ...state,
        piConversations: replacePiConversation(state.piConversations, action.conversation),
        activePiConversationId: action.conversation.id,
        showStandard: false,
        activeStateCode: null,
        runMode: "pi",
        runEvents: [],
        runEventSource: "pi",
        liveMessages: [],
        livePreviewState: "idle",
        previewPrompt: "",
        workspaceView: "preview",
        outputPanelItems: [],
        activeOutputPanelItemId: undefined,
        gitPreviewStateOverride: undefined,
      };
    case "runModeChanged":
      return {
        ...state,
        runMode: action.mode,
        livePreviewState: "idle",
        gitPreviewStateOverride: undefined,
        ...(action.restoreEvents
          ? {
              runEvents: [...action.restoreEvents],
              runEventSource: "pi" as const,
              liveMessages: [],
              // A Pi conversation with nothing in it yet is a new chat.
              welcomeActive: action.restoreEvents.length === 0,
            }
          : {}),
        /*
         * Into live, the replay's transcript goes. It used to stay on screen
         * under a control reading 实时 LLM — a canned conversation presented as
         * the live one — and the first prompt sent was appended to it. Live
         * starts where the exported app starts: an empty session, on the
         * welcome screen.
         */
        ...(action.mode === "live"
          ? {
              activeStateCode: null,
              runEvents: [],
              runEventSource: "live" as const,
              liveMessages: [],
              previewPrompt: "",
              welcomeActive: true,
              outputPanelItems: [],
              activeOutputPanelItemId: undefined,
            }
          : {}),
      };
    case "gitOverrideCommitted":
      return { ...state, gitPreviewStateOverride: action.state };
    case "outputItemOpened": {
      const opened: WorkspaceState = {
        ...state,
        outputPanelItems: mergeOutputPanelItems(state.outputPanelItems, [action.item]),
        activeOutputPanelItemId: action.item.id,
      };
      if (action.inModal) {
        return { ...opened, outputModalOpen: true };
      }
      return { ...opened, outputModalOpen: false, rightCollapsed: false };
    }
    case "outputItemClosed": {
      const index = state.outputPanelItems.findIndex((entry) => entry.id === action.id);
      if (index < 0) {
        return state;
      }
      const next = state.outputPanelItems.filter((entry) => entry.id !== action.id);
      const activeId = state.activeOutputPanelItemId;
      return {
        ...state,
        outputPanelItems: next,
        outputModalOpen: next.length === 0 ? false : state.outputModalOpen,
        activeOutputPanelItemId: activeId === action.id
          ? next[Math.max(0, index - 1)]?.id ?? next[0]?.id
          : activeId,
      };
    }
    case "outputPanelAutoFilled":
      return {
        ...state,
        outputPanelItems: mergeOutputPanelItems(state.outputPanelItems, action.items),
        activeOutputPanelItemId: action.items[action.items.length - 1]?.id,
      };
    case "outputPanelReset":
      return {
        ...state,
        outputPanelItems: [],
        activeOutputPanelItemId: undefined,
      };
    case "autoRailsHidden":
      return state.autoHiddenRails.left === action.rails.left && state.autoHiddenRails.right === action.rails.right
        ? state
        : { ...state, autoHiddenRails: action.rails };
    case "localeDefaultPromptSwapped": {
      const previousDefault = defaultPreviewPromptForLocale(action.from);
      const nextDefault = defaultPreviewPromptForLocale(action.to);
      return state.previewPrompt === previousDefault ? { ...state, previewPrompt: nextDefault } : state;
    }
    default:
      return state;
  }
}
