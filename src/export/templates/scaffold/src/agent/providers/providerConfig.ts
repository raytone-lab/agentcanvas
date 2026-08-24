import agentuxConfig from "../../../agentux.config";
import type { ProviderConnection } from "./providerCatalog";

export const providerConfigScope = "dev-runtime" as const;
export type ProviderCredentialStore = Record<string, string | undefined>;

export function enabledProviders(): ProviderConnection[] {
  return agentuxConfig.providers.connections.filter((provider) => provider.enabled) as ProviderConnection[];
}

export function defaultProvider(): ProviderConnection {
  return enabledProviders().find((provider) => provider.id === agentuxConfig.providers.defaultProviderId) ?? enabledProviders()[0];
}

export function resolveProviderAuth(provider: ProviderConnection, credentials: ProviderCredentialStore = {}): string | undefined {
  if (provider.auth.mode === "none") return undefined;
  return credentials[provider.id] ?? (provider.auth.mode === "env" ? credentials[provider.auth.envVar] : undefined);
}
