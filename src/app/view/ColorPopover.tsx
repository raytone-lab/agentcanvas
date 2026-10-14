import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";

import { normalizeHex, type ThemeColorRole } from "../../theme/customTheme";

/**
 * The colour editor a swatch's dot opens.
 *
 * Suggestions first — a row of colours picked to work in that role, because
 * most people want "a different blue", not a colour space — then the field for
 * the ones who do want it: saturation and brightness on the square, hue on the
 * bar, and the hex for pasting a brand colour. Every change is applied as it
 * is made, so the canvas is the preview. The contrast line under it says
 * whether type will still read against what it sits on.
 *
 * Portalled to the body and positioned from the dot's rect: the card it opens
 * from clips its overflow, and the editor is wider than the swatch.
 */

/** Suggestions per role: quiet, product-safe values rather than a rainbow. */
const SUGGESTIONS: Record<ThemeColorRole, readonly string[]> = {
  accent: ["#2f6bff", "#4f46e5", "#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#18181b"],
  panel: ["#ffffff", "#f8fafc", "#fafaf9", "#fff7ed", "#f0f9ff", "#18181b", "#0f172a", "#111827"],
  canvas: ["#f4f5f7", "#eef2f7", "#f5f5f4", "#fdf6ec", "#e8f0fb", "#09090b", "#0b1220", "#1c1917"],
  ink: ["#0f172a", "#18181b", "#1c1917", "#111827", "#334155", "#f8fafc", "#fafaf9", "#e5e7eb"],
};

export type ColorPopoverCopy = {
  roles: Record<ThemeColorRole, string>;
  suggested: string;
  hex: string;
  contrast: string;
  contrastLow: string;
  reset: string;
  close: string;
};

export function ColorPopover({
  role,
  value,
  anchor,
  copy,
  contrast,
  canReset,
  onChange,
  onReset,
  onClose,
}: {
  role: ThemeColorRole;
  value: string;
  anchor: DOMRect;
  copy: ColorPopoverCopy;
  /** Contrast of the type this role carries or sits under, when there is one. */
  contrast?: number;
  canReset: boolean;
  onChange: (hex: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [hsv, setHsv] = useState(() => hexToHsv(normalizeHex(value) ?? "#888888"));
  const [draft, setDraft] = useState(normalizeHex(value) ?? value);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  // Follow the value when it changes from outside (a suggestion, a reset).
  useEffect(() => {
    const hex = normalizeHex(value);
    if (!hex) return;
    setDraft(hex);
    setHsv((current) => (hsvToHex(current) === hex ? current : hexToHsv(hex)));
  }, [value]);

  useLayoutEffect(() => {
    const box = rootRef.current?.getBoundingClientRect();
    const width = box?.width ?? 248;
    const height = box?.height ?? 300;
    const margin = 8;
    // Beside the dot, to its left, first: the style cards live at the window's
    // right edge, and opening downward covered the card's own Apply key.
    const besideLeft = anchor.left - width - 12;
    if (besideLeft >= margin) {
      const top = Math.min(window.innerHeight - height - margin, Math.max(margin, anchor.top - 24));
      setPosition({ left: besideLeft, top });
      return;
    }
    let left = anchor.left + anchor.width / 2 - width / 2;
    left = Math.min(window.innerWidth - width - margin, Math.max(margin, left));
    let top = anchor.bottom + 8;
    if (top + height > window.innerHeight - margin) top = Math.max(margin, anchor.top - height - 8);
    setPosition({ left, top });
  }, [anchor]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    // Next tick, so the click that opened it does not close it.
    const id = window.setTimeout(() => document.addEventListener("pointerdown", onPointer), 0);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  const commit = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setDraft(hex);
    onChange(hex);
  };

  const dragOn = (target: "field" | "hue") => (event: ReactPointerEvent<HTMLDivElement>) => {
    const surface = event.currentTarget;
    surface.setPointerCapture(event.pointerId);
    const read = (clientX: number, clientY: number) => {
      const rect = surface.getBoundingClientRect();
      const x = clamp01((clientX - rect.left) / rect.width);
      const y = clamp01((clientY - rect.top) / rect.height);
      commit(target === "hue" ? { ...hsvRef.current, h: x * 360 } : { ...hsvRef.current, s: x, v: 1 - y });
    };
    read(event.clientX, event.clientY);
    const move = (e: PointerEvent) => read(e.clientX, e.clientY);
    const up = () => {
      surface.removeEventListener("pointermove", move);
      surface.removeEventListener("pointerup", up);
      surface.removeEventListener("pointercancel", up);
    };
    surface.addEventListener("pointermove", move);
    surface.addEventListener("pointerup", up);
    surface.addEventListener("pointercancel", up);
  };
  // The drag handlers read the latest hue/sat, not the one captured at press.
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  const keyStep = (target: "field" | "hue") => (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const next = { ...hsv };
    if (target === "hue") {
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") next.h = (hsv.h - step * 360 + 360) % 360;
      else if (event.key === "ArrowRight" || event.key === "ArrowUp") next.h = (hsv.h + step * 360) % 360;
      else return;
    } else {
      if (event.key === "ArrowLeft") next.s = clamp01(hsv.s - step);
      else if (event.key === "ArrowRight") next.s = clamp01(hsv.s + step);
      else if (event.key === "ArrowUp") next.v = clamp01(hsv.v + step);
      else if (event.key === "ArrowDown") next.v = clamp01(hsv.v - step);
      else return;
    }
    event.preventDefault();
    commit(next);
  };

  const current = hsvToHex(hsv);
  const low = contrast !== undefined && contrast < 4.5;

  return createPortal(
    <div
      ref={rootRef}
      className="color-popover"
      role="dialog"
      aria-label={copy.roles[role]}
      style={{
        left: position?.left ?? -9999,
        top: position?.top ?? -9999,
        "--cp-hue": `hsl(${Math.round(hsv.h)} 100% 50%)`,
      } as CSSProperties}
    >
      <div className="color-popover-head">
        <span className="color-popover-chip" style={{ background: current }} aria-hidden="true" />
        <span className="color-popover-title">{copy.roles[role]}</span>
        <button type="button" className="color-popover-close" aria-label={copy.close} onClick={onClose}>
          ×
        </button>
      </div>

      <div className="color-popover-label">{copy.suggested}</div>
      <div className="color-popover-suggestions">
        {SUGGESTIONS[role].map((hex) => (
          <button
            key={hex}
            type="button"
            className="color-popover-suggestion"
            data-active={hex === current || undefined}
            style={{ background: hex }}
            aria-label={hex}
            title={hex}
            onClick={() => commit(hexToHsv(hex))}
          />
        ))}
      </div>

      <div
        className="color-popover-field"
        role="slider"
        tabIndex={0}
        aria-label={`${copy.roles[role]} · S/V`}
        aria-valuetext={current}
        onPointerDown={dragOn("field")}
        onKeyDown={keyStep("field")}
      >
        <span
          className="color-popover-thumb"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: current }}
        />
      </div>
      <div
        className="color-popover-hue"
        role="slider"
        tabIndex={0}
        aria-label={`${copy.roles[role]} · H`}
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        onPointerDown={dragOn("hue")}
        onKeyDown={keyStep("hue")}
      >
        <span className="color-popover-thumb" style={{ left: `${(hsv.h / 360) * 100}%`, top: "50%", background: "var(--cp-hue)" }} />
      </div>

      <label className="color-popover-hex">
        <span>{copy.hex}</span>
        <input
          value={draft}
          spellCheck={false}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            const hex = normalizeHex(event.currentTarget.value);
            if (hex) {
              setHsv(hexToHsv(hex));
              onChange(hex);
            }
          }}
          onBlur={() => setDraft(current)}
        />
      </label>

      {contrast !== undefined ? (
        <div className="color-popover-contrast" data-low={low || undefined}>
          {(low ? copy.contrastLow : copy.contrast).replace("{ratio}", contrast.toFixed(1))}
        </div>
      ) : null}

      <div className="color-popover-foot">
        <button type="button" className="color-popover-reset" disabled={!canReset} onClick={onReset}>
          {copy.reset}
        </button>
      </div>
    </div>,
    document.body,
  );
}

type Hsv = { h: number; s: number; v: number };

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function hexToHsv(hex: string): Hsv {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r, g, b].map((n) => Math.round((n + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}
