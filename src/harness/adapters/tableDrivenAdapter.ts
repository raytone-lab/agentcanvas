import type { AgentUXEvent } from "@agent-ux/protocol";

import { createEventWriter } from "./eventWriter";
import {
  readCommand,
  readPath,
  readString,
  type FieldPaths,
  type HarnessMapping,
  type MappedKind,
} from "./harnessMapping";

/**
 * One adapter for every local harness, driven by a `HarnessMapping` table.
 *
 * A harness (Codex, Claude Code, opencode) runs as a process and prints JSON lines. The
 * browser cannot spawn it, so by the time these lines reach us they have already been
 * transported; the only vendor-specific knowledge left is *which field means what*. That is
 * data, so it lives in a table and this file is the same for every vendor.
 *
 * It reports what it could not place. A mapping written from docs rather than a captured
 * stream will have wrong paths, and a wrong path renders an empty transcript — which looks
 * exactly like "the agent said nothing". `unmapped` and `missingFields` turn that into a
 * readable diagnosis, so calibrating a table takes one run and no code change.
 */

export type TranslateReport = {
  /** Discriminator values that appeared in the stream but are absent from `typeMap`. */
  unmapped: Array<{ value: string; count: number; sample: unknown }>;
  /** Mapped kinds whose required field was missing, i.e. a likely wrong path. */
  missingFields: Array<{ kind: MappedKind; field: string; count: number; sample: unknown }>;
  /** Lines that were not JSON objects at all. */
  unparsable: number;
  /** Lines the table says to drop. */
  ignored: number;
  linesSeen: number;
};

export type TranslateResult = {
  events: AgentUXEvent[];
  report: TranslateReport;
  mapping: HarnessMapping;
};

/** True when the stream produced nothing renderable — the case worth shouting about. */
export function producedNothing(result: TranslateResult): boolean {
  return result.events.length === 0 && result.report.linesSeen > 0;
}

/**
 * Human-readable diagnosis of a translation, for the debug dock and for the error thrown when
 * a stream yields nothing. Names the fields that were actually present, which is what tells
 * you how to fix the table.
 */
export function formatTranslateReport(result: TranslateResult): string {
  const { report, mapping } = result;
  const lines: string[] = [];
  lines.push(
    `适配器 ${mapping.label}（${mapping.id}）读取 ${report.linesSeen} 行，产出 ${result.events.length} 个事件。`,
  );
  if (!mapping.verified) {
    lines.push("注意：这张映射表按公开格式编写，未经真实流校准，字段路径可能与你运行的版本不符。");
  }
  if (report.unparsable > 0) {
    lines.push(`  ${report.unparsable} 行不是 JSON 对象，已跳过。`);
  }
  if (report.unmapped.length > 0) {
    lines.push(`  ${report.unmapped.length} 种未识别的事件类型（取自 ${mapping.typePath}）：`);
    for (const item of report.unmapped.slice(0, 8)) {
      lines.push(`    ${item.value} ×${item.count}`);
      lines.push(`      实际字段: ${describeKeys(item.sample)}`);
    }
    lines.push(`  修法：在 mappings/${mapping.id}.ts 的 typeMap 里补上这些取值。`);
  }
  if (report.missingFields.length > 0) {
    lines.push("  字段路径取不到值（大概率路径写错了）：");
    for (const item of report.missingFields.slice(0, 8)) {
      lines.push(`    ${item.kind} 缺 ${item.field} ×${item.count}`);
      lines.push(`      实际字段: ${describeKeys(item.sample)}`);
    }
    lines.push(`  修法：对照上面的实际字段，改 mappings/${mapping.id}.ts 的 paths。`);
  }
  if (report.unmapped.length === 0 && report.missingFields.length === 0 && result.events.length > 0) {
    lines.push("  映射完整，没有丢字段。");
  }
  return lines.join("\n");
}

function describeKeys(sample: unknown, prefix = "", depth = 0): string {
  if (sample == null || typeof sample !== "object" || depth > 2) {
    return prefix ? `${prefix}=${JSON.stringify(sample)?.slice(0, 40) ?? "?"}` : "(无)";
  }
  if (Array.isArray(sample)) {
    return `${prefix || "(数组)"}[${sample.length}]`;
  }
  const entries = Object.entries(sample as Record<string, unknown>).slice(0, 6);
  return entries
    .map(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return value && typeof value === "object"
        ? describeKeys(value, path, depth + 1)
        : `${path}=${JSON.stringify(value)?.slice(0, 30) ?? "?"}`;
    })
    .join(", ");
}

type Tally = Map<string, { count: number; sample: unknown }>;

function bump(tally: Tally, key: string, sample: unknown) {
  const existing = tally.get(key);
  if (existing) existing.count += 1;
  else tally.set(key, { count: 1, sample });
}

/** A tool id is required to correlate a call; fall back to a stable synthetic one. */
function toolIdOf(source: unknown, paths: FieldPaths, fallbackIndex: number): string {
  return readString(source, paths.toolCallId) ?? `tool_${fallbackIndex}`;
}

function argsOf(source: unknown, paths: FieldPaths): unknown {
  const direct = readPath(source, paths.args);
  if (direct !== undefined && direct !== null) return direct;

  const text = readString(source, paths.argsText);
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      // Unparsable args: showing none beats showing a broken blob.
      return undefined;
    }
  }
  const command = readCommand(source, paths.command);
  return command ? { command } : undefined;
}

function statusOf(source: unknown, paths: FieldPaths): string {
  // An explicit error flag wins: it is unambiguous where a bare boolean status is not.
  const flag = readPath(source, paths.errorFlag);
  if (typeof flag === "boolean") return flag ? "error" : "success";

  const raw = readPath(source, paths.status);
  if (typeof raw === "boolean") return raw ? "error" : "success";
  if (typeof raw === "number") return raw === 0 ? "success" : "error";
  const text = typeof raw === "string" ? raw.toLowerCase() : "";
  if (!text) return "success";
  if (["ok", "success", "succeeded", "completed", "done", "0"].includes(text)) return "success";
  if (["error", "failed", "failure"].includes(text)) return "error";
  if (["cancelled", "canceled", "aborted", "interrupted"].includes(text)) return "cancelled";
  return text;
}

/**
 * Translate a harness's JSON lines. Input is `unknown[]` because it comes off a process or a
 * socket: a blank line or a log line that is not an object is normal input, not an error.
 */
export function translateHarnessStream(
  lines: readonly unknown[],
  mapping: HarnessMapping,
  options: { runId?: string; now?: number } = {},
): TranslateResult {
  const writer = createEventWriter({ runId: options.runId ?? mapping.id, now: options.now });
  const unmapped: Tally = new Map();
  const missing: Tally = new Map();
  let unparsable = 0;
  let ignored = 0;
  let linesSeen = 0;
  let toolCounter = 0;
  let runStarted = false;
  // Tool ids we opened, so a result for an unknown id is reported instead of dropped silently.
  const openTools = new Set<string>();

  const ensureRun = () => {
    if (runStarted) return;
    runStarted = true;
    writer.runStarted({ title: mapping.label, metadata: { adapter: mapping.id } });
  };

  const applyKind = (kind: MappedKind, source: unknown, paths: FieldPaths) => {
    switch (kind) {
      case "ignore":
        ignored += 1;
        return;

      case "run.start":
        ensureRun();
        return;

      case "run.finish":
        writer.finishAll();
        writer.runFinished({ status: "success" });
        return;

      case "run.error": {
        const message = readString(source, paths.errorMessage);
        if (!message) bump(missing, "run.error:errorMessage", source);
        writer.runError({ message: message ?? "Harness reported an error" });
        writer.finishAll();
        return;
      }

      case "text": {
        const text = readString(source, paths.text);
        if (!text) {
          bump(missing, "text:text", source);
          return;
        }
        ensureRun();
        // The answer has started, so the thinking block collapses.
        writer.finishReasoning();
        writer.textDelta(text);
        return;
      }

      case "reasoning": {
        const text = readString(source, paths.reasoning);
        if (!text) {
          bump(missing, "reasoning:reasoning", source);
          return;
        }
        ensureRun();
        writer.reasoningDelta(text);
        return;
      }

      case "tool.start": {
        ensureRun();
        toolCounter += 1;
        const toolCallId = toolIdOf(source, paths, toolCounter);
        const name = readString(source, paths.toolName)
          // A shell harness often names nothing and just reports the command.
          ?? (readCommand(source, paths.command) ? "run_command" : undefined);
        if (!name) bump(missing, "tool.start:toolName", source);
        const args = argsOf(source, paths);
        if (args === undefined) bump(missing, "tool.start:args", source);

        writer.toolStarted(toolCallId, { name: name ?? "tool", safety: "safe" });
        openTools.add(toolCallId);
        writer.toolRunning(toolCallId, args);
        return;
      }

      case "tool.result": {
        const toolCallId = toolIdOf(source, paths, toolCounter);
        if (!openTools.has(toolCallId)) {
          // A result whose call we never saw: the id path is probably wrong, and silently
          // dropping it is how a transcript ends up half-empty.
          bump(missing, "tool.result:toolCallId", source);
          return;
        }
        const result = readPath(source, paths.result);
        const resultPreview = readString(source, paths.resultPreview);
        if (result === undefined && !resultPreview) bump(missing, "tool.result:result", source);
        writer.toolResult(toolCallId, {
          ...(result === undefined ? {} : { result }),
          ...(resultPreview === undefined ? {} : { resultPreview }),
        });
        writer.toolFinished(toolCallId, statusOf(source, paths));
        openTools.delete(toolCallId);
        return;
      }

      case "tool.finish": {
        const toolCallId = toolIdOf(source, paths, toolCounter);
        if (!openTools.has(toolCallId)) {
          bump(missing, "tool.finish:toolCallId", source);
          return;
        }
        writer.toolFinished(toolCallId, statusOf(source, paths));
        openTools.delete(toolCallId);
        return;
      }

      default:
        return;
    }
  };

  for (const line of lines) {
    if (line == null || typeof line !== "object") {
      unparsable += 1;
      continue;
    }
    linesSeen += 1;

    const discriminator = readString(line, mapping.typePath);
    if (!discriminator) {
      bump(unmapped, "(no type)", line);
      continue;
    }
    const kind = mapping.typeMap[discriminator];
    if (!kind) {
      bump(unmapped, discriminator, line);
      continue;
    }

    if (mapping.mode === "content-blocks" && mapping.contentPath) {
      const content = readPath(line, mapping.contentPath);
      // Claude Code carries an array of blocks; opencode carries a single part object. Both
      // are "the line's kind is refined by what is inside it", so both are handled here.
      const blocks = Array.isArray(content) ? content : content && typeof content === "object" ? [content] : [];

      let handledAny = false;
      for (const block of blocks) {
        const blockType = readString(block, mapping.blockTypePath);
        const blockKind = blockType ? mapping.blockTypeMap?.[blockType] : undefined;
        if (!blockKind) continue;
        handledAny = true;
        applyKind(blockKind, block, mapping.blockPaths ?? mapping.paths);
      }

      // If nothing inside refined the line, the line's own kind stands — that is how a
      // `system` / `result` line, or a vendor whose tool events are keyed at line level, is
      // handled. Without this fallback those events silently vanished.
      if (handledAny) continue;
    }

    applyKind(kind, line, mapping.paths);
  }

  writer.finishAll();

  return {
    events: [...writer.events],
    mapping,
    report: {
      unmapped: [...unmapped].map(([value, item]) => ({ value, count: item.count, sample: item.sample })),
      missingFields: [...missing].map(([key, item]) => {
        const [kind, field] = key.split(":");
        return { kind: kind as MappedKind, field: field ?? "?", count: item.count, sample: item.sample };
      }),
      unparsable,
      ignored,
      linesSeen,
    },
  };
}

/** Parse newline-delimited JSON (or an SSE body) into objects, tolerating noise. */
export function parseHarnessLines(chunk: string): unknown[] {
  const out: unknown[] = [];
  for (const rawLine of chunk.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const body = line.startsWith("data:") ? line.slice(5).trim() : line;
    if (!body || body === "[DONE]" || body.startsWith(":")) continue;
    try {
      out.push(JSON.parse(body));
    } catch {
      // Human-readable log line printed alongside the JSON stream.
    }
  }
  return out;
}
