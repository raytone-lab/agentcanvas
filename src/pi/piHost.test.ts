import type { AgentUXEvent } from "@agent-ux/protocol";
import { describe, expect, it } from "vitest";

import type { PiWireEvent } from "../harness/adapters/piAdapter";
import { createPiRuntimeController, PiApprovalGate, type PiSessionBridge } from "./piHost";

function fakeBridge(events: PiWireEvent[]): PiSessionBridge {
  const listeners = new Set<(event: PiWireEvent) => void>();
  let model = "claude-test";
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async prompt() {
      for (const event of events) for (const listener of listeners) listener(event);
    },
    async abort() {},
    dispose() {},
    async configure(input) {
      model = input.model ?? model;
    },
    async state() {
      return {
        sessionId: "session-1",
        provider: "anthropic",
        model,
        thinkingLevel: "medium",
        models: [{ provider: "anthropic", id: model, name: model, available: true }],
        tools: ["read", "bash", "edit", "write"],
      };
    },
    async newSession() {},
  };
}

describe("Pi runtime controller", () => {
  it("streams translated AgentUX events and exposes model state", async () => {
    const controller = createPiRuntimeController({
      cwd: "/project",
      bridgeFactory: async () => fakeBridge([
        { type: "agent_start" },
        { type: "message_start", message: { role: "assistant", content: [] } },
        { type: "message_update", assistantMessageEvent: { type: "text_delta", contentIndex: 0, delta: "Hello" } },
        { type: "message_end", message: { role: "assistant", content: [] } },
        { type: "agent_settled" },
      ]),
    });
    const events: AgentUXEvent[] = [];
    await controller.runPrompt({ prompt: "Hi", model: "claude-new" }, (event) => events.push(event));

    expect(events.map((event) => event.type)).toEqual([
      "run.started", "text.started", "text.delta", "text.finished", "run.finished",
    ]);
    expect(await controller.state()).toMatchObject({
      available: true,
      cwd: "/project",
      running: false,
      model: "claude-new",
    });
  });

  it("converts a bridge failure into a run error instead of rejecting the stream", async () => {
    const bridge = fakeBridge([{ type: "agent_start" }]);
    bridge.prompt = async () => { throw new Error("missing credentials"); };
    const controller = createPiRuntimeController({ cwd: "/project", bridgeFactory: async () => bridge });
    const events: AgentUXEvent[] = [];
    await controller.runPrompt({ prompt: "Hi" }, (event) => events.push(event));
    expect(events.at(-1)).toMatchObject({ type: "run.error", payload: { message: "missing credentials" } });
  });
});

describe("Pi approval gate", () => {
  it("requests mutating tools, remembers always, and leaves read-only tools alone", async () => {
    const gate = new PiApprovalGate();
    gate.setMode("request");
    expect(gate.requiresApproval("read", { path: "a.ts" })).toBe(false);
    expect(gate.requiresApproval("write", { path: "a.ts" })).toBe(true);
    const waiting = gate.wait("call-1", "write", { path: "a.ts" });
    expect(gate.resolve("call-1", "always")).toBe(true);
    await waiting;
    expect(gate.requiresApproval("write", { path: "b.ts" })).toBe(false);
  });

  it("only stops risky shell commands in auto mode", () => {
    const gate = new PiApprovalGate();
    gate.setMode("auto");
    expect(gate.requiresApproval("bash", { command: "npm test" })).toBe(false);
    expect(gate.requiresApproval("bash", { command: "git push origin main" })).toBe(true);
  });
});
