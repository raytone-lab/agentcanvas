import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { IconSlot } from "../../agentmatrix";
import type { AppLocale } from "../../i18n/uiCopy";
import type { AgentFrontendProject, PresetStyleId } from "../../schema/agentuxConfig";
import { STYLE_AVATAR_DEFAULTS, presetStyleOptions } from "../projection/presetRailData";

// Each style owns its own theme set, so switching style also moves to that
// style's default theme after confirmation.
function defaultThemeForStyle(styleId: PresetStyleId) {
  if (styleId === "native") return "soft-glass" as const;
  if (styleId === "illustrated") return "ice-white" as const;
  return null; // studio (under construction) keeps the current theme
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
      setProject((current) => ({ ...current, theme: { ...current.theme, stylePreset: styleId } }));
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
    const themeId = defaultThemeForStyle(target);
    if (themeId) {
      setProject((current) => ({ ...current, theme: { ...current.theme, preset: themeId } }));
    }
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
