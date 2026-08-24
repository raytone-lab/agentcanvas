import type { HarnessMapping } from "../harnessMapping";

/**
 * Claude Code (`claude -p --output-format stream-json`).
 *
 * This is the reason `mode: "content-blocks"` exists. One line carries an *array* of typed
 * content blocks:
 *
 *   {"type":"assistant","message":{"content":[{"type":"text",…},{"type":"tool_use",…}]}}
 *   {"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"…",…}]}}
 *
 * A dot path can reach `content.0.text` but not "every element", so a flat table would render
 * the first block of each line and silently discard the rest — a tool call following a
 * sentence would simply vanish. `blockTypeMap` maps each element instead.
 *
 * Tool results arrive on the *next* line as a `user` message, correlated by `tool_use_id`;
 * that is why `blockPaths.toolCallId` reads both `id` (on tool_use) and the adapter falls back
 * per block kind. Both spellings are covered by listing `tool_use_id` on the result block.
 *
 * NOT calibrated against a captured stream. Claude Code's tool names are capitalised
 * (`Read`, `Write`, `Bash`), which the admission layer's alias table already folds onto our
 * concepts — `normalizeName` lowercases before matching.
 */
export const claudeCodeMapping: HarnessMapping = {
  id: "claude",
  label: "Claude Code",
  verified: false,
  mode: "content-blocks",

  typePath: "type",
  typeMap: {
    system: "ignore",
    assistant: "text",
    user: "tool.result",
    result: "run.finish",
    error: "run.error",
  },

  contentPath: "message.content",
  blockTypePath: "type",
  blockTypeMap: {
    text: "text",
    thinking: "reasoning",
    redacted_thinking: "ignore",
    tool_use: "tool.start",
    tool_result: "tool.result",
  },
  blockPaths: {
    // `tool_use` carries `id`, the matching `tool_result` carries `tool_use_id`. Both are
    // listed so a result can be correlated back to its call; with one path it could not be.
    toolCallId: ["id", "tool_use_id"],
    toolName: "name",
    args: "input",
    text: "text",
    reasoning: "thinking",
    result: "content",
    // Claude Code reports failure as a boolean, not a status string.
    errorFlag: "is_error",
  },

  // The flat fallback, used for `system` / `result` lines that carry no content array.
  paths: {
    text: "result",
    errorMessage: "error",
  },

  diagnosticMarkers: ["system_reminder", "init"],
  extraAliases: {
    "read-file": ["Read", "NotebookRead"],
    "write-file": ["Write", "NotebookEdit"],
    "edit-file": ["Edit", "MultiEdit"],
    "run-command": ["Bash", "BashOutput", "KillShell"],
    search: ["Grep", "Glob"],
    fetch: ["WebFetch", "WebSearch"],
    plan: ["TodoWrite", "ExitPlanMode"],
  },
};
