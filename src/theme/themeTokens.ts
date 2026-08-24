export type ThemeTokens = {
  id: ThemePresetId;
  name: string;
  /** Drives the preview's light/dark chrome (data-appearance). */
  appearance: "dark" | "light";
  font: {
    ui: string;
    display: string;
    mono: string;
  };
  surface: {
    canvas: string;
    panel: string;
    raised: string;
    inset: string;
    hover: string;
    disabled: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  border: {
    subtle: string;
    strong: string;
  };
  accent: {
    action: string;
    hover: string;
    soft: string;
  };
  status: {
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
};

export type ThemePresetId =
  // Native (原生风) — warm / saturated
  | "warm-graphite"
  | "cocoa-system"
  | "forest-ember"
  | "soft-glass"
  | "sand-workspace"
  | "apricot-agent"
  // Minimal (极简风) — cool / austere
  | "cold-mono"
  | "slate-blue"
  | "cyan-grid"
  | "ice-white"
  | "mist-blue"
  | "polar-mono";

/** Theme ids grouped by the visual style that offers them (light schemes first). */
export const nativeThemePresetIds: readonly ThemePresetId[] = [
  "soft-glass",
  "sand-workspace",
  "apricot-agent",
  "warm-graphite",
  "cocoa-system",
  "forest-ember",
];

export const minimalThemePresetIds: readonly ThemePresetId[] = [
  "ice-white",
  "mist-blue",
  "polar-mono",
  "cold-mono",
  "slate-blue",
  "cyan-grid",
];

// Fonts are constant per style — only colors vary between the schemes within a
// style. Native keeps the IBM Plex stack, Minimal keeps the Inter stack (i.e.
// the fonts the previous default theme of each style already used).
const NATIVE_FONT: ThemeTokens["font"] = {
  ui: "\"IBM Plex Sans\", \"Aptos\", ui-sans-serif, system-ui, sans-serif",
  display: "\"IBM Plex Sans Condensed\", \"Aptos Display\", ui-sans-serif, system-ui, sans-serif",
  mono: "\"IBM Plex Mono\", \"SFMono-Regular\", Consolas, monospace",
};

const MINIMAL_FONT: ThemeTokens["font"] = {
  ui: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  display: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  mono: "\"SFMono-Regular\", Consolas, \"Liberation Mono\", monospace",
};

// Status colors are semantic (not derivable from a single accent), so they use
// one shared ramp per appearance.
const DARK_STATUS = { success: "#7FC8A0", warning: "#DDB25A", danger: "#E8837A", info: "#7FB2E8" };
const LIGHT_STATUS = { success: "#2E9E6E", warning: "#B37518", danger: "#C24436", info: "#2E6FB0" };

/** Seed colors supplied per scheme; every other token is derived from these. */
type Seed = { canvas: string; panel: string; inset: string; accent: string };

const mix = (a: string, pct: number, b: string) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;

function darkScheme(id: ThemePresetId, name: string, font: ThemeTokens["font"], s: Seed): ThemeTokens {
  const { canvas: C, panel: P, inset: I, accent: A } = s;
  return {
    id,
    name,
    appearance: "dark",
    font,
    surface: {
      canvas: C,
      panel: P,
      raised: mix(P, 72, I),
      inset: I,
      hover: mix(I, 85, "#fff"),
      disabled: mix(I, 68, "#fff"),
    },
    text: {
      primary: mix("#fff", 92, C),
      secondary: mix("#fff", 68, C),
      muted: mix("#fff", 52, C),
      inverse: mix(C, 72, "#000"),
    },
    border: {
      subtle: mix(P, 82, "#fff"),
      strong: mix(P, 62, "#fff"),
    },
    accent: {
      action: A,
      hover: mix(A, 82, "#fff"),
      soft: mix(A, 18, P),
    },
    status: { ...DARK_STATUS },
  };
}

function lightScheme(id: ThemePresetId, name: string, font: ThemeTokens["font"], s: Seed): ThemeTokens {
  const { canvas: C, panel: P, inset: I, accent: A } = s;
  return {
    id,
    name,
    appearance: "light",
    font,
    surface: {
      canvas: C,
      panel: P,
      raised: mix(P, 78, C),
      inset: I,
      hover: mix(I, 90, "#000"),
      disabled: mix(I, 70, "#000"),
    },
    text: {
      primary: mix("#000", 88, C),
      secondary: mix("#000", 64, C),
      muted: mix("#000", 55, C),
      inverse: mix("#fff", 96, C),
    },
    border: {
      subtle: mix(I, 90, "#000"),
      strong: mix(I, 72, "#000"),
    },
    accent: {
      action: A,
      hover: mix(A, 85, "#000"),
      soft: mix(A, 14, P),
    },
    status: { ...LIGHT_STATUS },
  };
}

export const themeTokens: Record<ThemeTokens["id"], ThemeTokens> = {
  // ── Native (原生风) ──────────────────────────────────────────────────────
  "warm-graphite": darkScheme("warm-graphite", "Warm Graphite", NATIVE_FONT, {
    canvas: "#11100E", panel: "#1B1916", inset: "#2A251F", accent: "#D69A3A",
  }),
  "cocoa-system": darkScheme("cocoa-system", "Cocoa System", NATIVE_FONT, {
    canvas: "#130F0D", panel: "#1F1815", inset: "#2B211D", accent: "#D9826B",
  }),
  "forest-ember": darkScheme("forest-ember", "Forest Ember", NATIVE_FONT, {
    canvas: "#09110E", panel: "#121C17", inset: "#203026", accent: "#CFA85A",
  }),
  "soft-glass": {
    id: "soft-glass",
    name: "Soft Glass",
    appearance: "light",
    font: NATIVE_FONT,
    surface: {
      canvas: "#F4F6FA",
      panel: "#FFFFFF",
      raised: "#FFFFFF",
      inset: "#F4F6FA",
      hover: "#E6E9F0",
      disabled: "#BFC5D2",
    },
    text: {
      primary: "#111E36",
      secondary: mix("#111E36", 72, "#F4F6FA"),
      muted: mix("#111E36", 55, "#F4F6FA"),
      inverse: "#FFFFFF",
    },
    border: {
      subtle: "#E6E9F0",
      strong: "#E6E9F0",
    },
    accent: {
      action: "#111E36",
      hover: mix("#111E36", 86, "#000"),
      soft: mix("#111E36", 10, "#FFFFFF"),
    },
    status: { ...LIGHT_STATUS },
  },
  "sand-workspace": {
    id: "sand-workspace",
    name: "Sand Workspace",
    appearance: "light",
    font: NATIVE_FONT,
    surface: {
      canvas: "#FFF9F2",
      panel: "#FFFFFF",
      raised: "#FFFFFF",
      inset: "#FFF6EC",
      hover: "#FFECD6",
      disabled: "#E8D9C7",
    },
    text: {
      primary: "#24180E",
      secondary: mix("#24180E", 72, "#FFF9F2"),
      muted: mix("#24180E", 55, "#FFF9F2"),
      inverse: "#FFFFFF",
    },
    border: {
      subtle: "#F2E4D4",
      strong: "#E8D8C6",
    },
    accent: {
      action: "#C87330",
      hover: mix("#C87330", 86, "#000"),
      soft: "#FFECD6",
    },
    status: { ...LIGHT_STATUS },
  },
  "apricot-agent": {
    id: "apricot-agent",
    name: "Tangerine Agent",
    appearance: "light",
    font: NATIVE_FONT,
    surface: {
      canvas: "#FFF7ED",
      panel: "#FFFFFF",
      raised: "#FFFFFF",
      inset: "#FFE8CC",
      hover: "#FFD1A3",
      disabled: "#E7C19A",
    },
    text: {
      primary: "#261407",
      secondary: mix("#261407", 72, "#FFF7ED"),
      muted: mix("#261407", 55, "#FFF7ED"),
      inverse: "#FFFFFF",
    },
    border: {
      subtle: "#F3D4B5",
      strong: "#E7BC90",
    },
    accent: {
      action: "#F97316",
      hover: mix("#F97316", 86, "#000"),
      soft: "#FFEDD5",
    },
    status: { ...LIGHT_STATUS },
  },

  // ── Minimal (极简风) ─────────────────────────────────────────────────────
  "cold-mono": darkScheme("cold-mono", "Cold Mono", MINIMAL_FONT, {
    canvas: "#090A0D", panel: "#101216", inset: "#1A1D23", accent: "#DDE3EA",
  }),
  "slate-blue": darkScheme("slate-blue", "Slate Blue", MINIMAL_FONT, {
    canvas: "#0B1020", panel: "#111827", inset: "#1E293B", accent: "#60A5FA",
  }),
  "cyan-grid": darkScheme("cyan-grid", "Cyan Grid", MINIMAL_FONT, {
    canvas: "#071216", panel: "#0D1B22", inset: "#142833", accent: "#22D3EE",
  }),
  "ice-white": lightScheme("ice-white", "Ice White", MINIMAL_FONT, {
    canvas: "#F7FAFC", panel: "#FFFFFF", inset: "#EEF4FA", accent: "#2563EB",
  }),
  "mist-blue": lightScheme("mist-blue", "Mist Violet", MINIMAL_FONT, {
    canvas: "#F7F2FF", panel: "#FFFFFF", inset: "#EFE7FF", accent: "#7C3AED",
  }),
  "polar-mono": lightScheme("polar-mono", "Polar Navy", MINIMAL_FONT, {
    canvas: "#FAFBFC", panel: "#FFFFFF", inset: "#EEF1F5", accent: "#172554",
  }),
};

export function isThemePresetId(id: string): id is ThemePresetId {
  return id in themeTokens;
}
