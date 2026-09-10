import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import type { UiCopy } from "../../i18n/uiCopy";

/**
 * The zoom ladder. Stepping through a fixed list rather than multiplying by a
 * factor keeps the readout on round numbers — 100 → 150 → 200, never 133.33 —
 * and makes "one step" mean the same thing in both directions.
 */
export const ZOOM_STEPS = [25, 50, 75, 100, 150, 200, 300, 400] as const;
export const MIN_ZOOM = ZOOM_STEPS[0];
export const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return 100;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value)));
}

/** Next step above `value`; the ceiling when there is none. */
export function zoomIn(value: number): number {
  return ZOOM_STEPS.find((step) => step > value) ?? MAX_ZOOM;
}

/** Next step below `value`; the floor when there is none. */
export function zoomOut(value: number): number {
  return [...ZOOM_STEPS].reverse().find((step) => step < value) ?? MIN_ZOOM;
}

/**
 * Canvas zoom: a percentage readout that opens a menu.
 *
 * The percentage is editable because the presets can only ever be a handful,
 * and "show me this at 65%" is a real thing to want. Everything the menu does
 * has a keyboard shortcut, and the shortcuts work whether or not the menu is
 * open — the menu documents them rather than being the way to reach them.
 */
export function ZoomControl({
  copy,
  zoom,
  onZoomChange,
}: {
  copy: UiCopy;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(zoom));
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // The readout is the source of truth: a shortcut fired while the menu is open
  // has to move the field too, or the two disagree about the current zoom.
  useEffect(() => {
    setDraft(String(zoom));
  }, [zoom]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.select();

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const commitDraft = () => {
    // Tolerant of what people actually type: "150", "150%", " 150 ".
    const parsed = Number.parseFloat(draft.replace("%", "").trim());
    if (Number.isNaN(parsed)) {
      setDraft(String(zoom));
      return;
    }
    onZoomChange(clampZoom(parsed));
  };

  const items: { key: string; label: string; hint?: string; zoom: number }[] = [
    { key: "in", label: copy.shell.topbar.zoomIn, hint: "+", zoom: zoomIn(zoom) },
    { key: "out", label: copy.shell.topbar.zoomOut, hint: "−", zoom: zoomOut(zoom) },
    { key: "50", label: copy.shell.topbar.zoomTo50, zoom: 50 },
    { key: "100", label: copy.shell.topbar.zoomTo100, hint: "⌘0", zoom: 100 },
    { key: "200", label: copy.shell.topbar.zoomTo200, zoom: 200 },
  ];

  return (
    <div className="zoom-control" ref={rootRef}>
      <button
        type="button"
        className="zoom-trigger"
        aria-label={copy.shell.topbar.zoomAria}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="zoom-trigger-value">{zoom}%</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open ? (
        <div className="zoom-menu" role="menu">
          <input
            ref={inputRef}
            className="zoom-menu-field"
            aria-label={copy.shell.topbar.zoomValueAria}
            value={draft}
            inputMode="numeric"
            onChange={(event) => setDraft(event.currentTarget.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitDraft();
                setOpen(false);
                return;
              }
              if (event.key === "Escape") {
                setDraft(String(zoom));
                setOpen(false);
                return;
              }
              // The field owns the arrow keys while it has focus; without this
              // the global +/- shortcuts would fight typing.
              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                onZoomChange(event.key === "ArrowUp" ? zoomIn(zoom) : zoomOut(zoom));
              }
            }}
          />
          <div className="zoom-menu-items">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                className="zoom-menu-item"
                role="menuitem"
                // Stepping past the end is not an error, it is a no-op — but it
                // should not look available.
                disabled={item.zoom === zoom}
                onClick={() => {
                  onZoomChange(item.zoom);
                  // Zoom-to items are a destination, so they close. Zoom in/out
                  // are steps, so the menu stays for the next one.
                  if (item.key !== "in" && item.key !== "out") setOpen(false);
                }}
              >
                <span className="zoom-menu-item-label">{item.label}</span>
                {item.hint ? <kbd className="zoom-menu-item-hint">{item.hint}</kbd> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
