import { describe, expect, it } from "vitest";

import { createProviderConnection } from "../schema/agentuxConfig";
import {
  buildOpenAICompatibleChatBody,
  providerCapabilitiesForConnection,
  providerRequestParamStatus,
} from "./providerCapabilities";

describe("provider request capability layer", () => {
  it("marks thinking budget as UI-only until an adapter maps it to request params", () => {
    const provider = createProviderConnection("openai", true);
    const capabilities = providerCapabilitiesForConnection(provider);
    const body = buildOpenAICompatibleChatBody(provider, [{ role: "user", content: "hello" }], {
      thinkingBudget: "medium",
      reasoningEffort: "high",
      temperature: 0.2,
      extras: { seed: 7 },
    });

    expect(capabilities.requestParams.thinkingBudget).toBe(false);
    expect(providerRequestParamStatus(provider, "thinkingBudget")).toMatchObject({
      state: "ui-only",
      reason: "No provider-specific adapter maps thinking budget yet.",
    });
    expect(body).toMatchObject({
      model: "gpt-4o",
      stream: true,
      temperature: 0.2,
      reasoning_effort: "high",
      seed: 7,
    });
    expect(body).not.toHaveProperty("thinking_budget");
    expect(body).not.toHaveProperty("thinkingBudget");
  });

  it("keeps provider extras behind explicit capability flags", () => {
    const localProvider = createProviderConnection("local", true);
    const body = buildOpenAICompatibleChatBody(localProvider, [{ role: "user", content: "hello" }], {
      reasoningEffort: "medium",
      extras: { seed: 11 },
    });

    expect(providerCapabilitiesForConnection(localProvider).requestParams.extras).toBe(false);
    expect(body).not.toHaveProperty("reasoning_effort");
    expect(body).not.toHaveProperty("seed");
  });
});
