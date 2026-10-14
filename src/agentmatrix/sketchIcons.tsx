/**
 * The Handdrawn style's own icon set, from the design the style came from.
 *
 * A fifth icon vocabulary, after lucide, codicon, pixelarticons and the Game
 * set — and it earns the place the same way they do. These are not lucide
 * icons with a filter over them: the wobble is drawn *into* the paths. Every
 * stroke is a quadratic curve whose control points sit slightly off the ideal,
 * the magnifier's ring is a `stroke-dasharray` so the circle breaks the way a
 * pen skips, and no two ends of a shape quite meet. A round `<circle>` pushed
 * through `feDisplacementMap` does not look like that; it looks like a circle
 * someone shook.
 *
 * Registered in `ICON_OPTIONS` as options beside the lucide alternatives for
 * their slots, so the reader picks one in the rail and the canvas follows —
 * the same contract the Game set uses.
 *
 * Two changes transcribing them, and both are the lesson from the Game set:
 *
 * `#1a1a1a` became `currentColor` everywhere. The design hardcodes its ink, and
 * this style has four colourways — the literal would stay black on the kraft
 * pad, where the ink is sepia, and be invisible on the blackboard, where the
 * ink is chalk.
 *
 * Each keeps its own `viewBox` (13, 15, 17, 18, 20, 22) rather than being
 * renormalised. The stroke weights are tuned to those grids; rescaling the
 * coordinates would change the line weight, which in a pen style is the one
 * thing that must not drift.
 */

import { createElement, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type SketchIconProps = { size?: number | string; className?: string; [key: string]: unknown };

/**
 * Shared frame. `stroke="currentColor"` and the round caps are what every one of
 * these relies on, so a child only says so when it differs — and `fill="none"`
 * because these are drawings, not glyphs.
 */
function sketchIcon(viewBox: string, children: ReactNode): LucideIcon {
  const Icon = ({ size = 16, className, ...rest }: SketchIconProps) =>
    createElement(
      "svg",
      {
        ...rest,
        className,
        width: size,
        height: size,
        viewBox,
        fill: "none",
        stroke: "currentColor",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        xmlns: "http://www.w3.org/2000/svg",
        "aria-hidden": true,
        focusable: false,
      },
      children,
    );
  return Icon as unknown as LucideIcon;
}

const el = createElement;

/** A magnifier whose ring skips, the way a pen does on paper. */
export const SketchSearchIcon = sketchIcon("0 0 20 20", [
  el("circle", {
    key: "o",
    cx: 8.5,
    cy: 8.5,
    r: 5.2,
    strokeWidth: 1.8,
    // The break pattern *is* the hand: an unbroken ring reads as vector.
    strokeDasharray: "1.5 0.3 2 0.2 1.8 0.4 2.2 0.2",
  }),
  el("path", { key: "h", d: "M12.5 13 Q14 14.5 16.5 17", strokeWidth: 1.8 }),
]);

/** Three panels, each drawn as its own wobbling rectangle. */
export const SketchLayoutIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "a", d: "M2.5 2.8 Q2.4 2.5 6.5 2.4 Q6.6 2.5 6.7 17 Q6.5 17.2 2.4 17.1 Q2.3 17 2.5 2.8Z", strokeWidth: 1.7 }),
  el("path", { key: "b", d: "M8.5 2.5 Q8.4 2.3 17.3 2.4 Q17.5 2.5 17.4 8.6 Q17.3 8.8 8.4 8.7 Q8.3 8.6 8.5 2.5Z", strokeWidth: 1.7 }),
  el("path", { key: "c", d: "M8.5 10.8 Q8.4 10.6 17.3 10.7 Q17.5 10.8 17.4 17 Q17.3 17.2 8.4 17.1 Q8.3 17 8.5 10.8Z", strokeWidth: 1.7 }),
]);

/** A plus whose two strokes are not quite straight and do not quite cross. */
export const SketchPlusIcon = sketchIcon("0 0 17 17", [
  el("path", { key: "v", d: "M8.5 2.8 Q8.6 3 8.4 14.2", strokeWidth: 1.9 }),
  el("path", { key: "h", d: "M2.5 8.6 Q3 8.5 14.5 8.7", strokeWidth: 1.9 }),
]);

/** A sheet with a folded corner and two ruled lines. */
export const SketchFileIcon = sketchIcon("0 0 22 22", [
  el("path", { key: "b", d: "M4.5 2.8 Q4.3 2.5 12 2.6 L17.3 7.5 Q17.5 7.8 17.4 19 Q17.3 19.3 4.6 19.2 Q4.3 19 4.5 2.8Z", strokeWidth: 1.6 }),
  el("path", { key: "f", d: "M12 2.8 Q12.1 5.5 12.2 7.2 Q14.5 7.3 17.2 7.4", strokeWidth: 1.6 }),
  el("path", { key: "l1", d: "M7 11 Q7.2 10.8 15 11.1", strokeWidth: 1.3 }),
  el("path", { key: "l2", d: "M7 14 Q7.2 13.8 12 14.1", strokeWidth: 1.3 }),
]);

/** Two sheets, the back one drawn as an open corner rather than a full box. */
export const SketchCopyIcon = sketchIcon("0 0 18 18", [
  el("path", { key: "f", d: "M5.5 5.8 Q5.4 5.5 13.5 5.6 Q13.7 5.8 13.6 14 Q13.5 14.2 5.4 14.1 Q5.3 13.9 5.5 5.8Z", strokeWidth: 1.6 }),
  el("path", { key: "b", d: "M13 5.5 Q12.8 2.8 12.7 2.6 Q12.5 2.4 4.5 2.5 Q4.3 2.6 4.4 11 Q4.5 11.2 5.5 11.2", strokeWidth: 1.6 }),
]);

/** A pencil, with the shading stroke that says which side is lit. */
export const SketchEditIcon = sketchIcon("0 0 18 18", [
  el("path", { key: "b", d: "M11.5 3 Q12.8 1.8 14.5 3.5 Q16 5.2 14.8 6.5 L6 15.5 L2.5 16 L3 12.5 Z", strokeWidth: 1.6 }),
  el("path", { key: "s", d: "M10 5 Q11.5 5 13 7", strokeWidth: 1.4 }),
]);

/** A loop that does not close, with a hooked arrowhead. */
export const SketchRefreshIcon = sketchIcon("0 0 18 18", [
  el("path", { key: "a", d: "M14.5 9 Q14.3 13.5 9.2 14.8 Q4.5 15.5 2.8 11 Q1.5 7 4 4.5 Q6.8 2 10.5 2.8 Q13 3.5 14 5.5", strokeWidth: 1.7 }),
  el("path", { key: "h", d: "M14 2.5 Q14.2 3 13.8 6 L11 5.5", strokeWidth: 1.7 }),
]);

/** A microphone on its stand. */
export const SketchMicIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "c", d: "M10 2 Q13.5 2.2 13.4 7 L13.3 11.5 Q13 14 10.1 14 Q7 14.2 6.7 11.5 L6.6 7 Q6.5 2.2 10 2Z", strokeWidth: 1.7 }),
  el("path", { key: "a", d: "M3.5 10.5 Q3.5 17 10 17 Q16.5 17 16.5 10.5", strokeWidth: 1.7 }),
  el("path", { key: "s", d: "M10 17 Q10.1 19 10 20", strokeWidth: 1.7 }),
  el("path", { key: "f", d: "M7 20 Q8.5 19.8 13 20", strokeWidth: 1.7 }),
]);

/** A paper plane, drawn as three strokes rather than a filled triangle. */
export const SketchSendIcon = sketchIcon("0 0 18 18", [
  el("path", { key: "a", d: "M2 2 Q2.5 1.8 16 8.5 Q16.2 9 2 16", strokeWidth: 1.8 }),
  el("path", { key: "b", d: "M2 16 Q2.2 9 16 8.5", strokeWidth: 1.8 }),
  el("path", { key: "c", d: "M8 8.6 Q9 8.5 16 8.5", strokeWidth: 1.3 }),
]);

/** A thought balloon with its two trailing bubbles. */
export const SketchThoughtIcon = sketchIcon("0 0 15 15", [
  el("path", { key: "b", d: "M3 8 Q2 4 7 3 Q12 2 13 6 Q14 10 10 11 Q8 12 6 11 Q4 12 4 14 Q3.5 14 3.5 12.5 Q2 12 2.5 10 Q2 9 3 8Z", strokeWidth: 1.5 }),
  el("circle", { key: "d1", cx: 5, cy: 13.2, r: 0.9, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "d2", cx: 3.5, cy: 14.5, r: 0.6, fill: "currentColor", stroke: "none" }),
]);

/** A chevron drawn as one curved stroke, not two straight ones. */
export const SketchChevronIcon = sketchIcon("0 0 13 13", [
  el("path", { key: "c", d: "M2.5 4.5 Q4.5 7.5 6.5 9 Q8.5 7.5 10.5 4.5", strokeWidth: 1.8 }),
]);

/** A shield with a tick. */
export const SketchShieldIcon = sketchIcon("0 0 15 15", [
  el("path", { key: "s", d: "M7.5 1.5 Q8 1.3 13 3.5 L13 7.5 Q12.8 12 7.5 14 Q2.2 12 2 7.5 L2 3.5 Q6.5 1.3 7.5 1.5Z", strokeWidth: 1.5 }),
  el("path", { key: "t", d: "M5 7.5 Q6 9 7 10 Q9 8 10.5 6", strokeWidth: 1.5 }),
]);

/** A dial with a needle. */
export const SketchSpeedIcon = sketchIcon("0 0 15 15", [
  el("path", { key: "a", d: "M2 10.5 Q2.5 4 7.5 3.5 Q13 3.5 13 10.5", strokeWidth: 1.5 }),
  el("path", { key: "n", d: "M7.5 10 Q8.5 7 10.5 5", strokeWidth: 1.5 }),
  el("circle", { key: "p", cx: 7.5, cy: 10.5, r: 1.3, fill: "currentColor", stroke: "none" }),
]);

/** A four-point star with a second, smaller one beside it. */
export const SketchSparkleIcon = sketchIcon("0 0 15 15", [
  el("path", { key: "s", d: "M7.5 1.5 Q8 4.5 8.3 6 Q10 6.5 13.5 7.5 Q10 8.3 8.3 9 Q8 10.5 7.5 13.5 Q7 10.5 6.7 9 Q5 8.3 1.5 7.5 Q5 6.5 6.7 6 Q7 4.5 7.5 1.5Z", strokeWidth: 1.5 }),
  el("path", { key: "a", d: "M12 1.5 Q12.3 2.5 12 3.5", strokeWidth: 1.2 }),
  el("path", { key: "b", d: "M11 2.5 Q12 2.5 13 2.5", strokeWidth: 1.2 }),
]);

/** A wrench, drawn in one continuous stroke. */
export const SketchWrenchIcon = sketchIcon("0 0 15 15", [
  el("path", { key: "w", d: "M11 1.5 Q14 3 13 6 Q11.5 8 9.5 7.5 L3.5 13.5 Q2 15 1 13.5 Q0 12 1.5 11 L7.5 5 Q7 3 8.5 1.5 Q9.5 0.5 11 1.5Z", strokeWidth: 1.5 }),
]);

/** A speech balloon with a tail. */
export const SketchChatIcon = sketchIcon("0 0 15 15", [
  el("path", { key: "b", d: "M1.5 2.5 Q1.3 2 13 2.2 Q13.5 2.5 13.4 9 Q13.3 9.5 5.5 9.4 L2 13.5 Q1.8 11 2 9.5 Q1.3 9 1.5 2.5Z", strokeWidth: 1.5 }),
]);

/* ==========================================================================
   The rest of the set.
   --------------------------------------------------------------------------
   The seventeen above are transcriptions of the design's own icons, which
   covered one glyph per slot. The rail's galleries hold four tiles a slot, so
   in this style three of the four were lucide — an outline vector set sitting
   next to a pen drawing, which is precisely the mismatch the header of this
   file argues against. These are the other three, drawn rather than borrowed,
   so every gallery in 手绘风 is four hand-drawn choices.

   They are new designs, not variations: a slot's four are four different
   *ideas* for the same job (read = a sheet, a book, an eye, a stack), because
   four drawings of one object at 16px are four tiles the reader cannot tell
   apart — the bug the Pixel set's `pixelIconForOption` table exists to fix.

   Same drawing rules as above, and they are the whole point: quadratic curves
   whose control points sit off the ideal, corners that overshoot, no two ends
   quite meeting, and `currentColor` throughout so all four colourways work.
   ========================================================================== */

/* ---- tool.file_read: a sheet, a book, an eye, a stack -------------------- */

/** An open book, the spine dipping the way a paperback's does. */
export const SketchBookIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "s", d: "M10 5.6 Q10.2 10.5 10 16.4", strokeWidth: 1.6 }),
  el("path", { key: "l", d: "M10 5.6 Q7 3.8 2.5 4.3 Q2.3 4.6 2.4 14.8 Q2.7 15.1 6.1 14.9 Q8.7 14.9 10 16.4", strokeWidth: 1.6 }),
  el("path", { key: "r", d: "M10 5.6 Q13 3.8 17.5 4.3 Q17.7 4.6 17.6 14.8 Q17.3 15.1 13.9 14.9 Q11.3 14.9 10 16.4", strokeWidth: 1.6 }),
  el("path", { key: "t1", d: "M4.6 8.2 Q5.2 8 8.2 8.3", strokeWidth: 1.1 }),
  el("path", { key: "t2", d: "M11.9 8.2 Q12.5 8 15.5 8.3", strokeWidth: 1.1 }),
]);

/** An eye, with one lash so it reads as drawn rather than as a lens. */
export const SketchEyeIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "l", d: "M1.9 10.1 Q5.2 4.6 10 4.7 Q15 4.8 18.2 10 Q14.9 15.5 10 15.4 Q5 15.3 1.9 10.1Z", strokeWidth: 1.7 }),
  el("circle", { key: "i", cx: 10, cy: 10, r: 2.7, strokeWidth: 1.5 }),
  el("circle", { key: "p", cx: 10, cy: 10, r: 0.9, fill: "currentColor", stroke: "none" }),
  el("path", { key: "b", d: "M10 2.2 Q10.2 3 10 4.4", strokeWidth: 1.2 }),
]);

/** Three sheets, the back two drawn as corners rather than full boxes. */
export const SketchStackIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "b1", d: "M7.4 1.8 Q7.6 1.6 17.3 1.7 Q17.5 1.9 17.4 11.4", strokeWidth: 1.4 }),
  el("path", { key: "b2", d: "M5.1 4.6 Q5.3 4.4 15.4 4.5 Q15.6 4.7 15.5 14.6", strokeWidth: 1.5 }),
  el("path", { key: "f", d: "M2.7 7.5 Q2.6 7.2 13.3 7.3 Q13.6 7.5 13.5 17.4 Q13.2 17.7 2.9 17.5 Q2.6 17.3 2.7 7.5Z", strokeWidth: 1.7 }),
  el("path", { key: "t1", d: "M5.4 11 Q6 10.8 10.8 11.1", strokeWidth: 1.2 }),
  el("path", { key: "t2", d: "M5.4 14 Q6 13.8 9.2 14.1", strokeWidth: 1.2 }),
]);

/* ---- tool.file_edit: a pencil, a quill, an eraser, a brush --------------- */

/** A quill, with two barbs pulled away from the shaft. */
export const SketchQuillIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "f", d: "M17.2 2.4 Q17.8 9 13.2 13 Q9.1 16.6 4.6 15.7 Q4.1 11.8 8.2 7.9 Q12.3 3.4 17.2 2.4Z", strokeWidth: 1.6 }),
  el("path", { key: "s", d: "M15.8 4 Q10.4 9 6 14.4", strokeWidth: 1.3 }),
  el("path", { key: "b1", d: "M13.8 5.4 Q11.4 6.6 10 8.6", strokeWidth: 1.1 }),
  el("path", { key: "b2", d: "M12.6 9 Q10.6 10.1 9.2 12", strokeWidth: 1.1 }),
  el("path", { key: "n", d: "M5.2 15.6 Q3.6 16.9 2.4 18.2", strokeWidth: 1.6 }),
]);

/** An eraser mid-stroke, with the line it has half taken away. */
export const SketchEraserIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "b", d: "M8 11.8 Q11.2 8.2 13.6 5.6 Q14.2 5 15.8 6.7 Q17.3 8.4 16.7 9.1 Q14.4 11.8 11.2 15.2 Q10.6 15.8 9 14.2 Q7.5 12.6 8 11.8Z", strokeWidth: 1.6 }),
  el("path", { key: "k", d: "M11 9.2 Q12.7 10.8 14 12.4", strokeWidth: 1.3 }),
  el("path", { key: "r1", d: "M2.6 17.4 Q4.2 17.1 6.2 17.4", strokeWidth: 1.5 }),
  el("path", { key: "r2", d: "M8.2 17.4 Q9.4 17.2 10.4 17.4", strokeWidth: 1.5 }),
  el("circle", { key: "c1", cx: 5.4, cy: 13.6, r: 0.6, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "c2", cx: 3.6, cy: 11.2, r: 0.5, fill: "currentColor", stroke: "none" }),
]);

/** A brush, with the swipe it just laid down. */
export const SketchBrushIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "h", d: "M17.1 2.6 Q13.6 6.3 10.2 9.8", strokeWidth: 1.7 }),
  el("path", { key: "t", d: "M10.4 9.5 Q7.6 11 6.6 13.6 Q9.1 14.9 11.4 13.6 Q12.3 11.4 10.4 9.5Z", strokeWidth: 1.6 }),
  el("path", { key: "s", d: "M2.5 17.5 Q5.6 15.8 9 17 Q12.4 18.1 16.2 16.4", strokeWidth: 1.3 }),
]);

/* ---- tool.validate: a shield, a tick, a clipboard, two ticks ------------- */

/** A tick inside a ring that skips, like the magnifier's. */
export const SketchTickIcon = sketchIcon("0 0 18 18", [
  el("circle", {
    key: "o",
    cx: 9,
    cy: 9,
    r: 7,
    strokeWidth: 1.7,
    strokeDasharray: "2 0.4 2.6 0.3 2.2 0.4 2.8 0.3",
  }),
  el("path", { key: "t", d: "M5.4 9.3 Q7 11.3 8.2 12.5 Q10.6 8.8 13 5.8", strokeWidth: 1.8 }),
]);

/** A clipboard with its clip and a tick. */
export const SketchClipboardIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "b", d: "M4.5 4.1 Q4.2 3.8 15.5 3.9 Q15.8 4.1 15.7 17.4 Q15.4 17.7 4.6 17.6 Q4.3 17.4 4.5 4.1Z", strokeWidth: 1.6 }),
  el("path", { key: "c", d: "M7.5 4.1 Q7.3 1.8 10 1.9 Q12.7 1.9 12.5 4.1 Q10 4.4 7.5 4.1Z", strokeWidth: 1.5 }),
  el("path", { key: "t", d: "M7 10.6 Q8.2 12.1 9 13 Q10.9 10.4 12.9 8", strokeWidth: 1.6 }),
]);

/** Two ticks, for "and always". Deliberately not a third document shape. */
export const SketchDoubleTickIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "a", d: "M2 10.6 Q4 13 5.4 14.4 Q8.5 10.2 11.6 6.4", strokeWidth: 1.8 }),
  el("path", { key: "b", d: "M8.2 10.6 Q10.2 13 11.6 14.4 Q14.6 10.2 17.7 6.3", strokeWidth: 1.8 }),
]);

/* ---- tool.search: a magnifier, binoculars, a lantern, a trail ----------- */

/** Binoculars, two barrels and a bridge. */
export const SketchBinocularsIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "l", d: "M3.1 7.6 Q2.8 6 4.3 5.8 Q6.4 5.6 6.9 7.2 Q7.7 11 7 14 Q6.4 16.5 4.6 16.3 Q2.8 16 2.6 13.5 Q2.4 10 3.1 7.6Z", strokeWidth: 1.6 }),
  el("path", { key: "r", d: "M16.9 7.6 Q17.2 6 15.7 5.8 Q13.6 5.6 13.1 7.2 Q12.3 11 13 14 Q13.6 16.5 15.4 16.3 Q17.2 16 17.4 13.5 Q17.6 10 16.9 7.6Z", strokeWidth: 1.6 }),
  el("path", { key: "b", d: "M7.2 9.5 Q10 8.9 12.8 9.5", strokeWidth: 1.5 }),
  el("path", { key: "e", d: "M4.4 4 Q5.6 3.6 6.6 4.4", strokeWidth: 1.2 }),
]);

/**
 * A torch with its beam, because looking for something is carrying a light to
 * it.
 *
 * Drawn as a lantern first — an upright body with a handle over it and a flame
 * inside — and at 16px that is a padlock: tall rounded box, arc on top, mark in
 * the middle. The silhouette has to do the work at this size, and a torch's is
 * horizontal with three rays leaving it, which nothing else in the set is.
 */
export const SketchLanternIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "g", d: "M2.5 7.8 Q2.3 7.5 7.4 7.6 Q7.7 7.8 7.6 12.3 Q7.3 12.6 2.7 12.5 Q2.3 12.3 2.5 7.8Z", strokeWidth: 1.6 }),
  el("path", { key: "l", d: "M7.6 6.3 Q7.9 6 10.5 6.8 Q10.8 7 10.7 13.1 Q10.4 13.4 7.8 13.9 Q7.5 13.6 7.6 6.3Z", strokeWidth: 1.6 }),
  el("path", { key: "r1", d: "M12 7.4 Q15 5.9 17.4 4.6", strokeWidth: 1.3 }),
  el("path", { key: "r2", d: "M12.2 10 Q15.2 9.8 17.6 10", strokeWidth: 1.3 }),
  el("path", { key: "r3", d: "M12 12.6 Q15 14.1 17.4 15.4", strokeWidth: 1.3 }),
]);

/** A dotted route up to a pin — the search that has landed somewhere. */
export const SketchTrailIcon = sketchIcon("0 0 20 20", [
  el("path", {
    key: "t",
    d: "M2.4 17.4 Q5 11.6 9.2 12.6 Q13.2 13.4 13.6 10",
    strokeWidth: 1.7,
    strokeDasharray: "1.9 1.7",
  }),
  el("path", { key: "p", d: "M13.6 2.2 Q16.9 2.4 16.7 5.7 Q16.4 7.5 13.6 9.8 Q10.7 7.5 10.4 5.7 Q10.2 2.4 13.6 2.2Z", strokeWidth: 1.6 }),
  el("circle", { key: "d", cx: 13.6, cy: 5.3, r: 1.1, fill: "currentColor", stroke: "none" }),
]);

/* ---- content.thinking: a balloon, a bulb, a scribble, a cloud ----------- */

/** A bulb with a filament and two rays. */
export const SketchBulbIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "g", d: "M10 2.4 Q14.6 2.7 14.8 7 Q14.9 9.7 12.6 11.5 Q12.4 12.6 12.4 13.4 Q10 14 7.6 13.4 Q7.6 12.6 7.4 11.5 Q5.1 9.7 5.2 7 Q5.4 2.7 10 2.4Z", strokeWidth: 1.6 }),
  el("path", { key: "f", d: "M8.7 8.8 Q10 7.2 11.3 8.8", strokeWidth: 1.2 }),
  el("path", { key: "b1", d: "M7.9 15 Q10 15.6 12.1 15", strokeWidth: 1.4 }),
  el("path", { key: "b2", d: "M8.5 17.1 Q10 17.6 11.5 17.1", strokeWidth: 1.4 }),
  el("path", { key: "r1", d: "M2.6 5.2 Q3.5 5.8 4.2 6.2", strokeWidth: 1.2 }),
  el("path", { key: "r2", d: "M17.4 5.2 Q16.5 5.8 15.8 6.2", strokeWidth: 1.2 }),
]);

/** A scribbled spiral. The doodle a hand makes while the head works. */
export const SketchSpiralIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "s", d: "M10.2 10.4 Q11.4 9 10 7.8 Q8.1 6.7 7 8.7 Q6.1 11.1 8.7 12.8 Q11.7 14.4 14 11.7 Q16.2 8.6 13.5 5.3 Q10.5 2 6.2 3.8", strokeWidth: 1.7 }),
]);

/** A thought cloud with three dots in it — puffier than the balloon, no tail. */
export const SketchCloudIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "c", d: "M4.6 13 Q1.8 12.5 2.4 9.9 Q2.9 7.6 5.5 7.4 Q5.7 4.2 9.1 4.2 Q12.1 4.2 12.9 6.4 Q16.5 6 17.4 8.9 Q18.2 12.1 15 13 Q10 13.4 4.6 13Z", strokeWidth: 1.6 }),
  el("circle", { key: "d1", cx: 7.2, cy: 9.9, r: 0.85, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "d2", cx: 10, cy: 9.9, r: 0.85, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "d3", cx: 12.8, cy: 9.9, r: 0.85, fill: "currentColor", stroke: "none" }),
]);

/* ---- content.terminal: a wrench, a console, a cog, a hammer ------------- */

/** A console window with a prompt and a caret. */
export const SketchConsoleIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "w", d: "M2.6 3.7 Q2.4 3.4 17.4 3.5 Q17.6 3.8 17.5 16.4 Q17.2 16.7 2.8 16.6 Q2.4 16.4 2.6 3.7Z", strokeWidth: 1.6 }),
  el("path", { key: "r", d: "M2.7 6.7 Q9.2 6.4 17.4 6.7", strokeWidth: 1.2 }),
  el("path", { key: "p", d: "M5.4 10 Q6.9 11.6 7.9 12.5 Q6.6 13.5 5.4 14.7", strokeWidth: 1.6 }),
  el("path", { key: "c", d: "M9.7 14.7 Q11.7 14.4 13.7 14.7", strokeWidth: 1.6 }),
]);

/** A cog: a ring, six teeth, a hub. */
export const SketchCogIcon = sketchIcon("0 0 20 20", [
  el("circle", { key: "r", cx: 10, cy: 10, r: 5, strokeWidth: 1.6 }),
  el("path", { key: "t1", d: "M10 5 Q10.2 4 10 2.8", strokeWidth: 1.7 }),
  el("path", { key: "t2", d: "M14.3 7.5 Q15.4 7 16.3 6.4", strokeWidth: 1.7 }),
  el("path", { key: "t3", d: "M14.3 12.5 Q15.4 13.1 16.3 13.6", strokeWidth: 1.7 }),
  el("path", { key: "t4", d: "M10 15 Q9.8 16 10 17.2", strokeWidth: 1.7 }),
  el("path", { key: "t5", d: "M5.7 12.5 Q4.6 13.1 3.7 13.6", strokeWidth: 1.7 }),
  el("path", { key: "t6", d: "M5.7 7.5 Q4.6 7 3.7 6.4", strokeWidth: 1.7 }),
  el("circle", { key: "h", cx: 10, cy: 10, r: 1.7, strokeWidth: 1.3 }),
]);

/** A hammer, the handle one stroke with a grip mark. */
export const SketchHammerIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "h", d: "M9.4 4.4 Q10 2.9 13.6 2.8 Q17.2 2.6 17.3 4.7 Q17.2 6.7 13.6 6.7 Q10 6.7 9.4 5.2Z", strokeWidth: 1.6 }),
  el("path", { key: "s", d: "M11.5 6.7 Q8.6 11.4 4.6 16.9", strokeWidth: 1.9 }),
  el("path", { key: "g", d: "M6.6 13 Q7.6 13.9 8.4 14.5", strokeWidth: 1.2 }),
]);

/* ---- content.text: a balloon, a note, quote marks, a letter ------------- */

/** A ruled sheet with a torn bottom edge. */
export const SketchNoteIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "s", d: "M4 2.9 Q3.8 2.6 16 2.7 Q16.3 2.9 16.2 15.4 Q13.1 16.8 10 15.6 Q7 14.4 4.2 15.9 Q3.8 15.6 4 2.9Z", strokeWidth: 1.6 }),
  el("path", { key: "l1", d: "M6.6 6.5 Q7.2 6.3 13.4 6.6", strokeWidth: 1.2 }),
  el("path", { key: "l2", d: "M6.6 9.1 Q7.2 8.9 13.4 9.2", strokeWidth: 1.2 }),
  el("path", { key: "l3", d: "M6.6 11.7 Q7.2 11.5 11 11.8", strokeWidth: 1.2 }),
]);

/** Two quote marks, drawn as comma strokes. */
export const SketchQuoteIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "a", d: "M4.6 6.2 Q7.6 6.2 7.4 9.2 Q7.2 12.3 4.4 13.1 Q6.1 11.4 5.9 9.7 Q3.9 9.6 3.6 7.9 Q3.4 6.3 4.6 6.2Z", strokeWidth: 1.5 }),
  el("path", { key: "b", d: "M12.6 6.2 Q15.6 6.2 15.4 9.2 Q15.2 12.3 12.4 13.1 Q14.1 11.4 13.9 9.7 Q11.9 9.6 11.6 7.9 Q11.4 6.3 12.6 6.2Z", strokeWidth: 1.5 }),
]);

/** An envelope, the flap folded down. */
export const SketchLetterIcon = sketchIcon("0 0 20 20", [
  el("path", { key: "b", d: "M2.6 5.5 Q2.4 5.2 17.4 5.4 Q17.6 5.6 17.5 15 Q17.2 15.3 2.8 15.2 Q2.4 15 2.6 5.5Z", strokeWidth: 1.6 }),
  el("path", { key: "f", d: "M2.9 5.7 Q10 11.5 17.2 5.6", strokeWidth: 1.4 }),
  el("path", { key: "s1", d: "M2.9 14.9 Q6.4 11.7 7.7 10.7", strokeWidth: 1.1 }),
  el("path", { key: "s2", d: "M17.2 14.9 Q13.7 11.7 12.4 10.7", strokeWidth: 1.1 }),
]);

/* ---- session.item: a balloon, a bookmark, a pin, a tag ----------------- */

/** A ribbon bookmark, the notch cut by hand. */
export const SketchBookmarkIcon = sketchIcon("0 0 18 18", [
  el("path", { key: "r", d: "M4.4 2.7 Q4.2 2.4 13.6 2.5 Q13.9 2.7 13.8 15.6 Q11 13.2 9 11.8 Q7 13.2 4.3 15.5 Q4.1 15.3 4.4 2.7Z", strokeWidth: 1.7 }),
]);

/** A push-pin, seen from the front. */
export const SketchPinIcon = sketchIcon("0 0 18 18", [
  el("path", { key: "h", d: "M6 3.1 Q9 1.6 12 3.4 Q13 5 11.4 6.3 Q12.6 8.4 13.4 9.5 Q9 10.7 4.6 9.4 Q5.6 8.2 6.6 6.3 Q5 5 6 3.1Z", strokeWidth: 1.6 }),
  el("path", { key: "n", d: "M9 10.7 Q9.3 13.4 9 16.4", strokeWidth: 1.5 }),
]);

/** A luggage tag with its hole. */
export const SketchTagIcon = sketchIcon("0 0 18 18", [
  el("path", { key: "b", d: "M8.4 2.7 Q8.6 2.5 15.2 2.6 Q15.5 2.8 15.4 9.4 Q12.3 12.5 9.2 15.4 Q8.9 15.6 2.8 9.4 Q2.6 9.2 8.4 2.7Z", strokeWidth: 1.6 }),
  el("circle", { key: "h", cx: 12.2, cy: 5.7, r: 1.2, strokeWidth: 1.4 }),
]);

/**
 * The drawn face, as an avatar.
 *
 * The one icon here that carries fills: the ring, the head and the shirt are
 * paper-coloured so the hair reads as hair rather than as a hole, and the hair
 * highlight is drawn *in paper* over the black. Those two take
 * `--sketch-avatar-paper`, which the style's CSS points at its own surface —
 * hardcoding `#f7f4ee` would leave a cream face on the blackboard.
 */
export const SketchFaceIcon = sketchIcon("0 0 48 48", [
  el("path", { key: "r", d: "M24 3 Q43 3 44 24 Q44 44 24 45 Q4 44 4 24 Q4 3 24 3Z", strokeWidth: 1.8, fill: "var(--sketch-avatar-paper, #f0ede6)" }),
  el("path", { key: "h", d: "M24 10 Q33 10 34 20 Q35 29 28 32 Q22 34 17 29 Q13 24 14 17 Q15 10 24 10Z", strokeWidth: 1.6, fill: "var(--sketch-avatar-paper, #f7f4ee)" }),
  el("path", { key: "hair", d: "M14 17 Q13 8 21 6 Q29 4 33 10 Q37 15 34 20", strokeWidth: 1.8, fill: "currentColor" }),
  el("path", { key: "curl", d: "M15 15 Q18 10 21 13 Q22 8 26 11 Q27 6 31 9 Q33 6 35 10", strokeWidth: 1.3, stroke: "var(--sketch-avatar-paper, #f7f4ee)" }),
  el("circle", { key: "e1", cx: 20, cy: 20, r: 1.5, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "e2", cx: 27, cy: 20, r: 1.5, fill: "currentColor", stroke: "none" }),
  el("path", { key: "s", d: "M20 25 Q24 28 28 25", strokeWidth: 1.4 }),
  el("path", { key: "shirt", d: "M17 43 Q18 35 20 32 Q24 35 28 32 Q30 35 31 43", strokeWidth: 1.4, fill: "var(--sketch-avatar-paper, #f7f4ee)" }),
  // The three motion lines, which are what make it a comic panel rather than a
  // portrait.
  el("path", { key: "m1", d: "M36 10 Q39 8 41 6", strokeWidth: 1.3 }),
  el("path", { key: "m2", d: "M38 14 Q42 13 44 13", strokeWidth: 1.3 }),
  el("path", { key: "m3", d: "M37 18 Q40 20 42 22", strokeWidth: 1.3 }),
]);

/* ==========================================================================
   Avatars.
   --------------------------------------------------------------------------
   The design shipped one face, which it used for the Agent. Eight are needed:
   four a side, the count every other style offers and the count `App.test.tsx`
   holds it to. So seven more, and they are drawn as *characters* rather than as
   four redraws of one head — the same argument as the icons above, and more
   visible here, because two avatars that differ only in a hairline are two
   tiles the reader reads as a rendering bug.

   All of them share the panel frame `SketchFaceIcon` established: the rounded
   ring, paper-filled so the ink reads as ink and not as a hole, and the two or
   three motion lines that make the tile a comic panel rather than a portrait.

   The paper fills go through `--sketch-avatar-paper`, never a literal. The ink
   is `currentColor` and the four colourways move it — on the blackboard
   colourway the ink is chalk, and a face filled with `#f7f4ee` would be a cream
   cut-out floating on slate.

   Painting order is load-bearing: ring, then shoulders, then head, then hair,
   then features. Each fill covers what came before it, which is how a drawn
   figure is built up and the only order in which the hair sits *on* the head.
   ========================================================================== */

/** The panel ring every avatar below sits in. */
const avatarRing = () =>
  el("path", {
    key: "ring",
    d: "M24 3 Q43 3 44 24 Q44 44 24 45 Q4 44 4 24 Q4 3 24 3Z",
    strokeWidth: 1.8,
    fill: "var(--sketch-avatar-paper, #f0ede6)",
  });

const PAPER = "var(--sketch-avatar-paper, #f7f4ee)";

/* ---- author.agent: the face, a robot, an owl, a cat ------------------- */

/** A boxy robot with a bulb antenna. */
export const SketchBotIcon = sketchIcon("0 0 48 48", [
  avatarRing(),
  el("path", { key: "body", d: "M15 44 Q15.5 36 17.5 33 Q24 35.5 30.5 33 Q32.5 36 33 44", strokeWidth: 1.5, fill: PAPER }),
  el("path", { key: "head", d: "M13 16.5 Q13 14.8 24 14.5 Q35 14.8 35 16.5 Q35.6 30 34 31.2 Q24 32.8 14 31.2 Q12.4 30 13 16.5Z", strokeWidth: 1.7, fill: PAPER }),
  el("path", { key: "ant", d: "M24 14.4 Q24.2 11.4 24 9.4", strokeWidth: 1.5 }),
  el("circle", { key: "bulb", cx: 24, cy: 7.4, r: 2, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "e1", cx: 19.4, cy: 21.6, r: 2.1, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "e2", cx: 28.6, cy: 21.6, r: 2.1, fill: "currentColor", stroke: "none" }),
  el("path", { key: "m", d: "M19 27 Q24 29.2 29 27", strokeWidth: 1.5 }),
  el("path", { key: "a1", d: "M12.8 36 Q9.4 37 7.6 39.8", strokeWidth: 1.4 }),
  el("path", { key: "a2", d: "M35.2 36 Q38.6 37 40.4 39.8", strokeWidth: 1.4 }),
]);

/** An owl. Two big rings, and the tufts do the expression. */
export const SketchOwlIcon = sketchIcon("0 0 48 48", [
  avatarRing(),
  el("path", { key: "body", d: "M24 12 Q35 12.4 36 26 Q37 38 24 39.2 Q11 38 12 26 Q13 12.4 24 12Z", strokeWidth: 1.7, fill: PAPER }),
  el("path", { key: "t1", d: "M14.6 15.4 Q12.8 10.6 16.6 9.2", strokeWidth: 1.5 }),
  el("path", { key: "t2", d: "M33.4 15.4 Q35.2 10.6 31.4 9.2", strokeWidth: 1.5 }),
  el("circle", { key: "r1", cx: 19, cy: 23, r: 4.8, strokeWidth: 1.5 }),
  el("circle", { key: "r2", cx: 29, cy: 23, r: 4.8, strokeWidth: 1.5 }),
  el("circle", { key: "p1", cx: 19, cy: 23, r: 1.9, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "p2", cx: 29, cy: 23, r: 1.9, fill: "currentColor", stroke: "none" }),
  el("path", { key: "beak", d: "M24 26.4 Q26 29.2 24 31.2 Q22 29.2 24 26.4Z", strokeWidth: 1.2, fill: "currentColor" }),
  el("path", { key: "w1", d: "M16.4 30 Q18.2 33 17.2 36", strokeWidth: 1.3 }),
  el("path", { key: "w2", d: "M31.6 30 Q29.8 33 30.8 36", strokeWidth: 1.3 }),
  el("path", { key: "f1", d: "M21 39.2 Q20 41.2 18.6 42.2", strokeWidth: 1.3 }),
  el("path", { key: "f2", d: "M27 39.2 Q28 41.2 29.4 42.2", strokeWidth: 1.3 }),
]);

/** A cat, the whiskers running out past the head. */
export const SketchCatIcon = sketchIcon("0 0 48 48", [
  avatarRing(),
  el("path", { key: "head", d: "M24 14.4 Q34 14.6 35 24 Q36 34 24 35.2 Q12 34 13 24 Q14 14.6 24 14.4Z", strokeWidth: 1.7, fill: PAPER }),
  el("path", { key: "ear1", d: "M14.4 19 Q13 12.4 16.6 10.4 Q19.2 13.2 20.4 15.4", strokeWidth: 1.5, fill: PAPER }),
  el("path", { key: "ear2", d: "M33.6 19 Q35 12.4 31.4 10.4 Q28.8 13.2 27.6 15.4", strokeWidth: 1.5, fill: PAPER }),
  el("circle", { key: "e1", cx: 19.4, cy: 24, r: 1.7, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "e2", cx: 28.6, cy: 24, r: 1.7, fill: "currentColor", stroke: "none" }),
  el("path", { key: "n", d: "M24 27 Q22.9 28.5 24 29.2 Q25.1 28.5 24 27Z", strokeWidth: 1.1, fill: "currentColor" }),
  el("path", { key: "m", d: "M20.6 30 Q24 32.2 27.4 30", strokeWidth: 1.4 }),
  el("path", { key: "w1", d: "M13 25.6 Q9.6 25.2 7.2 24.4", strokeWidth: 1.3 }),
  el("path", { key: "w2", d: "M13 29 Q9.6 29.6 7.6 31", strokeWidth: 1.3 }),
  el("path", { key: "w3", d: "M35 25.6 Q38.4 25.2 40.8 24.4", strokeWidth: 1.3 }),
  el("path", { key: "w4", d: "M35 29 Q38.4 29.6 40.4 31", strokeWidth: 1.3 }),
  el("path", { key: "tail", d: "M34 34.6 Q39 36 38.4 41.4", strokeWidth: 1.4 }),
]);

/* ---- author.user: four people ----------------------------------------- */

/**
 * Shared body for the three faces below: shoulders, head, eyes, a smile.
 * `hair` is what makes each one a different person, so it is the argument.
 */
const sketchPerson = (hair: ReactNode[]) => [
  avatarRing(),
  el("path", { key: "body", d: "M14 43.6 Q15 33.6 19 30.4 Q24 33.4 29 30.4 Q33 33.6 34 43.6", strokeWidth: 1.5, fill: PAPER }),
  el("path", { key: "head", d: "M24 12.4 Q31.4 12.6 31.8 19.4 Q32.2 26.6 24 27 Q15.8 26.6 16.2 19.4 Q16.6 12.6 24 12.4Z", strokeWidth: 1.7, fill: PAPER }),
  ...hair,
  el("circle", { key: "e1", cx: 20.6, cy: 19.8, r: 1.5, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "e2", cx: 27.4, cy: 19.8, r: 1.5, fill: "currentColor", stroke: "none" }),
  el("path", { key: "m", d: "M20.8 23.4 Q24 26 27.2 23.4", strokeWidth: 1.4 }),
  el("path", { key: "l1", d: "M37 14 Q40.4 12.6 42.4 11.4", strokeWidth: 1.3 }),
  el("path", { key: "l2", d: "M38 18.4 Q41.4 19 43.4 20.4", strokeWidth: 1.3 }),
];

/** Cropped hair, parted. The plainest of the four, and the style's default. */
export const SketchPersonIcon = sketchIcon(
  "0 0 48 48",
  sketchPerson([
    el("path", { key: "hair", d: "M16.2 19.4 Q15.6 11.6 24 11 Q32.4 11.6 31.8 19.4 Q30.2 14.8 24 14.2 Q17.8 14.8 16.2 19.4Z", strokeWidth: 1.6, fill: "currentColor" }),
    el("path", { key: "part", d: "M22 12 Q25 14 27.6 13", strokeWidth: 1.1, stroke: PAPER }),
  ]),
);

/** A cap, the brim pulled to one side. */
export const SketchCapIcon = sketchIcon(
  "0 0 48 48",
  sketchPerson([
    el("path", { key: "cap", d: "M16 18.2 Q16.4 10.2 24 9.6 Q31.6 10.2 32 18.2 Q24 16.4 16 18.2Z", strokeWidth: 1.6, fill: "currentColor" }),
    el("path", { key: "brim", d: "M32 18 Q37.6 18.4 39.6 20.8 Q37.2 21.8 31.6 21.2", strokeWidth: 1.5, fill: "currentColor" }),
    el("path", { key: "seam", d: "M24 9.8 Q24.4 13.6 24 16.6", strokeWidth: 1, stroke: PAPER }),
  ]),
);

/** Hair gathered in a bun. */
export const SketchBunIcon = sketchIcon(
  "0 0 48 48",
  sketchPerson([
    el("path", { key: "bun", d: "M24 4.6 Q28.4 4.8 28.2 8.8 Q28 12.8 24 12.6 Q20 12.8 19.8 8.8 Q19.6 4.8 24 4.6Z", strokeWidth: 1.5, fill: "currentColor" }),
    el("path", { key: "hair", d: "M16.2 20.4 Q15.4 11.8 24 11.2 Q32.6 11.8 31.8 20.4 Q30.6 15.2 24 14.6 Q17.4 15.2 16.2 20.4Z", strokeWidth: 1.6, fill: "currentColor" }),
    el("path", { key: "strand", d: "M16.6 20.4 Q14.6 25.6 15.4 29.6", strokeWidth: 1.3 }),
  ]),
);

/** Glasses, drawn over the eyes rather than instead of them. */
export const SketchSpecsIcon = sketchIcon(
  "0 0 48 48",
  sketchPerson([
    el("path", { key: "hair", d: "M16.2 19 Q16 11.4 24 10.8 Q32 11.4 31.8 19 Q30.4 14.6 24 14 Q17.6 14.6 16.2 19Z", strokeWidth: 1.6, fill: "currentColor" }),
    el("circle", { key: "g1", cx: 20.6, cy: 19.8, r: 3.4, strokeWidth: 1.4 }),
    el("circle", { key: "g2", cx: 27.4, cy: 19.8, r: 3.4, strokeWidth: 1.4 }),
    el("path", { key: "br", d: "M23.9 19.6 Q24 18.9 25.1 19.6", strokeWidth: 1.2 }),
    el("path", { key: "t1", d: "M17.2 19.2 Q16.4 18.8 15.6 19.2", strokeWidth: 1.2 }),
    el("path", { key: "t2", d: "M30.8 19.2 Q31.6 18.8 32.4 19.2", strokeWidth: 1.2 }),
  ]),
);
