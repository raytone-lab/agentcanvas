import { describe, expect, it } from "vitest";

import { inspectAgentUXEvents } from "../../runtime/eventContract";
import { normalizeAgentUXEvents } from "../../runtime/eventNormalizer";
import { claudeCodeMapping } from "./mappings/claudeCode";
import { codexMapping } from "./mappings/codex";
import { opencodeMapping } from "./mappings/opencode";
import { allMappings, describeMissingMapping, mappingForHarness, speaksOurProtocol } from "./registry";
import {
  formatTranslateReport,
  parseHarnessLines,
  producedNothing,
  translateHarnessStream,
} from "./tableDrivenAdapter";

/**
 * The same conversation, expressed in each vendor's format: think, read a file, run a command
 * that fails, answer. The point of the table-driven adapter is that all three collapse onto
 * one event vocabulary, so the last test in this file asserts they render the same shape.
 */

const codexLines = [
  { id: "0", msg: { type: "session_configured", session_id: "s" } },
  { id: "1", msg: { type: "task_started" } },
  { id: "2", msg: { type: "agent_reasoning", text: "先看配置。" } },
  { id: "3", msg: { type: "exec_command_begin", call_id: "c1", command: ["cat", "src/app.ts"] } },
  { id: "4", msg: { type: "exec_command_end", call_id: "c1", stdout: "export const a = 1", exit_code: 0 } },
  { id: "5", msg: { type: "exec_command_begin", call_id: "c2", command: ["bash", "-lc", "npm test"] } },
  { id: "6", msg: { type: "exec_command_end", call_id: "c2", stdout: "1 failing", exit_code: 1 } },
  { id: "7", msg: { type: "token_count", total: 1234 } },
  { id: "8", msg: { type: "agent_message", message: "有一个测试失败。" } },
  { id: "9", msg: { type: "task_complete" } },
];

const claudeCodeLines = [
  { type: "system", subtype: "init", session_id: "s" },
  {
    type: "assistant",
    message: { content: [{ type: "thinking", thinking: "先看配置。" }] },
  },
  {
    type: "assistant",
    message: {
      content: [
        { type: "tool_use", id: "c1", name: "Read", input: { file_path: "src/app.ts" } },
      ],
    },
  },
  {
    type: "user",
    message: { content: [{ type: "tool_result", tool_use_id: "c1", content: "export const a = 1" }] },
  },
  {
    type: "assistant",
    message: {
      content: [{ type: "tool_use", id: "c2", name: "Bash", input: { command: "npm test" } }],
    },
  },
  {
    type: "user",
    message: { content: [{ type: "tool_result", tool_use_id: "c2", content: "1 failing", is_error: true }] },
  },
  {
    type: "assistant",
    message: { content: [{ type: "text", text: "有一个测试失败。" }] },
  },
  { type: "result", subtype: "success", result: "done" },
];

const opencodeLines = [
  { type: "session.created", properties: { id: "s" } },
  { type: "message.part.updated", properties: { part: { type: "reasoning", reasoning: "先看配置。" } } },
  {
    type: "tool.execute.start",
    properties: { part: { callID: "c1", tool: "read", state: { input: { path: "src/app.ts" } } } },
  },
  {
    type: "tool.execute.end",
    properties: { part: { callID: "c1", state: { output: "export const a = 1", status: "completed" } } },
  },
  {
    type: "tool.execute.start",
    properties: { part: { callID: "c2", tool: "bash", state: { input: { command: "npm test" } } } },
  },
  {
    type: "tool.execute.end",
    properties: { part: { callID: "c2", state: { output: "1 failing", status: "error" } } },
  },
  { type: "message.part.updated", properties: { part: { type: "text", text: "有一个测试失败。" } } },
  { type: "session.idle", properties: { id: "s" } },
];

const payloadsOf = (events: readonly { type: string; payload: Record<string, unknown> }[], type: string) =>
  events.filter((event) => event.type === type).map((event) => event.payload);

describe("table-driven adapter: codex", () => {
  it("maps a flat JSONL stream onto our events", () => {
    const { events, report } = translateHarnessStream(codexLines, codexMapping);

    expect(payloadsOf(events, "reasoning.delta").map((p) => p.delta)).toEqual(["先看配置。"]);
    expect(payloadsOf(events, "text.delta").map((p) => p.delta)).toEqual(["有一个测试失败。"]);
    expect(report.unmapped, formatTranslateReport({ events, report, mapping: codexMapping })).toEqual([]);
  });

  it("turns an argv array into a command the card can show", () => {
    // Codex reports ["bash","-lc","npm test"]; without joining it the command card degrades.
    const { events } = translateHarnessStream(codexLines, codexMapping);
    const running = payloadsOf(events, "tool.call.running");
    expect(running[0].args).toEqual({ command: "cat src/app.ts" });
    expect(running[1].args).toEqual({ command: "bash -lc npm test" });
  });

  it("reads a non-zero exit code as a failure", () => {
    const { events } = translateHarnessStream(codexLines, codexMapping);
    expect(payloadsOf(events, "tool.call.finished")).toEqual([
      { toolCallId: "c1", status: "success" },
      { toolCallId: "c2", status: "error" },
    ]);
  });

  it("keeps token accounting out of the transcript", () => {
    const { events, report } = translateHarnessStream(codexLines, codexMapping);
    expect(report.ignored).toBeGreaterThan(0);
    expect(JSON.stringify(events)).not.toContain("1234");
  });
});

describe("table-driven adapter: claude code", () => {
  it("maps every block of a content array, not just the first", () => {
    // A flat dot path can reach content.0 but not "each element"; a tool call following a
    // sentence in the same line would vanish silently.
    const multi = [
      {
        type: "assistant",
        message: {
          content: [
            { type: "text", text: "先读一下。" },
            { type: "tool_use", id: "x", name: "Read", input: { file_path: "a.ts" } },
          ],
        },
      },
    ];
    const { events } = translateHarnessStream(multi, claudeCodeMapping);
    expect(payloadsOf(events, "text.delta").map((p) => p.delta)).toEqual(["先读一下。"]);
    expect(payloadsOf(events, "tool.call.started")).toHaveLength(1);
  });

  it("correlates a tool_result back to its tool_use across lines", () => {
    // `tool_use` carries `id`, `tool_result` carries `tool_use_id`. With a single path the
    // result could not be matched and the card would spin forever.
    const { events, report } = translateHarnessStream(claudeCodeLines, claudeCodeMapping);
    expect(
      report.missingFields.filter((item) => item.field === "toolCallId"),
      formatTranslateReport({ events, report, mapping: claudeCodeMapping }),
    ).toEqual([]);
    expect(payloadsOf(events, "tool.call.result").map((p) => p.result)).toEqual([
      "export const a = 1",
      "1 failing",
    ]);
  });

  it("reads is_error as a failure rather than defaulting to success", () => {
    // `is_error` is a boolean; a status reader that only understands strings and numbers
    // reported the failed call as a success.
    const { events } = translateHarnessStream(claudeCodeLines, claudeCodeMapping);
    expect(payloadsOf(events, "tool.call.finished")).toEqual([
      { toolCallId: "c1", status: "success" },
      { toolCallId: "c2", status: "error" },
    ]);
  });

  it("folds capitalised tool names onto our concepts", () => {
    const { events } = translateHarnessStream(claudeCodeLines, claudeCodeMapping);
    const admitted = normalizeAgentUXEvents(events, { extraAliases: claudeCodeMapping.extraAliases });
    expect(admitted.canonicalizedNames.map((item) => item.to)).toEqual(["read_file", "run_command"]);
    expect(admitted.rejected).toEqual([]);
  });
});

describe("table-driven adapter: opencode", () => {
  it("maps its nested part payloads", () => {
    const { events, report } = translateHarnessStream(opencodeLines, opencodeMapping);
    expect(payloadsOf(events, "text.delta").map((p) => p.delta)).toEqual(["有一个测试失败。"]);
    expect(payloadsOf(events, "tool.call.finished")).toEqual([
      { toolCallId: "c1", status: "success" },
      { toolCallId: "c2", status: "error" },
    ]);
    expect(report.unmapped, formatTranslateReport({ events, report, mapping: opencodeMapping })).toEqual([]);
  });
});

describe("a wrong table is reported, not silently empty", () => {
  it("names the values it could not map and the fields it actually saw", () => {
    // Feeding Codex lines through the opencode table is exactly what a stale/mis-specified
    // mapping looks like from the inside.
    const result = translateHarnessStream(codexLines, opencodeMapping);

    expect(producedNothing(result)).toBe(true);
    const text = formatTranslateReport(result);
    expect(text).toContain("未经真实流校准");
    expect(text).toContain("未识别的事件类型");
    // The diagnosis has to name the fields that were present, or it is not actionable.
    expect(text).toContain("msg.type");
    expect(text).toContain("mappings/opencode.ts");
  });

  it("reports a path that resolves to nothing", () => {
    const brokenPath = { ...codexMapping, paths: { ...codexMapping.paths, text: "msg.wrong_field" } };
    const result = translateHarnessStream(
      [{ id: "1", msg: { type: "agent_message", message: "hello" } }],
      brokenPath,
    );
    expect(result.report.missingFields).toEqual([
      { kind: "text", field: "text", count: 1, sample: { id: "1", msg: { type: "agent_message", message: "hello" } } },
    ]);
    expect(formatTranslateReport(result)).toContain("路径写错");
  });

  it("tolerates log noise mixed into the stream", () => {
    const noisy = parseHarnessLines(
      [
        "warning: something human-readable",
        JSON.stringify({ id: "1", msg: { type: "agent_message", message: "hi" } }),
        "",
        "data: " + JSON.stringify({ id: "2", msg: { type: "task_complete" } }),
      ].join("\n"),
    );
    expect(noisy).toHaveLength(2);
    const { events } = translateHarnessStream(noisy, codexMapping);
    expect(payloadsOf(events, "text.delta").map((p) => p.delta)).toEqual(["hi"]);
  });
});

describe("registry", () => {
  it("resolves the harnesses the schema offers", () => {
    expect(mappingForHarness("codex")?.id).toBe("codex");
    expect(mappingForHarness("claude")?.id).toBe("claude");
    expect(mappingForHarness("opencode")?.id).toBe("opencode");
    // Our own transport needs no translation.
    expect(speaksOurProtocol("agentux")).toBe(true);
    // `pi` has no table; returning an empty one would render an empty screen that looks fine.
    expect(mappingForHarness("pi")).toBeUndefined();
    expect(describeMissingMapping("pi")).toContain("没有映射表");
    expect(describeMissingMapping("pi")).toContain("不需要写适配器代码或改组件");
  });

  it("declares honestly which tables are calibrated", () => {
    // None are yet. When a table is verified against a captured stream, flip the flag — the
    // diagnostics report stops warning about it.
    expect(allMappings().filter((mapping) => mapping.verified).map((mapping) => mapping.id)).toEqual([]);
  });
});

/** Every tool name our components have a designed card for. */
const CANONICAL_TOOL_NAMES = [
  "read_file", "read_image", "edit_file", "write_file", "run_command",
  "search", "validate", "fetch", "rm", "plan",
];

describe("every vendor lands on the same UI", () => {
  const shapeOf = (lines: readonly unknown[], mapping: Parameters<typeof translateHarnessStream>[1]) => {
    const { events } = translateHarnessStream(lines, mapping);
    const admitted = normalizeAgentUXEvents(events, { extraAliases: mapping.extraAliases });
    return {
      reasoning: payloadsOf(admitted.events, "reasoning.delta").map((p) => p.delta),
      text: payloadsOf(admitted.events, "text.delta").map((p) => p.delta),
      tools: payloadsOf(admitted.events, "tool.call.finished").map((p) => p.status),
      toolNames: payloadsOf(admitted.events, "tool.call.started").map((p) => p.name),
      rejected: admitted.rejected.length,
    };
  };

  it("agrees on everything the vendors actually did the same way", () => {
    const codex = shapeOf(codexLines, codexMapping);
    const claude = shapeOf(claudeCodeLines, claudeCodeMapping);
    const opencode = shapeOf(opencodeLines, opencodeMapping);

    for (const [id, shape] of [["codex", codex], ["claude", claude], ["opencode", opencode]] as const) {
      expect(shape.reasoning, id).toEqual(["先看配置。"]);
      expect(shape.text, id).toEqual(["有一个测试失败。"]);
      expect(shape.tools, id).toEqual(["success", "error"]);
      expect(shape.rejected, `${id}: 不应有事件被拒`).toBe(0);
    }
  });

  it("names every tool with a spelling our components have a card for", () => {
    // This is the promise that matters: whatever a vendor calls its tools, what reaches a
    // component is one of our canonical names — so it renders a designed card, never a
    // generic fallback row.
    for (const [lines, mapping] of [
      [codexLines, codexMapping],
      [claudeCodeLines, claudeCodeMapping],
      [opencodeLines, opencodeMapping],
    ] as const) {
      const { toolNames } = shapeOf(lines, mapping);
      expect(toolNames.length, mapping.id).toBeGreaterThan(0);
      for (const name of toolNames) {
        expect(CANONICAL_TOOL_NAMES, `${mapping.id}: ${name} 没有对应的组件`).toContain(name);
      }
    }
  });

  it("keeps a genuine behavioural difference visible instead of flattening it", () => {
    // Codex has no file-reading tool: it shells out (`cat src/app.ts`). Claude Code calls a
    // `Read` tool. Rendering both as the same card would misreport what ran — one really was
    // a terminal command. So the concepts differ here *by design*, and both are still ours.
    expect(shapeOf(codexLines, codexMapping).toolNames).toEqual(["run_command", "run_command"]);
    expect(shapeOf(claudeCodeLines, claudeCodeMapping).toolNames).toEqual(["read_file", "run_command"]);
    expect(shapeOf(opencodeLines, opencodeMapping).toolNames).toEqual(["read_file", "run_command"]);
  });

  it("produces a contract-clean stream from each vendor", () => {
    for (const [lines, mapping] of [
      [codexLines, codexMapping],
      [claudeCodeLines, claudeCodeMapping],
      [opencodeLines, opencodeMapping],
    ] as const) {
      const { events } = translateHarnessStream(lines, mapping);
      const report = inspectAgentUXEvents(events);
      expect(
        report.issues.filter((issue) => issue.severity === "error"),
        `${mapping.id}: ${formatTranslateReport({ events, report: translateHarnessStream(lines, mapping).report, mapping })}`,
      ).toEqual([]);
    }
  });
});
