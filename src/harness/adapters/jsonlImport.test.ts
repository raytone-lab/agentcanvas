import { describe, expect, it } from "vitest";

import { admitEvents } from "../../runtime/admissionReport";
import { importHarnessJsonl } from "./jsonlImport";

/**
 * The harness axis, end to end from a captured file.
 *
 * Before this existed the translation engine was fully tested and completely unreachable: no
 * product code imported `translateHarnessStream`, `setRunEventSource("harness")` was never
 * called, and `App.tsx`'s own `RunMode` union did not even include `"harness"`. These tests
 * cover the transport that closes that gap, including the two cases that must fail loudly
 * rather than render an empty run.
 */

const jsonl = (lines: unknown[]) => lines.map((line) => JSON.stringify(line)).join("\n");

const codexCapture = jsonl([
  { id: "0", msg: { type: "task_started" } },
  { id: "1", msg: { type: "agent_reasoning", text: "先读配置。" } },
  { id: "2", msg: { type: "exec_command_begin", call_id: "c1", command: ["cat", "src/app.ts"] } },
  { id: "3", msg: { type: "exec_command_end", call_id: "c1", stdout: "ok", exit_code: 0 } },
  { id: "4", msg: { type: "token_count", total: 900 } },
  { id: "5", msg: { type: "agent_message", message: "读完了。" } },
  { id: "6", msg: { type: "task_complete" } },
]);

describe("importing a harness capture", () => {
  it("translates a codex capture into our events", () => {
    const result = importHarnessJsonl(codexCapture, "codex");
    expect(result.ok, result.ok ? "" : result.error).toBe(true);
    if (!result.ok) return;

    expect(result.linesRead).toBe(7);
    const types = result.events.map((event) => event.type);
    expect(types).toContain("reasoning.delta");
    expect(types).toContain("tool.call.started");
    expect(types).toContain("text.delta");
    // Token accounting is dropped by the table, so it never reaches the transcript.
    expect(JSON.stringify(result.events)).not.toContain("900");
  });

  it("hands the admission layer something it accepts", () => {
    // The whole point of the chain: what arrives at the view model is already ours.
    const result = importHarnessJsonl(codexCapture, "codex");
    if (!result.ok) throw new Error(result.error);
    const admission = admitEvents(result.events);
    expect(admission.normalize.rejected).toEqual([]);
    expect(admission.events.length).toBe(result.events.length);
  });

  it("accepts a file that already speaks our protocol without translating it", () => {
    const ours = jsonl([
      { protocol: "agent-ux", type: "run.started", payload: { title: "x" } },
      { protocol: "agent-ux", type: "text.started", payload: { textId: "t", role: "assistant" } },
      { protocol: "agent-ux", type: "text.delta", payload: { textId: "t", delta: "hi" } },
      { protocol: "agent-ux", type: "text.finished", payload: { textId: "t" } },
    ]);
    const result = importHarnessJsonl(ours, "agentux");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toHaveLength(4);
    expect(result.translation, "标准协议不该经过映射表").toBeUndefined();
    expect(result.report).toContain("未做翻译");
  });

  it("refuses a harness with no mapping table instead of rendering an empty run", () => {
    // `pi` is declared in the schema but has no table. Producing an empty transcript here
    // would look exactly like a working import of a silent agent.
    const result = importHarnessJsonl(codexCapture, "pi");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("没有映射表");
    expect(result.error).toContain("mappings/");
    // Names the tables that do exist, so the next step is obvious.
    expect(result.error).toContain("codex");
  });

  it("says so when the file does not match the selected harness", () => {
    // Reading a Codex capture as opencode maps nothing. Silence here is the worst outcome.
    const result = importHarnessJsonl(codexCapture, "opencode");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("没有产出任何事件");
    // The diagnosis has to name the fields actually present.
    expect(result.error).toContain("msg.type");
    expect(result.error).toContain("mappings/opencode.ts");
  });

  it("rejects a file with no JSON in it", () => {
    const result = importHarnessJsonl("这是一段普通日志\nnot json at all\n", "codex");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.linesRead).toBe(0);
    expect(result.error).toContain("JSONL");
  });

  it("tolerates log noise and SSE framing around the JSON", () => {
    const messy = [
      "warning: starting up",
      "data: " + JSON.stringify({ id: "1", msg: { type: "agent_message", message: "hi" } }),
      "",
      JSON.stringify({ id: "2", msg: { type: "task_complete" } }),
    ].join("\n");
    const result = importHarnessJsonl(messy, "codex");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.linesRead).toBe(2);
    expect(result.events.some((event) => event.type === "text.delta")).toBe(true);
  });

  it("explains a standard-protocol file that carries nothing standard", () => {
    const result = importHarnessJsonl(codexCapture, "agentux");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("没有一行是标准事件");
    expect(result.error).toContain("改成对应的那一家");
  });
});
