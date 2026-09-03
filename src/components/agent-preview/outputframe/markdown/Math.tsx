import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * KaTeX formula rendering with a plain-text fallback: a formula that does not
 * parse shows its source instead of throwing or rendering an error node, so a
 * typo in one expression never blanks the surrounding document.
 */
export function MathSpan({ tex, display }: { tex: string; display: boolean }) {
  let markup: string;
  try {
    markup = katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      strict: false,
      output: "html",
    });
  } catch {
    return <code className="md-math-fallback">{tex}</code>;
  }
  return (
    <span
      className={display ? "md-math-block" : "md-math-inline"}
      // KaTeX markup is generated locally from the document's own TeX strings.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
