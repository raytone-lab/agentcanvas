import { describe, expect, it } from "vitest";
import { createAgentUXViewModel } from "@agent-ux/render-core";
import { replayAgentUXEvents } from "@agent-ux/runtime";

import { parsePreviewFixture, previewFixtures } from "./fixtures";

describe("preview fixtures", () => {
  it("parses every registered replay fixture", () => {
    for (const fixture of previewFixtures) {
      expect(parsePreviewFixture(fixture).length, fixture.id).toBeGreaterThan(0);
    }
  });

  it("defaults to a completed coding-agent replay with tool, artifact, and message output", () => {
    const fixture = previewFixtures[0];
    const events = parsePreviewFixture(fixture);
    const viewModel = createAgentUXViewModel(replayAgentUXEvents(events), {
      policy: {
        reasoning: { show: "summary" },
        tool: { showArgs: "safe", showResult: "summary" },
      },
    });

    expect(fixture.id).toBe("coding-agent");
    expect(events.at(-1)?.type).toBe("run.finished");
    expect(viewModel.status).toBe("finished");
    expect(viewModel.timeline.some((item) => item.kind === "tool")).toBe(true);
    expect(viewModel.timeline.some((item) => item.kind === "artifact")).toBe(true);
    expect(viewModel.timeline.some((item) => item.kind === "message")).toBe(true);
  });

  it("keeps the tool approval fixture aligned to real tool information flow", () => {
    const fixture = previewFixtures.find((item) => item.id === "tool-approval");
    expect(fixture).toBeDefined();
    const raw = fixture?.raw ?? "";

    expect(raw).toContain('"name":"rm"');
    expect(raw).toContain('"name":"fetch"');
    expect(raw).toContain("Remove .agent/tmp-cache recursively?");
    expect(raw).toContain("https://api.example.com/releases/latest");
    expect(raw).not.toContain("correlation metadata");
    expect(raw).not.toContain("Write without correlation");
  });

  it("provides a dedicated error fixture for block error preview", () => {
    const fixture = previewFixtures.find((item) => item.id === "block-error");
    expect(fixture).toBeDefined();
    const events = parsePreviewFixture(fixture!);
    const viewModel = createAgentUXViewModel(replayAgentUXEvents(events), {
      policy: { error: { showDeveloperMessage: true } },
    });

    expect(viewModel.status).toBe("error");
    expect(viewModel.timeline.some((item) => item.kind === "error")).toBe(true);
    expect(viewModel.errors[0]?.developerMessage).toContain("EACCES");
  });

});
