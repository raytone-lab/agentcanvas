export type ThemeTokens = {
  id: ThemePresetId;
  name: string;
  /** Drives the preview's light/dark chrome (data-appearance). */
  appearance: "dark" | "light";
  font: {
    ui: string;
    display: string;
    mono: string;
  };
  surface: {
    canvas: string;
    panel: string;
    raised: string;
    inset: string;
    hover: string;
    disabled: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  border: {
    subtle: string;
    strong: string;
  };
  accent: {
    action: string;
    hover: string;
    soft: string;
  };
  status: {
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
};

export type ThemePresetId =
  // Native (原生风) — warm / saturated
  | "warm-graphite"
  | "cocoa-system"
  | "forest-ember"
  | "soft-glass"
  | "sand-workspace"
  | "apricot-agent"
  // Minimal (极简风) — cool / austere
  | "cold-mono"
  | "slate-blue"
  | "cyan-grid"
  | "ice-white"
  | "mist-blue"
  | "polar-mono"
  // WorkBuddy — values lifted from the shipped client, see WORKBUDDY_* below
  | "wb-light"
  | "wb-dark"
  // Atlas (设计语言) — ten design languages picked for mutual distance, see
  // ATLAS_* below
  | "swiss-international"
  | "editorial-press"
  | "clay-pastel"
  | "marble-gold"
  | "wabi-sabi"
  | "dev-terminal"
  | "scifi-hud"
  | "oled-black"
  | "arcade-crt"
  | "brutalist-concrete"
  // Studio (插画风) — see STUDIO_* below
  | "studio-grape"
  | "studio-citrus"
  | "studio-cobalt"
  | "studio-ink"
  // Zine (牛皮纸) — see ZINE_* below
  | "zine-butter"
  // Game (游戏风) — see GAME_* below
  | "game-campfire"
  | "game-moonlit"
  | "game-scriptorium"
  | "game-emberfall"
  // Pixel (像素风) — see PIXEL_* below
  | "pixel-overworld"
  | "pixel-slate"
  | "pixel-gameboy"
  | "pixel-amber"
  | "retro-paper"
  | "retro-linen"
  | "retro-sepia"
  | "retro-dusk"
  // Handdrawn (手绘风)
  | "sketch-paper"
  | "sketch-grid"
  | "sketch-kraft"
  | "sketch-slate"
  // 水墨风 (Ink Wash)
  | "ink-rice"
  | "ink-mist"
  | "ink-tea"
  | "ink-night"
  // 科技风 (Tech)
  | "tech-glacier"
  | "tech-steel"
  | "tech-paper"
  | "tech-deep"
  // Pixel Desk (复古像素风) — 90s office software, not a game
  | "desk-bluegrey"
  | "desk-steel"
  | "desk-parchment"
  | "desk-night";

/** Theme ids grouped by the visual style that offers them (light schemes first). */
export const nativeThemePresetIds: readonly ThemePresetId[] = [
  "soft-glass",
  "sand-workspace",
  "apricot-agent",
  "warm-graphite",
  "cocoa-system",
  "forest-ember",
];

export const minimalThemePresetIds: readonly ThemePresetId[] = [
  "ice-white",
  "mist-blue",
  "polar-mono",
  "cold-mono",
  "slate-blue",
  "cyan-grid",
];

/**
 * Two, not six: the WorkBuddy client ships one palette per appearance, and
 * inventing four more tints would put colors on screen that WorkBuddy does not
 * have. The rail renders however many a style declares.
 */
export const workbuddyThemePresetIds: readonly ThemePresetId[] = ["wb-light", "wb-dark"];

/**
 * One, not six: the palette is transcribed from a single reference screenshot
 * (a casual-game result screen), and inventing five more tints would put
 * colours on screen the reference does not have — the same reasoning
 * `workbuddyThemePresetIds` gives for shipping two. The rail renders however
 * many a style declares.
 */
export const studioThemePresetIds: readonly ThemePresetId[] = [
  "studio-grape",
  "studio-citrus",
  "studio-cobalt",
  "studio-ink",
];

/** One scheme: the style is hidden from the picker, so it has no second palette. */
export const zineThemePresetIds: readonly ThemePresetId[] = ["zine-butter"];

/**
 * Four rooms, one construction.
 *
 * What stays fixed across a style's palettes is the *construction* — the gold
 * hairline and its corner ornaments, the banner, the vignette, the serif, the
 * parchment turn. What varies is the material and the light it is in. So these
 * are the same hall by firelight, by moonlight, on a scribe's desk, and with
 * the fire too high.
 */
export const gameThemePresetIds: readonly ThemePresetId[] = [
  "game-campfire",
  "game-moonlit",
  "game-scriptorium",
  "game-emberfall",
];

/**
 * Four screens. Two of them monochrome, which is an option only this style has:
 * every other style needs its accent and its status colours to be told apart by
 * hue, whereas a pixel display was genuinely single-hued, so a four-tone ramp is
 * period-correct rather than a limitation. See the note on `PIXEL_GB_STATUS`
 * for the one place that cannot survive strict monochrome.
 */
export const pixelThemePresetIds: readonly ThemePresetId[] = [
  "pixel-overworld",
  "pixel-slate",
  "pixel-gameboy",
  "pixel-amber",
];

export const retroThemePresetIds: readonly ThemePresetId[] = [
  "retro-paper",
  "retro-linen",
  "retro-sepia",
  "retro-dusk",
];

/**
 * Graph Paper leads, not the cream sheet the reference was drawn on.
 *
 * Order here is the order of the cards in the rail, and the first one is also
 * what the style opens on (`defaultThemeForStyle`) — the two have to agree, or
 * the reader lands on a canvas whose card is second in the row.
 */
export const handdrawnThemePresetIds: readonly ThemePresetId[] = [
  "sketch-grid",
  "sketch-paper",
  "sketch-kraft",
  "sketch-slate",
];

/**
 * 水墨风's four papers.
 *
 * Read off the mock: rice paper the colour of unbleached pulp, ink that is
 * blue-black rather than black (the mock's darkest tone is #3A3F46, never
 * #000), and one warm red that appears exactly twice — the seal on the painting
 * and the seal by the version number. That red is the accent here; it is not a
 * button colour, and nothing else in the style is chromatic.
 *
 * `ink-night` is the dark one. Ink on paper inverted is not a dark theme, it is
 * a rubbing: the paper goes to slate and the ink to the pale wash the mist was
 * drawn in, which is what a stone rubbing looks like — the same reasoning that
 * made 手绘风's dark colourway a blackboard rather than an inverted sheet.
 */
export const inkwashThemePresetIds: readonly ThemePresetId[] = [
  "ink-rice",
  "ink-mist",
  "ink-tea",
  "ink-night",
];

/** 科技风's four sets; Glacier first because it is the default. */
export const techThemePresetIds: readonly ThemePresetId[] = [
  "tech-glacier",
  "tech-steel",
  "tech-paper",
  "tech-deep",
];

export const pixeldeskThemePresetIds: readonly ThemePresetId[] = [
  "desk-bluegrey",
  "desk-steel",
  "desk-parchment",
  "desk-night",
];

/**
 * Status colours mixed like coloured pencil, not like UI chips.
 *
 * Desaturated and a little dark, because on cream paper a saturated green is
 * the one thing on screen that did not come out of a pen. The reference has no
 * status colours of its own — it is monochrome plus one blue — so these are
 * derived in its register rather than transcribed.
 */
const SKETCH_STATUS = { success: "#5C8A5E", warning: "#C08A3E", danger: "#B5534A", info: "#6AABCF" };

/**
 * Handwriting, and the CJK fallback is the whole difficulty.
 *
 * Patrick Hand and Caveat are Latin-only. A Chinese or Japanese screen falls
 * through to whatever brush or hand face is installed — 楷体 is the closest
 * thing macOS and Windows both ship, and it is a *written* letterform rather
 * than a printed one, which is the trait that matters here. Then a generic
 * `cursive`, then sans: better a clean sans than a serif pretending to be a
 * hand.
 */
const SKETCH_HAND_CJK =
  "Kaiti, STKaiti, \"Kaiti SC\", KaiTi, \"Noto Sans CJK SC\", " +
  "\"Hiragino Maru Gothic ProN\", \"Yu Gothic\"";

/*
 * 水墨风's faces.
 *
 * The mock sets everything in a Song/Ming — the CJK equivalent of a serif, with
 * the same brush-derived stroke contrast the paintings have — and that is the
 * one typographic decision the style makes. So the stack leads with the Song
 * faces macOS and Windows both ship (Songti SC / SimSun) and falls back through
 * Noto Serif CJK to a generic serif; nothing is downloaded, because a 4MB CJK
 * webfont for a skin the reader is auditioning is the wrong trade (手绘风's two
 * Latin hand faces are 40KB each, which is why those *are* local).
 *
 * Latin runs in EB Garamond, already local for 复古风: the mock's "My Agent" is
 * a light serif italic, and Garamond's italic is the closest thing in the
 * project to a brush-written Latin line.
 */
const INK_SONG_CJK = '"Songti SC", "Song", SimSun, "Noto Serif CJK SC", "Source Han Serif SC"';

const INK_FONT: ThemeTokens["font"] = {
  ui: `"EB Garamond", ${INK_SONG_CJK}, ui-serif, Georgia, serif`,
  display: `"EB Garamond", ${INK_SONG_CJK}, ui-serif, Georgia, serif`,
  mono: "\"SFMono-Regular\", Menlo, Consolas, monospace",
};

/**
 * 科技风's type: one grotesk, and a mono that is actually used.
 *
 * Inter for everything read as language and a mono for everything read as a
 * value — a path, a count, a duration. That split is the closest thing this
 * style has to ornament: it has no borders to speak of, no texture and one
 * accent, so what tells the reader "this is a machine's output" is that the
 * numbers are monospaced.
 *
 * System-first, no web font to pack: this style's character is in the geometry
 * and the weight, not in a typeface nobody would name. `-apple-system` is the
 * grotesk on the platform this is built on, and the CJK fallbacks are the same
 * ones the base stack uses.
 */
const TECH_FONT: ThemeTokens["font"] = {
  ui: `Inter, -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", ui-sans-serif, sans-serif`,
  display: `Inter, -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", ui-sans-serif, sans-serif`,
  mono: `"SFMono-Regular", "JetBrains Mono", Menlo, Consolas, monospace`,
};

const SKETCH_FONT: ThemeTokens["font"] = {
  ui: `"Patrick Hand", ${SKETCH_HAND_CJK}, cursive, ui-sans-serif, sans-serif`,
  // Caveat is the more written of the two, so it takes the titles.
  display: `Caveat, "Patrick Hand", ${SKETCH_HAND_CJK}, cursive, ui-sans-serif, sans-serif`,
  // Code stays mono for the same reason it does in every other style: columns
  // are aligned by advance width, and a hand face has none.
  mono: "\"SFMono-Regular\", Menlo, Consolas, monospace",
};

/**
 * Ten design languages from the UI atlas, ordered light-then-dark like the
 * lists above.
 *
 * Picked for distance from each other rather than for coverage of the atlas:
 * the atlas runs to several hundred entries, most of them brand references
 * whose palettes sit within a few degrees of one another, and a rail of near
 * neighbours is a rail nobody scrolls. So these five light and five dark
 * schemes were chosen to disagree on every axis the tokens can express —
 * appearance, hue family, saturation, and the character of the type.
 *
 * What the tokens *cannot* express is worth stating, because three of these
 * names promise it: `ThemeTokens` carries colour, type and appearance and
 * nothing else. Claymorphism is soft geometry and doubled shadows,
 * brutalism is hairline-free slabs and Sci-Fi HUD is glow — none of which is a
 * custom property here. These are those languages' *palettes and type*, which
 * is the part this system can honestly carry, and the rest would need the
 * geometry and motion tokens the style presets own.
 */
export const atlasThemePresetIds: readonly ThemePresetId[] = [
  "swiss-international",
  "editorial-press",
  "clay-pastel",
  "marble-gold",
  "wabi-sabi",
  "dev-terminal",
  "scifi-hud",
  "oled-black",
  "arcade-crt",
  "brutalist-concrete",
];

// Fonts are constant per style — only colors vary between the schemes within a
// style. Native keeps the IBM Plex stack, Minimal keeps the Inter stack (i.e.
// the fonts the previous default theme of each style already used).
const NATIVE_FONT: ThemeTokens["font"] = {
  ui: "\"IBM Plex Sans\", \"Aptos\", ui-sans-serif, system-ui, sans-serif",
  display: "\"IBM Plex Sans Condensed\", \"Aptos Display\", ui-sans-serif, system-ui, sans-serif",
  mono: "\"IBM Plex Mono\", \"SFMono-Regular\", Consolas, monospace",
};

const MINIMAL_FONT: ThemeTokens["font"] = {
  ui: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  display: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  mono: "\"SFMono-Regular\", Consolas, \"Liberation Mono\", monospace",
};

// Verbatim `--cb-font-family` / `--cb-font-family-mono` from the client.
const WORKBUDDY_FONT: ThemeTokens["font"] = {
  ui: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Roboto\", \"Oxygen\", \"Ubuntu\", \"Cantarell\", \"Fira Sans\", \"Droid Sans\", \"Helvetica Neue\", sans-serif",
  display: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Roboto\", \"Oxygen\", \"Ubuntu\", \"Cantarell\", \"Fira Sans\", \"Droid Sans\", \"Helvetica Neue\", sans-serif",
  mono: "\"Menlo\", \"Monaco\", \"Courier New\", monospace",
};

/*
 * Atlas type. Each stack names the family the design language actually calls
 * for and then falls back through what a browser is likely to have — the same
 * convention `NATIVE_FONT` and `MINIMAL_FONT` already follow, since this repo
 * loads no webfaces for them either (only codicon, at the top of app.css). So
 * the first name is the intent and the chain is what gets painted; the
 * distinction between these stacks survives the fallback either way, because
 * they fall back to different *categories* — grotesque, serif, rounded, mono —
 * rather than to one system default.
 */
const ATLAS_GROTESQUE: ThemeTokens["font"] = {
  ui: "\"Helvetica Neue\", Helvetica, Arial, ui-sans-serif, system-ui, sans-serif",
  display: "\"Helvetica Neue\", Helvetica, Arial, ui-sans-serif, system-ui, sans-serif",
  mono: "\"SFMono-Regular\", Menlo, Consolas, monospace",
};

const ATLAS_SERIF: ThemeTokens["font"] = {
  ui: "\"Iowan Old Style\", Georgia, \"Times New Roman\", Times, serif",
  display: "\"Playfair Display\", \"Iowan Old Style\", Georgia, \"Times New Roman\", serif",
  mono: "\"SFMono-Regular\", Menlo, Consolas, monospace",
};

const ATLAS_ROUNDED: ThemeTokens["font"] = {
  ui: "\"Avenir Next Rounded\", \"Avenir Next\", Nunito, \"Segoe UI\", ui-rounded, system-ui, sans-serif",
  display: "\"Avenir Next Rounded\", \"Avenir Next\", Nunito, ui-rounded, system-ui, sans-serif",
  mono: "\"SFMono-Regular\", Menlo, Consolas, monospace",
};

const ATLAS_HUMANIST: ThemeTokens["font"] = {
  ui: "Optima, \"Gill Sans\", \"Hiragino Kaku Gothic ProN\", \"Yu Gothic\", ui-sans-serif, sans-serif",
  display: "\"Hiragino Mincho ProN\", \"Yu Mincho\", Optima, Georgia, serif",
  mono: "\"SFMono-Regular\", Menlo, Consolas, monospace",
};

/**
 * Mono everywhere, UI included — a terminal has one typeface, and letting the
 * body text fall back to a proportional sans is most of what makes a "terminal
 * theme" read as a dark blue-grey theme instead.
 */
const ATLAS_MONO: ThemeTokens["font"] = {
  ui: "\"SFMono-Regular\", \"JetBrains Mono\", Menlo, Consolas, \"Liberation Mono\", monospace",
  display: "\"SFMono-Regular\", \"JetBrains Mono\", Menlo, Consolas, \"Liberation Mono\", monospace",
  mono: "\"SFMono-Regular\", \"JetBrains Mono\", Menlo, Consolas, \"Liberation Mono\", monospace",
};

const ATLAS_TECH: ThemeTokens["font"] = {
  ui: "\"Eurostile\", \"Bank Gothic\", \"Roboto Condensed\", \"Arial Narrow\", ui-sans-serif, sans-serif",
  display: "\"Eurostile\", \"Bank Gothic\", \"Roboto Condensed\", \"Arial Narrow\", ui-sans-serif, sans-serif",
  mono: "\"SFMono-Regular\", Menlo, Consolas, monospace",
};

/**
 * Status ramps for the two schemes whose whole identity is their signal colour.
 *
 * The rule in this file is one shared ramp per appearance, and it is the right
 * default — status colour is semantic and not derivable from an accent. These
 * two earn an exception the same way WorkBuddy does: a phosphor terminal that
 * reports success in `#7FC8A0` sage is not a phosphor terminal, and a CRT
 * cabinet has no muted colours at all.
 */
const TERMINAL_STATUS = { success: "#3FD46B", warning: "#D4C23F", danger: "#FF5F56", info: "#3FD4C2" };
const ARCADE_STATUS = { success: "#3BF5B0", warning: "#FFD400", danger: "#FF2E88", info: "#2EE6FF" };

/**
 * Studio type: rounded and heavy.
 *
 * The reference draws every label in a heavy rounded face, and weight is half
 * of what makes it read as illustrated rather than as a purple dark theme — so
 * the style's CSS branch also raises `font-weight` across the frame, which is
 * the part a font stack cannot carry. Chinese comes first in the chain on
 * purpose: the reference is a Chinese-language screen, and a Latin rounded face
 * with a Song fallback for 中文 would land nowhere near it.
 */
/*
 * Comic type. Outfit leads, and only for Latin.
 *
 * Outfit is a Latin-only geometric sans — its cmap stops at the Alphabetic
 * Presentation Forms and contains no CJK — so it is named *first* and the
 * Chinese and Japanese faces sit behind it. A font stack resolves per character,
 * so Latin takes Outfit and 汉字 / かな fall through to PingFang and Hiragino
 * untouched. Naming it alone would have left the Chinese text, which is most of
 * this interface, on the browser's last-resort face.
 *
 * It is a variable font (`wght` 100–900), which is what this style needs: its
 * CSS branch asks for 450 body, 500 headings and 800 for the wordmark, and a
 * static family would have had the browser synthesise two of those three by
 * smearing. The `@font-face` in app.css declares the range so the axis is
 * driven rather than faked — and it has to, because the file's own default
 * instance is 100 (Thin) and text would otherwise render hairline.
 */
const STUDIO_FONT: ThemeTokens["font"] = {
  ui: "Outfit, \"Avenir Next Rounded\", \"Avenir Next\", Nunito, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", ui-rounded, system-ui, sans-serif",
  display: "Outfit, \"Avenir Next Rounded\", \"Avenir Next\", Nunito, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", ui-rounded, system-ui, sans-serif",
  mono: "\"SFMono-Regular\", Menlo, Consolas, monospace",
};

/**
 * The reference's own signal colours, which are not `DARK_STATUS`.
 *
 * Read off the buttons: the mint replay button is success, the yellow banner is
 * warning/primary, the violet back button is info. Nothing in that screen is
 * desaturated, so the shared dark ramp — sage, ochre, brick — would have been
 * the one part of the palette that did not come from the reference.
 */
const STUDIO_STATUS = { success: "#4ECDA4", warning: "#FFD426", danger: "#FF6B8A", info: "#9E6EF8" };

/**
 * Zine type. The signature is that `display` is not `ui`.
 *
 * Body text is a plain grotesque; the *section labels* are monospace, and
 * `--font-display` reaches exactly those (`.frame-header h2`,
 * `.utility-header h3`, `.debug-header h3` — the only three rules that read
 * it). So setting it to a mono stack makes every panel title monospace with no
 * per-component rule, and the style's CSS branch only has to add the uppercase
 * and the tracking.
 *
 * No custom status ramp: unlike Developer Terminal or Arcade CRT, whose whole
 * identity is their signal colour, this scheme's only signal is the pink, and
 * the reference's online dots are an ordinary green. `LIGHT_STATUS` is right
 * here and inventing a ramp would be inventing.
 */
const ZINE_FONT: ThemeTokens["font"] = {
  ui: "\"Neue Haas Grotesk\", Inter, \"Helvetica Neue\", ui-sans-serif, system-ui, sans-serif",
  display: "\"JetBrains Mono\", \"SFMono-Regular\", Menlo, Consolas, \"Liberation Mono\", monospace",
  mono: "\"JetBrains Mono\", \"SFMono-Regular\", Menlo, Consolas, \"Liberation Mono\", monospace",
};

/**
 * Kraft's own ramp. Earned the same way Developer Terminal's is: the whole
 * identity of this scheme is that everything on screen is paper and ink, and
 * `LIGHT_STATUS`'s `#2E6FB0` info blue is the single value that would announce
 * it is not. So the ramp goes to pigments — olive, ochre, stamp red, and a
 * faded indigo that reads as an ink pad rather than as a hyperlink.
 */
const ZINE_STATUS = { success: "#6B8E4E", warning: "#C8901F", danger: "#B5462F", info: "#6B7F8E" };

/*
 * Game type: serif everywhere, in all three languages.
 *
 * `ui` was a sans with CJK *gothic* fallbacks, so only the titles were ever set
 * in a book face — which meant that in Chinese and Japanese, the language the
 * reference is actually written in, the body text was the one thing still
 * reading as a dashboard.
 *
 * How the stacks are ordered matters more than what is in them, because a
 * browser resolves a font stack **per character**, not per string. So each
 * stack names a Latin serif first — Latin glyphs take it — and the CJK serifs
 * behind it pick up 汉字 and かな. Putting a CJK family first instead would hand
 * Latin text to that family's own Latin glyphs, which in Songti and Mincho are
 * an afterthought.
 *
 * Simplified Chinese leads the CJK section because the reference is a
 * Chinese-language screen; the style's CSS branch reorders it under `:lang(ja)`
 * so Japanese kanji get Mincho's regional forms rather than Song's. Several
 * hundred kanji are drawn differently in the two traditions, and a Japanese
 * reader sees Chinese forms as a wrong font, not as a serif.
 *
 * `mono` stays monospace. Code and diffs are aligned by advance width, and a
 * proportional serif would break the columns — that is a legibility
 * requirement rather than a style choice, so "serif everywhere" stops here.
 */
const GAME_SERIF_CJK =
  "\"Songti SC\", STSong, SimSun, \"Noto Serif SC\", \"Source Han Serif SC\", " +
  "\"Songti TC\", \"Noto Serif TC\", " +
  "\"Hiragino Mincho ProN\", \"Yu Mincho\", YuMincho, \"Noto Serif JP\", \"Source Han Serif JP\"";

const GAME_FONT: ThemeTokens["font"] = {
  // A text serif for body copy: Georgia holds up at small sizes where a display
  // face turns spindly.
  //
  // Stays a serif, and that is a decision against the reference. The design this
  // style was rebuilt from sets Inter for body copy — but "serif for English,
  // Chinese and Japanese alike" was asked for directly, and a sans body would
  // undo it. So the reference's type is taken where it does not collide: its
  // display face, below.
  ui: `"Iowan Old Style", Georgia, "Times New Roman", Times, ${GAME_SERIF_CJK}, serif`,
  /*
   * Cinzel leads, from the reference.
   *
   * It is a Roman-inscriptional capital face and it is the whole voice of those
   * titles — Cormorant behind it is the nearest thing already installed, and
   * Georgia the guaranteed one. Cinzel has no CJK glyphs, so Chinese and
   * Japanese titles fall through to the serif stack automatically: the resolution
   * is per character, not per string.
   */
  display: `"Cinzel", "Cormorant Garamond", "Iowan Old Style", Georgia, ${GAME_SERIF_CJK}, serif`,
  mono: "\"SFMono-Regular\", Menlo, Consolas, monospace",
};

const RETRO_FONT: ThemeTokens["font"] = {
  ui: '"EB Garamond", "Songti SC", "Noto Serif CJK SC", Georgia, serif',
  display: '"EB Garamond", "Songti SC", "Noto Serif CJK SC", Georgia, serif',
  mono: '"SFMono-Regular", Menlo, Consolas, monospace',
};

/**
 * The reference's own ramp, and the one place it breaks its own warmth on
 * purpose: `info` is a cool blue, which is the colour it gives the single
 * clickable link in a screen where gold means *ornament*. Keeping it is the
 * whole point — recolouring it to gold would bury every link in the frames and
 * titles that share that hue. The rest are a hearth ramp: ember green, torch
 * orange, and a banked red.
 */
/* One green, and the CSS spends it on the send key alone — the brief asks for
   green only on the important action. The other three are the era's own
   low-saturation signal colours. */
const PIXELDESK_STATUS = { success: "#3F9E52", warning: "#C08A2E", danger: "#B4483C", info: "#5B8FD0" };

const GAME_STATUS = { success: "#4CAF6D", warning: "#E8862E", danger: "#D0503C", info: "#6BA8E5" };

/**
 * Pixel type: monospace for body text too, not only for code.
 *
 * That is the whole decision. A pixel style whose prose is set in a
 * proportional sans is a dark slate theme with a monospace code block in it, so
 * `ui` and `display` both go to the mono stack — the opposite arrangement from
 * Zine (where only `display` is mono) and Game (where `display` is a serif).
 *
 * The face is Ark Pixel 12px (方舟像素字体), vendored as a woff2 and declared in
 * the style's CSS branch — a genuine pan-CJK bitmap face, so the Chinese text
 * that makes up most of this interface is pixellated too. A Latin pixel font
 * with a proportional CJK fallback would have left it smooth, which is worse
 * than using none at all.
 *
 * Named *before* the mono stack rather than instead of it: the font is 93%
 * complete over GB2312, so a missing glyph has to land on a monospace fallback
 * of the same advance width, not on a proportional sans.
 *
 * Its design size is 12px, and the style's CSS pins text to that. A bitmap face
 * scaled to 13px or 15px is resampled and blurs, which undoes the entire point.
 */
const PIXEL_STACK =
  "\"Ark Pixel 12px\", \"SFMono-Regular\", \"JetBrains Mono\", Menlo, Consolas, \"Liberation Mono\", monospace";

const PIXEL_FONT: ThemeTokens["font"] = {
  ui: PIXEL_STACK,
  display: PIXEL_STACK,
  mono: PIXEL_STACK,
};

/**
 * Phosphor and lilac, from the reference. Earns its own ramp the same way
 * Developer Terminal does: the accent *is* the success colour here, and a
 * separate sage green beside it would read as two greens rather than one
 * signal.
 */
const PIXEL_STATUS = { success: "#7CE38B", warning: "#E8C86A", danger: "#FF6E6E", info: "#D89BF5" };

/**
 * Game Boy's ramp, and the one honest deviation in it.
 *
 * The hardware palette is four tones of one olive green and nothing else, which
 * is period-correct and unusable for one specific job: a four-tone monochrome
 * cannot distinguish "finished" from "failed" except by brightness, and
 * brightness is already carrying the surface hierarchy. An error the reader
 * cannot see is worse than a palette that is not strictly authentic, so
 * `danger` is the single licensed departure — everything else stays on the
 * ramp.
 */
const PIXEL_GB_STATUS = { success: "#9BBC0F", warning: "#D6C020", danger: "#C2452F", info: "#8BAC0F" };

/** Same trade as the Game Boy ramp: amber throughout, with danger allowed off it. */
const PIXEL_AMBER_STATUS = { success: "#C8D45A", warning: "#FFB84D", danger: "#FF6B4A", info: "#FFD9A0" };


/**
 * Moonlit inverts the base's trick rather than dropping it.
 *
 * `game-campfire` makes `info` a cool blue because it is the only cool value in
 * a warm room — that is what stops a link disappearing into the gold ornament it
 * sits beside. Under moonlight the whole room is cool, so the blue would be the
 * thing that blends in; `info` goes *warm* to keep the same contrast working in
 * the opposite direction.
 */
const GAME_MOONLIT_STATUS = { success: "#72C79A", warning: "#E8C86A", danger: "#D9707A", info: "#E0885C" };

const GAME_SCRIPT_STATUS = { success: "#5E7A3E", warning: "#B8860B", danger: "#9C3B28", info: "#3A5A7A" };

/** Warm room, so the cool blue still earns its place as the only cold value. */
const GAME_EMBER_STATUS = { success: "#7FA86A", warning: "#E8A23E", danger: "#E04A32", info: "#6BA8E5" };

/**
 * WorkBuddy's own status ramp, which is not `LIGHT_STATUS`/`DARK_STATUS`.
 * `--cb-success` / `--cb-green-color` / `--cb-error` / `--cb-text-link`.
 */
const WORKBUDDY_STATUS = { success: "#10b981", warning: "#00b96b", danger: "#ef4444", info: "#006ab1" };

// Status colors are semantic (not derivable from a single accent), so they use
// one shared ramp per appearance.
const DARK_STATUS = { success: "#7FC8A0", warning: "#DDB25A", danger: "#E8837A", info: "#7FB2E8" };
const LIGHT_STATUS = { success: "#2E9E6E", warning: "#B37518", danger: "#C24436", info: "#2E6FB0" };

/** Seed colors supplied per scheme; every other token is derived from these. */
type Seed = { canvas: string; panel: string; inset: string; accent: string };

const mix = (a: string, pct: number, b: string) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;

function darkScheme(id: ThemePresetId, name: string, font: ThemeTokens["font"], s: Seed): ThemeTokens {
  const { canvas: C, panel: P, inset: I, accent: A } = s;
  return {
    id,
    name,
    appearance: "dark",
    font,
    surface: {
      canvas: C,
      panel: P,
      raised: mix(P, 72, I),
      inset: I,
      hover: mix(I, 85, "#fff"),
      disabled: mix(I, 68, "#fff"),
    },
    text: {
      primary: mix("#fff", 92, C),
      secondary: mix("#fff", 68, C),
      muted: mix("#fff", 52, C),
      inverse: mix(C, 72, "#000"),
    },
    border: {
      subtle: mix(P, 82, "#fff"),
      strong: mix(P, 62, "#fff"),
    },
    accent: {
      action: A,
      hover: mix(A, 82, "#fff"),
      soft: mix(A, 18, P),
    },
    status: { ...DARK_STATUS },
  };
}

function lightScheme(id: ThemePresetId, name: string, font: ThemeTokens["font"], s: Seed): ThemeTokens {
  const { canvas: C, panel: P, inset: I, accent: A } = s;
  return {
    id,
    name,
    appearance: "light",
    font,
    surface: {
      canvas: C,
      panel: P,
      raised: mix(P, 78, C),
      inset: I,
      hover: mix(I, 90, "#000"),
      disabled: mix(I, 70, "#000"),
    },
    text: {
      primary: mix("#000", 88, C),
      secondary: mix("#000", 64, C),
      muted: mix("#000", 55, C),
      inverse: mix("#fff", 96, C),
    },
    border: {
      subtle: mix(I, 90, "#000"),
      strong: mix(I, 72, "#000"),
    },
    accent: {
      action: A,
      hover: mix(A, 85, "#000"),
      soft: mix(A, 14, P),
    },
    status: { ...LIGHT_STATUS },
  };
}

export const themeTokens: Record<ThemeTokens["id"], ThemeTokens> = {
  "retro-paper": {
    id: "retro-paper",
    name: "Retro Paper",
    appearance: "light",
    font: RETRO_FONT,
    surface: {
      canvas: "#F8F5EF",
      panel: "#FBF9F5",
      raised: "#FAF7F2",
      inset: "#F1EEEA",
      hover: "#E7E3DC",
      disabled: "#E0DBD1",
    },
    text: {
      primary: "#332E26",
      secondary: "#5C544A",
      muted: "#6B6359",
      inverse: "#FBF9F5",
    },
    border: {
      subtle: "rgba(178, 166, 150, 0.55)",
      strong: "rgba(173, 158, 145, 0.75)",
    },
    accent: {
      action: "#514A41",
      hover: "#332E26",
      soft: "rgba(214, 209, 201, 0.5)",
    },
    status: { success: "#536D57", warning: "#9B713B", danger: "#A64D47", info: "#636E85" },
  },
  /*
   * Three more Retro papers, so the style offers four colourways like the rest.
   *
   * All four are light, and that is a constraint rather than a taste: this
   * style's chrome is exported Figma artwork — `/retro/send-button.svg`,
   * `/retro/chevron.svg` and a dozen more — and those files bake their own dark
   * ink. On a dark canvas they would be dark-on-dark and simply vanish. Giving
   * this style a real dark colourway means converting that artwork to masks
   * first, the way 游戏风's corner ornaments were done; until then these vary
   * the paper and the ink within a range the fixed artwork survives.
   *
   * Each keeps `retro-paper`'s structure exactly — same font, same token shape,
   * same relationships — and moves the hue: linen is cooler and greyer, sepia
   * is a warmer old stock, and dusk is the darkest the artwork tolerates, a
   * blue-grey paper with near-black ink.
   */
  "retro-linen": {
    id: "retro-linen",
    name: "Retro Linen",
    appearance: "light",
    font: RETRO_FONT,
    surface: {
      canvas: "#F2F2EF",
      panel: "#F7F7F4",
      raised: "#F5F5F2",
      inset: "#EAEAE6",
      hover: "#DFDFD9",
      disabled: "#D8D8D1",
    },
    text: {
      primary: "#2B2C2A",
      secondary: "#53554F",
      muted: "#63655F",
      inverse: "#F7F7F4",
    },
    border: {
      subtle: "rgba(162, 165, 158, 0.55)",
      strong: "rgba(150, 154, 146, 0.78)",
    },
    accent: {
      action: "#474A44",
      hover: "#2B2C2A",
      soft: "rgba(205, 208, 200, 0.5)",
    },
    status: { success: "#4F6A55", warning: "#8E6C3A", danger: "#9E4A46", info: "#5C6779" },
  },
  "retro-sepia": {
    id: "retro-sepia",
    name: "Retro Sepia",
    appearance: "light",
    font: RETRO_FONT,
    surface: {
      canvas: "#F4EADA",
      panel: "#F8F0E3",
      raised: "#F6EDDE",
      inset: "#ECE0CD",
      hover: "#E2D4BE",
      disabled: "#DBCCB4",
    },
    text: {
      primary: "#3A2E21",
      secondary: "#61513E",
      muted: "#6F5F4B",
      inverse: "#F8F0E3",
    },
    border: {
      subtle: "rgba(186, 164, 130, 0.55)",
      strong: "rgba(176, 152, 118, 0.78)",
    },
    accent: {
      action: "#5A4A36",
      hover: "#3A2E21",
      soft: "rgba(220, 205, 178, 0.52)",
    },
    status: { success: "#5B6E4F", warning: "#9A6E32", danger: "#A54B42", info: "#63708A" },
  },
  "retro-dusk": {
    id: "retro-dusk",
    name: "Retro Dusk",
    appearance: "light",
    font: RETRO_FONT,
    surface: {
      canvas: "#E4E6E9",
      panel: "#EDEFF2",
      raised: "#E9EBEF",
      inset: "#DBDEE3",
      hover: "#CDD1D8",
      disabled: "#C4C9D1",
    },
    text: {
      primary: "#22262B",
      secondary: "#454B53",
      muted: "#555C66",
      inverse: "#EDEFF2",
    },
    border: {
      subtle: "rgba(140, 149, 161, 0.55)",
      strong: "rgba(126, 136, 150, 0.8)",
    },
    accent: {
      action: "#3B434D",
      hover: "#22262B",
      soft: "rgba(192, 199, 209, 0.55)",
    },
    status: { success: "#4A6A57", warning: "#8A6A36", danger: "#9C4842", info: "#566481" },
  },
  // ── Ink Wash (水墨风) ───────────────────────────────────────────────────
  "ink-rice": {
    id: "ink-rice",
    name: "Rice Paper",
    appearance: "light",
    font: INK_FONT,
    surface: {
      canvas: "#F3F0E9",
      panel: "#F7F5EF",
      raised: "#FBFAF6",
      inset: "#EAE6DD",
      hover: "#E1DCD1",
      disabled: "#D8D2C6",
    },
    text: {
      primary: "#3A3F46",
      secondary: "#5A626B",
      muted: "#6E7680",
      inverse: "#F7F5EF",
    },
    border: {
      subtle: "rgba(90, 98, 107, 0.22)",
      strong: "rgba(58, 63, 70, 0.42)",
    },
    accent: {
      /* The seal. Warm cinnabar, and the only chromatic value in the style. */
      action: "#A6483C",
      hover: "#8C3A30",
      soft: "rgba(166, 72, 60, 0.12)",
    },
    status: { success: "#4F6B58", warning: "#8C6A33", danger: "#A6483C", info: "#5A6B7A" },
  },
  "ink-mist": {
    id: "ink-mist",
    name: "Morning Mist",
    appearance: "light",
    font: INK_FONT,
    surface: {
      canvas: "#EDF0F1",
      panel: "#F4F6F7",
      raised: "#FAFBFB",
      inset: "#E3E7E9",
      hover: "#D8DDE0",
      disabled: "#CFD5D8",
    },
    text: {
      primary: "#333A42",
      secondary: "#525C66",
      muted: "#67727C",
      inverse: "#F4F6F7",
    },
    border: {
      subtle: "rgba(82, 92, 102, 0.22)",
      strong: "rgba(51, 58, 66, 0.42)",
    },
    accent: {
      action: "#9A4B44",
      hover: "#803A35",
      soft: "rgba(154, 75, 68, 0.12)",
    },
    status: { success: "#4A6A5C", warning: "#856733", danger: "#9A4B44", info: "#546A7C" },
  },
  "ink-tea": {
    id: "ink-tea",
    name: "Aged Tea",
    appearance: "light",
    font: INK_FONT,
    surface: {
      canvas: "#EDE4D4",
      panel: "#F3EBDD",
      raised: "#F8F2E8",
      inset: "#E3D8C4",
      hover: "#D9CCB4",
      disabled: "#CFC0A6",
    },
    text: {
      primary: "#3E3629",
      secondary: "#5F5442",
      muted: "#736751",
      inverse: "#F3EBDD",
    },
    border: {
      subtle: "rgba(95, 84, 66, 0.24)",
      strong: "rgba(62, 54, 41, 0.44)",
    },
    accent: {
      action: "#A24A34",
      hover: "#87392a",
      soft: "rgba(162, 74, 52, 0.12)",
    },
    status: { success: "#57694B", warning: "#8A6524", danger: "#A24A34", info: "#5B6878" },
  },
  "ink-night": {
    id: "ink-night",
    name: "Stone Rubbing",
    appearance: "dark",
    font: INK_FONT,
    surface: {
      canvas: "#1B1F24",
      panel: "#22272D",
      raised: "#2A3037",
      inset: "#171B1F",
      hover: "#333A42",
      disabled: "#2A3037",
    },
    text: {
      primary: "#E6E3DA",
      secondary: "#B9B6AC",
      muted: "#94958F",
      inverse: "#1B1F24",
    },
    border: {
      subtle: "rgba(230, 227, 218, 0.20)",
      strong: "rgba(230, 227, 218, 0.42)",
    },
    accent: {
      /* The seal keeps its warmth on slate; a brighter red would read as an
         alert rather than as cinnabar. */
      action: "#C2685A",
      hover: "#D07E6F",
      soft: "rgba(194, 104, 90, 0.16)",
    },
    status: { success: "#7FA087", warning: "#C6A15C", danger: "#C2685A", info: "#8FA3B5" },
  },
  /* ---- 科技风 -----------------------------------------------------------
     Glacier glass, read off the style's two pieces of art: the card's ice-blue
     wave and the robot-head avatars. Four sets, and the constraint they have to
     satisfy is not a preference: `stylePalettes.test.ts` wants four per style,
     four different canvas colours, at least three distinct accents between
     them, both appearances present, and one font across all four.

     - `tech-glacier` is the default: ice behind a glass sheet, one bright blue.
     - `tech-steel` takes the avatar's moulded shell, rgb(48, 80, 172), as its
       accent and the trim's steel greys for its surfaces.
     - `tech-paper` is the black-on-white set this style was first specified
       with — white sheet, #F6F6F6 rail, black accent — kept as an option.
     - `tech-deep` is the dark one: the avatar's own screen, navy with the
       LED's cool white for ink and its status cyan for the accent.

     The glass itself (the translucent sheet, the wash behind it, the top-edge
     highlight) is not a token; it lives in `app.css` under 科技风 and reads
     these colours through `color-mix`, so every set gets it. */
  "tech-glacier": {
    id: "tech-glacier",
    name: "Glacier",
    appearance: "light",
    font: TECH_FONT,
    surface: {
      /* The colour behind the sheet, so the glass has something to be over. */
      canvas: "#E3ECF7",
      panel: "#FFFFFF",
      raised: "#FFFFFF",
      inset: "#EDF3FB",
      hover: "#E3ECF8",
      disabled: "#D6E0EC",
    },
    text: { primary: "#0B1A33", secondary: "#3A4A63", muted: "#66758D", inverse: "#FFFFFF" },
    border: { subtle: "rgba(38, 88, 178, 0.14)", strong: "rgba(38, 88, 178, 0.34)" },
    accent: { action: "#2F6BFF", hover: "#1F58E6", soft: "rgba(47, 107, 255, 0.10)" },
    status: { success: "#11805B", warning: "#9A6200", danger: "#D02F3C", info: "#2F6BFF" },
  },
  "tech-steel": {
    id: "tech-steel",
    name: "Steel",
    appearance: "light",
    font: TECH_FONT,
    surface: {
      canvas: "#E4E8EF",
      panel: "#FBFCFD",
      raised: "#FFFFFF",
      inset: "#EEF1F5",
      hover: "#E4E8EF",
      disabled: "#D8DDE5",
    },
    text: { primary: "#131A2A", secondary: "#404A5C", muted: "#6B7487", inverse: "#FFFFFF" },
    border: { subtle: "rgba(70, 84, 112, 0.15)", strong: "rgba(70, 84, 112, 0.34)" },
    accent: { action: "#3050AC", hover: "#25408E", soft: "rgba(48, 80, 172, 0.10)" },
    status: { success: "#137347", warning: "#8A5A00", danger: "#C02525", info: "#3050AC" },
  },
  "tech-paper": {
    id: "tech-paper",
    name: "Paper",
    appearance: "light",
    font: TECH_FONT,
    surface: {
      /* The specified pair: the rail is #F6F6F6 and the sheet the centre and
         right panel share is white. `canvas` is the colour *behind* that sheet,
         so it is the darker of the two. */
      canvas: "#EFEFEF",
      panel: "#FFFFFF",
      raised: "#FFFFFF",
      inset: "#F6F6F6",
      hover: "#F0F0F0",
      disabled: "#E4E4E4",
    },
    text: { primary: "#000000", secondary: "#4A4A4A", muted: "#767676", inverse: "#FFFFFF" },
    border: { subtle: "rgba(0, 0, 0, 0.09)", strong: "rgba(0, 0, 0, 0.26)" },
    accent: { action: "#000000", hover: "#1A1A1A", soft: "rgba(0, 0, 0, 0.06)" },
    status: { success: "#127C3A", warning: "#8A5A00", danger: "#C02525", info: "#1B5FCC" },
  },
  /* The dark one, and the avatar is the reference rather than an inversion of
     Glacier: its face is a navy screen with cool-white LEDs and a cyan status
     light. So the ink is that white, not #FFF, and the accent is the cyan —
     which is light, so what sits on it (`inverse`) is the navy. */
  "tech-deep": {
    id: "tech-deep",
    name: "Deep",
    appearance: "dark",
    font: TECH_FONT,
    surface: {
      canvas: "#070D1A",
      panel: "#0D1628",
      raised: "#13203A",
      inset: "#0A1222",
      hover: "#1A2944",
      disabled: "#22324F",
    },
    text: { primary: "#E8F2FF", secondary: "#A9B8D0", muted: "#7B8BA7", inverse: "#04101F" },
    border: { subtle: "rgba(150, 180, 230, 0.14)", strong: "rgba(150, 180, 230, 0.32)" },
    accent: { action: "#5ADCFF", hover: "#8AE6FF", soft: "rgba(90, 220, 255, 0.14)" },
    status: { success: "#4FD18B", warning: "#E3B44F", danger: "#FF6B6B", info: "#6EA0FF" },
  },
  // ── Native (原生风) ──────────────────────────────────────────────────────
  "warm-graphite": darkScheme("warm-graphite", "Warm Graphite", NATIVE_FONT, {
    canvas: "#11100E", panel: "#1B1916", inset: "#2A251F", accent: "#D69A3A",
  }),
  "cocoa-system": darkScheme("cocoa-system", "Cocoa System", NATIVE_FONT, {
    canvas: "#130F0D", panel: "#1F1815", inset: "#2B211D", accent: "#D9826B",
  }),
  "forest-ember": darkScheme("forest-ember", "Forest Ember", NATIVE_FONT, {
    canvas: "#09110E", panel: "#121C17", inset: "#203026", accent: "#CFA85A",
  }),
  "soft-glass": {
    id: "soft-glass",
    name: "Soft Glass",
    appearance: "light",
    font: NATIVE_FONT,
    surface: {
      canvas: "#F4F6FA",
      panel: "#FFFFFF",
      raised: "#FFFFFF",
      inset: "#F4F6FA",
      hover: "#E6E9F0",
      disabled: "#BFC5D2",
    },
    text: {
      primary: "#111E36",
      secondary: mix("#111E36", 72, "#F4F6FA"),
      muted: mix("#111E36", 55, "#F4F6FA"),
      inverse: "#FFFFFF",
    },
    border: {
      subtle: "#E6E9F0",
      strong: "#E6E9F0",
    },
    accent: {
      action: "#111E36",
      hover: mix("#111E36", 86, "#000"),
      soft: mix("#111E36", 10, "#FFFFFF"),
    },
    status: { ...LIGHT_STATUS },
  },
  /*
   * 原生风's second colourway, rebuilt from Airbnb's design language — asked
   * for, with https://getdesign.md/airbnb/design-md as the reference.
   *
   * Written from Airbnb's published DLS values rather than from that page: this
   * sandbox has no network (the host resolves to 0.0.0.0 and the fetch tool is
   * blocked), so the page could not be read. Every value below is one Airbnb
   * documents — Rausch #FF385C and its #E31C5F press state, #222222 ink,
   * #717171 secondary, #DDDDDD / #EBEBEB rules, the #F7F7F7 page grey on white
   * cards, and #008A05 / #FFB400 / #C13515 / #008489 for the four states. If
   * any of them disagrees with the reference, they are one-line corrections.
   *
   * It replaced a warm clay palette ("Sand Workspace", #FFF9F2 paper with a
   * #C87330 accent). The id stays: it is named in the type union, in
   * `nativeThemePresetIds`, in `STYLE_CARD_THEMES` and in `presetCopy`, and
   * renaming it buys nothing the display name does not.
   *
   * One thing to know: #FF385C against white text is 3.37:1, below AA for body
   * copy. That is Airbnb's own choice for a button fill and it is kept here for
   * fidelity — the accent only ever carries `--text-inverse` on the send
   * control and the selected row, never a paragraph.
   */
  "sand-workspace": {
    id: "sand-workspace",
    name: "Coral Desk",
    appearance: "light",
    font: NATIVE_FONT,
    surface: {
      // The page grey, with white cards on it — the structure Airbnb uses.
      canvas: "#F7F7F7",
      panel: "#FFFFFF",
      raised: "#FFFFFF",
      inset: "#F7F7F7",
      hover: "#EBEBEB",
      disabled: "#DDDDDD",
    },
    text: {
      primary: "#222222",
      secondary: "#717171",
      // Their disabled-text grey. A literal rather than a `mix()` of the ink,
      // because these three are values Airbnb publishes, not shades derived
      // from one.
      muted: "#878787",
      inverse: "#FFFFFF",
    },
    border: {
      subtle: "#EBEBEB",
      strong: "#DDDDDD",
    },
    accent: {
      // Rausch, and the press state Airbnb pairs with it.
      action: "#FF385C",
      hover: "#E31C5F",
      soft: "#FFF0F3",
    },
    status: {
      success: "#008A05",
      warning: "#FFB400",
      danger: "#C13515",
      // Babu, their teal.
      info: "#008489",
    },
  },
  "apricot-agent": {
    id: "apricot-agent",
    name: "Tangerine Agent",
    appearance: "light",
    font: NATIVE_FONT,
    surface: {
      canvas: "#FFF7ED",
      panel: "#FFFFFF",
      raised: "#FFFFFF",
      inset: "#FFE8CC",
      hover: "#FFD1A3",
      disabled: "#E7C19A",
    },
    text: {
      primary: "#261407",
      secondary: mix("#261407", 72, "#FFF7ED"),
      muted: mix("#261407", 55, "#FFF7ED"),
      inverse: "#FFFFFF",
    },
    border: {
      subtle: "#F3D4B5",
      strong: "#E7BC90",
    },
    accent: {
      action: "#F97316",
      hover: mix("#F97316", 86, "#000"),
      soft: "#FFEDD5",
    },
    status: { ...LIGHT_STATUS },
  },

  // ── Minimal (极简风) ─────────────────────────────────────────────────────
  "cold-mono": darkScheme("cold-mono", "Cold Mono", MINIMAL_FONT, {
    canvas: "#090A0D", panel: "#101216", inset: "#1A1D23", accent: "#DDE3EA",
  }),
  "slate-blue": darkScheme("slate-blue", "Slate Blue", MINIMAL_FONT, {
    canvas: "#0B1020", panel: "#111827", inset: "#1E293B", accent: "#60A5FA",
  }),
  "cyan-grid": darkScheme("cyan-grid", "Cyan Grid", MINIMAL_FONT, {
    canvas: "#071216", panel: "#0D1B22", inset: "#142833", accent: "#22D3EE",
  }),
  "ice-white": lightScheme("ice-white", "Ice White", MINIMAL_FONT, {
    canvas: "#F7FAFC", panel: "#FFFFFF", inset: "#EEF4FA", accent: "#2563EB",
  }),
  "mist-blue": lightScheme("mist-blue", "Mist Violet", MINIMAL_FONT, {
    canvas: "#F7F2FF", panel: "#FFFFFF", inset: "#EFE7FF", accent: "#7C3AED",
  }),
  "polar-mono": lightScheme("polar-mono", "Polar Navy", MINIMAL_FONT, {
    canvas: "#FAFBFC", panel: "#FFFFFF", inset: "#EEF1F5", accent: "#172554",
  }),

  // ── WorkBuddy ───────────────────────────────────────────────────────────
  // Written out rather than seeded through lightScheme()/darkScheme() because
  // those derive every token by mixing one accent and pin the status ramp to
  // LIGHT_STATUS/DARK_STATUS. WorkBuddy's values are not derivable from each
  // other — the accent is near-black while success/active are green — so each
  // one is transcribed from the client's `--cb-*` tokens instead of guessed.
  "wb-light": {
    id: "wb-light",
    name: "WorkBuddy Light",
    appearance: "light",
    font: WORKBUDDY_FONT,
    surface: {
      canvas: "#FFFFFF",
      panel: "#FFFFFF",
      raised: "#F7F7F7",
      inset: "#F5F5F5",
      hover: "#EBEBEB",
      disabled: "#F2F2F2",
    },
    text: {
      primary: "#333333",
      secondary: "#666666",
      muted: "#808080",
      inverse: "rgba(255, 255, 255, 0.9)",
    },
    border: {
      subtle: "#EBEBEB",
      strong: "#D8DEE4",
    },
    // `--cb-send-button-loading-bg: rgba(0,0,0,0.9)` — the near-black send
    // button is the only strong accent surface in the light client.
    accent: {
      action: "rgba(0, 0, 0, 0.9)",
      hover: "#000000",
      soft: "#F2F2F2",
    },
    status: { ...WORKBUDDY_STATUS },
  },
  "wb-dark": {
    id: "wb-dark",
    name: "WorkBuddy Dark",
    appearance: "dark",
    font: WORKBUDDY_FONT,
    surface: {
      canvas: "#101114",
      panel: "#212234",
      raised: "#313248",
      inset: "#17191D",
      hover: "#272C34",
      disabled: "#343841",
    },
    text: {
      primary: "#D2D3E0",
      secondary: "#858699",
      muted: "#A0A0A0",
      inverse: "#101114",
    },
    border: {
      subtle: "rgba(255, 255, 255, 0.08)",
      strong: "#4C4F6B",
    },
    accent: {
      action: "rgba(255, 255, 255, 0.9)",
      hover: "#FFFFFF",
      soft: "#313248",
    },
    status: { ...WORKBUDDY_STATUS },
  },

  // ── Atlas (设计语言) ─────────────────────────────────────────────────────
  // Seeded through lightScheme()/darkScheme() wherever the derivation tells the
  // truth about the language, and overridden by name where it does not. The
  // seed is four colours — canvas, panel, inset, accent — and everything else
  // is mixed from them, which is exactly right for a scheme built on one signal
  // colour over neutrals, and wrong for one whose whole point is that its
  // signal colours are loud (see TERMINAL_STATUS / ARCADE_STATUS).

  /** Pure white, one signal red, and a grotesque. The grid is not ours to set. */
  "swiss-international": lightScheme("swiss-international", "Swiss International", ATLAS_GROTESQUE, {
    canvas: "#FFFFFF", panel: "#FFFFFF", inset: "#F2F2F2", accent: "#ED1C24",
  }),
  /** Newsprint cream, ink black, vermilion — the magazine, not the website. */
  "editorial-press": lightScheme("editorial-press", "Editorial Press", ATLAS_SERIF, {
    canvas: "#F7F3E8", panel: "#FFFDF7", inset: "#EFE9DA", accent: "#C1272D",
  }),
  /** Pastel lavender and peach. The soft geometry is the style presets' to give. */
  "clay-pastel": lightScheme("clay-pastel", "Claymorphism", ATLAS_ROUNDED, {
    canvas: "#F0EBFF", panel: "#FBF9FF", inset: "#E4DCFA", accent: "#FF8FA3",
  }),
  /** Off-white stone and antique gold, set in a serif. */
  "marble-gold": lightScheme("marble-gold", "Marble Luxury", ATLAS_SERIF, {
    canvas: "#FAF8F3", panel: "#FFFFFF", inset: "#F0ECE2", accent: "#B08D57",
  }),
  /** Warm greige and moss — the muted, imperfect, deliberately quiet one. */
  "wabi-sabi": lightScheme("wabi-sabi", "Wabi-Sabi", ATLAS_HUMANIST, {
    canvas: "#EDE8E0", panel: "#F6F2EB", inset: "#E0D9CD", accent: "#6B7256",
  }),

  /** Phosphor green on near-black, mono throughout. */
  "dev-terminal": {
    ...darkScheme("dev-terminal", "Developer Terminal", ATLAS_MONO, {
      canvas: "#0A0E0A", panel: "#0F150F", inset: "#162016", accent: "#3FD46B",
    }),
    status: { ...TERMINAL_STATUS },
  },
  /** Deep instrument navy with a cyan trace. */
  "scifi-hud": darkScheme("scifi-hud", "Sci-Fi HUD", ATLAS_TECH, {
    canvas: "#04141C", panel: "#08202C", inset: "#0D2F3E", accent: "#2EE6FF",
  }),
  /**
   * True black, not near-black. Panel and inset stay within a couple of steps
   * of it on purpose: the point of an OLED scheme is that unlit pixels stay
   * unlit, and a #121212 "dark" panel is the thing it is reacting against.
   */
  "oled-black": darkScheme("oled-black", "OLED True Black", ATLAS_GROTESQUE, {
    canvas: "#000000", panel: "#050505", inset: "#0D0D0D", accent: "#FFFFFF",
  }),
  /** Cabinet black under magenta and cyan. No muted colours anywhere. */
  "arcade-crt": {
    ...darkScheme("arcade-crt", "Arcade CRT", ATLAS_MONO, {
      canvas: "#120018", panel: "#1C0526", inset: "#2B0C38", accent: "#FF2E88",
    }),
    status: { ...ARCADE_STATUS },
  },
  /** Raw concrete and safety yellow, set in mono. */
  "brutalist-concrete": darkScheme("brutalist-concrete", "Brutalist Concrete", ATLAS_MONO, {
    canvas: "#1C1C1A", panel: "#252523", inset: "#333331", accent: "#E8FF3F",
  }),

  // ── Studio (插画风) ──────────────────────────────────────────────────────
  /**
   * Grape Arcade — transcribed from `Frame 60.png`, not seeded.
   *
   * Spec: docs/STUDIO_ILLUSTRATED_SPEC.md.
   *
   * Neither `lightScheme()` nor `darkScheme()` can express this. Both derive
   * `border` by mixing a surface toward white or black, which gives the
   * hairline a conventional theme wants; here the border is the *outline* an
   * illustrated UI is drawn with — pure black on every surface, with weight
   * rather than lightness carrying the hierarchy. Both also pin the status ramp
   * to a desaturated set, and nothing in the reference is desaturated (see
   * STUDIO_STATUS). So every token is written out.
   *
   * Light, not dark: the reference's centre column is near-white and the violet
   * lives in the two side columns, which have no token slot and are set in the
   * style's CSS branch instead (`--studio-sidebar-fill` / `--studio-panel-fill`
   * in app.css). An earlier pass built this from a different reference — a
   * casual-game result screen — and came out dark purple, which is why the
   * appearance flipped.
   */
  "studio-grape": {
    id: "studio-grape",
    name: "Grape Arcade",
    appearance: "light",
    font: STUDIO_FONT,
    surface: {
      // The centre column, and the white of everything drawn on it. The two
      // violet columns are not here — see the note above.
      canvas: "#F6F2FF",
      panel: "#FFFFFF",
      raised: "#FFFFFF",
      inset: "#EFE8FE",
      hover: "#E4D9FD",
      disabled: "#D9D0E8",
    },
    text: {
      // One ink. This style draws in black and asks its hierarchy of size and
      // weight rather than of colour — a second text hue beside a pure-black
      // outline reads as a different product's text. `secondary` used to be a
      // violet and `muted` a lighter one, which is why the sidebar's rows and
      // its date headings came out tinted instead of black.
      primary: "#000000",
      secondary: "#000000",
      // The one exception, and only so a placeholder is not mistaken for
      // content: still black, lifted off the page.
      muted: "rgba(0, 0, 0, 0.55)",
      // Also black. `--text-inverse` paints on an accent surface, and this
      // accent is a yellow chip whose glyph is ink — there is no light-on-dark
      // pairing anywhere in this language.
      inverse: "#000000",
    },
    // Pure black, both of them. Not a near-black, not a tint, and not two
    // different values: the language draws one ink line, and the style's CSS
    // branch varies its *weight* (--studio-edge / --studio-edge-chip).
    border: {
      subtle: "#000000",
      strong: "#000000",
    },
    accent: {
      action: "#FFD426",
      hover: "#FFDE5C",
      soft: "#CBB2FA",
    },
    status: { ...STUDIO_STATUS },
  },

  // ── Zine (牛皮纸) ────────────────────────────────────────────────────────
  /**
   * Kraft Scrapbook — a brown board with cream paper torn and laid on it.
   *
   * A first pass at this style read a different reference (a flat, hairline,
   * near-white zine layout) and produced what was essentially the Illustrated
   * style with thinner lines: white surfaces, pure black boxes, no depth. The
   * reference this is built from is a scrapbook sheet, where nothing is
   * outlined at all — a piece of paper is told apart from the board behind it
   * by its *colour, its shadow and its torn edge*, which is a completely
   * different construction from a stroked box.
   *
   * That is why `border.subtle` is nearly invisible here rather than black. The
   * components ask for a border in places this style would rather not draw one,
   * so the token answers with the faint warm crease of a paper edge; the style
   * branch in app.css removes it outright where it can and supplies the torn
   * silhouette instead.
   */
  "zine-butter": {
    id: "zine-butter",
    name: "Kraft Scrapbook",
    appearance: "light",
    font: ZINE_FONT,
    surface: {
      // The board, then the paper. `canvas` is the kraft brown everything is
      // laid on — it is the one surface that is not paper, and getting it wrong
      // (it was #FAFAF7) is most of what made the first pass read as white.
      canvas: "#A67C52",
      panel: "#F8E8C0",
      raised: "#FCF3DC",
      inset: "#EFD9A8",
      hover: "#F2DFB0",
      disabled: "#D8C49A",
    },
    text: {
      // Ink, not black: brown-black is what a pen leaves on this paper, and
      // true #000 on cream is the other half of why the first pass looked
      // like a wireframe.
      primary: "#3E2C18",
      secondary: "#6B5233",
      muted: "#907650",
      inverse: "#FCF3DC",
    },
    // A crease, not a line. See the note above.
    border: {
      subtle: "rgba(62, 44, 24, 0.10)",
      strong: "rgba(62, 44, 24, 0.18)",
    },
    // Aged masking tape, which is the only "button" a scrapbook has.
    accent: {
      action: "#D9A03C",
      hover: "#E5AF4E",
      soft: "#F2DFB0",
    },
    status: { ...ZINE_STATUS },
  },

  // ── Game (游戏风) ────────────────────────────────────────────────────────
  /**
   * Keep of Embers: near-black stone, gold filigree, one cold blue light.
   *
   * Transcribed from the design's own values rather than tuned by eye — the
   * whole palette is thirteen literals in its `@theme` block, so guessing would
   * only introduce drift. Named for the keep because the sidebar ends in one.
   *
   * Three things are load-bearing and easy to "tidy" wrongly:
   *
   * `raised` is blue, not a lighter grey. The design separates a surface from
   * the panel behind it by *temperature* rather than by lightness, which is what
   * keeps a near-black screen legible without a single light grey in it.
   *
   * `canvas` is darker than `panel`, the opposite way round from the light
   * schemes. The room is the dark thing; the panels sit on it and catch light.
   *
   * `border.subtle` and `border.strong` are deliberately *different*, unlike
   * Studio's and Zine's. This style draws two kinds of line — a faint gold seam
   * between structural areas, and the full gold hairline that frames a card —
   * and the second is a feature, so it gets its own token rather than a width
   * override in CSS.
   *
   * The blue glow the design puts behind the selected row and the user bubble is
   * *not* here: a glow is a shadow, `ThemeTokens` carries only palette, type and
   * appearance, and each colourway needs its own. It lives as `--sk-glow` in the
   * style's CSS block, declared per `data-theme-preset`.
   */
  "game-campfire": {
    id: "game-campfire",
    name: "Keep of Embers",
    appearance: "dark",
    font: GAME_FONT,
    surface: {
      canvas: "#0E0F13",
      panel: "#151820",
      // Blue, and the one value that must not be flattened to a grey.
      raised: "#1A1E2A",
      // The sidebar, which sits a step below the room it is in.
      inset: "#0D0E11",
      hover: "#1C2335",
      disabled: "#22262F",
    },
    text: {
      // Warm off-white. Pure white on this canvas reads as a different
      // product's text dropped into the room.
      primary: "#E8DFC8",
      secondary: "#B3A88C",
      muted: "#8A7D60",
      // Dark, because the accent is a gold plate and what sits on gold is ink —
      // the send key's chevron is this colour.
      inverse: "#12100D",
    },
    border: {
      subtle: "rgba(201, 168, 76, 0.22)",
      strong: "#C9A84C",
    },
    accent: {
      action: "#C9A84C",
      hover: "#E2C87A",
      soft: "rgba(201, 168, 76, 0.14)",
    },
    status: { ...GAME_STATUS },
  },

  // ── Pixel (像素风) ───────────────────────────────────────────────────────
  /**
   * Slate Terminal — a cool utility slate with one phosphor green.
   *
   * Cool on purpose, and it is what keeps this style clear of two neighbours:
   * Game is a warm dark room, and the planned Arcade CRT is black under neon.
   * A pixel *tool* is neither — it is a working surface, so the slate stays
   * desaturated and the green is the only thing that glows.
   *
   * Borders carry no alpha. Every other dark scheme here mixes its border
   * toward white or sets a translucent one, which is right for a hairline; a
   * pixel grid wants an opaque 1px line that lands on a whole pixel, so these
   * are flat values.
   */
  /**
   * Overworld — the reference palette, sampled rather than eyeballed.
   *
   * Every value below was read off the screenshot this style was rebuilt from,
   * by taking the modal colour of a region rather than picking a pixel: the art
   * is dithered, so a single pixel lands on a neighbour half the time.
   *
   * The finding worth keeping is that the surfaces are **a warm ramp, not one
   * panel colour**. Five steps, from the deepest gold at the edge of the window
   * to the palest cream in the middle:
   *
   *   #FEE395  provider bar      the outermost strip
   *   #FEE49C  sidebar sections  a block inside the column
   *   #FEEBB8  sidebar body      the column itself
   *   #FDF2CF  bubbles, cards    things sitting on the conversation
   *   #F9F7EC  conversation      the paper everything is arranged on
   *
   * Reading them in order is what gives the depth; a flat cream for all five
   * loses the sense of panels stacked on panels, which no amount of outlining
   * puts back. `inset` is the deep end and `panel` the shallow one, because
   * those are the roles the components already use them in.
   *
   * The blue is not on that ramp and is the one cool surface: it marks
   * machine-reported lines — tool calls, statuses — against the cream that
   * carries what was said.
   */
  "pixel-overworld": {
    id: "pixel-overworld",
    name: "Overworld",
    appearance: "light",
    font: PIXEL_FONT,
    surface: {
      canvas: "#F9F7EC",
      panel: "#FDF2CF",
      raised: "#FFFFFF",
      inset: "#DBEAF2",
      hover: "#FEE49C",
      disabled: "#E8E4D4",
    },
    text: {
      // One ink. A pixel face at 12px has no room for a second weight, so the
      // hierarchy is carried by the surface ramp above and not by greying text
      // out — a muted grey on cream at this size reads as a rendering fault.
      primary: "#000000",
      secondary: "#000000",
      muted: "#6B5B3A",
      // What a glyph takes on the green action fill.
      inverse: "#FFFFFF",
    },
    border: {
      // Opaque and black, both of them: a pixel grid wants a line that lands on
      // whole pixels, and an alpha border is a grey one.
      subtle: "#000000",
      strong: "#000000",
    },
    accent: {
      action: "#02B838",
      hover: "#09C006",
      soft: "#DBEAF2",
    },
    status: { success: "#02B838", warning: "#FEC300", danger: "#B4351C", info: "#0177E2" },
  },

  "pixel-slate": {
    id: "pixel-slate",
    name: "Slate Terminal",
    appearance: "dark",
    font: PIXEL_FONT,
    surface: {
      canvas: "#171A21",
      panel: "#1E212B",
      raised: "#262A36",
      inset: "#12141A",
      hover: "#2E333F",
      disabled: "#343A47",
    },
    text: {
      primary: "#D6DCE6",
      secondary: "#94A0B4",
      muted: "#6D788B",
      // Dark: the accent is a bright phosphor green and what sits on it is the
      // slate, not white.
      inverse: "#12141A",
    },
    border: {
      subtle: "#2E333F",
      strong: "#3C4354",
    },
    accent: {
      action: "#7CE38B",
      hover: "#9BEDA6",
      soft: "rgba(124, 227, 139, 0.14)",
    },
    status: { ...PIXEL_STATUS },
  },

  // ── Studio, the other three ─────────────────────────────────────────────
  /**
   * Citrus Pop — the same construction at full brightness.
   *
   * Note what has to hold for every Studio palette: `border` stays the ink the
   * outlines are drawn in, and `text.inverse` stays the colour a glyph takes on
   * an accent chip. The sidebar fill also has to stay light enough for black
   * type, because the style's CSS gives the side columns no text colour of their
   * own — they inherit `text.primary`. That constraint is why none of these
   * three uses a deep saturated column.
   */
  "studio-citrus": {
    id: "studio-citrus",
    name: "Citrus Pop",
    appearance: "light",
    font: STUDIO_FONT,
    surface: {
      canvas: "#FFFFFF",
      panel: "#FFFFFF",
      raised: "#FFFDF0",
      inset: "#FFF8D6",
      hover: "#FFF0A8",
      disabled: "#E8E0C0",
    },
    text: { primary: "#000000", secondary: "#5A4A00", muted: "#8A7A2A", inverse: "#000000" },
    border: { subtle: "#000000", strong: "#000000" },
    accent: { action: "#FF2D8E", hover: "#FF54A3", soft: "#FFF0A8" },
    status: { success: "#12B76A", warning: "#FFD426", danger: "#FF2D8E", info: "#18C3F0" },
  },
  /** Cobalt Comic — the cool side of the same wheel. */
  "studio-cobalt": {
    id: "studio-cobalt",
    name: "Cobalt Comic",
    appearance: "light",
    font: STUDIO_FONT,
    surface: {
      canvas: "#F2F6FF",
      panel: "#FFFFFF",
      raised: "#FFFFFF",
      inset: "#E3EDFF",
      hover: "#CFE0FF",
      disabled: "#C2CFE8",
    },
    text: { primary: "#000000", secondary: "#2A3A5C", muted: "#5F7099", inverse: "#000000" },
    border: { subtle: "#000000", strong: "#000000" },
    accent: { action: "#FF7A18", hover: "#FF9040", soft: "#CFE0FF" },
    status: { success: "#12B76A", warning: "#FF7A18", danger: "#E53935", info: "#2F5BD6" },
  },
  /**
   * Ink Arcade — the appearance flipped, which the construction survives.
   *
   * Worth spelling out because it looks like it should break: this style is
   * built on pure black outlines, and a black line on a near-black canvas is
   * invisible. It works because the CSS branch draws with `--border-*` rather
   * than a literal colour, so the outline follows the theme — here it goes
   * near-white, and the hard offset shadow under every card goes with it. A
   * white sticker edge on black is the same construction, not a different one.
   */
  "studio-ink": {
    id: "studio-ink",
    name: "Ink Arcade",
    appearance: "dark",
    font: STUDIO_FONT,
    surface: {
      canvas: "#121216",
      panel: "#1C1C22",
      raised: "#26262E",
      inset: "#0E0E12",
      hover: "#32323C",
      disabled: "#3A3A44",
    },
    // `inverse` stays dark: the accent is still a bright yellow chip, and what
    // sits on yellow is ink regardless of what the rest of the room is doing.
    text: { primary: "#F2F2F5", secondary: "#B4B4C0", muted: "#8A8A96", inverse: "#121216" },
    border: { subtle: "#F2F2F5", strong: "#FFFFFF" },
    accent: { action: "#FFD426", hover: "#FFDE5C", soft: "#32323C" },
    status: { ...STUDIO_STATUS },
  },

  // ── Game, the other three ───────────────────────────────────────────────
  /** Moonlit Archive — the same hall, lit cold. */
  "game-moonlit": {
    id: "game-moonlit",
    name: "Moonlit Archive",
    appearance: "dark",
    font: GAME_FONT,
    surface: {
      canvas: "#0B0E14",
      panel: "#121722",
      raised: "#1A2130",
      inset: "#090C12",
      hover: "#212A3C",
      disabled: "#2A3244",
    },
    text: { primary: "#D4DCE8", secondary: "#9AA7BC", muted: "#7A879C", inverse: "#0B0E14" },
    border: { subtle: "rgba(176, 197, 224, 0.24)", strong: "#B0C5E0" },
    accent: { action: "#B0C5E0", hover: "#D2E1F5", soft: "rgba(176, 197, 224, 0.12)" },
    status: { ...GAME_MOONLIT_STATUS },
  },
  /**
   * Scriptorium — the light one, and a manuscript rather than a hall.
   *
   * The ornament ink goes brown and the accent becomes rubric red, which is the
   * second colour a manuscript actually has. `text.inverse` flips to cream here
   * — unlike the other three, this accent is dark, so what sits on it is paper.
   */
  "game-scriptorium": {
    id: "game-scriptorium",
    name: "Scriptorium",
    appearance: "light",
    font: GAME_FONT,
    surface: {
      canvas: "#E8DFC8",
      panel: "#F5EEDC",
      raised: "#FBF6E8",
      inset: "#DED3B8",
      hover: "#D6C9A8",
      disabled: "#C8BCA0",
    },
    text: { primary: "#2E2416", secondary: "#5A4A32", muted: "#7F6E4E", inverse: "#F5EEDC" },
    border: { subtle: "rgba(120, 90, 50, 0.30)", strong: "#7A5A32" },
    accent: { action: "#9C3B28", hover: "#B84A34", soft: "rgba(156, 59, 40, 0.12)" },
    status: { ...GAME_SCRIPT_STATUS },
  },
  /** Emberfall — the fire built too high. */
  "game-emberfall": {
    id: "game-emberfall",
    name: "Emberfall",
    appearance: "dark",
    font: GAME_FONT,
    surface: {
      canvas: "#140A0A",
      panel: "#1E0F0E",
      raised: "#2A1614",
      inset: "#0E0707",
      hover: "#3A1E1A",
      disabled: "#40251F",
    },
    text: { primary: "#E8D5CC", secondary: "#B8998C", muted: "#967668", inverse: "#140A0A" },
    border: { subtle: "rgba(214, 124, 74, 0.26)", strong: "#D67C4A" },
    accent: { action: "#D67C4A", hover: "#E89B6A", soft: "rgba(214, 124, 74, 0.14)" },
    status: { ...GAME_EMBER_STATUS },
  },

  // ── Pixel, the other three ──────────────────────────────────────────────
  /**
   * Game Boy — four tones of one olive, which is the hardware palette.
   *
   * `#0F380F / #306230 / #8BAC0F / #9BBC0F` are the DMG's own four values. The
   * surfaces and the accent stay strictly on them; only `status.danger` steps
   * off, for the reason in `PIXEL_GB_STATUS`.
   */
  "pixel-gameboy": {
    id: "pixel-gameboy",
    name: "Game Boy",
    appearance: "dark",
    font: PIXEL_FONT,
    surface: {
      canvas: "#0F380F",
      panel: "#1B4A1B",
      raised: "#306230",
      inset: "#0B2C0B",
      hover: "#306230",
      disabled: "#26521F",
    },
    text: { primary: "#9BBC0F", secondary: "#98B90F", muted: "#85A416", inverse: "#0F380F" },
    border: { subtle: "#306230", strong: "#8BAC0F" },
    accent: { action: "#9BBC0F", hover: "#C3D94A", soft: "rgba(155, 188, 15, 0.16)" },
    status: { ...PIXEL_GB_STATUS },
  },
  /** CRT Amber — the other monochrome tube. */
  "pixel-amber": {
    id: "pixel-amber",
    name: "CRT Amber",
    appearance: "dark",
    font: PIXEL_FONT,
    surface: {
      canvas: "#120C06",
      panel: "#1B1308",
      raised: "#261B0C",
      inset: "#0C0804",
      hover: "#33240F",
      disabled: "#3A2C14",
    },
    text: { primary: "#FFB84D", secondary: "#C98A2E", muted: "#96661F", inverse: "#120C06" },
    border: { subtle: "#33240F", strong: "#7A5518" },
    accent: { action: "#FFB84D", hover: "#FFCE7A", soft: "rgba(255, 184, 77, 0.14)" },
    status: { ...PIXEL_AMBER_STATUS },
  },
  /**
   * Paper Pixel — the light one: pixel art printed in a manual rather than lit
   * on a screen. The border goes to full ink, because on paper a 1px rule is
   * drawn, not glowing.
   */

  // ── Handdrawn (手绘风) ───────────────────────────────────────────────────
  /**
   * Pen on cream paper — the reference's own values.
   *
   * `canvas` is a shade *darker* than `panel`, which is the opposite of the
   * other light schemes and deliberate: the reference is paper all the way
   * through and its cards are told apart by an ink outline, not by a fill. So
   * the room is the slightly duller sheet and a card is a cleaner one laid on
   * it — enough to separate them if the outline is ever missing, never enough
   * to read as a grey box.
   *
   * `border.strong` is the ink itself, full black. In every other light style
   * that token is a hairline; here the outline *is* the drawing, so it gets the
   * darkest value in the palette.
   */
  "sketch-paper": {
    id: "sketch-paper",
    name: "Cream Paper",
    appearance: "light",
    font: SKETCH_FONT,
    surface: {
      canvas: "#F2EEE6",
      panel: "#F7F4EE",
      raised: "#FFFDF8",
      inset: "#EDE9DF",
      hover: "#EDE9DF",
      disabled: "#E3DFD4",
    },
    text: { primary: "#1A1A1A", secondary: "#555555", muted: "#7E7E7E", inverse: "#F7F4EE" },
    border: { subtle: "rgba(26, 26, 26, 0.16)", strong: "#1A1A1A" },
    accent: { action: "#6AABCF", hover: "#8FC3E0", soft: "#D6E8F5" },
    status: { ...SKETCH_STATUS },
  },
  /** Graph paper — a cooler sheet, and the ink goes blue-black like a biro. */
  "sketch-grid": {
    id: "sketch-grid",
    name: "Graph Paper",
    appearance: "light",
    font: SKETCH_FONT,
    surface: {
      canvas: "#EDF1F4",
      panel: "#F5F8FA",
      raised: "#FFFFFF",
      inset: "#E2E8ED",
      hover: "#E2E8ED",
      disabled: "#D5DDE4",
    },
    text: { primary: "#1E2A33", secondary: "#4E5F6B", muted: "#707F8A", inverse: "#F5F8FA" },
    border: { subtle: "rgba(30, 42, 51, 0.16)", strong: "#1E2A33" },
    accent: { action: "#3E7CA6", hover: "#5C9AC4", soft: "#D3E4EF" },
    status: { ...SKETCH_STATUS },
  },
  /** Kraft — a brown sheet, and the ink warms to sepia with it. */
  "sketch-kraft": {
    id: "sketch-kraft",
    name: "Kraft Pad",
    appearance: "light",
    font: SKETCH_FONT,
    surface: {
      canvas: "#E4D6BC",
      panel: "#EFE3CC",
      raised: "#F8EFDC",
      inset: "#D6C6A8",
      hover: "#D6C6A8",
      disabled: "#C9B896",
    },
    text: { primary: "#332619", secondary: "#5E4B34", muted: "#77654D", inverse: "#EFE3CC" },
    border: { subtle: "rgba(51, 38, 25, 0.20)", strong: "#332619" },
    accent: { action: "#A8622F", hover: "#C27B43", soft: "#E8D2B4" },
    status: { ...SKETCH_STATUS },
  },
  /**
   * Slate — the dark one, and the only honest reading of it.
   *
   * A hand-drawn style cannot invert to "dark paper with black ink"; the ink
   * would vanish. So it becomes a blackboard: the sheet goes to slate and the
   * pen becomes chalk, which means `border.strong` is now the *lightest* value
   * in the palette rather than the darkest. That flip is the whole scheme, and
   * `text.inverse` goes dark with it because what sits on chalk is board.
   */
  "sketch-slate": {
    id: "sketch-slate",
    name: "Blackboard",
    appearance: "dark",
    font: SKETCH_FONT,
    surface: {
      canvas: "#22282A",
      panel: "#2A3133",
      raised: "#333B3D",
      inset: "#1B2022",
      hover: "#3A4345",
      disabled: "#424B4D",
    },
    text: { primary: "#EDE9DF", secondary: "#B4B0A6", muted: "#8C857A", inverse: "#22282A" },
    border: { subtle: "rgba(237, 233, 223, 0.22)", strong: "#EDE9DF" },
    accent: { action: "#8FC3E0", hover: "#B0D8EE", soft: "rgba(143, 195, 224, 0.18)" },
    status: { ...SKETCH_STATUS },
  },

  // ── Pixel Desk (复古像素风) ───────────────────────────────────────────────
  /**
   * Blue-Grey Desktop — the reference, transcribed.
   *
   * The palette is doing one job: separate *chrome* from *document*. The left
   * column is low-saturation blue-grey (the application), the centre is warm
   * white (the paper), and one navy draws every line in both. That split is the
   * era's whole visual argument and it is why `panel` here is cooler than
   * `canvas` rather than lighter — the opposite of the light styles above.
   *
   * `border.subtle` and `border.strong` are the same navy on purpose. A 90s
   * interface had one ink; depth came from *bevels* — a light top edge and a
   * dark bottom one, drawn in CSS from `surface.raised` and `surface.inset` —
   * not from a second, fainter line. The two tokens stay distinct in the schema
   * because other styles need them to be.
   *
   * Green appears once, on `status.success`, and the CSS spends it only on the
   * send key. `accent.action` is the selection blue, because in this language
   * "selected" is the thing an accent is for.
   */
  "desk-bluegrey": {
    id: "desk-bluegrey",
    name: "Blue-Grey Desktop",
    appearance: "light",
    font: PIXEL_FONT,
    surface: {
      // Warm white: the document.
      canvas: "#FBF8F0",
      // Blue-grey: the application chrome around it.
      panel: "#8FA8C4",
      // The lit edge of a bevel.
      raised: "#FFFFFF",
      // Its shadowed edge, and the selection fill.
      inset: "#CFE0F0",
      hover: "#E4EEF8",
      disabled: "#B9C7D6",
    },
    text: {
      primary: "#152A47",
      secondary: "#2D4463",
      muted: "#5C7391",
      inverse: "#FFFFFF",
    },
    border: { subtle: "#152A47", strong: "#152A47" },
    accent: { action: "#5B8FD0", hover: "#7FAAE0", soft: "#CFE0F0" },
    status: { ...PIXELDESK_STATUS },
  },
  /** Steel — the same desk in a cooler, greyer room. */
  "desk-steel": {
    id: "desk-steel",
    name: "Steel",
    appearance: "light",
    font: PIXEL_FONT,
    surface: {
      canvas: "#F4F5F7",
      panel: "#9AA5B1",
      raised: "#FFFFFF",
      inset: "#D5DCE4",
      hover: "#E7EBF0",
      disabled: "#C0C7CF",
    },
    text: { primary: "#1C2530", secondary: "#39465A", muted: "#66717F", inverse: "#FFFFFF" },
    border: { subtle: "#1C2530", strong: "#1C2530" },
    accent: { action: "#4E7BA8", hover: "#6E9AC4", soft: "#D5DCE4" },
    status: { ...PIXELDESK_STATUS },
  },
  /** Parchment — warmer chrome, for the beige-box era. */
  "desk-parchment": {
    id: "desk-parchment",
    name: "Parchment",
    appearance: "light",
    font: PIXEL_FONT,
    surface: {
      canvas: "#FDFBF3",
      panel: "#C9BFA4",
      raised: "#FFFFFF",
      inset: "#E7DFC6",
      hover: "#F2ECD9",
      disabled: "#D6CDB4",
    },
    text: { primary: "#332B18", secondary: "#54492E", muted: "#7C7154", inverse: "#FFFFFF" },
    border: { subtle: "#332B18", strong: "#332B18" },
    accent: { action: "#8A6F3C", hover: "#A88A52", soft: "#E7DFC6" },
    status: { ...PIXELDESK_STATUS },
  },
  /**
   * Night Shift — the dark one, and the only one that inverts the split.
   *
   * `stylePalettes.test.ts` requires both appearances, and a dark 90s desktop is
   * a real thing rather than a concession: the chrome goes darker than the
   * document and the ink turns pale, so the bevels swap which edge is lit. The
   * CSS reads `raised` and `inset` for that, so it follows without a branch.
   */
  "desk-night": {
    id: "desk-night",
    name: "Night Shift",
    appearance: "dark",
    font: PIXEL_FONT,
    surface: {
      canvas: "#141A24",
      panel: "#1E2836",
      raised: "#39485C",
      inset: "#0D121A",
      hover: "#2A3747",
      disabled: "#2A3240",
    },
    text: { primary: "#DCE6F2", secondary: "#A9BACE", muted: "#7B8CA3", inverse: "#0D121A" },
    border: { subtle: "#9FB4CC", strong: "#9FB4CC" },
    accent: { action: "#6FA3DC", hover: "#93BEEB", soft: "#26364A" },
    status: { ...PIXELDESK_STATUS },
  },
};

export function isThemePresetId(id: string): id is ThemePresetId {
  return id in themeTokens;
}
