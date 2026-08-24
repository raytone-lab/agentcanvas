import type { AgentUXEvent } from "@agent-ux/protocol";

import type { AgentInput, HarnessAdapter } from "../HarnessAdapter";
import { createEventWriter, type AgentUXEventWriter } from "./eventWriter";

/**
 * Anthropic Messages API adapter.
 *
 * Translates the Messages API SSE stream into our events. The writer handles pairing, so this
 * file only decides what a frame *means*. `runLiveLlmPreview` dispatches here for any provider
 * declaring `protocol: "anthropic"`.
 *
 * Two shape mismatches drive the non-obvious choices here:
 *
 * 1. Anthropic indexes content blocks and can emit several text blocks in one message
 *    (text → tool_use → text). Our text surface is one block per turn, and the writer ignores
 *    deltas after a block closes — so closing on `content_block_stop` would silently drop
 *    everything after the first tool call. Text and thinking are therefore closed at
 *    `message_stop`, which concatenates the pieces into one bubble instead of losing them.
 * 2. Deltas are keyed by block index, not by tool id, so the index→id map below is required
 *    to attribute `input_json_delta` to the right call.
 *
 * A tool call is reported as requested-but-not-executed: the Messages API returns the model's
 * intent, it does not run anything. Whoever executes the tool feeds the result back as the
 * next turn, which is a harness concern, not this adapter's. `deferToolCompletion` lets a
 * caller that *does* have a result — live preview, which simulates one — close the call itself
 * instead of taking the default `cancelled`.
 */

type AnthropicFrame = {
  type?: string;
  index?: number;
  message?: { id?: string; role?: string; model?: string };
  content_block?: { type?: string; id?: string; name?: string };
  delta?: {
    type?: string;
    text?: string;
    thinking?: string;
    partial_json?: string;
    stop_reason?: string;
  };
  error?: { type?: string; message?: string };
};

type BlockState =
  | { kind: "text" }
  | { kind: "thinking" }
  | { kind: "tool"; toolCallId: string; name: string; argsText: string };

type TranslateState = {
  blocks: Map<number, BlockState>;
  openTools: Set<string>;
  runStarted: boolean;
  /** Reasoning is closed as soon as the answer begins, so the thinking block collapses. */
  reasoningClosed: boolean;
};

export type ApplyAnthropicFrameOptions = {
  /**
   * Leave requested tool calls open at `message_stop`, and skip `run.finished`.
   *
   * Default false, which is the harness-import contract: nothing executed the tool, so
   * `finishAll` marks it `cancelled` and no result is invented. Live preview sets this because
   * it simulates the result itself — with a delay, so `running` is a state the user sees rather
   * than a frame overwritten in the same tick — and then closes the run.
   */
  deferToolCompletion?: boolean;
};

export type PendingAnthropicToolCall = {
  toolCallId: string;
  name: string;
  argsText: string;
};

/**
 * Tool calls the model requested that no one has finished yet.
 *
 * Only meaningful together with `deferToolCompletion`; the caller owns closing them.
 */
export function pendingAnthropicToolCalls(state: TranslateState): readonly PendingAnthropicToolCall[] {
  const pending: PendingAnthropicToolCall[] = [];
  for (const block of state.blocks.values()) {
    if (block.kind === "tool" && state.openTools.has(block.toolCallId)) {
      pending.push({ toolCallId: block.toolCallId, name: block.name, argsText: block.argsText });
    }
  }
  return pending;
}

export function createAnthropicTranslateState(): TranslateState {
  return { blocks: new Map(), openTools: new Set(), runStarted: false, reasoningClosed: false };
}

function parseJsonObject(text: string): unknown {
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    // Truncated stream: better to show no args than a broken blob.
    return undefined;
  }
}

/**
 * Apply one Anthropic SSE frame. Returns nothing; everything is emitted through the writer.
 */
export function applyAnthropicFrame(
  frame: AnthropicFrame,
  writer: AgentUXEventWriter,
  state: TranslateState,
  options: ApplyAnthropicFrameOptions = {},
): void {
  switch (frame.type) {
    case "message_start": {
      if (state.runStarted) break;
      state.runStarted = true;
      writer.runStarted({
        title: "Anthropic Messages",
        input: { transport: "anthropic", model: frame.message?.model },
        metadata: { adapter: "anthropic" },
      });
      break;
    }

    case "content_block_start": {
      const index = frame.index ?? 0;
      const block = frame.content_block ?? {};
      if (block.type === "tool_use") {
        const toolCallId = block.id ?? `tool_${index}`;
        const name = block.name ?? "tool";
        state.blocks.set(index, { kind: "tool", toolCallId, name, argsText: "" });
        state.openTools.add(toolCallId);
        // Anthropic does not carry an approval decision; the harness that executes the tool
        // owns that. Marked as needing approval so a card without a result reads correctly.
        writer.toolStarted(toolCallId, { name, title: name, safety: "needs_approval" });
      } else if (block.type === "thinking" || block.type === "redacted_thinking") {
        state.blocks.set(index, { kind: "thinking" });
      } else {
        state.blocks.set(index, { kind: "text" });
      }
      break;
    }

    case "content_block_delta": {
      const index = frame.index ?? 0;
      const block = state.blocks.get(index);
      const delta = frame.delta ?? {};

      if (delta.type === "text_delta" && delta.text) {
        // The answer has begun, so the thinking block is done being useful open.
        if (!state.reasoningClosed) {
          state.reasoningClosed = true;
          writer.finishReasoning();
        }
        writer.textDelta(delta.text);
      } else if (delta.type === "thinking_delta" && delta.thinking) {
        writer.reasoningDelta(delta.thinking);
      } else if (delta.type === "input_json_delta" && delta.partial_json) {
        if (block?.kind === "tool") {
          block.argsText += delta.partial_json;
          writer.toolArgsDelta(block.toolCallId, delta.partial_json);
        }
      }
      // signature_delta and citations carry no UI surface; ignored on purpose.
      break;
    }

    case "content_block_stop": {
      const block = state.blocks.get(frame.index ?? 0);
      // Text and thinking stay open until message_stop — see the header comment.
      if (block?.kind === "tool") {
        const args = parseJsonObject(block.argsText);
        // args is what turns a generic row into a file/command card, so emit it even when the
        // tool will never run.
        // Authored in English so `i18n/previewLocalization.ts` can localize it. A Chinese
        // literal here showed up untranslated in an English preview, since that dictionary
        // looks copy up by its English source text.
        writer.toolAwaitingApproval(block.toolCallId, {
          prompt: "The model requested a tool call and is waiting for a result.",
          ...(args === undefined ? {} : { argsPreview: args }),
        });
        writer.toolRunning(block.toolCallId, args);
      }
      break;
    }

    case "message_delta": {
      // stop_reason lives here; the run's own completion is handled at message_stop.
      break;
    }

    case "message_stop": {
      writer.finishText();
      writer.finishReasoning();
      if (options.deferToolCompletion) {
        // The caller closes the tools and the run: it has a result to emit and wants the
        // `running` state to last long enough to be seen.
        break;
      }
      // Every tool the model asked for is still unexecuted. Leaving them open would spin the
      // card forever; `finishAll` marks them cancelled, which is what actually happened.
      writer.finishAll();
      writer.runFinished({ status: "success" });
      break;
    }

    case "error": {
      writer.runError({
        message: frame.error?.message ?? "Anthropic stream error",
        code: frame.error?.type,
      });
      writer.finishAll();
      break;
    }

    default:
      // ping and unknown future frame types.
      break;
  }
}

/**
 * Translate a complete list of Anthropic frames. This is the seam the tests drive: no network,
 * no timers, just frames in and our events out.
 */
export function anthropicEventsFromFrames(
  frames: readonly AnthropicFrame[],
  options: { runId?: string; now?: number } = {},
): AgentUXEvent[] {
  const writer = createEventWriter({ runId: options.runId ?? "anthropic", now: options.now });
  const state = createAnthropicTranslateState();
  for (const frame of frames) applyAnthropicFrame(frame, writer, state);
  // A stream that ended without message_stop still has to close its blocks.
  writer.finishAll();
  return [...writer.events];
}

/** Split an SSE body into the JSON objects carried by its `data:` lines. */
export function parseSseData(chunk: string): AnthropicFrame[] {
  const frames: AnthropicFrame[] = [];
  for (const rawLine of chunk.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("data:")) continue;
    const body = line.slice(5).trim();
    if (!body || body === "[DONE]") continue;
    try {
      frames.push(JSON.parse(body) as AnthropicFrame);
    } catch {
      // Comment/keep-alive line.
    }
  }
  return frames;
}

export type AnthropicHarnessOptions = {
  baseUrl: string;
  apiKey?: string;
  model: string;
  maxTokens?: number;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
  /** Anthropic requires this header; overridable for gateways that pin a version. */
  apiVersion?: string;
};

/**
 * Live adapter over the Messages API. Kept thin on purpose: everything interesting is in
 * `applyAnthropicFrame`, which is exercised without a network in the tests.
 */
export function createAnthropicHarness(options: AnthropicHarnessOptions): HarnessAdapter {
  return {
    name: "anthropic",
    connect(input: AgentInput) {
      return streamAnthropic(input, options);
    },
  };
}

async function* streamAnthropic(
  input: AgentInput,
  options: AnthropicHarnessOptions,
): AsyncIterable<AgentUXEvent> {
  const fetcher = options.fetcher ?? fetch;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "anthropic-version": options.apiVersion ?? "2023-06-01",
  };
  if (options.apiKey) headers["x-api-key"] = options.apiKey;

  const response = await fetcher(`${options.baseUrl.replace(/\/$/, "")}/messages`, {
    method: "POST",
    headers,
    signal: options.signal,
    body: JSON.stringify({
      model: input.model ?? options.model,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
      messages: [{ role: "user", content: input.prompt }],
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(
      `Anthropic stream failed: ${response.status} ${response.statusText}`.trim(),
    );
  }

  const writer = createEventWriter({ runId: `anthropic_${input.prompt.length}` });
  const state = createAnthropicTranslateState();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let emitted = 0;

  const drain = function* (): Generator<AgentUXEvent> {
    while (emitted < writer.events.length) {
      yield writer.events[emitted];
      emitted += 1;
    }
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Keep the trailing partial line in the buffer.
      const lastBreak = buffer.lastIndexOf("\n");
      if (lastBreak < 0) continue;
      const ready = buffer.slice(0, lastBreak);
      buffer = buffer.slice(lastBreak + 1);
      for (const frame of parseSseData(ready)) applyAnthropicFrame(frame, writer, state);
      yield* drain();
    }
    for (const frame of parseSseData(buffer)) applyAnthropicFrame(frame, writer, state);
  } finally {
    writer.finishAll();
    yield* drain();
  }
}
