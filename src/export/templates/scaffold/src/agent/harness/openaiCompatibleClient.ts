import type { ProviderConnection } from "../providers/providerCatalog";
import { createProviderAuthHeaders, type ProviderDiscoveryOptions } from "../providers/modelDiscovery";
import { resolveProviderAuth } from "../providers/providerConfig";

export type ProviderChatOptions = ProviderDiscoveryOptions & { model?: string };

function providerApiKey(provider: ProviderConnection, options: ProviderChatOptions): string | undefined {
  return options.apiKey?.trim() || resolveProviderAuth(provider, options.credentials)?.trim();
}

export async function createOpenAICompatibleRequest(provider: ProviderConnection, prompt: string, options: ProviderChatOptions = {}): Promise<Response> {
  const apiKey = providerApiKey(provider, options);
  const fetcher = options.fetcher ?? fetch;
  return fetcher(`${provider.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", ...createProviderAuthHeaders(provider, apiKey) },
    body: JSON.stringify({ model: options.model ?? provider.defaultModel, messages: [{ role: "user", content: prompt }] }),
    signal: options.signal,
  });
}
