/**
 * Size limits for the events a run can produce.
 *
 * A single tool result or artifact can be megabytes (a big file read, a write
 * of a generated bundle). Shipping it whole means one NDJSON line that large,
 * the same content again in React state and the output panel, and a
 * JSON.stringify pass over all of it on every commit. The truncation keeps
 * the transcript usable and points at the real file instead.
 */

/** Upper bound for a single tool result or artifact payload (~100k chars). */
export const MAX_EVENT_TEXT_LENGTH = 100_000;

export const TRUNCATION_SUFFIX = "\n\n… (content truncated; open the file to see the full text)";

/** Truncates long text for event payloads; short text passes through untouched. */
export function limitEventText(value: string): string {
  if (value.length <= MAX_EVENT_TEXT_LENGTH) return value;
  return `${value.slice(0, MAX_EVENT_TEXT_LENGTH)}${TRUNCATION_SUFFIX}`;
}

/**
 * Limits arbitrary tool results (string or structured) for event payloads.
 * Structured values that overflow are cut mid-JSON — they are display
 * content, not data the runtime parses back.
 */
export function limitToolResult(result: unknown): unknown {
  if (typeof result === "string") {
    return limitEventText(result);
  }
  if (result === null || typeof result !== "object") {
    return result;
  }
  const json = JSON.stringify(result);
  if (json.length <= MAX_EVENT_TEXT_LENGTH) return result;
  return `${json.slice(0, MAX_EVENT_TEXT_LENGTH)}${TRUNCATION_SUFFIX}`;
}
