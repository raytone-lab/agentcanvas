import { describe, it, expect } from "vitest";
import { defaultCodingAgentProject } from "./agentuxConfig";
import { presetGroups } from "./presets";
import { applyPresetOption, isPresetOptionActive, togglePresetOption } from "./presetActions";

describe("preset toggle audit", () => {
  // Pending options are deliberately unwired — presets.test.ts asserts that
  // separately, so applying one here would only re-test the identity patch.
  const ids = presetGroups.flatMap((g) => g.options.filter((o) => !o.pending).map((o) => o.id));

  it("every option: applying then toggling again cancels it (unless it is the baseline-default of a single-select group)", () => {
    const notCancelable: string[] = [];
    for (const id of ids) {
      // Ensure the option is active first.
      const activated = isPresetOptionActive(defaultCodingAgentProject, id)
        ? defaultCodingAgentProject
        : applyPresetOption(defaultCodingAgentProject, id);
      expect(isPresetOptionActive(activated, id), `${id} should be active after apply`).toBe(true);
      // Toggle it off.
      const cancelled = togglePresetOption(activated, id);
      if (isPresetOptionActive(cancelled, id)) {
        notCancelable.push(id);
      }
    }
    // Invariant: any option that can't be cancelled must be the baseline-default
    // of a single-select group (its "neutral" state), never a boolean feature.
    const illegal = notCancelable.filter((id) => !isPresetOptionActive(defaultCodingAgentProject, id));
    expect(illegal).toEqual([]);
  });
});
