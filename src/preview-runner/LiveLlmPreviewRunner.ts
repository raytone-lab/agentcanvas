import {
  agentUXEventBuilders,
  type AgentUXEvent,
  type AgentUXEventBuilderMeta,
} from "@agent-ux/protocol";

import {
  defaultProviderConnection,
  type AgentFrontendProject,
  type ProviderConnection,
} from "../schema/agentuxConfig";
import {
  anthropicLiveToolset,
  buildOpenAICompatibleChatBody,
  type ProviderRequestOptions,
} from "../harness/providerCapabilities";
import {
  applyAnthropicFrame,
  createAnthropicTranslateState,
  parseSseData,
  pendingAnthropicToolCalls,
  type ApplyAnthropicFrameOptions,
  type PendingAnthropicToolCall,
} from "../harness/adapters/anthropicAdapter";
import { createEventWriter, type AgentUXEventWriter } from "../harness/adapters/eventWriter";
import { simulateLiveToolCall } from "./liveToolSimulator";

export type LiveLlmMessage = {
  role: "user" | "assistant";
  content: string;
};

export type LiveLlmPreviewInput = {
  prompt: string;
  project: AgentFrontendProject;
  sessionKeys?: Record<string, string>;
  history?: LiveLlmMessage[];
  runId?: string;
  fetchMode?: ProviderFetchMode;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  requestOptions?: ProviderRequestOptions;
  now?: () => number;
  onEvents?: (events: readonly AgentUXEvent[]) => void;
  /**
   * How long a simulated tool call stays in `running` before its result lands.
   *
   * Defaults to 0 so tests observe the full event sequence without waiting. The app passes
   * `LIVE_TOOL_SIMULATION_DELAY_MS` so the running state is actually visible.
   */
  toolSimulationDelayMs?: number;
};

/**
 * Long enough for the tool card's running state and its spinner to register as a state the user
 * saw, short enough that a multi-tool turn does not feel stalled.
 */
export const LIVE_TOOL_SIMULATION_DELAY_MS = 260;

export type LiveLlmPreviewResult = {
  events: AgentUXEvent[];
  messages: LiveLlmMessage[];
  provider: ProviderConnection;
};

type OpenAICompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
      reasoning_content?: unknown;
      reasoning?: unknown;
      tool_calls?: OpenAICompatibleToolCallDelta[];
      structured_output?: unknown;
      parsed?: unknown;
    };
    delta?: OpenAICompatibleDelta;
    finish_reason?: unknown;
    index?: number;
    text?: unknown;
  }>;
};

type OpenAICompatibleChoice = NonNullable<OpenAICompatibleResponse["choices"]>[number];

type OpenAICompatibleDelta = {
  content?: unknown;
  reasoning_content?: unknown;
  /** OpenRouter and some gateways use this name instead. See `reasoningText`. */
  reasoning?: unknown;
  tool_calls?: OpenAICompatibleToolCallDelta[];
  structured_output?: unknown;
  artifact?: unknown;
};

type OpenAICompatibleToolCallDelta = {
  index?: number;
  id?: string;
  function?: {
    name?: unknown;
    arguments?: unknown;
  };
};

type StructuredArtifactInput = {
  artifactId?: string;
  title?: string;
  mimeType?: string;
  delta: unknown;
  format: "text" | "json";
};

type EventBuildContext = {
  project: AgentFrontendProject;
  provider: ProviderConnection;
  runId: string;
  now: number;
};

export type ProviderFetchMode = "direct" | "agentcanvas-dev-proxy";

const agentCanvasProviderProxyPrefix = "/__agentcanvas/provider";

export async function runLiveLlmPreview(input: LiveLlmPreviewInput): Promise<LiveLlmPreviewResult> {
  const provider = defaultProviderConnection(input.project);

  const apiKey = input.sessionKeys?.[provider.id]?.trim();
  if (provider.auth.mode !== "none" && !apiKey) {
    throw new Error(`Enter a dev session key for ${provider.label} before running Live LLM.`);
  }

  // Dispatch on the provider's declared protocol. `providerCatalog` ships Anthropic as a
  // built-in option, so refusing it here meant a user who picked Claude, pasted their own key
  // and pressed run got an error instead of a run — on the one provider they were most likely
  // to try first.
  if (provider.protocol === "anthropic") {
    return runAnthropicLivePreview(input, provider, apiKey);
  }
  if (provider.protocol !== "openai-compatible") {
    throw new Error(
      `${provider.label} 使用 ${provider.protocol} 协议，暂无适配器。` +
        `已支持：openai-compatible、anthropic。`,
    );
  }

  const prompt = normalizePrompt(input.prompt);
  const requestMessages = [...(input.history ?? []), { role: "user" as const, content: prompt }];
  const runId = input.runId ?? `live_llm_${Date.now().toString(36)}`;
  const writer = createLiveLlmEventWriter({
    project: input.project,
    provider,
    runId,
    now: input.now?.() ?? Date.now(),
  }, input.onEvents);
  throwIfAborted(input.signal);
  writer.start();
  throwIfAborted(input.signal);
  writer.addHistory(input.history ?? []);
  throwIfAborted(input.signal);

  const response = await createOpenAICompatibleChatRequest(provider, requestMessages, {
    apiKey,
    fetchMode: input.fetchMode,
    signal: input.signal,
    fetcher: input.fetcher,
    requestOptions: input.requestOptions,
  });
  if (!response.ok) {
    throw new Error(`${provider.label} Live LLM failed: ${response.status} ${response.statusText}`.trim());
  }

  const isStream = isEventStreamResponse(response);
  const streamResult = isStream
    ? await readOpenAICompatibleSse(response, (delta, choiceIndex) => writer.addDelta(delta, choiceIndex), input.signal)
    : openAICompatibleResponseToResult(await response.json() as OpenAICompatibleResponse);
  if (!isStream) {
    throwIfAborted(input.signal);
    writer.addDelta({
      content: streamResult.content,
      reasoning_content: streamResult.reasoningContent,
      tool_calls: streamResult.toolCalls,
      structured_output: streamResult.structuredArtifact,
    }, 0);
  }
  const assistantText = streamResult.content;
  throwIfAborted(input.signal);
  writer.finishAssistant();
  throwIfAborted(input.signal);
  writer.finishReasoning();
  throwIfAborted(input.signal);
  await writer.finishToolCalls({
    delayMs: input.toolSimulationDelayMs ?? 0,
    signal: input.signal,
  });
  throwIfAborted(input.signal);
  writer.finishRun();

  const messages = [...requestMessages, { role: "assistant" as const, content: assistantText }];

  return {
    events: writer.events,
    messages,
    provider,
  };
}

/**
 * Anthropic Messages API path.
 *
 * Deliberately thin: the request reuses `providerRequestUrl` / `providerRequestHeaders` (which
 * already know about `x-api-key` and the dev proxy), and the SSE→events translation is
 * `applyAnthropicFrame`, which is covered by tests without a network. Nothing here duplicates
 * the openai-compatible writer.
 */
async function runAnthropicLivePreview(
  input: LiveLlmPreviewInput,
  provider: ProviderConnection,
  apiKey?: string,
): Promise<LiveLlmPreviewResult> {
  const prompt = normalizePrompt(input.prompt);
  const history = input.history ?? [];
  const runId = input.runId ?? `live_anthropic_${Date.now().toString(36)}`;
  const fetcher = input.fetcher ?? fetch;

  const writer = createEventWriter({
    runId,
    now: input.now?.() ?? Date.now(),
    onEvents: input.onEvents,
  });
  const state = createAnthropicTranslateState();
  // Tool calls stay open past `message_stop` so this function can simulate their results; see
  // `settleSimulatedToolCalls`. The harness-import path leaves this off and still cancels.
  const frameOptions: ApplyAnthropicFrameOptions = { deferToolCompletion: true };

  const response = await fetcher(providerRequestUrl(provider, "messages", input.fetchMode), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...providerRequestHeaders(provider, apiKey, input.fetchMode),
    },
    signal: input.signal,
    body: JSON.stringify({
      model: provider.defaultModel,
      max_tokens: 4096,
      stream: true,
      messages: [
        ...history.map((message) => ({ role: message.role, content: message.content })),
        { role: "user", content: prompt },
      ],
      // Without this the model is never told any tool exists, so it never emits a `tool_use`
      // block and a live Claude session could only ever fill the conversation surface — the
      // composed tool cards never appeared, on the provider users are most likely to try first.
      tools: anthropicLiveToolset(),
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`${provider.label} Live LLM failed: ${response.status} ${response.statusText}`.trim());
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      throwIfAborted(input.signal);
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Hold back the trailing partial line.
      const lastBreak = buffer.lastIndexOf("\n");
      if (lastBreak < 0) continue;
      const ready = buffer.slice(0, lastBreak);
      buffer = buffer.slice(lastBreak + 1);
      for (const frame of parseSseData(ready)) applyAnthropicFrame(frame, writer, state, frameOptions);
    }
    for (const frame of parseSseData(buffer)) applyAnthropicFrame(frame, writer, state, frameOptions);

    // `deferToolCompletion` left the requested calls open so their results could be simulated
    // with the running state visible. Same simulator as the openai-compatible path, so Claude's
    // cards reach the same states as every other provider's.
    await settleSimulatedToolCalls(writer, pendingAnthropicToolCalls(state), {
      delayMs: input.toolSimulationDelayMs ?? 0,
      signal: input.signal,
    });
    writer.runFinished({ status: "success" });
  } finally {
    // However the stream ended, no block is left open.
    writer.finishAll();
  }

  const assistantText = writer.events
    .filter((event) => event.type === "text.delta")
    .map((event) => String(event.payload.delta ?? ""))
    .join("");

  return {
    events: [...writer.events],
    messages: [
      ...history,
      { role: "user" as const, content: prompt },
      { role: "assistant" as const, content: assistantText },
    ],
    provider,
  };
}

export async function createOpenAICompatibleChatRequest(
  provider: ProviderConnection,
  messages: readonly LiveLlmMessage[],
  options: {
    apiKey?: string;
    fetchMode?: ProviderFetchMode;
    signal?: AbortSignal;
    fetcher?: typeof fetch;
    requestOptions?: ProviderRequestOptions;
  } = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (options.fetchMode === "agentcanvas-dev-proxy") {
    headers["x-agentcanvas-provider-base-url"] = provider.baseUrl;
  }
  if (provider.auth.mode !== "none" && options.apiKey) {
    headers.Authorization = `Bearer ${options.apiKey}`;
  }

  return (options.fetcher ?? fetch)(providerRequestUrl(provider, "chat/completions", options.fetchMode), {
	    method: "POST",
	    headers,
	    body: JSON.stringify(buildOpenAICompatibleChatBody(provider, messages, options.requestOptions)),
	    signal: options.signal,
	  });
}

export function providerRequestUrl(
  provider: ProviderConnection,
  path: string,
  fetchMode: ProviderFetchMode = "direct",
): string {
  const normalizedPath = path.replace(/^\/+/, "");
  if (fetchMode === "agentcanvas-dev-proxy") {
    return `${agentCanvasProviderProxyPrefix}/${normalizedPath}`;
  }
  return `${provider.baseUrl.replace(/\/+$/, "")}/${normalizedPath}`;
}

export function providerRequestHeaders(
  provider: ProviderConnection,
  sessionKey?: string,
  fetchMode: ProviderFetchMode = "direct",
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (fetchMode === "agentcanvas-dev-proxy") {
    headers["x-agentcanvas-provider-base-url"] = provider.baseUrl;
  }
  if (provider.auth.mode === "none") {
    return headers;
  }

  const apiKey = sessionKey?.trim();
  if (!apiKey) {
    return headers;
  }
  if (provider.protocol === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    return headers;
  }
  headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

function createLiveLlmEventWriter(
  context: EventBuildContext,
  onEvents?: (events: readonly AgentUXEvent[]) => void,
) {
  const events: AgentUXEvent[] = [];
  let seq = 0;
  let textStarted = false;
  let textFinished = false;
  let reasoningStarted = false;
  let reasoningFinished = false;
  /** Reasoning the provider actually streamed, kept for the `show: "thinking"` summary. */
  let streamedReasoning = "";
  let assistantIndex = 0;
  const toolCallStates = new Map<string, {
    toolCallId: string;
    name: string;
    argsText: string;
    completed: boolean;
  }>();
  const openArtifactIds = new Set<string>();
  const currentTextId = `${context.runId}_assistant_current`;
  const currentMessageId = `${context.runId}_message_current`;
  const reasoningId = `${context.runId}_reasoning`;
  const meta = (id: string, extra: Partial<AgentUXEventBuilderMeta> = {}): AgentUXEventBuilderMeta => {
    seq += 1;
    return {
      id: `evt_${context.runId}_${id}`,
      runId: context.runId,
      seq,
      ts: context.now + seq,
      ...extra,
    };
  };

  const push = (...nextEvents: AgentUXEvent[]) => {
    events.push(...nextEvents);
    onEvents?.([...events]);
  };

  const startCurrentText = () => {
    if (textStarted) {
      return;
    }
    textStarted = true;
    push(agentUXEventBuilders.textStarted(meta("text_started_current", { messageId: currentMessageId }), {
      textId: currentTextId,
      role: "assistant",
      format: "markdown",
    }));
  };

  const startReasoning = () => {
    if (reasoningStarted) {
      return;
    }
    reasoningStarted = true;
    push(agentUXEventBuilders.reasoningStatus(meta("reasoning_status"), {
      reasoningId,
      status: "thinking",
      label: "Thinking",
    }));
  };

  return {
    events,
    start() {
      push(agentUXEventBuilders.runStarted(meta("run_started"), {
        title: "Live LLM chat preview",
        input: {
          template: context.project.template,
          transport: "live-llm",
          providerId: context.provider.id,
          model: context.provider.defaultModel,
        },
        metadata: {
          runner: "live-llm",
          providerId: context.provider.id,
          harness: "none",
        },
      }));
    },
    addHistory(messages: readonly LiveLlmMessage[]) {
      for (const message of messages) {
        if (message.role !== "assistant") {
          continue;
        }
        assistantIndex += 1;
        const textId = `${context.runId}_assistant_${assistantIndex}`;
        const messageId = `${context.runId}_message_${assistantIndex}`;
        push(
          agentUXEventBuilders.textStarted(meta(`text_started_${assistantIndex}`, { messageId }), {
            textId,
            role: "assistant",
            format: "markdown",
          }),
          agentUXEventBuilders.textDelta(meta(`text_delta_${assistantIndex}`, { messageId }), {
            textId,
            delta: message.content,
          }),
          agentUXEventBuilders.textFinished(meta(`text_finished_${assistantIndex}`, { messageId }), { textId }),
        );
      }
    },
    addDelta(delta: OpenAICompatibleDelta, choiceIndex = 0) {
      const reasoning = reasoningText(delta);
      if (reasoning) {
        this.addReasoningPrivate(reasoning);
      }
      for (const toolCall of delta.tool_calls ?? []) {
        const indexKey = `${choiceIndex}:${toolCall.index ?? 0}`;
        const existing = toolCallStates.get(indexKey);
        const toolCallId = toolCall.id ?? existing?.toolCallId ?? `${context.runId}_tool_${indexKey.replace(":", "_")}`;
        const name = stringValue(toolCall.function?.name) || existing?.name || "openai_tool";
        const state = existing ?? { toolCallId, name, argsText: "", completed: false };
        state.toolCallId = toolCallId;
        state.name = name;
        toolCallStates.set(indexKey, state);

        if (!existing) {
          push(agentUXEventBuilders.toolCallStarted(meta(`tool_started_${safeEventId(indexKey)}`), {
            toolCallId,
            name,
            title: name,
            safety: "needs_approval",
          }));
        }

        const argsDelta = stringValue(toolCall.function?.arguments);
        if (argsDelta) {
          state.argsText += argsDelta;
          push(agentUXEventBuilders.toolCallArgsDelta(meta(`tool_args_${safeEventId(indexKey)}_${seq + 1}`), {
            toolCallId,
            delta: argsDelta,
            format: "json-fragment",
          }));
        }
      }
      if (delta.structured_output !== undefined) {
        this.addStructuredArtifact(normalizeStructuredArtifact(delta.structured_output));
      }
      if (delta.artifact !== undefined) {
        this.addStructuredArtifact(normalizeStructuredArtifact(delta.artifact));
      }
      const content = stringValue(delta.content);
      if (content) {
        startCurrentText();
        push(agentUXEventBuilders.textDelta(meta(`text_delta_current_${seq + 1}`, { messageId: currentMessageId }), {
          textId: currentTextId,
          delta: content,
        }));
      }
    },
    addStructuredArtifact(artifact: StructuredArtifactInput) {
      const artifactId = artifact.artifactId ?? `${context.runId}_structured_output`;
      if (!openArtifactIds.has(artifactId)) {
        openArtifactIds.add(artifactId);
        push(agentUXEventBuilders.artifactCreated(meta(`artifact_created_${safeEventId(artifactId)}`), {
          artifactId,
          kind: "custom",
          title: artifact.title ?? "StructuredOutput.json",
          mimeType: artifact.mimeType ?? "application/json",
        }));
      }

      push(
        agentUXEventBuilders.artifactDelta(meta(`artifact_delta_${safeEventId(artifactId)}_${seq + 1}`), {
          artifactId,
          delta: artifact.format === "json" && typeof artifact.delta !== "string"
            ? JSON.stringify(artifact.delta, null, 2)
            : artifact.delta,
          format: artifact.format,
        }),
        agentUXEventBuilders.artifactFinished(meta(`artifact_finished_${safeEventId(artifactId)}`), {
          artifactId,
          status: "success",
          uri: `memory://${artifactId}`,
        }),
      );
      openArtifactIds.delete(artifactId);
    },
    addReasoningPrivate(value: string) {
      if (!value) {
        return;
      }
      streamedReasoning += value;
      startReasoning();
      push(agentUXEventBuilders.reasoningPrivate(meta(`reasoning_private_${seq + 1}`, { visibility: "hidden" }), {
        reasoningId,
        kind: "redacted",
        value,
        provider: context.provider.id,
      }));
    },
    finishAssistant() {
      if (!textStarted || textFinished) {
        return;
      }
      textFinished = true;
      push(agentUXEventBuilders.textFinished(meta("text_finished_current", { messageId: currentMessageId }), { textId: currentTextId }));
    },
    finishReasoning() {
      if (!reasoningStarted || reasoningFinished) {
        return;
      }
      reasoningFinished = true;
      /*
       * `show: "thinking"` is the composed request to see what the model actually said, so it
       * gets the streamed text. Every other setting keeps the generic line.
       *
       * The raw chain still travels only in the hidden `reasoning.private` events, and the
       * timeline still excludes it for `status` and `summary` — that invariant is pinned by the
       * LM Studio test and is not changed here. This adds the one path that was unreachable:
       * the schema and `ReasoningBlock` both had a `thinking` branch that nothing ever selected,
       * so a real run could only ever render the placeholder.
       */
      const streamed = streamedReasoning.trim();
      const summary = context.project.reasoning.show === "thinking" && streamed
        ? streamed
        : "Model returned hidden reasoning while composing the response.";
      push(
        agentUXEventBuilders.reasoningSummary(meta("reasoning_summary"), {
          reasoningId,
          summary,
          kind: "summary",
          format: "plain",
        }),
        agentUXEventBuilders.reasoningFinished(meta("reasoning_finished"), {
          reasoningId,
          collapsedByDefault: context.project.reasoning.collapse !== "expanded",
        }),
      );
    },
    /**
     * Walk each requested tool through approval → running → result/error → finished.
     *
     * Nothing is executed; `simulateLiveToolCall` stands in for the result and says so. The
     * states in between exist because the tool card's `running`, `result` and `error` styles
     * were composed in the configurator and previously could not be reached with a real key —
     * the call terminated as `cancelled` straight out of approval.
     *
     * `delayMs` is what makes `running` observable rather than a frame that is overwritten in
     * the same tick. It defaults to 0 so tests stay deterministic; the app passes a real value.
     */
    async finishToolCalls(options: { delayMs?: number; signal?: AbortSignal } = {}) {
      for (const state of toolCallStates.values()) {
        if (state.completed) {
          continue;
        }
        state.completed = true;
        const parsedArgs = parseJsonObject(state.argsText);
        const args = parsedArgs.ok ? parsedArgs.value : undefined;
        const eventKey = safeEventId(state.toolCallId);

        push(
          agentUXEventBuilders.toolCallAwaitingApproval(meta(`tool_awaiting_${eventKey}`), {
            toolCallId: state.toolCallId,
            prompt: "Approve the simulated tool call? Live LLM preview does not execute tools.",
            argsPreview: args,
          }),
          agentUXEventBuilders.toolCallRunning(meta(`tool_running_${eventKey}`), {
            toolCallId: state.toolCallId,
            args: args ?? {},
          }),
        );

        await sleep(options.delayMs ?? 0, options.signal);
        throwIfAborted(options.signal);

        const outcome = simulateLiveToolCall({ name: state.name, args });
        if (outcome.kind === "error") {
          push(
            agentUXEventBuilders.toolCallError(meta(`tool_error_${eventKey}`), {
              toolCallId: state.toolCallId,
              code: outcome.code,
              retryable: outcome.retryable,
              userMessage: outcome.userMessage,
              developerMessage: outcome.developerMessage,
            }),
            agentUXEventBuilders.toolCallFinished(meta(`tool_finished_${eventKey}`), {
              toolCallId: state.toolCallId,
              status: "error",
            }),
          );
          continue;
        }

        push(
          agentUXEventBuilders.toolCallResult(meta(`tool_result_${eventKey}`), {
            toolCallId: state.toolCallId,
            result: outcome.result,
            resultPreview: outcome.resultPreview,
          }),
          agentUXEventBuilders.toolCallFinished(meta(`tool_finished_${eventKey}`), {
            toolCallId: state.toolCallId,
            status: "success",
          }),
        );
      }
    },
    finishRun() {
      push(agentUXEventBuilders.runFinished(meta("run_finished"), {
        assessment: {
          outcome: "success",
          summary: "Live LLM chat preview completed. Tool calls were simulated, not executed.",
          checks: [
            {
              key: "live_llm_provider",
              label: "Used configured LLM provider",
              passed: true,
              required: true,
            },
            {
              key: "no_harness",
              label: "No external harness",
              passed: true,
              required: true,
            },
          ],
        },
      }));
    },
  };
}

type OpenAICompatibleResult = {
  content: string;
  reasoningContent?: string;
  toolCalls?: OpenAICompatibleToolCallDelta[];
  structuredArtifact?: StructuredArtifactInput;
};

async function readOpenAICompatibleSse(
  response: Response,
  onDelta: (delta: OpenAICompatibleDelta, choiceIndex?: number) => void,
  signal?: AbortSignal,
): Promise<OpenAICompatibleResult> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Live LLM stream response did not include a readable body.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let reasoningContent = "";
  let sawToolCall = false;
  let sawArtifact = false;

  const cancelOnAbort = () => {
    void reader.cancel(createAbortError()).catch(() => undefined);
  };
  signal?.addEventListener("abort", cancelOnAbort, { once: true });

  try {
    for (;;) {
      throwIfAborted(signal);
      const { done, value } = await reader.read();
      throwIfAborted(signal);
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        throwIfAborted(signal);
        const data = eventStreamData(part);
        if (!data || data === "[DONE]") {
          continue;
        }
        const parsed = JSON.parse(data) as OpenAICompatibleResponse;
        const choice = parsed.choices?.[0];
        const delta = choice?.delta ?? {};
        const textDelta = stringValue(delta.content);
        const reasoningDelta = reasoningText(delta);
        const hasToolCalls = Boolean(delta.tool_calls?.length);
        const hasArtifact = delta.structured_output !== undefined || delta.artifact !== undefined;
        if (textDelta || reasoningDelta || hasToolCalls || hasArtifact) {
          onDelta(delta, choice?.index);
          throwIfAborted(signal);
          content += textDelta;
          reasoningContent += reasoningDelta;
          sawToolCall = sawToolCall || hasToolCalls;
          sawArtifact = sawArtifact || hasArtifact;
        }
      }

      if (done) {
        break;
      }
    }
  } finally {
    signal?.removeEventListener("abort", cancelOnAbort);
    reader.releaseLock();
  }

  if (!content.trim() && !sawToolCall && !sawArtifact) {
    throw new Error("Live LLM stream did not include assistant text.");
  }
  return { content, reasoningContent };
}

function eventStreamData(eventBlock: string): string | undefined {
  const lines = eventBlock
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim());
  return lines.length > 0 ? lines.join("\n") : undefined;
}

function isEventStreamResponse(response: Response): boolean {
  return response.headers.get("content-type")?.toLowerCase().includes("text/event-stream") ?? false;
}

function openAICompatibleResponseToResult(data: OpenAICompatibleResponse): OpenAICompatibleResult {
  const choice = data.choices?.[0];
  const toolCalls = choice?.message?.tool_calls;
  const structuredArtifact = structuredArtifactFromChoice(choice);
  const content = extractOpenAICompatibleText(data, Boolean(toolCalls?.length) || Boolean(structuredArtifact));
  const reasoningContent = reasoningText(choice?.message);
  return {
    content,
    reasoningContent: reasoningContent || undefined,
    toolCalls,
    structuredArtifact,
  };
}

function extractOpenAICompatibleText(data: OpenAICompatibleResponse, allowEmpty = false): string {
  const choice = data.choices?.[0];
  const content = choice?.message?.content ?? choice?.text;
  if (typeof content === "string" && content.trim()) {
    return content;
  }
  if (Array.isArray(content)) {
    const text = content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object" && "text" in item) {
          const textValue = (item as { text?: unknown }).text;
          return typeof textValue === "string" ? textValue : "";
        }
        return "";
      })
      .join("")
      .trim();
    if (text) {
      return text;
    }
  }
  if (allowEmpty) {
    return "";
  }
  throw new Error("Live LLM response did not include assistant text.");
}

/**
 * Reasoning text out of one delta or message, whatever the provider calls it.
 *
 * There is no standard field. DeepSeek, Qwen and Moonshot send `reasoning_content`; OpenRouter
 * sends `reasoning`, and some gateways nest it as `reasoning: { content }`. Reading only the
 * first name meant a provider that really did stream its thinking showed nothing at all — the
 * thinking block stayed empty and looked like the preset had not applied.
 *
 * Anthropic is not handled here: that path has its own reader for `thinking` /
 * `redacted_thinking` blocks in `harness/adapters/anthropicAdapter.ts`.
 *
 * A model that emits no reasoning at all (gpt-4o, for instance) still yields "" — no field name
 * can conjure a stream the model never sent.
 */
function reasoningText(source: { reasoning_content?: unknown; reasoning?: unknown } | undefined): string {
  if (!source) {
    return "";
  }
  const direct = stringValue(source.reasoning_content) || stringValue(source.reasoning);
  if (direct) {
    return direct;
  }
  const nested = source.reasoning;
  if (isRecord(nested)) {
    return stringValue(nested.content) || stringValue(nested.text);
  }
  return "";
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Parse streamed tool arguments, succeeding only for a JSON object.
 *
 * The name is load-bearing for the one caller: a model that streams `"123"` or `null` as its
 * arguments parses fine but is not an argument record, and letting that through put a bare
 * number into `argsPreview` and into the simulated tool call. Narrowing here means the caller's
 * `undefined` branch means "unusable arguments" for both cases.
 */
function parseJsonObject(value: string): { ok: true; value: Record<string, unknown> } | { ok: false } {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false };
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

/**
 * Close deferred Anthropic tool calls with simulated results.
 *
 * The openai-compatible path does the same thing inside its own writer's `finishToolCalls`; the
 * emit calls differ only because the two paths use different writer APIs. `simulateLiveToolCall`
 * — the part that decides what a tool call means — is shared, so Claude's cards cannot drift
 * away from every other provider's.
 */
async function settleSimulatedToolCalls(
  writer: AgentUXEventWriter,
  pending: readonly PendingAnthropicToolCall[],
  options: { delayMs?: number; signal?: AbortSignal },
): Promise<void> {
  for (const call of pending) {
    await sleep(options.delayMs ?? 0, options.signal);
    throwIfAborted(options.signal);

    const args = parseJsonObject(call.argsText);
    const outcome = simulateLiveToolCall({ name: call.name, args: args.ok ? args.value : undefined });
    if (outcome.kind === "error") {
      writer.toolError(call.toolCallId, {
        code: outcome.code,
        retryable: outcome.retryable,
        userMessage: outcome.userMessage,
        developerMessage: outcome.developerMessage,
      });
      writer.toolFinished(call.toolCallId, "error");
      continue;
    }
    writer.toolResult(call.toolCallId, { result: outcome.result, resultPreview: outcome.resultPreview });
    writer.toolFinished(call.toolCallId, "success");
  }
}

/**
 * Abort-aware pause. Stop during a simulated tool call has to settle immediately rather than
 * after the delay, so the timer is cleared on abort instead of being waited out.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(createAbortError());
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function createAbortError(): DOMException | Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Live LLM request aborted.", "AbortError");
  }
  const error = new Error("Live LLM request aborted.");
  error.name = "AbortError";
  return error;
}

function structuredArtifactFromChoice(choice: OpenAICompatibleChoice | undefined): StructuredArtifactInput | undefined {
  const message = choice?.message;
  const structuredValue = message?.structured_output ?? message?.parsed;
  return structuredValue === undefined ? undefined : normalizeStructuredArtifact(structuredValue);
}

function normalizeStructuredArtifact(value: unknown): StructuredArtifactInput {
  if (isRecord(value)) {
    const data = value.data ?? value.content ?? value.delta ?? value;
    return {
      artifactId: stringValue(value.artifactId) || stringValue(value.artifact_id) || undefined,
      title: stringValue(value.title) || "StructuredOutput.json",
      mimeType: stringValue(value.mimeType) || stringValue(value.mime_type) || "application/json",
      delta: data,
      format: typeof data === "string" ? "text" : "json",
    };
  }

  return {
    title: "StructuredOutput.json",
    mimeType: "application/json",
    delta: value,
    format: typeof value === "string" ? "text" : "json",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeEventId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]+/g, "_");
}

function normalizePrompt(prompt: string): string {
  const trimmed = prompt.trim();
  return trimmed.length > 0 ? trimmed : "Test this AgentCanvas UI/UX.";
}
