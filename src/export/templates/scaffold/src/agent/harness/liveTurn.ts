import type { AgentUXEvent } from "@agent-ux/protocol";
import type { ProviderConnection } from "../providers/providerCatalog";
import { createProviderRequest } from "./providerClient";

export type LiveTurnInput = { prompt: string; provider: ProviderConnection; model?: string };

function sessionKey(providerId: string): string | undefined {
  try {
    const raw = window.sessionStorage.getItem("agentux.provider.sessionKeys");
    return raw ? (JSON.parse(raw) as Record<string, string>)[providerId] : undefined;
  } catch {
    return undefined;
  }
}

function extractText(data: unknown): string {
  const payload = data as {
    choices?: Array<{ message?: { content?: string } }>;
    content?: Array<{ text?: string }>;
  };
  const openai = payload?.choices?.[0]?.message?.content;
  if (typeof openai === "string") {
    return openai;
  }
  if (Array.isArray(payload?.content)) {
    return payload.content.map((part) => part?.text ?? "").join("");
  }
  return "";
}

export async function* runLiveTurn(input: LiveTurnInput): AsyncGenerator<AgentUXEvent> {
  const { prompt, provider } = input;
  const runId = "live_" + Math.abs(hashCode(prompt)).toString(36);
  let seq = 0;
  const meta = (suffix: string) => ({ id: runId + "_" + suffix, runId, seq: ++seq });
  const userTextId = runId + "_user";
  const assistantTextId = runId + "_assistant";

  yield { ...meta("start"), type: "run.started", payload: { title: prompt } };
  yield { ...meta("us"), type: "text.started", payload: { textId: userTextId, role: "user" } };
  yield { ...meta("ud"), type: "text.delta", payload: { textId: userTextId, delta: prompt } };
  yield { ...meta("uf"), type: "text.finished", payload: { textId: userTextId } };

  const apiKey = sessionKey(provider.id);
  if (provider.auth.mode !== "none" && !apiKey) {
    yield {
      ...meta("nokey"),
      type: "run.error",
      payload: { code: "missing_api_key", userMessage: "Add an API key in Provider settings to run a live turn." },
    };
    return;
  }

  yield { ...meta("as"), type: "text.started", payload: { textId: assistantTextId, role: "assistant" } };
  try {
    const response = await createProviderRequest(provider, prompt, { apiKey, model: input.model });
    if (!response.ok) {
      throw new Error("Provider responded with status " + response.status);
    }
    const text = extractText(await response.json()) || "(empty response)";
    yield { ...meta("ad"), type: "text.delta", payload: { textId: assistantTextId, delta: text } };
    yield { ...meta("af"), type: "text.finished", payload: { textId: assistantTextId } };
    yield { ...meta("done"), type: "run.finished", payload: { status: "success" } };
  } catch (error) {
    yield { ...meta("af"), type: "text.finished", payload: { textId: assistantTextId } };
    yield {
      ...meta("err"),
      type: "run.error",
      payload: { code: "live_turn_failed", userMessage: error instanceof Error ? error.message : "Live turn failed." },
    };
  }
}

function hashCode(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}
