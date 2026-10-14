import { useEffect, useState } from "react";

/** The exit animation's length — `.motion-menu[data-state="closed"]` in app.css. */
export const MENU_EXIT_MS = 130;

/**
 * Keep a hand-rolled menu mounted long enough to animate out.
 *
 * The Radix menus (`SelectMenu`, `DropdownMenu`) do this themselves: they hold
 * the content for its `data-state="closed"` animation. The editor's own menus
 * — the brand menu, the zoom menu, the style chip's cards — were plain
 * conditionals, so they vanished in a frame however they opened. This gives
 * them the same two states, so `.motion-menu` can play the same entrance and
 * exit the model picker does.
 */
export function useMenuPresence(open: boolean): { mounted: boolean; state: "open" | "closed" } {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), MENU_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  return { mounted: open || mounted, state: open ? "open" : "closed" };
}
