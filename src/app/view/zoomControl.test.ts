import { describe, expect, it } from "vitest";

import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEPS, clampZoom, zoomIn, zoomOut } from "./ZoomControl";

describe("canvas zoom ladder", () => {
  it("steps to the next rung, not by a factor", () => {
    // A multiplier lands on 133.33%; a ladder keeps the readout round, and
    // makes one step mean the same thing in both directions.
    expect(zoomIn(100)).toBe(150);
    expect(zoomOut(100)).toBe(75);
    expect(zoomIn(120)).toBe(150);
    expect(zoomOut(120)).toBe(100);
  });

  it("stops at the ends instead of running off them", () => {
    expect(zoomIn(MAX_ZOOM)).toBe(MAX_ZOOM);
    expect(zoomOut(MIN_ZOOM)).toBe(MIN_ZOOM);
    expect(zoomIn(MAX_ZOOM + 500)).toBe(MAX_ZOOM);
    expect(zoomOut(1)).toBe(MIN_ZOOM);
  });

  it("clamps and rounds typed values", () => {
    // The percentage field takes free text, so this is the only guard between
    // what someone types and what the canvas is asked to render.
    expect(clampZoom(65)).toBe(65);
    expect(clampZoom(65.4)).toBe(65);
    expect(clampZoom(10)).toBe(MIN_ZOOM);
    expect(clampZoom(5000)).toBe(MAX_ZOOM);
    expect(clampZoom(Number.NaN)).toBe(100);
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(100);
  });

  it("keeps 100% on the ladder so ⌘0 lands on a rung", () => {
    expect(ZOOM_STEPS).toContain(100);
    expect([...ZOOM_STEPS]).toEqual([...ZOOM_STEPS].sort((a, b) => a - b));
  });
});
