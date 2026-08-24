import { describe, expect, it } from "vitest";

import { presetGroups, presetGroupsForTemplate, resolvePresetGroupSelection } from "./presets";

describe("template preset groups", () => {
  it("keeps Git out of ordinary chat presets", () => {
    expect(presetGroupsForTemplate("chat").map((group) => group.id)).toEqual([
      "media-generation",
      "conversation",
      "sidebar",
      "ux-effects",
      "tool-calls",
      "blocks",
      "composer",
      "provider",
      "output",
      "render",
      "theme",
    ]);
  });

  it("keeps Git available for the coding template", () => {
    expect(presetGroupsForTemplate("coding").map((group) => group.id)).toEqual([
      "media-generation",
      "conversation",
      "sidebar",
      "ux-effects",
      "tool-calls",
      "blocks",
      "composer",
      "provider",
      "output",
      "render",
      "git",
      "theme",
    ]);
  });

  it("moves a hidden selected group back to the first visible preset", () => {
    expect(resolvePresetGroupSelection("git", "chat")).toBe("media-generation");
    expect(resolvePresetGroupSelection("git", "coding")).toBe("git");
  });

  it("keeps prompt context out of the primary preset menu", () => {
    expect(presetGroups.some((group) => String(group.id) === "context")).toBe(false);
    expect(presetGroups.flatMap((group) => group.options).map((option) => option.id)).not.toEqual(
      expect.arrayContaining(["working-set", "instruction-chips", "memory-panel", "clear-context"]),
    );
  });

  it("keeps low-frequency first-run states out of primary conversation presets", () => {
    const conversation = presetGroups.find((group) => group.id === "conversation");

    expect(conversation?.options.map((option) => option.id)).toEqual([
      "writing-smooth",
      "writing-typewriter",
      "writing-chunked",
      "speaker-labels",
      "message-actions",
    ]);
    expect(conversation?.options.some((option) => option.id.includes("empty"))).toBe(false);
  });

  it("keeps stop generation in composer run controls instead of message actions", () => {
    const conversation = presetGroups.find((group) => group.id === "conversation");
    const composer = presetGroups.find((group) => group.id === "composer");

    expect(conversation?.options.find((option) => option.id === "message-actions")?.description).not.toContain("stop");
    expect(composer?.options.map((option) => option.id)).toEqual([
      "upload",
      "mic",
      "budget",
      "model-config",
      "model-tools",
      "tool-approval-inline",
      "tool-approval-hidden",
      "prompt-shortcuts",
    ]);
  });

  it("exposes mainstream providers as a primary left-rail menu", () => {
    const provider = presetGroups.find((group) => group.id === "provider");

    expect(provider?.options.map((option) => option.id)).toEqual([
      "provider-settings-launcher",
      "provider-openai",
      "provider-anthropic",
      "provider-gemini",
      "provider-openrouter",
      "provider-deepseek",
      "provider-z-ai",
      "provider-moonshot",
      "provider-local",
      "provider-custom",
    ]);
  });

  it("keeps artifact source separate from renderer choices", () => {
    const tools = presetGroups.find((group) => group.id === "tool-calls");
    const blocks = presetGroups.find((group) => group.id === "blocks");
    const output = presetGroups.find((group) => group.id === "output");
    const render = presetGroups.find((group) => group.id === "render");

    expect(tools?.options.map((option) => option.id)).toEqual([
      "command-cards",
      "compact-chips",
      "timeline-rail",
      "tool-detail-full",
      "tool-detail-output-only",
    ]);
    expect(blocks?.options.map((option) => option.id)).toEqual([
      "error-collapse",
    ]);
    expect(output?.options.map((option) => option.id)).toEqual([
      "output-visible",
      "output-source-artifact",
      "output-source-console",
    ]);
    expect(render?.options.map((option) => option.id)).toEqual([
      "renderer-auto",
      "renderer-code",
      "renderer-diff",
      "renderer-markdown",
      "renderer-preview",
      "renderer-data",
    ]);
  });

  it("keeps Git review controls separate from commit permissions", () => {
    const git = presetGroups.find((group) => group.id === "git");

    expect(git?.options.map((option) => option.id)).toEqual([
      "git-visible",
      "branch-status",
      "changed-files",
      "diff-preview",
      "commit-message",
      "commit-action",
    ]);
  });
});
