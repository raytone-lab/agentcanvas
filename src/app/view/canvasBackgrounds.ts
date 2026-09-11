import type { AppLocale } from "../../i18n/uiCopy";

/**
 * What the canvas is painted with, behind the agent being designed.
 *
 * Five, not a colour picker: the backdrop's job is to hold a white product card
 * without competing with it, and most colours cannot do that. These are the ones
 * that can — three neutrals at different temperatures, one cool tint, and a dark
 * one for looking at light themes the way a dark room would.
 *
 * Labels live here rather than in the copy dictionaries, the same way the region
 * and slot names do (`presetRailData.ts`): the name and the colour are one fact,
 * and splitting them across two files is how they drift.
 */
export type CanvasBackgroundId = "slate" | "paper" | "sand" | "mist" | "ink";

export type CanvasBackground = {
  id: CanvasBackgroundId;
  color: string;
  label: Record<AppLocale, string>;
};

export const CANVAS_BACKGROUNDS: readonly CanvasBackground[] = [
  // The one the canvas has always been, so the default changes nothing.
  { id: "slate", color: "#DDE1E9", label: { en: "Slate", zh: "石板灰", ja: "スレート" } },
  { id: "paper", color: "#F1F2F4", label: { en: "Paper", zh: "纸白", ja: "ペーパー" } },
  { id: "sand", color: "#E7E2D9", label: { en: "Sand", zh: "暖砂", ja: "サンド" } },
  { id: "mist", color: "#D8E4EF", label: { en: "Mist", zh: "雾蓝", ja: "ミスト" } },
  { id: "ink", color: "#242A33", label: { en: "Ink", zh: "墨黑", ja: "インク" } },
];

export const DEFAULT_CANVAS_BACKGROUND: CanvasBackgroundId = "slate";

/** The colour for an id, falling back to the default rather than to nothing. */
export function canvasBackgroundColor(id: CanvasBackgroundId): string {
  const found = CANVAS_BACKGROUNDS.find((background) => background.id === id);
  return (found ?? CANVAS_BACKGROUNDS[0]).color;
}
