import { describe, expect, it } from "vitest";

import {
  PRESET_GROUP_REGIONS,
  isAddedContentOption,
  layerContentsForProject,
  regionsWithChosenContent,
} from "./presetRailData";
import { emptyStructureProject, type AgentFrontendProject } from "../../schema/agentuxConfig";
import { isPresetOptionActive, togglePresetOption } from "../../schema/presetActions";
import { presetGroups } from "../../schema/presets";

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

  it("opens with nothing in any column", () => {
    // The canvas is what-you-see-is-what-you-get: on entry it is three empty
    // frames in the project's theme, and it fills in as components are chosen.
    // It used to open as a populated demo — a session list, a greeting, an
    // output panel — none of which the reader had asked for.
    const items = presetGroups.flatMap((group) =>
      group.options.map((option) => ({ id: option.id, groupId: group.id })),
    );
    expect(regionsWithChosenContent(emptyStructureProject, items).size).toBe(0);
    for (const layer of layerContentsForProject(emptyStructureProject, "zh", [])) {
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
