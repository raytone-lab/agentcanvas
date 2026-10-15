import { useEffect, useRef, useState, type CSSProperties, type ElementType } from "react";

import type { AppLocale } from "../i18n/uiCopy";

/**
 * A display headline with an entrance:
 *
 *   rise   each character rises out of its line's mask while it sharpens from a blur
 *   sides  whole lines glide in from alternate sides — the first from the left, the next
 *          from the right — on one long ease-out, so the two halves of the sentence meet
 *          in the middle
 *
 * `load` plays at first paint (the hero); `view` waits until the headline is on screen
 * (once). Lines are authored — each entry of `lines` is one line — and within a line the
 * text is split into graphemes, kept in unbreakable words so Latin never wraps
 * mid-word. The full text is the accessible name; the pieces are hidden from it.
 * Nothing is hidden without script or under reduced motion.
 */
export function SplitHeadline({
  lines,
  locale,
  effect,
  trigger,
  as: Tag = "h2",
  className,
  id,
  delay = 0,
}: {
  lines: readonly string[];
  locale: AppLocale;
  effect: "rise" | "sides";
  trigger: "load" | "view";
  as?: ElementType;
  className?: string;
  id?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "armed" | "in">(trigger === "load" ? "in" : "idle");

  useEffect(() => {
    if (trigger !== "view") return;
    const node = ref.current;
    if (!node || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setState("armed");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setState("in");
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [trigger]);

  const segmenter = new Intl.Segmenter(locale, { granularity: "grapheme" });
  let index = 0;

  return (
    <Tag
      ref={ref}
      id={id}
      className={["lp-split", className].filter(Boolean).join(" ")}
      data-effect={effect}
      data-armed={state === "armed" || undefined}
      data-in={state === "in" || undefined}
      aria-label={lines.join(" ")}
      style={{ "--split-delay": `${delay}ms` } as CSSProperties}
    >
      {lines.map((line, lineIndex) => (
        <span
          className="lp-split-line"
          key={lineIndex}
          aria-hidden="true"
          style={{ "--line": lineIndex } as CSSProperties}
        >
          {line.split(/(\s+)/).map((word, wordIndex) => {
            if (!word) return null;
            if (/^\s+$/.test(word)) return <span key={wordIndex}> </span>;
            return (
              <span className="lp-split-word" key={wordIndex}>
                {[...segmenter.segment(word)].map(({ segment }) => {
                  const i = index++;
                  return (
                    <span className="lp-split-char" key={i} style={{ "--i": i } as CSSProperties}>
                      {segment}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}
