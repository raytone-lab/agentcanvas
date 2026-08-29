import type { IncomingMessage, ServerResponse } from "node:http";

import type { AgentUXEvent } from "@agent-ux/protocol";
import type { ToolDefinition } from "@earendil-works/pi-coding-agent";

import {
  createPiEventAdapter,
  type PiApprovalDecision,
  type PiEventAdapter,
  type PiWireEvent,
} from "../harness/adapters/piAdapter.ts";
import { PI_API_PREFIX, type PiModelInfo, type PiPromptInput, type PiRuntimeState } from "./piClient.ts";

export type PiPermissionMode = NonNullable<PiPromptInput["permissionMode"]>;

export type PiSessionBridge = {
  subscribe(listener: (event: PiWireEvent) => void): () => void;
  prompt(text: string): Promise<void>;
  abort(): Promise<void>;
  dispose(): void;
  configure(input: { provider?: string; model?: string; thinkingLevel?: string; apiKey?: string }): Promise<void>;
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
  state(): Promise<PiRuntimeState>;
  configure(input: { provider?: string; model?: string; thinkingLevel?: string; apiKey?: string }): Promise<PiRuntimeState>;
  runPrompt(input: PiPromptInput, onEvent: (event: AgentUXEvent) => void): Promise<void>;
  abort(): Promise<void>;
  resolveApproval(toolCallId: string, decision: PiApprovalDecision): boolean;
  newSession(): Promise<PiRuntimeState>;
  dispose(): void;
};

export function createPiRuntimeController(options: {
  cwd: string;
  bridgeFactory?: PiBridgeFactory;
}): PiRuntimeController {
  const { cwd } = options;
  const approvalGate = new PiApprovalGate();
  const bridgeFactory = options.bridgeFactory ?? createDefaultPiBridge;
  let bridgePromise: Promise<PiSessionBridge> | undefined;
  let activeAdapter: PiEventAdapter | undefined;
  let running = false;

  const bridge = () => {
    bridgePromise ??= bridgeFactory({ cwd, approvalGate });
    return bridgePromise;
  };

  const state = async (): Promise<PiRuntimeState> => {
    try {
      const current = await bridge();
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
      const current = await bridge();
      await current.configure(input);
      return state();
    },
    async runPrompt(input, onEvent) {
      const prompt = input.prompt?.trim();
      if (!prompt) throw new Error("Pi prompt is empty.");
      if (running) throw new Error("A Pi run is already active.");
      const current = await bridge();
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
      activeAdapter = adapter;
      const unsubscribe = current.subscribe((event) => adapter.apply(event));
      try {
        await current.prompt(prompt);
        adapter.finish("success");
      } catch (error) {
        adapter.apply({ type: "extension_error", message: errorMessage(error) });
      } finally {
        unsubscribe();
        approvalGate.cancelAll();
        activeAdapter = undefined;
        running = false;
      }
    },
    async abort() {
      approvalGate.cancelAll("Pi run was stopped.");
      const current = await bridge();
      await current.abort();
      activeAdapter?.finish("cancelled");
    },
    resolveApproval(toolCallId, decision) {
      activeAdapter?.resolveApproval(toolCallId, decision);
      return approvalGate.resolve(toolCallId, decision);
    },
    async newSession() {
      if (running) throw new Error("Stop the active Pi run before starting a new session.");
      const current = await bridge();
      await current.newSession();
      return state();
    },
    dispose() {
      approvalGate.cancelAll();
      void bridgePromise?.then((current) => current.dispose());
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
          sendJson(res, 200, await controller.state());
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
          await readJson(req);
          sendJson(res, 200, await controller.newSession());
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
  const modelRuntime = await pi.ModelRuntime.create({ allowModelNetwork: false });
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
      sessionManager: pi.SessionManager.create(input.cwd),
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
      if (config.apiKey && config.provider) await modelRuntime.setRuntimeApiKey(config.provider, config.apiKey);
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
      const available = new Set((await modelRuntime.getAvailable()).map((model) => `${model.provider}/${model.id}`));
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
      session.dispose();
      session = await createSession();
    },
  };
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "Unknown Pi error");
}
