import type { ThemeTokens } from "./themeTokens";

export function applyTheme(theme: ThemeTokens, root: HTMLElement = document.documentElement): void {
  applyTokenGroup(root, "font", theme.font);
  applyTokenGroup(root, "surface", theme.surface);
  applyTokenGroup(root, "text", theme.text);
  applyTokenGroup(root, "border", theme.border);
  applyTokenGroup(root, "accent", theme.accent, { action: "accent" });
  applyTokenGroup(root, "", theme.status);
}

function applyTokenGroup(
  root: HTMLElement,
  prefix: string,
  tokens: Record<string, string>,
  aliases: Record<string, string> = {},
): void {
  for (const [key, value] of Object.entries(tokens)) {
    const variable = aliases[key] ?? [prefix, key].filter(Boolean).join("-");
    root.style.setProperty(`--${variable}`, value);
  }
}
