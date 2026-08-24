import type { AgentFrontendProject } from "../../schema/agentuxConfig";
import type { HarnessMapping } from "./harnessMapping";
import { claudeCodeMapping } from "./mappings/claudeCode";
import { codexMapping } from "./mappings/codex";
import { opencodeMapping } from "./mappings/opencode";

/**
 * Which vendor table drives which harness.
 *
 * Two independent axes decide how a backend is reached, and conflating them is the mistake to
 * avoid:
 *
 * - `project.providers.connections[].protocol` — a *model API* (`openai-compatible`,
 *   `anthropic`). One HTTP request, no tools executed. Handled by the preview runner, which
 *   dispatches on protocol.
 * - `project.runtime.harness` — an *agentic loop* that runs tools, asks for approvals and
 *   writes files. Its process is not in the browser, so we consume the JSON lines it printed.
 *   That is what this registry resolves.
 *
 * `harness: "claude"` therefore means Claude Code, the CLI, not the Anthropic API — picking
 * Anthropic as a provider is the other axis.
 */

export type HarnessId = AgentFrontendProject["runtime"]["harness"];

const MAPPINGS: Partial<Record<HarnessId, HarnessMapping>> = {
  codex: codexMapping,
  claude: claudeCodeMapping,
  opencode: opencodeMapping,
};

/**
 * The table for a harness, or undefined when we have none.
 *
 * Returning undefined matters: `agentux` is our own replay/mock transport and needs no
 * translation, while `pi` has no table at all. Handing back a silently empty mapping for `pi`
 * would render an empty transcript that looks like a working connection — the caller is
 * expected to surface `describeMissingMapping()` instead.
 */
export function mappingForHarness(harness: HarnessId): HarnessMapping | undefined {
  return MAPPINGS[harness];
}

export function mappingById(id: string): HarnessMapping | undefined {
  return Object.values(MAPPINGS).find((mapping) => mapping?.id === id);
}

/** Every table we ship, for diagnostics and tests. */
export function allMappings(): HarnessMapping[] {
  return Object.values(MAPPINGS).filter((mapping): mapping is HarnessMapping => Boolean(mapping));
}

/** Harnesses that need no translation because they already speak our protocol. */
export function speaksOurProtocol(harness: HarnessId): boolean {
  return harness === "agentux";
}

/**
 * The tool-name spellings a harness uses, for the admission layer.
 *
 * Kept here so the app never reaches into a vendor table directly: onboarding a vendor stays a
 * matter of adding a mapping file and registering it.
 */
export function aliasesForHarness(harness: HarnessId): HarnessMapping["extraAliases"] {
  return mappingForHarness(harness)?.extraAliases;
}

/** Wording a harness uses for its own bookkeeping, for the admission layer. */
export function diagnosticMarkersForHarness(harness: HarnessId): readonly string[] | undefined {
  return mappingForHarness(harness)?.diagnosticMarkers;
}

/**
 * Why a harness cannot be translated, in words a person can act on. Used for the loud failure
 * that replaces an empty screen.
 */
export function describeMissingMapping(harness: HarnessId): string {
  if (speaksOurProtocol(harness)) {
    return `harness "${harness}" 直接产出标准事件，不需要映射表。`;
  }
  const known = allMappings().map((mapping) => mapping.id).join(" / ");
  return [
    `harness "${harness}" 没有映射表，它的事件流无法翻译成标准事件。`,
    `已有映射表：${known}。`,
    `修法：在 src/harness/adapters/mappings/ 下新增一张表，并在 registry.ts 的 MAPPINGS 里注册。`,
    `只需要描述字段路径，不需要写适配器代码或改组件。`,
  ].join("\n");
}
