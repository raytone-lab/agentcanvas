import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from "react";

import { lightShotSrc, darkShotSrc } from "./shots";

/**
 * Before/after wipe between two themes.
 *
 * Both frames are the same editor state captured by `scripts/capture-landing-shots.mjs`;
 * only the theme differs, so the wipe shows exactly what a theme preset changes and what
 * it leaves alone. Sliding is the point — a pair of static screenshots side by side would
 * make the reader do the diffing.
 *
 * Implemented as a real `role="slider"`: draggable with a pointer, movable with the arrow
 * keys, and announced with a percentage. A drag-only control would be unreachable by
 * keyboard.
 */
export function ThemeCompare({
  lightAlt,
  darkAlt,
  label,
  lightBadge,
  darkBadge,
}: {
  lightAlt: string;
  darkAlt: string;
  label: string;
  lightBadge: string;
  darkBadge: string;
}) {
  const [position, setPosition] = useState(52);
  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, next)));
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setFromClientX(event.clientX);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setFromClientX(event.clientX);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const nudge = (delta: number) => setPosition((current) => Math.min(100, Math.max(0, current + delta)));

  return (
    <div
      className="lp-compare"
      ref={frameRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ "--wipe": `${position}%` } as CSSProperties}
    >
      <img className="lp-compare-base" src={darkShotSrc} alt={darkAlt} loading="lazy" decoding="async" />
      {/* Clipped to the wipe position. Its alt text carries the light-theme description. */}
      <img className="lp-compare-top" src={lightShotSrc} alt={lightAlt} loading="lazy" decoding="async" />

      <span className="lp-compare-badge" data-side="left" aria-hidden="true">
        {lightBadge}
      </span>
      <span className="lp-compare-badge" data-side="right" aria-hidden="true">
        {darkBadge}
      </span>

      <div
        className="lp-compare-handle"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${Math.round(position)}%`}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            nudge(-4);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            nudge(4);
          }
          if (event.key === "Home") {
            event.preventDefault();
            setPosition(0);
          }
          if (event.key === "End") {
            event.preventDefault();
            setPosition(100);
          }
        }}
      >
        <span className="lp-compare-grip" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M5.5 4 3 7l2.5 3M8.5 4 11 7l-2.5 3" />
          </svg>
        </span>
      </div>
    </div>
  );
}
