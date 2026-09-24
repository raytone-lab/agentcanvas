/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";

import { familyForPreset, isSkinId, makeSkinId, parseSkinId } from "./skin";
import { applySkin, applySkinRecipe, applySkinTokens, applyWorkspaceSkins, resolveSkin, withProjectSkin } from "./skinEngine";
import { CANONICAL_SKINS, CHROME_SKIN_ID, DEFAULT_SKIN_BY_FAMILY, SKIN_AVATAR_DEFAULTS, SKIN_REGISTRY } from "./skinRegistry";
import { themeTokens } from "./themeTokens";

describe("skin identity", () => {
  it("round-trips family and variant", () => {
    expect(makeSkinId("native", "soft-glass")).toBe("native/soft-glass");
    expect(parseSkinId("illustrated/polar-mono")).toEqual({ family: "illustrated", variant: "polar-mono" });
    expect(parseSkinId("studio/sand-workspace")).toEqual({ family: "studio", variant: "sand-workspace" });
    expect(isSkinId("native/soft-glass")).toBe(true);
    expect(parseSkinId("native")).toBeNull();
    expect(parseSkinId("native/not-a-theme")).toBeNull();
    expect(parseSkinId("native/soft-glass/extra")).toBeNull();
  });

  it("maps token variants to their natural family", () => {
    expect(familyForPreset("soft-glass")).toBe("native");
    expect(familyForPreset("apricot-agent")).toBe("native");
    expect(familyForPreset("ice-white")).toBe("illustrated");
    expect(familyForPreset("polar-mono")).toBe("illustrated");
  });
});

describe("skin registry", () => {
  it("registers twelve canonical family/variant pairs", () => {
    expect(CANONICAL_SKINS).toHaveLength(12);
    expect(Object.keys(SKIN_REGISTRY)).toHaveLength(12);
    expect(SKIN_REGISTRY["native/soft-glass"]?.tokens).toBe(themeTokens["soft-glass"]);
    expect(SKIN_REGISTRY["illustrated/ice-white"]?.recipe.avatars).toEqual(SKIN_AVATAR_DEFAULTS.illustrated);
    expect(SKIN_REGISTRY[CHROME_SKIN_ID]?.variant).toBe("polar-mono");
    expect(DEFAULT_SKIN_BY_FAMILY.native).toBe("native/soft-glass");
    expect(DEFAULT_SKIN_BY_FAMILY.illustrated).toBe("illustrated/ice-white");
    expect(DEFAULT_SKIN_BY_FAMILY.studio).toBeNull();
  });
});

describe("skin engine", () => {
  it("resolves canonical skins from the registry", () => {
    const skin = resolveSkin("native/sand-workspace");
    expect(skin.id).toBe("native/sand-workspace");
    expect(skin.family).toBe("native");
    expect(skin.variant).toBe("sand-workspace");
    expect(skin.tokens).toBe(themeTokens["sand-workspace"]);
    expect(skin.recipe.avatars).toEqual(SKIN_AVATAR_DEFAULTS.native);
  });

  it("keeps cross-family ids without throwing: tokens from variant, recipe from family", () => {
    const skin = resolveSkin("illustrated/soft-glass");
    expect(skin.id).toBe("illustrated/soft-glass");
    expect(skin.family).toBe("illustrated");
    expect(skin.variant).toBe("soft-glass");
    expect(skin.tokens).toBe(themeTokens["soft-glass"]);
    expect(skin.recipe.avatars).toEqual(SKIN_AVATAR_DEFAULTS.illustrated);
    expect(SKIN_REGISTRY[skin.id]).toBeUndefined();
  });

  it("falls back to the native default for unknown ids", () => {
    expect(resolveSkin("").id).toBe("native/soft-glass");
    expect(resolveSkin("not-a-skin").id).toBe("native/soft-glass");
  });

  it("writes the same CSS variables applyTheme would", () => {
    const root = document.createElement("div");
    applySkinTokens(themeTokens["apricot-agent"], root);
    expect(root.style.getPropertyValue("--accent")).toBe(themeTokens["apricot-agent"].accent.action);
    expect(root.style.getPropertyValue("--surface-canvas")).toBe(themeTokens["apricot-agent"].surface.canvas);
  });

  it("applies chrome tokens to documentElement and preview tokens to the surface", () => {
    const preview = document.createElement("div");
    applyWorkspaceSkins({
      previewSkinId: "native/apricot-agent",
      previewRoot: preview,
    });
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe(themeTokens["polar-mono"].accent.action);
    expect(preview.style.getPropertyValue("--accent")).toBe(themeTokens["apricot-agent"].accent.action);
  });

  it("applySkin paints a single root from a skin id", () => {
    const root = document.createElement("div");
    const skin = applySkin("illustrated/mist-blue", root);
    expect(skin.variant).toBe("mist-blue");
    expect(root.style.getPropertyValue("--accent")).toBe(themeTokens["mist-blue"].accent.action);
  });

  it("withProjectSkin keeps skinId, stylePreset, and preset in lockstep", () => {
    const project = {
      theme: {
        skinId: "native/soft-glass" as const,
        stylePreset: "native" as const,
        preset: "soft-glass" as const,
        density: "compact" as const,
      },
    };
    const next = withProjectSkin(project, "illustrated/ice-white");
    expect(next.theme).toEqual({
      skinId: "illustrated/ice-white",
      stylePreset: "illustrated",
      preset: "ice-white",
      density: "compact",
    });
    const studio = withProjectSkin(project, "studio/warm-graphite");
    expect(studio.theme.skinId).toBe("studio/warm-graphite");
    expect(studio.theme.stylePreset).toBe("studio");
    expect(studio.theme.preset).toBe("warm-graphite");
  });

  it("applySkinRecipe writes family avatars through the callback", () => {
    const slots: Record<string, string> = {};
    const recipe = applySkinRecipe("illustrated/ice-white", (slot, optionId) => {
      slots[slot] = optionId;
    });
    expect(recipe.avatars).toEqual(SKIN_AVATAR_DEFAULTS.illustrated);
    expect(slots).toEqual(SKIN_AVATAR_DEFAULTS.illustrated);
  });
});
