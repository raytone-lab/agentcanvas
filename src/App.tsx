import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { PanelLeft, PanelRight } from "lucide-react";
import { Toaster } from "sonner";

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
import { Topbar } from "./app/view/Topbar";
import { ModuleToolbar } from "./app/view/ModuleToolbar";
import { clampZoom, zoomIn, zoomOut } from "./app/view/ZoomControl";
import {
  collectDefaultOutputPanelItems,
  outputPanelItemsSignature,
} from "./app/projection/outputPanelProjection";
import {
  NATIVE_HIDDEN_USER_AVATAR_IDS,
  PREVIEW_RESPONSIVE_WIDTHS,
  LAYER_HIGHLIGHT_SELECTORS,
  LAYER_PRESENCE_OPTIONS,
  STYLE_AVATAR_DEFAULTS,
  groupPresetOptions,
  rawStateCardToStateCard,
  optionIdForModule,
  railLocationForOption,
  regionsWithChosenContent,
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
  const rawEvents = state.runEvents ?? fixtureEvents;
  const activeProject = state.surfaceMode === "saved-preview" && state.savedProject ? state.savedProject : project;
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
  const isWelcome = !state.showStandard && displayViewModel.timeline.length === 0;
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
  const regionHasContent = (region: AgentCanvasRegion) =>
    activeProject.layout.regions.includes(region) &&
    activeProject.layout.slots.some((slot) => slot.enabled && slot.region === region);
  const hasSidebar = regionHasContent("sidebar");
  const hasRightPanel = regionHasContent("right-panel");
  const loaderCanvasPreviewActive = state.surfaceMode === "builder" && state.selectedGroup === "media-generation";
  // Mounted whenever the layout has one; `leftCollapsed` is a visual state the CSS drawer
  // owns, so gating the mount on it would remove the element the transition animates.
  const leftSidebarMounted = hasSidebar && !state.autoHiddenRails.left;
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
  // before the first turn too. Auto-hide (narrow window) and the loader canvas
  // still take precedence — those are about whether it fits, not whether it is
  // configured.
  const rightPanelAvailable =
    hasRightPanel && !state.autoHiddenRails.right && !loaderCanvasPreviewActive;
  const rightPanelVisible = rightPanelAvailable && !state.rightCollapsed;
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
      // Column resizing stays live. It edits the layout, which is the kind of
      // thing this surface is for, rather than driving the mock agent.
      if (event.target instanceof Element && event.target.closest(".resize-handle")) return;
      event.stopPropagation();
      // Not on pointerdown: preventing its default would also cancel the
      // synthetic click, and the click is what carries the selection.
      if (event.type !== "pointerdown" && event.type !== "click") event.preventDefault();
    };

    const select = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(".resize-handle")) return;
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
      // zoom menu's own percentage field relies on it.
      if ((event.metaKey || event.ctrlKey) && event.key === "0") {
        event.preventDefault();
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
  const toolbarOptionIds = state.selectedSlotId
    ? [optionIdForModule(state.selectedSlotId)].filter((id): id is string => id !== null)
    : state.selectedLayerId
      ? [...(LAYER_PRESENCE_OPTIONS[state.selectedLayerId] ?? [])]
      : [];
  const deletableOptionIds = toolbarOptionIds.filter((id) => isPresetOptionActive(activeProject, id));

  const editSelectedModule = () => {
    const location = railLocationForOption(toolbarOptionIds[0] ?? "");
    if (!location) return;
    dispatch({
      type: "patch",
      patch: {
        navSection: location.navSection,
        selectedGroup: location.groupId,
        // The rail scrolls this option into view and flashes it, so "edit"
        // lands on the control rather than just the right panel.
        pinnedOptionId: toolbarOptionIds[0] ?? null,
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
    previewPrompt: state.showStandard || state.runMode === "pi" ? "" : state.previewPrompt,
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
  const filledRegions = regionsWithChosenContent(activeProject, selectedComponentItems);
  const renderRegion = (region: AgentCanvasRegion) =>
    filledRegions.has(region) ? renderSlots(visibleLayoutSlots, region, slotContext) : [];
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
        <Topbar
          copy={copy}
          locale={locale}
          setLocale={setLocale}
          surfaceMode={state.surfaceMode}
          onReturnToBuilder={() => dispatch({ type: "patch", patch: { surfaceMode: "builder" } })}
          runMode={state.runMode}
          onRunModeChange={controller.updateRunMode}
          selectedScenarioId={state.selectedScenarioId}
          onScenarioChange={controller.updateScenario}
          showDebugViewToggle={showDebugViewToggle}
          workspaceView={state.workspaceView}
          onWorkspaceViewToggle={() => dispatch({ type: "patch", patch: { workspaceView: state.workspaceView === "preview" ? "debug" : "preview" } })}
          onEnterPreview={controller.saveScaffoldPreview}
          selectedComponentSummary={selectedComponentSummary}
          selectedComponentItems={selectedComponentItems}
          canvasZoom={state.canvasZoom}
          onCanvasZoomChange={(zoom) => dispatch({ type: "patch", patch: { canvasZoom: clampZoom(zoom) } })}
          onExport={() => void controller.generateExport()}
        />

        <div className="workspace-layout" data-mode={state.surfaceMode} data-drawer-open={state.surfaceMode === "builder" ? state.presetDrawerOpen : undefined}>
          {state.surfaceMode === "builder" ? (
            <PresetRail
              copy={copy}
              locale={locale}
              project={project}
              navSection={state.navSection}
              onNavSectionChange={handleNavSectionChange}
              selectedLayerId={state.selectedLayerId}
              onSelectLayer={(layerId) => dispatch({ type: "patch", patch: { selectedLayerId: layerId, selectedSlotId: null } })}
              selectedSlotId={state.selectedSlotId}
              onSelectSlot={(slotId) => dispatch({ type: "patch", patch: { selectedSlotId: slotId, selectedLayerId: null } })}
              onRenameProject={(name) => setProject((current) => ({ ...current, name }))}
              selectedComponentItems={selectedComponentItems}
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
          ) : null}

          <main
            ref={builderSurfaceRef}
            className="builder-surface"
            data-output-zone="generated-scaffold"
            // Zoom is a CSS variable rather than a prop threaded into every
            // component: nothing inside the canvas needs to know it is being
            // magnified, and nothing re-renders when it changes.
            style={{ "--canvas-zoom": state.canvasZoom / 100 } as CSSProperties}
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
                <div className="canvas-zoom">
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
                />
                <div
                  ref={previewFrameRef}
                  className="preview-frame"
                  data-has-sidebar={hasSidebar}
                  data-has-right-panel={rightPanelVisible}
                  data-left-collapsed={state.leftCollapsed}
                  data-right-collapsed={state.rightCollapsed}
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
                  {rightPanelVisible ? (
                    <PanelGroup className="preview-panels" orientation="horizontal">
                      <Panel className="preview-panel" defaultSize={`${activeProject.layout.mainSize}%`} minSize="52%">
                        <section className="preview-stack" data-welcome={isWelcome ? "true" : undefined}>
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
                      <Panel className="preview-panel" defaultSize={`${activeProject.layout.rightPanelSize}%`} minSize="24%">
                        <aside className="right-panel" data-empty={rightPanelSlots.length === 0 ? "true" : undefined}>
                          {rightPanelSlots}
                        </aside>
                      </Panel>
                    </PanelGroup>
                  ) : (
                    <section className="preview-stack preview-stack-solo" data-welcome={isWelcome ? "true" : undefined}>
                      {renderRegion("main")}
                      {inlineRuntimeApprovalOverlay}
                      {externalApprovalOverlay}
                      {inlineApprovalDemoOverlay}
                      {renderRegion("composer")}
                    </section>
                  )}
                  {hasSidebar && state.leftCollapsed && !state.autoHiddenRails.left ? (
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
                  {hasRightPanel && state.rightCollapsed && !state.autoHiddenRails.right && !isWelcome ? (
                    <button
                      type="button"
                      className="rail-icon-btn preview-rail-float"
                      data-side="right"
                      aria-label={copy.shell.editor.expandPanel}
                      onClick={() => dispatch({ type: "patch", patch: { rightCollapsed: false } })}
                    >
                      <span className="native-rail-icon"><RightSidebarRailIcon size={15} /></span>
                      <span className="legacy-rail-icon"><PanelRight size={15} /></span>
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
      </IconStyleProvider>
    </>
  );
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
