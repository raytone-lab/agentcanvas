import { describe, expect, it } from "vitest";

import {
  PRESET_GROUP_REGIONS,
  RAIL_HIDDEN_OPTION_IDS,
  isAddedContentOption,
  isEventFlowReady,
  isOptionSelectedInRail,
  isOptionShownInRail,
  layerContentsForProject,
  mountedComponentsForProject,
  layersForProject,
  regionsWithChosenContent,
} from "./presetRailData";
import { emptyStructureProject, type AgentFrontendProject } from "../../schema/agentuxConfig";
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
    // The Structure panel offers four modules inside the left column; the layer
    // tree used to show only the component itself, so 左栏 claimed to hold one
    // thing while the panel offered four more inside it.
    const project = withSlots(["sessions"], ["sidebar-new-button", "sidebar-search"]);
    const layers = layerContentsForProject(project, "zh", SIDEBAR_CONTENT);
    const left = layers.find((layer) => layer.id === "left");

    expect(left?.children.map((child) => child.label)).toEqual([
      "会话列表",
      "新建对话按钮",
      "搜索框",
    ]);
    expect(left?.children.map((child) => child.kind)).toEqual(["slot", "option", "option"]);
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
    expect(centre?.children.map((child) => child.label)).toEqual(["输入框", "上传"]);
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
    // The composer is the one exception, and it is there because it is
    // required rather than because it was picked.
    expect(layers.find((layer) => layer.id === "center")?.children.map((child) => child.id)).toEqual([
      "composer",
    ]);
    for (const layer of layers.filter((entry) => entry.id !== "center")) {
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

  it("will not put a conversation on the canvas until it is picked", () => {
    // Its toggle is visible in the rail, so mounting it because a stage was
    // picked would put a thing on the canvas the reader had not selected while
    // the control for it sat unticked. Picking 思考中 used to conjure a whole
    // conversation that way.
    expect(mountedComponentsForProject(emptyStructureProject, [], ["thinking-wave"]).has("ChatFrame"))
      .toBe(false);

    // Ticked, it appears — and the toggle reads the canvas, so it agrees.
    const shown = togglePresetOption(emptyStructureProject, "chat-visible");
    const mounted = mountedComponentsForProject(shown, [], []);
    expect(mounted.has("ChatFrame")).toBe(true);
    const chatVisible = presetGroups
      .find((entry) => entry.id === "conversation")!
      .options.find((option) => option.id === "chat-visible")!;
    expect(isOptionSelectedInRail(shown, chatVisible, "conversation", [], mounted)).toBe(true);
    expect(
      isOptionSelectedInRail(
        emptyStructureProject,
        chatVisible,
        "conversation",
        [],
        mountedComponentsForProject(emptyStructureProject, [], []),
      ),
    ).toBe(false);
  });

  it("locks the event flow until there is a conversation to show it in", () => {
    // Every stage renders inside the conversation, and a stage no longer
    // conjures one, so a pick with no conversation would change nothing. The
    // rail says what is missing rather than accepting a pick that does nothing.
    expect(isEventFlowReady(emptyStructureProject, [], [])).toBe(false);
    expect(isEventFlowReady(togglePresetOption(emptyStructureProject, "chat-visible"), [], [])).toBe(true);
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
    // way to type is not one. All three stay in the schema — the canvas
    // toolbar's delete still turns the column ones off.
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

  it("has one stage left with nothing to configure", () => {
    // 中断 is four placeholders and nothing else, so hiding them empties it.
    // Kept on the axis all the same: the flow it names is real, and a gap in
    // the sequence would read as though stopping a run had never been
    // considered.
    const interrupt = presetGroups.find((group) => group.id === "interrupt")!;
    expect(interrupt.options.filter(isOptionShownInRail)).toEqual([]);
    expect(presetRailSections.find((section) => section.id === "event-flow")?.groupIds).toContain(
      "interrupt",
    );
  });
});
