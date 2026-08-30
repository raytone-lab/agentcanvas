import { describe, expect, it } from "vitest";

import type { ProviderConnection } from "../schema/agentuxConfig";
import { piRuntimeConfigurationForProvider } from "./piProviderSync";

describe("Pi provider synchronization", () => {
  it("preserves the exact Z.ai endpoint and GLM model selected in the editor", () => {
    const provider: ProviderConnection = {
      id: "z-ai",
      kind: "builtin",
      label: "Z.ai",
      description: "GLM",
      protocol: "openai-compatible",
      baseUrl: "https://api.z.ai/api/paas/v4/",
      auth: { mode: "env", envVar: "ZAI_API_KEY" },
      defaultModel: "glm-5.1",
      models: ["glm-5.1", "glm-4.5"],
      enabled: true,
    };

    expect(piRuntimeConfigurationForProvider(provider, " session-secret ")).toEqual({
      provider: "z-ai",
      model: "glm-5.1",
      apiKey: "session-secret",
      providerDefinition: {
        id: "z-ai",
        name: "Z.ai",
        protocol: "openai-compatible",
        baseUrl: "https://api.z.ai/api/paas/v4/",
        models: ["glm-5.1", "glm-4.5"],
        authMode: "required",
        apiKeyEnvVar: "ZAI_API_KEY",
      },
    });
  });

  it("marks a local no-auth provider without inventing a user credential", () => {
    const provider: ProviderConnection = {
      id: "local",
      kind: "builtin",
      label: "Local",
      description: "Local model",
      protocol: "ollama-native",
      baseUrl: "http://localhost:11434/v1",
      auth: { mode: "none" },
      defaultModel: "qwen3-coder",
      models: ["qwen3-coder"],
      enabled: true,
    };

    expect(piRuntimeConfigurationForProvider(provider).providerDefinition?.authMode).toBe("none");
    expect(piRuntimeConfigurationForProvider(provider).apiKey).toBeUndefined();
    expect(piRuntimeConfigurationForProvider(provider).clearApiKey).toBeUndefined();
  });

  it("preserves an existing Pi process key on reload and clears only an explicitly emptied field", () => {
    const provider: ProviderConnection = {
      id: "z-ai",
      kind: "builtin",
      label: "Z.ai",
      description: "GLM",
      protocol: "openai-compatible",
      baseUrl: "https://api.z.ai/api/paas/v4/",
      auth: { mode: "env", envVar: "ZAI_API_KEY" },
      defaultModel: "glm-5.3-flash",
      models: ["glm-5.3-flash"],
      enabled: true,
    };

    expect(piRuntimeConfigurationForProvider(provider).clearApiKey).toBeUndefined();
    expect(piRuntimeConfigurationForProvider(provider, "").clearApiKey).toBe(true);
  });
});
