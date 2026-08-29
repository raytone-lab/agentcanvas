import { describe, expect, it, vi } from "vitest";
import { createAgentUXViewModel } from "@agent-ux/render-core";
import { replayAgentUXEvents } from "@agent-ux/runtime";

import { defaultCodingAgentProject } from "../schema/agentuxConfig";
import { createProviderConnection } from "../schema/agentuxConfig";
import {
  createOpenAICompatibleChatRequest,
  runLiveLlmPreview,
  type LiveLlmMessage,
} from "./LiveLlmPreviewRunner";

function sseResponse(chunks: unknown[]): Response {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  }), {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

function rawSseResponse(content: string): Response {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(content));
      controller.close();
    },
  }), {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

describe("live LLM preview runner", () => {
  it("calls the default OpenAI-compatible provider with full chat history and returns canonical text events", async () => {
    const history: LiveLlmMessage[] = [
      { role: "user", content: "First prompt" },
      { role: "assistant", content: "First answer" },
    ];
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Second answer",
          },
        },
      ],
    }), { status: 200 }));

    const result = await runLiveLlmPreview({
      prompt: "Second prompt",
      project: defaultCodingAgentProject,
      sessionKeys: { openai: "sk-test" },
      history,
      fetcher,
      now: () => 1_760_000_100_000,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(requestUrl).toBe("https://api.openai.com/v1/chat/completions");
    expect(requestInit).toMatchObject({
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: "Bearer sk-test",
      },
    });
    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      model: "gpt-4o",
      stream: true,
      messages: [
        { role: "user", content: "First prompt" },
        { role: "assistant", content: "First answer" },
        { role: "user", content: "Second prompt" },
      ],
    });
    expect(result.messages).toEqual([
      ...history,
      { role: "user", content: "Second prompt" },
      { role: "assistant", content: "Second answer" },
    ]);
    expect(result.events.map((event) => event.type)).toEqual([
      "run.started",
      "text.started",
      "text.delta",
      "text.finished",
      "text.started",
      "text.delta",
      "text.finished",
      "run.finished",
    ]);
    expect(result.events.find((event) => event.type === "artifact.created")).toBeUndefined();
    expect(result.events.find((event) => event.type === "tool.call.started")).toBeUndefined();
    expect(result.events.find((event) => event.type === "state.snapshot")).toBeUndefined();

    const viewModel = createAgentUXViewModel(replayAgentUXEvents(result.events));
    expect(viewModel.timeline.filter((item) => item.kind === "message").map((item) => item.text)).toEqual([
      "First answer",
      "Second answer",
    ]);
  });

  it("streams text deltas and stores LM Studio reasoning_content as hidden reasoning", async () => {
    const partialSnapshots: string[][] = [];
    const fetcher = vi.fn(async () => sseResponse([
      { choices: [{ delta: { reasoning_content: "raw hidden thought " } }] },
      { choices: [{ delta: { content: "Hello " } }] },
      { choices: [{ delta: { reasoning_content: "raw continuation" } }] },
      { choices: [{ delta: { content: "there" }, finish_reason: "stop" }] },
    ]));

    const result = await runLiveLlmPreview({
      prompt: "Stream this",
      project: defaultCodingAgentProject,
      sessionKeys: { openai: "sk-test" },
      fetcher,
      now: () => 1_760_000_100_000,
      onEvents: (events) => partialSnapshots.push(events.map((event) => event.type)),
    });

    expect(partialSnapshots.some((types) => types.includes("text.delta") && !types.includes("run.finished"))).toBe(true);
    expect(result.events.map((event) => event.type)).toEqual([
      "run.started",
      "reasoning.status",
      "reasoning.private",
      "text.started",
      "text.delta",
      "reasoning.private",
      "text.delta",
      "text.finished",
      "reasoning.summary",
      "reasoning.finished",
      "run.finished",
    ]);
    expect(result.events.filter((event) => event.type === "reasoning.private")).toHaveLength(2);
    expect(result.events.find((event) => event.type === "reasoning.private")).toMatchObject({
      visibility: "hidden",
      payload: {
        value: "raw hidden thought ",
      },
    });
    expect(result.events.find((event) => event.type === "reasoning.summary")?.payload).toMatchObject({
      summary: "Model returned hidden reasoning while composing the response.",
      kind: "summary",
    });
    expect(result.messages.at(-1)).toEqual({ role: "assistant", content: "Hello there" });

    const viewModel = createAgentUXViewModel(replayAgentUXEvents(result.events));
    expect(viewModel.timeline.filter((item) => item.kind === "message").map((item) => item.text)).toEqual(["Hello there"]);
    expect(JSON.stringify(viewModel.timeline)).not.toContain("raw hidden thought");
  });

  it("passes abort signals through to the provider request", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { role: "assistant", content: "ok" } }],
    }), { status: 200 }));

    await runLiveLlmPreview({
      prompt: "Abort-capable request",
      project: defaultCodingAgentProject,
      sessionKeys: { openai: "sk-test" },
      signal: controller.signal,
      fetcher,
    });

    const [, requestInit] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(requestInit.signal).toBe(controller.signal);
  });

  it("releases the SSE reader when stream JSON parsing fails", async () => {
    const response = rawSseResponse("data: {not-json}\n\n");
    const fetcher = vi.fn(async () => response);

    await expect(runLiveLlmPreview({
      prompt: "Parse this stream",
      project: defaultCodingAgentProject,
      sessionKeys: { openai: "sk-test" },
      fetcher,
    })).rejects.toThrow();

    expect(response.body?.locked).toBe(false);
  });

  it("stops emitting live events after an abort signal", async () => {
    const controller = new AbortController();
    const snapshots: string[][] = [];
    const fetcher = vi.fn(async () => sseResponse([
      { choices: [{ delta: { content: "Hello " } }] },
      { choices: [{ delta: { content: "there" }, finish_reason: "stop" }] },
    ]));

    await expect(runLiveLlmPreview({
      prompt: "Abort after first delta",
      project: defaultCodingAgentProject,
      sessionKeys: { openai: "sk-test" },
      signal: controller.signal,
      fetcher,
      onEvents(events) {
        const types = events.map((event) => event.type);
        snapshots.push(types);
        if (types.includes("text.delta")) {
          controller.abort();
        }
      },
    })).rejects.toMatchObject({ name: "AbortError" });

    expect(snapshots.at(-1)).toContain("text.delta");
    expect(snapshots.flat()).not.toContain("text.finished");
    expect(snapshots.flat()).not.toContain("run.finished");
  });

  it("fails before fetch when a hosted provider is missing its dev session key", async () => {
    const fetcher = vi.fn();

    await expect(runLiveLlmPreview({
      prompt: "Hello",
      project: defaultCodingAgentProject,
      sessionKeys: {},
      fetcher,
    })).rejects.toThrow("Enter a dev session key for OpenAI before running Live LLM.");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("can route OpenAI-compatible requests through the AgentCanvas dev proxy to avoid local CORS failures", async () => {
    const provider = {
      ...createProviderConnection("local", true),
      baseUrl: "http://localhost:1234/v1",
      defaultModel: "google/gemma-4-e4b",
    };
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { role: "assistant", content: "ok" } }],
    }), { status: 200 }));

    await createOpenAICompatibleChatRequest(
      provider,
      [{ role: "user", content: "hello" }],
      {
        fetchMode: "agentcanvas-dev-proxy",
        fetcher,
      },
    );

    const [requestUrl, requestInit] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(requestUrl).toBe("/__agentcanvas/provider/chat/completions");
    expect(requestInit.headers).toMatchObject({
      "content-type": "application/json",
      "x-agentcanvas-provider-base-url": "http://localhost:1234/v1",
    });
    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      model: "google/gemma-4-e4b",
      stream: true,
      messages: [{ role: "user", content: "hello" }],
    });
  });

  it("projects OpenAI-compatible tool-call streaming into canonical AgentUX tool events without executing tools", async () => {
    const fetcher = vi.fn(async () => sseResponse([
      { choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "filesystem.read_text_file", arguments: "{\"path\"" } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: ":\"src/App.tsx\"}" } }] } }] },
      { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
    ]));

    const result = await runLiveLlmPreview({
      prompt: "Read App",
      project: defaultCodingAgentProject,
      sessionKeys: { openai: "sk-test" },
      fetcher,
      now: () => 1_760_000_100_000,
    });

    expect(result.events.map((event) => event.type)).toEqual([
      "run.started",
      "tool.call.started",
      "tool.call.args.delta",
      "tool.call.args.delta",
      "tool.call.awaiting_approval",
      "tool.call.running",
      "tool.call.result",
      "tool.call.finished",
      "run.finished",
    ]);
    expect(result.events.find((event) => event.type === "tool.call.started")?.payload).toMatchObject({
      toolCallId: "call_1",
      name: "filesystem.read_text_file",
      safety: "needs_approval",
    });
    expect(result.events.find((event) => event.type === "tool.call.awaiting_approval")?.payload).toMatchObject({
      toolCallId: "call_1",
      argsPreview: { path: "src/App.tsx" },
    });
    // The running state carries the parsed args, so the card can render them while it waits.
    expect(result.events.find((event) => event.type === "tool.call.running")?.payload).toMatchObject({
      toolCallId: "call_1",
      args: { path: "src/App.tsx" },
    });
    // Simulated, and the result says so rather than implying the file was read.
    const toolResult = result.events.find((event) => event.type === "tool.call.result");
    expect(toolResult?.payload).toMatchObject({ toolCallId: "call_1" });
    expect(String(toolResult?.payload.result)).toContain("src/App.tsx");
    expect(String(toolResult?.payload.result)).toContain("simulated live result");
    expect(result.events.find((event) => event.type === "tool.call.finished")?.payload).toMatchObject({
      toolCallId: "call_1",
      status: "success",
    });
    expect(result.messages.at(-1)).toEqual({ role: "assistant", content: "" });
  });

  it("renders a tool error state when the model streams arguments that are not a JSON object", async () => {
    const fetcher = vi.fn(async () => sseResponse([
      { choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "read_file", arguments: "not-json" } }] } }] },
      { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
    ]));

    const result = await runLiveLlmPreview({
      prompt: "Read App",
      project: defaultCodingAgentProject,
      sessionKeys: { openai: "sk-test" },
      fetcher,
      now: () => 1_760_000_100_000,
    });

    expect(result.events.map((event) => event.type)).toEqual([
      "run.started",
      "tool.call.started",
      "tool.call.args.delta",
      "tool.call.awaiting_approval",
      "tool.call.running",
      "tool.call.error",
      "tool.call.finished",
      "run.finished",
    ]);
    expect(result.events.find((event) => event.type === "tool.call.error")?.payload).toMatchObject({
      toolCallId: "call_1",
      code: "LIVE_TOOL_ARGS_INVALID",
      retryable: true,
    });
    expect(result.events.find((event) => event.type === "tool.call.finished")?.payload).toMatchObject({
      status: "error",
    });
  });

  it("reports an unsupported-tool error when the model invents a tool outside the advertised toolset", async () => {
    const fetcher = vi.fn(async () => sseResponse([
      { choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "deploy_to_production", arguments: "{\"env\":\"prod\"}" } }] } }] },
      { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
    ]));

    const result = await runLiveLlmPreview({
      prompt: "Ship it",
      project: defaultCodingAgentProject,
      sessionKeys: { openai: "sk-test" },
      fetcher,
      now: () => 1_760_000_100_000,
    });

    expect(result.events.find((event) => event.type === "tool.call.error")?.payload).toMatchObject({
      toolCallId: "call_1",
      code: "LIVE_TOOL_UNSUPPORTED",
      retryable: false,
    });
    expect(result.events.find((event) => event.type === "tool.call.result")).toBeUndefined();
  });

  it("aborts during a simulated tool call instead of waiting out the delay", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(async () => sseResponse([
      { choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "read_file", arguments: "{\"path\":\"src/App.tsx\"}" } }] } }] },
      { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
    ]));

    const pending = runLiveLlmPreview({
      prompt: "Read App",
      project: defaultCodingAgentProject,
      sessionKeys: { openai: "sk-test" },
      fetcher,
      now: () => 1_760_000_100_000,
      toolSimulationDelayMs: 5_000,
      signal: controller.signal,
      onEvents(events) {
        // Abort as soon as the card enters its running state.
        if (events.some((event) => event.type === "tool.call.running")) {
          controller.abort();
        }
      },
    });

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("projects non-stream mixed responses through the same canonical reasoning, tool, text finish order", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            role: "assistant",
            reasoning_content: "hidden reasoning",
            tool_calls: [
              { index: 0, id: "call_1", function: { name: "filesystem.read_text_file", arguments: "{\"path\":\"src/App.tsx\"}" } },
            ],
            content: "Read App.tsx.",
          },
        },
      ],
    }), { status: 200 }));

    const result = await runLiveLlmPreview({
      prompt: "Read App",
      project: defaultCodingAgentProject,
      sessionKeys: { openai: "sk-test" },
      fetcher,
      now: () => 1_760_000_100_000,
    });

    expect(result.events.map((event) => event.type)).toEqual([
      "run.started",
      "reasoning.status",
      "reasoning.private",
      "tool.call.started",
      "tool.call.args.delta",
      "text.started",
      "text.delta",
      "text.finished",
      "reasoning.summary",
      "reasoning.finished",
      "tool.call.awaiting_approval",
      "tool.call.running",
      "tool.call.result",
      "tool.call.finished",
      "run.finished",
    ]);
  });

  it("projects provider structured output into canonical artifact events", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Created a structured result.",
            structured_output: {
              title: "SearchPlan.json",
              data: { nextStep: "validate-input" },
            },
          },
        },
      ],
    }), { status: 200 }));

    const result = await runLiveLlmPreview({
      prompt: "Return structured output",
      project: defaultCodingAgentProject,
      sessionKeys: { openai: "sk-test" },
      fetcher,
      now: () => 1_760_000_100_000,
    });

    expect(result.events.map((event) => event.type)).toContain("artifact.created");
    expect(result.events.map((event) => event.type)).toContain("artifact.delta");
    expect(result.events.map((event) => event.type)).toContain("artifact.finished");
    expect(result.events.find((event) => event.type === "artifact.created")?.payload).toMatchObject({
      kind: "custom",
      title: "SearchPlan.json",
      mimeType: "application/json",
    });
    expect(result.events.find((event) => event.type === "artifact.delta")?.payload).toMatchObject({
      delta: expect.stringContaining("validate-input"),
      format: "json",
    });
  });
});

describe("reasoning field shapes", () => {
  /**
   * There is no standard name for streamed reasoning. Reading only `reasoning_content` meant a
   * provider that really did stream its thinking produced no reasoning events at all, so the
   * composed thinking block never appeared — indistinguishable from "the preset did not apply".
   *
   * What the timeline shows is a separate, deliberate decision, asserted by the LM Studio test
   * above: the raw chain rides in a hidden `reasoning.private` event and is kept out of the
   * rendered timeline. These tests cover the field names only.
   */
  const shapes: ReadonlyArray<{ name: string; delta: Record<string, unknown> }> = [
    { name: "reasoning_content (DeepSeek / Qwen / Moonshot)", delta: { reasoning_content: "weighing options" } },
    { name: "reasoning (OpenRouter)", delta: { reasoning: "weighing options" } },
    { name: "nested reasoning.content (gateways)", delta: { reasoning: { content: "weighing options" } } },
  ];

  for (const shape of shapes) {
    it(`recognises reasoning sent as ${shape.name}`, async () => {
      const fetcher = vi.fn(async () => sseResponse([
        { choices: [{ index: 0, delta: shape.delta }] },
        { choices: [{ index: 0, delta: { content: "Here is the answer." } }] },
      ]));

      const result = await runLiveLlmPreview({
        prompt: "Think about this",
        project: defaultCodingAgentProject,
        sessionKeys: { openai: "sk-test" },
        history: [],
        fetcher: fetcher as unknown as typeof fetch,
        now: () => 1_760_000_100_000,
      });

      const priv = result.events.filter((event) => event.type === "reasoning.private");
      expect(priv).toHaveLength(1);
      expect(priv[0]).toMatchObject({ visibility: "hidden", payload: { value: "weighing options" } });
      // A reasoning block exists to render, which is what was missing before.
      expect(result.events.some((event) => event.type === "reasoning.status")).toBe(true);
      expect(result.events.some((event) => event.type === "reasoning.summary")).toBe(true);

      const viewModel = createAgentUXViewModel(replayAgentUXEvents(result.events));
      expect(viewModel.timeline.some((item) => item.kind === "reasoning")).toBe(true);
      // Same invariant the LM Studio test pins: the raw chain stays out of the timeline.
      expect(JSON.stringify(viewModel.timeline)).not.toContain("weighing options");
    });
  }

  it("emits no reasoning when the model sends none", async () => {
    // gpt-4o and friends stream text only. No field name can invent a stream that never came,
    // so this stays empty on purpose rather than fabricating a thinking block.
    const fetcher = vi.fn(async () => sseResponse([
      { choices: [{ index: 0, delta: { content: "Plain answer." } }] },
    ]));

    const result = await runLiveLlmPreview({
      prompt: "Say hi",
      project: defaultCodingAgentProject,
      sessionKeys: { openai: "sk-test" },
      history: [],
      fetcher: fetcher as unknown as typeof fetch,
      now: () => 1_760_000_100_000,
    });

    expect(result.events.filter((event) => event.type.startsWith("reasoning."))).toHaveLength(0);
  });
});

describe("show: thinking surfaces the model's own reasoning", () => {
  const thinkingProject = {
    ...defaultCodingAgentProject,
    reasoning: { ...defaultCodingAgentProject.reasoning, show: "thinking" as const },
  };

  it("renders the streamed reasoning instead of the placeholder", async () => {
    const fetcher = vi.fn(async () => sseResponse([
      { choices: [{ index: 0, delta: { reasoning_content: "checking the reducer first" } }] },
      { choices: [{ index: 0, delta: { content: "Found it." } }] },
    ]));

    const result = await runLiveLlmPreview({
      prompt: "Why does it fail",
      project: thinkingProject,
      sessionKeys: { openai: "sk-test" },
      history: [],
      fetcher: fetcher as unknown as typeof fetch,
      now: () => 1_760_000_100_000,
    });

    const summary = result.events.find((event) => event.type === "reasoning.summary");
    expect(summary?.payload).toMatchObject({ summary: "checking the reducer first" });

    const viewModel = createAgentUXViewModel(replayAgentUXEvents(result.events));
    expect(JSON.stringify(viewModel.timeline)).toContain("checking the reducer first");
  });

  it("still falls back to the placeholder when the model streamed nothing", async () => {
    const fetcher = vi.fn(async () => sseResponse([
      { choices: [{ index: 0, delta: { content: "Plain answer." } }] },
    ]));

    const result = await runLiveLlmPreview({
      prompt: "Say hi",
      project: thinkingProject,
      sessionKeys: { openai: "sk-test" },
      history: [],
      fetcher: fetcher as unknown as typeof fetch,
      now: () => 1_760_000_100_000,
    });

    // No reasoning arrived, so there is no block at all — nothing is invented to fill it.
    expect(result.events.filter((event) => event.type.startsWith("reasoning."))).toHaveLength(0);
  });
});
