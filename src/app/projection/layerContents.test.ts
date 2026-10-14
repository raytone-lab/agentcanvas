import { describe, expect, it } from "vitest";

import {
  PRESET_GROUP_REGIONS,
  RAIL_HIDDEN_OPTION_IDS,
  isAddedContentOption,
  isEventFlowReady,
  isOptionSelectedInRail,
  isGroupShownInRail,
  isOptionShownInRail,
  layerContentsForProject,
  mountedComponentsForProject,
  styleMotionOptionIds,
  layersForProject,
  regionsWithChosenContent,
} from "./presetRailData";
import { emptyStructureProject, presetStyleIds, type AgentFrontendProject } from "../../schema/agentuxConfig";
import { isPresetOptionActive, togglePresetOption } from "../../schema/presetActions";
import { presetGroups } from "../../schema/presets";
import { presetRailSections } from "./presetRailData";

/**
 * The starting project with named slots enabled and named content picked.
 *
 * Content has to be really picked, not just named in the item list: a layer row
 * appears only for an option that is actually on, which is what keeps the tree
 * honest about the canvas.
 */
function withSlots(slotIds: string[], picked: string[] = []): AgentFrontendProject {
  return picked.reduce<AgentFrontendProject>(
    (project, optionId) => togglePresetOption(project, optionId),
    {
      ...emptyStructureProject,
      layout: {
        ...emptyStructureProject.layout,
        slots: emptyStructureProject.layout.slots.map((slot) => ({
          ...slot,
          enabled: slotIds.includes(slot.id),
        })),
      },
    },
  );
}

const SIDEBAR_CONTENT = [
  { id: "sidebar-visible", groupId: "sidebar" as const, label: "显示侧边栏" },
  { id: "sidebar-new-button", groupId: "sidebar" as const, label: "新建对话按钮" },
  { id: "sidebar-search", groupId: "sidebar" as const, label: "搜索框" },
];

describe("layer contents", () => {
  it("lists what is inside a component, not just the component", () => {
    // The Structure panel offers the modules inside the left column; the layer
    // tree used to show only the component itself, so 左栏 claimed to hold one
    // thing while the panel offered several more inside it.
    //
    // And no component row for the sidebar: every part of it is one of those
    // modules, so the row was a second name for the column above it — and it
    // competed with 内容模块 for which row means the conversation list.
    const project = withSlots(["sessions"], ["sidebar-new-button", "sidebar-search"]);
    const layers = layerContentsForProject(project, "zh", SIDEBAR_CONTENT);
    const left = layers.find((layer) => layer.id === "left");

    expect(left?.children.map((child) => child.label)).toEqual(["新建对话按钮", "搜索框"]);
    expect(left?.children.map((child) => child.kind)).toEqual(["option", "option"]);
  });

  it("drops the presence toggle, which is the component it turns on", () => {
    // "显示侧边栏" and "会话列表" are one thing. Listing both reads as two.
    const project = withSlots(["sessions"], ["sidebar-search"]);
    const layers = layerContentsForProject(project, "zh", SIDEBAR_CONTENT);
    const left = layers.find((layer) => layer.id === "left");
    expect(left?.children.some((child) => child.id === "sidebar-visible")).toBe(false);
  });

  it("does not list a module in a column that holds nothing", () => {
    // Several groups ship options enabled with no presence toggle of their own,
    // so without a check on the region the centre column listed a dozen modules
    // while empty — measured 12 rows under 中栏 with no component in it.
    const layers = layerContentsForProject(withSlots([]), "zh", [
      { id: "thinking-wave", groupId: "ux-effects", label: "思考波浪" },
      { id: "sidebar-search", groupId: "sidebar", label: "搜索框" },
    ]);
    expect(layers.every((layer) => layer.children.length === 0)).toBe(true);
  });

  it("keeps main and composer options apart inside the centre column", () => {
    // The centre layer merges two regions. A composer with no conversation
    // should list composer options and no conversation ones.
    const project = withSlots(["composer"], ["upload"]);
    const layers = layerContentsForProject(project, "zh", [
      { id: "upload", groupId: "composer", label: "上传" },
      { id: "speaker-labels", groupId: "conversation", label: "名称标签" },
    ]);
    const centre = layers.find((layer) => layer.id === "center");
    // "输入框" is gone from this list: `ComposerFrame` joined
    // `FULLY_ENUMERATED_COMPONENTS`, so the tree lists the composer's *parts*
    // and not the composer. What the test is actually for still holds — the
    // conversation option is absent because its region is not mounted.
    expect(centre?.children.map((child) => child.label)).toEqual(["上传"]);
  });

  it("opens with nothing picked in any column", () => {
    // The canvas is what-you-see-is-what-you-get: on entry it holds only what
    // is required, and fills in as components are chosen. It used to open as a
    // populated demo — a session list, a greeting, an output panel — none of
    // which the reader had asked for.
    const items = presetGroups.flatMap((group) =>
      group.options.map((option) => ({ id: option.id, groupId: group.id })),
    );
    expect(regionsWithChosenContent(emptyStructureProject, items).size).toBe(0);

    const layers = layerContentsForProject(emptyStructureProject, "zh", []);
    // Empty now, where it used to list the composer. Both containers in this
    // column — the conversation and the composer — are enumerated by their
    // parts rather than by themselves, so neither is a row. Nothing has been
    // picked, so there are no parts yet either.
    expect(layers.find((layer) => layer.id === "center")?.children.map((child) => child.id)).toEqual([]);
    for (const layer of layers) {
      expect(layer.children, `${layer.id} should open empty`).toEqual([]);
    }
  });

  it("does not mistake a variant for something you added", () => {
    // A motion curve, a media placeholder style and the output source are each
    // one of a mutually exclusive set: one is always active, and applying it
    // again re-picks the same value. Counted as content they would keep the
    // centre and right columns permanently non-empty, and put a motion curve in
    // the layer tree as if it were a module in a column.
    for (const variant of ["thinking-wave", "media-image-grid", "output-source-artifact", "writing-smooth"]) {
      expect(isPresetOptionActive(emptyStructureProject, variant), `${variant} should be active`).toBe(true);
      expect(isAddedContentOption(emptyStructureProject, variant), `${variant} is a variant`).toBe(false);
    }
    // And an additive one is recognised once picked.
    const picked = togglePresetOption(emptyStructureProject, "sidebar-search");
    expect(isAddedContentOption(picked, "sidebar-search")).toBe(true);
    // A presence toggle is not content either — it puts the column there.
    expect(isAddedContentOption(emptyStructureProject, "sidebar-visible")).toBe(false);
  });

  it("agrees with the canvas about which columns exist", () => {
    // The tree, the region labels and the canvas all read `layersForProject`.
    // They used to disagree: the tree and the labels read `layout.regions`
    // directly while the canvas also required a component, so deleting 左栏
    // removed it from the canvas and left it listed in the tree with its label
    // drawn over empty space.
    const withoutLeft = togglePresetOption(emptyStructureProject, "sidebar-visible");
    expect(withoutLeft.layout.regions).toContain("sidebar");
    expect(layersForProject(withoutLeft).map((layer) => layer.id)).toEqual(["center", "right"]);
    expect(layerContentsForProject(withoutLeft, "zh", []).map((layer) => layer.id)).toEqual([
      "center",
      "right",
    ]);

    // The centre survives being emptied — it cannot be deleted, so it stays as
    // the place a conversation will go.
    const emptied = togglePresetOption(
      togglePresetOption(withoutLeft, "chat-visible"),
      "composer-visible",
    );
    expect(layersForProject(emptied).map((layer) => layer.id)).toContain("center");
  });

  it("assigns every group that renders on the canvas to a column", () => {
    // A palette and a model connection are not modules in a column; everything
    // else is, and a group with no region silently vanishes from the tree.
    expect(PRESET_GROUP_REGIONS.theme).toBeUndefined();
    expect(PRESET_GROUP_REGIONS.provider).toBeUndefined();
    for (const groupId of ["sidebar", "conversation", "composer", "output", "git", "ux-effects", "approval", "tool-calls", "blocks", "media-generation", "delivery"] as const) {
      expect(PRESET_GROUP_REGIONS[groupId]).toBeTruthy();
    }
  });
});

describe("rail selection honesty", () => {
  it("shows nothing selected on a fresh project, except the theme", () => {
    // Selected has to mean the canvas is showing it. The rail used to read
    // "active in the project", and for the variant groups one option is always
    // active by construction — `reasoning.show` has no off value — so the rail
    // claimed a dozen picks while the canvas showed nothing.
    // Asked the way the rail asks: with the components the canvas is drawing,
    // and skipping the options the rail never renders.
    const mounted = mountedComponentsForProject(emptyStructureProject, [], []);
    for (const group of presetGroups) {
      const selected = group.options
        .filter((option) => !RAIL_HIDDEN_OPTION_IDS.has(option.id))
        .filter((option) =>
          isOptionSelectedInRail(emptyStructureProject, option, group.id, [], mounted),
        );
      if (group.id === "theme") {
        // A palette is a variant with no off state, and the canvas genuinely
        // shows it, so the project's own answer is the honest one.
        expect(selected.map((option) => option.id)).toEqual(["soft-glass"]);
        continue;
      }
      expect(selected.map((option) => option.id), `${group.id} should open unselected`).toEqual([]);
    }
  });

  it("opens with no conversation, and will not let another destination conjure one", () => {
    // The configurator opens on 空白, so a pre-filled middle column was the one
    // thing on screen contradicting that. `thinking-wave` belongs to the
    // event-flow destination, not to the conversation, so it still cannot bring
    // the conversation with it.
    expect(mountedComponentsForProject(emptyStructureProject, [], []).has("ChatFrame")).toBe(false);
    expect(mountedComponentsForProject(emptyStructureProject, [], ["thinking-wave"]).has("ChatFrame"))
      .toBe(false);
  });

  it("does let the conversation's own group mount it", () => {
    // The other half of the rule, and what keeps the empty start usable: a pick
    // inside the conversation's own group is the reader configuring it, so it
    // arrives.
    // The project has to carry the patch as well as the pick id:
    // `isAddedContentOption` asks whether the option is *in force*, not merely
    // named, so a pick list on an untouched project answers false. Picking does
    // both in the app, and this mirrors that.
    const withLabels = togglePresetOption(emptyStructureProject, "speaker-labels");
    expect(
      mountedComponentsForProject(withLabels, [], ["speaker-labels"]).has("ChatFrame"),
    ).toBe(true);
  });

  it("locks the event flow until there is a conversation to render into", () => {
    // Live again: every stage renders inside the conversation, so from the empty
    // start a stage pick would change nothing. It was briefly unreachable, when
    // the conversation was permanently on, so `flowNeedsConversation` /
    // `onEventFlowLocked` can fire once more.
    expect(isEventFlowReady(emptyStructureProject, [], [])).toBe(false);
    const withConversation = togglePresetOption(emptyStructureProject, "chat-visible");
    expect(isEventFlowReady(withConversation, [], [])).toBe(true);
  });

  it("moves the tick when a second variant in a section is picked", () => {
    // Variants are mutually exclusive, and `pickedOptionIds` is a flat set, so
    // selection has to check that the picked option is the one in force.
    const picked = ["thinking-wave", "thinking-pulse"];
    const project = togglePresetOption(emptyStructureProject, "thinking-pulse");
    const group = presetGroups.find((entry) => entry.id === "ux-effects")!;
    const wave = group.options.find((option) => option.id === "thinking-wave")!;
    const pulse = group.options.find((option) => option.id === "thinking-pulse")!;
    expect(isOptionSelectedInRail(project, pulse, "ux-effects", picked)).toBe(true);
    expect(isOptionSelectedInRail(project, wave, "ux-effects", picked)).toBe(false);
  });

  it("keeps controls that can only ever be on out of the rail", () => {
    // A control that is always ticked is not a choice: the canvas opens with
    // three columns, and with a composer because an agent frontend without a
    // way to type is not one. They stay in the schema; the canvas toolbar's
    // delete still turns them off.
    //
    // `chat-visible` was briefly a fourth, when the conversation was
    // permanently on. It is back in the rail because the conversation is now
    // off at the start — and a control that is the only route to a state cannot
    // be the one that is hidden.
    expect([...RAIL_HIDDEN_OPTION_IDS]).toEqual([
      "sidebar-visible",
      "output-visible",
      "composer-visible",
    ]);
    for (const optionId of RAIL_HIDDEN_OPTION_IDS) {
      expect(presetGroups.some((group) => group.options.some((option) => option.id === optionId))).toBe(true);
    }
  });
});

describe("rail contents", () => {
  it("leaves the unbuilt options out", () => {
    // They were there to show the shape of what is coming, but as inert dimmed
    // cards among live ones they read as things that ought to work. They stay
    // in the schema, so the list of what this product intends to cover is
    // still complete in one place.
    const pending = presetGroups.flatMap((group) => group.options.filter((option) => option.pending));
    expect(pending.length).toBeGreaterThan(0);
    for (const option of pending) {
      expect(isOptionShownInRail(option), option.id).toBe(false);
    }
    // And a real option still shows.
    expect(isOptionShownInRail({ id: "thinking-wave" })).toBe(true);
  });

  it("holds back the one stage with nothing to configure", () => {
    // 中断 is four placeholders and nothing else, so hiding the placeholders
    // empties it. It used to stay on the axis anyway, on the grounds that a gap
    // in the sequence would read as though stopping a run had never been
    // considered — but in the protocol the stages follow now, stopping is part
    // of the run's own state and picking a turn back up is the next run's job.
    // So the group is withheld and its contents get rebuilt where they belong.
    const interrupt = presetGroups.find((group) => group.id === "interrupt")!;
    // Wrapped, not passed by reference: the second parameter is the style now,
    // and `Array.filter` would hand it the index.
    expect(interrupt.options.filter((option) => isOptionShownInRail(option))).toEqual([]);
    expect(isGroupShownInRail("interrupt")).toBe(false);
    expect(presetRailSections.find((section) => section.id === "event-flow")?.groupIds).not.toContain(
      "interrupt",
    );
  });
});

describe("thinking group scope", () => {
  it("holds back the reasoning-visibility options and the summary order", () => {
    // Not always-on and not unbuilt — these work, but which reasoning kinds a
    // provider exposes, and whether a summary precedes the detail, are
    // decisions about the model's output rather than about the interface being
    // drawn here. They stay wired to their project fields.
    for (const id of [
      "reasoning-status-only",
      "reasoning-public-summary",
      "reasoning-model-thinking",
      "summary-first",
    ]) {
      const option = presetGroups
        .flatMap((group) => group.options)
        .find((entry) => entry.id === id);
      expect(option, `${id} should still exist in the schema`).toBeTruthy();
      expect(isOptionShownInRail(option!), id).toBe(false);
    }

    // 思考中 configures the whole block: the wait, then how it folds, what the
    // closed row is called, and how its text arrives. Those three used to be a
    // group of their own, and splitting them meant configuring one component
    // in two places — the reader picks a motion and immediately wants to know
    // how the text comes in.
    const live = presetGroups
      .find((group) => group.id === "ux-effects")!
      .options.filter((option) => isOptionShownInRail(option))
      .map((option) => option.id);
    expect(live).toEqual([
      "thinking-wave",
      "thinking-pulse",
      "thinking-shimmer",
      // `thinking-bars` was here, fourth in Motion. It is in Done style now,
      // below — Motion is glyphs, and its own description says it has none:
      // "the status text itself cycles". Moving it shifts what the Nth-option
      // kit rule picks for every style past the third, which is why it is also
      // excluded from the kit (`KIT_EXCLUDED_OPTION_IDS`).
      "thinking-orbit",
      "thinking-orb-s1",
      "thinking-orb-b5",
      "thinking-orb-m2",
      "thinking-hourglass",
      /*
       * The per-style motions. Present here because this list is the *schema*
       * — `isOptionShownInRail` is called with no style, so nothing is
       * narrowed. What the reader sees is four of them, which the test below
       * pins.
       */
      "thinking-comic-halftone",
      "thinking-comic-inkblot",
      "thinking-comic-bubble",
      "thinking-comic-flip",
      "thinking-quest-torch",
      "thinking-quest-rune",
      "thinking-quest-coins",
      "thinking-pixel-cursor",
      "thinking-pixel-bars",
      "thinking-pixel-spin",
      "thinking-pixel-bricks",
      "thinking-sketch-bubble",
      "thinking-sketch-pencil",
      "thinking-sketch-blot",
      "thinking-sketch-page",
      "thinking-tech-matrix",
      "thinking-tech-signal",
      "thinking-tech-scan",
      "thinking-tech-segments",
      "thinking-ink-drop",
      "thinking-ink-stroke",
      "thinking-ink-ripple",
      "thinking-ink-seal",
      "thinking-retro-watch",
      "thinking-retro-record",
      "thinking-retro-metronome",
      "thinking-retro-telegraph",
      // `reasoning-auto-collapse` and `reasoning-expanded` were here. They are
      // withheld now: the fold is something the reader does on the thinking
      // block itself, by hovering its header and clicking the chevron, so a
      // pair of cards in the rail offered the same decision a second time —
      // and in the one place where its effect is not visible.
      // `reasoning-done-timed` moved to the 思考完成 group, where the rest of
      // the settled-block axes now live — the title, what survives the fold,
      // and the left rule, which it used to carry as a side effect.
      "thinking-bars",
      "reasoning-writing-smooth",
      "reasoning-writing-typewriter",
      "reasoning-writing-chunked",
    ]);
    // Motion first and unlabelled, then the sections that need telling apart.
    expect(
      presetGroups
        .find((group) => group.id === "ux-effects")!
        .options.filter((option) => isOptionShownInRail(option))
        .map((option) => option.section),
    ).toEqual([
      // Nineteen in the schema: the original eight (nine glyphs when the
      // hourglass joined, less the text cycle, which moved to Done style) plus
      // eleven drawn for a particular style. The reader is shown four — see the
      // test below.
      /* Twenty-three in the schema now: the original eight, eleven drawn for
         漫画/游戏/像素, and four for 手绘风. The reader is still shown four — the
         narrowing test below. */
      ...Array(35).fill("Motion"),
      // Disclosure is gone: folding the thinking block is done on the block
      // itself, so the two cards were the same decision offered twice.
      //
      // Two in Done style now — what the closed row is called, and the option to
      // replace the glyph with cycling text. Both are about what the block
      // *does* rather than which mark it wears.
      "Done style",
      // "Done style" went with it.
      "Text loading",
      "Text loading",
      "Text loading",
    ]);

    /*
     * And what one style actually shows: four, every time.
     *
     * The narrowing matters more than a tidy panel. Three of the originals
     * (`orb-s1`, `orb-b5`, `orb-m2`) have their geometry and keyframes written
     * only under `[data-style-preset="native"]`, and the eleven new ones are
     * scoped the same way — so a card outside its own style picks a motion the
     * canvas cannot animate. The indicator does not degrade; it stops.
     */
    for (const styleId of presetStyleIds) {
      const shown = presetGroups
        .find((group) => group.id === "ux-effects")!
        .options.filter(
          (option) => option.section === "Motion" && isOptionShownInRail(option, styleId),
        )
        .map((option) => option.id);
      // Four everywhere now — 复古风 was the one exception, on a single static
      // indicator, until its own four were drawn.
      expect(shown.length, `${styleId} motions`).toBe(4);
      expect([...shown].sort(), styleId).toEqual([...styleMotionOptionIds(styleId)].sort());
    }

    /*
     * 思考完成 is no longer empty. It held one dimmed card ("summary row") and
     * the note here said the settled block was still to design; it now carries
     * three axes, which is the shape the schema comment on `doneStyle` was
     * anticipating ("more to come; this is the first of the set"):
     *
     *   Done title   — what the closed title says: label / timed / counted /
     *                  conclusion. The summary-row idea is folded in as
     *                  "conclusion", which puts the gist *in* the title rather
     *                  than spending a second row on it.
     *   Settled body — what is left on screen: foldable / title-only /
     *                  peek-one-line. The group had no axis for this at all.
     *   Left rule    — additive, and decoupled from `timed`, which used to
     *                  carry it as a side effect.
     */
    const settled = presetGroups
      .find((group) => group.id === "thinking-done")!
      .options.filter((option) => isOptionShownInRail(option));
    expect(settled.map((option) => option.id)).toEqual([
      "reasoning-done-label",
      "reasoning-done-timed",
      "reasoning-done-counted",
      "reasoning-done-conclusion",
      "reasoning-done-expandable",
      "reasoning-done-title-only",
      "reasoning-done-first-line",
      "reasoning-done-rule",
    ]);
    // Two single-select sets and one additive flag, in that order.
    expect([...new Set(settled.map((option) => option.section))]).toEqual([
      "Done title",
      "Settled body",
    ]);
  });
});
