import { describe, expect, it } from "vitest";

import {
  defaultCodingAgentProject,
  isSafeProviderEnvVarName,
  sanitizeProjectCredentials,
} from "./agentuxConfig";

describe("provider credential safety", () => {
  it("accepts credential environment-variable names but rejects values", () => {
    expect(isSafeProviderEnvVarName("OPENAI_API_KEY")).toBe(true);
    expect(isSafeProviderEnvVarName("CUSTOM_TOKEN")).toBe(true);
    expect(isSafeProviderEnvVarName("sk-test-secret-value-that-must-not-export")).toBe(false);
    expect(isSafeProviderEnvVarName("plainalphanumericsecretvalue")).toBe(false);
  });

  it("replaces a contaminated envVar without mutating the input project", () => {
    const contaminated = structuredClone(defaultCodingAgentProject);
    const provider = contaminated.providers.connections[0];
    provider.auth = { mode: "env", envVar: "sk-test-secret-value-that-must-not-export" };

    const sanitized = sanitizeProjectCredentials(contaminated);

    expect(contaminated.providers.connections[0].auth).toEqual({
      mode: "env",
      envVar: "sk-test-secret-value-that-must-not-export",
    });
    expect(sanitized.providers.connections[0].auth).toEqual({ mode: "env", envVar: "OPENAI_API_KEY" });
  });
});
