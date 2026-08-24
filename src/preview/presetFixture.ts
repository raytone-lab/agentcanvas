import type { PreviewFixtureId } from "./fixtures";

const codingAgentPresetIds = new Set([
  "writing-smooth",
  "writing-typewriter",
  "writing-chunked",
  "speaker-labels",
  "message-actions",
  "compact-chips",
  "timeline-rail",
  "terminal-log",
  "tool-detail-full",
  "tool-detail-output-only",
  "tool-detail-summary",
  "upload",
  "mic",
  "budget",
  "model-tools",
  "prompt-shortcuts",
  "provider-settings-launcher",
  "output-source-artifact",
  "output-source-console",
  "renderer-auto",
  "renderer-code",
  "renderer-diff",
  "renderer-markdown",
  "renderer-preview",
  "branch-status",
  "changed-files",
  "diff-preview",
  "commit-message",
  "commit-action",
  "warm-graphite",
  "cocoa-system",
  "forest-ember",
  "soft-glass",
  "sand-workspace",
  "apricot-agent",
  "cold-mono",
  "slate-blue",
  "cyan-grid",
  "ice-white",
  "mist-blue",
  "polar-mono",
]);

const codingReasoningPresetIds = new Set([
  "thinking-wave",
  "thinking-pulse",
  "thinking-shimmer",
  "thinking-bars",
  "thinking-orbit",
  "thinking-orb-s1",
  "thinking-orb-b5",
  "thinking-orb-m2",
  "summary-first",
  "reasoning-auto-collapse",
  "reasoning-expanded",
  "reasoning-status-only",
  "reasoning-public-summary",
]);

const toolLifecyclePresetIds = new Set([
  "command-cards",
  "tool-progress-icon",
  "tool-progress-bar",
  "tool-approval-inline",
  "tool-approval-hidden",
]);

const codingBlockPresetIds = new Set(["renderer-code", "renderer-diff", "code-diff", "tool-log-tail"]);
const artifactActionPresetIds = new Set(["renderer-data"]);
const errorBlockPresetIds = new Set(["error-collapse"]);

const providerPresetIdPattern = /^provider-/;

export function fixtureForPresetOption(optionId: string, currentFixtureId: PreviewFixtureId): PreviewFixtureId {
  if (toolLifecyclePresetIds.has(optionId)) {
    return "tool-approval";
  }
  if (codingReasoningPresetIds.has(optionId)) {
    return "coding-agent";
  }
  if (artifactActionPresetIds.has(optionId)) {
    return "artifact-action";
  }
  if (codingBlockPresetIds.has(optionId)) {
    return "coding-agent";
  }
  if (errorBlockPresetIds.has(optionId)) {
    return "block-error";
  }
  if (codingAgentPresetIds.has(optionId) || providerPresetIdPattern.test(optionId)) {
    return "coding-agent";
  }

  return currentFixtureId;
}
