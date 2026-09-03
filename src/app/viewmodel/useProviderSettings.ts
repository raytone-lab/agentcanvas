import { useState } from "react";
import { toast } from "sonner";

import type { UiCopy } from "../../i18n/uiCopy";
import {
  providerRequestHeaders,
  providerRequestUrl,
} from "../../preview-runner/LiveLlmPreviewRunner";
import type {
  AgentFrontendProject,
  ProviderConnection,
  ProviderConnectionId,
} from "../../schema/agentuxConfig";
import { formatCopy } from "../projection/previewDefaults";

/**
 * Provider connection CRUD + network probes (Strategy-free, plain async).
 *
 * Deliberately excludes anything that touches the workspace run state — the
 * run-mode aware `saveProviderSettings` lives in the workspace controller so
 * this hook stays testable with just a project updater.
 */
export function useProviderSettings({
  copy,
  updateActiveProject,
}: {
  copy: UiCopy;
  updateActiveProject: (mutator: (current: AgentFrontendProject) => AgentFrontendProject) => void;
}) {
  const [sessionKeys, setSessionKeys] = useState<Record<string, string>>({});

  function updateProviderConnection(
    id: ProviderConnectionId,
    patch: Partial<Pick<ProviderConnection, "baseUrl" | "defaultModel" | "label" | "models">> & { authEnvVar?: string },
  ) {
    updateActiveProject((current) => ({
      ...current,
      providers: {
        ...current.providers,
        connections: current.providers.connections.map((provider) => {
          if (provider.id !== id) {
            return provider;
          }

          const defaultModel = patch.defaultModel ?? provider.defaultModel;
          return {
            ...provider,
            ...patch,
            auth: patch.authEnvVar && provider.auth.mode === "env"
              ? { ...provider.auth, envVar: patch.authEnvVar }
              : provider.auth,
            defaultModel,
            models: patch.models ?? (provider.models.includes(defaultModel) ? provider.models : [defaultModel, ...provider.models]),
          };
        }),
      },
    }));
  }

  function updateWelcomeGreeting(greeting: string) {
    updateActiveProject((current) => ({
      ...current,
      welcome: { ...current.welcome, greeting },
    }));
  }

  function updateSessionKey(id: ProviderConnectionId, value: string) {
    setSessionKeys((current) => ({ ...current, [id]: value }));
  }

  async function requestProviderModels(provider: ProviderConnection, sessionKey?: string): Promise<string[]> {
    const response = await fetch(providerRequestUrl(provider, "models", "agentcanvas-dev-proxy"), {
      headers: providerRequestHeaders(provider, sessionKey, "agentcanvas-dev-proxy"),
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim());
    }

    const data = await response.json() as {
      data?: Array<{ id?: string }>;
      models?: Array<{ id?: string; name?: string }>;
    };
    return (
      data.data?.map((model) => model.id).filter((model): model is string => Boolean(model)) ??
      data.models?.map((model) => model.id ?? model.name).filter((model): model is string => Boolean(model)) ??
      []
    );
  }

  async function testProvider(provider: ProviderConnection, sessionKey?: string) {
    if (provider.auth.mode !== "none" && !sessionKey?.trim()) {
      toast.error(formatCopy(copy.shell.toast.enterDevSessionKeyBeforeTesting, { provider: provider.label }));
      return;
    }

    try {
      const models = await requestProviderModels(provider, sessionKey);
      toast.success(
        `${formatCopy(copy.shell.toast.providerKeyWorks, { provider: provider.label })}${models.length ? ` · ${models.length} ${copy.shell.toast.modelsCountSuffix}` : ""}`,
      );
    } catch (error) {
      toast.error(formatCopy(copy.shell.toast.providerTestFailed, {
        provider: provider.label,
        message: error instanceof Error ? error.message : copy.shell.toast.unknownError,
      }));
    }
  }

  async function fetchProviderModels(provider: ProviderConnection, sessionKey?: string) {
    if (provider.auth.mode !== "none" && !sessionKey?.trim()) {
      toast.error(formatCopy(copy.shell.toast.enterDevSessionKeyBeforeFetchingModels, { provider: provider.label }));
      return;
    }

    try {
      const models = await requestProviderModels(provider, sessionKey);
      if (models.length === 0) {
        toast.info(formatCopy(copy.shell.toast.providerReturnedNoModels, { provider: provider.label }));
        return;
      }
      updateProviderConnection(provider.id, { models, defaultModel: models[0] });
      toast.success(formatCopy(copy.shell.toast.fetchedModelsForProvider, { count: models.length, provider: provider.label }));
    } catch (error) {
      toast.error(formatCopy(copy.shell.toast.providerModelFetchFailed, {
        provider: provider.label,
        message: error instanceof Error ? error.message : copy.shell.toast.unknownError,
      }));
    }
  }

  return {
    sessionKeys,
    updateProviderConnection,
    updateWelcomeGreeting,
    updateSessionKey,
    requestProviderModels,
    testProvider,
    fetchProviderModels,
  };
}
