import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./app.css", import.meta.url), "utf8");

/**
 * The comic style's scale, as a guard.
 *
 * The spec (docs/STUDIO_ILLUSTRATED_SPEC.md) closes four sets — sizes, weights,
 * radii and line weight — and the point of closing them is that a value outside
 * the set is a mistake rather than a preference. It was worth 66 fixes to get
 * there: hairline borders, 13px labels, weights of 450 and 640 used as dials
 * between the steps the scale allows.
 *
 * Checked against the stylesheet rather than the rendered page because the
 * rendered check needs a browser. The two are complementary: the audit in the
 * spec's §12 catches a legal value landing on the wrong element, this catches an
 * illegal value being written at all. This one runs in CI.
 */

/** Every declaration block whose selector names the comic style. */
function studioDeclarations(): { selector: string; body: string }[] {
  const blocks: { selector: string; body: string }[] = [];
  // Walked rather than matched with a regex: a selector list can span lines, and
  // a pattern anchored with `[^\n{}]*` silently skips exactly those — which is
  // how the centre column's painter stayed hidden through four diagnoses.
  let cursor = 0;
  while (cursor < css.length) {
    const open = css.indexOf("{", cursor);
    if (open === -1) break;
    const close = css.indexOf("}", open);
    if (close === -1) break;
    const selector = css.slice(cursor, open).trim();
    const body = css.slice(open + 1, close);
    // At-rules nest, so their "body" is other rules; those get visited on their
    // own as the walk continues past this point.
    if (!selector.startsWith("@") && selector.includes('data-style-preset="studio"')) {
      blocks.push({ selector: selector.replace(/\s+/g, " "), body });
    }
    cursor = close + 1;
  }
  return blocks;
}

const LEGAL_FONT_SIZE_PX = new Set([11, 14, 15, 16, 20]);
const LEGAL_WEIGHT = new Set([500, 600, 700, 800]);
const LEGAL_RADIUS_PX = new Set([0, 2, 4, 6, 8]);

/**
 * Two weights and no line.
 *
 * `2px` is structure — the frame and the dividers between columns, the only
 * lines that have to read from across the view. `1px` is content: every card,
 * bubble, pill and tile inside a column. `0` is the third legal answer.
 *
 * 1px rather than the 1.5px it was specified as: Chrome floors fractional
 * border widths to whole CSS pixels, so 1.5 computes and paints as 1 anyway.
 * Measured at devicePixelRatio 2 as well as 1 — two device pixels, not three.
 */
const LEGAL_BORDER_WIDTH_PX = new Set([0, 1, 2]);

function declaredValues(property: string): { selector: string; value: string }[] {
  const found: { selector: string; value: string }[] = [];
  for (const { selector, body } of studioDeclarations()) {
    for (const line of body.split(";")) {
      const [name, ...rest] = line.split(":");
      if (name?.trim() !== property) continue;
      const value = rest.join(":").trim();
      if (value) found.push({ selector, value });
    }
  }
  return found;
}

/** Literal px values only; a `var()` is the scale by definition. */
function illegalLiterals(
  property: string,
  legal: ReadonlySet<number>,
  unit: "px" | "" = "px",
): string[] {
  return declaredValues(property)
    .flatMap(({ selector, value }) =>
      value
        .split(/\s+/)
        .filter((token) => (unit === "px" ? /^-?[\d.]+px$/.test(token) : /^\d+$/.test(token)))
        .map((token) => ({ selector, token, n: parseFloat(token) })),
    )
    .filter(({ n }) => !legal.has(n))
    .map(({ selector, token }) => `${property}: ${token}  in  ${selector.slice(0, 90)}`);
}

describe("comic style scale", () => {
  it("declares the token layer the scale is expressed through", () => {
    // The literals live in one place, so a change to the scale is one edit
    // rather than a search. Heights are derived from these, not typed in.
    for (const token of [
      "--st-pad-tight",
      "--st-pad-snug",
      "--st-pad-base",
      "--st-pad-loose",
      "--st-t-label",
      "--st-t-row",
      "--st-t-body",
      "--st-t-title",
      "--st-t-display",
      "--st-r-chip",
      "--st-r-row",
      "--st-r-card",
      "--st-r-panel",
    ]) {
      expect(css, token).toContain(`${token}:`);
    }
  });

  it("writes no font-size off the five-step scale", () => {
    expect(illegalLiterals("font-size", LEGAL_FONT_SIZE_PX)).toEqual([]);
  });

  it("writes no font-weight between the four steps", () => {
    // 450 and 640 are the two this caught: a weight used as a dial rather than
    // as one of the four things type can be in this style.
    expect(illegalLiterals("font-weight", LEGAL_WEIGHT, "")).toEqual([]);
  });

  it("writes one line weight, or none", () => {
    for (const property of ["border-width", "border-top-width", "border-bottom-width"]) {
      expect(illegalLiterals(property, LEGAL_BORDER_WIDTH_PX), property).toEqual([]);
    }
  });

  it("writes no radius off the four tiers", () => {
    for (const property of ["border-radius", "border-top-left-radius"]) {
      expect(illegalLiterals(property, LEGAL_RADIUS_PX), property).toEqual([]);
    }
  });

  it("has no exemptions, because nothing needs one", () => {
    /*
     * There was one, for the artifact card's icon tile: the tile was drawn with
     * a 20px corner and a 3px line, on the argument that an icon tile is a
     * piece of artwork and its outline is part of the drawing.
     *
     * Both numbers were read back as too heavy once on screen and both rejoined
     * the scale — so the argument was never tested, and the exemption is gone
     * rather than kept for a case that did not survive. Asserted rather than
     * merely deleted: an empty exemption list is a property of the style worth
     * failing on if someone adds one silently.
     */
    const tile = studioDeclarations().filter(({ selector }) =>
      selector.includes(".artifact-inline-icon"),
    );
    expect(tile.length).toBeGreaterThan(0);
    expect(tile.some(({ body }) => /border:\s*3px/.test(body))).toBe(false);
    expect(tile.some(({ body }) => /border-radius:\s*20px/.test(body))).toBe(false);
  });

  it("keeps the bubble at the padding its height is computed from", () => {
    /*
     * H = lineBox + 2·padY + 2·border. A single-line bubble is 24 + 20 + 4 = 48,
     * so the padding has to be the 10px step and nothing else.
     *
     * Restated at the generic rule's own shape on purpose: the plain
     * `.preview-frame .message-item[data-role="user"] .msg-surface` carries one
     * more class than a style branch does, so it outranked the branch and the
     * bubble measured 52px while the stylesheet said 10.
     */
    expect(css).toContain(
      '.preview-frame[data-style-preset="studio"] .message-item[data-role="user"] .msg-surface',
    );
    const bubbleRules = studioDeclarations().filter(({ selector }) =>
      selector.includes(".msg-surface"),
    );
    expect(bubbleRules.length).toBeGreaterThan(0);
    const padding = bubbleRules
      .flatMap(({ body }) => body.split(";"))
      .filter((line) => line.split(":")[0]?.trim() === "padding")
      .map((line) => line.split(":").slice(1).join(":").trim());
    expect(padding.length).toBeGreaterThan(0);
    for (const value of padding) {
      expect(value, "vertical inset is the 10px step").toContain("--st-pad-loose");
    }
  });
});
