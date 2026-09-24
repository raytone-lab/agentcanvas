import { makeSkinId, type SkinDefinition, type SkinFamily, type SkinId, type SkinRecipe } from "./skin";
import { minimalThemePresetIds, nativeThemePresetIds, themeTokens, type ThemePresetId } from "./themeTokens";

/** Configurator chrome stays on a neutral illustrated scheme, never the preview accent. */
export const CHROME_SKIN_ID: SkinId = "illustrated/polar-mono";

export const DEFAULT_SKIN_BY_FAMILY: Record<SkinFamily, SkinId | null> = {
  native: "native/soft-glass",
  illustrated: "illustrated/ice-white",
  studio: null,
};

export const SKIN_AVATAR_DEFAULTS = {
  native: {
    "author.user": "blue-smile",
    "author.agent": "orange-blob",
  },
  illustrated: {
    "author.user": "user",
    "author.agent": "orange-blob",
  },
  studio: {
    "author.user": "user",
    "author.agent": "bot",
  },
} as const satisfies Record<SkinFamily, SkinRecipe["avatars"]>;

export function defaultSkinForFamily(family: SkinFamily): SkinId | null {
  return DEFAULT_SKIN_BY_FAMILY[family];
}

function defineSkin(family: Exclude<SkinFamily, "studio">, variant: ThemePresetId): SkinDefinition {
  return {
    id: makeSkinId(family, variant),
    family,
    variant,
    tokens: themeTokens[variant],
    recipe: { avatars: { ...SKIN_AVATAR_DEFAULTS[family] } },
  };
}

export const CANONICAL_SKINS: readonly SkinDefinition[] = [
  ...nativeThemePresetIds.map((variant) => defineSkin("native", variant)),
  ...minimalThemePresetIds.map((variant) => defineSkin("illustrated", variant)),
];

export const SKIN_REGISTRY: Readonly<Record<string, SkinDefinition>> = Object.fromEntries(
  CANONICAL_SKINS.map((skin) => [skin.id, skin]),
);
