/**
 * Session-side surfaces: Activity, Incident, Runtime progress, Runtime notice,
 * and Diagnostics. These present lifecycle/audit facts and never reuse the
 * agent avatar.
 */

import { useEffect, useState } from "react";

import {
  StateIcon,
  errorDomainSlot,
  incidentSlot,
  runtimeOpSlot,
  runtimeStateSlot,
  severitySlot,
} from "../../agentmatrix";
import type {
  ActivityRowViewModel,
  DiagnosticEntry,
  IncidentViewModel,
  RuntimeNoticeViewModel,
  RuntimeOperationViewModel,
  RuntimeStatusViewModel,
  SessionViewModel,
} from "../../agentmatrix";

// --- Activity ---------------------------------------------------------------

export function ActivityPanel({ vm }: { vm: SessionViewModel }) {
  return (
    <div className="am-panel">
      <header className="am-panel-head">
        <StateIcon slot="surface.activity" size={14} />
        <span>Activity</span>
      </header>
      {vm.runtimeStatus ? <RuntimeStatusRow status={vm.runtimeStatus} /> : null}
      {vm.runtimeOperations.map((op) => (
        <RuntimeProgressRow key={op.operationId} op={op} />
      ))}
      <div className="am-activity-list">
        {vm.activity.length === 0 ? (
          <div className="am-empty">No lifecycle activity yet.</div>
        ) : (
          vm.activity.map((row) => <ActivityRow key={row.id} row={row} />)
        )}
      </div>
    </div>
  );
}

function ActivityRow({ row }: { row: ActivityRowViewModel }) {
  return (
    <div className="am-activity-row" data-tone={row.tone}>
      <span className="am-activity-dot" data-tone={row.tone} aria-hidden="true" />
      <div className="am-activity-main">
        <span className="am-activity-statement">{row.statement}</span>
        {row.detail ? <span className="am-activity-detail">{row.detail}</span> : null}
      </div>
      <span className="am-activity-kind">{row.eventType}</span>
    </div>
  );
}

// --- Runtime ----------------------------------------------------------------

function RuntimeStatusRow({ status }: { status: RuntimeStatusViewModel }) {
  return (
    <div className="am-runtime-status" data-state={status.state}>
      <StateIcon slot={runtimeStateSlot(status.state)} size={14} />
      <span className="am-runtime-state">{status.state}</span>
      <span className="am-runtime-reason">{status.reason.replace(/_/g, " ")}</span>
      {status.runtimeDriver ? <span className="am-runtime-driver">{status.runtimeDriver}</span> : null}
    </div>
  );
}

export function RuntimeProgressRow({ op }: { op: RuntimeOperationViewModel }) {
  const hasItemsTotal = op.itemsTotal != null && op.itemsTotal > 0;
  const hasBytesTotal = op.bytesTotal != null && op.bytesTotal > 0;
  const pct = hasItemsTotal
    ? Math.round(((op.itemsDone ?? 0) / (op.itemsTotal as number)) * 100)
    : hasBytesTotal
      ? Math.round(((op.bytesDone ?? 0) / (op.bytesTotal as number)) * 100)
      : null;
  const indeterminate = op.status === "running" && pct == null;

  return (
    <div className="am-op" data-status={op.status}>
      <div className="am-op-head">
        <StateIcon slot={runtimeOpSlot(op.status)} size={13} />
        <span className="am-op-name">{op.operation.replace(/_/g, " ")}</span>
        {op.phase ? <span className="am-op-phase">{op.phase}</span> : null}
        <span className="am-op-count">
          {hasItemsTotal
            ? `${op.itemsDone ?? 0}/${op.itemsTotal}`
            : hasBytesTotal
              ? `${formatBytes(op.bytesDone ?? 0)}/${formatBytes(op.bytesTotal as number)}`
              : op.status}
        </span>
      </div>
      <div className="am-op-bar" data-indeterminate={indeterminate}>
        <span style={pct != null ? { width: `${pct}%` } : undefined} />
      </div>
      {op.error ? <div className="am-op-error">{op.error.message}</div> : null}
    </div>
  );
}

export function RuntimeNotice({ notice }: { notice: RuntimeNoticeViewModel }) {
  return (
    <div className="am-notice" data-severity={notice.severity}>
      <StateIcon slot={severitySlot(notice.severity)} size={14} />
      <div className="am-notice-body">
        <span className="am-notice-text">{notice.text}</span>
        <span className="am-notice-code">{notice.code}</span>
      </div>
    </div>
  );
}

// --- Incident ---------------------------------------------------------------

export function IncidentCard({
  incident,
  compact = false,
}: {
  incident: IncidentViewModel;
  compact?: boolean;
}) {
  return (
    <div className="am-incident" data-recovery={incident.recovery} data-compact={compact}>
      <div className="am-incident-head">
        <StateIcon slot={errorDomainSlot(incident.error.type)} size={15} className="am-incident-domain" />
        <span className="am-incident-title">{humanizeErrorType(incident.error.type)}</span>
        <span className="am-incident-recovery" data-recovery={incident.recovery}>
          <StateIcon slot={incidentSlot(incident.recovery)} size={12} />
          {incident.recovery}
        </span>
      </div>
      <p className="am-incident-message">{incident.error.message}</p>
      {incident.error.metric ? (
        <div className="am-incident-facts">
          <span>{incident.error.metric}</span>
          <span>
            {incident.error.used}/{incident.error.cap}
          </span>
        </div>
      ) : null}
      {incident.recovery === "retrying" && incident.deadline ? (
        <Countdown deadline={incident.deadline} />
      ) : null}
      {incident.error.recovery_action?.url ? (
        <a
          className="am-incident-cta"
          href={incident.error.recovery_action.url}
          target="_blank"
          rel="noreferrer noopener"
        >
          {incident.error.recovery_action.label ?? "Open"}
        </a>
      ) : null}
      {incident.resolved ? <span className="am-incident-resolved">resolved</span> : null}
    </div>
  );
}

function Countdown({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState(() => secondsUntil(deadline));
  useEffect(() => {
    const id = setInterval(() => setRemaining(secondsUntil(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);
  if (remaining <= 0) return <div className="am-countdown">Retrying now…</div>;
  return <div className="am-countdown">Retrying in {remaining}s (server deadline)</div>;
}

// --- Diagnostics ------------------------------------------------------------

export function DiagnosticsPanel({ vm }: { vm: SessionViewModel }) {
  return (
    <div className="am-panel">
      <header className="am-panel-head">
        <StateIcon slot="surface.diagnostics" size={14} />
        <span>Diagnostics</span>
        <span className="am-panel-count">{vm.diagnostics.length}</span>
      </header>
      {vm.modelSpans.length ? (
        <div className="am-diag-group">
          <div className="am-diag-group-title">Model spans</div>
          {vm.modelSpans.map((span) => (
            <div className="am-span" key={span.startId} data-unmatched={span.unmatched}>
              <StateIcon slot="surface.model_span" size={12} />
              <span className="am-span-model">{span.model ?? span.startId}</span>
              {span.usage?.input_tokens != null ? (
                <span className="am-span-usage">
                  in {span.usage.input_tokens}
                  {span.usage.output_tokens != null ? ` · out ${span.usage.output_tokens}` : ""}
                </span>
              ) : null}
              {span.latencyMs != null ? <span className="am-span-latency">{span.latencyMs}ms</span> : null}
              {span.unmatched ? <span className="am-span-unmatched">unmatched</span> : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className="am-diag-list">
        {vm.diagnostics.map((entry) => (
          <DiagnosticRow key={entry.eventId} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function DiagnosticRow({ entry }: { entry: DiagnosticEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="am-diag-row" data-unknown={entry.unknown}>
      <button type="button" className="am-diag-row-head" onClick={() => setOpen((v) => !v)}>
        <span className="am-diag-seq">#{entry.sequence}</span>
        <span className="am-diag-type">{entry.type}</span>
        {entry.unknown ? <span className="am-diag-unknown">unknown</span> : null}
      </button>
      {open ? <pre className="am-diag-raw">{JSON.stringify(entry.raw, null, 2)}</pre> : null}
    </div>
  );
}

// --- helpers ----------------------------------------------------------------

function humanizeErrorType(type: string): string {
  return type
    .replace(/_error$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function secondsUntil(deadline: string): number {
  const ts = Date.parse(deadline);
  if (Number.isNaN(ts)) return 0;
  return Math.max(0, Math.round((ts - Date.now()) / 1000));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
