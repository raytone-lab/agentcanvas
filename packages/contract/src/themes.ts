import type { ThemeTokens } from "./types.js";

/** Shared visual values for both standalone Canvas and embedded previews. */
export const themeTokens: Record<ThemeTokens["id"], ThemeTokens> = {
  "console-light": {
    id: "console-light",
    name: "Codex Light",
    font: {
      ui: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    },
    surface: {
      canvas: "#f5f5f7",
      panel: "#ffffff",
      raised: "#fbfbfc",
      inset: "#f0f0f3",
      hover: "#e8e8ec",
    },
    text: {
      primary: "#0f0f10",
      secondary: "#454650",
      muted: "#8f90a0",
      inverse: "#ffffff",
    },
    border: { subtle: "#ececee", strong: "#dcdce0" },
    accent: { action: "#262625", hover: "#111110", soft: "#eeeeef" },
    status: {
      success: "#10a37f",
      warning: "#b7791f",
      danger: "#dc2626",
      info: "#62636b",
    },
  },
  graphite: {
    id: "graphite",
    name: "Graphite Mono",
    font: {
      ui: '"IBM Plex Sans", "Aptos", ui-sans-serif, system-ui, sans-serif',
      display:
        '"IBM Plex Sans Condensed", "Aptos Display", ui-sans-serif, system-ui, sans-serif',
      mono: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
    },
    surface: {
      canvas: "#17191d",
      panel: "#202329",
      raised: "#2a2e36",
      inset: "#191c21",
      hover: "#30343d",
    },
    text: {
      primary: "#eef1f5",
      secondary: "#c8ced8",
      muted: "#8b95a7",
      inverse: "#14171c",
    },
    border: { subtle: "#30343d", strong: "#444b58" },
    accent: { action: "#75b7a5", hover: "#8cc8b8", soft: "#17352f" },
    status: {
      success: "#83c995",
      warning: "#d8b45d",
      danger: "#ee7d72",
      info: "#8bb8f0",
    },
  },
  oxide: {
    id: "oxide",
    name: "Oxide Workbench",
    font: {
      ui: '"Aptos", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
      display:
        '"Aptos Display", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
      mono: '"Cascadia Mono", "SFMono-Regular", Consolas, monospace',
    },
    surface: {
      canvas: "#f7f4ef",
      panel: "#fffdfa",
      raised: "#ffffff",
      inset: "#efe8dd",
      hover: "#e8dfd2",
    },
    text: {
      primary: "#22201c",
      secondary: "#534b42",
      muted: "#7d7062",
      inverse: "#fff8ef",
    },
    border: { subtle: "#e4dbcf", strong: "#cfc0ad" },
    accent: { action: "#326f5a", hover: "#285944", soft: "#dce9df" },
    status: {
      success: "#24704b",
      warning: "#9b6717",
      danger: "#b54a34",
      info: "#3b6d8c",
    },
  },
  "studio-neutral": {
    id: "studio-neutral",
    name: "Studio Neutral",
    font: {
      ui: '"Suisse Int\'l", "Inter", ui-sans-serif, system-ui, sans-serif',
      display: '"Suisse Int\'l", "Inter", ui-sans-serif, system-ui, sans-serif',
      mono: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    },
    surface: {
      canvas: "#f1f3f7",
      panel: "#ffffff",
      raised: "#fafbfc",
      inset: "#e8ecf2",
      hover: "#dfe5ee",
    },
    text: {
      primary: "#101623",
      secondary: "#334155",
      muted: "#697586",
      inverse: "#f8fafc",
    },
    border: { subtle: "#dce2ea", strong: "#bcc7d6" },
    accent: { action: "#5b648f", hover: "#474f73", soft: "#e2e6f3" },
    status: {
      success: "#25795a",
      warning: "#a06416",
      danger: "#b9382f",
      info: "#3865a7",
    },
  },
  "paper-trail": {
    id: "paper-trail",
    name: "Paper Trail",
    font: {
      ui: '"Source Serif 4", Georgia, "Times New Roman", serif',
      display: '"Source Serif 4", Georgia, "Times New Roman", serif',
      mono: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    },
    surface: {
      canvas: "#f4f1ea",
      panel: "#fffdf7",
      raised: "#fbf7ee",
      inset: "#ebe4d8",
      hover: "#e2d8c8",
    },
    text: {
      primary: "#252017",
      secondary: "#554b3d",
      muted: "#827462",
      inverse: "#fffaf0",
    },
    border: { subtle: "#ded4c2", strong: "#c5b69e" },
    accent: { action: "#8d5039", hover: "#713f2e", soft: "#ead9cf" },
    status: {
      success: "#4f7543",
      warning: "#9b6a1f",
      danger: "#a74435",
      info: "#4d6f8c",
    },
  },
  "terminal-green": {
    id: "terminal-green",
    name: "Terminal Green",
    font: {
      ui: '"Berkeley Mono", "SFMono-Regular", Consolas, monospace',
      display: '"Berkeley Mono", "SFMono-Regular", Consolas, monospace',
      mono: '"Berkeley Mono", "SFMono-Regular", Consolas, monospace',
    },
    surface: {
      canvas: "#0f1512",
      panel: "#151d18",
      raised: "#1b261f",
      inset: "#0b100d",
      hover: "#223128",
    },
    text: {
      primary: "#e7f2e7",
      secondary: "#bfd4c2",
      muted: "#78947f",
      inverse: "#09100c",
    },
    border: { subtle: "#26362d", strong: "#3b5244" },
    accent: { action: "#7acb83", hover: "#9adf9f", soft: "#193120" },
    status: {
      success: "#7acb83",
      warning: "#d1b456",
      danger: "#e5766e",
      info: "#82b7dd",
    },
  },
};
