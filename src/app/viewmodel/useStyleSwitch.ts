import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { IconSlot } from "../../agentmatrix";
import type { AppLocale } from "../../i18n/uiCopy";
import type { AgentFrontendProject, PresetStyleId } from "../../schema/agentuxConfig";
import { STYLE_AVATAR_DEFAULTS } from "../projection/presetRailData";
import type { ThemePresetId } from "../../theme/themeTokens";

// Each style owns its own theme set, so switching style also moves to that
// style's default theme after confirmation.
function defaultThemeForStyle(styleId: PresetStyleId) {
  // No style, so no style's theme — the palette the empty project already
  // carries. Returning null instead would leave the previous style's theme on
  // an unstyled canvas.
  if (styleId === "blank") return "soft-glass" as const;
  if (styleId === "native") return "soft-glass" as const;
  if (styleId === "illustrated") return "ice-white" as const;
  if (styleId === "workbuddy") return "wb-light" as const;
  if (styleId === "studio") return "studio-grape" as const;
  if (styleId === "zine") return "zine-butter" as const;
  if (styleId === "game") return "game-campfire" as const;
  if (styleId === "pixel") return "pixel-overworld" as const;
  if (styleId === "pixeldesk") return "desk-bluegrey" as const;
  if (styleId === "handdrawn") return "sketch-grid" as const;
  if (styleId === "inkwash") return "ink-rice" as const;
  /* Glacier, the default set. The original black-on-white one is `tech-paper`. */
  if (styleId === "tech") return "tech-glacier" as const;
  if (styleId === "retro") return "retro-paper" as const;
  return null;
}

/**
 * Style-preset switching view model: owns the confirm-dialog state and the
 * 450ms swap animation timer. Confirmation also resets the theme preset and
 * the style's default avatars on the project (the Model).
 */
export function useStyleSwitch({
  selectedPresetStyle,
  locale,
  setSlot,
  setProject,
}: {
  selectedPresetStyle: PresetStyleId;
  locale: AppLocale;
  setSlot: (slot: IconSlot, optionId: string) => void;
  setProject: Dispatch<SetStateAction<AgentFrontendProject>>;
  /*
   * `onKitPicked` is gone with the kit it recorded. It wrote the style's
   * module list into `pickedOptionIds`, which is what made the rail and the
   * layer tree tick options the reader had never clicked. Nothing replaces it:
   * a style no longer has picks to report.
   */
}) {
  const [styleSwitching, setStyleSwitching] = useState(false);
  const styleSwitchTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => {
    if (styleSwitchTimerRef.current) {
      window.clearTimeout(styleSwitchTimerRef.current);
    }
  }, []);

  function switchPresetStyle(styleId: PresetStyleId, tabButton?: HTMLButtonElement | null) {
    if (styleId !== selectedPresetStyle) {
      if (styleSwitchTimerRef.current) {
        window.clearTimeout(styleSwitchTimerRef.current);
      }
      setProject((current) => ({
        ...current,
        theme: { ...current.theme, stylePreset: styleId },
        /*
         * Styles whose avatars are part of the style rather than a choice.
         *
         * `STYLE_AVATAR_DEFAULTS` only says *which* sprite a style uses; these
         * two booleans are what decides whether a slot renders at all. Pixel
         * was in the first table and not this one, so its sprites were
         * registered and had nowhere to appear — measured as
         * `.msg-avatar` count 0 with the art sitting in the registry.
         */
        conversation: styleId === "game" || styleId === "pixel"
          ? { ...current.conversation, userAvatar: true, agentAvatar: true }
          : current.conversation,
      }));
      setSlot("author.user", STYLE_AVATAR_DEFAULTS[styleId]["author.user"]);
      setSlot("author.agent", STYLE_AVATAR_DEFAULTS[styleId]["author.agent"]);
      setStyleSwitching(true);
      window.requestAnimationFrame(() => {
        styleSwitchTimerRef.current = window.setTimeout(() => {
          setStyleSwitching(false);
          styleSwitchTimerRef.current = undefined;
        }, 450);
      });
    }
    if (tabButton) {
      window.requestAnimationFrame(() => {
        tabButton.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      });
    }
  }

  /**
   * Apply a style, and the colourway the reader picked with it.
   *
   * One step, no dialog. It used to be two — `requestStyleSwitch` parked the
   * choice and a confirm sheet asked "换成手绘风？换了会重置主题和头像" before
   * anything happened. The picker is a card with an 应用 button on it now, so
   * the button *is* the confirmation; a sheet on top of it asked the same
   * question twice.
   *
   * What the sheet warned about still happens — the theme moves to the picked
   * colourway and the avatars move to the style's own — and that is the point
   * of the button rather than a side effect of it.
   *
   * What it does *not* do any more is decide which components the screen has.
   *
   * It used to apply the style's "kit": a starting configuration that switched
   * on a dozen modules and recorded them as the reader's own picks. The
   * argument for it was that this made two paths in the product — assemble the
   * screen from the left column, or pick a style and get one already
   * assembled. The cost is that it answers a question the reader did not ask.
   * Applying 原生风 to an untouched project filled 中栏 with thirteen modules
   * and 右栏 with one; none of them had been chosen, and the reader had no way
   * to tell which of those switches were theirs. Which components exist is the
   * reader's decision, and a style is a repaint — so it is now only a repaint.
   *
   * 空白's inverse went with it. It called `withEmptyStructure` to *clear* the
   * canvas, which only existed because the other styles added: a kit never
   * removes, so without it 空白 would have left the previous style's modules
   * standing while the rail read blank. With nothing added by any card there is
   * nothing for 空白 to undo, and wiping a reader's structure because they
   * looked at a style is the same mistake pointing the other way.
   *
   * `themeId` is the card's selection. Falling back to the style's default
   * keeps the other callers (a saved project opening, the tests) honest.
   */
  function applyStyle(styleId: PresetStyleId, themeId?: ThemePresetId, tabButton?: HTMLButtonElement | null) {
    const target = styleId;
    switchPresetStyle(target, tabButton ?? null);
    const nextTheme = themeId ?? defaultThemeForStyle(target);
    if (nextTheme) {
      setProject((current) => ({ ...current, theme: { ...current.theme, preset: nextTheme } }));
    }
  }

  return {
    styleSwitching,
    applyStyle,
  };
}
