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
    // And the CSS fallback is the same colour, because the exported shell reads
    // it: it shares the canvas's rule and has no preferences to set the
    // variable from.
    expect(styles).toContain("background: var(--canvas-bg, #DDE1E9);");
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
});
