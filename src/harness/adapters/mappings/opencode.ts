import type { HarnessMapping } from "../harnessMapping";

/**
 * opencode.
 *
 * The least certain of the three tables. opencode streams server-sent events whose payloads
 * are keyed by a `type` like `message.part.updated`, with the interesting content nested under
 * `properties.part`. The names below follow that shape, but the field paths have NOT been
 * checked against a real stream, and this vendor's format is the one I have the least direct
 * evidence for.
 *
 * That is deliberately not hidden. `verified: false` puts a warning in the diagnostics report,
 * and `tableDrivenAdapter` names the fields it actually received when a path misses — so the
 * first real run tells you exactly what to change here. Correcting this file is a data edit;
 * no component, adapter, or test has to change.
 */
export const opencodeMapping: HarnessMapping = {
  id: "opencode",
  label: "opencode",
  verified: false,

  // `message.part.updated` says only "a piece of the message changed" — what kind of piece it
  // is lives on `properties.part.type`. Mapping the line type alone sent reasoning down the
  // text path, where `properties.part.text` is absent, and the thinking was lost. So the part
  // refines the line; tool lifecycle stays keyed at line level and falls back to it.
  mode: "content-blocks",
  contentPath: "properties.part",
  blockTypePath: "type",
  blockTypeMap: {
    text: "text",
    reasoning: "reasoning",
    "step-start": "ignore",
    "step-finish": "ignore",
  },
  blockPaths: {
    text: "text",
    reasoning: "reasoning",
  },

  typePath: "type",
  typeMap: {
    "session.created": "run.start",
    "session.idle": "run.finish",
    "session.error": "run.error",

    "message.part.updated": "ignore",
    "message.updated": "ignore",
    "message.removed": "ignore",

    "tool.execute.start": "tool.start",
    "tool.execute.end": "tool.result",

    "storage.write": "ignore",
    "server.connected": "ignore",
    "installation.updated": "ignore",
  },

  paths: {
    toolCallId: ["properties.part.callID", "properties.callID", "properties.part.id"],
    toolName: ["properties.part.tool", "properties.tool"],
    args: ["properties.part.state.input", "properties.input"],
    result: ["properties.part.state.output", "properties.output"],
    status: ["properties.part.state.status", "properties.status"],
    text: ["properties.part.text", "properties.text"],
    reasoning: ["properties.part.reasoning", "properties.reasoning"],
    errorMessage: ["properties.error.message", "properties.message"],
  },

  diagnosticMarkers: ["storage.write", "installation"],
  extraAliases: {
    "read-file": ["read"],
    "write-file": ["write"],
    "edit-file": ["edit", "multiedit"],
    "run-command": ["bash"],
    search: ["grep", "glob", "list"],
    fetch: ["webfetch"],
    plan: ["todowrite", "todoread"],
  },
};
