import type { AgentUXEvent } from "@agent-ux/protocol";
import type { AgentUXRuntime, AgentUXState } from "@agent-ux/runtime";
import type { AgentUXRenderPolicyInput, AgentUXViewModel } from "@agent-ux/render-core";

export declare function useAgentUXRuntime(initialEvents?: readonly AgentUXEvent[]): AgentUXRuntime;
export declare function useAgentUXViewModel(runtime: AgentUXRuntime, options?: { policy?: AgentUXRenderPolicyInput }): AgentUXViewModel;
export declare function useAgentUXReplay(events?: readonly AgentUXEvent[], options?: { policy?: AgentUXRenderPolicyInput }): {
  runtime: AgentUXRuntime;
  state: AgentUXState;
  viewModel: AgentUXViewModel;
};
export declare function useAgentUXMessageSplit(text: string, options?: { maxChunkLength?: number }): string[];
