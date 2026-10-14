import { describe, expect, it } from "vitest";

import { styleAvatarOptionIds, visibleStateCards } from "../app/projection/presetRailData";
import { presetGroups } from "../schema/presets";
import { INK_BY_LUCIDE, inkIconForOption, inkIconForSlot } from "./inkSlots";
import { ICON_OPTIONS, iconStyleForStylePreset, type IconSlot } from "./icons";

/**
 * The same guarantees `comicSlots.test.ts` and `gameSlots.test.ts` hold their
 * sheets to, plus one this set needs and they do not.
 *
 * `Record<IconSlot, …>` already makes a missing slot a compile error; the first
 * test is here so a *new* slot added to `ICON_OPTIONS` fails loudly rather than
 * rendering one thin lucide outline in the middle of a wash.
 */
describe("ink icon slots", () => {
  it("covers every icon slot", () => {
    const missing = (Object.keys(ICON_OPTIONS) as IconSlot[]).filter((slot) => !inkIconForSlot[slot]);

    expect(missing).toEqual([]);
  });

  it("draws a different mark for every tile in a gallery", () => {
    // Four tiles that render one picture look like a gallery that does
    // nothing — the bug this table exists to prevent.
    const repeated = Object.entries(inkIconForOption).flatMap(([slot, byOption]) => {
      const drawn = Object.values(byOption ?? {});
      return new Set(drawn).size === drawn.length ? [] : [slot];
    });

    expect(repeated).toEqual([]);
  });

  it("is the set 水墨风 actually draws with", () => {
    expect(iconStyleForStylePreset("inkwash")).toBe("ink");
  });

  it("offers only ids the option table knows", () => {
    // An id outside the table falls back to the slot's own mark, so a gallery
    // built on unknown ids silently shows four copies of one drawing.
    for (const [slot, byOption] of Object.entries(inkIconForOption)) {
      for (const id of Object.keys(byOption ?? {})) {
        expect(
          ICON_OPTIONS[slot as IconSlot]?.some((option) => option.id === id),
          `${slot}/${id}`,
        ).toBe(true);
      }
    }
  });

  /**
   * The half of the wiring that is easy to forget.
   *
   * The timeline reads `inkIconForSlot`, but the left column's own controls —
   * 新建对话, 搜索, 展开收起 — and the composer's send key are plain lucide
   * components imported by name, and they only become ink if this table names
   * them. The four below are exactly the marks the sidebar and the composer
   * draw, so this is the test that would have caught "ink timeline, lucide
   * sidebar".
   */
  it("answers the chrome the left column and the composer draw with", () => {
    for (const name of ["Search", "MessageSquarePlus", "PanelLeft", "SendHorizontal", "ChevronDown"]) {
      expect(INK_BY_LUCIDE[name], name).toBeTruthy();
    }
  });

  /**
   * And the half after that: the galleries in the rail have to *offer* the ink
   * ids, or the reader picks between four lucide outlines and gets an ink mark.
   * `styleAvatarOptionIds` is the function `StateGallery` filters its tiles
   * with, so this asserts what the panel renders rather than the table behind
   * it.
   *
   * Every gallery the rail actually renders, not just the ones this table
   * happens to name — and that distinction is the bug this replaced.
   *
   * The first version of this test walked `inkIconForOption`, so it could only
   * check slots I had already thought about. Five it had not (`incident.*`,
   * `surface.interrupt`, `error.unknown`) were offering plain lucide ids, every
   * tile fell through to the slot's own mark, and 重试中 rendered as four
   * identical turning rings. A test keyed on the answer cannot find a missing
   * question, so this one starts from `visibleStateCards` — what the panel
   * shows — and asserts against that.
   *
   * The two avatar slots are excluded, and only those two: `IconSetContext`
   * deliberately skips the ink branch for them, so their tiles are four
   * different registry portraits rather than four marks from this set.
   */
  it("gives every gallery in the rail four different marks of its own", () => {
    const AVATARS: readonly string[] = ["author.user", "author.agent"];
    const slots = [
      ...new Set(
        presetGroups
          .flatMap((group) => visibleStateCards(group.id))
          .map((card) => card.slot as IconSlot)
          .filter((slot) => !AVATARS.includes(slot)),
      ),
    ];

    expect(slots.length).toBeGreaterThan(0);

    for (const slot of slots) {
      const offered = styleAvatarOptionIds("inkwash", slot) ?? [];
      expect(offered.length, slot).toBe(4);
      expect(offered.every((id) => id.startsWith("ink-")), `${slot}: ${offered.join(", ")}`).toBe(true);

      // What the reader would see: the per-option mark, or the slot's own if the
      // table has no entry. Four tiles, four pictures.
      const drawn = offered.map((id) => inkIconForOption[slot]?.[id] ?? inkIconForSlot[slot]);
      expect(new Set(drawn).size, `${slot}: ${offered.join(", ")}`).toBe(4);
    }
  });
});
