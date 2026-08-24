import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { defaultCodingAgentProject } from "../../schema/agentuxConfig";
import { ComposerFrame } from "./ComposerFrame";

describe("ComposerFrame controls", () => {
  it("keeps developer-only capability status out of composer control labels", () => {
    const markup = renderToStaticMarkup(
      <ComposerFrame
        project={defaultCodingAgentProject}
        modelOptions={["gpt-4o"]}
        onModelChange={vi.fn()}
        onProviderChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(markup).toContain("中等");
    expect(markup).toContain("请求权限");
    expect(markup).toContain("budget-mode-trigger");
    expect(markup).toContain("provider-model-picker");
    expect(markup).not.toContain("UI-only");
  });

  it("orders model, voice, and send controls in minimal style", () => {
    const project = {
      ...defaultCodingAgentProject,
      composer: { ...defaultCodingAgentProject.composer, mic: true },
      theme: { ...defaultCodingAgentProject.theme, stylePreset: "illustrated" as const },
    };

    const markup = renderToStaticMarkup(
      <ComposerFrame
        project={project}
        modelOptions={["gpt-4o"]}
        onModelChange={vi.fn()}
        onProviderChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(markup).toContain("combined-model-budget-trigger");
    expect(markup).toContain("gpt-4o");
    expect(markup).toContain("中等");
    expect(markup).not.toContain("budget-mode-trigger");
    expect(markup).not.toContain("provider-model-picker");
    const triggerMarkup = markup.match(/<button[^>]*combined-model-budget-trigger[\s\S]*?<\/button>/)?.[0] ?? "";
    expect(triggerMarkup).not.toContain("composer-menu-chevron");
    expect(markup.indexOf("combined-model-budget-trigger")).toBeLessThan(markup.indexOf("composer-voice"));
    expect(markup.indexOf("composer-voice")).toBeLessThan(markup.indexOf("send-button"));
    expect(markup.indexOf("combined-model-budget-trigger")).toBeLessThan(markup.indexOf("send-button"));
  });

  it("disables send while the composer is empty", () => {
    const markup = renderToStaticMarkup(
      <ComposerFrame
        project={defaultCodingAgentProject}
        modelOptions={["gpt-4o"]}
        onModelChange={vi.fn()}
        onProviderChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const sendButton = markup.match(/<button(?=[^>]*send-button)[^>]*>/)?.[0] ?? "";

    expect(sendButton).toContain("disabled");
  });

  it("renders voice input with idle and listening wave layers", () => {
    const project = {
      ...defaultCodingAgentProject,
      composer: { ...defaultCodingAgentProject.composer, mic: true },
    };

    const markup = renderToStaticMarkup(
      <ComposerFrame
        project={project}
        modelOptions={["gpt-4o"]}
        onModelChange={vi.fn()}
        onProviderChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(markup).toContain("composer-voice");
    expect(markup).toContain("composer-voice-idle");
    expect(markup).toContain("composer-voice-wave");
  });

  it("renders Stop as a button-level abort control while Live LLM is running", () => {
    const markup = renderToStaticMarkup(
      <ComposerFrame
        project={defaultCodingAgentProject}
        modelOptions={["gpt-4o"]}
        isRunning
        onModelChange={vi.fn()}
        onProviderChange={vi.fn()}
        onStop={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(markup).toContain('type="button"');
    expect(markup).toContain(">停止</button>");
  });
});
