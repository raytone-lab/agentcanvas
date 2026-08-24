/**
 * Single-state live demo.
 *
 * Given one standardized state (icon slot + standard code), builds a minimal
 * AgentUX event sequence that drives the EXISTING preview components into
 * exactly that state — so clicking a state card shows it live in the center /
 * right panel.
 */

import type { IconSlot } from "./icons";
import type { LegacyEvent } from "./legacyAdapter";

export function stateDemoEvents(slot: IconSlot, code: string, label: string): LegacyEvent[] {
  const out: LegacyEvent[] = [];
  let seq = 0;
  const push = (type: string, payload: Record<string, unknown>, messageId?: string) => {
    seq += 1;
    out.push({
      protocol: "agent-ux",
      version: "0.1",
      id: `demo_${seq}`,
      runId: "demo",
      messageId,
      seq,
      ts: 1760000000000 + seq,
      type,
      payload,
    });
  };
  const userMsg = (text: string) => {
    push("text.started", { textId: "u", role: "user", format: "plain" }, "mu");
    push("text.delta", { textId: "u", delta: text }, "mu");
    push("text.finished", { textId: "u" }, "mu");
  };
  const agentMsg = (text: string, finished = true) => {
    push("text.started", { textId: "a", role: "assistant", format: "markdown" }, "ma");
    push("text.delta", { textId: "a", delta: text }, "ma");
    if (finished) push("text.finished", { textId: "a" }, "ma");
  };
  const tool = (name: string, title: string) => push("tool.call.started", { toolCallId: "t", name, title });
  const artifact = (kind: string, title: string, content: string) => {
    push("artifact.created", { artifactId: "art", kind, title, mimeType: "text/plain" });
    push("artifact.delta", { artifactId: "art", format: "text", delta: content });
    push("artifact.finished", { artifactId: "art", status: "success", uri: "memory://art" });
    agentMsg(`Produced ${title}.`);
  };
  const errorType = code.split("·").pop()!.trim();

  push("run.started", { title: label });

  // --- tool lifecycle & permission ---
  if (slot === "tool.pending_approval" || slot.startsWith("permission.")) {
    userMsg("Inspect the project instructions before editing.");
    tool("shell.exec", "Read project instructions");
    push("tool.call.args.delta", { toolCallId: "t", delta: '{"cmd":"cat AGENTS.md"}', format: "json-fragment" });
    push("tool.call.awaiting_approval", { toolCallId: "t", prompt: "Allow reading AGENTS.md before editing?", argsPreview: { cmd: "cat AGENTS.md" } });
    return out;
  }
  if (slot === "tool.validate") {
    userMsg("Validate SearchInput behavior.");
    tool("validate", "Validating");
    push("tool.call.running", { toolCallId: "t", args: { cmd: "npm test -- SearchInput" } });
    push("tool.call.result", { toolCallId: "t", result: "SearchInput.test.tsx\n✓ validates short queries\n✓ shows loading state\nRunning final browser smoke check…", resultPreview: "2 passed · smoke running" });
    return out;
  }
  if (slot === "tool.in_progress" || slot === "source.native" || slot === "source.mcp") {
    userMsg(slot === "source.mcp" ? "Run the release checks." : "Write the dashboard file.");
    tool(slot === "source.mcp" ? "run_checks" : "write_file", slot === "source.mcp" ? "Run release checks · release-tools (MCP)" : "Write dashboard file");
    push("tool.call.running", { toolCallId: "t", args: { path: "/workspace/dashboard.md" } });
    return out;
  }
  if (slot === "tool.file_read") {
    userMsg("Inspect SearchInput.tsx.");
    tool("read_file", "Reading file");
    push("tool.call.running", { toolCallId: "t", args: { path: "src/SearchInput.tsx" } });
    push("tool.call.result", { toolCallId: "t", result: "import { useState } from \"react\";\n\nexport function SearchInput() {\n  const [query, setQuery] = useState(\"\");\n  return <input value={query} onChange={(event) => setQuery(event.target.value)} />;\n}", resultPreview: "7 lines · reading" });
    return out;
  }
  if (slot === "tool.file_modified" || slot === "tool.file_edit") {
    const editing = slot === "tool.file_edit";
    userMsg(editing ? "Edit SearchInput.tsx." : "Modify SearchInput.tsx.");
    tool(editing ? "edit_file" : "apply_patch", editing ? "Editing file" : "Modifying file");
    push("tool.call.running", { toolCallId: "t", args: { path: "src/SearchInput.tsx", old_string: "const [query, setQuery] = useState('');", new_string: "const [query, setQuery] = useState('');\nconst [loading, setLoading] = useState(false);" } });
    push("tool.call.result", { toolCallId: "t", result: { changed: true, insertions: 18, deletions: 4, status: "applying" }, resultPreview: "+18 -4 · applying" });
    return out;
  }
  if (slot === "tool.completed" || slot === "content.diff") {
    userMsg("Patch SearchInput.tsx.");
    tool("edit_file", "Patch SearchInput.tsx");
    push("tool.call.running", { toolCallId: "t", args: { path: "src/SearchInput.tsx", old_string: "const [q,setQ]=useState('');", new_string: "const [q,setQ]=useState('');\nconst [loading,setLoading]=useState(false);" } });
    push("tool.call.result", { toolCallId: "t", result: { changed: true, insertions: 1 }, resultPreview: "+1 -0" });
    push("tool.call.finished", { toolCallId: "t", status: "success" });
    return out;
  }
  if (slot === "tool.failed") {
    userMsg("Build the project.");
    tool("bash", "Build");
    push("tool.call.running", { toolCallId: "t", args: { cmd: "npm run build" } });
    push("tool.call.error", { toolCallId: "t", code: "build_failed", message: "Type error in App.tsx" });
    push("tool.call.finished", { toolCallId: "t", status: "error" });
    return out;
  }
  if (slot === "tool.cancelled") {
    userMsg("Run the build command.");
    tool("run_command", "Cancelled running command npm run build");
    push("tool.call.running", { toolCallId: "t", args: { cmd: "npm run build" } });
    push("tool.call.result", { toolCallId: "t", result: "> npm run build\nCancelling build process…", resultPreview: "build cancelled" });
    push("tool.call.finished", { toolCallId: "t", status: "cancelled" });
    return out;
  }
  if (slot === "tool.partial") {
    userMsg("Fetch release metadata.");
    push("tool.call.result", { toolCallId: "t", result: "200 OK · v1.8.0", resultPreview: "partial lifecycle" });
    push("tool.call.finished", { toolCallId: "t", status: "success" });
    return out;
  }
  if (slot === "content.terminal" && code.includes("run_command")) {
    userMsg("Run the SearchInput test suite.");
    tool("run_command", "Running command");
    push("tool.call.running", { toolCallId: "t", args: { cmd: "npm test -- SearchInput" } });
    push("tool.call.result", { toolCallId: "t", result: "> npm test -- SearchInput\nline 1: collecting tests\nline 2: running SearchInput.test.tsx\nline 3: validates short queries\nline 4: shows loading state\nline 5: checking browser smoke\nline 6: still running", resultPreview: "tests running" });
    return out;
  }
  if (slot === "content.terminal") {
    userMsg("Run the test suite.");
    tool("bash", "Run tests");
    push("tool.call.running", { toolCallId: "t", args: { cmd: "npm test" } });
    push("tool.call.result", { toolCallId: "t", result: "> npm test\n7 passed", resultPreview: "7 passed" });
    push("tool.call.finished", { toolCallId: "t", status: "success" });
    return out;
  }
  if (slot === "content.image" && code.includes("read_image")) {
    userMsg("Inspect the uploaded chart image.");
    tool("read_image", "Reading image");
    push("tool.call.running", { toolCallId: "t", args: { path: "assets/chart.png" } });
    push("tool.call.result", { toolCallId: "t", result: "image/png · 1280×720 · chart with support volume trend", resultPreview: "1280×720 image · reading" });
    return out;
  }
  if (slot === "tool.search") {
    userMsg("Find references to useSearch.");
    tool("search", "Searching");
    push("tool.call.running", { toolCallId: "t", args: { pattern: "useSearch" } });
    push("tool.call.result", { toolCallId: "t", result: "src/SearchInput.tsx:42\nsrc/hooks/useSearch.ts:10", resultPreview: "2 locations · searching" });
    return out;
  }
  if (slot === "content.location") {
    userMsg("Find references to useSearch.");
    tool("search", "Search references");
    push("tool.call.running", { toolCallId: "t", args: { pattern: "useSearch" } });
    push("tool.call.result", { toolCallId: "t", result: "src/SearchInput.tsx:42\nsrc/hooks/useSearch.ts:10", resultPreview: "2 locations" });
    push("tool.call.finished", { toolCallId: "t", status: "success" });
    return out;
  }

  // --- messages & thinking ---
  if (slot === "author.user") {
    userMsg("Summarize the attached support report.");
    return out;
  }
  if (slot === "author.agent") {
    userMsg("Compare the three proposals.");
    agentMsg("Proposal B has the best balance of cost and delivery risk.", !code.includes("delta"));
    return out;
  }
  if (slot === "content.thinking") {
    userMsg("Which proposal is best?");
    push("reasoning.status", { reasoningId: "r", status: "planning", label: "Thinking" });
    push("reasoning.delta", { reasoningId: "r", kind: "summary", delta: "Comparing price, delivery risk, and support coverage.", format: "plain" });
    if (!code.includes("delta")) push("reasoning.finished", { reasoningId: "r", collapsedByDefault: true });
    return out;
  }

  // --- session lifecycle (reflected in the header status pill) ---
  if (slot === "session.running") {
    userMsg("Generate the launch brief.");
    return out; // run.started → status running
  }
  if (slot === "session.idle") {
    userMsg("Generate the launch brief.");
    agentMsg("The launch brief is ready.");
    push("run.finished", { status: "success" });
    return out;
  }
  if (slot === "session.requires_action") {
    userMsg("Write the dashboard file.");
    tool("write_file", "Write dashboard file");
    push("tool.call.awaiting_approval", { toolCallId: "t", prompt: "Approve write?", argsPreview: {} });
    return out;
  }
  if (slot === "session.rescheduling" || slot === "incident.retrying") {
    userMsg("Generate the report.");
    push("run.error", { code: "model_rate_limited_error", message: "Rate limited; retrying automatically.", userMessage: "Rate limited; retrying automatically.", retryable: true, category: "retrying" });
    return out;
  }
  if (slot === "session.terminated" || slot === "incident.terminal") {
    userMsg("Continue.");
    push("run.error", { code: "runtime_resume_unrecoverable_error", message: "The session was terminated and is read-only.", userMessage: "The session was terminated and is read-only.", retryable: false, category: "terminal" });
    return out;
  }
  if (slot === "session.deleted") {
    push("run.error", { code: "session_deleted", message: "This session was deleted.", userMessage: "This session was deleted.", retryable: false, category: "terminal" });
    return out;
  }
  if (slot === "incident.exhausted") {
    userMsg("Retry the request.");
    push("run.error", { code: "model_request_failed_error", message: "Retries exhausted; the session stays usable.", userMessage: "Retries exhausted; the session stays usable.", retryable: false, category: "exhausted" });
    return out;
  }

  // --- session errors (provider domains) ---
  if (slot.startsWith("error.")) {
    userMsg("Run the turn.");
    push("run.error", { code: errorType, message: label, userMessage: label, retryable: slot !== "error.sandbox" });
    return out;
  }

  // --- runtime status / progress / notices → lifecycle step rows ---
  if (slot.startsWith("runtime.")) {
    const status =
      slot === "runtime.op_failed" || slot === "runtime.error"
        ? "error"
        : slot === "runtime.op_skipped"
          ? "skipped"
          : slot === "runtime.op" || slot === "runtime.booting" || slot === "runtime.recovering"
            ? "running"
            : "success";
    push("step.started", { stepId: "s", label, stepKind: "runtime", scope: { kind: "runtime" } });
    push("step.finished", { stepId: "s", status, summary: code });
    return out;
  }
  if (slot.startsWith("severity.")) {
    if (slot === "severity.error") {
      push("run.error", { code: "runtime_notice", message: label, userMessage: label, retryable: true });
    } else {
      push("step.started", { stepId: "s", label, stepKind: "runtime", scope: { kind: "runtime" } });
      push("step.finished", { stepId: "s", status: "success", summary: code });
    }
    return out;
  }
  if (slot === "surface.model_span") {
    push("step.started", { stepId: "s", label: "Model request", stepKind: "model", scope: { kind: "model" } });
    push("step.finished", { stepId: "s", status: "success", summary: "claude-sonnet · 1840ms · in 1820 / out 244" });
    return out;
  }
  if (slot === "surface.config") {
    push("step.started", { stepId: "s", label: "Configuration updated", stepKind: "config", scope: { kind: "config" } });
    push("step.finished", { stepId: "s", status: "success", summary: "tool_permission_mode, skill_refs" });
    return out;
  }
  if (slot === "surface.compaction") {
    push("step.started", { stepId: "s", label: "Context compacted", stepKind: "runtime", scope: { kind: "runtime" } });
    push("step.finished", { stepId: "s", status: "success", summary: "91842 → 28400 tokens" });
    return out;
  }
  if (slot === "surface.interrupt") {
    userMsg("Stop.");
    push("step.started", { stepId: "s", label: "Turn interrupted", stepKind: "session", scope: { kind: "session" } });
    push("step.finished", { stepId: "s", status: "success" });
    return out;
  }

  // --- render content types → artifact in the right (Output) panel ---
  if (slot === "content.text") {
    artifact("file", "summary.md", "# Summary\n- Login failures\n- Billing confusion\n- Delayed exports");
    return out;
  }
  if (slot === "content.image") {
    artifact("ui", "chart.png", "Rendered chart preview");
    return out;
  }
  if (slot === "content.audio") {
    artifact("file", "clip.mp3", "Audio attachment");
    return out;
  }
  if (slot === "content.resource") {
    artifact("file", "report.pdf", "Resource link · agentmatrix://file/fil_report");
    return out;
  }
  if (slot === "content.mcp") {
    userMsg("Run the release checks.");
    tool("run_checks", "Run release checks · release-tools (MCP)");
    push("tool.call.running", { toolCallId: "t", args: {} });
    push("tool.call.result", { toolCallId: "t", result: "All 28 checks passed.", resultPreview: "28 passed" });
    push("tool.call.finished", { toolCallId: "t", status: "success" });
    return out;
  }

  // fallback: describe the state
  agentMsg(`${label} — ${code}`);
  return out;
}
