import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../../styles/app.css", import.meta.url), "utf8");

/**
 * The body of a rule, by selector.
 *
 * Anchored on a newline, and able to pick among same-selector blocks, because
 * both failure modes bit while writing this file. `indexOf(".style-rail-thumb
 * {")` matches inside `.style-rail-tile:focus-visible .style-rail-thumb {` —
 * the selector is a *substring* of a longer one — and `.style-rail` has two
 * blocks, the layout one and the dock-token one, so the first hit was the
 * wrong rule twice over. `contains` disambiguates by what the body must hold.
 */
function rule(selector: string, contains?: string): string {
  const needle = `\n${selector} {`;
  let from = 0;
  for (;;) {
    const start = styles.indexOf(needle, from);
    if (start === -1) return "";
    const body = styles.slice(start + needle.length, styles.indexOf("\n}", start));
    if (!contains || body.includes(contains)) return body;
    from = start + needle.length;
  }
}

/**
 * Dock-style hover magnification on the folded column's style plates.
 *
 * The shape is taken from the reference it was asked against
 * (robot-heads.fayaz.workers.dev), whose dock turns out to be plain CSS — its
 * bundle carries no framer-motion and no `stiffness`/`damping` anywhere. What
 * it does carry is three decisions, and the first two were got wrong here
 * first. Verified in the browser afterwards by sampling per frame: the hovered
 * plate走 36 → 43.19px and its neighbour 36 → 39.59px across 13 distinct
 * widths, settling by ~300ms.
 */
describe("style rail dock magnification", () => {
  it("keeps the column scrolling, which is what bounds the whole effect", () => {
    /*
     * This scroller was removed for one round, to give the plates room to
     * swell outside the 44px column. That was wrong, and how it was wrong is
     * worth keeping: the reading behind it only went down to a 700px window,
     * which is the one height in the range where the six plates happen to fit.
     * Re-measured, `scrollHeight` exceeds `clientHeight` from 640px down — 4px
     * at 640, 41px at 600, 78px at 560 — and from 560px down the last plate
     * paints outside the card entirely, 33px into the canvas, after crossing
     * over Export at 600px.
     */
    expect(rule(".style-rail", "overflow-y")).toContain("overflow-y: auto;");
  });

  it("sizes the plate in layout, so the column spaces itself", () => {
    /*
     * One `--s` drives the plate's own width and height, which means a
     * swelling plate pushes its neighbours away by exactly its own growth.
     * The first version animated a `transform` and displaced neighbours with a
     * hand-tuned 6px `translateY` — a constant pretending to be a function of
     * the growth, 6px against 7.2px at the hovered step and 3.6px at the next.
     * Layout does it correctly for free, and four selectors went with it.
     */
    const thumb = rule(".style-rail-thumb");
    expect(thumb).toContain("width: calc(36px * var(--s, 1));");
    expect(thumb).toContain("height: calc(36px * var(--s, 1));");
    // Anchored on the indent: a bare `"transform:"` matched this rule's own
    // comment ("not scaled by a transform: the swell has to…"), which is the
    // second time in this file that prose has answered for a declaration.
    expect(thumb).not.toContain("\n  transform:");
    expect(rule(".style-rail-tile", "--s")).toContain("--s: 1;");
  });

  it("eases without overshooting", () => {
    /*
     * `cubic-bezier(.3, .7, .4, 1)`, from the reference — both control points
     * at or under 1, so the plate settles rather than bouncing past its size.
     * The first version used `--ease-back`, which peaks at 1.069 progress;
     * that is a bounce, and what was asked for was smoothness. 200ms is also
     * the reference's; 170ms read as hurried beside it.
     */
    const rail = rule(".style-rail", "--dock-hover");
    expect(rail).toContain("--ease-dock: cubic-bezier(0.3, 0.7, 0.4, 1);");
    expect(rail).toContain("--dock-motion: 200ms;");
    expect(rail).not.toContain("--ease-back");
    expect(rule(".style-rail-thumb")).toContain("width var(--dock-motion, 200ms) var(--ease-dock, ease)");
  });

  it("derives both steps from the 44px scrollport", () => {
    /*
     * Not taste — the scrollport is 44px, a tile's exact width. The worn plate
     * is the binding one because its `box-shadow: 0 0 0 2px` ring sits outside
     * the plate: the near step gives 39.6 + 4 = 43.6px, just inside, and the
     * hovered step would give 43.2 + 4 = 47.2px, which is why the ring comes
     * off (below) and the ceiling moves to the bare plate: 36 × 1.2 = 43.2.
     */
    const rail = rule(".style-rail", "--dock-hover");
    expect(rail).toContain("--dock-hover: 1.2;");
    expect(rail).toContain("--dock-near: 1.1;");
    // Two steps, not three. The reference magnifies the hovered item and its
    // immediate neighbours and stops; with six plates a ±2 step reached five
    // of them and the taper lost its focus.
    expect(rail).not.toContain("--dock-far");
  });

  it("drops the worn ring on specificity, not on source order", () => {
    /*
     * The first attempt put `box-shadow: none` in
     * `.style-rail-tile:hover .style-rail-thumb`. It did nothing:
     * `.style-rail-tile:hover` and `.style-rail-tile[data-active="true"]` are
     * both (0,2,0), the worn rule sits further down this file, and the tie went
     * to source order. Measured — the worn plate painted 48px wide in a 44px
     * port, clipped 2px a side. The fix has to be (0,3,0).
     */
    expect(styles).toContain('.style-rail-tile[data-active="true"]:hover .style-rail-thumb');
    const ring = rule(
      '.style-rail-tile[data-active="true"]:hover .style-rail-thumb,\n.style-rail-tile[data-active="true"]:focus-visible .style-rail-thumb',
    );
    expect(ring).toContain("box-shadow: none;");
  });

  it("reaches the plate above the cursor, which needs :has()", () => {
    // There is no preceding-sibling combinator; `:has(+ …:hover)` is the only
    // way to style the tile before the hovered one.
    expect(styles).toContain(".style-rail-tile:has(+ .style-rail-tile:hover)");
  });

  it("stops swelling when motion is turned down", () => {
    // Pinning `--s` is the whole of it, now that one variable drives the
    // effect; the transform version had to name two elements and two
    // transforms. The hover still answers with its border colour.
    const from = styles.indexOf("@media (prefers-reduced-motion: reduce) {", styles.indexOf(".style-rail-tile:hover"));
    const block = styles.slice(from, styles.indexOf("\n}", styles.indexOf("{", from + 40)));
    expect(block).toContain(".style-rail-tile");
    expect(block).toContain("--s: 1 !important;");
  });
});
