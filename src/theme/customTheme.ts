import { themeTokens, type ThemePresetId, type ThemeTokens } from "./themeTokens";

/**
 * A colourway the reader has repainted.
 *
 * The swatch shows a palette as four colours — canvas, panel, accent, ink —
 * and those four are what can be changed. A palette is twenty-odd colours,
 * though, and the rest were chosen *against* those four: the hover is the
 * panel with a little ink in it, the soft accent is the accent thinned on the
 * panel. So changing one of the four re-derives the colours that hang off it,
 * and leaves everything else exactly as the preset had it — an untouched
 * accent keeps its hand-picked hover, a repainted one gets a computed one.
 *
 * Kept on the project (`theme.colorOverrides`, keyed by colourway) so it
 * travels with the export: the exported app resolves the same palette here,
 * from the same file.
 */
export type ThemeColorRole = "canvas" | "panel" | "accent" | "ink";

export type ThemeColorOverride = Partial<Record<ThemeColorRole, string>>;

export type ThemeColorOverrides = Partial<Record<ThemePresetId, ThemeColorOverride>>;

export const THEME_COLOR_ROLES: readonly ThemeColorRole[] = ["canvas", "panel", "accent", "ink"];

/** The colour a role currently has, override or not. */
export function themeRoleColor(tokens: ThemeTokens, role: ThemeColorRole): string {
  if (role === "canvas") return tokens.surface.canvas;
  if (role === "panel") return tokens.surface.panel;
  if (role === "accent") return tokens.accent.action;
  return tokens.text.primary;
}

/** The preset's tokens with the reader's overrides for it applied. */
export function resolveThemeTokens(
  presetId: ThemePresetId,
  overrides?: ThemeColorOverrides,
): ThemeTokens {
  const preset = themeTokens[presetId] ?? Object.values(themeTokens)[0];
  const own = overrides?.[presetId];
  if (!own || Object.keys(own).length === 0) return preset;

  const dark = preset.appearance === "dark";
  const canvas = valid(own.canvas) ?? preset.surface.canvas;
  const panel = valid(own.panel) ?? preset.surface.panel;
  const accent = valid(own.accent) ?? preset.accent.action;
  const ink = valid(own.ink) ?? preset.text.primary;
  const panelChanged = valid(own.panel) !== undefined;
  const inkChanged = valid(own.ink) !== undefined;
  const accentChanged = valid(own.accent) !== undefined;
  // The surfaces are panel tinted with ink, so either moving re-derives them.
  const surfacesMove = panelChanged || inkChanged;

  return {
    ...preset,
    surface: {
      canvas,
      panel,
      raised: surfacesMove ? (dark ? mix(panel, ink, 0.06) : mix(panel, "#ffffff", 0.6)) : preset.surface.raised,
      inset: surfacesMove ? mix(panel, ink, dark ? 0.08 : 0.045) : preset.surface.inset,
      hover: surfacesMove ? mix(panel, ink, dark ? 0.12 : 0.07) : preset.surface.hover,
      disabled: surfacesMove ? mix(panel, ink, 0.14) : preset.surface.disabled,
    },
    text: {
      primary: ink,
      secondary: surfacesMove ? mix(ink, panel, 0.3) : preset.text.secondary,
      muted: surfacesMove ? mix(ink, panel, 0.52) : preset.text.muted,
      // Type set on the accent: whichever of white and the ink reads better.
      inverse: accentChanged ? bestOn(accent, ["#ffffff", ink]) : preset.text.inverse,
    },
    border: {
      subtle: surfacesMove ? mix(panel, ink, dark ? 0.16 : 0.11) : preset.border.subtle,
      strong: surfacesMove ? mix(panel, ink, dark ? 0.3 : 0.22) : preset.border.strong,
    },
    accent: {
      action: accent,
      hover: accentChanged ? mix(accent, dark ? "#ffffff" : "#000000", 0.12) : preset.accent.hover,
      soft: accentChanged || panelChanged ? mix(panel, accent, dark ? 0.2 : 0.12) : preset.accent.soft,
    },
  };
}

/** WCAG contrast ratio between two colours, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** `#rgb` / `#rrggbb`, normalised to lowercase `#rrggbb`; anything else is undefined. */
export function normalizeHex(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const raw = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw.split("").map((c) => c + c).join("")}`.toLowerCase();
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw}`.toLowerCase();
  return undefined;
}

function valid(value: string | undefined): string | undefined {
  return normalizeHex(value);
}

type Rgb = [number, number, number];

/** The preset values are not all hex (some are rgb()/rgba()); read both. */
function toRgb(color: string): Rgb {
  const hex = normalizeHex(color);
  if (hex) {
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
  }
  const match = color.match(/rgba?\(([^)]+)\)/i);
  if (match) {
    const [r, g, b] = match[1].split(/[\s,/]+/).map((part) => Number.parseFloat(part));
    return [r || 0, g || 0, b || 0];
  }
  return [128, 128, 128];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

/** `a` with `amount` (0–1) of `b` mixed in. */
function mix(a: string, b: string, amount: number): string {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * amount) as Rgb);
}

function luminance(color: string): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = toRgb(color);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function bestOn(background: string, candidates: readonly string[]): string {
  return candidates.reduce((best, next) =>
    contrastRatio(background, next) > contrastRatio(background, best) ? next : best,
  );
}
