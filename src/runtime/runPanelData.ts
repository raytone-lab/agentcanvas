import type { AgentUXStepTimelineItem, AgentUXToolTimelineItem } from "@agent-ux/render-core";

/**
 * What the right panel's three extra sections show, read off the run.
 *
 * The sibling of `consoleLogEntries` in `toolDisplaySpec.ts`, and written for
 * the same reason: the console tab used to print four fixed lines whatever the
 * session had done, so switching to it changed nothing recognisable. A task
 * list, a progress bar and a file index are three more surfaces that would be
 * easy to fill with plausible-looking sample rows — and just as dead. Every row
 * here comes from an event the run actually emitted, and a run with nothing to
 * report says so.
 *
 * The flags in `project.output` decide whether a section is *there*. Nothing in
 * this file reads them: what a section contains is the run's business.
 */

export type RunWorkStatus = "done" | "running" | "pending" | "failed" | "cancelled";

/** One line of the task list: what the run set out to do, and where it got to. */
export type RunTaskRow = {
  id: string;
  label: string;
  /** The file, query or command the step was about, when it named one. */
  target?: string;
  status: RunWorkStatus;
};

export type RunProgressSummary = {
  done: number;
  total: number;
  /** The run as a whole, decided by its rows — see `progressStatus`. */
  status: "running" | "finished" | "failed";
};

export type WorkspaceFileAction = "read" | "modified" | "checked";

export type WorkspaceFileRow = {
  id: string;
  path: string;
  /** The last path segment, which is what the row leads with. */
  name: string;
  action: WorkspaceFileAction;
};

/** The loose shape both helpers accept: the view model's timeline. */
type TimelineLike = readonly { kind?: string }[];

/**
 * The run's work, one row per unit of it.
 *
 * Two sources, in order of authority. A backend that emits `step.started` /
 * `step.finished` is telling us its own plan, so those steps *are* the task
 * list. Most backends do not — the protocol has no plan event, and the ones
 * this repo ships fixtures for emit none — so the fallback is the tool calls,
 * which is the run's work as it actually happened rather than a plan invented
 * for the panel.
 *
 * Session steps are excluded: `stepKind: "session"` is the interrupt row, a
 * break in the stream rather than a task in it (`ChatFrame` draws it as a
 * rule), and listing "已被你中断" as a task would be reading it as one.
 */
export function runTaskRows(timeline: TimelineLike): RunTaskRow[] {
  const steps: RunTaskRow[] = [];
  for (const item of timeline) {
    if (item.kind !== "step") continue;
    const step = item as unknown as AgentUXStepTimelineItem;
    if (stepKindOf(step) === "session") continue;
    steps.push({
      id: step.id,
      label: step.label || step.id,
      target: step.summary || undefined,
      status: workStatus(step.status),
    });
  }
  if (steps.length > 0) return steps;

  const tools: RunTaskRow[] = [];
  for (const item of timeline) {
    if (item.kind !== "tool") continue;
    const tool = item as unknown as AgentUXToolTimelineItem;
    tools.push({
      id: tool.id,
      label: tool.title || tool.name || tool.id,
      target: toolTarget(tool),
      status: workStatus(tool.status),
    });
  }
  return tools;
}

/**
 * The same rows, counted.
 *
 * Derived from `runTaskRows` rather than from the timeline a second time, so
 * the bar and the list cannot disagree about how many steps there were — which
 * they would the first time one of them learned about a new event kind.
 */
export function runProgress(timeline: TimelineLike): RunProgressSummary {
  const rows = runTaskRows(timeline);
  return {
    done: rows.filter((row) => row.status === "done").length,
    total: rows.length,
    status: progressStatus(rows),
  };
}

/**
 * Which state the run is in, from its rows.
 *
 * Running wins over failed: a run that lost one call and is still working is
 * still working, and reporting it as failed while the next tool spins would be
 * wrong in the one direction that matters.
 */
function progressStatus(rows: readonly RunTaskRow[]): RunProgressSummary["status"] {
  if (rows.some((row) => row.status === "running" || row.status === "pending")) return "running";
  if (rows.some((row) => row.status === "failed")) return "failed";
  return "finished";
}

/**
 * The files the run touched, most recent claim per file.
 *
 * A row is a claim about a file, so it is only made where the call says what it
 * did: read, changed, or checked. A tool that mentioned a path without one of
 * those meanings gets no row rather than a hedged one — and a call that failed
 * or was cancelled gets none either, which is the same rule that stopped a
 * failed write from reporting 已修改 notes.md on the tool row.
 *
 * `modified` outranks `checked` outranks `read`: a file that was read and then
 * rewritten was changed, and that is the useful thing to say about it.
 */
export function workspaceFileRows(timeline: TimelineLike): WorkspaceFileRow[] {
  const byPath = new Map<string, WorkspaceFileRow>();
  for (const item of timeline) {
    if (item.kind !== "tool") continue;
    const tool = item as unknown as AgentUXToolTimelineItem;
    const status = String(tool.status ?? "");
    if (status === "error" || status === "cancelled" || status === "awaiting_approval") continue;
    const path = filePathFromTool(tool);
    if (!path) continue;
    const action = fileActionFromTool(tool);
    if (!action) continue;
    const existing = byPath.get(path);
    if (existing && actionRank(existing.action) >= actionRank(action)) continue;
    byPath.set(path, {
      // Keyed by path, not by call: two calls on one file are one file.
      id: `file:${path}`,
      path,
      name: path.split("/").filter(Boolean).pop() ?? path,
      action,
    });
  }
  return [...byPath.values()];
}

function actionRank(action: WorkspaceFileAction): number {
  if (action === "modified") return 3;
  if (action === "checked") return 2;
  return 1;
}

function stepKindOf(step: AgentUXStepTimelineItem): string {
  return String(step.stepKind ?? step.scope?.kind ?? "runtime");
}

/**
 * A producer's status word, in the five the panel can draw.
 *
 * The set is wider than a tool card's because a task list has to show work that
 * has not started: a plan is mostly rows that are still `pending`, and drawing
 * those as running would claim five things are happening at once.
 */
function workStatus(status: unknown): RunWorkStatus {
  const value = String(status ?? "").toLowerCase();
  if (value === "success" || value === "finished" || value === "completed" || value === "done") return "done";
  if (value === "error" || value === "failed") return "failed";
  if (value === "cancelled" || value === "canceled" || value === "stopped" || value === "aborted") return "cancelled";
  if (value === "" || value === "pending" || value === "queued" || value === "created") return "pending";
  // started, running, args_streaming, awaiting_approval, and anything a vendor
  // words its own way: the call is out and has not come back.
  return "running";
}

/** What a call was about, for the muted half of a task row. */
function toolTarget(tool: AgentUXToolTimelineItem): string | undefined {
  const args = toolArgs(tool);
  const value =
    getString(args, "path") ||
    getString(args, "file") ||
    getString(args, "pattern") ||
    getString(args, "query") ||
    getString(args, "command") ||
    getString(args, "cmd") ||
    getString(args, "url");
  return value || undefined;
}

function filePathFromTool(tool: AgentUXToolTimelineItem): string | undefined {
  const args = toolArgs(tool);
  const path = getString(args, "path") || getString(args, "file");
  return path || undefined;
}

function fileActionFromTool(tool: AgentUXToolTimelineItem): WorkspaceFileAction | undefined {
  // Name and title together: the name is the vendor's word for the tool and the
  // title is the producer's word for this call, and either one can be the only
  // place the action is said.
  const text = `${tool.name ?? ""} ${tool.title ?? ""}`.toLowerCase();
  if (/(write|patch|modify|update|create|append|edit|修改|写入|更新|创建|编辑)/.test(text)) return "modified";
  if (/(validate|verify|test|lint|check|typecheck|验证|校验|检查|测试)/.test(text)) return "checked";
  if (/(read|view|open|scan|cat|读取|查看|打开)/.test(text)) return "read";
  return undefined;
}

function toolArgs(tool: AgentUXToolTimelineItem): Record<string, unknown> | undefined {
  return (
    asRecord(tool.args) ??
    parseRecord(tool.argsText) ??
    asRecord(tool.approval?.argsPreview)
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function parseRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    return asRecord(JSON.parse(value));
  } catch {
    return undefined;
  }
}

function getString(args: Record<string, unknown> | undefined, key: string): string {
  const value = args?.[key];
  return typeof value === "string" ? value : "";
}
