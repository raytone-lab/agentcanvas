import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Frame, Plug, Server, type LucideIcon } from "lucide-react";

/** What each boundary is not: a free canvas, a hosted runtime, an unbuilt integration. */
const LIMIT_ICON: readonly LucideIcon[] = [Frame, Server, Plug];

/**
 * The three boundaries, as three open columns — no cards.
 *
 * Each column is led by its icon on a soft glass disc, struck through: the thing it is not.
 * When the row first comes into view the columns play in turn — the disc grows, the icon
 * grows out of it, the strike crosses it, and then the title and the sentence rise under it
 * — once, so the reading is never interrupted on the way back up. Hidden starting states
 * live behind `data-armed`, set from script, so without script (or under reduced motion)
 * the row simply shows.
 */
export function Limits({ items }: { items: readonly { title: string; body: string }[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const [state, setState] = useState<"idle" | "armed" | "in">("idle");

  useEffect(() => {
    const node = ref.current;
    if (!node || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setState("armed");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setState("in");
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <ul
      ref={ref}
      className="lp-limits-row"
      data-armed={state === "armed" || undefined}
      data-in={state === "in" || undefined}
    >
      {items.map((item, index) => {
        const Icon = LIMIT_ICON[index] ?? Frame;
        return (
          <li key={item.title} style={{ "--i": index } as CSSProperties}>
            <span className="lp-limit-mark" aria-hidden="true">
              <span className="lp-limit-disc" />
              <span className="lp-limit-glyph">
                <Icon size={32} strokeWidth={1.5} />
              </span>
              <span className="lp-limit-strike" />
            </span>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </li>
        );
      })}
    </ul>
  );
}
