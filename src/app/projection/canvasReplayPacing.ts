import type { AgentUXEvent } from "../../agentux";

/**
 * How long the canvas waits before revealing each event.
 *
 * The sibling of `previewReplayDelay` in `previewReplayPacing.ts`, and
 * deliberately not the same function. That one paces a *saved run* — a thing
 * the reader asked to watch once, where a leisurely 220–760ms per event reads
 * as the run taking its time. This one paces something that restarts every time
 * the reader touches a control, so its total length is a cost they pay on every
 * edit. At the preview's pacing the whole reply takes about twelve seconds,
 * which is far too long to sit through to see a border change.
 *
 * So everything is brisk except the one wait that carries meaning.
 */

/**
 * The thinking phase.
 *
 * Five seconds, which is the number the reader asked for, and it is spent here
 * rather than spread across the reasoning events because this is the gap the
 * block's clock measures: the clock starts when `reasoning.status` is revealed
 * and stops when `reasoning.finished` is, so holding *this* event back for five
 * seconds is what makes the block count 已思考1秒 up to 已思考5秒 and then
 * close reporting five.
 *
 * Nothing else in the codebase needs to know the number. The closed title is
 * the measured duration rather than a written-down one, so the wait and the
 * label cannot disagree — change this constant and the block reports the new
 * value.
 */
export const CANVAS_THINKING_MS = 5_000;

export function canvasReplayDelay(event: AgentUXEvent): number {
  if (event.type === "reasoning.finished") return CANVAS_THINKING_MS;
  // Deltas are the dense part of a stream — a text body arrives as several —
  // and a visible pause between them reads as stalling rather than as writing.
  if (event.type.endsWith(".delta")) return 140;
  return 240;
}
