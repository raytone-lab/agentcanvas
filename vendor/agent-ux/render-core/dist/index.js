export function createAgentUXViewModel(input, options = {}) {
  const events = getEvents(input).filter((event) => isVisible(event, options)).sort(compareEvents);
  const viewModel = {
    runId: events[0]?.runId,
    status: events.length ? "running" : "idle",
    title: undefined,
    timeline: [],
    capabilities: [],
    errors: [],
  };

  const messages = new Map();
  const reasoning = new Map();
  const tools = new Map();
  const artifacts = new Map();
  const steps = new Map();

  for (const event of events) {
    const payload = event.payload ?? {};
    viewModel.runId = viewModel.runId ?? event.runId;

    switch (event.type) {
      case "run.started":
        viewModel.status = "running";
        viewModel.title = payload.title ?? viewModel.title;
        break;
      case "run.finished":
        viewModel.status = payload.status === "error" ? "error" : "finished";
        break;
      case "run.awaiting_input":
        viewModel.status = "awaiting_input";
        break;
      case "run.error":
        addRunError(viewModel, event);
        break;
      case "text.started":
        ensureMessage(viewModel, messages, event);
        break;
      case "text.delta":
        appendMessageDelta(viewModel, messages, event);
        break;
      case "text.finished":
        finishMessage(viewModel, messages, event);
        break;
      case "reasoning.status":
        ensureReasoning(viewModel, reasoning, event, options);
        break;
      case "reasoning.delta":
      case "reasoning.summary":
        appendReasoning(viewModel, reasoning, event, options);
        break;
      case "reasoning.finished":
        finishReasoning(viewModel, reasoning, event, options);
        break;
      case "tool.call.started":
        startTool(viewModel, tools, event);
        break;
      case "tool.call.args.delta":
        appendToolArgs(viewModel, tools, event);
        break;
      case "tool.call.running":
        runTool(viewModel, tools, event);
        break;
      case "tool.call.awaiting_approval":
        awaitToolApproval(viewModel, tools, event);
        viewModel.status = viewModel.status === "error" ? "error" : "awaiting_input";
        break;
      case "tool.call.result":
        resultTool(viewModel, tools, event);
        break;
      case "tool.call.error":
        errorTool(viewModel, tools, event);
        break;
      case "tool.call.finished":
        finishTool(viewModel, tools, event);
        break;
      case "artifact.created":
        createArtifact(viewModel, artifacts, event);
        break;
      case "artifact.delta":
        appendArtifact(viewModel, artifacts, event);
        break;
      case "artifact.finished":
        finishArtifact(viewModel, artifacts, event);
        break;
      case "capability.attached":
        attachCapability(viewModel, event);
        break;
      case "step.started":
        startStep(viewModel, steps, event);
        break;
      case "step.finished":
        finishStep(viewModel, steps, event);
        break;
      default:
        break;
    }
  }

  return viewModel;
}

export function groupTimelineByScope(timeline) {
  const groups = new Map();
  for (const item of timeline ?? []) {
    const key = item.scope?.kind ?? item.stepKind ?? item.kind;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

export function resolveAgentUXRenderPolicy(policy = {}) {
  return {
    reasoning: {
      show: "summary",
      defaultOpenWhileRunning: true,
      collapseWhenDone: true,
      ...(policy.reasoning ?? {}),
    },
    tool: {
      showArgs: "safe",
      showResult: "summary",
      ...(policy.tool ?? {}),
    },
    error: {
      showDeveloperMessage: false,
      showRawError: false,
      ...(policy.error ?? {}),
    },
    visibility: {
      show: "public",
      ...(policy.visibility ?? {}),
    },
  };
}

function getEvents(input) {
  if (Array.isArray(input)) {
    return [...input];
  }
  if (Array.isArray(input?.events)) {
    return [...input.events];
  }
  if (typeof input?.getState === "function") {
    return getEvents(input.getState());
  }
  return [];
}

function compareEvents(a, b) {
  return (a.seq ?? 0) - (b.seq ?? 0) || (a.ts ?? 0) - (b.ts ?? 0) || String(a.id).localeCompare(String(b.id));
}

function isVisible(event, options) {
  if (event.visibility === "hidden") {
    return false;
  }
  if (event.visibility === "debug") {
    const show = options.policy?.visibility?.show ?? "public";
    return show === "debug" || show === "developer";
  }
  return true;
}

function pushOnce(viewModel, item) {
  if (!viewModel.timeline.includes(item)) {
    viewModel.timeline.push(item);
  }
}

function messageKey(event) {
  return event.payload?.textId ?? event.messageId ?? event.id;
}

function ensureMessage(viewModel, messages, event) {
  const payload = event.payload ?? {};
  const key = messageKey(event);
  let item = messages.get(key);
  if (!item) {
    item = {
      kind: "message",
      id: event.messageId ?? key,
      role: payload.role ?? "assistant",
      text: "",
      status: "streaming",
      format: payload.format,
    };
    messages.set(key, item);
    pushOnce(viewModel, item);
  }
  item.role = payload.role ?? item.role;
  item.format = payload.format ?? item.format;
  return item;
}

function appendMessageDelta(viewModel, messages, event) {
  const item = ensureMessage(viewModel, messages, event);
  item.text += String(event.payload?.delta ?? "");
}

function finishMessage(viewModel, messages, event) {
  const item = ensureMessage(viewModel, messages, event);
  item.status = "done";
}

function reasoningKey(event) {
  return event.payload?.reasoningId ?? event.id;
}

function ensureReasoning(viewModel, reasoning, event, options) {
  const payload = event.payload ?? {};
  const key = reasoningKey(event);
  let item = reasoning.get(key);
  if (!item) {
    item = {
      kind: "reasoning",
      id: key,
      label: payload.label,
      status: normalizeReasoningStatus(payload.status),
      summary: "",
      open: options.policy?.reasoning?.defaultOpenWhileRunning ?? true,
    };
    reasoning.set(key, item);
    pushOnce(viewModel, item);
  }
  item.label = payload.label ?? item.label;
  item.status = normalizeReasoningStatus(payload.status ?? item.status);
  return item;
}

function appendReasoning(viewModel, reasoning, event, options) {
  const payload = event.payload ?? {};
  const kind = payload.kind ?? (event.type === "reasoning.summary" ? "summary" : "summary");
  if (!shouldShowReasoningText(kind, options)) {
    ensureReasoning(viewModel, reasoning, event, options);
    return;
  }
  const item = ensureReasoning(viewModel, reasoning, event, options);
  const delta = event.type === "reasoning.summary" ? payload.summary ?? payload.delta : payload.delta ?? payload.summary;
  item.summary = joinText(item.summary, delta);
}

function finishReasoning(viewModel, reasoning, event, options) {
  const item = ensureReasoning(viewModel, reasoning, event, options);
  item.status = "done";
  const collapsedByDefault = event.payload?.collapsedByDefault;
  const collapseWhenDone = options.policy?.reasoning?.collapseWhenDone;
  item.open = collapseWhenDone === true ? false : collapsedByDefault === false;
}

function normalizeReasoningStatus(status) {
  if (!status || status === "done" || status === "finished") {
    return status === "done" || status === "finished" ? "done" : "running";
  }
  return status;
}

function shouldShowReasoningText(kind, options) {
  const show = options.policy?.reasoning?.show ?? "summary";
  if (show === "status") {
    return false;
  }
  if (show === "thinking") {
    return kind === "summary" || kind === "thinking";
  }
  return kind === "summary" || kind === "delta" || kind === undefined;
}

function toolKey(event) {
  return event.payload?.toolCallId ?? event.id;
}

function ensureTool(viewModel, tools, event) {
  const payload = event.payload ?? {};
  const key = toolKey(event);
  let item = tools.get(key);
  if (!item) {
    item = {
      kind: "tool",
      id: key,
      name: payload.name ?? "tool",
      title: payload.title,
      status: "running",
      argsText: "",
      args: undefined,
      result: undefined,
      preview: undefined,
      approval: undefined,
      open: true,
    };
    tools.set(key, item);
    pushOnce(viewModel, item);
  }
  item.name = payload.name ?? item.name;
  item.title = payload.title ?? item.title;
  return item;
}

function startTool(viewModel, tools, event) {
  const item = ensureTool(viewModel, tools, event);
  item.status = event.payload?.safety === "needs_approval" ? "awaiting_approval" : "running";
  item.open = item.status !== "success";
}

function appendToolArgs(viewModel, tools, event) {
  const item = ensureTool(viewModel, tools, event);
  item.argsText = `${item.argsText ?? ""}${event.payload?.delta ?? ""}`;
  item.args = parseJsonLike(item.argsText) ?? item.args;
  if (item.status !== "awaiting_approval") {
    item.status = "args_streaming";
  }
}

function runTool(viewModel, tools, event) {
  const item = ensureTool(viewModel, tools, event);
  item.status = "running";
  item.args = event.payload?.args ?? item.args ?? parseJsonLike(item.argsText);
  item.open = true;
}

function awaitToolApproval(viewModel, tools, event) {
  const item = ensureTool(viewModel, tools, event);
  item.status = "awaiting_approval";
  item.approval = {
    prompt: event.payload?.prompt,
    argsPreview: event.payload?.argsPreview,
    metadata: event.payload?.metadata,
  };
  item.args = item.args ?? event.payload?.argsPreview ?? parseJsonLike(item.argsText);
  item.open = true;
}

function resultTool(viewModel, tools, event) {
  const item = ensureTool(viewModel, tools, event);
  item.result = event.payload?.result;
  item.preview = event.payload?.resultPreview ?? stringifyPreview(event.payload?.result);
}

function errorTool(viewModel, tools, event) {
  const item = ensureTool(viewModel, tools, event);
  item.status = "error";
  item.result = event.payload?.message ?? event.payload?.error;
  item.preview = event.payload?.message ?? event.payload?.code ?? "Tool failed";
  item.open = true;
}

function finishTool(viewModel, tools, event) {
  const item = ensureTool(viewModel, tools, event);
  item.status = normalizeToolStatus(event.payload?.status);
  item.open = item.status === "error" || item.status === "awaiting_approval";
}

function normalizeToolStatus(status) {
  if (status === "success" || status === "succeeded" || status === "completed") {
    return "success";
  }
  if (status === "cancelled" || status === "canceled") {
    return "cancelled";
  }
  if (status === "error" || status === "failed") {
    return "error";
  }
  return status ?? "success";
}

function artifactKey(event) {
  return event.payload?.artifactId ?? event.id;
}

function ensureArtifact(viewModel, artifacts, event) {
  const payload = event.payload ?? {};
  const key = artifactKey(event);
  let item = artifacts.get(key);
  if (!item) {
    item = {
      kind: "artifact",
      id: key,
      artifactKind: payload.kind ?? payload.artifactKind ?? "data",
      title: payload.title,
      mimeType: payload.mimeType,
      status: "running",
      content: "",
      data: undefined,
      uri: undefined,
    };
    artifacts.set(key, item);
    pushOnce(viewModel, item);
  }
  item.artifactKind = payload.kind ?? payload.artifactKind ?? item.artifactKind;
  item.title = payload.title ?? item.title;
  item.mimeType = payload.mimeType ?? item.mimeType;
  return item;
}

function createArtifact(viewModel, artifacts, event) {
  ensureArtifact(viewModel, artifacts, event);
}

function appendArtifact(viewModel, artifacts, event) {
  const item = ensureArtifact(viewModel, artifacts, event);
  if (event.payload?.data !== undefined) {
    item.data = event.payload.data;
  }
  if (event.payload?.delta !== undefined) {
    item.content += String(event.payload.delta);
  }
}

function finishArtifact(viewModel, artifacts, event) {
  const item = ensureArtifact(viewModel, artifacts, event);
  item.status = event.payload?.status ?? "success";
  item.uri = event.payload?.uri ?? item.uri;
}

function attachCapability(viewModel, event) {
  const payload = event.payload ?? {};
  viewModel.capabilities.push({
    kind: "capability",
    id: payload.capabilityId ?? event.id,
    status: payload.status ?? "attached",
    title: payload.title ?? payload.kind ?? "Capability",
    description: payload.description,
    source: payload.source ?? { kind: payload.kind ?? "unknown" },
    itemCount: Array.isArray(payload.items) ? payload.items.length : payload.itemCount ?? 0,
    items: payload.items ?? [],
  });
}

function stepKey(event) {
  return event.payload?.stepId ?? event.id;
}

function ensureStep(viewModel, steps, event) {
  const payload = event.payload ?? {};
  const key = stepKey(event);
  let item = steps.get(key);
  if (!item) {
    item = {
      kind: "step",
      id: key,
      label: payload.label ?? "Step",
      status: "started",
      stepKind: payload.stepKind,
      scope: payload.scope,
      summary: payload.summary,
    };
    steps.set(key, item);
    pushOnce(viewModel, item);
  }
  item.label = payload.label ?? item.label;
  item.stepKind = payload.stepKind ?? item.stepKind;
  item.scope = payload.scope ?? item.scope;
  item.summary = payload.summary ?? item.summary;
  return item;
}

function startStep(viewModel, steps, event) {
  ensureStep(viewModel, steps, event);
}

function finishStep(viewModel, steps, event) {
  const item = ensureStep(viewModel, steps, event);
  item.status = normalizeStepStatus(event.payload?.status);
  item.summary = event.payload?.summary ?? item.summary;
}

function normalizeStepStatus(status) {
  if (status === "success" || status === "completed") {
    return "success";
  }
  if (status === "error" || status === "failed") {
    return "error";
  }
  if (status === "warning" || status === "info") {
    return status;
  }
  return status ?? "running";
}

function addRunError(viewModel, event) {
  const payload = event.payload ?? {};
  const error = {
    kind: "error",
    id: event.id,
    code: payload.code ?? "run_error",
    message: payload.message ?? payload.userMessage ?? "Run failed.",
    userMessage: payload.userMessage ?? payload.message ?? "Run failed.",
    developerMessage: payload.developerMessage ?? payload.message,
    retryable: payload.retryable ?? false,
    category: payload.category,
    raw: payload,
  };
  viewModel.status = "error";
  viewModel.errors.push(error);
  pushOnce(viewModel, error);
}

function joinText(current, next) {
  if (next === undefined || next === null) {
    return current ?? "";
  }
  return `${current ?? ""}${String(next)}`;
}

function parseJsonLike(value) {
  if (!value || typeof value !== "string") {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function stringifyPreview(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string") {
    return value.split(/\r?\n/)[0];
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
