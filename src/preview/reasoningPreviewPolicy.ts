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
     * open. That was harmless while no backend actually sent reasoning text: an open block
     * showed a status label. Now that Pi carries `reasoning.delta`, an open block shows the
     * model's full raw reasoning, which is exactly what this preset says it is not ("a safe
     * public reasoning summary … This is not raw chain-of-thought"). A finished block that
     * dumps the whole transcript inline is also simply hard to read past.
     *
     * `expanded` is the one option whose entire purpose is to stay open, so it is the one
     * exception rather than the rule.
     */
    collapseWhenDone: project.reasoning.collapse !== "expanded",
  };
}
