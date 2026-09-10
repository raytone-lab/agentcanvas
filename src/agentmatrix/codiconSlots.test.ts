import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { codiconForSlot } from "./codiconSlots";
import { ICON_OPTIONS, type IconSlot } from "./icons";

/**
 * The codicon map is only useful if every name in it is a glyph that actually
 * exists. A wrong name does not throw — the font simply has nothing at that
 * codepoint and the icon renders as blank space, which is easy to ship and hard
 * to notice. So the names are checked against the installed package rather than
 * trusted, which also catches a glyph renamed or dropped upstream on upgrade.
 */
const codiconCss = readFileSync(
  new URL("../../node_modules/@vscode/codicons/dist/codicon.css", import.meta.url),
  "utf8",
);

const availableGlyphs = new Set(
  [...codiconCss.matchAll(/\.codicon-([\w-]+):before/g)].map((m) => m[1]),
);

describe("codicon slot map", () => {
  it("reads the glyph list from the installed package", () => {
    // Guards the test itself: if this parse broke, every assertion below would
    // pass vacuously against an empty set.
    expect(availableGlyphs.size).toBeGreaterThan(300);
    expect(availableGlyphs.has("check")).toBe(true);
  });

  it("names only glyphs that exist", () => {
    const unknown = Object.entries(codiconForSlot)
      .filter(([, glyph]) => !availableGlyphs.has(glyph))
      .map(([slot, glyph]) => `${slot} -> ${glyph}`);

    expect(unknown).toEqual([]);
  });

  it("covers every icon slot", () => {
    // A missing slot falls through to lucide, which would put one outline icon
    // among the filled ones — the exact inconsistency this set exists to avoid.
    // Derived from ICON_OPTIONS rather than a hand-kept list, so a new slot
    // added there fails here instead of quietly rendering as lucide.
    const missing = (Object.keys(ICON_OPTIONS) as IconSlot[]).filter(
      (slot) => !codiconForSlot[slot],
    );

    expect(missing).toEqual([]);
  });

  it("maps no slot to an empty or padded name", () => {
    const malformed = Object.entries(codiconForSlot)
      .filter(([, glyph]) => glyph !== glyph.trim() || glyph.length === 0)
      .map(([slot]) => slot);

    expect(malformed).toEqual([]);
  });
});
