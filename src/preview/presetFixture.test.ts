import { describe, expect, it } from "vitest";

import { fixtureForPresetOption } from "./presetFixture";

describe("preset fixture routing", () => {
  it("routes tool progress and approval presets to the approval lifecycle replay", () => {
    for (const optionId of ["tool-progress-icon", "tool-progress-bar", "tool-approval-inline", "tool-approval-hidden"]) {
      expect(fixtureForPresetOption(optionId, "coding-agent")).toBe("tool-approval");
    }
  });

  it("leaves unrelated presets on the current replay", () => {
    expect(fixtureForPresetOption("unknown-preset", "artifact-action")).toBe("artifact-action");
  });

  it("routes block presets to fixtures that expose the selected block behavior", () => {
    expect(fixtureForPresetOption("renderer-diff", "tool-approval")).toBe("coding-agent");
    expect(fixtureForPresetOption("tool-log-tail", "tool-approval")).toBe("coding-agent");
    expect(fixtureForPresetOption("error-collapse", "coding-agent")).toBe("block-error");
  });

  it("routes structured artifact renderers to the form artifact replay", () => {
    expect(fixtureForPresetOption("renderer-data", "coding-agent")).toBe("artifact-action");
  });

  it("routes common preset options away from stale error fixtures", () => {
    expect(fixtureForPresetOption("writing-smooth", "block-error")).toBe("coding-agent");
    expect(fixtureForPresetOption("compact-chips", "block-error")).toBe("coding-agent");
    expect(fixtureForPresetOption("output-source-artifact", "block-error")).toBe("coding-agent");
    expect(fixtureForPresetOption("provider-openai", "block-error")).toBe("coding-agent");
    expect(fixtureForPresetOption("thinking-bars", "block-error")).toBe("coding-agent");
  });
});
