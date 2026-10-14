import { describe, expect, it } from "vitest";

import { comicIconForOption, comicIconForSlot } from "./comicSlots";
import { ICON_OPTIONS, iconStyleForStylePreset, type IconSlot } from "./icons";

/**
 * The same two guarantees `gameSlots.test.ts` holds its sheet to.
 *
 * `Record<IconSlot, …>` already makes a missing slot a compile error; the first
 * test is here so a *new* slot added to `ICON_OPTIONS` fails loudly rather than
 * rendering one thin lucide outline among the contoured marks.
 */
describe("comic icon slots", () => {
  it("covers every icon slot", () => {
    const missing = (Object.keys(ICON_OPTIONS) as IconSlot[]).filter((slot) => !comicIconForSlot[slot]);

    expect(missing).toEqual([]);
  });

  it("draws a different mark for every tile in a gallery", () => {
    // Four tiles that render one picture look like a gallery that does
    // nothing — the bug this table exists to prevent.
    const repeated = Object.entries(comicIconForOption).flatMap(([slot, byOption]) => {
      const drawn = Object.values(byOption ?? {});
      return new Set(drawn).size === drawn.length ? [] : [slot];
    });

    expect(repeated).toEqual([]);
  });

  it("is the set 漫画风 actually draws with", () => {
    expect(iconStyleForStylePreset("studio")).toBe("comic");
  });

  it("offers only ids the option table knows", () => {
    // An id outside the table falls back to the slot's own mark, so a gallery
    // built on unknown ids silently shows four copies of one drawing.
    for (const [slot, byOption] of Object.entries(comicIconForOption)) {
      for (const id of Object.keys(byOption ?? {})) {
        expect(
          ICON_OPTIONS[slot as IconSlot]?.some((option) => option.id === id),
          `${slot}/${id}`,
        ).toBe(true);
      }
    }
  });
});
