import type { ComposerSubmitContext } from "../../components/agent-preview/ComposerFrame";
import { createScaffoldExportSnapshot } from "../../export/scaffoldManifest";
import { toast } from "sonner";

import { createEphemeralPiConversation, titlePiConversation, appendPiConversationEvents, type EphemeralPiConversation } from "../../pi/piConversationState";
import {
  abortPiRun,
  configurePiRuntime,
  getPiRuntimeState,
  resolvePiApproval,
  runPiTurn,
  startNewPiSession,
  type PiRuntimeState,
} from "../../pi/piClient";
import { piErrorTurnEvents } from "../../pi/piErrorTurn";
import { piCancelledTurnEvents } from "../../pi/piCancelledTurn";
import { createPiFrameCommit } from "../../pi/piFrameCommit";
import { piRuntimeConfigurationForProvider } from "../../pi/piProviderSync";
import {
  collectPreviewRunEvents,
  resolveDefaultPreviewScenario,
  type PreviewInputAttachment,
  type PreviewScenarioId,
} from "../../preview-runner/PreviewRunner";
import { runLiveLlmPreview, LIVE_TOOL_SIMULATION_DELAY_MS } from "../../preview-runner/LiveLlmPreviewRunner";
import { initialSavedPreviewRunMode } from "../../preview-runner/runModeState";
import { defaultProviderConnection, type AgentFrontendProject, type ProviderConnection, type ProviderConnectionId } from "../../schema/agentuxConfig";
import { themeTokens } from "../../theme/themeTokens";
import type { AgentUXEvent } from "../../agentux";
import type { RunMode } from "../appTypes";
import { defaultPreviewPromptForLocale, formatCopy, livePreviewFallbackPrompt, piConfigurationFailureCopy } from "../projection/previewDefaults";
import { initialPreviewRevealCount, previewReplayDelay } from "../projection/previewReplayPacing";
import type { ControllerContext } from "./controllerShared";
import { bumpPreviewRefresh } from "./controllerShared";

/**
 * Run orchestration actions: saved-preview entry, the replay/live/pi run
 * strategies, and Pi conversation lifecycle. Each function is the verbatim
 * body of its old App() counterpart with setState swapped for dispatch.
 */
export function createRunActions(
  ctx: ControllerContext,
  base: { setDefaultProvider: (id: ProviderConnectionId) => void; updateModel: (model: string) => void },
) {
  const { state, dispatch, refs, locale, copy, project, activeProject, setProject, sessionKeys, previewRunner, activePiConversation } = ctx;
  const { setDefaultProvider, updateModel } = base;
  async function saveScaffoldPreview() {
    refs.standardStreamRef.current?.cancel();
    const saved = JSON.parse(JSON.stringify(project)) as AgentFrontendProject;
    const snapshot = createScaffoldExportSnapshot(saved);
    const defaultScenarioId = resolveDefaultPreviewScenario(saved);
    const initialRunMode = initialSavedPreviewRunMode({ project: saved, sessionKeys });
    dispatch({
      type: "savedPreviewEntered",
      saved,
      snapshot,
      scenarioId: defaultScenarioId,
      runMode: initialRunMode,
      live: initialRunMode === "live",
    });

    if (initialRunMode === "live") {
      bumpPreviewRefresh(refs, dispatch);
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
    prompt = state.previewPrompt,
    context?: ComposerSubmitContext,
  ) {
    if (!state.savedProject) {
      toast.info(copy.shell.toast.saveBeforeLocalPreview);
      return;
    }
    refs.standardStreamRef.current?.cancel();
    dispatch({ type: "patch", patch: { showStandard: false } });

    if (state.runMode === "live") {
      await runLivePreview(prompt);
      return;
    }

    if (state.runMode === "pi") {
      await runPiPreview(prompt, context);
      return;
    }

    const normalizedPrompt = prompt.trim() || defaultPreviewPromptForLocale(locale);
    await runSavedReplayPreview({
      project: state.savedProject,
      prompt: normalizedPrompt,
      attachments: context?.attachments,
      scenarioId: state.selectedScenarioId,
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
    refs.standardStreamRef.current?.cancel();
    const normalizedPrompt = prompt.trim() || defaultPreviewPromptForLocale(locale);
    const nextEvents = await collectPreviewRunEvents(previewRunner.run({
      prompt: normalizedPrompt,
      attachments,
      project: saved,
      scenarioId,
      locale,
    }));
    dispatch({ type: "recordPrompt", prompt: normalizedPrompt });
    dispatch({ type: "savedReplayStarted", prompt: normalizedPrompt, externalApproval: scenarioId === "tool-approval" });
    streamSavedReplayEvents(nextEvents, successMessage);
  }

  function streamSavedReplayEvents(nextEvents: AgentUXEvent[], successMessage: string) {
    refs.standardStreamRef.current?.cancel();
    if (nextEvents.length === 0) {
      dispatch({ type: "streamEvents", events: [] });
      toast.success(successMessage);
      return;
    }

    let index = initialPreviewRevealCount(nextEvents);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const revealed = nextEvents.slice(0, index);
    dispatch({ type: "streamEvents", events: [...revealed] });

    const tick = () => {
      if (cancelled) return;
      revealed.push(nextEvents[index]);
      index += 1;
      dispatch({ type: "streamEvents", events: [...revealed] });
      if (index >= nextEvents.length) {
        refs.standardStreamRef.current = undefined;
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
    refs.standardStreamRef.current = {
      cancel: () => {
        cancelled = true;
        if (timer) {
          clearTimeout(timer);
        }
      },
    };
  }

  async function runLivePreview(prompt = state.previewPrompt) {
    if (!state.savedProject) {
      toast.info(copy.shell.toast.saveBeforeLiveLlm);
      return;
    }
    if (state.liveRunning) {
      stopLivePreview();
      return;
    }

    const normalizedPrompt = prompt.trim() || livePreviewFallbackPrompt[locale];
    const history = state.liveMessages;
    const controller = new AbortController();
    refs.liveAbortControllerRef.current = controller;
    dispatch({ type: "recordPrompt", prompt: normalizedPrompt });
    dispatch({ type: "liveTurnStarted", prompt: normalizedPrompt, messages: [...history, { role: "user", content: normalizedPrompt }] });

    try {
      const result = await runLiveLlmPreview({
        prompt: normalizedPrompt,
        project: state.savedProject,
        sessionKeys,
        history,
        fetchMode: "agentcanvas-dev-proxy",
        signal: controller.signal,
        toolSimulationDelayMs: LIVE_TOOL_SIMULATION_DELAY_MS,
        onEvents(nextEvents) {
          if (controller.signal.aborted || refs.liveAbortControllerRef.current !== controller) {
            return;
          }
          // Coalesced to one commit per frame.
          //
          // The runner calls this per event, and a streaming reply is one event per token. Each
          // commit re-derives the view model from the whole event list, re-localizes the whole
          // timeline and re-collects the output panel, so the cost per token grew with the
          // transcript — the reply visibly slowed down as it got longer.
          //
          // A frame is the useful ceiling: nothing painted between two frames was ever seen.
          // The latest array wins, so no event is dropped, only intermediate renders are.
          refs.pendingLiveEventsRef.current = nextEvents;
          if (refs.liveFlushHandleRef.current !== undefined) {
            return;
          }
          refs.liveFlushHandleRef.current = requestAnimationFrame(() => {
            refs.liveFlushHandleRef.current = undefined;
            const pending = refs.pendingLiveEventsRef.current;
            refs.pendingLiveEventsRef.current = undefined;
            if (!pending || controller.signal.aborted || refs.liveAbortControllerRef.current !== controller) {
              return;
            }
            dispatch({ type: "patch", patch: { runEvents: [...pending], runEventSource: "live" } });
          });
        },
      });
      if (controller.signal.aborted || refs.liveAbortControllerRef.current !== controller) {
        return;
      }
      if (refs.liveFlushHandleRef.current !== undefined) {
        cancelAnimationFrame(refs.liveFlushHandleRef.current);
        refs.liveFlushHandleRef.current = undefined;
      }
      refs.pendingLiveEventsRef.current = undefined;
      dispatch({ type: "liveFinished", messages: result.messages, events: result.events });
      toast.success(formatCopy(copy.shell.toast.liveLlmResponseReceived, { provider: result.provider.label }));
    } catch (error) {
      if (controller.signal.aborted) {
        dispatch({ type: "patch", patch: { livePreviewState: "stopped" } });
        toast.info(copy.shell.toast.liveLlmStopped);
      } else {
        dispatch({ type: "patch", patch: { livePreviewState: "error" } });
        toast.error(error instanceof Error ? error.message : copy.shell.toast.liveLlmFailed);
      }
    } finally {
      if (refs.liveAbortControllerRef.current === controller) {
        refs.liveAbortControllerRef.current = undefined;
      }
      dispatch({ type: "patch", patch: { liveRunning: false } });
    }
  }

  async function refreshPiRuntime(showError = false): Promise<PiRuntimeState | undefined> {
    try {
      const piState = await getPiRuntimeState();
      dispatch({ type: "patch", patch: { piRuntimeState: piState } });
      if (!piState.available && showError) toast.error(piState.error ?? "Pi runtime is unavailable.");
      return piState;
    } catch (error) {
      if (showError) toast.error(error instanceof Error ? error.message : "Pi runtime is unavailable.");
      return undefined;
    }
  }

  async function synchronizePiRuntime(
    projectSnapshot: AgentFrontendProject = activeProject,
    showError = false,
    conversationId = state.activePiConversationId,
  ): Promise<PiRuntimeState | undefined> {
    const provider = defaultProviderConnection(projectSnapshot);
    try {
      const piState = await configurePiRuntime(
        {
          ...piRuntimeConfigurationForProvider(provider, sessionKeys[provider.id]),
          conversationId,
        },
      );
      if (!piState.available) throw new Error(piState.error ?? "Pi runtime is unavailable.");
      if (piState.provider !== provider.id || piState.model !== provider.defaultModel) {
        throw new Error(
          `Pi did not activate the selected model ${provider.label}/${provider.defaultModel}.`,
        );
      }
      dispatch({ type: "patch", patch: { piRuntimeState: piState } });
      return piState;
    } catch (error) {
      if (showError) toast.error(error instanceof Error ? error.message : "Pi model synchronization failed.");
      return undefined;
    }
  }

  async function runPiPreview(prompt = state.previewPrompt, context?: ComposerSubmitContext) {
    if (!state.savedProject) {
      toast.info(copy.shell.toast.saveBeforeLocalPreview);
      return;
    }
    if (state.liveRunning) {
      stopLivePreview();
      return;
    }

    const normalizedPrompt = prompt.trim() || livePreviewFallbackPrompt[locale];
    const conversation = activePiConversation ?? createEphemeralPiConversation();
    let nextConversation = titlePiConversation(conversation, normalizedPrompt);
    const controller = new AbortController();
    refs.piAbortControllerRef.current = controller;
    dispatch({ type: "piTurnStarted", prompt: normalizedPrompt, conversation: nextConversation, events: [...nextConversation.events] });

    // Reconfigure before every turn. This prevents a new Pi session or an editor model change
    // from leaving the runtime on its old default (commonly Anthropic/Claude). The submitted
    // message is placed on the canvas first so a configuration failure is never a silent no-op.
    const piState = await synchronizePiRuntime(activeProject, true, nextConversation.id);
    if (controller.signal.aborted || refs.piAbortControllerRef.current !== controller) {
      // Stop arrived while the configuration round-trip was in flight. Clear our own ref —
      // the finally block below is not reached on this path, so without this a stale
      // controller would linger until the next run overwrites it.
      if (refs.piAbortControllerRef.current === controller) refs.piAbortControllerRef.current = undefined;
      return;
    }
    if (!piState?.available) {
      nextConversation = appendPiConversationEvents(
        nextConversation,
        // Configuration failed before the turn emitted anything, so the prompt is passed: it
        // has to appear above the error rather than the error standing on its own.
        piErrorTurnEvents({
          message: piConfigurationFailureCopy[locale],
          prompt: normalizedPrompt,
          code: "pi_configuration_error",
        }),
      );
      dispatch({ type: "piConfigurationFailed", conversation: nextConversation, events: [...nextConversation.events] });
      refs.piAbortControllerRef.current = undefined;
      return;
    }

    // The conversation itself is still built one event at a time — that is what gives `seq` its
    // order. Only the React commits are coalesced, so what finally renders is unchanged.
    const commit = createPiFrameCommit<EphemeralPiConversation>((conversation_) => {
      dispatch({ type: "piConversationUpdated", conversation: conversation_, events: [...conversation_.events] });
    });

    try {
      for await (const event of runPiTurn({
        conversationId: nextConversation.id,
        prompt: normalizedPrompt,
        provider: piState.provider,
        model: piState.model,
        thinkingLevel: context?.budgetMode === "fast" ? "low" : context?.budgetMode === "expert" ? "high" : "medium",
        permissionMode: context?.permissionMode ?? "request",
      }, { signal: controller.signal })) {
        if (controller.signal.aborted || refs.piAbortControllerRef.current !== controller) {
          commit.cancel();
          return;
        }
        nextConversation = appendPiConversationEvents(nextConversation, [event]);
        commit.push(nextConversation);
        if (event.type === "tool.call.awaiting_approval") {
          // An approval is waiting on the user, so it must be on screen this instant rather than
          // whenever the next frame happens to land.
          commit.flush();
          if (activeProject.toolCalls.approval === "hidden") {
            dispatch({ type: "patch", patch: { externalApprovalOverlayActive: true } });
          }
        }
      }
      commit.flush();
      if (nextConversation.events.some((entry) => entry.type === "run.error")) {
        // The server finished the stream with a run error (extension_error) instead of a
        // clean success — report the turn as failed, not completed.
        dispatch({ type: "patch", patch: { livePreviewState: "error" } });
        toast.error(runErrorMessage(nextConversation.events));
      } else {
        dispatch({ type: "patch", patch: { livePreviewState: "finished" } });
        await refreshPiRuntime();
        toast.success("Pi run completed.");
      }
    } catch (error) {
      if (controller.signal.aborted) {
        commit.cancel();
        // The abort severed the stream, so the server's own wrap-up events never arrive.
        // Close whatever is still open locally (text/tool/reasoning blocks + a cancelled
        // run terminal) so the transcript never keeps a half-finished turn.
        const closed = appendPiConversationEvents(nextConversation, piCancelledTurnEvents(nextConversation.events));
        dispatch({ type: "piConversationUpdated", conversation: closed, events: [...closed.events] });
        dispatch({ type: "patch", patch: { livePreviewState: "stopped", externalApprovalOverlayActive: false, inlineApprovalOverlayActive: false, dismissedApprovalId: null } });
        toast.info("Pi run stopped.");
      } else {
        // Keep whatever the turn produced before it failed: the transcript up to the error is
        // the most useful thing on screen next to the error itself.
        commit.flush();
        dispatch({ type: "patch", patch: { livePreviewState: "error" } });
        toast.error(error instanceof Error ? error.message : "Pi run failed.");
      }
    } finally {
      if (refs.piAbortControllerRef.current === controller) refs.piAbortControllerRef.current = undefined;
      dispatch({ type: "patch", patch: { liveRunning: false } });
    }
  }

  async function selectPiProvider(provider: ProviderConnectionId) {
    const selected = activeProject.providers.connections.find((entry) => entry.id === provider && entry.enabled);
    if (!selected) return;
    const nextProject = {
      ...activeProject,
      providers: { ...activeProject.providers, defaultProviderId: provider },
    };
    setDefaultProvider(provider);
    await synchronizePiRuntime(nextProject, true);
  }

  async function selectPiModel(model: string) {
    const provider = defaultProviderConnection(activeProject);
    const nextProvider = {
      ...provider,
      defaultModel: model,
      models: provider.models.includes(model) ? provider.models : [model, ...provider.models],
    };
    const nextProject = {
      ...activeProject,
      providers: {
        ...activeProject.providers,
        connections: activeProject.providers.connections.map((entry) => entry.id === provider.id ? nextProvider : entry),
      },
    };
    updateModel(model);
    await synchronizePiRuntime(nextProject, true);
  }

  async function refreshPiProviderModels(provider: ProviderConnection, apiKey?: string) {
    try {
      const piState = await configurePiRuntime({
        ...piRuntimeConfigurationForProvider(provider, apiKey),
        conversationId: state.activePiConversationId,
      });
      dispatch({ type: "patch", patch: { piRuntimeState: piState } });
      const count = piState.models.filter((model) => model.provider === provider.id).length;
      toast.success(`${provider.label} · ${count} ${copy.shell.toast.modelsCountSuffix}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pi provider update failed.");
    }
  }

  async function updatePiProviderModel(id: ProviderConnectionId, model: string) {
    const piState = await configurePiRuntime({
      conversationId: state.activePiConversationId,
      provider: id,
      model,
    });
    dispatch({ type: "patch", patch: { piRuntimeState: piState } });
  }

  async function savePiProviderSettings() {
    const provider = activeProject.providers.connections.find(
      (entry) => entry.id === activeProject.providers.defaultProviderId,
    );
    if (!provider) return;
    try {
      const piState = await synchronizePiRuntime(activeProject);
      if (!piState) throw new Error("Pi settings could not be synchronized.");
      toast.success(copy.shell.toast.providerSettingsSaved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pi settings could not be saved.");
    }
  }

  async function decidePiApproval(toolCallId: string, decision: "yes" | "always" | "no") {
    try {
      await resolvePiApproval(toolCallId, decision);
      dispatch({ type: "patch", patch: { externalApprovalOverlayActive: false, inlineApprovalOverlayActive: false } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pi approval failed.");
      // The decision could not be delivered (the run it belonged to is gone, usually after
      // a stop). Close the overlay regardless — leaving it up would strand it on a tool
      // that can never be answered.
      dispatch({ type: "patch", patch: { externalApprovalOverlayActive: false, inlineApprovalOverlayActive: false } });
      throw error;
    }
  }

  function stopLivePreview() {
    refs.liveAbortControllerRef.current?.abort();
    if (refs.piAbortControllerRef.current) {
      refs.piAbortControllerRef.current.abort();
      void abortPiRun();
    }
    // Clear any approval overlay a stopped run left waiting: its server-side pending
    // entry was just cancelled, so answering it would only earn a 409.
    dispatch({
      type: "patch",
      patch: {
        livePreviewState: "stopped",
        liveRunning: false,
        externalApprovalOverlayActive: false,
        inlineApprovalOverlayActive: false,
        dismissedApprovalId: null,
      },
    });
  }

  function updateScenario(id: PreviewScenarioId) {
    dispatch({ type: "patch", patch: { selectedScenarioId: id, gitPreviewStateOverride: undefined } });
  }

  function updateRunMode(mode: RunMode) {
    if (mode === "pi") {
      // Restore the active page-lifetime Pi conversation through the same canonical event path.
      dispatch({ type: "runModeChanged", mode, restoreEvents: [...(activePiConversation?.events ?? [])] });
      void synchronizePiRuntime(activeProject, true, state.activePiConversationId);
      return;
    }
    dispatch({ type: "runModeChanged", mode });
  }

  function selectPiConversation(conversationId: string) {
    const conversation = state.piConversations.find((entry) => entry.id === conversationId);
    if (!conversation || state.liveRunning) return;
    dispatch({ type: "piConversationSelected", conversationId: conversation.id, events: [...conversation.events] });
    refs.outputPanelSignatureRef.current = "";
    void synchronizePiRuntime(activeProject, true, conversation.id);
  }

  function createNewPiConversation() {
    if (state.liveRunning) return;
    const conversation = createEphemeralPiConversation();
    dispatch({ type: "newPiConversationStarted", conversation });
    refs.outputPanelSignatureRef.current = "";
    void startNewPiSession(conversation.id)
      .then((piState) => dispatch({ type: "patch", patch: { piRuntimeState: piState } }))
      .then(() => synchronizePiRuntime(activeProject, false, conversation.id))
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Could not start a new Pi session.");
      });
  }

  return {
    saveScaffoldPreview,
    runCurrentPreview,
    runLivePreview,
    refreshPiRuntime,
    synchronizePiRuntime,
    runPiPreview,
    selectPiProvider,
    selectPiModel,
    updatePiProviderModel,
    refreshPiProviderModels,
    savePiProviderSettings,
    decidePiApproval,
    stopLivePreview,
    updateScenario,
    updateRunMode,
    selectPiConversation,
    createNewPiConversation,
  };
}

/** Picks a readable message out of a stream that ended with a run error. */
function runErrorMessage(events: readonly AgentUXEvent[]): string {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].type !== "run.error") continue;
    const payload = events[index].payload as { message?: unknown; error?: unknown; code?: unknown } | undefined;
    const message = payload?.message ?? payload?.error ?? payload?.code;
    return typeof message === "string" && message.trim() ? message : "Pi run failed.";
  }
  return "Pi run failed.";
}
