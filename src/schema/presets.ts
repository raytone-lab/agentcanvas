import { providerCatalog, type AgentCanvasTemplate, type AgentFrontendProject } from "./agentuxConfig";
import { minimalThemePresetIds, nativeThemePresetIds, themeTokens, type ThemePresetId } from "../theme/themeTokens";

export type PresetGroupId =
  | "conversation"
  | "media-generation"
  | "sidebar"
  | "ux-effects"
  | "tool-calls"
  | "blocks"
  | "composer"
  | "provider"
  | "output"
  | "render"
  | "theme"
  | "git";

export type PresetOption = {
  id: string;
  label: string;
  description: string;
  section?: string;
};

export type PresetGroup = {
  id: PresetGroupId;
  label: string;
  options: PresetOption[];
};

const themeDirections: Record<ThemePresetId, string> = {
  "warm-graphite": "Dark graphite with amber warmth.",
  "cocoa-system": "Deep cocoa with rose-copper accents.",
  "forest-ember": "Deep green-black with warm gold.",
  "soft-glass": "Soft gray glass with deep navy.",
  "sand-workspace": "Warm white workspace with clay orange.",
  "apricot-agent": "Clean orange workspace with tangerine accents.",
  "cold-mono": "Cold black-and-white gray.",
  "slate-blue": "Cool blue console palette.",
  "cyan-grid": "Dark cyan-black technical palette.",
  "ice-white": "Cold white with ice blue.",
  "mist-blue": "Soft lavender surface with violet accent.",
  "polar-mono": "Very cold white-gray surface with deep navy accent.",
};

// Both styles' schemes live in one section; the per-style CSS filter shows only
// the active style's six, so a single header avoids an empty other-style header.
const themeOptions = [...nativeThemePresetIds, ...minimalThemePresetIds].map((id) => ({
  id,
  label: themeTokens[id].name,
  description: themeDirections[id],
  section: "Scaffold theme",
}));

export const presetGroups: PresetGroup[] = [
  {
    id: "media-generation",
    label: "Loaders",
    options: [
      { id: "media-image-grid", label: "Grid sweep", description: "Generated image loader with a stable grid and shimmer pass.", section: "Image loading" },
      { id: "media-image-blur", label: "Dot flicker", description: "Generated image loader with a tiled dot field that flickers irregularly while the image resolves.", section: "Image loading" },
      { id: "media-image-palette", label: "Blur flow", description: "Generated image loader with a soft blurred gradient that drifts while the image resolves.", section: "Image loading" },
      { id: "media-image-layers", label: "Glow loading", description: "Generated image loader with a soft full-surface glow animation.", section: "Image loading" },
      { id: "media-audio-skeleton", label: "Skeleton loading", description: "Audio loader with soft horizontal skeleton bars before revealing an audio player demo.", section: "Audio loading" },
      { id: "media-audio-waveform", label: "Audio wave", description: "Audio loader with animated waveform bars before revealing an audio player demo.", section: "Audio loading" },
      { id: "media-video-storyboard", label: "Grid sweep", description: "Video loader reusing the image grid-sweep style before revealing a video player demo.", section: "Video loading" },
      { id: "media-video-cinema", label: "Dot flicker", description: "Video loader reusing the image dot-flicker style before revealing a video player demo.", section: "Video loading" },
      { id: "media-video-timeline", label: "Blur flow", description: "Video loader reusing the image blur-flow style before revealing a video player demo.", section: "Video loading" },
      { id: "media-video-frames", label: "Glow loading", description: "Video loader reusing the image glow-loading style before revealing a video player demo.", section: "Video loading" },
    ],
  },
  {
    id: "conversation",
    label: "Conversation",
    options: [
      { id: "writing-smooth", label: "Smooth stream", description: "Render assistant text as a steady stream without extra ceremony.", section: "Writing" },
      { id: "writing-typewriter", label: "Typewriter", description: "Use a measured character-by-character writing rhythm for focused chat.", section: "Writing" },
      { id: "writing-chunked", label: "Chunked", description: "Reveal output in readable phrase chunks for long-form answers.", section: "Writing" },
      { id: "speaker-labels", label: "Speaker labels", description: "Show YOU and AGENT labels on chat turns.", section: "Message chrome" },
      { id: "message-actions", label: "Message actions", description: "Expose role-specific copy, regenerate, and edit-rerun controls at message level.", section: "Recovery" },
    ],
  },
  {
    id: "sidebar",
    label: "Sidebar",
    options: [
      { id: "sidebar-visible", label: "Show sidebar", description: "Show the conversation-history sidebar in the product shell.", section: "Layout" },
      { id: "sidebar-new-button", label: "New chat button", description: "Show the new-chat action at the top of the sidebar.", section: "Content" },
      { id: "sidebar-search", label: "Search box", description: "Show a search field for filtering conversations.", section: "Content" },
      { id: "sidebar-grouping", label: "Group by date", description: "Group sessions under Today and Earlier headers.", section: "Content" },
      { id: "sidebar-footer", label: "Version", description: "Show the current version at the bottom of the sidebar.", section: "Content" },
    ],
  },
  {
    id: "ux-effects",
    label: "Thinking",
    options: [
      { id: "thinking-wave", label: "Dots", description: "Animated thinking dots in the chat flow.", section: "Motion" },
      { id: "thinking-pulse", label: "Infinity trail", description: "An infinity-path motion for active reasoning.", section: "Motion" },
      { id: "thinking-shimmer", label: "Shimmer text", description: "A light sweep across the Thinking text.", section: "Motion" },
      { id: "thinking-bars", label: "Wave bars", description: "Small equalizer bars for active reasoning.", section: "Motion" },
      { id: "thinking-orbit", label: "Orbit dot", description: "A compact dot orbit inspired by ring loaders.", section: "Motion" },
      { id: "thinking-orb-s1", label: "Lattice wave", description: "A 3 by 3 lattice that radiates from the center.", section: "Motion" },
      { id: "thinking-orb-b5", label: "Focus handoff", description: "Layered dots crossing the focal plane in a soft handoff.", section: "Motion" },
      { id: "thinking-orb-m2", label: "Expanding ring", description: "Eight dots expanding and collapsing through a rotating ring.", section: "Motion" },
      { id: "summary-first", label: "Summary before details", description: "Show a safe public reasoning summary before tool and code details. This is not raw chain-of-thought.", section: "Disclosure" },
      { id: "reasoning-auto-collapse", label: "Auto collapse", description: "Keep reasoning compact after the run while preserving expansion controls.", section: "Disclosure" },
      { id: "reasoning-expanded", label: "Expanded by default", description: "Open the reasoning block when the workflow benefits from inspection.", section: "Disclosure" },
      { id: "reasoning-status-only", label: "Status only", description: "Show only the current reasoning state for the lowest-noise scaffold.", section: "Visibility" },
      { id: "reasoning-public-summary", label: "Public summary", description: "Show developer-safe summary text without exposing hidden reasoning.", section: "Visibility" },
    ],
  },
  {
    id: "tool-calls",
    label: "Tool Calls",
    options: [
      { id: "command-cards", label: "Collapsed cards", description: "Show tool calls as collapsed rows with an expand control for inspecting details.", section: "Tool display" },
      { id: "compact-chips", label: "Expanded rows", description: "Show tool calls expanded by default without a disclosure button.", section: "Tool display" },
      { id: "timeline-rail", label: "Timeline detail", description: "Show expanded tool calls with a 1px timeline rail on the left.", section: "Tool display" },
      { id: "tool-detail-full", label: "Input and output", description: "Show safe tool arguments and visible results inside expanded tools.", section: "Details" },
      { id: "tool-detail-output-only", label: "Output only", description: "Hide tool arguments and keep only the result surface visible.", section: "Details" },
    ],
  },
  {
    id: "blocks",
    label: "Blocks",
    options: [
      { id: "error-collapse", label: "Error collapse", description: "Toggle user-safe error copy with debug detail kept out of the main chat.", section: "Failure states" },
    ],
  },
  {
    id: "composer",
    label: "Composer",
    options: [
      { id: "upload", label: "Upload", description: "Expose file attachment for repo context, logs, and screenshots.", section: "Features" },
      { id: "mic", label: "Mic", description: "Add an optional voice input affordance without changing text flow.", section: "Features" },
      { id: "budget", label: "Thinking budget", description: "Keep reasoning budget visible for high-variance coding runs.", section: "Features" },
      { id: "model-config", label: "Model config", description: "Show the model selector in the composer toolbar.", section: "Features" },
      { id: "model-tools", label: "Ask approval", description: "Show the composer approval affordance beside model selection.", section: "Permissions" },
      { id: "tool-approval-inline", label: "Inline approval", description: "Show Yes, Always, and No approval actions inside the tool card.", section: "Permissions" },
      { id: "tool-approval-hidden", label: "External approval", description: "Move Yes, Always, and No actions out of the tool card and into the chat timeline.", section: "Permissions" },
      { id: "prompt-shortcuts", label: "Prompt chips", description: "Offer reusable prompts without turning the composer into a library.", section: "Shortcuts" },
    ],
  },
  {
    id: "provider",
    label: "Provider",
    options: [
      {
        id: "provider-settings-launcher",
        label: "Settings gear",
        description: "Add a bottom-left provider settings launcher to the generated agent UI.",
        section: "Provider UI",
      },
      ...providerCatalog.map((provider) => ({
        id: `provider-${provider.id}`,
        label: provider.label,
        description: provider.description,
        section: provider.kind === "custom" ? "Custom provider" : provider.id === "local" ? "Local runtime" : "Hosted providers",
      })),
    ],
  },
  {
    id: "output",
    label: "Output",
    options: [
      { id: "output-visible", label: "Show output panel", description: "Show the output/artifact panel in the product shell.", section: "Layout" },
      { id: "output-source-artifact", label: "Latest artifact", description: "Use the newest AgentUX artifact as the output source.", section: "Source" },
      { id: "output-source-console", label: "Console logs", description: "Use run and tool output logs instead of artifact content.", section: "Source" },
    ],
  },
  {
    id: "render",
    label: "Render",
    options: [
      { id: "renderer-auto", label: "Auto renderer", description: "Pick code, diff, markdown, preview, or data from artifact metadata.", section: "Artifact renderer" },
      { id: "renderer-code", label: "Code", description: "Render code artifacts with copyable developer formatting.", section: "Artifact renderer" },
      { id: "renderer-diff", label: "Diff", description: "Render patch artifacts with stable gutters and change markers.", section: "Artifact renderer" },
      { id: "renderer-markdown", label: "Markdown", description: "Render markdown artifacts as structured document output.", section: "Artifact renderer" },
      { id: "renderer-preview", label: "HTML / app preview", description: "Render visual or document artifacts as a preview surface.", section: "Artifact renderer" },
      { id: "renderer-data", label: "Data / form", description: "Render structured data, forms, and JSON-backed artifacts.", section: "Artifact renderer" },
    ],
  },
  {
    id: "git",
    label: "Git",
    options: [
      { id: "git-visible", label: "Show Git panel", description: "Show the Git panel in the product shell.", section: "Layout" },
      { id: "branch-status", label: "Branch status", description: "Show current branch, dirty state, and ahead/behind summary.", section: "Review" },
      { id: "changed-files", label: "Changed files", description: "Show a compact file list with per-file change state.", section: "Review" },
      { id: "diff-preview", label: "Diff preview", description: "Keep a bounded inline diff in the utility panel.", section: "Review" },
      { id: "commit-message", label: "Commit message", description: "Suggest commit copy without changing action permissions.", section: "Commit" },
      { id: "commit-action", label: "Commit action", description: "Allow the scaffold UI to expose a commit command.", section: "Commit" },
    ],
  },
  {
    id: "theme",
    label: "Theme",
    options: themeOptions,
  },
];

export function templateSupportsGit(template: AgentCanvasTemplate): boolean {
  return template === "coding" || template === "tool-heavy";
}

export function presetGroupsForTemplate(template: AgentCanvasTemplate): PresetGroup[] {
  return presetGroups.filter((group) => group.id !== "git" || templateSupportsGit(template));
}

export function presetGroupsForProject(project: AgentFrontendProject): PresetGroup[] {
  return presetGroupsForTemplate(project.template);
}

export function resolvePresetGroupSelection(
  selectedGroup: PresetGroupId,
  template: AgentCanvasTemplate,
): PresetGroupId {
  const visibleGroups = presetGroupsForTemplate(template);
  return visibleGroups.some((group) => group.id === selectedGroup) ? selectedGroup : (visibleGroups[0]?.id ?? "conversation");
}

export function projectPresetSummary(project: AgentFrontendProject): string[] {
  return [
    project.template,
    project.runtime.harness,
    project.providers.defaultProviderId,
    project.theme.motion.writing,
    project.theme.motion.reasoning,
    project.theme.motion.toolCall,
    project.output.source,
    project.output.artifactRenderer,
    project.output.surface,
    project.mediaGeneration.imageStyle,
    project.mediaGeneration.audioStyle,
    project.mediaGeneration.videoStyle,
    project.runtime.transport,
  ];
}
