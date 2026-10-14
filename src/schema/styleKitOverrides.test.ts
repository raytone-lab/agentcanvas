import { describe, expect, it } from "vitest";
import { defaultCodingAgentProject, type PresetStyleId } from "./agentuxConfig";
import { applyStyleKit, styleKitOptionIds, STYLE_KIT_OVERRIDES } from "./styleKit";
import { selectablePresetStyleOptions, styleKitIndex } from "../app/projection/presetRailData";

const kitFor = (style: PresetStyleId) =>
  styleKitOptionIds(styleKitIndex(style), STYLE_KIT_OVERRIDES[style] ?? []);

describe("game style gets the hourglass", () => {
  it("survives the kit's reconciliation and wins its section", () => {
    const kit = styleKitOptionIds(styleKitIndex("game"), STYLE_KIT_OVERRIDES.game ?? []);
    expect(kit).toContain("thinking-hourglass");
    const project = applyStyleKit(defaultCodingAgentProject, kit);
    expect(project.theme.motion.reasoning).toBe("hourglass");
    // And it displaced the generic pick rather than sitting alongside it.
    for (const other of ["thinking-wave", "thinking-pulse", "thinking-bars", "thinking-orbit"]) {
      expect(kit, other).not.toContain(other);
    }
  });

  it("leaves the other styles on the index rule", () => {
    for (const style of selectablePresetStyleOptions.map((s) => s.id).filter((id) => id !== "game")) {
      const kit = styleKitOptionIds(styleKitIndex(style), STYLE_KIT_OVERRIDES[style] ?? []);
      expect(kit, style).not.toContain("thinking-hourglass");
    }
  });
});

describe("no style opens with the tool progress bar", () => {
  /*
   * It was never chosen. The bar's "Progress" section holds one card, and a
   * section of one cannot be measured as either/or — `isExclusiveSection` needs
   * two members to watch one displace the other — so the kit reads it as
   * additive and takes the whole section. That turned a behaviour opt-in into a
   * default for all six styles, and painted a 3px fully-rounded track across
   * the conversation column of each.
   *
   * The card stays in the rail. This only stops it arriving unasked.
   */
  it("leaves it out of every style's kit", () => {
    for (const style of selectablePresetStyleOptions.map((s) => s.id)) {
      expect(kitFor(style), style).not.toContain("tool-progress-bar");
    }
  });

  it("falls back to the status icon rather than to an unset field", () => {
    const project = applyStyleKit(defaultCodingAgentProject, kitFor("studio"));
    expect(project.toolCalls.progress).toBe("status-icon");
  });

  it("does not take the rest of its section down with it", () => {
    // An exclusion removes one id, not its section: the tool-call group has to
    // come through otherwise intact, or a style would open with tool cards it
    // never configured.
    const kit = kitFor("studio");
    for (const sibling of ["tool-detail-full", "command-cards", "compact-chips"]) {
      const anyToolOption = kit.some((id) => id === sibling);
      if (anyToolOption) return;
    }
    expect(kit.some((id) => id.startsWith("tool-") || id.endsWith("-cards"))).toBe(true);
  });
});
