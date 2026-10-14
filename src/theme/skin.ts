import {
  atlasThemePresetIds,
  gameThemePresetIds,
  handdrawnThemePresetIds,
  inkwashThemePresetIds,
  isThemePresetId,
  minimalThemePresetIds,
  nativeThemePresetIds,
  pixeldeskThemePresetIds,
  pixelThemePresetIds,
  retroThemePresetIds,
  studioThemePresetIds,
  techThemePresetIds,
  workbuddyThemePresetIds,
  zineThemePresetIds,
  type ThemePresetId,
  type ThemeTokens,
} from "./themeTokens";

/**
 * Skin identity lives in the theme layer so schema can depend on it without a
 * cycle. `SkinFamily` is the same union as `PresetStyleId`; keep both names —
 * family is the skin-module term, stylePreset is the CSS/export mirror.
 */
export const skinFamilies = [
  /**
   * No style at all — the state the configurator opens in.
   *
   * Deliberately has no `app.css` branch, which is the whole point: components
   * added while this is selected render in the base stylesheet, so "no style
   * chosen yet" looks like what it is, and picking any real style afterwards is
   * a visible change. It also has no kit, so it is the only entry in the picker
   * that leaves the canvas empty.
   */
  "blank",
  "native",
  "illustrated",
  "studio",
  "workbuddy",
  "zine",
  "game",
  "pixel",
  "retro",
  "handdrawn",
  "inkwash",
  /**
   * 90s desktop software, not a game.
   *
   * Distinct from `pixel`, which is a pixel *game* — bricks, sprites, a mascot.
   * This one is the era's office software: a blue-grey chrome column, a warm
   * white document area, navy hairlines, bevelled controls and hard offset
   * shadows with no blur in them anywhere. Same bitmap face and the same
   * pixelarticons set, because those are the parts of "pixel" that are about
   * resolution rather than about play.
   */
  "pixeldesk",
  /**
   * Black ink on white, with the weight in the type and the geometry.
   *
   * Appended rather than inserted: `styleKitIndex` numbers the non-blank styles
   * by position, so slipping one into the middle shifts every later style's
   * default component picks.
   */
  "tech",
] as const;
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

/**
 * The family each variant was drawn for — the style whose picker offers it.
 *
 * Was a two-way split (native or illustrated) when only those two had their own
 * colourways; every style has its own set now. 空白 and 漫画风 are never inferred:
 * 空白 borrows 原生风's palette, and 漫画风 keeps whichever variant it is given.
 * The atlas palettes are colour-only and travel with 原生风's look.
 */
const FAMILY_BY_PRESET = new Map<ThemePresetId, Exclude<SkinFamily, "blank">>([
  ...nativeThemePresetIds.map((id) => [id, "native"] as const),
  ...atlasThemePresetIds.map((id) => [id, "native"] as const),
  ...minimalThemePresetIds.map((id) => [id, "illustrated"] as const),
  ...studioThemePresetIds.map((id) => [id, "studio"] as const),
  ...workbuddyThemePresetIds.map((id) => [id, "workbuddy"] as const),
  ...zineThemePresetIds.map((id) => [id, "zine"] as const),
  ...gameThemePresetIds.map((id) => [id, "game"] as const),
  ...pixelThemePresetIds.map((id) => [id, "pixel"] as const),
  ...retroThemePresetIds.map((id) => [id, "retro"] as const),
  ...handdrawnThemePresetIds.map((id) => [id, "handdrawn"] as const),
  ...inkwashThemePresetIds.map((id) => [id, "inkwash"] as const),
  ...pixeldeskThemePresetIds.map((id) => [id, "pixeldesk"] as const),
  ...techThemePresetIds.map((id) => [id, "tech"] as const),
]);

/** Variant's natural family. Unlisted variants fall back to 原生风. */
export function familyForPreset(variant: ThemePresetId): Exclude<SkinFamily, "blank"> {
  return FAMILY_BY_PRESET.get(variant) ?? "native";
}
