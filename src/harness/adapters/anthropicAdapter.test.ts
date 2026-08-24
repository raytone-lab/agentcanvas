import { describe, expect, it } from "vitest";

import { inspectAgentUXEvents } from "../../runtime/eventContract";
import { normalizeAgentUXEvents } from "../../runtime/eventNormalizer";
import { anthropicEventsFromFrames, parseSseData } from "./anthropicAdapter";

/**
 * A realistic Messages API turn: extended thinking, an answer, a tool call whose arguments
 * arrive as JSON fragments, and a second text block *after* the tool call — the shape that
 * silently lost content when text blocks were closed on `content_block_stop`.
 */
const turn = [
  { type: "message_start", message: { id: "msg_1", role: "assistant", model: "claude-sonnet-4" } },
  { type: "content_block_start", index: 0, content_block: { type: "thinking" } },
  { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "先读配置。" } },
  { type: "content_block_delta", index: 0, delta: { type: "signature_delta", signature: "abc" } },
  { type: "content_block_stop", index: 0 },
  { type: "content_block_start", index: 1, content_block: { type: "text" } },
  { type: "content_block_delta", index: 1, delta: { type: "text_delta", text: "我先看一下文件。" } },
  { type: "content_block_stop", index: 1 },
  {
    type: "content_block_start",
    index: 2,
    content_block: { type: "tool_use", id: "toolu_01", name: "str_replace_editor" },
  },
  { type: "content_block_delta", index: 2, delta: { type: "input_json_delta", partial_json: '{"path":' } },
  { type: "content_block_delta", index: 2, delta: { type: "input_json_delta", partial_json: '"src/app.ts",' } },
  { type: "content_block_delta", index: 2, delta: { type: "input_json_delta", partial_json: '"content":"x"}' } },
  { type: "content_block_stop", index: 2 },
  { type: "content_block_start", index: 3, content_block: { type: "text" } },
  { type: "content_block_delta", index: 3, delta: { type: "text_delta", text: "改好了。" } },
  { type: "content_block_stop", index: 3 },
  { type: "message_delta", delta: { stop_reason: "tool_use" } },
  { type: "message_stop" },
];

const payloadsOf = (events: readonly { type: string; payload: Record<string, unknown> }[], type: string) =>
  events.filter((event) => event.type === type).map((event) => event.payload);

describe("anthropic adapter", () => {
  it("keeps text that arrives after a tool call", () => {
    // Anthropic emits text → tool_use → text in one message. Closing the text block at
    // content_block_stop dropped the trailing "改好了。" with no error anywhere.
    const events = anthropicEventsFromFrames(turn);
    const deltas = payloadsOf(events, "text.delta").map((payload) => payload.delta);
    expect(deltas).toEqual(["我先看一下文件。", "改好了。"]);
    // One bubble, opened once and closed once.
    expect(events.filter((event) => event.type === "text.started")).toHaveLength(1);
    expect(events.filter((event) => event.type === "text.finished")).toHaveLength(1);
  });

  it("maps extended thinking to the reasoning surface and closes it when the answer starts", () => {
    const events = anthropicEventsFromFrames(turn);
    const order = events.map((event) => event.type);
    expect(payloadsOf(events, "reasoning.delta").map((payload) => payload.delta)).toEqual(["先读配置。"]);
    // reasoning closes before the first text delta, so the thinking block collapses.
    expect(order.indexOf("reasoning.finished")).toBeLessThan(order.indexOf("text.delta"));
    // signature_delta carries no UI surface and must not become content.
    expect(JSON.stringify(events)).not.toContain("signature");
  });

  it("reassembles fragmented tool arguments into real args", () => {
    // args is what makes a file card a file card; without it the row degrades to one line.
    const events = anthropicEventsFromFrames(turn);
    const running = payloadsOf(events, "tool.call.running");
    expect(running).toHaveLength(1);
    expect(running[0].args).toEqual({ path: "src/app.ts", content: "x" });
    expect(payloadsOf(events, "tool.call.args.delta")).toHaveLength(3);
  });

  it("does not claim a tool succeeded when nothing executed it", () => {
    // The Messages API returns the model's intent. Reporting success would be a lie, and
    // leaving the call open spins the card forever.
    const events = anthropicEventsFromFrames(turn);
    expect(payloadsOf(events, "tool.call.awaiting_approval")).toHaveLength(1);
    expect(payloadsOf(events, "tool.call.finished")).toEqual([
      { toolCallId: "toolu_01", status: "cancelled" },
    ]);
    expect(payloadsOf(events, "tool.call.result")).toEqual([]);
  });

  it("survives a stream that ends mid-block", () => {
    const truncated = anthropicEventsFromFrames(turn.slice(0, 7));
    const order = truncated.map((event) => event.type);
    // No message_stop arrived, yet nothing is left open.
    expect(order).toContain("text.finished");
    expect(order.filter((type) => type === "text.started")).toHaveLength(1);
  });

  it("shows no args rather than a broken blob when JSON is truncated", () => {
    const cut = [
      { type: "message_start", message: {} },
      { type: "content_block_start", index: 0, content_block: { type: "tool_use", id: "t", name: "bash" } },
      { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '{"command":"np' } },
      { type: "content_block_stop", index: 0 },
      { type: "message_stop" },
    ];
    const running = payloadsOf(anthropicEventsFromFrames(cut), "tool.call.running");
    expect(running).toHaveLength(1);
    expect(running[0].args).toBeUndefined();
  });

  it("reports an API error as a run error instead of an empty screen", () => {
    const events = anthropicEventsFromFrames([
      { type: "message_start", message: {} },
      { type: "error", error: { type: "overloaded_error", message: "Overloaded" } },
    ]);
    const errors = payloadsOf(events, "run.error");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe("Overloaded");
    expect(errors[0].code).toBe("overloaded_error");
  });

  it("produces a stream our contract accepts, and our vocabulary admits", () => {
    const events = anthropicEventsFromFrames(turn);

    const report = inspectAgentUXEvents(events);
    expect(report.issues.filter((issue) => issue.severity === "error")).toEqual([]);

    // The model called its editor `str_replace_editor`; components match on `edit_file`.
    const admitted = normalizeAgentUXEvents(events);
    expect(admitted.rejected).toEqual([]);
    expect(admitted.canonicalizedNames).toEqual([
      { toolCallId: "toolu_01", from: "str_replace_editor", to: "edit_file" },
    ]);
  });

  it("parses only the data lines of an SSE body", () => {
    const body = [
      "event: message_start",
      'data: {"type":"message_start"}',
      "",
      ": keep-alive comment",
      "data: [DONE]",
      "data: not json",
      'data: {"type":"message_stop"}',
    ].join("\n");
    expect(parseSseData(body).map((frame) => frame.type)).toEqual(["message_start", "message_stop"]);
  });
});
