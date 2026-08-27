import {
  agentUXEventBuilders,
  type AgentUXEvent,
  type AgentUXEventBuilderMeta,
  type ArtifactKind,
  type TerminalStatus,
} from "@agent-ux/protocol";

import { chatCopy } from "../i18n/copy/chat";
import { previewCopy } from "../i18n/copy/preview";
import type { AppLocale } from "../i18n/locales";
import { defaultProviderConnection, type AgentFrontendProject } from "../schema/agentuxConfig";
import {
  commitGitPreviewState,
  createGitPreviewState,
  gitPreviewStateFromEvents,
  previewDiffContent,
  type GitPreviewFile,
  type GitPreviewFileStatus,
  type GitPreviewState,
} from "../harness/gitAdapter";

export {
  commitGitPreviewState,
  createGitPreviewState,
  gitPreviewStateFromEvents,
  type GitPreviewFile,
  type GitPreviewFileStatus,
  type GitPreviewState,
} from "../harness/gitAdapter";

export type PreviewScenarioId =
  | "simple-chat"
  | "coding-with-artifact"
  | "image-generation"
  | "audio-generation"
  | "video-generation"
  | "tool-approval"
  | "error-state"
  | "long-reasoning"
  | "git-diff-preview";

export type PreviewScenario = {
  id: PreviewScenarioId;
  label: string;
  description: string;
};

export const previewScenarios: PreviewScenario[] = [
  {
    id: "simple-chat",
    label: "Simple chat",
    description: "Assistant text only, useful for conversation rhythm and composer checks.",
  },
  {
    id: "coding-with-artifact",
    label: "Coding with artifact",
    description: "Reasoning, a local config tool call, and an artifact matched to the renderer preset.",
  },
  {
    id: "image-generation",
    label: "Image generation",
    description: "A media-generation event stream with animated image loading and generated image artifact.",
  },
  {
    id: "audio-generation",
    label: "Audio generation",
    description: "A media-generation event stream with audio loading and waveform progress.",
  },
  {
    id: "video-generation",
    label: "Video generation",
    description: "A media-generation event stream with animated video loading and generated video artifact.",
  },
  {
    id: "tool-approval",
    label: "Tool approval",
    description: "A sensitive command pauses for approval before continuing.",
  },
  {
    id: "error-state",
    label: "Error state",
    description: "A recoverable local tool failure exercises error rendering.",
  },
  {
    id: "long-reasoning",
    label: "Long reasoning",
    description: "Multiple reasoning updates test collapse, summary, and motion presets.",
  },
  {
    id: "git-diff-preview",
    label: "Git diff preview",
    description: "A mock patch artifact and commit summary for Git-oriented scaffolds.",
  },
];

export type PreviewRunInput = {
  prompt: string;
  attachments?: readonly PreviewInputAttachment[];
  project: AgentFrontendProject;
  runId?: string;
  scenarioId?: PreviewScenarioId;
  /**
   * UI locale for the generated demo prose.
   *
   * Previously inferred by testing the prompt for Han characters. That stood in for a locale
   * this type did not carry, and it cannot tell Japanese from Chinese — both use kanji — so
   * the caller passes it now. A Chinese prompt typed into an English UI therefore produces
   * English demo output, where it used to switch to Chinese.
   */
  locale?: AppLocale;
};

export type PreviewInputAttachment = {
  name: string;
  isImage?: boolean;
  imageSrc?: string;
};

export type PreviewRunner = {
  run(input: PreviewRunInput): AsyncIterable<AgentUXEvent>;
};

export type PureFrontendPreviewRunnerOptions = {
  now?: () => number;
};

export function resolveDefaultPreviewScenario(project: AgentFrontendProject): PreviewScenarioId {
  if (project.template === "chat") {
    return "simple-chat";
  }
  if (project.toolCalls.approval === "hidden") {
    return "tool-approval";
  }
  if (project.blocks.errorCollapse) {
    return "error-state";
  }
  if (
    project.reasoning.collapse === "expanded" ||
    project.reasoning.show === "thinking" ||
    project.theme.motion.reasoning === "terminal"
  ) {
    return "long-reasoning";
  }
  if (project.output.artifactRenderer === "diff") {
    return "git-diff-preview";
  }
  return "coding-with-artifact";
}

export function createPureFrontendPreviewRunner(options: PureFrontendPreviewRunnerOptions = {}): PreviewRunner {
  const now = options.now ?? (() => Date.now());
  let runIndex = 0;

  return {
    async *run(input) {
      runIndex += 1;
      const scenarioId = input.scenarioId ?? resolveDefaultPreviewScenario(input.project);
      for (const event of createPreviewRunEvents(input, {
        now: now(),
        runIndex,
        scenarioId,
      })) {
        yield event;
      }
    },
  };
}

export async function collectPreviewRunEvents(events: AsyncIterable<AgentUXEvent>): Promise<AgentUXEvent[]> {
  const collected: AgentUXEvent[] = [];
  for await (const event of events) {
    collected.push(event);
  }
  return collected;
}

type PreviewRunEventOptions = {
  now: number;
  runIndex: number;
  scenarioId: PreviewScenarioId;
};

type PreviewEventBuilder = {
  prompt: string;
  locale: AppLocale;
  attachments: readonly PreviewInputAttachment[];
  project: AgentFrontendProject;
  scenarioId: PreviewScenarioId;
  runId: string;
  meta: (id: string, extra?: Partial<AgentUXEventBuilderMeta>) => AgentUXEventBuilderMeta;
};

type PreviewArtifactSpec = {
  artifactId: string;
  kind: ArtifactKind;
  title: string;
  mimeType?: string;
  content: string;
  status?: TerminalStatus;
};

function createPreviewRunEvents(input: PreviewRunInput, options: PreviewRunEventOptions): AgentUXEvent[] {
  const prompt = normalizePrompt(input.prompt);
  const runId = input.runId ?? `preview_run_${options.runIndex}_${safeId(options.scenarioId)}_${safeId(prompt)}`;
  let seq = 0;

  const builder: PreviewEventBuilder = {
    prompt,
    locale: input.locale ?? "en",
    attachments: input.attachments ?? [],
    project: input.project,
    scenarioId: options.scenarioId,
    runId,
    meta(id, extra = {}) {
      seq += 1;
      return {
        id: `evt_${runId}_${id}`,
        runId,
        seq,
        ts: options.now + seq,
        ...extra,
      };
    },
  };

  switch (options.scenarioId) {
    case "simple-chat":
      return simpleChatScenario(builder);
    case "image-generation":
      return mediaGenerationScenario(builder, "image");
    case "audio-generation":
      return mediaGenerationScenario(builder, "audio");
    case "video-generation":
      return mediaGenerationScenario(builder, "video");
    case "tool-approval":
      return toolApprovalScenario(builder);
    case "error-state":
      return errorStateScenario(builder);
    case "long-reasoning":
      return longReasoningScenario(builder);
    case "git-diff-preview":
      return gitDiffPreviewScenario(builder);
    case "coding-with-artifact":
      return codingWithArtifactScenario(builder);
  }
}

function simpleChatScenario(builder: PreviewEventBuilder): AgentUXEvent[] {
  const textId = `${builder.runId}_assistant`;
  const messageId = `${builder.runId}_message`;
  return [
    runStarted(builder, "Simple chat UI preview"),
    agentUXEventBuilders.textStarted(builder.meta("text_started", { messageId }), {
      textId,
      role: "assistant",
      format: "markdown",
    }),
    agentUXEventBuilders.textDelta(builder.meta("text_delta", { messageId }), {
      textId,
      delta: `Pure front-end chat preview for: ${builder.prompt}. This scenario only exercises the conversation and composer surfaces.`,
    }),
    agentUXEventBuilders.textFinished(builder.meta("text_finished", { messageId }), { textId }),
    runFinished(builder, "Simple chat preview completed."),
  ];
}

function codingWithArtifactScenario(builder: PreviewEventBuilder): AgentUXEvent[] {
  const reasoningId = `${builder.runId}_reasoning`;
  const textId = `${builder.runId}_assistant`;
  const messageId = `${builder.runId}_message`;
  const artifact = artifactForRenderer(builder);
  const toolPlans = previewToolPlans(builder);

  return [
    runStarted(builder, "Coding Agent UI preview"),
    agentUXEventBuilders.reasoningStatus(builder.meta("reasoning_status"), {
      reasoningId,
      status: "planning",
      label: "Thinking",
    }),
    agentUXEventBuilders.reasoningDelta(builder.meta("reasoning_delta_1"), {
      reasoningId,
      kind: "summary",
      format: "plain",
      delta: `Reading the saved layout, composer, output, tool-call, and theme choices for "${truncate(builder.prompt, 72)}". `,
    }),
    agentUXEventBuilders.reasoningSummary(builder.meta("reasoning_summary"), {
      reasoningId,
      summary: `Planning a local UI/UX preview for "${truncate(builder.prompt, 88)}". No provider, harness, or external process is used.`,
      kind: "summary",
      format: "plain",
    }),
    agentUXEventBuilders.reasoningFinished(builder.meta("reasoning_finished"), {
      reasoningId,
      collapsedByDefault: builder.project.reasoning.collapse !== "expanded",
    }),
    ...toolPlans.flatMap((plan) => previewToolActionEvents(builder, plan)),
    ...artifactEvents(builder, artifact),
    agentUXEventBuilders.textStarted(builder.meta("text_started", { messageId }), {
      textId,
      role: "assistant",
      format: "markdown",
    }),
    agentUXEventBuilders.textDelta(builder.meta("text_delta", { messageId }), {
      textId,
      delta: `Pure front-end preview run complete for: ${builder.prompt}. The saved ${builder.project.template} UI rendered reasoning, local tool actions, an artifact, and this assistant response without calling a provider.`,
    }),
    agentUXEventBuilders.textFinished(builder.meta("text_finished", { messageId }), { textId }),
    runFinished(builder, "Pure frontend preview completed."),
  ];
}

type MediaGenerationKind = "image" | "audio" | "video";

function mediaGenerationScenario(builder: PreviewEventBuilder, kind: MediaGenerationKind): AgentUXEvent[] {
  const reasoningId = `${builder.runId}_${kind}_reasoning`;
  const toolCallId = `${builder.runId}_generate_${kind}`;
  const spec = mediaGenerationSpec(builder, kind, builder.locale);
  const artifact: PreviewArtifactSpec = {
    artifactId: `${builder.runId}_${kind}_artifact`,
    kind,
    title: spec.title,
    mimeType: spec.mimeType,
    content: spec.content,
  };

  return [
    runStarted(builder, spec.runTitle),
    agentUXEventBuilders.reasoningStatus(builder.meta(`${kind}_reasoning_status`), {
      reasoningId,
      status: "planning",
      label: spec.reasoningLabel,
    }),
    agentUXEventBuilders.reasoningDelta(builder.meta(`${kind}_reasoning_delta`), {
      reasoningId,
      kind: "summary",
      format: "plain",
      delta: spec.reasoningDelta,
    }),
    agentUXEventBuilders.reasoningSummary(builder.meta(`${kind}_reasoning_summary`), {
      reasoningId,
      kind: "summary",
      format: "plain",
      summary: spec.reasoningSummary,
    }),
    agentUXEventBuilders.reasoningFinished(builder.meta(`${kind}_reasoning_finished`), {
      reasoningId,
      collapsedByDefault: builder.project.reasoning.collapse !== "expanded",
    }),
    agentUXEventBuilders.toolCallStarted(builder.meta(`${kind}_tool_started`), {
      toolCallId,
      name: `preview.generate_${kind}`,
      title: spec.toolTitle,
      description: spec.toolDescription,
      safety: "safe",
    }),
    agentUXEventBuilders.toolCallArgsDelta(builder.meta(`${kind}_tool_args`), {
      toolCallId,
      delta: JSON.stringify(spec.args),
      format: "json-fragment",
    }),
    agentUXEventBuilders.toolCallRunning(builder.meta(`${kind}_tool_running`), {
      toolCallId,
      args: spec.args,
    }),
    agentUXEventBuilders.toolCallResult(builder.meta(`${kind}_tool_result`), {
      toolCallId,
      result: spec.result,
      resultPreview: spec.resultPreview,
    }),
    agentUXEventBuilders.toolCallFinished(builder.meta(`${kind}_tool_finished`), {
      toolCallId,
      status: "success",
    }),
    ...artifactEvents(builder, artifact),
    runFinished(builder, spec.finishedSummary),
  ];
}

function mediaGenerationSpec(builder: PreviewEventBuilder, kind: MediaGenerationKind, locale: AppLocale) {
  const m = previewCopy[locale].mediaGeneration;
  const prompt = truncate(builder.prompt, 96);
  if (kind === "image") {
    return {
      runTitle: m.image.runTitle,
      reasoningLabel: m.image.reasoningLabel,
      reasoningDelta: m.image.reasoningDelta.replace("{prompt}", prompt),
      reasoningSummary: m.image.reasoningSummary,
      toolTitle: m.image.toolTitle,
      toolDescription: "Simulates a local image-generation provider response for UI preview only.",
      args: { prompt: builder.prompt, aspectRatio: "16:10", variants: 4, dynamicSkeleton: true },
      result: { asset: "GeneratedMoodboard.png", kind, variants: 4, preview: "animated-image-loading" },
      resultPreview: m.image.resultPreview,
      title: "GeneratedMoodboard.png",
      mimeType: "image/png",
      content: [
        "media-generation:image",
        `Prompt: ${builder.prompt}`,
        "State: loading -> candidate grid -> selected image",
        "Visual: 16:10 frame, shimmer sweep, soft tile loading, generated preview.",
      ].join("\n"),
      finishedSummary: "Image generation preview completed.",
    };
  }

  if (kind === "audio") {
    return {
      runTitle: m.audio.runTitle,
      reasoningLabel: m.audio.reasoningLabel,
      reasoningDelta: m.audio.reasoningDelta.replace("{prompt}", prompt),
      reasoningSummary: m.audio.reasoningSummary,
      toolTitle: m.audio.toolTitle,
      toolDescription: "Simulates a local audio-generation provider response for UI preview only.",
      args: { prompt: builder.prompt, format: "wav", durationSeconds: 18, waveformLoading: true },
      result: { asset: "NarrationMix.wav", kind, durationSeconds: 18, preview: "audio-waveform-card" },
      resultPreview: m.audio.resultPreview,
      title: "NarrationMix.wav",
      mimeType: "audio/wav",
      content: [
        "media-generation:audio",
        `Prompt: ${builder.prompt}`,
        "State: audio loading -> audio player demo",
        "Visual: skeleton bars or animated waveform, compact cover, waveform bars, playback controls.",
      ].join("\n"),
      finishedSummary: "Audio generation preview completed.",
    };
  }

  return {
    runTitle: m.video.runTitle,
    reasoningLabel: m.video.reasoningLabel,
    reasoningDelta: m.video.reasoningDelta.replace("{prompt}", prompt),
    reasoningSummary: m.video.reasoningSummary,
    toolTitle: m.video.toolTitle,
    toolDescription: "Simulates a local video-generation provider response for UI preview only.",
    args: { prompt: builder.prompt, aspectRatio: "16:9", durationSeconds: 8, storyboardFrames: 5 },
    result: { asset: "LaunchTeaser.mp4", kind, durationSeconds: 8, preview: "video-frame-loading" },
    resultPreview: m.video.resultPreview,
    title: "LaunchTeaser.mp4",
    mimeType: "video/mp4",
    content: [
      "media-generation:video",
      `Prompt: ${builder.prompt}`,
      "State: image-style loading -> video player demo",
      "Visual: reused loader canvas, poster frame, play affordance, progress rail.",
    ].join("\n"),
    finishedSummary: "Video generation preview completed.",
  };
}

function toolApprovalScenario(builder: PreviewEventBuilder): AgentUXEvent[] {
  const reasoningId = `${builder.runId}_reasoning`;
  const toolCallId = `${builder.runId}_approval`;

  return [
    runStarted(builder, "Tool approval UI preview"),
    agentUXEventBuilders.reasoningStatus(builder.meta("reasoning_status"), {
      reasoningId,
      status: "using_tools",
      label: "Checking command safety",
    }),
    agentUXEventBuilders.reasoningSummary(builder.meta("reasoning_summary"), {
      reasoningId,
      summary: "Preparing a sensitive local command so approval UI can be tested without touching the filesystem.",
      kind: "summary",
      format: "plain",
    }),
    agentUXEventBuilders.reasoningFinished(builder.meta("reasoning_finished"), {
      reasoningId,
      collapsedByDefault: builder.project.reasoning.collapse !== "expanded",
    }),
    agentUXEventBuilders.toolCallStarted(builder.meta("tool_started"), {
      toolCallId,
      name: "preview.remove_cache",
      title: "Remove temp cache",
      safety: "needs_approval",
    }),
    agentUXEventBuilders.toolCallArgsDelta(builder.meta("tool_args"), {
      toolCallId,
      delta: JSON.stringify({ path: ".agent/tmp-cache", recursive: true, dryRun: true }),
      format: "json-fragment",
    }),
    agentUXEventBuilders.toolCallAwaitingApproval(builder.meta("tool_approval"), {
      toolCallId,
      prompt: "Remove .agent/tmp-cache recursively?",
      argsPreview: { path: ".agent/tmp-cache", recursive: true, force: true },
    }),
    agentUXEventBuilders.runAwaitingInput(builder.meta("run_awaiting_input"), {
      reason: "external",
      message: "Approve or reject the simulated tool call in the preview UI.",
      resume: { allowed: true, prompt: "Continue after approval" },
    }),
  ];
}

function errorStateScenario(builder: PreviewEventBuilder): AgentUXEvent[] {
  const reasoningId = `${builder.runId}_reasoning`;
  const toolCallId = `${builder.runId}_failing_tool`;

  return [
    runStarted(builder, "Error state UI preview"),
    agentUXEventBuilders.reasoningStatus(builder.meta("reasoning_status"), {
      reasoningId,
      status: "checking",
      label: "Checking failure state",
    }),
    agentUXEventBuilders.reasoningSummary(builder.meta("reasoning_summary"), {
      reasoningId,
      summary: "Creating a local mock failure to test collapsed and developer-facing error UI.",
      kind: "summary",
      format: "plain",
    }),
    agentUXEventBuilders.reasoningFinished(builder.meta("reasoning_finished"), {
      reasoningId,
      collapsedByDefault: builder.project.reasoning.collapse !== "expanded",
    }),
    agentUXEventBuilders.toolCallStarted(builder.meta("tool_started"), {
      toolCallId,
      name: "preview.read_missing_file",
      title: "Read missing fixture",
      safety: "safe",
    }),
    agentUXEventBuilders.toolCallRunning(builder.meta("tool_running"), {
      toolCallId,
      args: { path: "src/fixtures/missing-preview.json" },
    }),
    agentUXEventBuilders.toolCallError(builder.meta("tool_error"), {
      toolCallId,
      code: "PREVIEW_FIXTURE_MISSING",
      retryable: true,
      userMessage: "Preview fixture could not be loaded.",
      developerMessage: "Mock preview runner intentionally emitted an error state.",
    }),
    agentUXEventBuilders.toolCallFinished(builder.meta("tool_finished"), {
      toolCallId,
      status: "error",
    }),
    agentUXEventBuilders.runError(builder.meta("run_error"), {
      code: "PREVIEW_RUN_ERROR",
      category: "tool",
      retryable: true,
      userMessage: "The preview runner hit a simulated local error.",
      developerMessage: "Pure frontend error-state scenario completed without external IO.",
    }),
  ];
}

function longReasoningScenario(builder: PreviewEventBuilder): AgentUXEvent[] {
  const reasoningId = `${builder.runId}_reasoning`;
  const textId = `${builder.runId}_assistant`;
  const messageId = `${builder.runId}_message`;

  return [
    runStarted(builder, "Long reasoning UI preview"),
    agentUXEventBuilders.reasoningStatus(builder.meta("reasoning_status"), {
      reasoningId,
      status: "planning",
      label: "Thinking",
    }),
    agentUXEventBuilders.reasoningDelta(builder.meta("reasoning_delta_1"), {
      reasoningId,
      kind: "summary",
      format: "plain",
      delta: "Reviewing the saved layout regions, composer controls, and output surface. ",
    }),
    agentUXEventBuilders.reasoningDelta(builder.meta("reasoning_delta_2"), {
      reasoningId,
      kind: "summary",
      format: "plain",
      delta: "Checking how collapsed reasoning, summary order, and long text wrapping behave. ",
    }),
    agentUXEventBuilders.reasoningSummary(builder.meta("reasoning_summary"), {
      reasoningId,
      kind: "summary",
      format: "plain",
      summary: "Long reasoning preview finished after multiple local reasoning updates.",
    }),
    agentUXEventBuilders.reasoningFinished(builder.meta("reasoning_finished"), {
      reasoningId,
      collapsedByDefault: builder.project.reasoning.collapse !== "expanded",
    }),
    agentUXEventBuilders.textStarted(builder.meta("text_started", { messageId }), {
      textId,
      role: "assistant",
      format: "markdown",
    }),
    agentUXEventBuilders.textDelta(builder.meta("text_delta", { messageId }), {
      textId,
      delta: `Long reasoning scenario rendered for: ${builder.prompt}.`,
    }),
    agentUXEventBuilders.textFinished(builder.meta("text_finished", { messageId }), { textId }),
    runFinished(builder, "Long reasoning preview completed."),
  ];
}

function gitDiffPreviewScenario(builder: PreviewEventBuilder): AgentUXEvent[] {
  const reasoningId = `${builder.runId}_reasoning`;
  const textId = `${builder.runId}_assistant`;
  const messageId = `${builder.runId}_message`;
  const gitState = createGitPreviewState();
  const artifact: PreviewArtifactSpec = {
    artifactId: `${builder.runId}_git_diff`,
    kind: "code",
    title: gitState.diffTitle,
    mimeType: "text/x-diff",
    content: previewDiffContent(builder.prompt),
  };

  return [
    runStarted(builder, "Git diff UI preview"),
    agentUXEventBuilders.reasoningStatus(builder.meta("reasoning_status"), {
      reasoningId,
      status: "checking",
      label: "Checking git preview",
    }),
    agentUXEventBuilders.reasoningSummary(builder.meta("reasoning_summary"), {
      reasoningId,
      summary: "Preparing a mock diff artifact for the Git and output panels. No repository operation is executed.",
      kind: "summary",
      format: "plain",
    }),
    agentUXEventBuilders.reasoningFinished(builder.meta("reasoning_finished"), {
      reasoningId,
      collapsedByDefault: builder.project.reasoning.collapse !== "expanded",
    }),
    ...artifactEvents(builder, artifact),
    agentUXEventBuilders.textStarted(builder.meta("text_started", { messageId }), {
      textId,
      role: "assistant",
      format: "markdown",
    }),
    agentUXEventBuilders.textDelta(builder.meta("text_delta", { messageId }), {
      textId,
      delta: `Git diff preview rendered for: ${builder.prompt}. The diff is an AgentUX artifact event, not a real git command.`,
    }),
    agentUXEventBuilders.textFinished(builder.meta("text_finished", { messageId }), { textId }),
    runFinished(builder, "Git diff preview completed."),
  ];
}

type PreviewToolPlan = {
  id: string;
  name: string;
  title: string;
  description: string;
  args: Record<string, unknown>;
  result: unknown;
  resultPreview: string;
};

type PreviewInputReference = {
  name: string;
  isImage: boolean;
  fromAttachment: boolean;
  imageSrc?: string;
};

function previewToolPlans(builder: PreviewEventBuilder): PreviewToolPlan[] {
  const locale = builder.locale;
  const references = previewInputReferences(builder.prompt, builder.attachments);
  const imageRefs = references.filter((reference) => reference.isImage);
  const imageRef = imageRefs[0];
  const fileRef = references.find((reference) => !reference.isImage);
  const command = commandFromPrompt(builder.prompt);
  const searchQuery = searchQueryFromPrompt(builder.prompt);
  const plans: PreviewToolPlan[] = [];

  if (imageRefs.length > 0) {
    plans.push(readImagePlan(imageRefs, locale));
  }

  if (fileRef) {
    plans.push(fileActionPlan(fileRef, builder.prompt, locale));
  }

  if (searchQuery) {
    plans.push(searchPlan(searchQuery, locale));
  }

  plans.splice(Math.min(1, plans.length), 0, inspectConfigPlan(builder, locale));

  if (shouldValidate(builder.prompt, fileRef, imageRef)) {
    plans.push(validatePlan(fileRef?.name ?? "PreviewResponse.tsx", locale));
  }

  if (command) {
    plans.push(commandPlan(command, locale));
  } else if (plans.length < 3) {
    plans.push(searchPlan(imageRef ? imageRef.name : fileRef?.name ?? "artifactRenderer", locale));
  }

  return uniquePlans(plans).slice(0, 5);
}

function previewToolActionEvents(builder: PreviewEventBuilder, plan: PreviewToolPlan): AgentUXEvent[] {
  const toolCallId = `${builder.runId}_${plan.id}`;
  const metaPrefix = `tool_${plan.id}`;

  return [
    agentUXEventBuilders.toolCallStarted(builder.meta(`${metaPrefix}_started`), {
      toolCallId,
      name: plan.name,
      title: plan.title,
      description: plan.description,
      safety: "safe",
    }),
    agentUXEventBuilders.toolCallArgsDelta(builder.meta(`${metaPrefix}_args`), {
      toolCallId,
      delta: JSON.stringify(plan.args),
      format: "json-fragment",
    }),
    agentUXEventBuilders.toolCallRunning(builder.meta(`${metaPrefix}_running`), {
      toolCallId,
      args: plan.args,
    }),
    agentUXEventBuilders.toolCallResult(builder.meta(`${metaPrefix}_result`), {
      toolCallId,
      result: plan.result,
      resultPreview: plan.resultPreview,
    }),
    agentUXEventBuilders.toolCallFinished(builder.meta(`${metaPrefix}_finished`), {
      toolCallId,
      status: "success",
    }),
  ];
}

function inspectConfigPlan(builder: PreviewEventBuilder, locale: AppLocale): PreviewToolPlan {
  return {
    id: "read_saved_config",
    name: "preview.read_file",
    title: toolTitle(chatCopy[locale].toolCard.runningAction.readFile, "AgentCanvas.saved-ui.json"),
    description: "Reads the saved AgentCanvas schema in memory.",
    args: { path: "AgentCanvas.saved-ui.json", source: "saved-project", externalIO: false },
    result: previewConfigSummary(builder),
    resultPreview: "saved UI config only",
  };
}

function previewConfigSummary(builder: PreviewEventBuilder) {
  const defaultProvider = defaultProviderConnection(builder.project);
  return {
    mode: "pure-frontend",
    template: builder.project.template,
    transport: builder.project.runtime.transport,
    harness: builder.project.runtime.harness,
    defaultProviderId: builder.project.providers.defaultProviderId,
    defaultModel: defaultProvider.defaultModel,
    layout: {
      slots: builder.project.layout.slots
        .filter((slot) => slot.enabled)
        .map((slot) => ({ region: slot.region, component: slot.component })),
      mainSize: builder.project.layout.mainSize,
      rightPanelSize: builder.project.layout.rightPanelSize,
    },
    output: builder.project.output,
    composer: {
      fileUpload: builder.project.composer.fileUpload,
      thinkingBudget: builder.project.composer.thinkingBudget,
      modelSwitcher: builder.project.composer.modelSwitcher,
      toolToggle: builder.project.composer.toolToggle,
      promptShortcuts: builder.project.composer.promptShortcuts,
    },
    conversation: {
      speakerLabels: builder.project.conversation.speakerLabels,
      messageActions: builder.project.conversation.messageActions,
      userAvatar: builder.project.conversation.userAvatar,
      agentAvatar: builder.project.conversation.agentAvatar,
    },
    reasoning: builder.project.reasoning,
    toolCalls: builder.project.toolCalls,
    theme: builder.project.theme,
  };
}

function readImagePlan(references: readonly PreviewInputReference[], locale: AppLocale): PreviewToolPlan {
  const [reference] = references;
  const images = references.map((item) => ({
    name: item.name,
    attachment: item.fromAttachment,
    src: item.imageSrc,
  }));
  return {
    id: `read_image_${safeId(reference.name)}`,
    name: "preview.read_image",
    title: toolTitle(chatCopy[locale].toolCard.runningAction.readImage, reference.name),
    description: "Reads an uploaded screenshot or image attachment in memory.",
    args: { path: reference.name, attachment: reference.fromAttachment, images: images.map(({ name }) => name) },
    result: {
      file: reference.name,
      kind: "image",
      images,
      summary: "Mock image inspection: detected primary layout, spacing, icon scale, and text density.",
    },
    resultPreview: references.length > 1 ? `${references.length} images inspected` : "image inspected",
  };
}

function fileActionPlan(reference: PreviewInputReference, prompt: string, locale: AppLocale): PreviewToolPlan {
  const edit = /(改|修改|编辑|重构|补充|修复|edit|modify|fix|update|refactor)/i.test(prompt);
  const label = edit ? chatCopy[locale].toolCard.runningAction.editFile : chatCopy[locale].toolCard.runningAction.readFile;
  return {
    id: `${edit ? "edit_file" : "read_file"}_${safeId(reference.name)}`,
    name: edit ? "preview.edit_file" : "preview.read_file",
    title: toolTitle(label, reference.name),
    description: edit ? "Applies a mock local edit to the selected file." : "Reads the selected file in memory.",
    args: { path: reference.name },
    result: edit
      ? previewFileDiff(reference.name)
      : `// ${reference.name}\nexport const savedPreview = "mock local read";`,
    resultPreview: edit ? "+8 -2" : "7 lines",
  };
}

function searchPlan(query: string, locale: AppLocale): PreviewToolPlan {
  return {
    id: `search_${safeId(query)}`,
    name: "preview.search",
    title: toolTitle(chatCopy[locale].toolCard.runningAction.search, query),
    description: "Searches the saved preview configuration and mock source map.",
    args: { pattern: query },
    result: {
      query,
      matches: ["src/components/agent-preview/ChatFrame.tsx", "src/preview-runner/PreviewRunner.ts"],
    },
    resultPreview: "2 locations",
  };
}

function validatePlan(target: string, locale: AppLocale): PreviewToolPlan {
  const testTarget = target.endsWith(".test.tsx") || target.endsWith(".test.ts") ? target : testFileName(target);
  return {
    id: `validate_${safeId(testTarget)}`,
    name: "preview.validate",
    title: toolTitle(chatCopy[locale].toolCard.runningAction.validate, testTarget),
    description: "Runs a mock local validation pass for the saved UI preview.",
    args: { cmd: `npm test -- ${testTarget}` },
    result: "PASS preview rendering\nPASS saved interaction flow",
    resultPreview: "2 passed",
  };
}

function commandPlan(command: string, locale: AppLocale): PreviewToolPlan {
  return {
    id: `run_command_${safeId(command)}`,
    name: "shell.exec",
    title: toolTitle(chatCopy[locale].toolCard.runningAction.runCommand, command),
    description: "Runs a mock command transcript without invoking a real process.",
    args: { cmd: command },
    result: `> ${command}\n✓ mock build completed\n✓ saved preview assets checked`,
    resultPreview: "build passed",
  };
}

const FILE_REFERENCE_PATTERN = /[^\s"'“”‘’`<>，。；：:()（）]+?\.(?:png|jpe?g|gif|webp|avif|svg|tsx?|jsx?|mjs|cjs|json|mdx?|css|scss|html?|py|sh|ya?ml|toml|txt|diff|patch)/gi;
const IMAGE_EXTENSION_PATTERN = /\.(?:png|jpe?g|gif|webp|avif|svg)$/i;

function previewInputReferences(
  prompt: string,
  attachments: readonly PreviewInputAttachment[],
): PreviewInputReference[] {
  const references: PreviewInputReference[] = [];
  const seen = new Set<string>();
  const add = (name: string, isImage: boolean, fromAttachment: boolean, imageSrc?: string) => {
    const cleanName = name.trim();
    const key = cleanName.toLowerCase();
    if (!cleanName || seen.has(key)) {
      return;
    }
    seen.add(key);
    references.push({ name: cleanName, isImage, fromAttachment, imageSrc });
  };

  for (const attachment of attachments) {
    add(attachment.name, Boolean(attachment.isImage) || IMAGE_EXTENSION_PATTERN.test(attachment.name), true, attachment.imageSrc);
  }

  for (const match of prompt.matchAll(FILE_REFERENCE_PATTERN)) {
    const name = match[0];
    add(name, IMAGE_EXTENSION_PATTERN.test(name), false);
  }

  return references;
}

function commandFromPrompt(prompt: string): string | undefined {
  const explicitCommand = prompt.match(/\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?[\w:-]+(?:\s+--\s+[^\n，。]+)?/i)?.[0];
  if (explicitCommand) {
    return explicitCommand.trim();
  }
  if (/(构建|build)/i.test(prompt)) {
    return "npm run build";
  }
  return undefined;
}

function searchQueryFromPrompt(prompt: string): string | undefined {
  const explicitSearch = prompt.match(/(?:搜索|查找|search(?:ing)?|grep)\s+([A-Za-z0-9_.$/-]+)/i)?.[1];
  if (explicitSearch) {
    return explicitSearch;
  }
  const hookName = prompt.match(/\buse[A-Z][A-Za-z0-9_]+\b/)?.[0];
  if (hookName) {
    return hookName;
  }
  return undefined;
}

function shouldValidate(prompt: string, fileRef?: PreviewInputReference, imageRef?: PreviewInputReference): boolean {
  return Boolean(fileRef || imageRef || /(验证|测试|单测|validate|test|check)/i.test(prompt));
}

function testFileName(target: string): string {
  const fileName = target.split("/").filter(Boolean).pop() ?? target;
  const extensionIndex = fileName.lastIndexOf(".");
  if (extensionIndex <= 0) {
    return `${fileName}.test.tsx`;
  }
  return `${fileName.slice(0, extensionIndex)}.test.tsx`;
}

function previewFileDiff(fileName: string): string {
  return [
    `--- ${fileName}`,
    `+++ ${fileName}`,
    "- const previewState = \"draft\";",
    "+ const previewState = \"ready\";",
    "+ const simulatedActions = [\"read\", \"validate\", \"render\"];",
  ].join("\n");
}

function toolTitle(label: string, target: string): string {
  return `${label} ${target}`;
}

function uniquePlans(plans: PreviewToolPlan[]): PreviewToolPlan[] {
  const seen = new Set<string>();
  return plans.filter((plan) => {
    const key = `${plan.name}:${plan.title}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function artifactEvents(builder: PreviewEventBuilder, artifact: PreviewArtifactSpec): AgentUXEvent[] {
  return [
    agentUXEventBuilders.artifactCreated(builder.meta(`${artifact.artifactId}_created`), {
      artifactId: artifact.artifactId,
      kind: artifact.kind,
      title: artifact.title,
      mimeType: artifact.mimeType,
    }),
    agentUXEventBuilders.artifactDelta(builder.meta(`${artifact.artifactId}_delta`), {
      artifactId: artifact.artifactId,
      format: "text",
      delta: artifact.content,
    }),
    agentUXEventBuilders.artifactFinished(builder.meta(`${artifact.artifactId}_finished`), {
      artifactId: artifact.artifactId,
      status: artifact.status ?? "success",
      uri: `memory://${artifact.artifactId}`,
    }),
  ];
}

function artifactForRenderer(builder: PreviewEventBuilder): PreviewArtifactSpec {
  const artifactId = `${builder.runId}_artifact`;
  switch (builder.project.output.artifactRenderer) {
    case "diff":
      return {
        artifactId,
        kind: "code",
        title: "PreviewChanges.diff",
        mimeType: "text/x-diff",
        content: previewDiffContent(builder.prompt),
      };
    case "markdown":
      return {
        artifactId,
        kind: "file",
        title: "PreviewNotes.md",
        mimeType: "text/markdown",
        content: `# Preview notes\n\n- Prompt: ${builder.prompt}\n- Scenario: ${builder.scenarioId}\n- Source: AgentUX artifact events\n`,
      };
    case "preview":
      return {
        artifactId,
        kind: "ui",
        title: "PreviewCard.ui",
        mimeType: "text/plain",
        content: `Saved UI preview\n\nPrompt: ${builder.prompt}\nTemplate: ${builder.project.template}\nRenderer: preview`,
      };
    case "data":
      return {
        artifactId,
        kind: "custom",
        title: "PreviewData.json",
        mimeType: "application/json",
        content: JSON.stringify({
          scenario: builder.scenarioId,
          prompt: builder.prompt,
          template: builder.project.template,
          output: builder.project.output,
        }, null, 2),
      };
    case "auto":
    case "code":
      return {
        artifactId,
        kind: "code",
        title: "PreviewResponse.tsx",
        mimeType: "text/typescript",
        content: previewArtifactCode(builder.prompt, builder.project),
      };
  }
}

function runStarted(builder: PreviewEventBuilder, title: string): AgentUXEvent {
  return agentUXEventBuilders.runStarted(builder.meta("run_started"), {
    title,
    input: {
      prompt: builder.prompt,
      template: builder.project.template,
      transport: builder.project.runtime.transport,
      scenarioId: builder.scenarioId,
    },
    metadata: {
      runner: "pure-frontend",
      scenarioId: builder.scenarioId,
    },
  });
}

function runFinished(builder: PreviewEventBuilder, summary: string): AgentUXEvent {
  return agentUXEventBuilders.runFinished(builder.meta("run_finished"), {
    assessment: {
      outcome: "success",
      summary,
      checks: [
        {
          key: "no_external_harness",
          label: "No harness/provider call",
          passed: true,
          required: true,
        },
        {
          key: "saved_config",
          label: "Used saved UI/UX config",
          passed: true,
          required: true,
        },
      ],
    },
  });
}

function normalizePrompt(prompt: string): string {
  const trimmed = prompt.trim();
  return trimmed.length > 0 ? trimmed : "Run a local AgentCanvas UI/UX preview.";
}

function safeId(input: string): string {
  const id = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36);
  return id || "prompt";
}

function truncate(input: string, maxLength: number): string {
  return input.length <= maxLength ? input : `${input.slice(0, maxLength - 1)}...`;
}

function previewArtifactCode(prompt: string, project: AgentFrontendProject): string {
  return `type PreviewRun = {
  prompt: string;
  template: string;
  output: string;
};

export const previewRun: PreviewRun = {
  prompt: ${JSON.stringify(prompt)},
  template: ${JSON.stringify(project.template)},
  output: ${JSON.stringify(`${project.output.source}:${project.output.artifactRenderer}`)},
};
`;
}
