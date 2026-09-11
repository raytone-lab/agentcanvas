import { providerCatalog } from "../schema/agentuxConfig";
import { isThemePresetId } from "../theme/themeTokens";
import type { PresetGroupId } from "../schema/presets";

export type PreviewAnchor =
  | "chat"
  | "conversation"
  | "message-actions"
  | "user-message-actions"
  | "agent-message-actions"
  | "reasoning"
  | "tool-call"
  | "error-block"
  | "external-approval"
  | "prompt-context"
  | "composer"
  | "output"
  | "git"
  | "sidebar";

const chatOptions = new Set([
  "chat-visible",
  "writing-smooth",
  "writing-typewriter",
  "writing-chunked",
  "speaker-labels",
]);

const mediaGenerationOptions = new Set([
  "media-image-grid",
  "media-image-blur",
  "media-image-palette",
  "media-image-layers",
  "media-audio-skeleton",
  "media-audio-waveform",
  "media-video-storyboard",
  "media-video-cinema",
  "media-video-timeline",
  "media-video-frames",
]);

const sidebarOptions = new Set([
  "sidebar-visible",
  "sidebar-title",
  "sidebar-collapse",
  "sidebar-new-button",
  "sidebar-search",
  "sidebar-sessions",
  "sidebar-grouping",
  "sidebar-footer",
]);

const reasoningOptions = new Set([
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
  "reasoning-model-thinking",
]);

const toolCallOptions = new Set([
  "command-cards",
  "compact-chips",
  "timeline-rail",
  "terminal-log",
  "tool-detail-full",
  "tool-detail-output-only",
  "tool-detail-summary",
  "tool-progress-icon",
  "tool-progress-bar",
  "tool-log-tail",
]);

const composerOptions = new Set([
  "composer-visible",
  "upload",
  "mic",
  "budget",
  "model-config",
  "model-tools",
  "tool-approval-inline",
  "tool-approval-hidden",
  "prompt-shortcuts",
]);

const providerOptions = new Set([
  "provider-settings-launcher",
  ...providerCatalog.map((provider) => `provider-${provider.id}`),
]);

const outputOptions = new Set([
  "output-visible",
  "output-source-artifact",
  "output-source-console",
  "renderer-auto",
  "renderer-code",
  "renderer-diff",
  "renderer-markdown",
  "renderer-preview",
  "renderer-data",
  "code-diff",
]);

const gitOptions = new Set(["git-visible", "branch-status", "changed-files", "diff-preview", "commit-message", "commit-action"]);

// Derived from the theme table rather than restated: this list was a copy of
// the twelve ids that existed when it was written, so adding a theme silently
// left it without a preview target.
const isThemeOption = (optionId: string) => isThemePresetId(optionId);

const errorBlockOptions = new Set(["error-collapse"]);

const mappedOptionIds = new Set([
  ...chatOptions,
  ...mediaGenerationOptions,
  ...sidebarOptions,
  ...reasoningOptions,
  ...toolCallOptions,
  ...composerOptions,
  ...providerOptions,
  ...outputOptions,
  ...gitOptions,
  ...errorBlockOptions,
  "message-actions",
]);

export function hasPreviewAnchorForPresetOption(optionId: string): boolean {
  return mappedOptionIds.has(optionId) || isThemeOption(optionId);
}

export function previewAnchorForPresetOption(optionId: string): PreviewAnchor {
  if (optionId === "message-actions") {
    return "message-actions";
  }
  if (errorBlockOptions.has(optionId)) {
    return "error-block";
  }
  if (optionId === "tool-approval-hidden") {
    return "external-approval";
  }
  if (reasoningOptions.has(optionId)) {
    return "reasoning";
  }
  if (mediaGenerationOptions.has(optionId)) {
    return "chat";
  }
  if (toolCallOptions.has(optionId)) {
    return "tool-call";
  }
  if (sidebarOptions.has(optionId)) {
    return "sidebar";
  }
  if (composerOptions.has(optionId)) {
    return "composer";
  }
  if (providerOptions.has(optionId)) {
    return "composer";
  }
  if (outputOptions.has(optionId)) {
    return "output";
  }
  if (gitOptions.has(optionId)) {
    return "git";
  }
  if (chatOptions.has(optionId) || isThemeOption(optionId)) {
    return "chat";
  }
  return "chat";
}

export function previewAnchorForPresetGroup(groupId: PresetGroupId): PreviewAnchor {
  switch (groupId) {
    case "media-generation":
      return "chat";
    case "ux-effects":
      return "reasoning";
    case "tool-calls":
      return "tool-call";
    case "blocks":
      return "error-block";
    // Stopping and resuming happen on the turn itself.
    case "interrupt":
      return "chat";
    case "composer":
    case "provider":
    case "approval":
      return "composer";
    case "output":
    case "delivery":
      return "output";
    case "git":
      return "git";
    case "sidebar":
      return "sidebar";
    case "conversation":
    case "theme":
      return "chat";
  }
}

export function previewAnchorFallbacks(anchor: PreviewAnchor): PreviewAnchor[] {
  if (anchor === "conversation") {
    return ["conversation", "chat"];
  }
  if (anchor === "message-actions") {
    return ["message-actions", "chat"];
  }
  if (anchor === "user-message-actions" || anchor === "agent-message-actions") {
    return [anchor, "message-actions", "chat"];
  }
  if (anchor === "reasoning" || anchor === "tool-call") {
    return [anchor, "chat"];
  }
  if (anchor === "external-approval") {
    return ["external-approval", "chat", "tool-call"];
  }
  if (anchor === "error-block") {
    return ["error-block", "chat"];
  }
  if (anchor === "prompt-context") {
    return ["prompt-context", "composer"];
  }
  return [anchor];
}
