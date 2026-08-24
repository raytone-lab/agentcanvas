import { useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, Save, Settings, Star, X } from "lucide-react";
import { defaultProvider, enabledProviders } from "./providerConfig";
import { fetchProviderModels, testProviderConnection } from "./modelDiscovery";

function storedProviderSettings(): { defaultProviderId: string; providers: ReturnType<typeof enabledProviders> } | undefined {
  try {
    const stored = window.sessionStorage.getItem("agentux.provider.settings");
    return stored ? JSON.parse(stored) : undefined;
  } catch {
    return undefined;
  }
}

function storedProviderSessionKeys(): Record<string, string> {
  try {
    const stored = window.sessionStorage.getItem("agentux.provider.sessionKeys");
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function ProviderSettings() {
  const stored = storedProviderSettings();
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState(() => stored?.providers ?? enabledProviders());
  const [defaultProviderId, setDefaultProviderId] = useState(() => stored?.defaultProviderId ?? defaultProvider().id);
  const [sessionKeys, setSessionKeys] = useState<Record<string, string>>(() => storedProviderSessionKeys());
  const [connectionStatus, setConnectionStatus] = useState<Record<string, string>>({});
  const currentDefault = useMemo(() => providers.find((provider) => provider.id === defaultProviderId) ?? providers[0], [providers, defaultProviderId]);

  async function testKey(providerId: string) {
    const provider = providers.find((item) => item.id === providerId);
    if (!provider) return;
    const result = await testProviderConnection(provider, { apiKey: sessionKeys[provider.id] });
    setConnectionStatus((current) => ({ ...current, [provider.id]: result.ok ? `Connected - ${result.models.length} models` : result.error ?? "Connection failed" }));
  }

  async function refreshModels(providerId: string) {
    const provider = providers.find((item) => item.id === providerId);
    if (!provider) return;
    try {
      const models = await fetchProviderModels(provider, { apiKey: sessionKeys[provider.id] });
      setProviders((current) => current.map((item) => item.id === provider.id ? { ...item, models, defaultModel: models[0] ?? item.defaultModel } : item));
      setConnectionStatus((current) => ({ ...current, [provider.id]: `Fetched ${models.length} models` }));
    } catch (error) {
      setConnectionStatus((current) => ({ ...current, [provider.id]: error instanceof Error ? error.message : "Model fetch failed" }));
    }
  }

  function save() {
    window.sessionStorage.setItem("agentux.provider.settings", JSON.stringify({ defaultProviderId, providers }));
    window.sessionStorage.setItem("agentux.provider.sessionKeys", JSON.stringify(sessionKeys));
  }

  return <div data-provider-settings-launcher="true"><button type="button" aria-label="Provider settings" aria-expanded={open} onClick={() => setOpen((current) => !current)}><Settings size={16} /></button>{open ? <aside data-provider-settings-popover="true"><header><strong>Provider Settings</strong><span>{currentDefault?.label}</span><button type="button" aria-label="Close provider settings" onClick={() => setOpen(false)}><X size={14} /></button></header>{providers.map((provider) => <article data-provider-card key={provider.id}><div><strong>{provider.label}</strong><button type="button" onClick={() => setDefaultProviderId(provider.id)}><Star size={13} />{provider.id === defaultProviderId ? "Default" : "Set default"}</button></div><label><span>Base URL</span><input value={provider.baseUrl} onChange={(event) => setProviders((current) => current.map((item) => item.id === provider.id ? { ...item, baseUrl: event.target.value } : item))} /></label><label><span>API key</span><input disabled={provider.auth.mode === "none"} placeholder={provider.auth.mode === "env" ? provider.auth.envVar : "Dev session key"} type="password" value={sessionKeys[provider.id] ?? ""} onChange={(event) => setSessionKeys((current) => ({ ...current, [provider.id]: event.target.value }))} /></label><label><span>Model</span><select value={provider.defaultModel} onChange={(event) => setProviders((current) => current.map((item) => item.id === provider.id ? { ...item, defaultModel: event.target.value } : item))}>{provider.models.map((model) => <option key={model} value={model}>{model}</option>)}</select></label>{connectionStatus[provider.id] ? <p>{connectionStatus[provider.id]}</p> : null}<div><button type="button" onClick={() => testKey(provider.id)}><CheckCircle2 size={14} />Test key</button><button type="button" onClick={() => refreshModels(provider.id)}><RefreshCw size={14} />Fetch models</button><button type="button" onClick={save}><Save size={14} />Save</button></div></article>)}</aside> : null}</div>;
}
