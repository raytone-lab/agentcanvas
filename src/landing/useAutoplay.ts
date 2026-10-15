import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * The gate every auto-advancing block on the page shares: it runs only while the block is
 * on screen, and never under reduced motion. The advance itself is a CSS animation (a
 * dwell meter) whose `animationend` moves the block on, so pausing — off screen, or under
 * the pointer via `:hover` — is just `animation-play-state`, with no timer to keep in sync.
 */
export function useAutoplay<T extends Element>(threshold = 0.4) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(matchMedia("(prefers-reduced-motion: reduce)").matches);
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, running: inView && !reduced };
}

/**
 * Keeps the active tab in view when its list scrolls sideways (the decks on a phone). It
 * scrolls the list itself, never the page, so an auto-advance cannot yank the reader.
 */
export function useActiveTabInView(list: RefObject<HTMLElement | null>, active: number) {
  useEffect(() => {
    const node = list.current;
    if (!node || node.scrollWidth <= node.clientWidth) return;
    const tab = node.children[active] as HTMLElement | undefined;
    if (!tab) return;
    node.scrollTo({ left: tab.offsetLeft - (node.clientWidth - tab.offsetWidth) / 2, behavior: "smooth" });
  }, [list, active]);
}
