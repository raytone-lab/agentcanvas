import { toast } from "sonner";

import { scenarioById, stateDemoEvents, toAgentUXEvents, type ScenarioId } from "../../agentmatrix";
import type { StateCard } from "../../components/agentmatrix/StateGallery";
import { normalizeOutputPanelRequest, type OutputPanelOpenRequest } from "../../components/agent-preview/OutputFrame";
import { previewCopy } from "../../i18n/copy/preview";
import type { PreviewFixtureId } from "../../preview/fixtures";
import type { PreviewAnchor } from "../../preview/presetPreviewTarget";
import { collectPreviewRunEvents, type PreviewScenarioId } from "../../preview-runner/PreviewRunner";
import { initialSavedPreviewRunMode } from "../../preview-runner/runModeState";
import { applyPresetOption, isPresetOptionActive, togglePresetOption } from "../../schema/presetActions";
import { presetGroups } from "../../schema/presets";
import type { PresetGroupId } from "../../schema/presets";
import type { AgentFrontendProject, OutputSource, ProviderCatalogId, ProviderConnectionId } from "../../schema/agentuxConfig";
import { themeTokens } from "../../theme/themeTokens";
import type { AgentUXEvent } from "../../agentux";
import type { MessageActionKey, RunMode, WritingMode } from "../appTypes";
import {
  forceOpenToolDetailPresetIds,
  isMediaGenerationPreset,
  isRequiredPresetOption,
  isThinkingPreviewPreset,
  mediaScenarioForPresetOption,
  presentationOnlyPresetIds,
  rawStateCardToStateCard,
  stateSectionTitle,
  visibleStateCards,
} from "../projection/presetRailData";
import { defaultPreviewPromptForLocale, standardScenarioTitle } from "../projection/previewDefaults";
import { toolActionsOverviewEvents, conversationWritingPreviewEvents } from "../projection/previewEventBuilders";
import {
  scrollPreviewToAnchor,
  scrollPreviewToAnchorAfterPreviewUpdate,
  scrollPreviewToPreset,
  scrollPreviewToSelectorAfterPreviewUpdate,
  scrollPreviewToToolActionAfterPreviewUpdate,
} from "../projection/previewScroll";
import type { ControllerContext } from "./controllerShared";
import { bumpPreviewRefresh, replayWritingSoon } from "./controllerShared";

/**
 * Builder-side preview intents: preset selection, state cards, writing modes,
 * media previews and the small provider/git/export glue. Each function is the
 * verbatim body of its old App() counterpart with setState swapped for
 * dispatch.
 */
export function createPreviewActions(ctx: ControllerContext) {
  const { state, dispatch, refs, locale, copy, project, events, selectedPresetGroup, pendingExternalApprovalTool, isWelcome, updateActiveProject, setProject, previewRunner, activeProject, sessionKeys } = ctx;
  function resetRunState(options: { mode?: RunMode; prompt?: string } = {}) {
    dispatch({ type: "resetRun", mode: options.mode, prompt: options.prompt });
  }

  // "New chat": clear the conversation to an empty timeline so the preview
  // shows the centered welcome greeting above the composer. runEvents is set to
  // an EMPTY array (not undefined) so `events` doesn't fall back to the fixture.
  function enterWelcomeState() {
    refs.standardStreamRef.current?.cancel();
    dispatch({ type: "enterWelcome" });
  }

  /** Back to the conversation from the welcome screen, without starting a run. */
  function leaveWelcomeState() {
    dispatch({ type: "leaveWelcome" });
  }

  // Focusing the greeting field lights up the linked preview: switch the canvas
  // to the welcome state and scroll it to the composer so the edit is visible.
  function previewWelcomeState() {
    enterWelcomeState();
    scrollPreviewToAnchor("composer");
  }

  function selectFixture(fixtureId: PreviewFixtureId) {
    dispatch({ type: "fixtureSelected", fixtureId });
    toast.success(copy.shell.toast.replayFixtureLoaded);
  }

  // Stream a standardized AgentMatrix scenario into the EXISTING preview
  // components: convert to AgentUX events and reveal them over time so the
  // current ChatFrame / ToolCallCard / OutputFrame animate live.
  function streamStandardScenario(id: ScenarioId) {
    refs.standardStreamRef.current?.cancel();
    const scenario = scenarioById(id);
    const uxEvents = toAgentUXEvents(scenario.fixture.events, { title: standardScenarioTitle(scenario, locale) });

    dispatch({ type: "beginStandardStream", scenarioId: id, externalApproval: id === "tool-approval" });

    let index = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const revealed: AgentUXEvent[] = [];

    const tick = () => {
      if (cancelled) return;
      revealed.push(uxEvents[index]);
      index += 1;
      dispatch({ type: "streamEvents", events: [...revealed] });
      if (index >= uxEvents.length) return;
      const next = uxEvents[index];
      const fast = next.type === "text.delta" || next.type === "reasoning.delta" || next.type === "tool.call.args.delta";
      timer = setTimeout(tick, fast ? 110 : 380);
    };

    timer = setTimeout(tick, 60);
    refs.standardStreamRef.current = {
      cancel: () => {
        cancelled = true;
        clearTimeout(timer);
      },
    };
  }

  // Click a state card → render that exact state live in the center preview
  // panel via a real standard component (icon + animation + styling).
  function previewState(card: StateCard) {
    refs.standardStreamRef.current?.cancel();
    dispatch({
      type: "previewStateCard",
      events: stateDemoEvents(card.slot, card.code, card.title) as AgentUXEvent[],
      code: card.code,
      externalApproval: card.slot === "tool.pending_approval" || card.slot.startsWith("permission."),
    });
  }

  /**
   * The option a group's state gallery stands for.
   *
   * The galleries are pickers for their group rather than for one option, so
   * the canvas needs *something* from the group recorded. The first option that
   * is actually built is the honest choice — a placeholder would record a pick
   * for a component that does not exist.
   */
  function canonicalOptionIdForSelectedGroup(): string | undefined {
    const group = presetGroups.find((entry) => entry.id === state.selectedGroup);
    return group?.options.find((option) => !option.pending)?.id;
  }

  function previewToolActionsOverview(options: { forceOpen?: boolean } = {}) {
    const cards = visibleStateCards("tool-calls").map((card) => rawStateCardToStateCard(card, locale));
    refs.standardStreamRef.current?.cancel();
    dispatch({
      type: "showToolActionsOverview",
      events: toolActionsOverviewEvents(cards, stateSectionTitle("tool-calls", locale), locale),
      forceOpen: options.forceOpen ?? false,
    });
    bumpPreviewRefresh(refs, dispatch);
    if (!options.forceOpen) {
      scrollPreviewToAnchor("tool-call");
    }
  }

  /**
   * The tool-action gallery selects through here, not through `selectPreset`,
   * so a click in it never reached `optionPicked` and the canvas showed nothing
   * for 工具调用. Recorded against the group's display option, which is what
   * the gallery is a picker for. Group expansion calls
   * `previewToolActionsOverview` directly and is deliberately left out —
   * opening a group is not picking something from it.
   */
  function previewToolActionsOverviewFromCard(card?: StateCard) {
    dispatch({ type: "optionPicked", optionId: "command-cards" });
    // The gallery calls this for both the card body and its icon tiles. Only
    // the tile click is a choice of icon, but both arrive with the card, and
    // recording the slot is what lets the tile's ring mean "you chose this"
    // rather than "this is the default".
    if (card) dispatch({ type: "iconSlotPicked", slot: card.slot });
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
    return key ? Boolean(project.conversation[key]) : state.activeStateCode === card.code;
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
    bumpPreviewRefresh(refs, dispatch);
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
    dispatch({ type: "replayWritingOutput" });
    scrollPreviewToAnchor("chat");
  }


  function replayConversationPreview(anchor: PreviewAnchor = "chat") {
    refs.standardStreamRef.current?.cancel();
    dispatch({ type: "replayConversationFixture" });
    bumpPreviewRefresh(refs, dispatch);
    scrollPreviewToAnchor(anchor);
  }

  function replayStandardScenarioPreview(id: ScenarioId, anchor: PreviewAnchor = "chat") {
    refs.standardStreamRef.current?.cancel();
    const scenario = scenarioById(id);
    dispatch({
      type: "replayStandardScenario",
      scenarioId: id,
      events: toAgentUXEvents(scenario.fixture.events, { title: standardScenarioTitle(scenario, locale) }) as AgentUXEvent[],
    });
    bumpPreviewRefresh(refs, dispatch);
    scrollPreviewToAnchor(anchor);
  }

  function previewConversationWritingMode(writing: WritingMode) {
    refs.standardStreamRef.current?.cancel();
    setWritingMode(writing);
    dispatch({ type: "conversationWritingPreview", events: conversationWritingPreviewEvents(locale) });
    bumpPreviewRefresh(refs, dispatch);
    scrollPreviewToAnchor("chat");
  }

  function replayFixturePreview(optionId: string) {
    refs.standardStreamRef.current?.cancel();
    dispatch({ type: "presetFixtureSelected", optionId });
    bumpPreviewRefresh(refs, dispatch);
  }

  async function previewMediaGenerationOption(optionId: string, nextProject: AgentFrontendProject) {
    const scenarioId = mediaScenarioForPresetOption(optionId);
    if (!scenarioId) {
      return;
    }
    refs.standardStreamRef.current?.cancel();
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
    dispatch({ type: "mediaPreviewStarted", events: nextEvents, scenarioId, prompt });
    bumpPreviewRefresh(refs, dispatch);
    scrollPreviewToAnchorAfterPreviewUpdate("chat");
  }

  function setOutputSource(source: OutputSource) {
    dispatch({ type: "patch", patch: { outputModalOpen: false, rightCollapsed: false } });
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
    bumpPreviewRefresh(refs, dispatch);
    scrollPreviewToAnchor("output");
  }

  // Card-body click: toggle the avatar on/off (both off → no avatars in chat).
  // Avatars update the *existing* canvas content live via their flag, so we
  // don't restream a demo (which would wipe what's listed) — we just scroll the
  // conversation (the "我" bubble / avatars) into view so the change is visible.
  function toggleStateCard(card: StateCard) {
    const key = avatarFlagKey(card);
    if (!key) {
      // Not an avatar, so it is a state gallery standing in for its group's
      // options — 结果报错 renders twenty cards and no option cell at all.
      // Clicking one has to register as picking from that group, or the canvas
      // shows nothing for it.
      const groupOptionId = canonicalOptionIdForSelectedGroup();
      if (groupOptionId) dispatch({ type: "optionPicked", optionId: groupOptionId });
      previewState(card);
      return;
    }
    setAvatarEnabled(key, !project.conversation[key]);
    revealConversationPreview();
  }

  // Icon-tile click: choose that icon and enable the avatar so the pick shows.
  function pickStateCardIcon(card: StateCard) {
    // Records that this slot's icon was chosen, so the gallery can tell a
    // choice apart from the default it always had.
    dispatch({ type: "iconSlotPicked", slot: card.slot });
    const key = avatarFlagKey(card);
    if (!key) {
      // Same as the card itself: outside the avatar galleries these tiles are
      // the group's only picker, so the click has to register as a pick.
      const groupOptionId = canonicalOptionIdForSelectedGroup();
      if (groupOptionId) dispatch({ type: "optionPicked", optionId: groupOptionId });
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
    bumpPreviewRefresh(refs, dispatch);
    revealConversationPreview(messageActionPreviewAnchor(key));
  }

  function replayCurrentPreview() {
    dispatch({ type: "replayCurrent", fallback: events });
  }

  function selectPreset(optionId: string) {
    // Recorded here, before the branches below choose a preview path. Some
    // options never reach `presetFixtureSelected` — a thinking effect runs a
    // scenario stream instead — and the canvas needs to know they were picked
    // whichever route they take, because their groups have no "off" value to
    // read back from the project.
    dispatch({ type: "optionPicked", optionId });
    const wasActive = isPresetOptionActive(project, optionId);
    if (optionId === "speaker-labels") {
      toggleSpeakerLabels();
      return;
    }
    const keepSelected = wasActive && isRequiredPresetOption(optionId);
    if (Object.prototype.hasOwnProperty.call(themeTokens, optionId)) {
      dispatch({ type: "patch", patch: { surfaceMode: "builder", workspaceView: "preview" } });
      setProject((current) => applyPresetOption(current, optionId));
      bumpPreviewRefresh(refs, dispatch);
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
      /*
       * On the canvas the three media blocks are always there (see
       * `canvasTimelineEvents`), and the loader restarts whenever its variant
       * changes. So a pick is a restyle and a scroll to the block, not a new
       * scripted run: the scenario path below swapped in a whole
       * media-generation reply and refreshed the surface, which replayed the
       * canvas from the top and left the reader waiting through ten seconds of
       * someone else's conversation before the loader they picked came round.
       * A live or Pi session still gets the scenario, because there the canvas
       * is showing the run's own events, which have no media in them.
       */
      if (state.runEventSource !== "live" && state.runEventSource !== "pi") {
        dispatch({ type: "patch", patch: { surfaceMode: "builder", workspaceView: "preview" } });
        scrollPreviewToSelectorAfterPreviewUpdate(
          optionId.startsWith("media-image-") ? ".generated-image-inline"
            : optionId.startsWith("media-audio-") ? ".generated-audio-inline"
              : ".generated-video-inline",
        );
        return;
      }
      void previewMediaGenerationOption(optionId, nextProject);
      return;
    }
    if (selectedPresetGroup.id === "output") {
      // Output layout / data-source options only reconfigure the output panel;
      // they must NOT switch or replay the canvas conversation. Keep the current
      // content and just refresh the output surface against it.
      dispatch({ type: "patch", patch: { surfaceMode: "builder", workspaceView: "preview" } });
      setProject((current) => (keepSelected ? applyPresetOption(current, optionId) : togglePresetOption(current, optionId)));
      if (optionId === "output-visible" || optionId === "surface-right-panel") {
        dispatch({ type: "patch", patch: { rightCollapsed: false } });
      }
      bumpPreviewRefresh(refs, dispatch);
      scrollPreviewToAnchorAfterPreviewUpdate("output");
      return;
    }
    if (selectedPresetGroup.id === "sidebar") {
      refs.standardStreamRef.current?.cancel();
      dispatch({ type: "patch", patch: { activeStateCode: null, surfaceMode: "builder", workspaceView: "preview" } });
      setProject((current) => (keepSelected ? applyPresetOption(current, optionId) : togglePresetOption(current, optionId)));
      if (optionId === "sidebar-visible") {
        dispatch({ type: "patch", patch: { leftCollapsed: false } });
      }
      bumpPreviewRefresh(refs, dispatch);
      scrollPreviewToAnchorAfterPreviewUpdate("sidebar");
      return;
    }

    if (selectedPresetGroup.id === "composer") {
      refs.standardStreamRef.current?.cancel();
      dispatch({ type: "patch", patch: { surfaceMode: "builder", workspaceView: "preview" } });
      setProject((current) => (keepSelected ? applyPresetOption(current, optionId) : togglePresetOption(current, optionId)));
      const opensExternalApproval = optionId === "tool-approval-hidden";
      const opensInlineApproval = optionId === "tool-approval-inline";
      dispatch({
        type: "patch",
        patch: {
          forcePreviewToolsOpen: false,
          externalApprovalOverlayActive: opensExternalApproval,
          inlineApprovalOverlayActive: opensInlineApproval,
          dismissedApprovalId: opensExternalApproval || opensInlineApproval ? null : pendingExternalApprovalTool?.id ?? null,
        },
      });
      bumpPreviewRefresh(refs, dispatch);
      return;
    }

    if (
      selectedPresetGroup.id === "tool-calls" &&
      state.activeStateCode === "status: cancelled" &&
      (optionId === "command-cards" || optionId === "compact-chips")
    ) {
      refs.standardStreamRef.current?.cancel();
      setProject((current) => (keepSelected ? applyPresetOption(current, optionId) : togglePresetOption(current, optionId)));
      if (optionId === "command-cards") {
        dispatch({ type: "bump", key: "toolCollapseSignal" });
      }
      dispatch({
        type: "patch",
        patch: {
          showStandard: true,
          surfaceMode: "builder",
          workspaceView: "preview",
          runEventSource: "replay",
          liveMessages: [],
          externalApprovalOverlayActive: false,
          inlineApprovalOverlayActive: false,
          dismissedApprovalId: null,
          gitPreviewStateOverride: undefined,
          forcePreviewToolsOpen: false,
          runEvents: stateDemoEvents("tool.cancelled", "status: cancelled", previewCopy[locale].cancelledLabel) as AgentUXEvent[],
        },
      });
      bumpPreviewRefresh(refs, dispatch);
      scrollPreviewToAnchorAfterPreviewUpdate("tool-call");
      return;
    }

    /*
     * A renderer restyles the *document*, so the panel has to be showing it.
     * The panel opens on the last thing the run delivered, which is a media
     * file since the canvas carries the audio and video loaders — so the four
     * renderer cards changed a tab nobody could see and looked like they did
     * nothing. Point the panel back at the first document before applying.
     */
    if (optionId.startsWith("renderer-")) {
      const documentItem = state.outputPanelItems.find(
        (item) => !item.imageSrc && !(item.body ?? "").includes("media-generation:"),
      );
      if (documentItem) {
        dispatch({ type: "patch", patch: { activeOutputPanelItemId: documentItem.id, rightCollapsed: false } });
      }
    }

    // Selecting a preset option always demos its effect live in the preview.
    refs.standardStreamRef.current?.cancel();
    dispatch({ type: "patch", patch: { activeStateCode: null, surfaceMode: "builder", workspaceView: "preview" } });
    setProject((current) => (keepSelected ? applyPresetOption(current, optionId) : togglePresetOption(current, optionId)));
    dispatch({ type: "patch", patch: { forcePreviewToolsOpen: forceOpenToolDetailPresetIds.has(optionId) } });
    if (optionId === "command-cards") {
      dispatch({ type: "bump", key: "toolCollapseSignal" });
    }
    const opensExternalApproval = optionId === "tool-approval-hidden";
    const opensInlineApproval = optionId === "tool-approval-inline";
    dispatch({
      type: "patch",
      patch: {
        externalApprovalOverlayActive: opensExternalApproval,
        inlineApprovalOverlayActive: false,
        dismissedApprovalId: opensExternalApproval ? null : pendingExternalApprovalTool?.id ?? null,
      },
    });

    if (opensInlineApproval) {
      dispatch({ type: "patch", patch: { externalApprovalOverlayActive: false, inlineApprovalOverlayActive: true, dismissedApprovalId: null } });
      bumpPreviewRefresh(refs, dispatch);
      scrollPreviewToAnchorAfterPreviewUpdate("external-approval");
      return;
    }

    if (optionId === "tool-approval-hidden") {
      dispatch({ type: "patch", patch: { externalApprovalOverlayActive: true, inlineApprovalOverlayActive: false, dismissedApprovalId: null } });
      bumpPreviewRefresh(refs, dispatch);
      scrollPreviewToAnchorAfterPreviewUpdate("external-approval");
      return;
    }

    if (selectedPresetGroup.id === "tool-calls") {
      previewToolActionsOverview({ forceOpen: forceOpenToolDetailPresetIds.has(optionId) });
      if (forceOpenToolDetailPresetIds.has(optionId)) {
        scrollPreviewToToolActionAfterPreviewUpdate("validate");
      }
    } else if (selectedPresetGroup.id === "ux-effects" || isThinkingPreviewPreset(optionId)) {
      /*
       * Every card in 思考中 plays its block again.
       *
       * What this group configures only exists while it runs — the stage text,
       * the indicator, the way the text arrives — so a card that quietly
       * changed a settled frame said nothing. One path for all of them: put the
       * canvas back on the composed timeline, bump the replay counter (which
       * re-mounts the block, see the `key` in ChatFrame), pulse the surface,
       * and scroll to it.
       *
       * This replaces a scripted 普通回合 fixture that was dispatched here. The
       * canvas composes its own conversation now, so those events were never
       * rendered — all the dispatch still did was rename the conversation in
       * the chat header to the fixture's title.
       */
      dispatch({ type: "patch", patch: { showStandard: false } });
      resetRunState();
      dispatch({ type: "bump", key: "writingReplayKey" });
      bumpPreviewRefresh(refs, dispatch);
      scrollPreviewToAnchorAfterPreviewUpdate("reasoning");
      return;
    } else if (presentationOnlyPresetIds.has(optionId)) {
      replayFixturePreview(optionId);
    } else if (keepSelected) {
      replayCurrentPreview();
      bumpPreviewRefresh(refs, dispatch);
    } else {
      dispatch({ type: "patch", patch: { showStandard: false } });
      resetRunState();
      dispatch({ type: "presetFixtureSelected", optionId });
      bumpPreviewRefresh(refs, dispatch);
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
    replayWritingSoon(refs, dispatch);
  }

  function selectPresetGroup(groupId: PresetGroupId) {
    dispatch({ type: "presetGroupSelected", groupId });
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
    if (groupId === state.selectedGroup && state.presetDrawerOpen) {
      dispatch({ type: "patch", patch: { presetDrawerOpen: false } });
      return;
    }
    dispatch({ type: "patch", patch: { presetDrawerOpen: true } });
    selectPresetGroup(groupId);
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
    dispatch({ type: "patch", patch: { workspaceView: "preview" } });
    setProject((current) => applyPresetOption(current, `provider-${id}`));
    scrollPreviewToPreset(`provider-${id}`);
  }

  function toggleProviderSettingsLauncher() {
    selectPreset("provider-settings-launcher");
  }

  function saveProviderSettings() {
    if (state.surfaceMode === "saved-preview") {
      dispatch({
        type: "patch",
        patch: {
          runMode: initialSavedPreviewRunMode({ project: activeProject, sessionKeys }),
          livePreviewState: "idle",
        },
      });
    }
    toast.success(copy.shell.toast.providerSettingsSaved);
  }

  return {
    resetRunState,
    enterWelcomeState,
    leaveWelcomeState,
    previewWelcomeState,
    selectFixture,
    streamStandardScenario,
    previewState,
    previewToolActionsOverview,
    previewToolActionsOverviewFromCard,
    isStateCardSelected,
    toggleStateCard,
    pickStateCardIcon,
    disableStateCard,
    revealConversationPreview,
    toggleSpeakerLabels,
    replayWritingOutput,
    replayConversationPreview,
    replayStandardScenarioPreview,
    replayFixturePreview,
    setOutputSource,
    messageActionActive,
    setMessageAction,
    replayCurrentPreview,
    selectPreset,
    updateWritingParam,
    selectPresetGroup,
    handlePresetGroupClick,
    setDefaultProvider,
    updateModel,
    toggleProvider,
    toggleProviderSettingsLauncher,
    saveProviderSettings,
  };
}
