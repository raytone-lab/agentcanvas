export type AgentUXRenderPolicyInput = {
  reasoning?: Record<string, any>;
  tool?: Record<string, any>;
  error?: Record<string, any>;
  visibility?: Record<string, any>;
};

export type AgentUXMessageTimelineItem = Record<string, any> & {
  kind: "message";
  id: string;
  role: string;
  text: string;
};

export type AgentUXReasoningTimelineItem = Record<string, any> & {
  kind: "reasoning";
  id: string;
  status: string;
  summary?: string;
  open?: boolean;
};

export type AgentUXToolTimelineItem = Record<string, any> & {
  kind: "tool";
  id: string;
  name: string;
  title?: string;
  status: string;
  args?: unknown;
  argsText?: string;
  result?: unknown;
  preview?: string;
  approval?: Record<string, any>;
  open?: boolean;
};

export type AgentUXArtifactTimelineItem = Record<string, any> & {
  kind: "artifact";
  id: string;
  artifactKind: string;
  title?: string;
  status: string;
  content?: string;
  data?: unknown;
};

export type AgentUXStepTimelineItem = Record<string, any> & {
  kind: "step";
  id: string;
  label: string;
  status: string;
  stepKind?: string;
  scope?: Record<string, any>;
  summary?: string;
};

export type AgentUXTimelineItem =
  | AgentUXMessageTimelineItem
  | AgentUXReasoningTimelineItem
  | AgentUXToolTimelineItem
  | AgentUXArtifactTimelineItem
  | AgentUXStepTimelineItem
  | (Record<string, any> & { kind: "error"; id: string; code: string; message: string });

export type AgentUXCapabilityTrayItem = Record<string, any> & {
  id: string;
  title: string;
  status: string;
  itemCount: number;
};

export type AgentUXViewModel = {
  runId?: string;
  status: string;
  title?: string;
  timeline: AgentUXTimelineItem[];
  capabilities: AgentUXCapabilityTrayItem[];
  errors: Array<Record<string, any>>;
};

export declare function createAgentUXViewModel(input: any, options?: { policy?: AgentUXRenderPolicyInput }): AgentUXViewModel;
export declare function groupTimelineByScope(timeline: readonly AgentUXTimelineItem[]): Map<string, AgentUXTimelineItem[]>;
export declare function resolveAgentUXRenderPolicy(policy?: AgentUXRenderPolicyInput): Required<AgentUXRenderPolicyInput>;
