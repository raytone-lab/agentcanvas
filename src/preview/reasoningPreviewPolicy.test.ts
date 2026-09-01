import { describe, expect, it } from "vitest";

import { defaultCodingAgentProject } from "../schema/agentuxConfig";
import { applyPresetOption } from "../schema/presetActions";
import { createReasoningRenderPolicy } from "./reasoningPreviewPolicy";

describe("reasoning preview policy", () => {
  it("closes a finished block for every disclosure preset except expanded", () => {
    // `summary-first` used to stay open. That read as "show the summary" while no backend sent
    // reasoning text, but once Pi began carrying `reasoning.delta` an open finished block
    // displayed the model's full raw reasoning inline — the opposite of what the preset
    // describes, and unreadable to scroll past.
    for (const preset of ["summary-first", "reasoning-auto-collapse", "reasoning-status-only"]) {
      expect(
        createReasoningRenderPolicy(applyPresetOption(defaultCodingAgentProject, preset)),
        `${preset} 完成后应折叠`,
      ).toMatchObject({ collapseWhenDone: true });
    }

    // The default composition, which is what a run shows unless the user changed it.
    expect(createReasoningRenderPolicy(defaultCodingAgentProject)).toMatchObject({
      show: "summary",
      collapseWhenDone: true,
    });
  });

  it("keeps the expanded preset open, since that is the whole point of it", () => {
    expect(createReasoningRenderPolicy(applyPresetOption(defaultCodingAgentProject, "reasoning-expanded")))
      .toMatchObject({ collapseWhenDone: false });
  });

  it("carries the disclosure level through untouched", () => {
    expect(createReasoningRenderPolicy(applyPresetOption(defaultCodingAgentProject, "reasoning-status-only")))
      .toMatchObject({ show: "status" });
    expect(createReasoningRenderPolicy(applyPresetOption(defaultCodingAgentProject, "summary-first")))
      .toMatchObject({ show: "summary" });
  });

  it("opens the block while the run is still going", () => {
    // Collapsing only applies when finished; watching a run should show the thinking happen.
    expect(createReasoningRenderPolicy(defaultCodingAgentProject)).toMatchObject({
      defaultOpenWhileRunning: true,
    });
  });
});
