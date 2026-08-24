import type { ToolConcept } from "../../runtime/eventNormalizer";

/**
 * A vendor's stream format, described as data.
 *
 * Onboarding a harness must not mean writing a component or an adapter — the whole point is
 * that our UI is the standard and a backend conforms to it. So each vendor contributes one of
 * these tables and nothing else. `tableDrivenAdapter` is the only code that reads them.
 *
 * Two shapes are needed, not one. A flat stream (Codex) puts one event on one line, reachable
 * by a dot path. Claude Code's `stream-json` puts an *array of typed content blocks* on one
 * line, so a dot path cannot address the individual pieces. Pretending one shape covers both
 * would mean either hand-writing an adapter for the second, or silently dropping every block
 * after the first. Hence `mode`.
 */

/** What a vendor's event means in our vocabulary. */
export type MappedKind =
  | "run.start"
  | "run.finish"
  | "run.error"
  | "text"
  | "reasoning"
  | "tool.start"
  | "tool.result"
  | "tool.finish"
  /** Recognised and deliberately not rendered (bookkeeping, heartbeats, token counts). */
  | "ignore";

/**
 * A dot path, or several to try in order.
 *
 * Alternatives are needed, not a convenience: one vendor names the same concept differently
 * depending on where it appears. Claude Code puts a call id on `id` inside a `tool_use` block
 * and on `tool_use_id` inside the matching `tool_result`. With a single path the result cannot
 * be correlated to its call at all.
 */
export type Path = string | readonly string[];

/**
 * Where each field lives. Array indices are supported (`content.0.text`), and a missing path
 * simply means the vendor does not carry that field — the surface degrades rather than
 * inventing a value.
 */
export type FieldPaths = {
  toolCallId?: Path;
  toolName?: Path;
  /** Parsed object of arguments. */
  args?: Path;
  /** Arguments as a JSON string, when the vendor sends them unparsed. */
  argsText?: Path;
  result?: Path;
  resultPreview?: Path;
  /** Maps onto our tool status; anything not "success"/"error" passes through. */
  status?: Path;
  /**
   * A boolean error flag, for vendors that report failure as `is_error: true` rather than a
   * status string. Kept separate from `status` because a bare boolean there is ambiguous —
   * `true` could mean "ok" or "failed" depending on the field name, and guessing from the
   * type silently reported failed tool calls as successes.
   */
  errorFlag?: Path;
  text?: Path;
  reasoning?: Path;
  errorMessage?: Path;
  /** Command array or string, for shells that report `["bash","-lc","ls"]`. */
  command?: Path;
};

export type HarnessMapping = {
  id: string;
  label: string;
  /**
   * Whether this table was calibrated against a captured stream from the real tool.
   *
   * `false` means it was written from published format docs and the field paths may not match
   * the version you run. It is surfaced in the diagnostics report rather than hidden, because
   * a wrong path renders as an empty transcript, which looks identical to "the agent said
   * nothing". One real run is enough to fix a table; no code changes.
   */
  verified: boolean;
  mode: "flat" | "content-blocks";

  /** Dot path to the value that says what kind of event this line is. */
  typePath: string;
  typeMap: Record<string, MappedKind>;
  paths: FieldPaths;

  /** `content-blocks` mode: where the block array lives and how to read each block. */
  contentPath?: string;
  blockTypePath?: string;
  blockTypeMap?: Record<string, MappedKind>;
  blockPaths?: FieldPaths;

  /** Wording this vendor uses for bookkeeping, handed to the admission layer. */
  diagnosticMarkers?: readonly string[];
  /** Tool-name spellings this vendor uses, handed to the admission layer. */
  extraAliases?: Partial<Record<ToolConcept, readonly string[]>>;
};

function readSinglePath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const segment of path.split(".")) {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
      continue;
    }
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** Read a dot path, tolerating arrays and missing intermediates. First alternative wins. */
export function readPath(source: unknown, path: Path | undefined): unknown {
  if (!path) return undefined;
  if (typeof path === "string") return readSinglePath(source, path);
  for (const candidate of path) {
    const value = readSinglePath(source, candidate);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

export function readString(source: unknown, path: Path | undefined): string | undefined {
  const value = readPath(source, path);
  if (typeof value === "string") return value.length > 0 ? value : undefined;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

/** A command may arrive as a string or as an argv array. */
export function readCommand(source: unknown, path: Path | undefined): string | undefined {
  const value = readPath(source, path);
  if (typeof value === "string") return value || undefined;
  if (Array.isArray(value)) {
    const parts = value.filter((item): item is string => typeof item === "string");
    return parts.length ? parts.join(" ") : undefined;
  }
  return undefined;
}

/** Rendered into diagnostics so a mis-specified path is readable. */
export function describePath(path: Path | undefined): string {
  if (!path) return "(未配置)";
  return typeof path === "string" ? path : path.join(" | ");
}
