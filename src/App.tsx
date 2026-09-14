import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { PanelLeft, PanelRight } from "lucide-react";
import { Toaster, toast } from "sonner";

import { useAgentUXRuntime, useAgentUXViewModel } from "./agentux";
import { IconStyleProvider, scenarioById, useIconSet } from "./agentmatrix";
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
import { applyTheme } from "./theme/applyTheme";
import { themeTokens } from "./theme/themeTokens";
import {
  defaultCodingAgentProject,
  emptyStructureProject,
  modelOptionsForProject,
  type AgentCanvasRegion,
  type AgentFrontendProject,
} from "./schema/agentuxConfig";
import { isPresetOptionActive, togglePresetOption } from "./schema/presetActions";
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
import { Topbar } from "./app/view/Topbar";
import { IncompleteProjectDialog } from "./app/view/IncompleteProjectDialog";
import { canvasTimelineEvents } from "./app/projection/canvasTimeline";
import { ModuleToolbar } from "./app/view/ModuleToolbar";
import { PointerHint, type PointerHintState } from "./app/view/PointerHint";
import { NO_CANVAS_PAN, nextCanvasPan, wheelPanDelta, type CanvasPan } from "./app/view/canvasPan";
import { clampZoom, zoomIn, zoomOut } from "./app/view/ZoomControl";
import {
  collectDefaultOutputPanelItems,
  outputPanelItemsSignature,
} from "./app/projection/outputPanelProjection";
import {
  NATIVE_HIDDEN_USER_AVATAR_IDS,
  PREVIEW_RESPONSIVE_WIDTHS,
  LAYER_EDIT_OPTIONS,
  LAYER_HIGHLIGHT_SELECTORS,
  LAYER_PRESENCE_OPTIONS,
  PRESET_GROUP_COMPONENTS,
  isOptionShownInRail,
  REGION_LAYERS,
  canvasSlotsForProject,
  layersForProject,
  missingRequirementsForProject,
  mountedComponentsForProject,
  STYLE_AVATAR_DEFAULTS,
  groupPresetOptions,
  rawStateCardToStateCard,
  optionIdForModule,
  railLocationForOption,
  resolveGroupForNavSection,
  visibleStateCards,
  type NavSectionId,
} from "./app/projection/presetRailData";
import { liveLlmGitPreviewState, standardScenarioTitle } from "./app/projection/previewDefaults";
import {
  componentSummaryLabel,
  selectedComponentItemsForProject,
} from "./app/projection/selectedComponents";
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
  const { iconSet, setSlot } = useIconSet();
  // Opens on the empty three-column skeleton. `defaultCodingAgentProject` stays
  // the shape an *exported* project ships with; this is only the editor's
  // starting point. See emptyStructureProject for why they are separate.
  const [project, setProject] = useState<AgentFrontendProject>(emptyStructureProject);
  const { state, dispatch, refs } = useWorkspaceState(locale);
  // Single source of truth: the style preset lives on the project so it travels with
  // the export (168 rules in app.css branch on `data-style-preset`). Derived rather
  // than mirrored in local state so the two can never diverge.
  const selectedPresetStyle = project.theme.stylePreset;
  const [commandOpen, setCommandOpen] = useState(false);

  const updateActiveProject = createProjectUpdater(state, dispatch, setProject);
  const provider = useProviderSettings({ copy, updateActiveProject });
  const style = useStyleSwitch({ selectedPresetStyle, locale, setSlot, setProject });

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
  const canvasTimelineItems = useMemo(
    () => selectedComponentItemsForProject(activeProject, presetGroupsForProject(activeProject), locale),
    [activeProject, locale],
  );
  const canvasEvents = useMemo(
    () =>
      canvasTimelineEvents({
        project: activeProject,
        items: canvasTimelineItems,
        picked: state.pickedOptionIds,
        locale,
      }),
    [activeProject, canvasTimelineItems, locale, state.pickedOptionIds],
  );
  const usesCanvasTimeline =
    state.surfaceMode === "builder" &&
    state.runEventSource !== "live" &&
    state.runEventSource !== "pi";
  const rawEvents = usesCanvasTimeline ? canvasEvents : state.runEvents ?? fixtureEvents;
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
  const rightPanelVisible = rightPanelAvailable && !state.rightCollapsed;
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
   * One control for all three states the right column can be in — open, folded,
   * deleted — because from the reader's side they are one question: is the right
   * column showing? So it is always there while the canvas is being designed,
   * and it does whichever of the three things is needed.
   *
   * The preview surface keeps the narrower rule it had: there the column is the
   * product's, and a control that folds it belongs to the product, not to us.
   */
  const showRightColumnToggle =
    state.surfaceMode === "builder"
      ? !loaderCanvasPreviewActive
      : rightPanelAvailable && state.rightCollapsed && !isWelcome;
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
    dispatch({ type: "patch", patch: { rightCollapsed: !state.rightCollapsed } });
  };
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
      patch: nextGroup ? { navSection: section, selectedGroup: nextGroup } : { navSection: section },
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
    .map((section) => ({ ...section, items: section.items.filter(isOptionShownInRail) }))
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
    applyTheme(themeTokens["polar-mono"]);
    if (builderSurfaceRef.current) {
      applyTheme(themeTokens[activeProject.theme.preset], builderSurfaceRef.current);
    }
  }, [activeProject.theme.preset]);

  useEffect(() => {
    if (!showDebugViewToggle && state.workspaceView === "debug") {
      dispatch({ type: "patch", patch: { workspaceView: "preview" } });
    }
  }, [showDebugViewToggle, state.workspaceView, dispatch]);

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

    updateAutoHiddenRails(frame.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      updateAutoHiddenRails(entries[0]?.contentRect.width ?? frame.getBoundingClientRect().width);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [state.surfaceMode, state.workspaceView, dispatch]);

  useEffect(() => {
    dispatch({ type: "patch", patch: { selectedGroup: resolvePresetGroupSelection(state.selectedGroup, project.template) } });
  }, [project.template, state.selectedGroup, dispatch]);

  useEffect(() => {
    if (selectedPresetStyle === "native" && NATIVE_HIDDEN_USER_AVATAR_IDS.has(iconSet["author.user"] ?? "")) {
      setSlot("author.user", STYLE_AVATAR_DEFAULTS.native["author.user"]);
    }
  }, [iconSet, selectedPresetStyle, setSlot]);

  /**
   * In the configurator the canvas is a design surface, not a running app.
   *
   * Every component interaction is suppressed at the capture phase — before it
   * reaches the component's own handler — and the click is spent on selecting
   * the module instead. Suppressed rather than removed because the handlers are
   * not the whole story: components keep their own state (the search popover,
   * tool-card collapse), so cutting the props in `slotContext` would leave half
   * the behaviour live.
   *
   * `inert` would have been the obvious tool and does not work here: Chrome
   * takes an inert subtree out of hit-testing entirely, so `:hover` stops
   * matching and `elementsFromPoint` cannot see it — measured. That would
   * destroy the innermost-wins highlight, which is the thing this canvas is
   * for.
   *
   * The preview surface is left alone: trying the real interactions is what it
   * is for.
   */
  useEffect(() => {
    if (state.surfaceMode !== "builder") return;
    const frame = previewFrameRef.current;
    if (!frame) return;

    const suppress = (event: Event) => {
      // Resizing a column and bringing one back stay live. They edit the
      // *layout*, which is the kind of thing this surface is for; what the
      // suppression is for is the product's own controls — a send button, a
      // session row — which would otherwise drive the mock agent.
      if (event.target instanceof Element && event.target.closest(LIVE_LAYOUT_CONTROLS)) return;
      event.stopPropagation();
      // Not on pointerdown: preventing its default would also cancel the
      // synthetic click, and the click is what carries the selection.
      if (event.type !== "pointerdown" && event.type !== "click") event.preventDefault();
    };

    const select = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(LIVE_LAYOUT_CONTROLS)) return;
      const moduleId = moduleIdAtTarget(event.target);
      dispatch({
        type: "patch",
        patch: moduleId
          ? { selectedSlotId: moduleId, selectedLayerId: null }
          : { selectedSlotId: null, selectedLayerId: layerIdAtTarget(event.target) },
      });
    };

    const SUPPRESSED = ["pointerdown", "mousedown", "mouseup", "click", "dblclick", "keydown", "input", "submit"];
    for (const type of SUPPRESSED) frame.addEventListener(type, suppress, { capture: true });
    frame.addEventListener("click", select, { capture: true });
    return () => {
      for (const type of SUPPRESSED) frame.removeEventListener(type, suppress, { capture: true });
      frame.removeEventListener("click", select, { capture: true });
    };
  }, [dispatch, state.surfaceMode, state.workspaceView]);

  /**
   * The wheel moves the canvas.
   *
   * The whole window is the canvas, so the wheel does to it what a wheel does
   * to a canvas: slides it. Nothing inside it scrolls while it is being
   * designed — it is a drawing of the product, and a drawing that scrolls its
   * own contents under the pointer is a page with a preview in it.
   *
   * Done with a transform rather than by making the surface scrollable. A
   * scroll container can only reach as far as its content, which is a frame
   * sized to the free space, so at 100% there would be nothing to scroll at
   * all — and any slack added to fix that would have to be re-centred on every
   * resize and every zoom step.
   *
   * The preview surface is left alone: the wheel belongs to the running agent
   * there, the same way its clicks do.
   */
  useEffect(() => {
    if (state.surfaceMode !== "builder") return;
    const surface = builderSurfaceRef.current;
    if (!surface) return;
    const onWheel = (event: WheelEvent) => {
      const delta = wheelPanDelta(event);
      if (delta.x === 0 && delta.y === 0) return;
      event.preventDefault();
      canvasPanRef.current = nextCanvasPan(
        canvasPanRef.current,
        delta,
        { width: surface.clientWidth, height: surface.clientHeight },
        state.canvasZoom / 100,
      );
      if (canvasPanFrameRef.current !== null) return;
      canvasPanFrameRef.current = window.requestAnimationFrame(() => {
        canvasPanFrameRef.current = null;
        setCanvasPan(canvasPanRef.current);
      });
    };
    surface.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      surface.removeEventListener("wheel", onWheel);
      if (canvasPanFrameRef.current !== null) {
        window.cancelAnimationFrame(canvasPanFrameRef.current);
        canvasPanFrameRef.current = null;
      }
    };
  }, [state.canvasZoom, state.surfaceMode]);

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
        dispatch({ type: "patch", patch: { canvasZoom: zoomIn(state.canvasZoom) } });
        return;
      }
      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        dispatch({ type: "patch", patch: { canvasZoom: zoomOut(state.canvasZoom) } });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, state.canvasZoom]);

  /**
   * What the toolbar is pointing at, and what editing or deleting it means.
   *
   * A module selection resolves to one option; a column selection resolves to
   * the options that put that column on the canvas. The centre column resolves
   * to none, which is how it ends up undeletable — there is nothing to untick.
   */
  const toolbarTarget = state.selectedSlotId
    ? LAYER_HIGHLIGHT_SELECTORS[state.selectedSlotId] ?? null
    : state.selectedLayerId
      ? { left: ".session-sidebar", center: ".preview-stack", right: ".right-panel" }[state.selectedLayerId] ?? null
      : null;
  // Deleting a column takes its contents with it. Otherwise the column comes
  // straight back: a component appears as soon as something inside it is
  // picked, so leaving a search box or an avatar on would re-mount the very
  // column that had just been deleted.
  const layerContentOptionIds = state.selectedLayerId
    ? selectedComponentItems
        .filter((item) => {
          const component = PRESET_GROUP_COMPONENTS[item.groupId];
          if (!component) return false;
          const region = activeProject.layout.slots.find((slot) => slot.component === component)?.region;
          return (
            region !== undefined &&
            (REGION_LAYERS.find((layer) => layer.id === state.selectedLayerId)?.regions.includes(region) ?? false)
          );
        })
        .map((item) => item.id)
    : [];
  const toolbarOptionIds = state.selectedSlotId
    ? [optionIdForModule(state.selectedSlotId)].filter((id): id is string => id !== null)
    : state.selectedLayerId
      ? [...(LAYER_PRESENCE_OPTIONS[state.selectedLayerId] ?? []), ...layerContentOptionIds]
      : [];
  const deletableOptionIds = toolbarOptionIds.filter((id) => isPresetOptionActive(activeProject, id));

  // Edit has its own target: the centre column has nothing to delete but still
  // has somewhere useful to land.
  const editOptionId = state.selectedSlotId
    ? optionIdForModule(state.selectedSlotId)
    : state.selectedLayerId
      ? LAYER_EDIT_OPTIONS[state.selectedLayerId] ?? null
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
  const [panelLayout, setPanelLayout] = useState<{ main: number; right: number } | undefined>();
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
    if (deletableOptionIds.length === 0) return;
    const apply = () => {
      setProject((current) =>
        deletableOptionIds.reduce(
          (next, optionId) => (isPresetOptionActive(next, optionId) ? togglePresetOption(next, optionId) : next),
          current,
        ),
      );
      dispatch({ type: "patch", patch: { selectedSlotId: null, selectedLayerId: null } });
    };

    // Deleting a side column plays its collapse first, so the centre widens
    // into the space instead of the column vanishing under the pointer. The
    // left column already has that transition (`data-left-collapsed`); the
    // right one swaps to a solo stack, which is immediate.
    if (state.selectedLayerId === "left") {
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
      void controller.runCurrentPreview(prompt, context);
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
    onCollapseRight: () => dispatch({ type: "patch", patch: { rightCollapsed: true } }),
    onOpenArtifact: controller.openArtifactFromTool,
    outputPanelItems: state.outputPanelItems,
    activeOutputPanelItemId: state.activeOutputPanelItemId,
    onSelectOutputPanelItem: (id) => dispatch({ type: "patch", patch: { activeOutputPanelItemId: id } }),
    onCloseOutputPanelItem: controller.closeOutputPanelItem,
    onOutputSourceChange: controller.setOutputSource,
    activeSessionPrompt: state.runMode === "pi" ? undefined : state.previewPrompt,
    sessionPrompts: state.runMode === "pi" ? undefined : sessionPrompts,
    activeSessionId: state.runMode === "pi" ? state.activePiConversationId : undefined,
    sessionItems: state.runMode === "pi" ? piSessionItems : undefined,
    onSelectSession(id) {
      if (state.runMode === "pi") {
        controller.selectPiConversation(id);
        return;
      }
      if (isWelcome) {
        // From the welcome state, clicking a session switches back to the
        // normal conversation view instead of staying on the empty canvas.
        controller.streamStandardScenario(state.standardScenarioId);
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
      <IconStyleProvider
        value={
          selectedPresetStyle === "workbuddy"
            ? "codicon"
            : selectedPresetStyle === "native"
              ? "bold"
              : "line"
        }
      >
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
        >
          {/* Positioned against this box, not against the shell: it is the
              same box the rail card is positioned against, which is what keeps
              the two cards exactly as tall as each other when the open one is
              pinned top and bottom. */}
          <Topbar
            copy={copy}
            locale={locale}
            surfaceMode={state.surfaceMode}
            onReturnToBuilder={() => dispatch({ type: "patch", patch: { surfaceMode: "builder" } })}
            runMode={state.runMode}
            onRunModeChange={controller.updateRunMode}
            selectedScenarioId={state.selectedScenarioId}
            onScenarioChange={controller.updateScenario}
            showDebugViewToggle={showDebugViewToggle}
            workspaceView={state.workspaceView}
            onWorkspaceViewToggle={() => dispatch({ type: "patch", patch: { workspaceView: state.workspaceView === "preview" ? "debug" : "preview" } })}
            onEnterPreview={() => runOrAsk("preview")}
            selectedComponentSummary={selectedComponentSummary}
            selectedComponentItems={selectedComponentItems}
            canvasZoom={state.canvasZoom}
            onCanvasZoomChange={(zoom) => dispatch({ type: "patch", patch: { canvasZoom: clampZoom(zoom) } })}
            onExport={() => runOrAsk("export")}
            panelOpen={state.layersOpen}
            onTogglePanel={() => dispatch({ type: "patch", patch: { layersOpen: !state.layersOpen } })}
            // Composed here rather than inside the card: the layer list needs the
            // project and half the workspace's selection state, and threading all
            // of it through a view that otherwise only knows about its own
            // controls would make the card the shell.
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
              pendingStyle={style.pendingStyle}
              pendingStyleLabel={style.pendingStyleLabel}
              onPendingStyleChange={style.setPendingStyle}
              onStyleSwitchRequest={style.requestStyleSwitch}
              onStyleSwitchConfirm={style.confirmStyleSwitch}
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
                onFetchModels: (provider_, key) => void provider.fetchProviderModels(provider_, key),
                onSave: controller.saveProviderSettings,
                onSetDefaultProvider: controller.setDefaultProvider,
                onSessionKeyChange: provider.updateSessionKey,
                onTestProvider: (provider_, key) => void provider.testProvider(provider_, key),
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
            data-canvas-inert={state.surfaceMode === "builder" ? "true" : undefined}
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
                    state.sidebarWidth === null
                      ? undefined
                      : ({ "--session-width-set": `${state.sidebarWidth}px` } as CSSProperties)
                  }
                >
                {/* Region labels, one per column, sitting in the gap above the
                    frame. Outside the frame rather than inside it: the frame
                    clips to its rounded corners, so a child at a negative
                    offset was invisible — these were never actually on screen.
                    They mirror the frame's column widths, so an empty column
                    still announces which one it is. */}
                <RegionLabels
                  project={activeProject}
                  locale={locale}
                  selectedLayerId={state.selectedLayerId}
                  rightPanelVisible={rightPanelVisible}
                  selectedComponentItems={selectedComponentItems}
                  pickedOptionIds={state.pickedOptionIds}
                  panelLayout={panelLayout}
                />
                <div
                  ref={previewFrameRef}
                  className="preview-frame"
                  data-has-sidebar={hasSidebar}
                  data-has-right-panel={rightPanelVisible}
                  data-left-collapsed={state.leftCollapsed}
                  data-right-collapsed={state.rightCollapsed}
                  // The chat header gives up its right corner while the fold
                  // control is sitting in it (see the padding rules in app.css).
                  data-right-toggle={showRightColumnToggle ? "true" : undefined}
                  data-style-preset={selectedPresetStyle}
                  data-appearance={themeTokens[activeProject.theme.preset].appearance}
                  data-theme-preset={activeProject.theme.preset}
                  data-preview-refreshing={state.previewRefreshing}
                  // Selection lives on the frame so CSS can reach whichever
                  // column or component it names, without every component
                  // having to accept a "selected" prop.
                  data-selected-layer={state.selectedLayerId ?? undefined}
                  // The row id itself, not the component it resolves to: a row
                  // can name a module inside a component (a search field, a
                  // version footer), which has no slot to look up.
                  data-selected-module={state.selectedSlotId ?? undefined}
                >
                  {leftSidebarMounted ? (
                    sidebarSlots.length > 0 ? sidebarSlots : <div className="session-sidebar region-empty" />
                  ) : null}
                  {/* The sidebar's edge. The centre/right split gets its handle
                      from `PanelGroup`; the sidebar is a fixed-width flex item
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
                          startWidth: sidebar.getBoundingClientRect().width,
                        };
                      }}
                      onPointerMove={(event) => {
                        const drag = sidebarDragRef.current;
                        if (!drag) return;
                        dispatch({
                          type: "patch",
                          patch: {
                            sidebarWidth: clampSidebarWidth(
                              drag.startWidth + (event.clientX - drag.startX),
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
                    <PanelGroup
                      className="preview-panels"
                      orientation="horizontal"
                      // The region labels sit above these columns and have to
                      // follow them; the project's sizes are only where the
                      // split starts.
                      onLayoutChange={(layout) =>
                        setPanelLayout({
                          main: layout.main ?? activeProject.layout.mainSize,
                          right: layout.right ?? activeProject.layout.rightPanelSize,
                        })
                      }
                    >
                      <Panel id="main" className="preview-panel" defaultSize={`${activeProject.layout.mainSize}%`} minSize="52%">
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
                      </Panel>
                      <PanelResizeHandle className="resize-handle" />
                      <Panel id="right" className="preview-panel" defaultSize={`${activeProject.layout.rightPanelSize}%`} minSize="24%">
                        <aside className="right-panel" data-empty={rightPanelSlots.length === 0 ? "true" : undefined}>
                          {rightPanelSlots}
                        </aside>
                      </Panel>
                    </PanelGroup>
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
                {state.surfaceMode === "builder" ? (
                  <ModuleToolbar
                    copy={copy}
                    target={toolbarTarget}
                    surfaceRef={builderSurfaceRef}
                    zoom={state.canvasZoom}
                    pan={canvasPan}
                    canDelete={deletableOptionIds.length > 0}
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
function isSelectionTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(".layers-panel .layers-row") !== null) return true;
  // The toolbar acts on the selection, so clicking it must not clear it.
  if (target.closest(".module-toolbar") !== null) return true;
  if (target.closest(".preview-frame") !== null) return true;
  return false;
}
