import { describe, expect, it } from "vitest";

import {
  assertValidProject,
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

describe("project skin identity", () => {
  it("accepts the default coding-agent project", () => {
    expect(defaultCodingAgentProject.theme.skinId).toBe("native/soft-glass");
    expect(() => assertValidProject(defaultCodingAgentProject)).not.toThrow();
  });

  it("rejects a skinId that does not match stylePreset and preset", () => {
    const mismatched = {
      ...defaultCodingAgentProject,
      theme: { ...defaultCodingAgentProject.theme, skinId: "illustrated/ice-white" as const },
    };
    expect(() => assertValidProject(mismatched)).toThrow(/theme.skinId must equal native\/soft-glass/);
  });
});
