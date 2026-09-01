import type { AgentUXRenderPolicyInput } from "@agent-ux/render-core";

import type { AgentFrontendProject } from "../schema/agentuxConfig";

export function createReasoningRenderPolicy(project: AgentFrontendProject): AgentUXRenderPolicyInput["reasoning"] {
  return {
    show: project.reasoning.show,
    defaultOpenWhileRunning: true,
    /**
     * Everything except `expanded` closes when the run finishes.
     *
     * This used to list `auto` and `manual` only, which left `summary-first` — the default —
     * open after completion. Summary-first is a compact disclosure mode, so a finished block
     * should close regardless of whether the provider supplied a safe public summary.
     *
     * `expanded` is the one option whose entire purpose is to stay open, so it is the one
     * exception rather than the rule.
     */
    collapseWhenDone: project.reasoning.collapse !== "expanded",
  };
}
