import { describe, expect, it, vi } from "vitest";

import { createProviderConnection, defaultCodingAgentProject } from "../schema/agentuxConfig";
import { admitEvents } from "../runtime/admissionReport";
import { runLiveLlmPreview } from "./LiveLlmPreviewRunner";

/**
 * Anthropic, end to end through the configurator's live path.
 *
 * `providerCatalog` ships Anthropic as a built-in choice, but `runLiveLlmPreview` used to
 * reject any protocol other than `openai-compatible` — so a user who picked Claude, pasted
 * their own key and pressed run got an error instead of a run. Since the product model is
 * "the backends are wired, you supply the key and the model", that was the first thing such a
 * user would hit.
 *
 * The provider is selected exactly as the app selects it (an enabled connection in the
 * project), and the network is a fake SSE body — the goal is to prove the wiring, not to call
 * Anthropic.
 */

/** A project whose default provider is Anthropic, as if picked in the configurator. */
function projectWithAnthropic() {
  const anthropic = { ...createProviderConnection("anthropic", true), enabled: true };
  return {
    ...defaultCodingAgentProject,
    providers: {
      ...defaultCodingAgentProject.providers,
      defaultProviderId: anthropic.id,
      connections: [anthropic],
    },
  };
}

function anthropicSse(frames: unknown[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const frame of frames) {
          controller.enqueue(encoder.encode(`event: x\ndata: ${JSON.stringify(frame)}\n\n`));
        }
        controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream" } },
  );
}

const turn = [
  { type: "message_start", message: { id: "msg_1", role: "assistant", model: "claude-sonnet-4" } },
  { type: "content_block_start", index: 0, content_block: { type: "thinking" } },
  { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "先看一下。" } },
  { type: "content_block_stop", index: 0 },
  { type: "content_block_start", index: 1, content_block: { type: "text" } },
  { type: "content_block_delta", index: 1, delta: { type: "text_delta", text: "已经检查完了。" } },
  { type: "content_block_stop", index: 1 },
  { type: "message_stop" },
];

describe("Anthropic live preview", () => {
  it("runs instead of throwing when the user picks Anthropic and supplies a key", async () => {
    const fetcher = vi.fn(async () => anthropicSse(turn));

    const result = await runLiveLlmPreview({
      prompt: "检查一下配置",
      project: projectWithAnthropic(),
      sessionKeys: { anthropic: "sk-ant-test" },
      fetcher: fetcher as unknown as typeof fetch,
      now: () => 1_000,
    });

    expect(result.provider.protocol).toBe("anthropic");
    expect(result.events.map((event) => event.type)).toEqual([
      "run.started",
      "reasoning.status",
      "reasoning.delta",
      "reasoning.finished",
      "text.started",
      "text.delta",
      "text.finished",
      "run.finished",
    ]);
    expect(result.messages.at(-1)).toEqual({ role: "assistant", content: "已经检查完了。" });
  });

  it("sends the Messages endpoint with Anthropic's own auth headers", async () => {
    // `x-api-key` + `anthropic-version`, not a Bearer token — `providerRequestHeaders` already
    // knew this; the runner just never reached it.
    const fetcher = vi.fn(async () => anthropicSse(turn));

    await runLiveLlmPreview({
      prompt: "hi",
      project: projectWithAnthropic(),
      sessionKeys: { anthropic: "sk-ant-test" },
      fetcher: fetcher as unknown as typeof fetch,
    });

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-test");
    expect(headers["anthropic-version"]).toBeTruthy();
    expect(headers.Authorization).toBeUndefined();

    const body = JSON.parse(String(init.body));
    expect(body.stream).toBe(true);
    expect(body.model).toBe("claude-sonnet-4");
    expect(body.messages).toEqual([{ role: "user", content: "hi" }]);
  });

  it("still refuses a key-less run with the same message as any other provider", async () => {
    await expect(
      runLiveLlmPreview({ prompt: "hi", project: projectWithAnthropic() }),
    ).rejects.toThrow(/session key/i);
  });

  it("produces events our own admission layer accepts unchanged", async () => {
    // The point of routing a vendor through an adapter: what comes out is already ours, so the
    // admission layer has nothing to hold back and nothing to rewrite.
    const result = await runLiveLlmPreview({
      prompt: "hi",
      project: projectWithAnthropic(),
      sessionKeys: { anthropic: "sk-ant-test" },
      fetcher: (async () => anthropicSse(turn)) as unknown as typeof fetch,
    });

    const admission = admitEvents(result.events);
    expect(admission.normalize.rejected).toEqual([]);
    expect(admission.normalize.undesignedTools).toEqual([]);
    expect(admission.events).toEqual(result.events);
  });

  it("names the protocol when there is genuinely no adapter", async () => {
    const project = projectWithAnthropic();
    const unsupported = {
      ...project,
      providers: {
        ...project.providers,
        connections: [{ ...project.providers.connections[0], protocol: "some-future-protocol" as never }],
      },
    };
    await expect(
      runLiveLlmPreview({ prompt: "hi", project: unsupported, sessionKeys: { anthropic: "k" } }),
    ).rejects.toThrow(/some-future-protocol/);
  });
});
