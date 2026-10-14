/**
 * Line-level unified diffs from replacement fragments (`old_string` / `new_string`).
 *
 * `edit_file` does not carry a ready-made patch — only the two snippets. The output
 * panel needs a text body to preview, so this turns those snippets into unified
 * diff text. Absent or identical snippets stay absent: inventing a hunk would be
 * the same class of lie as inventing the file.
 */

export function unifiedDiffText(input: {
  oldCode: string;
  newCode: string;
  path?: string;
}): string | undefined {
  if (input.oldCode === input.newCode) {
    return undefined;
  }

  const oldLines = splitLines(input.oldCode);
  const newLines = splitLines(input.newCode);
  if (oldLines.length === 0 && newLines.length === 0) {
    return undefined;
  }

  const prefix = commonAffixLength(oldLines, newLines, "start");
  const suffix = commonAffixLength(oldLines.slice(prefix), newLines.slice(prefix), "end");
  const oldHunk = oldLines.slice(prefix, oldLines.length - suffix);
  const newHunk = newLines.slice(prefix, newLines.length - suffix);
  const contextBefore = oldLines.slice(0, prefix);
  const contextAfter = suffix > 0 ? oldLines.slice(oldLines.length - suffix) : [];

  const hunkLines = [
    ...contextBefore.map((line) => ` ${line}`),
    ...oldHunk.map((line) => `-${line}`),
    ...newHunk.map((line) => `+${line}`),
    ...contextAfter.map((line) => ` ${line}`),
  ];

  const oldStart = oldLines.length === 0 ? 0 : 1;
  const newStart = newLines.length === 0 ? 0 : 1;

  return [
    `--- ${sidePath(input.path, "a")}`,
    `+++ ${sidePath(input.path, "b")}`,
    `@@ -${oldStart},${oldLines.length} +${newStart},${newLines.length} @@`,
    ...hunkLines,
  ].join("\n");
}

export function looksLikeUnifiedDiff(text: string): boolean {
  const trimmed = text.trimStart();
  if (
    trimmed.startsWith("--- ") ||
    trimmed.startsWith("+++ ") ||
    trimmed.startsWith("diff --git ")
  ) {
    return true;
  }
  if (/(^|\n)@@\s+-\d/.test(text)) {
    return true;
  }

  let plus = 0;
  let minus = 0;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      plus += 1;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      minus += 1;
    }
  }
  return plus > 0 && minus > 0;
}

function splitLines(text: string): string[] {
  if (text === "") {
    return [];
  }
  return text.split(/\r?\n/);
}

function commonAffixLength(left: string[], right: string[], from: "start" | "end"): number {
  const limit = Math.min(left.length, right.length);
  let count = 0;
  while (count < limit) {
    const leftLine = from === "start" ? left[count] : left[left.length - 1 - count];
    const rightLine = from === "start" ? right[count] : right[right.length - 1 - count];
    if (leftLine !== rightLine) {
      break;
    }
    count += 1;
  }
  return count;
}

function sidePath(path: string | undefined, side: "a" | "b"): string {
  const cleaned = (path ?? "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^[ab]\//, "")
    .trim();
  return `${side}/${cleaned || "file"}`;
}
