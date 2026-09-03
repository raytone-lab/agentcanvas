import { agentUXEventBuilders, type AgentUXEvent } from "@agent-ux/protocol";
import { limitEventText, limitToolResult } from "../../runtime/eventLimits";

/**
 * Pi's SDK, JSON and RPC modes all expose the same session-event vocabulary. Keep this adapter
 * dependency-free so it can run in the browser-facing export without bundling Pi's Node-only SDK.
 */
export type PiWireEvent = Record<string, unknown>;

export type PiApprovalDecision = "yes" | "always" | "no";

export type PiEventAdapterOptions = {
  runId?: string;
  now?: number;
  onEvent?: (event: AgentUXEvent) => void;
  requiresApproval?: (toolName: string, args: unknown) => boolean;
};

export type PiEventAdapter = {
  readonly events: readonly AgentUXEvent[];
  /**
   * Announce the tools this session can actually use, once per conversation.
   *
   * `CapabilityTray` renders `viewModel.capabilities`, and Pi emitted nothing for it, so the
   * panel sat on its "no capabilities attached" empty state for every real run. The tool names
   * come from Pi itself (`session.getActiveToolNames()`), so this reports rather than invents.
   */
  attachCapabilities(toolNames: readonly string[]): AgentUXEvent[];
  startUserMessage(text: string): AgentUXEvent[];
  apply(raw: unknown): AgentUXEvent[];
  resolveApproval(toolCallId: string, decision: PiApprovalDecision): AgentUXEvent[];
  finish(status?: "success" | "cancelled" | "error"): AgentUXEvent[];
};

type BlockState = { id: string; open: boolean; finished: boolean };
type ToolState = {
  id: string;
  name: string;
  args?: unknown;
  argsText: string;
  started: boolean;
  running: boolean;
  awaitingApproval: boolean;
  finished: boolean;
};

export function createPiEventAdapter(options: PiEventAdapterOptions = {}): PiEventAdapter {
  const runId = options.runId ?? `pi_${Date.now().toString(36)}`;
  const now = options.now ?? Date.now();
  const events: AgentUXEvent[] = [];
  const textBlocks = new Map<string, BlockState>();
  const reasoningBlocks = new Map<string, BlockState>();
  const tools = new Map<string, ToolState>();
  const activeSteps = new Set<string>();
  let seq = 0;
  let assistantMessageIndex = 0;
  let activeAssistantMessage = "m1";
  let runStarted = false;
  let runFinished = false;
  let terminalError = false;

  const meta = (suffix: string, messageId?: string) => {
    seq += 1;
    return {
      id: `evt_${safeId(runId)}_${safeId(suffix)}_${seq}`,
      runId,
      seq,
      ts: now + seq,
      ...(messageId ? { messageId } : {}),
    };
  };

  const push = (event: AgentUXEvent, next: AgentUXEvent[]) => {
    events.push(event);
    next.push(event);
    options.onEvent?.(event);
  };

  const ensureRun = (next: AgentUXEvent[]) => {
    if (runStarted) return;
    runStarted = true;
    push(agentUXEventBuilders.runStarted(meta("run_started"), {
      title: "Pi session",
      metadata: { adapter: "pi" },
    }), next);
  };

  /**
   * Content-block index → tool call id, recorded by `toolcall_start` (the only update carrying
   * both).
   *
   * Pi's later `toolcall_delta`/`toolcall_end` updates identify the call by `contentIndex`
   * alone. Resolving that by *position among tools* is wrong, because a content block index
   * counts thinking and text blocks too: a tool at block 1 is the 0th tool, so the lookup
   * missed and each delta minted a phantom `pi_tool_N` named "tool" — an un-designed card that
   * never receives a result and settles as `cancelled`. Recording the real mapping is what
   * `blockKey` already does for text and reasoning.
   */
  const toolCallByBlock = new Map<string, string>();

  /**
   * Streamed tool arguments held until the call's real identity arrives.
   *
   * A real Pi run streams the arguments *before* it says which tool they belong to: the
   * `toolcall_start`/`toolcall_delta` updates carry neither an id nor a tool name, and only
   * `toolcall_end`/`tool_execution_start` reveal `call_…` and `read`. Minting a placeholder id
   * to have something to attach to produced a second card — named "tool", so
   * `resolveToolAction` could not match it, which rendered the un-designed grey row that then
   * settled as `cancelled` because no result ever referenced it.
   *
   * So nothing is emitted until the identity is known, and the buffered text is flushed as one
   * `tool.call.args.delta` at that point. The cost is that argument streaming for such a call
   * appears in one step rather than character by character; the alternative was a card that
   * named the wrong tool and never finished. When Pi *does* send an id up front, the original
   * per-delta streaming is kept.
   */
  const pendingToolArgs = new Map<string, string>();

  const flushPendingToolArgs = (key: string, tool: ToolState, next: AgentUXEvent[]) => {
    const buffered = pendingToolArgs.get(key);
    pendingToolArgs.delete(key);
    if (!buffered || tool.finished) return;
    tool.argsText += buffered;
    tool.args = parseJson(tool.argsText) ?? tool.args;
    push(agentUXEventBuilders.toolCallArgsDelta(meta(`tool_args_${tool.id}`), {
      toolCallId: tool.id,
      delta: buffered,
      format: "json-fragment",
    }), next);
  };

  /**
   * Same flush, from `tool_execution_start` — which is a top-level event and so has no
   * `contentIndex` to key on.
   *
   * Attributed only when exactly one buffer is outstanding, because that is the only case where
   * the owner is unambiguous. With several in flight the buffers are dropped rather than guessed
   * at: `tool_execution_start` carries the real `args`, so the card still shows them; all that
   * is lost is the streaming step, and mis-attributing arguments to the wrong tool would be a
   * worse thing to render than not animating them.
   */
  const adoptPendingToolArgs = (tool: ToolState, next: AgentUXEvent[]) => {
    if (pendingToolArgs.size === 0) return;
    if (pendingToolArgs.size > 1) {
      pendingToolArgs.clear();
      return;
    }
    flushPendingToolArgs([...pendingToolArgs.keys()][0], tool, next);
  };

  const blockKey = (kind: "text" | "reasoning" | "tool", contentIndex: unknown) => {
    const index = typeof contentIndex === "number" || typeof contentIndex === "string" ? String(contentIndex) : "0";
    return `${activeAssistantMessage}_${kind}_${index}`;
  };

  const openText = (contentIndex: unknown, next: AgentUXEvent[]) => {
    ensureRun(next);
    const key = blockKey("text", contentIndex);
    let state = textBlocks.get(key);
    if (!state) {
      state = { id: `${runId}_${key}`, open: false, finished: false };
      textBlocks.set(key, state);
    }
    if (!state.open && !state.finished) {
      state.open = true;
      push(agentUXEventBuilders.textStarted(meta(`text_started_${key}`, activeAssistantMessage), {
        textId: state.id,
        role: "assistant",
        format: "markdown",
      }), next);
    }
    return state;
  };

  const finishText = (contentIndex: unknown, next: AgentUXEvent[]) => {
    const key = blockKey("text", contentIndex);
    const state = textBlocks.get(key);
    if (!state?.open || state.finished) return;
    state.finished = true;
    push(agentUXEventBuilders.textFinished(meta(`text_finished_${key}`, activeAssistantMessage), {
      textId: state.id,
    }), next);
  };

  const openReasoning = (contentIndex: unknown, next: AgentUXEvent[]) => {
    ensureRun(next);
    const key = blockKey("reasoning", contentIndex);
    let state = reasoningBlocks.get(key);
    if (!state) {
      state = { id: `${runId}_${key}`, open: false, finished: false };
      reasoningBlocks.set(key, state);
    }
    if (!state.open && !state.finished) {
      state.open = true;
      push(agentUXEventBuilders.reasoningStatus(meta(`reasoning_status_${key}`, activeAssistantMessage), {
        reasoningId: state.id,
        status: "thinking",
        label: "Thinking",
      }), next);
    }
    return state;
  };

  const finishReasoning = (contentIndex: unknown, next: AgentUXEvent[]) => {
    const key = blockKey("reasoning", contentIndex);
    const state = reasoningBlocks.get(key);
    if (!state?.open || state.finished) return;
    state.finished = true;
    push(agentUXEventBuilders.reasoningFinished(meta(`reasoning_finished_${key}`, activeAssistantMessage), {
      reasoningId: state.id,
    }), next);
  };

  const finishAssistantBlocks = (next: AgentUXEvent[]) => {
    for (const state of textBlocks.values()) {
      if (state.open && !state.finished && state.id.includes(`_${activeAssistantMessage}_`)) {
        state.finished = true;
        push(agentUXEventBuilders.textFinished(meta(`text_finished_${state.id}`, activeAssistantMessage), {
          textId: state.id,
        }), next);
      }
    }
    for (const state of reasoningBlocks.values()) {
      if (state.open && !state.finished && state.id.includes(`_${activeAssistantMessage}_`)) {
        state.finished = true;
        push(agentUXEventBuilders.reasoningFinished(meta(`reasoning_finished_${state.id}`, activeAssistantMessage), {
          reasoningId: state.id,
        }), next);
      }
    }
  };

  const ensureTool = (toolCallId: string, toolName: string, next: AgentUXEvent[]) => {
    ensureRun(next);
    let tool = tools.get(toolCallId);
    if (!tool) {
      tool = {
        id: toolCallId,
        name: toolName || "tool",
        argsText: "",
        started: false,
        running: false,
        awaitingApproval: false,
        finished: false,
      };
      tools.set(toolCallId, tool);
    }
    if (toolName) tool.name = toolName;
    if (!tool.started) {
      tool.started = true;
      push(agentUXEventBuilders.toolCallStarted(meta(`tool_started_${toolCallId}`), {
        toolCallId,
        name: tool.name,
        title: toolTitle(tool.name, tool.args),
        safety: "safe",
      }), next);
    }
    return tool;
  };

  const runTool = (tool: ToolState, next: AgentUXEvent[]) => {
    if (tool.finished || tool.running) return;
    tool.awaitingApproval = false;
    tool.running = true;
    push(agentUXEventBuilders.toolCallRunning(meta(`tool_running_${tool.id}`), {
      toolCallId: tool.id,
      ...(tool.args === undefined ? {} : { args: tool.args }),
    }), next);
  };

  const finishTool = (tool: ToolState, status: string, next: AgentUXEvent[]) => {
    if (tool.finished) return;
    tool.finished = true;
    tool.awaitingApproval = false;
    push(agentUXEventBuilders.toolCallFinished(meta(`tool_finished_${tool.id}`), {
      toolCallId: tool.id,
      status,
    }), next);
  };

  const startStep = (stepId: string, payload: Record<string, unknown>, next: AgentUXEvent[]) => {
    ensureRun(next);
    if (activeSteps.has(stepId)) return;
    activeSteps.add(stepId);
    push(agentUXEventBuilders.stepStarted(meta(`step_started_${stepId}`), { stepId, ...payload }), next);
  };

  const finishStep = (stepId: string, payload: Record<string, unknown>, next: AgentUXEvent[]) => {
    if (!activeSteps.has(stepId)) return;
    activeSteps.delete(stepId);
    push(agentUXEventBuilders.stepFinished(meta(`step_finished_${stepId}`), { stepId, ...payload }), next);
  };

  const emitTerminalError = (message: string, next: AgentUXEvent[], payload: Record<string, unknown> = {}) => {
    if (terminalError) return;
    ensureRun(next);
    terminalError = true;
    runFinished = true;
    finishAssistantBlocks(next);
    push(agentUXEventBuilders.runError(meta("run_error"), {
      code: "pi_run_error",
      message,
      userMessage: message,
      ...payload,
    }), next);
  };

  const settleRun = (status: "success" | "cancelled" | "error", next: AgentUXEvent[]) => {
    if (runFinished) return;
    ensureRun(next);
    finishAssistantBlocks(next);
    for (const tool of tools.values()) {
      if (!tool.finished) finishTool(tool, status === "success" ? "cancelled" : status, next);
    }
    for (const stepId of [...activeSteps]) finishStep(stepId, { status: "cancelled" }, next);
    if (status === "error") {
      emitTerminalError("Pi run failed.", next);
      return;
    }
    runFinished = true;
    push(agentUXEventBuilders.runFinished(meta("run_finished"), { status }), next);
  };

  const apply = (raw: unknown): AgentUXEvent[] => {
    const event = asRecord(raw);
    const type = stringField(event, "type");
    if (!type) return [];
    const next: AgentUXEvent[] = [];

    switch (type) {
      case "agent_start":
        ensureRun(next);
        break;
      case "agent_settled":
        if (!terminalError) settleRun("success", next);
        break;
      case "message_start": {
        const message = asRecord(event.message);
        if (stringField(message, "role") === "assistant") {
          finishAssistantBlocks(next);
          assistantMessageIndex += 1;
          activeAssistantMessage = `m${assistantMessageIndex}`;
        }
        break;
      }
      case "message_update": {
        const update = asRecord(event.assistantMessageEvent);
        const updateType = stringField(update, "type");
        const contentIndex = update.contentIndex;
        const delta = stringField(update, "delta") ?? "";
        if (updateType === "text_start") openText(contentIndex, next);
        else if (updateType === "text_delta") {
          const state = openText(contentIndex, next);
          if (delta) push(agentUXEventBuilders.textDelta(meta(`text_delta_${state.id}`, activeAssistantMessage), {
            textId: state.id,
            delta,
          }), next);
        } else if (updateType === "text_end") finishText(contentIndex, next);
        else if (updateType === "thinking_start") openReasoning(contentIndex, next);
        else if (updateType === "thinking_delta") {
          // Pi calls this `thinking`, and it is not a provider-authored public summary. Keep
          // that classification on the canonical event so the normal `show: "summary"`
          // policy cannot mistake raw thinking for safe UI copy. The reasoning lifecycle still
          // renders for every project; only the explicit "model thinking" preset may reveal
          // this text.
          const state = openReasoning(contentIndex, next);
          if (delta) {
            push(agentUXEventBuilders.reasoningDelta(meta(`reasoning_delta_${state.id}`, activeAssistantMessage), {
              reasoningId: state.id,
              kind: "thinking",
              delta,
            }), next);
          }
        } else if (updateType === "thinking_end") finishReasoning(contentIndex, next);
        else if (updateType === "toolcall_start") {
          const id = stringField(update, "id");
          if (id) {
            toolCallByBlock.set(blockKey("tool", contentIndex), id);
            ensureTool(id, stringField(update, "toolName") ?? "tool", next);
          } else {
            // Identity unknown yet — buffer instead of minting one. See `pendingToolArgs`.
            pendingToolArgs.set(blockKey("tool", contentIndex), "");
          }
        } else if (updateType === "toolcall_delta") {
          const known = stringField(update, "id")
            ?? stringField(update, "toolCallId")
            ?? toolCallByBlock.get(blockKey("tool", contentIndex));
          if (known) {
            const tool = ensureTool(known, stringField(update, "toolName") ?? tools.get(known)?.name ?? "tool", next);
            if (delta && !tool.finished) {
              tool.argsText += delta;
              tool.args = parseJson(tool.argsText) ?? tool.args;
              push(agentUXEventBuilders.toolCallArgsDelta(meta(`tool_args_${known}`), {
                toolCallId: known,
                delta,
                format: "json-fragment",
              }), next);
            }
          } else if (delta) {
            const key = blockKey("tool", contentIndex);
            pendingToolArgs.set(key, (pendingToolArgs.get(key) ?? "") + delta);
          }
        } else if (updateType === "toolcall_end") {
          const call = asRecord(update.toolCall);
          const id = stringField(call, "id")
            ?? toolCallIdFromUpdate(update, contentIndex, toolCallByBlock.get(blockKey("tool", contentIndex)), tools);
          toolCallByBlock.set(blockKey("tool", contentIndex), id);
          const tool = ensureTool(id, stringField(call, "name") ?? stringField(call, "toolName") ?? "tool", next);
          flushPendingToolArgs(blockKey("tool", contentIndex), tool, next);
          tool.args = call.arguments ?? call.args ?? parseJson(tool.argsText) ?? tool.args;
        }
        break;
      }
      case "message_end": {
        const message = asRecord(event.message);
        if (stringField(message, "role") === "assistant") {
          finishAssistantBlocks(next);
          const stopReason = stringField(message, "stopReason");
          const errorMessage = stringField(message, "errorMessage");
          if (stopReason === "error") emitTerminalError(errorMessage ?? "Pi model request failed.", next);
          else if (stopReason === "aborted") settleRun("cancelled", next);
        }
        break;
      }
      case "tool_execution_start": {
        const id = stringField(event, "toolCallId") ?? `pi_tool_${tools.size + 1}`;
        const tool = ensureTool(id, stringField(event, "toolName") ?? "tool", next);
        adoptPendingToolArgs(tool, next);
        tool.args = event.args ?? parseJson(tool.argsText) ?? tool.args;
        if (options.requiresApproval?.(tool.name, tool.args)) {
          tool.awaitingApproval = true;
          // No `prompt`. This used to author "Allow Pi to run bash?" in English, which then sat
          // untranslated inside a Chinese UI — an adapter has no locale, so any prose it writes
          // is prose in one language. The tool name is the fact; the components ask the question
          // from their own dictionary (`chat.approval.promptForTool`).
          push(agentUXEventBuilders.toolCallAwaitingApproval(meta(`tool_awaiting_${id}`), {
            toolCallId: id,
            argsPreview: tool.args,
          }), next);
        } else {
          runTool(tool, next);
        }
        break;
      }
      case "tool_execution_update": {
        const id = stringField(event, "toolCallId") ?? `pi_tool_${tools.size + 1}`;
        const tool = ensureTool(id, stringField(event, "toolName") ?? "tool", next);
        tool.args = event.args ?? tool.args;
        if (!tool.awaitingApproval) runTool(tool, next);
        if (!tool.finished && !tool.awaitingApproval) {
          push(agentUXEventBuilders.toolCallProgress(meta(`tool_progress_${id}`), {
            toolCallId: id,
            progress: event.partialResult,
            message: previewText(event.partialResult),
          }), next);
        }
        break;
      }
      case "tool_execution_end": {
        const id = stringField(event, "toolCallId") ?? `pi_tool_${tools.size + 1}`;
        const tool = ensureTool(id, stringField(event, "toolName") ?? "tool", next);
        if (tool.finished) break;
        const isError = event.isError === true;
        if (isError) {
          push(agentUXEventBuilders.toolCallError(meta(`tool_error_${id}`), {
            toolCallId: id,
            message: previewText(event.result) || `${tool.name} failed`,
            error: event.result,
          }), next);
          finishTool(tool, "error", next);
        } else {
          push(agentUXEventBuilders.toolCallResult(meta(`tool_result_${id}`), {
            toolCallId: id,
            result: limitToolResult(event.result),
            resultPreview: previewText(event.result),
          }), next);
          emitFileArtifact(tool, event.result, next, meta, push);
          finishTool(tool, "success", next);
        }
        break;
      }
      case "auto_retry_start": {
        const attempt = numberField(event, "attempt") ?? 1;
        startStep(`retry_${attempt}`, {
          label: `Retry ${attempt}`,
          stepKind: "model",
          summary: stringField(event, "errorMessage"),
        }, next);
        break;
      }
      case "auto_retry_end": {
        const attempt = numberField(event, "attempt") ?? 1;
        finishStep(`retry_${attempt}`, {
          status: event.success === true ? "success" : "error",
          summary: stringField(event, "finalError"),
        }, next);
        break;
      }
      case "compaction_start":
        startStep("compaction", {
          label: "Compacting context",
          stepKind: "session",
          summary: stringField(event, "reason"),
        }, next);
        break;
      case "compaction_end":
        finishStep("compaction", {
          status: event.aborted === true || stringField(event, "errorMessage") ? "error" : "success",
          summary: stringField(event, "errorMessage") ?? stringField(event, "reason"),
        }, next);
        break;
      case "extension_error":
        emitTerminalError(stringField(event, "message") ?? "Pi extension failed.", next, {
          code: "pi_extension_error",
        });
        break;
      default:
        break;
    }

    return next;
  };

  const resolveApproval = (toolCallId: string, decision: PiApprovalDecision): AgentUXEvent[] => {
    const next: AgentUXEvent[] = [];
    const tool = tools.get(toolCallId);
    if (!tool || tool.finished || !tool.awaitingApproval) return next;
    if (decision === "no") {
      push(agentUXEventBuilders.toolCallError(meta(`tool_denied_${tool.id}`), {
        toolCallId: tool.id,
        code: "approval_denied",
        message: "Tool execution was denied by the user.",
      }), next);
      finishTool(tool, "cancelled", next);
    } else {
      runTool(tool, next);
    }
    return next;
  };

  return {
    events,
    attachCapabilities(toolNames) {
      const next: AgentUXEvent[] = [];
      if (toolNames.length === 0) return next;
      ensureRun(next);
      for (const name of toolNames) {
        push(agentUXEventBuilders.capabilityAttached(meta(`capability_${name}`) as never, {
          capabilityId: `pi_tool_capability_${name}`,
          kind: "tool",
          title: name,
          status: "attached",
          itemCount: 1,
          source: { kind: "pi", name },
        }), next);
      }
      return next;
    },
    startUserMessage(text) {
      const next: AgentUXEvent[] = [];
      const content = text.trim();
      if (!content) return next;
      ensureRun(next);
      const messageId = `${runId}_user`;
      const textId = `${messageId}_text`;
      push(agentUXEventBuilders.textStarted(meta("user_text_started", messageId), {
        textId,
        role: "user",
        format: "plain",
      }), next);
      push(agentUXEventBuilders.textDelta(meta("user_text_delta", messageId), {
        textId,
        delta: content,
      }), next);
      push(agentUXEventBuilders.textFinished(meta("user_text_finished", messageId), {
        textId,
      }), next);
      return next;
    },
    apply,
    resolveApproval,
    finish(status = "success") {
      const next: AgentUXEvent[] = [];
      if (!terminalError) settleRun(status, next);
      return next;
    },
  };
}

function emitFileArtifact(
  tool: ToolState,
  result: unknown,
  next: AgentUXEvent[],
  meta: (suffix: string, messageId?: string) => Record<string, unknown>,
  push: (event: AgentUXEvent, next: AgentUXEvent[]) => void,
) {
  const args = asRecord(tool.args);
  const resultRecord = asRecord(result);
  const details = asRecord(resultRecord.details);
  const path = stringField(args, "path");
  let content: string | undefined;
  let kind = "code";
  if (tool.name === "write" && path) content = stringField(args, "content");
  if (tool.name === "edit" && path) {
    content = stringField(details, "diff") ?? stringField(details, "patch");
    kind = "diff";
  }
  if (!path || !content) return;
  const artifactId = `pi_file_${tool.id}`;
  push(agentUXEventBuilders.artifactCreated(meta(`artifact_created_${artifactId}`) as never, {
    artifactId,
    kind,
    title: path,
    mimeType: "text/plain",
  }), next);
  push(agentUXEventBuilders.artifactDelta(meta(`artifact_delta_${artifactId}`) as never, {
    artifactId,
    delta: limitEventText(content),
    format: "text",
  }), next);
  push(agentUXEventBuilders.artifactFinished(meta(`artifact_finished_${artifactId}`) as never, {
    artifactId,
    status: "success",
    uri: `file://${path}`,
  }), next);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  return typeof record[key] === "string" ? record[key] as string : undefined;
}

function numberField(record: Record<string, unknown>, key: string): number | undefined {
  return typeof record[key] === "number" ? record[key] as number : undefined;
}

function parseJson(value: string): unknown {
  if (!value.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/**
 * `knownForBlock` is the id `toolcall_start` recorded for this content block. It is consulted
 * before any positional guess, because position among tools is not what `contentIndex` means.
 * The last-tool fallback stays for streams that send deltas without ever having opened the
 * call, which is still better than inventing a tool that no vendor asked for.
 */
function toolCallIdFromUpdate(
  update: Record<string, unknown>,
  contentIndex: unknown,
  knownForBlock: string | undefined,
  tools: Map<string, ToolState>,
): string {
  const direct = stringField(update, "id") ?? stringField(update, "toolCallId");
  if (direct) return direct;
  if (knownForBlock) return knownForBlock;
  const byIndex = [...tools.values()].at(-1);
  return byIndex?.id ?? `pi_tool_${tools.size + 1}`;
}

function previewText(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 240);
  const record = asRecord(value);
  const content = Array.isArray(record.content) ? record.content : [];
  const text = content
    .map((item) => stringField(asRecord(item), "text"))
    .filter((item): item is string => Boolean(item))
    .join("\n");
  if (text) return text.slice(0, 240);
  const details = asRecord(record.details);
  return (stringField(details, "diff") ?? stringField(details, "patch") ?? "").slice(0, 240);
}

function toolTitle(name: string, args: unknown): string {
  const path = stringField(asRecord(args), "path");
  return path ? `${name} ${path}` : name;
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_");
}
