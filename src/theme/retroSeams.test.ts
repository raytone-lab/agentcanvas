import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * 复古风: no outer border on the canvas, and both column seams at 30%.
 *
 * Asked for as "复古风的画布内容整个外边框去掉，左栏和中栏的间隔线，中栏和右栏的间隔
 * 线透明度降到30%".
 *
 * The two seams are drawn by two different mechanisms in this style, which is
 * why they take two rules: the left one is the sidebar's own `border-right`
 * (this style predates the shared zero-width handle and kept its column edge),
 * and the right one is the shared `.resize-handle::after`, which was off.
 *
 * Measured after, at 1680×1200: frame border `0px none` with the radius and
 * `overflow: hidden` intact, both seams `1px` at alpha 0.302, the panel seam at
 * x=1060 between the columns, and the sidebar's own handle still 0px so nothing
 * doubles up behind its border.
 */
const css = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, (b) => b.replace(/[^\n]/g, " "));

function rules(selector: string): string {
  const clean = strip(css);
  const bodies: string[] = [];
  for (const match of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (match[1].replace(/\s+/g, " ").trim() === selector) bodies.push(match[2]);
  }
  return bodies.join("\n");
}

const FRAME = '.preview-frame[data-style-preset="retro"]';

describe("复古风 seams", () => {
  it("draws no outer border on the canvas", () => {
    const body = rules(FRAME);
    expect(body).toMatch(/(?:^|;|\s)border:\s*0/);
    // The shape is a separate decision from the line, and it stays: this
    // element is `overflow: hidden`, so the radius is what rounds the canvas.
    expect(body).toMatch(/border-radius:\s*clamp\(/);
  });

  it("states the 30% seam once, as a mix so it follows every colourway", () => {
    /*
     * The arithmetic is the part worth pinning: every retro palette's
     * `--border-subtle` is alpha 0.55, and 0.55 × 0.55 = 0.3025 — so *55%* of
     * it is the 30% opacity that was asked for. A literal `30%` here would be
     * alpha 0.165, roughly half as strong as intended.
     */
    expect(rules(FRAME)).toMatch(
      /--retro-seam:\s*color-mix\(in srgb, var\(--border-subtle\) 55%, transparent\)/,
    );
  });

  it("uses it for the left seam, which this style draws as a column edge", () => {
    const body = rules(`${FRAME} .session-sidebar`);
    expect(body).toMatch(/border-right:\s*1px solid var\(--retro-seam\)/);
    // One declaration, not two: a second `border-right` was briefly added at
    // the top of this block and did nothing, because the later one wins.
    expect(body.match(/border-right:/g)).toHaveLength(1);
  });

  it("uses it for the right seam, scoped to the open-panel container", () => {
    /*
     * On `.preview-panels`, never on the style. `--divider-w` is read by every
     * `.resize-handle::after`, and the sidebar has one of its own sitting behind
     * its `border-right` — so setting the token on the branch would print a
     * second line on top of that border. 水墨风 made exactly this mistake and it
     * was reported with a red box round it.
     */
    const body = rules(`${FRAME} .preview-panels`);
    expect(body).toMatch(/--divider-w:\s*1px/);
    expect(body).toMatch(/--divider-c:\s*var\(--retro-seam\)/);
    expect(rules(FRAME)).toMatch(/--divider-w:\s*0/);
  });
});
