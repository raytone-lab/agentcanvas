import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { uiCopy } from "../../../../i18n/uiCopy";
import { renderMarkdownPreview } from "./renderMarkdown";

const copy = uiCopy.en.workspace.outputFrame;

function render(markdown: string): string {
  return renderToStaticMarkup(<>{renderMarkdownPreview(markdown, copy)}</>);
}

describe("renderMarkdownPreview", () => {
  it("keeps the heading scale: # → h4, ## → h5, ### → h6", () => {
    const markup = render("# Title\n## Section\n### Sub");
    expect(markup).toContain("<h4>Title</h4>");
    expect(markup).toContain("<h5>Section</h5>");
    expect(markup).toContain("<h6>Sub</h6>");
  });

  it("wraps list items in a single ul and renders inline syntax inside them", () => {
    const markup = render("- first\n- second with **bold**\n- third");
    expect(markup).toContain("<ul>");
    expect(markup).toContain("<li>first</li>");
    expect(markup).toContain("<li>second with <strong>bold</strong></li>");
    expect(markup).toContain("</ul>");
  });

  it("renders fenced code blocks with their language instead of dropping them", () => {
    const markup = render("intro\n```ts\nconst x: number = 1;\n```\nafter");
    expect(markup).toContain("intro");
    expect(markup).toContain('class="md-code-block"');
    expect(markup).toContain('data-language="ts"');
    expect(markup).toContain("const x: number = 1;");
    expect(markup).toContain("after");
  });

  it("renders a mermaid fence as a lazy diagram container", () => {
    const markup = render("```mermaid\ngraph TD\n  A --> B\n```");
    expect(markup).toContain('class="md-mermaid"');
    // Server rendering emits the pending placeholder; the client-side dynamic
    // import swaps in the diagram. Real rendering is covered by the browser.
    expect(markup).toContain('data-mermaid-state="pending"');
    expect(markup).toContain("aria-busy");
  });

  it("renders display math blocks through KaTeX", () => {
    const markup = render("$$\nE = mc^2\n$$");
    expect(markup).toContain("md-math-block");
    expect(markup).toContain("katex");
    expect(markup).not.toContain("E = mc^2</"); // TeX source is compiled, not shown raw
  });

  it("renders single-line display math", () => {
    const markup = render("$$c^2 = a^2 + b^2$$");
    expect(markup).toContain("md-math-block");
    expect(markup).toContain("katex");
  });

  it("renders inline math with $ and \\( delimiters, but keeps currency prose as text", () => {
    const dollar = render("Value $x^2$ here.");
    expect(dollar).toContain("md-math-inline");
    expect(dollar).toContain("katex");

    const paren = render("Value \\(y_1\\) here.");
    expect(paren).toContain("md-math-inline");

    const currency = render("It costs $ 5 and $10 total.");
    expect(currency).not.toContain("katex");
    expect(currency).toContain("It costs $ 5 and $10 total.");
  });

  it("renders inline code, bold, italic and http links", () => {
    const markup = render("Use `npm run dev` with *care* and **docs** at [site](https://example.com).");
    expect(markup).toContain("<code>npm run dev</code>");
    expect(markup).toContain("<em>care</em>");
    expect(markup).toContain("<strong>docs</strong>");
    expect(markup).toContain('<a href="https://example.com"');
    expect(markup).toContain('rel="noopener noreferrer"');
  });

  it("does not turn non-http link targets into anchors", () => {
    const markup = render("[x](javascript:alert(1))");
    expect(markup).not.toContain("<a ");
  });

  it("renders blockquotes and horizontal rules", () => {
    const markup = render("> quoted line\n\n---\n\nend");
    expect(markup).toContain("<blockquote>");
    expect(markup).toContain("quoted line");
    expect(markup).toContain("<hr/>");
  });

  it("joins consecutive text lines into one paragraph", () => {
    const markup = render("first line\nsecond line");
    expect(markup).toContain("<p>first line second line</p>");
  });

  it("falls back to the empty-state copy for blank input", () => {
    const markup = render("   \n\n");
    expect(markup).toContain(copy.noMarkdownPreviewContent);
  });

  it("keeps code spans literal: no nested markdown inside them", () => {
    const markup = render("`` `code` **not bold** `` is tricky".replace(/``\s|\s``/g, "` `"));
    expect(markup).toContain("<code>");
  });

  it("protects code spans from math and emphasis rules", () => {
    const markup = render("Run `$x^2$` and `**raw**` literally.");
    expect(markup).toContain("<code>$x^2$</code>");
    expect(markup).toContain("<code>**raw**</code>");
    expect(markup).not.toContain("katex");
    expect(markup).not.toContain("<strong>");
  });
});
