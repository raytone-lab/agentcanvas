import type { AppLocale } from "../i18n/uiCopy";

/**
 * The page's one sentence that has to be *read*, held for a full screen while it lights up
 * piece by piece as the reader scrolls — the pacing device between the styles and the
 * engineering below. The lighting is the page's ScrollTrigger (`.lp-statement-piece`);
 * without it, or under reduced motion, the sentence is simply there at full strength.
 *
 * Pieces are characters in Chinese and Japanese and words in English: a Latin word lit one
 * letter at a time reads as a loading bar, not as a sentence.
 */
export function Statement({ text, locale }: { text: string; locale: AppLocale }) {
  const granularity = locale === "en" ? "word" : "grapheme";
  const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(locale, { granularity }) : null;
  const pieces = segmenter ? [...segmenter.segment(text)].map((part) => part.segment) : [...text];

  return (
    <section className="lp-statement" aria-label={text}>
      <div className="lp-statement-sticky">
        <p className="lp-statement-text lp-display" aria-hidden="true">
          {pieces.map((piece, index) =>
            piece.trim() === "" ? (
              piece
            ) : (
              <span className="lp-statement-piece" key={index}>
                {piece}
              </span>
            ),
          )}
        </p>
      </div>
    </section>
  );
}
