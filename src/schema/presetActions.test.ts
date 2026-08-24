import { describe, expect, it } from "vitest";

import {
  defaultCodingAgentProject,
  defaultProviderConnection,
  enabledProviderConnections,
} from "./agentuxConfig";
import { applyPresetOption, isPresetOptionActive } from "./presetActions";

describe("preset actions", () => {
  it("writes UX preset choices back to the scaffold schema", () => {
    const compact = applyPresetOption(defaultCodingAgentProject, "compact-chips");

    expect(compact.theme.motion.toolCall).toBe("expanded");
    expect(compact.toolCalls.detail).toBe(defaultCodingAgentProject.toolCalls.detail);
    expect(isPresetOptionActive(compact, "compact-chips")).toBe(true);
    expect(isPresetOptionActive(compact, "command-cards")).toBe(false);
    expect(isPresetOptionActive(compact, "tool-detail-summary")).toBe(false);
  });

  it("supports tool call layout, detail, progress, and approval presets", () => {
    const timeline = applyPresetOption(defaultCodingAgentProject, "timeline-rail");
    const timelineCompact = applyPresetOption(timeline, "compact-chips");
    const outputOnly = applyPresetOption(timeline, "tool-detail-output-only");
    const progressBar = applyPresetOption(outputOnly, "tool-progress-bar");
    const externalApproval = applyPresetOption(progressBar, "tool-approval-hidden");

    expect(timeline.theme.motion.toolCall).toBe("card");
    expect(timeline.toolCalls.timelineRail).toBe(true);
    expect(timelineCompact.theme.motion.toolCall).toBe("expanded");
    expect(timelineCompact.toolCalls.timelineRail).toBe(true);
    expect(isPresetOptionActive(timelineCompact, "compact-chips")).toBe(true);
    expect(isPresetOptionActive(timelineCompact, "command-cards")).toBe(false);
    expect(isPresetOptionActive(timelineCompact, "timeline-rail")).toBe(true);
    expect(outputOnly.theme.motion.toolCall).toBe("card");
    expect(outputOnly.toolCalls.detail).toBe("output-only");
    expect(progressBar.toolCalls.progress).toBe("bar");
    expect(externalApproval.toolCalls.approval).toBe("hidden");
    expect(isPresetOptionActive(externalApproval, "command-cards")).toBe(true);
    expect(isPresetOptionActive(externalApproval, "timeline-rail")).toBe(true);
    expect(isPresetOptionActive(externalApproval, "tool-detail-output-only")).toBe(true);
    expect(isPresetOptionActive(externalApproval, "tool-progress-bar")).toBe(true);
    expect(isPresetOptionActive(externalApproval, "tool-approval-hidden")).toBe(true);
    expect(isPresetOptionActive(externalApproval, "tool-approval-inline")).toBe(false);
  });

  it("toggles composer capabilities without mutating the source project", () => {
    const next = applyPresetOption(defaultCodingAgentProject, "mic");

    expect(defaultCodingAgentProject.composer.mic).toBe(false);
    expect(next.composer.mic).toBe(true);
    expect(isPresetOptionActive(next, "mic")).toBe(true);
  });

  it("keeps prompt shortcut chips opt-in", () => {
    const next = applyPresetOption(defaultCodingAgentProject, "prompt-shortcuts");

    expect(defaultCodingAgentProject.composer.promptShortcuts).toBe(false);
    expect(next.composer.promptShortcuts).toBe(true);
    expect(isPresetOptionActive(next, "prompt-shortcuts")).toBe(true);
  });

  it("supports media generation presets as image, audio, and video single-select groups", () => {
    const image = applyPresetOption(applyPresetOption(defaultCodingAgentProject, "media-image-palette"), "media-image-layers");
    const audio = applyPresetOption(applyPresetOption(image, "media-audio-skeleton"), "media-audio-waveform");
    const video = applyPresetOption(applyPresetOption(audio, "media-video-cinema"), "media-video-frames");

    expect(video.mediaGeneration).toEqual({
      imageStyle: "layers",
      audioStyle: "waveform",
      videoStyle: "frames",
    });
    expect(isPresetOptionActive(video, "media-image-layers")).toBe(true);
    expect(isPresetOptionActive(video, "media-image-palette")).toBe(false);
    expect(isPresetOptionActive(video, "media-audio-waveform")).toBe(true);
    expect(isPresetOptionActive(video, "media-audio-skeleton")).toBe(false);
    expect(isPresetOptionActive(video, "media-video-frames")).toBe(true);
    expect(isPresetOptionActive(video, "media-video-cinema")).toBe(false);
  });

  it("tracks model config separately from the approval affordance", () => {
    const withoutModelConfig = applyPresetOption(defaultCodingAgentProject, "model-config");
    const withoutApproval = applyPresetOption(defaultCodingAgentProject, "model-tools");

    expect(defaultCodingAgentProject.composer.modelSwitcher).toBe(true);
    expect(defaultCodingAgentProject.composer.toolToggle).toBe(true);
    expect(withoutModelConfig.composer.modelSwitcher).toBe(false);
    expect(withoutModelConfig.composer.toolToggle).toBe(true);
    expect(isPresetOptionActive(withoutModelConfig, "model-config")).toBe(false);
    expect(isPresetOptionActive(withoutApproval, "model-config")).toBe(true);
    expect(withoutApproval.composer.toolToggle).toBe(false);
  });

  it("enables provider presets as a multi-select set and tracks the default provider separately", () => {
    const gemini = applyPresetOption(defaultCodingAgentProject, "provider-gemini");
    const custom = applyPresetOption(gemini, "provider-custom");
    const withoutOpenAI = applyPresetOption(gemini, "provider-openai");

    expect(enabledProviderConnections(gemini).map((provider) => provider.id)).toEqual(["openai", "gemini"]);
    expect(defaultProviderConnection(gemini).id).toBe("gemini");
    expect(defaultProviderConnection(gemini).defaultModel).toBe("gemini-2.5-pro");
    expect(gemini.providers.connections.find((provider) => provider.id === "gemini")?.baseUrl).toBe(
      "https://generativelanguage.googleapis.com/v1beta/openai/",
    );
    const zAi = applyPresetOption(defaultCodingAgentProject, "provider-z-ai");
    expect(defaultProviderConnection(zAi).id).toBe("z-ai");
    expect(defaultProviderConnection(zAi).protocol).toBe("openai-compatible");
    expect(defaultProviderConnection(zAi).baseUrl).toBe("https://api.z.ai/api/paas/v4/");
    expect(defaultProviderConnection(zAi).defaultModel).toBe("glm-5.1");
    expect(isPresetOptionActive(gemini, "provider-gemini")).toBe(true);
    expect(isPresetOptionActive(gemini, "provider-openai")).toBe(true);
    expect(enabledProviderConnections(custom).map((provider) => provider.id)).toEqual(["openai", "gemini", "custom-provider"]);
    expect(defaultProviderConnection(custom).id).toBe("custom-provider");
    expect(defaultProviderConnection(custom).kind).toBe("custom");
    expect(defaultProviderConnection(custom).protocol).toBe("openai-compatible");
    expect(defaultProviderConnection(custom).auth.envVar).toBe("CUSTOM_PROVIDER_API_KEY");
    expect(enabledProviderConnections(withoutOpenAI).map((provider) => provider.id)).toEqual(["gemini"]);
    expect(defaultProviderConnection(withoutOpenAI).id).toBe("gemini");
  });

  it("toggles the provider settings launcher separately from selected providers", () => {
    const launcher = applyPresetOption(defaultCodingAgentProject, "provider-settings-launcher");
    const withGemini = applyPresetOption(launcher, "provider-gemini");
    const disabled = applyPresetOption(withGemini, "provider-settings-launcher");

    expect(defaultCodingAgentProject.providers.settingsLauncher).toBe(false);
    expect(launcher.providers.settingsLauncher).toBe(true);
    expect(enabledProviderConnections(withGemini).map((provider) => provider.id)).toEqual(["openai", "gemini"]);
    expect(withGemini.providers.settingsLauncher).toBe(true);
    expect(isPresetOptionActive(withGemini, "provider-settings-launcher")).toBe(true);
    expect(disabled.providers.settingsLauncher).toBe(false);
    expect(isPresetOptionActive(disabled, "provider-settings-launcher")).toBe(false);
  });

  it("treats block presets as optional toggles", () => {
    const logOn = applyPresetOption(defaultCodingAgentProject, "tool-log-tail");
    const logOff = applyPresetOption(logOn, "tool-log-tail");
    const errorOn = applyPresetOption(defaultCodingAgentProject, "error-collapse");
    const errorOff = applyPresetOption(errorOn, "error-collapse");

    expect(logOn.blocks.toolLogTail).toBe(true);
    expect(logOn.theme.motion.toolCall).toBe(defaultCodingAgentProject.theme.motion.toolCall);
    expect(logOff.blocks.toolLogTail).toBe(false);
    expect(logOff.theme.motion.toolCall).toBe(defaultCodingAgentProject.theme.motion.toolCall);
    expect(errorOn.blocks.errorCollapse).toBe(true);
    expect(errorOff.blocks.errorCollapse).toBe(false);
  });

  it("writes conversation presets back to message rendering schema", () => {
    const typewriter = applyPresetOption(defaultCodingAgentProject, "writing-typewriter");
    const hiddenLabels = applyPresetOption(typewriter, "speaker-labels");
    const restoredLabels = applyPresetOption(hiddenLabels, "speaker-labels");
    const actions = applyPresetOption(restoredLabels, "message-actions");

    expect(typewriter.theme.motion.writing).toBe("typewriter");
    expect(hiddenLabels.conversation.speakerLabels).toBe(false);
    expect(restoredLabels.conversation.speakerLabels).toBe(true);
    expect(actions.conversation.messageActions.copy).toBe(true);
    expect(actions.conversation.messageActions.regenerate).toBe(true);
    expect(actions.conversation.messageActions.edit).toBe(true);
    expect(isPresetOptionActive(actions, "writing-typewriter")).toBe(true);
    expect(isPresetOptionActive(hiddenLabels, "speaker-labels")).toBe(false);
    expect(isPresetOptionActive(actions, "speaker-labels")).toBe(true);
    expect(isPresetOptionActive(actions, "message-actions")).toBe(true);
  });

  it("switches visible thinking effect presets", () => {
    const pulse = applyPresetOption(defaultCodingAgentProject, "thinking-pulse");

    expect(pulse.theme.motion.reasoning).toBe("pulse");
    expect(pulse.reasoning.collapse).toBe("summary-first");
    expect(isPresetOptionActive(pulse, "thinking-pulse")).toBe(true);
    expect(isPresetOptionActive(pulse, "thinking-wave")).toBe(false);
  });

  it("supports compact reasoning visibility presets", () => {
    const statusOnly = applyPresetOption(defaultCodingAgentProject, "reasoning-status-only");
    const publicSummary = applyPresetOption(statusOnly, "reasoning-public-summary");

    expect(statusOnly.reasoning.show).toBe("status");
    expect(isPresetOptionActive(statusOnly, "reasoning-status-only")).toBe(true);
    expect(publicSummary.reasoning.show).toBe("summary");
    expect(publicSummary.reasoning.collapse).toBe("summary-first");
    expect(isPresetOptionActive(publicSummary, "reasoning-public-summary")).toBe(true);
  });

  it("supports additional reasoning motion presets", () => {
    const shimmer = applyPresetOption(defaultCodingAgentProject, "thinking-shimmer");
    const bars = applyPresetOption(defaultCodingAgentProject, "thinking-bars");
    const orbit = applyPresetOption(defaultCodingAgentProject, "thinking-orbit");
    const lattice = applyPresetOption(defaultCodingAgentProject, "thinking-orb-s1");
    const handoff = applyPresetOption(defaultCodingAgentProject, "thinking-orb-b5");
    const morph = applyPresetOption(defaultCodingAgentProject, "thinking-orb-m2");

    expect(shimmer.theme.motion.reasoning).toBe("shimmer");
    expect(bars.theme.motion.reasoning).toBe("bars");
    expect(orbit.theme.motion.reasoning).toBe("orbit");
    expect(lattice.theme.motion.reasoning).toBe("orb-s1");
    expect(handoff.theme.motion.reasoning).toBe("orb-b5");
    expect(morph.theme.motion.reasoning).toBe("orb-m2");
    expect(isPresetOptionActive(shimmer, "thinking-shimmer")).toBe(true);
    expect(isPresetOptionActive(bars, "thinking-bars")).toBe(true);
    expect(isPresetOptionActive(orbit, "thinking-orbit")).toBe(true);
    expect(isPresetOptionActive(lattice, "thinking-orb-s1")).toBe(true);
    expect(isPresetOptionActive(handoff, "thinking-orb-b5")).toBe(true);
    expect(isPresetOptionActive(morph, "thinking-orb-m2")).toBe(true);
  });

  it("supports output source presets", () => {
    const sourceExpectations = [
      ["output-source-artifact", "artifact"],
      ["output-source-console", "console"],
    ] as const;

    for (const [optionId, source] of sourceExpectations) {
      const next = applyPresetOption(defaultCodingAgentProject, optionId);

      expect(next.output.source).toBe(source);
      expect(isPresetOptionActive(next, optionId)).toBe(true);
    }
  });

  it("supports artifact renderer and surface presets", () => {
    for (const optionId of ["renderer-auto", "renderer-code", "renderer-diff", "renderer-markdown", "renderer-preview", "renderer-data"] as const) {
      const next = applyPresetOption(defaultCodingAgentProject, optionId);

      expect(next.output.source).toBe("artifact");
      expect(isPresetOptionActive(next, optionId)).toBe(true);
    }

    const diff = applyPresetOption(defaultCodingAgentProject, "renderer-diff");
    const overlay = applyPresetOption(diff, "surface-overlay");

    expect(diff.output.artifactRenderer).toBe("diff");
    expect(diff.blocks.codeDiff).toBe(true);
    expect(overlay.output.surface).toBe("overlay");
    expect(overlay.layout.slots.find((slot) => slot.component === "OutputFrame")?.region).toBe("overlay");
    expect(isPresetOptionActive(overlay, "surface-overlay")).toBe(true);
    expect(isPresetOptionActive(overlay, "surface-right-panel")).toBe(false);
  });

  it("keeps git status, commit message, and commit action presets independent", () => {
    const withoutBranch = applyPresetOption(defaultCodingAgentProject, "branch-status");
    const withoutMessage = applyPresetOption(defaultCodingAgentProject, "commit-message");
    const withoutCommitAction = applyPresetOption(withoutMessage, "commit-action");

    expect(withoutBranch.git.showBranchStatus).toBe(false);
    expect(withoutBranch.git.showChangedFiles).toBe(true);
    expect(isPresetOptionActive(withoutBranch, "branch-status")).toBe(false);
    expect(withoutMessage.git.suggestCommitMessage).toBe(false);
    expect(withoutMessage.git.allowCommit).toBe(true);
    expect(isPresetOptionActive(withoutMessage, "commit-message")).toBe(false);
    expect(isPresetOptionActive(withoutMessage, "commit-action")).toBe(true);
    expect(withoutCommitAction.git.allowCommit).toBe(false);
    expect(withoutCommitAction.git.suggestCommitMessage).toBe(false);
  });

  it("switches theme presets through the preset cards", () => {
    const warm = applyPresetOption(defaultCodingAgentProject, "warm-graphite");
    const sand = applyPresetOption(warm, "sand-workspace");
    const forest = applyPresetOption(sand, "forest-ember");

    expect(warm.theme.preset).toBe("warm-graphite");
    expect(isPresetOptionActive(warm, "warm-graphite")).toBe(true);
    expect(isPresetOptionActive(warm, "soft-glass")).toBe(false);
    expect(sand.theme.preset).toBe("sand-workspace");
    expect(isPresetOptionActive(sand, "sand-workspace")).toBe(true);
    expect(isPresetOptionActive(sand, "warm-graphite")).toBe(false);
    expect(forest.theme.preset).toBe("forest-ember");
    expect(isPresetOptionActive(forest, "forest-ember")).toBe(true);
    expect(isPresetOptionActive(forest, "sand-workspace")).toBe(false);
  });
});
