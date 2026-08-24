import { AGENT_UX_EVENT_TYPES } from "@agent-ux/protocol";
import { DIAGNOSTIC_MARKERS } from "./eventNormalizer";
import { isShellTool } from "./toolDisplaySpec";

/**
 * Event contract: what the UI needs from a backend, and whether it got it.
 *
 * The adapter is the only hand-written link between a backend and this UI, and when it maps
 * something badly nothing complains — the components faithfully render whatever arrives. A
 * real integration failed exactly that way: harness diagnostics were mapped as tool calls
 * and flooded the conversation, `reasoning.delta` arrived with empty content so the thinking
 * block rendered blank, and tool events carried no `args`/`result` so file cards degraded to
 * a bare line. Everything "worked"; nothing was right.
 *
 * This module makes those failures observable:
 *
 * - `inspectAgentUXEvents()` reports per-surface coverage, concrete issues with fixes, and
 *   which events would land in the conversation without looking like agent activity.
 * - `isConversationEvent()` keeps that last group out of the main timeline by default.
 *
 * It is a report, not a gate: a backend that simply does not emit reasoning is *degraded*,
 * not broken, and the UI should show one less block rather than refuse to render.
 */

export type EventSeverity = "error" | "warning";

export type EventIssue = {
  severity: EventSeverity;
  /** Event type the issue is about, or "*" for stream-level findings. */
  type: string;
  count: number;
  /** What is wrong, in terms of what the user will see. */
  message: string;
  /** What to change in the adapter. */
  fix: string;
};

export type UiSurfaceId =
  | "conversation"
  | "reasoning"
  | "toolCall"
  | "toolResult"
  | "approval"
  | "artifact"
  | "console"
  | "capability";

export type SurfaceCoverage = {
  id: UiSurfaceId;
  label: string;
  /** Events that must be present for this surface to render at all. */
  requires: string[];
  status: "ok" | "degraded" | "missing";
  detail: string;
};

export type ContractReport = {
  totalEvents: number;
  countsByType: Record<string, number>;
  issues: EventIssue[];
  coverage: SurfaceCoverage[];
  /** Events routed away from the conversation because they are not agent activity. */
  diagnosticCounts: Record<string, number>;
  /** True when every surface is "ok" and there are no error-severity issues. */
  consistent: boolean;
};

type AnyEvent = { type?: unknown; payload?: unknown };

function payloadOf(event: unknown): Record<string, unknown> {
  const candidate = (event as AnyEvent)?.payload;
  return candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>) : {};
}

function typeOf(event: unknown): string {
  const candidate = (event as AnyEvent)?.type;
  return typeof candidate === "string" ? candidate : "";
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Whether a streaming delta actually carries something.
 *
 * Not the same test as `nonEmptyString`: whitespace *is* content in a delta. A real run against
 * a live model produced 104 whitespace-only deltas out of 663 — every one of them the
 * indentation and blank lines of a TypeScript code block. Treating them as empty reported an
 * error on a perfectly good answer, and a validator that cries wolf on ordinary output stops
 * being read. Only a genuinely empty string means the bubble will render blank.
 */
function hasDeltaContent(value: unknown): boolean {
  return typeof value === "string" && value.length > 0;
}

function matchesDiagnosticMarker(event: unknown, extraMarkers: readonly string[]): boolean {
  const payload = payloadOf(event);
  const haystack = [payload.name, payload.title, payload.toolCallId]
    .filter(nonEmptyString)
    .join(" ")
    .toLowerCase();
  if (!haystack) return false;
  return [...DIAGNOSTIC_MARKERS, ...extraMarkers].some((marker) =>
    haystack.includes(marker.toLowerCase()),
  );
}

/**
 * Whether an event belongs in the main conversation timeline.
 *
 * Everything the UI treats as agent activity — text, reasoning, tool calls, artifacts,
 * capabilities, run lifecycle — is conversational. Harness bookkeeping is not; it still
 * reaches the debug dock, it just does not pollute the transcript.
 */
export function isConversationEvent(event: unknown, extraMarkers: readonly string[] = []): boolean {
  return !matchesDiagnosticMarker(event, extraMarkers);
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

const SURFACES: Array<{
  id: UiSurfaceId;
  label: string;
  requires: string[];
  /** Extra condition for "ok" beyond the required events being present. */
  degradedWhen?: (report: { counts: Record<string, number>; issues: EventIssue[] }) => string | undefined;
}> = [
  {
    id: "conversation",
    label: "对话文本 / Conversation",
    requires: ["text.started", "text.delta", "text.finished"],
  },
  {
    id: "reasoning",
    label: "思考过程 / Reasoning",
    requires: ["reasoning.status", "reasoning.delta"],
    degradedWhen: ({ issues }) =>
      issues.some((issue) => issue.type === "reasoning.delta")
        ? "收到 reasoning.delta 但内容为空，思考块会渲染成空白"
        : undefined,
  },
  {
    id: "toolCall",
    label: "工具调用卡 / Tool call",
    requires: ["tool.call.started"],
    degradedWhen: ({ issues }) =>
      issues.some((issue) => issue.type === "tool.call.running" || issue.type === "tool.call.started")
        ? "工具事件缺 args，文件/命令卡会降级成一行文字"
        : undefined,
  },
  {
    id: "toolResult",
    label: "工具结果 / Tool result",
    requires: ["tool.call.result"],
    degradedWhen: ({ issues }) =>
      issues.some((issue) => issue.type === "tool.call.result")
        ? "tool.call.result 没有 result，展开后没有内容"
        : undefined,
  },
  { id: "approval", label: "审批 / Approval", requires: ["tool.call.awaiting_approval"] },
  { id: "artifact", label: "产物面板 / Artifact panel", requires: ["artifact.created", "artifact.delta"] },
  { id: "console", label: "控制台 / Console", requires: ["tool.call.result"] },
  { id: "capability", label: "能力面板 / Capability tray", requires: ["capability.attached"] },
];

// ---------------------------------------------------------------------------
// Inspection
// ---------------------------------------------------------------------------

export function inspectAgentUXEvents(
  events: readonly unknown[],
  options: { extraDiagnosticMarkers?: readonly string[] } = {},
): ContractReport {
  const extraMarkers = options.extraDiagnosticMarkers ?? [];
  const counts: Record<string, number> = {};
  const diagnosticCounts: Record<string, number> = {};
  const issues: EventIssue[] = [];

  const bump = (target: Record<string, number>, key: string) => {
    target[key] = (target[key] ?? 0) + 1;
  };

  const emptyReasoningDeltas: string[] = [];
  const toolCallsWithoutArgs: string[] = [];
  const toolResultsWithoutResult: string[] = [];
  const emptyTextDeltas: string[] = [];
  const emptyArtifactDeltas: string[] = [];
  const startedToolCalls = new Set<string>();
  const finishedToolCalls = new Set<string>();
  const unknownTypes: string[] = [];
  let sawShellResult = false;

  const known = new Set<string>(AGENT_UX_EVENT_TYPES);
  const shellToolIds = new Set<string>();

  for (const event of events) {
    const type = typeOf(event);
    const payload = payloadOf(event);

    if (!type) {
      unknownTypes.push("(missing type)");
      continue;
    }

    if (!isConversationEvent(event, extraMarkers)) {
      bump(diagnosticCounts, type);
      continue;
    }

    bump(counts, type);

    if (!known.has(type)) {
      unknownTypes.push(type);
      continue;
    }

    switch (type) {
      case "text.delta":
        if (!hasDeltaContent(payload.delta)) emptyTextDeltas.push(String(payload.textId ?? "?"));
        break;
      case "reasoning.delta":
        if (!hasDeltaContent(payload.delta)) emptyReasoningDeltas.push(String(payload.reasoningId ?? "?"));
        break;
      case "artifact.delta":
        if (!hasDeltaContent(payload.delta)) emptyArtifactDeltas.push(String(payload.artifactId ?? "?"));
        break;
      case "tool.call.started": {
        const id = String(payload.toolCallId ?? "?");
        startedToolCalls.add(id);
        if (nonEmptyString(payload.name) && isShellTool(String(payload.name))) {
          shellToolIds.add(id);
        }
        break;
      }
      case "tool.call.running":
        if (payload.args === undefined && !nonEmptyString(payload.argsText)) {
          toolCallsWithoutArgs.push(String(payload.toolCallId ?? "?"));
        }
        break;
      case "tool.call.result": {
        const id = String(payload.toolCallId ?? "?");
        if (payload.result === undefined && !nonEmptyString(payload.resultPreview)) {
          toolResultsWithoutResult.push(id);
        }
        if (shellToolIds.has(id) && payload.result !== undefined) sawShellResult = true;
        break;
      }
      case "tool.call.finished":
        finishedToolCalls.add(String(payload.toolCallId ?? "?"));
        break;
      default:
        break;
    }
  }

  const issue = (
    severity: EventSeverity,
    type: string,
    count: number,
    message: string,
    fix: string,
  ) => {
    if (count > 0) issues.push({ severity, type, count, message, fix });
  };

  issue("error", "reasoning.delta", emptyReasoningDeltas.length,
    "收到 reasoning.delta 但 delta 为空，思考块会渲染成空白",
    "把后端的思考文本写进 payload.delta（字符串，非空）");
  issue("error", "text.delta", emptyTextDeltas.length,
    "收到 text.delta 但 delta 为空，消息气泡会是空的",
    "把消息文本写进 payload.delta");
  issue("warning", "tool.call.running", toolCallsWithoutArgs.length,
    "工具调用缺 args / argsText，文件卡与命令卡会降级成一行文字",
    "补 payload.args，例如 { path: \"src/x.ts\" } 或 { command: \"npm test\" }");
  issue("warning", "tool.call.result", toolResultsWithoutResult.length,
    "tool.call.result 没有 result / resultPreview，展开后没有内容",
    "把工具真实输出写进 payload.result；行数或增删摘要写进 payload.resultPreview");
  issue("warning", "artifact.delta", emptyArtifactDeltas.length,
    "artifact.delta 没有 delta，产物面板会是空的",
    "把产物内容写进 payload.delta");

  const unfinished = [...startedToolCalls].filter((id) => !finishedToolCalls.has(id));
  issue("warning", "tool.call.finished", unfinished.length,
    "有 tool.call.started 没有对应的 tool.call.finished，卡片会停在运行中",
    "每个工具调用结束时发一条 tool.call.finished（含 status）");

  const uniqueUnknown = [...new Set(unknownTypes)];
  issue("warning", "*", uniqueUnknown.length,
    `收到 ${uniqueUnknown.length} 种未知事件类型：${uniqueUnknown.slice(0, 5).join(", ")}`,
    "只发协议定义的标准事件；其余请在适配器里丢弃或映射成标准类型");

  const diagnosticTotal = Object.values(diagnosticCounts).reduce((sum, n) => sum + n, 0);
  if (diagnosticTotal > 0) {
    issues.push({
      severity: "warning",
      type: "*",
      count: diagnosticTotal,
      message: `${diagnosticTotal} 条事件被识别为 harness 内部信息（运行时配置 / token 计费 / 系统提示注入），已移出对话流`,
      fix: "确认这些确实不该出现在对话里；需要展示就在 bottom-dock 的调试面板查看",
    });
  }

  const coverage: SurfaceCoverage[] = SURFACES.map((surface) => {
    const present = surface.requires.filter((type) => (counts[type] ?? 0) > 0);
    if (present.length === 0) {
      return {
        id: surface.id,
        label: surface.label,
        requires: surface.requires,
        status: "missing",
        detail: `未收到 ${surface.requires.join(" / ")}`,
      };
    }
    if (surface.id === "console" && !sawShellResult) {
      return {
        id: surface.id,
        label: surface.label,
        requires: surface.requires,
        status: "missing",
        detail: "未收到带 result 的 shell 工具调用（bash / run_command / start_server / shell.exec）",
      };
    }
    const degraded = surface.degradedWhen?.({ counts, issues });
    if (degraded) {
      return { id: surface.id, label: surface.label, requires: surface.requires, status: "degraded", detail: degraded };
    }
    if (present.length < surface.requires.length) {
      const missing = surface.requires.filter((type) => !present.includes(type));
      return {
        id: surface.id,
        label: surface.label,
        requires: surface.requires,
        status: "degraded",
        detail: `缺少 ${missing.join(" / ")}`,
      };
    }
    return { id: surface.id, label: surface.label, requires: surface.requires, status: "ok", detail: "" };
  });

  return {
    totalEvents: events.length,
    countsByType: counts,
    issues,
    coverage,
    diagnosticCounts,
    consistent:
      coverage.every((surface) => surface.status === "ok") &&
      !issues.some((item) => item.severity === "error"),
  };
}

/** One-line-per-finding text report, shared by the dev console warning and the CLI gate. */
export function formatContractReport(report: ContractReport): string {
  const lines: string[] = [];
  const mark = { ok: "OK  ", degraded: "WARN", missing: "FAIL" } as const;

  lines.push(`事件总数 ${report.totalEvents}，UI 面覆盖:`);
  for (const surface of report.coverage) {
    lines.push(`  [${mark[surface.status]}] ${surface.label}${surface.detail ? ` — ${surface.detail}` : ""}`);
  }

  if (report.issues.length > 0) {
    lines.push("");
    lines.push("问题:");
    for (const item of report.issues) {
      lines.push(`  [${item.severity === "error" ? "ERROR" : "WARN "}] ${item.type} ×${item.count} — ${item.message}`);
      lines.push(`          修法: ${item.fix}`);
    }
  }

  const okCount = report.coverage.filter((surface) => surface.status === "ok").length;
  lines.push("");
  lines.push(
    report.consistent
      ? `一致 — ${okCount}/${report.coverage.length} 个 UI 面全部由事件驱动`
      : `不一致 — 仅 ${okCount}/${report.coverage.length} 个 UI 面完整，不建议上生产`,
  );

  return lines.join("\n");
}
