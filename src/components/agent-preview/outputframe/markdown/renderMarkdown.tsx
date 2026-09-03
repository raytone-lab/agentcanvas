import type { ReactNode } from "react";

import type { OutputFrameCopy } from "../types";
import { MathSpan } from "./Math";
import { MermaidDiagram } from "./MermaidDiagram";
import { parseInlineText } from "./inline";

/**
 * Block-level markdown renderer for the output surfaces.
 *
 * Covers the subset an agent actually writes into files and artifacts:
 * headings, lists, blockquotes, rules, fenced code (mermaid fences render as
 * diagrams), display/inline math, plus inline code, bold, italic and links.
 * Not a full CommonMark implementation — unsupported syntax degrades to
 * readable text rather than disappearing.
 */
export function renderMarkdownPreview(markdown: string, copy: OutputFrameCopy): ReactNode[] {
  const nodes: ReactNode[] = [];
  const lines = markdown.split(/\r?\n/);
  let index = 0;
  let key = 0;

  const push = (node: ReactNode) => {
    nodes.push(node);
    key += 1;
  };

  while (index < lines.length) {
    const line = lines[index];

    // Fenced code block: ```lang … ``` (the fence may also close at EOF).
    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        body.push(lines[index]);
        index += 1;
      }
      // Skip the closing fence when present.
      if (index < lines.length) {
        index += 1;
      }
      const code = body.join("\n");
      if (language === "mermaid") {
        push(<MermaidDiagram key={`mermaid:${key}`} code={code} />);
      } else {
        push(
          <pre key={`code:${key}`} className="md-code-block" data-language={language || "text"}>
            {code}
          </pre>,
        );
      }
      continue;
    }

    // Display math block: $$ … $$ on one line, or an open fence closed later.
    if (line.trimStart().startsWith("$$")) {
      const single = line.trim().replace(/^\$\$/, "").replace(/\$\$$/, "");
      if (line.trim().endsWith("$$") && line.trim().length > 4) {
        push(<MathBlock key={`math:${key}`} tex={single} />);
        index += 1;
        continue;
      }
      const body: string[] = [];
      if (single.trim()) {
        body.push(single);
      }
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("$$")) {
        body.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        const closing = lines[index].trim();
        if (closing.length > 2) {
          body.push(closing.replace(/^\$\$/, "").replace(/\$\$$/, ""));
        }
        index += 1;
      }
      push(<MathBlock key={`math:${key}`} tex={body.join("\n")} />);
      continue;
    }

    // Blank line: block separator, not a node.
    if (!line.trim()) {
      index += 1;
      continue;
    }

    // Horizontal rule.
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      push(<hr key={`hr:${key}`} />);
      index += 1;
      continue;
    }

    // Heading: `#` maps to h4, matching the output panel's heading scale.
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length + 3, 6);
      const Tag = `h${level}` as "h4" | "h5" | "h6";
      push(<Tag key={`heading:${key}`}>{parseInlineText(heading[2].trim())}</Tag>);
      index += 1;
      continue;
    }

    // Blockquote: consecutive `>` lines collapse into one quote.
    if (line.startsWith(">")) {
      const body: string[] = [];
      while (index < lines.length && lines[index].startsWith(">")) {
        body.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      push(<blockquote key={`quote:${key}`}>{renderMarkdownPreview(body.join("\n"), copy)}</blockquote>);
      continue;
    }

    // List: consecutive `- ` / `* ` items (and the blank-line-separated
    // continuation of one) collapse into a single list.
    if (/^\s*(?:[-*])\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index];
        if (/^\s*(?:[-*])\s+/.test(current)) {
          items.push(current.replace(/^\s*(?:[-*])\s+/, ""));
          index += 1;
          continue;
        }
        // An indented continuation line belongs to the previous item.
        if (items.length > 0 && /^\s+\S/.test(current)) {
          items[items.length - 1] += ` ${current.trim()}`;
          index += 1;
          continue;
        }
        break;
      }
      push(
        <ul key={`list:${key}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{parseInlineText(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Paragraph: consecutive non-blank, non-structural lines joined by spaces.
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith("```") &&
      !lines[index].trimStart().startsWith("$$") &&
      !lines[index].startsWith(">") &&
      !/^#{1,6}\s/.test(lines[index]) &&
      !/^\s*(?:[-*])\s+/.test(lines[index]) &&
      !/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(lines[index])
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    push(<p key={`para:${key}`}>{parseInlineText(paragraph.join(" "))}</p>);
  }

  return nodes.length > 0 ? nodes : [<p key="empty">{copy.noMarkdownPreviewContent}</p>];
}

function MathBlock({ tex }: { tex: string }) {
  return <MathSpan tex={tex.trim()} display />;
}
