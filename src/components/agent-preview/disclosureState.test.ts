import { describe, expect, it } from "vitest";

import { deriveDisclosureOpen } from "./disclosureState";

describe("disclosure state", () => {
  it("follows policy changes unless the user manually toggled the block", () => {
    expect(deriveDisclosureOpen({ desiredOpen: true, currentOpen: false, userToggled: false })).toBe(true);
    expect(deriveDisclosureOpen({ desiredOpen: false, currentOpen: true, userToggled: false })).toBe(false);
    expect(deriveDisclosureOpen({ desiredOpen: false, currentOpen: true, userToggled: true })).toBe(true);
  });
});
