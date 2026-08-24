import { GitBranch } from "lucide-react";

import type { AgentFrontendProject } from "../../schema/agentuxConfig";
import type { GitPreviewState } from "../../preview-runner/PreviewRunner";
import { useCopy } from "../../i18n/LocaleContext";

const fallbackGitState: GitPreviewState = {
  branch: "codex/agentcanvas-presets",
  status: "dirty",
  ahead: 1,
  changedFileCount: 14,
  changedFiles: [
    { path: "src/components/agent-preview/ChatFrame.tsx", status: "modified", additions: 18, deletions: 4 },
    { path: "src/runtime/toolDisplaySpec.ts", status: "modified", additions: 9, deletions: 2 },
    { path: "agentux.config.ts", status: "modified", additions: 3, deletions: 0 },
  ],
  diffTitle: "AgentCanvasPreview.diff",
  suggestedCommitMessage: "Update AgentUX scaffold presets",
  mockOnly: true,
  pushEnabled: false,
};

export function GitFrame({
  project,
  gitState,
  onCommit,
}: {
  project: AgentFrontendProject;
  gitState?: GitPreviewState;
  onCommit?: () => void;
}) {
  const copy = useCopy();
  const c = copy.workspace.gitFrame;

  // V1: Git is not shipped yet — show a "coming soon" placeholder instead of
  // the (mock) git control surface.
  return (
    <section className="utility-card git-panel" data-preview-anchor="git">
      <header className="utility-header">
        <div>
          <h3>{c.title}</h3>
          <p>{c.subtitle}</p>
        </div>
        <GitBranch size={16} />
      </header>
    </section>
  );

  // eslint-disable-next-line no-unreachable
  const state = gitState ?? fallbackGitState;
  const changedFileCount = state.changedFileCount ?? state.changedFiles.length;
  const committed = state.status === "committed";

  return (
    <section className="utility-card git-panel" data-preview-anchor="git">
      <header className="utility-header">
        <div>
          <h3>{c.title}</h3>
          <p>{c.subtitle}</p>
        </div>
        <GitBranch size={16} />
      </header>
      {project.git.showBranchStatus ? (
        <div className="git-status" aria-label={c.branchStatusAria}>
          <span>{c.branch}</span>
          <strong>{state.branch}</strong>
          <small>{committed ? c.statusCommittedLocally : c.statusDirty}{c.aheadPrefix}{state.ahead}{state.mockOnly ? c.mockSuffix : ""}</small>
        </div>
      ) : null}
      {project.git.showChangedFiles ? (
        <div className="changed-files" aria-label={c.changedFilesAria}>
          <strong>{committed ? c.committedFiles : c.editedFiles} <span>{changedFileCount}{c.filesSuffix}</span></strong>
          {state.changedFiles.length > 0 ? (
            state.changedFiles.map((file) => (
              <code key={file.path}>
                <span className="file-path">{file.path}</span>
                <span className="diff-stat">
                  <span className="stat-add">+{file.additions}</span>
                  <span className="stat-del">−{file.deletions}</span>
                </span>
              </code>
            ))
          ) : (
            <p>{c.workingTreeClean}</p>
          )}
        </div>
      ) : (
        <div className="empty-state">{c.changedFilesHidden}</div>
      )}
      {project.git.suggestCommitMessage ? (
        <div className="commit-message-panel">
          <span>{committed ? c.lastMockCommit : c.commitMessage}</span>
          <strong>{state.lastCommitMessage ?? state.suggestedCommitMessage}</strong>
        </div>
      ) : null}
      <div className="git-actions">
        {project.git.showDiff ? (
          <button className="secondary-button" type="button" aria-label={`${c.viewDiffAriaPrefix}${state.diffTitle}`}>
            {c.diffButton}
          </button>
        ) : null}
        <button
          className="secondary-button"
          type="button"
          aria-label={project.git.suggestCommitMessage ? c.commitDraftAria : c.commitAria}
          disabled={!project.git.allowCommit || committed}
          onClick={onCommit}
        >
          {committed ? c.committed : c.commit}
        </button>
        <button className="secondary-button" type="button" disabled={!project.git.allowPush || !state.pushEnabled}>{c.push}</button>
      </div>
    </section>
  );
}
