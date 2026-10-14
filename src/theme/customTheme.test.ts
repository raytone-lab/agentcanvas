import { describe, expect, it } from "vitest";

import { contrastRatio, normalizeHex, resolveThemeTokens } from "./customTheme";
import { themeTokens } from "./themeTokens";

describe("repainted colourways", () => {
  it("is the preset itself until something is changed", () => {
    expect(resolveThemeTokens("soft-glass")).toBe(themeTokens["soft-glass"]);
    expect(resolveThemeTokens("soft-glass", { "soft-glass": {} })).toBe(themeTokens["soft-glass"]);
  });

  it("re-derives only what hangs off the colour that moved", () => {
    const preset = themeTokens["soft-glass"];
    const next = resolveThemeTokens("soft-glass", { "soft-glass": { accent: "#7c3aed" } });
    expect(next.accent.action).toBe("#7c3aed");
    // The accent's own family follows it…
    expect(next.accent.hover).not.toBe(preset.accent.hover);
    expect(next.accent.soft).not.toBe(preset.accent.soft);
    // …and type on it is whichever of white and the ink reads better.
    expect(contrastRatio(next.accent.action, next.text.inverse)).toBeGreaterThan(4.5);
    // Everything else is the preset's, untouched.
    expect(next.surface).toEqual(preset.surface);
    expect(next.text.primary).toBe(preset.text.primary);
    expect(next.border).toEqual(preset.border);
  });

  it("moves the surfaces with the panel and the ink", () => {
    const next = resolveThemeTokens("soft-glass", { "soft-glass": { panel: "#fff7ed" } });
    expect(next.surface.panel).toBe("#fff7ed");
    expect(next.surface.hover).not.toBe(themeTokens["soft-glass"].surface.hover);
    expect(next.accent.action).toBe(themeTokens["soft-glass"].accent.action);
  });

  it("ignores what is not a colour", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("7c3aed")).toBe("#7c3aed");
    expect(normalizeHex("blue")).toBeUndefined();
    const next = resolveThemeTokens("soft-glass", { "soft-glass": { accent: "not-a-colour" } });
    expect(next.accent.action).toBe(themeTokens["soft-glass"].accent.action);
  });

  it("travels with the export", async () => {
    const { createScaffoldExportSnapshot } = await import("../export/scaffoldManifest");
    const { defaultCodingAgentProject } = await import("../schema/agentuxConfig");
    const project = {
      ...defaultCodingAgentProject,
      theme: { ...defaultCodingAgentProject.theme, colorOverrides: { "soft-glass": { accent: "#7c3aed" } } },
    };
    const snapshot = createScaffoldExportSnapshot(project);
    expect(snapshot.files).toContain("src/theme/customTheme.ts");
    // Painted through the skin engine, which lays the repaints over the variant.
    expect(snapshot.fileContents["src/agent-shell.tsx"]).toContain(
      "applySkin(project.theme.skinId, document.documentElement, project.theme.colorOverrides)",
    );
    expect(snapshot.fileContents["src/theme/skinEngine.ts"]).toContain("resolveThemeTokens(skin.variant, colorOverrides)");
    expect(JSON.stringify(snapshot.fileContents)).toContain("#7c3aed");
  });
});
