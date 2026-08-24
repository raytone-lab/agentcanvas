import type { ProviderConnection } from "../providers/providerCatalog";
import { createAnthropicRequest } from "./anthropicClient";
import { createGeminiRequest } from "./geminiClient";
import { createOpenAICompatibleRequest, type ProviderChatOptions } from "./openaiCompatibleClient";

export function createProviderRequest(provider: ProviderConnection, prompt: string, options: ProviderChatOptions = {}): Promise<Response> {
  if (provider.protocol === "anthropic") return createAnthropicRequest(provider, prompt, options);
  if (provider.protocol === "gemini") return createGeminiRequest(provider, prompt, options);
  return createOpenAICompatibleRequest(provider, prompt, options);
}
