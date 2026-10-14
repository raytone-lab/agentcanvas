import { describe, expect, it } from "vitest";

import { defaultCodingAgentProject } from "./agentuxConfig";
import { isPresetOptionActive } from "./presetActions";
import { presetGroups } from "./presets";
import { applyStyleKit, isExclusiveSection, styleKitOptionIds } from "./styleKit";
import { presetStyleOptions, selectablePresetStyleOptions, styleKitIndex } from "../app/projection/presetRailData";

describe("picker order and kit numbering", () => {
  it("lists the styles in the order asked for", () => {
    // 原生风 → 水墨风 → 游戏风 → 手绘风 → 复古风, with 空白 at the head (it is in
    // this list for the label lookups, not as a card).
    expect(selectablePresetStyleOptions.map((style) => style.id)).toEqual([
      "blank",
      "native",
      "inkwash",
      "game",
      "handdrawn",
      "retro",
      /* Not in `PICKER_ORDER`, so it keeps its declaration order and lands
         after the five that are named — which is the behaviour that list's
         fallback promises, and this is the first style to exercise it. */
      "tech",
    ]);
  });

  it("numbers the kits independently of that order", () => {
    /*
     * The whole point of writing the numbering down as data
     * (`KIT_NUMBERED_STYLE_IDS`): the picker's order is a display decision and
     * must not change what any style opens with. Reordering the picker used to
     * do exactly that — and for the styles *not* in the frozen list it still
     * would, through their declaration order in `presetStyleOptions`, which is
     * why 水墨风 was reordered in the picker's own list rather than in that one.
     *
     * Pinned as numbers rather than derived, so a reorder that moves any of
     * them fails here instead of silently repainting a style's defaults.
     */
    expect(
      Object.fromEntries(
        presetStyleOptions.map((style) => [style.id, styleKitIndex(style.id)]),
      ),
    ).toEqual({
      blank: -1,
      native: 0,
      studio: 1,
      game: 2,
      retro: 3,
      handdrawn: 4,
      pixeldesk: 5,
      illustrated: 6,
      zine: 7,
      pixel: 8,
      inkwash: 9,
      workbuddy: 10,
      /* 11, and every number above it unchanged — which is what "appended"
         has to mean. Declaring it above the hidden WorkBuddy entry instead
         moved *that* style's kit from 10 to 11, and this assertion is what
         caught it. */
      tech: 11,
    });
  });
});

describe("style kit", () => {
  it("gives each style in the picker a different configuration", () => {
    // The whole reason the kit exists. Before it, picking a style repainted
    // whatever was already on the canvas, so two styles opened on identical
    // screens in different colours.
    const kits = selectablePresetStyleOptions.map((style) =>
      styleKitOptionIds(styleKitIndex(style.id)).join("|"),
    );
    expect(new Set(kits).size).toBe(kits.length);
  });

  it("returns only options that are really in force", () => {
    // The kit reconciles itself: "the Nth of every set" can request a
    // combination that cannot exist, because exclusivity is not confined to a
    // section — picking a renderer also forces `output.source` to "artifact",
    // overwriting whatever the output-source set chose. Survivors only, or the
    // rail would tick an option the canvas is not showing.
    //
    // This is also why kits differ in *length* between styles and not just in
    // content: how many requests get clobbered depends on which ones were
    // requested.
    for (let index = 0; index < 6; index += 1) {
      const kit = styleKitOptionIds(index);
      expect(kit.length).toBeGreaterThan(0);
      const settled = applyStyleKit(defaultCodingAgentProject, kit);
      for (const id of kit) {
        expect(isPresetOptionActive(settled, id), `${id} (style ${index})`).toBe(true);
      }
    }
  });

  it("clamps rather than dropping a set shorter than the style's position", () => {
    // A style at position 50 must still contribute an option from every
    // two-option set, not none — otherwise later styles would quietly open with
    // fewer components than earlier ones. Once the index is past every set's
    // length, every set is clamped to its last member, so the kit stops
    // changing.
    expect(styleKitOptionIds(99)).toEqual(styleKitOptionIds(50));
    expect(styleKitOptionIds(99).length).toBeGreaterThan(0);
  });

  it("tells an additive set from a set of alternatives", () => {
    // The probe itself, because no group left in the kit has an additive
    // section: the sidebar's Content was the only one, and `sidebar` and
    // `composer` are now excluded entirely. The mechanism still has to be
    // right for the next additive section that arrives, so it is tested on the
    // sidebar's directly rather than through a kit that no longer asks for it.
    const sectionOf = (groupId: string, section: string) =>
      (presetGroups.find((group) => group.id === groupId)?.options ?? [])
        .filter((option) => option.section === section && !option.pending);

    // Title, search, list, footer — parts of one column, all of which can hold.
    expect(isExclusiveSection(sectionOf("sidebar", "Content"))).toBe(false);
    // One motion curve at a time.
    expect(isExclusiveSection(sectionOf("ux-effects", "Motion"))).toBe(true);
  });

  it("leaves the structural columns to the reader", () => {
    // The two the reader assembles: a style says how the event flow looks, not
    // whether the left column has a search field or the composer a model
    // switcher. Checked across every style's index so a future one cannot
    // quietly start filling them.
    const structural = presetGroups
      .filter((group) => group.id === "sidebar" || group.id === "composer")
      .flatMap((group) => group.options.map((option) => option.id));
    expect(structural.length).toBeGreaterThan(4);
    for (let index = 0; index < 6; index += 1) {
      const kit = styleKitOptionIds(index);
      for (const id of structural) expect(kit, `style ${index}`).not.toContain(id);
    }
  });

  it("leaves the right panel's run sections off", () => {
    /*
     * 任务列表 / 执行进度 / 工作区文件 are additive by measurement, so the kit
     * takes the section whole — which is how all three arrived for every style
     * against a schema default of off for all three. The panel opens as a
     * document viewer; each of these is a second thing to read in it, and that
     * is a decision about the product rather than about the style.
     *
     * Across every index, so a future style cannot quietly start turning them
     * on the way the tool-call progress bar once did.
     */
    for (let index = 0; index < 12; index += 1) {
      const kit = styleKitOptionIds(index);
      for (const id of ["task-list", "exec-progress", "workspace-files"]) {
        expect(kit, `style ${index}`).not.toContain(id);
      }
    }
  });

  it("leaves model and Git settings to the reader", () => {
    // A style is a look. Which provider is connected and whether a repository
    // is wired are facts about the reader's own project.
    const kit = styleKitOptionIds(0);
    const excluded = presetGroups
      .filter((group) => group.id === "provider" || group.id === "git" || group.id === "theme")
      .flatMap((group) => group.options.map((option) => option.id));
    for (const id of excluded) expect(kit).not.toContain(id);
  });

  it("applies idempotently, so a kit never toggles off what already matches it", () => {
    // `applyPresetOption` toggles, so an unguarded fold would turn an additive
    // option that was already on back off — undoing exactly the parts of a
    // half-built project that already agreed with the style.
    const kit = styleKitOptionIds(2);
    const once = applyStyleKit(defaultCodingAgentProject, kit);
    const twice = applyStyleKit(once, kit);
    expect(twice).toEqual(once);
    for (const id of kit) expect(isPresetOptionActive(once, id)).toBe(true);
  });
});
