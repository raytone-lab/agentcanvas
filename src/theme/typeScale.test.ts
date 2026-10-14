import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * The canvas has three font sizes: 16 / 14 / 12, and every style uses the same
 * three. See `docs/TYPE_SCALE_SPEC.md`.
 *
 * Six styles used twelve sizes between them before this, and none of the
 * divergence was a decision anyone had made — it came from four routes, all of
 * which this file closes:
 *
 *   1. literals in the base layer that every style then inherited,
 *   2. one style carrying a second named scale (漫画风's `--st-t-*`),
 *   3. a role with no size at all, inheriting the frame's 16px root,
 *   4. a rule written against HTML elements (`:is(p, li, span, button …)`)
 *      outweighing the role rules it covered.
 *
 * Asserted against the stylesheet rather than the rendered page on purpose:
 * this is cheap, runs on every commit, and the values are the contract. What it
 * *cannot* see is which rule wins — for that, measure with
 * `CSS.getMatchedStylesForNode` (§5 of the spec).
 */
const css = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

const ALLOWED = new Set([12, 14, 16]);

type Decl = { line: number; selector: string; value: string };

/** Every `font-size` inside a rule that touches the canvas. */
function canvasFontSizes(): Decl[] {
  const out: Decl[] = [];
  const rule = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = rule.exec(css))) {
    const selector = match[1].replace(/\s+/g, " ").trim();
    if (!selector.includes(".preview-frame")) continue;
    for (const decl of match[2].matchAll(/font-size:\s*([^;]+)/g)) {
      out.push({
        line: css.slice(0, match.index).split("\n").length,
        selector,
        value: decl[1].trim(),
      });
    }
  }
  return out;
}

/**
 * Sizes that are deliberately outside the scale, each with its reason.
 *
 * Kept as an explicit list rather than a looser rule: an exception someone has
 * to write down is an exception someone has read.
 */
const EXCEPTIONS: { selector: string; value: string; why: string }[] = [
  {
    selector: '.preview-frame[data-style-preset="workbuddy"] .composer-greeting-text',
    value: "36px",
    why: "A display greeting on an empty canvas — a headline, not a type role. WorkBuddy is a hidden style.",
  },
  {
    /*
     * WorkBuddy is not a style on this scale and is not meant to be: it is a
     * faithful reproduction of an external client, measured from it — 13px
     * bubbles on a 19px line, a 12px file row. `workbuddyStyle.test.ts` asserts
     * those numbers against the original. Tokenising them broke two of those
     * assertions, which is the right outcome: the scale governs the styles the
     * reader can pick, and this one is hidden.
     */
    selector: '.preview-frame[data-style-preset="workbuddy"]',
    value: "13px",
    why: "Measured from the real WorkBuddy client; see `workbuddyStyle.test.ts`. Hidden style.",
  },
  {
    selector: '.preview-frame[data-style-preset="workbuddy"]',
    value: "12px",
    why: "Same — the file row's measured size.",
  },
  {
    selector: '.preview-frame[data-style-preset="pixel"]',
    value: "12px",
    why:
      "The *root* size of 像素风, not a role: its bitmap face has one usable step and every "
      + "length in that branch is a multiple of it. A style may set its own root; what it may not "
      + "do is size a role with a literal.",
  },
];

const isException = (decl: Decl) =>
  EXCEPTIONS.some((e) => decl.selector.includes(e.selector) && decl.value === e.value);

describe("canvas type scale", () => {
  it("has three sizes and no fourth", () => {
    const literals = canvasFontSizes()
      .filter((decl) => !isException(decl))
      .map((decl) => ({ decl, px: /^(\d+(?:\.\d+)?)px$/.exec(decl.value) }))
      .filter((entry): entry is { decl: Decl; px: RegExpExecArray } => Boolean(entry.px))
      // `font-size: 0` is how an icon-only button hides its label; it is not a
      // type size, and reading it as one would flag two send buttons.
      .filter((entry) => Number(entry.px[1]) !== 0)
      .filter((entry) => !ALLOWED.has(Number(entry.px[1])))
      .map((entry) => `${entry.decl.line}: ${entry.decl.value}  ${entry.decl.selector.slice(-70)}`);

    expect(literals).toEqual([]);
  });

  it("lets no style branch write a size of its own", () => {
    /*
     * A style may have its own scale *names* — 漫画风 keeps `--st-t-title` and
     * the four beside it, because the rules that read them are more legible
     * that way — but not its own values. This is the rule that stops the second
     * scale coming back: inside a `[data-style-preset="…"]` rule a font-size
     * must be a token, a `clamp()` (复古风's fluid scale), an `em` (relative to
     * whatever the role already resolved to), `inherit`, or 0.
     */
    const offenders = canvasFontSizes()
      .filter((decl) => decl.selector.includes("data-style-preset="))
      .filter((decl) => !isException(decl))
      .filter((decl) => {
        const v = decl.value;
        if (v.startsWith("var(") || v.startsWith("clamp(") || v === "inherit") return false;
        if (/^0(px)?$/.test(v)) return false;
        if (/em$/.test(v)) return false;
        return true;
      })
      .map((decl) => `${decl.line}: ${decl.value}  ${decl.selector.slice(-70)}`);

    expect(offenders).toEqual([]);
  });

  it("keeps 复古风's fluid scale anchored to the same three sizes", () => {
    /*
     * The one style whose sizes are fluid (`cqi`, tied to the preview's width).
     * Its *maxima* are the shared scale, so at desktop it reads like the other
     * five and only shrinks when the canvas is narrow — and its left column has
     * a second set of the same three, scoped to that column's own container.
     *
     * Both sets are checked: the sidebar's were the ones found rendering at 79%
     * of their intended size, because `cqi` on an `inline-size` container is its
     * *content* box and the coefficients had been derived from the column's
     * full width.
     */
    for (const [name, max] of [
      ["--retro-title", "16px"],
      ["--retro-body", "14px"],
      ["--retro-small", "12px"],
    ] as const) {
      const declarations = [...css.matchAll(new RegExp(`${name}:\\s*clamp\\([^;]+\\);`, "g"))].map(
        (m) => m[0],
      );
      expect(declarations.length, `${name} declared`).toBeGreaterThanOrEqual(2);
      for (const declaration of declarations) {
        expect(declaration, `${name} max`).toContain(`${max})`);
      }
    }
  });

  /**
   * The centre container re-declares the three *aliases*, not just the scale —
   * and this one is here because it is invisible without measuring.
   *
   * `var()` is substituted where a custom property is declared, not where it is
   * used. `--preview-meta-size: var(--retro-small)` sits on the frame, so it
   * freezes the frame's `--retro-small` and hands the already-substituted token
   * down the tree. Scoping a corrected `--retro-small` to `.preview-panels`
   * therefore reached every rule that reads `--retro-small` directly and *none*
   * of the 52 that read the alias — which is how 复古风's right panel sat at
   * 11.0994px while the role label two columns left of it sat at 12px.
   *
   * The sidebar's block does not need the same pair: no rule matching inside it
   * reads an alias (checked — the only sidebar rule that does belongs to
   * 手绘风, which has no fluid scale). If that changes, the same trap opens
   * there, and it will open silently.
   */
  it("re-declares the aliases wherever 复古风 re-scopes its scale", () => {
    const block = /\.preview-frame\[data-style-preset="retro"\] \.preview-panels \{([^}]*)\}/.exec(css);

    expect(block, "retro-center block").toBeTruthy();
    const body = block![1];
    expect(body).toContain("--retro-small:");
    for (const alias of ["--preview-title-size:", "--preview-copy-size:", "--preview-meta-size:"]) {
      expect(body, alias).toContain(alias);
    }
  });

  it("states the three sizes in one place", () => {
    // The tokens themselves, so the scale cannot be redefined quietly.
    expect(css).toContain("--preview-title-size: 16px;");
    expect(css).toContain("--preview-copy-size: 14px;");
    expect(css).toContain("--preview-meta-size: 12px;");
  });
});

/**
 * The header row's height, which is not part of the type scale but fails the
 * same way: every style centred its header correctly *inside its own row*, and
 * the rows were four different heights — so the title and its icons sat at a
 * different place on the canvas in every style, and every box measurement said
 * "centred". The reader could see it; `getBoundingClientRect` could not.
 *
 * One height, declared once. A style may still set the row's *inline* inset —
 * that is the margin between the title and the column's edge, and it does read
 * as the style's own.
 */
describe("canvas header row", () => {
  const rule = /([^{}]+)\{([^{}]*)\}/g;

  it("lets no style branch set its own header height", () => {
    const offenders: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = rule.exec(css))) {
      const selector = match[1].replace(/\s+/g, " ").trim();
      if (!selector.includes("data-style-preset=")) continue;
      if (!/\.(frame-header|session-brand)\b/.test(selector)) continue;
      // The pseudo-elements a style hangs on the row (Game's rule, Pixel's
      // brickwork) are decoration, not the row's box.
      if (selector.includes("::")) continue;
      /* Comments first: the notes in this stylesheet quote the declarations
         they replaced ("it was `min-height: 0`"), and a scanner that reads
         comments reports the explanation as the offence. */
      const body = match[2].replace(/\/\*[\s\S]*?\*\//g, "");
      for (const decl of body.matchAll(
        /(?:^|;|\s)(min-height|height|padding-block|padding-top|padding-bottom|padding)\s*:\s*([^;]+)/g,
      )) {
        const [, prop, value] = decl;
        // `padding-inline` is allowed and does not match here. A shorthand
        // `padding` does, because it sets the block edges too.
        if (prop === "padding" && /^\s*\S+\s*$/.test(value)) {
          // A single value sets all four edges, so it changes the row's height.
          offenders.push(`${selector.slice(-60)} → ${prop}: ${value.trim()}`);
          continue;
        }
        if (prop === "padding-block" || prop === "padding-top" || prop === "padding-bottom") {
          // Allowed only as a correction *to* the shared height, which is what
          // 复古像素风's border needs; those name the shared 10px.
          if (value.includes("10px")) continue;
          offenders.push(`${selector.slice(-60)} → ${prop}: ${value.trim()}`);
          continue;
        }
        if (prop === "min-height" || prop === "height") {
          // Reading the shared token is the point of the token.
          if (value.includes("--preview-header-height")) continue;
          offenders.push(`${selector.slice(-60)} → ${prop}: ${value.trim()}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("states that height once", () => {
    expect(css).toContain("--preview-header-height: 60px;");
    expect(css).toContain("min-height: var(--preview-header-height)");
  });
});
