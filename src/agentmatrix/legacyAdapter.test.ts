import { createAgentUXViewModel } from "@agent-ux/render-core";
import { describe, expect, it } from "vitest";

import { scenarioById, SCENARIOS } from "./fixtures";
import { toAgentUXEvents, type LegacyEvent } from "./legacyAdapter";

function vmFor(id: Parameters<typeof scenarioById>[0]) {
  const events = toAgentUXEvents(scenarioById(id).fixture.events);
  return { events, vm: createAgentUXViewModel(events as never) };
}

describe("toAgentUXEvents → existing AgentUX viewModel", () => {
  it("converts every scenario into a renderable legacy timeline", () => {
    for (const scenario of SCENARIOS) {
      const events = toAgentUXEvents(scenario.fixture.events);
      const vm = createAgentUXViewModel(events as never);
      expect(events[0].type).toBe("run.started");
      expect(vm.timeline).toBeDefined();
    }
  });

  it("tool-approval: user msg, tool card (awaiting→success), assistant msg", () => {
    const { vm } = vmFor("tool-approval");
    const kinds = vm.timeline.map((t) => t.kind);
    expect(kinds).toContain("message");
    expect(kinds).toContain("tool");
    const tool = vm.timeline.find((t) => t.kind === "tool");
    expect(tool?.kind).toBe("tool");
    if (tool?.kind !== "tool") throw new Error("no tool");
    expect(tool.status).toBe("success");
    const userMsg = vm.timeline.find((t) => t.kind === "message" && t.role === "user");
    expect(userMsg).toBeTruthy();
    const agentMsg = vm.timeline.find((t) => t.kind === "message" && t.role === "assistant");
    expect(agentMsg).toBeTruthy();
  });

  it("mid-approval reveal keeps the tool awaiting approval", () => {
    // Reveal only up to the tool-use (sequences 1..3) of tool-approval.
    const partial = scenarioById("tool-approval").fixture.events.filter((e) => e.sequence <= 3);
    const vm = createAgentUXViewModel(toAgentUXEvents(partial) as never);
    const tool = vm.timeline.find((t) => t.kind === "tool");
    if (tool?.kind !== "tool") throw new Error("no tool");
    expect(tool.status).toBe("awaiting_approval");
    expect(tool.approval).toBeTruthy();
  });

  it("streaming scenario yields a thinking + assistant message", () => {
    const { vm } = vmFor("streamed-message");
    expect(vm.timeline.some((t) => t.kind === "reasoning")).toBe(true);
    expect(vm.timeline.some((t) => t.kind === "message" && t.role === "assistant")).toBe(true);
  });

  it("runtime scenario decomposes into step rows, no chat bubbles", () => {
    const { vm } = vmFor("runtime-lifecycle");
    expect(vm.timeline.some((t) => t.kind === "step")).toBe(true);
    expect(vm.timeline.some((t) => t.kind === "message")).toBe(false);
  });

  it("retrying incident surfaces an error item", () => {
    const { vm } = vmFor("retrying-incident");
    expect(vm.errors.length).toBeGreaterThan(0);
  });

  it("tool result diff also emits an Output artifact", () => {
    const events: LegacyEvent[] = toAgentUXEvents(scenarioById("tool-approval").fixture.events);
    expect(events.some((e) => e.type === "artifact.created")).toBe(true);
  });
});
