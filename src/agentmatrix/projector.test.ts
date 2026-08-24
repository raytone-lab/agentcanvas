import { describe, expect, it } from "vitest";

import { SCENARIOS, scenarioById } from "./fixtures";
import { fixtureDurableEvents } from "./mockSse";
import { projectSession } from "./projector";

describe("projectSession", () => {
  it("projects every reference scenario without throwing", () => {
    for (const scenario of SCENARIOS) {
      const vm = projectSession(fixtureDurableEvents(scenario.fixture));
      expect(vm.sessionId).toBeTruthy();
      expect(vm.cursor).toBeGreaterThan(0);
      // Diagnostics must retain every durable event.
      expect(vm.diagnostics.length).toBe(scenario.fixture.events.length);
    }
  });

  it("tool-approval: one card spans use -> approval -> result", () => {
    const vm = projectSession(fixtureDurableEvents(scenarioById("tool-approval").fixture));
    const tools = vm.transcript.flatMap((t) => t.items).filter((i) => i.kind === "tool");
    expect(tools).toHaveLength(1);
    const tool = tools[0];
    expect(tool.kind).toBe("tool");
    if (tool.kind !== "tool") throw new Error("unreachable");
    expect(tool.decision).toBe("allow_once");
    expect(tool.lifecycle).toBe("completed");
    expect(tool.content.some((c) => c.type === "diff")).toBe(true);
    // After completion the session ended the turn.
    expect(vm.lifecycle).toBe("idle");
    expect(vm.approvals).toHaveLength(0);
  });

  it("requires_action surfaces an approval mid-sequence", () => {
    const fixture = scenarioById("tool-approval").fixture;
    // Replay only up to the idle(requires_action) event (sequence 4).
    const partial = fixtureDurableEvents(fixture).filter((e) => e.sequence <= 4);
    const vm = projectSession(partial);
    expect(vm.lifecycle).toBe("requires_action");
    expect(vm.approvals).toHaveLength(1);
    expect(vm.approvals[0].toolCallId).toBe("call_write_dashboard");
  });

  it("mcp interrupt cancels the pending call and marks source mcp", () => {
    const vm = projectSession(fixtureDurableEvents(scenarioById("mcp-and-interrupt").fixture));
    const tools = vm.transcript.flatMap((t) => t.items).filter((i) => i.kind === "tool");
    const publish = tools.find((t) => t.kind === "tool" && t.id === "call_publish_release");
    expect(publish?.kind).toBe("tool");
    if (publish?.kind !== "tool") throw new Error("unreachable");
    expect(publish.source).toBe("mcp");
    expect(publish.lifecycle).toBe("cancelled");
    expect(publish.decision).toBe("cancel");
  });

  it("retrying incident resolves after durable recovery", () => {
    const vm = projectSession(fixtureDurableEvents(scenarioById("retrying-incident").fixture));
    expect(vm.incidents).toHaveLength(1);
    expect(vm.incidents[0].recovery).toBe("retrying");
    expect(vm.incidents[0].resolved).toBe(true); // running + message after the error
    expect(vm.blockingIncident).toBeUndefined();
    expect(vm.lifecycle).toBe("idle");
  });

  it("terminal incident locks the composer and is read-only", () => {
    const vm = projectSession(fixtureDurableEvents(scenarioById("terminal-incident").fixture));
    expect(vm.lifecycle).toBe("terminated");
    expect(vm.readOnly).toBe(true);
    expect(vm.incidents[0].recovery).toBe("terminal");
    expect(vm.blockingIncident?.composerLocked).toBe(true);
  });

  it("runtime lifecycle folds progress by operation_id and keeps status", () => {
    const vm = projectSession(fixtureDurableEvents(scenarioById("runtime-lifecycle").fixture));
    expect(vm.runtimeOperations).toHaveLength(1);
    expect(vm.runtimeOperations[0].status).toBe("completed");
    expect(vm.runtimeStatus?.state).toBe("ready");
    expect(vm.runtimeNotices).toHaveLength(1);
    // Runtime events never enter the transcript.
    expect(vm.transcript.flatMap((t) => t.items)).toHaveLength(0);
  });

  it("diagnostics scenario pairs model spans and never adds transcript rows", () => {
    const vm = projectSession(fixtureDurableEvents(scenarioById("diagnostics-and-update").fixture));
    expect(vm.configAudits).toHaveLength(1);
    expect(vm.compactions).toHaveLength(1);
    expect(vm.modelSpans).toHaveLength(1);
    expect(vm.modelSpans[0].unmatched).toBe(false);
    expect(vm.lifecycle).toBe("deleted");
  });
});
