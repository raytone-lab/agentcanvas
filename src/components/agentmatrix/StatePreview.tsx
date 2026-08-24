/**
 * State preview.
 *
 * Given a selected standardized state (icon slot + standard code), renders a
 * REAL standard component showing that exact state — with its swappable icon,
 * animation, and standard styling — live in the preview panel. Icon swaps and
 * theme changes reflect immediately because these are the same projector-driven
 * components an exported project ships with.
 */

import { StateIcon, type IconSlot } from "../../agentmatrix";
import type {
  ContentBlock,
  IncidentViewModel,
  MessageViewModel,
  RuntimeNoticeViewModel,
  RuntimeOperationViewModel,
  ThinkingViewModel,
  ToolCallViewModel,
} from "../../agentmatrix";
import { ContentBlocks } from "./ContentBlocks";
import { MessageRow } from "./MessageRow";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCallCard } from "./ToolCallCard";
import { IncidentCard, RuntimeNotice, RuntimeProgressRow } from "./SidePanels";

const NOW = "2026-08-03T10:00:00Z";

export function StatePreview({ slot, code, title }: { slot: IconSlot; code: string; title: string }) {
  return (
    <div className="am-state-preview-panel">
      <div className="am-spv-head">
        <span className="am-spv-title">{title}</span>
        <code className="am-spv-code">{code}</code>
      </div>
      <div className="am-spv-body">{renderState(slot, code, title)}</div>
    </div>
  );
}

function renderState(slot: IconSlot, code: string, title: string) {
  // --- Messages ---
  if (slot === "author.user") {
    return <MessageRow message={message("user", "Summarize the attached support report.", false)} />;
  }
  if (slot === "author.agent") {
    const streaming = code.includes("delta");
    return <MessageRow message={message("agent", "Proposal B has the best balance of cost and delivery risk.", streaming)} />;
  }

  // --- Thinking ---
  if (slot === "content.thinking") {
    return <ThinkingBlock thinking={thinking(code.includes("delta"))} />;
  }

  // --- Tool lifecycle / permission / trace / source / content ---
  if (
    slot.startsWith("tool.") ||
    slot.startsWith("permission.") ||
    slot.startsWith("source.") ||
    slot === "content.diff" ||
    slot === "content.terminal" ||
    (slot === "content.image" && code.includes("read_image")) ||
    slot === "content.location" ||
    slot === "content.mcp"
  ) {
    return <ToolCallCard tool={toolFor(slot, code, title)} onConfirm={() => {}} />;
  }

  // --- Incidents ---
  if (slot.startsWith("incident.")) {
    return <IncidentCard incident={incidentFor(slot)} />;
  }

  // --- Session lifecycle → status chip ---
  if (slot.startsWith("session.")) {
    return <SessionChip slot={slot} code={code} title={title} />;
  }

  // --- Runtime status/op → progress row; severity/notice ---
  if (slot === "runtime.op" || slot === "runtime.op_done" || slot === "runtime.op_failed" || slot === "runtime.op_skipped") {
    return <RuntimeProgressRow op={runtimeOp(slot)} />;
  }
  if (slot.startsWith("runtime.")) {
    return <SessionChip slot={slot} code={code} title={title} />;
  }
  if (slot.startsWith("severity.")) {
    return <RuntimeNotice notice={notice(slot)} />;
  }

  // --- Spans / config / compaction / interrupt → activity chip ---
  if (slot === "surface.model_span" || slot === "surface.config" || slot === "surface.compaction" || slot === "surface.interrupt") {
    return <SessionChip slot={slot} code={code} title={title} />;
  }

  // --- Render content types ---
  if (slot === "content.text") {
    return <ContentBlocks blocks={[{ type: "text", text: "# Summary\n- Login failures\n- Billing confusion\n- Delayed exports" }]} />;
  }
  if (slot === "content.image") {
    return <ContentBlocks blocks={[{ type: "image", mime_type: "image/png", uri: "agentmatrix://file/fil_chart" }] as ContentBlock[]} />;
  }
  if (slot === "content.audio") {
    return <ContentBlocks blocks={[{ type: "audio", mime_type: "audio/mpeg", uri: "agentmatrix://file/fil_clip" }] as ContentBlock[]} />;
  }
  if (slot === "content.resource") {
    return (
      <ContentBlocks
        blocks={[
          {
            type: "resource_link",
            uri: "agentmatrix://file/fil_report",
            name: "support-report.pdf",
            mime_type: "application/pdf",
            size: 482113,
          },
        ]}
      />
    );
  }

  return <div className="am-empty">No preview for this state.</div>;
}

// --- a small session/runtime/activity chip that honors the swappable icon ---
function SessionChip({ slot, code, title }: { slot: IconSlot; code: string; title: string }) {
  const anim = /running|rescheduling|booting|recovering|op$/.test(slot) ? "spin" : "none";
  const tone = toneFor(slot);
  return (
    <div className="am-spv-chip" data-tone={tone}>
      <span className="am-spv-chip-icon" data-anim={anim} data-tone={tone}>
        <StateIcon slot={slot} size={18} />
      </span>
      <div className="am-spv-chip-text">
        <strong>{title}</strong>
        <code>{code}</code>
      </div>
    </div>
  );
}

function toneFor(slot: IconSlot): string {
  if (/terminated|deleted|error|failed|terminal/.test(slot)) return "danger";
  if (/warning|rescheduling|requires_action|degraded|recovering/.test(slot)) return "warning";
  if (/ready|idle|completed|done|success/.test(slot)) return "success";
  return "info";
}

// --- sample view-model builders ---

function message(author: "user" | "agent", text: string, streaming: boolean): MessageViewModel {
  return {
    kind: "message",
    id: `m_${author}`,
    sequence: 1,
    author,
    blocks: [{ type: "text", text }],
    streaming,
    createdAt: NOW,
    usage: author === "agent" ? { input_tokens: 1420, output_tokens: 186, cache_read_input_tokens: 900 } : undefined,
  };
}

function thinking(streaming: boolean): ThinkingViewModel {
  return {
    kind: "thinking",
    id: "think",
    sequence: 1,
    blocks: [{ type: "text", text: "Comparing price, delivery risk, and support coverage across the three proposals." }],
    streaming,
    createdAt: NOW,
  };
}

function toolFor(slot: IconSlot, code: string, title: string): ToolCallViewModel {
  const base: ToolCallViewModel = {
    kind: "tool",
    id: "call_demo",
    sequence: 1,
    source: slot === "source.mcp" || slot === "content.mcp" ? "mcp" : "native",
    mcpServerName: slot === "source.mcp" || slot === "content.mcp" ? "release-tools" : undefined,
    namespace: "filesystem",
    name: "write_file",
    title: "Write dashboard file",
    toolKind: "edit",
    rawInput: { path: "/workspace/dashboard.md", content: "# Support dashboard" },
    lifecycle: "completed",
    content: [],
    locations: [{ path: "/workspace/dashboard.md", line: 1 }],
    createdAt: NOW,
    updatedAt: NOW,
    awaitingApproval: false,
  };

  if (slot === "tool.pending_approval" || slot === "permission.pending") {
    return {
      ...base,
      name: "shell.exec",
      title: actionTitle("approval", title),
      rawInput: { cmd: "cat AGENTS.md" },
      locations: [],
      lifecycle: "pending_approval",
      awaitingApproval: true,
      permission: { policy: "always_ask", decision: "pending", reason: "Allow reading AGENTS.md before editing?" },
    };
  }
  if (slot === "tool.file_read") {
    return {
      ...base,
      name: "read_file",
      title: actionTitle("read-file", title),
      rawInput: { path: "src/SearchInput.tsx" },
      lifecycle: "in_progress",
      useStatus: "in_progress",
      locations: [],
    };
  }
  if (slot === "content.image" && code.includes("read_image")) {
    return {
      ...base,
      name: "read_image",
      title: actionTitle("read-image", title),
      rawInput: { path: "assets/chart.png" },
      lifecycle: "in_progress",
      useStatus: "in_progress",
      locations: [],
    };
  }
  if (slot === "tool.file_modified" || slot === "tool.file_edit") {
    const editing = slot === "tool.file_edit";
    return {
      ...base,
      name: editing ? "edit_file" : "apply_patch",
      title: actionTitle(editing ? "edit-file" : "modify-file", title),
      rawInput: { path: "src/SearchInput.tsx" },
      lifecycle: "in_progress",
      useStatus: "in_progress",
      locations: [],
    };
  }
  if (slot === "tool.validate") {
    return {
      ...base,
      name: "validate",
      title: actionTitle("validate", title),
      rawInput: { cmd: "npm test -- SearchInput" },
      lifecycle: "in_progress",
      useStatus: "in_progress",
      locations: [],
    };
  }
  if (slot === "tool.search") {
    return {
      ...base,
      name: "search",
      title: actionTitle("search", title),
      rawInput: { pattern: "useSearch" },
      lifecycle: "in_progress",
      useStatus: "in_progress",
      locations: [],
    };
  }
  if (slot === "content.terminal" && code.includes("run_command")) {
    return {
      ...base,
      source: "native",
      mcpServerName: undefined,
      name: "run_command",
      title: actionTitle("run-command", title),
      rawInput: { cmd: "npm test -- SearchInput" },
      lifecycle: "in_progress",
      useStatus: "in_progress",
      locations: [],
    };
  }
  if (slot === "tool.in_progress" || slot === "source.native" || slot === "source.mcp") {
    return { ...base, lifecycle: "in_progress", useStatus: "in_progress", title: slot === "source.mcp" ? "Run release checks" : base.title };
  }
  if (slot === "tool.failed") {
    return { ...base, lifecycle: "failed", resultStatus: "failed", content: [{ type: "content", content: { type: "text", text: "Type error in App.tsx" } }] };
  }
  if (slot === "tool.cancelled" || slot === "permission.cancel") {
    return { ...base, lifecycle: "cancelled", decision: "cancel" };
  }
  if (slot === "tool.partial") {
    return { ...base, lifecycle: "partial", partialLifecycle: true, resultStatus: "completed", latencyMs: 318 };
  }
  if (slot === "permission.deny") {
    return { ...base, lifecycle: "cancelled", decision: "deny", denyMessage: "Do not overwrite the dashboard." };
  }
  if (slot === "permission.allow" || slot === "permission.allow_always") {
    return { ...base, lifecycle: "completed", resultStatus: "completed", decision: slot === "permission.allow_always" ? "allow_always" : "allow_once", latencyMs: 318, content: diffContent() };
  }
  if (slot === "content.diff") {
    return { ...base, lifecycle: "completed", resultStatus: "completed", latencyMs: 318, content: diffContent() };
  }
  if (slot === "content.terminal" || slot === "content.mcp") {
    return {
      ...base,
      source: "mcp",
      mcpServerName: "release-tools",
      name: "run_checks",
      title: "Run release checks",
      lifecycle: "completed",
      resultStatus: "completed",
      latencyMs: 4120,
      content: [
        { type: "terminal", terminal_id: "term_release_checks_1" },
        { type: "content", content: { type: "text", text: "All 28 checks passed." } },
      ],
    };
  }
  if (slot === "content.location") {
    return { ...base, lifecycle: "completed", resultStatus: "completed", locations: [{ path: "src/SearchInput.tsx", line: 42 }, { path: "src/hooks/useSearch.ts", line: 10 }] };
  }
  // trace / completed default
  return { ...base, lifecycle: "completed", resultStatus: "completed", latencyMs: 318, completionInferred: code.includes("inferred"), partialLifecycle: code.includes("partial"), content: diffContent() };
}

function actionTitle(
  action:
    | "approval"
    | "read-file"
    | "read-image"
    | "modify-file"
    | "edit-file"
    | "validate"
    | "search"
    | "run-command",
  localizedTitle: string,
): string {
  const zh = /[\u3400-\u9fff]/.test(localizedTitle);
  if (zh) {
    switch (action) {
      case "approval":
        return "需要权限";
      case "read-file":
        return "正在读取文件";
      case "read-image":
        return "正在读取图片";
      case "modify-file":
        return "正在修改文件";
      case "edit-file":
        return "正在编辑文件";
      case "validate":
        return "正在验证";
      case "search":
        return "正在搜索";
      case "run-command":
        return "正在运行命令";
    }
  }

  switch (action) {
    case "approval":
      return "Permission required";
    case "read-file":
      return "Reading file";
    case "read-image":
      return "Reading image";
    case "modify-file":
      return "Modifying file";
    case "edit-file":
      return "Editing file";
    case "validate":
      return "Validating";
    case "search":
      return "Searching";
    case "run-command":
      return "Running command";
  }
}

function diffContent(): ToolCallViewModel["content"] {
  return [{ type: "diff", path: "/workspace/dashboard.md", old_text: "", new_text: "# Support dashboard\n" }];
}

function incidentFor(slot: IconSlot): IncidentViewModel {
  if (slot === "incident.retrying") {
    return {
      id: "inc",
      sequence: 1,
      error: { type: "model_rate_limited_error", message: "The model provider is temporarily rate limited.", retry_status: { type: "retrying", deadline: "2026-08-03T10:00:20Z" } },
      recovery: "retrying",
      retryStatus: { type: "retrying", deadline: "2026-08-03T10:00:20Z" },
      deadline: "2026-08-03T10:00:20Z",
      composerLocked: true,
      createdAt: NOW,
      correlatedEventIds: [],
      resolved: false,
    };
  }
  if (slot === "incident.exhausted") {
    return {
      id: "inc",
      sequence: 1,
      error: { type: "model_request_failed_error", message: "The provider did not return a valid response after retries.", retry_status: { type: "exhausted" } },
      recovery: "exhausted",
      retryStatus: { type: "exhausted" },
      composerLocked: false,
      createdAt: NOW,
      correlatedEventIds: [],
      resolved: false,
    };
  }
  return {
    id: "inc",
    sequence: 1,
    error: { type: "runtime_resume_unrecoverable_error", message: "The previous sandbox can no longer be resumed.", retry_status: { type: "terminal" } },
    recovery: "terminal",
    retryStatus: { type: "terminal" },
    composerLocked: true,
    createdAt: NOW,
    correlatedEventIds: [],
    resolved: false,
  };
}

function runtimeOp(slot: IconSlot): RuntimeOperationViewModel {
  const status = slot === "runtime.op_done" ? "completed" : slot === "runtime.op_failed" ? "failed" : slot === "runtime.op_skipped" ? "skipped" : "running";
  return {
    operationId: "op_workspace_sync_1",
    operation: "workspace_sync",
    status,
    phase: "hydrate",
    itemsDone: status === "completed" ? 8 : 3,
    itemsTotal: 8,
    bytesDone: 3145728,
    bytesTotal: 8388608,
    elapsedMs: 1200,
    error: status === "failed" ? { code: "workspace_sync_failed", message: "The workspace could not be hydrated.", retryable: true } : undefined,
    sequence: 1,
    updatedAt: NOW,
  };
}

function notice(slot: IconSlot): RuntimeNoticeViewModel {
  const severity = slot === "severity.error" ? "error" : slot === "severity.warning" ? "warning" : "info";
  return {
    id: "note",
    sequence: 1,
    severity,
    code: "workspace_optional_resource_skipped",
    text: "One optional resource was unavailable and was skipped.",
    component: "resources",
    createdAt: NOW,
  };
}
