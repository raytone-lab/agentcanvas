import { describe, expect, it } from "vitest";

import { themeTokens } from "./themeTokens";

/**
 * Every palette's quiet text has to be readable on the surfaces it sits on.
 *
 * Found by measuring the canvas rather than by eye: 手绘风's four palettes put
 * their muted text at 2.35–3.3:1 — 「2/3 步」, the model chip, a file name all
 * fading into the paper — and 原生风's Coral Desk at 2.17:1. The floors are the
 * ones the meta copy can carry at its size: muted ≥ 3.5 on the panel and 3.2 on
 * the inset, secondary ≥ 4.5 on the panel.
 *
 * Palettes defined with `color-mix()` are skipped here (they cannot be parsed
 * without a browser); the canvas audit covers them.
 */
const EXEMPT: Record<string, string> = {
  "desk-bluegrey": "办公像素风's `panel` is the window's title bar; its text sits on the canvas, where it passes.",
  "desk-steel": "Same — title-bar panel.",
  "desk-parchment": "Same — title-bar panel.",
  "wb-light": "WorkBuddy is measured from the real client (`workbuddyStyle.test.ts`). Hidden style.",
  "wb-dark": "Same.",
  "zine-butter": "Hidden style; no reader can pick it.",
};

const parse = (value: string): number[] | null => {
  const text = value.trim();
  let match = text.match(/^#([0-9a-f]{6})$/i);
  if (match) {
    const n = Number.parseInt(match[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  match = text.match(/^rgba?\(([^)]+)\)$/i);
  if (match) {
    const parts = match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  }
  return null;
};

const luminance = ([r, g, b]: number[]) => {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (fg: number[], bg: number[]) => {
  const painted = [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
  const [a, b] = [luminance(painted), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};

describe("palette text contrast", () => {
  it("keeps muted and secondary text readable on panel and inset", () => {
    const failures: string[] = [];
    for (const [id, tokens] of Object.entries(themeTokens)) {
      if (EXEMPT[id]) continue;
      const panel = parse(tokens.surface.panel);
      const inset = parse(tokens.surface.inset);
      const muted = parse(tokens.text.muted);
      const secondary = parse(tokens.text.secondary);
      if (!panel || !inset || !muted || !secondary) continue;
      const checks: [string, number, number][] = [
        ["muted on panel", contrast(muted, panel), 3.5],
        ["muted on inset", contrast(muted, inset), 3.2],
        ["secondary on panel", contrast(secondary, panel), 4.5],
      ];
      for (const [what, ratio, floor] of checks) {
        if (ratio < floor) failures.push(`${id}: ${what} ${ratio.toFixed(2)} < ${floor}`);
      }
    }
    expect(failures).toEqual([]);
  });
});
