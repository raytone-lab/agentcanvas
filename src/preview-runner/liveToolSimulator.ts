/**
 * Simulated results for the tools a live model is allowed to request.
 *
 * Live LLM preview advertises `LIVE_MODEL_TOOLSET` so the model actually emits `tool_calls`,
 * but nothing here touches the filesystem or spawns a process — a configurator that executed
 * model-authored shell commands from its dev server would be a remote code execution surface,
 * and the export contract says the exported scaffold does not run tools through hidden adapters.
 *
 * What this file exists for is the other half of that trade-off. Without a result the tool card
 * could only ever reach `awaiting_approval` and then terminate as `cancelled`, so the
 * `running`, `result` and `error` states a user composed in the configurator were unreachable
 * in a live session — the styles were built and tested, but a real key never exercised them.
 * These outcomes walk the card through its full state machine with data shaped like the replay
 * fixtures, and label themselves as simulated so the card is not claiming the work happened.
 *
 * Strings are authored in English on purpose: `i18n/previewLocalization.ts` localizes the
 * preview by looking English source text up in a dictionary, so a Chinese string here would
 * never be translated and would leak into an English preview.
 */
import { resolveToolConcept, type ToolConcept } from "../runtime/eventNormalizer";

export type SimulatedToolOutcome =
  | { kind: "result"; result: unknown; resultPreview: string }
  | {
      kind: "error";
      code: string;
      retryable: boolean;
      userMessage: string;
      developerMessage: string;
    };

export type SimulateLiveToolCallInput = {
  name: string;
  /** Parsed tool arguments, or `undefined` when the model's arguments were not valid JSON. */
  args: Record<string, unknown> | undefined;
};

const SIMULATED_SUFFIX = "simulated live result";

function readString(args: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = args?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Args that failed to parse are a real failure, not a simulated one: the model produced
 * arguments this runner could not read, and the error card is the honest rendering of that.
 */
function invalidArgsOutcome(name: string): SimulatedToolOutcome {
  return {
    kind: "error",
    code: "LIVE_TOOL_ARGS_INVALID",
    retryable: true,
    userMessage: "The model sent tool arguments that could not be read.",
    developerMessage: `Arguments for ${name} were not valid JSON, so no simulated result was produced.`,
  };
}

/**
 * A tool outside `LIVE_MODEL_TOOLSET`. Reaching this means the model invented a name, so there
 * is no simulated behavior to stand in for it — surfacing that beats inventing a success.
 */
function unsupportedToolOutcome(name: string): SimulatedToolOutcome {
  return {
    kind: "error",
    code: "LIVE_TOOL_UNSUPPORTED",
    retryable: false,
    userMessage: "This tool has no simulated result in live preview.",
    developerMessage: `${name} is outside the advertised live toolset, so Live LLM preview has no stand-in result for it.`,
  };
}

function readFileOutcome(args: Record<string, unknown> | undefined): SimulatedToolOutcome {
  const path = readString(args, "path") ?? "src/App.tsx";
  const lines = [
    `// ${path}`,
    `// ${SIMULATED_SUFFIX} — the file was not read from disk.`,
    "export const livePreview = {",
    "  source: \"live-llm\",",
    "  executed: false,",
    "};",
  ];
  return { kind: "result", result: lines.join("\n"), resultPreview: `${lines.length} lines` };
}

function writeFileOutcome(args: Record<string, unknown> | undefined): SimulatedToolOutcome {
  const path = readString(args, "path") ?? "src/generated/live-preview.ts";
  const content = readString(args, "content");
  const addedLines = content ? content.split("\n").length : 6;
  return {
    kind: "result",
    result: {
      path,
      written: false,
      note: SIMULATED_SUFFIX,
      addedLines,
    },
    resultPreview: `+${addedLines} -0`,
  };
}

function editFileOutcome(args: Record<string, unknown> | undefined): SimulatedToolOutcome {
  const path = readString(args, "path") ?? "src/App.tsx";
  const oldStr = readString(args, "old_str");
  const newStr = readString(args, "new_str");
  const removed = oldStr ? oldStr.split("\n").length : 2;
  const added = newStr ? newStr.split("\n").length : 3;
  const diff = [
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ ${SIMULATED_SUFFIX} — no edit was applied @@`,
    ...(oldStr ? oldStr.split("\n").map((line) => `-${line}`) : ["-// previous implementation"]),
    ...(newStr ? newStr.split("\n").map((line) => `+${line}`) : ["+// replacement implementation"]),
  ];
  return { kind: "result", result: diff.join("\n"), resultPreview: `+${added} -${removed}` };
}

function runCommandOutcome(args: Record<string, unknown> | undefined): SimulatedToolOutcome {
  const command = readString(args, "command") ?? readString(args, "cmd");
  if (!command) {
    return {
      kind: "error",
      code: "LIVE_TOOL_ARGS_INCOMPLETE",
      retryable: true,
      userMessage: "The model asked to run a command but did not provide one.",
      developerMessage: "run_command was called without a `command` argument.",
    };
  }
  return {
    kind: "result",
    result: [
      `> ${command}`,
      `# ${SIMULATED_SUFFIX} — no process was started.`,
      "exit 0",
    ].join("\n"),
    resultPreview: "exit 0",
  };
}

function searchOutcome(args: Record<string, unknown> | undefined): SimulatedToolOutcome {
  const query = readString(args, "query") ?? readString(args, "pattern") ?? "";
  const matches = [
    "src/components/agent-preview/ToolCallCard.tsx",
    "src/preview-runner/LiveLlmPreviewRunner.ts",
  ];
  return {
    kind: "result",
    result: { query, matches, note: SIMULATED_SUFFIX },
    resultPreview: `${matches.length} locations`,
  };
}

const OUTCOME_BY_CONCEPT: Partial<
  Record<ToolConcept, (args: Record<string, unknown> | undefined) => SimulatedToolOutcome>
> = {
  "read-file": readFileOutcome,
  "write-file": writeFileOutcome,
  "edit-file": editFileOutcome,
  "run-command": runCommandOutcome,
  search: searchOutcome,
};

/**
 * Resolve a live tool call to the outcome its card should render.
 *
 * The concept lookup is `resolveToolConcept` rather than a private name table so a model that
 * spells the reader `read` or `filesystem.read_text_file` lands on the same simulated result as
 * one that spells it `read_file` — the same resolution the renderer already applies.
 */
export function simulateLiveToolCall(input: SimulateLiveToolCallInput): SimulatedToolOutcome {
  const concept = resolveToolConcept(input.name);
  const build = concept ? OUTCOME_BY_CONCEPT[concept] : undefined;
  if (!build) {
    return unsupportedToolOutcome(input.name);
  }
  if (!input.args) {
    return invalidArgsOutcome(input.name);
  }
  return build(input.args);
}
