import { useEffect, useMemo, useRef, useState } from "react";
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
  modelOptionsForProject,
  type AgentFrontendProject,
} from "./schema/agentuxConfig";
import { isPresetOptionActive } from "./schema/presetActions";
import {
  presetGroupsForProject,
  projectPresetSummary,
  resolvePresetGroupSelection,
} from "./schema/presets";
import { piConversationSidebarItems } from "./pi/piConversationState";

import { InlineApprovalDemo, demoApprovalTool, findPendingApprovalTool } from "./app/view/InlineApprovalDemo";
import { PresetRail } from "./app/view/PresetRail";
import { Topbar } from "./app/view/Topbar";
import {
  collectDefaultOutputPanelItems,
  outputPanelItemsSignature,
} from "./app/projection/outputPanelProjection";
import {
  NATIVE_HIDDEN_USER_AVATAR_IDS,
  PREVIEW_RESPONSIVE_WIDTHS,
  STYLE_AVATAR_DEFAULTS,
  groupPresetOptions,
  rawStateCardToStateCard,
  visibleStateCards,
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
  const [project, setProject] = useState<AgentFrontendProject>(defaultCodingAgentProject);
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
  const rightPanelAvailable =
    hasRightPanel && !state.autoHiddenRails.right && !isWelcome && !loaderCanvasPreviewActive;
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
    dispatch({ type: "outputPanelAutoFilled", items: defaultOutputPanelItems });
    setProject((current) => ({
      ...current,
      // `output.source` is left alone. This effect re-runs as events arrive, so forcing
      // "artifact" here silently undid a click on the console tab a moment after it happened —
      // which is why the console looked unclickable rather than broken.
      layout: {
        ...current.layout,
        slots: current.layout.slots.map((slot) =>
          slot.component === "OutputFrame" ? { ...slot, enabled: true, region: "right-panel" } : slot,
        ),
      },
    }));
  }, [defaultOutputPanelItems, defaultOutputPanelSignature, loaderCanvasPreviewActive, dispatch, refs, setProject]);
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
  const previewOverlaySlots = renderSlots(
    visibleLayoutSlots.filter((slot) => slot.component === "OutputFrame"),
    "overlay",
    { ...slotContext, onCollapseRight: undefined },
  );

  return (
    <>
      <Toaster richColors position="bottom-left" />
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} onSelectFixture={controller.selectFixture} />
      <IconStyleProvider value={selectedPresetStyle === "native" ? "bold" : "line"}>
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
          onSavePreview={controller.saveScaffoldPreview}
          selectedComponentSummary={selectedComponentSummary}
          selectedComponentItems={selectedComponentItems}
          onExport={() => void controller.generateExport()}
        />

        <div className="workspace-layout" data-mode={state.surfaceMode} data-drawer-open={state.surfaceMode === "builder" ? state.presetDrawerOpen : undefined}>
          {state.surfaceMode === "builder" ? (
            <PresetRail
              copy={copy}
              locale={locale}
              project={project}
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

          <main ref={builderSurfaceRef} className="builder-surface" data-output-zone="generated-scaffold">
            {state.workspaceView === "preview" || state.surfaceMode === "saved-preview" ? (
              <>
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
                >
                  {leftSidebarMounted ? renderSlots(visibleLayoutSlots, "sidebar", slotContext) : null}
                  {rightPanelVisible ? (
                    <PanelGroup className="preview-panels" orientation="horizontal">
                      <Panel className="preview-panel" defaultSize={`${activeProject.layout.mainSize}%`} minSize="52%">
                        <section className="preview-stack" data-welcome={isWelcome ? "true" : undefined}>
                          {renderSlots(visibleLayoutSlots, "main", slotContext)}
                          {/* Approvals before the composer: the question is answered above the field it
                              would otherwise cover, and every approval surface shares one placement. */}
                          {inlineRuntimeApprovalOverlay}
                          {externalApprovalOverlay}
                          {inlineApprovalDemoOverlay}
                          {renderSlots(visibleLayoutSlots, "composer", slotContext)}
                        </section>
                      </Panel>
                      <PanelResizeHandle className="resize-handle" />
                      <Panel className="preview-panel" defaultSize={`${activeProject.layout.rightPanelSize}%`} minSize="24%">
                        <aside className="right-panel">
                          {renderSlots(visibleLayoutSlots, "right-panel", slotContext)}
                        </aside>
                      </Panel>
                    </PanelGroup>
                  ) : (
                    <section className="preview-stack preview-stack-solo" data-welcome={isWelcome ? "true" : undefined}>
                      {renderSlots(visibleLayoutSlots, "main", slotContext)}
                      {inlineRuntimeApprovalOverlay}
                      {externalApprovalOverlay}
                      {inlineApprovalDemoOverlay}
                      {renderSlots(visibleLayoutSlots, "composer", slotContext)}
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
