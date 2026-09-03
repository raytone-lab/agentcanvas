import { toast } from "sonner";

import { downloadScaffold } from "../../export/scaffoldDownload";
import { createScaffoldExportSnapshot } from "../../export/scaffoldManifest";
import { normalizeOutputPanelRequest, type OutputPanelOpenRequest } from "../../components/agent-preview/OutputFrame";
import { commitGitPreviewState } from "../../preview-runner/PreviewRunner";
import { formatCopy } from "../projection/previewDefaults";
import { scrollPreviewToAnchor } from "../projection/previewScroll";
import {
  createProjectUpdater,
  type ControllerContext,
  type WorkspaceControllerDeps,
} from "./controllerShared";
import { createPreviewActions } from "./previewActions";
import { createRunActions } from "./runActions";
import type { EphemeralPiConversation } from "../../pi/piConversationState";

export { createProjectUpdater } from "./controllerShared";
export type { WorkspaceControllerDeps } from "./controllerShared";

/**
 * Workspace controller facade: composes the preview intents and the run
 * orchestration over one shared context, plus the small git/output/export
 * glue that belongs to neither half.
 */
export function createWorkspaceController(deps: WorkspaceControllerDeps) {
  const { state, dispatch, refs, copy, activeProject, setProject, gitPreviewState, rightPanelAvailable } = deps;
  const activePiConversation: EphemeralPiConversation =
    state.piConversations.find((conversation) => conversation.id === state.activePiConversationId) ?? state.piConversations[0];

  const ctx: ControllerContext = {
    ...deps,
    activePiConversation,
    updateActiveProject: createProjectUpdater(state, dispatch, setProject),
  };
  const preview = createPreviewActions(ctx);
  const run = createRunActions(ctx, {
    setDefaultProvider: preview.setDefaultProvider,
    updateModel: preview.updateModel,
  });

  function commitGitPreview() {
    if (!gitPreviewState) {
      toast.info(copy.shell.toast.runGitDiffBeforeCommit);
      return;
    }
    dispatch({ type: "gitOverrideCommitted", state: commitGitPreviewState(gitPreviewState) });
    toast.success(copy.shell.toast.mockCommitRecorded);
  }

  function openArtifactFromTool(request: OutputPanelOpenRequest) {
    const item = normalizeOutputPanelRequest(request);
    // Keyed on *available*, not visible. Clicking an artifact is the request to see it, so a
    // panel the reader had collapsed should open rather than being bypassed for a modal. The
    // modal is for when there is genuinely no room — a narrow window, or no output slot.
    dispatch({ type: "outputItemOpened", item, inModal: !rightPanelAvailable });
    setProject((current) => ({
      ...current,
      output: { ...current.output, source: "artifact" },
    }));
    if (rightPanelAvailable) {
      window.setTimeout(() => scrollPreviewToAnchor("output"), 80);
    }
  }

  function closeOutputPanelItem(id: string) {
    dispatch({ type: "outputItemClosed", id });
  }

  async function generateExport() {
    // The editor project is the source of truth; the exported Pi runtime registers this exact
    // provider/model definition when the generated app starts or sends a prompt.
    const snapshot = createScaffoldExportSnapshot(activeProject);
    dispatch({ type: "patch", patch: { exportSnapshot: snapshot } });
    try {
      await downloadScaffold(snapshot);
      toast.success(formatCopy(copy.shell.toast.exportDownloaded, { name: snapshot.packageJson.name }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.shell.toast.scaffoldExportFailed);
    }
  }

  return {
    ...preview,
    ...run,
    refs,
    commitGitPreview,
    openArtifactFromTool,
    closeOutputPanelItem,
    generateExport,
  };
}

export type WorkspaceController = ReturnType<typeof createWorkspaceController>;
