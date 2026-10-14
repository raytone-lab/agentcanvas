import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./useStyleSwitch.ts", import.meta.url), "utf8");
const app = readFileSync(new URL("../../App.tsx", import.meta.url), "utf8");

/**
 * Applying a style is a repaint. It does not decide what the screen contains.
 *
 * `applyStyle` used to also apply the style's "kit" — a starting configuration
 * that switched on a dozen modules and then recorded them in
 * `pickedOptionIds`, so the rail and the layer tree ticked them as the
 * reader's own choices. Measured on an untouched project: applying 原生风 put
 * thirteen children under 中栏 and one under 右栏, none of them clicked, with
 * nothing to distinguish them from switches the reader had actually thrown.
 *
 * Which components exist is the reader's decision. Stated as a test because
 * the kit had a reasoned comment arguing *for* it ("two paths in the
 * product"), and the next reader to find `applyStyleKit` unused is owed the
 * reason it is unused rather than a tidy-up that puts it back.
 */
describe("applying a style", () => {
  const body = source.slice(source.indexOf("function applyStyle("));

  it("moves the style and the colourway", () => {
    // The repaint itself still happens — verified in the browser: an untouched
    // project went native/soft-glass → inkwash/ink-rice on applying 水墨风.
    expect(body).toContain("switchPresetStyle(target");
    expect(body).toContain("theme: { ...current.theme, preset: nextTheme }");
  });

  it("adds no components of its own", () => {
    expect(body).not.toContain("applyStyleKit");
    expect(body).not.toContain("styleKitOptionIds");
  });

  it("clears none either", () => {
    /*
     * 空白's inverse. It called `withEmptyStructure` to wipe the canvas, which
     * only existed because the other cards added: a kit never removes, so
     * without it 空白 would leave the previous style's modules standing while
     * the rail read blank. With no card adding anything there is nothing to
     * undo, and wiping a reader's structure because they looked at a style is
     * the same mistake pointing the other way.
     */
    expect(body).not.toContain("withEmptyStructure");
  });

  it("reports no picks to the workspace", () => {
    // `onKitPicked` replaced `pickedOptionIds` wholesale. With it gone, the
    // only writer of that list is the reader clicking an option.
    expect(source).not.toContain("onKitPicked(");
    expect(app).not.toContain("onKitPicked:");
  });
});
