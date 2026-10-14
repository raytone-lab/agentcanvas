/**
 * Icon-set context: provides the active `IconSet` and a `<StateIcon>` that
 * resolves a slot to the chosen lucide icon. Slots can be swapped individually
 * or via a whole-set preset.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import type { LucideProps } from "lucide-react";

import * as pixelart from "pixelarticons/react";

import { codiconForSlot } from "./codiconSlots";
import { UPLOADED_AVATAR_ID, UploadedAvatarFace } from "./defaultUserAvatars";
import { comicIconForOption, comicIconForSlot } from "./comicSlots";
import { gameIconForOption, gameIconForSlot } from "./gameSlots";
import { pixelIconForOption, pixelIconForSlot } from "./pixelSlots";
import { inkIconForOption, inkIconForSlot } from "./inkSlots";
import { retroIconForOption, retroIconForSlot } from "./retroSlots";
import {
  defaultIconSet,
  iconSetFromPreset,
  resolveIcon,
  type IconPresetId,
  type IconSet,
  type IconSlot,
  type IconStyle,
} from "./icons";

type IconSetContextValue = {
  iconSet: IconSet;
  setSlot: (slot: IconSlot, optionId: string) => void;
  /** The reader's uploaded avatar as a data URL, or null before one is picked. */
  uploadedAvatar: string | null;
  setUploadedAvatar: (dataUrl: string | null) => void;
  applyPreset: (preset: IconPresetId) => void;
  reset: () => void;
};

const IconSetContext = createContext<IconSetContextValue | null>(null);

export function IconSetProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: IconSet;
}) {
  const [iconSet, setIconSet] = useState<IconSet>(() => initial ?? defaultIconSet());
  /*
   * Kept in `localStorage` rather than in the project: the icon set itself is
   * session state, and a photo of the reader is theirs rather than the
   * scaffold's. `readAvatarFile` keeps it to a few kilobytes.
   */
  const [uploadedAvatar, setUploadedAvatar] = useState<string | null>(readStoredAvatar);
  useEffect(() => {
    try {
      if (uploadedAvatar) window.localStorage.setItem(UPLOADED_AVATAR_STORAGE_KEY, uploadedAvatar);
      else window.localStorage.removeItem(UPLOADED_AVATAR_STORAGE_KEY);
    } catch {
      /* Private mode or a full quota: the picture still shows for this session. */
    }
  }, [uploadedAvatar]);

  const setSlot = useCallback((slot: IconSlot, optionId: string) => {
    setIconSet((prev) => ({ ...prev, [slot]: optionId }));
  }, []);
  const applyPreset = useCallback((preset: IconPresetId) => {
    setIconSet(iconSetFromPreset(preset));
  }, []);
  const reset = useCallback(() => setIconSet(defaultIconSet()), []);

  const value = useMemo(
    () => ({ iconSet, setSlot, uploadedAvatar, setUploadedAvatar, applyPreset, reset }),
    [iconSet, setSlot, uploadedAvatar, applyPreset, reset],
  );

  return <IconSetContext.Provider value={value}>{children}</IconSetContext.Provider>;
}

const UPLOADED_AVATAR_STORAGE_KEY = "agentcanvas.uploadedUserAvatar";

function readStoredAvatar(): string | null {
  try {
    const stored = typeof window === "undefined" ? null : window.localStorage.getItem(UPLOADED_AVATAR_STORAGE_KEY);
    return stored?.startsWith("data:image/") ? stored : null;
  } catch {
    return null;
  }
}

export function useIconSet(): IconSetContextValue {
  const ctx = useContext(IconSetContext);
  if (!ctx) throw new Error("useIconSet must be used within an IconSetProvider");
  return ctx;
}

/** Icon rendering weight for the current surface (native → "bold", else "line"). */
const IconStyleContext = createContext<IconStyle>("line");

export function IconStyleProvider({ value, children }: { value: IconStyle; children: ReactNode }) {
  return <IconStyleContext.Provider value={value}>{children}</IconStyleContext.Provider>;
}

export function useIconStyle(): IconStyle {
  return useContext(IconStyleContext);
}

/**
 * The two slots that *do* offer variants, and so must not take the per-slot map.
 *
 * The pixel branch below is keyed by slot rather than by the reader's choice,
 * on the grounds that a hand-drawn set cannot offer variants. True of the other
 * sixty-odd slots and false of exactly these two: an avatar is the one icon a
 * reader picks by identity, `STYLE_AVATAR_DEFAULTS` exists to say which one a
 * style opens with, and the style ships its own sprites for them.
 *
 * Without this the branch returned a `pixelarticons` outline before the choice
 * was ever consulted, so the style's sprites were registered, defaulted to, and
 * never reachable — measured as `.msg-avatar` present twice with
 * `.pixel-avatar` count 0.
 */
const AVATAR_SLOTS = new Set<IconSlot>(["author.user", "author.agent"]);

/** Renders the currently-selected icon for a semantic slot, at the active weight. */
export function StateIcon({ slot, ...props }: { slot: IconSlot } & LucideProps) {
  const { iconSet } = useIconSet();
  return <SlotIcon slot={slot} option={iconSet[slot]} {...props} />;
}

/**
 * One named option of a slot, drawn the way the current style would draw it.
 *
 * Exists for the icon gallery, which rendered `option.Icon` — the lucide
 * component — directly. That made the gallery a picture of lucide rather than a
 * picture of the choice: in 像素风 the tiles showed four smooth outlines while
 * the canvas drew pixel glyphs, so the reader was picking from a preview of a
 * different icon set.
 *
 * Same resolution as `StateIcon`, with the option passed in rather than read
 * from the set, which is the only difference between "the current icon" and
 * "this icon".
 */
export function OptionIcon({
  slot,
  option,
  ...props
}: { slot: IconSlot; option: string } & LucideProps) {
  return <SlotIcon slot={slot} option={option} {...props} />;
}

function SlotIcon({ slot, option, ...props }: { slot: IconSlot; option?: string } & LucideProps) {
  const { iconSet, uploadedAvatar } = useIconSet();
  const style = useIconStyle();

  /* The reader's own picture, before every style branch: a photo is the one
     avatar no style redraws. With nothing uploaded the id falls through and
     resolves like any unknown one, to the slot's first default. */
  if (slot === "author.user" && (option ?? iconSet[slot]) === UPLOADED_AVATAR_ID && uploadedAvatar) {
    return (
      <UploadedAvatarFace
        src={uploadedAvatar}
        size={props.size}
        className={props.className}
        aria-hidden={props["aria-hidden"] ?? true}
        data-icon-slot={slot}
      />
    );
  }
  // The themed branches key off the option; the lucide branch reads the set,
  // because `resolveIcon` takes a set rather than an id. Overlaying the one
  // slot keeps both honest without a second resolver.
  const effectiveSet: IconSet = option ? { ...iconSet, [slot]: option } : iconSet;

  // The codicon surface draws a font glyph, not an SVG, so it returns before
  // the lucide path. `size` is the only prop that carries over — the rest of
  // LucideProps (strokeWidth, fill, absoluteStrokeWidth) describe a stroked
  // SVG and have no meaning for a filled glyph.
  //
  // A slot with no mapping falls through to lucide rather than rendering an
  // empty box; codiconSlots.test.ts asserts the map is total, so that path is
  // a safety net, not a routine one.
  if (style === "codicon") {
    const glyph = codiconForSlot[slot];
    if (glyph) {
      const size = props.size ?? 16;
      return (
        <span
          className={`codicon codicon-${glyph}`}
          // Sized in px so it tracks the `size` prop call sites already pass;
          // the font's glyphs are drawn on a 16px grid.
          style={{ fontSize: `${size}px`, width: `${size}px`, height: `${size}px` }}
          aria-hidden={props["aria-hidden"] ?? true}
          data-icon-slot={slot}
        />
      );
    }
  }

  // The pixel surface returns early for the same reason: its glyphs are filled
  // paths on a 24 grid with no stroke, so `strokeWidth` and `fill` have nothing
  // to act on, and it takes `width`/`height` where lucide takes `size`.
  //
  /*
   * The reader's choice first, then the slot.
   *
   * It used to read the slot alone, on the reasoning that a hand-drawn set
   * cannot offer variants — the same trade the codicon branch above makes. That
   * held for codicon and not for this set: pixelarticons ships 1036 glyphs, so
   * the 工具调用 slots do have four distinct near-synonyms each, and reading the
   * slot alone meant the gallery drew four tiles that all rendered one picture.
   *
   * `pixelIconForOption` covers only the slots where four genuinely different
   * glyphs were found; everywhere else this falls through to the per-slot map,
   * which is still total (`pixelSlots.test.ts`).
   */
  /*
   * The Game surface, before lucide for the same reason as the two above: it
   * has a drawing for every slot, and the one it draws is either the reader's
   * pick (the nine slots with a gallery) or the slot's own mark.
   *
   * Unlike codicon and pixelarticons these are real `LucideIcon`s — SVGs with
   * `stroke="currentColor"` — so there is no early return with different props.
   * It falls through to the shared render at the bottom, which is what keeps
   * `strokeWidth`, `className` and the rest working.
   *
   * `AVATAR_SLOTS` excluded, like the pixel branch: the style ships two
   * portraits for those and the reader picks between them by identity.
   */
  if (style === "game" && !AVATAR_SLOTS.has(slot)) {
    const chosen = effectiveSet[slot];
    const GameIcon = (chosen ? gameIconForOption[slot]?.[chosen] : undefined) ?? gameIconForSlot[slot];
    if (GameIcon) {
      return <GameIcon {...props} data-icon-slot={slot} />;
    }
  }

  /* 漫画风. Avatars excluded for the same reason pixel excludes them: the
     expression faces are the reader's identity pick and the sheet has no
     portrait. */
  if (style === "comic" && !AVATAR_SLOTS.has(slot)) {
    const chosen = effectiveSet[slot];
    const ComicIcon = (chosen ? comicIconForOption[slot]?.[chosen] : undefined) ?? comicIconForSlot[slot];
    if (ComicIcon) {
      return <ComicIcon {...props} data-icon-slot={slot} />;
    }
  }

  /* 复古风. Avatars excluded like the three above — that slot is the reader's
     identity pick and this set has no portrait in it. */
  if (style === "retro" && !AVATAR_SLOTS.has(slot)) {
    const chosen = effectiveSet[slot];
    const RetroIcon = (chosen ? retroIconForOption[slot]?.[chosen] : undefined) ?? retroIconForSlot[slot];
    if (RetroIcon) {
      return <RetroIcon {...props} data-icon-slot={slot} />;
    }
  }

  /* 水墨风. Avatars excluded like the four above: this style's agent mark is
     the seal roundel, which `STYLE_AVATAR_DEFAULTS` chooses, and the reader
     picks their own face by identity rather than by style. */
  if (style === "ink" && !AVATAR_SLOTS.has(slot)) {
    const chosen = effectiveSet[slot];
    const InkIcon = (chosen ? inkIconForOption[slot]?.[chosen] : undefined) ?? inkIconForSlot[slot];
    if (InkIcon) {
      return <InkIcon {...props} data-icon-slot={slot} />;
    }
  }

  if (style === "pixel" && !AVATAR_SLOTS.has(slot)) {
    const chosenOption = effectiveSet[slot];
    const pixelName =
      (chosenOption ? pixelIconForOption[slot]?.[chosenOption] : undefined)
      ?? pixelIconForSlot[slot];
    const PixelIcon = pixelName
      ? ((pixelart as Record<string, unknown>)[pixelName] as
          | ((iconProps: Record<string, unknown>) => ReactElement)
          | undefined)
      : undefined;
    if (PixelIcon) {
      const size = props.size ?? 16;
      const px = typeof size === "number" ? size : Number.parseInt(String(size), 10) || 16;
      return (
        <PixelIcon
          width={px}
          height={px}
          className={props.className}
          aria-hidden={props["aria-hidden"] ?? true}
          data-icon-slot={slot}
        />
      );
    }
  }

  const Icon = resolveIcon(effectiveSet, slot, style);
  const styleProps = style === "bold"
    ? { strokeWidth: props.strokeWidth ?? 2.1, fill: props.fill ?? "none" }
    : {};
  /*
   * `data-icon-slot` here too. Every themed branch above stamps it and this one
   * did not, which made the plain-lucide styles — 原生风 among them — the only
   * ones whose icons cannot be checked on the rendered page. Asked "原生风的这些
   * 图标是不是用错了", the probe read `no svg` for every slot and the question
   * had to be answered by matching lucide path data by hand.
   */
  return <Icon {...styleProps} {...props} data-icon-slot={slot} />;
}
