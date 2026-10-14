/**
 * Panning for the canvas.
 *
 * The whole window is the canvas. A drag moves it and the wheel sizes it, the
 * way a design tool's canvas works; shift + wheel and a sideways swipe still
 * slide it, because neither can mean "bigger". The canvas is the thing that
 * moves, which is what makes it read as a canvas and not as a page with a
 * preview in it.
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
 * What a wheel event asks of the canvas.
 *
 * The wheel zooms — asked for in so many words: drag to move the canvas, the
 * wheel to size it, the way a design tool's canvas works. A trackpad pinch
 * arrives as a wheel with ctrl held, and ⌘/ctrl + wheel is the same request
 * from a mouse, so all three land here.
 *
 * Two gestures still pan, because they cannot mean "bigger": shift + wheel (a
 * wheel mouse's only way to ask for sideways) and a swipe that is mostly
 * sideways (a trackpad saying the same thing directly).
 */
export type WheelIntent =
  | { kind: "zoom"; factor: number }
  | { kind: "pan"; delta: CanvasPan }
  | null;

/** Lines and pages are turned into pixels so every device speaks one unit. */
const WHEEL_UNIT = [1, 16, 400] as const;

/**
 * How hard one pixel of wheel pushes the zoom.
 *
 * A pinch reports a few pixels per event at a high rate, a wheel notch reports
 * around a hundred at once — so the pinch gets the stronger rate and the notch
 * is capped, which makes one notch about 16% and a pinch follow the fingers.
 */
const PINCH_RATE = 0.012;
const WHEEL_RATE = 0.0025;
const WHEEL_STEP_CAP = 60;

export function wheelIntent(event: {
  deltaX: number;
  deltaY: number;
  deltaMode?: number;
  shiftKey: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): WheelIntent {
  const unit = WHEEL_UNIT[event.deltaMode ?? 0] ?? 1;
  const dx = event.deltaX * unit;
  const dy = event.deltaY * unit;
  if (event.ctrlKey || event.metaKey) {
    if (dy === 0) return null;
    // ctrl alone with small deltas is the pinch; ⌘ is always a mouse.
    const pinch = event.ctrlKey && !event.metaKey && Math.abs(dy) < 40;
    const push = pinch ? dy * PINCH_RATE : clampStep(dy) * WHEEL_RATE;
    return { kind: "zoom", factor: Math.exp(-push) };
  }
  if (event.shiftKey) {
    const x = dx || dy;
    return x === 0 ? null : { kind: "pan", delta: { x, y: 0 } };
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    return { kind: "pan", delta: { x: dx, y: dy } };
  }
  if (dy === 0) return null;
  return { kind: "zoom", factor: Math.exp(-clampStep(dy) * WHEEL_RATE) };
}

function clampStep(delta: number): number {
  return Math.max(-WHEEL_STEP_CAP, Math.min(WHEEL_STEP_CAP, delta));
}

/**
 * The pan that keeps one screen point fixed while the canvas changes size.
 *
 * Measured rather than derived: the frame is centred by `margin: auto` until
 * it outgrows the surface and then pins to the top left, so where the zoom
 * moves it from depends on which side of that line it is. Taking the box
 * before and after, the point under the cursor is at the same fraction of the
 * box both times, and the pan is moved by however far that fraction travelled.
 */
export function anchoredPan(
  pan: CanvasPan,
  anchor: { x: number; y: number },
  before: { left: number; top: number; width: number; height: number },
  after: { left: number; top: number; width: number; height: number },
): CanvasPan {
  if (before.width === 0 || before.height === 0) return pan;
  const fx = (anchor.x - before.left) / before.width;
  const fy = (anchor.y - before.top) / before.height;
  return {
    x: pan.x + anchor.x - (after.left + fx * after.width),
    y: pan.y + anchor.y - (after.top + fy * after.height),
  };
}

/**
 * A drag far enough to be a pan rather than a click.
 *
 * Under this the press is still a click — which is how a module is selected —
 * and over it the canvas moves and the click that would follow is swallowed.
 */
export const CANVAS_DRAG_SLOP = 4;

/**
 * Where a wheel or a drag leaves the canvas.
 *
 * Subtracted, not added: a positive delta is the view moving down or right,
 * which is the content moving up or left — the canvas travels with the hand.
 * A drag passes its pointer movement negated for the same reason. A zero
 * delta just clamps, which is how a zoom's anchored pan is kept in range.
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
