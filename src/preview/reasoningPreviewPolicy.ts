import type { AgentUXRenderPolicyInput } from "@agent-ux/render-core";

import type { AgentFrontendProject } from "../schema/agentuxConfig";

export function createReasoningRenderPolicy(project: AgentFrontendProject): AgentUXRenderPolicyInput["reasoning"] {
  return {
    show: project.reasoning.show,
    defaultOpenWhileRunning: true,
    collapseWhenDone: project.reasoning.collapse === "auto" || project.reasoning.collapse === "manual",
  };
}
