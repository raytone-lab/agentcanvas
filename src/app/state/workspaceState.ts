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
import { defaultCodingAgentProject, type AgentFrontendProject } from "../../schema/agentuxConfig";
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
  | { type: "fixtureSelected"; fixtureId: PreviewFixtureId }
  | { type: "presetFixtureSelected"; optionId: string }
  | { type: "beginStandardStream"; scenarioId: ScenarioId; externalApproval: boolean }
  | { type: "streamEvents"; events: AgentUXEvent[] }
  | { type: "previewStateCard"; events: AgentUXEvent[]; code: string; externalApproval: boolean }
  | { type: "showToolActionsOverview"; events: AgentUXEvent[]; forceOpen: boolean }
  | { type: "replayWritingOutput" }
  | { type: "replayConversationFixture" }
  | { type: "replayStandardScenario"; scenarioId: ScenarioId; events: AgentUXEvent[] }
  | { type: "conversationWritingPreview"; events: AgentUXEvent[] }
  | { type: "thinkingPreview"; events: AgentUXEvent[] }
  | { type: "mediaPreviewStarted"; events: AgentUXEvent[]; scenarioId: PreviewScenarioId; prompt: string }
  | { type: "replayCurrent"; fallback: AgentUXEvent[] }
  | { type: "presetGroupSelected"; groupId: PresetGroupId }
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
    selectedGroup: "conversation",
    presetDrawerOpen: false,
    selectedFixtureId: "coding-agent",
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
      return { ...state, sentPrompts: [trimmed, ...state.sentPrompts.filter((entry) => entry !== trimmed)].slice(0, 12) };
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
    case "enterWelcome":
      return {
        ...state,
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
    case "thinkingPreview":
      return {
        ...state,
        showStandard: true,
        runEventSource: "replay",
        liveMessages: [],
        externalApprovalOverlayActive: false,
        dismissedApprovalId: null,
        gitPreviewStateOverride: undefined,
        forcePreviewToolsOpen: false,
        runEvents: action.events,
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
      };
    case "savedPreviewEntered":
      return {
        ...state,
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
          ? { runEvents: [...action.restoreEvents], runEventSource: "pi" as const, liveMessages: [] }
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
