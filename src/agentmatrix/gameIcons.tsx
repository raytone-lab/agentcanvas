/**
 * The Game style's own icon set, from the design the style was rebuilt from.
 *
 * Why a fourth icon vocabulary, after lucide, codicon and pixelarticons: this
 * style's reference draws its own marks — a compass for a new quest, a scroll
 * for a saved one, a shield, crossed swords, a wrench — and they are a large
 * part of what makes it read as a quest log rather than as a dark theme. lucide
 * has no compass-with-a-needle and no crossed swords, and the ones it has
 * nearest (`compass`, `swords`) are drawn in a different idiom.
 *
 * Unlike codicon and pixelarticons these are *options*, not a per-slot
 * replacement: each is registered in `ICON_OPTIONS` beside the lucide
 * alternatives for its slot, so the reader picks one in the rail and the canvas
 * follows. That was asked for directly — "把这些图标对应的也放到架构或者组件里".
 *
 * Two things were changed transcribing them, both for the same reason:
 *
 * `#c9a84c` became `currentColor` everywhere. The design hardcodes its gold, and
 * this style has four colourways — the literal would stay gold in Moonlit's
 * silver hall and Scriptorium's rubric red. Same lesson as the corner ornaments,
 * which had to become gradients for it.
 *
 * Each keeps its own `viewBox` rather than being renormalised to 24. The
 * drawings are on 10, 12, 14, 16 and 22 grids and their stroke weights are tuned
 * to those grids; rescaling the coordinates would change the weights. `size`
 * sets width and height, and the viewBox scales to fit, so they all render at
 * whatever size a call site asks for.
 */

import { createElement, useId, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type GameIconProps = { size?: number | string; className?: string; [key: string]: unknown };

/**
 * Shared frame: the props a `LucideIcon` call site passes, on an SVG that keeps
 * its own grid. `stroke="currentColor"` and `fill="none"` are the defaults every
 * one of these relies on, so a child only says so when it differs.
 */
function gameIcon(viewBox: string, strokeWidth: number, children: ReactNode): LucideIcon {
  const Icon = ({ size = 16, className, ...rest }: GameIconProps) =>
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
        strokeWidth,
        xmlns: "http://www.w3.org/2000/svg",
        "aria-hidden": true,
        focusable: false,
      },
      children,
    );
  return Icon as unknown as LucideIcon;
}

const el = createElement;

/** A compass with a lit needle — the design's mark for starting something. */
export const GameCompassIcon = gameIcon("0 0 16 16", 1.5, [
  el("circle", { key: "c", cx: 8, cy: 8, r: 6.5 }),
  el("polygon", { key: "n", points: "8,3 9.5,8 8,7 6.5,8", fill: "currentColor", stroke: "none" }),
  // The south half of the needle, dimmed rather than a second colour: the
  // design used a literal gold here, which would not follow the colourway.
  el("polygon", {
    key: "s",
    points: "8,13 6.5,8 8,9 9.5,8",
    fill: "currentColor",
    stroke: "none",
    opacity: 0.45,
  }),
  el("path", { key: "t", d: "M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15" }),
]);

/** A rolled scroll with its spindle — a saved thing. */
export const GameScrollIcon = gameIcon("0 0 16 16", 1.4, [
  el("rect", { key: "b", x: 3, y: 3, width: 10, height: 11, rx: 2 }),
  el("rect", {
    key: "s",
    x: 1.5,
    y: 2,
    width: 3,
    height: 12,
    rx: 1.5,
    fill: "currentColor",
    stroke: "none",
    opacity: 0.3,
  }),
  el("path", { key: "l", d: "M6 6h5M6 8.5h5M6 11h3" }),
]);

/** A shield with a tick: something checked and found sound. */
export const GameShieldIcon = gameIcon("0 0 16 16", 1.4, [
  el("path", { key: "s", d: "M8 1.5L2 4v4c0 3.5 2.5 6 6 7 3.5-1 6-3.5 6-7V4L8 1.5z" }),
  el("path", { key: "t", d: "M5.5 8L7 9.5 10.5 6", strokeWidth: 1.2, strokeLinecap: "round" }),
]);

/** Crossed swords — the style's mark for a fix or a fight. */
export const GameCrossedSwordsIcon = gameIcon("0 0 16 16", 1.4, [
  el("path", { key: "a", d: "M2 2l12 12M14 2L2 14", strokeLinecap: "round" }),
  el("path", { key: "h", d: "M2 4l2-2M12 14l2-2" }),
  el("circle", { key: "p1", cx: 4.5, cy: 4.5, r: 1, fill: "currentColor", stroke: "none", opacity: 0.5 }),
  el("circle", { key: "p2", cx: 11.5, cy: 11.5, r: 1, fill: "currentColor", stroke: "none", opacity: 0.5 }),
]);

/** A ticked box: a task that is done. */
export const GameTaskIcon = gameIcon("0 0 16 16", 1.4, [
  el("rect", { key: "b", x: 2, y: 2, width: 12, height: 12, rx: 1.5 }),
  el("path", { key: "t", d: "M5 8l2 2 4-4", strokeLinecap: "round", strokeLinejoin: "round" }),
]);

/** A leaf of vellum with a marked corner. */
export const GameFileIcon = gameIcon("0 0 22 22", 1.4, [
  el("rect", { key: "b", x: 3, y: 2, width: 14, height: 18, rx: 1.5 }),
  el("path", { key: "f", d: "M13 2v5h4", strokeLinecap: "round" }),
  el("path", { key: "l", d: "M6 11h10M6 14h7" }),
]);

/** The same leaf, being read: a folded corner and two short lines. */
export const GameReadingFileIcon = gameIcon("0 0 14 14", 1.3, [
  el("rect", { key: "b", x: 2, y: 1.5, width: 9, height: 11, rx: 1 }),
  el("path", { key: "f", d: "M9 1.5v3.5h3", strokeLinecap: "round" }),
  el("path", { key: "l", d: "M4 7h4M4 9h3", opacity: 0.7 }),
]);

/** A note with an illuminated initial — the block in the margin. */
export const GameNoteIcon = gameIcon("0 0 14 14", 1.3, [
  el("rect", { key: "b", x: 2, y: 1.5, width: 10, height: 11, rx: 1 }),
  el("path", { key: "l", d: "M4.5 5h5M4.5 7.5h5M4.5 10h2.5" }),
  el("rect", {
    key: "i",
    x: 3,
    y: 2,
    width: 2,
    height: 3,
    fill: "currentColor",
    stroke: "none",
    opacity: 0.4,
  }),
]);

/** A quill stroke: something being altered. */
export const GameEditIcon = gameIcon("0 0 14 14", 1.4, [
  el("path", { key: "p", d: "M9.5 2.5l2 2L4 12H2v-2l7.5-7.5z" }),
]);

/** A lens with its pupil — looking closely, as opposed to searching. */
export const GameInspectIcon = gameIcon("0 0 14 14", 1.3, [
  el("circle", { key: "o", cx: 6, cy: 6, r: 4 }),
  el("circle", { key: "p", cx: 6, cy: 6, r: 1.5, fill: "currentColor", stroke: "none", opacity: 0.5 }),
  el("path", { key: "h", d: "M9 9l3.5 3.5", strokeLinecap: "round" }),
]);

/** A plain glass: searching. */
export const GameSearchIcon = gameIcon("0 0 16 16", 1.5, [
  el("circle", { key: "o", cx: 7, cy: 7, r: 4.5 }),
  el("path", { key: "h", d: "M10.5 10.5L14 14" }),
]);

/** A wrench with its pin: the repair. */
export const GameWrenchIcon = gameIcon("0 0 14 14", 1.3, [
  el("path", { key: "w", d: "M9 2a3 3 0 0 1 0 6L4 13l-3-3 5-5a3 3 0 0 1 3-3z" }),
  el("circle", { key: "p", cx: 3.5, cy: 10.5, r: 0.8, fill: "currentColor", stroke: "none" }),
]);

/* ==========================================================================
   The painted set.
   --------------------------------------------------------------------------
   Twenty-four icons, supplied as one transparent sheet and sliced into
   `public/game/icons/`. They replace the whole style's iconography — the
   mapping is in `gameSlots.ts`.

   This is the second attempt at "make the Game icons not look like the native
   ones". The first drew thirty-nine new *vector* glyphs: fantasy subjects
   (hourglass, portcullis, warded circle) on the same 16 grid at the same 1.4
   stroke as everything else in the product. They were the right objects and
   still the wrong answer, because what separates this art from a line icon is
   not the subject — it is the painting: bevelled gold, a blue gem inset in
   every piece, cast shadow, worn edges. A one-colour stroke cannot have those,
   so the set read as "line icons of game things".

   Two consequences worth stating plainly, both accepted:

   The art does not follow the colourway. Every other icon set in this product
   is `currentColor` and recolours with the palette; these are painted gold and
   blue in the file. The style's four colourways change its parchment, ink and
   glow, and its icons now stay gold — the same trade the two campfire
   portraits above already make, for the same reason (you cannot recolour a
   painting by setting `color`).

   They are raster. 96px squares for a 16–22px slot: enough for the canvas's
   zoom without carrying 24 vectors' worth of path data. 428KB for the set,
   which is why they are `public/` assets listed in `SCAFFOLD_PUBLIC_ASSETS`
   rather than inlined data URIs.
   ========================================================================== */

/**
 * One painted icon, wearing the `LucideIcon` contract so every call site that
 * already asks for `size` keeps working.
 *
 * Takes `{ src }` rather than a file stem, and the shape matters: the export
 * guard finds packed assets by scanning source for absolute-path string
 * literals next to an `src` key (`exportContract.test.ts`). Built from a
 * template instead, the path never appears in the source and all 24 files read
 * as "packed but never referenced". `portraitIcon` above takes the same shape
 * for the same reason.
 *
 * Which also means: a literal written *inside* a comment counts. An earlier
 * draft of this note quoted the pattern with an ellipsis for the path, and the
 * guard dutifully reported a missing asset called "…".
 *
 * Only `size`, `className` and the data attributes are passed through. The rest
 * of `LucideProps` — `strokeWidth`, `fill`, `absoluteStrokeWidth` — describes a
 * stroked SVG, and React would put them on an `<img>` as unknown attributes.
 */
function gameArtIcon({ src }: { src: string }): LucideIcon {
  const Art = ({
    size = 16,
    className,
    ...rest
  }: { size?: number | string; className?: string; [key: string]: unknown }) =>
    createElement("img", {
      src,
      alt: "",
      "aria-hidden": true,
      draggable: false,
      width: size,
      height: size,
      className: ["game-art-icon", className].filter(Boolean).join(" "),
      "data-icon-slot": rest["data-icon-slot"],
      "data-lucide-name": rest["data-lucide-name"],
    });
  return Art as unknown as LucideIcon;
}

/* The sheet, left to right and top to bottom. Names say what the thing *is*,
   not what it is used for — `gameSlots.ts` decides that, and one icon serves
   several slots. */
export const GameArtChatNew = gameArtIcon({ src: "/game/icons/chat-new.png" });
export const GameArtLens = gameArtIcon({ src: "/game/icons/lens.png" });
export const GameArtPortrait = gameArtIcon({ src: "/game/icons/portrait.png" });
export const GameArtCharter = gameArtIcon({ src: "/game/icons/charter.png" });
export const GameArtPack = gameArtIcon({ src: "/game/icons/pack.png" });
export const GameArtCompass = gameArtIcon({ src: "/game/icons/compass.png" });
export const GameArtCrest = gameArtIcon({ src: "/game/icons/crest.png" });
export const GameArtSwords = gameArtIcon({ src: "/game/icons/swords.png" });
export const GameArtChest = gameArtIcon({ src: "/game/icons/chest.png" });
export const GameArtPotion = gameArtIcon({ src: "/game/icons/potion.png" });
export const GameArtCog = gameArtIcon({ src: "/game/icons/cog.png" });
export const GameArtMarket = gameArtIcon({ src: "/game/icons/market.png" });
export const GameArtScroll = gameArtIcon({ src: "/game/icons/scroll.png" });
export const GameArtFolder = gameArtIcon({ src: "/game/icons/folder.png" });
export const GameArtChronicle = gameArtIcon({ src: "/game/icons/chronicle.png" });
export const GameArtPages = gameArtIcon({ src: "/game/icons/pages.png" });
export const GameArtQuill = gameArtIcon({ src: "/game/icons/quill.png" });
export const GameArtCycle = gameArtIcon({ src: "/game/icons/cycle.png" });
export const GameArtMic = gameArtIcon({ src: "/game/icons/mic.png" });
export const GameArtPlane = gameArtIcon({ src: "/game/icons/plane.png" });
export const GameArtBell = gameArtIcon({ src: "/game/icons/bell.png" });
export const GameArtFellowship = gameArtIcon({ src: "/game/icons/fellowship.png" });
export const GameArtTrophy = gameArtIcon({ src: "/game/icons/trophy.png" });
export const GameArtKeep = gameArtIcon({ src: "/game/icons/keep.png" });
/* Supplied separately from the sheet: the two-pane plaque, for the column
   toggles. Those were the last two stock outlines left on the canvas — they
   had been left as deliberate gaps on the grounds that "a column you show and
   hide" is not a thing in this world, and the answer was simply a better
   drawing of the thing: a scroll with two panels ruled on it. */
export const GameArtPanels = gameArtIcon({ src: "/game/icons/panels.png" });

/* ==========================================================================
   The painted set, continued — in vector.
   --------------------------------------------------------------------------
   Ten galleries had no painted marks of their own — 人机协作's five replies
   and 运行状态's five outcomes — so each drew its one slot icon on all four
   tiles ("都长一样"). The sheet the PNGs came from has nothing more to slice,
   so these are drawn, and drawn in the sheet's language rather than as line
   icons, which is the trade the note above already made once: bevelled gold
   (light at the crown, burnt at the foot), a dark rim, a blue gem with a white
   facet, steel where steel would be. Fixed colours, like the PNGs — a painting
   does not take `color` — so they sit beside the art without a seam.

   Each instance mints its own gradient ids. A shared id resolves to the first
   element in the document carrying it, and a gallery's hidden tiles are
   `display: none`, whose gradients do not paint for anyone referring to them.
   ========================================================================== */

type Paint = { gold: string; gem: string; steel: string; wood: string; bone: string; stone: string; navy: string; parch: string };

function gamePaintedIcon(draw: (p: Paint) => ReactNode): LucideIcon {
  const Icon = ({
    size = 16,
    className,
    ...rest
  }: { size?: number | string; className?: string; [key: string]: unknown }) => {
    const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const p: Paint = {
      gold: `url(#${id}g)`,
      gem: `url(#${id}m)`,
      steel: `url(#${id}s)`,
      wood: `url(#${id}w)`,
      bone: `url(#${id}b)`,
      stone: `url(#${id}t)`,
      navy: `url(#${id}n)`,
      parch: `url(#${id}p)`,
    };
    const stops = (key: string, colors: [string, string][]) =>
      el(
        "linearGradient",
        { key, id: `${id}${key}`, x1: 0, y1: 0, x2: 0, y2: 1 },
        colors.map(([offset, color]) => el("stop", { key: offset, offset, stopColor: color })),
      );
    return el(
      "svg",
      {
        className: ["game-painted-icon", className].filter(Boolean).join(" "),
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "#3A2410",
        strokeWidth: 1.1,
        strokeLinejoin: "round",
        strokeLinecap: "round",
        xmlns: "http://www.w3.org/2000/svg",
        "aria-hidden": true,
        focusable: false,
        "data-icon-slot": rest["data-icon-slot"],
        "data-lucide-name": rest["data-lucide-name"],
      },
      [
        el("defs", { key: "d" }, [
          stops("g", [["0", "#FFEDB0"], ["0.45", "#E8B850"], ["1", "#94621C"]]),
          stops("m", [["0", "#A8E0FF"], ["0.5", "#2D7FEA"], ["1", "#0C3A93"]]),
          stops("s", [["0", "#FAFBFC"], ["0.55", "#C3C9D0"], ["1", "#7D858E"]]),
          stops("w", [["0", "#A9713A"], ["1", "#5B3416"]]),
          stops("b", [["0", "#FBF4E4"], ["1", "#C2AE8C"]]),
          stops("t", [["0", "#A9AEB5"], ["1", "#5C6168"]]),
          stops("n", [["0", "#2A3B63"], ["1", "#121B33"]]),
          stops("p", [["0", "#FBEBC2"], ["1", "#D8B26A"]]),
        ]),
        draw(p),
      ],
    );
  };
  return Icon as unknown as LucideIcon;
}

/** The sheet's gem: a faceted diamond with a white glint. */
function gem(p: Paint, cx: number, cy: number, r: number, key = "gem") {
  return el("g", { key }, [
    el("path", {
      key: "d",
      d: `M${cx} ${cy - r}L${cx + r * 0.78} ${cy}L${cx} ${cy + r}L${cx - r * 0.78} ${cy}Z`,
      fill: p.gem,
      stroke: "#0A2456",
      strokeWidth: 0.7,
    }),
    el("path", {
      key: "h",
      d: `M${cx} ${cy - r * 0.62}L${cx - r * 0.4} ${cy - r * 0.02}L${cx} ${cy - r * 0.1}Z`,
      fill: "#FFFFFF",
      stroke: "none",
      opacity: 0.85,
    }),
  ]);
}

/* ---- Waiting ----------------------------------------------------------- */

/** An hourglass in a gold frame, sand still running. */
export const GamePaintHourglass = gamePaintedIcon((p) => [
  el("path", { key: "glass", d: "M7.4 5h9.2c0 4-3.4 5.4-3.4 7s3.4 3 3.4 7H7.4c0-4 3.4-5.4 3.4-7S7.4 9 7.4 5z", fill: "#D7E8F2", fillOpacity: 0.55 }),
  el("path", { key: "top", d: "M8.9 6.6h6.2c-.5 1.8-2.1 2.9-3.1 3.8-1-.9-2.6-2-3.1-3.8z", fill: p.gold, strokeWidth: 0.6 }),
  el("path", { key: "heap", d: "M9.2 18.3c.9-1.4 1.8-2.1 2.8-2.1s1.9.7 2.8 2.1z", fill: p.gold, strokeWidth: 0.6 }),
  el("rect", { key: "pl", x: 5.2, y: 4.6, width: 1.6, height: 14.8, rx: 0.6, fill: p.gold }),
  el("rect", { key: "pr", x: 17.2, y: 4.6, width: 1.6, height: 14.8, rx: 0.6, fill: p.gold }),
  el("rect", { key: "cap", x: 4.2, y: 2.8, width: 15.6, height: 2.4, rx: 1, fill: p.gold }),
  el("rect", { key: "base", x: 4.2, y: 18.8, width: 15.6, height: 2.4, rx: 1, fill: p.gold }),
  gem(p, 12, 4, 1.5),
]);

/** The same glass with the last grain fallen. */
export const GamePaintHourglassSpent = gamePaintedIcon((p) => [
  el("path", { key: "glass", d: "M7.4 5h9.2c0 4-3.4 5.4-3.4 7s3.4 3 3.4 7H7.4c0-4 3.4-5.4 3.4-7S7.4 9 7.4 5z", fill: "#B9C2C9", fillOpacity: 0.45 }),
  el("path", { key: "heap", d: "M8 18.6c.6-2.6 2.3-4.4 4-4.4s3.4 1.8 4 4.4z", fill: p.gold, strokeWidth: 0.6 }),
  el("rect", { key: "pl", x: 5.2, y: 4.6, width: 1.6, height: 14.8, rx: 0.6, fill: p.gold }),
  el("rect", { key: "pr", x: 17.2, y: 4.6, width: 1.6, height: 14.8, rx: 0.6, fill: p.gold }),
  el("rect", { key: "cap", x: 4.2, y: 2.8, width: 15.6, height: 2.4, rx: 1, fill: p.gold }),
  el("rect", { key: "base", x: 4.2, y: 18.8, width: 15.6, height: 2.4, rx: 1, fill: p.gold }),
  el("path", { key: "crack", d: "M9.6 7.2l1.3 1.4-.8 1.2", stroke: "#F4F7FA", strokeWidth: 0.8 }),
]);

/** A letter under a red wax seal: sent, and waiting for its answer. */
export const GamePaintSealedLetter = gamePaintedIcon((p) => [
  el("rect", { key: "b", x: 2.6, y: 5.6, width: 18.8, height: 13, rx: 1.4, fill: p.parch }),
  el("path", { key: "f", d: "M3 6.2l9 6.4 9-6.4" }),
  el("circle", { key: "seal", cx: 12, cy: 13.4, r: 3.6, fill: "#B42A2F", stroke: "#4A0E10" }),
  el("circle", { key: "ring", cx: 12, cy: 13.4, r: 2.2, stroke: "#E26A62", strokeWidth: 0.7 }),
  gem(p, 12, 13.4, 1.2),
]);

/* ---- Letting through --------------------------------------------------- */

/** A gold key with a gem in its bow. */
export const GamePaintKey = gamePaintedIcon((p) => [
  el("path", { key: "shaft", d: "M10.4 10.6h11v3.4h-2v3.2h-3v-3.2h-1.6v2.2h-2.8V14h-1.6z", fill: p.gold }),
  el("circle", { key: "bow", cx: 7, cy: 12.3, r: 5.4, fill: p.gold }),
  el("circle", { key: "hole", cx: 7, cy: 12.3, r: 2.6, fill: "#2A1A0C", strokeWidth: 0.6 }),
  gem(p, 7, 12.3, 1.9),
  el("path", { key: "shine", d: "M3.7 9.6a4.2 4.2 0 0 1 2.6-1.9", stroke: "#FFF6D2", strokeWidth: 0.9 }),
]);

/** A minted coin with a gem at its heart — paid, once. */
export const GamePaintCoin = gamePaintedIcon((p) => [
  el("circle", { key: "c", cx: 12, cy: 12, r: 8.6, fill: p.gold }),
  el("circle", { key: "r", cx: 12, cy: 12, r: 6.4, stroke: "#7A4F16", strokeWidth: 0.8 }),
  el("path", { key: "dots", d: "M12 4.4v.1M12 19.5v.1M4.4 12h.1M19.5 12h.1", stroke: "#7A4F16", strokeWidth: 1.2 }),
  gem(p, 12, 12, 3.4),
]);

/** A potion — one draught, then gone. */
export const GamePaintPotionOnce = gamePaintedIcon((p) => [
  el("path", { key: "flask", d: "M9.6 3.6h4.8v4.2l4 5.6c1.6 2.3 0 5.6-2.8 5.6H8.4c-2.8 0-4.4-3.3-2.8-5.6l4-5.6z", fill: "#D7E8F2", fillOpacity: 0.5 }),
  el("path", { key: "liquid", d: "M6.9 13.6h10.2c1 1.9-.2 4-2 4H8.9c-1.8 0-3-2.1-2-4z", fill: p.gem, stroke: "#0A2456", strokeWidth: 0.6 }),
  el("rect", { key: "cork", x: 9, y: 2.2, width: 6, height: 2.6, rx: 0.8, fill: p.wood }),
  el("rect", { key: "neck", x: 8.6, y: 7, width: 6.8, height: 1.6, rx: 0.6, fill: p.gold }),
  el("path", { key: "glint", d: "M8.6 12.4l1.4-1.8", stroke: "#FFFFFF", strokeWidth: 0.9, opacity: 0.8 }),
]);

/** A padlock with its shackle swung open. */
export const GamePaintPadlockOpen = gamePaintedIcon((p) => [
  el("path", { key: "sh", d: "M7.6 10.6V7.4a4.4 4.4 0 0 1 8.4-1.8", stroke: "#3A2410", strokeWidth: 3.6 }),
  el("path", { key: "sh2", d: "M7.6 10.6V7.4a4.4 4.4 0 0 1 8.4-1.8", stroke: p.steel, strokeWidth: 2 }),
  el("rect", { key: "b", x: 4.6, y: 10.4, width: 14.8, height: 10.6, rx: 2.2, fill: p.gold }),
  el("path", { key: "band", d: "M5 13.2h14", stroke: "#7A4F16", strokeWidth: 0.7 }),
  gem(p, 12, 16.4, 2.4),
]);

/** A padlock, shut. */
export const GamePaintPadlock = gamePaintedIcon((p) => [
  el("path", { key: "sh", d: "M7.6 10.6V7.6a4.4 4.4 0 0 1 8.8 0v3", stroke: "#3A2410", strokeWidth: 3.6 }),
  el("path", { key: "sh2", d: "M7.6 10.6V7.6a4.4 4.4 0 0 1 8.8 0v3", stroke: p.steel, strokeWidth: 2 }),
  el("rect", { key: "b", x: 4.6, y: 10.4, width: 14.8, height: 10.6, rx: 2.2, fill: p.gold }),
  el("path", { key: "band", d: "M5 13.2h14", stroke: "#7A4F16", strokeWidth: 0.7 }),
  gem(p, 12, 16.4, 2.4),
]);

/** A gold band with its stone: bound for good. */
export const GamePaintRing = gamePaintedIcon((p) => [
  el("circle", { key: "o", cx: 12, cy: 14.2, r: 6.8, stroke: "#3A2410", strokeWidth: 4.4 }),
  el("circle", { key: "i", cx: 12, cy: 14.2, r: 6.8, stroke: p.gold, strokeWidth: 2.6 }),
  el("path", { key: "set", d: "M8.6 6.6h6.8l-1.2 2.6H9.8z", fill: p.gold }),
  gem(p, 12, 5.2, 3),
]);

/* ---- Refusing ---------------------------------------------------------- */

/** A crest shield struck through: not here. */
export const GamePaintCrossShield = gamePaintedIcon((p) => [
  el("path", { key: "s", d: "M12 2.4l8 2.8v6c0 5-3.4 8.6-8 10.4-4.6-1.8-8-5.4-8-10.4v-6z", fill: p.gold }),
  el("path", { key: "f", d: "M12 4.6l5.8 2v4.6c0 3.8-2.4 6.6-5.8 8.1-3.4-1.5-5.8-4.3-5.8-8.1V6.6z", fill: p.navy, strokeWidth: 0.7 }),
  el("path", { key: "x", d: "M8.8 8.4l6.4 6.8M15.2 8.4l-6.4 6.8", stroke: "#3A2410", strokeWidth: 3 }),
  el("path", { key: "x2", d: "M8.8 8.4l6.4 6.8M15.2 8.4l-6.4 6.8", stroke: "#E4553F", strokeWidth: 1.6 }),
]);

/** A portcullis let down across the arch. */
export const GamePaintPortcullis = gamePaintedIcon((p) => [
  el("path", { key: "arch", d: "M3 21V9.6a9 7 0 0 1 18 0V21h-3.2V10a5.8 4.6 0 0 0-11.6 0v11z", fill: p.stone }),
  el("path", { key: "bars", d: "M8.4 7.6v13.4M12 6.2v14.8M15.6 7.6v13.4M6.4 11h11.2M6.4 15h11.2M6.4 19h11.2", stroke: "#3A2410", strokeWidth: 2.2 }),
  el("path", { key: "bars2", d: "M8.4 7.6v13.4M12 6.2v14.8M15.6 7.6v13.4M6.4 11h11.2M6.4 15h11.2M6.4 19h11.2", stroke: p.gold, strokeWidth: 1 }),
  gem(p, 12, 4.4, 1.5),
]);

/* ---- Calling off ------------------------------------------------------- */

/** A gold arrow bent back on itself. */
export const GamePaintReturn = gamePaintedIcon((p) => [
  el("path", { key: "a", d: "M9.6 4.2L3.2 9.4l6.4 5.2v-3.2h4.6a3.6 3.6 0 0 1 0 7.2H9.8v3.2h4.4a6.8 6.8 0 0 0 0-13.6H9.6z", fill: p.gold }),
  gem(p, 15.4, 14.8, 1.6),
]);

/** A charter torn in two. */
export const GamePaintTornScroll = gamePaintedIcon((p) => [
  el("path", { key: "l", d: "M3.4 5.2h7.4l-1.2 2.4 1.4 2.2-1.4 2.4 1.4 2.4-1.4 2.2 1.2 2.4H3.4z", fill: p.parch }),
  el("g", { key: "rg", transform: "rotate(10 16 12)" }, [
    el("path", { key: "r", d: "M12.6 5.2h8v13.6h-8l1.2-2.4-1.4-2.2 1.4-2.4-1.4-2.4 1.4-2.2z", fill: p.parch }),
    el("path", { key: "rl", d: "M15.4 9.4h3.4M15.4 12h3.4M15.4 14.6h2.2", stroke: "#8A6430", strokeWidth: 0.8 }),
  ]),
  el("rect", { key: "rod", x: 2.2, y: 3.8, width: 2.4, height: 16.4, rx: 1.2, fill: p.gold }),
  el("path", { key: "ll", d: "M6 9.4h2.4M6 12h2.4M6 14.6h2", stroke: "#8A6430", strokeWidth: 0.8 }),
]);

/** Two gold bars crossed over a gem: struck out. */
export const GamePaintCrossBars = gamePaintedIcon((p) => [
  el("path", { key: "a", d: "M5.6 3.4l15 15-2.2 2.2-15-15z", fill: p.gold }),
  el("path", { key: "b", d: "M18.4 3.4l2.2 2.2-15 15-2.2-2.2z", fill: p.gold }),
  gem(p, 12, 12, 3.2),
]);

/* ---- Again ------------------------------------------------------------- */

/** A war hammer: strike again. */
export const GamePaintHammer = gamePaintedIcon((p) => [
  el("path", { key: "h", d: "M12.6 9.2L3 18.8a2 2 0 0 0 2.8 2.8l9.6-9.6", fill: p.wood }),
  el("path", { key: "head", d: "M9.2 6.8l5.6-5.6 8.4 8.4-5.6 5.6z", fill: p.steel }),
  el("path", { key: "band", d: "M11.8 4.2l8.4 8.4", stroke: "#3A2410", strokeWidth: 3 }),
  el("path", { key: "band2", d: "M11.8 4.2l8.4 8.4", stroke: p.gold, strokeWidth: 1.5 }),
  gem(p, 16, 8.4, 1.7),
]);

/* ---- Spent ------------------------------------------------------------- */

/** A sword snapped below the guard. */
export const GamePaintBrokenSword = gamePaintedIcon((p) => [
  el("path", { key: "blade", d: "M13.2 2.6l3 3-4.6 6.4-2.4-.6-.6-2.4z", fill: p.steel }),
  el("path", { key: "edge", d: "M14.4 4.2l-4 5.2", stroke: "#FFFFFF", strokeWidth: 0.7, opacity: 0.8 }),
  el("path", { key: "shard", d: "M17.6 1.4l3.6-.6-.6 3.6-2 1.2z", fill: p.steel }),
  el("path", { key: "guard", d: "M5.2 9.6l2.2-2.2 9.4 9.4-2.2 2.2z", fill: p.gold }),
  el("path", { key: "grip", d: "M10 15.4l-1.4-1.4-4.8 4.8 1.4 1.4z", fill: p.wood }),
  el("circle", { key: "pom", cx: 3.6, cy: 20.4, r: 2.2, fill: p.gold }),
  gem(p, 11, 13, 1.8),
]);

/** A torch gone out, its smoke still rising. */
export const GamePaintTorchOut = gamePaintedIcon((p) => [
  el("path", { key: "stick", d: "M10.4 13h3.2l-.8 9.2h-1.6z", fill: p.wood }),
  el("path", { key: "cup", d: "M6.2 9.4h11.6l-1.8 4.2H8z", fill: p.gold }),
  el("path", { key: "char", d: "M8.4 9.4c.6-1.6 2-2.4 3.6-2.4s3 .8 3.6 2.4z", fill: "#3A2A20" }),
  el("path", { key: "ember", d: "M11 8.4h.1M13 8.6h.1", stroke: "#FF8A3C", strokeWidth: 1.2 }),
  el("path", { key: "smoke", d: "M12 6.2c-1.6-1.4-.4-2.6.4-3.4s.4-2-.6-2.4", stroke: "#9AA3AC", strokeWidth: 1.4 }),
  gem(p, 12, 11.4, 1.4),
]);

/* ---- The end ----------------------------------------------------------- */

/** A skull in old bone. */
export const GamePaintSkull = gamePaintedIcon((p) => [
  el("path", { key: "s", d: "M12 3c4.8 0 8 3.2 8 7.4 0 2.4-1.2 4-2.6 5v2.8c0 .9-.7 1.6-1.6 1.6H8.2c-.9 0-1.6-.7-1.6-1.6v-2.8C5.2 14.4 4 12.8 4 10.4 4 6.2 7.2 3 12 3z", fill: p.bone }),
  el("circle", { key: "e1", cx: 9, cy: 11, r: 2.2, fill: "#2A1A12" }),
  el("circle", { key: "e2", cx: 15, cy: 11, r: 2.2, fill: "#2A1A12" }),
  el("path", { key: "n", d: "M12 13.2l-1 2h2z", fill: "#2A1A12", strokeWidth: 0.6 }),
  el("path", { key: "t", d: "M10 17.4v2.4M12 17.4v2.4M14 17.4v2.4", strokeWidth: 0.8 }),
  el("circle", { key: "g1", cx: 9, cy: 11, r: 0.7, fill: "#5BB2FF", stroke: "none" }),
  el("circle", { key: "g2", cx: 15, cy: 11, r: 0.7, fill: "#5BB2FF", stroke: "none" }),
]);

/** A headstone with a gold cross. */
export const GamePaintTombstone = gamePaintedIcon((p) => [
  el("path", { key: "s", d: "M5.6 20.4V9.8a6.4 6.4 0 0 1 12.8 0v10.6z", fill: p.stone }),
  el("path", { key: "ground", d: "M3 20.6h18", strokeWidth: 1.6 }),
  el("path", { key: "c", d: "M12 7.4v8.4M9.2 10.2h5.6", stroke: "#3A2410", strokeWidth: 2.4 }),
  el("path", { key: "c2", d: "M12 7.4v8.4M9.2 10.2h5.6", stroke: p.gold, strokeWidth: 1.2 }),
  el("path", { key: "grass", d: "M4.4 20.4l.8-1.6.8 1.6M17.6 20.4l.8-1.6.8 1.6", stroke: "#4F7A2E", strokeWidth: 0.9 }),
]);

/** The great gem, shattered in its setting. */
export const GamePaintShatteredGem = gamePaintedIcon((p) => [
  el("circle", { key: "set", cx: 12, cy: 12, r: 9, stroke: "#3A2410", strokeWidth: 3.4 }),
  el("circle", { key: "set2", cx: 12, cy: 12, r: 9, stroke: p.gold, strokeWidth: 1.8 }),
  el("path", { key: "a", d: "M12 4.6l2 4.6-2 2.2-3.4-1.4z", fill: p.gem, stroke: "#0A2456", strokeWidth: 0.7 }),
  el("path", { key: "b", d: "M15.6 10.4l1.4 2.4-3.6 5.4-.4-5.6z", fill: p.gem, stroke: "#0A2456", strokeWidth: 0.7 }),
  el("path", { key: "c", d: "M7.4 11.2l3.8 1.6.2 5.4-4.4-4.8z", fill: p.gem, stroke: "#0A2456", strokeWidth: 0.7 }),
  el("path", { key: "glint", d: "M11.6 6.6l.6 1.4", stroke: "#FFFFFF", strokeWidth: 0.8 }),
]);

/* ---- Held -------------------------------------------------------------- */

/** A gold medallion with two bars: held, not ended. */
export const GamePaintPause = gamePaintedIcon((p) => [
  el("circle", { key: "c", cx: 12, cy: 12, r: 9, fill: p.gold }),
  el("circle", { key: "i", cx: 12, cy: 12, r: 6.6, fill: p.navy, strokeWidth: 0.7 }),
  el("rect", { key: "b1", x: 8.8, y: 8.4, width: 2.2, height: 7.2, rx: 0.6, fill: p.gold, strokeWidth: 0.7 }),
  el("rect", { key: "b2", x: 13, y: 8.4, width: 2.2, height: 7.2, rx: 0.6, fill: p.gold, strokeWidth: 0.7 }),
]);

/** A chain with one link sprung apart. */
export const GamePaintSnappedChain = gamePaintedIcon((p) => [
  el("rect", { key: "l1", x: 2.4, y: 9.2, width: 9, height: 5.6, rx: 2.8, stroke: "#3A2410", strokeWidth: 3.2 }),
  el("rect", { key: "l1g", x: 2.4, y: 9.2, width: 9, height: 5.6, rx: 2.8, stroke: p.gold, strokeWidth: 1.6 }),
  el("path", { key: "l2", d: "M15.4 7.6h3.4a2.8 2.8 0 0 1 0 5.6h-1.4", stroke: "#3A2410", strokeWidth: 3.2 }),
  el("path", { key: "l2g", d: "M15.4 7.6h3.4a2.8 2.8 0 0 1 0 5.6h-1.4", stroke: p.gold, strokeWidth: 1.6 }),
  el("path", { key: "spark", d: "M13.4 15.2l-.6 2.2M14.8 16.2l1.4 1.6M12 17.8l-.2 2", stroke: "#FFD45C", strokeWidth: 1 }),
  gem(p, 6.9, 12, 1.2),
]);

/** A gauntlet raised, palm out: halt. */
export const GamePaintGauntlet = gamePaintedIcon((p) => [
  el("path", { key: "h", d: "M7.4 21v-4.2l-2.6-3.6a1.4 1.4 0 0 1 2.2-1.8l1.4 1.6V5.2a1.3 1.3 0 0 1 2.6 0V10V3.8a1.3 1.3 0 0 1 2.6 0V10V4.6a1.3 1.3 0 0 1 2.6 0V10.4V6.6a1.3 1.3 0 0 1 2.6 0v8.2c0 2.6-1.4 4.4-3 5.4V21z", fill: p.steel }),
  el("rect", { key: "cuff", x: 6.8, y: 18.6, width: 10.2, height: 3, rx: 0.8, fill: p.gold }),
  gem(p, 11.9, 20.1, 1),
]);

/* ---- Stores ------------------------------------------------------------ */

/** A barrel, gold-hooped. */
export const GamePaintBarrel = gamePaintedIcon((p) => [
  el("path", { key: "b", d: "M6.6 2.8h10.8c1.6 2.8 2.4 5.8 2.4 9.2s-.8 6.4-2.4 9.2H6.6C5 18.4 4.2 15.4 4.2 12s.8-6.4 2.4-9.2z", fill: p.wood }),
  el("path", { key: "staves", d: "M9.4 3v18M14.6 3v18", stroke: "#3A2410", strokeWidth: 0.6, opacity: 0.6 }),
  el("path", { key: "h1", d: "M4.9 7.4h14.2", stroke: "#3A2410", strokeWidth: 2.4 }),
  el("path", { key: "h1g", d: "M4.9 7.4h14.2", stroke: p.gold, strokeWidth: 1.2 }),
  el("path", { key: "h2", d: "M4.9 16.6h14.2", stroke: "#3A2410", strokeWidth: 2.4 }),
  el("path", { key: "h2g", d: "M4.9 16.6h14.2", stroke: p.gold, strokeWidth: 1.2 }),
  gem(p, 12, 12, 1.8),
]);

/** Crates stacked to the rafters. */
export const GamePaintCrates = gamePaintedIcon((p) => [
  el("rect", { key: "a", x: 2.4, y: 12.4, width: 9.4, height: 9, rx: 0.8, fill: p.wood }),
  el("rect", { key: "b", x: 12.2, y: 12.4, width: 9.4, height: 9, rx: 0.8, fill: p.wood }),
  el("rect", { key: "c", x: 7.3, y: 3, width: 9.4, height: 9, rx: 0.8, fill: p.wood }),
  el("path", { key: "x", d: "M2.8 12.8l8.6 8.2M12.6 12.8l8.6 8.2M7.7 3.4l8.6 8.2", stroke: "#3A2410", strokeWidth: 0.7, opacity: 0.7 }),
  el("path", { key: "corners", d: "M2.4 14.2v-1.8h1.8M11.8 14.2v-1.8H10M12.2 14.2v-1.8H14M21.6 14.2v-1.8h-1.8M7.3 4.8V3h1.8M16.7 4.8V3h-1.8", stroke: p.gold, strokeWidth: 1.4 }),
  gem(p, 12, 7.5, 1.5),
]);
