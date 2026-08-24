import type { AgentUXEvent } from "@agent-ux/protocol";
import { parseAgentUXEventJSONL } from "@agent-ux/runtime";

// A realistic single-turn coding-agent run used to seed the preview. Everything the UI
// shows is driven by these canonical AgentUX events — no data is hard-coded in components.
const runId = "exported_fixture";

const fixtureEvents: Array<Record<string, unknown>> = [
  { type: "run.started", payload: { title: "Add validation to the search input" } },
  { type: "text.started", payload: { textId: "txt_user", role: "user" } },
  { type: "text.delta", payload: { textId: "txt_user", delta: "Add input validation to the search box, then show me the patch." } },
  { type: "text.finished", payload: { textId: "txt_user" } },
  { type: "reasoning.status", payload: { reasoningId: "rsn_1", status: "planning", label: "Thinking" } },
  { type: "reasoning.delta", payload: { reasoningId: "rsn_1", kind: "summary", delta: "Read the current SearchInput, then add a validity check and loading state before wiring the request.", format: "plain" } },
  { type: "reasoning.finished", payload: { reasoningId: "rsn_1", collapsedByDefault: true } },
  { type: "tool.call.started", payload: { toolCallId: "tool_edit", name: "edit_file", title: "Patch SearchInput.tsx" } },
  { type: "tool.call.running", payload: { toolCallId: "tool_edit", args: { path: "src/components/SearchInput.tsx" } } },
  { type: "tool.call.result", payload: { toolCallId: "tool_edit", result: { changed: true, insertions: 18, deletions: 4 }, resultPreview: "+18 -4" } },
  { type: "tool.call.finished", payload: { toolCallId: "tool_edit", status: "success" } },
  { type: "artifact.created", payload: { artifactId: "art_patch", kind: "code", title: "SearchInput.tsx", mimeType: "text/typescript" } },
  { type: "artifact.delta", payload: { artifactId: "art_patch", format: "text", delta: "const isValid = query.trim().length >= 2;\n\nasync function handleSearch() {\n  if (!isValid || loading) return;\n  setLoading(true);\n  setError(null);\n  try {\n    await fetchResults(query.trim());\n  } catch {\n    setError(\"Failed to fetch results.\");\n  } finally {\n    setLoading(false);\n  }\n}" } },
  { type: "artifact.finished", payload: { artifactId: "art_patch", status: "success", uri: "memory://search-input" } },
  { type: "text.started", payload: { textId: "txt_assistant", role: "assistant", format: "markdown" } },
  { type: "text.delta", payload: { textId: "txt_assistant", delta: "Validation and loading state added. The search button is disabled for invalid input and a spinner shows while results load." } },
  { type: "text.finished", payload: { textId: "txt_assistant" } },
  { type: "run.finished", payload: { status: "success" } },
];

const codingAgentFixture = fixtureEvents
  .map((event, index) => JSON.stringify({ protocol: "agent-ux", version: "0.1", id: `evt_${index + 1}`, runId, seq: index + 1, ts: index + 1, ...event }))
  .join("\n");

export function replayFixtureEvents(): AgentUXEvent[] {
  return parseAgentUXEventJSONL(codingAgentFixture);
}
