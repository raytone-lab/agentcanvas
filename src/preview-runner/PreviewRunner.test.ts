import { describe, expect, it } from "vitest";
import { createAgentUXViewModel } from "@agent-ux/render-core";
import { replayAgentUXEvents } from "@agent-ux/runtime";

import { defaultCodingAgentProject } from "../schema/agentuxConfig";
import { applyPresetOption } from "../schema/presetActions";
import {
  collectPreviewRunEvents,
  createPureFrontendPreviewRunner,
  gitPreviewStateFromEvents,
  commitGitPreviewState,
  previewScenarios,
  resolveDefaultPreviewScenario,
  type PreviewScenarioId,
} from "./PreviewRunner";

describe("pure frontend preview runner", () => {
  it("generates a complete canonical AgentUX run from a user prompt and saved project", async () => {
    const runner = createPureFrontendPreviewRunner({ now: () => 1_760_000_000_000 });
    const events = await collectPreviewRunEvents(runner.run({
      prompt: "Show me the artifact and git UI",
      project: defaultCodingAgentProject,
      scenarioId: "coding-with-artifact",
    }));

    const toolEvents = [
      "tool.call.started",
      "tool.call.args.delta",
      "tool.call.running",
      "tool.call.result",
      "tool.call.finished",
    ];

    expect(events.map((event) => event.type)).toEqual([
      "run.started",
      "reasoning.status",
      "reasoning.delta",
      "reasoning.summary",
      "reasoning.finished",
      ...toolEvents,
      ...toolEvents,
      "artifact.created",
      "artifact.delta",
      "artifact.finished",
      "text.started",
      "text.delta",
      "text.finished",
      "run.finished",
    ]);
    expect(events.every((event, index) => event.seq === index + 1)).toBe(true);
    expect(events.every((event) => event.runId === events[0].runId)).toBe(true);
    expect(events[0].payload).toMatchObject({
      title: "Coding Agent UI preview",
      input: {
        prompt: "Show me the artifact and git UI",
        template: "coding",
        transport: "replay",
      },
    });
    expect(events.find((event) => event.type === "text.delta")?.payload).toMatchObject({
      delta: expect.stringContaining("Show me the artifact and git UI"),
    });
  });

  it("generates input-aware tool action titles for image attachments", async () => {
    const events = await collectPreviewRunEvents(createPureFrontendPreviewRunner().run({
      prompt: "极简风.png",
      attachments: [{ name: "极简风.png", isImage: true }],
      project: defaultCodingAgentProject,
      scenarioId: "coding-with-artifact",
      // Stated outright. The runner used to infer this by testing the prompt for Han
      // characters, which cannot separate Chinese from Japanese.
      locale: "zh",
    }));

    const startedTitles = events
      .filter((event) => event.type === "tool.call.started")
      .map((event) => (event.payload as { title?: string }).title);

    expect(startedTitles).toEqual(expect.arrayContaining([
      "正在读取图片 极简风.png",
      "正在读取文件 AgentCanvas.saved-ui.json",
      "正在验证 PreviewResponse.test.tsx",
    ]));
  });

  it("keeps separate uploaded image previews in one image read result", async () => {
    const events = await collectPreviewRunEvents(createPureFrontendPreviewRunner().run({
      prompt: "看这三张图",
      attachments: [
        { name: "chart.png", isImage: true, imageSrc: "data:image/png;base64,one" },
        { name: "chart.test.png", isImage: true, imageSrc: "data:image/png;base64,two" },
        { name: "chart.types.png", isImage: true, imageSrc: "data:image/png;base64,three" },
      ],
      project: defaultCodingAgentProject,
      scenarioId: "coding-with-artifact",
    }));

    const imageResult = events.find((event) => {
      const result = (event.payload as { result?: { kind?: string } }).result;
      return event.type === "tool.call.result" && result?.kind === "image";
    });

    expect(imageResult?.payload).toMatchObject({
      result: {
        images: [
          { name: "chart.png", src: "data:image/png;base64,one" },
          { name: "chart.test.png", src: "data:image/png;base64,two" },
          { name: "chart.types.png", src: "data:image/png;base64,three" },
        ],
      },
      resultPreview: "3 images inspected",
    });
  });

  it("keeps the runner local by describing provider config without requiring provider calls", async () => {
    const events = await collectPreviewRunEvents(createPureFrontendPreviewRunner().run({
      prompt: "Validate the saved UX",
      project: defaultCodingAgentProject,
      scenarioId: "coding-with-artifact",
    }));

    const toolResult = events.find((event) => event.type === "tool.call.result");
    expect(toolResult?.payload).toMatchObject({
      result: {
        mode: "pure-frontend",
        defaultProviderId: "openai",
        harness: "agentux",
        layout: {
          slots: expect.arrayContaining([
            expect.objectContaining({ region: "main", component: "ChatFrame" }),
            expect.objectContaining({ region: "composer", component: "ComposerFrame" }),
          ]),
        },
        composer: expect.objectContaining({
          fileUpload: true,
          modelSwitcher: true,
        }),
      },
      resultPreview: "saved UI config only",
    });
  });

  it("exposes the expected built-in scenarios without a scenario builder", () => {
    expect(previewScenarios.map((scenario) => scenario.id)).toEqual([
      "simple-chat",
      "coding-with-artifact",
      "image-generation",
      "audio-generation",
      "video-generation",
      "tool-approval",
      "error-state",
      "long-reasoning",
      "git-diff-preview",
    ]);
    expect(previewScenarios.every((scenario) => scenario.label && scenario.description)).toBe(true);
  });

  it("resolves a default scenario from the current saved config", () => {
    expect(resolveDefaultPreviewScenario({ ...defaultCodingAgentProject, template: "chat" })).toBe("simple-chat");
    expect(resolveDefaultPreviewScenario(applyPresetOption(defaultCodingAgentProject, "tool-approval-hidden"))).toBe("tool-approval");
    expect(resolveDefaultPreviewScenario(applyPresetOption(defaultCodingAgentProject, "error-collapse"))).toBe("error-state");
    expect(resolveDefaultPreviewScenario(applyPresetOption(defaultCodingAgentProject, "reasoning-expanded"))).toBe("long-reasoning");
    expect(resolveDefaultPreviewScenario(defaultCodingAgentProject)).toBe("coding-with-artifact");
  });

  it.each([
    ["simple-chat", ["run.started", "text.started", "text.delta", "text.finished", "run.finished"]],
    ["tool-approval", ["tool.call.awaiting_approval"]],
    ["error-state", ["run.error"]],
    ["long-reasoning", ["reasoning.status", "reasoning.delta", "reasoning.summary", "reasoning.finished"]],
    ["git-diff-preview", ["artifact.created", "artifact.delta", "artifact.finished"]],
    ["image-generation", ["tool.call.running", "artifact.created", "artifact.finished"]],
    ["audio-generation", ["tool.call.running", "artifact.created", "artifact.finished"]],
    ["video-generation", ["tool.call.running", "artifact.created", "artifact.finished"]],
  ] satisfies Array<[PreviewScenarioId, string[]]>)("runs the %s scenario with canonical events", async (scenarioId, requiredTypes) => {
    const events = await collectPreviewRunEvents(createPureFrontendPreviewRunner().run({
      prompt: "Preview this state",
      project: defaultCodingAgentProject,
      scenarioId,
    }));
    const types = events.map((event) => event.type);

    for (const type of requiredTypes) {
      expect(types).toContain(type);
    }
  });

  it.each([
    ["image-generation", "GeneratedMoodboard.png", "media-generation:image"],
    ["audio-generation", "NarrationMix.wav", "media-generation:audio"],
    ["video-generation", "LaunchTeaser.mp4", "media-generation:video"],
  ] satisfies Array<[PreviewScenarioId, string, string]>)("creates %s media artifact content", async (scenarioId, title, content) => {
    const events = await collectPreviewRunEvents(createPureFrontendPreviewRunner().run({
      prompt: "Generate a rich media asset",
      project: defaultCodingAgentProject,
      scenarioId,
    }));
    const viewModel = createAgentUXViewModel(replayAgentUXEvents(events));
    const artifact = viewModel.timeline.find((item) => item.kind === "artifact");

    expect(artifact).toMatchObject({
      kind: "artifact",
      title,
      status: "success",
      content: expect.stringContaining(content),
    });
  });

  it.each([
    ["renderer-code", "PreviewResponse.tsx", "type PreviewRun"],
    ["renderer-diff", "PreviewChanges.diff", "+export const savedPreview"],
    ["renderer-markdown", "PreviewNotes.md", "# Preview notes"],
    ["renderer-preview", "PreviewCard.ui", "Saved UI preview"],
    ["renderer-data", "PreviewData.json", "\"scenario\""],
  ])("creates %s artifact content through AgentUX events", async (presetId, title, content) => {
    const project = applyPresetOption(defaultCodingAgentProject, presetId);
    const events = await collectPreviewRunEvents(createPureFrontendPreviewRunner().run({
      prompt: "Render artifact output",
      project,
      scenarioId: "coding-with-artifact",
    }));
    const artifactEvents = events.filter((event) => event.type.startsWith("artifact."));
    const viewModel = createAgentUXViewModel(replayAgentUXEvents(events));
    const artifact = viewModel.timeline.find((item) => item.kind === "artifact");

    expect(artifactEvents.map((event) => event.type)).toEqual([
      "artifact.created",
      "artifact.delta",
      "artifact.finished",
    ]);
    expect(artifact).toMatchObject({
      kind: "artifact",
      title,
      status: "success",
      content: expect.stringContaining(content),
    });
  });

  it("projects git mock state from the git diff scenario events", async () => {
    const events = await collectPreviewRunEvents(createPureFrontendPreviewRunner().run({
      prompt: "Show git state",
      project: defaultCodingAgentProject,
      scenarioId: "git-diff-preview",
    }));
    const gitState = gitPreviewStateFromEvents(events);

    expect(events.map((event) => event.type)).not.toContain("state.snapshot");
    expect(gitState).toMatchObject({
      branch: "codex/agentcanvas-preview",
      status: "dirty",
      ahead: 1,
      mockOnly: true,
      suggestedCommitMessage: "Preview AgentCanvas Git mock state",
      changedFiles: [
        { path: "src/agent/PreviewPanel.tsx", status: "modified", additions: 6, deletions: 1 },
        { path: "agentux.config.ts", status: "modified", additions: 3, deletions: 0 },
      ],
    });
  });

  it("commits git mock state locally without enabling push or changing files on disk", () => {
    const committed = commitGitPreviewState({
      branch: "codex/agentcanvas-preview",
      status: "dirty",
      ahead: 1,
      changedFiles: [{ path: "src/agent/PreviewPanel.tsx", status: "modified", additions: 6, deletions: 1 }],
      diffTitle: "AgentCanvasPreview.diff",
      suggestedCommitMessage: "Preview AgentCanvas Git mock state",
      mockOnly: true,
      pushEnabled: false,
    });

    expect(committed).toMatchObject({
      status: "committed",
      ahead: 2,
      changedFiles: [],
      lastCommitMessage: "Preview AgentCanvas Git mock state",
      mockOnly: true,
      pushEnabled: false,
    });
  });
});
