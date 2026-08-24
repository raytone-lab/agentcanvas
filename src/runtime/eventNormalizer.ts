// Straight from the protocol package rather than the `src/agentux` barrel: the barrel is App's
// React-facing surface and `App.test.tsx` mocks it wholesale, which would leave this module
// without an event-type list and silently reject every event.
import { AGENT_UX_EVENT_TYPES, type AgentUXEvent } from "@agent-ux/protocol";

/**
 * Admission layer: our protocol and our components are the contract.
 *
 * A backend does not get to render however it likes. Everything entering the transcript is
 * first resolved to a concept this UI actually has a component for; anything that resolves to
 * nothing is routed to the diagnostics channel instead of leaking through as an un-designed
 * generic row. Two real integrations failed exactly that way — harness bookkeeping, plan/todo
 * updates and raw args JSON rendered as conversation rows that looked nothing like the
 * composed design.
 *
 * The layer does three things, all in our terms rather than a given backend's:
 *
 * 1. Resolves tool names to our canonical concepts through an alias table we own. A harness
 *    calling its writer `write`, `create_file` or `str_replace_editor` all land on the same
 *    concept, so the same component renders.
 * 2. Derives the events a backend usually does not emit. Almost no harness has a first-class
 *    "artifact" event — it writes a file with a tool. Without derivation the artifact panel is
 *    empty for every real backend, which is what a PPT-generating run hit.
 * 3. Normalizes titles. An adapter that dumps args JSON into `title` produces rows like
 *    `write {"file_path":"…","content":"<!DOCTYPE html>…"}`; the title is rebuilt from args.
 *
 * Whatever it cannot place is reported, never rendered.
 */

export type ToolConcept =
  | "read-file"
  | "read-image"
  | "edit-file"
  | "write-file"
  | "run-command"
  | "search"
  | "validate"
  | "fetch"
  | "delete"
  | "plan";

/**
 * Our canonical vocabulary. Keys are the concepts the components render; values are the
 * spellings we accept for them. Extend the values freely — that is us widening our own
 * standard, and it is how a new backend is onboarded without touching a component. Adding a
 * *key* means a new component has to exist for it first.
 */
export const TOOL_CONCEPT_ALIASES: Record<ToolConcept, readonly string[]> = {
  "read-file": ["read_file", "read", "open_file", "scan_file", "cat", "view_file", "get_file"],
  "read-image": ["read_image", "view_image", "image"],
  "edit-file": ["edit_file", "edit", "str_replace", "str_replace_editor", "apply_patch", "patch"],
  "write-file": ["write_file", "write", "create_file", "append_file", "modify_file", "save_file", "put_file"],
  // No bare "run", and no "run_tests": token matching would pull in every `run_*` tool. It
  // took `run_checks` (which the component's own matcher reads as a validation, correctly) and
  // relabelled it a plain command. The table must not out-guess `resolveToolAction` on an
  // ambiguous name — it is for spellings that are unambiguous.
  "run-command": ["bash", "sh", "shell", "shell.exec", "run_command", "exec", "terminal", "start_server"],
  search: ["search", "grep", "ripgrep", "rg", "glob", "find", "codebase_search"],
  validate: ["validate", "test", "check", "verify", "lint", "typecheck"],
  fetch: ["fetch", "web.fetch", "web_search", "http", "curl", "browse"],
  delete: ["rm", "delete", "delete_file", "remove_file", "filesystem.rm"],
  // Plans / todo lists are common in modern agents but this UI has no component for them
  // yet, so they are recognised (not "unknown") and deliberately kept out of the transcript.
  plan: ["todo", "todos", "update_todo", "update_todo_list", "todo_write", "plan", "update_plan", "task_list"],
};

/**
 * The spelling each concept is rewritten to before it reaches a component.
 *
 * Components carry their own matchers (`buildToolDisplaySpec` resolves a tool to an action
 * from its name), and those matchers only know the canonical spellings. A harness calling its
 * reader `read` therefore still rendered as an un-designed generic row even after the concept
 * resolved here — so admission also canonicalises the name. Components stay untouched.
 */
const CANONICAL_TOOL_NAME: Record<ToolConcept, string> = {
  "read-file": "read_file",
  "read-image": "read_image",
  "edit-file": "edit_file",
  "write-file": "write_file",
  "run-command": "run_command",
  search: "search",
  validate: "validate",
  fetch: "fetch",
  delete: "rm",
  plan: "plan",
};

/** Concepts that have no component; recognised so they can be reported, not rendered. */
export const UNRENDERED_CONCEPTS: readonly ToolConcept[] = ["plan"];

/** Concepts whose successful completion produces a file we can show as an artifact. */
const ARTIFACT_PRODUCING: readonly ToolConcept[] = ["write-file", "edit-file"];

/**
 * Markers for harness bookkeeping that some backends emit as tool calls: runtime context
 * snapshots, permission/sandbox/approval config updates, token accounting, injected system
 * reminders. Rendering these as agent activity buries the actual conversation — one real
 * integration filled the transcript with them and left the file operations unfindable.
 *
 * Matched against the tool name, title and id, case-insensitively. A backend that words them
 * differently extends the list through `options.diagnosticMarkers` rather than editing here.
 */
export const DIAGNOSTIC_MARKERS: readonly string[] = [
  "runtime-context", "runtime_context", "runtime context",
  "system-reminder", "system_reminder",
  "token-usage", "token_usage", "usage-report", "model-response-usage",
  "permission-preset", "permission_preset",
  "sandbox-mode", "sandbox_mode",
  "approval-policy", "approval_policy",
  "config-update", "config_update",
];

/**
 * The types we admit, read from the SDK rather than kept as a local copy.
 *
 * A hand-maintained list here sat five types behind the SDK — `run.awaiting_input`,
 * `reasoning.summary`, `tool.call.error`, `step.started`, `step.finished` — every one of which
 * the components do render. Anything absent from this set is dropped as `unknown-type`, so a
 * stale copy silently deletes working events. One source only.
 */
const KNOWN_TYPES: ReadonlySet<string> = new Set(AGENT_UX_EVENT_TYPES);

export type NormalizeOptions = {
  /** Extra wording that marks an event as harness bookkeeping. */
  diagnosticMarkers?: readonly string[];
  /** Extra aliases, merged into our table. */
  extraAliases?: Partial<Record<ToolConcept, readonly string[]>>;
  /** Derive artifact events from file-writing tool calls. Default true. */
  deriveArtifacts?: boolean;
  /** Rebuild tool titles that are raw JSON. Default true. */
  normalizeTitles?: boolean;
};

/**
 * Why an event was held out of the transcript.
 *
 * There is deliberately no "unknown tool" reason. Rejecting a tool call we have no concept for
 * also deletes the interaction attached to it — on a real fixture it removed an
 * `awaiting_approval`, and the approval buttons simply vanished. A tool we cannot label still
 * renders through the component's own matcher, and a plain card the user can act on beats a
 * missing one. Unrecognised tools are admitted and listed in `undesignedTools` instead.
 */
export type RejectedEvent = {
  event: unknown;
  reason: "diagnostic" | "unrenderable-concept" | "unknown-type";
  detail: string;
};

export type NormalizeResult = {
  /** Conversation events, normalized. Safe to replay into the view model. */
  events: AgentUXEvent[];
  /** Everything received, in order — the debug dock shows this. */
  allEvents: unknown[];
  /** Kept out of the transcript, with the reason. */
  rejected: RejectedEvent[];
  /** Artifact events we synthesised, and from which tool call. */
  derivedArtifacts: Array<{ toolCallId: string; path: string }>;
  /** Tool titles we rebuilt because they carried raw JSON. */
  normalizedTitles: Array<{ toolCallId: string; from: string; to: string }>;
  /** Tool names rewritten to their canonical spelling so components resolve them. */
  canonicalizedNames: Array<{ toolCallId: string; from: string; to: string }>;
  /**
   * Tool calls admitted without a concept of ours. They render through the component's own
   * matcher, which may or may not have a designed card for them — worth reporting so an alias
   * can be added, but never worth deleting the call over.
   */
  undesignedTools: Array<{ toolCallId: string; name: string }>;
};

function payloadOf(event: unknown): Record<string, unknown> {
  const candidate = (event as { payload?: unknown })?.payload;
  return candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>) : {};
}

function typeOf(event: unknown): string {
  const value = (event as { type?: unknown })?.type;
  return typeof value === "string" ? value : "";
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function normalizeName(value: string): string {
  // Drop any namespace prefix ("filesystem.rm" -> "rm") and unify separators.
  return value.toLowerCase().replace(/^.*[./]/, "").replace(/[\s-]+/g, "_");
}

function tokensOf(value: string): string[] {
  return normalizeName(value).split("_").filter(Boolean);
}

/**
 * Resolve a tool to one of our concepts, or undefined if our vocabulary has no place for it.
 *
 * Matching is token-based, never substring: a raw `includes` made "frobnicate_widget" resolve
 * to read-file (it contains "cat") and "dsh_put_blob" to run-command (it contains "sh").
 * Only the tool name is considered — titles are free text and a message mentioning "test"
 * must not become a validate tool.
 */
export function resolveToolConcept(
  name: string | undefined,
  title?: string,
  extraAliases?: Partial<Record<ToolConcept, readonly string[]>>,
): ToolConcept | undefined {
  void title;
  const raw = str(name);
  if (!raw) return undefined;
  const normalized = normalizeName(raw);
  const tokens = new Set(tokensOf(raw));

  const entries = Object.entries(TOOL_CONCEPT_ALIASES) as Array<[ToolConcept, readonly string[]]>;
  const aliasesFor = (concept: ToolConcept, aliases: readonly string[]) =>
    [...aliases, ...(extraAliases?.[concept] ?? [])];

  // 1) Whole-name match — most reliable.
  for (const [concept, aliases] of entries) {
    if (aliasesFor(concept, aliases).some((alias) => normalizeName(alias) === normalized)) return concept;
  }
  // 2) Token-set match: every token of the alias must appear as a token of the name, so
  //    "file_write" still resolves to write-file, while "frobnicate_widget" resolves to
  //    nothing.
  for (const [concept, aliases] of entries) {
    for (const alias of aliasesFor(concept, aliases)) {
      const aliasTokens = tokensOf(alias);
      if (aliasTokens.length > 0 && aliasTokens.every((token) => tokens.has(token))) return concept;
    }
  }
  return undefined;
}

function isDiagnostic(event: unknown, extra: readonly string[]): boolean {
  const payload = payloadOf(event);
  const haystack = [payload.name, payload.title, payload.toolCallId]
    .filter(str).join(" ").toLowerCase();
  if (!haystack) return false;
  return [...DIAGNOSTIC_MARKERS, ...extra].some((marker) => haystack.includes(marker.toLowerCase()));
}

function looksLikeRawJson(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 12) return false;
  // "write {\"file_path\": …}" — a verb followed by a JSON blob, or a bare JSON blob.
  return /\{\s*"/.test(trimmed) || (trimmed.startsWith("{") && trimmed.endsWith("}"));
}

function pathFromArgs(args: unknown): string | undefined {
  if (!args || typeof args !== "object") return undefined;
  const record = args as Record<string, unknown>;
  for (const key of ["path", "file_path", "filePath", "file", "filename", "target", "uri"]) {
    const value = str(record[key]);
    if (value) return value;
  }
  return undefined;
}

function commandFromArgs(args: unknown): string | undefined {
  if (!args || typeof args !== "object") return undefined;
  const record = args as Record<string, unknown>;
  return str(record.command) ?? str(record.cmd) ?? str(record.script);
}

function contentFromArgs(args: unknown): string | undefined {
  if (!args || typeof args !== "object") return undefined;
  const record = args as Record<string, unknown>;
  for (const key of ["content", "contents", "text", "new_str", "newText", "body", "patch", "diff"]) {
    const value = str(record[key]);
    if (value) return value;
  }
  return undefined;
}

/** Pull the args object out of a title that carries a raw JSON blob. */
function argsFromRawTitle(title: string): unknown {
  const start = title.indexOf("{");
  if (start < 0) return undefined;
  try {
    return JSON.parse(title.slice(start));
  } catch {
    // Truncated blob (titles are often elided). Recover just the path.
    const match = /"(?:file_)?path"\s*:\s*"([^"]+)"/.exec(title);
    return match ? { path: match[1] } : undefined;
  }
}

function basename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

const CONCEPT_VERB: Record<ToolConcept, string> = {
  "read-file": "Read",
  "read-image": "View",
  "edit-file": "Edit",
  "write-file": "Write",
  "run-command": "Run",
  search: "Search",
  validate: "Validate",
  fetch: "Fetch",
  delete: "Delete",
  plan: "Plan",
};

function titleFor(concept: ToolConcept, args: unknown, fallback: string): string {
  const path = pathFromArgs(args);
  if (path) return `${CONCEPT_VERB[concept]} ${basename(path)}`;
  const command = commandFromArgs(args);
  if (command) return `${CONCEPT_VERB[concept]} ${command.split(/\s+/).slice(0, 4).join(" ")}`;
  return fallback;
}

function mimeFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "html" || ext === "htm") return "text/html";
  if (ext === "md" || ext === "mdx") return "text/markdown";
  if (ext === "json") return "application/json";
  if (ext === "css") return "text/css";
  if (ext === "ts" || ext === "tsx") return "text/typescript";
  if (ext === "js" || ext === "jsx") return "text/javascript";
  if (ext === "diff" || ext === "patch") return "text/x-diff";
  return "text/plain";
}

function artifactKindFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "html" || ext === "htm") return "preview";
  if (ext === "md" || ext === "mdx") return "markdown";
  if (ext === "json") return "data";
  if (ext === "diff" || ext === "patch") return "diff";
  return "code";
}

/**
 * Admit and normalize a raw event stream.
 *
 * Order matters: diagnostics are removed first, then tool events are resolved to a concept,
 * then artifacts are derived from completed writes. The returned `events` are the only ones
 * that should reach the view model.
 *
 * The input is `unknown[]` on purpose — it arrives from a vendor adapter or a network stream,
 * so a missing `type` or a non-object payload is expected input, not a type error.
 */
export function normalizeAgentUXEvents(
  input: readonly unknown[],
  options: NormalizeOptions = {},
): NormalizeResult {
  const extraMarkers = options.diagnosticMarkers ?? [];
  const deriveArtifacts = options.deriveArtifacts ?? true;
  const normalizeTitles = options.normalizeTitles ?? true;

  const events: AgentUXEvent[] = [];
  const rejected: RejectedEvent[] = [];
  const derivedArtifacts: NormalizeResult["derivedArtifacts"] = [];
  const normalizedTitles: NormalizeResult["normalizedTitles"] = [];
  const canonicalizedNames: NormalizeResult["canonicalizedNames"] = [];
  const undesignedTools: NormalizeResult["undesignedTools"] = [];

  // Per tool call: the concept it resolved to, plus what we learned along the way.
  const concepts = new Map<string, ToolConcept | undefined>();
  const paths = new Map<string, string>();
  const contents = new Map<string, string>();
  const rejectedCalls = new Set<string>();
  let derivedSeq = 0;

  const idOf = (payload: Record<string, unknown>) => str(payload.toolCallId) ?? "";

  for (const event of input) {
    const type = typeOf(event);
    const payload = payloadOf(event);

    if (!type || !KNOWN_TYPES.has(type)) {
      rejected.push({ event, reason: "unknown-type", detail: type || "(missing type)" });
      continue;
    }

    if (isDiagnostic(event, extraMarkers)) {
      // Later events of the same call carry no name, so blacklist the id too — otherwise the
      // `finished` event slipped through and left a half-rendered row.
      const diagnosticId = str(payload.toolCallId);
      if (diagnosticId) rejectedCalls.add(diagnosticId);
      rejected.push({ event, reason: "diagnostic", detail: str(payload.name) ?? type });
      continue;
    }

    if (!type.startsWith("tool.call.")) {
      events.push(event as AgentUXEvent);
      continue;
    }

    const id = idOf(payload);

    if (type === "tool.call.started") {
      const concept = resolveToolConcept(str(payload.name), str(payload.title), options.extraAliases);
      concepts.set(id, concept);

      if (!concept) {
        // Admitted, not dropped: the component's own matcher gets a shot at it, and whatever
        // interaction the call carries (an approval, a result) survives.
        undesignedTools.push({ toolCallId: id, name: str(payload.name) ?? "(no name)" });
      }
      if (concept && UNRENDERED_CONCEPTS.includes(concept)) {
        rejectedCalls.add(id);
        rejected.push({ event, reason: "unrenderable-concept", detail: `${concept} — 当前没有对应组件` });
        continue;
      }
    }

    // Every later event of a rejected call is rejected too, so no half-rendered rows appear.
    if (rejectedCalls.has(id)) {
      const reason = concepts.get(id) ? "unrenderable-concept" : "diagnostic";
      rejected.push({ event, reason, detail: type });
      continue;
    }

    const concept = concepts.get(id);
    let normalized = event;

    // Remember args for artifact derivation and title rebuilding.
    if (payload.args !== undefined) {
      const path = pathFromArgs(payload.args);
      if (path) paths.set(id, path);
      const content = contentFromArgs(payload.args);
      if (content) contents.set(id, content);
    }

    // Canonicalise the tool name so the components' own matchers resolve it.
    if (concept && str(payload.name) && normalizeName(str(payload.name)!) !== CANONICAL_TOOL_NAME[concept]) {
      const current = payloadOf(normalized);
      normalized = { ...(normalized as object), payload: { ...current, name: CANONICAL_TOOL_NAME[concept] } };
      canonicalizedNames.push({ toolCallId: id, from: str(payload.name)!, to: CANONICAL_TOOL_NAME[concept] });
    }

    if (normalizeTitles && concept) {
      const title = str(payloadOf(normalized).title);
      if (title && looksLikeRawJson(title)) {
        // `tool.call.started` usually predates `args`, but a title carrying the args blob has
        // the path inside it — parse there so the rebuilt title is still specific.
        const rebuilt = titleFor(concept, payload.args ?? argsFromRawTitle(title), CONCEPT_VERB[concept]);
        normalized = { ...(normalized as object), payload: { ...payloadOf(normalized), title: rebuilt } };
        normalizedTitles.push({ toolCallId: id, from: title, to: rebuilt });
      }
    }

    events.push(normalized as AgentUXEvent);

    // A completed write is where an artifact becomes available.
    if (
      deriveArtifacts &&
      type === "tool.call.finished" &&
      concept &&
      ARTIFACT_PRODUCING.includes(concept) &&
      str(payload.status) === "success"
    ) {
      const path = paths.get(id);
      const content = contents.get(id);
      if (path && content) {
        derivedSeq += 1;
        const artifactId = `derived_artifact_${derivedSeq}`;
        const base = event as { runId?: string; ts?: number };
        const wrap = (suffix: string, artifactPayload: Record<string, unknown>): AgentUXEvent => ({
          protocol: "agent-ux",
          version: "0.1",
          id: `${artifactId}_${suffix}`,
          runId: base.runId,
          ts: base.ts,
          type: `artifact.${suffix}`,
          payload: artifactPayload,
        });
        events.push(
          wrap("created", {
            artifactId,
            kind: artifactKindFor(path),
            title: basename(path),
            mimeType: mimeFor(path),
          }),
          wrap("delta", { artifactId, format: "text", delta: content }),
          wrap("finished", { artifactId, status: "success", uri: `file://${path}` }),
        );
        derivedArtifacts.push({ toolCallId: id, path });
      }
    }
  }

  return {
    events,
    allEvents: [...input],
    rejected,
    derivedArtifacts,
    normalizedTitles,
    canonicalizedNames,
    undesignedTools,
  };
}

/** Grouped counts for reporting. */
export function summarizeRejections(rejected: readonly RejectedEvent[]): Record<RejectedEvent["reason"], number> {
  const summary: Record<RejectedEvent["reason"], number> = {
    diagnostic: 0,
    "unrenderable-concept": 0,
    "unknown-type": 0,
  };
  for (const item of rejected) summary[item.reason] += 1;
  return summary;
}
