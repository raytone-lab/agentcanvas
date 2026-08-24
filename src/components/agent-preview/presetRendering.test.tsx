import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createAgentUXViewModel } from "@agent-ux/render-core";
import { replayAgentUXEvents } from "@agent-ux/runtime";

import { LocaleProvider } from "../../i18n/LocaleContext";

import { applyPresetOption } from "../../schema/presetActions";
import { IconSetProvider } from "../../agentmatrix";
import { defaultCodingAgentProject } from "../../schema/agentuxConfig";
import { translatePresetOptionLabel } from "../../i18n/presetCopy";
import { PresetOptionPreview } from "../PresetOptionPreview";
import type { GitPreviewState } from "../../preview-runner/PreviewRunner";
import { collectPreviewRunEvents, createPureFrontendPreviewRunner } from "../../preview-runner/PreviewRunner";
import { ComposerFrame } from "./ComposerFrame";
import { ChatFrame } from "./ChatFrame";
import { GitFrame } from "./GitFrame";
import { OutputFrame } from "./OutputFrame";
import { ProviderFloatingSettings } from "./ProviderFloatingSettings";
import { ToolCallCard, outputPanelItemsFromTool } from "./ToolCallCard";

const artifact = {
  kind: "artifact",
  id: "art_search",
  artifactKind: "code",
  title: "SearchInput.tsx",
  status: "success",
  content: "# SearchInput\n- Adds validation\n\n```ts\nconst isValid = query.trim().length >= 2;\n```",
};

/**
 * Render through the same providers the real app mounts (App.tsx / the exported
 * main.tsx both wrap in LocaleProvider + IconSetProvider). Without them `useCopy()`
 * falls back to the stored locale — zh when nothing is stored, which broke every
 * English assertion — and `useIconSet()` throws outright.
 *
 * Locale is pinned to "en" because the assertions below are written against the
 * English copy.
 */
function render(node: ReactNode, locale: "en" | "zh" = "en"): string {
  return renderToStaticMarkup(
    <LocaleProvider initialLocale={locale}>
      <IconSetProvider>{node}</IconSetProvider>
    </LocaleProvider>,
  );
}

function viewModelWithTimeline(timeline: unknown[]) {
  return {
    runId: "test",
    status: "finished",
    title: "Rendering test",
    timeline,
    capabilities: [],
    errors: [],
  } as never;
}

describe("preset-driven preview rendering", () => {
  it("renders artifact renderer presets through distinct output modules", () => {
    const codeMarkup = render(
      <OutputFrame
        project={applyPresetOption(defaultCodingAgentProject, "renderer-code")}
        viewModel={viewModelWithTimeline([artifact])}
      />,
    );
    const markdownMarkup = render(
      <OutputFrame
        project={applyPresetOption(defaultCodingAgentProject, "renderer-markdown")}
        viewModel={viewModelWithTimeline([artifact])}
      />,
    );
    const previewMarkup = render(
      <OutputFrame
        project={applyPresetOption(defaultCodingAgentProject, "renderer-preview")}
        viewModel={viewModelWithTimeline([artifact])}
      />,
    );
    const dataMarkup = render(
      <OutputFrame
        project={applyPresetOption(defaultCodingAgentProject, "renderer-data")}
        viewModel={viewModelWithTimeline([artifact])}
      />,
    );

    expect(codeMarkup).toContain("code-output");
    expect(codeMarkup).toContain('data-preview-anchor="output"');
    expect(codeMarkup).toContain('data-language="typescript"');
    expect(markdownMarkup).toContain("markdown-output");
    expect(markdownMarkup).toContain("<h4>SearchInput</h4>");
    expect(markdownMarkup).toContain("<li>Adds validation</li>");
    expect(previewMarkup).toContain("preview-output");
    expect(previewMarkup).toContain("Rendered preview");
    expect(dataMarkup).toContain("data-output");
    expect(dataMarkup).toContain("&quot;kind&quot;");
  });

  it.each([
    ["renderer-code", "code-output", "PreviewResponse.tsx"],
    ["renderer-diff", "diff-output", "PreviewChanges.diff"],
    ["renderer-markdown", "markdown-output", "PreviewNotes.md"],
    ["renderer-preview", "preview-output", "PreviewCard.ui"],
    ["renderer-data", "data-output", "PreviewData.json"],
  ])("renders %s from preview runner artifact events", async (presetId, outputClass, artifactTitle) => {
    const project = applyPresetOption(defaultCodingAgentProject, presetId);
    const events = await collectPreviewRunEvents(createPureFrontendPreviewRunner().run({
      prompt: "Render through OutputFrame",
      project,
      scenarioId: "coding-with-artifact",
    }));
    const viewModel = createAgentUXViewModel(replayAgentUXEvents(events));
    const markup = render(<OutputFrame project={project} viewModel={viewModel} />);

    expect(events.map((event) => event.type)).toContain("artifact.created");
    expect(markup).toContain(outputClass);
    expect(markup).toContain(artifactTitle);
  });

  it.each([
    ["image-generation", "image-output-preview", "GeneratedMoodboard.png"],
    ["audio-generation", "audio-output-preview", "NarrationMix.wav"],
    ["video-generation", "video-output-preview", "LaunchTeaser.mp4"],
  ] as const)("renders %s media generation artifact surfaces", async (scenarioId, outputClass, artifactTitle) => {
    const events = await collectPreviewRunEvents(createPureFrontendPreviewRunner().run({
      prompt: "Generate a rich media asset",
      project: defaultCodingAgentProject,
      scenarioId,
    }));
    const viewModel = createAgentUXViewModel(replayAgentUXEvents(events));
    const artifact = viewModel.timeline.find((item) => item.kind === "artifact") as { content?: string } | undefined;
    const mediaItem = {
      id: `file:${artifactTitle}`,
      kind: "file" as const,
      title: artifactTitle,
      language: artifactTitle.split(".").pop()?.toLowerCase(),
      body: artifact?.content,
    };

    const outputMarkup = render(
      <OutputFrame
        project={defaultCodingAgentProject}
        viewModel={viewModel}
        openItems={[mediaItem]}
        activeOpenItemId={mediaItem.id}
      />,
    );
    const chatMarkup = render(<ChatFrame project={defaultCodingAgentProject} viewModel={viewModel} />);

    expect(outputMarkup).toContain(outputClass);
    expect(outputMarkup).toContain(artifactTitle);
    expect(chatMarkup).toContain(`data-media-kind="${scenarioId.split("-")[0]}"`);
  });

  it("renders image generation as a product preview without tool and completion rows", async () => {
    const events = await collectPreviewRunEvents(createPureFrontendPreviewRunner().run({
      prompt: "生成一张产品发布会主视觉。",
      project: defaultCodingAgentProject,
      scenarioId: "image-generation",
    }));
    const viewModel = createAgentUXViewModel(replayAgentUXEvents(events));
    const chatMarkup = render(<ChatFrame project={defaultCodingAgentProject} viewModel={viewModel} />, "zh");

    expect(chatMarkup).toContain("/output-previews/product-projector.png");
    expect(chatMarkup).toContain("白色便携投影仪");
    expect(chatMarkup).not.toContain("正在生成图片 GeneratedMoodboard.png");
    expect(chatMarkup).not.toContain("图片生成事件流已完成");
  });

  it.each([
    ["image-generation", "media-image-layers", "layers"],
    ["audio-generation", "media-audio-skeleton", "skeleton"],
    ["video-generation", "media-video-frames", "frames"],
  ] as const)("applies selected %s media generation style to chat and output", async (scenarioId, optionId, style) => {
    const project = applyPresetOption(defaultCodingAgentProject, optionId);
    const events = await collectPreviewRunEvents(createPureFrontendPreviewRunner().run({
      prompt: "Generate a rich media asset",
      project,
      scenarioId,
    }));
    const viewModel = createAgentUXViewModel(replayAgentUXEvents(events));
    const outputMarkup = render(<OutputFrame project={project} viewModel={viewModel} />);
    const chatMarkup = render(<ChatFrame project={project} viewModel={viewModel} />);

    expect(outputMarkup).toContain(`data-media-style="${style}"`);
    expect(chatMarkup).toContain(`data-media-style="${style}"`);
  });

  it("renders the image dot flicker loader for the second image preset", async () => {
    const optionMarkup = render(<PresetOptionPreview optionId="media-image-blur" />, "zh");
    const project = applyPresetOption(defaultCodingAgentProject, "media-image-blur");
    const events = await collectPreviewRunEvents(createPureFrontendPreviewRunner().run({
      prompt: "Generate a rich media asset",
      project,
      scenarioId: "image-generation",
    }));
    const viewModel = createAgentUXViewModel(replayAgentUXEvents(events));
    const outputMarkup = render(<OutputFrame project={project} viewModel={viewModel} />);
    const chatMarkup = render(<ChatFrame project={project} viewModel={viewModel} />);

    expect(translatePresetOptionLabel("media-image-blur", "Dot flicker", "zh")).toBe("点阵闪烁");
    expect(optionMarkup).toContain('data-kind="media-image-dot-flicker"');
    expect(outputMarkup).toContain('data-variant="dot-flicker"');
    expect(chatMarkup).toContain('data-variant="dot-flicker"');
  });

  it("renders the image blur flow loader for the third image preset", async () => {
    const optionMarkup = render(<PresetOptionPreview optionId="media-image-palette" />, "zh");
    const project = applyPresetOption(defaultCodingAgentProject, "media-image-palette");
    const events = await collectPreviewRunEvents(createPureFrontendPreviewRunner().run({
      prompt: "Generate a rich media asset",
      project,
      scenarioId: "image-generation",
    }));
    const viewModel = createAgentUXViewModel(replayAgentUXEvents(events));
    const outputMarkup = render(<OutputFrame project={project} viewModel={viewModel} />);
    const chatMarkup = render(<ChatFrame project={project} viewModel={viewModel} />);

    expect(translatePresetOptionLabel("media-image-palette", "Blur flow", "zh")).toBe("模糊流动");
    expect(optionMarkup).toContain('data-kind="media-image-blur-flow"');
    expect(outputMarkup).toContain('data-variant="blur-flow"');
    expect(chatMarkup).toContain('data-variant="blur-flow"');
  });

  it("renders the pixel-grid loader for the fourth image preset", async () => {
    const optionMarkup = render(<PresetOptionPreview optionId="media-image-layers" />, "zh");
    const project = applyPresetOption(defaultCodingAgentProject, "media-image-layers");
    const events = await collectPreviewRunEvents(createPureFrontendPreviewRunner().run({
      prompt: "Generate a rich media asset",
      project,
      scenarioId: "image-generation",
    }));
    const viewModel = createAgentUXViewModel(replayAgentUXEvents(events));
    const outputMarkup = render(<OutputFrame project={project} viewModel={viewModel} />);
    const chatMarkup = render(<ChatFrame project={project} viewModel={viewModel} />);

    expect(translatePresetOptionLabel("media-image-layers", "Glow loading", "zh")).toBe("光晕加载");
    expect(optionMarkup).toContain('data-kind="media-image-pixel-grid"');
    expect(outputMarkup).toContain('data-variant="pixel-grid"');
    expect(chatMarkup).toContain('data-variant="pixel-grid"');
  });

  it.each([
    ["media-audio-skeleton", "骨架加载", "audio-skeleton"],
    ["media-audio-waveform", "音频波浪", "audio-wave"],
    ["media-video-storyboard", "网格扫光", "grid-sweep"],
    ["media-video-cinema", "点阵闪烁", "dot-flicker"],
    ["media-video-timeline", "模糊流动", "blur-flow"],
    ["media-video-frames", "光晕加载", "pixel-grid"],
  ] as const)("renders the media loader visual for %s", (optionId, label, variant) => {
    const optionMarkup = render(<PresetOptionPreview optionId={optionId} />, "zh");

    expect(translatePresetOptionLabel(optionId, label, "zh")).toBe(label);
    expect(optionMarkup).toContain(`data-variant="${variant}"`);
  });

  it.each([
    ["audio-generation", "media-audio-skeleton", "audio-output-preview", "media-player-card", "audio-skeleton"],
    ["video-generation", "media-video-frames", "video-output-preview", "media-player-video", "pixel-grid"],
  ] as const)("renders %s with loading visual and playback demo", async (scenarioId, optionId, outputClass, demoClass, variant) => {
    const project = applyPresetOption(defaultCodingAgentProject, optionId);
    const events = await collectPreviewRunEvents(createPureFrontendPreviewRunner().run({
      prompt: "Generate a rich media asset",
      project,
      scenarioId,
    }));
    const viewModel = createAgentUXViewModel(replayAgentUXEvents(events));
    const outputMarkup = render(<OutputFrame project={project} viewModel={viewModel} />);
    const chatMarkup = render(<ChatFrame project={project} viewModel={viewModel} />);

    expect(outputMarkup).toContain(outputClass);
    expect(outputMarkup).toContain(demoClass);
    expect(outputMarkup).toContain(`data-variant="${variant}"`);
    expect(chatMarkup).toContain(demoClass);
    expect(chatMarkup).toContain(`data-variant="${variant}"`);
  });

  it("renders live LLM prompt history before each assistant response", () => {
    const markup = render(
      <ChatFrame
        project={defaultCodingAgentProject}
        previewPrompts={["First prompt", "Second prompt"]}
        viewModel={viewModelWithTimeline([
          {
            kind: "message",
            id: "assistant_1",
            role: "assistant",
            text: "First answer",
          },
          {
            kind: "message",
            id: "assistant_2",
            role: "assistant",
            text: "Second answer",
          },
        ])}
      />,
    );

    expect(markup.indexOf("First prompt")).toBeLessThan(markup.indexOf("First answer"));
    expect(markup.indexOf("Second prompt")).toBeLessThan(markup.indexOf("Second answer"));
    expect(markup).not.toContain("Add validation to the search input");
  });

  it("links reasoning disclosure and visibility presets to the chat preview", () => {
    const reasoningItem = {
      kind: "reasoning",
      id: "reasoning_test",
      status: "done",
      summary: "Visible reasoning summary.",
      open: false,
    };
    const renderReasoning = (project: typeof defaultCodingAgentProject) =>
      render(
        <IconSetProvider>
          <ChatFrame
            project={project}
            previewPrompt=""
            viewModel={viewModelWithTimeline([reasoningItem])}
          />
        </IconSetProvider>,
      );

    const expandedMarkup = renderReasoning(applyPresetOption(defaultCodingAgentProject, "reasoning-expanded"));
    const summaryFirstMarkup = renderReasoning(applyPresetOption(defaultCodingAgentProject, "summary-first"));
    const collapsedMarkup = renderReasoning(applyPresetOption(defaultCodingAgentProject, "reasoning-auto-collapse"));
    const statusMarkup = renderReasoning(applyPresetOption(defaultCodingAgentProject, "reasoning-status-only"));
    const publicSummaryMarkup = renderReasoning(
      applyPresetOption(applyPresetOption(defaultCodingAgentProject, "reasoning-status-only"), "reasoning-public-summary"),
    );

    expect(expandedMarkup).toContain('data-collapse="expanded"');
    expect(expandedMarkup).toContain('data-toggleable="true"');
    expect(expandedMarkup).toContain("chevron");
    expect(expandedMarkup).toContain("Visible reasoning summary.");
    expect(summaryFirstMarkup).toContain('data-collapse="summary-first"');
    expect(summaryFirstMarkup).toContain('data-toggleable="false"');
    expect(summaryFirstMarkup).not.toContain("chevron");
    expect(summaryFirstMarkup).toContain("Visible reasoning summary.");
    expect(collapsedMarkup).toContain('data-collapse="auto"');
    expect(collapsedMarkup).not.toContain("Visible reasoning summary.");
    expect(statusMarkup).toContain('data-visibility="status"');
    expect(statusMarkup).not.toContain("Visible reasoning summary.");
    expect(publicSummaryMarkup).toContain('data-visibility="summary"');
    expect(publicSummaryMarkup).toContain("Visible reasoning summary.");
  });

  it("renders the output source preset separately from artifact renderers", () => {
    const consoleMarkup = render(
      <OutputFrame
        project={applyPresetOption(defaultCodingAgentProject, "output-source-console")}
        viewModel={viewModelWithTimeline([artifact])}
      />,
    );

    expect(consoleMarkup).toContain('data-output-source="console"');
    expect(consoleMarkup).toContain("Console logs");
    expect(consoleMarkup).toContain("terminal-output");
  });

  it("renders opened output tabs with close controls and unclipped titles", () => {
    const markup = render(
      <OutputFrame
        project={defaultCodingAgentProject}
        viewModel={viewModelWithTimeline([])}
        openItems={[
          { id: "file:SearchInput.tsx", kind: "file", title: "SearchInput.tsx", body: "const a = 1;" },
          { id: "file:SearchInput.types.ts", kind: "file", title: "SearchInput.types.ts", body: "export type A = string;" },
        ]}
        activeOpenItemId="file:SearchInput.types.ts"
        onSelectOpenItem={() => undefined}
        onCloseOpenItem={() => undefined}
      />,
    );

    expect(markup).toContain("output-tab-close");
    expect(markup).toContain("Close SearchInput.types.ts");
    expect(markup).toContain("SearchInput.types.ts");
  });

  it("renders opened output by file type", () => {
    const imageMarkup = render(
      <OutputFrame
        project={defaultCodingAgentProject}
        viewModel={viewModelWithTimeline([])}
        openItems={[{ id: "file:chart.png", kind: "file", title: "chart.png", language: "png" }]}
        activeOpenItemId="file:chart.png"
      />,
    );
    const uploadedImageMarkup = render(
      <OutputFrame
        project={defaultCodingAgentProject}
        viewModel={viewModelWithTimeline([])}
        openItems={[{ id: "file:upload.png", kind: "file", title: "upload.png", language: "png", imageSrc: "data:image/png;base64,upload" }]}
        activeOpenItemId="file:upload.png"
      />,
    );
    const relatedImageMarkup = render(
      <OutputFrame
        project={defaultCodingAgentProject}
        viewModel={viewModelWithTimeline([])}
        openItems={[
          { id: "file:chart.test.png", kind: "file", title: "chart.test.png", language: "png" },
          { id: "file:chart.types.png", kind: "file", title: "chart.types.png", language: "png" },
        ]}
        activeOpenItemId="file:chart.types.png"
      />,
    );
    const htmlMarkup = render(
      <OutputFrame
        project={defaultCodingAgentProject}
        viewModel={viewModelWithTimeline([])}
        openItems={[{ id: "file:preview.html", kind: "file", title: "preview.html", language: "html", body: "<h1>Preview</h1>" }]}
        activeOpenItemId="file:preview.html"
      />,
    );
    const markdownMarkup = render(
      <OutputFrame
        project={defaultCodingAgentProject}
        viewModel={viewModelWithTimeline([])}
        openItems={[{ id: "file:README.md", kind: "file", title: "README.md", language: "markdown", body: "# README\n- Item" }]}
        activeOpenItemId="file:README.md"
      />,
    );

    expect(imageMarkup).toContain('data-render-kind="image"');
    expect(imageMarkup).toContain("image-output-preview");
    expect(uploadedImageMarkup).toContain("data:image/png;base64,upload");
    expect(relatedImageMarkup).toContain("/output-previews/lens.png");
    expect(htmlMarkup).toContain('data-render-kind="html"');
    expect(htmlMarkup).toContain("html-output-preview");
    expect(markdownMarkup).toContain('data-render-kind="markdown"');
    expect(markdownMarkup).toContain("<h4>README</h4>");
  });

  it("renders block presets through error collapse and tool log tail behavior", () => {
    const errorProject = applyPresetOption(defaultCodingAgentProject, "error-collapse");
    const errorMarkup = render(
      <ChatFrame
        project={errorProject}
        viewModel={viewModelWithTimeline([
          {
            kind: "error",
            id: "err_1",
            code: "E_WRITE",
            message: "stack trace: secret internal path",
            userMessage: "Could not write the file.",
          },
        ])}
      />,
    );

    const logProject = applyPresetOption(defaultCodingAgentProject, "tool-log-tail");
    const logMarkup = render(
      <ToolCallCard
        project={logProject}
        tool={{
          kind: "tool",
          id: "tool_shell",
          name: "shell.exec",
          title: "Run tests",
          status: "success",
          args: { cmd: "npm test" },
          result: "line 1\nline 2\nline 3\nline 4\nline 5\nline 6",
          open: true,
        } as never}
      />,
    );

    expect(errorMarkup).toContain('data-collapse="true"');
    expect(errorMarkup).toContain('data-preview-anchor="chat"');
    expect(errorMarkup).toContain("Debug detail hidden in dock");
    expect(errorMarkup).not.toContain("secret internal path");
    expect(logMarkup).toContain("line 4");
    expect(logMarkup).toContain('data-preview-anchor="tool-call"');
    expect(logMarkup).toContain("line 6");
    expect(logMarkup).not.toContain("line 1");
  });

  it("renders file tool actions with clickable references in the expanded body", () => {
    // Asserts the zh copy, so pin the locale rather than relying on the stored default.
    const tool = {
      kind: "tool",
      id: "tool_read_search_input",
      name: "read_file",
      title: "Read SearchInput.tsx",
      status: "success",
      args: { path: "src/SearchInput.tsx" },
      preview: "7 lines",
      open: true,
    } as never;
    const markup = render(
      <IconSetProvider>
        <ToolCallCard
          project={defaultCodingAgentProject}
          tool={tool}
          onOpenArtifact={() => undefined}
        />
      </IconSetProvider>,
      "zh",
    );
    const outputItems = outputPanelItemsFromTool(tool, true);

    expect(markup).toContain('data-file-tool="true"');
    expect(markup).toContain('class="tool-file-list"');
    // ToolCallCard.tsx shortened this label from "已读取文件" to "已读取".
    expect(markup).toContain("已读取");
    expect(markup).toContain("tool-title-file tool-file-row-name");
    expect(markup).toContain('data-artifact-ref="src/SearchInput.tsx"');
    expect(markup).toContain(">SearchInput.tsx</button>");
    expect(markup).not.toContain('class="display-block"');
    // One row, one panel item: the file the tool actually named.
    //
    // This used to assert three, because `buildToolFileReferences` derived two siblings from
    // the real filename (`SearchInput.test.tsx`, `SearchInput.types.ts`) and gave them
    // hardcoded diff stats. Against a live model that edited one file, the transcript showed
    // three rows and the artifact panel opened three tabs, two of them naming files that do
    // not exist — empty, because there was nothing to put in them. The test was pinning the
    // fabrication in place.
    expect(outputItems.map((item) => item.id)).toEqual(["file:src/SearchInput.tsx"]);
    expect(outputItems[0]).toMatchObject({
      title: "SearchInput.tsx",
      kind: "file",
      language: "typescript",
    });
  });

  it("renders artifact review cards after the assistant summary without success chrome", () => {
    const markup = render(
      <IconSetProvider>
        <ChatFrame
          project={defaultCodingAgentProject}
          viewModel={viewModelWithTimeline([
            {
              kind: "artifact",
              id: "artifact_search_input",
              artifactKind: "code",
              title: "SearchInput.tsx",
              status: "success",
              content: "const isValid = query.trim().length >= 2;",
            },
            {
              kind: "message",
              id: "msg_done",
              role: "assistant",
              text: "Validation and loading state added.",
            },
          ])}
          onOpenArtifact={() => undefined}
        />
      </IconSetProvider>,
      "zh",
    );

    expect(markup.indexOf("Validation and loading state added.")).toBeLessThan(markup.indexOf("artifact-launch-card"));
    expect(markup).toContain("Agent Component Composer");
    expect(markup).toContain("网站");
    expect(markup).toContain("打开方式");
    expect(markup).not.toContain("撤销");
    expect(markup).not.toContain("审核");
    expect(markup).not.toContain("artifact-inline-status");
  });

  it("renders approval presets as explicit Yes, Always, and No decisions", () => {
    const pendingTool = {
      kind: "tool",
      id: "tool_rm_cache",
      name: "rm",
      title: "Remove temp cache",
      status: "awaiting_approval",
      approval: {
        prompt: "Remove .agent/tmp-cache recursively?",
        argsPreview: { path: ".agent/tmp-cache", recursive: true, force: true },
      },
      open: true,
    } as never;
    const inlineMarkup = render(
      <IconSetProvider>
        <ToolCallCard
          project={applyPresetOption(defaultCodingAgentProject, "tool-approval-inline")}
          tool={pendingTool}
        />
      </IconSetProvider>,
    );
    const externalMarkup = render(
      <IconSetProvider>
        <ChatFrame
          project={applyPresetOption(defaultCodingAgentProject, "tool-approval-hidden")}
          viewModel={viewModelWithTimeline([pendingTool])}
        />
      </IconSetProvider>,
    );
    const outputMarkup = render(
      <OutputFrame
        project={applyPresetOption(defaultCodingAgentProject, "tool-approval-hidden")}
        viewModel={viewModelWithTimeline([pendingTool])}
      />,
    );

    expect(inlineMarkup).toContain('data-approval-surface="inline"');
    expect(inlineMarkup).toContain("Remove .agent/tmp-cache recursively?");
    expect(inlineMarkup).toContain("rm -rf .agent/tmp-cache");
    expect(inlineMarkup).toContain('data-approval-action="yes"');
    expect(inlineMarkup).toContain('data-approval-action="always"');
    expect(inlineMarkup).toContain('data-approval-action="no"');
    expect(externalMarkup).toContain('data-approval-surface="external"');
    expect(externalMarkup).toContain('data-preview-anchor="external-approval"');
    expect(externalMarkup).toContain("Remove temp cache");
    expect(externalMarkup).toContain("Remove .agent/tmp-cache recursively?");
    expect(externalMarkup).toContain('data-approval-action="yes"');
    expect(externalMarkup).toContain('data-approval-action="always"');
    expect(externalMarkup).toContain('data-approval-action="no"');
    expect(externalMarkup).not.toContain('data-approval-surface="inline"');
    expect(outputMarkup).not.toContain('data-approval-surface="external"');
  });

  // SKIPPED: GitFrame is intentionally short-circuited to a "coming soon" placeholder —
  // see the early return at GitFrame.tsx:35 ("V1: Git is not shipped yet"), which leaves
  // the real git surface below it as unreachable code. These two tests describe that
  // surface, so they are kept (not deleted) and must be re-enabled together with the
  // feature. Do NOT "fix" them by resurrecting the unreachable branch.
  it.skip("renders git status and commit message content only when the git presets enable them", () => {
    const enabledMarkup = render(<GitFrame project={defaultCodingAgentProject} />);
    const withoutMessageMarkup = render(
      <GitFrame project={applyPresetOption(defaultCodingAgentProject, "commit-message")} />,
    );
    const withoutActionMarkup = render(
      <GitFrame project={applyPresetOption(defaultCodingAgentProject, "commit-action")} />,
    );

    expect(enabledMarkup).toContain("git-status");
    expect(enabledMarkup).toContain("codex/agentcanvas-presets");
    expect(enabledMarkup).toContain("commit-message-panel");
    expect(enabledMarkup).toContain('data-preview-anchor="git"');
    expect(enabledMarkup).toContain("Edited files");
    expect(enabledMarkup).toContain("14 files");
    expect(enabledMarkup).toContain("Update AgentUX scaffold presets");
    expect(withoutMessageMarkup).not.toContain("commit-message-panel");
    expect(withoutMessageMarkup).toContain(">Commit</button>");
    expect(withoutActionMarkup).toContain("disabled");
  });

  // SKIPPED: GitFrame is intentionally short-circuited to a "coming soon" placeholder —
  // see the early return at GitFrame.tsx:35 ("V1: Git is not shipped yet"), which leaves
  // the real git surface below it as unreachable code. These two tests describe that
  // surface, so they are kept (not deleted) and must be re-enabled together with the
  // feature. Do NOT "fix" them by resurrecting the unreachable branch.
  it.skip("renders git mock state from preview runner projection instead of static placeholders", () => {
    const gitState: GitPreviewState = {
      branch: "codex/custom-preview",
      status: "dirty",
      ahead: 3,
      changedFiles: [
        { path: "src/agent/PreviewPanel.tsx", status: "modified", additions: 8, deletions: 2 },
        { path: "src/agent/git/mockState.ts", status: "added", additions: 32, deletions: 0 },
      ],
      diffTitle: "CustomPreview.diff",
      suggestedCommitMessage: "Preview custom Git state",
      mockOnly: true,
      pushEnabled: false,
    };
    const markup = render(<GitFrame project={defaultCodingAgentProject} gitState={gitState} />);

    expect(markup).toContain("codex/custom-preview");
    expect(markup).toContain("dirty · ahead 3 · mock");
    expect(markup).toContain("Edited files <span>2 files</span>");
    expect(markup).toContain("src/agent/git/mockState.ts");
    expect(markup).toContain(">+32</span>");
    expect(markup).toContain(">−0</span>");
    expect(markup).toContain("Preview custom Git state");
    expect(markup).not.toContain("src/runtime/toolDisplaySpec.ts");
  });

  it("renders conversation presets as message actions", () => {
    const actionProject = applyPresetOption(defaultCodingAgentProject, "message-actions");
    const hiddenLabelsProject = applyPresetOption(actionProject, "speaker-labels");

    const actionMarkup = render(
      <ChatFrame
        project={actionProject}
        viewModel={viewModelWithTimeline([
          {
            kind: "message",
            id: "msg_1",
            role: "assistant",
            text: "Validation and loading state added.",
          },
        ])}
      />,
    );
    const hiddenLabelsMarkup = render(
      <ChatFrame
        project={hiddenLabelsProject}
        viewModel={viewModelWithTimeline([
          {
            kind: "message",
            id: "msg_1",
            role: "assistant",
            text: "Validation and loading state added.",
          },
        ])}
      />,
    );

    expect(actionMarkup).toContain("message-actions");
    expect(actionMarkup).toContain('class="assistant-turn-label"');
    expect(actionMarkup).toContain('aria-label="Agent output"');
    expect(actionMarkup).toContain("Agent</div>");
    // ChatFrame differentiates the anchor by role now (user- / agent-).
    expect(actionMarkup).toContain('data-preview-anchor="user-message-actions"');
    expect(actionMarkup).toContain('data-preview-anchor="agent-message-actions"');
    expect(actionMarkup).toContain("message-action-icon");
    expect(actionMarkup).toContain('data-message-actions="user"');
    expect(actionMarkup).toContain('data-message-actions="assistant"');
    expect(actionMarkup).toContain('aria-label="Copy prompt"');
    expect(actionMarkup).toContain('aria-label="Edit prompt and rerun"');
    expect(actionMarkup).toContain('aria-label="Copy response"');
    expect(actionMarkup).toContain('aria-label="Regenerate response"');
    expect(actionMarkup).not.toContain('aria-label="Edit message"');
    expect(actionMarkup).not.toContain('aria-label="Stop generation"');
    expect(actionMarkup).toContain("<svg");
    expect(actionMarkup).not.toContain(">Copy</button>");
    expect(actionMarkup).not.toContain(">Regenerate</button>");
    expect(actionMarkup).not.toContain(">Edit</button>");
    expect(actionMarkup).not.toContain(">Stop</button>");
    expect(hiddenLabelsMarkup).not.toContain('class="assistant-turn-label"');
    expect(hiddenLabelsMarkup).not.toContain("Agent</div>");
    expect(hiddenLabelsMarkup).not.toContain("You</div>");
  });

  it("renders the submitted preview prompt as the user turn", () => {
    const markup = render(
      <ChatFrame
        project={defaultCodingAgentProject}
        viewModel={viewModelWithTimeline([
          {
            kind: "message",
            id: "msg_1",
            role: "assistant",
            text: "Pure front-end preview run complete.",
          },
        ])}
        previewPrompt="Test artifacts without a harness"
      />,
    );

    expect(markup).toContain("Test artifacts without a harness");
    expect(markup).not.toContain("Add validation to the search input");
  });

  it("keeps composer prompt context limited to next-request attachments", () => {
    const markup = render(
      <ComposerFrame
        project={defaultCodingAgentProject}
        modelOptions={["gpt-4o"]}
        onSubmit={() => undefined}
        onProviderChange={() => undefined}
        onModelChange={() => undefined}
      />,
    );

    expect(markup).toContain('data-preview-anchor="composer"');
    // ComposerFrame used to seed `attachedFiles` with demo entries (SearchInput.tsx,
    // screenshot.png); that hardcoded fixture data was removed, so the context row only
    // appears once the user actually attaches something. A freshly mounted composer must
    // therefore carry no preloaded context at all.
    expect(markup).not.toContain('data-preview-anchor="prompt-context"');
    expect(markup).not.toContain("SearchInput.tsx");
    expect(markup).not.toContain("screenshot.png");
    // And none of the ambient-context surfaces that were deliberately dropped.
    expect(markup).not.toContain("Edited files");
    expect(markup).not.toContain("AGENTS.md");
    expect(markup).not.toContain("Project memory");
    expect(markup).not.toContain("Clear context");
    expect(markup).not.toContain("Current task");
    expect(markup).not.toContain("Source hints");
  });

  it("renders send as the idle composer submit control", () => {
    const markup = render(
      <ComposerFrame
        project={defaultCodingAgentProject}
        modelOptions={["gpt-4o"]}
        onSubmit={() => undefined}
        onProviderChange={() => undefined}
        onModelChange={() => undefined}
      />,
    );

    expect(markup).toContain(">Send</button>");
    expect(markup).not.toContain(">Stop</button>");
    expect(markup).not.toContain("Send / Stop");
    expect(markup).not.toContain('class="stop-button"');
    expect(markup).not.toContain("data-stop-control");
  });

  it("renders provider and model as one combined composer selector", () => {
    const project = applyPresetOption(defaultCodingAgentProject, "provider-gemini");
    const markup = render(
      <ComposerFrame
        project={project}
        modelOptions={["gemini-2.5-pro", "gemini-2.5-flash"]}
        onSubmit={() => undefined}
        onProviderChange={() => undefined}
        onModelChange={() => undefined}
      />,
    );

    // SelectMenu wraps the trigger, so the class sits alongside others now.
    expect(markup).toContain("provider-model-picker");
    expect(markup).toContain('class="provider-model-summary"');
    expect(markup).toContain("provider-model-menu");
    expect(markup).not.toContain(">Gemini</span>");
    expect(markup).not.toContain(">Provider</span>");
    expect(markup).not.toContain(">Model</span>");
    expect(markup).toContain("gemini-2.5-pro");
    expect(markup).not.toContain(">Anthropic</option>");
  });

  it("renders Stop as the primary composer action while a Live LLM request is running", () => {
    const markup = render(
      <ComposerFrame
        project={defaultCodingAgentProject}
        isRunning
        modelOptions={["gpt-4o", "gpt-4o-mini"]}
        onStop={() => undefined}
        onSubmit={() => undefined}
        onProviderChange={() => undefined}
        onModelChange={() => undefined}
      />,
    );

    expect(markup).toContain(">Stop</button>");
    expect(markup).not.toContain("Send / Stop");
  });

  it("renders the provider settings launcher as an opt-in composer toolbar slot", () => {
    const disabledMarkup = render(
      <ProviderFloatingSettings
        project={defaultCodingAgentProject}
        sessionKeys={{}}
        onFetchModels={() => undefined}
        onSave={() => undefined}
        onSetDefaultProvider={() => undefined}
        onSessionKeyChange={() => undefined}
        onTestProvider={() => undefined}
        onUpdateProvider={() => undefined}
      />,
    );
    const project = applyPresetOption(
      applyPresetOption(defaultCodingAgentProject, "provider-gemini"),
      "provider-settings-launcher",
    );
    const openMarkup = render(
      <ProviderFloatingSettings
        defaultOpen
        project={project}
        sessionKeys={{ openai: "sk-live-preview" }}
        onFetchModels={() => undefined}
        onSave={() => undefined}
        onSetDefaultProvider={() => undefined}
        onSessionKeyChange={() => undefined}
        onTestProvider={() => undefined}
        onUpdateProvider={() => undefined}
      />,
      "zh",
    );

    expect(disabledMarkup).toBe("");
    expect(openMarkup).toContain('data-provider-settings-launcher="true"');
    expect(openMarkup).toContain('aria-label="提供方设置"');
    expect(openMarkup).toContain('data-provider-settings-popover="true"');
    expect(openMarkup).toContain("OpenAI");
    expect(openMarkup).toContain('value="sk-live-preview"');
    expect(openMarkup).toContain("Gemini");
    expect(openMarkup).toContain("https://generativelanguage.googleapis.com/v1beta/openai/");
    expect(openMarkup).not.toContain("Anthropic");

    const composerMarkup = render(
      <ComposerFrame
        project={project}
        modelOptions={["gemini-2.5-pro", "gemini-2.5-flash"]}
        providerSettingsControl={(
          <ProviderFloatingSettings
            project={project}
            sessionKeys={{}}
            onFetchModels={() => undefined}
            onSave={() => undefined}
            onSetDefaultProvider={() => undefined}
            onSessionKeyChange={() => undefined}
            onTestProvider={() => undefined}
            onUpdateProvider={() => undefined}
          />
        )}
        onSubmit={() => undefined}
        onProviderChange={() => undefined}
        onModelChange={() => undefined}
      />,
    );

    expect(composerMarkup.indexOf('data-provider-settings-launcher="true"')).toBeGreaterThan(-1);
    expect(composerMarkup.indexOf('data-provider-settings-launcher="true"')).toBeGreaterThan(
      composerMarkup.indexOf('class="provider-model-picker"'),
    );
  });
});
