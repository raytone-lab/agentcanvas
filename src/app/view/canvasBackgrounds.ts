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
  | "paper"
  | "sand"
  | "mist"
  | "ink"
  | "dots"
  | "grid"
  | "hatch";

export type CanvasBackground = {
  id: CanvasBackgroundId;
  /** The flat colour, which is also what the swatch reads as. */
  color: string;
  /** A pattern over the colour, as a `background-image` and its tile size. */
  texture?: { image: string; size: string; swatchSize: string };
  label: Record<AppLocale, string>;
};

/** The ink the patterns are drawn in — the text colour, at a fraction. */
const PATTERN_INK = "rgba(31, 35, 43, 0.13)";

export const CANVAS_BACKGROUNDS: readonly CanvasBackground[] = [
  // The one the canvas has always been, so the default changes nothing.
  { id: "slate", color: "#DDE1E9", label: { en: "Slate", zh: "石板灰", ja: "スレート" } },
  { id: "paper", color: "#D8D8D6", label: { en: "Paper", zh: "纸灰", ja: "ペーパー" } },
  { id: "sand", color: "#D5CFC4", label: { en: "Sand", zh: "暖砂", ja: "サンド" } },
  { id: "mist", color: "#C9D3DD", label: { en: "Mist", zh: "雾蓝", ja: "ミスト" } },
  { id: "ink", color: "#242A33", label: { en: "Ink", zh: "墨黑", ja: "インク" } },
  {
    id: "dots",
    color: "#D9DCE2",
    texture: {
      image: `radial-gradient(circle at 1px 1px, ${PATTERN_INK} 1.2px, transparent 0)`,
      size: "16px 16px",
      swatchSize: "6px 6px",
    },
    label: { en: "Dot grid", zh: "点阵", ja: "ドット" },
  },
  {
    id: "grid",
    color: "#DBDEE4",
    texture: {
      image: `linear-gradient(to right, ${PATTERN_INK} 1px, transparent 1px), linear-gradient(to bottom, ${PATTERN_INK} 1px, transparent 1px)`,
      size: "24px 24px, 24px 24px",
      swatchSize: "6px 6px, 6px 6px",
    },
    label: { en: "Grid", zh: "方格", ja: "グリッド" },
  },
  {
    id: "hatch",
    color: "#D6D9DF",
    texture: {
      image: `repeating-linear-gradient(45deg, ${PATTERN_INK} 0 1.5px, transparent 1.5px 7px)`,
      size: "auto",
      swatchSize: "auto",
    },
    label: { en: "Hatch", zh: "斜纹", ja: "ハッチ" },
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
