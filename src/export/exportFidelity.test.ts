import { describe, expect, it } from "vitest";

import { defaultCodingAgentProject } from "../schema/agentuxConfig";
import { applyPresetOption, isPresetOptionActive } from "../schema/presetActions";
import { createScaffoldExportSnapshot } from "./scaffoldManifest";

/**
 * The export must be the thing that was composed — not a plainer relative of it.
 *
 * Every other export test uses `defaultCodingAgentProject`, which cannot catch a choice that
 * silently fails to travel: the default value and the dropped value look identical. These
 * compose a deliberately non-default project and check each decision survived.
 *
 * The precondition the product states is that the recipient wires their own model, key and
 * agent. That is about where *events* come from and is independent of this: the composition
 * lives in `exported-project.ts` as static configuration, so connecting a backend cannot move
 * it. The last test pins that independence.
 */

/** Options chosen to be visibly different from the defaults, one per composed surface. */
const COMPOSED_OPTIONS = [
  "writing-typewriter",
  "thinking-orbit",
  "reasoning-model-thinking",
  "timeline-rail",
  "tool-detail-output-only",
  "tool-approval-hidden",
  "prompt-shortcuts",
  "output-source-console",
] as const;

/**
 * Applies only what is not already on.
 *
 * `applyPresetOption` toggles, so blindly applying an option that ships enabled turns it off —
 * `sidebar-search` is on by default and an earlier version of this test switched it off and
 * then reported it as "dropped by the export". Skipping actives keeps the test honest about
 * what it is measuring whatever the defaults become.
 */
function composeProject() {
  let project = defaultCodingAgentProject;
  for (const id of COMPOSED_OPTIONS) {
    if (!isPresetOptionActive(project, id)) {
      project = applyPresetOption(project, id);
    }
  }
  return project;
}

describe("export fidelity: the package is what was composed", () => {
  it("keeps every composed option active in the project it exports", () => {
    const project = composeProject();
    const dropped = COMPOSED_OPTIONS.filter((id) => !isPresetOptionActive(project, id));
    expect(dropped).toEqual([]);
  });

  it("writes the composed values into exported-project.ts", () => {
    const project = composeProject();
    const snapshot = createScaffoldExportSnapshot(project);
    const exported = snapshot.fileContents["src/exported-project.ts"] ?? "";
    expect(exported).not.toBe("");

    // Parsed rather than string-matched: a substring check would pass on a stale comment.
    // Sliced from the assignment, not the file's first brace — that one belongs to the
    // `import type { AgentFrontendProject }` line.
    const body = exported.slice(exported.indexOf("export const project ="));
    const parsed = JSON.parse(
      body.slice(body.indexOf("{"), body.lastIndexOf("}") + 1),
    ) as typeof project;

    expect(parsed.theme.motion.writing).toBe(project.theme.motion.writing);
    expect(parsed.theme.motion.reasoning).toBe(project.theme.motion.reasoning);
    expect(parsed.theme.motion.toolCall).toBe(project.theme.motion.toolCall);
    expect(parsed.reasoning).toEqual(project.reasoning);
    expect(parsed.toolCalls).toEqual(project.toolCalls);
    expect(parsed.composer).toEqual(project.composer);
    expect(parsed.sidebar).toEqual(project.sidebar);
    expect(parsed.output).toEqual(project.output);
    expect(parsed.layout).toEqual(project.layout);
  });

  it("ships the components those choices need to render", () => {
    const snapshot = createScaffoldExportSnapshot(composeProject());
    for (const file of [
      "src/components/agent-preview/ChatFrame.tsx",
      "src/components/agent-preview/ReasoningBlock.tsx",
      "src/components/agent-preview/ToolCallCard.tsx",
      "src/components/agent-preview/ComposerFrame.tsx",
      "src/components/agent-preview/OutputFrame.tsx",
      "src/components/agent-preview/SessionSidebar.tsx",
      "src/slots/slotRegistry.tsx",
      "src/styles/app.css",
    ]) {
      expect(snapshot.files, `${file} must ship`).toContain(file);
    }
  });

  it("ships a way to translate a real vendor stream, not only fixtures", () => {
    // The recipient supplies the model; they should not also have to write the translation for
    // the vendors we already support.
    const snapshot = createScaffoldExportSnapshot(composeProject());
    for (const file of [
      "src/adapters/backendAdapter.ts",
      "src/harness/adapters/jsonlImport.ts",
      "src/harness/adapters/tableDrivenAdapter.ts",
      "src/harness/adapters/anthropicAdapter.ts",
      "src/harness/adapters/eventWriter.ts",
      "src/harness/adapters/mappings/claudeCode.ts",
      "src/harness/adapters/mappings/codex.ts",
      "src/harness/adapters/mappings/opencode.ts",
    ]) {
      expect(snapshot.files, `${file} must ship`).toContain(file);
    }
  });

  it("exports the same composition whatever the event source will be", () => {
    // Wiring a backend changes `runtime.transport`, nothing else. If any composed surface were
    // derived from the transport, a recipient would see a different UI than the one saved.
    const composed = composeProject();
    const asReplay = createScaffoldExportSnapshot({
      ...composed,
      runtime: { ...composed.runtime, transport: "replay" },
    });
    const asSse = createScaffoldExportSnapshot({
      ...composed,
      runtime: { ...composed.runtime, transport: "sse" },
    });

    const strip = (source: string) => source.replace(/"transport":\s*"[a-z]+"/, '"transport":"*"');
    expect(strip(asSse.fileContents["src/exported-project.ts"] ?? "")).toBe(
      strip(asReplay.fileContents["src/exported-project.ts"] ?? ""),
    );
    // And the shipped file list must not change either.
    expect(asSse.files).toEqual(asReplay.files);
  });
});
