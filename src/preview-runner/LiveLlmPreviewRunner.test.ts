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
    expect(result.messages.at(-1)).toEqual({ role: "assistant", content: "" });
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
