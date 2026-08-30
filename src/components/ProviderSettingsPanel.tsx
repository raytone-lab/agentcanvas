import { CheckCircle2, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import {
  enabledProviderConnections,
  isSafeProviderEnvVarName,
  providerCatalog,
  providerOptionForId,
  safeProviderEnvVarName,
  type AgentFrontendProject,
  type ProviderCatalogId,
  type ProviderConnection,
  type ProviderConnectionId,
} from "../schema/agentuxConfig";
import { useCopy } from "../i18n/LocaleContext";
import { SelectMenu } from "./ui";

type ProviderPatch = Partial<Pick<ProviderConnection, "baseUrl" | "defaultModel" | "label" | "models">> & {
  authEnvVar?: string;
};

export function ProviderSettingsPanel({
  project,
  sessionKeys,
  onToggleProvider,
  onToggleSettingsLauncher,
  onUpdateProvider,
  onSessionKeyChange,
  onTestProvider,
  onFetchModels,
  onSave,
}: {
  project: AgentFrontendProject;
  sessionKeys: Record<string, string>;
  onToggleProvider: (id: ProviderCatalogId) => void;
  onToggleSettingsLauncher: () => void;
  onSetDefaultProvider: (id: ProviderConnectionId) => void;
  onUpdateProvider: (id: ProviderConnectionId, patch: ProviderPatch) => void;
  onSessionKeyChange: (id: ProviderConnectionId, value: string) => void;
  onTestProvider: (provider: ProviderConnection, sessionKey?: string) => void;
  onFetchModels: (provider: ProviderConnection, sessionKey?: string) => void;
  onSave: () => void;
}) {
  const copy = useCopy().composer.settingsPanel;
  const enabledProviders = enabledProviderConnections(project);
  const providersById = useMemo(
    () => new Map(project.providers.connections.map((provider) => [provider.id, provider])),
    [project.providers.connections],
  );

  function handleToggleProvider(id: ProviderCatalogId, enabled: boolean) {
    if (enabled && enabledProviders.length <= 1) {
      toast.info(copy.keepOneModelToast);
      return;
    }

    onToggleProvider(id);
  }

  function renderConnectionCard(provider: ProviderConnection) {
    const catalogProvider = providerOptionForId(provider.id);
    const modelOptions = provider.models.length > 0 ? provider.models : [...catalogProvider.modelOptions];
    const envVar = provider.auth.mode === "env" ? provider.auth.envVar : "";
    const sessionKey = sessionKeys[provider.id] ?? "";

    return (
      <article className="provider-connection-card" key={provider.id}>
        <div className="provider-connection-header">
          <div>
            <strong>{provider.label}</strong>
            <span>{provider.protocol}</span>
          </div>
        </div>

        {provider.kind === "custom" ? (
          <label className="provider-field">
            <span>{copy.name}</span>
            <input
              value={provider.label}
              onChange={(event) => onUpdateProvider(provider.id, { label: event.target.value })}
            />
          </label>
        ) : null}

        <label className="provider-field">
          <span>{copy.baseUrl}</span>
          <input
            value={provider.baseUrl}
            onChange={(event) => onUpdateProvider(provider.id, { baseUrl: event.target.value })}
          />
        </label>

        <label className="provider-field">
          <span>{copy.apiKeyEnv}</span>
          <input
            disabled={provider.auth.mode === "none"}
            value={provider.auth.mode === "none" ? copy.noKeyRequired : envVar}
            onChange={(event) => onUpdateProvider(provider.id, { authEnvVar: event.target.value })}
            onBlur={(event) => {
              if (!isSafeProviderEnvVarName(event.currentTarget.value)) {
                onUpdateProvider(provider.id, { authEnvVar: safeProviderEnvVarName(provider) });
              }
            }}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData("text").trim();
              if (pasted && !isSafeProviderEnvVarName(pasted)) {
                event.preventDefault();
                onSessionKeyChange(provider.id, pasted);
              }
            }}
          />
        </label>

        <label className="provider-field">
          <span>{copy.sessionKey}</span>
          <input
            disabled={provider.auth.mode === "none"}
            placeholder={provider.auth.mode === "none" ? copy.sessionKeyPlaceholderNone : copy.sessionKeyPlaceholder}
            type="password"
            value={sessionKey}
            onChange={(event) => onSessionKeyChange(provider.id, event.target.value)}
          />
        </label>

        <label className="provider-field">
          <span>{copy.defaultModel}</span>
          <SelectMenu
            ariaLabel={copy.defaultModel}
            value={provider.defaultModel}
            onValueChange={(value) => onUpdateProvider(provider.id, { defaultModel: value })}
            options={modelOptions.map((model) => ({ value: model, label: model }))}
          />
        </label>

        <div className="provider-actions">
          <button type="button" onClick={() => onTestProvider(provider, sessionKey)}>
            <CheckCircle2 size={14} />
            {copy.testKey}
          </button>
          <button type="button" onClick={() => onFetchModels(provider, sessionKey)}>
            <RefreshCw size={14} />
            {copy.fetchModels}
          </button>
          <button type="button" className="provider-save-button" onClick={onSave}>
            {copy.save}
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="provider-settings">
      <section className="provider-picker-section">
        <h3>{copy.enabledProviders}</h3>
        <div className="provider-toggle-list">
          {providerCatalog.map((catalogProvider) => {
            const provider = providersById.get(catalogProvider.connectionId);
            const enabled = Boolean(provider?.enabled);
            return (
              <div className="provider-toggle-item" key={catalogProvider.id}>
                <button
                  className="provider-toggle-row"
                  data-active={enabled}
                  type="button"
                  aria-pressed={enabled}
                  onClick={() => handleToggleProvider(catalogProvider.id, enabled)}
                >
                  <span className="provider-toggle-label">{catalogProvider.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="provider-picker-section">
        <h3>{copy.connections}</h3>
        <div className="provider-connection-list">
          {enabledProviders.map((provider) => renderConnectionCard(provider))}
        </div>
      </section>

      <section className="provider-picker-section">
        <h3>{copy.providerUi}</h3>
        <button
          className="provider-launcher-row"
          data-active={project.providers.settingsLauncher}
          type="button"
          aria-pressed={project.providers.settingsLauncher}
          onClick={onToggleSettingsLauncher}
        >
          <span>{copy.settingsGear}</span>
        </button>
      </section>

      <div className="provider-secret-note">
        <span className="provider-secret-note-mark" aria-hidden="true">*</span>
        <span>{copy.secretNote}</span>
      </div>
    </div>
  );
}
