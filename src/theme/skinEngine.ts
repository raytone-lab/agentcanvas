/**
 * SkinEngine — resolve a SkinModule id to tokens + recipe, then paint CSS variables.
 *
 * `applyTheme` remains the token-writing primitive. This module is the only apply
 * path for configurator chrome/preview (`applyWorkspaceSkins`) and the exported
 * shell (`applySkin`). Project writes go through `withProjectSkin` so `skinId`,
 * `stylePreset`, and `preset` stay one identity.
 */
import { applyTheme } from "./applyTheme";
import { resolveThemeTokens, type ThemeColorOverrides } from "./customTheme";
import { makeSkinId, parseSkinId, type SkinDefinition, type SkinId, type SkinRecipe } from "./skin";
import { CHROME_SKIN_ID, DEFAULT_SKIN_BY_FAMILY, SKIN_AVATAR_DEFAULTS, SKIN_REGISTRY } from "./skinRegistry";
import { themeTokens, type ThemePresetId } from "./themeTokens";

export type SkinThemeFields = {
  preset: ThemePresetId;
  stylePreset: SkinDefinition["family"];
  skinId: SkinId;
};

function composeSkin(family: SkinDefinition["family"], variant: ThemePresetId): SkinDefinition {
  const id = makeSkinId(family, variant);
  const registered = SKIN_REGISTRY[id];
  if (registered) return registered;
  return {
    id,
    family,
    variant,
    tokens: themeTokens[variant],
    recipe: { avatars: { ...SKIN_AVATAR_DEFAULTS[family] } },
  };
}

/**
 * Resolve a skin id to tokens + recipe. Never throws: unknown ids fall back to
 * the native default. Cross-family ids (e.g. `illustrated/soft-glass`) keep the
 * requested family recipe and the variant's token set.
 */
export function resolveSkin(skinId: string): SkinDefinition {
  const parsed = parseSkinId(skinId);
  if (!parsed) return SKIN_REGISTRY[DEFAULT_SKIN_BY_FAMILY.native!] ?? composeSkin("native", "soft-glass");
  return composeSkin(parsed.family, parsed.variant);
}

export function applySkinTokens(tokens: SkinDefinition["tokens"], root: HTMLElement = document.documentElement): void {
  applyTheme(tokens, root);
}

/**
 * Paint a skin. `colorOverrides` are the reader's own repaints from the
 * configurator (`theme.colorOverrides`); they ride on top of the variant's
 * tokens so the canvas and the exported shell show the same colours.
 */
export function applySkin(
  skinId: string,
  root: HTMLElement = document.documentElement,
  colorOverrides?: ThemeColorOverrides,
): SkinDefinition {
  const skin = resolveSkin(skinId);
  applySkinTokens(colorOverrides ? resolveThemeTokens(skin.variant, colorOverrides) : skin.tokens, root);
  return skin;
}

/** Builder-only: chrome stays polar-mono; preview tokens land on the surface root. */
export function applyWorkspaceSkins(options: {
  previewSkinId: string;
  chromeRoot?: HTMLElement;
  previewRoot?: HTMLElement | null;
  /** The reader's repaints, preview only — the chrome never takes them. */
  colorOverrides?: ThemeColorOverrides;
}): { chrome: SkinDefinition; preview: SkinDefinition } {
  const chrome = applySkin(CHROME_SKIN_ID, options.chromeRoot ?? document.documentElement);
  const preview = resolveSkin(options.previewSkinId);
  if (options.previewRoot) {
    applySkinTokens(
      options.colorOverrides ? resolveThemeTokens(preview.variant, options.colorOverrides) : preview.tokens,
      options.previewRoot,
    );
  }
  return { chrome, preview };
}

/** Apply the skin recipe (avatars today). Slots live outside theme, so this is a callback. */
export function applySkinRecipe(
  skinId: string,
  apply: (slot: keyof SkinRecipe["avatars"], optionId: string) => void,
): SkinRecipe {
  const recipe = resolveSkin(skinId).recipe;
  apply("author.user", recipe.avatars["author.user"]);
  apply("author.agent", recipe.avatars["author.agent"]);
  return recipe;
}

/** Keep `skinId` / `stylePreset` / `preset` as one identity. */
export function withProjectSkin<P extends { theme: SkinThemeFields }>(project: P, skinId: string): P {
  const skin = resolveSkin(skinId);
  return {
    ...project,
    theme: {
      ...project.theme,
      skinId: skin.id,
      stylePreset: skin.family,
      preset: skin.variant,
    },
  };
}

/**
 * Re-derive `skinId` from `stylePreset` + `preset`, the two fields every
 * configurator write actually changes.
 *
 * The invariant `withProjectSkin` keeps is "one identity", and `assertValidProject`
 * rejects a project that breaks it. Enforcing it at each call site means every
 * future theme write has to remember, and a forgotten one paints the wrong palette
 * with no error until export. So the project's single update path (`App`) and the
 * export path run every project through this instead: whatever wrote the theme,
 * the id that leaves is the one the two fields describe.
 */
export function withSyncedSkinId<P extends { theme: SkinThemeFields }>(project: P): P {
  const expected = makeSkinId(project.theme.stylePreset, project.theme.preset);
  if (project.theme.skinId === expected) return project;
  return { ...project, theme: { ...project.theme, skinId: expected } };
}
