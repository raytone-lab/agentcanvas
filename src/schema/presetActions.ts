import {
  createProviderConnection,
  defaultCodingAgentProject,
  enabledProviderConnections,
  providerCatalog,
  providerOptionForId,
  type AgentFrontendProject,
  type MediaGenerationAudioStyle,
  type MediaGenerationImageStyle,
  type MediaGenerationVideoStyle,
  type ProviderCatalogId,
} from "./agentuxConfig";
import { isThemePresetId, minimalThemePresetIds, nativeThemePresetIds, type ThemePresetId } from "../theme/themeTokens";

export type PresetPatch = (project: AgentFrontendProject) => AgentFrontendProject;

function withOutputSurface(
  project: AgentFrontendProject,
  surface: AgentFrontendProject["output"]["surface"],
): AgentFrontendProject {
  return {
    ...project,
    layout: {
      ...project.layout,
      slots: project.layout.slots.map((slot) =>
        slot.component === "OutputFrame" ? { ...slot, region: surface } : slot,
      ),
    },
    output: { ...project.output, surface },
  };
}

function toggleSlotEnabled(
  project: AgentFrontendProject,
  component: AgentFrontendProject["layout"]["slots"][number]["component"],
): AgentFrontendProject {
  return {
    ...project,
    layout: {
      ...project.layout,
      slots: project.layout.slots.map((slot) =>
        slot.component === component ? { ...slot, enabled: !slot.enabled } : slot,
      ),
    },
  };
}

function slotEnabled(
  project: AgentFrontendProject,
  component: AgentFrontendProject["layout"]["slots"][number]["component"],
): boolean {
  return project.layout.slots.some((slot) => slot.component === component && slot.enabled);
}

function withProviderConnection(project: AgentFrontendProject, id: ProviderCatalogId): AgentFrontendProject {
  const option = providerOptionForId(id);
  const existingProvider = project.providers.connections.find((provider) => provider.id === option.connectionId);
  const isEnabling = !existingProvider?.enabled;
  const enabledCount = enabledProviderConnections(project).length;
  const connections = existingProvider
    ? project.providers.connections.map((provider) => {
      if (provider.id !== option.connectionId) {
        return provider;
      }

      if (provider.enabled && enabledCount <= 1) {
        return provider;
      }

      return { ...provider, enabled: !provider.enabled };
    })
    : [...project.providers.connections, createProviderConnection(id, true)];

  const nextEnabled = connections.filter((provider) => provider.enabled);
  const defaultProviderId = isEnabling
    ? option.connectionId
    : nextEnabled.some((provider) => provider.id === project.providers.defaultProviderId)
      ? project.providers.defaultProviderId
      : (nextEnabled[0]?.id ?? option.connectionId);

  return {
    ...project,
    providers: {
      ...project.providers,
      defaultProviderId,
      connections,
    },
  };
}

const providerPresetIds: Partial<Record<string, ProviderCatalogId>> = Object.fromEntries(
  providerCatalog.map((provider) => [`provider-${provider.id}`, provider.id]),
);

const selectableThemePresetIds: readonly ThemePresetId[] = [...nativeThemePresetIds, ...minimalThemePresetIds];

const mediaGenerationPresetConfig = {
  "media-image-grid": { kind: "imageStyle", style: "grid" },
  "media-image-blur": { kind: "imageStyle", style: "blur" },
  "media-image-palette": { kind: "imageStyle", style: "palette" },
  "media-image-layers": { kind: "imageStyle", style: "layers" },
  "media-audio-skeleton": { kind: "audioStyle", style: "skeleton" },
  "media-audio-waveform": { kind: "audioStyle", style: "waveform" },
  "media-video-storyboard": { kind: "videoStyle", style: "storyboard" },
  "media-video-cinema": { kind: "videoStyle", style: "cinema" },
  "media-video-timeline": { kind: "videoStyle", style: "timeline" },
  "media-video-frames": { kind: "videoStyle", style: "frames" },
} as const satisfies Record<
  string,
  | { kind: "imageStyle"; style: MediaGenerationImageStyle }
  | { kind: "audioStyle"; style: MediaGenerationAudioStyle }
  | { kind: "videoStyle"; style: MediaGenerationVideoStyle }
>;

const mediaGenerationPresetPatches: Record<string, PresetPatch> = Object.fromEntries(
  Object.entries(mediaGenerationPresetConfig).map(([optionId, config]) => [
    optionId,
    (project: AgentFrontendProject) => ({
      ...project,
      mediaGeneration: {
        ...project.mediaGeneration,
        [config.kind]: config.style,
      },
    }),
  ]),
);

const setThemePreset = (preset: ThemePresetId): PresetPatch =>
  (project) => ({
    ...project,
    theme: { ...project.theme, preset },
  });

const themePresetPatches: Record<string, PresetPatch> = Object.fromEntries(
  selectableThemePresetIds.map((preset) => [preset, setThemePreset(preset)]),
);

const presetPatches: Record<string, PresetPatch> = {
  "writing-smooth": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, writing: "smooth-stream" } },
  }),
  "writing-typewriter": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, writing: "typewriter" } },
  }),
  "writing-chunked": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, writing: "chunked" } },
  }),
  "speaker-labels": (project) => ({
    ...project,
    conversation: { ...project.conversation, speakerLabels: !project.conversation.speakerLabels },
  }),
  "message-actions": (project) => {
    const enabled = !(
      project.conversation.messageActions.copy &&
      project.conversation.messageActions.regenerate &&
      project.conversation.messageActions.edit
    );
    return {
      ...project,
      conversation: {
        ...project.conversation,
        messageActions: {
          copy: enabled,
          regenerate: enabled,
          edit: enabled,
        },
      },
    };
  },
  "sidebar-visible": (project) => toggleSlotEnabled(project, "SessionSidebar"),
  "sidebar-new-button": (project) => ({
    ...project,
    sidebar: { ...project.sidebar, newButton: !project.sidebar.newButton },
  }),
  "sidebar-search": (project) => ({
    ...project,
    sidebar: { ...project.sidebar, search: !project.sidebar.search },
  }),
  "sidebar-grouping": (project) => ({
    ...project,
    sidebar: { ...project.sidebar, grouping: !project.sidebar.grouping },
  }),
  "sidebar-footer": (project) => ({
    ...project,
    sidebar: { ...project.sidebar, footer: !project.sidebar.footer },
  }),
  "thinking-wave": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "wave" } },
    reasoning: { ...project.reasoning, show: "summary", collapse: "summary-first" },
  }),
  "thinking-pulse": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "pulse" } },
    reasoning: { ...project.reasoning, show: "summary", collapse: "summary-first" },
  }),
  "thinking-terminal": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "terminal" } },
    reasoning: { ...project.reasoning, show: "summary", collapse: "expanded" },
  }),
  "thinking-minimal": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "minimal" } },
    reasoning: { ...project.reasoning, show: "status", collapse: "auto" },
  }),
  "thinking-shimmer": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "shimmer" } },
    reasoning: { ...project.reasoning, show: "summary", collapse: "summary-first" },
  }),
  "thinking-bars": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "bars" } },
    reasoning: { ...project.reasoning, show: "summary", collapse: "summary-first" },
  }),
  "thinking-orbit": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "orbit" } },
    reasoning: { ...project.reasoning, show: "summary", collapse: "summary-first" },
  }),
  "thinking-orb-s1": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "orb-s1" } },
    reasoning: { ...project.reasoning, show: "summary", collapse: "summary-first" },
  }),
  "thinking-orb-b5": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "orb-b5" } },
    reasoning: { ...project.reasoning, show: "summary", collapse: "summary-first" },
  }),
  "thinking-orb-m2": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "orb-m2" } },
    reasoning: { ...project.reasoning, show: "summary", collapse: "summary-first" },
  }),
  "summary-first": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, show: "summary", collapse: "summary-first", expandable: true },
  }),
  "reasoning-auto-collapse": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, collapse: "auto", expandable: true },
  }),
  "reasoning-expanded": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, show: "summary", collapse: "expanded", expandable: true },
  }),
  "reasoning-status-only": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, show: "status", collapse: "auto" },
  }),
  "reasoning-public-summary": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, show: "summary", collapse: "summary-first", expandable: true },
  }),
  /**
   * The only option that sets `show: "thinking"`.
   *
   * The value existed in the schema and in `ReasoningBlock` from the start but nothing ever
   * selected it, so the branch was unreachable and live runs always fell back to the generic
   * summary. Opt-in rather than default: a provider's chain of thought is content the composer
   * should choose to surface, not something that appears because a key was pasted.
   */
  "reasoning-model-thinking": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, show: "thinking", collapse: "summary-first", expandable: true },
  }),
  "command-cards": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, toolCall: "card" } },
  }),
  "compact-chips": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, toolCall: "expanded" } },
  }),
  "timeline-rail": (project) => ({
    ...project,
    toolCalls: { ...project.toolCalls, timelineRail: !project.toolCalls.timelineRail },
  }),
  "terminal-log": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, toolCall: "drawer" } },
    output: { ...project.output, source: "console" },
  }),
  "tool-detail-full": (project) => ({
    ...project,
    toolCalls: { ...project.toolCalls, detail: "full" },
  }),
  "tool-detail-output-only": (project) => ({
    ...project,
    toolCalls: { ...project.toolCalls, detail: "output-only" },
  }),
  "tool-detail-summary": (project) => ({
    ...project,
    toolCalls: { ...project.toolCalls, detail: "summary" },
  }),
  "tool-progress-icon": (project) => ({
    ...project,
    toolCalls: { ...project.toolCalls, progress: "status-icon" },
  }),
  "tool-progress-bar": (project) => ({
    ...project,
    toolCalls: {
      ...project.toolCalls,
      progress: "bar",
    },
  }),
  "tool-approval-inline": (project) => ({
    ...project,
    toolCalls: { ...project.toolCalls, approval: "inline" },
  }),
  "tool-approval-hidden": (project) => ({
    ...project,
    toolCalls: { ...project.toolCalls, approval: "hidden" },
  }),
  "code-diff": (project) => ({
    ...project,
    blocks: { ...project.blocks, codeDiff: !(project.blocks.codeDiff && project.output.artifactRenderer === "diff") },
    output: {
      ...project.output,
      source: "artifact",
      artifactRenderer: project.blocks.codeDiff && project.output.artifactRenderer === "diff" ? "auto" : "diff",
    },
  }),
  "error-collapse": (project) => ({
    ...project,
    blocks: { ...project.blocks, errorCollapse: !project.blocks.errorCollapse },
    reasoning: { ...project.reasoning, collapse: "summary-first", expandable: true },
  }),
  "tool-log-tail": (project) => ({
    ...project,
    blocks: { ...project.blocks, toolLogTail: !project.blocks.toolLogTail },
  }),
  upload: (project) => ({
    ...project,
    composer: { ...project.composer, fileUpload: !project.composer.fileUpload },
  }),
  mic: (project) => ({
    ...project,
    composer: { ...project.composer, mic: !project.composer.mic },
  }),
  budget: (project) => ({
    ...project,
    composer: { ...project.composer, thinkingBudget: !project.composer.thinkingBudget },
  }),
  "model-config": (project) => ({
    ...project,
    composer: { ...project.composer, modelSwitcher: !project.composer.modelSwitcher },
  }),
  "model-tools": (project) => {
    const enabled = !project.composer.toolToggle;
    return {
      ...project,
      composer: { ...project.composer, toolToggle: enabled },
    };
  },
  "prompt-shortcuts": (project) => ({
    ...project,
    composer: { ...project.composer, promptShortcuts: !project.composer.promptShortcuts },
  }),
  "provider-settings-launcher": (project) => ({
    ...project,
    providers: { ...project.providers, settingsLauncher: !project.providers.settingsLauncher },
  }),
  "output-visible": (project) => toggleSlotEnabled(project, "OutputFrame"),
  "git-visible": (project) => toggleSlotEnabled(project, "GitFrame"),
  "output-source-artifact": (project) => ({
    ...project,
    output: { ...project.output, source: "artifact" },
  }),
  "output-source-console": (project) => ({
    ...project,
    output: { ...project.output, source: "console" },
  }),
  "renderer-auto": (project) => ({
    ...project,
    output: { ...project.output, source: "artifact", artifactRenderer: "auto" },
  }),
  "renderer-code": (project) => ({
    ...project,
    output: { ...project.output, source: "artifact", artifactRenderer: "code" },
  }),
  "renderer-diff": (project) => ({
    ...project,
    blocks: { ...project.blocks, codeDiff: true },
    output: { ...project.output, source: "artifact", artifactRenderer: "diff" },
  }),
  "renderer-markdown": (project) => ({
    ...project,
    output: { ...project.output, source: "artifact", artifactRenderer: "markdown" },
  }),
  "renderer-preview": (project) => ({
    ...project,
    output: { ...project.output, source: "artifact", artifactRenderer: "preview" },
  }),
  "renderer-data": (project) => ({
    ...project,
    output: { ...project.output, source: "artifact", artifactRenderer: "data" },
  }),
  "surface-right-panel": (project) => ({
    ...withOutputSurface(project, "right-panel"),
  }),
  "surface-overlay": (project) => ({
    ...withOutputSurface(project, "overlay"),
  }),
  "branch-status": (project) => ({
    ...project,
    git: { ...project.git, showBranchStatus: !project.git.showBranchStatus },
  }),
  "changed-files": (project) => ({
    ...project,
    git: { ...project.git, showChangedFiles: !project.git.showChangedFiles },
  }),
  "diff-preview": (project) => ({
    ...project,
    git: { ...project.git, showDiff: !project.git.showDiff },
  }),
  "commit-message": (project) => ({
    ...project,
    git: { ...project.git, suggestCommitMessage: !project.git.suggestCommitMessage },
  }),
  "commit-action": (project) => ({
    ...project,
    git: { ...project.git, allowCommit: !project.git.allowCommit },
  }),
  ...mediaGenerationPresetPatches,
  ...themePresetPatches,
};

export function applyPresetOption(project: AgentFrontendProject, optionId: string): AgentFrontendProject {
  const providerId = providerPresetIds[optionId];
  if (providerId) {
    return withProviderConnection(project, providerId);
  }

  return (presetPatches[optionId] ?? ((current) => current))(project);
}

// Cancelling a single-select option returns the field(s) it controls to the
// baseline default. (Boolean toggles are cancelled by re-applying their patch,
// which flips them off, so they need no entry here.)
const base = defaultCodingAgentProject;
const revertMotion = (key: "writing" | "reasoning" | "toolCall"): PresetPatch =>
  (project) => ({ ...project, theme: { ...project.theme, motion: { ...project.theme.motion, [key]: base.theme.motion[key] } } });
const revertReasoning = (key: "show" | "collapse"): PresetPatch =>
  (project) => ({ ...project, reasoning: { ...project.reasoning, [key]: base.reasoning[key] } });
const revertToolCalls = (key: "detail" | "progress" | "approval" | "timelineRail"): PresetPatch =>
  (project) => ({ ...project, toolCalls: { ...project.toolCalls, [key]: base.toolCalls[key] } });
const revertOutput = (patch: Partial<AgentFrontendProject["output"]>): PresetPatch =>
  (project) => ({ ...project, output: { ...project.output, ...patch } });
const revertMediaGeneration = (key: keyof AgentFrontendProject["mediaGeneration"]): PresetPatch =>
  (project) => ({ ...project, mediaGeneration: { ...project.mediaGeneration, [key]: base.mediaGeneration[key] } });
const themePresetDeactivators: Record<string, PresetPatch> = Object.fromEntries(
  selectableThemePresetIds.map((preset) => [preset, setThemePreset(base.theme.preset)]),
);
const mediaGenerationPresetDeactivators: Record<string, PresetPatch> = Object.fromEntries(
  Object.entries(mediaGenerationPresetConfig).map(([optionId, config]) => [optionId, revertMediaGeneration(config.kind)]),
);

const presetDeactivators: Record<string, PresetPatch> = {
  "writing-smooth": revertMotion("writing"),
  "writing-typewriter": revertMotion("writing"),
  "writing-chunked": revertMotion("writing"),
  "thinking-wave": revertMotion("reasoning"),
  "thinking-pulse": revertMotion("reasoning"),
  "thinking-terminal": revertMotion("reasoning"),
  "thinking-minimal": revertMotion("reasoning"),
  "thinking-shimmer": revertMotion("reasoning"),
  "thinking-bars": revertMotion("reasoning"),
  "thinking-orbit": revertMotion("reasoning"),
  "thinking-orb-s1": revertMotion("reasoning"),
  "thinking-orb-b5": revertMotion("reasoning"),
  "thinking-orb-m2": revertMotion("reasoning"),
  "summary-first": revertReasoning("collapse"),
  "reasoning-auto-collapse": revertReasoning("collapse"),
  "reasoning-expanded": revertReasoning("collapse"),
  "reasoning-status-only": revertReasoning("show"),
  "reasoning-public-summary": revertReasoning("show"),
  "reasoning-model-thinking": revertReasoning("show"),
  "command-cards": revertMotion("toolCall"),
  "compact-chips": revertMotion("toolCall"),
  "timeline-rail": revertToolCalls("timelineRail"),
  "terminal-log": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, toolCall: base.theme.motion.toolCall } },
    output: { ...project.output, source: base.output.source },
  }),
  "tool-detail-full": revertToolCalls("detail"),
  "tool-detail-output-only": revertToolCalls("detail"),
  "tool-detail-summary": revertToolCalls("detail"),
  "tool-progress-icon": revertToolCalls("progress"),
  "tool-progress-bar": revertToolCalls("progress"),
  "tool-approval-inline": revertToolCalls("approval"),
  "tool-approval-hidden": revertToolCalls("approval"),
  "output-source-artifact": revertOutput({ source: base.output.source }),
  "output-source-console": revertOutput({ source: base.output.source }),
  "renderer-auto": revertOutput({ artifactRenderer: base.output.artifactRenderer }),
  "renderer-code": revertOutput({ artifactRenderer: base.output.artifactRenderer }),
  "renderer-diff": revertOutput({ artifactRenderer: base.output.artifactRenderer }),
  "renderer-markdown": revertOutput({ artifactRenderer: base.output.artifactRenderer }),
  "renderer-preview": revertOutput({ artifactRenderer: base.output.artifactRenderer }),
  "renderer-data": revertOutput({ artifactRenderer: base.output.artifactRenderer }),
  "surface-right-panel": (project) => withOutputSurface(project, base.output.surface),
  "surface-overlay": (project) => withOutputSurface(project, base.output.surface),
  ...mediaGenerationPresetDeactivators,
  ...themePresetDeactivators,
};

/**
 * Unified select/cancel: click an inactive option to apply it, click the active
 * option again to cancel it. Single-select options revert to the baseline
 * default; boolean toggles flip off via their own patch.
 */
export function togglePresetOption(project: AgentFrontendProject, optionId: string): AgentFrontendProject {
  if (!isPresetOptionActive(project, optionId)) {
    return applyPresetOption(project, optionId);
  }
  const deactivate = presetDeactivators[optionId];
  return deactivate ? deactivate(project) : applyPresetOption(project, optionId);
}

export function isPresetOptionActive(project: AgentFrontendProject, optionId: string): boolean {
  const providerId = providerPresetIds[optionId];
  if (providerId) {
    const option = providerOptionForId(providerId);
    return project.providers.connections.some((provider) => provider.id === option.connectionId && provider.enabled);
  }
  if (isThemePresetId(optionId)) {
    return project.theme.preset === optionId;
  }

  switch (optionId) {
    case "writing-smooth":
      return project.theme.motion.writing === "smooth-stream";
    case "writing-typewriter":
      return project.theme.motion.writing === "typewriter";
    case "writing-chunked":
      return project.theme.motion.writing === "chunked";
    case "speaker-labels":
      return project.conversation.speakerLabels;
    case "message-actions":
      return project.conversation.messageActions.copy &&
        project.conversation.messageActions.regenerate &&
        project.conversation.messageActions.edit;
    case "sidebar-visible":
      return slotEnabled(project, "SessionSidebar");
    case "output-visible":
      return slotEnabled(project, "OutputFrame");
    case "git-visible":
      return slotEnabled(project, "GitFrame");
    case "sidebar-new-button":
      return project.sidebar.newButton;
    case "sidebar-search":
      return project.sidebar.search;
    case "sidebar-grouping":
      return project.sidebar.grouping;
    case "sidebar-footer":
      return project.sidebar.footer;
    case "thinking-wave":
      return project.theme.motion.reasoning === "wave";
    case "thinking-pulse":
      return project.theme.motion.reasoning === "pulse";
    case "thinking-terminal":
      return project.theme.motion.reasoning === "terminal";
    case "thinking-minimal":
      return project.theme.motion.reasoning === "minimal";
    case "thinking-shimmer":
      return project.theme.motion.reasoning === "shimmer";
    case "thinking-bars":
      return project.theme.motion.reasoning === "bars";
    case "thinking-orbit":
      return project.theme.motion.reasoning === "orbit";
    case "thinking-orb-s1":
      return project.theme.motion.reasoning === "orb-s1";
    case "thinking-orb-b5":
      return project.theme.motion.reasoning === "orb-b5";
    case "thinking-orb-m2":
      return project.theme.motion.reasoning === "orb-m2";
    case "summary-first":
      return project.reasoning.collapse === "summary-first";
    case "reasoning-auto-collapse":
      return project.reasoning.collapse === "auto";
    case "reasoning-expanded":
      return project.reasoning.collapse === "expanded";
    case "reasoning-status-only":
      return project.reasoning.show === "status";
    case "reasoning-public-summary":
      return project.reasoning.show === "summary";
    case "reasoning-model-thinking":
      return project.reasoning.show === "thinking";
    case "command-cards":
      return project.theme.motion.toolCall === "card";
    case "compact-chips":
      return project.theme.motion.toolCall === "expanded";
    case "timeline-rail":
      return project.toolCalls.timelineRail;
    case "terminal-log":
      return project.theme.motion.toolCall === "drawer" || project.output.source === "console";
    case "tool-detail-full":
      return project.toolCalls.detail === "full";
    case "tool-detail-output-only":
      return project.toolCalls.detail === "output-only";
    case "tool-detail-summary":
      return project.toolCalls.detail === "summary";
    case "tool-progress-icon":
      return project.toolCalls.progress === "status-icon";
    case "tool-progress-bar":
      return project.toolCalls.progress === "bar";
    case "tool-approval-inline":
      return project.toolCalls.approval === "inline";
    case "tool-approval-hidden":
      return project.toolCalls.approval === "hidden";
    case "code-diff":
      return project.blocks.codeDiff && project.output.artifactRenderer === "diff";
    case "error-collapse":
      return project.blocks.errorCollapse;
    case "tool-log-tail":
      return project.blocks.toolLogTail;
    case "upload":
      return project.composer.fileUpload;
    case "mic":
      return project.composer.mic;
    case "budget":
      return project.composer.thinkingBudget;
    case "model-config":
      return project.composer.modelSwitcher;
    case "model-tools":
      return project.composer.toolToggle;
    case "prompt-shortcuts":
      return project.composer.promptShortcuts;
    case "provider-settings-launcher":
      return project.providers.settingsLauncher;
    case "output-source-artifact":
      return project.output.source === "artifact";
    case "output-source-console":
      return project.output.source === "console";
    case "renderer-auto":
      return project.output.source === "artifact" && project.output.artifactRenderer === "auto";
    case "renderer-code":
      return project.output.source === "artifact" && project.output.artifactRenderer === "code";
    case "renderer-diff":
      return project.output.source === "artifact" && project.output.artifactRenderer === "diff";
    case "renderer-markdown":
      return project.output.source === "artifact" && project.output.artifactRenderer === "markdown";
    case "renderer-preview":
      return project.output.source === "artifact" && project.output.artifactRenderer === "preview";
    case "renderer-data":
      return project.output.source === "artifact" && project.output.artifactRenderer === "data";
    case "surface-right-panel":
      return project.output.surface === "right-panel";
    case "surface-overlay":
      return project.output.surface === "overlay";
    case "media-image-grid":
      return project.mediaGeneration.imageStyle === "grid";
    case "media-image-blur":
      return project.mediaGeneration.imageStyle === "blur";
    case "media-image-palette":
      return project.mediaGeneration.imageStyle === "palette";
    case "media-image-layers":
      return project.mediaGeneration.imageStyle === "layers";
    case "media-audio-waveform":
      return project.mediaGeneration.audioStyle === "waveform";
    case "media-audio-skeleton":
      return project.mediaGeneration.audioStyle === "skeleton";
    case "media-video-storyboard":
      return project.mediaGeneration.videoStyle === "storyboard";
    case "media-video-cinema":
      return project.mediaGeneration.videoStyle === "cinema";
    case "media-video-timeline":
      return project.mediaGeneration.videoStyle === "timeline";
    case "media-video-frames":
      return project.mediaGeneration.videoStyle === "frames";
    case "branch-status":
      return project.git.showBranchStatus;
    case "changed-files":
      return project.git.showChangedFiles;
    case "diff-preview":
      return project.git.showDiff;
    case "commit-message":
      return project.git.suggestCommitMessage;
    case "commit-action":
      return project.git.allowCommit;
    default:
      return false;
  }
}
