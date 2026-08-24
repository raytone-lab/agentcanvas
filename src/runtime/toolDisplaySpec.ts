import type { AgentUXToolTimelineItem } from "@agent-ux/render-core";

export type DisplayBlock =
  | { kind: "code"; lang: string; code: string }
  | { kind: "diff"; oldCode: string; newCode: string; lang?: string; path?: string }
  | { kind: "plain"; text: string };

export type ToolDisplaySpec = {
  inputBlock?: DisplayBlock;
  outputBlock?: DisplayBlock;
};

export function buildToolDisplaySpec(tool: AgentUXToolTimelineItem): ToolDisplaySpec {
  const args = toRecord(tool.args) ?? tryParseRecord(tool.argsText ?? "") ?? toRecord(tool.approval?.argsPreview);
  const output = stringifyResult(tool.result) || (tool.status === "awaiting_approval" ? "" : tool.preview || "");

  if (isShellTool(tool.name)) {
    const command = getString(args, "command") || getString(args, "cmd");
    return {
      inputBlock: command ? { kind: "code", lang: "bash", code: command } : fallbackInput(tool),
      outputBlock: output ? { kind: "plain", text: output } : undefined,
    };
  }

  if (tool.name === "write_file" || tool.name === "append_file") {
    const path = getString(args, "path");
    const content = getString(args, "content");
    return {
      inputBlock: content
        ? { kind: "code", lang: languageFromPath(path), code: content }
        : fallbackInput(tool),
      outputBlock: output ? { kind: "plain", text: output } : undefined,
    };
  }

  if (tool.name === "edit_file") {
    const path = getString(args, "path");
    return {
      outputBlock: {
        kind: "diff",
        oldCode: getString(args, "old_string"),
        newCode: getString(args, "new_string"),
        lang: languageFromPath(path),
        path: path || undefined,
      },
    };
  }

  if (tool.name === "apply_patch" || tool.name === "modify_file") {
    const path = getString(args, "path");
    return {
      inputBlock: path ? { kind: "plain", text: path } : fallbackInput(tool),
      outputBlock: {
        kind: "diff",
        oldCode: getString(args, "old_string"),
        newCode: getString(args, "new_string"),
        lang: languageFromPath(path),
        path: path || undefined,
      },
    };
  }

  if (tool.name === "read_file") {
    const path = getString(args, "path");
    return {
      inputBlock: { kind: "plain", text: path || tool.argsText || tool.name },
      outputBlock: output ? { kind: "code", lang: languageFromPath(path), code: output } : undefined,
    };
  }

  if (tool.name === "read_image") {
    const path = getString(args, "path") || getString(args, "file");
    return {
      inputBlock: { kind: "plain", text: path || tool.argsText || tool.name },
      outputBlock: output ? { kind: "plain", text: output } : undefined,
    };
  }

  if (tool.name === "validate" || tool.name === "run_tests") {
    const command = getString(args, "command") || getString(args, "cmd");
    return {
      inputBlock: command ? { kind: "code", lang: "bash", code: command } : fallbackInput(tool),
      outputBlock: output ? { kind: "plain", text: output } : undefined,
    };
  }

  if (tool.name === "fetch" || tool.name === "web.fetch") {
    const method = getString(args, "method") || "GET";
    const url = getString(args, "url");
    return {
      inputBlock: { kind: "plain", text: url ? `${method} ${url}` : tool.argsText || tool.name },
      outputBlock: output ? { kind: "plain", text: output } : undefined,
    };
  }

  if (tool.name === "rm" || tool.name === "filesystem.rm") {
    const path = getString(args, "path");
    const flags = `${getBoolean(args, "recursive") ? "r" : ""}${getBoolean(args, "force") ? "f" : ""}`;
    const command = path ? `rm ${flags ? `-${flags} ` : ""}${shellQuote(path)}` : "";
    return {
      inputBlock: command ? { kind: "code", lang: "bash", code: command } : fallbackInput(tool),
      outputBlock: output ? { kind: "plain", text: output } : undefined,
    };
  }

  if (tool.name === "search") {
    const pattern = getString(args, "pattern") || getString(args, "query");
    return {
      inputBlock: { kind: "plain", text: pattern ? `pattern: ${pattern}` : tool.argsText || tool.name },
      outputBlock: output ? { kind: "plain", text: output } : undefined,
    };
  }

  const inputText = args ? JSON.stringify(args, null, 2) : tool.argsText;
  return {
    inputBlock: inputText ? { kind: "code", lang: "json", code: inputText } : undefined,
    outputBlock: output ? { kind: "plain", text: output } : undefined,
  };
}

/**
 * Exported so `eventContract` can tell whether a stream carries the shell results the console
 * surface needs, rather than keeping a second copy of these four names that could drift.
 */
export function isShellTool(name: string): boolean {
  return name === "bash" || name === "run_command" || name === "start_server" || name === "shell.exec";
}

export type ConsoleLogEntry = {
  id: string;
  /** The command line, as the agent asked to run it. */
  command: string;
  /** Its output, or undefined when nothing came back yet. */
  output?: string;
  status: string;
};

/**
 * The shell commands a run actually issued, for the console surface.
 *
 * The console used to render four hardcoded lines (`> npm test` / `7 tests passed` / …) no
 * matter what the session did, so switching to it looked like nothing happened — the content
 * never referred to the conversation on screen. This reads the real thing instead, and returns
 * an empty list when a run issued no shell commands, which is the honest answer for a plain
 * chat turn.
 */
export function consoleLogEntries(
  timeline: readonly { kind?: string }[],
): ConsoleLogEntry[] {
  const entries: ConsoleLogEntry[] = [];
  for (const item of timeline) {
    if (item.kind !== "tool") continue;
    const tool = item as unknown as AgentUXToolTimelineItem;
    if (!isShellTool(tool.name)) continue;

    const args = toRecord(tool.args) ?? tryParseRecord(tool.argsText ?? "") ?? toRecord(tool.approval?.argsPreview);
    const command = getString(args, "command") || getString(args, "cmd") || getString(args, "script");
    if (!command) continue;

    const output = stringifyResult(tool.result) || tool.preview || "";
    entries.push({
      id: tool.id,
      command,
      output: output || undefined,
      status: String(tool.status ?? ""),
    });
  }
  return entries;
}

function fallbackInput(tool: AgentUXToolTimelineItem): DisplayBlock | undefined {
  return tool.argsText ? { kind: "plain", text: tool.argsText } : undefined;
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function tryParseRecord(value: string): Record<string, unknown> | undefined {
  try {
    return toRecord(JSON.parse(value));
  } catch {
    return undefined;
  }
}

function getString(obj: Record<string, unknown> | undefined, key: string): string {
  const value = obj?.[key];
  return typeof value === "string" ? value : "";
}

function getBoolean(obj: Record<string, unknown> | undefined, key: string): boolean {
  return obj?.[key] === true;
}

function shellQuote(value: string): string {
  return /^[\w./-]+$/.test(value) ? value : JSON.stringify(value);
}

function stringifyResult(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === undefined || value === null) {
    return "";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function languageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "md":
    case "mdx":
      return "markdown";
    case "css":
      return "css";
    case "html":
      return "html";
    case "py":
      return "python";
    case "sh":
      return "bash";
    default:
      return "text";
  }
}
