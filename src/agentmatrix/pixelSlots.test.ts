import { describe, expect, it } from "vitest";

import * as pixelart from "pixelarticons/react";

import { pixelIconForOption, pixelIconForSlot } from "./pixelSlots";
import { iconStyleForStylePreset } from "./icons";

describe("pixel icon slots", () => {
  it("names only glyphs the installed package actually exports", () => {
    // A wrong name is not a type error — the lookup is by string — and it does
    // not throw either: `StateIcon` falls through to lucide, so a typo shows up
    // as one smooth outline sitting in a grid of pixel icons. Which is exactly
    // the failure this style exists to avoid, and invisible unless you happen
    // to render that slot.
    const available = new Set(Object.keys(pixelart));
    const missing = [
      ...Object.entries(pixelIconForSlot).map(([slot, name]) => [slot, name] as const),
      // The per-option table too, and for the same reason — a typo there is one
      // smooth outline behind one tile of four.
      ...Object.entries(pixelIconForOption).flatMap(([slot, byOption]) =>
        Object.entries(byOption ?? {}).map(([option, name]) => [`${slot}/${option}`, name] as const),
      ),
    ]
      .filter(([, name]) => !available.has(name))
      .map(([where, name]) => `${where} → ${name}`);
    expect(missing).toEqual([]);
  });

  it("gives every option in a variant slot its own glyph", () => {
    // The point of the table: four tiles, four pictures. Two options sharing a
    // glyph is the bug it replaced, so it is worth asserting rather than
    // trusting the list to stay distinct as it is edited.
    for (const [slot, byOption] of Object.entries(pixelIconForOption)) {
      const names = Object.values(byOption ?? {});
      expect(names.length, slot).toBeGreaterThanOrEqual(2);
      expect(new Set(names).size, `${slot} has a duplicate glyph`).toBe(names.length);
    }
  });

  it("maps every slot, because a gap falls back to a vector icon", () => {
    // `Record<IconSlot, string>` already makes this a compile error; asserting
    // it too catches the case where a slot is added with a placeholder value.
    for (const [slot, name] of Object.entries(pixelIconForSlot)) {
      expect(name, slot).toBeTruthy();
    }
    expect(Object.keys(pixelIconForSlot).length).toBeGreaterThanOrEqual(60);
  });

  it("is reached only by the pixel style", () => {
    // The set is MIT, so unlike codicon it carries no attribution obligation —
    // but it is still a different design language, and leaking it into another
    // style would mix grids.
    expect(iconStyleForStylePreset("pixel")).toBe("pixel");
    for (const other of ["native", "illustrated", "studio", "zine", "game", "workbuddy"]) {
      expect(iconStyleForStylePreset(other), other).not.toBe("pixel");
    }
  });
});
