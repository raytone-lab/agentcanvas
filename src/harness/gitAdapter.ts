import type { AgentUXEvent } from "@agent-ux/protocol";

export type GitPreviewFileStatus = "added" | "modified" | "deleted";

export type GitPreviewFile = {
  path: string;
  status: GitPreviewFileStatus;
  additions: number;
  deletions: number;
};

export type GitPreviewState = {
  branch: string;
  status: "dirty" | "committed";
  ahead: number;
  changedFiles: GitPreviewFile[];
  changedFileCount?: number;
  diffTitle: string;
  suggestedCommitMessage: string;
  lastCommitMessage?: string;
  mockOnly: boolean;
  pushEnabled: boolean;
};

export function createGitPreviewState(): GitPreviewState {
  return {
    branch: "codex/agentcanvas-preview",
    status: "dirty",
    ahead: 1,
    changedFiles: [
      { path: "src/agent/PreviewPanel.tsx", status: "modified", additions: 6, deletions: 1 },
      { path: "agentux.config.ts", status: "modified", additions: 3, deletions: 0 },
    ],
    diffTitle: "AgentCanvasPreview.diff",
    suggestedCommitMessage: "Preview AgentCanvas Git mock state",
    mockOnly: true,
    pushEnabled: false,
  };
}

export function commitGitPreviewState(state: GitPreviewState): GitPreviewState {
  if (state.status === "committed") {
    return state;
  }
  return {
    ...state,
    status: "committed",
    ahead: state.ahead + 1,
    changedFiles: [],
    changedFileCount: 0,
    lastCommitMessage: state.suggestedCommitMessage,
    pushEnabled: false,
    mockOnly: true,
  };
}

export function gitPreviewStateFromEvents(events: readonly AgentUXEvent[]): GitPreviewState | undefined {
  const hasGitDiffArtifact = events.some((event) => {
    if (event.type !== "artifact.created") {
      return false;
    }
    const title = String(event.payload.title ?? "");
    const mimeType = String(event.payload.mimeType ?? "");
    return title === "AgentCanvasPreview.diff" || mimeType === "text/x-diff";
  });

  return hasGitDiffArtifact ? createGitPreviewState() : undefined;
}

export function previewDiffContent(prompt: string): string {
  return `--- src/agent/PreviewPanel.tsx
+++ src/agent/PreviewPanel.tsx
+export const savedPreview = {
+  prompt: ${JSON.stringify(prompt)},
+  mode: "pure-frontend",
+};
- export const savedPreview = null;
`;
}
