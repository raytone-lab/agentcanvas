import { agentUXEventBuilders, type AgentUXEvent } from "@agent-ux/protocol";

/**
 * Local terminal events for a turn cancelled by the user.
 *
 * Stopping the client aborts the fetch, so the server's own wrap-up events
 * (open text/tool blocks finished + run.finished(cancelled), see piHost's
 * abort → adapter.finish("cancelled")) land on the closed connection and are
 * lost. Without a client-side counterpart the conversation would keep its
 * last turn open forever — a half-typed message with no finish, a tool card
 * stuck on "running" or "awaiting approval", no run terminal.
 *
 * Scans the latest run in the accumulated transcript and closes whatever is
 * still open, mirroring the adapter's settleRun semantics. Returns [] when
 * there is nothing to close (no run in progress, or the run already ended).
 */
export function piCancelledTurnEvents(events: readonly AgentUXEvent[]): AgentUXEvent[] {
  let lastRunStart = -1;
  for (let index = 0; index < events.length; index += 1) {
    if (events[index].type === "run.started") lastRunStart = index;
  }
  if (lastRunStart < 0) return [];

  const runId = events[lastRunStart].runId;
  const turnEvents = events.slice(lastRunStart);
  if (turnEvents.some((event) => event.type === "run.finished" || event.type === "run.error")) {
    return [];
  }

  const openTexts = new Map<string, string | undefined>(); // textId -> messageId
  const openReasonings = new Map<string, string | undefined>();
  const openTools = new Map<string, string | undefined>();
  for (const event of turnEvents) {
    switch (event.type) {
      case "text.started": {
        const textId = stringField(event.payload, "textId");
        if (textId) openTexts.set(textId, event.messageId);
        break;
      }
      case "text.finished":
        openTexts.delete(stringField(event.payload, "textId") ?? "");
        break;
      case "reasoning.status":
      case "reasoning.delta":
      case "reasoning.summary": {
        const reasoningId = stringField(event.payload, "reasoningId");
        if (reasoningId) openReasonings.set(reasoningId, event.messageId);
        break;
      }
      case "reasoning.finished":
        openReasonings.delete(stringField(event.payload, "reasoningId") ?? "");
        break;
      case "tool.call.started":
      case "tool.call.running":
      case "tool.call.awaiting_approval":
      case "tool.call.progress":
      case "tool.call.result": {
        const toolCallId = stringField(event.payload, "toolCallId");
        if (toolCallId) openTools.set(toolCallId, event.messageId);
        break;
      }
      case "tool.call.finished":
        openTools.delete(stringField(event.payload, "toolCallId") ?? "");
        break;
      default:
        break;
    }
  }

  if (openTexts.size === 0 && openReasonings.size === 0 && openTools.size === 0) {
    // Nothing was left open — the run ended between the last committed frame and
    // the abort. Nothing to close.
    return [];
  }

  let seq = maxSeq(turnEvents);
  const now = Date.now();
  const meta = (suffix: string, messageId?: string) => ({
    id: `pi_cancel_${suffix}`,
    runId: runId ?? "pi",
    ...(messageId ? { messageId } : {}),
    seq: ++seq,
    ts: now + seq,
  });

  const next: AgentUXEvent[] = [];
  for (const [textId, messageId] of openTexts) {
    next.push(agentUXEventBuilders.textFinished(meta(`text_finished_${textId}`, messageId), { textId }));
  }
  for (const [reasoningId, messageId] of openReasonings) {
    next.push(agentUXEventBuilders.reasoningFinished(meta(`reasoning_finished_${reasoningId}`, messageId), { reasoningId }));
  }
  for (const [toolCallId, messageId] of openTools) {
    next.push(agentUXEventBuilders.toolCallFinished(meta(`tool_finished_${toolCallId}`, messageId), {
      toolCallId,
      status: "cancelled",
    }));
  }
  next.push(agentUXEventBuilders.runFinished(meta("run_finished"), { status: "cancelled" }));
  return next;
}

function maxSeq(events: readonly AgentUXEvent[]): number {
  let max = 0;
  for (const event of events) {
    if (typeof event.seq === "number" && event.seq > max) max = event.seq;
  }
  return max;
}

function stringField(payload: unknown, key: string): string | undefined {
  const value = (payload as Record<string, unknown> | undefined)?.[key];
  return typeof value === "string" ? value : undefined;
}
