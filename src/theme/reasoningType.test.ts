import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * The thinking label and the thinking text are one voice, and this is the
 * tripwire that keeps them that way.
 *
 * It has been reported twice, once per style: "思考中" set small and muted over
 * body copy set large and bright. The cause was never one wrong value — it was
 * that the two halves are separate elements, so every style had to remember to
 * set both, and a style that set neither inherited a mismatched pair from two
 * different base rules.
 *
 * The fix is `--reasoning-type-*` on `.reasoning-block`, read by both halves
 * (see the closing section of `app.css`). This test fails the build if a style
 * branch goes back to setting the type on one half directly, which is the only
 * way the two can drift again.
 */
const css = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

/** Every `selector { body }` pair, flattened. */
function rules(): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match = pattern.exec(css);
  while (match) {
    out.push({ selector: match[1].replace(/\s+/g, " ").trim(), body: match[2] });
    match = pattern.exec(css);
  }
  return out;
}

describe("thinking block type", () => {
  it("is set once, through tokens both halves read", () => {
    /*
     * A literal, not a scale step: the block is one component across the
     * product, and `var(--text-md)` meant eleven scales' idea of medium — 14px
     * in two styles and 13.5px in four.
     */
    expect(css).toContain("--reasoning-type-size: 14px;");
    expect(css).toContain("--reasoning-type-color: var(--text-muted);");
    // And no style may set the size back to its own scale.
    const sizeOverrides = rules()
      .filter((rule) => /\[data-style-preset="[a-z]+"\]/.test(rule.selector))
      .filter((rule) => /--reasoning-type-size\s*:/.test(rule.body))
      .map((rule) => rule.selector.slice(-60));
    expect(sizeOverrides).toEqual([]);
    for (const half of [".reasoning-title", ".reasoning-body"]) {
      const consumer = rules().find(
        (rule) => rule.selector.includes(half) && rule.body.includes("var(--reasoning-type-size)"),
      );
      expect(consumer, `${half} reads the size token`).toBeDefined();
    }
  });

  it("is never set on one half by a style branch", () => {
    const offenders = rules()
      /*
       * A *named* style: `[data-style-preset="game"]`. The bare attribute
       * belongs to the two consumer rules at the end of the file, which carry
       * it for weight — they are the rules that read the tokens, so matching
       * them here would flag the fix as the bug.
       */
      .filter((rule) => /\[data-style-preset="[a-z]+"\]/.test(rule.selector))
      .filter((rule) => /\.reasoning-(title|body)\b/.test(rule.selector))
      // Setting the property *from the token* is the supported way to reach one
      // half — e.g. a style that needs the label's leading alone.
      .filter((rule) => !rule.body.includes("var(--reasoning-type-"))
      /*
       * `font-family` is exempt: a style's display face is chosen for the whole
       * canvas and both halves inherit it from the frame, so naming it on one
       * of them is redundant rather than divergent. Size, colour and weight are
       * the three that made the two halves read as different voices.
       */
      .filter((rule) => /(^|;|\s)(font-size|color|font-weight)\s*:/.test(rule.body))
      .map((rule) => rule.selector.slice(-90));

    expect(offenders).toEqual([]);
  });
});
