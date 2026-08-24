import { GitBranch } from "lucide-react";
import agentuxConfig from "../../../agentux.config";
import { useCopy } from "../i18n";

const changedFiles = [
  { path: "src/agent/components/ChatFrame.tsx", status: "modified", additions: 8, deletions: 2 },
  { path: "src/agent/styles.css", status: "modified", additions: 14, deletions: 1 },
];

export function GitFrame() {
  const copy = useCopy();

  return (
    <div
      data-git-frame
      data-git-branch={agentuxConfig.git.showBranchStatus}
      data-git-diff={agentuxConfig.git.showDiff}
      data-git-commit={agentuxConfig.git.allowCommit}
      data-git-push={agentuxConfig.git.allowPush}
    >
      {agentuxConfig.git.showBranchStatus ? (
        <div data-git-branch-row>
          <GitBranch size={13} />
          <strong>codex/agentcanvas-preview</strong>
          <span data-git-meta>dirty · ahead 1</span>
        </div>
      ) : null}
      {agentuxConfig.git.showChangedFiles ? (
        <ul data-git-files>
          {changedFiles.map((file) => (
            <li key={file.path} data-git-file data-status={file.status}>
              <span>{file.path}</span>
              <em data-git-stat>+{file.additions} −{file.deletions}</em>
            </li>
          ))}
        </ul>
      ) : (
        <div data-empty-panel>{copy.gitEmpty}</div>
      )}
    </div>
  );
}
