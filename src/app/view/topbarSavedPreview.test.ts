import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../../styles/app.css", import.meta.url), "utf8");

/**
 * The open card on `saved-preview`.
 *
 * It is the same `--layers-col` card as the builder's, because one rule sizes
 * both — but its control row carries two controls the builder's does not (the
 * run-mode picker and 编辑 UI/UX), and in replay a third (the scenario picker).
 * Five controls at their natural widths need more than the 260px of content
 * the card gives them, and a nowrap flex row answers a shortfall by shrinking
 * every child: measured at 1600px with the rules below suppressed, the two
 * pickers came out 24px and 27.7px wide against ~100px labels, the fold
 * control 15px against 28px, and 编辑 UI/UX 81px against 111px — a row of
 * sheared glyphs and a label broken over two lines.
 */
describe("saved-preview topbar", () => {
  const selector =
    '.workspace-layout[data-mode="saved-preview"] .topbar[data-open="true"] .topbar-controls';

  it("wraps the control row instead of letting it shrink", () => {
    const rule = styles.slice(styles.indexOf(`${selector} {`));
    expect(rule.slice(0, rule.indexOf("}"))).toContain("flex-wrap: wrap");
  });

  it("pins every control in that row to its natural width", () => {
    // Wrapping alone is not the fix: whatever lands on a line still competes
    // for it, so the last line compresses exactly as the single line did.
    const rule = styles.slice(styles.indexOf(`${selector} > * {`));
    expect(rule.slice(0, rule.indexOf("}"))).toContain("flex: none");
  });

  it("leaves the builder's row alone", () => {
    // The builder's open row is the toggle, two previews and Export — it fits
    // 260px, and wrapping it would push Export onto a second line for nothing.
    expect(styles).not.toContain(
      '.workspace-layout[data-mode="builder"] .topbar[data-open="true"] .topbar-controls {\n  flex-wrap: wrap',
    );
  });

  it("unfolds the card before it offers to leave the surface", () => {
    const topbar = readFileSync(new URL("./Topbar.tsx", import.meta.url), "utf8");

    /*
     * Folded, the gear opens the panel; open, it returns to the builder.
     *
     * It used to call `onReturnToBuilder` in both states, so the one glyph in
     * a 56px column discarded the run you were looking at — with no label
     * beside it to say so, and against every other control in a folded card,
     * which unfolds it (the style tile and the plates across the canvas).
     */
    expect(topbar).toContain("onClick={panelOpen ? onReturnToBuilder : onTogglePanel}");
    // And announced as what it does, not as what it says. A button whose
    // accessible name stayed "编辑 UI/UX" while the click unfolded the card is
    // the version of this that is hard to notice.
    expect(topbar).toContain(
      "aria-label={panelOpen ? copy.shell.topbar.editUiUx : copy.shell.presetRail.expand}",
    );
  });

  it("ends the run when it leaves the run preview", () => {
    const app = readFileSync(new URL("../../App.tsx", import.meta.url), "utf8");

    /*
     * The bug this prevents, in order:
     *
     *   1. Entering the preview in live mode sets `runEvents: []` and
     *      `runEventSource: "live"` (`savedPreviewEntered`).
     *   2. 编辑 UI/UX returned with a bare patch to `surfaceMode`, so the
     *      source stayed "live".
     *   3. `usesCanvasTimeline` requires the source *not* to be live or pi, so
     *      the builder stopped playing its own demo reply.
     *   4. `state.runEvents ?? fixtureEvents` kept the empty array: `??` falls
     *      back on null, and `[]` is a real answer.
     *
     * The reader was left with a canvas reading 未加载回放事件 while the layer
     * tree went on listing every module they had switched on — the two sides
     * of the window describing different projects, permanently, with no way
     * back short of a reload. Measured: fresh builder had no empty state;
     * after one preview round trip it had one that never cleared. With
     * `resetRun` the canvas comes back with its turn and its two bubbles, and
     * all of the tree's child rows resolve to a visible canvas element again.
     */
    const handler = app.slice(app.indexOf("onReturnToBuilder={"));
    const body = handler.slice(0, handler.indexOf("runMode={"));
    expect(body).toContain('dispatch({ type: "resetRun" });');
    expect(body).toContain('patch: { surfaceMode: "builder" }');
  });

  it("opens select menus at least as wide as their trigger", () => {
    const select = readFileSync(new URL("../../components/ui/select.css", import.meta.url), "utf8");

    /*
     * Both class names on the selector.
     *
     * The menu element carries `ui-dropdown-menu ui-select-menu-content`, and
     * `.ui-dropdown-menu { min-width: 180px }` ties on specificity with a
     * single class here — `select-menu.tsx` imports `select.css` first, so the
     * 180px won on source order and every trigger wider than it opened a menu
     * narrower than itself. Measured: a 244px trigger, a 180px menu, and
     * `--radix-dropdown-menu-trigger-width` reporting 244px throughout.
     */
    expect(select).toContain(".ui-dropdown-menu.ui-select-menu-content {");
    const rule = select.slice(select.indexOf(".ui-dropdown-menu.ui-select-menu-content {"));
    expect(rule.slice(0, rule.indexOf("}"))).toContain(
      "min-width: var(--radix-dropdown-menu-trigger-width);",
    );
  });

  it("stops needing the guard, because the row is three controls now", () => {
    // The pickers are in the panel, so the open row is the fold control,
    // 编辑 UI/UX and Export: 28 + 111 + 79 plus two 12px gaps is 242px against
    // 260px of content. Measured at 1600px after the move: single line, every
    // control at its natural width. The rules above are the fallback if a
    // fourth control ever lands here, not what is holding this row together.
    const topbar = readFileSync(new URL("./Topbar.tsx", import.meta.url), "utf8");
    const row = topbar.slice(
      topbar.indexOf('<div className="topbar-controls">'),
      topbar.indexOf('<div className="topbar-panel"'),
    );
    expect(row).not.toContain("run-mode-picker");
    expect(row).not.toContain("scenario-picker");
  });
});
