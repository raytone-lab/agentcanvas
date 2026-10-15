import { useEffect, useRef, useState, type CSSProperties } from "react";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * A numeral that counts up to `value` the first time it comes into view, odometer-style:
 * each digit is a fixed strip of 0–9 behind a one-digit window, and counting moves the
 * strip — every step slides on a slightly overshooting curve, quick at first and slowing
 * towards the end, like a dial settling.
 *
 * It used to mount a new element per step and animate it in. Steps that fast could cancel
 * the last entrance and leave the number blank; a strip has one element per digit that
 * always exists, so whatever happens to the timing, it comes to rest showing `value`.
 * Shows `value` at once under reduced motion.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShown(0);
    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        let step = 0;
        const tick = () => {
          step += 1;
          setShown(step);
          if (step >= value) return;
          // 70ms at the start, easing out to ~260ms on the last step.
          const t = step / value;
          timer = window.setTimeout(tick, 70 + 190 * t * t);
        };
        timer = window.setTimeout(tick, 250);
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      setShown(value);
    };
  }, [value]);

  const width = String(value).length;
  const digits = String(shown).padStart(width, "0").split("");

  return (
    <span ref={ref} className={["lp-countup", className].filter(Boolean).join(" ")} role="img" aria-label={String(value)}>
      {digits.map((digit, index) => (
        <span key={index} className="lp-countup-window" aria-hidden="true">
          <span className="lp-countup-strip" style={{ "--digit": Number(digit) } as CSSProperties}>
            {DIGITS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
