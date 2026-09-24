import { isThemePresetId, nativeThemePresetIds, type ThemePresetId, type ThemeTokens } from "./themeTokens";

/**
 * Skin identity lives in the theme layer so schema can depend on it without a
 * cycle. `SkinFamily` is the same union as `PresetStyleId`; keep both names —
 * family is the skin-module term, stylePreset is the CSS/export mirror.
 */
export const skinFamilies = ["native", "illustrated", "studio"] as const;
export type SkinFamily = (typeof skinFamilies)[number];

export type SkinId = `${SkinFamily}/${ThemePresetId}`;

export type SkinRecipe = {
  avatars: {
    "author.user": string;
    "author.agent": string;
  };
};

/** Packaged visual identity: tokens (variant) + recipe (family). */
export type SkinDefinition = {
  id: SkinId;
  family: SkinFamily;
  variant: ThemePresetId;
  tokens: ThemeTokens;
  recipe: SkinRecipe;
};

const nativePresetSet = new Set<ThemePresetId>(nativeThemePresetIds);

export function isSkinFamily(value: string): value is SkinFamily {
  return (skinFamilies as readonly string[]).includes(value);
}

export function makeSkinId(family: SkinFamily, variant: ThemePresetId): SkinId {
  return `${family}/${variant}`;
}

export function parseSkinId(skinId: string): { family: SkinFamily; variant: ThemePresetId } | null {
  const slash = skinId.indexOf("/");
  if (slash <= 0 || slash !== skinId.lastIndexOf("/")) return null;
  const family = skinId.slice(0, slash);
  const variant = skinId.slice(slash + 1);
  if (!isSkinFamily(family) || !isThemePresetId(variant)) return null;
  return { family, variant };
}

export function isSkinId(value: string): value is SkinId {
  return parseSkinId(value) !== null;
}

/** Variant's natural family. Studio is never inferred from a token set. */
export function familyForPreset(variant: ThemePresetId): Exclude<SkinFamily, "studio"> {
  return nativePresetSet.has(variant) ? "native" : "illustrated";
}
