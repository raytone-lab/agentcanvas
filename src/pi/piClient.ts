import type { AgentUXEvent } from "@agent-ux/protocol";

import type { PiApprovalDecision } from "../harness/adapters/piAdapter.ts";

export const PI_API_PREFIX = "/__agentcanvas/pi";

export type PiModelInfo = {
  provider: string;
  id: string;
  name: string;
  reasoning?: boolean;
  available: boolean;
};

export type PiRuntimeState = {
  available: boolean;
  cwd: string;
  sessionId?: string;
  sessionName?: string;
  running: boolean;
  provider?: string;
  model?: string;
  thinkingLevel?: string;
  models: PiModelInfo[];
  tools: string[];
  error?: string;
};

export type PiPromptInput = {
  prompt: string;
  provider?: string;
  model?: string;
  thinkingLevel?: string;
  permissionMode?: "request" | "auto" | "allow-all";
};

export async function getPiRuntimeState(fetcher: typeof fetch = fetch): Promise<PiRuntimeState> {
  return requestJson<PiRuntimeState>(fetcher, `${PI_API_PREFIX}/state`);
}

export async function configurePiRuntime(
  input: { provider?: string; model?: string; thinkingLevel?: string; apiKey?: string },
  fetcher: typeof fetch = fetch,
): Promise<PiRuntimeState> {
  return requestJson<PiRuntimeState>(fetcher, `${PI_API_PREFIX}/config`, input);
}

export async function abortPiRun(fetcher: typeof fetch = fetch): Promise<void> {
  await requestJson(fetcher, `${PI_API_PREFIX}/abort`, {});
}

export async function startNewPiSession(fetcher: typeof fetch = fetch): Promise<PiRuntimeState> {
  return requestJson<PiRuntimeState>(fetcher, `${PI_API_PREFIX}/session/new`, {});
}

export async function resolvePiApproval(
  toolCallId: string,
  decision: PiApprovalDecision,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  await requestJson(fetcher, `${PI_API_PREFIX}/approval`, { toolCallId, decision });
}

/** Stream one real Pi turn. Each line is already an AgentUX event, never a Pi SDK object. */
export async function* runPiTurn(
  input: PiPromptInput,
  options: { signal?: AbortSignal; fetcher?: typeof fetch } = {},
): AsyncGenerator<AgentUXEvent> {
  const response = await (options.fetcher ?? fetch)(`${PI_API_PREFIX}/prompt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal: options.signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(await responseError(response, "Pi prompt failed"));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const event = parseEventLine(line);
        if (event) yield event;
      }
    }
    buffer += decoder.decode();
    const event = parseEventLine(buffer);
    if (event) yield event;
  } finally {
    reader.releaseLock();
  }
}

async function requestJson<T = Record<string, unknown>>(
  fetcher: typeof fetch,
  url: string,
  body?: unknown,
): Promise<T> {
  const response = await fetcher(url, body === undefined ? undefined : {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await responseError(response, "Pi request failed"));
  return response.json() as Promise<T>;
}

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as { error?: string };
    return body.error || `${fallback}: ${response.status}`;
  } catch {
    return `${fallback}: ${response.status} ${response.statusText}`.trim();
  }
}

function parseEventLine(line: string): AgentUXEvent | undefined {
  const value = line.trim();
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || typeof (parsed as { type?: unknown }).type !== "string") return undefined;
    return parsed as AgentUXEvent;
  } catch {
    return undefined;
  }
}
