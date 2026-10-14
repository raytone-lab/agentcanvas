/**
 * 漫画风's own icon set, from the supplied sheet (20 marks, 5×4).
 *
 * A sixth icon vocabulary, after lucide, codicon, pixelarticons, the Game
 * plates and the Handdrawn pen set — and the reason is the same one the Game
 * set states: the style was drawing lucide, and lucide is a 1.4px outline with
 * no fill. This sheet is the opposite construction: a heavy black contour
 * around a *filled* shape, so overlaps read as objects in front of each other
 * (the two documents, the magnifier over the page) rather than as lines
 * crossing. You cannot get that by thickening a stroke.
 *
 * **SVG, not slices.** The Game sheet was cut into `public/game/icons/*.png`
 * because its marks are *painted* — bevelled gold, an inset gem, a cast shadow
 * — and none of that survives as a path. This sheet is line art, so drawing it
 * costs no export assets, scales to any size, and most importantly takes
 * `currentColor`: 漫画风 has light and dark palettes, and a black bitmap would
 * be a black hole on the dark one.
 *
 * Two deliberate departures from the sheet:
 *
 * The **halftone shadow** under every mark is not drawn. At 16px a 5px offset
 * band of 1px dots is four grey pixels — noise, not depth. The same idiom
 * exists at container scale in this product (see `--hd-shadow-dots` in the
 * Handdrawn branch), which is where it belongs.
 *
 * The **pale blue fills** become a tint of `currentColor` rather than a
 * literal. The sheet's highlight is `#eaf2fb` on white; as a literal it would
 * be invisible on the dark palette and would ignore the accent entirely.
 *
 * Both fills go through custom properties so a style can redirect them:
 * `--comic-icon-paper` for the body (the surface behind the contour) and
 * `--comic-icon-tint` for the highlight.
 */

import { createElement, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type ComicIconProps = { size?: number | string; className?: string; [key: string]: unknown };

/** The surface a contour is filled with, so overlaps occlude. */
const PAPER = "var(--comic-icon-paper, var(--surface-panel, #fff))";
/** The sheet's pale highlight, as a tint of the ink. */
const TINT = "var(--comic-icon-tint, color-mix(in srgb, currentColor 14%, transparent))";

/**
 * Shared frame. One grid (24) and one weight for the whole set — the sheet's
 * marks are all drawn with the same pen, and that consistency is most of what
 * makes them read as a set.
 *
 * The weight is 2.9 on a 24 grid, which is ~12% of the box. That is heavier
 * than any other set here and it is the point: the sheet's contour is about
 * that thick, and the first pass at 2.1 rendered as ordinary outline icons —
 * measured on the rail, where four comic marks sat looking like lucide. A
 * contour this heavy is what makes a filled shape read as a comic panel.
 */
function comicIcon(viewBox: string, children: ReactNode): LucideIcon {
  const Icon = ({ size = 16, className, ...rest }: ComicIconProps) =>
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
        strokeWidth: 2.9,
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
const G = "0 0 24 24";

/* ---- Row 1 -------------------------------------------------------------- */

/** Magnifier, with the highlight stroke the sheet puts inside the lens. */
export const ComicSearchIcon = comicIcon(G, [
  el("circle", { key: "l", cx: 10.2, cy: 10.2, r: 6.3, fill: PAPER }),
  el("path", { key: "h", d: "M14.9 14.9 L20.6 20.6", strokeWidth: 3.6 }),
  el("path", { key: "g", d: "M7.6 7.3 Q6.2 8.9 6.5 11", strokeWidth: 1.8 }),
]);

/** Two panels, the right one tinted — the layout / collapse mark. */
export const ComicPanelsIcon = comicIcon(G, [
  el("path", { key: "b", d: "M3.4 5.6 Q3.4 3.6 5.4 3.6 H18.6 Q20.6 3.6 20.6 5.6 V18.4 Q20.6 20.4 18.6 20.4 H5.4 Q3.4 20.4 3.4 18.4Z", fill: PAPER }),
  el("path", { key: "t", d: "M13 3.6 H18.6 Q20.6 3.6 20.6 5.6 V18.4 Q20.6 20.4 18.6 20.4 H13Z", fill: TINT }),
  el("path", { key: "d", d: "M13 3.8 V20.2" }),
]);

/** A speech bubble with a plus, and the sheet's three spark lines. */
export const ComicChatNewIcon = comicIcon(G, [
  el("path", { key: "b", d: "M3.4 7 Q3.4 4.4 6 4.4 H16.4 Q19 4.4 19 7 V13.6 Q19 16.2 16.4 16.2 H8.6 L5.2 19.6 Q4.3 20.5 4.3 19.1 V16 Q3.4 15.4 3.4 13.6Z", fill: PAPER }),
  el("path", { key: "v", d: "M11.2 8 V12.6", strokeWidth: 2.6 }),
  el("path", { key: "h", d: "M8.9 10.3 H13.5", strokeWidth: 2.6 }),
  el("path", { key: "s1", d: "M20.6 3.6 L22.4 2", strokeWidth: 2.1 }),
  el("path", { key: "s2", d: "M21.4 7 L23.4 6.6", strokeWidth: 2.1 }),
  el("path", { key: "s3", d: "M17.6 2.2 L17.2 0.6", strokeWidth: 2.1 }),
]);

/** A sheet of paper with a folded corner. */
export const ComicDocIcon = comicIcon(G, [
  el("path", { key: "b", d: "M5.6 3.4 Q5.6 2.4 6.6 2.4 H14 L18.8 7.2 V20.6 Q18.8 21.6 17.8 21.6 H6.6 Q5.6 21.6 5.6 20.6Z", fill: PAPER }),
  el("path", { key: "f", d: "M14 2.4 V6.4 Q14 7.2 14.8 7.2 H18.8" }),
  el("path", { key: "l1", d: "M8.8 12.4 H15.6", strokeWidth: 2.3 }),
  el("path", { key: "l2", d: "M8.8 16 H13.2", strokeWidth: 2.3 }),
]);

/** Two sheets, the back one tinted — copy. */
export const ComicDocsIcon = comicIcon(G, [
  el("path", { key: "back", d: "M9 2.9 Q9 2.1 9.8 2.1 H16.4 L21 6.7 V15.4 Q21 16.2 20.2 16.2 H9.8 Q9 16.2 9 15.4Z", fill: TINT }),
  el("path", { key: "front", d: "M3 8.6 Q3 7.8 3.8 7.8 H11.4 L16 12.4 V21.1 Q16 21.9 15.2 21.9 H3.8 Q3 21.9 3 21.1Z", fill: PAPER }),
  el("path", { key: "f", d: "M11.4 7.8 V11.6 Q11.4 12.4 12.2 12.4 H16" }),
  el("path", { key: "l1", d: "M6 16.2 H12.6", strokeWidth: 2.3 }),
  el("path", { key: "l2", d: "M6 19 H10.4", strokeWidth: 2.3 }),
]);

/* ---- Row 2 -------------------------------------------------------------- */

/** A pencil, tip tinted the way the sheet shades it. */
export const ComicPencilIcon = comicIcon(G, [
  el("path", { key: "b", d: "M15.6 3 L21 8.4 L8.8 20.6 L3 22 L4.4 16.2Z", fill: PAPER }),
  el("path", { key: "t", d: "M15.6 3 L21 8.4 L18.4 11 L13 5.6Z", fill: TINT }),
  el("path", { key: "n", d: "M4.4 16.2 L8.8 20.6", strokeWidth: 2.1 }),
]);

/** A thought cloud with three dots and its two trailing bubbles. */
export const ComicThoughtIcon = comicIcon(G, [
  el("path", { key: "c", d: "M5.4 11.6 Q3 8.6 6.2 6.8 Q6.8 3.6 10.4 4 Q12.6 2.2 15.2 4.4 Q18.8 4.2 19.2 7.8 Q21.4 10 18.8 12.2 Q16.4 14.6 11 14 Q7 14.6 5.4 11.6Z", fill: PAPER }),
  el("circle", { key: "d1", cx: 9.1, cy: 9.2, r: 1.15, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "d2", cx: 12.2, cy: 9.2, r: 1.15, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "d3", cx: 15.3, cy: 9.2, r: 1.15, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "b1", cx: 6.2, cy: 17.6, r: 1.6, fill: PAPER, strokeWidth: 2.3 }),
  el("circle", { key: "b2", cx: 3.4, cy: 20.6, r: 1, fill: PAPER, strokeWidth: 2.1 }),
]);

/** Two arrows chasing each other — retry, refresh, recover. */
export const ComicCycleIcon = comicIcon(G, [
  el("path", { key: "a1", d: "M4.4 12.6 Q4.2 6.8 9.8 5.4 Q14.2 4.4 17.2 7.8", strokeWidth: 3.2 }),
  el("path", { key: "h1", d: "M17.6 3.4 L19 8.4 L14 9Z", fill: PAPER, strokeWidth: 2.5 }),
  el("path", { key: "a2", d: "M19.6 11.4 Q19.8 17.2 14.2 18.6 Q9.8 19.6 6.8 16.2", strokeWidth: 3.2 }),
  el("path", { key: "h2", d: "M6.4 20.6 L5 15.6 L10 15Z", fill: PAPER, strokeWidth: 2.5 }),
]);

/** The disclosure chevron. */
export const ComicChevronIcon = comicIcon(G, [
  el("path", { key: "c", d: "M5 9 L12 16 L19 9", strokeWidth: 3.6 }),
]);

/** A page with a magnifier over it — search in a file. */
export const ComicDocSearchIcon = comicIcon(G, [
  el("path", { key: "b", d: "M4.6 3.4 Q4.6 2.4 5.6 2.4 H13 L17.8 7.2 V12", fill: PAPER }),
  el("path", { key: "s", d: "M4.6 3.4 V19.6 Q4.6 20.6 5.6 20.6 H11", fill: "none" }),
  el("path", { key: "f", d: "M13 2.4 V6.4 Q13 7.2 13.8 7.2 H17.8" }),
  el("circle", { key: "l", cx: 15.6, cy: 15.6, r: 4.4, fill: PAPER }),
  el("path", { key: "h", d: "M18.8 18.8 L21.6 21.6", strokeWidth: 3.3 }),
  el("path", { key: "g", d: "M13.8 13.8 Q12.9 14.9 13.1 16.2", strokeWidth: 1.7 }),
]);

/* ---- Row 3 -------------------------------------------------------------- */

/** A spanner: the tool call, the terminal, the build. */
export const ComicWrenchIcon = comicIcon(G, [
  el("path", { key: "w", d: "M16.2 2.6 Q20.6 3.4 21 8 Q21.4 12.2 16.8 12.8 Q15.2 13 13.8 12 L5.8 20 Q4.2 21.6 2.8 20.2 Q1.4 18.8 3 17.2 L11 9.2 Q10 7.8 10.2 6.2 Q10.8 1.8 16.2 2.6Z", fill: PAPER }),
  el("circle", { key: "h", cx: 15.6, cy: 7.8, r: 2.5, fill: TINT, strokeWidth: 2.5 }),
]);

/** A speech balloon with two lines — a message, a text block. */
export const ComicMessageIcon = comicIcon(G, [
  el("path", { key: "b", d: "M3.4 6.4 Q3.4 3.8 6 3.8 H18 Q20.6 3.8 20.6 6.4 V13.8 Q20.6 16.4 18 16.4 H9.4 L5.6 20.2 Q4.7 21.1 4.7 19.7 V16.2 Q3.4 15.6 3.4 13.8Z", fill: PAPER }),
  el("path", { key: "l1", d: "M7.4 8.6 H16.4", strokeWidth: 2.3 }),
  el("path", { key: "l2", d: "M7.4 12 H13", strokeWidth: 2.3 }),
]);

/** A plus. */
export const ComicPlusIcon = comicIcon(G, [
  el("path", { key: "v", d: "M12 4.4 V19.6", strokeWidth: 3.9 }),
  el("path", { key: "h", d: "M4.4 12 H19.6", strokeWidth: 3.9 }),
]);

/** A shield with a tick — approved, validated, allowed. */
export const ComicShieldIcon = comicIcon(G, [
  el("path", { key: "s", d: "M12 2.4 L20.4 5.6 V11.6 Q20.4 18.2 12 21.6 Q3.6 18.2 3.6 11.6 V5.6Z", fill: PAPER }),
  el("path", { key: "t", d: "M8.2 11.8 L11 14.6 L16 8.8", strokeWidth: 3.2 }),
]);

/** A four-point star with its smaller twin — done, generated, new. */
export const ComicSparkleIcon = comicIcon(G, [
  el("path", { key: "b", d: "M9.4 2 Q10.5 7.6 11.2 8.4 Q12 9.2 17.2 10.3 Q12 11.4 11.2 12.2 Q10.5 13 9.4 18.6 Q8.3 13 7.6 12.2 Q6.8 11.4 1.6 10.3 Q6.8 9.2 7.6 8.4 Q8.3 7.6 9.4 2Z", fill: PAPER }),
  el("path", { key: "s", d: "M18.4 13.4 Q18.9 16.2 19.2 16.5 Q19.5 16.8 22.2 17.3 Q19.5 17.8 19.2 18.1 Q18.9 18.4 18.4 21.2 Q17.9 18.4 17.6 18.1 Q17.3 17.8 14.6 17.3 Q17.3 16.8 17.6 16.5 Q17.9 16.2 18.4 13.4Z", fill: PAPER, strokeWidth: 2.5 }),
]);

/* ---- Row 4 -------------------------------------------------------------- */

/** A microphone on its stand. */
export const ComicMicIcon = comicIcon(G, [
  el("path", { key: "c", d: "M12 2.4 Q15.6 2.4 15.6 6.6 V11.2 Q15.6 15.4 12 15.4 Q8.4 15.4 8.4 11.2 V6.6 Q8.4 2.4 12 2.4Z", fill: TINT }),
  el("path", { key: "a", d: "M4.6 11.2 Q4.6 18.8 12 18.8 Q19.4 18.8 19.4 11.2" }),
  el("path", { key: "s", d: "M12 18.8 V21.6" }),
  el("path", { key: "f", d: "M8.2 21.8 H15.8", strokeWidth: 2.6 }),
]);

/** A paper plane. */
export const ComicSendIcon = comicIcon(G, [
  el("path", { key: "p", d: "M2.6 11.8 L21.4 3 L13.4 21.4 L10.8 13.6Z", fill: PAPER }),
  el("path", { key: "f", d: "M10.8 13.6 L21.4 3", strokeWidth: 2.3 }),
]);

/** An open folder — a resource, a workspace, a package. */
export const ComicFolderIcon = comicIcon(G, [
  el("path", { key: "b", d: "M2.8 6.6 Q2.8 4.8 4.6 4.8 H9.4 L11.8 7.6 H19.4 Q21.2 7.6 21.2 9.4 V11.4 H2.8Z", fill: PAPER }),
  el("path", { key: "f", d: "M2.8 11.4 H21.2 L19.2 19.4 Q19 20.2 18 20.2 H6 Q5 20.2 4.8 19.4Z", fill: TINT }),
]);

/** A bell, with the sheet's two ring lines. */
export const ComicBellIcon = comicIcon(G, [
  el("path", { key: "b", d: "M12 3.4 Q16.6 3.4 16.6 9.4 V13.8 Q16.6 15.8 18.2 16.8 H5.8 Q7.4 15.8 7.4 13.8 V9.4 Q7.4 3.4 12 3.4Z", fill: PAPER }),
  el("path", { key: "k", d: "M12 3.4 V1.6", strokeWidth: 2.6 }),
  el("path", { key: "c", d: "M9.8 19 Q12 21.2 14.2 19", strokeWidth: 2.6 }),
  el("path", { key: "r1", d: "M19 5.2 L21.4 3.4", strokeWidth: 2.1 }),
  el("path", { key: "r2", d: "M20.2 9 L22.8 8.4", strokeWidth: 2.1 }),
]);

/** A cog — settings, config, a running operation. */
export const ComicCogIcon = comicIcon(G, [
  el("circle", { key: "r", cx: 12, cy: 12, r: 6.2, fill: PAPER }),
  el("path", { key: "t1", d: "M12 5.8 V2.6", strokeWidth: 3.4 }),
  el("path", { key: "t2", d: "M16.4 7.6 L18.7 5.3", strokeWidth: 3.4 }),
  el("path", { key: "t3", d: "M18.2 12 H21.4", strokeWidth: 3.4 }),
  el("path", { key: "t4", d: "M16.4 16.4 L18.7 18.7", strokeWidth: 3.4 }),
  el("path", { key: "t5", d: "M12 18.2 V21.4", strokeWidth: 3.4 }),
  el("path", { key: "t6", d: "M7.6 16.4 L5.3 18.7", strokeWidth: 3.4 }),
  el("path", { key: "t7", d: "M5.8 12 H2.6", strokeWidth: 3.4 }),
  el("path", { key: "t8", d: "M7.6 7.6 L5.3 5.3", strokeWidth: 3.4 }),
  el("circle", { key: "c", cx: 12, cy: 12, r: 2.5, fill: TINT, strokeWidth: 2.5 }),
]);
