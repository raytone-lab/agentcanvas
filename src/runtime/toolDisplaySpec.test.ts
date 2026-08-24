import { describe, expect, it } from "vitest";

import { buildToolDisplaySpec } from "./toolDisplaySpec";

describe("tool display spec", () => {
  it("uses approval argsPreview as the safe input source for pending rm tools", () => {
    const spec = buildToolDisplaySpec({
      kind: "tool",
      id: "tool_rm_cache",
      name: "rm",
      title: "Remove temp cache",
      status: "awaiting_approval",
      preview: '{"path":".agent/tmp-cache","recursive":true,"force":true}',
      approval: {
        prompt: "Remove .agent/tmp-cache recursively?",
        argsPreview: { path: ".agent/tmp-cache", recursive: true, force: true },
      },
      open: true,
      createdAt: 1,
      updatedAt: 1,
    });

    expect(spec.inputBlock).toEqual({ kind: "code", lang: "bash", code: "rm -rf .agent/tmp-cache" });
    expect(spec.outputBlock).toBeUndefined();
  });

  it("maps fetch tools to request and response blocks", () => {
    const spec = buildToolDisplaySpec({
      kind: "tool",
      id: "tool_fetch_release",
      name: "fetch",
      title: "Fetch release metadata",
      status: "success",
      args: { method: "GET", url: "https://api.example.com/releases/latest" },
      result: { status: 200, version: "v1.8.0" },
      open: true,
      createdAt: 1,
      updatedAt: 2,
    });

    expect(spec.inputBlock).toEqual({
      kind: "plain",
      text: "GET https://api.example.com/releases/latest",
    });
    expect(spec.outputBlock).toEqual({
      kind: "plain",
      text: '{\n  "status": 200,\n  "version": "v1.8.0"\n}',
    });
  });
});
