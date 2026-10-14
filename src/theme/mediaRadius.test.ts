import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * The output panel's media surfaces round to the style's own corner.
 *
 * They used to round to `clamp(28px, 7%, 64px)` — a literal in
 * `ImageGeneration.module.css`, which is the interesting part: a CSS module
 * cannot see which style it is rendering inside, so every style got the same
 * 28px pillow while an image loaded. 像素风 rounds nothing at all and 复古风
 * rounds at 8px. Reported directly, for the right panel, in every style.
 *
 * `--preview-media-radius` is declared per style on `.preview-frame`; custom
 * properties inherit, so the module reads it without learning about styles.
 * Measured live afterwards — 24 / 10 / 8.171 / 12 / 14px across the five
 * pickable styles.
 */
const APP_CSS = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");
const MODULE_CSS = readFileSync(
  new URL("../components/agent-preview/ImageGeneration.module.css", import.meta.url),
  "utf8",
);

/** Comments stripped: the notes here quote the literals they replaced. */
const strip = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "));

type Decl = { line: number; selector: string; value: string };

/**
 * The last compound selector of each comma-separated part — "what this rule
 * actually styles", not "what it is nested under".
 *
 * Needed because the first version matched the whole selector text, so
 * `.audio-output-preview[data-media-style="spectrum"] .waveform-skeleton span`
 * counted as a media surface and reported its 3px bars as an offence. Those
 * bars are inside a loader; the surface is the box around them.
 */
const subjects = (selector: string) =>
  selector.split(",").map((part) => part.trim().split(/\s+|>/).filter(Boolean).pop() ?? "");

function radiiOn(css: string, matches: RegExp): Decl[] {
  const out: Decl[] = [];
  const clean = strip(css);
  for (const rule of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = rule[1].replace(/\s+/g, " ").trim();
    if (!subjects(selector).some((subject) => matches.test(subject))) continue;
    for (const decl of rule[2].matchAll(/(?:^|;|\s)border-radius\s*:\s*([^;]+)/g)) {
      out.push({
        line: clean.slice(0, rule.index).split("\n").length,
        selector,
        value: decl[1].trim(),
      });
    }
  }
  return out;
}

/**
 * The surfaces this covers: the loader, the frame it develops inside, the
 * revealed image, the host box, and the audio/video players beside them.
 *
 * `999px` and percentages are left alone — those are the dots, blobs and bars
 * *inside* a loader, which are round because they are round, not because the
 * surface has a corner.
 */
const MEDIA_SURFACES =
  /\.(media-reveal-frame|media-reveal-loading|media-reveal-image|media-player-video|media-audio-inline-reveal|media-video-inline-reveal|media-audio-output-reveal|media-video-output-reveal|image-output-preview|audio-output-preview|video-output-preview)\b/;

/*
 * A dot, a blob or a bar inside a loader: round because it is round, not
 * because a surface has a corner.
 *
 * Anchored, and that matters — the first version tested `/%/` unanchored, which
 * matched the `7%` inside `clamp(28px, 7%, 64px)` and so quietly excused every
 * value this file exists to check. The test passed on zero declarations.
 */
const isShapeNotSurface = (v: string) => /^999px$|^\d+(?:\.\d+)?%$/.test(v);

describe("output panel media radius", () => {
  it("is a token on every media surface in app.css", () => {
    const literals = radiiOn(APP_CSS, MEDIA_SURFACES)
      // A style may still point the surface at its own scale directly, which is
      // what 无障碍风 does with `--minimal-radius-*`; what it may not do is
      // write a number.
      .filter((decl) => !decl.value.startsWith("var("))
      .filter((decl) => decl.value !== "inherit" && !decl.value.startsWith("inherit"))
      .filter((decl) => !isShapeNotSurface(decl.value))
      .map((decl) => `${decl.line}: ${decl.value}  ${decl.selector.slice(-70)}`);

    expect(literals).toEqual([]);
  });

  it("is a token in the loader module too", () => {
    /*
     * The module is where the bug lived, and it is the one file in this chain
     * that renders *outside* the canvas as well — the landing page and the
     * option-card previews, neither of which has a style to follow. So every
     * radius here reads the token with the old literal as its fallback.
     */
    const surfaces = radiiOn(MODULE_CSS, /Wrap|Reveal|igCanvas/)
      .filter((decl) => decl.value !== "inherit" && !decl.value.startsWith("inherit"))
      .filter((decl) => !isShapeNotSurface(decl.value));

    expect(surfaces.length, "loader surfaces found").toBeGreaterThanOrEqual(6);
    const literals = surfaces
      .filter((decl) => !decl.value.includes("--preview-media-radius"))
      .map((decl) => `${decl.line}: ${decl.value}`);

    expect(literals).toEqual([]);
  });

  it("gives every style a value from its own radius scale", () => {
    // Declared once in the shared block, reading the tier eight styles already
    // share, plus the three that keep their scale under another name.
    expect(APP_CSS).toContain("--preview-media-radius: var(--fn-r-xl);");
    for (const [preset, token] of [
      ["native", "--nr-4"],
      ["illustrated", "--minimal-radius-xl"],
      ["retro", "--retro-round"],
    ] as const) {
      const branch = new RegExp(
        `\\[data-style-preset="${preset}"\\]\\s*\\{[^}]*--preview-media-radius:\\s*var\\(${token}\\)`,
      );
      expect(strip(APP_CSS), `${preset} → ${token}`).toMatch(branch);
    }
  });
});
