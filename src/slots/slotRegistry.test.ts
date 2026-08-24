import { describe, expect, it } from "vitest";

import { defaultCodingAgentProject } from "../schema/agentuxConfig";
import { slotComponentRegistry } from "./slotRegistry";

describe("slot registry", () => {
  it("has a registered renderer for every enabled default slot", () => {
    const missing = defaultCodingAgentProject.layout.slots
      .filter((slot) => slot.enabled)
      .filter((slot) => !slotComponentRegistry[slot.component])
      .map((slot) => slot.component);

    expect(missing).toEqual([]);
  });
});
