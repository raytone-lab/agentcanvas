import { describe, expect, it } from "vitest";

import { createPiEventAdapter } from "./piAdapter";

describe("Pi event adapter", () => {
  it("maps streamed text and thinking blocks across more than one assistant message", () => {
    const adapter = createPiEventAdapter({ runId: "pi-run", now: 100 });

    adapter.apply({ type: "agent_start" });
    adapter.apply({ type: "message_start", message: { role: "assistant", content: [], timestamp: 1 } });
    adapter.apply({ type: "message_update", assistantMessageEvent: { type: "thinking_start", contentIndex: 0 } });
    adapter.apply({ type: "message_update", assistantMessageEvent: { type: "thinking_delta", contentIndex: 0, delta: "Checking" } });
    adapter.apply({ type: "message_update", assistantMessageEvent: { type: "thinking_end", contentIndex: 0 } });
    adapter.apply({ type: "message_update", assistantMessageEvent: { type: "text_start", contentIndex: 1 } });
    adapter.apply({ type: "message_update", assistantMessageEvent: { type: "text_delta", contentIndex: 1, delta: "First" } });
    adapter.apply({ type: "message_update", assistantMessageEvent: { type: "text_end", contentIndex: 1 } });
    adapter.apply({ type: "message_end", message: { role: "assistant", content: [], timestamp: 1 } });

    adapter.apply({ type: "message_start", message: { role: "assistant", content: [], timestamp: 2 } });
    adapter.apply({ type: "message_update", assistantMessageEvent: { type: "text_delta", contentIndex: 0, delta: "Second" } });
    adapter.apply({ type: "message_end", message: { role: "assistant", content: [], timestamp: 2 } });
    adapter.apply({ type: "agent_settled" });

    expect(adapter.events.map((event) => event.type)).toEqual([
      "run.started",
      "reasoning.status",
      "reasoning.delta",
      "reasoning.finished",
      "text.started",
      "text.delta",
      "text.finished",
      "text.started",
      "text.delta",
      "text.finished",
      "run.finished",
    ]);
    expect(adapter.events.filter((event) => event.type === "text.started").map((event) => event.payload.textId))
      .toEqual(["pi-run_m1_text_1", "pi-run_m2_text_0"]);
  });

  it("maps tool arguments, approval, execution progress, result, and a write artifact", () => {
    const adapter = createPiEventAdapter({
      runId: "pi-tools",
      requiresApproval: (toolName) => toolName === "write",
    });

    adapter.apply({ type: "agent_start" });
    adapter.apply({
      type: "message_update",
      assistantMessageEvent: { type: "toolcall_start", contentIndex: 0, id: "call-1", toolName: "write" },
    });
    adapter.apply({
      type: "message_update",
      assistantMessageEvent: { type: "toolcall_delta", contentIndex: 0, delta: "{\"path\":\"src/a.ts\",\"content\":\"export const a = 1\"}" },
    });
    adapter.apply({
      type: "message_update",
      assistantMessageEvent: {
        type: "toolcall_end",
        contentIndex: 0,
        toolCall: { id: "call-1", name: "write", arguments: { path: "src/a.ts", content: "export const a = 1" } },
      },
    });
    adapter.apply({
      type: "tool_execution_start",
      toolCallId: "call-1",
      toolName: "write",
      args: { path: "src/a.ts", content: "export const a = 1" },
    });

    expect(adapter.events.at(-1)).toMatchObject({
      type: "tool.call.awaiting_approval",
      payload: { toolCallId: "call-1", prompt: expect.stringContaining("write") },
    });

    adapter.resolveApproval("call-1", "yes");
    adapter.apply({
      type: "tool_execution_update",
      toolCallId: "call-1",
      toolName: "write",
      args: { path: "src/a.ts", content: "export const a = 1" },
      partialResult: { content: [{ type: "text", text: "Writing src/a.ts" }], details: {} },
    });
    adapter.apply({
      type: "tool_execution_end",
      toolCallId: "call-1",
      toolName: "write",
      result: { content: [{ type: "text", text: "Successfully wrote src/a.ts" }] },
      isError: false,
    });

    expect(adapter.events.map((event) => event.type)).toEqual(expect.arrayContaining([
      "tool.call.started",
      "tool.call.args.delta",
      "tool.call.awaiting_approval",
      "tool.call.running",
      "tool.call.progress",
      "tool.call.result",
      "tool.call.finished",
      "artifact.created",
      "artifact.delta",
      "artifact.finished",
    ]));
    expect(adapter.events.find((event) => event.type === "artifact.delta")?.payload).toMatchObject({
      artifactId: "pi_file_call-1",
      delta: "export const a = 1",
    });
  });

  it("maps denial and ignores the later duplicate Pi tool error", () => {
    const adapter = createPiEventAdapter({ runId: "pi-deny", requiresApproval: () => true });
    adapter.apply({ type: "tool_execution_start", toolCallId: "danger", toolName: "bash", args: { command: "rm file" } });
    adapter.resolveApproval("danger", "no");
    adapter.apply({
      type: "tool_execution_end",
      toolCallId: "danger",
      toolName: "bash",
      result: { content: [{ type: "text", text: "Denied" }] },
      isError: true,
    });

    expect(adapter.events.filter((event) => event.type === "tool.call.error")).toHaveLength(1);
    expect(adapter.events.filter((event) => event.type === "tool.call.finished")).toHaveLength(1);
    expect(adapter.events.at(-1)).toMatchObject({ type: "tool.call.finished", payload: { status: "cancelled" } });
  });

  it("turns retry, compaction, and terminal assistant failures into renderable states", () => {
    const adapter = createPiEventAdapter({ runId: "pi-failure" });
    adapter.apply({ type: "agent_start" });
    adapter.apply({ type: "auto_retry_start", attempt: 1, maxAttempts: 3, delayMs: 100, errorMessage: "rate limited" });
    adapter.apply({ type: "auto_retry_end", success: true, attempt: 1 });
    adapter.apply({ type: "compaction_start", reason: "threshold" });
    adapter.apply({ type: "compaction_end", reason: "threshold", aborted: false, willRetry: false });
    adapter.apply({
      type: "message_end",
      message: { role: "assistant", stopReason: "error", errorMessage: "provider unavailable", content: [] },
    });
    adapter.apply({ type: "agent_settled" });

    expect(adapter.events.map((event) => event.type)).toEqual([
      "run.started",
      "step.started",
      "step.finished",
      "step.started",
      "step.finished",
      "run.error",
    ]);
    expect(adapter.events.at(-1)?.payload).toMatchObject({ message: "provider unavailable" });
  });

  it("tolerates unknown and malformed wire events", () => {
    const adapter = createPiEventAdapter({ runId: "pi-unknown" });
    expect(adapter.apply(null)).toEqual([]);
    expect(adapter.apply({})).toEqual([]);
    expect(adapter.apply({ type: "future_pi_event", data: true })).toEqual([]);
    expect(adapter.events).toEqual([]);
  });
});
