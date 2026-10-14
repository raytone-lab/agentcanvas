import { familyForPreset, makeSkinId, type SkinDefinition, type SkinFamily, type SkinId, type SkinRecipe } from "./skin";
import { themeTokens, type ThemePresetId } from "./themeTokens";

/** Configurator chrome stays on a neutral illustrated scheme, never the preview accent. */
export const CHROME_SKIN_ID: SkinId = "illustrated/polar-mono";

/**
 * Each style's opening colourway — the one 应用 lands on when the card's own
 * selection is not passed in.
 *
 * Every family has one now. 漫画风 used to answer `null` ("keep whatever variant
 * is current"), from when it had no palettes of its own; it has four, and
 * keeping the previous style's variant put another style's tokens under its ink.
 */
export const DEFAULT_SKIN_BY_FAMILY: Record<SkinFamily, SkinId | null> = {
  // No style, so no style's palette — the one the empty project already
  // carries. `null` would leave the previous style's theme on an unstyled canvas.
  blank: "blank/soft-glass",
  native: "native/soft-glass",
  illustrated: "illustrated/ice-white",
  studio: "studio/studio-grape",
  workbuddy: "workbuddy/wb-light",
  zine: "zine/zine-butter",
  game: "game/game-campfire",
  pixel: "pixel/pixel-overworld",
  retro: "retro/retro-paper",
  handdrawn: "handdrawn/sketch-grid",
  inkwash: "inkwash/ink-rice",
  pixeldesk: "pixeldesk/desk-bluegrey",
  /* Glacier, the default set. The original black-on-white one is `tech-paper`. */
  tech: "tech/tech-glacier",
};

/**
 * The reader's four, the same in every style.
 *
 * Every style used to pick its own reader avatars, which made the reader's side
 * a second mascot slot. Those characters moved to the agent's gallery in the
 * style they were drawn for; the reader gets four plain people and an upload
 * tile (`UPLOADED_AVATAR_ID`, which the gallery adds itself).
 */
export const DEFAULT_USER_AVATAR_IDS = ["default-sky", "default-sage", "default-apricot", "default-ink"] as const;

const DEFAULT_USER_AVATAR = DEFAULT_USER_AVATAR_IDS[0];

/**
 * The skin recipe's avatars: which face each style opens on.
 *
 * Owned here so a skin is one packaged identity (tokens + recipe), and
 * re-exported as `STYLE_AVATAR_DEFAULTS` from `presetRailData` for the
 * configurator's callers.
 */
export const SKIN_AVATAR_DEFAULTS = {
  // 原生风's, because 空白 wears 原生风's looks (`visualStylePreset`). Both
  // avatar slots start switched off, so this is what the reader gets the moment
  // they turn one on.
  blank: { "author.user": DEFAULT_USER_AVATAR, "author.agent": "orange-blob" },
  native: { "author.user": DEFAULT_USER_AVATAR, "author.agent": "orange-blob" },
  illustrated: { "author.user": DEFAULT_USER_AVATAR, "author.agent": "orange-blob" },
  studio: { "author.user": DEFAULT_USER_AVATAR, "author.agent": "bot" },
  // A machine rather than a creature: the style's own signature is the
  // monospace section label, and a rounded mascot beside it would argue with it.
  zine: { "author.user": DEFAULT_USER_AVATAR, "author.agent": "bot" },
  game: { "author.user": DEFAULT_USER_AVATAR, "author.agent": "game-orb-bot" },
  // Its own sprites, drawn on the same 16-cell grid as the style's bricks and coins.
  pixel: { "author.user": DEFAULT_USER_AVATAR, "author.agent": "pixel-mushroom" },
  /* Office software had no mascot. The plainest agent glyph the registry has,
     which in this style renders through pixelarticons like everything else. */
  pixeldesk: { "author.user": DEFAULT_USER_AVATAR, "author.agent": "bot" },
  retro: { "author.user": DEFAULT_USER_AVATAR, "author.agent": "bot" },
  handdrawn: { "author.user": DEFAULT_USER_AVATAR, "author.agent": "sketch-bot-classic" },
  /* The supplied plates: a painted robot head for the agent, in the same ink
     as everything else. */
  inkwash: { "author.user": DEFAULT_USER_AVATAR, "author.agent": "ink-bot-leaf" },
  // The client shows no avatar on either side; the workbuddy stylesheet hides
  // the avatar slots outright, so this is the plainest agent glyph.
  workbuddy: { "author.user": DEFAULT_USER_AVATAR, "author.agent": "bot" },
  /* A moulded shell with an LED matrix for a face is the register the rest of
     the style is already in, and `robot-heads` draws one. */
  tech: { "author.user": DEFAULT_USER_AVATAR, "author.agent": "robot-head-tv" },
} as const satisfies Record<SkinFamily, SkinRecipe["avatars"]>;

export function defaultSkinForFamily(family: SkinFamily): SkinId | null {
  return DEFAULT_SKIN_BY_FAMILY[family];
}

function defineSkin(family: SkinFamily, variant: ThemePresetId): SkinDefinition {
  return {
    id: makeSkinId(family, variant),
    family,
    variant,
    tokens: themeTokens[variant],
    recipe: { avatars: { ...SKIN_AVATAR_DEFAULTS[family] } },
  };
}

/**
 * One canonical skin per variant, under the family it was drawn for, plus 空白's
 * borrowed 原生风 palette. Cross-family ids still resolve — `resolveSkin`
 * composes them — they are just not listed here.
 */
export const CANONICAL_SKINS: readonly SkinDefinition[] = [
  ...(Object.keys(themeTokens) as ThemePresetId[]).map((variant) => defineSkin(familyForPreset(variant), variant)),
  defineSkin("blank", "soft-glass"),
];

export const SKIN_REGISTRY: Readonly<Record<string, SkinDefinition>> = Object.fromEntries(
  CANONICAL_SKINS.map((skin) => [skin.id, skin]),
);
