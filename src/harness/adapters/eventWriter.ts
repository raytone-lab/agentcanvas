// Imported straight from the protocol package, as `LiveLlmPreviewRunner` and `PreviewRunner`
// do: the `src/agentux` barrel re-exports `agentUXClientEventBuilders` but not the plain
// builders, and an adapter emits server-side events rather than client ones.
import { agentUXEventBuilders, type AgentUXEvent } from "@agent-ux/protocol";

/**
 * Shared event writer for vendor adapters.
 *
 * Every adapter has to solve the same mechanical problem: our protocol is *paired* — a text
 * block is `text.started` / N × `text.delta` / `text.finished`, reasoning likewise, a tool
 * call is `started` / `args.delta` / `running` / `result` / `finished` keyed by one id — while
 * vendor streams are flat sequences of deltas that may stop at any point. Getting that
 * pairing wrong is invisible: a missing `text.finished` leaves the bubble streaming forever,
 * a missing `tool.call.finished` leaves the card spinning, and the contract report is what
 * eventually notices.
 *
 * So the pairing lives here once. An adapter only decides *what* a vendor line means; this
 * writer guarantees the emitted stream is well-formed:
 *
 * - blocks open lazily on their first delta, so an empty block emits nothing at all
 * - `finish*` is idempotent and a no-op for a block that never opened
 * - `finishAll()` closes whatever is still open, for streams that end abruptly
 * - a tool id is tracked so a late `result` cannot resurrect a finished call
 *
 * It deliberately carries no vendor and no product copy. `createLiveLlmEventWriter` in
 * `preview-runner/LiveLlmPreviewRunner.ts` is *not* built on this: its payloads embed
 * preview-only wording ("Live LLM preview does not execute tools") and an
 * awaiting-approval-then-cancelled pattern that only makes sense when nothing executes tools.
 * Folding that in would leak preview semantics into real adapters.
 */

export type ArtifactInput = {
  artifactId: string;
  title: string;
  /** Our artifact kinds: "preview" | "markdown" | "data" | "diff" | "code" | "custom". */
  kind: string;
  mimeType?: string;
  content: string;
  format?: "text" | "json";
  uri?: string;
};

export type ToolStartInput = {
  name: string;
  title?: string;
  /** Whether the backend says this call needs a human decision before it runs. */
  safety?: "safe" | "needs_approval";
};

export type AgentUXEventWriter = {
  /** Events emitted so far, in order. */
  readonly events: readonly AgentUXEvent[];
  runStarted(payload?: Record<string, unknown>): void;
  runFinished(payload?: Record<string, unknown>): void;
  runError(payload: Record<string, unknown>): void;

  textDelta(text: string): void;
  finishText(): void;

  reasoningDelta(text: string, status?: string): void;
  finishReasoning(): void;

  toolStarted(toolCallId: string, input: ToolStartInput): void;
  toolArgsDelta(toolCallId: string, fragment: string): void;
  toolRunning(toolCallId: string, args?: unknown): void;
  toolAwaitingApproval(toolCallId: string, payload?: Record<string, unknown>): void;
  toolResult(toolCallId: string, payload: { result?: unknown; resultPreview?: string }): void;
  /**
   * A string is treated as `message`; an object is forwarded as-is so a caller with a real
   * diagnosis (code, retryability, split user/developer copy) can render the full error card
   * instead of collapsing it to one line.
   */
  toolError(toolCallId: string, error: string | Record<string, unknown>): void;
  toolFinished(toolCallId: string, status: string): void;

  artifact(input: ArtifactInput): void;

  /** Close every block still open. Call when the vendor stream ends, however it ended. */
  finishAll(): void;
};

type ToolState = {
  started: boolean;
  finished: boolean;
};

export function createEventWriter(options: {
  runId: string;
  /** Base timestamp; each event gets `ts = now + seq` so ordering is stable and monotonic. */
  now?: number;
  /** Called with the full list after every emit, for incremental rendering. */
  onEvents?: (events: readonly AgentUXEvent[]) => void;
}): AgentUXEventWriter {
  const { runId } = options;
  const now = options.now ?? 0;
  const events: AgentUXEvent[] = [];

  let seq = 0;
  const textId = `${runId}_text`;
  const reasoningId = `${runId}_reasoning`;

  let textOpen = false;
  let textClosed = false;
  let reasoningOpen = false;
  let reasoningClosed = false;
  const tools = new Map<string, ToolState>();

  const meta = (id: string, extra: Record<string, unknown> = {}) => {
    seq += 1;
    return { id: `evt_${runId}_${id}_${seq}`, runId, seq, ts: now + seq, ...extra };
  };

  const push = (...next: AgentUXEvent[]) => {
    events.push(...next);
    options.onEvents?.([...events]);
  };

  /** A tool id we never saw start, or already finished, must not emit more events. */
  const liveTool = (toolCallId: string): ToolState | undefined => {
    const state = tools.get(toolCallId);
    if (!state || state.finished) return undefined;
    return state;
  };

  return {
    events,

    runStarted(payload = {}) {
      push(agentUXEventBuilders.runStarted(meta("run_started"), payload));
    },
    runFinished(payload = {}) {
      push(agentUXEventBuilders.runFinished(meta("run_finished"), payload));
    },
    runError(payload) {
      push(agentUXEventBuilders.runError(meta("run_error"), payload));
    },

    textDelta(text) {
      // An empty delta would render an empty bubble and trip the contract report, so a block
      // that has nothing to say never opens.
      if (!text) return;
      if (textClosed) return;
      if (!textOpen) {
        textOpen = true;
        push(agentUXEventBuilders.textStarted(meta("text_started"), {
          textId,
          role: "assistant",
          format: "markdown",
        }));
      }
      push(agentUXEventBuilders.textDelta(meta("text_delta"), { textId, delta: text }));
    },
    finishText() {
      if (!textOpen || textClosed) return;
      textClosed = true;
      push(agentUXEventBuilders.textFinished(meta("text_finished"), { textId }));
    },

    reasoningDelta(text, status = "thinking") {
      if (!text) return;
      if (reasoningClosed) return;
      if (!reasoningOpen) {
        reasoningOpen = true;
        push(agentUXEventBuilders.reasoningStatus(meta("reasoning_status"), {
          reasoningId,
          status,
          label: "Thinking",
        }));
      }
      // Harness reasoning is the provider's own thinking, not a public summary. Marking the
      // distinction at the canonical boundary lets the default `show: "summary"` policy keep
      // it out of ordinary UI while the explicit "model thinking" preset can still opt in.
      push(agentUXEventBuilders.reasoningDelta(meta("reasoning_delta"), {
        reasoningId,
        kind: "thinking",
        delta: text,
      }));
    },
    finishReasoning() {
      if (!reasoningOpen || reasoningClosed) return;
      reasoningClosed = true;
      push(agentUXEventBuilders.reasoningFinished(meta("reasoning_finished"), { reasoningId }));
    },

    toolStarted(toolCallId, input) {
      if (tools.has(toolCallId)) return;
      tools.set(toolCallId, { started: true, finished: false });
      push(agentUXEventBuilders.toolCallStarted(meta(`tool_started_${toolCallId}`), {
        toolCallId,
        name: input.name,
        title: input.title ?? input.name,
        safety: input.safety ?? "safe",
      }));
    },
    toolArgsDelta(toolCallId, fragment) {
      if (!fragment || !liveTool(toolCallId)) return;
      push(agentUXEventBuilders.toolCallArgsDelta(meta(`tool_args_${toolCallId}`), {
        toolCallId,
        delta: fragment,
        format: "json-fragment",
      }));
    },
    toolRunning(toolCallId, args) {
      if (!liveTool(toolCallId)) return;
      push(agentUXEventBuilders.toolCallRunning(meta(`tool_running_${toolCallId}`), {
        toolCallId,
        ...(args === undefined ? {} : { args }),
      }));
    },
    toolAwaitingApproval(toolCallId, payload = {}) {
      if (!liveTool(toolCallId)) return;
      push(agentUXEventBuilders.toolCallAwaitingApproval(meta(`tool_awaiting_${toolCallId}`), {
        toolCallId,
        ...payload,
      }));
    },
    toolResult(toolCallId, payload) {
      if (!liveTool(toolCallId)) return;
      push(agentUXEventBuilders.toolCallResult(meta(`tool_result_${toolCallId}`), {
        toolCallId,
        ...(payload.result === undefined ? {} : { result: payload.result }),
        ...(payload.resultPreview === undefined ? {} : { resultPreview: payload.resultPreview }),
      }));
    },
    toolError(toolCallId, error) {
      if (!liveTool(toolCallId)) return;
      const payload = typeof error === "string" ? { message: error } : error;
      push(agentUXEventBuilders.toolCallError(meta(`tool_error_${toolCallId}`), { toolCallId, ...payload }));
    },
    toolFinished(toolCallId, status) {
      const state = liveTool(toolCallId);
      if (!state) return;
      state.finished = true;
      push(agentUXEventBuilders.toolCallFinished(meta(`tool_finished_${toolCallId}`), { toolCallId, status }));
    },

    artifact(input) {
      const { artifactId } = input;
      push(
        agentUXEventBuilders.artifactCreated(meta(`artifact_created_${artifactId}`), {
          artifactId,
          kind: input.kind,
          title: input.title,
          ...(input.mimeType ? { mimeType: input.mimeType } : {}),
        }),
        agentUXEventBuilders.artifactDelta(meta(`artifact_delta_${artifactId}`), {
          artifactId,
          delta: input.content,
          format: input.format ?? "text",
        }),
        agentUXEventBuilders.artifactFinished(meta(`artifact_finished_${artifactId}`), {
          artifactId,
          status: "success",
          uri: input.uri ?? `memory://${artifactId}`,
        }),
      );
    },

    finishAll() {
      this.finishText();
      this.finishReasoning();
      // A stream that dies mid-tool leaves the card spinning otherwise.
      for (const [toolCallId, state] of tools) {
        if (!state.finished) this.toolFinished(toolCallId, "cancelled");
      }
    },
  };
}
