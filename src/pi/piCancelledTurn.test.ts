import { describe, expect, it } from "vitest";

import type { AgentUXEvent } from "@agent-ux/protocol";
import { piCancelledTurnEvents } from "./piCancelledTurn";

function event(seq: number, type: string, payload: Record<string, unknown> = {}): AgentUXEvent {
  return {
    protocol: "agent-ux",
    version: "0.1",
    id: `e_${seq}`,
    runId: "run-1",
    seq,
    ts: 1760000000000 + seq,
    type,
    payload,
  } as AgentUXEvent;
}

describe("piCancelledTurnEvents", () => {
  it("closes open text, tool and reasoning blocks and emits run.finished(cancelled)", () => {
    const transcript = [
      event(1, "run.started", { title: "t" }),
      event(2, "text.started", { textId: "t1", role: "user", format: "plain" }),
      event(3, "text.delta", { textId: "t1", delta: "hi" }),
      event(4, "text.finished", { textId: "t1" }),
      event(5, "text.started", { textId: "a1", role: "assistant", format: "plain" }),
      event(6, "text.delta", { textId: "a1", delta: "think" }),
      event(7, "reasoning.status", { reasoningId: "r1", status: "thinking", label: "x" }),
      event(8, "reasoning.delta", { reasoningId: "r1", kind: "summary", delta: "…" }),
      event(9, "tool.call.started", { toolCallId: "tool1", name: "write", title: "w" }),
      event(10, "tool.call.running", { toolCallId: "tool1", args: { path: "a.ts" } }),
    ];
    const closing = piCancelledTurnEvents(transcript);
    const types = closing.map((item) => item.type);
    expect(types).toEqual([
      "text.finished",
      "reasoning.finished",
      "tool.call.finished",
      "run.finished",
    ]);
    const toolClose = closing.find((item) => item.type === "tool.call.finished");
    expect(toolClose?.payload).toMatchObject({ toolCallId: "tool1", status: "cancelled" });
    const runClose = closing.find((item) => item.type === "run.finished");
    expect(runClose?.payload).toMatchObject({ status: "cancelled" });
    // Seq continues from the transcript so ordering stays intact.
    expect(closing.map((item) => item.seq)).toEqual([11, 12, 13, 14]);
  });

  it("closes a tool that already produced a result but never finished", () => {
    const transcript = [
      event(1, "run.started", { title: "t" }),
      event(2, "text.started", { textId: "a1", role: "assistant", format: "plain" }),
      event(3, "tool.call.started", { toolCallId: "tool1", name: "bash" }),
      event(4, "tool.call.result", { toolCallId: "tool1", result: "ok" }),
    ];
    const closing = piCancelledTurnEvents(transcript);
    expect(closing.filter((item) => item.type === "tool.call.finished")).toHaveLength(1);
    expect(closing.at(-1)?.payload).toMatchObject({ status: "cancelled" });
  });

  it("returns nothing when no run is in progress", () => {
    expect(piCancelledTurnEvents([])).toEqual([]);
    expect(piCancelledTurnEvents([event(1, "text.delta", { textId: "x", delta: "y" })])).toEqual([]);
  });

  it("returns nothing when the latest run already reached a terminal event", () => {
    const transcript = [
      event(1, "run.started", { title: "t" }),
      event(2, "text.started", { textId: "a1", role: "assistant", format: "plain" }),
      event(3, "run.finished", { status: "success" }),
    ];
    expect(piCancelledTurnEvents(transcript)).toEqual([]);
  });

  it("only closes blocks of the latest run, leaving earlier finished turns alone", () => {
    const transcript = [
      event(1, "run.started", { title: "first" }),
      event(2, "text.started", { textId: "old", role: "assistant", format: "plain" }),
      event(3, "text.finished", { textId: "old" }),
      event(4, "run.finished", { status: "success" }),
      event(5, "run.started", { title: "second" }),
      event(6, "text.started", { textId: "open", role: "assistant", format: "plain" }),
      event(7, "text.delta", { textId: "open", delta: "half" }),
    ];
    const closing = piCancelledTurnEvents(transcript);
    expect(closing.some((item) => item.type === "text.finished" && item.payload.textId === "open")).toBe(true);
    expect(closing.some((item) => item.type === "text.finished" && item.payload.textId === "old")).toBe(false);
  });

  it("does not close blocks that already finished before the abort", () => {
    const transcript = [
      event(1, "run.started", { title: "t" }),
      event(2, "text.started", { textId: "done", role: "assistant", format: "plain" }),
      event(3, "text.finished", { textId: "done" }),
      event(4, "text.started", { textId: "open", role: "assistant", format: "plain" }),
    ];
    const closing = piCancelledTurnEvents(transcript);
    expect(closing.filter((item) => item.type === "text.finished")).toHaveLength(1);
    expect(closing[0]?.payload).toMatchObject({ textId: "open" });
  });
});
