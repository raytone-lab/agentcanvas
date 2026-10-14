import { describe, expect, it } from "vitest";

import { gameIconForOption, gameIconForSlot } from "./gameSlots";
import { ICON_OPTIONS, type IconSlot } from "./icons";

/**
 * The Game set is a per-slot replacement, so the two ways it can be wrong are
 * both silent: a slot with no mark falls through to lucide and leaves one
 * smooth outline in a room of carved ones, and two option ids pointing at one
 * drawing give the reader two tiles that do the same thing. Neither throws, and
 * neither is visible unless someone happens to open that state.
 */
describe("game icon set", () => {
  it("covers every icon slot", () => {
    // `Record<IconSlot, …>` already makes a missing key a compile error; this
    // catches the other half — a key present with nothing behind it, which a
    // bad merge or a renamed export produces.
    const missing = (Object.keys(ICON_OPTIONS) as IconSlot[]).filter((slot) => !gameIconForSlot[slot]);

    expect(missing).toEqual([]);
  });

  it("draws four different marks in every gallery", () => {
    // The bug this rules out has been shipped twice now, once in the pixel set
    // and once here: four tiles rendering one picture, so three of them look
    // like they do nothing.
    const repeated = Object.entries(gameIconForOption).flatMap(([slot, byOption]) => {
      const icons = Object.values(byOption ?? {});
      const seen = new Set(icons);
      return seen.size === icons.length ? [] : [slot];
    });

    expect(repeated).toEqual([]);
  });

  it("keeps its own marks out of every other style's default", () => {
    /*
     * `ICON_OPTIONS[slot][0]` is not just the first tile in a gallery — it is
     * `resolveIcon`'s answer when a slot has no pick, so it is the *global*
     * default for every style. The Game options were prepended to their nine
     * slots, which quietly made a game mark the default in 原生风, 漫画风, 手绘风
     * and 复古风: `tool.file_read` opened on `game-reading-file` everywhere.
     *
     * Invisible, too, which is why this is a test: at 15px a vellum leaf and a
     * generic file glyph look alike, so the leak reads as "that icon is a bit
     * plain" rather than as the wrong style's art.
     *
     * The same mistake was made and caught once before with the sketch icons,
     * which is why those were appended. This holds the rule for both.
     */
    const leading = (Object.keys(ICON_OPTIONS) as IconSlot[])
      .map((slot) => [slot, ICON_OPTIONS[slot][0]?.id ?? ""] as const)
      .filter(([, id]) => id.startsWith("game-") || id.startsWith("sketch-") || id.startsWith("pixel-"))
      .map(([slot, id]) => `${slot}/${id}`);

    expect(leading).toEqual([]);
  });

  it("names only option ids the slot really offers", () => {
    // A typo here is invisible: the lookup misses, the per-slot mark renders
    // instead, and the gallery quietly shows the same glyph for two choices.
    const unknown = Object.entries(gameIconForOption).flatMap(([slot, byOption]) =>
      Object.keys(byOption ?? {})
        .filter((optionId) => !ICON_OPTIONS[slot as IconSlot].some((option) => option.id === optionId))
        .map((optionId) => `${slot}/${optionId}`),
    );

    expect(unknown).toEqual([]);
  });
});
