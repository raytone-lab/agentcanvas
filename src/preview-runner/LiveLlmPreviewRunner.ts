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
  buildOpenAICompatibleChatBody,
  type ProviderRequestOptions,
} from "../harness/providerCapabilities";
import {
  applyAnthropicFrame,
  createAnthropicTranslateState,
  parseSseData,
} from "../harness/adapters/anthropicAdapter";
import { createEventWriter } from "../harness/adapters/eventWriter";

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
};

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
  writer.finishToolCalls();
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
      for (const frame of parseSseData(ready)) applyAnthropicFrame(frame, writer, state);
    }
    for (const frame of parseSseData(buffer)) applyAnthropicFrame(frame, writer, state);
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
      const reasoning = stringValue(delta.reasoning_content);
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
      push(
        agentUXEventBuilders.reasoningSummary(meta("reasoning_summary"), {
          reasoningId,
          summary: "Model returned hidden reasoning while composing the response.",
          kind: "summary",
          format: "plain",
        }),
        agentUXEventBuilders.reasoningFinished(meta("reasoning_finished"), {
          reasoningId,
          collapsedByDefault: context.project.reasoning.collapse !== "expanded",
        }),
      );
    },
    finishToolCalls() {
      for (const state of toolCallStates.values()) {
        if (state.completed) {
          continue;
        }
        state.completed = true;
        const parsedArgs = parseJsonObject(state.argsText);
        push(
          agentUXEventBuilders.toolCallAwaitingApproval(meta(`tool_awaiting_${safeEventId(state.toolCallId)}`), {
            toolCallId: state.toolCallId,
            prompt: "Tool call is ready for a harness adapter. Live LLM preview does not execute tools.",
            argsPreview: parsedArgs.ok ? parsedArgs.value : undefined,
          }),
          agentUXEventBuilders.toolCallFinished(meta(`tool_finished_${safeEventId(state.toolCallId)}`), {
            toolCallId: state.toolCallId,
            status: "cancelled",
          }),
        );
      }
    },
    finishRun() {
      push(agentUXEventBuilders.runFinished(meta("run_finished"), {
        assessment: {
          outcome: "success",
          summary: "Live LLM chat preview completed without harness, tools, artifacts, or git operations.",
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
        const reasoningDelta = stringValue(delta.reasoning_content);
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
  const reasoningContent = stringValue(choice?.message?.reasoning_content);
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

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseJsonObject(value: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false };
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError();
  }
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
