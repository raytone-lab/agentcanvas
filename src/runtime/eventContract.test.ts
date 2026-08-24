import { describe, expect, it } from "vitest";

import { formatContractReport, inspectAgentUXEvents, isConversationEvent } from "./eventContract";

/**
 * The cases below are the actual failure modes from a real deepseek-harness integration: the
 * transcript was flooded with harness bookkeeping mapped as tool calls, the thinking block
 * rendered blank because reasoning.delta carried no content, and file cards degraded to a
 * bare line because tool events had no args or result. Nothing errored; it just looked wrong.
 *
 * These tests pin that such a stream is reported as inconsistent, and that a complete one
 * passes — a gate that only ever fails is no gate at all.
 */

let seq = 0;
const ev = (type: string, payload: Record<string, unknown> = {}) => {
  seq += 1;
  return { protocol: "agent-ux", version: "0.1", id: `e${seq}`, runId: "r", seq, ts: seq, type, payload };
};

function completeStream() {
  seq = 0;
  return [
    ev("run.started", { title: "Audit" }),
    ev("text.started", { textId: "u", role: "user" }),
    ev("text.delta", { textId: "u", delta: "audit src/auth" }),
    ev("text.finished", { textId: "u" }),
    ev("reasoning.status", { reasoningId: "r", status: "planning" }),
    ev("reasoning.delta", { reasoningId: "r", delta: "Read then test." }),
    ev("reasoning.finished", { reasoningId: "r" }),
    ev("tool.call.started", { toolCallId: "t1", name: "read_file" }),
    ev("tool.call.running", { toolCallId: "t1", args: { path: "src/auth/session.ts" } }),
    ev("tool.call.result", { toolCallId: "t1", result: "body", resultPreview: "31 lines" }),
    ev("tool.call.finished", { toolCallId: "t1", status: "success" }),
    ev("tool.call.started", { toolCallId: "t2", name: "bash" }),
    ev("tool.call.running", { toolCallId: "t2", args: { command: "npm test" } }),
    ev("tool.call.result", { toolCallId: "t2", result: "4 passed" }),
    ev("tool.call.finished", { toolCallId: "t2", status: "success" }),
    ev("tool.call.awaiting_approval", { toolCallId: "t3", name: "rm" }),
    ev("artifact.created", { artifactId: "a", kind: "code" }),
    ev("artifact.delta", { artifactId: "a", delta: "+ x" }),
    ev("artifact.finished", { artifactId: "a", status: "success" }),
    ev("capability.attached", { capabilityId: "fs" }),
    ev("run.finished", { status: "success" }),
  ];
}

describe("event contract", () => {
  it("passes a stream that drives every surface", () => {
    const report = inspectAgentUXEvents(completeStream());
    expect(report.coverage.filter((surface) => surface.status !== "ok"), formatContractReport(report)).toEqual([]);
    expect(report.consistent).toBe(true);
  });

  it("flags empty reasoning content as an error", () => {
    seq = 0;
    const report = inspectAgentUXEvents([
      ev("reasoning.status", { reasoningId: "r" }),
      ev("reasoning.delta", { reasoningId: "r", delta: "" }),
    ]);
    const issue = report.issues.find((item) => item.type === "reasoning.delta");
    expect(issue?.severity).toBe("error");
    expect(issue?.fix).toContain("payload.delta");
    expect(report.coverage.find((surface) => surface.id === "reasoning")?.status).toBe("degraded");
    expect(report.consistent).toBe(false);
  });

  it("flags tool events with no args or result", () => {
    seq = 0;
    const report = inspectAgentUXEvents([
      ev("tool.call.started", { toolCallId: "t", name: "read" }),
      ev("tool.call.running", { toolCallId: "t" }),
      ev("tool.call.result", { toolCallId: "t" }),
      ev("tool.call.finished", { toolCallId: "t", status: "success" }),
    ]);
    expect(report.issues.some((item) => item.type === "tool.call.running")).toBe(true);
    expect(report.issues.some((item) => item.type === "tool.call.result")).toBe(true);
    expect(report.coverage.find((surface) => surface.id === "toolCall")?.status).toBe("degraded");
  });

  it("routes harness bookkeeping out of the conversation", () => {
    const noise = [
      { type: "tool.call.started", payload: { toolCallId: "n1", name: "permission-preset", title: "权限预设已更新" } },
      { type: "tool.call.started", payload: { toolCallId: "n2", name: "runtime-context", title: "注入运行上下文" } },
      { type: "tool.call.started", payload: { toolCallId: "n3", name: "token-usage", title: "模型响应" } },
    ];
    for (const event of noise) {
      expect(isConversationEvent(event), `${(event.payload as { name: string }).name} should be diagnostic`).toBe(false);
    }
    // A genuine tool call stays in the conversation.
    expect(isConversationEvent({ type: "tool.call.started", payload: { toolCallId: "t", name: "read_file" } })).toBe(true);

    const report = inspectAgentUXEvents(noise);
    expect(Object.values(report.diagnosticCounts).reduce((a, b) => a + b, 0)).toBe(3);
    // Diagnostics must not be counted as conversation activity.
    expect(report.countsByType["tool.call.started"]).toBeUndefined();
  });

  it("honours extra markers a backend words differently", () => {
    const event = { type: "tool.call.started", payload: { toolCallId: "x", name: "dsh-file-policy" } };
    expect(isConversationEvent(event)).toBe(true);
    expect(isConversationEvent(event, ["dsh-file-policy"])).toBe(false);
  });

  it("reports an unfinished tool call", () => {
    seq = 0;
    const report = inspectAgentUXEvents([
      ev("tool.call.started", { toolCallId: "t", name: "bash" }),
      ev("tool.call.running", { toolCallId: "t", args: { command: "sleep 1" } }),
    ]);
    expect(report.issues.some((item) => item.type === "tool.call.finished")).toBe(true);
  });

  it("treats a backend that omits a surface as degraded, not broken", () => {
    // "我这边事件流不那么全" is the normal case, not an error: a backend with no reasoning
    // events should report that surface as missing and leave everything else intact, so the
    // UI renders one less block rather than refusing to render.
    seq = 0;
    const noReasoning = completeStream().filter((event) => !event.type.startsWith("reasoning."));
    const report = inspectAgentUXEvents(noReasoning);

    expect(report.coverage.find((surface) => surface.id === "reasoning")?.status).toBe("missing");
    expect(
      report.coverage.filter((surface) => surface.id !== "reasoning").every((surface) => surface.status === "ok"),
      formatContractReport(report),
    ).toBe(true);
    // Missing ≠ error: nothing to fix in the adapter, the backend simply has no thinking.
    expect(report.issues.some((item) => item.severity === "error")).toBe(false);
  });

  it("formats a readable report", () => {
    const report = inspectAgentUXEvents(completeStream());
    const text = formatContractReport(report);
    expect(text).toContain("UI 面覆盖");
    expect(text).toContain("8/8");
  });
});
