import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { IconSlot } from "../../agentmatrix";
import type { AppLocale } from "../../i18n/uiCopy";
import type { AgentFrontendProject, PresetStyleId } from "../../schema/agentuxConfig";
import { makeSkinId, parseSkinId } from "../../theme/skin";
import { applySkinRecipe, withProjectSkin } from "../../theme/skinEngine";
import { defaultSkinForFamily } from "../../theme/skinRegistry";
import type { ThemePresetId } from "../../theme/themeTokens";

/** The colourway a style opens on: its family's default skin. */
function defaultThemeForStyle(styleId: PresetStyleId): ThemePresetId | null {
  const skinId = defaultSkinForFamily(styleId);
  return skinId ? parseSkinId(skinId)?.variant ?? null : null;
}

/**
 * Style-preset switching view model: owns the 450ms swap animation timer.
 * Applying a style moves the project's skin (style + colourway, as one id) and
 * puts on the style's default avatars from its skin recipe.
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
        ...withProjectSkin(current, makeSkinId(styleId, current.theme.preset)),
        /*
         * Styles whose avatars are part of the style rather than a choice.
         *
         * The skin recipe only says *which* sprite a style uses; these two
         * booleans are what decides whether a slot renders at all. Pixel was in
         * the first table and not this one, so its sprites were registered and
         * had nowhere to appear — measured as `.msg-avatar` count 0 with the art
         * sitting in the registry.
         */
        conversation: styleId === "game" || styleId === "pixel"
          ? { ...current.conversation, userAvatar: true, agentAvatar: true }
          : current.conversation,
      }));
      // The style's own faces, from its skin recipe.
      applySkinRecipe(defaultSkinForFamily(styleId) ?? makeSkinId(styleId, "soft-glass"), setSlot);
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
      // One identity: style, colourway and skin id move together.
      setProject((current) => withProjectSkin(current, makeSkinId(target, nextTheme)));
    }
  }

  return {
    styleSwitching,
    applyStyle,
  };
}
