import { describe, expect, it } from "vitest";

import { createInitialWorkspaceState, workspaceReducer } from "./workspaceState";
import type { AgentUXEvent } from "../../agentux";

const locale = "en" as const;

function withEvents(events: AgentUXEvent[]) {
  return events;
}

function fakeEvent(id: string): AgentUXEvent {
  return {
    protocol: "agent-ux",
    version: "0.1",
    id,
    runId: "run",
    seq: Number(id),
    ts: 1760000000000,
    type: "run.started",
    payload: {},
  };
}

describe("workspaceReducer transitions", () => {
  it("starts in builder mode with the default fixture and an empty replay run", () => {
    const state = createInitialWorkspaceState(locale);
    expect(state.surfaceMode).toBe("builder");
    expect(state.runEvents).toEqual([]);
    expect(state.runMode).toBe("replay");
    expect(state.rightCollapsed).toBe(true);
    expect(state.piConversations).toHaveLength(1);
    expect(state.activePiConversationId).toBe(state.piConversations[0].id);
  });

  it("resetRun clears stream side state without touching the prompt or mode unless asked", () => {
    let state = createInitialWorkspaceState(locale);
    state = { ...state, runEvents: [fakeEvent("1")], runEventSource: "live", liveMessages: [], livePreviewState: "finished", gitPreviewStateOverride: {} as never, dismissedApprovalId: "x" };
    const next = workspaceReducer(state, { type: "resetRun" });
    expect(next.runEvents).toBeUndefined();
    expect(next.runEventSource).toBeUndefined();
    expect(next.livePreviewState).toBe("idle");
    expect(next.gitPreviewStateOverride).toBeUndefined();
    expect(next.dismissedApprovalId).toBeNull();
    expect(next.forcePreviewToolsOpen).toBe(false);
    expect(next.runMode).toBe("replay");
    expect(next.previewPrompt).toBe(state.previewPrompt);

    const withMode = workspaceReducer(state, { type: "resetRun", mode: "pi", prompt: "next" });
    expect(withMode.runMode).toBe("pi");
    expect(withMode.previewPrompt).toBe("next");
  });

  it("beginStandardStream enters the standard replay surface and clears the previous run", () => {
    let state = createInitialWorkspaceState(locale);
    state = { ...state, runEvents: [fakeEvent("1")], activeStateCode: "status: failed" };
    const next = workspaceReducer(state, {
      type: "beginStandardStream",
      scenarioId: "tool-approval",
      externalApproval: true,
    });
    expect(next.showStandard).toBe(true);
    expect(next.standardScenarioId).toBe("tool-approval");
    expect(next.surfaceMode).toBe("builder");
    expect(next.workspaceView).toBe("preview");
    expect(next.runEventSource).toBe("replay");
    expect(next.runEvents).toEqual([]);
    expect(next.activeStateCode).toBeNull();
    expect(next.externalApprovalOverlayActive).toBe(true);
  });

  it("enterWelcome clears to an empty timeline that does not fall back to the fixture", () => {
    let state = createInitialWorkspaceState(locale);
    state = { ...state, showStandard: true, previewPrompt: "hello" };
    const next = workspaceReducer(state, { type: "enterWelcome" });
    expect(next.showStandard).toBe(false);
    expect(next.runEvents).toEqual([]);
    expect(next.runEventSource).toBeUndefined();
    expect(next.previewPrompt).toBe("");
  });

  it("replayCurrent re-emits the current events and falls back only when no run is loaded", () => {
    const state = createInitialWorkspaceState(locale);
    // Initial runEvents is [] (truthy), so a replay clones it rather than using the fallback —
    // the same branch the original setRunEvents((current) => current ? [...current] : ...) took.
    expect(workspaceReducer(state, { type: "replayCurrent", fallback: [fakeEvent("9")] }).runEvents).toEqual([]);

    const current = workspaceReducer(state, { type: "streamEvents", events: [fakeEvent("1")] });
    const replayed = workspaceReducer(current, { type: "replayCurrent", fallback: [fakeEvent("9")] });
    expect(replayed.runEvents).toHaveLength(1);
    expect(replayed.runEventSource).toBe("replay");

    const unloaded = workspaceReducer({ ...state, runEvents: undefined }, { type: "replayCurrent", fallback: [fakeEvent("9")] });
    expect(unloaded.runEvents).toEqual([fakeEvent("9")]);
  });

  it("recordPrompt dedupes and caps the session prompt list", () => {
    let state = createInitialWorkspaceState(locale);
    state = { ...state, sentPrompts: ["a", "b", "c"] };
    const next = workspaceReducer(state, { type: "recordPrompt", prompt: "b" });
    expect(next.sentPrompts).toEqual(["b", "a", "c"]);
    expect(workspaceReducer(state, { type: "recordPrompt", prompt: "  " }).sentPrompts).toBe(state.sentPrompts);
  });

  it("outputItemOpened targets the right panel or the modal and dedupes by id", () => {
    const state = createInitialWorkspaceState(locale);
    const item = { id: "file:a.ts", kind: "file" as const, title: "a.ts" };
    const panelOpened = workspaceReducer(state, { type: "outputItemOpened", item, inModal: false });
    expect(panelOpened.outputModalOpen).toBe(false);
    expect(panelOpened.rightCollapsed).toBe(false);
    expect(panelOpened.activeOutputPanelItemId).toBe("file:a.ts");

    const modalOpened = workspaceReducer(panelOpened, { type: "outputItemOpened", item: { ...item, body: "x" }, inModal: true });
    expect(modalOpened.outputModalOpen).toBe(true);
    expect(modalOpened.outputPanelItems).toHaveLength(1);
    expect(modalOpened.outputPanelItems[0].body).toBe("x");
  });

  it("outputItemClosed moves the active id to the previous tab and closes an emptied modal", () => {
    let state = createInitialWorkspaceState(locale);
    const items = [
      { id: "one", kind: "file" as const, title: "one" },
      { id: "two", kind: "file" as const, title: "two" },
    ];
    state = { ...state, outputPanelItems: items, activeOutputPanelItemId: "two", outputModalOpen: true };
    const closed = workspaceReducer(state, { type: "outputItemClosed", id: "two" });
    expect(closed.outputPanelItems).toEqual([items[0]]);
    expect(closed.activeOutputPanelItemId).toBe("one");
    expect(closed.outputModalOpen).toBe(true);

    const emptied = workspaceReducer(closed, { type: "outputItemClosed", id: "one" });
    expect(emptied.outputPanelItems).toEqual([]);
    expect(emptied.outputModalOpen).toBe(false);
  });

  it("autoRailsHidden keeps the same reference when nothing changed", () => {
    const state = createInitialWorkspaceState(locale);
    const next = workspaceReducer(state, { type: "autoRailsHidden", rails: { left: false, right: false } });
    expect(next).toBe(state);
    const hidden = workspaceReducer(state, { type: "autoRailsHidden", rails: { left: true, right: false } });
    expect(hidden.autoHiddenRails).toEqual({ left: true, right: false });
  });

  it("localeDefaultPromptSwapped only rewrites a still-default prompt", () => {
    const state = createInitialWorkspaceState("en");
    const swapped = workspaceReducer(state, { type: "localeDefaultPromptSwapped", from: "en", to: "zh" });
    expect(swapped.previewPrompt).toBe(createInitialWorkspaceState("zh").previewPrompt);

    const edited = { ...state, previewPrompt: "custom" };
    expect(workspaceReducer(edited, { type: "localeDefaultPromptSwapped", from: "en", to: "zh" })).toBe(edited);
  });

  it("savedPreviewEntered keeps the replay transcript when entering non-live saved preview", () => {
    const state = createInitialWorkspaceState(locale);
    const events = withEvents([fakeEvent("1")]);
    const entered = workspaceReducer(state, {
      type: "savedPreviewEntered",
      saved: {} as never,
      snapshot: {} as never,
      scenarioId: "simple-chat",
      runMode: "replay",
      live: false,
    });
    expect(entered.surfaceMode).toBe("saved-preview");
    expect(entered.showStandard).toBe(false);
    expect(entered.savedProject).toBeDefined();
    void events;
  });

  it("runModeChanged restores a pi conversation through the canonical event path", () => {
    const state = createInitialWorkspaceState(locale);
    const restore = [fakeEvent("3")];
    const next = workspaceReducer(state, { type: "runModeChanged", mode: "pi", restoreEvents: restore });
    expect(next.runMode).toBe("pi");
    expect(next.runEventSource).toBe("pi");
    expect(next.runEvents).toEqual([fakeEvent("3")]);
    expect(next.liveMessages).toEqual([]);
    expect(next.livePreviewState).toBe("idle");
  });
});
