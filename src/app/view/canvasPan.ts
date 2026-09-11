/**
 * Panning for the canvas.
 *
 * The whole window is the canvas, so the wheel moves the canvas rather than
 * scrolling anything: a plain wheel slides it up and down, a sideways swipe
 * slides it sideways, and shift+wheel is a wheel mouse's way of asking for
 * sideways. Nothing inside the canvas scrolls while it is being designed — the
 * canvas is the thing that moves, which is what makes it read as a canvas and
 * not as a page with a preview in it.
 *
 * Kept out of the shell so the arithmetic — which way the content goes, and how
 * far it may go — can be read and tested without a browser.
 */

export type CanvasPan = { x: number; y: number };

export const NO_CANVAS_PAN: CanvasPan = { x: 0, y: 0 };

/**
 * How far the canvas may travel, in viewports, before it stops.
 *
 * Generous enough to feel unbounded and short of actually being so: the canvas
 * holds one frame, and a pan with no end would let the reader push it somewhere
 * they cannot see and have no clue how to get back from. ⌘0 also recentres.
 */
export const CANVAS_PAN_ROOM = 1.5;

/**
 * The room available on one axis.
 *
 * Scaled by the zoom because the pan is measured in screen pixels: a canvas
 * magnified 4× is four viewports wide, and a limit of 1.5 viewports would stop
 * the reader a long way short of its far edge.
 */
export function canvasPanLimit(size: number, zoom = 1): number {
  return Math.max(0, size) * CANVAS_PAN_ROOM * Math.max(1, zoom);
}

/**
 * How far a wheel event asks the canvas to travel.
 *
 * Shift turns a wheel mouse's only axis into the sideways one. A trackpad
 * reports both at once, and both are used — a diagonal swipe moves the canvas
 * diagonally.
 */
export function wheelPanDelta(event: {
  deltaX: number;
  deltaY: number;
  shiftKey: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): CanvasPan {
  // A trackpad pinch arrives as a wheel with ctrl held, and so does ⌘/ctrl +
  // wheel: both mean "zoom", so neither is a pan. Answering them by sliding the
  // canvas sideways is worse than leaving them to the browser.
  if (event.ctrlKey || event.metaKey) return NO_CANVAS_PAN;
  if (event.shiftKey) {
    return { x: event.deltaX || event.deltaY, y: 0 };
  }
  return { x: event.deltaX, y: event.deltaY };
}

/**
 * Where a wheel leaves the canvas.
 *
 * Subtracted, not added: a positive delta is the view moving down or right,
 * which is the content moving up or left — the canvas travels with the hand.
 */
export function nextCanvasPan(
  current: CanvasPan,
  delta: CanvasPan,
  surface: { width: number; height: number },
  zoom = 1,
): CanvasPan {
  const limitX = canvasPanLimit(surface.width, zoom);
  const limitY = canvasPanLimit(surface.height, zoom);
  return {
    x: Math.min(limitX, Math.max(-limitX, current.x - delta.x)),
    y: Math.min(limitY, Math.max(-limitY, current.y - delta.y)),
  };
}
