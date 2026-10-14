import { describe, expect, it } from "vitest";

import {
  CANVAS_PAN_ROOM,
  NO_CANVAS_PAN,
  canvasPanLimit,
  anchoredPan,
  nextCanvasPan,
  wheelIntent,
} from "./canvasPan";

const SURFACE = { width: 1600, height: 1000 };

describe("canvas panning", () => {
  it("travels with the hand, on both axes", () => {
    // A wheel that moves the view down or right reports a positive delta, and
    // the content goes the other way — which is the canvas travelling with the
    // hand. Getting this backwards is the difference between a canvas and a
    // scrollbar.
    expect(nextCanvasPan(NO_CANVAS_PAN, { x: -60, y: 0 }, SURFACE)).toEqual({ x: 60, y: 0 });
    expect(nextCanvasPan(NO_CANVAS_PAN, { x: 0, y: 80 }, SURFACE)).toEqual({ x: 0, y: -80 });
    // A diagonal swipe moves it diagonally: the wheel is the canvas's hand, not
    // a pair of scrollbars to be picked between.
    expect(nextCanvasPan({ x: 10, y: 10 }, { x: -40, y: -20 }, SURFACE)).toEqual({ x: 50, y: 30 });
  });

  it("stops far enough out to feel unbounded", () => {
    // Not actually unbounded: a canvas pushed somewhere the reader cannot see
    // is a canvas they have no clue how to get back from.
    expect(nextCanvasPan(NO_CANVAS_PAN, { x: -1e6, y: -1e6 }, SURFACE)).toEqual({
      x: 1600 * CANVAS_PAN_ROOM,
      y: 1000 * CANVAS_PAN_ROOM,
    });
    // Magnified, the room grows with the picture: 1.5 viewports would stop the
    // reader well short of a 4× frame's far edge.
    expect(canvasPanLimit(1600, 4)).toBe(1600 * CANVAS_PAN_ROOM * 4);
    expect(canvasPanLimit(1600, 0.5)).toBe(1600 * CANVAS_PAN_ROOM);
    // A surface with no size yet (first paint) pins it at centre rather than
    // letting a wheel throw it somewhere unmeasurable.
    expect(nextCanvasPan(NO_CANVAS_PAN, { x: -500, y: -500 }, { width: 0, height: 0 })).toEqual(
      NO_CANVAS_PAN,
    );
  });

  it("zooms on the wheel, and pans on the gestures that cannot mean bigger", () => {
    // A plain wheel sizes the canvas: down is smaller, up is bigger.
    const down = wheelIntent({ deltaX: 0, deltaY: 100, shiftKey: false });
    const up = wheelIntent({ deltaX: 0, deltaY: -100, shiftKey: false });
    expect(down?.kind).toBe("zoom");
    expect(up?.kind).toBe("zoom");
    if (down?.kind !== "zoom" || up?.kind !== "zoom") return;
    expect(down.factor).toBeLessThan(1);
    expect(up.factor).toBeGreaterThan(1);
    // One notch is a noticeable step and no more — capped, so a fast wheel
    // reporting 400px does not leap.
    expect(up.factor).toBeCloseTo(Math.exp(0.15), 5);
    expect(wheelIntent({ deltaX: 0, deltaY: -400, shiftKey: false })).toEqual(up);
    // Line-mode wheels are converted to pixels first.
    expect(wheelIntent({ deltaX: 0, deltaY: -3, deltaMode: 1, shiftKey: false })).toEqual({
      kind: "zoom",
      factor: Math.exp(48 * 0.0025),
    });
    // A pinch (ctrl + small deltas) and ⌘ + wheel zoom as well.
    expect(wheelIntent({ deltaX: 0, deltaY: -4, shiftKey: false, ctrlKey: true })?.kind).toBe("zoom");
    expect(wheelIntent({ deltaX: 0, deltaY: -100, shiftKey: false, metaKey: true })?.kind).toBe("zoom");
    // Shift is a wheel mouse asking for sideways; a sideways swipe says it directly.
    expect(wheelIntent({ deltaX: 0, deltaY: 80, shiftKey: true })).toEqual({ kind: "pan", delta: { x: 80, y: 0 } });
    expect(wheelIntent({ deltaX: -30, deltaY: 4, shiftKey: false })).toEqual({ kind: "pan", delta: { x: -30, y: 4 } });
    expect(wheelIntent({ deltaX: 0, deltaY: 0, shiftKey: false })).toBeNull();
  });

  it("keeps the point under the cursor still while zooming", () => {
    // A 400px box doubled about its own top left: a cursor at its middle
    // (fraction 0.5) would end up 200px further right, so the pan takes 200 back.
    const before = { left: 100, top: 100, width: 400, height: 300 };
    const after = { left: 100, top: 100, width: 800, height: 600 };
    expect(anchoredPan(NO_CANVAS_PAN, { x: 300, y: 250 }, before, after)).toEqual({ x: -200, y: -150 });
    // At the box's own corner nothing moves.
    expect(anchoredPan({ x: 5, y: 5 }, { x: 100, y: 100 }, before, after)).toEqual({ x: 5, y: 5 });
    // An unmeasured box leaves the pan as it was.
    expect(anchoredPan({ x: 5, y: 5 }, { x: 0, y: 0 }, { left: 0, top: 0, width: 0, height: 0 }, after)).toEqual({ x: 5, y: 5 });
  });
});
