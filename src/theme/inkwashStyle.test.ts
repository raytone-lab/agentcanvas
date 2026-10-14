import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

/**
 * Every rule body for a selector, joined.
 *
 * Every, not the first: this branch declares some selectors twice — the paper
 * tokens and then the furniture on them — and reading only the first found the
 * wrong half.
 */
function ruleFor(selector: string): string {
  const bodies: string[] = [];
  let at = css.indexOf(selector + " {");
  while (at >= 0) {
    bodies.push(css.slice(at, css.indexOf("}", at)));
    at = css.indexOf(selector + " {", at + 1);
  }
  return bodies.join("\n");
}

describe("Ink Wash style", () => {
  it("frosts the centre column over the sheet", () => {
    /*
     * The design's declarations, because each one is doing a separate job and
     * dropping any of them changes what the column *is*: the corners and the
     * stone line make it a laid pane, and the translucent fill is what keeps it
     * glass rather than a card. An opaque fill would cut the rectangle out of
     * the painting that this whole branch is written to avoid.
     */
    const pane = ruleFor('.preview-frame[data-style-preset="inkwash"] .preview-stack');
    // The style's own large radius. The design said 50px; at the canvas's size
    // that read as a lozenge rather than a mounted sheet, and 10px was asked
    // for instead — which is `--fn-r-lg` here, so it tracks the radius scale.
    expect(pane).toContain("border-radius: var(--fn-r-lg)");
    expect(pane).toContain("border: 1px solid var(--ink-pane-line)");
    expect(pane).toContain("background: var(--ink-pane-bg)");
    /*
     * And no blur. The design had `backdrop-filter: blur(15px)` and it was
     * built; asked to come off, so the pane is plain glass over the sheet —
     * the painting shows through sharp rather than soft. Asserted absent
     * rather than deleted quietly, because "the design says blur" is exactly
     * the reasoning that would put it back.
     */
    expect(pane).not.toContain("backdrop-filter");

    const tokens = ruleFor('.preview-frame[data-style-preset="inkwash"]');
    expect(tokens).toContain("--ink-pane-bg: rgba(255, 255, 255, 0.4)");
    // The design's stone grey at half strength: the line marks the edge of a
    // laid sheet, and at full strength it was the strongest mark on the page.
    expect(tokens).toContain("--ink-pane-line: rgba(166, 150, 133, 0.5)");

    /*
     * The inset has to come off the height as well as sit in the margin.
     *
     * `.preview-stack` is `height: 100%`, which a margin does not reduce — so
     * the margin alone made the pane 24px taller than the space it sits in, hung
     * its bottom past the frame, and had it clipped by the frame's `overflow:
     * hidden`. Measured as top 12 / bottom 0; reported as "the bottom has no
     * gap". Both numbers read the one token so they cannot drift.
     *
     * 6px, halved from 12 — asked for: at 12 the sheet showed a broad margin on
     * three sides of the reading surface and the pane read as a card dropped on
     * the paper rather than one mounted in it. Measured after: 6px of gap on
     * all four sides, pane 912×816 in a 1104×828 frame.
     */
    expect(tokens).toContain("--ink-pane-inset: 6px");
    expect(pane).toContain("margin: var(--ink-pane-inset)");
    expect(pane).toContain("height: calc(100% - var(--ink-pane-inset) * 2)");

    // It has to come after the "panes of glass" rule, which sets every column
    // transparent — same specificity, so order is what settles it.
    expect(css.indexOf('.preview-frame[data-style-preset="inkwash"] .preview-stack {')).toBeGreaterThan(
      css.indexOf('.preview-frame[data-style-preset="inkwash"] :is(.session-sidebar, .preview-stack, .chat-frame)'),
    );
  });

  it("inverts the pane on the dark colourway", () => {
    // White at 40% over slate is a light card on a dark sheet — the light theme
    // with the wrong text on it. Frosting a dark sheet is smoke, so the fill
    // darkens and the stone line drops to a wash of itself.
    const night = ruleFor('.preview-frame[data-style-preset="inkwash"][data-theme-preset="ink-night"]');
    expect(night).toContain("--ink-pane-bg: rgba(0, 0, 0,");
    // The line does not change hands: warm stone at 50% reads on slate too, and
    // one value for both colourways is one less thing to keep in step.
    expect(night).toContain("--ink-pane-line: rgba(166, 150, 133, 0.5)");
  });

  it("leaves the two side columns as bare paper", () => {
    /*
     * Both directions of a decision that was made twice.
     *
     * The side columns were given a translucent wash of their own, to tell left
     * from right; asked for, seen, and removed — a wash over a background image
     * cuts a seam through the painting, and the bare sheet is worth more than
     * the distinction. So the glass in this style is the centre pane and
     * nothing else, and the right panel is back to the standing rule.
     */
    expect(css).not.toContain("--ink-column-wash");
    const panel = ruleFor('.preview-frame[data-style-preset="inkwash"] .right-panel');
    expect(panel).toContain("background: transparent");
    expect(panel).toContain("border: 0");
    const panes = ruleFor(
      '.preview-frame[data-style-preset="inkwash"] :is(.session-sidebar, .preview-stack, .chat-frame)',
    );
    expect(panes).toContain("background: transparent");
    // And nothing re-fills the sidebar after it.
    expect(css).not.toMatch(
      /\[data-style-preset="inkwash"\] \.session-sidebar \{[^}]*background:\s*(?!transparent)/,
    );
  });
});
