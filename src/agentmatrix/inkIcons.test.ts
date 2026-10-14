import { describe, expect, it } from "vitest";

import { INK_FILL_EXEMPTIONS, INK_MARK_NAMES, inkMarkWeight } from "./inkIcons";
import { INK_BY_LUCIDE, inkIconForOption, inkIconForSlot } from "./inkSlots";
import { ICON_OPTIONS, type IconSlot } from "./icons";

/**
 * 水墨风 draws Phosphor at `weight="fill"`, with a hand-held list of marks that
 * fall back to `bold`. Both halves of that sentence need a guard, and for
 * different reasons.
 */
describe("ink fill exemptions", () => {
  /**
   * The list, exactly.
   *
   * Phosphor's `fill` weight has nothing to fill for a glyph that is only
   * strokes, so for those it draws a full-bleed rounded rect with the glyph
   * reversed out — a heavy black block at the 15px the sidebar renders. Six
   * marks need the fallback and the whole value of that is that it is six and
   * not "whatever looks off".
   *
   * Pinned as an exact list rather than a predicate on purpose: a predicate
   * over Phosphor's geometry is what `scripts/probe-phosphor-fill.mjs` already
   * is, and it was wrong twice — it under-reported `Code` and `ListDashes`
   * (boxes whose fill/bold ratio fell below the cut) and it flagged
   * `CircleDashed` for the wrong reason. One selector wide is an exception; a
   * rule with a predicate in it is a hole.
   *
   * If this fails because a mark was added: run the probe, look at the strip it
   * writes to `/tmp/phosphor-fill-verdict.png`, and change this list on purpose.
   */
  it("is exactly the six marks measured to degrade", () => {
    expect([...INK_FILL_EXEMPTIONS].sort()).toEqual([
      "Check",
      "CircleDashed",
      "Code",
      "ListDashes",
      "Plus",
      "X",
    ]);
  });

  /**
   * Every exempted name has to be a name this set actually draws with, or the
   * list is documentation of a decision nothing implements. The failure it
   * catches is a rename: `inkIcons.tsx` matches on the Phosphor display name it
   * is handed, so a mark re-pointed from `ListDashes` to `List` would silently
   * go back to `fill` and start drawing a box.
   */
  it("names only marks the set draws", () => {
    const drawn = new Set(INK_MARK_NAMES);
    const orphans = INK_FILL_EXEMPTIONS.filter((name) => !drawn.has(name));

    expect(orphans, "exempted names that no mark uses").toEqual([]);
  });

  /** And the decision reached the components, not just the list. */
  it("resolves exempted marks to bold and everything else to fill", () => {
    const wrong = [...new Set(INK_MARK_NAMES)].filter((name) => {
      const expected = INK_FILL_EXEMPTIONS.includes(name) ? "bold" : "fill";
      return inkMarkWeight(name) !== expected;
    });

    expect(wrong).toEqual([]);
  });

  /**
   * One Phosphor name per mark. Two `Ink*Icon` exports pointing at the same
   * name is the collapse this revision removed, arriving by a different door.
   */
  it("draws each Phosphor mark once", () => {
    const seen = new Map<string, number>();
    for (const name of INK_MARK_NAMES) seen.set(name, (seen.get(name) ?? 0) + 1);
    const duplicated = [...seen.entries()].filter(([, n]) => n > 1).map(([name]) => name);

    expect(duplicated).toEqual([]);
  });
});

/**
 * The reason the set was replaced, held as a number.
 *
 * The hand-drawn set ran 37 marks over 141 positions — `InkAlertIcon` answered
 * nineteen slots, `InkCycleIcon` and `InkCrossIcon` fifteen each — and that
 * collapse, not the line weight, is what made the style read as cheap. A
 * regression here would not look like a bug; it would look like someone tidying
 * the table by pointing several slots at one mark again.
 */
describe("ink marks are not collapsed", () => {
  const reuse = (marks: readonly unknown[]) => {
    const counts = new Map<unknown, number>();
    for (const mark of marks) counts.set(mark, (counts.get(mark) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  };

  it("gives the timeline enough marks that no one mark carries a family", () => {
    const worst = reuse(Object.values(inkIconForSlot))[0];

    // Five is the ceiling the current table needs — the crossed strokes for
    // what was cancelled by hand. Nineteen was the old number.
    expect(worst?.[1], `most-reused slot mark draws ${worst?.[1]} slots`).toBeLessThanOrEqual(5);
  });

  it("gives the chrome enough marks that neighbouring controls differ", () => {
    const defined = Object.values(INK_BY_LUCIDE).filter(Boolean);
    const worst = reuse(defined)[0];

    expect(worst?.[1], `most-reused chrome mark draws ${worst?.[1]} names`).toBeLessThanOrEqual(3);
  });

  /**
   * The specific pairs the old table blurred, named so they cannot re-merge.
   *
   * Each of these is two states a reader sees next to each other — in one
   * gallery, one tool row, or one output panel's tabs — so sharing a mark here
   * is not economy, it is a control that looks broken.
   */
  it.each([
    ["severity.warning", "severity.error"],
    ["severity.info", "severity.warning"],
    ["tool.file_edit", "tool.file_modified"],
    ["incident.retrying", "runtime.recovering"],
    ["session.rescheduling", "session.running"],
    ["session.terminated", "session.deleted"],
    ["runtime.degraded", "runtime.error"],
    ["content.mcp", "content.diff"],
    ["error.model", "error.mcp"],
    ["error.billing", "error.budget"],
  ] as [IconSlot, IconSlot][])("draws %s and %s differently", (a, b) => {
    expect(inkIconForSlot[a]).not.toBe(inkIconForSlot[b]);
  });

  /**
   * And the chrome pairs. `PanelLeft` / `PanelRight` sit within a few pixels of
   * each other and used to be the same glyph; the four file kinds are read side
   * by side on the output panel's tabs.
   */
  it.each([
    ["PanelLeft", "PanelRight"],
    ["PanelLeft", "PanelsTopLeft"],
    ["FileText", "FileCode2"],
    ["FileAudio2", "FileVideo2"],
    ["Eye", "Search"],
    ["Download", "ChevronDown"],
    ["Square", "PanelLeft"],
    ["GitBranch", "RefreshCw"],
  ])("draws chrome %s and %s differently", (a, b) => {
    expect(INK_BY_LUCIDE[a]).toBeTruthy();
    expect(INK_BY_LUCIDE[a]).not.toBe(INK_BY_LUCIDE[b]);
  });

  /**
   * The two names the old table left to lucide — a code brace and a campsite —
   * on the grounds that the supplied 24-mark sheet answered neither. That was a
   * real constraint then and it is gone now, and leaving them meant two 1.4px
   * outlines in a room of filled marks.
   */
  it("leaves no chrome name to lucide", () => {
    const unmapped = Object.entries(INK_BY_LUCIDE)
      .filter(([, mark]) => !mark)
      .map(([name]) => name);

    expect(unmapped).toEqual([]);
  });
});

/**
 * A gallery default the reader cannot find in the panel that controls it is a
 * canvas you cannot get back to. Not pinned before, and the reason
 * `permission.allow_always` could be moved to the seal safely.
 */
describe("ink gallery defaults", () => {
  it("defaults each gallery slot to one of the tiles it offers", () => {
    for (const [slot, byOption] of Object.entries(inkIconForOption)) {
      const offered = Object.values(byOption ?? {});
      if (!offered.length) continue;
      // Avatars are excluded from the ink branch entirely (`IconSetContext`).
      if (slot === "author.user" || slot === "author.agent") continue;

      expect(
        offered.includes(inkIconForSlot[slot as IconSlot]),
        `${slot}: default mark is not one of the ${offered.length} tiles offered`,
      ).toBe(true);
    }
  });

  it("offers only ids the registry knows", () => {
    for (const [slot, byOption] of Object.entries(inkIconForOption)) {
      for (const id of Object.keys(byOption ?? {})) {
        expect(
          ICON_OPTIONS[slot as IconSlot]?.some((option) => option.id === id),
          `${slot}/${id}`,
        ).toBe(true);
      }
    }
  });
});
