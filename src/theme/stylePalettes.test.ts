import { describe, expect, it } from "vitest";
import { presetGroups } from "../schema/presets";
import { themeTokens, type ThemePresetId } from "./themeTokens";

/**
 * The theme cards, grouped the way the rail groups them.
 *
 * Read off the schema rather than from the `*ThemePresetIds` exports, because a
 * hand-written list of "these styles ship four" has now drifted twice — both
 * 复古像素风 and 手绘风 shipped four palettes that none of these invariants was
 * looking at. `themeStyle` is the same field the rail filters the cards on, so
 * a style whose cards are visible is a style these checks cover.
 */
function palettesByStyle(): Map<string, ThemePresetId[]> {
  const byStyle = new Map<string, ThemePresetId[]>();
  for (const group of presetGroups) {
    for (const option of group.options) {
      const style = option.themeStyle;
      if (!style) continue;
      byStyle.set(style, [...(byStyle.get(style) ?? []), option.id as ThemePresetId]);
    }
  }
  return byStyle;
}

/**
 * The styles that ship a curated set of four.
 *
 * Both halves matter. The set is *derived* by count, so the next style shipping
 * four is held to these invariants the day it lands, with no edit here. The
 * membership is then asserted, so a style quietly dropping to three fails
 * loudly instead of slipping out of the set that was checking it.
 *
 * Absent on purpose: `native` is the catch-all (sixteen cards across seven
 * fonts — the atlas and minimal families ride along with it), `illustrated`
 * carries six, and `zine` / `workbuddy` ship one or two. None of them claims to
 * be a four-colourway style.
 *
 * `retro` joined the set: it shipped one paper, and the style picker now offers
 * four colourways per style, so it was given linen, sepia and dusk. All four
 * are light — its chrome is exported Figma artwork with dark ink baked in, so a
 * dark canvas would make the send button and the chevrons disappear. The
 * light/dark invariant below is written to allow that.
 */
const FOUR_PALETTE_STYLES = ["studio", "game", "pixel", "pixeldesk", "handdrawn", "retro", "inkwash"];

describe("per-style palettes", () => {
  it("knows which styles claim a curated set of four", () => {
    const shipsFour = [...palettesByStyle()]
      .filter(([, ids]) => ids.length === 4)
      .map(([style]) => style);
    expect(shipsFour.sort()).toEqual([...FOUR_PALETTE_STYLES].sort());
  });

  it("ships four per style, each visibly distinct", () => {
    for (const style of FOUR_PALETTE_STYLES) {
      const ids = palettesByStyle().get(style) ?? [];
      expect(ids.length, style).toBe(4);
      const canvases = ids.map((id) => themeTokens[id].surface.canvas);
      expect(new Set(canvases).size, `${style} canvases`).toBe(4);
      const accents = ids.map((id) => themeTokens[id].accent.action);
      expect(new Set(accents).size, `${style} accents`).toBeGreaterThanOrEqual(3);
    }
  });

  it("gives every style both appearances to choose from", () => {
    /*
     * `retro` is the one exemption, and it is a constraint rather than an
     * oversight: this style draws its chrome from exported Figma artwork
     * (`/retro/send-button.svg`, `/retro/chevron.svg`, a dozen more) and those
     * files bake their own dark ink. On a dark canvas they would be
     * dark-on-dark and vanish, so its four colourways move the paper and the
     * ink within the range that artwork survives.
     *
     * Undoing this means converting that artwork to masks, the way 游戏风's
     * corner ornaments were done, and then adding a real dark paper. Listed
     * here rather than dropped from the set above, so the other three
     * invariants still hold it to four distinct, single-font colourways.
     */
    const BAKED_ARTWORK_STYLES = new Set(["retro"]);
    for (const style of FOUR_PALETTE_STYLES) {
      if (BAKED_ARTWORK_STYLES.has(style)) continue;
      const ids = palettesByStyle().get(style) ?? [];
      const appearances = new Set(ids.map((id) => themeTokens[id].appearance));
      expect(appearances, style).toEqual(new Set(["light", "dark"]));
    }
  });

  it("keeps the font fixed within a style, because the font is the style", () => {
    for (const style of FOUR_PALETTE_STYLES) {
      const ids = palettesByStyle().get(style) ?? [];
      const fonts = new Set(ids.map((id) => JSON.stringify(themeTokens[id].font)));
      expect(fonts.size, style).toBe(1);
    }
  });
});
