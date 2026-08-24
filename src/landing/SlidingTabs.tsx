import { useRef, useState, type ReactNode } from "react";
import gsap from "gsap";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useSlidingPill } from "./useSlidingPill";

export type SlidingTabItem = {
  value: string;
  label: string;
  content: ReactNode;
};

/**
 * Radix tabs with a pill that slides between triggers and a panel that crossfades.
 *
 * Behaviour, roles and keyboard handling all come from the project's own
 * `src/components/ui/tabs.tsx`; this adds only the motion. Controlled rather than
 * `defaultValue` because the pill needs to know which trigger is active in order to
 * measure it.
 */
export function SlidingTabs({
  items,
  label,
  className,
}: {
  items: readonly SlidingTabItem[];
  label: string;
  className?: string;
}) {
  const [value, setValue] = useState(items[0]?.value ?? "");
  const listRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useSlidingPill({
    containerRef: listRef,
    pillRef,
    activeSelector: '[role="tab"][data-state="active"]',
    deps: [value, items.length],
  });

  const change = (next: string) => {
    if (next === value) return;
    setValue(next);

    const panel = panelRef.current;
    if (!panel) return;
    const reduced =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    // The incoming panel is a different element each time, so the tween runs on the
    // wrapper — a crossfade of the wrapper reads the same and cannot be interrupted
    // mid-swap by Radix unmounting the outgoing panel.
    gsap.fromTo(
      panel,
      { autoAlpha: 0, y: 6 },
      { autoAlpha: 1, y: 0, duration: 0.34, ease: "power2.out", overwrite: true },
    );
  };

  return (
    <Tabs
      className={["lp-tabs", className].filter(Boolean).join(" ")}
      value={value}
      onValueChange={change}
    >
      <div className="lp-tabs-list-wrap" ref={listRef}>
        <span className="lp-tabs-pill" ref={pillRef} aria-hidden="true" />
        <TabsList aria-label={label}>
          {items.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <div ref={panelRef}>
        {items.map((item) => (
          <TabsContent key={item.value} value={item.value}>
            {item.content}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
