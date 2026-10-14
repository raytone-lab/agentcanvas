import type { ReactNode } from "react";

export function renderDiffPreview(text: string): ReactNode {
  const lines = text.split("\n");
  return (
    <pre className="diff-preview" data-language="diff">
      {lines.map((line, index) => (
        <span key={index} className={diffLineClassName(line)}>
          {line}
          {index < lines.length - 1 ? "\n" : null}
        </span>
      ))}
    </pre>
  );
}

function diffLineClassName(line: string): string {
  if (
    line.startsWith("diff ") ||
    line.startsWith("index ") ||
    line.startsWith("---") ||
    line.startsWith("+++")
  ) {
    return "diff-line diff-line-meta";
  }
  if (line.startsWith("@@")) {
    return "diff-line diff-line-hunk";
  }
  if (line.startsWith("+")) {
    return "diff-line diff-line-add";
  }
  if (line.startsWith("-")) {
    return "diff-line diff-line-del";
  }
  return "diff-line";
}
