import type { ProviderConnection } from "../schema/agentuxConfig";
import type { PiProviderDefinition, PiRuntimeConfiguration } from "./piClient";

/**
 * Convert the editor's source-of-truth provider into the browser-safe contract accepted by
 * the same-origin Pi host. The API key remains a separate optional POST field so it never
 * becomes part of the exported project or a URL.
 */
export function piRuntimeConfigurationForProvider(
  provider: ProviderConnection,
  apiKey?: string,
): PiRuntimeConfiguration {
  const providerId = provider.id.trim();
  const model = provider.defaultModel.trim();
  const baseUrl = provider.baseUrl.trim();
  if (!providerId) throw new Error("Pi provider id is required.");
  if (!model) throw new Error(`Pi model is required for ${provider.label}.`);
  if (!baseUrl) throw new Error(`Pi base URL is required for ${provider.label}.`);

  const models = [...new Set([model, ...provider.models.map((entry) => entry.trim()).filter(Boolean)])];
  const normalizedApiKey = apiKey?.trim() || undefined;
  const providerDefinition: PiProviderDefinition = {
    id: providerId,
    name: provider.label.trim() || providerId,
    protocol: provider.protocol,
    baseUrl,
    models,
    authMode: provider.auth.mode === "none" ? "none" : "required",
    apiKeyEnvVar: provider.auth.envVar?.trim() || undefined,
  };

  return {
    provider: providerId,
    model,
    apiKey: normalizedApiKey,
    // `undefined` means the browser has no opinion (for example after a refresh), so keep a key
    // already configured in the local Pi process. An explicitly cleared field sends true.
    ...(apiKey !== undefined && !normalizedApiKey ? { clearApiKey: true } : {}),
    providerDefinition,
  };
}
