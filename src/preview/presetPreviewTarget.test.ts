import { describe, expect, it } from "vitest";

import { presetGroups } from "../schema/presets";
import { hasPreviewAnchorForPresetOption, previewAnchorForPresetGroup, previewAnchorForPresetOption } from "./presetPreviewTarget";

describe("preset preview target mapping", () => {
  it("covers every preset option with an explicit preview target", () => {
    const optionIds = presetGroups.flatMap((group) => group.options.map((option) => option.id));

    expect(optionIds.filter((optionId) => !hasPreviewAnchorForPresetOption(optionId))).toEqual([]);
  });

  it("maps conversation presets to chat and message-level anchors", () => {
    expect(previewAnchorForPresetOption("writing-typewriter")).toBe("chat");
    expect(previewAnchorForPresetOption("speaker-labels")).toBe("chat");
    expect(previewAnchorForPresetOption("message-actions")).toBe("message-actions");
  });

  it("maps activity presets to nested timeline anchors", () => {
    expect(previewAnchorForPresetOption("thinking-bars")).toBe("reasoning");
    expect(previewAnchorForPresetOption("reasoning-status-only")).toBe("reasoning");
    expect(previewAnchorForPresetOption("tool-progress-bar")).toBe("tool-call");
    expect(previewAnchorForPresetOption("terminal-log")).toBe("tool-call");
    expect(previewAnchorForPresetOption("tool-log-tail")).toBe("tool-call");
    expect(previewAnchorForPresetOption("error-collapse")).toBe("error-block");
  });

  it("maps composer presets to composer-side anchors", () => {
    expect(previewAnchorForPresetOption("budget")).toBe("composer");
    expect(previewAnchorForPresetOption("tool-approval-inline")).toBe("composer");
    expect(previewAnchorForPresetOption("tool-approval-hidden")).toBe("external-approval");
    expect(previewAnchorForPresetOption("prompt-shortcuts")).toBe("composer");
    expect(previewAnchorForPresetOption("provider-gemini")).toBe("composer");
    expect(previewAnchorForPresetOption("provider-local")).toBe("composer");
  });

  it("maps output and git presets to right panel anchors", () => {
    expect(previewAnchorForPresetOption("output-source-artifact")).toBe("output");
    expect(previewAnchorForPresetOption("output-source-console")).toBe("output");
    expect(previewAnchorForPresetOption("renderer-markdown")).toBe("output");
    expect(previewAnchorForPresetOption("renderer-diff")).toBe("output");
    expect(previewAnchorForPresetOption("branch-status")).toBe("git");
    expect(previewAnchorForPresetOption("commit-message")).toBe("git");
    expect(previewAnchorForPresetOption("commit-action")).toBe("git");
    expect(previewAnchorForPresetOption("diff-preview")).toBe("git");
  });

  it("maps preset group clicks to representative anchors", () => {
    expect(previewAnchorForPresetGroup("conversation")).toBe("chat");
    expect(previewAnchorForPresetGroup("ux-effects")).toBe("reasoning");
    expect(previewAnchorForPresetGroup("tool-calls")).toBe("tool-call");
    expect(previewAnchorForPresetGroup("blocks")).toBe("error-block");
    expect(previewAnchorForPresetGroup("composer")).toBe("composer");
    expect(previewAnchorForPresetGroup("provider")).toBe("composer");
    expect(previewAnchorForPresetGroup("output")).toBe("output");
    expect(previewAnchorForPresetGroup("render")).toBe("output");
    expect(previewAnchorForPresetGroup("git")).toBe("git");
    expect(previewAnchorForPresetGroup("theme")).toBe("chat");
  });
});
