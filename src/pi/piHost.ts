import type { IncomingMessage, ServerResponse } from "node:http";

import type { AgentUXEvent } from "@agent-ux/protocol";
import type { ToolDefinition } from "@earendil-works/pi-coding-agent";

import {
  createPiEventAdapter,
  type PiApprovalDecision,
  type PiEventAdapter,
  type PiWireEvent,
} from "../harness/adapters/piAdapter.ts";
import {
  PI_API_PREFIX,
  type PiModelInfo,
  type PiPromptInput,
  type PiProviderDefinition,
  type PiRuntimeConfiguration,
  type PiRuntimeState,
} from "./piClient.ts";

export type PiPermissionMode = NonNullable<PiPromptInput["permissionMode"]>;

export type PiSessionBridge = {
  subscribe(listener: (event: PiWireEvent) => void): () => void;
  prompt(text: string): Promise<void>;
  abort(): Promise<void>;
  dispose(): void;
  configure(input: PiRuntimeConfiguration): Promise<void>;
  state(): Promise<Omit<PiRuntimeState, "available" | "cwd" | "running">>;
  newSession(): Promise<void>;
};

export type PiBridgeFactory = (input: { cwd: string; approvalGate: PiApprovalGate }) => Promise<PiSessionBridge>;

type PendingApproval = {
  toolName: string;
  resolve: (decision: PiApprovalDecision) => void;
  reject: (error: Error) => void;
  cleanup: () => void;
};

/** Shared by the Pi tool wrappers and the HTTP controller. */
export class PiApprovalGate {
  private mode: PiPermissionMode = "request";
  private readonly alwaysApproved = new Set<string>();
  private readonly pending = new Map<string, PendingApproval>();

  setMode(mode: PiPermissionMode) {
    this.mode = mode;
  }

  requiresApproval(toolName: string, args: unknown): boolean {
    if (this.mode === "allow-all" || this.alwaysApproved.has(toolName)) return false;
    if (this.mode === "request") return MUTATING_TOOLS.has(toolName);
    return toolName === "bash" && isRiskyCommand(stringField(asRecord(args), "command") ?? "");
  }

  async wait(toolCallId: string, toolName: string, args: unknown, signal?: AbortSignal): Promise<void> {
    if (!this.requiresApproval(toolName, args)) return;
    const decision = await new Promise<PiApprovalDecision>((resolve, reject) => {
      const onAbort = () => reject(new Error("Tool approval was cancelled."));
      const cleanup = () => signal?.removeEventListener("abort", onAbort);
      signal?.addEventListener("abort", onAbort, { once: true });
      this.pending.set(toolCallId, { toolName, resolve, reject, cleanup });
    }).finally(() => {
      const pending = this.pending.get(toolCallId);
      pending?.cleanup();
      this.pending.delete(toolCallId);
    });
    if (decision === "no") throw new Error("Tool execution was denied by the user.");
    if (decision === "always") this.alwaysApproved.add(toolName);
  }

  resolve(toolCallId: string, decision: PiApprovalDecision): boolean {
    const pending = this.pending.get(toolCallId);
    if (!pending) return false;
    pending.resolve(decision);
    return true;
  }

  cancelAll(message = "Pi run ended before approval was decided.") {
    for (const pending of this.pending.values()) pending.reject(new Error(message));
    this.pending.clear();
  }
}

export type PiRuntimeController = {
  state(conversationId?: string): Promise<PiRuntimeState>;
  configure(input: PiRuntimeConfiguration): Promise<PiRuntimeState>;
  runPrompt(input: PiPromptInput, onEvent: (event: AgentUXEvent) => void): Promise<void>;
  abort(): Promise<void>;
  resolveApproval(toolCallId: string, decision: PiApprovalDecision): boolean;
  newSession(conversationId?: string): Promise<PiRuntimeState>;
  dispose(): void;
};

export function createPiRuntimeController(options: {
  cwd: string;
  bridgeFactory?: PiBridgeFactory;
}): PiRuntimeController {
  const { cwd } = options;
  const approvalGate = new PiApprovalGate();
  const bridgeFactory = options.bridgeFactory ?? createDefaultPiBridge;
  const bridgePromises = new Map<string, Promise<PiSessionBridge>>();
  /** Conversations that have already announced their tool set — see `runPrompt`. */
  const announcedCapabilities = new Set<string>();
  const defaultConversationId = "default";
  const maxConversations = 12;
  let activeConversationId = defaultConversationId;
  let activeBridge: PiSessionBridge | undefined;
  let activeAdapter: PiEventAdapter | undefined;
  let running = false;

  const bridge = (conversationId = activeConversationId) => {
    const id = normalizeConversationId(conversationId);
    activeConversationId = id;
    const existing = bridgePromises.get(id);
    if (existing) {
      bridgePromises.delete(id);
      bridgePromises.set(id, existing);
      return existing;
    }
    const created = bridgeFactory({ cwd, approvalGate }).catch((error) => {
      bridgePromises.delete(id);
      throw error;
    });
    bridgePromises.set(id, created);
    while (bridgePromises.size > maxConversations) {
      const oldestId = bridgePromises.keys().next().value as string | undefined;
      if (!oldestId) break;
      const oldest = bridgePromises.get(oldestId);
      bridgePromises.delete(oldestId);
      void oldest?.then((current) => current.dispose());
    }
    return created;
  };

  const state = async (conversationId = activeConversationId): Promise<PiRuntimeState> => {
    try {
      const current = await bridge(conversationId);
      return { available: true, cwd, running, ...(await current.state()) };
    } catch (error) {
      return {
        available: false,
        cwd,
        running: false,
        models: [],
        tools: [],
        error: errorMessage(error),
      };
    }
  };

  return {
    state,
    async configure(input) {
      const conversationId = normalizeConversationId(input.conversationId);
      const current = await bridge(conversationId);
      await current.configure(input);
      return state(conversationId);
    },
    async runPrompt(input, onEvent) {
      const prompt = input.prompt?.trim();
      if (!prompt) throw new Error("Pi prompt is empty.");
      if (running) throw new Error("A Pi run is already active.");
      const conversationId = normalizeConversationId(input.conversationId);
      const current = await bridge(conversationId);
      approvalGate.setMode(input.permissionMode ?? "request");
      if (input.provider || input.model || input.thinkingLevel) {
        await current.configure({ provider: input.provider, model: input.model, thinkingLevel: input.thinkingLevel });
      }

      running = true;
      const adapter = createPiEventAdapter({
        runId: `pi_${Date.now().toString(36)}`,
        onEvent,
        requiresApproval: (toolName, args) => approvalGate.requiresApproval(toolName, args),
      });
      activeBridge = current;
      activeAdapter = adapter;
      const unsubscribe = current.subscribe((event) => adapter.apply(event));
      try {
        // Once per conversation, before the first prompt. Canonical events accumulate across
        // turns in the browser, so announcing on every turn would stack a duplicate row in
        // `CapabilityTray` per turn.
        if (!announcedCapabilities.has(conversationId)) {
          announcedCapabilities.add(conversationId);
          const tools = await current.state().then((value) => value.tools).catch(() => []);
          adapter.attachCapabilities(tools);
        }
        adapter.startUserMessage(prompt);
        await current.prompt(prompt);
        adapter.finish("success");
      } catch (error) {
        adapter.apply({ type: "extension_error", message: errorMessage(error) });
      } finally {
        unsubscribe();
        approvalGate.cancelAll();
        activeBridge = undefined;
        activeAdapter = undefined;
        running = false;
      }
    },
    async abort() {
      approvalGate.cancelAll("Pi run was stopped.");
      await activeBridge?.abort();
      activeAdapter?.finish("cancelled");
    },
    resolveApproval(toolCallId, decision) {
      activeAdapter?.resolveApproval(toolCallId, decision);
      return approvalGate.resolve(toolCallId, decision);
    },
    async newSession(conversationId) {
      if (running) throw new Error("Stop the active Pi run before starting a new session.");
      const id = normalizeConversationId(conversationId);
      const current = await bridge(id);
      await current.newSession();
      // A new session starts with an empty transcript, so its tool set has to be announced
      // again or `CapabilityTray` would stay empty for the rest of the conversation's life.
      announcedCapabilities.delete(id);
      return state(id);
    },
    dispose() {
      approvalGate.cancelAll();
      for (const pending of bridgePromises.values()) void pending.then((current) => current.dispose());
      bridgePromises.clear();
      announcedCapabilities.clear();
    },
  };
}

export function createPiHttpHost(options: {
  cwd: string;
  bridgeFactory?: PiBridgeFactory;
}) {
  const controller = createPiRuntimeController(options);

  return {
    controller,
    async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (!url.pathname.startsWith(PI_API_PREFIX)) return false;
      setLocalHeaders(res);
      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return true;
      }

      try {
        if (req.method === "GET" && url.pathname === `${PI_API_PREFIX}/state`) {
          sendJson(res, 200, await controller.state(url.searchParams.get("conversationId") ?? undefined));
          return true;
        }
        if (req.method === "POST" && url.pathname === `${PI_API_PREFIX}/config`) {
          sendJson(res, 200, await controller.configure(await readJson(req)));
          return true;
        }
        if (req.method === "POST" && url.pathname === `${PI_API_PREFIX}/abort`) {
          await controller.abort();
          sendJson(res, 200, { ok: true });
          return true;
        }
        if (req.method === "POST" && url.pathname === `${PI_API_PREFIX}/approval`) {
          const body = await readJson(req);
          const toolCallId = stringField(body, "toolCallId");
          const decision = approvalDecision(body.decision);
          if (!toolCallId || !decision) {
            sendJson(res, 400, { error: "toolCallId and a valid decision are required." });
          } else if (!controller.resolveApproval(toolCallId, decision)) {
            sendJson(res, 409, { error: "This Pi approval is no longer pending." });
          } else {
            sendJson(res, 200, { ok: true });
          }
          return true;
        }
        if (req.method === "POST" && url.pathname === `${PI_API_PREFIX}/session/new`) {
          const body = await readJson(req);
          sendJson(res, 200, await controller.newSession(stringField(body, "conversationId")));
          return true;
        }
        if (req.method === "POST" && url.pathname === `${PI_API_PREFIX}/prompt`) {
          const body = await readJson(req);
          const prompt = stringField(body, "prompt")?.trim();
          if (!prompt) {
            sendJson(res, 400, { error: "Pi prompt is required." });
            return true;
          }
          res.statusCode = 200;
          res.setHeader("content-type", "application/x-ndjson; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          res.flushHeaders();
          let completed = false;
          const abortOnDisconnect = () => {
            if (!completed) void controller.abort();
          };
          res.once("close", abortOnDisconnect);
          await controller.runPrompt({
            conversationId: stringField(body, "conversationId"),
            prompt,
            provider: stringField(body, "provider"),
            model: stringField(body, "model"),
            thinkingLevel: stringField(body, "thinkingLevel"),
            permissionMode: permissionMode(body.permissionMode),
          }, (event) => {
            if (!res.destroyed) res.write(`${JSON.stringify(event)}\n`);
          });
          completed = true;
          res.off("close", abortOnDisconnect);
          res.end();
          return true;
        }
        sendJson(res, 404, { error: "Unknown Pi endpoint." });
      } catch (error) {
        if (!res.headersSent) sendJson(res, errorMessage(error).includes("already active") ? 409 : 500, { error: errorMessage(error) });
        else if (!res.destroyed) res.end();
      }
      return true;
    },
    dispose() {
      controller.dispose();
    },
  };
}

async function createDefaultPiBridge(input: { cwd: string; approvalGate: PiApprovalGate }): Promise<PiSessionBridge> {
  const pi = await import("@earendil-works/pi-coding-agent");
  const { InMemoryCredentialStore } = await import("@earendil-works/pi-ai");
  const modelRuntime = await pi.ModelRuntime.create({
    allowModelNetwork: false,
    credentials: new InMemoryCredentialStore(),
  });
  let session = await createSession();

  async function createSession() {
    const definitions = [
      pi.createReadToolDefinition(input.cwd),
      pi.createBashToolDefinition(input.cwd),
      pi.createEditToolDefinition(input.cwd),
      pi.createWriteToolDefinition(input.cwd),
      pi.createGrepToolDefinition(input.cwd),
      pi.createFindToolDefinition(input.cwd),
      pi.createLsToolDefinition(input.cwd),
    ].map((definition) => guardTool(definition, input.approvalGate)) as ToolDefinition<any, any, any>[];
    const result = await pi.createAgentSession({
      cwd: input.cwd,
      modelRuntime,
      sessionManager: pi.SessionManager.inMemory(input.cwd),
      noTools: "builtin",
      customTools: definitions,
    });
    return result.session;
  }

  return {
    subscribe(listener) {
      return session.subscribe((event) => listener(event as unknown as PiWireEvent));
    },
    prompt(text) {
      return session.prompt(text);
    },
    abort() {
      return session.abort();
    },
    dispose() {
      session.dispose();
    },
    async configure(config) {
      if (config.providerDefinition) {
        registerEditorProvider(modelRuntime, config.providerDefinition, config.provider, config.model);
      }
      if (config.provider) {
        if (config.apiKey) await modelRuntime.setRuntimeApiKey(config.provider, config.apiKey);
        else if (config.clearApiKey) {
          try {
            await modelRuntime.removeRuntimeApiKey(config.provider);
          } catch (error) {
            // removeRuntimeApiKey clears the in-memory key before Pi refreshes availability.
            // A provider that relies on an env var which is not present in this process then
            // reports "No API key" during that refresh. Configuration is still valid and the
            // exact model can be selected; the later prompt will surface the missing credential.
            if (!isMissingPiCredentialError(error)) throw error;
          }
        }
      }
      if (config.provider || config.model) {
        const provider = config.provider ?? session.model?.provider;
        const modelId = config.model ?? session.model?.id;
        const model = provider && modelId ? modelRuntime.getModel(provider, modelId) : undefined;
        if (!model) throw new Error(`Pi model not found: ${provider ?? "provider"}/${modelId ?? "model"}`);
        await session.setModel(model);
      }
      if (config.thinkingLevel) session.setThinkingLevel(normalizeThinkingLevel(config.thinkingLevel));
    },
    async state() {
      let availableModels: readonly { provider: string; id: string }[] = [];
      try {
        availableModels = await modelRuntime.getAvailable();
      } catch (error) {
        // The selected editor model remains a valid runtime choice even before its session key
        // is entered. Report it as unavailable instead of making the whole Pi state endpoint
        // fail and exposing whichever default model the session previously used.
        if (!isMissingPiCredentialError(error)) throw error;
      }
      const available = new Set(availableModels.map((model) => `${model.provider}/${model.id}`));
      const currentKey = session.model ? `${session.model.provider}/${session.model.id}` : undefined;
      // Pi knows about a large catalog. Sending every unavailable entry on each UI refresh made
      // the state endpoint needlessly huge and exposed choices that could never run. Keep the
      // configured models plus the current selection (which may be backed by an env key that Pi's
      // availability probe cannot see yet).
      const models: PiModelInfo[] = modelRuntime.getModels()
        .filter((model) => available.has(`${model.provider}/${model.id}`) || `${model.provider}/${model.id}` === currentKey)
        .map((model) => ({
          provider: model.provider,
          id: model.id,
          name: model.name,
          reasoning: model.reasoning,
          available: available.has(`${model.provider}/${model.id}`),
        }));
      return {
        sessionId: session.sessionId,
        sessionName: session.sessionName,
        provider: session.model?.provider,
        model: session.model?.id,
        thinkingLevel: session.thinkingLevel,
        models,
        tools: session.getActiveToolNames(),
      };
    },
    async newSession() {
      const selected = session.model
        ? { provider: session.model.provider, model: session.model.id, thinkingLevel: session.thinkingLevel }
        : undefined;
      session.dispose();
      session = await createSession();
      if (selected) {
        const model = modelRuntime.getModel(selected.provider, selected.model);
        if (!model) throw new Error(`Pi model not found after starting a new session: ${selected.provider}/${selected.model}`);
        await session.setModel(model);
        session.setThinkingLevel(normalizeThinkingLevel(selected.thinkingLevel));
      }
    },
  };
}

type PiModelRuntime = Awaited<ReturnType<typeof import("@earendil-works/pi-coding-agent")["ModelRuntime"]["create"]>>;

/** Register the editor model verbatim so Pi never substitutes a similarly named catalog model. */
export function registerEditorProvider(
  modelRuntime: Pick<PiModelRuntime, "registerProvider" | "unregisterProvider">,
  definition: PiProviderDefinition,
  selectedProvider?: string,
  selectedModel?: string,
): void {
  const id = definition.id.trim();
  const baseUrl = definition.baseUrl.trim();
  const models = [...new Set(definition.models.map((model) => model.trim()).filter(Boolean))];
  if (!id) throw new Error("Pi provider id is required.");
  if (selectedProvider && selectedProvider !== id) {
    throw new Error(`Pi provider definition mismatch: expected ${selectedProvider}, received ${id}.`);
  }
  if (!baseUrl) throw new Error(`Pi base URL is required for ${definition.name || id}.`);
  const parsedUrl = new URL(baseUrl);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(`Pi provider URL must use HTTP or HTTPS: ${baseUrl}`);
  }
  if (models.length === 0) throw new Error(`Pi provider ${definition.name || id} has no models.`);
  if (selectedModel && !models.includes(selectedModel)) {
    throw new Error(`Pi model ${selectedModel} is not configured for ${definition.name || id}.`);
  }

  // registerProvider merges omitted fields on re-registration. Unregister first so changing an
  // editor provider cannot retain a stale endpoint, model list, or credential fallback.
  modelRuntime.unregisterProvider(id);
  modelRuntime.registerProvider(id, {
    name: definition.name.trim() || id,
    baseUrl,
    api: piApiForProtocol(definition.protocol),
    apiKey: definition.authMode === "none"
      ? "agentcanvas-no-auth"
      : definition.apiKeyEnvVar
        ? `$${definition.apiKeyEnvVar}`
        : undefined,
    models: models.map((model) => ({
      id: model,
      name: model,
      reasoning: false,
      input: ["text", "image"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128_000,
      maxTokens: 16_384,
    })),
  });
}

function piApiForProtocol(protocol: PiProviderDefinition["protocol"]): "anthropic-messages" | "openai-completions" {
  return protocol === "anthropic" ? "anthropic-messages" : "openai-completions";
}

function guardTool<T extends { name: string; execute: (...args: any[]) => Promise<any> }>(definition: T, gate: PiApprovalGate): T {
  const execute = definition.execute.bind(definition);
  return {
    ...definition,
    async execute(toolCallId: string, params: unknown, signal?: AbortSignal, ...rest: unknown[]) {
      await gate.wait(toolCallId, definition.name, params, signal);
      return execute(toolCallId, params, signal, ...rest);
    },
  } as T;
}

const MUTATING_TOOLS = new Set(["bash", "edit", "write", "powershell"]);

function isRiskyCommand(command: string): boolean {
  return /(^|[;&|]\s*)(sudo|rm\s+-|git\s+(push|reset|clean)|npm\s+publish|pnpm\s+publish|curl\b.*\|\s*(sh|bash)|chmod\s+-R|chown\s+-R)\b/i.test(command);
}

function permissionMode(value: unknown): PiPermissionMode {
  return value === "auto" || value === "allow-all" ? value : "request";
}

function approvalDecision(value: unknown): PiApprovalDecision | undefined {
  return value === "yes" || value === "always" || value === "no" ? value : undefined;
}

function normalizeThinkingLevel(value: string): "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max" {
  if (["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(value)) return value as ReturnType<typeof normalizeThinkingLevel>;
  return "medium";
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) throw new Error("Pi request body is too large.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Pi request body must be a JSON object.");
  return parsed as Record<string, unknown>;
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function setLocalHeaders(res: ServerResponse) {
  // Intentionally no CORS opt-in. The browser client is same-origin with Vite; allowing another
  // origin to call these endpoints would let an unrelated page drive tools in this cwd.
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  return typeof record[key] === "string" ? record[key] as string : undefined;
}

function normalizeConversationId(value: string | undefined): string {
  const id = value?.trim();
  if (!id) return "default";
  if (id.length > 160 || !/^[a-zA-Z0-9._:-]+$/.test(id)) {
    throw new Error("Pi conversationId is invalid.");
  }
  return id;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "Unknown Pi error");
}

function isMissingPiCredentialError(error: unknown): boolean {
  return /(?:no api key|provider is not configured)/i.test(errorMessage(error));
}
