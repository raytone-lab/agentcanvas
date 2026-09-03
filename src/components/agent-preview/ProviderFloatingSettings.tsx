import { CheckCircle2, RefreshCw, Save, Settings, Star, X } from "lucide-react";
import { useState } from "react";

import {
  defaultProviderConnection,
  enabledProviderConnections,
  isSafeProviderEnvVarName,
  safeProviderEnvVarName,
  type AgentFrontendProject,
  type ProviderConnection,
  type ProviderConnectionId,
} from "../../schema/agentuxConfig";
import { useCopy } from "../../i18n/LocaleContext";
import { Button, IconButton, Input, SelectMenu } from "../ui";

type ProviderPatch = Partial<Pick<ProviderConnection, "baseUrl" | "defaultModel" | "label" | "models">> & {
  authEnvVar?: string;
};

export function ProviderFloatingSettings({
  project,
  defaultOpen = false,
  sessionKeys,
  isRunning = false,
  onSetDefaultProvider,
  onUpdateProvider,
  onSessionKeyChange,
  onTestProvider,
  onFetchModels,
  onSave,
}: {
  project: AgentFrontendProject;
  defaultOpen?: boolean;
  sessionKeys: Record<string, string>;
  /** A live run owns the runtime model; host-affecting actions are disabled while true. */
  isRunning?: boolean;
  onSetDefaultProvider: (id: ProviderConnectionId) => void;
  onUpdateProvider: (id: ProviderConnectionId, patch: ProviderPatch) => void;
  onSessionKeyChange: (id: ProviderConnectionId, value: string) => void;
  onTestProvider: (provider: ProviderConnection, sessionKey?: string) => void;
  onFetchModels: (provider: ProviderConnection, sessionKey?: string) => void;
  onSave: () => void;
  }) {
  const copy = useCopy().composer.floatingSettings;
  const [open, setOpen] = useState(defaultOpen);
  /**
   * Providers whose env-var field just had a pasted key redirected to the session key.
   *
   * Shown inline rather than as a toast: this component ships in the exported package, and the
   * toast host lives in the configurator's `App.tsx`, which does not. A toast here would be
   * silently dropped in an export — the same silence this is meant to remove.
   */
  const [redirectedKeyFor, setRedirectedKeyFor] = useState<readonly string[]>([]);
  const enabledProviders = enabledProviderConnections(project);
  const defaultProvider = defaultProviderConnection(project);

  if (!project.providers.settingsLauncher) {
    return null;
  }

  return (
    <div className="provider-floating-settings" data-provider-settings-launcher="true" data-preview-anchor="composer">
      <IconButton
        className="provider-floating-trigger"
        label={copy.settings}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Settings size={17} />
      </IconButton>

      {open ? (
        <aside className="provider-floating-popover" data-provider-settings-popover="true">
          <header>
            <div>
              <strong>{copy.heading}</strong>
              <span>{defaultProvider.label}</span>
            </div>
            <IconButton label={copy.close} onClick={() => setOpen(false)}>
              <X size={15} />
            </IconButton>
          </header>

          <div className="provider-floating-list">
            {enabledProviders.map((provider) => {
              const sessionKey = sessionKeys[provider.id] ?? "";
              const envVar = provider.auth.mode === "env" ? provider.auth.envVar : "";
              const modelOptions = provider.models.length > 0 ? provider.models : [provider.defaultModel];
              const isDefault = provider.id === defaultProvider.id;

              return (
                <article className="provider-floating-card" key={provider.id}>
                  <div className="provider-floating-card-header">
                    <div>
                      <strong>{provider.label}</strong>
                      <span>{provider.protocol}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-active={isDefault}
                      onClick={() => onSetDefaultProvider(provider.id)}
                    >
                      <Star size={13} />
                      {isDefault ? copy.default : copy.setDefault}
                    </Button>
                  </div>

                  <label>
                    <span>{copy.baseUrl}</span>
                    <Input
                      value={provider.baseUrl}
                      onChange={(event) => onUpdateProvider(provider.id, { baseUrl: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>{copy.apiKeyEnv}</span>
                    <Input
                      disabled={provider.auth.mode === "none"}
                      value={provider.auth.mode === "none" ? copy.noKeyRequired : envVar}
                      onChange={(event) => {
                        setRedirectedKeyFor((current) => current.filter((id) => id !== provider.id));
                        onUpdateProvider(provider.id, { authEnvVar: event.target.value });
                      }}
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
                          setRedirectedKeyFor((current) =>
                            current.includes(provider.id) ? current : [...current, provider.id]);
                        }
                      }}
                    />
                    {redirectedKeyFor.includes(provider.id) ? (
                      <small className="provider-field-note" role="status">
                        {copy.keyPastedIntoEnvVarToast}
                      </small>
                    ) : null}
                  </label>
                  <label>
                    <span>{copy.sessionKey}</span>
                    <Input
                      disabled={provider.auth.mode === "none"}
                      placeholder={provider.auth.mode === "none" ? copy.sessionKeyPlaceholderNone : copy.sessionKeyPlaceholder}
                      type="password"
                      value={sessionKey}
                      onChange={(event) => onSessionKeyChange(provider.id, event.target.value)}
                    />
                  </label>
                  <label>
                    <span>{copy.defaultModel}</span>
                    <SelectMenu
                      ariaLabel={copy.defaultModel}
                      value={provider.defaultModel}
                      onValueChange={(value) => onUpdateProvider(provider.id, { defaultModel: value })}
                      options={modelOptions.map((model) => ({ value: model, label: model }))}
                    />
                  </label>

                  <div className="provider-floating-actions">
                    <Button disabled={isRunning} onClick={() => onTestProvider(provider, sessionKey)}>
                      <CheckCircle2 size={14} />
                      {copy.testKey}
                    </Button>
                    <Button disabled={isRunning} onClick={() => onFetchModels(provider, sessionKey)}>
                      <RefreshCw size={14} />
                      {copy.fetchModels}
                    </Button>
                    <Button disabled={isRunning} onClick={onSave}>
                      <Save size={14} />
                      {copy.save}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      ) : null}
    </div>
  );
}
