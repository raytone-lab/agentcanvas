import { describe, expect, it } from "vitest";

import { CANVAS_PAN_LIMIT, nextCanvasPan, sidewaysWheelDelta } from "./canvasPan";

describe("canvas panning", () => {
  it("follows the fingers", () => {
    // A swipe that moves the view right reports a positive delta, and the
    // content goes the other way — which is the canvas travelling with the
    // hand. Getting this backwards is the difference between a canvas and a
    // scrollbar.
    expect(nextCanvasPan(0, -60, 1600)).toBe(60);
    expect(nextCanvasPan(0, 60, 1600)).toBe(-60);
    expect(nextCanvasPan(60, -40, 1600)).toBe(100);
  });

  it("stops before the canvas can leave the window", () => {
    // The canvas holds one frame, not an infinite plane: panned all the way off
    // screen it would leave an empty window with no hint which way it went.
    const limit = 1600 * CANVAS_PAN_LIMIT;
    expect(nextCanvasPan(0, -10_000, 1600)).toBe(limit);
    expect(nextCanvasPan(0, 10_000, 1600)).toBe(-limit);
    // A surface with no width yet (first paint) pins it at centre rather than
    // letting a swipe throw it somewhere unmeasurable.
    expect(nextCanvasPan(0, -500, 0)).toBe(0);
  });

  it("takes only the sideways part of a gesture", () => {
    // A trackpad reports both axes for a diagonal swipe. Whichever is larger is
    // what the gesture was — otherwise scrolling a long conversation would drift
    // the canvas sideways as it went.
    expect(sidewaysWheelDelta({ deltaX: -40, deltaY: 6, shiftKey: false })).toBe(-40);
    expect(sidewaysWheelDelta({ deltaX: 6, deltaY: -40, shiftKey: false })).toBe(0);
    expect(sidewaysWheelDelta({ deltaX: 0, deltaY: 80, shiftKey: false })).toBe(0);
    // Shift+wheel is a wheel mouse's only sideways gesture, and it arrives on
    // the vertical axis.
    expect(sidewaysWheelDelta({ deltaX: 0, deltaY: 80, shiftKey: true })).toBe(80);
  });
});
