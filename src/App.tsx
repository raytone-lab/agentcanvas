import { resolveThemeTokens } from "./theme/customTheme";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
/* Through `uiIcons`, not `lucide-react`: these three are drawn *on* the canvas
   — the two column toggles and the layer row's edit pencil — so they have to
   follow the style's icon set like everything else on it. Imported raw, the
   Game style's carved marks sat beside two stock panel glyphs. */
import { PanelLeft, PanelRight, Pencil } from "./agentmatrix/uiIcons";
import { Toaster, toast } from "sonner";

import { useAgentUXRuntime, useAgentUXViewModel, type AgentUXEvent } from "./agentux";
import { ICON_OPTIONS, IconStyleProvider, UPLOADED_AVATAR_ID, iconStyleForStylePreset, scenarioById, useIconSet, type IconSlot } from "./agentmatrix";
import { RightSidebarRailIcon, SidebarRailIcon } from "./components/common/RailIcons";
import { ExternalApprovalSurface, InlineApprovalSurface } from "./components/agent-preview/ChatFrame";
import { OutputPanelModal } from "./components/agent-preview/OutputFrame";
import { ProviderFloatingSettings } from "./components/agent-preview/ProviderFloatingSettings";
import { CommandMenu } from "./components/CommandMenu";
import { useCopy, useLocale } from "./i18n/LocaleContext";
import { localizePreviewViewModel } from "./i18n/previewLocalization";
import { parsePreviewFixture, previewFixtures } from "./preview/fixtures";
import { createReasoningRenderPolicy } from "./preview/reasoningPreviewPolicy";
import {
  createPureFrontendPreviewRunner,
  gitPreviewStateFromEvents,
} from "./preview-runner/PreviewRunner";
import { aliasesForHarness, diagnosticMarkersForHarness } from "./harness/adapters/registry";
import {
  admissionSeverity,
  admitEvents,
  describeAdmission,
  hasAdmissionFindings,
} from "./runtime/admissionReport";
import { renderSlots, slotsForTemplate, type SlotRenderContext } from "./slots/slotRegistry";
import { applyWorkspaceSkins, resolveSkin, withSyncedSkinId } from "./theme/skinEngine";
import {
  defaultCodingAgentProject,
  emptyStructureProject,
  modelOptionsForProject,
  withEmptyStructure,
  type AgentCanvasRegion,
  type AgentFrontendProject,
} from "./schema/agentuxConfig";
import { applyPresetOption, isPresetOptionActive, togglePresetOption } from "./schema/presetActions";
import {
  presetGroupsForProject,
  projectPresetSummary,
  resolvePresetGroupSelection,
} from "./schema/presets";
import { piConversationSidebarItems } from "./pi/piConversationState";

import { InlineApprovalDemo, demoApprovalTool, findPendingApprovalTool } from "./app/view/InlineApprovalDemo";
import { PresetRail } from "./app/view/PresetRail";
import { RegionLabels } from "./app/view/RegionLabels";
import { canvasBackground } from "./app/view/canvasBackgrounds";
import { LayersPanel } from "./app/view/LayersPanel";
import { PreferencesDialog } from "./app/view/PreferencesDialog";
import { ProjectTitle } from "./app/view/ProjectTitle";
import { ShellBrand } from "./app/view/ShellBrand";
import { StyleCards, StyleChip, StyleRailThumbs } from "./app/view/StylePicker";
import { Topbar } from "./app/view/Topbar";
import { IncompleteProjectDialog } from "./app/view/IncompleteProjectDialog";
import { canvasTimelineEvents } from "./app/projection/canvasTimeline";
import { SketchFilters } from "./components/agent-preview/SketchFilters";
import { useCanvasReplay } from "./app/viewmodel/useCanvasReplay";
import { ModuleToolbar } from "./app/view/ModuleToolbar";
import { PointerHint, type PointerHintState } from "./app/view/PointerHint";
import {
  CANVAS_DRAG_SLOP,
  NO_CANVAS_PAN,
  anchoredPan,
  nextCanvasPan,
  wheelIntent,
  type CanvasPan,
} from "./app/view/canvasPan";
import { SelectionIsland, stageFillPlan } from "./app/view/SelectionIsland";
import { ZoomControl, clampZoomFine, zoomIn, zoomOut } from "./app/view/ZoomControl";
import {
  collectDefaultOutputPanelItems,
  outputPanelItemsSignature,
} from "./app/projection/outputPanelProjection";
import {
  styleAvatarOptionIds,
  styleSlotDefaults,
  styleMotionOptionIds,
  STYLE_SCOPED_REASONING_MOTIONS,
  visualStylePreset,
  PREVIEW_RESPONSIVE_WIDTHS,
  LAYER_EDIT_OPTIONS,
  AVATAR_CARD_GROUP_ID,
  avatarFlagForModule,
  groupForModule,
  LAYER_HIGHLIGHT_SELECTORS,
  pinnedOptionForModule,
  railLocationForGroup,
  LAYER_PRESENCE_OPTIONS,
  OPTION_GROUP_IDS,
  PRESENCE_OPTION_IDS,
  PRESET_GROUP_COMPONENTS,
  isOptionShownInRail,
  REGION_LAYERS,
  canvasSlotsForProject,
  layersForProject,
  missingRequirementsForProject,
  mountedComponentsForProject,
  isOptionSelectedInRail,
  isAddedContentOption,
  presetRailSections,
  RAIL_HIDDEN_OPTION_IDS,
  STYLE_AVATAR_DEFAULTS,
  groupPresetOptions,
  rawStateCardToStateCard,
  optionIdForModule,
  railLocationForOption,
  resolveGroupForNavSection,
  visibleStateCards,
  type NavSectionId,
} from "./app/projection/presetRailData";
import type { PresetGroupId } from "./schema/presets";
import { liveLlmGitPreviewState, standardScenarioTitle } from "./app/projection/previewDefaults";
import {
  componentSummaryLabel,
  selectedComponentItemsForProject,
} from "./app/projection/selectedComponents";
import { rightColumnFoldsItself } from "./app/projection/rightColumn";
import { createProjectUpdater, createWorkspaceController } from "./app/viewmodel/createWorkspaceController";
import { useProviderSettings } from "./app/viewmodel/useProviderSettings";
import { useStyleSwitch } from "./app/viewmodel/useStyleSwitch";
import { useWorkspaceState } from "./app/viewmodel/useWorkspaceState";

export { STYLE_AVATAR_DEFAULTS } from "./app/projection/presetRailData";
export { selectedComponentItemsForProject } from "./app/projection/selectedComponents";

/**
 * Composition root (MVVM): the Model is the project schema + AgentUX runtime,
 * the ViewModel is the workspace state machine + controller + projection
 * modules under `src/app`, and the Views are the agent-preview components plus
 * the Topbar/PresetRail chrome. App itself only wires them together.
 */
export function App() {
  const copy = useCopy();
  const { locale, setLocale } = useLocale();
  const { iconSet, setSlot, uploadedAvatar } = useIconSet();
  // Opens on the empty three-column skeleton. `defaultCodingAgentProject` stays
  // the shape an *exported* project ships with; this is only the editor's
  // starting point. See emptyStructureProject for why they are separate.
  const [project, setProjectState] = useState<AgentFrontendProject>(() => withSyncedSkinId(emptyStructureProject));
  /*
   * Every project write goes through here, and leaves with `theme.skinId`
   * re-derived from the style and the colourway. The skin engine treats the id
   * as the canvas's identity — it is what gets painted — so a write that moved
   * `preset` or `stylePreset` on its own (palettes, saved projects, fixtures)
   * would otherwise paint the old skin, with no error until export rejected
   * the project.
   */
  const setProject: typeof setProjectState = useCallback((next) => {
    setProjectState((previous) => withSyncedSkinId(typeof next === "function" ? next(previous) : next));
  }, []);
  /**
   * The module the pointer is over, which is what the edit toolbar points at.
   *
   * Local rather than workspace state: it changes on every pointer move, and
   * nothing outside this component — no projection, no export, no preset — has
   * any use for it. Selection (`selectedSlotId` / `selectedLayerId`) stays in
   * the workspace and stays driven by the Layers list, because that is a
   * deliberate choice the reader makes and it survives the pointer moving away.
   */
  const [hoveredModule, setHoveredModule] = useState<{ slotId: string | null; layerId: string | null }>(
    NO_HOVER,
  );
  /**
   * A mirror of `hoveredModule`, and the retarget in flight.
   *
   * The pointer handler has to compare against the current target and cannot
   * read it from state: it is a native listener registered once, so it would
   * close over the value from the render that installed it. The ref is the
   * value it can actually see.
   */
  const hoveredRef = useRef<{ slotId: string | null; layerId: string | null }>(NO_HOVER);
  const retargetRef = useRef<{ next: { slotId: string | null; layerId: string | null }; timer: number } | null>(
    null,
  );
  const { state, dispatch, refs } = useWorkspaceState(locale);
  // Single source of truth: `theme.skinId` is the canonical identity; stylePreset is
  // derived so 168 `data-style-preset` rules in app.css stay in lockstep with export.
  const selectedPresetStyle = project.theme.stylePreset;
  const [commandOpen, setCommandOpen] = useState(false);

  const updateActiveProject = createProjectUpdater(state, dispatch, setProject);
  const provider = useProviderSettings({ copy, updateActiveProject });
  const style = useStyleSwitch({
    selectedPresetStyle,
    locale,
    setSlot,
    setProject,
    /*
     * No `onKitPicked` any more.
     *
     * It replaced `pickedOptionIds` with the style's own module list, so
     * applying a card ticked a dozen options in the rail and listed them in
     * the layer tree as though the reader had chosen them. Which components
     * the screen has is the reader's call; a style is a repaint. The only
     * writer of `pickedOptionIds` is the reader clicking an option now.
     */
  });

  // Canvas rails (left session sidebar / right output panel) can be collapsed.
  /**
   * Closed until asked for.
   *
   * It used to open as soon as a conversation started, so a run with nothing to show still gave
   * half the canvas to "no artifacts produced". The panel now opens on the two actions that mean
   * "show me the output": the drawer toggle, and clicking an artifact in the conversation.
   */
  const builderSurfaceRef = useRef<HTMLElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const previewRunner = useMemo(() => createPureFrontendPreviewRunner(), []);
  const runtime = useAgentUXRuntime();
  const fixture = previewFixtures.find((item) => item.id === state.selectedFixtureId) ?? previewFixtures[0];
  const fixtureEvents = useMemo(() => parsePreviewFixture(fixture), [fixture]);
  // Every event source converges here — fixture, replay, mock, live provider, harness adapter
  // — so admission happens in exactly one place and cannot be skipped for one of them. For a
  // stream that already speaks our protocol this is the identity function (pinned by
  // "leaves a well-formed stream untouched" in eventNormalizer.test.ts), so fixtures and
  // previews render exactly as before.
  const activeProject = state.surfaceMode === "saved-preview" && state.savedProject ? state.savedProject : project;
  /**
   * The configurator's conversation, composed from what has been picked.
   *
   * Fed in as the event stream rather than special-cased downstream, so
   * admission, the view model and localisation all treat it exactly like a
   * fixture or a live run.
   *
   * Only in the builder, and only when no *real* run is driving the surface —
   * a live provider or a Pi session, which produce their own events.
   *
   * Fixture replay and the scenario gallery are deliberately not on that list.
   * Both swap the canvas to a canned demo, and several preset controls trigger
   * one: clicking an avatar loaded a whole coding run, and picking 思考中
   * replaced the conversation with a scripted "普通回合" showcase. The canvas
   * shows the project being configured, so a pick adds its block here instead.
   */
  const canvasEvents = useMemo(() => canvasTimelineEvents({ locale }), [locale]);
  /**
   * What makes the reply play again.
   *
   * Separate from `canvasEvents` because the two answer different questions.
   * The reply's *content* depends only on the locale now — it is one fixed turn
   * holding every component — so memoising it on the project would be claiming
   * a dependency it does not have, and the next reader to check would
   * reasonably delete it.
   *
   * What does depend on the project is *when to start over*, and the answer is
   * narrower than it was: only the thinking phase.
   *
   * It used to be `[activeProject, state.pickedOptionIds]` — any edit at all —
   * on the grounds that the reader wants to watch their change take part in the
   * whole reply. In practice that meant picking an avatar, an icon, a tool
   * display or a composer control threw the canvas back to the beginning and
   * made the reader wait through the wait again to see a change that was
   * already on screen. Asked for directly: 除了思考中的，剩下的画布内容不用重新加载.
   *
   * The thinking options are the exception because they are the only ones whose
   * subject exists *only during the replay*: a motion plays while the span is
   * open, so a still canvas cannot show it. Everything else is a property of
   * something the timeline has already delivered, and the components read the
   * project directly — turning one on paints it in place, at the position the
   * reveal has already reached.
   *
   * Keyed on the thinking configuration rather than on which group is open, so
   * it restarts when the thing itself changes and not when the reader merely
   * looks at the panel. A style switch moves `motion.reasoning` too, which is
   * correct: the new style's glyph is one of the things being shown off.
   */
  const thinkingSignature = JSON.stringify([
    activeProject.theme.motion.reasoning,
    activeProject.reasoning,
  ]);
  const canvasReplayToken = useMemo(() => ({}), [thinkingSignature]);
  /*
   * While the reader has the settled-block group open, the replay starts with
   * the block already closed.
   *
   * Keyed on the open group rather than on the last pick: every card in there
   * describes the closed block, so the whole time the reader is looking at that
   * panel the think phase is the part they are not choosing. Replaying it would
   * spend the visible window on it and restart that window on every click.
   */
  const canvasStartsSettled = state.selectedGroup === "thinking-done";
  // Called unconditionally, as hooks must be; `usesCanvasTimeline` decides
  // whether the result is used, so a live provider or a Pi session still drives
  // the surface with its own events.
  const replayedCanvasEvents = useCanvasReplay(canvasEvents, canvasReplayToken, canvasStartsSettled);
  const usesCanvasTimeline =
    state.surfaceMode === "builder" &&
    state.runEventSource !== "live" &&
    state.runEventSource !== "pi";
  /**
   * …except while the welcome state is on, where the canvas has no run in it.
   *
   * This is what made 新建对话 do nothing. The button has always dispatched
   * `enterWelcome`, and `isWelcome` below has always required an empty
   * timeline — but the builder's timeline is this fixed demo reply, playing
   * unconditionally, so the condition could not be met and the greeting was
   * unreachable on the canvas. Measured before the change: clicking it left
   * four turns on screen and the composer at 90% down the column.
   *
   * A new chat *is* a canvas with nothing in it, so the honest fix is at the
   * source — no events — rather than a second flag downstream. The replay hook
   * keeps running on its own timer, so coming back out of the welcome state
   * resumes the reply where it had got to rather than restarting it.
   */
  const rawEvents = usesCanvasTimeline
    ? (state.welcomeActive ? NO_EVENTS : replayedCanvasEvents)
    : state.runEvents ?? fixtureEvents;
  const harness = activeProject.runtime.harness;
  // The project configured in the editor is always the source of truth. Pi state confirms the
  // active runtime model but must never replace editor choices with Pi's previous/default model.
  const runtimeProject = activeProject;
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
  const gitPreviewState = state.gitPreviewStateOverride ?? (state.runEventSource === "live" ? liveLlmGitPreviewState : gitPreviewStateFromEvents(events));
  const livePreviewPrompts = state.runEventSource === "live"
    ? state.liveMessages.filter((message) => message.role === "user").map((message) => message.content)
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

  const sessionPrompts = useMemo(
    () => [...state.sentPrompts, ...copy.workspace.sessionSidebar.sessions.filter((demo) => !state.sentPrompts.includes(demo))],
    [state.sentPrompts, copy.workspace.sessionSidebar.sessions],
  );
  const piSessionItems = useMemo(
    () => piConversationSidebarItems(state.piConversations.filter((conversation) => conversation.events.length > 0)),
    [state.piConversations],
  );
  /*
   * Whether Pi has anything to *list* — not whether Pi is running.
   *
   * The list's data source used to switch on `runMode === "pi"` alone, and Pi
   * mode is entered by clicking 新建对话 or a conversation row. A fresh
   * conversation has no events yet, so it is filtered out of
   * `piSessionItems` above — which left the column with an empty array, and
   * `SessionSidebar` draws nothing for an empty one. The reader's 内容模块 and
   * Row marks picks then had no visible effect at all: the project said show
   * the list, and the canvas had no list to show.
   *
   * The canvas is a design surface before it is a runtime one. A module that
   * has been switched on has to render, so when Pi has nothing to list the
   * demo rows come back and the design stays legible.
   */
  const hasPiSessions = state.runMode === "pi" && piSessionItems.length > 0;

  const displayViewModel = useMemo(
    () => {
      const titledViewModel = state.showStandard
        ? { ...viewModel, title: standardScenarioTitle(scenarioById(state.standardScenarioId), locale) }
        : viewModel;
      // Live preview localizes like replay, minus the model's own prose: the dictionary is a
      // substring rewriter over fixture copy, so running a live reply through it would swap
      // words like "Thinking" mid-sentence. Tool titles, approval prompts and error copy are
      // ours and do get localized — previously the whole live surface was pinned to English,
      // which meant a Chinese session flipped to English the moment a real key was used.
      return localizePreviewViewModel(titledViewModel, locale, {
        localizeMessageText: state.runEventSource !== "live" && state.runEventSource !== "pi",
      });
    },
    [locale, state.runEventSource, state.showStandard, state.standardScenarioId, viewModel],
  );
  const defaultOutputPanelItems = useMemo(
    () => collectDefaultOutputPanelItems(displayViewModel.timeline, locale, activeProject),
    [displayViewModel.timeline, locale, activeProject],
  );
  const defaultOutputPanelSignature = useMemo(
    () => outputPanelItemsSignature(defaultOutputPanelItems),
    [defaultOutputPanelItems],
  );
  /**
   * The product's welcome state — greeting, composer centred in the column.
   *
   * Requires having been asked for. An empty timeline is also what an
   * unconfigured canvas looks like, so inferring it from that alone opened
   * every new project on a greeting nobody had written, with the composer
   * floating mid-column instead of sitting at the bottom where an input goes.
   */
  const isWelcome =
    !state.showStandard && state.welcomeActive && displayViewModel.timeline.length === 0;
  // Every group is reachable now: the renderers that used to hide inside the
  // filtered-out "render" group are sections of "delivery".
  const visiblePresetGroups = useMemo(() => presetGroupsForProject(project), [project]);
  const selectedComponentItems = useMemo(
    () => selectedComponentItemsForProject(project, visiblePresetGroups, locale),
    [project, visiblePresetGroups, locale],
  );
  const selectedComponentSummary = componentSummaryLabel(selectedComponentItems.length, locale);
  const visibleLayoutSlots = useMemo(
    () => slotsForTemplate(activeProject.layout.slots, activeProject.template),
    [activeProject.layout.slots, activeProject.template],
  );
  /**
   * Columns come from `layout.regions`, not from which slots happen to be
   * enabled.
   *
   * This is the difference between a canvas that reflects the configuration and
   * one that reflects only its contents. Under the old rule a column vanished
   * when it was empty, so an untouched project rendered no columns at all and
   * enabling one component made the other two disappear — you could not see
   * where the next component would land. Declared regions are the structure;
   * slots are what sits in it, and an empty column is still a column.
   *
   * Two behaviours change as a result, both deliberately: turning the output
   * panel off now leaves an empty right column instead of collapsing it (the
   * column is declared, so it stays; `rightCollapsed` is still how you fold it
   * away), and the welcome state shows all three columns instead of hiding the
   * right one.
   */
  /**
   * A side column shows when its region is declared *and* something is in it.
   *
   * Region alone is not enough any more: unticking 显示侧边栏 has to remove the
   * column and let the centre take the width, which is what makes the canvas
   * toolbar's delete meaningful. The centre column is deliberately not subject
   * to this — it is region-driven below and cannot be deleted, so an empty
   * centre still reads as the place a conversation will go.
   */
  const mountedComponents = mountedComponentsForProject(
    activeProject,
    selectedComponentItems,
    state.pickedOptionIds,
  );
  const configuredLayerIds = new Set(
    layersForProject(activeProject, mountedComponents).map((layer) => layer.id),
  );
  const hasSidebar = configuredLayerIds.has("left");
  const hasRightPanel = configuredLayerIds.has("right");
  /**
   * The product's responsive breakpoints, applied only where they are real.
   *
   * They belong to the *running* product: a narrow window hides the right
   * panel, a narrower one hides the sidebar. The builder canvas is a drawing of
   * the product rather than a window onto it — and since the page is now a fixed
   * 4:3 of whatever space the chrome leaves, a smallish editor window puts it
   * under those breakpoints. A column the reader configured then vanished from
   * the canvas *and* from the region labels while the layer tree went on listing
   * it, with nothing on screen saying why. Measured: an 845px editor window
   * gives a 513px page, and 513 < 860.
   *
   * So: the canvas shows what is configured, and the breakpoints keep working on
   * the preview surface, which is where the product actually runs.
   */
  const autoHiddenRails =
    state.surfaceMode === "builder" ? { left: false, right: false } : state.autoHiddenRails;
  const loaderCanvasPreviewActive = state.surfaceMode === "builder" && state.selectedGroup === "media-generation";
  /**
   * Interface preview: the builder with its furniture folded away.
   *
   * Read through the surface check rather than straight off the flag, so the
   * run-preview surface — which has its own chrome and its own snapshot — can
   * never be asked to hide the rail it is not showing anyway.
   */
  const uiPreviewActive = state.surfaceMode === "builder" && state.uiPreview;
  const exitUiPreview = () => dispatch({ type: "uiPreviewToggled", active: false });
  // Mounted whenever the layout has one; `leftCollapsed` is a visual state the CSS drawer
  // owns, so gating the mount on it would remove the element the transition animates.
  const leftSidebarMounted = hasSidebar && !autoHiddenRails.left;
  const leftSidebarVisible = leftSidebarMounted && !state.leftCollapsed;
  /**
   * The panel *could* be shown — the slot exists, the window is wide enough, there is a
   * conversation. Separate from `rightPanelVisible`, which additionally asks whether the reader
   * has opened it.
   *
   * The distinction is load-bearing for clicking an artifact: a panel the reader collapsed
   * should reopen, while a panel that does not fit needs the modal instead. Conflating the two
   * meant a collapsed panel sent every artifact to a modal.
   */
  // `!isWelcome` is gone: the right column is part of the structure, so it shows
  // before the first turn too. The loader canvas still takes precedence, and so
  // does auto-hide — but only on the preview surface (see `autoHiddenRails`).
  const rightPanelAvailable =
    hasRightPanel && !autoHiddenRails.right && !loaderCanvasPreviewActive;
  /* Mounted while it folds, in either direction: the CSS below animates the two
     tracks, and a panel that has already been unmounted has no width to
     animate. `rightCollapsing` is cleared by the timers in `toggleRightColumn`. */
  const rightPanelVisible = rightPanelAvailable && (!state.rightCollapsed || state.rightCollapsing);
  /**
   * Whether to offer the right column back, and how.
   *
   * Two ways it can be absent — collapsed by its own control, or deleted from
   * the canvas — and to the reader they look the same: the column is not there.
   * So one affordance, at the centre column's top right (where the reader last
   * saw the column's own edge), doing whichever is needed. Deleting it from the
   * canvas used to leave no way back except the rail.
   *
   * Auto-hide is excluded on purpose: there the column is missing because it
   * does not fit, and offering to bring it back would be a button that cannot
   * keep its promise.
   */
  const rightColumnDeleted =
    state.surfaceMode === "builder" &&
    !hasRightPanel &&
    !autoHiddenRails.right &&
    !loaderCanvasPreviewActive;
  /*
   * Fold the right column away, with the centre widening into it.
   *
   * Extracted because two controls do this — the panel's own 收起面板 and the
   * canvas toggle — and only one of them went through the two-phase path at
   * first. `onCollapseRight` dispatched `rightCollapsed: true` straight, so the
   * button the reader actually uses was the one that still snapped. Measured:
   * centre 538 → 868 in a single frame.
   */
  const foldRightColumn = () => {
    dispatch({ type: "patch", patch: { rightCollapsing: true } });
    window.setTimeout(
      () => dispatch({ type: "patch", patch: { rightCollapsed: true, rightCollapsing: false } }),
      COLUMN_EXIT_MS,
    );
  };
  const toggleRightColumn = () => {
    if (!hasRightPanel) {
      // Deleted: tick back the option the canvas toolbar's delete unticked.
      setProject((current) =>
        isPresetOptionActive(current, "output-visible")
          ? current
          : togglePresetOption(current, "output-visible"),
      );
      dispatch({ type: "patch", patch: { rightCollapsed: false } });
      return;
    }
    /*
     * Two phases, so the centre's width animates instead of snapping.
     *
     * Closing: raise the flag first — the column is still mounted, CSS slides
     * it out on its margin while the centre widens — then swap to the solo
     * stack once the transition has played. Opening needs no phase of its own:
     * the column's `@starting-style` is the folded position, so mounting it
     * runs the same transition forwards.
     *
     * `COLUMN_EXIT_MS` is the number the left column's delete already waits, so
     * both columns fold at one speed.
     */
    if (state.rightCollapsed) {
      // The slide in is `@starting-style` on the column (app.css): mounting
      // it is the whole of opening, here and on every other path that opens it.
      dispatch({ type: "patch", patch: { rightCollapsed: false } });
      return;
    }
    foldRightColumn();
  };
  useEffect(() => {
    if (defaultOutputPanelItems.length === 0) {
      refs.outputPanelSignatureRef.current = "";
      return;
    }
    if (defaultOutputPanelSignature === refs.outputPanelSignatureRef.current) {
      return;
    }
    refs.outputPanelSignatureRef.current = defaultOutputPanelSignature;
    // Populated, not opened. A run producing an artifact is not the reader asking to look at it,
    // and forcing the panel open here is what handed half the canvas to a panel nobody opened.
    // Clicking the artifact, or the drawer toggle, is the request.
    // Items only. This used to also set `enabled: true` on the OutputFrame slot,
    // which was invisible while every slot shipped enabled and became a silent
    // auto-selection once they start disabled: rendering a conversation
    // produced an artifact, the artifact enabled the output panel, and the next
    // click on "show output panel" therefore turned it *off* — the panel looked
    // unclickable. Whether a component is placed is the reader's choice; a run
    // producing data is not that choice.
    //
    // `output.source` is left alone for the same reason: this effect re-runs as
    // events arrive, so forcing "artifact" here silently undid a click on the
    // console tab a moment after it happened.
    dispatch({ type: "outputPanelAutoFilled", items: defaultOutputPanelItems });
  }, [defaultOutputPanelItems, defaultOutputPanelSignature, loaderCanvasPreviewActive, dispatch, refs]);
  /**
   * Switching rail destination also points `selectedGroup` at the group that
   * destination owns, so Theme and Model reuse the existing group panel rather
   * than needing their own. Components restores whatever group was last open
   * instead of resetting to the first one — losing your place every time you
   * glance at Layers would make the rail annoying to use.
   */
  const handleNavSectionChange = (section: NavSectionId) => {
    // One rule for every destination: keep the current group if it belongs to
    // the destination, otherwise open its first. Replaces a chain of
    // per-destination branches that each had to remember to preserve the
    // group — and File, which owns no group, keeps whatever was open so
    // glancing at Layers does not lose your place.
    const nextGroup = resolveGroupForNavSection(section, state.selectedGroup);
    dispatch({
      type: "patch",
      patch: {
        ...(nextGroup ? { navSection: section, selectedGroup: nextGroup } : { navSection: section }),
        // Folded, an icon is a way back in: picking a destination opens the
        // rail on it, the way any control in the folded canvas panel opens
        // that panel. It used to switch the destination behind a closed rail,
        // so the click seemed to do nothing.
        railCollapsed: false,
      },
    });
  };
  const selectedPresetGroup = visiblePresetGroups.find((group) => group.id === state.selectedGroup) ?? visiblePresetGroups[0];
  const stateCards: ReturnType<typeof rawStateCardToStateCard>[] = visibleStateCards(selectedPresetGroup.id).map((card) => rawStateCardToStateCard(card, locale));
  const defaultStateCode = selectedPresetGroup.id === "blocks" ? stateCards[0]?.code ?? null : null;
  const selectedStateCode = state.activeStateCode ?? defaultStateCode;
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
  // Output group: the sub-sections (data source, …) only make sense when the
  // output panel is on, so hide everything but the Layout toggle when it's off.
  /**
   * The rail drops the two side columns' presence toggles.
   *
   * The canvas opens with three columns, so those two read as permanently
   * ticked, and a permanently ticked control is not a choice. Their section
   * goes with them — a "Layout" heading over nothing is worse than no heading.
   * The options stay in the schema: the canvas toolbar's delete still turns
   * them off, which is where a column is removed.
   *
   * The gating this replaces hid a group's *other* sections until its column
   * was shown, which no longer holds — picking any content is what puts the
   * component on the canvas now.
   */
  const renderedPresetSections = selectedPresetSections
    .map((section) => ({
      ...section,
      // The style is passed so the Motion section shows only the four this
      // style can actually animate.
      items: section.items.filter((item) => isOptionShownInRail(item, selectedPresetStyle)),
    }))
    .filter((section) => section.items.length > 0);
  /**
   * Section labels earn their place only when there is something to tell apart.
   *
   * One section is a heading over everything in the group, which says nothing
   * the group's own name has not already said — "动效" over 思考中's eight
   * motions, "内容" over 左栏's seven modules. Two or more and the labels are
   * doing their job again.
   */
  const showPresetSectionLabels =
    renderedPresetSections.length > 1 && selectedPresetGroup.options.some((option) => option.section);
  const showDebugViewToggle = import.meta.env.DEV && state.surfaceMode === "builder";
  const builderUI = {
    showDebugBadges: showDebugViewToggle && state.workspaceView === "debug",
  };
  const selectedApprovalIconSlot = state.activeStateCode
    ? visibleStateCards("tool-calls").find((card) => card.code === state.activeStateCode)?.slot
    : undefined;

  useEffect(() => {
    runtime.replay(events);
  }, [events, runtime]);

  useEffect(() => {
    // Configurator chrome (topbar/left rail/preset panel) uses a neutral scheme
    // so its icons/controls stay neutral — never tinted by a preview accent.
    applyWorkspaceSkins({
      previewSkinId: activeProject.theme.skinId,
      previewRoot: builderSurfaceRef.current,
      // The reader's repaints ride on the preview's tokens, as they always did.
      colorOverrides: activeProject.theme.colorOverrides,
    });
  }, [activeProject.theme.skinId, activeProject.theme.colorOverrides]);

  useEffect(() => {
    if (!showDebugViewToggle && state.workspaceView === "debug") {
      dispatch({ type: "patch", patch: { workspaceView: "preview" } });
    }
  }, [showDebugViewToggle, state.workspaceView, dispatch]);

  /**
   * The hover mark stops following the content while the canvas scrolls.
   *
   * A wheel scroll leaves the pointer where it is, so every block that passes
   * under it takes `:hover` in turn and the outline runs up the column — which
   * is what 「这个线框…总跟着上下跑」 is. Measured with the pointer parked on
   * 产物/控制台: the outline was on the source switch, a notch later on the task
   * list, then on nothing.
   *
   * An attribute written straight to the node rather than React state: this
   * fires on every scroll frame, and re-rendering the whole editor for a
   * presentational flag would make the scroll itself worse than the bug.
   *
   * Capture, because `scroll` does not bubble and the thing that scrolls is one
   * of the inner panels; `wheel` as well, for the case where an ancestor of the
   * frame is the scroller and no `scroll` reaches us at all.
   */
  useEffect(() => {
    const frame = previewFrameRef.current;
    if (!frame) {
      return;
    }
    let settleTimer = 0;
    const markScrolling = () => {
      frame.setAttribute("data-scrolling", "true");
      window.clearTimeout(settleTimer);
      // The backstop only: a scroll that ends with the pointer still gets its
      // hover back after this, and one that ends with a move gets it at once.
      settleTimer = window.setTimeout(() => frame.removeAttribute("data-scrolling"), HOVER_SCROLL_SETTLE_MS);
    };
    const handPointerBack = () => {
      if (!frame.hasAttribute("data-scrolling")) return;
      window.clearTimeout(settleTimer);
      frame.removeAttribute("data-scrolling");
    };
    const capture = { capture: true, passive: true } as const;
    frame.addEventListener("scroll", markScrolling, capture);
    frame.addEventListener("wheel", markScrolling, capture);
    frame.addEventListener("pointermove", handPointerBack, capture);
    return () => {
      window.clearTimeout(settleTimer);
      frame.removeEventListener("scroll", markScrolling, { capture: true });
      frame.removeEventListener("wheel", markScrolling, { capture: true });
      frame.removeEventListener("pointermove", handPointerBack, { capture: true });
      frame.removeAttribute("data-scrolling");
    };
  }, []);

  useEffect(() => {
    const frame = previewFrameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateAutoHiddenRails = (width: number) => {
      dispatch({
        type: "autoRailsHidden",
        rails: {
          right: width < PREVIEW_RESPONSIVE_WIDTHS.hideRightPanel,
          left: width < PREVIEW_RESPONSIVE_WIDTHS.hideLeftSidebar,
        },
      });
    };

    // `offsetWidth`, the layout width: the breakpoints belong to the product,
    // and a client rect is the canvas *zoom's* width — entering the preview at
    // 60% would have measured a 1368px frame as 821px and hidden the column.
    updateAutoHiddenRails(frame.offsetWidth);
    const observer = new ResizeObserver((entries) => {
      updateAutoHiddenRails(entries[0]?.contentRect.width ?? frame.offsetWidth);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [state.surfaceMode, state.workspaceView, dispatch]);

  useEffect(() => {
    dispatch({ type: "patch", patch: { selectedGroup: resolvePresetGroupSelection(state.selectedGroup, project.template) } });
  }, [project.template, state.selectedGroup, dispatch]);

  /*
   * An avatar the current style does not offer goes back to that style's own.
   *
   * Every style shows four avatars a side now (`STYLE_AVATAR_OPTIONS`), and the
   * registry holds far more — so switching styles can leave the canvas wearing
   * a face its gallery has no tile for, which reads as a bug and cannot be
   * re-picked once changed. This was the same correction scoped to one style and
   * one slot; the general rule replaces it, and both slots need it.
   */
  useEffect(() => {
    for (const slot of ["author.user", "author.agent"] as const) {
      // The uploaded picture is offered in every style, so it never needs
      // correcting — unless it was removed, which leaves the id pointing at
      // nothing.
      if (slot === "author.user" && iconSet[slot] === UPLOADED_AVATAR_ID && uploadedAvatar) continue;
      const allowed = styleAvatarOptionIds(selectedPresetStyle, slot);
      if (allowed && !allowed.includes(iconSet[slot] ?? "")) {
        setSlot(slot, STYLE_AVATAR_DEFAULTS[selectedPresetStyle][slot]);
      }
    }
  }, [iconSet, uploadedAvatar, selectedPresetStyle, setSlot]);

  /*
   * And the same rule for the marks a style draws itself.
   *
   * Identical in shape to the avatar case above, and it is the icon half of the
   * same omission: a style that ships its own set had those marks *reachable*
   * from the gallery but never *chosen*, because the opening icon set is
   * `defaultIconSet()` — the global registry order, which knows nothing about
   * styles. Measured in 手绘风 as the Game style's compass on the artifact card
   * with its own drawn sheet one tile away in the gallery.
   *
   * Only for slots the style has a list for, so entering a style that answers
   * for none of them leaves every pick alone.
   */
  useEffect(() => {
    const defaults = styleSlotDefaults(selectedPresetStyle);
    for (const [slot, optionId] of Object.entries(defaults)) {
      const allowed = styleAvatarOptionIds(selectedPresetStyle, slot);
      if (allowed && !allowed.includes(iconSet[slot as IconSlot] ?? "")) {
        setSlot(slot as IconSlot, optionId);
      }
    }
    /*
     * And a pick the style does not offer at all goes back to its first offer.
     *
     * The loop above only covers styles with a set of their own, so 原生风 and
     * 科技风 — which have none — kept whatever the last style left: after a
     * visit to 复古风 their tool rows drew the retro sheet, and after 游戏风 a
     * painted plate. Measured on the canvas, and in the gallery the ring was on
     * nothing, because the id being drawn is not one of the four tiles. Only a
     * pick that is set and not offered is touched; an unset slot already
     * resolves to that same first offer.
     */
    for (const slot of Object.keys(ICON_OPTIONS) as IconSlot[]) {
      if (slot === "author.user" || slot === "author.agent" || defaults[slot]) continue;
      const current = iconSet[slot];
      if (!current) continue;
      const allowed = styleAvatarOptionIds(selectedPresetStyle, slot);
      if (allowed && allowed.length > 0 && !allowed.includes(current)) setSlot(slot, allowed[0]);
    }
  }, [activeProject.theme.skinId, iconSet, selectedPresetStyle, setSlot]);

  /*
   * Same rule for the thinking motion.
   *
   * Sharper than the avatar case, because a motion outside its own style has no
   * keyframes at all: switching from 像素风 to 漫画风 would leave the canvas set
   * to `pixel-bricks`, which 漫画风 does not animate — so the indicator would
   * simply stop, with no card in the rail to change it back.
   *
   * Applies the style's first, which is what `STYLE_MOTION_OPTIONS` orders its
   * lists for.
   */
  useEffect(() => {
    const current = project.theme.motion.reasoning;
    // Only the style-scoped values. A universal one — the text cycle, the dots,
    // the shimmer — animates in every style, and resetting it would overrule a
    // pick the reader had just made.
    const allowed = styleMotionOptionIds(selectedPresetStyle);
    if (allowed.some((optionId) => isPresetOptionActive(project, optionId))) return;
    if (allowed.length === 0) return;
    /*
     * …and one more case: a style whose whole list is its own. 科技风 and
     * 手绘风 offer only motions drawn for them, so arriving from 原生风 on 圆点
     * left the canvas on a motion this style's gallery does not contain — a
     * card selected nowhere, with the style's own four sitting unpicked. Not
     * `bars` (文字切换): that one lives in the Done section and is offered in
     * every style on purpose.
     */
    const ownSet = allowed.every((optionId) =>
      STYLE_SCOPED_REASONING_MOTIONS.has(optionId.replace(/^thinking-/, "")),
    );
    if (!STYLE_SCOPED_REASONING_MOTIONS.has(current) && !(ownSet && current !== "bars")) return;
    setProject((previous) => applyPresetOption(previous, allowed[0]));
  }, [project, selectedPresetStyle, setProject]);

  /**
   * The canvas runs for real, and hovering is what offers to edit it.
   *
   * This replaces a capture-phase suppressor that swallowed every interaction
   * inside the frame — pointerdown, click, keydown, input, submit — and spent
   * the click on selecting a module instead. That made the canvas a drawing of
   * the product rather than the product: the composer could not be typed in,
   * the upload button did nothing, the search field never opened.
   *
   * The two halves trade places. Editing moves to **hover**, which is why the
   * click is now free to do whatever the component does with it; the toolbar
   * follows the pointer instead of a selection. Nothing is suppressed any more,
   * so a send button sends and a search icon opens its popover.
   *
   * Hover is tracked on the *surface*, not the frame, because the toolbar is a
   * sibling of the frame — tracking it on the frame meant moving the pointer
   * onto Edit counted as leaving the module, and the toolbar removed itself
   * from under the cursor.
   */
  useEffect(() => {
    if (state.surfaceMode !== "builder" || state.uiPreview) return;
    const surface = builderSurfaceRef.current;
    if (!surface) return;

    const clearPending = () => {
      if (retargetRef.current === null) return;
      window.clearTimeout(retargetRef.current.timer);
      retargetRef.current = null;
    };

    const apply = (next: { slotId: string | null; layerId: string | null }) => {
      clearPending();
      hoveredRef.current = next;
      setHoveredModule(next);
    };

    const onMove = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      // Reaching the toolbar confirms what it was opened for: cancel any
      // retarget the trip there had queued up.
      if (target.closest(".module-toolbar")) {
        clearPending();
        return;
      }

      const next = !target.closest(".preview-frame")
        ? NO_HOVER
        : (() => {
          const slotId = moduleIdAtTarget(target);
          return slotId ? { slotId, layerId: null } : { slotId: null, layerId: layerIdAtTarget(target) };
        })();

      const current = hoveredRef.current;
      if (current.slotId === next.slotId && current.layerId === next.layerId) {
        clearPending();
        return;
      }

      // Nothing is shown yet, so there is no toolbar to protect: switch at once,
      // or first hover would feel broken.
      if (current.slotId === null && current.layerId === null) {
        apply(next);
        return;
      }

      /*
       * Something *is* shown, so hold the target for a moment before moving it.
       *
       * The toolbar sits above the module it belongs to, and the trip up to it
       * crosses whatever is above — a parent frame, a neighbouring column —
       * every one of which is highlightable in its own right. Retargeting on the
       * first such event meant the toolbar retargeted and moved before the
       * pointer could land on it: the buttons were unclickable in practice.
       *
       * So a *different* module only takes over once the pointer settles on it.
       * Passing through costs nothing, because pointer events stop firing when
       * the pointer stops and the last timer scheduled is the one that fires.
       */
      if (retargetRef.current?.next.slotId === next.slotId
        && retargetRef.current?.next.layerId === next.layerId) {
        // Already queued for this exact target; leave its timer alone rather
        // than restarting it on every jitter, which would defer it forever.
        return;
      }
      clearPending();
      retargetRef.current = {
        next,
        timer: window.setTimeout(() => {
          retargetRef.current = null;
          hoveredRef.current = next;
          setHoveredModule(next);
        }, HOVER_RETARGET_MS),
      };
    };

    const onLeave = () => apply(NO_HOVER);

    surface.addEventListener("pointermove", onMove);
    surface.addEventListener("pointerleave", onLeave);
    return () => {
      surface.removeEventListener("pointermove", onMove);
      surface.removeEventListener("pointerleave", onLeave);
      clearPending();
    };
  }, [state.surfaceMode, state.uiPreview, state.workspaceView]);

  /**
   * Resize the canvas, keeping one screen point where it is.
   *
   * Every zoom goes through here — wheel, pinch, the floating control, the
   * keyboard — so they all agree on what "zoom" does to the picture. The wheel
   * anchors on the cursor; everything else on the middle of the surface, which
   * is what a step from a control should mean.
   *
   * The new size is written to the surface straight away rather than waiting
   * for React: the pan that keeps the anchor still is *measured* (see
   * `anchoredPan`), so the box has to be at its new size before it is read.
   * React then renders the same two values and changes nothing.
   */
  const canvasZoomRef = useRef(state.canvasZoom);
  canvasZoomRef.current = state.canvasZoom;
  const zoomCanvasTo = useCallback(
    (requested: number, anchor?: { x: number; y: number }) => {
      const next = clampZoomFine(requested);
      if (next === canvasZoomRef.current) return;
      const surface = builderSurfaceRef.current;
      const page = surface?.querySelector<HTMLElement>(".canvas-zoom");
      canvasZoomRef.current = next;
      if (surface && page) {
        const room = surface.getBoundingClientRect();
        const point = anchor ?? { x: room.left + room.width / 2, y: room.top + room.height / 2 };
        const before = page.getBoundingClientRect();
        surface.style.setProperty("--canvas-zoom", String(next / 100));
        const after = page.getBoundingClientRect();
        const pan = nextCanvasPan(
          anchoredPan(canvasPanRef.current, point, before, after),
          NO_CANVAS_PAN,
          { width: surface.clientWidth, height: surface.clientHeight },
          next / 100,
        );
        surface.style.setProperty("--canvas-pan-x", `${pan.x}px`);
        surface.style.setProperty("--canvas-pan-y", `${pan.y}px`);
        canvasPanRef.current = pan;
        setCanvasPan(pan);
      }
      dispatch({ type: "patch", patch: { canvasZoom: next } });
    },
    [dispatch],
  );

  /**
   * The wheel sizes the canvas.
   *
   * Asked for in so many words — drag to move it, the wheel to size it — which
   * is how a design tool's canvas behaves. Zoomed about the cursor, so the
   * thing being looked at stays under it. Over anything inside the frame that
   * scrolls, the wheel scrolls it instead (`scrollsUnderPointer`): zooming
   * the whole canvas everywhere left a long conversation readable only by
   * dragging its scrollbar. Shift + wheel and a sideways swipe
   * still slide it (`wheelIntent`).
   *
   * Events are folded into one frame: a pinch fires faster than the shell
   * re-renders, and each zoom measures the box, so doing it per event would be
   * layout thrash for no visible gain.
   *
   * The preview surface is left alone: the wheel belongs to the running agent
   * there, the same way its clicks do. The interface preview too — a
   * conversation you cannot scroll is a conversation you can only see the end
   * of.
   */
  useEffect(() => {
    if (state.surfaceMode !== "builder" || state.uiPreview) return;
    const surface = builderSurfaceRef.current;
    if (!surface) return;
    let zoomFactor = 1;
    let zoomAnchor = { x: 0, y: 0 };
    let zoomFrame: number | null = null;
    const onWheel = (event: WheelEvent) => {
      const intent = wheelIntent(event);
      if (!intent) return;
      // Something under the pointer that scrolls — the conversation, the
      // output panel, a long session list — keeps the wheel for itself, so the
      // components chosen into it can be scrolled to. Only a deliberate zoom
      // (⌘/ctrl + wheel, a pinch) reaches past it to the canvas.
      if (!event.ctrlKey && !event.metaKey && scrollsUnderPointer(event.target, surface, intent)) return;
      event.preventDefault();
      if (intent.kind === "zoom") {
        zoomFactor *= intent.factor;
        zoomAnchor = { x: event.clientX, y: event.clientY };
        if (zoomFrame !== null) return;
        zoomFrame = window.requestAnimationFrame(() => {
          zoomFrame = null;
          const factor = zoomFactor;
          zoomFactor = 1;
          zoomCanvasTo(canvasZoomRef.current * factor, zoomAnchor);
        });
        return;
      }
      panCanvasBy(intent.delta, surface);
    };
    surface.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      surface.removeEventListener("wheel", onWheel);
      if (zoomFrame !== null) window.cancelAnimationFrame(zoomFrame);
    };
    // `panCanvasBy` only touches refs and a state setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.surfaceMode, state.uiPreview, zoomCanvasTo]);

  /**
   * A drag moves the canvas — from anywhere on it, the frame included.
   *
   * A press that stays within a few pixels is still a click, which is how a
   * module is selected; past that it is a pan, and the click the browser would
   * send on release is swallowed so the drag does not also select whatever it
   * ended on. Fields, the column dividers and the floating controls keep their
   * own drags. The middle button pans too, the way it does in most canvases.
   *
   * Listening on the window once a press starts, so a drag that leaves the
   * surface — over the rail, past the window's edge — keeps going.
   */
  useEffect(() => {
    if (state.surfaceMode !== "builder" || state.uiPreview) return;
    const surface = builderSurfaceRef.current;
    if (!surface) return;
    let drag: { id: number; x: number; y: number; from: CanvasPan; moving: boolean } | null = null;

    const swallowClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const end = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const moved = drag.moving;
      drag = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      surface.removeAttribute("data-panning");
      if (!moved) return;
      window.addEventListener("click", swallowClick, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener("click", swallowClick, { capture: true }), 0);
    };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moving) {
        if (Math.hypot(dx, dy) < CANVAS_DRAG_SLOP) return;
        drag.moving = true;
        surface.setAttribute("data-panning", "true");
        // A drag that started on a reply has begun selecting its text.
        window.getSelection()?.removeAllRanges();
      }
      canvasPanRef.current = nextCanvasPan(
        drag.from,
        { x: -dx, y: -dy },
        { width: surface.clientWidth, height: surface.clientHeight },
        canvasZoomRef.current / 100,
      );
      publishCanvasPan();
    };
    const start = (event: PointerEvent) => {
      if (event.button !== 0 && event.button !== 1) return;
      if (!(event.target instanceof Element) || event.target.closest(CANVAS_DRAG_EXEMPT)) return;
      // The middle button's own default is autoscroll.
      if (event.button === 1) event.preventDefault();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, from: canvasPanRef.current, moving: false };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    };
    // An image or a link would otherwise start the browser's own drag.
    const blockNativeDrag = (event: DragEvent) => {
      if (drag) event.preventDefault();
    };
    surface.addEventListener("pointerdown", start);
    surface.addEventListener("dragstart", blockNativeDrag);
    return () => {
      surface.removeEventListener("pointerdown", start);
      surface.removeEventListener("dragstart", blockNativeDrag);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      surface.removeAttribute("data-panning");
    };
    // `publishCanvasPan` only touches refs and a state setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.surfaceMode, state.uiPreview]);

  /** One animation frame publishes however many pan steps arrived in it. */
  const publishCanvasPan = () => {
    if (canvasPanFrameRef.current !== null) return;
    canvasPanFrameRef.current = window.requestAnimationFrame(() => {
      canvasPanFrameRef.current = null;
      setCanvasPan(canvasPanRef.current);
    });
  };
  const panCanvasBy = (delta: CanvasPan, surface: HTMLElement) => {
    canvasPanRef.current = nextCanvasPan(
      canvasPanRef.current,
      delta,
      { width: surface.clientWidth, height: surface.clientHeight },
      canvasZoomRef.current / 100,
    );
    publishCanvasPan();
  };
  useEffect(
    () => () => {
      if (canvasPanFrameRef.current !== null) window.cancelAnimationFrame(canvasPanFrameRef.current);
    },
    [],
  );

  /**
   * Entering the interface preview recentres the canvas and leaves it.
   *
   * The pan is where the reader slid the *drawing* to; with the chrome folded
   * away there is nothing left to slide it out from behind, and an interface
   * sitting off to one side reads as a bug rather than as a pan the reader
   * chose three minutes ago. The zoom is deliberately left alone — that is how
   * big they asked to see it, and it is still true.
   */
  useEffect(() => {
    if (!state.uiPreview) return;
    canvasPanRef.current = NO_CANVAS_PAN;
    setCanvasPan(NO_CANVAS_PAN);
  }, [state.uiPreview]);

  /** Esc leaves the interface preview — the way out of every other overlay here. */
  useEffect(() => {
    if (!uiPreviewActive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      exitUiPreview();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // `exitUiPreview` is rebuilt every render and only ever dispatches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiPreviewActive]);

  /*
   * Esc leaves run mode too, the way it leaves the interface preview above —
   * the two are the product's two "look at it running" surfaces, and only one
   * answered the key. Same action as 编辑 UI/UX. Not while something nearer
   * owns Esc: an open menu or dialog closes first, and a field being typed in
   * keeps the key for itself.
   */
  useEffect(() => {
    if (state.surfaceMode !== "saved-preview") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || isTypingTarget(event.target)) return;
      if (document.querySelector('[role="dialog"], [role="menu"], [data-radix-popper-content-wrapper]')) return;
      event.preventDefault();
      dispatch({ type: "resetRun" });
      dispatch({ type: "patch", patch: { surfaceMode: "builder" } });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, state.surfaceMode]);

  useEffect(() => {
    if (state.selectedLayerId === null && state.selectedSlotId === null) {
      return;
    }
    // Clicking anywhere that is not itself a way to select clears the
    // selection. On the document rather than the canvas: the highlight is just
    // as stale after a click on the rail, the topbar, or the blank space under
    // the layer list, and leaving it lit there is what made it look stuck.
    const clearOnOutsidePointer = (event: PointerEvent) => {
      if (isSelectionTarget(event.target)) return;
      dispatch({ type: "patch", patch: { selectedLayerId: null, selectedSlotId: null } });
    };
    document.addEventListener("pointerdown", clearOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", clearOnOutsidePointer);
  }, [dispatch, state.selectedLayerId, state.selectedSlotId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
        return;
      }

      // ⌘0 resets zoom even from inside a field — it is unambiguous, and the
      // zoom menu's own percentage field relies on it. It recentres the canvas
      // too: it is the "put the view back" shortcut, and a reset zoom on a
      // canvas slid halfway off screen is not back.
      if ((event.metaKey || event.ctrlKey) && event.key === "0") {
        event.preventDefault();
        canvasPanRef.current = NO_CANVAS_PAN;
        setCanvasPan(NO_CANVAS_PAN);
        dispatch({ type: "patch", patch: { canvasZoom: 100 } });
        return;
      }

      // Bare +/- are typeable characters, so they only mean zoom when nothing
      // is collecting text. Without this, naming a project "a+b" would zoom.
      if (isTypingTarget(event.target)) {
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomCanvasTo(zoomIn(canvasZoomRef.current));
        return;
      }
      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomCanvasTo(zoomOut(canvasZoomRef.current));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, zoomCanvasTo]);

  /**
   * What the toolbar is pointing at, and what editing or deleting it means.
   *
   * A module selection resolves to one option; a column selection resolves to
   * the options that put that column on the canvas. The centre column resolves
   * to none, which is how it ends up undeletable — there is nothing to untick.
   */
  /*
   * Everything below reads the *hovered* module, not the selected one.
   *
   * The toolbar follows the pointer now (see the hover effect above), so the
   * thing Edit and Delete act on is the thing under the cursor. Selection is
   * still real and still highlights from the Layers list — it just no longer
   * decides what the toolbar is for, which is what frees the click to reach the
   * component underneath.
   */
  const toolbarSlotId = hoveredModule.slotId;
  const toolbarLayerId = hoveredModule.layerId;
  /*
   * An avatar under the pointer is a *state card*, not an option.
   *
   * `conversation.userAvatar` is what put it on the canvas, so that flag is
   * what Delete turns off and the 头像 gallery is where Edit lands. Without
   * this the innermost match the toolbar could resolve was `.chat-frame`, so
   * hovering an avatar offered to delete the entire conversation — reported.
   */
  const toolbarAvatarFlag = toolbarSlotId ? avatarFlagForModule(toolbarSlotId) : null;
  /*
   * A part of a component under the pointer — a tool card's title, the reply
   * surface, the output panel's tabs.
   *
   * The third target kind. These are not options and mostly cannot be (nothing
   * removes a tool card's title and leaves the card), so the reader's rule
   * applies: Edit jumps to the group that governs the part, and Delete is not
   * offered. Before this they resolved to nothing, the toolbar fell back to the
   * whole column, and hovering 正在读取文件 offered to delete the centre.
   */
  const toolbarPartGroup = toolbarSlotId ? groupForModule(toolbarSlotId) : null;
  const avatarCardOn = toolbarAvatarFlag ? Boolean(activeProject.conversation[toolbarAvatarFlag]) : false;
  const toolbarTarget = toolbarSlotId
    ? LAYER_HIGHLIGHT_SELECTORS[toolbarSlotId] ?? null
    : toolbarLayerId
      ? { left: ".session-sidebar", center: ".preview-stack", right: ".right-panel" }[toolbarLayerId] ?? null
      : null;
  // Deleting a column takes its contents with it. Otherwise the column comes
  // straight back: a component appears as soon as something inside it is
  // picked, so leaving a search box or an avatar on would re-mount the very
  // column that had just been deleted.
  const layerContentOptionIds = toolbarLayerId
    ? selectedComponentItems
        .filter((item) => {
          const component = PRESET_GROUP_COMPONENTS[item.groupId];
          if (!component) return false;
          const region = activeProject.layout.slots.find((slot) => slot.component === component)?.region;
          return (
            region !== undefined &&
            (REGION_LAYERS.find((layer) => layer.id === toolbarLayerId)?.regions.includes(region) ?? false)
          );
        })
        .map((item) => item.id)
    : [];
  const toolbarOptionIds = toolbarSlotId
    ? [optionIdForModule(toolbarSlotId)].filter((id): id is string => id !== null)
    : toolbarLayerId
      ? [...(LAYER_PRESENCE_OPTIONS[toolbarLayerId] ?? []), ...layerContentOptionIds]
      : [];
  const deletableOptionIds = toolbarOptionIds.filter((id) => isPresetOptionActive(activeProject, id));

  // Edit has its own target: the centre column has nothing to delete but still
  // has somewhere useful to land.
  const editOptionId = toolbarSlotId
    ? optionIdForModule(toolbarSlotId)
    : toolbarLayerId
      ? LAYER_EDIT_OPTIONS[toolbarLayerId] ?? null
      : null;

  /**
   * Preview and export run only on a project that can actually run.
   *
   * The check is here rather than on the canvas: building in any order is the
   * point, so a half-built agent is a normal state to look at and only a
   * problem at the moment you try to run or ship it.
   */
  const sidebarDragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [draggingSidebar, setDraggingSidebar] = useState(false);
  const rightDragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [draggingRight, setDraggingRight] = useState(false);
  /** Screen pixels per canvas pixel: the zoom, measured off the page itself. */
  const canvasScale = () => {
    const page = builderSurfaceRef.current?.querySelector<HTMLElement>(".canvas-zoom");
    if (!page || page.offsetWidth === 0) return 1;
    return page.getBoundingClientRect().width / page.offsetWidth;
  };
  /**
   * How far the canvas has been slid, in screen pixels.
   *
   * Local state with a ref in front of it: a wheel fires faster than the shell
   * can re-render, so the ref accumulates and one animation frame publishes the
   * result. The value still has to reach React, because the module toolbar is
   * positioned from client rects and has to re-measure when what it points at
   * moves.
   */
  const [canvasPan, setCanvasPan] = useState<CanvasPan>(NO_CANVAS_PAN);
  const canvasPanRef = useRef<CanvasPan>(NO_CANVAS_PAN);
  const canvasPanFrameRef = useRef<number | null>(null);
  const [pointerHint, setPointerHint] = useState<PointerHintState>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [pendingRun, setPendingRun] = useState<"preview" | "export" | null>(null);
  const missingRequirements = missingRequirementsForProject(activeProject, selectedComponentItems);
  const runOrAsk = (intent: "preview" | "export") => {
    if (missingRequirements.length > 0) {
      setPendingRun(intent);
      return;
    }
    if (intent === "preview") controller.saveScaffoldPreview();
    else void controller.generateExport();
  };
  // Set while the filled-in project is on its way to state. The run has to wait
  // for it: `saveScaffoldPreview` snapshots the project it was built with, so
  // running in the same tick preserved the very gaps that had just been filled
  // — measured, the preview opened with no conversation and no composer.
  const [runAfterFill, setRunAfterFill] = useState<"preview" | "export" | null>(null);
  const fillInAndRun = () => {
    const intent = pendingRun;
    setPendingRun(null);
    setProject((current) =>
      missingRequirements.reduce(
        (next, item) => (isPresetOptionActive(next, item.optionId) ? next : togglePresetOption(next, item.optionId)),
        current,
      ),
    );
    setRunAfterFill(intent);
  };
  /*
   * The island's 清空: every component off, and the rail's record of what was
   * picked with it — otherwise the ticks would survive the canvas they
   * described. `withEmptyStructure` is what 空白 uses, so it keeps what is not
   * a component (name, providers, theme, how things look). One step of undo,
   * held here because the island only shows the button.
   */
  /*
   * What the island counts: the components the rail shows ticked. The plain
   * `selectedComponentItems` counts every option that is in force, and a
   * variant always is — some thinking style, some loader — so an empty canvas
   * read 已选 19 and 清空 could not bring it down. The columns' own presence
   * toggles are left out too; the island's layout map shows the columns.
   */
  const railMounted = mountedComponentsForProject(activeProject, selectedComponentItems, state.pickedOptionIds);
  const conversationOnCanvas = !missingRequirements.some((item) => item.groupId === "conversation");
  /* A motion is a style's look before it is anyone's choice: each style puts
     its own thinking motion back when it is not one of its four, so after 清空
     科技风's LED 点阵 returned and was counted — as an added option, since
     turning it off changes the project. Counted when picked, not when worn. */
  const motionOptionIds = new Set(
    visiblePresetGroups.flatMap((group) => group.options).filter((option) => option.section === "Motion").map((option) => option.id),
  );
  const railSelectedItems = selectedComponentItems.filter((item) => {
    if (item.id.startsWith("state:author.")) return conversationOnCanvas;
    if (RAIL_HIDDEN_OPTION_IDS.has(item.id)) return false;
    if (motionOptionIds.has(item.id)) return state.pickedOptionIds.includes(item.id);
    return isOptionSelectedInRail(activeProject, { id: item.id }, item.groupId, state.pickedOptionIds, railMounted);
  });
  const clearSnapshotRef = useRef<{
    project: AgentFrontendProject;
    pickedOptionIds: readonly string[];
    pickedIconSlots: readonly string[];
  } | null>(null);
  const clearAllComponents = () => {
    clearSnapshotRef.current = {
      project,
      pickedOptionIds: state.pickedOptionIds,
      pickedIconSlots: state.pickedIconSlots,
    };
    /* `withEmptyStructure` keeps `reasoning`, `toolCalls` and the like on
       purpose — they say how things look, not whether they are there. Some of
       their options do add something to the canvas, though, and those have to
       go too, or 清空 left one behind. Read from the groups the rail shows,
       not the base table: a style's own options (科技风's LED 点阵) only exist
       there, and that was the one left behind. */
    /* Only the groups that hold components — 架构 and 交互流程. 外观 and 接入
       are not the canvas's contents: a palette reads as "added" by the same
       test (turning it off changes the project), so sweeping every group
       turned 游戏风's dark palette off and left its frames on a light page. */
    const componentGroupIds = new Set(
      presetRailSections
        .filter((section) => section.id === "structure" || section.id === "event-flow")
        .flatMap((section) => section.groupIds),
    );
    setProject((current) =>
      visiblePresetGroups
        .filter((group) => componentGroupIds.has(group.id))
        .flatMap((group) => group.options)
        .reduce((next, option) => {
          if (!isAddedContentOption(next, option.id) || !isPresetOptionActive(next, option.id)) return next;
          return togglePresetOption(next, option.id);
        }, withEmptyStructure(current)),
    );
    dispatch({ type: "patch", patch: { pickedOptionIds: [], pickedIconSlots: [], pinnedOptionId: null } });
  };
  const undoClearAll = () => {
    const snapshot = clearSnapshotRef.current;
    if (!snapshot) return;
    clearSnapshotRef.current = null;
    setProject(snapshot.project);
    dispatch({
      type: "patch",
      patch: { pickedOptionIds: snapshot.pickedOptionIds, pickedIconSlots: snapshot.pickedIconSlots },
    });
  };
  /* Turned on *and* recorded as picked, the way a click in the rail does it.
     A variant's first option is usually active already — a thinking style is
     always set — so turning it on alone changed nothing the rail or the
     island would call selected. */
  const fillInOne = (item: { optionId: string }) => {
    setProject((current) => (isPresetOptionActive(current, item.optionId) ? current : togglePresetOption(current, item.optionId)));
    if (!state.pickedOptionIds.includes(item.optionId)) dispatch({ type: "optionPicked", optionId: item.optionId });
  };
  /* An interaction stage: its first countable component, or — where it has
     none — its state icons, accepted as the defaults they already are. */
  const fillInStage = (groupId: PresetGroupId) => {
    const plan = stageFillPlan(groupId, activeProject);
    if (plan.optionId) {
      fillInOne({ optionId: plan.optionId });
      return;
    }
    for (const slot of plan.slots) dispatch({ type: "iconSlotPicked", slot });
  };
  /* Pins the card when given one, so "go and fill it" lands on the control
     that fills it — the dialog's 继续编辑 does the same. */
  const jumpToGroup = (groupId: PresetGroupId, optionId?: string) => {
    const location = railLocationForGroup(groupId);
    if (!location) return;
    dispatch({
      type: "patch",
      patch: { navSection: location.navSection, selectedGroup: location.groupId, pinnedOptionId: optionId ?? null },
    });
  };
  const keepBuilding = () => {
    setPendingRun(null);
    // Pinned to the first thing that is missing, so "I will finish it" lands on
    // the control that finishes it.
    const first = missingRequirements[0];
    if (!first) return;
    const location = railLocationForOption(first.optionId);
    if (!location) return;
    dispatch({
      type: "patch",
      patch: {
        navSection: location.navSection,
        selectedGroup: location.groupId,
        pinnedOptionId: first.optionId,
      },
    });
  };

  useEffect(() => {
    if (!runAfterFill || missingRequirements.length > 0) return;
    const intent = runAfterFill;
    setRunAfterFill(null);
    if (intent === "preview") controller.saveScaffoldPreview();
    else void controller.generateExport();
    // `controller` is rebuilt every render, so it is deliberately not a
    // dependency: the guard above is what decides when this runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runAfterFill, missingRequirements.length]);

  const editSelectedModule = () => {
    /* A card has no option id to jump to, so Edit lands on the group whose
       gallery holds it — 组件 → 对话区, where the four faces are. */
    if (toolbarAvatarFlag) {
      dispatch({
        type: "patch",
        patch: {
          navSection: "components",
          selectedGroup: AVATAR_CARD_GROUP_ID,
          pinnedOptionId: null,
        },
      });
      return;
    }
    /* Same move for a component's parts: the group that governs it, with no
       option to pin because the part is not one. */
    if (toolbarPartGroup) {
      const location = railLocationForGroup(toolbarPartGroup);
      if (!location) return;
      dispatch({
        type: "patch",
        patch: {
          navSection: location.navSection,
          selectedGroup: toolbarPartGroup,
          /* And the card that configures it, where one owns the part — the
             error row lands on 错误收起 rather than merely on 运行状态. Null
             for the parts no single option owns, which is most of them. */
          pinnedOptionId: toolbarSlotId ? pinnedOptionForModule(toolbarSlotId) : null,
        },
      });
      return;
    }
    const location = railLocationForOption(editOptionId ?? "");
    if (!location) return;
    dispatch({
      type: "patch",
      patch: {
        navSection: location.navSection,
        selectedGroup: location.groupId,
        // The rail scrolls this option into view and flashes it, so "edit"
        // lands on the control rather than just the right panel.
        pinnedOptionId: editOptionId,
      },
    });
  };

  const deleteSelected = () => {
    /* The card case: one flag, and nothing else goes with it. Deleting an
       avatar must not take the conversation — which is what would happen if
       this fell through to the option path below, whose target was the
       enclosing component. */
    if (toolbarAvatarFlag) {
      if (!avatarCardOn) return;
      setProject((current) => ({
        ...current,
        conversation: { ...current.conversation, [toolbarAvatarFlag]: false },
      }));
      return;
    }
    if (deletableOptionIds.length === 0) return;

    /*
     * Unticking the presence option is not enough on its own.
     *
     * `mountedComponentsForProject` keeps a component on the canvas while
     * anything in its *own group* has been picked — the rule that makes picking
     * 用户头像 bring the conversation with it instead of setting an option with
     * nowhere to show. Session picks used to be only what the reader had
     * clicked, so that rule rarely collided with Delete. Choosing a style now
     * fills `pickedOptionIds` with a whole starting kit, so every group has
     * picks, and Delete unticked the toggle while the component stayed exactly
     * where it was. Measured: after unticking `chat-visible`, `ChatFrame` was
     * still mounted.
     *
     * So the picks for that component's group go with it. Scoped to the group,
     * not cleared wholesale: the sidebar and the output panel are mounted by
     * their own groups' picks too, and dropping all of them deleted three
     * columns instead of one — also measured.
     */
    const groupsLosingTheirComponent = new Set(
      deletableOptionIds
        .filter((id) => PRESENCE_OPTION_IDS.has(id))
        .map((id) => OPTION_GROUP_IDS.get(id))
        .filter((groupId): groupId is PresetGroupId => groupId !== undefined),
    );
    const survivingPicks = groupsLosingTheirComponent.size === 0
      ? state.pickedOptionIds
      : state.pickedOptionIds.filter((id) => {
        const groupId = OPTION_GROUP_IDS.get(id);
        return groupId === undefined || !groupsLosingTheirComponent.has(groupId);
      });

    const apply = () => {
      setProject((current) =>
        deletableOptionIds.reduce(
          (next, optionId) => (isPresetOptionActive(next, optionId) ? togglePresetOption(next, optionId) : next),
          current,
        ),
      );
      dispatch({
        type: "patch",
        patch: {
          selectedSlotId: null,
          selectedLayerId: null,
          pickedOptionIds: survivingPicks,
        },
      });
    };

    // Deleting a side column plays its collapse first, so the centre widens
    // into the space instead of the column vanishing under the pointer. The
    // left column already has that transition (`data-left-collapsed`); the
    // right one swaps to a solo stack, which is immediate.
    if (toolbarLayerId === "left") {
      dispatch({ type: "patch", patch: { leftCollapsed: true } });
      window.setTimeout(() => {
        apply();
        dispatch({ type: "patch", patch: { leftCollapsed: false } });
      }, COLUMN_EXIT_MS);
      return;
    }
    apply();
  };

  const pendingExternalApprovalTool = activeProject.toolCalls.approval === "hidden"
    ? findPendingApprovalTool(displayViewModel.timeline)
    : undefined;
  const controller = createWorkspaceController({
    state,
    dispatch,
    refs,
    locale,
    copy,
    project,
    activeProject,
    setProject,
    events,
    previewRunner,
    sessionKeys: provider.sessionKeys,
    selectedPresetGroup,
    pendingExternalApprovalTool,
    isWelcome,
    gitPreviewState,
    rightPanelAvailable,
    iconSet,
  });

  const pendingInlineApprovalTool = activeProject.toolCalls.approval === "inline"
    ? findPendingApprovalTool(displayViewModel.timeline)
    : undefined;
  const demoTool = demoApprovalTool(locale);
  const externalApprovalTool = pendingExternalApprovalTool ?? demoTool;
  const showExternalApprovalOverlay = Boolean(
    state.externalApprovalOverlayActive && externalApprovalTool.id !== state.dismissedApprovalId,
  );
  const externalApprovalOverlay = showExternalApprovalOverlay ? (
    <div className="preview-approval-overlay" data-preview-region="approval-overlay">
      <ExternalApprovalSurface
        tool={externalApprovalTool}
        approvalIconSlot={selectedApprovalIconSlot}
        onConfirm={async (decision) => {
          if (state.runMode === "pi" && pendingExternalApprovalTool?.id === externalApprovalTool.id) {
            await controller.decidePiApproval(externalApprovalTool.id, decision);
          }
          dispatch({ type: "patch", patch: { dismissedApprovalId: externalApprovalTool.id, externalApprovalOverlayActive: false } });
        }}
      />
    </div>
  ) : null;
  const showInlineRuntimeApproval = Boolean(
    pendingInlineApprovalTool && pendingInlineApprovalTool.id !== state.dismissedApprovalId,
  );
  const inlineRuntimeApprovalOverlay = showInlineRuntimeApproval && pendingInlineApprovalTool ? (
    <div className="preview-approval-overlay" data-preview-region="approval-overlay" data-approval-kind="inline-runtime">
      <InlineApprovalSurface
        key={pendingInlineApprovalTool.id}
        tool={pendingInlineApprovalTool}
        onConfirm={async (decision) => {
          if (state.runMode === "pi") {
            await controller.decidePiApproval(pendingInlineApprovalTool.id, decision);
          }
          dispatch({ type: "patch", patch: { dismissedApprovalId: pendingInlineApprovalTool.id, inlineApprovalOverlayActive: false } });
        }}
      />
    </div>
  ) : null;
  const showInlineApprovalDemo = Boolean(
    state.inlineApprovalOverlayActive && !pendingInlineApprovalTool && demoTool.id !== state.dismissedApprovalId,
  );
  const inlineApprovalDemoOverlay = showInlineApprovalDemo ? (
    <div className="preview-approval-overlay" data-preview-region="approval-overlay" data-approval-kind="inline">
      <InlineApprovalDemo locale={locale} onDismiss={() => dispatch({ type: "patch", patch: { inlineApprovalOverlayActive: false } })} />
    </div>
  ) : null;

  const slotContext: SlotRenderContext = {
    project: runtimeProject,
    viewModel: displayViewModel,
    events,
    admission,
    exportSnapshot: state.exportSnapshot,
    showDebugBadges: builderUI.showDebugBadges,
    // Blank while the composed timeline is driving the canvas: it already
    // supplies the reader's turn, and the pending-prompt bubble put a second,
    // differently worded question above it.
    previewPrompt:
      usesCanvasTimeline || state.showStandard || state.runMode === "pi" ? "" : state.previewPrompt,
    previewPrompts: state.runMode === "pi" ? undefined : livePreviewPrompts,
    writingReplayKey: state.writingReplayKey,
    forceToolsOpen: state.forcePreviewToolsOpen,
    toolCollapseSignal: state.toolCollapseSignal,
    gitPreviewState,
    modelOptions: modelOptionsForProject(runtimeProject),
    isRunning: state.liveRunning,
    onSubmit(prompt, context) {
      return controller.runCurrentPreview(prompt, context);
    },
    onStop: controller.stopLivePreview,
    onExport: controller.generateExport,
    onGitCommit: controller.commitGitPreview,
    onProviderChange(id) {
      if (state.runMode === "pi") void controller.selectPiProvider(id);
      else controller.setDefaultProvider(id);
    },
    onModelChange(model) {
      if (state.runMode === "pi") void controller.selectPiModel(model);
      else controller.updateModel(model);
    },
    onApprovalDecision(toolCallId, decision) {
      if (state.runMode === "pi") return controller.decidePiApproval(toolCallId, decision);
    },
    onCollapseLeft: () => dispatch({ type: "patch", patch: { leftCollapsed: true } }),
    onCollapseRight: () => foldRightColumn(),
    onOpenArtifact: controller.openArtifactFromTool,
    outputPanelItems: state.outputPanelItems,
    activeOutputPanelItemId: state.activeOutputPanelItemId,
    onSelectOutputPanelItem: (id) => dispatch({ type: "patch", patch: { activeOutputPanelItemId: id } }),
    onCloseOutputPanelItem: controller.closeOutputPanelItem,
    onOutputSourceChange: controller.setOutputSource,
    // `hasPiSessions`, not `runMode === "pi"` — see its note: Pi mode with
    // nothing listable has to fall back to the demo rows or the reader's
    // 内容模块 / Row marks picks render as nothing at all.
    activeSessionPrompt: hasPiSessions ? undefined : state.previewPrompt,
    sessionPrompts: hasPiSessions ? undefined : sessionPrompts,
    activeSessionId: hasPiSessions ? state.activePiConversationId : undefined,
    sessionItems: hasPiSessions ? piSessionItems : undefined,
    onSelectSession(id) {
      /*
       * Routed by whether the row *is* a Pi conversation rather than by the
       * run mode: while Pi has nothing to list the rows are demo rows, and
       * handing one of their ids to `selectPiConversation` would select a
       * conversation that does not exist.
       */
      if (piSessionItems.some((item) => item.id === id)) {
        controller.selectPiConversation(id);
        return;
      }
      if (isWelcome) {
        /*
         * From the welcome state, clicking a conversation goes back to the
         * reply instead of staying on the empty canvas.
         *
         * It used to stream a standard scenario for this, which the builder's
         * canvas ignores — it shows the project's own fixed reply, not a canned
         * demo (see `usesCanvasTimeline`) — so the row looked dead. Leaving the
         * welcome state is the whole of it: the reply is already playing
         * underneath.
         */
        controller.leaveWelcomeState();
        return;
      }
      /*
       * In the builder, a row is a row: it becomes the open conversation and
       * the canvas stays where it is.
       *
       * It used to call `runCurrentPreview`, which replays the *saved*
       * snapshot — whatever the project looked like the last time it was
       * previewed, with the scenario that was picked then — and switches the
       * surface into the preview. So clicking 你都有什么功能? while editing
       * 科技风 dropped the reader into a 复古风 "视频生成事件流预览", with the
       * current avatars (the icon set is live, not snapshotted) on an old
       * style: a mix of two projects. The replay is what a row does inside
       * the saved preview, so that is the only place it still does it.
       */
      if (state.surfaceMode !== "saved-preview") {
        dispatch({ type: "patch", patch: { previewPrompt: id } });
        return;
      }
      void controller.runCurrentPreview(id);
    },
    onNewSession() {
      if (state.runMode === "pi") {
        controller.createNewPiConversation();
        return;
      }
      controller.enterWelcomeState();
    },
    welcomeGreeting: activeProject.welcome.greeting,
    isWelcome,
    providerSettingsControl: (
      <ProviderFloatingSettings
        project={runtimeProject}
        sessionKeys={provider.sessionKeys}
        isRunning={state.liveRunning}
        onFetchModels={(provider_, key) => state.runMode === "pi" ? void controller.refreshPiProviderModels(provider_, key) : void provider.fetchProviderModels(provider_, key)}
        onSave={() => state.runMode === "pi" ? void controller.savePiProviderSettings() : controller.saveProviderSettings()}
        onSetDefaultProvider={(id) => state.runMode === "pi" ? void controller.selectPiProvider(id) : controller.setDefaultProvider(id)}
        onSessionKeyChange={provider.updateSessionKey}
        onTestProvider={(provider_, key) => state.runMode === "pi" ? void controller.refreshPiProviderModels(provider_, key) : void provider.testProvider(provider_, key)}
        onUpdateProvider={(id, patch) => {
          if (state.runMode === "pi" && patch.defaultModel) void controller.updatePiProviderModel(id, patch.defaultModel);
          else provider.updateProviderConnection(id, patch);
        }}
      />
    ),
    externalApprovalPlacement: "overlay",
  };
  // Resolved once so "does this column have anything in it" is one question
  // rather than one per render site. An empty list is the normal case on open.
  /**
   * The canvas shows only what has been chosen.
   *
   * A column's presence toggle puts the column on the canvas; the components
   * inside it appear as their contents are picked. Until then each column is an
   * empty frame in the project's theme. Rendering the components as soon as the
   * column existed made the canvas open as a populated demo — a session list,
   * a greeting, an output panel — none of which the reader had asked for.
   */
  // What the canvas draws: a component appears as soon as something inside it
  // is picked. The project itself is untouched — this is what the canvas shows,
  // not a silent edit.
  const canvasSlots = slotsForTemplate(
    canvasSlotsForProject(activeProject, selectedComponentItems, state.pickedOptionIds),
    activeProject.template,
  );
  const renderRegion = (region: AgentCanvasRegion) =>
    renderSlots(canvasSlots, region, slotContext);
  const sidebarSlots = renderRegion("sidebar");
  const rightPanelSlots = renderRegion("right-panel");
  /*
   * The way *back* to the right column — not a toggle for it.
   *
   * It covers the two states where the column is not on screen: folded, and
   * deleted. From the reader's side those are one question — "is there a right
   * column?" — and the answer is this control at the centre's top right.
   *
   * Hidden once the column is open *and* has an output panel in it, which is
   * the correction. It used to stay in every state, on the grounds that one
   * control for all three is simpler than two; what that produced was an open
   * panel with a fold control in its own header and a second one in the column
   * beside it — two buttons, touching, doing the same thing to the same panel.
   * Asked about directly: "中栏和右栏都有展开图标，不是很奇怪吗". Open, the panel
   * folds itself, which is the control that sits on the thing it acts on.
   *
   * `OutputFrame` mounted, not merely "open", because the header that carries
   * that control is the frame's. A configured-but-empty right column has no
   * header and therefore no fold control of its own, so hiding this one as
   * well would leave an empty column open with no way to close it from the
   * canvas — and empty-but-open is the state clicking this control produces.
   *
   * The rule itself is `rightColumnFoldsItself` — extracted and tested,
   * because two earlier readings of "has an output panel" both looked right
   * and were wrong. See that file.
   *
   * The preview surface already had this rule, and it is where the rule came
   * from: there the column is the product's, so a control that folds it belongs
   * to the product.
   */
  const rightPanelFoldsItself = rightColumnFoldsItself({
    rightPanelVisible,
    renderedSlotCount: rightPanelSlots.length,
    canvasSlots,
  });
  const showRightColumnToggle =
    state.surfaceMode === "builder"
      ? !loaderCanvasPreviewActive && !rightPanelFoldsItself
      // Not gated on the welcome screen any more. The right column is there on
      // the welcome screen too, so folding it there — a new chat opens on that
      // screen — left no way to bring it back: the column was gone, its label
      // with it, and the only control that reopens it was waiting for a first
      // message.
      : rightPanelAvailable && state.rightCollapsed;
  /*
   * The control itself, built once and placed in the centre column in both of
   * the layouts below — the split and the solo stack. Inside the stack rather
   * than the frame on purpose: the frame's right edge is the *right* column's
   * edge whenever that column is open, and this belongs at the centre's.
   */
  const rightColumnToggle = showRightColumnToggle ? (
    <button
      type="button"
      className="rail-icon-btn preview-rail-float"
      data-side="right"
      aria-label={
        hasRightPanel && !state.rightCollapsed
          ? copy.shell.editor.collapsePanel
          : copy.shell.editor.expandPanel
      }
      aria-expanded={hasRightPanel && !state.rightCollapsed}
      onClick={toggleRightColumn}
    >
      <span className="native-rail-icon"><RightSidebarRailIcon size={15} /></span>
      <span className="legacy-rail-icon"><PanelRight size={15} /></span>
    </button>
  ) : null;

  const previewOverlaySlots = renderSlots(
    visibleLayoutSlots.filter((slot) => slot.component === "OutputFrame"),
    "overlay",
    { ...slotContext, onCollapseRight: undefined },
  );

  return (
    <>
      <Toaster richColors position="bottom-left" />
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} onSelectFixture={controller.selectFixture} />
      {/* WorkBuddy draws 16px filled glyphs (codicon); the other styles are
          two weights of lucide outlines. Scoped here so the CC-BY icon set
          only loads for the style that asked for it. */}
      <IconStyleProvider value={iconStyleForStylePreset(selectedPresetStyle)}>
      <div className="app-shell">
        <div
          className="workspace-layout"
          data-mode={state.surfaceMode}
          // One attribute for both halves of folding the rail away: the card's
          // own size, and the canvas padding that was holding room for it.
          data-rail-collapsed={state.surfaceMode === "builder" && state.railCollapsed ? "true" : undefined}
          // Open, the canvas's panel is full height, so the canvas leaves it
          // room the same way it does for the rail.
          data-layers-open={state.layersOpen ? "true" : undefined}
          data-drawer-open={state.surfaceMode === "builder" ? state.presetDrawerOpen : undefined}
          // One attribute folds all the editor's furniture away at once: the
          // rail card, the canvas panel, the region labels, and the padding
          // that was holding room for the first two. Faded rather than
          // unmounted — the rail carries scroll position, an open group and a
          // popover or two, and a mode you leave by pressing Esc should give
          // back the room you left, not a freshly mounted one.
          data-ui-preview={uiPreviewActive ? "true" : undefined}
        >
          {/* The style picker used to be a third floating card here, centred
              over the canvas. It is in the canvas's own panel now, at the top
              right: a card in the middle of the window put the product's second
              entry path on top of its output, and the palettes that recolour a
              style were still on the far side of the screen. */}
          {/* Positioned against this box, not against the shell: it is the
              same box the rail card is positioned against, which is what keeps
              the two cards exactly as tall as each other when the open one is
              pinned top and bottom. */}
          <Topbar
            copy={copy}
            locale={locale}
            surfaceMode={state.surfaceMode}
            /*
             * Leaving the run preview ends the run, not just the surface.
             *
             * This was a bare `patch` to `surfaceMode`, which left the run's
             * event source behind — and that is what emptied the builder's
             * canvas for good. Entering the preview in live mode sets
             * `runEvents: []` and `runEventSource: "live"`
             * (`savedPreviewEntered`); back in the builder,
             * `usesCanvasTimeline` requires the source *not* to be live, so
             * the builder stopped playing its own demo reply, and
             * `state.runEvents ?? fixtureEvents` kept the empty array — `??`
             * falls back on null, and `[]` is a real answer.
             *
             * The result was a canvas reading 未加载回放事件 while the layer
             * tree went on listing every module the reader had switched on:
             * the two sides of the window describing different projects.
             * Measured: fresh builder had no empty state, and after one
             * preview round trip it had one that never went away.
             *
             * `resetRun` is the reducer's own answer to "this run is over" —
             * it clears the events, the source, the live messages and the
             * overlay state together, which is why it is dispatched rather
             * than extending the patch with the one field that was noticed.
             */
            onReturnToBuilder={() => {
              dispatch({ type: "resetRun" });
              dispatch({ type: "patch", patch: { surfaceMode: "builder" } });
            }}
            runMode={state.runMode}
            onRunModeChange={controller.updateRunMode}
            selectedScenarioId={state.selectedScenarioId}
            onScenarioChange={controller.updateScenario}
            showDebugViewToggle={showDebugViewToggle}
            workspaceView={state.workspaceView}
            onWorkspaceViewToggle={() => dispatch({ type: "patch", patch: { workspaceView: state.workspaceView === "preview" ? "debug" : "preview" } })}
            onEnterPreview={() => runOrAsk("preview")}
            uiPreview={uiPreviewActive}
            onToggleUiPreview={() => dispatch({ type: "uiPreviewToggled", active: !state.uiPreview })}
            selectedComponentSummary={selectedComponentSummary}
            selectedComponentItems={selectedComponentItems}
            onExport={() => runOrAsk("export")}
            panelOpen={state.layersOpen}
            onTogglePanel={() => dispatch({ type: "patch", patch: { layersOpen: !state.layersOpen } })}
            // Composed here rather than inside the card, for the same reason
            // the layer list used to be: both need the project, and threading
            // it through a view that otherwise only knows about its own
            // controls would make the card the shell.
            styleChip={
              <StyleChip
                copy={copy}
                locale={locale}
                selectedPresetStyle={selectedPresetStyle}
                selectedThemeId={project.theme.preset}
                onApply={style.applyStyle}
                // The chip unfolds the panel rather than dropping a menu of
                // its own: the panel's first section is the same list of
                // cards, so the menu put the picker on screen twice, the
                // second time over the thing it duplicates.
                onExpand={() => dispatch({ type: "patch", patch: { layersOpen: true } })}
              />
            }
            styleRail={
              <StyleRailThumbs
                copy={copy}
                locale={locale}
                selectedPresetStyle={selectedPresetStyle}
                // An index, not a switch: the column shows what there is and
                // which is worn, and hands over to the cards' Apply. Same
                // thing the chip above it does — whatever you reach for in
                // the folded card, the card unfolds.
                onExpand={() => dispatch({ type: "patch", patch: { layersOpen: true } })}
              />
            }
            /*
             * The builder's panel section only.
             *
             * On the run-preview surface the canvas renders `activeProject` —
             * `state.savedProject`, the snapshot taken on entry — while
             * `applyStyle` writes `project`. So this section could not change
             * what the reader was looking at: applying a card there left
             * `data-style-preset` as it was and restyled the project *behind*
             * the preview instead, which is worse than inert. That surface
             * composes its own section (the run controls) inside `Topbar`.
             */
            panelSections={
              state.surfaceMode !== "builder" ? null : (
              <div className="canvas-panel-sections">
                <section className="canvas-panel-section">
                  <h3>{copy.shell.editor.chooseStyle}</h3>
                  {/* Cards, not tiles: each one opens on hover to show its four
                      colourways and applies itself. The confirm sheet that used
                      to follow a tile click is gone — see
                      `useStyleSwitch.applyStyle`. */}
                  <StyleCards
                    copy={copy}
                    locale={locale}
                    selectedPresetStyle={selectedPresetStyle}
                    selectedThemeId={project.theme.preset}
                    onApply={style.applyStyle}
                    colorOverrides={project.theme.colorOverrides}
                    // Repainting a colourway writes the project, so the canvas
                    // (and the export, which reads the same field) follows.
                    onColorChange={(themeId, role, hex) =>
                      setProject((current) => ({
                        ...current,
                        theme: {
                          ...current.theme,
                          colorOverrides: {
                            ...current.theme.colorOverrides,
                            [themeId]: { ...current.theme.colorOverrides?.[themeId], [role]: hex },
                          },
                        },
                      }))
                    }
                    onColorReset={(themeId) =>
                      setProject((current) => {
                        const { [themeId]: _dropped, ...rest } = current.theme.colorOverrides ?? {};
                        return { ...current, theme: { ...current.theme, colorOverrides: rest } };
                      })
                    }
                  />
                </section>
                {/*
                  The 主题 section — the worn style's palettes as a row of
                  tiles — was removed on request.
                  
                  It was the same decision twice on one screen: every style
                  card already opens on its own four colourways (配色), and
                  those apply through `useStyleSwitch.applyStyle` with the
                  style, so the tiles below restated a choice the reader had
                  just made one card up.

                  `ThemeTiles` and the `themePaletteOptions` projection went
                  with it — the component file is still on disk, so restoring
                  the section means re-importing it and re-deriving the
                  options from `visiblePresetGroups`' theme group filtered by
                  `visualStylePreset(selectedPresetStyle)`.
                */}
              </div>
              )
            }
          />
          {state.surfaceMode === "builder" ? (
            <PresetRail
              copy={copy}
              locale={locale}
              // The wordmark rides at the top of the rail card rather than in
              // a bar of its own: with the shell turned into one canvas, the
              // chrome is two floating cards and this is the top of one.
              brand={
                <ShellBrand
                  copy={copy}
                  title={
                    <ProjectTitle
                      name={project.name}
                      placeholder={copy.shell.presetRail.layers.title}
                      onRename={(name) => setProject((current) => ({ ...current, name }))}
                    />
                  }
                  onOpenPreferences={() => setPreferencesOpen(true)}
                  collapsed={state.railCollapsed}
                  onToggleCollapsed={() =>
                    dispatch({ type: "patch", patch: { railCollapsed: !state.railCollapsed } })
                  }
                />
              }
              // The canvas's layer list, back in the rail as the 图层
              // destination. Composed here because it needs the project and
              // half the workspace's selection state.
              layersPanel={
                <LayersPanel
                  project={activeProject}
                  locale={locale}
                  selectedLayerId={state.selectedLayerId}
                  onSelectLayer={(layerId) =>
                    dispatch({ type: "patch", patch: { selectedLayerId: layerId, selectedSlotId: null } })
                  }
                  selectedSlotId={state.selectedSlotId}
                  onSelectSlot={(slotId) =>
                    dispatch({ type: "patch", patch: { selectedSlotId: slotId, selectedLayerId: null } })
                  }
                  selectedComponentItems={selectedComponentItems}
                  pickedOptionIds={state.pickedOptionIds}
                  layersLabel={copy.shell.presetRail.layers.sectionTitle}
                />
              }
              project={project}
              navSection={state.navSection}
              onNavSectionChange={handleNavSectionChange}
              selectedComponentItems={selectedComponentItems}
              pickedOptionIds={state.pickedOptionIds}
              pickedIconSlots={state.pickedIconSlots}
              eventFlowReady={mountedComponents.has("ChatFrame")}
              onEventFlowLocked={(x, y) =>
                setPointerHint({ x, y, text: copy.shell.editor.flowNeedsConversation })
              }
              pinnedOptionId={state.pinnedOptionId}
              onPinnedOptionShown={() => dispatch({ type: "patch", patch: { pinnedOptionId: null } })}
              presetDrawerOpen={state.presetDrawerOpen}
              visiblePresetGroups={visiblePresetGroups}
              selectedGroupId={state.selectedGroup}
              selectedPresetGroup={selectedPresetGroup}
              selectedPresetStyle={selectedPresetStyle}
              styleSwitching={style.styleSwitching}
              onPresetGroupClick={controller.handlePresetGroupClick}
              stateCards={stateCards}
              selectedStateCode={selectedStateCode}
              isStateCardSelected={controller.isStateCardSelected}
              onStateCardToggle={controller.toggleStateCard}
              onStateCardPickIcon={controller.pickStateCardIcon}
              onStateCardDisable={controller.disableStateCard}
              onToolActionsOverview={controller.previewToolActionsOverviewFromCard}
              renderedPresetSections={renderedPresetSections}
              showPresetSectionLabels={showPresetSectionLabels}
              onSelectPreset={controller.selectPreset}
              onWritingParamChange={controller.updateWritingParam}
              showDebugBadges={builderUI.showDebugBadges}
              messageActionActive={(key) => controller.messageActionActive(key)}
              onMessageActionChange={controller.setMessageAction}
              sessionKeys={provider.sessionKeys}
              providerControls={{
                onFetchModels: (provider_, key) => provider.fetchProviderModels(provider_, key),
                onSave: controller.saveProviderSettings,
                onSetDefaultProvider: controller.setDefaultProvider,
                onSessionKeyChange: provider.updateSessionKey,
                onTestProvider: (provider_, key) => provider.testProvider(provider_, key),
                onToggleProvider: controller.toggleProvider,
                onToggleSettingsLauncher: controller.toggleProviderSettingsLauncher,
                onUpdateProvider: provider.updateProviderConnection,
              }}
              onWelcomeGreetingChange={provider.updateWelcomeGreeting}
              onWelcomeActivate={controller.previewWelcomeState}
            />
          ) : (
            // No rail on the preview surface, so the wordmark floats on its
            // own — the language switch has to stay reachable from here too.
            <ShellBrand
              copy={copy}
              title={
                <ProjectTitle
                  name={activeProject.name}
                  placeholder={copy.shell.presetRail.layers.title}
                  onRename={(name) => dispatch({ type: "updateSavedProject", mutator: (current) => ({ ...current, name }) })}
                />
              }
              onOpenPreferences={() => setPreferencesOpen(true)}
              floating
            />
          )}

          <main
            ref={builderSurfaceRef}
            className="builder-surface"
            data-output-zone="generated-scaffold"
            // Zoom is a CSS variable rather than a prop threaded into every
            // component: nothing inside the canvas needs to know it is being
            // magnified, and nothing re-renders when it changes. The pan rides
            // along the same way.
            style={{
              "--canvas-zoom": state.canvasZoom / 100,
              "--canvas-pan-x": `${canvasPan.x}px`,
              "--canvas-pan-y": `${canvasPan.y}px`,
              // Three properties rather than the `background` shorthand: the
              // textured backdrops set an image and a tile size, and the
              // exported shell reads the same rule with none of them set.
              "--canvas-bg": canvasBackground(state.canvasBackground).color,
              "--canvas-bg-image": canvasBackground(state.canvasBackground).texture?.image ?? "none",
              "--canvas-bg-size": canvasBackground(state.canvasBackground).texture?.size ?? "auto",
            } as CSSProperties}
            // Only a magnified canvas scrolls. Left at `auto` the whole time,
            // sub-pixel rounding puts a scrollbar on an unzoomed canvas.
            data-canvas-zoomed={state.canvasZoom > 100 ? "true" : undefined}
            // The canvas is no longer marked inert. That attribute existed to
            // disable text selection, so a drag would pick a module instead of
            // highlighting the mock conversation — and it went with the
            // suppressor that justified it. Selecting text in a reply is one of
            // the real interactions now.
          >
            {state.workspaceView === "preview" || state.surfaceMode === "saved-preview" ? (
              <>
                {/* Zoom wrapper. The frame keeps its own layout size, so
                    magnifying the canvas does not reflow the design being
                    edited — a 200% canvas is a bigger picture of the same
                    layout, not a narrower viewport. */}
                <div
                  className="canvas-zoom"
                  // The sidebar's width lives here, not on the frame: the
                  // region labels are a sibling of the frame — they had to
                  // leave it to escape its clipping — so a property set on the
                  // frame never reached them and the labels stayed put while
                  // the columns moved.
                  style={
                    {
                      ...(state.sidebarWidth === null ? {} : { "--session-width-set": `${state.sidebarWidth}px` }),
                      ...(state.rightPanelWidth === null ? {} : { "--right-width-set": `${state.rightPanelWidth}px` }),
                    } as CSSProperties
                  }
                >
                {/* Region labels, one per column, sitting in the gap above the
                    frame. Outside the frame rather than inside it: the frame
                    clips to its rounded corners, so a child at a negative
                    offset was invisible — these were never actually on screen.
                    They mirror the frame's column widths, so an empty column
                    still announces which one it is. */}
                {/*
                  * The canvas says it is re-skinning.
                  *
                  * Applying a style rewrites every token the frame draws with,
                  * which lands in one frame — so the canvas snapped from one
                  * skin to another with nothing in between, and the 450ms the
                  * switch already waits was spent looking at the old one. The
                  * rail had a spinner for this from the start
                  * (`styleSwitching`); the canvas, which is the thing actually
                  * changing, had nothing.
                  *
                  * A sibling of the frame rather than a pseudo-element on it:
                  * `.preview-frame::after` is the editor's selection overlay.
                  */}
                {style.styleSwitching ? (
                  <div className="canvas-reskin" aria-hidden="true">
                    <span className="canvas-reskin-sweep" />
                  </div>
                ) : null}
                <RegionLabels
                  project={activeProject}
                  locale={locale}
                  selectedLayerId={state.selectedLayerId}
                  rightPanelVisible={rightPanelVisible}
                  selectedComponentItems={selectedComponentItems}
                  pickedOptionIds={state.pickedOptionIds}
                />
                <div
                  ref={previewFrameRef}
                  className="preview-frame"
                  data-has-sidebar={hasSidebar}
                  data-has-right-panel={rightPanelVisible}
                  data-left-collapsed={state.leftCollapsed}
                  /* `data-right-collapsed` is the resting state (the column is
                     away); this is the transition in flight, in either
                     direction. Two attributes because they mean different
                     things and the CSS needs them apart: one hides the fold
                     control, the other drives the tracks. */
                  data-right-folding={state.rightCollapsing ? "true" : undefined}
                  data-right-collapsed={state.rightCollapsed}
                  // The chat header gives up its right corner while the fold
                  // control is sitting in it (see the padding rules in app.css).
                  data-right-toggle={showRightColumnToggle ? "true" : undefined}
                  // The *visual* style, so 空白 wears 原生风's rules; the id is
                  // beside it for anything that needs identity. See
                  // `visualStylePreset`.
                  data-skin={activeProject.theme.skinId}
                  // The editor's hover marks key on this (app.css, "Editor only"):
                  // set on the editing canvas alone, so the interface preview and
                  // every exported app — which share this stylesheet — show none.
                  data-editable={state.surfaceMode === "builder" && !uiPreviewActive ? "true" : undefined}
                  data-style-preset={visualStylePreset(selectedPresetStyle)}
                  data-style-id={selectedPresetStyle}
                  data-appearance={resolveSkin(activeProject.theme.skinId).tokens.appearance}
                  data-theme-preset={activeProject.theme.preset}
                  data-preview-refreshing={state.previewRefreshing}
                  // Which rail group is open, for showcase rules that only make
                  // sense while the reader is choosing in that group.
                  data-open-group={state.surfaceMode === "builder" ? state.selectedGroup : undefined}
                  // Selection lives on the frame so CSS can reach whichever
                  // column or component it names, without every component
                  // having to accept a "selected" prop.
                  data-selected-layer={state.selectedLayerId ?? undefined}
                  // The row id itself, not the component it resolves to: a row
                  // can name a module inside a component (a search field, a
                  // version footer), which has no slot to look up.
                  data-selected-module={state.selectedSlotId ?? undefined}
                >
                  {/* The Handdrawn style's wobble filters. `filter: url(#id)` is
                      a reference, so the `<filter>` has to be in the document —
                      see SketchFilters. Only that style mounts them. */}
                  {selectedPresetStyle === "handdrawn" ? <SketchFilters /> : null}
                  {leftSidebarMounted ? (
                    sidebarSlots.length > 0 ? sidebarSlots : <div className="session-sidebar region-empty" />
                  ) : null}
                  {/* The sidebar's edge. The centre/right split gets its handle
                      from its own handle; the sidebar is a fixed-width flex item
                      outside it, so this one sets its width directly. */}
                  {leftSidebarMounted && !state.leftCollapsed ? (
                    <div
                      className="resize-handle sidebar-resize-handle"
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={copy.shell.editor.resizeSidebar}
                      data-dragging={draggingSidebar ? "true" : undefined}
                      onPointerDown={(event) => {
                        const sidebar = event.currentTarget.previousElementSibling;
                        if (!(sidebar instanceof HTMLElement)) return;
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setDraggingSidebar(true);
                        sidebarDragRef.current = {
                          startX: event.clientX,
                          startWidth: sidebar.offsetWidth,
                        };
                      }}
                      onPointerMove={(event) => {
                        const drag = sidebarDragRef.current;
                        if (!drag) return;
                        dispatch({
                          type: "patch",
                          patch: {
                            sidebarWidth: clampSidebarWidth(
                              drag.startWidth + (event.clientX - drag.startX) / canvasScale(),
                            ),
                          },
                        });
                      }}
                      onPointerUp={(event) => {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                        sidebarDragRef.current = null;
                        setDraggingSidebar(false);
                      }}
                      // Double-click restores the style's own width, the same
                      // escape hatch a panel group's handle gives.
                      onDoubleClick={() => dispatch({ type: "patch", patch: { sidebarWidth: null } })}
                    />
                  ) : null}
                  {rightPanelVisible ? (
                    /*
                     * The right column, built the way the left one is.
                     *
                     * It was a `react-resizable-panels` split: 62% / 38% of
                     * whatever the frame was, so it grew with the window and
                     * opened wider than the sidebar opposite it. And its fold
                     * never matched the left's — the rules meant to animate it
                     * targeted `.preview-panels > .preview-panel`, but the
                     * library wraps each pane in a classless div, so they
                     * matched nothing and the column shut by squeezing.
                     *
                     * Now it is a fixed-width column — the same default width
                     * as the left sidebar in every style (`--side-col-w`) —
                     * dragged by its own handle, and it folds the way the left
                     * does: the whole column slides out on its margin, at the
                     * left's duration and curve, with the centre widening into
                     * the room it leaves.
                     */
                    <div className="preview-panels">
                      <div className="preview-panel-slot" data-slot="main">
                        <div className="preview-panel">
                          <section className="preview-stack" data-welcome={isWelcome ? "true" : undefined}>
                            {rightColumnToggle}
                            {renderRegion("main")}
                            {/* Approvals before the composer: the question is answered above the field it
                                would otherwise cover, and every approval surface shares one placement. */}
                            {inlineRuntimeApprovalOverlay}
                            {externalApprovalOverlay}
                            {inlineApprovalDemoOverlay}
                            {renderRegion("composer")}
                          </section>
                        </div>
                      </div>
                      <div
                        className="resize-handle right-resize-handle"
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={copy.shell.editor.resizeSidebar}
                        data-dragging={draggingRight ? "true" : undefined}
                        onPointerDown={(event) => {
                          const column = event.currentTarget.nextElementSibling;
                          if (!(column instanceof HTMLElement)) return;
                          event.currentTarget.setPointerCapture(event.pointerId);
                          setDraggingRight(true);
                          rightDragRef.current = { startX: event.clientX, startWidth: column.offsetWidth };
                        }}
                        onPointerMove={(event) => {
                          const drag = rightDragRef.current;
                          if (!drag) return;
                          // Pointer travel is in screen pixels, the width in
                          // canvas pixels — divided out, so the edge stays
                          // under the pointer at every zoom.
                          const travel = (event.clientX - drag.startX) / canvasScale();
                          dispatch({
                            type: "patch",
                            patch: { rightPanelWidth: clampRightPanelWidth(drag.startWidth - travel) },
                          });
                        }}
                        onPointerUp={(event) => {
                          event.currentTarget.releasePointerCapture(event.pointerId);
                          rightDragRef.current = null;
                          setDraggingRight(false);
                        }}
                        onDoubleClick={() => dispatch({ type: "patch", patch: { rightPanelWidth: null } })}
                      />
                      <div className="preview-panel-slot" data-slot="right">
                        <div className="preview-panel">
                          <aside className="right-panel" data-empty={rightPanelSlots.length === 0 ? "true" : undefined}>
                            {rightPanelSlots}
                          </aside>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <section className="preview-stack preview-stack-solo" data-welcome={isWelcome ? "true" : undefined}>
                      {rightColumnToggle}
                      {renderRegion("main")}
                      {inlineRuntimeApprovalOverlay}
                      {externalApprovalOverlay}
                      {inlineApprovalDemoOverlay}
                      {renderRegion("composer")}
                    </section>
                  )}
                  {hasSidebar && state.leftCollapsed && !autoHiddenRails.left ? (
                    <button
                      type="button"
                      className="rail-icon-btn preview-rail-float"
                      data-side="left"
                      aria-label={copy.shell.editor.expandSidebar}
                      onClick={() => dispatch({ type: "patch", patch: { leftCollapsed: false } })}
                    >
                      <span className="native-rail-icon"><SidebarRailIcon size={15} /></span>
                      <span className="legacy-rail-icon"><PanelLeft size={15} /></span>
                    </button>
                  ) : null}
                  {state.outputModalOpen ? (
                    <OutputPanelModal
                      items={state.outputPanelItems}
                      activeId={state.activeOutputPanelItemId}
                      onSelectItem={(id) => dispatch({ type: "patch", patch: { activeOutputPanelItemId: id } })}
                      onCloseItem={controller.closeOutputPanelItem}
                      onClose={() => dispatch({ type: "patch", patch: { outputModalOpen: false } })}
                    />
                  ) : null}
                </div>
                </div>
                {/* Also outside the zoom wrapper: the toolbar keeps one size at
                    every zoom level, and sitting outside `.preview-frame` keeps
                    it clear of the capture-phase suppression that would
                    otherwise swallow its own clicks. */}
                {/* Unmounted in the interface preview rather than faded: it is
                    positioned from the client rect of whatever is selected, and
                    the selection is cleared on the way in — so there is nothing
                    for it to point at. */}
                {state.surfaceMode === "builder" && !state.uiPreview ? (
                  <ModuleToolbar
                    copy={copy}
                    target={toolbarTarget}
                    surfaceRef={builderSurfaceRef}
                    zoom={state.canvasZoom}
                    pan={canvasPan}
                    canDelete={
                      toolbarAvatarFlag
                        ? avatarCardOn
                        : toolbarPartGroup
                          ? false
                          : deletableOptionIds.length > 0
                    }
                    onEdit={editSelectedModule}
                    onDelete={deleteSelected}
                  />
                ) : null}
                {/* Outside the zoom wrapper on purpose: the overlay surface is
                    positioned against `.builder-surface`, and moving it inside
                    would change its containing block. */}
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
          {/* The zoom floats at the canvas's top right, where a design
              tool keeps it, rather than at the foot of the canvas panel —
              out of sight whenever the panel was folded, and nowhere near
              the thing it sizes. Gone in the interface preview with the
              rest of the editor's furniture. Outside the surface, which wears
              the preview's palette: this is the editor's control, not the
              agent's, and must not turn navy under 科技风·深海. */}
          {uiPreviewActive ? null : (
            <div className="canvas-status-bar">
              <SelectionIsland
                locale={locale}
                appearance={resolveSkin(activeProject.theme.skinId).tokens.appearance}
                project={activeProject}
                pickedOptionIds={state.pickedOptionIds}
                activeGroupId={state.selectedGroup}
                items={railSelectedItems}
                layerItems={selectedComponentItems}
                missing={missingRequirements}
                pickedIconSlots={state.pickedIconSlots}
                onFillRequired={fillInOne}
                onFillStage={fillInStage}
                onJumpToGroup={jumpToGroup}
                onEnableColumn={(optionId) => fillInOne({ optionId })}
                onFillOptions={(optionIds) => {
                  for (const optionId of optionIds) fillInOne({ optionId });
                }}
                onClearAll={clearAllComponents}
                onUndoClear={undoClearAll}
              />
            </div>
          )}
          {uiPreviewActive ? null : (
            <div className="canvas-zoom-bar">
              <ZoomControl copy={copy} zoom={state.canvasZoom} onZoomChange={(zoom) => zoomCanvasTo(zoom)} />
            </div>
          )}
          {/* The way back, in the slot the eye button just vacated — pressing
              the same corner twice is the same control, and a mode whose only
              exit is a key nobody was told about is a trap. A sibling of the
              canvas rather than a child: it must not be magnified with it, and
              it must not be folded away by the rule that folds the chrome. */}
          {uiPreviewActive ? (
            <button type="button" className="ui-preview-exit" onClick={exitUiPreview}>
              <Pencil size={14} />
              {copy.shell.topbar.exitUiPreview}
              <kbd>Esc</kbd>
            </button>
          ) : null}
        </div>

        {builderUI.showDebugBadges ? (
          <footer className="schema-strip">
            {projectPresetSummary(project).map((item) => (
              <code key={item}>{item}</code>
            ))}
          </footer>
        ) : null}
      </div>
      <PointerHint hint={pointerHint} onDismiss={() => setPointerHint(null)} />
      <PreferencesDialog
        copy={copy}
        locale={locale}
        onLocaleChange={setLocale}
        background={state.canvasBackground}
        onBackgroundChange={(background) => dispatch({ type: "patch", patch: { canvasBackground: background } })}
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
      {state.surfaceMode === "builder" ? (
        <IncompleteProjectDialog
          copy={copy}
          locale={locale}
          missing={pendingRun ? missingRequirements : []}
          onFillIn={fillInAndRun}
          onKeepBuilding={keepBuilding}
        />
      ) : null}
      </IconStyleProvider>
    </>
  );
}

/**
 * Sidebar width bounds.
 *
 * The floor is where the session titles stop being readable; the ceiling keeps
 * the conversation wider than the list beside it, which is the point of the
 * layout.
 */
function clampSidebarWidth(width: number): number {
  return Math.round(Math.min(420, Math.max(180, width)));
}

/** The right column's bounds: the sidebar's, so the two read as a pair. */
function clampRightPanelWidth(width: number): number {
  return Math.round(Math.min(420, Math.max(180, width)));
}

/** Matches `--motion-slow`, the column collapse transition. */
const COLUMN_EXIT_MS = 240;

/** True when the event target is collecting text, so bare keys are not shortcuts. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * The innermost module under an element, as a layer-row id.
 *
 * Reads the highlight map backwards: the hover CSS lights the innermost
 * matching ancestor, and this returns the id of that same element, so clicking
 * selects exactly what hovering highlighted. Columns come last because every
 * module is inside one.
 */
/**
 * How long a shown toolbar keeps its target while the pointer is over
 * something else.
 *
 * Long enough to cross a neighbouring module on the way to the toolbar, short
 * enough that deliberately moving to another module still feels immediate.
 */
const HOVER_RETARGET_MS = 180;

/**
 * How long after the last scroll event the hover mark is allowed back.
 *
 * Long enough to cover the gap between two wheel notches — a shorter window
 * flickered the outline back on mid-scroll, which is the bug in instalments.
 */
const HOVER_SCROLL_SETTLE_MS = 260;

/** Shared empty value, so clearing hover does not allocate a new object each move. */
const NO_HOVER = { slotId: null, layerId: null } as const;

/**
 * The canvas's event list while the welcome state is on.
 *
 * A constant, for the same reason as `NO_HOVER`: a fresh `[]` each render is a
 * new dependency for the admission memo below it, which would re-admit the
 * stream on every keystroke.
 */
const NO_EVENTS: AgentUXEvent[] = [];

function moduleIdAtTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  let best: { id: string; depth: number } | null = null;
  for (const [moduleId, selector] of Object.entries(LAYER_HIGHLIGHT_SELECTORS)) {
    const match = target.closest(selector);
    if (!match) continue;
    // Deeper match wins, which is what "innermost" means here.
    let depth = 0;
    for (let node: Element | null = match; node; node = node.parentElement) depth += 1;
    if (!best || depth > best.depth) best = { id: moduleId, depth };
  }
  return best?.id ?? null;
}

/**
 * Controls inside the canvas that the click suppression lets through.
 *
 * Both edit the layout rather than the mock agent: the handle changes a column's
 * width, the float brings a column back. Everything else in the frame is a
 * drawing of the product and answers a click with the module toolbar instead.
 */
const LIVE_LAYOUT_CONTROLS = ".resize-handle, .preview-rail-float";

/** The column under an element, as a layer id. */
function layerIdAtTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  if (target.closest(".session-sidebar")) return "left";
  if (target.closest(".right-panel")) return "right";
  if (target.closest(".preview-stack")) return "center";
  return null;
}

/**
 * Whether a pointerdown landed on something that selects.
 *
 * Two kinds of target: a row in the layer list, and a component on the canvas.
 * The canvas selectors are the same map the selection overlay uses, so this
 * cannot drift out of step with what the canvas is able to highlight — if a
 * click can select it, a click elsewhere clears it.
 *
 * Scoped to `.layers-panel` because the group disclosures in Structure and
 * Components share the `.layers-row` class, and opening a group is not
 * selecting a layer.
 */
/**
 * Whether the wheel at `target` has an inner scroller to move.
 *
 * Walks up from the pointer to the surface looking for an element that can
 * scroll on the wheel's axis. "Can scroll" means it overflows *and* lets its
 * overflow scroll — plenty of boxes overflow behind `overflow: hidden`. A
 * scroller already at its end on that side still counts: if the wheel fell
 * through to a zoom the moment the conversation hit its last line, reading to
 * the bottom would end in the canvas lurching.
 */
function scrollsUnderPointer(
  target: EventTarget | null,
  surface: HTMLElement,
  intent: NonNullable<ReturnType<typeof wheelIntent>>,
): boolean {
  const sideways = intent.kind === "pan" && Math.abs(intent.delta.x) > Math.abs(intent.delta.y);
  for (let node = target instanceof Element ? target : null; node && node !== surface; node = node.parentElement) {
    const style = getComputedStyle(node);
    const overflow = sideways ? style.overflowX : style.overflowY;
    if (overflow !== "auto" && overflow !== "scroll") continue;
    if (sideways ? node.scrollWidth > node.clientWidth + 1 : node.scrollHeight > node.clientHeight + 1) return true;
  }
  return false;
}

/**
 * What a press on the canvas leaves alone rather than turning into a pan:
 * things with a drag of their own (fields, the column dividers) and the
 * controls floating over the canvas.
 */
const CANVAS_DRAG_EXEMPT = [
  "input",
  "textarea",
  "select",
  "[contenteditable]:not([contenteditable='false'])",
  ".resize-handle",
  ".module-toolbar",
  ".canvas-zoom-bar",
].join(", ");

function isSelectionTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(".layers-panel .layers-row") !== null) return true;
  // The toolbar acts on the selection, so clicking it must not clear it.
  if (target.closest(".module-toolbar") !== null) return true;
  if (target.closest(".preview-frame") !== null) return true;
  return false;
}
