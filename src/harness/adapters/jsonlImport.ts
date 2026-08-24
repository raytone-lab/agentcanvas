import type { AgentUXEvent } from "@agent-ux/protocol";

import { parseAgentUXEvent } from "@agent-ux/protocol";
import {
  describeMissingMapping,
  mappingForHarness,
  speaksOurProtocol,
  type HarnessId,
} from "./registry";
import {
  formatTranslateReport,
  parseHarnessLines,
  producedNothing,
  translateHarnessStream,
  type TranslateResult,
} from "./tableDrivenAdapter";

/**
 * Import a harness's captured stdout as JSON lines.
 *
 * This is the smallest possible transport for the harness axis: a harness runs as a process
 * outside the browser, so the browser cannot start one — but it can read what one already
 * printed. Dropping a `.jsonl` file exercises the entire chain (transport → mapping →
 * admission → view model → components) with no local server, no bridge and no daemon, which
 * is what makes it the right first step: if the mapping tables are wrong, this is where it
 * shows, and the diagnosis is readable.
 *
 * Three cases, deliberately distinct:
 *
 * - the project's harness is `agentux` — the file already speaks our protocol, so it is parsed
 *   and nothing is translated;
 * - the harness has a mapping table — the lines are translated through it;
 * - the harness has no table (`pi` today) — this fails loudly with the same message the
 *   registry gives elsewhere. It must not silently produce an empty transcript, which reads as
 *   "the agent said nothing" rather than "nobody taught us this format".
 */

export type HarnessImport =
  | {
    ok: true;
    events: AgentUXEvent[];
    /** Which harness the lines were read as. */
    harness: HarnessId;
    /** Present only when a mapping table was used. */
    translation?: TranslateResult;
    /** Readable account of what mapped and what did not. */
    report: string;
    linesRead: number;
  }
  | {
    ok: false;
    /** Why nothing could be imported, in terms a person can act on. */
    error: string;
    harness: HarnessId;
    linesRead: number;
  };

/** Lines that parse as our own events need no table — just validation. */
function readStandardEvents(lines: readonly unknown[]): { events: AgentUXEvent[]; rejected: number } {
  const events: AgentUXEvent[] = [];
  let rejected = 0;
  for (const line of lines) {
    try {
      events.push(parseAgentUXEvent(line as never));
    } catch {
      // Not one of ours; counted so the caller can say so rather than showing a short list.
      rejected += 1;
    }
  }
  return { events, rejected };
}

export function importHarnessJsonl(text: string, harness: HarnessId): HarnessImport {
  const lines = parseHarnessLines(text);

  if (lines.length === 0) {
    return {
      ok: false,
      harness,
      linesRead: 0,
      error: [
        "这个文件里没有可解析的 JSON 行。",
        "期望的格式：每行一个 JSON 对象（JSONL），或 SSE 的 `data: {...}` 行。",
        "如果这是一份终端日志，请只保留 JSON 输出部分。",
      ].join("\n"),
    };
  }

  // Our own protocol: no translation, and no table needed.
  if (speaksOurProtocol(harness)) {
    const { events, rejected } = readStandardEvents(lines);
    if (events.length === 0) {
      return {
        ok: false,
        harness,
        linesRead: lines.length,
        error: [
          `读到 ${lines.length} 行，但没有一行是标准事件。`,
          "",
          `当前 harness 是 "${harness}"，意味着这个文件应该已经是我们的协议格式（每行含 type 与 payload）。`,
          "如果这是某个 CLI 的原始输出，请把项目的 harness 改成对应的那一家，再重新导入。",
        ].join("\n"),
      };
    }
    return {
      ok: true,
      harness,
      events,
      linesRead: lines.length,
      report: [
        `读到 ${lines.length} 行，其中 ${events.length} 行是标准事件，未做翻译。`,
        ...(rejected > 0 ? [`  ${rejected} 行不是标准事件，已跳过。`] : []),
      ].join("\n"),
    };
  }

  const mapping = mappingForHarness(harness);
  if (!mapping) {
    // No table. Reported, never rendered as an empty run.
    return {
      ok: false,
      harness,
      linesRead: lines.length,
      error: describeMissingMapping(harness),
    };
  }

  const translation = translateHarnessStream(lines, mapping);
  const report = formatTranslateReport(translation);

  if (producedNothing(translation)) {
    return {
      ok: false,
      harness,
      linesRead: lines.length,
      error: [
        `用 ${mapping.label} 的映射表读了 ${lines.length} 行，没有产出任何事件。`,
        "这通常意味着这个文件不是该 harness 的输出，或表里的字段路径与你运行的版本不符。",
        "",
        report,
      ].join("\n"),
    };
  }

  return {
    ok: true,
    harness,
    events: translation.events,
    translation,
    report,
    linesRead: lines.length,
  };
}
