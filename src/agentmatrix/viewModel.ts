/**
 * Projected view models.
 *
 * These are the controlled, presentation-oriented models Canvas components
 * consume. Components never touch raw Events, SSE, or correlation — they read
 * these stable models. Replaying the same durable Events in `sequence` order
 * must always produce the same durable view model.
 */

import type {
  AnyDurableEvent,
  ContentBlock,
  EvaluatedPermission,
  RetryStatus,
  RuntimeEventError,
  RuntimeSeverity,
  SessionError,
  StopReason,
  ToolCallContent,
  ToolConfirmationResult,
  ToolLocation,
  ToolResultStatus,
  ToolUseStatus,
  UsageCounters,
} from "./protocol";

/** Authoritative Session lifecycle state (from `session.*`, never runtime). */
export type SessionLifecycle =
  | "initializing"
  | "running"
  | "idle"
  | "requires_action"
  | "rescheduling"
  | "terminated"
  | "deleted";

// --- Transcript -------------------------------------------------------------

export type MessageAuthor = "user" | "agent";

export type MessageViewModel = {
  kind: "message";
  id: string;
  sequence: number;
  author: MessageAuthor;
  blocks: ContentBlock[];
  /** True while a temporary streamed block is showing (no durable sequence). */
  streaming: boolean;
  createdAt: string;
  usage?: UsageCounters;
};

export type ThinkingViewModel = {
  kind: "thinking";
  id: string;
  sequence: number;
  blocks: ContentBlock[];
  streaming: boolean;
  createdAt: string;
};

/** One ToolCall card spans use, permission, confirmation, execution, result. */
export type ToolCallViewModel = {
  kind: "tool";
  id: string; // tool_call_id
  sequence: number;
  source: "native" | "mcp";
  mcpServerName?: string;
  namespace?: string;
  name: string;
  title?: string;
  toolKind?: string;
  rawInput?: unknown;
  rawOutput?: unknown;
  useStatus?: ToolUseStatus;
  resultStatus?: ToolResultStatus;
  /** Coarse lifecycle for iconography and tone. */
  lifecycle:
    | "pending_approval"
    | "in_progress"
    | "completed"
    | "failed"
    | "cancelled"
    | "partial";
  permission?: EvaluatedPermission;
  /** Final user decision derived from a correlated confirmation/interrupt. */
  decision?: ToolConfirmationResult | "cancel";
  denyMessage?: string;
  content: ToolCallContent[];
  locations: ToolLocation[];
  latencyMs?: number;
  partialLifecycle?: boolean;
  completionInferred?: boolean;
  createdAt: string;
  updatedAt: string;
  /** True while the Session is idle-requires-action on this specific call. */
  awaitingApproval: boolean;
};

export type TranscriptItem = MessageViewModel | ThinkingViewModel | ToolCallViewModel;

export type TranscriptTurn = {
  turnId: string;
  items: TranscriptItem[];
};

// --- Runtime ----------------------------------------------------------------

export type RuntimeStatusViewModel = {
  state: string;
  reason: string;
  dispatchable?: boolean;
  elapsedMs?: number;
  runtimeDriver?: string;
  error?: RuntimeEventError;
  bootId?: string;
  sequence: number;
};

export type RuntimeOperationViewModel = {
  operationId: string;
  operation: string;
  status: string;
  phase?: string;
  itemsDone?: number;
  itemsTotal?: number;
  bytesDone?: number;
  bytesTotal?: number;
  elapsedMs?: number;
  error?: RuntimeEventError;
  sequence: number;
  updatedAt: string;
};

export type RuntimeNoticeViewModel = {
  id: string;
  sequence: number;
  severity: RuntimeSeverity;
  code: string;
  text: string;
  component?: string;
  details?: Record<string, string>;
  createdAt: string;
};

// --- Activity + incidents ---------------------------------------------------

export type ActivityTone = "neutral" | "info" | "success" | "warning" | "danger";

export type ActivityRowViewModel = {
  id: string;
  sequence: number;
  /** Human-readable primary statement. */
  statement: string;
  /** Secondary technical Event kind. */
  eventType: string;
  tone: ActivityTone;
  createdAt: string;
  /** Related Event ids for chain expansion. */
  relatedEventIds: string[];
  detail?: string;
};

export type IncidentRecovery = "retrying" | "exhausted" | "terminal";

export type IncidentViewModel = {
  id: string; // anchor error event_id
  sequence: number;
  error: SessionError;
  recovery: IncidentRecovery;
  retryStatus: RetryStatus;
  /** Only a server deadline drives a countdown. */
  deadline?: string;
  /** Composer must be locked while a turn remains open (retrying/terminal). */
  composerLocked: boolean;
  createdAt: string;
  correlatedEventIds: string[];
  resolved: boolean;
};

// --- Approvals --------------------------------------------------------------

export type ApprovalViewModel = {
  toolCallId: string;
  toolTitle: string;
  toolName: string;
  source: "native" | "mcp";
  mcpServerName?: string;
  target?: string; // primary location path if any
  riskReason?: string;
  /** Allow always is only offered when the policy makes it eligible. */
  allowAlwaysEligible: boolean;
  sequence: number;
};

// --- Config audit + compaction ---------------------------------------------

export type ConfigAuditViewModel = {
  id: string;
  sequence: number;
  revision: number;
  appliesOn: string;
  changedFields: string[];
  changedSummary?: Record<string, unknown>;
  createdAt: string;
};

export type CompactionViewModel = {
  id: string;
  sequence: number;
  preTokens?: number;
  postTokens?: number;
  createdAt: string;
};

// --- Diagnostics ------------------------------------------------------------

export type ModelSpanViewModel = {
  startId: string;
  model?: string;
  provider?: string;
  speed?: string;
  isError?: boolean;
  usageGranularity?: string;
  usageSource?: string;
  usage?: UsageCounters;
  latencyMs?: number;
  /** True when the end span has no matching start. */
  unmatched: boolean;
  sequence: number;
};

export type DiagnosticEntry = {
  eventId: string;
  sequence: number;
  type: string;
  turnId?: string;
  parentEventId?: string;
  causeEventId?: string;
  createdAt: string;
  emittedAt: string;
  /** Safe typed summary line. */
  summary: string;
  /** The full envelope for raw disclosure (never executed). */
  raw: AnyDurableEvent;
  /** True for kinds outside the closed set. */
  unknown: boolean;
};

// --- Aggregate --------------------------------------------------------------

export type SessionViewModel = {
  sessionId?: string;
  lifecycle: SessionLifecycle;
  /** Latest stop reason if idle. */
  stopReason?: StopReason;
  /** Read-only when terminated/deleted. */
  readOnly: boolean;
  transcript: TranscriptTurn[];
  runtimeStatus?: RuntimeStatusViewModel;
  runtimeOperations: RuntimeOperationViewModel[];
  runtimeNotices: RuntimeNoticeViewModel[];
  activity: ActivityRowViewModel[];
  incidents: IncidentViewModel[];
  /** The single blocking incident to surface near the Composer, if any. */
  blockingIncident?: IncidentViewModel;
  approvals: ApprovalViewModel[];
  configAudits: ConfigAuditViewModel[];
  compactions: CompactionViewModel[];
  modelSpans: ModelSpanViewModel[];
  diagnostics: DiagnosticEntry[];
  /** Highest durable sequence applied — the reconnect cursor. */
  cursor: number;
  /** Aggregate usage disclosed on the latest agent message, if any. */
  lastUsage?: UsageCounters;
};

export function emptySessionViewModel(): SessionViewModel {
  return {
    lifecycle: "initializing",
    readOnly: false,
    transcript: [],
    runtimeOperations: [],
    runtimeNotices: [],
    activity: [],
    incidents: [],
    approvals: [],
    configAudits: [],
    compactions: [],
    modelSpans: [],
    diagnostics: [],
    cursor: 0,
  };
}
