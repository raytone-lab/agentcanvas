import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";

/**
 * Slides a pill behind whichever control in a group is active.
 *
 * One hook for both switchers on the page — the language toggle and the theme tabs — so
 * they share a single easing curve and duration instead of each inventing its own. The
 * pill is a real element the caller renders; this only measures the active control and
 * animates the pill onto it.
 *
 * Measuring on every change rather than caching: the controls hold text whose width
 * changes with locale, so a cached geometry would leave the pill on the previous label's
 * footprint after a language switch.
 */
export function useSlidingPill<T extends HTMLElement>({
  containerRef,
  pillRef,
  activeSelector,
  deps,
}: {
  containerRef: RefObject<T | null>;
  pillRef: RefObject<HTMLElement | null>;
  /** Selector for the active control, resolved inside the container. */
  activeSelector: string;
  /** Values that change which control is active, or its measured size. */
  deps: unknown[];
}) {
  // Skips the entrance animation so the pill is simply in place on first paint.
  const settled = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const pill = pillRef.current;
    if (!container || !pill) return;

    const move = () => {
      const active = container.querySelector<HTMLElement>(activeSelector);
      if (!active) return;

      const target = {
        x: active.offsetLeft,
        width: active.offsetWidth,
        autoAlpha: 1,
      };

      const reduced =
        typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!settled.current || reduced) {
        gsap.set(pill, target);
        settled.current = true;
        return;
      }

      gsap.to(pill, {
        ...target,
        duration: 0.42,
        // Decelerating, no overshoot: a pill that springs past its target and comes back
        // reads as a toy on a control this small.
        ease: "power3.out",
      });
    };

    move();

    // Fonts and locale swaps both change the controls' widths after first paint.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(move);
    observer?.observe(container);
    return () => observer?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, pillRef, activeSelector, ...deps]);
}
