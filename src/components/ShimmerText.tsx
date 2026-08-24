import type { CSSProperties } from "react";

type ShimmerTextProps = {
  text: string;
  className?: string;
};

/**
 * Renders text as one span per character so each glyph can carry its own
 * staggered shimmer animation (driven by the `--char-index` CSS var).
 * The animations themselves live in app.css, scoped to the shimmer motion.
 */
export function ShimmerText({ text, className }: ShimmerTextProps) {
  return (
    <span className={className} data-shimmer-text="true">
      {Array.from(text).map((char, index) => (
        <span key={index} style={{ "--char-index": index } as CSSProperties}>
          {char === " " ? " " : char}
        </span>
      ))}
    </span>
  );
}
