import type { Dispatch, SetStateAction } from "react";
import type { AgentUXToolTimelineItem } from "@agent-ux/render-core";

import type { ScenarioId } from "../../agentmatrix";
import type { StateCard } from "../../components/agentmatrix/StateGallery";
import type { UiCopy, AppLocale } from "../../i18n/uiCopy";
import type { GitPreviewState, PreviewRunner, PreviewScenarioId } from "../../preview-runner/PreviewRunner";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";
import { presetGroupsForProject } from "../../schema/presets";
import type { EphemeralPiConversation } from "../../pi/piConversationState";
import type { AgentUXEvent } from "../../agentux";
import type { WorkspaceDispatch, WorkspaceState } from "../state/workspaceState";
import type { WorkspaceRefs } from "./useWorkspaceState";

export type PresetGroup = ReturnType<typeof presetGroupsForProject>[number];

export type WorkspaceControllerDeps = {
  state: WorkspaceState;
  dispatch: WorkspaceDispatch;
  refs: WorkspaceRefs;
  locale: AppLocale;
  copy: UiCopy;
  project: AgentFrontendProject;
  activeProject: AgentFrontendProject;
  setProject: Dispatch<SetStateAction<AgentFrontendProject>>;
  events: AgentUXEvent[];
  previewRunner: PreviewRunner;
  sessionKeys: Record<string, string>;
  selectedPresetGroup: PresetGroup;
  pendingExternalApprovalTool: AgentUXToolTimelineItem | undefined;
  isWelcome: boolean;
  gitPreviewState: GitPreviewState | undefined;
  rightPanelAvailable: boolean;
};

export type PreviewStateCard = StateCard;
export type { ScenarioId, PreviewScenarioId };

/** Everything the action factories close over: the deps from App plus the shared derivations. */
export type ControllerContext = WorkspaceControllerDeps & {
  activePiConversation: EphemeralPiConversation;
  updateActiveProject: (mutator: (current: AgentFrontendProject) => AgentFrontendProject) => void;
};

/**
 * Routes a project mutation to the project the reader is editing: the saved
 * snapshot in saved-preview mode, the editor project otherwise. Shared by App
 * and the provider hook so both mutate the same target.
 */
export function createProjectUpdater(
  state: WorkspaceState,
  dispatch: WorkspaceDispatch,
  setProject: Dispatch<SetStateAction<AgentFrontendProject>>,
) {
  return function updateActiveProject(mutator: (current: AgentFrontendProject) => AgentFrontendProject) {
    if (state.surfaceMode === "saved-preview") {
      dispatch({ type: "updateSavedProject", mutator });
      return;
    }

    setProject(mutator);
  };
}

/** How long after the last slider move the canvas writes the text out again. */
export const WRITING_REPLAY_DELAY_MS = 200;

/**
 * Replays the canvas reveal after a writing-speed change, so the slider is
 * something you can watch rather than a number you have to trust.
 *
 * A reveal that is still running picks the new rate up by itself — the rate is
 * in the animation effect's deps. This covers the finished one: by the time you
 * reach for the slider the text is usually all there, and "all there, faster"
 * looks identical to "all there", which is what made the control feel dead.
 *
 * Debounced, because a drag fires an event per frame: restarting on every one
 * of them never gets past the first character, and a pace you only ever see the
 * start of is a pace you cannot judge. So the in-flight reveal follows the
 * slider live, and the replay lands once the hand stops.
 */
export function replayWritingSoon(refs: WorkspaceRefs, dispatch: WorkspaceDispatch) {
  if (refs.writingReplayTimerRef.current) {
    window.clearTimeout(refs.writingReplayTimerRef.current);
  }
  refs.writingReplayTimerRef.current = window.setTimeout(() => {
    refs.writingReplayTimerRef.current = undefined;
    dispatch({ type: "bump", key: "writingReplayKey" });
  }, WRITING_REPLAY_DELAY_MS);
}

/**
 * Re-mounts the preview surface for one 420ms window so entrance animations
 * replay. Shared by the preview intents and the saved-run orchestration.
 */
export function bumpPreviewRefresh(refs: WorkspaceRefs, dispatch: WorkspaceDispatch) {
  if (refs.previewRefreshTimerRef.current) {
    window.clearTimeout(refs.previewRefreshTimerRef.current);
  }
  dispatch({ type: "patch", patch: { previewRefreshing: false } });
  window.requestAnimationFrame(() => {
    dispatch({ type: "patch", patch: { previewRefreshing: true } });
    refs.previewRefreshTimerRef.current = window.setTimeout(() => {
      dispatch({ type: "patch", patch: { previewRefreshing: false } });
      refs.previewRefreshTimerRef.current = undefined;
    }, 420);
  });
}
