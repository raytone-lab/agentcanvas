import { describe, expect, it } from "vitest";

import { looksLikeUnifiedDiff, unifiedDiffText } from "./unifiedDiff";

describe("unifiedDiffText", () => {
  it("turns replacement snippets into a unified diff", () => {
    expect(unifiedDiffText({
      oldCode: "const a = 1;",
      newCode: "const a = 2;",
      path: "src/App.tsx",
    })).toBe([
      "--- a/src/App.tsx",
      "+++ b/src/App.tsx",
      "@@ -1,1 +1,1 @@",
      "-const a = 1;",
      "+const a = 2;",
    ].join("\n"));
  });

  it("keeps shared prefix and suffix as context", () => {
    expect(unifiedDiffText({
      oldCode: "a\nb\nc",
      newCode: "a\nB\nc",
      path: "notes.txt",
    })).toBe([
      "--- a/notes.txt",
      "+++ b/notes.txt",
      "@@ -1,3 +1,3 @@",
      " a",
      "-b",
      "+B",
      " c",
    ].join("\n"));
  });

  it("emits an add-only hunk when the old snippet is empty", () => {
    expect(unifiedDiffText({
      oldCode: "",
      newCode: "hello",
      path: "new.txt",
    })).toBe([
      "--- a/new.txt",
      "+++ b/new.txt",
      "@@ -0,0 +1,1 @@",
      "+hello",
    ].join("\n"));
  });

  it("returns nothing when there is no change to show", () => {
    expect(unifiedDiffText({ oldCode: "", newCode: "" })).toBeUndefined();
    expect(unifiedDiffText({ oldCode: "same", newCode: "same", path: "a.ts" })).toBeUndefined();
  });
});

describe("looksLikeUnifiedDiff", () => {
  it("accepts a real patch and rejects ordinary source", () => {
    expect(looksLikeUnifiedDiff("--- a/src/App.tsx\n+++ b/src/App.tsx\n@@ -1,1 +1,1 @@\n-const a = 1;\n+const a = 2;\n")).toBe(true);
    expect(looksLikeUnifiedDiff("export const savedPreview = null;\n")).toBe(false);
  });
});
