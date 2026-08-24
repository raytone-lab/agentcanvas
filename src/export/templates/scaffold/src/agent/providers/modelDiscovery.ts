import type { ProviderConnection } from "./providerCatalog";
import { resolveProviderAuth, type ProviderCredentialStore } from "./providerConfig";

export type ProviderDiscoveryOptions = {
  apiKey?: string;
  credentials?: ProviderCredentialStore;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
};

export type ProviderConnectionTestResult = {
  ok: boolean;
  models: string[];
  status?: number;
  error?: string;
};

function trimBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function providerApiKey(provider: ProviderConnection, options: ProviderDiscoveryOptions): string | undefined {
  return options.apiKey?.trim() || resolveProviderAuth(provider, options.credentials)?.trim();
}

function missingApiKeyMessage(provider: ProviderConnection): string {
  const keyName = provider.auth.mode === "env" ? provider.auth.envVar : provider.id;
  return `Missing API key for ${keyName}`;
}

function parseProviderModels(data: { data?: Array<{ id?: string }>; models?: Array<{ name?: string; id?: string }> }): string[] {
  return data.data?.map((model) => model.id).filter((model): model is string => Boolean(model)) ?? data.models?.map((model) => model.id ?? model.name).filter((model): model is string => Boolean(model)) ?? [];
}

export function providerModelsUrl(provider: ProviderConnection): string {
  return `${trimBaseUrl(provider.baseUrl)}/models`;
}

export function createProviderAuthHeaders(provider: ProviderConnection, apiKey?: string): Record<string, string> {
  if (provider.auth.mode === "none" || !apiKey) return {};
  if (provider.protocol === "anthropic") {
    return { "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
  }
  return { Authorization: `Bearer ${apiKey}` };
}

export async function fetchProviderModels(provider: ProviderConnection, options: ProviderDiscoveryOptions = {}): Promise<string[]> {
  const apiKey = providerApiKey(provider, options);
  if (provider.auth.mode !== "none" && !apiKey) {
    throw new Error(missingApiKeyMessage(provider));
  }

  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(providerModelsUrl(provider), {
    headers: createProviderAuthHeaders(provider, apiKey),
    signal: options.signal,
  });
  if (!response.ok) throw new Error(`Model fetch failed for ${provider.label}: ${response.status}`);
  const data = await response.json() as { data?: Array<{ id?: string }>; models?: Array<{ name?: string; id?: string }> };
  return parseProviderModels(data);
}

export async function testProviderConnection(provider: ProviderConnection, options: ProviderDiscoveryOptions = {}): Promise<ProviderConnectionTestResult> {
  try {
    const models = await fetchProviderModels(provider, options);
    return { ok: true, models };
  } catch (error) {
    return { ok: false, models: [], error: error instanceof Error ? error.message : "Unknown provider connection error" };
  }
}
