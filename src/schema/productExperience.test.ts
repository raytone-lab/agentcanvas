import { describe, expect, it } from "vitest";

import {
  defaultCodingAgentProject,
  projectExperienceV2,
  withProjectExperienceV2,
} from "./agentuxConfig";

describe("standalone product Experience v2", () => {
  it("projects Brand and Welcome with the existing Canvas composition", () => {
    const experience = projectExperienceV2(defaultCodingAgentProject);

    expect(experience.contractVersion).toBe("agentcanvas-experience-v2");
    expect(experience.brand.displayName).toBe("Coding Agent");
    expect(experience.welcome.suggestedPrompts).toHaveLength(3);
    expect(experience.canvas.layout).toEqual(defaultCodingAgentProject.layout);
  });

  it("round-trips v2 presentation without importing provider or Git authority", () => {
    const experience = projectExperienceV2(defaultCodingAgentProject);
    const changed = withProjectExperienceV2(defaultCodingAgentProject, {
      ...experience,
      brand: { ...experience.brand, displayName: "Support Copilot" },
      welcome: { ...experience.welcome, headline: "How can Support Copilot help?" },
    });

    expect(changed.product.brand.displayName).toBe("Support Copilot");
    expect(changed.product.welcome.headline).toBe("How can Support Copilot help?");
    expect(changed.providers).toEqual(defaultCodingAgentProject.providers);
    expect(changed.git).toEqual(defaultCodingAgentProject.git);
  });
});
