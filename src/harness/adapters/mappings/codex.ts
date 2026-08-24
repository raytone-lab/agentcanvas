import type { HarnessMapping } from "../harnessMapping";

/**
 * Codex CLI (`codex exec --json`).
 *
 * A flat JSONL stream: each line is `{ id, msg: { type, … } }`, so the discriminator and every
 * field are reachable by a dot path.
 *
 * Codex reports a shell command as an argv array (`["bash","-lc","ls"]`) and does not name the
 * tool — `command` covers both: the adapter falls back to `run_command` when a command is
 * present but a name is not.
 *
 * NOT calibrated against a captured stream. Written from the published event names; field
 * paths may differ in the version you run. A wrong path shows up in the diagnostics report
 * with the fields that were actually present, so one real run is enough to correct it.
 */
export const codexMapping: HarnessMapping = {
  id: "codex",
  label: "Codex CLI",
  verified: false,
  mode: "flat",

  typePath: "msg.type",
  typeMap: {
    task_started: "run.start",
    task_complete: "run.finish",
    error: "run.error",
    stream_error: "run.error",

    agent_message: "text",
    agent_message_delta: "text",
    agent_reasoning: "reasoning",
    agent_reasoning_delta: "reasoning",
    agent_reasoning_section_break: "ignore",

    exec_command_begin: "tool.start",
    exec_command_end: "tool.result",
    exec_command_output_delta: "ignore",

    patch_apply_begin: "tool.start",
    patch_apply_end: "tool.result",

    mcp_tool_call_begin: "tool.start",
    mcp_tool_call_end: "tool.result",

    // Bookkeeping Codex emits alongside the conversation.
    token_count: "ignore",
    session_configured: "ignore",
    turn_diff: "ignore",
    background_event: "ignore",
    plan_update: "ignore",
    exec_approval_request: "ignore",
    apply_patch_approval_request: "ignore",
  },

  paths: {
    toolCallId: "msg.call_id",
    toolName: "msg.invocation.tool",
    command: "msg.command",
    args: "msg.invocation.arguments",
    result: "msg.stdout",
    resultPreview: "msg.formatted_output",
    status: "msg.exit_code",
    text: "msg.message",
    reasoning: "msg.text",
    errorMessage: "msg.message",
  },

  diagnosticMarkers: ["token_count", "session_configured", "turn_diff"],
  extraAliases: {
    "edit-file": ["patch_apply", "apply_patch"],
    "run-command": ["exec_command"],
  },
};
