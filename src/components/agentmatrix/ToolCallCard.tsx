/**
 * ToolCall card. One card spans use, permission, confirmation, execution, and
 * result. It stays usable when either the use or the result half is missing
 * (partial lifecycle). Raw input/output live behind diagnostic disclosure and
 * are never parsed to infer risk.
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { StateIcon, toolLifecycleSlot, type IconSlot } from "../../agentmatrix";
import type { ToolCallContent, ToolCallViewModel } from "../../agentmatrix";
import { ContentBlocks } from "./ContentBlocks";

export function ToolCallCard({
  tool,
  onConfirm,
}: {
  tool: ToolCallViewModel;
  onConfirm?: (
    toolCallId: string,
    result: "allow_once" | "allow_always" | "deny" | "cancel",
  ) => void;
}) {
  const [open, setOpen] = useState(
    tool.awaitingApproval || tool.lifecycle === "in_progress" || tool.content.length > 0,
  );
  const [diagOpen, setDiagOpen] = useState(false);

  return (
    <section className="am-tool" data-lifecycle={tool.lifecycle} data-source={tool.source}>
      <button
        type="button"
        className="am-tool-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="am-tool-status" data-lifecycle={tool.lifecycle} aria-hidden="true">
          <StateIcon slot={toolHeaderSlot(tool)} size={15} />
        </span>
        <span className="am-tool-title">{tool.title ?? tool.name}</span>
        {tool.source === "mcp" ? (
          <span className="am-tool-mcp">
            <StateIcon slot="content.mcp" size={12} />
            {tool.mcpServerName ?? "mcp"}
          </span>
        ) : null}
        <span className="am-tool-badge" data-lifecycle={tool.lifecycle}>
          {lifecycleLabel(tool)}
        </span>
        {tool.latencyMs != null ? (
          <span className="am-tool-latency">{tool.latencyMs}ms</span>
        ) : null}
        <ChevronDown size={14} className="am-chevron" data-open={open} />
      </button>

      {tool.awaitingApproval && onConfirm ? (
        <ApprovalActions tool={tool} onConfirm={onConfirm} />
      ) : null}

      {open ? (
        <div className="am-tool-body">
          {tool.partialLifecycle ? (
            <div className="am-trace-hint">Partial lifecycle — the matching tool-use event is missing.</div>
          ) : null}
          {tool.completionInferred ? (
            <div className="am-trace-hint">Completion inferred by an adapter.</div>
          ) : null}
          {tool.denyMessage ? (
            <div className="am-deny-reason">Denied: {tool.denyMessage}</div>
          ) : null}
          {tool.content.map((c, i) => (
            <ToolContentView key={i} content={c} />
          ))}
          {tool.locations.length ? (
            <div className="am-tool-locations">
              {tool.locations.map((loc, i) => (
                <span className="am-location" key={i}>
                  {loc.path}
                  {loc.line != null ? `:${loc.line}` : ""}
                </span>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className="am-diag-toggle"
            onClick={() => setDiagOpen((v) => !v)}
            aria-expanded={diagOpen}
          >
            {diagOpen ? "Hide" : "Show"} raw input / output
          </button>
          {diagOpen ? (
            <div className="am-diag">
              <pre>{safeJson({ raw_input: tool.rawInput, raw_output: tool.rawOutput })}</pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ToolContentView({ content }: { content: ToolCallContent }) {
  if (content.type === "diff") {
    const oldText = content.old_text ?? "";
    const newText = content.new_text ?? "";
    return (
      <div className="am-diff">
        <div className="am-diff-head">
          <StateIcon slot="content.diff" size={13} />
          <span>{content.path}</span>
          {!oldText ? <span className="am-diff-tag am-diff-new">new file</span> : null}
          {!newText ? <span className="am-diff-tag am-diff-del">deleted</span> : null}
        </div>
        <pre className="am-diff-body">
          {oldText
            ? oldText.split("\n").map((l, i) => (
                <span className="am-diff-line am-diff-minus" key={`o${i}`}>
                  - {l}
                </span>
              ))
            : null}
          {newText
            ? newText.split("\n").map((l, i) => (
                <span className="am-diff-line am-diff-plus" key={`n${i}`}>
                  + {l}
                </span>
              ))
            : null}
        </pre>
      </div>
    );
  }
  if (content.type === "terminal") {
    return (
      <div className="am-terminal-ref">
        <StateIcon slot="content.terminal" size={13} />
        <span>Terminal session</span>
        <code>{content.terminal_id}</code>
      </div>
    );
  }
  // ordinary content wraps a ContentBlock
  return <ContentBlocks blocks={[content.content]} />;
}

function ApprovalActions({
  tool,
  onConfirm,
}: {
  tool: ToolCallViewModel;
  onConfirm: (
    toolCallId: string,
    result: "allow_once" | "allow_always" | "deny" | "cancel",
  ) => void;
}) {
  const eligibleAlways = tool.permission?.policy === "always_ask" && tool.source === "native";
  return (
    <div className="am-approval" role="group" aria-label="Tool approval">
      <div className="am-approval-copy">
        <StateIcon slot="permission.pending" size={14} />
        <span>{tool.permission?.reason ?? "This tool call needs your approval."}</span>
      </div>
      <div className="am-approval-actions">
        <button type="button" data-action="allow" onClick={() => onConfirm(tool.id, "allow_once")}>
          Allow once
        </button>
        {eligibleAlways ? (
          <button
            type="button"
            data-action="always"
            onClick={() => onConfirm(tool.id, "allow_always")}
          >
            Allow always
          </button>
        ) : null}
        <button type="button" data-action="deny" onClick={() => onConfirm(tool.id, "deny")}>
          Deny
        </button>
        <button type="button" data-action="cancel" onClick={() => onConfirm(tool.id, "cancel")}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function toolHeaderSlot(tool: ToolCallViewModel): IconSlot {
  if (tool.lifecycle !== "in_progress") {
    return toolLifecycleSlot(tool.lifecycle);
  }

  const text = `${tool.name} ${tool.title ?? ""} ${tool.toolKind ?? ""}`.toLowerCase();
  if (/read[_-]?image|image/.test(text)) return "content.image";
  if (/read[_-]?file|open[_-]?file|scan[_-]?file/.test(text)) return "tool.file_read";
  if (/edit[_-]?file/.test(text)) return "tool.file_edit";
  if (/validate|test|check|verify/.test(text)) return "tool.validate";
  if (/search|grep|ripgrep|rg/.test(text)) return "tool.search";
  if (/apply[_-]?patch|modify|write[_-]?file|patch/.test(text)) return "tool.file_modified";
  if (/run[_-]?command|terminal|bash|shell/.test(text)) return "content.terminal";
  return "tool.in_progress";
}

function lifecycleLabel(tool: ToolCallViewModel): string {
  switch (tool.lifecycle) {
    case "pending_approval":
      return "Needs approval";
    case "in_progress":
      return "Running";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "partial":
      return "Completed (partial)";
    default:
      return tool.lifecycle;
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[unserializable]";
  }
}
