import type { ProviderConnection } from "../providers/providerCatalog";
import { createProviderAuthHeaders } from "../providers/modelDiscovery";
import { resolveProviderAuth } from "../providers/providerConfig";
import type { ProviderChatOptions } from "./openaiCompatibleClient";

function providerApiKey(provider: ProviderConnection, options: ProviderChatOptions): string | undefined {
  return options.apiKey?.trim() || resolveProviderAuth(provider, options.credentials)?.trim();
}

export async function createAnthropicRequest(provider: ProviderConnection, prompt: string, options: ProviderChatOptions = {}): Promise<Response> {
  const apiKey = providerApiKey(provider, options);
  const fetcher = options.fetcher ?? fetch;
  return fetcher(`${provider.baseUrl.replace(/\/+$/, "")}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", ...createProviderAuthHeaders(provider, apiKey) },
    body: JSON.stringify({ model: options.model ?? provider.defaultModel, max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
    signal: options.signal,
  });
}
