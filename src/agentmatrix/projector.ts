/**
 * Session projector.
 *
 * Pure reduction of durable Events (+ active ephemeral deltas) into a stable
 * `SessionViewModel`. This is the one place that correlates tool lifecycles,
 * incidents, runtime operations, and model spans. Canvas components downstream
 * are controlled and never re-correlate.
 *
 * Invariant: replaying the same durable Events in `sequence` order yields the
 * same durable view model regardless of pagination or live-arrival timing.
 */

import {
  eventFamily,
  isDurableEventType,
  isMcpType,
  type AgentMessagePayload,
  type AgentThinkingPayload,
  type AnyDurableEvent,
  type ContentBlock,
  type ContextCompactedPayload,
  type DeltaStreamFrame,
  type ModelRequestEndPayload,
  type ModelRequestStartPayload,
  type RuntimeMessagePayload,
  type RuntimeProgressPayload,
  type RuntimeStatusPayload,
  type SessionErrorPayload,
  type SessionStatusIdlePayload,
  type SessionStatusRescheduledPayload,
  type SessionStatusTerminatedPayload,
  type SessionUpdatedPayload,
  type ToolResultPayload,
  type ToolUsePayload,
  type UserInterruptPayload,
  type UserMessagePayload,
  type UserToolConfirmationPayload,
} from "./protocol";
import {
  emptySessionViewModel,
  type ActivityRowViewModel,
  type ActivityTone,
  type ApprovalViewModel,
  type CompactionViewModel,
  type ConfigAuditViewModel,
  type DiagnosticEntry,
  type IncidentRecovery,
  type IncidentViewModel,
  type MessageViewModel,
  type ModelSpanViewModel,
  type RuntimeNoticeViewModel,
  type RuntimeOperationViewModel,
  type SessionLifecycle,
  type SessionViewModel,
  type ThinkingViewModel,
  type ToolCallViewModel,
  type TranscriptItem,
  type TranscriptTurn,
} from "./viewModel";

export type StreamingState = {
  /** Active deltas not yet superseded by a durable Event, by stable ordinal. */
  deltas: DeltaStreamFrame[];
};

export function textOfBlocks(blocks: ContentBlock[] | undefined): string {
  if (!blocks) return "";
  return blocks
    .map((b) => {
      if (b.type === "text") return b.text;
      if (b.type === "resource_link") return b.name;
      if (b.type === "resource") return b.resource.text ?? b.resource.uri;
      if (b.type === "image") return "[image]";
      if (b.type === "audio") return "[audio]";
      return "";
    })
    .join(" ")
    .trim();
}

// ---------------------------------------------------------------------------

export function projectSession(
  events: readonly AnyDurableEvent[],
  streaming?: StreamingState,
): SessionViewModel {
  const vm = emptySessionViewModel();
  const sorted = [...events].sort((a, b) => a.sequence - b.sequence);

  // Working indexes.
  const turnOrder: string[] = [];
  const turnItems = new Map<string, TranscriptItem[]>();
  const toolById = new Map<string, ToolCallViewModel>();
  const runtimeOps = new Map<string, RuntimeOperationViewModel>();
  const spanByStart = new Map<string, ModelSpanViewModel>();
  const incidentByAnchor = new Map<string, IncidentViewModel>();
  const activity: ActivityRowViewModel[] = [];
  // Maps a tool_use event_id -> tool_call_id (for requires_action correlation).
  const toolUseEventToCall = new Map<string, string>();
  let requiresActionCallIds = new Set<string>();
  let lastAgentUsage: SessionViewModel["lastUsage"];

  function pushItem(turnId: string | undefined, item: TranscriptItem) {
    const key = turnId ?? "__no_turn__";
    if (!turnItems.has(key)) {
      turnItems.set(key, []);
      turnOrder.push(key);
    }
    turnItems.get(key)!.push(item);
  }

  function ensureTool(id: string, seq: number, createdAt: string): ToolCallViewModel {
    let tool = toolById.get(id);
    if (!tool) {
      tool = {
        kind: "tool",
        id,
        sequence: seq,
        source: "native",
        name: id,
        lifecycle: "in_progress",
        content: [],
        locations: [],
        createdAt,
        updatedAt: createdAt,
        awaitingApproval: false,
      };
      toolById.set(id, tool);
    }
    return tool;
  }

  for (const ev of sorted) {
    vm.sessionId = ev.session_id;
    vm.cursor = Math.max(vm.cursor, ev.sequence);
    if (!isDurableEventType(ev.type)) {
      addDiagnostic(vm.diagnostics, ev, true);
      continue;
    }
    addDiagnostic(vm.diagnostics, ev, false);

    switch (ev.type) {
      case "user.message": {
        const p = ev.payload as UserMessagePayload;
        const msg: MessageViewModel = {
          kind: "message",
          id: ev.event_id,
          sequence: ev.sequence,
          author: "user",
          blocks: p.content ?? [],
          streaming: false,
          createdAt: ev.created_at,
        };
        pushItem(ev.turn_id, msg);
        break;
      }
      case "agent.message": {
        const p = ev.payload as AgentMessagePayload;
        const msg: MessageViewModel = {
          kind: "message",
          id: ev.event_id,
          sequence: ev.sequence,
          author: "agent",
          blocks: p.content ?? [],
          streaming: false,
          createdAt: ev.created_at,
          usage: p.usage,
        };
        if (p.usage) lastAgentUsage = p.usage;
        pushItem(ev.turn_id, msg);
        break;
      }
      case "agent.thinking": {
        const p = ev.payload as AgentThinkingPayload;
        const think: ThinkingViewModel = {
          kind: "thinking",
          id: ev.event_id,
          sequence: ev.sequence,
          blocks: p.content ?? [],
          streaming: false,
          createdAt: ev.created_at,
        };
        pushItem(ev.turn_id, think);
        break;
      }
      case "agent.tool_use":
      case "agent.mcp_tool_use": {
        const p = ev.payload as ToolUsePayload;
        const tool = ensureTool(p.tool_call_id, ev.sequence, ev.created_at);
        toolUseEventToCall.set(ev.event_id, p.tool_call_id);
        tool.source = isMcpType(ev.type) ? "mcp" : "native";
        tool.mcpServerName = p.mcp_server_name;
        tool.namespace = p.tool_namespace;
        tool.name = p.name ?? tool.name;
        tool.title = p.title;
        tool.toolKind = p.kind;
        tool.rawInput = p.raw_input;
        tool.useStatus = p.status;
        tool.permission = p.evaluated_permission;
        tool.content = p.content ?? tool.content;
        tool.locations = p.locations ?? tool.locations;
        tool.updatedAt = ev.created_at;
        // Lifecycle: the tool is running until the Session actually asks the user.
        //
        // `pending_approval` is granted in one place only — the `requires_action`
        // pass below, which is also what sets `awaitingApproval`. Deriving it here
        // from `status: "pending"` split the two apart: `agent.tool_use` always
        // lands a frame before the `session.status_idle{requires_action}` that
        // raises the question, so the card showed the "Needs approval" badge with
        // no Allow/Deny buttons under it. Transient in a healthy stream, permanent
        // if the stream stalls here, if a reconnect resumes past the idle event, or
        // if a backend never emits `requires_action` at all.
        tool.lifecycle = "in_progress";
        // Ensure the card is present in its turn.
        if (!isInTurn(turnItems, ev.turn_id, tool)) pushItem(ev.turn_id, tool);
        break;
      }
      case "agent.tool_result":
      case "agent.mcp_tool_result": {
        const p = ev.payload as ToolResultPayload;
        const tool = ensureTool(p.tool_call_id, ev.sequence, ev.created_at);
        // Result may arrive without a preceding use (partial lifecycle).
        if (p.partial_lifecycle) tool.partialLifecycle = true;
        if (p.name) tool.name = p.name;
        if (p.title) tool.title = p.title;
        if (p.tool_namespace) tool.namespace = p.tool_namespace;
        if (p.mcp_server_name) {
          tool.mcpServerName = p.mcp_server_name;
          tool.source = "mcp";
        }
        if (p.kind) tool.toolKind = p.kind;
        tool.resultStatus = p.status;
        tool.rawOutput = p.raw_output;
        tool.latencyMs = p.latency_ms;
        tool.completionInferred = p.completion_inferred;
        if (p.content?.length) tool.content = p.content;
        if (p.locations?.length) tool.locations = p.locations;
        tool.updatedAt = ev.created_at;
        tool.awaitingApproval = false;
        tool.lifecycle =
          p.status === "completed"
            ? p.partial_lifecycle
              ? "partial"
              : "completed"
            : p.status === "failed"
              ? "failed"
              : p.status === "cancelled"
                ? "cancelled"
                : tool.lifecycle;
        if (!isInTurn(turnItems, ev.turn_id, tool)) pushItem(ev.turn_id, tool);
        break;
      }
      case "user.tool_confirmation": {
        const p = ev.payload as UserToolConfirmationPayload;
        const tool = toolById.get(p.tool_call_id);
        if (tool) {
          tool.decision = p.result;
          tool.denyMessage = p.deny_message;
          tool.awaitingApproval = false;
          if (p.result === "deny" || p.result === "cancel") {
            tool.lifecycle = tool.resultStatus ? tool.lifecycle : "cancelled";
          } else if (!tool.resultStatus) {
            tool.lifecycle = "in_progress";
          }
        }
        break;
      }
      case "user.interrupt": {
        const p = ev.payload as UserInterruptPayload;
        // Close any still-pending tool call — a durable result may never come.
        for (const tool of toolById.values()) {
          if (!tool.resultStatus && (tool.lifecycle === "pending_approval" || tool.lifecycle === "in_progress")) {
            tool.lifecycle = "cancelled";
            tool.decision = "cancel";
            tool.awaitingApproval = false;
          }
        }
        requiresActionCallIds = new Set();
        activity.push({
          id: ev.event_id,
          sequence: ev.sequence,
          statement: "User interrupted the running turn",
          eventType: ev.type,
          tone: "warning",
          createdAt: ev.created_at,
          relatedEventIds: ev.cause_event_id ? [ev.cause_event_id] : [],
          detail: p.scope?.type ? `scope: ${p.scope.type}` : undefined,
        });
        break;
      }
      case "session.status_running": {
        vm.lifecycle = "running";
        requiresActionCallIds = new Set();
        resolveRetryingIncidents(incidentByAnchor, ev.sequence);
        activity.push(statusActivity(ev, "Dispatch became active", "info"));
        break;
      }
      case "session.status_idle": {
        const p = ev.payload as SessionStatusIdlePayload;
        vm.stopReason = p.stop_reason;
        if (p.stop_reason.type === "requires_action") {
          vm.lifecycle = "requires_action";
          requiresActionCallIds = new Set(
            p.stop_reason.event_ids
              .map((id) => toolUseEventToCall.get(id))
              .filter((v): v is string => Boolean(v)),
          );
        } else {
          vm.lifecycle = "idle";
          requiresActionCallIds = new Set();
          if (p.stop_reason.type === "retries_exhausted") {
            markIncidentExhausted(incidentByAnchor, p.stop_reason.last_error_event_id, ev.sequence);
          }
        }
        activity.push(statusActivity(ev, idleStatement(p.stop_reason), idleTone(p.stop_reason)));
        break;
      }
      case "session.status_rescheduled": {
        const p = ev.payload as SessionStatusRescheduledPayload;
        vm.lifecycle = "rescheduling";
        foldRescheduleIntoIncident(incidentByAnchor, ev, p);
        activity.push(statusActivity(ev, "Automatic retry scheduled", "warning"));
        break;
      }
      case "session.status_terminated": {
        const p = ev.payload as SessionStatusTerminatedPayload;
        vm.lifecycle = "terminated";
        requiresActionCallIds = new Set();
        markIncidentTerminal(incidentByAnchor, p.last_error_event_id, ev.sequence);
        activity.push(statusActivity(ev, "Session entered a terminal state", "danger"));
        break;
      }
      case "session.deleted": {
        vm.lifecycle = "deleted";
        activity.push(statusActivity(ev, "Session deleted", "danger"));
        break;
      }
      case "session.updated": {
        const p = ev.payload as SessionUpdatedPayload;
        const audit: ConfigAuditViewModel = {
          id: ev.event_id,
          sequence: ev.sequence,
          revision: p.agent_config_revision,
          appliesOn: p.applies_on,
          changedFields: p.changed_fields ?? [],
          changedSummary: p.changed_summary,
          createdAt: ev.created_at,
        };
        vm.configAudits.push(audit);
        activity.push({
          id: ev.event_id,
          sequence: ev.sequence,
          statement: `Configuration updated (rev ${p.agent_config_revision})`,
          eventType: ev.type,
          tone: "info",
          createdAt: ev.created_at,
          relatedEventIds: [],
          detail: (p.changed_fields ?? []).join(", "),
        });
        break;
      }
      case "session.error": {
        const p = ev.payload as SessionErrorPayload;
        const recovery = recoveryOf(p.error.retry_status.type);
        const incident: IncidentViewModel = {
          id: ev.event_id,
          sequence: ev.sequence,
          error: p.error,
          recovery,
          retryStatus: p.error.retry_status,
          deadline:
            p.error.retry_status.type === "retrying" ? p.error.retry_status.deadline : undefined,
          composerLocked: recovery !== "exhausted",
          createdAt: ev.created_at,
          correlatedEventIds: [ev.event_id],
          resolved: false,
        };
        incidentByAnchor.set(ev.event_id, incident);
        activity.push({
          id: ev.event_id,
          sequence: ev.sequence,
          statement: incidentStatement(p.error.type),
          eventType: ev.type,
          tone: recovery === "retrying" ? "warning" : "danger",
          createdAt: ev.created_at,
          relatedEventIds: [ev.event_id],
          detail: p.error.message,
        });
        break;
      }
      case "runtime.status": {
        const p = ev.payload as RuntimeStatusPayload;
        vm.runtimeStatus = {
          state: p.state,
          reason: p.reason,
          dispatchable: p.dispatchable,
          elapsedMs: p.elapsed_ms,
          runtimeDriver: p.runtime_driver,
          error: p.error,
          bootId: p.boot_id,
          sequence: ev.sequence,
        };
        activity.push({
          id: ev.event_id,
          sequence: ev.sequence,
          statement: `Runtime ${p.state} (${p.reason})`,
          eventType: ev.type,
          tone: runtimeTone(p.state),
          createdAt: ev.created_at,
          relatedEventIds: [],
        });
        break;
      }
      case "runtime.progress": {
        const p = ev.payload as RuntimeProgressPayload;
        runtimeOps.set(p.operation_id, {
          operationId: p.operation_id,
          operation: p.operation,
          status: p.status,
          phase: p.phase,
          itemsDone: p.items_done,
          itemsTotal: p.items_total,
          bytesDone: p.bytes_done,
          bytesTotal: p.bytes_total,
          elapsedMs: p.elapsed_ms,
          error: p.error,
          sequence: ev.sequence,
          updatedAt: ev.created_at,
        });
        break;
      }
      case "runtime.message": {
        const p = ev.payload as RuntimeMessagePayload;
        const notice: RuntimeNoticeViewModel = {
          id: ev.event_id,
          sequence: ev.sequence,
          severity: p.severity,
          code: p.code,
          text: textOfBlocks(p.content),
          component: p.component,
          details: p.details,
          createdAt: ev.created_at,
        };
        vm.runtimeNotices.push(notice);
        activity.push({
          id: ev.event_id,
          sequence: ev.sequence,
          statement: notice.text || p.code,
          eventType: ev.type,
          tone: p.severity === "error" ? "danger" : p.severity === "warning" ? "warning" : "info",
          createdAt: ev.created_at,
          relatedEventIds: [],
          detail: p.code,
        });
        break;
      }
      case "agent.context_compacted": {
        const p = ev.payload as ContextCompactedPayload;
        const compaction: CompactionViewModel = {
          id: ev.event_id,
          sequence: ev.sequence,
          preTokens: p.pre_compaction_tokens,
          postTokens: p.post_compaction_tokens,
          createdAt: ev.created_at,
        };
        vm.compactions.push(compaction);
        activity.push({
          id: ev.event_id,
          sequence: ev.sequence,
          statement: "Conversation window compacted",
          eventType: ev.type,
          tone: "neutral",
          createdAt: ev.created_at,
          relatedEventIds: [],
          detail:
            p.pre_compaction_tokens != null && p.post_compaction_tokens != null
              ? `${p.pre_compaction_tokens} -> ${p.post_compaction_tokens} tokens`
              : undefined,
        });
        break;
      }
      case "span.model_request_start": {
        const p = ev.payload as ModelRequestStartPayload;
        spanByStart.set(ev.event_id, {
          startId: ev.event_id,
          model: p.model,
          provider: p.provider,
          speed: p.speed,
          unmatched: true,
          sequence: ev.sequence,
        });
        break;
      }
      case "span.model_request_end": {
        const p = ev.payload as ModelRequestEndPayload;
        const span = spanByStart.get(p.model_request_start_id);
        if (span) {
          span.isError = p.is_error;
          span.usage = p.model_usage;
          span.usageGranularity = p.usage_granularity;
          span.usageSource = p.usage_source;
          span.latencyMs = p.latency_ms;
          span.unmatched = false;
        } else {
          spanByStart.set(`unmatched:${ev.event_id}`, {
            startId: p.model_request_start_id,
            isError: p.is_error,
            usage: p.model_usage,
            usageGranularity: p.usage_granularity,
            usageSource: p.usage_source,
            latencyMs: p.latency_ms,
            unmatched: true,
            sequence: ev.sequence,
          });
        }
        break;
      }
      default:
        break;
    }
  }

  // Apply requires_action flags to the correlated tool cards.
  for (const callId of requiresActionCallIds) {
    const tool = toolById.get(callId);
    if (tool && !tool.resultStatus && tool.decision == null) {
      tool.awaitingApproval = true;
      tool.lifecycle = "pending_approval";
    }
  }

  // Merge active streaming deltas as temporary transcript items.
  if (streaming && streaming.deltas.length) {
    mergeStreamingDeltas(streaming.deltas, sorted, turnOrder, turnItems, pushItem);
  }

  // Assemble transcript turns in first-seen order.
  vm.transcript = turnOrder
    .filter((k) => k !== "__no_turn__" || (turnItems.get(k)?.length ?? 0) > 0)
    .map<TranscriptTurn>((turnId) => ({
      turnId: turnId === "__no_turn__" ? "" : turnId,
      items: (turnItems.get(turnId) ?? []).sort((a, b) => a.sequence - b.sequence),
    }))
    .filter((t) => t.items.length > 0);

  // Approvals: derive from tool cards awaiting approval.
  vm.approvals = [...toolById.values()]
    .filter((t) => t.awaitingApproval)
    .map<ApprovalViewModel>((t) => ({
      toolCallId: t.id,
      toolTitle: t.title ?? t.name,
      toolName: t.name,
      source: t.source,
      mcpServerName: t.mcpServerName,
      target: t.locations[0]?.path,
      riskReason: t.permission?.reason,
      allowAlwaysEligible: t.permission?.policy === "always_ask" && t.source === "native",
      sequence: t.sequence,
    }));

  vm.runtimeOperations = [...runtimeOps.values()].sort((a, b) => a.sequence - b.sequence);
  vm.modelSpans = [...spanByStart.values()].sort((a, b) => a.sequence - b.sequence);
  vm.incidents = [...incidentByAnchor.values()].sort((a, b) => a.sequence - b.sequence);
  vm.blockingIncident = [...vm.incidents].reverse().find((i) => !i.resolved);
  vm.activity = activity.sort((a, b) => b.sequence - a.sequence); // reverse chronological
  vm.readOnly = vm.lifecycle === "terminated" || vm.lifecycle === "deleted";
  vm.lastUsage = lastAgentUsage;

  return vm;
}

// ---------------------------------------------------------------------------
// Streaming merge
// ---------------------------------------------------------------------------

function mergeStreamingDeltas(
  deltas: DeltaStreamFrame[],
  durable: readonly AnyDurableEvent[],
  turnOrder: string[],
  turnItems: Map<string, TranscriptItem[]>,
  pushItem: (turnId: string | undefined, item: TranscriptItem) => void,
): void {
  const byOrdinal = new Map<string, DeltaStreamFrame[]>();
  for (const d of deltas) {
    if (!byOrdinal.has(d.target_stable_ordinal)) byOrdinal.set(d.target_stable_ordinal, []);
    byOrdinal.get(d.target_stable_ordinal)!.push(d);
  }
  const maxSeq = durable.reduce((m, e) => Math.max(m, e.sequence), 0);
  let temp = 0;
  for (const [ordinal, group] of byOrdinal) {
    const ordered = [...group].sort((a, b) => a.delta_index - b.delta_index);
    const isThinking = ordered[0]?.type === "agent.thinking_delta";
    const text = ordered
      .map((d) => (d.payload.delta.type === "text_delta" ? d.payload.delta.text : d.payload.delta.thinking))
      .join("");
    const turnId = ordered[0]?.turn_id;
    const seq = maxSeq + 1 + temp++;
    const blocks: ContentBlock[] = [{ type: "text", text }];
    if (isThinking) {
      pushItem(turnId, {
        kind: "thinking",
        id: `stream:${ordinal}`,
        sequence: seq,
        blocks,
        streaming: true,
        createdAt: ordered[0]?.emitted_at ?? "",
      });
    } else {
      pushItem(turnId, {
        kind: "message",
        id: `stream:${ordinal}`,
        sequence: seq,
        author: "agent",
        blocks,
        streaming: true,
        createdAt: ordered[0]?.emitted_at ?? "",
      });
    }
  }
  void turnOrder;
}

// ---------------------------------------------------------------------------
// Small mapping helpers
// ---------------------------------------------------------------------------

function isInTurn(
  turnItems: Map<string, TranscriptItem[]>,
  turnId: string | undefined,
  item: TranscriptItem,
): boolean {
  const key = turnId ?? "__no_turn__";
  return (turnItems.get(key) ?? []).some((i) => i === item);
}

function recoveryOf(type: "retrying" | "exhausted" | "terminal"): IncidentRecovery {
  return type;
}

function resolveRetryingIncidents(
  incidents: Map<string, IncidentViewModel>,
  atSequence: number,
): void {
  for (const inc of incidents.values()) {
    if (inc.recovery === "retrying" && !inc.resolved && atSequence > inc.sequence) {
      inc.resolved = true;
      inc.composerLocked = false;
    }
  }
}

function markIncidentExhausted(
  incidents: Map<string, IncidentViewModel>,
  anchorId: string | undefined,
  seq: number,
): void {
  const inc = anchorId ? incidents.get(anchorId) : lastIncident(incidents);
  if (inc) {
    inc.recovery = "exhausted";
    inc.composerLocked = false;
    inc.correlatedEventIds.push(`idle@${seq}`);
  }
}

function markIncidentTerminal(
  incidents: Map<string, IncidentViewModel>,
  anchorId: string | undefined,
  seq: number,
): void {
  const inc = anchorId ? incidents.get(anchorId) : lastIncident(incidents);
  if (inc) {
    inc.recovery = "terminal";
    inc.composerLocked = true;
    inc.correlatedEventIds.push(`terminated@${seq}`);
  }
}

function foldRescheduleIntoIncident(
  incidents: Map<string, IncidentViewModel>,
  ev: AnyDurableEvent,
  p: SessionStatusRescheduledPayload,
): void {
  // Prefer explicit cause correlation; otherwise the most recent open incident.
  const anchor = ev.cause_event_id ? incidents.get(ev.cause_event_id) : undefined;
  const inc = anchor ?? lastIncident(incidents);
  if (inc && !inc.resolved) {
    inc.correlatedEventIds.push(ev.event_id);
    if (p.retry_status.type === "retrying") inc.deadline = p.retry_status.deadline;
  }
}

function lastIncident(incidents: Map<string, IncidentViewModel>): IncidentViewModel | undefined {
  let latest: IncidentViewModel | undefined;
  for (const inc of incidents.values()) {
    if (!latest || inc.sequence > latest.sequence) latest = inc;
  }
  return latest;
}

function statusActivity(
  ev: AnyDurableEvent,
  statement: string,
  tone: ActivityTone,
): ActivityRowViewModel {
  return {
    id: ev.event_id,
    sequence: ev.sequence,
    statement,
    eventType: ev.type,
    tone,
    createdAt: ev.created_at,
    relatedEventIds: ev.cause_event_id ? [ev.cause_event_id] : [],
  };
}

function idleStatement(reason: SessionStatusIdlePayload["stop_reason"]): string {
  switch (reason.type) {
    case "end_turn":
      return "Turn completed";
    case "requires_action":
      return "Waiting for your action";
    case "retries_exhausted":
      return "Retries exhausted";
    default:
      return "Session idle";
  }
}

function idleTone(reason: SessionStatusIdlePayload["stop_reason"]): ActivityTone {
  if (reason.type === "requires_action") return "warning";
  if (reason.type === "retries_exhausted") return "danger";
  return "success";
}

function runtimeTone(state: string): ActivityTone {
  if (state === "ready") return "success";
  if (state === "error") return "danger";
  if (state === "degraded" || state === "recovering") return "warning";
  return "info";
}

function incidentStatement(type: string): string {
  return `Session error: ${type.replace(/_/g, " ")}`;
}

function addDiagnostic(list: DiagnosticEntry[], ev: AnyDurableEvent, unknown: boolean): void {
  list.push({
    eventId: ev.event_id,
    sequence: ev.sequence,
    type: ev.type,
    turnId: ev.turn_id,
    parentEventId: ev.parent_event_id,
    causeEventId: ev.cause_event_id,
    createdAt: ev.created_at,
    emittedAt: ev.emitted_at,
    summary: diagnosticSummary(ev),
    raw: ev,
    unknown,
  });
}

function diagnosticSummary(ev: AnyDurableEvent): string {
  const fam = eventFamily(ev.type);
  return `${fam} · seq ${ev.sequence}`;
}
