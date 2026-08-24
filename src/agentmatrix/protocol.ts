/**
 * AgentMatrix public Session Event protocol.
 *
 * A faithful TypeScript projection of the AgentMatrix Event Design Reference
 * (snapshot 2026-08-03): 22 durable Event kinds, 2 ephemeral delta kinds, the
 * durable Event envelope, the live StreamFrame envelope, and the shared content
 * / tool / permission / error / retry / usage structures.
 *
 * These types are the single source of truth that replaces the legacy
 * `@agent-ux/*` protocol. They describe the *wire* shape a real backend emits,
 * so the same definitions drive both the mock SSE simulator and a live client.
 *
 * Reference authority: when this file conflicts with the pinned OpenAPI/Proto
 * contracts, the contracts win. Unknown nested labels are intentionally kept
 * open (`(string & {})`) because several enums are extensible.
 */

// ---------------------------------------------------------------------------
// Event kind taxonomy
// ---------------------------------------------------------------------------

export type UserEventType =
  | "user.message"
  | "user.interrupt"
  | "user.tool_confirmation";

export type AgentEventType =
  | "agent.message"
  | "agent.thinking"
  | "agent.tool_use"
  | "agent.tool_result"
  | "agent.mcp_tool_use"
  | "agent.mcp_tool_result"
  | "agent.context_compacted";

export type SessionEventType =
  | "session.status_running"
  | "session.status_idle"
  | "session.status_rescheduled"
  | "session.status_terminated"
  | "session.deleted"
  | "session.updated"
  | "session.error";

export type RuntimeEventType =
  | "runtime.status"
  | "runtime.progress"
  | "runtime.message";

export type SpanEventType = "span.model_request_start" | "span.model_request_end";

export type DeltaEventType = "agent.message_delta" | "agent.thinking_delta";

/** All 22 shipped durable Event kinds. */
export type DurableEventType =
  | UserEventType
  | AgentEventType
  | SessionEventType
  | RuntimeEventType
  | SpanEventType;

/** All shipped Event kinds, durable + ephemeral. */
export type EventType = DurableEventType | DeltaEventType;

export const DURABLE_EVENT_TYPES: readonly DurableEventType[] = [
  "user.message",
  "user.interrupt",
  "user.tool_confirmation",
  "agent.message",
  "agent.thinking",
  "agent.tool_use",
  "agent.tool_result",
  "agent.mcp_tool_use",
  "agent.mcp_tool_result",
  "agent.context_compacted",
  "session.status_running",
  "session.status_idle",
  "session.status_rescheduled",
  "session.status_terminated",
  "session.deleted",
  "session.updated",
  "session.error",
  "runtime.status",
  "runtime.progress",
  "runtime.message",
  "span.model_request_start",
  "span.model_request_end",
];

export const DELTA_EVENT_TYPES: readonly DeltaEventType[] = [
  "agent.message_delta",
  "agent.thinking_delta",
];

/** Event families used for surface routing and diagnostics grouping. */
export type EventFamily =
  | "user"
  | "agent"
  | "session"
  | "runtime"
  | "span"
  | "delta";

export function eventFamily(type: string): EventFamily {
  if (type.startsWith("user.")) return "user";
  if (type === "agent.message_delta" || type === "agent.thinking_delta") return "delta";
  if (type.startsWith("agent.")) return "agent";
  if (type.startsWith("session.")) return "session";
  if (type.startsWith("runtime.")) return "runtime";
  if (type.startsWith("span.")) return "span";
  return "agent";
}

// ---------------------------------------------------------------------------
// Durable Event envelope
// ---------------------------------------------------------------------------

export type DurableEvent<T extends string = DurableEventType, P = Record<string, unknown>> = {
  /** Stable durable identity — for diagnostics and causal references, not order. */
  event_id: string;
  /** Owning Session. State must be cleared when this changes. */
  session_id: string;
  /** Session-local monotonic cursor and durable ordering key. */
  sequence: number;
  /** Selects the typed payload schema. */
  type: T;
  /** `1` in the current contract. */
  payload_version: number;
  /** Historical DAG predecessor — not display order. */
  parent_event_id?: string;
  /** Business-causal upstream Event (e.g. confirmation -> tool use). */
  cause_event_id?: string;
  /** Groups facts belonging to one user-to-terminal turn. */
  turn_id?: string;
  /** Type-specific public JSON object. */
  payload: P;
  /** Canonical Event creation time (ISO 8601). */
  created_at: string;
  /** User Event acknowledgement time; may be null. */
  processed_at?: string | null;
  /** Time the Event became externally observable. */
  emitted_at: string;
  /** Public metadata; treat unknown entries as diagnostic, never instructions. */
  metadata: Record<string, unknown>;
};

/** A durable Event whose concrete payload type is not yet narrowed. */
export type AnyDurableEvent = DurableEvent<DurableEventType, Record<string, unknown>>;

// ---------------------------------------------------------------------------
// Live StreamFrame envelope
// ---------------------------------------------------------------------------

export type EventStreamFrame = {
  frame_type: "event";
  event: AnyDurableEvent;
  /** Stable ordinal linking a durable Event to the deltas that previewed it. */
  stable_ordinal?: string;
};

export type DeltaStreamFrame = {
  frame_type: "delta";
  session_id: string;
  turn_id?: string;
  /** Links this delta to the future durable Event's stable ordinal. */
  target_stable_ordinal: string;
  /** Increasing per-ordinal index for ordering and deduplication. */
  delta_index: number;
  type: DeltaEventType;
  payload_version: number;
  payload: MessageDeltaPayload | ThinkingDeltaPayload;
  emitted_at: string;
  metadata: Record<string, unknown>;
};

export type StreamFrame = EventStreamFrame | DeltaStreamFrame;

// ---------------------------------------------------------------------------
// Content blocks
// ---------------------------------------------------------------------------

export type TextContentBlock = { type: "text"; text: string };

export type ImageContentBlock = {
  type: "image";
  data?: string; // base64
  mime_type: string;
  uri?: string;
};

export type AudioContentBlock = {
  type: "audio";
  data?: string; // base64
  mime_type: string;
  uri?: string;
};

export type ResourceLinkContentBlock = {
  type: "resource_link";
  uri: string;
  name: string;
  mime_type?: string;
  title?: string;
  description?: string;
  size?: number;
};

export type EmbeddedResourceContentBlock = {
  type: "resource";
  resource: {
    uri: string;
    mime_type?: string;
    text?: string;
    blob?: string; // base64
  };
};

export type ContentBlock =
  | TextContentBlock
  | ImageContentBlock
  | AudioContentBlock
  | ResourceLinkContentBlock
  | EmbeddedResourceContentBlock;

// ---------------------------------------------------------------------------
// Tool call display content
// ---------------------------------------------------------------------------

export type ToolContentBlock = { type: "content"; content: ContentBlock };

export type ToolDiffBlock = {
  type: "diff";
  path: string;
  old_text?: string;
  new_text?: string;
};

export type ToolTerminalBlock = { type: "terminal"; terminal_id: string };

export type ToolCallContent = ToolContentBlock | ToolDiffBlock | ToolTerminalBlock;

export type ToolLocation = { path: string; uri?: string; line?: number };

// ---------------------------------------------------------------------------
// Permission
// ---------------------------------------------------------------------------

export type PermissionPolicy =
  | "always_allow"
  | "always_ask"
  | "auto_approve_reads"
  | (string & {});

export type PermissionDecision =
  | "pending"
  | "allow"
  | "deny"
  | "cancelled"
  | (string & {});

export type EvaluatedPermission = {
  policy: PermissionPolicy;
  decision: PermissionDecision;
  reason?: string;
  decision_source?: string; // user | policy | auto_read_class | runtime_mode | timeout | interrupt | ...
};

export type ToolUseStatus = "pending" | "in_progress" | (string & {});
export type ToolResultStatus = "completed" | "failed" | "cancelled" | (string & {});

export type ToolConfirmationResult =
  | "allow_once"
  | "allow_always"
  | "deny"
  | "cancel";

// ---------------------------------------------------------------------------
// Session lifecycle: stop reason, retry status, errors
// ---------------------------------------------------------------------------

export type StopReason =
  | { type: "end_turn" }
  | { type: "requires_action"; event_ids: string[] }
  | { type: "retries_exhausted"; last_error_event_id?: string };

export type RetryStatus =
  | { type: "retrying"; deadline: string; estimated_resolution?: string }
  | { type: "exhausted" }
  | { type: "terminal" };

export type SessionErrorType =
  | "unknown_error"
  | "model_overloaded_error"
  | "model_rate_limited_error"
  | "model_request_failed_error"
  | "mcp_connection_failed_error"
  | "mcp_authentication_failed_error"
  | "billing_error"
  | "budget_exceeded_error"
  | "resource_quota_exceeded_error"
  | "sandbox_failed_error"
  | "dispatch_execution_timeout"
  | "runtime_resume_unrecoverable_error"
  | (string & {});

export type BudgetMetric =
  | "input_tokens"
  | "output_tokens"
  | "total_tokens"
  | "cost_usd"
  | "wall_time_ms"
  | "model_calls"
  | "tool_calls"
  | (string & {});

export type RecoveryAction = {
  kind: string; // e.g. "user_action"
  url?: string;
  label?: string;
};

export type SessionError = {
  type: SessionErrorType;
  message: string;
  retry_status: RetryStatus;
  // union-specific optional facts
  raw_type?: string;
  raw_payload?: unknown;
  mcp_server_name?: string;
  recovery_action?: RecoveryAction;
  metric?: BudgetMetric;
  scope?: string;
  used?: number;
  cap?: number;
};

// ---------------------------------------------------------------------------
// Runtime + span structures
// ---------------------------------------------------------------------------

export type RuntimeState =
  | "booting"
  | "ready"
  | "degraded"
  | "error"
  | "recovering"
  | (string & {});

export type RuntimeReason =
  | "boot_started"
  | "boot_completed"
  | "boot_failed"
  | "recovery_started"
  | "recovery_completed"
  | "recovery_failed"
  | "runtime_degraded"
  | "runtime_error"
  | (string & {});

export type RuntimeOperation =
  | "boot"
  | "workspace_sync"
  | "artifact_download"
  | "resource_projection"
  | "resource_mount"
  | "skill_projection"
  | (string & {});

export type RuntimeOperationStatus =
  | "started"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | (string & {});

export type RuntimeEventError = {
  code: string;
  message: string;
  retryable?: boolean;
};

export type RuntimeSeverity = "info" | "warning" | "error";

export type UsageCounters = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  total_cost_usd?: string; // decimal string; only agent.message.usage carries cost
};

// ---------------------------------------------------------------------------
// Typed payloads
// ---------------------------------------------------------------------------

export type UserMessagePayload = { content: ContentBlock[] };
export type UserInterruptPayload = { scope?: { type: "session" } };
export type UserToolConfirmationPayload = {
  tool_call_id: string;
  result: ToolConfirmationResult;
  deny_message?: string;
};

export type AgentMessagePayload = { content: ContentBlock[]; usage?: UsageCounters };
export type AgentThinkingPayload = { content: ContentBlock[] };

export type ToolUsePayload = {
  tool_call_id: string;
  tool_namespace: string;
  mcp_server_name?: string; // required for MCP
  name: string;
  raw_input: unknown;
  evaluated_permission?: EvaluatedPermission;
  title?: string;
  kind?: string;
  content?: ToolCallContent[];
  locations?: ToolLocation[];
  status?: ToolUseStatus;
  sampled_bytes?: string;
};

export type ToolResultPayload = {
  tool_call_id: string;
  status: ToolResultStatus;
  tool_namespace?: string;
  mcp_server_name?: string;
  name?: string;
  title?: string;
  kind?: string;
  raw_output?: unknown;
  partial_lifecycle?: boolean;
  completion_inferred?: boolean;
  latency_ms?: number;
  content?: ToolCallContent[];
  locations?: ToolLocation[];
};

export type ContextCompactedPayload = {
  pre_compaction_tokens?: number;
  post_compaction_tokens?: number;
};

export type SessionStatusRunningPayload = Record<string, never>;
export type SessionStatusIdlePayload = { stop_reason: StopReason };
export type SessionStatusRescheduledPayload = { retry_status: RetryStatus };
export type SessionStatusTerminatedPayload = { last_error_event_id?: string };
export type SessionDeletedPayload = Record<string, never>;
export type SessionUpdatedPayload = {
  agent_config_revision: number;
  applies_on: string; // "next_turn"
  changed_fields: string[];
  changed_summary?: Record<string, unknown>;
};
export type SessionErrorPayload = { error: SessionError };

export type RuntimeStatusPayload = {
  state: RuntimeState;
  reason: RuntimeReason;
  dispatchable?: boolean;
  elapsed_ms?: number;
  runtime_driver?: string;
  error?: RuntimeEventError;
  boot_id?: string;
};

export type RuntimeProgressPayload = {
  operation_id: string;
  operation: RuntimeOperation;
  status: RuntimeOperationStatus;
  phase?: string;
  items_done?: number;
  items_total?: number;
  bytes_done?: number;
  bytes_total?: number;
  elapsed_ms?: number;
  error?: RuntimeEventError;
  runtime_driver?: string;
  boot_id?: string;
};

export type RuntimeMessagePayload = {
  severity: RuntimeSeverity;
  code: string;
  content: TextContentBlock[];
  component?: string;
  details?: Record<string, string>;
  retry_after_ms?: number;
  runtime_driver?: string;
};

export type ModelRequestStartPayload = {
  model: string;
  provider?: string;
  speed?: "standard" | "fast" | (string & {});
};

export type ModelRequestEndPayload = {
  model_request_start_id: string;
  is_error: boolean;
  usage_source: "model_gateway" | "adapter_parse" | "agent_telemetry" | (string & {});
  usage_granularity: "request" | "turn" | "session" | (string & {});
  billing_enforcement: "hard_cap" | "best_effort" | (string & {});
  model_usage: UsageCounters;
  latency_ms?: number;
};

export type MessageDeltaPayload = {
  block_index?: number;
  delta: { type: "text_delta"; text: string };
};

export type ThinkingDeltaPayload = {
  block_index?: number;
  delta: { type: "thinking_delta"; thinking: string };
};

// ---------------------------------------------------------------------------
// Discriminated durable-event union (narrowed payloads)
// ---------------------------------------------------------------------------

export type TypedDurableEvent =
  | DurableEvent<"user.message", UserMessagePayload>
  | DurableEvent<"user.interrupt", UserInterruptPayload>
  | DurableEvent<"user.tool_confirmation", UserToolConfirmationPayload>
  | DurableEvent<"agent.message", AgentMessagePayload>
  | DurableEvent<"agent.thinking", AgentThinkingPayload>
  | DurableEvent<"agent.tool_use", ToolUsePayload>
  | DurableEvent<"agent.tool_result", ToolResultPayload>
  | DurableEvent<"agent.mcp_tool_use", ToolUsePayload>
  | DurableEvent<"agent.mcp_tool_result", ToolResultPayload>
  | DurableEvent<"agent.context_compacted", ContextCompactedPayload>
  | DurableEvent<"session.status_running", SessionStatusRunningPayload>
  | DurableEvent<"session.status_idle", SessionStatusIdlePayload>
  | DurableEvent<"session.status_rescheduled", SessionStatusRescheduledPayload>
  | DurableEvent<"session.status_terminated", SessionStatusTerminatedPayload>
  | DurableEvent<"session.deleted", SessionDeletedPayload>
  | DurableEvent<"session.updated", SessionUpdatedPayload>
  | DurableEvent<"session.error", SessionErrorPayload>
  | DurableEvent<"runtime.status", RuntimeStatusPayload>
  | DurableEvent<"runtime.progress", RuntimeProgressPayload>
  | DurableEvent<"runtime.message", RuntimeMessagePayload>
  | DurableEvent<"span.model_request_start", ModelRequestStartPayload>
  | DurableEvent<"span.model_request_end", ModelRequestEndPayload>;

// ---------------------------------------------------------------------------
// Fixture / scenario shape (matches event-design-reference/fixtures/*.json)
// ---------------------------------------------------------------------------

export type EventFixture = {
  schema_version: number;
  scenario: string;
  description: string;
  events: AnyDurableEvent[];
  live_frames: StreamFrame[];
};

// ---------------------------------------------------------------------------
// Narrow helpers
// ---------------------------------------------------------------------------

export function isDurableEventType(type: string): type is DurableEventType {
  return (DURABLE_EVENT_TYPES as readonly string[]).includes(type);
}

export function isToolUseType(type: string): type is "agent.tool_use" | "agent.mcp_tool_use" {
  return type === "agent.tool_use" || type === "agent.mcp_tool_use";
}

export function isToolResultType(
  type: string,
): type is "agent.tool_result" | "agent.mcp_tool_result" {
  return type === "agent.tool_result" || type === "agent.mcp_tool_result";
}

export function isMcpType(type: string): boolean {
  return type === "agent.mcp_tool_use" || type === "agent.mcp_tool_result";
}
