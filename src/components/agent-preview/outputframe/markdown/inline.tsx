import type { ReactNode } from "react";

import { MathSpan } from "./Math";

/**
 * Inline markdown: code spans, math, bold, italic and http(s) links.
 *
 * Parsed one syntax at a time, highest priority first — a code span protects its
 * content from every later rule, exactly like CommonMark. Anything unmatched is
 * plain text, so partial syntax (a lone `*` or `$`) renders literally instead of
 * disappearing.
 */

const codePattern = /`([^`\n]+)`/;
// Inline math: content must not start or end with whitespace, so "$ 5 and $10"
// (currency prose) stays text while "$x^2$" and "$E=mc^2$" render.
const mathPattern = /\$([^\s$](?:[^$]*[^\s$])?)\$/;
const parenMathPattern = /\\\((.+?)\\\)/;
const boldPattern = /\*\*([^*\n]+)\*\*/;
const italicPattern = /\*([^*\n]+)\*/;
const linkPattern = /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/;

type InlinePattern = { pattern: RegExp; render: (match: RegExpExecArray, key: number) => ReactNode };

const patterns: InlinePattern[] = [
  {
    pattern: codePattern,
    render: (match, key) => <code key={key}>{match[1]}</code>,
  },
  {
    pattern: mathPattern,
    render: (match, key) => {
      const tex = (match[1] ?? match[2] ?? "").trim();
      return <MathSpan key={key} tex={tex} display={false} />;
    },
  },
  {
    pattern: parenMathPattern,
    render: (match, key) => <MathSpan key={key} tex={match[1].trim()} display={false} />,
  },
  {
    pattern: boldPattern,
    render: (match, key) => <strong key={key}>{match[1]}</strong>,
  },
  {
    pattern: italicPattern,
    render: (match, key) => <em key={key}>{match[1]}</em>,
  },
  {
    pattern: linkPattern,
    render: (match, key) => (
      <a key={key} href={match[2]} target="_blank" rel="noopener noreferrer">
        {match[1]}
      </a>
    ),
  },
];

export function parseInlineText(text: string): ReactNode[] {
  return parseWith(text, 0);
}

function parseWith(text: string, patternIndex: number): ReactNode[] {
  if (patternIndex >= patterns.length || text === "") {
    return text === "" ? [] : [text];
  }

  const { pattern, render } = patterns[patternIndex];
  const nodes: ReactNode[] = [];
  let rest = text;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(rest)) !== null) {
    const before = rest.slice(0, match.index);
    if (before) {
      nodes.push(...parseWith(before, patternIndex + 1));
    }
    nodes.push(render(match, key++));
    rest = rest.slice(match.index + match[0].length);
    // Zero-length matches cannot happen with these patterns (all require
    // content), but resetting lastIndex keeps exec honest if one ever does.
    pattern.lastIndex = 0;
  }
  if (rest) {
    nodes.push(...parseWith(rest, patternIndex + 1));
  }
  return nodes;
}
