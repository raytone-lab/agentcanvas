export type AgentUXVisibility = "public" | "developer" | "debug" | "hidden";
export type AgentUXEventType = string;
export type ArtifactKind = string;
export type TerminalStatus = "success" | "error" | "cancelled" | string;

export type AgentUXEvent = {
  protocol?: "agent-ux";
  version?: string;
  id?: string;
  runId?: string;
  messageId?: string;
  seq?: number;
  ts?: number;
  type: AgentUXEventType;
  visibility?: AgentUXVisibility;
  payload: Record<string, any>;
};

export type AgentUXEventBuilderMeta = {
  id: string;
  runId: string;
  messageId?: string;
  seq: number;
  ts?: number;
  visibility?: AgentUXVisibility;
};

export declare const AGENT_UX_EVENT_TYPES: string[];
export declare const agentUXEventBuilders: Record<string, (meta: AgentUXEventBuilderMeta, payload?: Record<string, any>) => AgentUXEvent>;
export declare const agentUXClientEventBuilders: typeof agentUXEventBuilders;
export declare function parseAgentUXEvent(input: string | AgentUXEvent | Record<string, any>): AgentUXEvent;
