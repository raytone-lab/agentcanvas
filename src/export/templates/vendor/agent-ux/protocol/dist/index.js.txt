export const AGENT_UX_EVENT_TYPES = [
  "run.started",
  "run.finished",
  "run.awaiting_input",
  "run.error",
  "text.started",
  "text.delta",
  "text.finished",
  "reasoning.status",
  "reasoning.delta",
  "reasoning.summary",
  "reasoning.private",
  "reasoning.finished",
  "tool.call.started",
  "tool.call.args.delta",
  "tool.call.running",
  "tool.call.progress",
  "tool.call.awaiting_approval",
  "tool.call.result",
  "tool.call.error",
  "tool.call.finished",
  "artifact.created",
  "artifact.delta",
  "artifact.finished",
  "capability.attached",
  "step.started",
  "step.finished",
];

function event(type, meta, payload = {}) {
  return {
    protocol: "agent-ux",
    version: "0.1",
    ...meta,
    type,
    payload,
  };
}

export const agentUXEventBuilders = {
  runStarted: (meta, payload) => event("run.started", meta, payload),
  runFinished: (meta, payload) => event("run.finished", meta, payload),
  runAwaitingInput: (meta, payload) => event("run.awaiting_input", meta, payload),
  runError: (meta, payload) => event("run.error", meta, payload),

  textStarted: (meta, payload) => event("text.started", meta, payload),
  textDelta: (meta, payload) => event("text.delta", meta, payload),
  textFinished: (meta, payload) => event("text.finished", meta, payload),

  reasoningStatus: (meta, payload) => event("reasoning.status", meta, payload),
  reasoningDelta: (meta, payload) => event("reasoning.delta", meta, payload),
  reasoningSummary: (meta, payload) => event("reasoning.summary", meta, payload),
  reasoningPrivate: (meta, payload) => event("reasoning.private", meta, payload),
  reasoningFinished: (meta, payload) => event("reasoning.finished", meta, payload),

  toolCallStarted: (meta, payload) => event("tool.call.started", meta, payload),
  toolCallArgsDelta: (meta, payload) => event("tool.call.args.delta", meta, payload),
  toolCallRunning: (meta, payload) => event("tool.call.running", meta, payload),
  toolCallProgress: (meta, payload) => event("tool.call.progress", meta, payload),
  toolCallAwaitingApproval: (meta, payload) => event("tool.call.awaiting_approval", meta, payload),
  toolCallResult: (meta, payload) => event("tool.call.result", meta, payload),
  toolCallError: (meta, payload) => event("tool.call.error", meta, payload),
  toolCallFinished: (meta, payload) => event("tool.call.finished", meta, payload),

  artifactCreated: (meta, payload) => event("artifact.created", meta, payload),
  artifactDelta: (meta, payload) => event("artifact.delta", meta, payload),
  artifactFinished: (meta, payload) => event("artifact.finished", meta, payload),

  capabilityAttached: (meta, payload) => event("capability.attached", meta, payload),
  stepStarted: (meta, payload) => event("step.started", meta, payload),
  stepFinished: (meta, payload) => event("step.finished", meta, payload),
};

export const agentUXClientEventBuilders = agentUXEventBuilders;

export function parseAgentUXEvent(input) {
  const parsed = typeof input === "string" ? JSON.parse(input) : input;
  if (!parsed || typeof parsed !== "object") {
    throw new TypeError("AgentUX event must be an object.");
  }
  if (parsed.protocol && parsed.protocol !== "agent-ux") {
    throw new TypeError(`Unsupported protocol: ${parsed.protocol}`);
  }
  if (typeof parsed.type !== "string") {
    throw new TypeError("AgentUX event is missing a string type.");
  }
  return {
    protocol: "agent-ux",
    version: "0.1",
    payload: {},
    ...parsed,
  };
}
