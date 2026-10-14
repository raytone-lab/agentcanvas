import { describe, expect, it } from "vitest";

import { rightColumnFoldsItself } from "./rightColumn";
import type { SlotConfig } from "../../schema/agentuxConfig";

const output = (enabled: boolean): SlotConfig => ({
  id: "output",
  region: "right-panel",
  component: "OutputFrame",
  enabled,
});
const git: SlotConfig = { id: "git", region: "right-panel", component: "GitFrame", enabled: true };
const chat: SlotConfig = { id: "chat", region: "main", component: "ChatFrame", enabled: true };

describe("right column fold control", () => {
  it("is the panel's own once an output frame is drawn in it", () => {
    expect(
      rightColumnFoldsItself({
        rightPanelVisible: true,
        renderedSlotCount: 1,
        canvasSlots: [chat, output(true)],
      }),
    ).toBe(true);
  });

  it("is not there while the column is folded", () => {
    // Folded is the state the centre float exists for: it is the way back.
    expect(
      rightColumnFoldsItself({
        rightPanelVisible: false,
        renderedSlotCount: 1,
        canvasSlots: [chat, output(true)],
      }),
    ).toBe(false);
  });

  it("is not there while the column is open and empty", () => {
    /*
     * The case that made this a function. Opening the column from the centre
     * float produces exactly this — configured, open, nothing drawn in it —
     * and an earlier reading answered `true` here, which hid the float and left
     * an open column with no control that could close it.
     */
    expect(
      rightColumnFoldsItself({
        rightPanelVisible: true,
        renderedSlotCount: 0,
        canvasSlots: [chat, output(true)],
      }),
    ).toBe(false);
  });

  it("does not count a disabled output slot", () => {
    // `canvasSlotsForProject` keeps every slot and flips `enabled`, so the
    // component being listed is not the same as it being drawn.
    expect(
      rightColumnFoldsItself({
        rightPanelVisible: true,
        renderedSlotCount: 1,
        canvasSlots: [chat, output(false)],
      }),
    ).toBe(false);
  });

  it("does not count the git panel", () => {
    // It can hold this column, and it has no fold control of its own — so the
    // centre float has to stay.
    expect(
      rightColumnFoldsItself({
        rightPanelVisible: true,
        renderedSlotCount: 1,
        canvasSlots: [chat, git],
      }),
    ).toBe(false);
  });
});
