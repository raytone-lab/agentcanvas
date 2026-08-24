import { describe, expect, it } from "vitest";

import { anthropicLiveToolset, LIVE_MODEL_TOOLSET } from "../harness/providerCapabilities";
import { simulateLiveToolCall } from "./liveToolSimulator";

describe("live tool simulator", () => {
  it("produces a result for every tool the live toolset advertises", () => {
    // If a tool is added to LIVE_MODEL_TOOLSET without a simulated outcome, the model can call
    // it and the card falls to an unsupported error — this pins the two lists together.
    for (const tool of LIVE_MODEL_TOOLSET) {
      const outcome = simulateLiveToolCall({
        name: tool.function.name,
        args: { path: "src/App.tsx", content: "a\nb", old_str: "a", new_str: "b", command: "npm test", query: "useSearch" },
      });
      expect(outcome, `${tool.function.name} has no simulated outcome`).toMatchObject({ kind: "result" });
    }
  });

  it("advertises the same tools to Anthropic as to the openai-compatible providers", () => {
    // The two live paths build their request bodies separately. If these lists diverge, Claude
    // gets a different toolset than every other provider and the difference is invisible until
    // someone runs a live session with a real key.
    expect(anthropicLiveToolset().map((tool) => tool.name)).toEqual(
      LIVE_MODEL_TOOLSET.map((tool) => tool.function.name),
    );
    for (const [index, tool] of anthropicLiveToolset().entries()) {
      expect(tool.description).toBe(LIVE_MODEL_TOOLSET[index].function.description);
      expect(tool.input_schema).toEqual(LIVE_MODEL_TOOLSET[index].function.parameters);
    }
  });

  it("resolves alternate tool spellings through the shared concept table", () => {
    // The renderer resolves `read`, `cat` and `filesystem.read_text_file` to the same card, so
    // the simulator must not disagree and send one of them down the unsupported path.
    for (const name of ["read_file", "read", "cat", "filesystem.read_text_file"]) {
      const outcome = simulateLiveToolCall({ name, args: { path: "src/App.tsx" } });
      expect(outcome, name).toMatchObject({ kind: "result" });
    }
  });

  it("labels every simulated result so the card does not imply the work happened", () => {
    const read = simulateLiveToolCall({ name: "read_file", args: { path: "src/App.tsx" } });
    const search = simulateLiveToolCall({ name: "search", args: { query: "useSearch" } });
    const command = simulateLiveToolCall({ name: "run_command", args: { command: "npm test" } });

    expect(read).toMatchObject({ kind: "result" });
    expect(String(read.kind === "result" ? read.result : "")).toContain("simulated live result");
    expect(search).toMatchObject({ kind: "result", result: { note: "simulated live result" } });
    expect(String(command.kind === "result" ? command.result : "")).toContain("no process was started");
  });

  it("echoes the model's own arguments into the result so the card reads as that call", () => {
    const outcome = simulateLiveToolCall({ name: "read_file", args: { path: "docs/EXPORT_CONTRACT.md" } });
    expect(outcome.kind).toBe("result");
    if (outcome.kind !== "result") return;
    expect(String(outcome.result)).toContain("docs/EXPORT_CONTRACT.md");
    expect(outcome.resultPreview).toMatch(/^\d+ lines$/);
  });

  it("reports a diff preview counting the lines the edit actually named", () => {
    const outcome = simulateLiveToolCall({
      name: "edit_file",
      args: { path: "src/App.tsx", old_str: "one\ntwo", new_str: "alpha\nbeta\ngamma" },
    });
    expect(outcome).toMatchObject({ kind: "result", resultPreview: "+3 -2" });
  });

  it("errors when arguments are unusable rather than inventing a success", () => {
    expect(simulateLiveToolCall({ name: "read_file", args: undefined })).toMatchObject({
      kind: "error",
      code: "LIVE_TOOL_ARGS_INVALID",
      retryable: true,
    });
  });

  it("errors when a command is requested without a command", () => {
    expect(simulateLiveToolCall({ name: "run_command", args: {} })).toMatchObject({
      kind: "error",
      code: "LIVE_TOOL_ARGS_INCOMPLETE",
      retryable: true,
    });
  });

  it("errors, without retry, for a tool outside the advertised toolset", () => {
    expect(simulateLiveToolCall({ name: "deploy_to_production", args: { env: "prod" } })).toMatchObject({
      kind: "error",
      code: "LIVE_TOOL_UNSUPPORTED",
      retryable: false,
    });
  });

  it("keeps simulated copy in English so the preview dictionary can localize it", () => {
    // `i18n/previewLocalization.ts` looks up English source text; a Chinese string authored here
    // would never be translated and would leak into an English preview.
    const outcomes = [
      simulateLiveToolCall({ name: "read_file", args: undefined }),
      simulateLiveToolCall({ name: "run_command", args: {} }),
      simulateLiveToolCall({ name: "deploy_to_production", args: {} }),
    ];
    for (const outcome of outcomes) {
      expect(outcome.kind).toBe("error");
      if (outcome.kind !== "error") continue;
      expect(outcome.userMessage).not.toMatch(/[一-鿿]/);
      expect(outcome.developerMessage).not.toMatch(/[一-鿿]/);
    }
  });
});
