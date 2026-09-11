import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  CANVAS_BACKGROUNDS,
  DEFAULT_CANVAS_BACKGROUND,
  canvasBackgroundColor,
  type CanvasBackgroundId,
} from "./canvasBackgrounds";

const styles = readFileSync(new URL("../../styles/app.css", import.meta.url), "utf8");

describe("canvas backgrounds", () => {
  it("keeps the colour the canvas has always had as the default", () => {
    expect(canvasBackgroundColor(DEFAULT_CANVAS_BACKGROUND)).toBe("#DDE1E9");
    // And the CSS fallbacks are that colour with no pattern over it, because
    // the exported shell reads the same rule and has no preferences to set the
    // variables from.
    expect(styles).toContain("background-color: var(--canvas-bg, #DDE1E9);");
    expect(styles).toContain("background-image: var(--canvas-bg-image, none);");
    expect(styles).toContain("background-size: var(--canvas-bg-size, auto);");
  });

  it("falls back to a colour rather than to nothing", () => {
    // A stale id from a reloaded session would otherwise paint the canvas
    // transparent, which reads as the page's own background and looks broken.
    expect(canvasBackgroundColor("moss" as CanvasBackgroundId)).toBe("#DDE1E9");
  });

  it("names every option in every language", () => {
    // The dialog reads the label for the current locale; a missing one would
    // render an empty chip next to a swatch.
    for (const background of CANVAS_BACKGROUNDS) {
      for (const locale of ["en", "zh", "ja"] as const) {
        expect(background.label[locale], `${background.id}/${locale}`).toBeTruthy();
      }
      expect(background.color, background.id).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("keeps every backdrop darker than the card it holds", () => {
    // A backdrop's job is to hold a white frame without competing with it, and
    // anything bright next to white reads as the brighter thing. The default is
    // the lightest of them by construction — the rest were asked to carry more
    // grey than it.
    const luminance = (hex: string) =>
      [1, 3, 5].reduce((sum, at) => sum + parseInt(hex.slice(at, at + 2), 16), 0) / 3;
    const slate = luminance(canvasBackgroundColor("slate"));
    for (const background of CANVAS_BACKGROUNDS) {
      expect(luminance(background.color), `${background.id} vs white`).toBeLessThan(0xf0);
      if (background.id === "slate") continue;
      expect(luminance(background.color), `${background.id} vs slate`).toBeLessThanOrEqual(slate);
    }
  });

  it("draws the textured ones at two sizes", () => {
    // The canvas tile and the dialog's 18px swatch cannot be the same: a 16px
    // dot grid puts one dot in the swatch, which reads as a flat colour with a
    // speck on it.
    const textured = CANVAS_BACKGROUNDS.filter((background) => background.texture);
    expect(textured.length).toBeGreaterThanOrEqual(3);
    for (const { id, texture } of textured) {
      expect(texture!.image, id).toMatch(/gradient/);
      // One tile size per gradient layer, or the browser repeats the list and
      // the second layer gets the first one's size.
      const layers = texture!.image.split(/\),\s*(?=[a-z-]+gradient)/).length;
      expect(texture!.size.split(",").length, `${id} sizes`).toBe(layers);
      expect(texture!.swatchSize.split(",").length, `${id} swatch sizes`).toBe(layers);
    }
  });
});
