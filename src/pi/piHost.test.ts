import type { AgentUXEvent } from "@agent-ux/protocol";
import { describe, expect, it } from "vitest";

import type { PiWireEvent } from "../harness/adapters/piAdapter";
import { createPiRuntimeController, PiApprovalGate, registerEditorProvider, type PiSessionBridge } from "./piHost";

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
      "run.started",
      // Pi's real tool set, so `CapabilityTray` has something to render instead of its empty
      // state. Announced before the user turn because it describes the session, not the turn.
      "capability.attached", "capability.attached", "capability.attached", "capability.attached",
      "text.started", "text.delta", "text.finished",
      "text.started", "text.delta", "text.finished",
      "run.finished",
    ]);
    expect(events.filter((event) => event.type === "capability.attached").map((event) => event.payload.title))
      .toEqual(["read", "bash", "edit", "write"]);
    expect(events.find((event) => event.type === "text.started")).toMatchObject({
      payload: { role: "user" },
    });
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

  it("passes the exact editor provider definition to the Pi bridge", async () => {
    const bridge = fakeBridge([]);
    let received: Parameters<PiSessionBridge["configure"]>[0] | undefined;
    bridge.configure = async (input) => { received = input; };
    const controller = createPiRuntimeController({ cwd: "/project", bridgeFactory: async () => bridge });
    await controller.configure({
      provider: "z-ai",
      model: "glm-5.1",
      apiKey: "secret",
      providerDefinition: {
        id: "z-ai",
        name: "Z.ai",
        protocol: "openai-compatible",
        baseUrl: "https://api.z.ai/api/paas/v4/",
        models: ["glm-5.1"],
        authMode: "required",
        apiKeyEnvVar: "ZAI_API_KEY",
      },
    });
    expect(received).toMatchObject({
      provider: "z-ai",
      model: "glm-5.1",
      providerDefinition: { id: "z-ai", models: ["glm-5.1"] },
    });
  });

  it("does not request credential clearing when the browser omitted a session key", async () => {
    const bridge = fakeBridge([]);
    let received: Parameters<PiSessionBridge["configure"]>[0] | undefined;
    bridge.configure = async (input) => { received = input; };
    const controller = createPiRuntimeController({ cwd: "/project", bridgeFactory: async () => bridge });
    await controller.configure({ provider: "z-ai", model: "glm-5.3-flash" });
    expect(received).toEqual({ provider: "z-ai", model: "glm-5.3-flash" });
    expect(received?.clearApiKey).toBeUndefined();
  });

  it("keeps browser conversation IDs on isolated, resumable Pi bridges", async () => {
    const prompts = new Map<string, string[]>();
    let bridgeCount = 0;
    const controller = createPiRuntimeController({
      cwd: "/project",
      bridgeFactory: async () => {
        const id = `bridge-${++bridgeCount}`;
        const bridge = fakeBridge([]);
        prompts.set(id, []);
        bridge.prompt = async (prompt) => { prompts.get(id)?.push(prompt); };
        return bridge;
      },
    });

    await controller.runPrompt({ conversationId: "one", prompt: "first" }, () => undefined);
    await controller.runPrompt({ conversationId: "two", prompt: "other" }, () => undefined);
    await controller.runPrompt({ conversationId: "one", prompt: "second" }, () => undefined);

    expect(bridgeCount).toBe(2);
    expect(prompts.get("bridge-1")).toEqual(["first", "second"]);
    expect(prompts.get("bridge-2")).toEqual(["other"]);
  });

  it("announces the tool set once per conversation, not once per turn", async () => {
    // Canonical events accumulate across turns in the browser, so a per-turn announcement
    // stacks a duplicate row in `CapabilityTray` for every prompt. A new session starts an
    // empty transcript, so that one has to announce again.
    const controller = createPiRuntimeController({
      cwd: "/project",
      bridgeFactory: async () => fakeBridge([]),
    });
    const countCapabilities = async (conversationId: string) => {
      const seen: AgentUXEvent[] = [];
      await controller.runPrompt({ conversationId, prompt: "Hi" }, (event) => seen.push(event));
      return seen.filter((event) => event.type === "capability.attached").length;
    };

    expect(await countCapabilities("one"), "首个回合应宣告").toBe(4);
    expect(await countCapabilities("one"), "同一会话的后续回合不应重复宣告").toBe(0);
    expect(await countCapabilities("two"), "另一个会话应各自宣告").toBe(4);

    await controller.newSession("one");
    expect(await countCapabilities("one"), "新建会话后应重新宣告").toBe(4);
  });

  it("creates distinct real Pi in-memory sessions without making a model request", async () => {
    const controller = createPiRuntimeController({ cwd: "/private/tmp" });
    try {
      const first = await controller.state("browser-one");
      const second = await controller.state("browser-two");
      expect(first.error).toBeUndefined();
      expect(second.available).toBe(true);
      expect(first.sessionId).toBeTruthy();
      expect(second.sessionId).toBeTruthy();
      expect(first.sessionId).not.toBe(second.sessionId);
    } finally {
      controller.dispose();
    }
  });
});

describe("Pi editor provider registration", () => {
  it("creates the exact custom model in Pi's real ModelRuntime without a network request", async () => {
    const { ModelRuntime } = await import("@earendil-works/pi-coding-agent");
    const runtime = await ModelRuntime.create({
      authPath: "/private/tmp/agentcanvas-pi-provider-sync-test-auth.json",
      modelsPath: null,
      refreshOnCreate: false,
      allowModelNetwork: false,
    });
    registerEditorProvider(runtime, {
      id: "z-ai",
      name: "Z.ai",
      protocol: "openai-compatible",
      baseUrl: "https://api.z.ai/api/paas/v4/",
      models: ["glm-5.1"],
      authMode: "required",
      apiKeyEnvVar: "ZAI_API_KEY",
    }, "z-ai", "glm-5.1");

    expect(runtime.getModel("z-ai", "glm-5.1")).toMatchObject({
      provider: "z-ai",
      id: "glm-5.1",
      api: "openai-completions",
      baseUrl: "https://api.z.ai/api/paas/v4/",
    });
  });

  it("registers the exact GLM model using the OpenAI-compatible Pi API", () => {
    const calls: Array<{ kind: string; provider: string; config?: unknown }> = [];
    registerEditorProvider({
      unregisterProvider(provider) { calls.push({ kind: "unregister", provider }); },
      registerProvider(provider, config) { calls.push({ kind: "register", provider, config }); },
    }, {
      id: "z-ai",
      name: "Z.ai",
      protocol: "openai-compatible",
      baseUrl: "https://api.z.ai/api/paas/v4/",
      models: ["glm-5.1"],
      authMode: "required",
      apiKeyEnvVar: "ZAI_API_KEY",
    }, "z-ai", "glm-5.1");

    expect(calls[0]).toEqual({ kind: "unregister", provider: "z-ai" });
    expect(calls[1]).toMatchObject({
      kind: "register",
      provider: "z-ai",
      config: {
        api: "openai-completions",
        apiKey: "$ZAI_API_KEY",
        models: [{ id: "glm-5.1" }],
      },
    });
  });

  it("rejects a selected model that is absent instead of falling back", () => {
    expect(() => registerEditorProvider({
      unregisterProvider() {},
      registerProvider() {},
    }, {
      id: "z-ai",
      name: "Z.ai",
      protocol: "openai-compatible",
      baseUrl: "https://api.z.ai/api/paas/v4/",
      models: ["glm-4.5"],
      authMode: "required",
    }, "z-ai", "glm-5.1")).toThrow("glm-5.1 is not configured");
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
