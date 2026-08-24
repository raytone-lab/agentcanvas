/**
 * Icon-set context: provides the active `IconSet` and a `<StateIcon>` that
 * resolves a slot to the chosen lucide icon. Slots can be swapped individually
 * or via a whole-set preset.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { LucideProps } from "lucide-react";

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

  const setSlot = useCallback((slot: IconSlot, optionId: string) => {
    setIconSet((prev) => ({ ...prev, [slot]: optionId }));
  }, []);
  const applyPreset = useCallback((preset: IconPresetId) => {
    setIconSet(iconSetFromPreset(preset));
  }, []);
  const reset = useCallback(() => setIconSet(defaultIconSet()), []);

  const value = useMemo(
    () => ({ iconSet, setSlot, applyPreset, reset }),
    [iconSet, setSlot, applyPreset, reset],
  );

  return <IconSetContext.Provider value={value}>{children}</IconSetContext.Provider>;
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

/** Renders the currently-selected icon for a semantic slot, at the active weight. */
export function StateIcon({ slot, ...props }: { slot: IconSlot } & LucideProps) {
  const { iconSet } = useIconSet();
  const style = useIconStyle();
  const Icon = resolveIcon(iconSet, slot, style);
  const styleProps = style === "bold"
    ? { strokeWidth: props.strokeWidth ?? 2.1, fill: props.fill ?? "none" }
    : {};
  return <Icon {...styleProps} {...props} />;
}
