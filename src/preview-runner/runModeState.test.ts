import { describe, expect, it } from "vitest";

import {
  createProviderConnection,
  defaultCodingAgentProject,
  type AgentFrontendProject,
  type ProviderCatalogId,
} from "../schema/agentuxConfig";
import { canUseLivePreview, initialSavedPreviewRunMode, previewModeStatusLine, runButtonControlState } from "./runModeState";

describe("preview run mode UI state", () => {
  it("keeps replay, live LLM, and harness-adapter states visually distinct", () => {
    const provider = createProviderConnection("openai", true);

    expect(previewModeStatusLine({ mode: "replay", scenarioLabel: "Coding with artifact" })).toMatchObject({
      modeLabel: "Replay mock",
      tone: "mock",
      detail: "Coding with artifact",
    });
    expect(previewModeStatusLine({ mode: "live", provider, model: "gpt-4o", liveState: "streaming" })).toMatchObject({
      modeLabel: "Live LLM",
      tone: "live",
      detail: "OpenAI · gpt-4o · streaming",
    });
    expect(previewModeStatusLine({ mode: "pi", liveState: "streaming" })).toMatchObject({
      modeLabel: "Pi agent",
      tone: "live",
      detail: "streaming",
    });
    expect(previewModeStatusLine({ mode: "harness" })).toMatchObject({
      modeLabel: "Harness",
      tone: "planned",
      detail: "adapter not wired",
    });
  });

  it("turns the topbar run button into Stop only for active Live LLM requests", () => {
    expect(runButtonControlState({ surfaceMode: "saved-preview", runMode: "live", liveRunning: true })).toEqual({
      action: "stop",
      label: "Stop",
    });
    expect(runButtonControlState({ surfaceMode: "saved-preview", runMode: "replay", liveRunning: true })).toEqual({
      action: "run",
      label: "Run",
    });
    expect(runButtonControlState({ surfaceMode: "saved-preview", runMode: "pi", liveRunning: true })).toEqual({
      action: "stop",
      label: "Stop",
    });
  });

  it("starts saved preview in Live LLM whenever the default provider supports direct preview", () => {
    expect(initialSavedPreviewRunMode({
      project: defaultCodingAgentProject,
      sessionKeys: { openai: "sk-test" },
    })).toBe("live");

    expect(initialSavedPreviewRunMode({
      project: defaultCodingAgentProject,
      sessionKeys: { openai: " " },
    })).toBe("live");

    expect(initialSavedPreviewRunMode({
      project: projectWithDefaultProvider("local"),
    })).toBe("live");

    expect(initialSavedPreviewRunMode({
      project: projectWithDefaultProvider("z-ai"),
      sessionKeys: { "z-ai": "zai-test" },
    })).toBe("live");

    expect(initialSavedPreviewRunMode({
      project: projectWithDefaultProvider("anthropic"),
      sessionKeys: { anthropic: "sk-ant-test" },
    })).toBe("replay");
  });

  it("separately reports whether Live LLM has the credentials needed to send", () => {
    expect(canUseLivePreview({
      project: defaultCodingAgentProject,
      sessionKeys: { openai: "sk-test" },
    })).toBe(true);

    expect(canUseLivePreview({
      project: defaultCodingAgentProject,
      sessionKeys: { openai: " " },
    })).toBe(false);

    expect(canUseLivePreview({
      project: projectWithDefaultProvider("local"),
    })).toBe(true);

    expect(canUseLivePreview({
      project: projectWithDefaultProvider("z-ai"),
      sessionKeys: { "z-ai": "zai-test" },
    })).toBe(true);
  });
});

function projectWithDefaultProvider(providerId: ProviderCatalogId): AgentFrontendProject {
  const provider = createProviderConnection(providerId, true);
  return {
    ...defaultCodingAgentProject,
    providers: {
      ...defaultCodingAgentProject.providers,
      defaultProviderId: provider.id,
      connections: [provider],
    },
  };
}
