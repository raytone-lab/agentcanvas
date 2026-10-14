/**
 * 复古风's own icon set — line and mass together.
 *
 * A sixth vocabulary after lucide, codicon, pixelarticons, the Game plates and
 * the hand-drawn set, and it earns the place the same way: this style already
 * ships its own artwork for the chrome (`public/retro/new-chat.svg` and twenty
 * more, exported from the reference), and those drawings are not outlines. Each
 * one is a *filled* shape in a paper tint with an ink outline around it and line
 * detail on top — 线面结合. A lucide icon beside them is a wire frame next to a
 * printed block, which is what the left rail was offering.
 *
 * The conventions are read straight off that artwork rather than invented:
 *
 *   - an 18.86 grid (`viewBox="0 0 19 19"` here, near enough that the weights
 *     land identically),
 *   - outline stroke 1.38, round caps and joins,
 *   - the body filled with the paper tint the reference uses (`#E7E3DC`),
 *   - detail strokes at the same 1.38 weight, never thinner — the reference has
 *     one line weight and that is what makes the set read as one hand.
 *
 * Two departures, both the lesson from the earlier sets:
 *
 * `#3A332B` became `currentColor`. The exported files hardcode their ink, which
 * is why 复古风 cannot have a dark colourway without converting them to masks
 * first — this set does not inherit that problem.
 *
 * The fill is `--retro-icon-face`, defaulting to the palette's inset surface
 * rather than to the literal `#E7E3DC`. Same reason: the tint has to move with
 * the paper, or the mass reads as a stain on three of the four colourways.
 */

import { createElement, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type RetroIconProps = { size?: number | string; className?: string; [key: string]: unknown };

/** The paper tint the mass is filled with. */
const FACE = "var(--retro-icon-face, var(--surface-inset))";

/**
 * Shared frame. Stroke and weight live here because every icon in the set uses
 * the same two; a child only names them when it needs a second value.
 */
function retroIcon(children: ReactNode): LucideIcon {
  const Icon = ({ size = 16, className, ...rest }: RetroIconProps) =>
    createElement(
      "svg",
      {
        ...rest,
        className,
        width: size,
        height: size,
        viewBox: "0 0 19 19",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.38,
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

/* ---- Documents: read, stack, inspect, edit ---------------------------- */

/**
 * A sheet with a folded corner.
 *
 * Ported from `public/retro/file-status.svg` — same drawing, same fold,
 * `currentColor` and the token in place of its two baked hex values. It is the
 * first option of `tool.file_read` on purpose: that file was painted onto the
 * tool row from CSS, ignoring the reader's pick, and this is the drawing the
 * row keeps once the pick reaches it.
 *
 * **Refitted to this set's grid, and it was not before.** The first port kept
 * the source file's coordinates verbatim, which is a faithful port of a drawing
 * made for a different box: the body ran `M4.3 1.4 … v11.4 a1.4 1.4 0 0 1
 * -1.4 1.4`, so its bottom edge sat at y=19.2 inside a 19 viewBox, and the
 * centred 1.38 stroke put the outline's outer edge at y≈19.89. The bottom
 * 0.89 units were outside the viewport and simply never painted — reported as
 * "他底部没有展示全", and at a 14px render that is the whole bottom border
 * missing, not a sliver.
 *
 * It also made this mark ~19% bigger than every sibling here: 19.18 units of
 * stroked height against 16.18 for `RetroSheetRuledIcon` and about the same for
 * the other three. That is the other half of the same report ("有点大了") —
 * one glyph drawn at the wrong scale, not an icon size that needed tuning.
 *
 * So the envelope is now `RetroSheetRuledIcon`'s exactly — x 4.3→15, y 2.2→17,
 * the same fold at `M11.3 2.2v3.7H15`. The two are described as the same sheet
 * and they are now drawn as one, differing only in this one's rounded corners
 * and the other's ruled lines. `probe-retro-clipping.mjs` measures the whole set
 * against its viewBox; this was the only mark failing it.
 */
export const RetroSheetIcon = retroIcon([
  el("path", {
    key: "b",
    d: "M5.7 2.2h5.6l3.7 3.7v9.7a1.4 1.4 0 0 1-1.4 1.4H5.7a1.4 1.4 0 0 1-1.4-1.4V3.6a1.4 1.4 0 0 1 1.4-1.4Z",
    fill: FACE,
  }),
  el("path", { key: "f", d: "M11.3 2.2v3.7H15" }),
]);

/** The same sheet with two ruled lines — a page with something written on it. */
export const RetroSheetRuledIcon = retroIcon([
  el("path", { key: "b", d: "M4.3 2.2h7l3.7 3.7v11.1H4.3Z", fill: FACE }),
  el("path", { key: "f", d: "M11.3 2.2v3.7H15" }),
  el("path", { key: "l1", d: "M6.7 9.4h5.6" }),
  el("path", { key: "l2", d: "M6.7 12.5h3.7" }),
]);

/** Two sheets, the back one an open corner so the front reads as the top. */
export const RetroSheetsIcon = retroIcon([
  el("path", { key: "b", d: "M6.9 1.9h6.2l3.2 3.2v8.6H6.9Z", fill: FACE }),
  el("path", { key: "f", d: "M13.1 1.9v3.2h3.2" }),
  el("path", { key: "front", d: "M2.5 5.4h6.2l3.2 3.2v8.5H2.5Z", fill: FACE }),
  el("path", { key: "front-fold", d: "M8.7 5.4v3.2h3.2" }),
]);

/** A sheet under a lens. */
export const RetroSheetLensIcon = retroIcon([
  el("path", { key: "b", d: "M3.4 2.2h6.9l3.4 3.4v7.3H3.4Z", fill: FACE }),
  el("path", { key: "f", d: "M10.3 2.2v3.4h3.4" }),
  el("circle", { key: "g", cx: 11.6, cy: 11.9, r: 3.5, fill: FACE }),
  el("path", { key: "h", d: "M14.2 14.4 16.8 17" }),
]);

/** A sheet with a nib on it. */
export const RetroSheetPenIcon = retroIcon([
  el("path", { key: "b", d: "M3.4 2.2h6.5l3.2 3.2v5.1", fill: FACE }),
  el("path", { key: "s", d: "M3.4 2.2v14.6h4.8" }),
  el("path", { key: "nib", d: "M15.9 7.9 10.2 13.6l-2.4.6.6-2.4 5.7-5.7Z", fill: FACE }),
]);

/* ---- Search: the lens, and three other ways to look ------------------- */

/** The magnifier, its glass filled. */
export const RetroLensIcon = retroIcon([
  el("circle", { key: "g", cx: 8.1, cy: 8.1, r: 5.4, fill: FACE }),
  el("path", { key: "h", d: "M12 12 16.7 16.7" }),
]);

/** A card index: a filled box with a raised tab, the way a drawer of files reads. */
export const RetroIndexIcon = retroIcon([
  el("path", { key: "tab", d: "M6.2 2.3h6.6v2.2H6.2Z", fill: FACE }),
  el("path", { key: "b", d: "M2.3 4.5h14.4v12.2H2.3Z", fill: FACE }),
  el("path", { key: "l1", d: "M5.4 8.1h8.2" }),
  el("path", { key: "l2", d: "M5.4 11.4h5.5" }),
]);

/** A telescope on its stand — looking further than the lens does. */
export const RetroTelescopeIcon = retroIcon([
  el("path", { key: "tube", d: "M3.1 9.3 13.9 4.1l2.1 4.3-10.8 5.2Z", fill: FACE }),
  el("path", { key: "band", d: "M8.5 6.7 10.6 11" }),
  el("path", { key: "leg1", d: "M7.4 12.6 5.6 17" }),
  el("path", { key: "leg2", d: "M9.6 11.5 11.4 17" }),
]);

/** A signpost: the search that already knows where it is going. */
export const RetroSignpostIcon = retroIcon([
  el("path", { key: "b1", d: "M3.2 3.6h9.2l2.6 2.3-2.6 2.3H3.2Z", fill: FACE }),
  el("path", { key: "b2", d: "M5.8 10.2h8.1l2.4 2.1-2.4 2.1H5.8Z", fill: FACE }),
  el("path", { key: "post", d: "M4.6 3.6v13.2" }),
]);

/* ---- Edit: quill, inkpot, stamp, eraser ------------------------------- */

/** A quill with its barbs. */
export const RetroQuillIcon = retroIcon([
  el("path", { key: "f", d: "M16.4 2.4c.5 4.6-1.5 8.1-5.2 10.4-1.9 1.2-3.9 1.7-6 1.5.1-4 1.8-7 5-9 2-1.2 4.1-2 6.2-2.9Z", fill: FACE }),
  el("path", { key: "s", d: "M14.5 4.3 5.2 13.6" }),
  el("path", { key: "n", d: "M5.2 14.5 2.4 17" }),
]);

/** An inkpot with a nib resting in it. */
export const RetroInkpotIcon = retroIcon([
  el("path", { key: "pot", d: "M4.4 8.6h8.4v5.2c0 1.6-1.3 2.9-2.9 2.9H7.3c-1.6 0-2.9-1.3-2.9-2.9Z", fill: FACE }),
  el("path", { key: "lip", d: "M3.2 8.6h10.8" }),
  el("path", { key: "nib", d: "M16.3 2.5 11 7.8" }),
  el("path", { key: "tip", d: "M11 7.8l-.8 2 2-.8" }),
]);

/** A stamp: a filled plate under a handle. */
export const RetroStampIcon = retroIcon([
  el("path", { key: "plate", d: "M2.6 15.4h13.8v1.6H2.6Z", fill: FACE }),
  el("path", { key: "body", d: "M5.1 10.8h8.8v4.6H5.1Z", fill: FACE }),
  el("path", { key: "neck", d: "M7.7 6.4h3.6v4.4H7.7Z", fill: FACE }),
  el("path", { key: "knob", d: "M7.1 3.1h4.8v3.3H7.1Z", fill: FACE }),
]);

/** A pencil laid across an eraser block. */
export const RetroEraserIcon = retroIcon([
  el("path", { key: "block", d: "M7.4 11.2 12.7 5.9l3.4 3.4-5.3 5.3Z", fill: FACE }),
  el("path", { key: "band", d: "M10.4 8.3 13.8 11.7" }),
  el("path", { key: "rub", d: "M2.4 16.8h5.5" }),
]);

/* ---- Validate: seal, ledger, rosette, double tick -------------------- */

/** A wax seal with a tick struck through it. */
export const RetroSealIcon = retroIcon([
  el("circle", { key: "s", cx: 9.5, cy: 9.5, r: 6.6, fill: FACE }),
  el("path", { key: "t", d: "M6.3 9.7 8.7 12.2 13 6.9" }),
]);

/** A ledger page with two ticked lines. */
export const RetroLedgerIcon = retroIcon([
  el("path", { key: "b", d: "M3.4 2.3h12.2v14.4H3.4Z", fill: FACE }),
  el("path", { key: "rule", d: "M6.6 2.3v14.4" }),
  el("path", { key: "t1", d: "M8.4 7.2l1.5 1.6 2.8-3.2" }),
  el("path", { key: "t2", d: "M8.4 12.4l1.5 1.6 2.8-3.2" }),
]);

/** A rosette: the award a finished check earns. */
export const RetroRosetteIcon = retroIcon([
  el("circle", { key: "c", cx: 9.5, cy: 7.4, r: 4.8, fill: FACE }),
  el("path", { key: "t", d: "M7.3 7.6 9 9.3l2.9-3.4" }),
  el("path", { key: "r1", d: "M6.6 11.6 4.7 17l4.8-2.4 4.8 2.4-1.9-5.4", fill: FACE }),
]);

/** Two ticks, for "and always". */
export const RetroDoubleTickIcon = retroIcon([
  el("path", { key: "a", d: "M2.2 10.2 5 13 10.4 6.2" }),
  el("path", { key: "b", d: "M8.6 10.2 11.4 13 16.8 6.2" }),
]);

/* ---- Terminal and tools ---------------------------------------------- */

/** A terminal: a filled screen with a prompt. */
export const RetroTerminalIcon = retroIcon([
  el("path", { key: "b", d: "M2.3 3.4h14.4v12.2H2.3Z", fill: FACE }),
  el("path", { key: "bar", d: "M2.3 6.6h14.4" }),
  el("path", { key: "p", d: "M5.2 9.6 7 11.4l-1.8 1.8" }),
  el("path", { key: "c", d: "M9.4 13.2h4" }),
]);

/** A gear with a filled hub. */
export const RetroGearIcon = retroIcon([
  el("circle", { key: "r", cx: 9.5, cy: 9.5, r: 5, fill: FACE }),
  el("circle", { key: "h", cx: 9.5, cy: 9.5, r: 1.8 }),
  el("path", { key: "t1", d: "M9.5 4.5V2.2" }),
  el("path", { key: "t2", d: "M9.5 14.5v2.3" }),
  el("path", { key: "t3", d: "M4.5 9.5H2.2" }),
  el("path", { key: "t4", d: "M14.5 9.5h2.3" }),
]);

/** A spanner, drawn as one mass. */
export const RetroSpannerIcon = retroIcon([
  el("path", { key: "w", d: "M13.4 2.2a4.1 4.1 0 0 0-3.6 6.1l-7 7 1.9 1.9 7-7a4.1 4.1 0 1 0 1.7-8Z", fill: FACE }),
  el("path", { key: "j", d: "M11.2 4.2l2.4 2.4" }),
]);

/** A switchboard plug. */
export const RetroPlugIcon = retroIcon([
  el("path", { key: "b", d: "M6.4 6.6h6.2v4.4a3.1 3.1 0 0 1-6.2 0Z", fill: FACE }),
  el("path", { key: "p1", d: "M7.9 6.6V2.9" }),
  el("path", { key: "p2", d: "M11.1 6.6V2.9" }),
  el("path", { key: "c", d: "M9.5 14.1v2.7" }),
]);

/* ---- Speech and the conversation list -------------------------------- */

/**
 * A dot.
 *
 * The one mark in this set with no line in it, and it earns the exception by
 * being a list bullet rather than a picture of anything: it is what the
 * conversation rows wear, where a balloon in front of every row turned the
 * column into five drawings of the same object. 线面结合 is about the marks that
 * depict something; a bullet depicts nothing, so it is mass alone.
 *
 * Sized to sit on the text's optical line rather than to fill the 19 grid — at
 * a full-width disc it would read as a status light.
 */
export const RetroDotIcon = retroIcon([
  el("circle", { key: "d", cx: 9.5, cy: 9.5, r: 3.1, fill: "currentColor", stroke: "none" }),
]);

/** A speech balloon, filled, with a tail — the shape `new-chat.svg` uses. */
export const RetroBalloonIcon = retroIcon([
  el("path", { key: "b", d: "M3.1 3.1h13v9.4H8.2l-3.8 3.1v-3.1H3.1Z", fill: FACE }),
]);

/** The same balloon with two ruled lines in it. */
export const RetroBalloonLinesIcon = retroIcon([
  el("path", { key: "b", d: "M3.1 3.1h13v9.4H8.2l-3.8 3.1v-3.1H3.1Z", fill: FACE }),
  el("path", { key: "l1", d: "M6 6.3h7.2" }),
  el("path", { key: "l2", d: "M6 9.2h4.6" }),
]);

/** An envelope with its flap folded. */
export const RetroEnvelopeIcon = retroIcon([
  el("path", { key: "b", d: "M2.4 4.6h14.2v10H2.4Z", fill: FACE }),
  el("path", { key: "f", d: "M2.4 4.9 9.5 10.6 16.6 4.9" }),
]);

/** A luggage tag with its eyelet. */
export const RetroTagIcon = retroIcon([
  el("path", { key: "b", d: "M8.2 2.4h8.4v8.4l-6.7 6.4-7.5-7.4Z", fill: FACE }),
  el("circle", { key: "h", cx: 13, cy: 6, r: 1.3 }),
]);

/* ---- Thinking -------------------------------------------------------- */

/** A bulb with a filled glass. */
export const RetroBulbIcon = retroIcon([
  el("path", { key: "g", d: "M9.5 2.2a5.1 5.1 0 0 1 3 9.2v2.1h-6v-2.1a5.1 5.1 0 0 1 3-9.2Z", fill: FACE }),
  el("path", { key: "f", d: "M8 9.2 9.5 7.4 11 9.2" }),
  el("path", { key: "b", d: "M7.4 15.3h4.2" }),
  el("path", { key: "b2", d: "M8.1 17h2.8" }),
]);

/** A thought cloud with three dots. */
export const RetroCloudIcon = retroIcon([
  el("path", { key: "c", d: "M4.6 12.6a2.9 2.9 0 0 1 .4-5.7 4 4 0 0 1 7.5-1.6 3.2 3.2 0 0 1 1.5 6.2 30 30 0 0 1-9.4 1.1Z", fill: FACE }),
  el("circle", { key: "d1", cx: 7.2, cy: 9.4, r: 0.8, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "d2", cx: 9.5, cy: 9.4, r: 0.8, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "d3", cx: 11.8, cy: 9.4, r: 0.8, fill: "currentColor", stroke: "none" }),
]);

/** An hourglass, its sand a filled mass. */
export const RetroHourglassIcon = retroIcon([
  el("path", { key: "f", d: "M4.6 2.4h9.8L9.5 9.5l4.9 7.1H4.6L9.5 9.5Z", fill: FACE }),
  el("path", { key: "t", d: "M3.4 2.4h12.2" }),
  el("path", { key: "b", d: "M3.4 16.6h12.2" }),
]);

/** An abacus: counting, which is what a wait measured in tokens is. */
export const RetroAbacusIcon = retroIcon([
  el("path", { key: "b", d: "M2.6 2.9h13.8v13.2H2.6Z", fill: FACE }),
  el("path", { key: "r1", d: "M2.6 7.3h13.8" }),
  el("path", { key: "r2", d: "M2.6 11.7h13.8" }),
  el("circle", { key: "b1", cx: 6.4, cy: 5.1, r: 1.1, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "b2", cx: 11.2, cy: 9.5, r: 1.1, fill: "currentColor", stroke: "none" }),
  el("circle", { key: "b3", cx: 7.6, cy: 13.9, r: 1.1, fill: "currentColor", stroke: "none" }),
]);

/* ---- Outcomes and the rest of the vocabulary ------------------------- */

/** A cross in a filled disc. */
export const RetroCrossIcon = retroIcon([
  el("circle", { key: "c", cx: 9.5, cy: 9.5, r: 6.6, fill: FACE }),
  el("path", { key: "x", d: "M6.9 6.9 12.1 12.1M12.1 6.9 6.9 12.1" }),
]);

/** A bell, for the thing that wants answering. */
export const RetroBellIcon = retroIcon([
  el("path", { key: "b", d: "M9.5 2.6a4.8 4.8 0 0 1 4.8 4.8c0 3.4 1 4.9 1.6 5.6H3.1c.6-.7 1.6-2.2 1.6-5.6A4.8 4.8 0 0 1 9.5 2.6Z", fill: FACE }),
  el("path", { key: "c", d: "M7.7 15.3a1.9 1.9 0 0 0 3.6 0" }),
]);

/** An open folder. */
export const RetroFolderIcon = retroIcon([
  el("path", { key: "b", d: "M2.4 4.4h5.4l1.7 2.1h7.1v10.1H2.4Z", fill: FACE }),
  el("path", { key: "l", d: "M2.4 8.2h14.2" }),
]);

/**
 * An isometric cube, its top face the mass.
 *
 * Ported from `public/retro/attachment-cube.svg` the same way as the sheet: it
 * is the drawing the artifact card already wears, and the card was painting it
 * from CSS. One departure — the reference fills the top face with its own
 * `#D3CDC3` rather than the paper tint, a shade darker than every other mass
 * in the set, so here it is the token mixed toward the ink, which keeps the
 * relationship on all four colourways.
 */
export const RetroCubeIcon = retroIcon([
  el("path", {
    key: "top",
    d: "M9.5 9.5 16.7 5.3v8L9.5 17.5Z",
    fill: "var(--retro-icon-face-deep, color-mix(in srgb, currentColor 18%, var(--surface-inset)))",
    stroke: "none",
  }),
  el("path", { key: "b", d: "M9.5 1.3 16.7 5.3v8L9.5 17.5 2.3 13.3v-8Z", fill: "none" }),
  el("path", { key: "e", d: "M2.5 5.3 9.5 9.5 16.7 5.3M9.5 9.5v8" }),
]);

/** A framed picture. */
export const RetroFrameIcon = retroIcon([
  el("path", { key: "b", d: "M2.4 3.6h14.2v11.8H2.4Z", fill: FACE }),
  el("path", { key: "h", d: "M4.8 12.6 8 9.1l2.3 2.4 2.1-2.6 2.2 3.7Z", fill: "currentColor" }),
  el("circle", { key: "s", cx: 6.6, cy: 6.6, r: 1.2 }),
]);

/* ---- Confirmation: waiting, letting through, refusing, calling off ---- */
/*
 * The five 人机协作 galleries and the five 运行状态 ones had no drawings in this
 * set, so each rendered its one slot mark four times — reported as "有的功能的
 * icon 图标怎么都长一样". Drawn to the same grid, weight and fill as the rest;
 * each gallery's four are four different objects, and the ten galleries share
 * as few as they can, since they are read stacked one above the next.
 */

/** A pocket watch on its bow: waiting, and knowing for how long. */
export const RetroPocketWatchIcon = retroIcon([
  el("path", { key: "bow", d: "M8.1 3.4a1.4 1.4 0 0 1 2.8 0" }),
  el("path", { key: "crown", d: "M8.4 3.4h2.2v1.8H8.4Z", fill: FACE }),
  el("circle", { key: "case", cx: 9.5, cy: 10.9, r: 5.7, fill: FACE }),
  el("path", { key: "hands", d: "M9.5 8.1v2.8l2 1.3" }),
]);

/** A clipboard with its clip and an unsigned form on it. */
export const RetroClipboardIcon = retroIcon([
  el("path", { key: "b", d: "M3.9 3.6h11.2v13.2H3.9Z", fill: FACE }),
  el("path", { key: "clip", d: "M7 2.2h5v2.8H7Z", fill: FACE }),
  el("path", { key: "l1", d: "M6.6 9h5.8" }),
  el("path", { key: "l2", d: "M6.6 12.3h3.4" }),
]);

/** An admit-one ticket, notched and perforated: let through this once. */
export const RetroTicketIcon = retroIcon([
  el("path", { key: "b", d: "M2.4 5.4h14.2v2.6a1.5 1.5 0 0 0 0 3v2.6H2.4v-2.6a1.5 1.5 0 0 0 0-3Z", fill: FACE }),
  el("path", { key: "perf", d: "M12.4 5.9v7.2", strokeDasharray: "1.1 1.5" }),
  el("path", { key: "l1", d: "M5.2 8.3h4.4" }),
  el("path", { key: "l2", d: "M5.2 10.7h2.8" }),
]);

/** A key: its bow filled, its bit cut. */
export const RetroKeyIcon = retroIcon([
  el("circle", { key: "bow", cx: 6, cy: 9.5, r: 3.6, fill: FACE }),
  el("circle", { key: "hole", cx: 6, cy: 9.5, r: 1.1 }),
  el("path", { key: "shaft", d: "M9.6 9.5h7.2" }),
  el("path", { key: "bit", d: "M14.8 9.5v2.6M12.6 9.5v1.9" }),
]);

/** An APPROVED stamp's imprint, struck at a slant. */
export const RetroApprovedIcon = retroIcon([
  el("g", { key: "g", transform: "rotate(-9 9.5 9.5)" }, [
    el("path", { key: "b", d: "M2.8 5h13.4v9H2.8Z", fill: FACE }),
    el("path", { key: "in", d: "M4.6 6.8h9.8v5.4H4.6Z", strokeDasharray: "1.2 1.2" }),
    el("path", { key: "t", d: "M7 9.6l1.7 1.7 3.4-3.6" }),
  ]),
]);

/** A door standing open: come in whenever. */
export const RetroDoorOpenIcon = retroIcon([
  el("path", { key: "frame", d: "M4.6 16.8V2.4h9.8v14.4" }),
  el("path", { key: "floor", d: "M2.6 16.8h13.8" }),
  el("path", { key: "door", d: "M4.6 2.4 10.2 3.9v14.2l-5.6-1.3Z", fill: FACE }),
  el("circle", { key: "knob", cx: 8.6, cy: 10.6, r: 0.75, fill: "currentColor", stroke: "none" }),
]);

/** A padlock with its shackle swung open. */
export const RetroPadlockOpenIcon = retroIcon([
  el("path", { key: "s", d: "M6.6 8.6V5.4a2.9 2.9 0 0 1 5.6-1.1" }),
  el("rect", { key: "b", x: 4, y: 8.6, width: 11, height: 8.2, rx: 1.4, fill: FACE }),
  el("circle", { key: "k", cx: 9.5, cy: 12.1, r: 1, fill: "currentColor", stroke: "none" }),
  el("path", { key: "kt", d: "M9.5 12.6v1.7" }),
]);

/** A padlock, shut. */
export const RetroPadlockIcon = retroIcon([
  el("path", { key: "s", d: "M6.6 8.6V5.6a2.9 2.9 0 0 1 5.8 0v3" }),
  el("rect", { key: "b", x: 4, y: 8.6, width: 11, height: 8.2, rx: 1.4, fill: FACE }),
  el("circle", { key: "k", cx: 9.5, cy: 12.1, r: 1, fill: "currentColor", stroke: "none" }),
  el("path", { key: "kt", d: "M9.5 12.6v1.7" }),
]);

/** A level-crossing barrier, down across the way. */
export const RetroBarrierIcon = retroIcon([
  el("path", { key: "post", d: "M4.2 9v7.8" }),
  el("path", { key: "base", d: "M2.6 16.8h3.2" }),
  el("path", { key: "arm", d: "M2.6 5.8h14v3.2h-14Z", fill: FACE }),
  el("path", { key: "stripes", d: "M7.4 5.8 5.8 9M11 5.8 9.4 9M14.6 5.8 13 9" }),
]);

/** A panelled door, shut. */
export const RetroDoorShutIcon = retroIcon([
  el("path", { key: "b", d: "M4.6 2.4h9.8v14.4H4.6Z", fill: FACE }),
  el("path", { key: "floor", d: "M2.6 16.8h13.8" }),
  el("path", { key: "p1", d: "M6.8 4.6h5.4v3.8H6.8Z" }),
  el("circle", { key: "knob", cx: 12, cy: 11.4, r: 0.75, fill: "currentColor", stroke: "none" }),
]);

/** A hooked arrow: back to where it was. */
export const RetroReturnIcon = retroIcon([
  el("path", { key: "card", d: "M8.6 6.2h3.5a4.6 4.6 0 0 1 0 9.2H6.4", fill: "none" }),
  el("path", { key: "shaft", d: "M3.2 6.2h5.4" }),
  el("path", { key: "head", d: "M6.4 2.9 3.1 6.2l3.3 3.3" }),
]);

/** A ticket torn in two. */
export const RetroTornTicketIcon = retroIcon([
  el("path", { key: "l", d: "M2.4 5.4h6.6l-1 1.5 1 1.5-1 1.5 1 1.5-1 1.5 1 1.6H2.4v-2.6a1.5 1.5 0 0 0 0-3Z", fill: FACE }),
  el("g", { key: "r", transform: "rotate(9 13.6 9.5)" }, [
    el("path", { key: "rp", d: "M11 5.4h5.6v2.6a1.5 1.5 0 0 0 0 3v2.6H11l1-1.6-1-1.5 1-1.5-1-1.5 1-1.5Z", fill: FACE }),
  ]),
]);

/** A written sheet with a line struck through it. */
export const RetroStruckSheetIcon = retroIcon([
  el("path", { key: "b", d: "M4.3 2.2h7l3.7 3.7v11.1H4.3Z", fill: FACE }),
  el("path", { key: "f", d: "M11.3 2.2v3.7H15" }),
  el("path", { key: "l1", d: "M6.7 9.4h5.6" }),
  el("path", { key: "l2", d: "M6.7 12.5h3.7" }),
  el("path", { key: "x", d: "M2.6 15.8 16.4 4.6" }),
]);

/* ---- Runs: again, spent, ended, stopped, full ------------------------- */

/** Two arrows chasing round a filled hub: going round again. */
export const RetroCycleIcon = retroIcon([
  el("circle", { key: "hub", cx: 9.5, cy: 9.5, r: 2.3, fill: FACE }),
  el("path", { key: "a1", d: "M15.3 8.1A5.9 5.9 0 0 0 4.6 6.2" }),
  el("path", { key: "h1", d: "M4.2 2.9v3.6h3.6" }),
  el("path", { key: "a2", d: "M3.7 10.9a5.9 5.9 0 0 0 10.7 1.9" }),
  el("path", { key: "h2", d: "M14.8 16.1v-3.6h-3.6" }),
]);

/** A metronome, its arm mid-swing: the same beat, again. */
export const RetroMetronomeIcon = retroIcon([
  el("path", { key: "b", d: "M7.4 2.4h4.2l3.4 14.4H4Z", fill: FACE }),
  el("path", { key: "face", d: "M5.2 12.4h8.6" }),
  el("path", { key: "arm", d: "M9.5 12.4 13.8 4.4" }),
  el("circle", { key: "w", cx: 12.3, cy: 7.2, r: 1.2, fill: "currentColor", stroke: "none" }),
]);

/** The hourglass run out: all the sand below. */
export const RetroHourglassSpentIcon = retroIcon([
  el("path", { key: "g", d: "M4.6 2.4h9.8L9.5 9.5l4.9 7.1H4.6L9.5 9.5Z" }),
  el("path", { key: "sand", d: "M5.4 16.6 9.5 11.4l4.1 5.2Z", fill: FACE }),
  el("path", { key: "t", d: "M3.4 2.4h12.2" }),
  el("path", { key: "b", d: "M3.4 16.6h12.2" }),
]);

/** A candle burned to a stub and snuffed, its smoke still rising. */
export const RetroCandleIcon = retroIcon([
  el("path", { key: "dish", d: "M2.8 14.9h13.4c-.4 1.3-3 2-6.7 2s-6.3-.7-6.7-2Z", fill: FACE }),
  el("path", { key: "c", d: "M7.2 10.6h4.6v4.3H7.2Z", fill: FACE }),
  el("path", { key: "wick", d: "M9.5 10.6V9" }),
  el("path", { key: "smoke", d: "M9.5 7.2c-.9-.9-.2-1.8.5-2.5s.5-1.7-.3-2.3" }),
]);

/** A dial with its needle at empty. */
export const RetroGaugeIcon = retroIcon([
  el("path", { key: "d", d: "M2.4 13.6a7.1 7.1 0 0 1 14.2 0Z", fill: FACE }),
  el("path", { key: "ticks", d: "M9.5 7.7v1.3M13.7 9.4l-.9.9M5.3 9.4l.9.9" }),
  el("path", { key: "n", d: "M9.5 13.6 5.4 11.1" }),
  el("path", { key: "base", d: "M2.4 16.4h14.2" }),
]);

/** An octagonal stop sign with its bar. */
export const RetroStopSignIcon = retroIcon([
  el("path", { key: "o", d: "M6.9 2.9h5.2l3.9 3.9v5.4l-3.9 3.9H6.9L3 12.2V6.8Z", fill: FACE }),
  el("path", { key: "bar", d: "M6.3 9.5h6.4" }),
]);

/** A knife switch thrown to off. */
export const RetroLeverIcon = retroIcon([
  el("path", { key: "plate", d: "M2.6 13.6h13.8v3H2.6Z", fill: FACE }),
  el("path", { key: "arm", d: "M5.8 13.6 13.4 7.2" }),
  el("circle", { key: "knob", cx: 14.1, cy: 6.6, r: 1.9, fill: FACE }),
  el("circle", { key: "pivot", cx: 5.8, cy: 13.6, r: 1.1, fill: "currentColor", stroke: "none" }),
]);

/** A closed book with its ribbon down: the end. */
export const RetroClosedBookIcon = retroIcon([
  el("path", { key: "b", d: "M4.2 2.6h9.6a1.4 1.4 0 0 1 1.4 1.4v12.6H5.6A1.4 1.4 0 0 1 4.2 15.2Z", fill: FACE }),
  el("path", { key: "p", d: "M4.2 15.2a1.4 1.4 0 0 1 1.4-1.4h9.6" }),
  el("path", { key: "rib", d: "M9.2 2.6v5.2l1.5-1.2 1.5 1.2V2.6" }),
]);

/** Two bars on a filled disc: held, not ended. */
export const RetroPauseIcon = retroIcon([
  el("circle", { key: "c", cx: 9.5, cy: 9.5, r: 6.6, fill: FACE }),
  el("path", { key: "bars", d: "M7.8 6.7v5.6M11.2 6.7v5.6" }),
]);

/** Scissors: the thread cut midway. */
export const RetroScissorsIcon = retroIcon([
  el("path", { key: "b", d: "M6.9 11.9 14.2 2.9M12.1 11.9 4.8 2.9" }),
  el("circle", { key: "l", cx: 5.4, cy: 13.8, r: 2.4, fill: FACE }),
  el("circle", { key: "r", cx: 13.6, cy: 13.8, r: 2.4, fill: FACE }),
  el("circle", { key: "p", cx: 9.5, cy: 8.7, r: 0.7, fill: "currentColor", stroke: "none" }),
]);

/** A plug pulled from its socket, a spark in the gap. */
export const RetroUnplugIcon = retroIcon([
  el("path", { key: "plug", d: "M2.4 7.1h4.2v4.8H2.4Z", fill: FACE }),
  el("path", { key: "prongs", d: "M6.6 8.3h1.8M6.6 10.7h1.8" }),
  el("path", { key: "sock", d: "M12.4 5.9h4.2v7.2h-4.2Z", fill: FACE }),
  el("path", { key: "holes", d: "M14.5 8.3v.1M14.5 10.6v.1" }),
  el("path", { key: "spark", d: "M10.4 4.2l-.4-1.6M10.4 14.8l-.4 1.6" }),
]);

/** Three crates stacked to the top. */
export const RetroCratesIcon = retroIcon([
  el("path", { key: "bl", d: "M2.4 10.2h7.1v6.6H2.4Z", fill: FACE }),
  el("path", { key: "br", d: "M9.5 10.2h7.1v6.6H9.5Z", fill: FACE }),
  el("path", { key: "t", d: "M6 3.6h7.1v6.6H6Z", fill: FACE }),
  el("path", { key: "slats", d: "M2.4 13.5h7.1M9.5 13.5h7.1M6 6.9h7.1" }),
]);

/** A barrel, hooped. */
export const RetroBarrelIcon = retroIcon([
  el("path", { key: "b", d: "M5.2 2.4h8.6c1.3 2.2 1.9 4.6 1.9 7.1s-.6 4.9-1.9 7.1H5.2c-1.3-2.2-1.9-4.6-1.9-7.1s.6-4.9 1.9-7.1Z", fill: FACE }),
  el("path", { key: "h", d: "M3.7 6.3h11.6M3.7 12.7h11.6" }),
]);

/** A filing cabinet, every drawer in use. */
export const RetroCabinetIcon = retroIcon([
  el("path", { key: "b", d: "M4 2.4h11v14.4H4Z", fill: FACE }),
  el("path", { key: "d", d: "M4 7.2h11M4 12h11" }),
  el("path", { key: "h", d: "M8.4 4.8h2.2M8.4 9.6h2.2M8.4 14.4h2.2" }),
]);
