/**
 * Scenario registry.
 *
 * The nine reference fixtures from the AgentMatrix Event Design Reference,
 * loaded as typed `EventFixture`s and described for the scenario picker.
 */

import type { EventFixture } from "./protocol";

import diagnosticsAndUpdate from "./fixtures/diagnostics-and-update.json";
import exhaustedIncident from "./fixtures/exhausted-incident.json";
import mcpAndInterrupt from "./fixtures/mcp-and-interrupt.json";
import normalTurn from "./fixtures/normal-turn.json";
import retryingIncident from "./fixtures/retrying-incident.json";
import runtimeLifecycle from "./fixtures/runtime-lifecycle.json";
import streamedMessage from "./fixtures/streamed-message.json";
import terminalIncident from "./fixtures/terminal-incident.json";
import toolApproval from "./fixtures/tool-approval.json";

export type ScenarioId =
  | "normal-turn"
  | "streamed-message"
  | "tool-approval"
  | "mcp-and-interrupt"
  | "runtime-lifecycle"
  | "retrying-incident"
  | "exhausted-incident"
  | "terminal-incident"
  | "diagnostics-and-update";

export type Scenario = {
  id: ScenarioId;
  title: string;
  summary: string;
  fixture: EventFixture;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "normal-turn",
    title: "Normal turn",
    summary: "User message with a file reference and one final agent answer.",
    fixture: normalTurn as EventFixture,
  },
  {
    id: "streamed-message",
    title: "Streaming thinking + message",
    summary: "Live deltas preview a thinking block and message, then durable Events replace them.",
    fixture: streamedMessage as EventFixture,
  },
  {
    id: "tool-approval",
    title: "Tool approval + completion",
    summary: "A native write pauses for confirmation, is allowed once, and completes with a diff.",
    fixture: toolApproval as EventFixture,
  },
  {
    id: "mcp-and-interrupt",
    title: "MCP success + interrupt",
    summary: "An MCP call returns a terminal reference; a later pending call is interrupted.",
    fixture: mcpAndInterrupt as EventFixture,
  },
  {
    id: "runtime-lifecycle",
    title: "Runtime boot + sync",
    summary: "Runtime status and one folded progress operation, plus an optional-resource warning.",
    fixture: runtimeLifecycle as EventFixture,
  },
  {
    id: "retrying-incident",
    title: "Retrying incident",
    summary: "A rate-limit error auto-reschedules; the incident resolves on recovery.",
    fixture: retryingIncident as EventFixture,
  },
  {
    id: "exhausted-incident",
    title: "Exhausted incident",
    summary: "Retries exhausted but the Session stays usable for a new turn.",
    fixture: exhaustedIncident as EventFixture,
  },
  {
    id: "terminal-incident",
    title: "Terminal incident",
    summary: "An unrecoverable runtime resume terminates the Session; composer is read-only.",
    fixture: terminalIncident as EventFixture,
  },
  {
    id: "diagnostics-and-update",
    title: "Config, spans, deletion",
    summary: "Configuration audit, compaction, paired model spans, and session deletion.",
    fixture: diagnosticsAndUpdate as EventFixture,
  },
];

export function scenarioById(id: ScenarioId): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}
