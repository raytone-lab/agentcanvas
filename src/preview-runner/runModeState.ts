import {
  defaultProviderConnection,
  type AgentFrontendProject,
  type ProviderConnection,
} from "../schema/agentuxConfig";
import { shellCopy } from "../i18n/copy/shell";
import type { AppLocale } from "../i18n/locales";

export type PreviewRunMode = "replay" | "live" | "harness";
export type LivePreviewState = "idle" | "streaming" | "finished" | "stopped" | "error";
export type PreviewSessionKeys = Record<string, string | undefined>;

export type PreviewModeStatusLine = {
  modeLabel: string;
  tone: "mock" | "live" | "planned";
  detail: string;
};

export function previewModeStatusLine(input: {
  mode: PreviewRunMode;
  locale?: AppLocale;
  scenarioLabel?: string;
  provider?: ProviderConnection;
  model?: string;
  liveState?: LivePreviewState;
}): PreviewModeStatusLine {
  const locale = input.locale ?? "en";
  const copy = shellCopy[locale].runMode;
  if (input.mode === "live") {
    const providerLabel = input.provider?.label ?? "Provider";
    const model = input.model ?? input.provider?.defaultModel ?? "model";
    const state = input.liveState ?? "idle";
    return {
      modeLabel: "Live LLM",
      tone: "live",
      detail: `${providerLabel} · ${model} · ${copy.liveState[state]}`,
    };
  }

  if (input.mode === "harness") {
    return {
      modeLabel: "Harness",
      tone: "planned",
      detail: copy.harnessDetail,
    };
  }

  return {
    modeLabel: copy.replayLabel,
    tone: "mock",
    detail: input.scenarioLabel ?? copy.replayDetail,
  };
}

export function runButtonControlState(input: {
  surfaceMode: "builder" | "saved-preview";
  runMode: "replay" | "live";
  liveRunning: boolean;
}): { action: "run" | "stop"; label: "Run" | "Stop" } {
  if (input.surfaceMode === "saved-preview" && input.runMode === "live" && input.liveRunning) {
    return { action: "stop", label: "Stop" };
  }
  return { action: "run", label: "Run" };
}

export function canUseLivePreview(input: {
  project: AgentFrontendProject;
  sessionKeys?: PreviewSessionKeys;
}): boolean {
  const provider = defaultProviderConnection(input.project);
  if (provider.protocol !== "openai-compatible") {
    return false;
  }
  return provider.auth.mode === "none" || Boolean(input.sessionKeys?.[provider.id]?.trim());
}

export function initialSavedPreviewRunMode(input: {
  project: AgentFrontendProject;
  sessionKeys?: PreviewSessionKeys;
}): "replay" | "live" {
  const provider = defaultProviderConnection(input.project);
  return provider.protocol === "openai-compatible" ? "live" : "replay";
}
