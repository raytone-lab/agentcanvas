import { describe, expect, it } from "vitest";

import { ICON_OPTIONS, iconStyleForStylePreset, type IconSlot } from "./icons";
import { retroIconForOption, retroIconForSlot } from "./retroSlots";
import { styleAvatarOptionIds, styleSlotDefaults } from "../app/projection/presetRailData";

/**
 * 复古风's set, guarded the same four ways as the Game set, plus the one the
 * Game set never needed.
 *
 * This style failed differently from the others: rather than lucide leaking
 * into slots it had no drawing for, its CSS branch painted one exported SVG
 * over the tool row and hid the React icon beneath it, so four galleries in the
 * left rail set an icon slot that nothing on the canvas read. Reported as "有的
 * 没有和中间栏关联上", and a failure no per-slot table can catch on its own — the
 * table was fine; the stylesheet was overwriting it. The last test here is the
 * one that watches for it coming back.
 */
describe("retro icon set", () => {
  it("covers every icon slot", () => {
    const missing = (Object.keys(ICON_OPTIONS) as IconSlot[]).filter((slot) => !retroIconForSlot[slot]);

    expect(missing).toEqual([]);
  });

  it("draws four different marks in every gallery", () => {
    // Shipped twice before this — once in the pixel set, once in the Game set:
    // four tiles rendering one picture, so three look like they do nothing,
    // which is indistinguishable from the bug above.
    const repeated = Object.entries(retroIconForOption).flatMap(([slot, byOption]) => {
      const icons = Object.values(byOption ?? {});
      return new Set(icons).size === icons.length ? [] : [slot];
    });

    expect(repeated).toEqual([]);
  });

  it("names only option ids the slot really offers", () => {
    const unknown = Object.entries(retroIconForOption).flatMap(([slot, byOption]) =>
      Object.keys(byOption ?? {})
        .filter((optionId) => !ICON_OPTIONS[slot as IconSlot].some((option) => option.id === optionId))
        .map((optionId) => `${slot}/${optionId}`),
    );

    expect(unknown).toEqual([]);
  });

  it("keeps its own marks out of every other style's default", () => {
    /*
     * `ICON_OPTIONS[slot][0]` is `resolveIcon`'s answer when a slot has no
     * pick, so it is the *global* default for every style. These options are
     * appended for that reason — prepending them would put an inked seal in
     * 原生风. The same mistake was made and caught twice already, with the
     * sketch icons and then the Game ones.
     */
    const leading = (Object.keys(ICON_OPTIONS) as IconSlot[])
      .map((slot) => [slot, ICON_OPTIONS[slot][0]?.id ?? ""] as const)
      .filter(([, id]) => id.startsWith("retro-"))
      .map(([slot, id]) => `${slot}/${id}`);

    expect(leading).toEqual([]);
  });

  it("offers four of its own marks in every gallery it answers for", () => {
    /*
     * The rail fills a gallery with the style's own ids first and tops up with
     * plain lucide ones (`styleSlotOptionIds`). A slot this set has fewer than
     * four ids registered for would therefore show a mix — two inked plates
     * beside two 1.4px outlines, which is what every style looked like before
     * it had a set of its own.
     */
    const short = Object.keys(retroIconForOption)
      .map((slot) => {
        const own = (styleAvatarOptionIds("retro", slot) ?? []).filter((id) => id.startsWith("retro-"));
        return { slot, count: own.length };
      })
      .filter((entry) => entry.count < 4)
      .map((entry) => `${entry.slot}: ${entry.count}`);

    expect(short).toEqual([]);
  });

  it("opens on its own mark in every slot its gallery answers for", () => {
    // Registering an icon makes it reachable, not chosen: the canvas opens on
    // `defaultIconSet()`, which reads registry order and knows nothing about
    // styles. Without this the style would open wearing lucide in the very
    // slots it has four drawings for.
    const defaults = styleSlotDefaults("retro");
    const wrong = Object.keys(retroIconForOption).filter((slot) => !defaults[slot]?.startsWith("retro-"));

    expect(wrong).toEqual([]);
  });

  it("is the style's resolved icon vocabulary", () => {
    expect(iconStyleForStylePreset("retro")).toBe("retro");
  });
});

/**
 * The stylesheet half. A `background-image` on an icon box plus
 * `> * { display: none }` is a complete, silent override of the reader's pick:
 * the rail sets the slot, the slot resolves, React renders the icon, and CSS
 * hides it and paints something else on top. Nothing throws and the gallery
 * still highlights the tile you clicked.
 *
 * The mark that was painted this way is ported into the set (`RetroSheetIcon`
 * from `file-status.svg`), so this costs the style nothing.
 *
 * Scoped to the icon boxes that actually carry a slot, which is narrower than
 * it first looks and was worth measuring rather than assuming. The artifact
 * card's icon box is painted the same way and is deliberately *not* listed:
 * that box holds three hardcoded spans — a globe, a comic mark and one
 * `StateIcon` — of which CSS shows one, and outside 像素风 and 漫画风 the one
 * shown is the globe. Hiding it disconnects nothing, because no gallery was
 * ever behind it. Same for the rest of the style's chrome: 新建对话, 搜索, the
 * chevrons, the send arrow.
 */
describe("retro slot icons are not painted over", () => {
  const css = new URL("../styles/app.css", import.meta.url);

  it("leaves the slot-bearing icon boxes to render their icon", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(css, "utf8");

    /** The boxes whose glyph comes from an icon slot the rail can set. */
    const SLOT_BOXES = [".tool-status-icon", ".session-item-icon"];

    const offenders: string[] = [];
    for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = match[1].replace(/\s+/g, " ").trim();
      if (!selector.includes('[data-style-preset="retro"]')) continue;
      if (!SLOT_BOXES.some((box) => selector.includes(box))) continue;
      const body = match[2].replace(/\/\*[\s\S]*?\*\//g, "");
      // A background image on the box itself replaces the glyph.
      if (/background(-image)?\s*:[^;]*url\(/.test(body)) {
        offenders.push(`${selector.slice(-70)} → background url()`);
      }
      // Hiding the children is the other half; on its own it leaves a blank box.
      if (/>\s*\*/.test(selector) && /display\s*:\s*none/.test(body)) {
        offenders.push(`${selector.slice(-70)} → hides the icon`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
