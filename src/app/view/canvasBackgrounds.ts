import type { AppLocale } from "../../i18n/uiCopy";

/**
 * What the canvas is painted with, behind the agent being designed.
 *
 * Every one of them is a grey with a cast rather than a colour: the backdrop's
 * job is to hold a white product card without competing with it, and anything
 * bright beside a white frame reads as the brighter thing. That is also why the
 * lighter half of the set sits a shade *below* the default rather than above it.
 *
 * The textured ones draw a pattern over the same kind of grey. Drawn in CSS
 * gradients rather than shipped as images: at these sizes an image is a request
 * for two dozen bytes of pattern, and the tile size has to be set twice anyway
 * (the dialog's swatch is 18px, where a 16px tile would show one dot).
 *
 * Labels live here rather than in the copy dictionaries, the same way the region
 * and slot names do (`presetRailData.ts`): the name and the colour are one fact,
 * and splitting them across two files is how they drift.
 */
export type CanvasBackgroundId =
  | "slate"
  | "fog"
  | "oat"
  | "mist"
  | "graphite"
  | "dots"
  | "grid"
  | "glow";

export type CanvasBackground = {
  id: CanvasBackgroundId;
  /** The flat colour, which is also what the swatch reads as. */
  color: string;
  /** A pattern over the colour, as a `background-image` and its tile size. */
  texture?: { image: string; size: string; swatchSize: string };
  label: Record<AppLocale, string>;
};

/**
 * The set, redrawn the way design tools draw theirs.
 *
 * The first set read as five unrelated picks: two muddy greys, a sand that
 * went brown next to white, a dull blue, and a near-black with a blue cast —
 * no two at the same lightness — with a hatch that was the loudest thing on
 * the page. Figma, Framer, Freeform and tldraw all keep their canvases inside
 * one band of lightness and vary only the temperature, and keep patterns at
 * the edge of visibility: there to align by, never to look at.
 *
 * So: one lightness, five temperatures (cool slate, neutral fog, warm oat,
 * clear mist, and a neutral graphite for dark), and patterns at about half
 * the ink they had. The hatch is gone; its slot is a soft light falling from
 * the top. Every plain one stays at or below the slate's lightness, so a
 * white frame is always the brightest thing on it (`canvasBackgrounds.test`).
 */
/** The ink the patterns are drawn in — the text colour, at a whisper. */
const DOT_INK = "rgba(31, 35, 43, 0.12)";
const GRID_MINOR = "rgba(31, 35, 43, 0.045)";
const GRID_MAJOR = "rgba(31, 35, 43, 0.085)";

export const CANVAS_BACKGROUNDS: readonly CanvasBackground[] = [
  // The one the canvas has always been, so the default changes nothing.
  { id: "slate", color: "#DDE1E9", label: { en: "Slate", zh: "石板灰", ja: "スレート" } },
  { id: "fog", color: "#DCDDE0", label: { en: "Fog", zh: "雾灰", ja: "フォグ" } },
  { id: "oat", color: "#E0DBD3", label: { en: "Oat", zh: "燕麦", ja: "オーツ" } },
  { id: "mist", color: "#D7DEE8", label: { en: "Mist", zh: "雾蓝", ja: "ミスト" } },
  { id: "graphite", color: "#26282D", label: { en: "Graphite", zh: "石墨", ja: "グラファイト" } },
  {
    id: "dots",
    color: "#DCE0E7",
    texture: {
      image: `radial-gradient(circle at 1px 1px, ${DOT_INK} 1px, transparent 0)`,
      size: "20px 20px",
      swatchSize: "7px 7px",
    },
    label: { en: "Dot grid", zh: "点阵", ja: "ドット" },
  },
  {
    // Fine squares with a heavier line every fifth, the way a drawing board
    // is ruled — the major lines are what the eye aligns to.
    id: "grid",
    color: "#DCE0E7",
    texture: {
      image: [
        `linear-gradient(to right, ${GRID_MINOR} 1px, transparent 1px)`,
        `linear-gradient(to bottom, ${GRID_MINOR} 1px, transparent 1px)`,
        `linear-gradient(to right, ${GRID_MAJOR} 1px, transparent 1px)`,
        `linear-gradient(to bottom, ${GRID_MAJOR} 1px, transparent 1px)`,
      ].join(", "),
      size: "16px 16px, 16px 16px, 80px 80px, 80px 80px",
      swatchSize: "6px 6px, 6px 6px, 30px 30px, 30px 30px",
    },
    label: { en: "Grid", zh: "方格", ja: "グリッド" },
  },
  {
    // A soft light falling from the top onto the slate: depth without a
    // pattern to read.
    id: "glow",
    color: "#DCE0E8",
    texture: {
      image:
        "radial-gradient(110% 75% at 50% 0%, rgba(255, 255, 255, 0.6), transparent 62%), linear-gradient(180deg, transparent 40%, rgba(31, 35, 43, 0.05))",
      size: "100% 100%, 100% 100%",
      swatchSize: "100% 100%, 100% 100%",
    },
    label: { en: "Soft light", zh: "柔光", ja: "ソフトライト" },
  },
];

export const DEFAULT_CANVAS_BACKGROUND: CanvasBackgroundId = "slate";

/** The option for an id, falling back to the default rather than to nothing. */
export function canvasBackground(id: CanvasBackgroundId): CanvasBackground {
  return CANVAS_BACKGROUNDS.find((background) => background.id === id) ?? CANVAS_BACKGROUNDS[0];
}

export function canvasBackgroundColor(id: CanvasBackgroundId): string {
  return canvasBackground(id).color;
}
