import { describe, expect, it } from "vitest";

import { defaultCodingAgentProject } from "../schema/agentuxConfig";
import { applyPresetOption } from "../schema/presetActions";
import { createReasoningRenderPolicy } from "./reasoningPreviewPolicy";

describe("reasoning preview policy", () => {
  it("opens summary-forward and expanded disclosure presets", () => {
    expect(createReasoningRenderPolicy(applyPresetOption(defaultCodingAgentProject, "summary-first"))).toMatchObject({
      show: "summary",
      collapseWhenDone: false,
    });
    expect(createReasoningRenderPolicy(applyPresetOption(defaultCodingAgentProject, "reasoning-expanded"))).toMatchObject({
      show: "summary",
      collapseWhenDone: false,
    });
  });

  it("keeps auto collapse and status-only presets compact", () => {
    expect(createReasoningRenderPolicy(applyPresetOption(defaultCodingAgentProject, "reasoning-auto-collapse"))).toMatchObject({
      show: "summary",
      collapseWhenDone: true,
    });
    expect(createReasoningRenderPolicy(applyPresetOption(defaultCodingAgentProject, "reasoning-status-only"))).toMatchObject({
      show: "status",
      collapseWhenDone: true,
    });
  });
});
