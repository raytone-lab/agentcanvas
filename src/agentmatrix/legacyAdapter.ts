/**
 * AgentMatrix → AgentUX adapter.
 *
 * Decomposes the standardized AgentMatrix Session Events into the AgentUX wire
 * events that AgentCanvas's *existing* component layer already renders
 * (ChatFrame messages, ReasoningBlock, ToolCallCard, OutputFrame artifacts,
 * step rows, error blocks). This is how the standard is projected into the
 * current componentized preview — no new UI surface.
 *
 * Each AgentMatrix event kind maps to one of the existing preset categories:
 *   - user/agent messages  -> Conversation (text.* role user/assistant)
 *   - thinking             -> Thinking (reasoning.*)
 *   - tool_use/tool_result -> Tool call card (tool.call.*)
 *   - tool_result diff/code -> Output (artifact.* when a result carries content)
 *   - session/runtime/span -> lifecycle step rows (step.*)
 *   - session.error        -> error block (run.error)
 */

import type {
  AgentMessagePayload,
  AgentThinkingPayload,
  AnyDurableEvent,
  ContentBlock,
  ContextCompactedPayload,
  ModelRequestStartPayload,
  RuntimeMessagePayload,
  RuntimeProgressPayload,
  RuntimeStatusPayload,
  SessionErrorPayload,
  SessionStatusIdlePayload,
  SessionStatusTerminatedPayload,
  SessionUpdatedPayload,
  ToolCallContent,
  ToolResultPayload,
  ToolUsePayload,
  UserMessagePayload,
} from "./protocol";
import { isMcpType } from "./protocol";

/** Minimal AgentUX event shape (matches @agent-ux/protocol AgentUXEvent). */
export type LegacyEvent = {
  protocol: "agent-ux";
  version: "0.1";
  id: string;
  runId: string;
  messageId?: string;
  seq: number;
  ts: number;
  type: string;
  payload: Record<string, unknown>;
};

export type AdapterOptions = { title?: string; runId?: string };

export function toAgentUXEvents(
  events: readonly AnyDurableEvent[],
  options: AdapterOptions = {},
): LegacyEvent[] {
  const runId = options.runId ?? "agentmatrix_run";
  const sorted = [...events].sort((a, b) => a.sequence - b.sequence);
  const out: LegacyEvent[] = [];
  let seq = 0;
  const baseTs = 1760000000000;

  const push = (type: string, payload: Record<string, unknown>, messageId?: string) => {
    seq += 1;
    out.push({
      protocol: "agent-ux",
      version: "0.1",
      id: `am_${type}_${seq}`,
      runId,
      messageId,
      seq,
      ts: baseTs + seq,
      type,
      payload,
    });
  };

  push("run.started", { title: options.title ?? "AgentMatrix session" });

  let terminal = false;

  for (const ev of sorted) {
    switch (ev.type) {
      case "user.message": {
        emitText(push, `u_${ev.sequence}`, "user", messageText((ev.payload as UserMessagePayload).content));
        break;
      }
      case "agent.message": {
        emitText(push, `a_${ev.sequence}`, "assistant", messageText((ev.payload as AgentMessagePayload).content));
        break;
      }
      case "agent.thinking": {
        const rid = `rsn_${ev.sequence}`;
        push("reasoning.status", { reasoningId: rid, status: "planning", label: "Thinking" });
        push("reasoning.delta", {
          reasoningId: rid,
          kind: "summary",
          delta: messageText((ev.payload as AgentThinkingPayload).content),
          format: "plain",
        });
        push("reasoning.finished", { reasoningId: rid, collapsedByDefault: true });
        break;
      }
      case "agent.tool_use":
      case "agent.mcp_tool_use": {
        const p = ev.payload as ToolUsePayload;
        const mcp = isMcpType(ev.type);
        const title = mcp && p.mcp_server_name ? `${p.title ?? p.name} · ${p.mcp_server_name} (MCP)` : p.title ?? p.name;
        const pending = p.evaluated_permission?.decision === "pending" || p.status === "pending";
        push("tool.call.started", {
          toolCallId: p.tool_call_id,
          name: p.name,
          title,
          ...(pending ? { safety: "needs_approval" } : {}),
        });
        if (p.raw_input !== undefined) {
          push("tool.call.args.delta", {
            toolCallId: p.tool_call_id,
            delta: safeJson(p.raw_input),
            format: "json-fragment",
          });
        }
        if (pending) {
          push("tool.call.awaiting_approval", {
            toolCallId: p.tool_call_id,
            prompt: p.evaluated_permission?.reason ?? `Approve ${p.name}?`,
            argsPreview: p.raw_input,
          });
        } else {
          push("tool.call.running", { toolCallId: p.tool_call_id, args: p.raw_input });
        }
        break;
      }
      case "user.tool_confirmation": {
        const p = ev.payload as { tool_call_id: string; result: string; deny_message?: string };
        if (p.result === "allow_once" || p.result === "allow_always") {
          push("tool.call.running", { toolCallId: p.tool_call_id, args: {} });
        } else if (p.result === "deny") {
          push("tool.call.error", {
            toolCallId: p.tool_call_id,
            code: "denied",
            message: p.deny_message ?? "Denied by user",
          });
          push("tool.call.finished", { toolCallId: p.tool_call_id, status: "cancelled" });
        } else {
          push("tool.call.finished", { toolCallId: p.tool_call_id, status: "cancelled" });
        }
        break;
      }
      case "agent.tool_result":
      case "agent.mcp_tool_result": {
        const p = ev.payload as ToolResultPayload;
        if (p.partial_lifecycle) {
          push("tool.call.started", {
            toolCallId: p.tool_call_id,
            name: p.name ?? "tool",
            title: p.title ?? p.name ?? "tool",
          });
        }
        const display = toolResultDisplay(p.content);
        if (p.status === "failed") {
          push("tool.call.error", {
            toolCallId: p.tool_call_id,
            code: "tool_failed",
            message: display || "Tool failed",
          });
          push("tool.call.finished", { toolCallId: p.tool_call_id, status: "error" });
        } else if (p.status === "cancelled") {
          push("tool.call.finished", { toolCallId: p.tool_call_id, status: "cancelled" });
        } else {
          push("tool.call.result", {
            toolCallId: p.tool_call_id,
            result: display || { status: p.status },
            resultPreview: p.latency_ms != null ? `${p.latency_ms}ms` : p.status,
          });
          push("tool.call.finished", { toolCallId: p.tool_call_id, status: "success" });
          // A diff/content result also feeds the Output panel as an artifact.
          const diff = p.content?.find((c): c is Extract<ToolCallContent, { type: "diff" }> => c.type === "diff");
          if (diff) {
            const aid = `art_${p.tool_call_id}`;
            push("artifact.created", {
              artifactId: aid,
              kind: "code",
              title: diff.path.split("/").pop() ?? diff.path,
              mimeType: "text/plain",
            });
            push("artifact.delta", { artifactId: aid, format: "text", delta: diff.new_text ?? diff.old_text ?? "" });
            push("artifact.finished", { artifactId: aid, status: "success", uri: `memory://${aid}` });
          }
        }
        break;
      }
      case "session.error": {
        const p = ev.payload as SessionErrorPayload;
        push("run.error", {
          code: p.error.type,
          message: p.error.message,
          userMessage: p.error.message,
          retryable: p.error.retry_status.type !== "terminal",
        });
        break;
      }
      case "session.status_idle": {
        const p = ev.payload as SessionStatusIdlePayload;
        if (p.stop_reason.type === "end_turn") {
          push("run.finished", { status: "success" });
          terminal = true;
        } else if (p.stop_reason.type === "retries_exhausted") {
          push("run.error", { code: "retries_exhausted", message: "Retries exhausted", retryable: false });
          terminal = true;
        }
        break;
      }
      case "session.status_terminated": {
        const p = ev.payload as SessionStatusTerminatedPayload;
        push("run.error", {
          code: "session_terminated",
          message: "Session terminated",
          userMessage: "Session terminated",
          retryable: false,
        });
        void p;
        terminal = true;
        break;
      }
      case "session.deleted": {
        emitStep(push, `del_${ev.sequence}`, "Session deleted", "session", "error");
        break;
      }
      case "session.status_rescheduled": {
        emitStep(push, `resched_${ev.sequence}`, "Automatic retry scheduled", "session", "running");
        break;
      }
      case "session.updated": {
        const p = ev.payload as SessionUpdatedPayload;
        emitStep(
          push,
          `cfg_${ev.sequence}`,
          `Config updated (rev ${p.agent_config_revision})`,
          "config",
          "success",
          (p.changed_fields ?? []).join(", "),
        );
        break;
      }
      case "agent.context_compacted": {
        const p = ev.payload as ContextCompactedPayload;
        const summary =
          p.pre_compaction_tokens != null && p.post_compaction_tokens != null
            ? `${p.pre_compaction_tokens} → ${p.post_compaction_tokens} tokens`
            : undefined;
        emitStep(push, `compact_${ev.sequence}`, "Context compacted", "runtime", "success", summary);
        break;
      }
      case "runtime.status": {
        const p = ev.payload as RuntimeStatusPayload;
        emitStep(
          push,
          `rt_${ev.sequence}`,
          `Runtime ${p.state}`,
          "runtime",
          p.state === "ready" ? "success" : p.state === "error" ? "error" : "running",
          p.reason.replace(/_/g, " "),
        );
        break;
      }
      case "runtime.progress": {
        const p = ev.payload as RuntimeProgressPayload;
        const summary =
          p.items_total != null
            ? `${p.items_done ?? 0}/${p.items_total}`
            : p.bytes_total != null
              ? `${Math.round(((p.bytes_done ?? 0) / p.bytes_total) * 100)}%`
              : p.phase;
        emitStep(
          push,
          `op_${ev.sequence}`,
          p.operation.replace(/_/g, " "),
          "runtime",
          p.status === "completed" ? "success" : p.status === "failed" ? "error" : "running",
          summary,
        );
        break;
      }
      case "runtime.message": {
        const p = ev.payload as RuntimeMessagePayload;
        const text = p.content.map((c) => c.text).join(" ");
        if (p.severity === "error") {
          push("run.error", { code: p.code, message: text, userMessage: text, retryable: true });
        } else {
          emitStep(push, `note_${ev.sequence}`, text || p.code, "runtime", p.severity === "warning" ? "warning" : "info");
        }
        break;
      }
      case "span.model_request_start": {
        const p = ev.payload as ModelRequestStartPayload;
        emitStep(push, `span_${ev.sequence}`, `Model ${p.model}`, "model", "success", p.provider);
        break;
      }
      default:
        // status_running and span end carry no distinct legacy row.
        break;
    }
  }

  if (!terminal) push("run.finished", { status: "success" });
  return out;
}

// --- helpers ----------------------------------------------------------------

function emitText(
  push: (type: string, payload: Record<string, unknown>, messageId?: string) => void,
  id: string,
  role: "user" | "assistant",
  text: string,
): void {
  const messageId = `msg_${id}`;
  push("text.started", { textId: id, role, format: role === "assistant" ? "markdown" : "plain" }, messageId);
  push("text.delta", { textId: id, delta: text }, messageId);
  push("text.finished", { textId: id }, messageId);
}

function emitStep(
  push: (type: string, payload: Record<string, unknown>) => void,
  id: string,
  label: string,
  scopeKind: string,
  status: string,
  summary?: string,
): void {
  push("step.started", { stepId: id, label, stepKind: scopeKind, scope: { kind: scopeKind } });
  push("step.finished", { stepId: id, status, ...(summary ? { summary } : {}) });
}

function messageText(blocks: ContentBlock[] | undefined): string {
  if (!blocks) return "";
  return blocks
    .map((b) => {
      if (b.type === "text") return b.text;
      if (b.type === "resource_link") return `📎 ${b.name}`;
      if (b.type === "resource") return b.resource.text ?? `📎 ${b.resource.uri}`;
      if (b.type === "image") return "🖼️ image";
      if (b.type === "audio") return "🔊 audio";
      return "";
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function toolResultDisplay(content: ToolCallContent[] | undefined): string {
  if (!content?.length) return "";
  const parts: string[] = [];
  for (const c of content) {
    if (c.type === "diff") {
      const head = `--- ${c.path}\n+++ ${c.path}`;
      const oldLines = (c.old_text ?? "").split("\n").filter(Boolean).map((l) => `- ${l}`);
      const newLines = (c.new_text ?? "").split("\n").filter(Boolean).map((l) => `+ ${l}`);
      parts.push([head, ...oldLines, ...newLines].join("\n"));
    } else if (c.type === "terminal") {
      parts.push(`$ terminal ${c.terminal_id}`);
    } else if (c.type === "content") {
      const inner = c.content;
      if (inner.type === "text") parts.push(inner.text);
      else if (inner.type === "resource_link") parts.push(inner.name);
    }
  }
  return parts.join("\n");
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
