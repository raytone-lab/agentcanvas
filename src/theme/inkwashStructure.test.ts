import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * 水墨风: with the right panel open, the centre and the panel share one pane.
 *
 * Asked for as "右栏和中栏在一个线框背景下，然后，右栏和中栏被间隔线隔开". Before
 * this the pane belonged to the centre column, so opening the panel put a
 * framed sheet next to an unframed one and the two halves of one reading
 * surface did not look related.
 *
 * `.preview-panels` is the condition as well as the host: `App.tsx` renders it
 * only while the panel is open and falls back to a bare
 * `.preview-stack.preview-stack-solo` otherwise, so no extra state is keyed on.
 *
 * Measured open, at 1680×1200: the pane is 844×828 with a 1px
 * `rgba(166, 150, 133, 0.5)` edge and 10px corners, both columns inside it
 * report `border: 0` and a transparent background, and the divider lands at
 * x=1059 — exactly where the centre ends and the panel begins. Closed, the
 * centre keeps its own pane at 1108 wide.
 */
const css = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, (b) => b.replace(/[^\n]/g, " "));

/**
 * Every rule with this exact selector, joined.
 *
 * Not the first one: a style branch declares its tokens across several blocks
 * that all read `.preview-frame[data-style-preset="inkwash"]`, so taking the
 * first found one without `--divider-w` in it and reported a failure that was
 * only in the helper.
 */
function rule(selector: string): string {
  const clean = strip(css);
  const bodies: string[] = [];
  for (const match of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (match[1].replace(/\s+/g, " ").trim() === selector) bodies.push(match[2]);
  }
  return bodies.join("\n");
}

const PANELS = '.preview-frame[data-style-preset="inkwash"] .preview-panels';
const STACK_IN_PANELS = `${PANELS} .preview-stack`;
const STACK = '.preview-frame[data-style-preset="inkwash"] .preview-stack';

describe("水墨风 structure", () => {
  it("draws one pane around both columns when the panel is open", () => {
    const body = rule(PANELS);
    expect(body, "the shared pane's rule").not.toBe("");
    expect(body).toMatch(/border:\s*1px solid var\(--ink-pane-line\)/);
    expect(body).toMatch(/border-radius:\s*var\(--fn-r-lg\)/);
    expect(body).toMatch(/background:\s*var\(--ink-pane-bg\)/);
    // Without this the square columns paint over the pane's own corners.
    // `clip` rather than `hidden`, so the folding right column cannot scroll it.
    expect(body).toMatch(/overflow:\s*clip/);
  });

  it("takes the inset off its height, against an inline style", () => {
    /*
     * The one `!important` in this branch, and it earns it: `PanelGroup` writes
     * `style="height: 100%"` on this element, so the stylesheet is arguing with
     * an inline declaration and nothing weaker reaches it.
     *
     * Two softer attempts failed first, both measured: a plain `calc()` lost to
     * the inline value, and dropping the height on the theory that `flex-grow`
     * would subtract the margins lost too. Either way the box stayed 828px —
     * the parent's full height — so the 12px top margin pushed its bottom to
     * 1036 against a parent ending at 1024, and the frame's `overflow: hidden`
     * sliced the composer's bottom row. Reported with a red box round it.
     *
     * Fixed, measured: pane 208..1012 inside a frame 196..1024 — 12px of gap
     * top and bottom, and the composer ends at 1011.
     */
    expect(rule(PANELS)).toMatch(
      /height:\s*calc\(100% - var\(--ink-pane-inset\) \* 2\)\s*!important/,
    );
  });

  it("takes the centre column's own pane away inside it", () => {
    const body = rule(STACK_IN_PANELS);
    expect(body, "the override's rule").not.toBe("");
    expect(body).toMatch(/border:\s*0/);
    expect(body).toMatch(/background:\s*transparent/);
    expect(body).toMatch(/margin:\s*0/);
  });

  it("leaves the centre column its pane when the panel is closed", () => {
    // The solo case, which is the same element without `.preview-panels` above
    // it — so this rule has to keep the frame it always had.
    const body = rule(STACK);
    expect(body).toMatch(/border:\s*1px solid var\(--ink-pane-line\)/);
    expect(body).toMatch(/margin:\s*var\(--ink-pane-inset\)/);
  });

  it("shows the seam between them, and only there", () => {
    /*
     * Scoped to `.preview-panels`, not to the style.
     *
     * On the style it drew a second line nobody asked for: `--divider-w` is
     * read by every `.resize-handle::after`, and the left column has one of its
     * own outside this container — so the seam the reader wanted between the
     * centre and the panel arrived with one between the sidebar and the centre.
     * Reported with a red box round it.
     */
    expect(rule(PANELS)).toMatch(/--divider-w:\s*1px/);
    expect(rule(PANELS)).toMatch(/--divider-c:\s*var\(--ink-pane-line\)/);
    // The style itself keeps the sidebar's handle invisible.
    expect(rule('.preview-frame[data-style-preset="inkwash"]')).toMatch(/--divider-w:\s*0/);
  });
});
