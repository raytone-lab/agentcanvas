import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { CODICON_BY_LUCIDE } from "./uiIcons";

/**
 * `codiconSlots.ts` covers the semantic event-stream icons; this module covers
 * the chrome around them — sidebar buttons, composer toolbar, permission menu,
 * output tabs. Getting one of the two and not the other is what produced an
 * interface that was half filled glyphs and half stroked outlines.
 */
const codiconCss = readFileSync(
  new URL("../../node_modules/@vscode/codicons/dist/codicon.css", import.meta.url),
  "utf8",
);

const availableGlyphs = new Set(
  [...codiconCss.matchAll(/\.codicon-([\w-]+):before/g)].map((m) => m[1]),
);

const PREVIEW_DIRS = [
  new URL("../components/agent-preview/", import.meta.url),
  new URL("../components/agent-preview/chatframe/", import.meta.url),
  new URL("../components/agent-preview/outputframe/", import.meta.url),
];

function previewSources(): { path: string; source: string }[] {
  return PREVIEW_DIRS.flatMap((dir) =>
    readdirSync(dir)
      .filter((name) => name.endsWith(".tsx") && !name.includes(".test."))
      .map((name) => ({ path: name, source: readFileSync(new URL(name, dir), "utf8") })),
  );
}

describe("chrome icon set", () => {
  it("names only glyphs that exist", () => {
    const unknown = Object.entries(CODICON_BY_LUCIDE)
      .filter(([, glyph]) => glyph && !availableGlyphs.has(glyph))
      .map(([name, glyph]) => `${name} -> ${glyph}`);

    expect(unknown).toEqual([]);
  });

  it("leaves no preview component importing lucide directly", () => {
    // A component that still imports "lucide-react" renders an outline icon
    // beside the glyphs, which is exactly the mismatch this module exists to
    // remove — and it is invisible in a diff, so it gets a test.
    const offenders = previewSources()
      .filter(({ source }) => /from "lucide-react"/.test(source))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("covers every icon those components import", () => {
    // The module re-exports an explicit list rather than proxying all of lucide,
    // so an icon added at a call site would fail to resolve. This catches it as
    // a missing mapping first, which is the more useful error.
    const imported = new Set<string>();
    for (const { source } of previewSources()) {
      const match = source.match(/import\s*\{([^}]+)\}\s*from\s*"[^"]*agentmatrix\/uiIcons"/);
      if (!match) continue;
      for (const entry of match[1].split(",")) {
        const name = entry.trim().split(/\s+as\s+/)[0].trim();
        if (name) imported.add(name);
      }
    }

    expect(imported.size).toBeGreaterThan(20);
    const unmapped = [...imported].filter((name) => !CODICON_BY_LUCIDE[name]);
    expect(unmapped).toEqual([]);
  });

  it("gives the permission options three different glyphs", () => {
    // These three sit in one menu ("请求权限 / 替我批准 / 全部允许"). Mapping two
    // of them to `shield` left the first two rows visually identical, which
    // reads as a rendering bug rather than a choice.
    const glyphs = ["ShieldCheck", "ShieldHalf", "ShieldOff"].map((n) => CODICON_BY_LUCIDE[n]);

    expect(glyphs.every(Boolean)).toBe(true);
    expect(new Set(glyphs).size).toBe(3);
  });
});
