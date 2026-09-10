import { describe, expect, it } from "vitest";

import { PRESET_GROUP_REGIONS, layerContentsForProject } from "./presetRailData";
import { emptyStructureProject, type AgentFrontendProject } from "../../schema/agentuxConfig";

/** Enable named slots on the empty starting project. */
function withSlots(...slotIds: string[]): AgentFrontendProject {
  return {
    ...emptyStructureProject,
    layout: {
      ...emptyStructureProject.layout,
      slots: emptyStructureProject.layout.slots.map((slot) => ({
        ...slot,
        enabled: slotIds.includes(slot.id),
      })),
    },
  };
}

const SIDEBAR_CONTENT = [
  { id: "sidebar-visible", groupId: "sidebar" as const, label: "显示侧边栏" },
  { id: "sidebar-new-chat", groupId: "sidebar" as const, label: "新建对话按钮" },
  { id: "sidebar-search", groupId: "sidebar" as const, label: "搜索框" },
];

describe("layer contents", () => {
  it("lists what is inside a component, not just the component", () => {
    // The Structure panel offers four modules inside the left column; the layer
    // tree used to show only the component itself, so 左栏 claimed to hold one
    // thing while the panel offered four more inside it.
    const layers = layerContentsForProject(withSlots("sessions"), "zh", SIDEBAR_CONTENT);
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
    const layers = layerContentsForProject(withSlots("sessions"), "zh", SIDEBAR_CONTENT);
    const left = layers.find((layer) => layer.id === "left");
    expect(left?.children.some((child) => child.id === "sidebar-visible")).toBe(false);
  });

  it("does not list a module in a column that holds nothing", () => {
    // Several groups ship options enabled with no presence toggle of their own,
    // so without a check on the region the centre column listed a dozen modules
    // while empty — measured 12 rows under 中栏 with no component in it.
    const layers = layerContentsForProject(withSlots(), "zh", [
      { id: "thinking-wave", groupId: "ux-effects", label: "思考波浪" },
      { id: "sidebar-search", groupId: "sidebar", label: "搜索框" },
    ]);
    expect(layers.every((layer) => layer.children.length === 0)).toBe(true);
  });

  it("keeps main and composer options apart inside the centre column", () => {
    // The centre layer merges two regions. A composer with no conversation
    // should list composer options and no conversation ones.
    const layers = layerContentsForProject(withSlots("composer"), "zh", [
      { id: "composer-upload", groupId: "composer", label: "上传" },
      { id: "speaker-labels", groupId: "conversation", label: "名称标签" },
    ]);
    const centre = layers.find((layer) => layer.id === "center");
    expect(centre?.children.map((child) => child.label)).toEqual(["输入框", "上传"]);
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
