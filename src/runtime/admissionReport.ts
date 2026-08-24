import type { AgentUXEvent } from "@agent-ux/protocol";
import {
  formatContractReport,
  inspectAgentUXEvents,
  type ContractReport,
} from "./eventContract";
import {
  normalizeAgentUXEvents,
  summarizeRejections,
  type NormalizeOptions,
  type NormalizeResult,
} from "./eventNormalizer";

/**
 * The one call between an event source and the view model.
 *
 * Every path into the UI — a fixture, a replay, a mock stream, a live provider, a harness
 * adapter — goes through here, so admission and contract checking cannot be skipped for one
 * source and applied to another.
 *
 * Its second job is to make failure loud. The seam it replaces swallowed anything it could
 * not read: feeding an Anthropic or OpenAI SSE body into the old backend source produced
 * `status="done"`, no error, and zero rows — indistinguishable from "the agent said nothing".
 * That is the single worst failure mode for a production integration, because there is nothing
 * to search for. `admissionSeverity` and `describeAdmission` turn it into a sentence naming
 * what arrived and what to change.
 */

export type Admission = {
  /** Events cleared to reach the view model. */
  events: AgentUXEvent[];
  normalize: NormalizeResult;
  contract: ContractReport;
};

export type AdmissionSeverity = "ok" | "degraded" | "blocked";

export function admitEvents(
  input: readonly unknown[],
  options: NormalizeOptions = {},
): Admission {
  const normalize = normalizeAgentUXEvents(input, options);
  const contract = inspectAgentUXEvents(normalize.events, {
    extraDiagnosticMarkers: options.diagnosticMarkers,
  });
  return { events: normalize.events, normalize, contract };
}

/**
 * How bad it is.
 *
 * - `blocked` — events came in and nothing renderable came out. Always worth interrupting for:
 *   it means the adapter or mapping does not fit this backend at all.
 * - `degraded` — it renders, but a surface is incomplete or the backend sent something we had
 *   to hold back. Normal for a backend that simply has fewer features; worth showing in dev.
 * - `ok` — nothing to say.
 */
export function admissionSeverity(admission: Admission): AdmissionSeverity {
  const received = admission.normalize.allEvents.length;
  if (received > 0 && admission.events.length === 0) return "blocked";
  if (admission.normalize.rejected.length > 0) return "degraded";
  if (admission.normalize.undesignedTools.length > 0) return "degraded";
  if (admission.contract.issues.some((issue) => issue.severity === "error")) return "degraded";
  return "ok";
}

/** Whether there is anything worth telling a developer about. */
export function hasAdmissionFindings(admission: Admission): boolean {
  return admissionSeverity(admission) !== "ok";
}

/**
 * A readable account of what was admitted, held back, derived and rewritten, followed by the
 * contract report. Used by the debug dock, the dev console warning, and the error thrown when
 * a stream is unusable — one text, so the three never disagree.
 */
export function describeAdmission(admission: Admission): string {
  const { normalize, contract } = admission;
  const counts = summarizeRejections(normalize.rejected);
  const lines: string[] = [];

  lines.push(
    `收到 ${normalize.allEvents.length} 个事件，准入 ${normalize.events.length} 个` +
      (normalize.rejected.length > 0 ? `，held back ${normalize.rejected.length} 个。` : "。"),
  );

  if (counts["unknown-type"] > 0) {
    lines.push(
      `  ${counts["unknown-type"]} 个事件类型不在协议里 —— 适配器应把它们映射成标准类型或丢弃。`,
    );
    for (const item of firstFew(normalize.rejected, "unknown-type")) {
      lines.push(`    ${item.detail}`);
    }
  }
  if (normalize.undesignedTools.length > 0) {
    // Admitted, so the interaction still works — the component's own matcher decides how it
    // looks. Reported because an alias would give it a designed card.
    lines.push(`  ${normalize.undesignedTools.length} 个工具调用没有匹配到我们的概念（已放行，由组件自行匹配）：`);
    for (const item of normalize.undesignedTools.slice(0, 5)) {
      lines.push(`    ${item.name}`);
    }
    lines.push("    想让它拿到设计过的卡片：在 runtime/eventNormalizer.ts 的 TOOL_CONCEPT_ALIASES 里补别名，");
    lines.push("    或在该厂商的映射表里加 extraAliases。加别名不需要改组件。");
  }
  if (counts["unrenderable-concept"] > 0) {
    lines.push(
      `  ${counts["unrenderable-concept"]} 个事件对应的概念还没有组件（例如计划/待办），已移出对话流。`,
    );
  }
  if (counts.diagnostic > 0) {
    lines.push(`  ${counts.diagnostic} 个事件是后端的记账信息（token 计费、运行时配置等），不进对话流。`);
  }

  if (normalize.derivedArtifacts.length > 0) {
    lines.push(`  推导出 ${normalize.derivedArtifacts.length} 个产物（后端没发 artifact 事件）：`);
    for (const item of normalize.derivedArtifacts.slice(0, 5)) {
      lines.push(`    ${item.path}`);
    }
  }
  if (normalize.canonicalizedNames.length > 0) {
    lines.push(`  ${normalize.canonicalizedNames.length} 个工具名改写为组件认识的拼写：`);
    for (const item of normalize.canonicalizedNames.slice(0, 5)) {
      lines.push(`    ${item.from} → ${item.to}`);
    }
  }
  if (normalize.normalizedTitles.length > 0) {
    lines.push(`  ${normalize.normalizedTitles.length} 个标题从原始 args JSON 重建。`);
  }

  lines.push("");
  lines.push(formatContractReport(contract));
  return lines.join("\n");
}

function firstFew(
  rejected: NormalizeResult["rejected"],
  reason: NormalizeResult["rejected"][number]["reason"],
  limit = 5,
) {
  return rejected.filter((item) => item.reason === reason).slice(0, limit);
}

/**
 * Throw when a stream produced nothing renderable.
 *
 * For a live backend an empty screen is not an acceptable outcome: it looks like a working
 * connection. Callers on the live path use this so the failure surfaces where it can be read,
 * instead of being discovered from a screenshot.
 */
export function assertRenderable(admission: Admission, source: string): void {
  if (admissionSeverity(admission) !== "blocked") return;
  throw new Error(
    [
      `${source} 的事件流没有产出任何可渲染内容（收到 ${admission.normalize.allEvents.length} 个事件，全部被拒）。`,
      "这通常意味着事件格式不是我们的标准协议，或适配器/映射表的字段路径不对。",
      "",
      describeAdmission(admission),
    ].join("\n"),
  );
}
