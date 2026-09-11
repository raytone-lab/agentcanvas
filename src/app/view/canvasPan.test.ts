import { describe, expect, it } from "vitest";

import {
  CANVAS_PAN_ROOM,
  NO_CANVAS_PAN,
  canvasPanLimit,
  nextCanvasPan,
  wheelPanDelta,
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

  it("reads shift+wheel as the sideways gesture", () => {
    // A wheel mouse has one axis, so shift is how it asks for the other one.
    expect(wheelPanDelta({ deltaX: 0, deltaY: 80, shiftKey: true })).toEqual({ x: 80, y: 0 });
    // A trackpad that already reports sideways keeps its own value.
    expect(wheelPanDelta({ deltaX: -30, deltaY: 4, shiftKey: true })).toEqual({ x: -30, y: 0 });
    expect(wheelPanDelta({ deltaX: -30, deltaY: 4, shiftKey: false })).toEqual({ x: -30, y: 4 });
  });

  it("leaves the zoom gestures alone", () => {
    // A trackpad pinch is a wheel event with ctrl held, and so is ⌘/ctrl+wheel.
    // Both mean zoom; panning sideways in answer to a pinch is worse than
    // letting the browser have it.
    expect(wheelPanDelta({ deltaX: 0, deltaY: -40, shiftKey: false, ctrlKey: true })).toEqual(
      NO_CANVAS_PAN,
    );
    expect(wheelPanDelta({ deltaX: 0, deltaY: -40, shiftKey: false, metaKey: true })).toEqual(
      NO_CANVAS_PAN,
    );
  });
});
