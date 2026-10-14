import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * 手绘风: the artifact card and the composer wear one smooth line and a
 * halftone shadow, and nothing else.
 *
 * Asked for across three rounds — "也要保留流畅的线条边框", then "这两个边框的展示
 * 就用单线流畅条条＋点点投影就好". The count was never the problem: both elements
 * already resolved to exactly one 2px ink overlay (`::before`) plus the dot
 * bands on the right and bottom (`::after`), with no border of their own, no
 * third outline and no selection overlay — measured. The *line* was the
 * problem. `#sketchy-light` displaces 2px on a 2px stroke, which at normal size
 * tears the contour into what reads as a second stippled edge hugging the
 * first; it only resolves into one drawn line at 4× and above.
 */
const css = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, (b) => b.replace(/[^\n]/g, " "));

function ruleFor(test: (selector: string) => boolean): string {
  const clean = strip(css);
  const bodies: string[] = [];
  for (const match of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (test(match[1].replace(/\s+/g, " ").trim())) bodies.push(match[2]);
  }
  return bodies.join("\n");
}

describe("手绘风 card edges", () => {
  it("retires the wobble on those two, by the token", () => {
    /*
     * A custom property, not a `filter` override on the pseudo-elements.
     *
     * The override route is a specificity fight this stylesheet has set three
     * times now: the shared rule's `:is()` list contains
     * `.ui-button.send-button[data-size]`, and `:is()` takes the specificity of
     * its most specific argument — so that rule is (0,5,1) where the obvious
     * override is (0,4,1). Retiring the token the rule *reads* needs no weight
     * at all, and it reaches both pseudo-elements at once.
     */
    const body = ruleFor(
      (sel) =>
        sel.includes('[data-style-preset="handdrawn"]')
        && sel.includes(".artifact-launch-card")
        && sel.includes(".composer-shell")
        && !sel.includes("::"),
    );
    expect(body).toMatch(/--sk-wobble:\s*none/);
  });

  it("keeps the one line and the dots that draw them", () => {
    // The shared rules still have to be there — this change removes a filter,
    // not an edge. `::before` is the line; `::after` is the shadow.
    const line = ruleFor((sel) => sel.includes(".composer-shell") && sel.includes("::before"));
    expect(line).toMatch(/border:\s*var\(--hd-edge\) solid var\(--hd-ink\)/);
    expect(line).toMatch(/filter:\s*var\(--sk-wobble\)/);

    const shadow = ruleFor((sel) => sel.includes(".composer-shell") && sel.includes("::after"));
    expect(shadow).toMatch(/background-image:\s*var\(--hd-shadow-dots\)/);
    // Right edge and bottom edge — a cast shadow, not a ring.
    expect(shadow).toMatch(/background-repeat:\s*repeat-y,\s*repeat-x/);
  });

  it("leaves the small marks their tremor", () => {
    /*
     * Only the two large containers lose it: they have the most edge for a 2px
     * displacement to wander along. The token is still on the branch for
     * everything else, so the pills and the bubbles keep the pen's hand.
     */
    const branch = ruleFor((sel) => sel === '.preview-frame[data-style-preset="handdrawn"]');
    expect(branch).toMatch(/--sk-wobble:\s*url\(#sketchy-light\)/);
  });
});
