import type { SlotConfig } from "../../schema/agentuxConfig";

/**
 * Whether the right column carries its own fold control.
 *
 * The centre column shows a float at its top right — the way *back* to the
 * right column when it is folded or deleted. While the column is open with an
 * output panel in it, that float is a second fold control touching the first:
 * the panel's own header already has one, and two buttons side by side doing
 * the same thing to the same panel is what prompted this ("中栏和右栏都有展开
 * 图标，不是很奇怪吗").
 *
 * So the float hides exactly when this is true, and the three cases are not
 * interchangeable:
 *
 * - **Folded or deleted** — the float is the only way back; it stays.
 * - **Open and empty** — there is no header, so there is no fold control; the
 *   float stays, or the column can be opened and never closed. This is not a
 *   hypothetical: opening the column from the float is what produces it.
 * - **Open with an output panel** — the panel folds itself; the float goes.
 *
 * Extracted from `App` and given a test because two earlier readings of "has
 * an output panel" both looked right and were wrong. `mountedComponents`
 * answers "has the reader configured one"; `canvasSlotsForProject` answers
 * "does the projection contain one" — before `slotsForTemplate` and
 * `renderSlots` have had their say. With the column freshly opened, both said
 * yes while the rendered panel was empty, so the float hid itself and left an
 * open column with nothing that could close it.
 *
 * Hence both arguments. `renderedSlotCount` is what the column is about to
 * draw, and `canvasSlots` says which component that is — `GitFrame` can hold
 * this column too, and it has no fold control.
 */
export function rightColumnFoldsItself({
  rightPanelVisible,
  renderedSlotCount,
  canvasSlots,
}: {
  rightPanelVisible: boolean;
  renderedSlotCount: number;
  canvasSlots: readonly SlotConfig[];
}): boolean {
  if (!rightPanelVisible || renderedSlotCount === 0) return false;
  return canvasSlots.some(
    (slot) => slot.region === "right-panel" && slot.component === "OutputFrame" && slot.enabled,
  );
}
