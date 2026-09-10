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

  it("defaults to the smallest complete conversation", () => {
    const fixture = previewFixtures[0];
    const events = parsePreviewFixture(fixture);
    const viewModel = createAgentUXViewModel(replayAgentUXEvents(events), {
      policy: {
        reasoning: { show: "summary" },
        tool: { showArgs: "safe", showResult: "summary" },
      },
    });

    // One question and one answer. The configurator canvas is there to show
    // the layout being configured, and the coding run put reasoning, two tool
    // cards and an artifact on it before anything had been picked.
    expect(fixture.id).toBe("simple-chat");
    expect(events.at(-1)?.type).toBe("run.finished");
    expect(viewModel.status).toBe("finished");
    expect(viewModel.timeline.some((item) => item.kind === "message")).toBe(true);
    // Nothing but the exchange: tool cards and artifacts belong to the presets
    // that ask for them, and the coding-agent fixture still has both.
    expect(viewModel.timeline.some((item) => item.kind === "tool")).toBe(false);
    expect(viewModel.timeline.some((item) => item.kind === "artifact")).toBe(false);

    const coding = previewFixtures.find((item) => item.id === "coding-agent");
    const codingTimeline = createAgentUXViewModel(
      replayAgentUXEvents(parsePreviewFixture(coding!)),
      { policy: { reasoning: { show: "summary" }, tool: { showArgs: "safe", showResult: "summary" } } },
    ).timeline;
    expect(codingTimeline.some((item) => item.kind === "tool")).toBe(true);
    expect(codingTimeline.some((item) => item.kind === "artifact")).toBe(true);
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
