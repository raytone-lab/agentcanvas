import { parseAgentUXEventJSONL } from "@agent-ux/runtime";
import type { AgentUXEvent } from "@agent-ux/protocol";

import artifactActionRaw from "../fixtures/agentux/artifacts-action-correlation.events.jsonl?raw";
import basicTextRaw from "../fixtures/agentux/basic-text.events.jsonl?raw";
import codingAgentRaw from "../fixtures/agentux/coding-agent.events.jsonl?raw";
import capabilityFilesystemRaw from "../fixtures/agentux/capability-filesystem.events.jsonl?raw";
import reasoningKindsRaw from "../fixtures/agentux/reasoning-kinds.events.jsonl?raw";
import blockErrorRaw from "../fixtures/agentux/block-error.events.jsonl?raw";
import toolApprovalRaw from "../fixtures/agentux/tool-approval-lifecycle.events.jsonl?raw";

export type PreviewFixtureId =
  | "coding-agent"
  | "basic-text"
  | "reasoning-kinds"
  | "tool-approval"
  | "block-error"
  | "artifact-action"
  | "capability-filesystem";

export type PreviewFixture = {
  id: PreviewFixtureId;
  label: string;
  description: string;
  raw: string;
};

export const previewFixtures: PreviewFixture[] = [
  {
    id: "coding-agent",
    label: "Coding agent",
    description: "Completed coding run with reasoning, tools, artifact, and final output.",
    raw: codingAgentRaw,
  },
  {
    id: "reasoning-kinds",
    label: "Reasoning kinds",
    description: "Public summary, provider thinking, and private reasoning policy.",
    raw: reasoningKindsRaw,
  },
  {
    id: "tool-approval",
    label: "Tool approval",
    description: "rm approval plus fetch lifecycle states.",
    raw: toolApprovalRaw,
  },
  {
    id: "block-error",
    label: "Error block",
    description: "Recoverable run error with collapsed debug detail.",
    raw: blockErrorRaw,
  },
  {
    id: "artifact-action",
    label: "Artifact action",
    description: "Artifact creation and action correlation.",
    raw: artifactActionRaw,
  },
  {
    id: "capability-filesystem",
    label: "Capability tray",
    description: "Capability attached event for the utility panel.",
    raw: capabilityFilesystemRaw,
  },
  {
    id: "basic-text",
    label: "Basic text",
    description: "Minimal assistant text run.",
    raw: basicTextRaw,
  },
];

export function parsePreviewFixture(fixture: PreviewFixture): AgentUXEvent[] {
  return parseAgentUXEventJSONL(fixture.raw);
}
