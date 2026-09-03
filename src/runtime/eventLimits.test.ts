import { describe, expect, it } from "vitest";

import { MAX_EVENT_TEXT_LENGTH, TRUNCATION_SUFFIX, limitEventText, limitToolResult } from "./eventLimits";

describe("event size limits", () => {
  it("leaves short text untouched", () => {
    expect(limitEventText("hello")).toBe("hello");
  });

  it("truncates long text with a marker", () => {
    const long = "x".repeat(MAX_EVENT_TEXT_LENGTH + 5000);
    const limited = limitEventText(long);
    expect(limited.length).toBeLessThan(long.length);
    expect(limited.endsWith(TRUNCATION_SUFFIX)).toBe(true);
    expect(limited.slice(0, 20)).toBe("x".repeat(20));
  });

  it("passes non-string, non-object results through", () => {
    expect(limitToolResult(42)).toBe(42);
    expect(limitToolResult(null)).toBe(null);
    expect(limitToolResult(undefined)).toBe(undefined);
  });

  it("keeps small structured results intact", () => {
    const result = { ok: true, insertions: 3 };
    expect(limitToolResult(result)).toEqual(result);
  });

  it("caps oversized structured results as truncated JSON", () => {
    const result = { blob: "y".repeat(MAX_EVENT_TEXT_LENGTH + 10) };
    const limited = limitToolResult(result) as string;
    expect(typeof limited).toBe("string");
    expect(limited.endsWith(TRUNCATION_SUFFIX)).toBe(true);
  });
});
