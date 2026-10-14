import { useState } from "react";

import { StateIcon, type IconSlot } from "../../../agentmatrix";
import { ChevronDown } from "../../../agentmatrix/uiIcons";

import type { OutputFrameCopy } from "./types";
import {
  runProgress,
  runTaskRows,
  workspaceFileRows,
  type RunTaskRow,
  type RunWorkStatus,
  type WorkspaceFileAction,
  type WorkspaceFileRow,
} from "../../../runtime/runPanelData";

/**
 * The three things the right panel can hold besides the artifact.
 *
 * They stack in the panel in reading order — how far the run has got, what it
 * is working through, what it delivered, what it changed — so each one is a
 * plain section rather than a tab: they are additive (`project.output`'s three
 * flags), and a tab strip would have made them alternatives to each other and
 * to the document.
 *
 * No frames and no fills, in any style. The panel is a reading surface: the
 * only outlined object in it is the delivery itself. A bordered card for the
 * task list would have made the list look like the thing to act on.
 */

/**
 * Progress and tasks, docked above the composer.
 *
 * They used to sit in the right panel beside the artifact, and that put a
 * run's *steps* in the place the reader goes for its *result*. Every agent
 * product that shows a plan keeps it on the conversation's side: Claude Code
 * and Codex list it in the transcript, Cursor's status pills and Manus's
 * working chip sit above the prompt, Codex desktop pins "x of 5 tasks" there.
 * Above the composer is the version of that which stays in view while the
 * transcript scrolls.
 *
 * One card, read in one line: a status mark, what it is, where the run is
 * ("正在验证", or 已完成 once it is), the count, and a chevron — the whole line
 * is the fold. The bar runs under it; the steps are what unfolds. The fold
 * used to belong to the task list alone, so a dock showing only 执行进度 had
 * nothing to open, in every style; the steps are the same data either way, so
 * both options fold now and only their resting state differs — 任务列表 asked
 * for the list, so it opens unfolded, and 执行进度 alone rests as the summary.
 *
 * The rail's targets keep working: the card is `.run-progress` when progress
 * is on, and the list is `.run-task-list` (`presetRailData`).
 */
export function RunStatusDock({
  timeline,
  copy,
  showProgress,
  showTasks,
}: {
  timeline: readonly { kind?: string }[];
  copy: OutputFrameCopy;
  showProgress: boolean;
  showTasks: boolean;
}) {
  // `null` until the reader folds it themselves, so switching 任务列表 on or
  // off still moves the card to that option's resting state.
  const [choice, setChoice] = useState<boolean | null>(null);
  if (!showProgress && !showTasks) return null;

  const rows = runTaskRows(timeline);
  const progress = runProgress(timeline);
  const ratio = progress.total > 0 ? progress.done / progress.total : 0;
  const open = rows.length > 0 && (choice ?? showTasks);
  const running = rows.find((row) => row.status === "running") ?? rows.find((row) => row.status === "pending");
  const current =
    progress.total === 0
      ? copy.progressEmpty
      : progress.status === "running" && running
        ? running.label
        : copy.progressStatusLabels[progress.status];
  const mark: IconSlot =
    progress.status === "failed" ? "tool.failed" : progress.status === "running" ? "tool.in_progress" : "tool.completed";

  return (
    <section
      className={showProgress ? "run-dock run-progress" : "run-dock"}
      aria-label={copy.runDockLabel}
      data-status={progress.status}
      data-open={open ? "true" : "false"}
      data-empty={progress.total === 0 ? "true" : undefined}
    >
      <button
        className="run-dock-head"
        type="button"
        aria-expanded={open}
        aria-label={`${showProgress ? copy.progressTitle : copy.tasksTitle} · ${current} · ${open ? copy.tasksCollapse : copy.tasksExpand}`}
        disabled={rows.length === 0}
        onClick={() => setChoice(!open)}
      >
        <span className="run-dock-mark" aria-hidden="true">
          <StateIcon slot={mark} size={14} />
        </span>
        <span className="run-dock-title panel-section-title">{showProgress ? copy.progressTitle : copy.tasksTitle}</span>
        <span className="run-dock-current">{current}</span>
        {progress.total > 0 ? (
          <span className="run-dock-count panel-section-note">
            {progress.done}/{progress.total}
            {copy.progressStepsSuffix}
          </span>
        ) : null}
        {rows.length > 0 ? <ChevronDown className="run-dock-chevron" size={14} aria-hidden="true" /> : null}
      </button>
      {showProgress && progress.total > 0 ? (
        <div
          className="run-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.done}
        >
          <span className="run-progress-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
      ) : null}
      {/* Mounted while folded, so the fold can run on the row's height. */}
      {rows.length > 0 ? (
        <div className="run-dock-body" aria-hidden={open ? undefined : true}>
          <div className="run-dock-body-inner">
            <ol className="panel-section-rows run-task-list">
              {rows.map((row) => (
                <li
                  className="run-task-row"
                  data-status={row.status}
                  key={row.id}
                  aria-label={taskRowLabel(row, copy)}
                >
                  <span className="run-task-mark" aria-hidden="true">
                    <StateIcon slot={taskStatusSlot(row.status)} size={13} />
                  </span>
                  <span className="run-task-label">{row.label}</span>
                  {row.target ? <span className="run-task-target">{row.target}</span> : null}
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function WorkspaceFilesSection({
  timeline,
  copy,
}: {
  timeline: readonly { kind?: string }[];
  copy: OutputFrameCopy;
}) {
  const rows = workspaceFileRows(timeline);
  return (
    <section className="panel-section workspace-files">
      <h4 className="panel-section-title">{copy.filesTitle}</h4>
      {rows.length === 0 ? (
        <p className="panel-section-empty">{copy.filesEmpty}</p>
      ) : (
        <ul className="panel-section-rows">
          {rows.map((row) => (
            <li className="workspace-file-row" data-action={row.action} key={row.id}>
              <span className="workspace-file-mark" aria-hidden="true">
                <StateIcon slot={fileActionSlot(row.action)} size={13} />
              </span>
              <span className="workspace-file-name">{row.name}</span>
              {/* The directory, only when there is one: `notes.md` at the repo
                  root would otherwise get an empty grey space after it. */}
              {directoryOf(row) ? <span className="workspace-file-dir">{directoryOf(row)}</span> : null}
              <span className="workspace-file-action">{copy.fileActionLabels[row.action]}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function taskRowLabel(row: RunTaskRow, copy: OutputFrameCopy): string {
  const status = copy.taskStatusLabels[row.status];
  return row.target ? `${row.label} ${row.target} · ${status}` : `${row.label} · ${status}`;
}

function directoryOf(row: WorkspaceFileRow): string {
  const cut = row.path.lastIndexOf("/");
  return cut > 0 ? row.path.slice(0, cut) : "";
}

/**
 * Status marks come from the icon slots, not from a local glyph.
 *
 * Which means each style draws them with its own set — the same check the tool
 * rows use in that style, rather than a lucide tick imported here that no style
 * could override.
 */
function taskStatusSlot(status: RunWorkStatus): IconSlot {
  if (status === "done") return "tool.completed";
  if (status === "failed") return "tool.failed";
  if (status === "cancelled") return "tool.cancelled";
  if (status === "pending") return "permission.pending";
  return "tool.in_progress";
}

function fileActionSlot(action: WorkspaceFileAction): IconSlot {
  if (action === "modified") return "tool.file_modified";
  if (action === "checked") return "tool.validate";
  return "tool.file_read";
}

export type { RunTaskRow };
