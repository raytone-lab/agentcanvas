/**
 * Sideways panning for the canvas.
 *
 * The whole window is the canvas now, so it should behave like one: a sideways
 * swipe over it slides it. Sideways only, on purpose — a vertical swipe still
 * scrolls whatever is under the pointer, which inside the canvas is a long
 * conversation or a session list.
 */

/**
 * How far the canvas can be pushed aside, as a fraction of the surface's width.
 *
 * Bounded rather than free: the canvas holds one frame, not an infinite plane,
 * and a pan that could put it entirely off screen would leave the reader with
 * an empty window and no way to tell which direction it went.
 */
export const CANVAS_PAN_LIMIT = 0.4;

/**
 * How much of a wheel event is a sideways gesture.
 *
 * A trackpad reports both axes at once for a diagonal swipe, so the larger one
 * decides what the gesture was — otherwise scrolling a conversation would drift
 * the canvas sideways. Shift+wheel is a wheel mouse's only sideways gesture, and
 * it arrives on the vertical axis.
 */
export function sidewaysWheelDelta(event: {
  deltaX: number;
  deltaY: number;
  shiftKey: boolean;
}): number {
  if (event.shiftKey) return event.deltaY;
  return Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
}

/**
 * Where a swipe leaves the canvas.
 *
 * Subtracted, not added: a positive delta is the view moving right, which is
 * the content moving left — the canvas follows the fingers.
 */
export function nextCanvasPan(current: number, delta: number, surfaceWidth: number): number {
  const limit = Math.max(0, surfaceWidth * CANVAS_PAN_LIMIT);
  return Math.min(limit, Math.max(-limit, current - delta));
}
