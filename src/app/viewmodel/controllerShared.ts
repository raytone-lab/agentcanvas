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
