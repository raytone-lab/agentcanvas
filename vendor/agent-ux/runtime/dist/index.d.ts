import type { AgentUXEvent } from "@agent-ux/protocol";

export type AgentUXToolCallState = Record<string, any>;
export type AgentUXRunState = {
  events: AgentUXEvent[];
};
export type AgentUXState = AgentUXRunState;
export type AgentUXRuntime = {
  replay(events: readonly AgentUXEvent[]): AgentUXState;
  append(event: AgentUXEvent): AgentUXState;
  reset(): AgentUXState;
  getState(): AgentUXState;
  subscribe(listener: () => void): () => void;
};

export declare function parseAgentUXEventJSONL(raw: string): AgentUXEvent[];
export declare function replayAgentUXEvents(events: readonly AgentUXEvent[]): AgentUXState;
export declare function createAgentUXRuntime(initialEvents?: readonly AgentUXEvent[]): AgentUXRuntime;
