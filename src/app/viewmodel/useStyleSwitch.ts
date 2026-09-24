import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { IconSlot } from "../../agentmatrix";
import type { AppLocale } from "../../i18n/uiCopy";
import type { AgentFrontendProject, PresetStyleId } from "../../schema/agentuxConfig";
import { makeSkinId } from "../../theme/skin";
import { applySkinRecipe, withProjectSkin } from "../../theme/skinEngine";
import { defaultSkinForFamily } from "../../theme/skinRegistry";
import { presetStyleOptions } from "../projection/presetRailData";

/**
 * Style-preset switching view model: owns the confirm-dialog state and the
 * 450ms swap animation timer. Confirmation also resets the skin (family default
 * variant, or the current variant for studio) and the style's default avatars
 * on the project (the Model).
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
}) {
  const [styleSwitching, setStyleSwitching] = useState(false);
  // Style switch is confirmed via a dialog (it also resets the theme set).
  const [pendingStyle, setPendingStyle] = useState<PresetStyleId | null>(null);
  // Resolved once rather than re-found inside each dialog string: the confirm copy names the
  // style twice, and the previous version looked it up separately in every branch.
  const pendingStyleLabel = pendingStyle
    ? presetStyleOptions.find((style) => style.id === pendingStyle)?.label[locale] ?? pendingStyle
    : "";
  const pendingStyleButtonRef = useRef<HTMLButtonElement | null>(null);
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
      const recipeSkinId = defaultSkinForFamily(styleId) ?? makeSkinId(styleId, "soft-glass");
      applySkinRecipe(recipeSkinId, setSlot);
      setProject((current) => {
        const skinId = defaultSkinForFamily(styleId) ?? makeSkinId(styleId, current.theme.preset);
        return withProjectSkin(current, skinId);
      });
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

  function requestStyleSwitch(styleId: PresetStyleId, tabButton: HTMLButtonElement) {
    if (styleId === selectedPresetStyle) {
      return;
    }
    pendingStyleButtonRef.current = tabButton;
    setPendingStyle(styleId);
  }

  function confirmStyleSwitch() {
    const target = pendingStyle;
    if (!target) {
      return;
    }
    setPendingStyle(null);
    const button = pendingStyleButtonRef.current;
    pendingStyleButtonRef.current = null;
    switchPresetStyle(target, button);
  }

  return {
    styleSwitching,
    pendingStyle,
    pendingStyleLabel,
    setPendingStyle,
    requestStyleSwitch,
    confirmStyleSwitch,
  };
}
