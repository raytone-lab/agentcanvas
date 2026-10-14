import {
  defaultProviderConnection,
  type AgentFrontendProject,
  type ProviderConnection,
} from "../schema/agentuxConfig";
import { shellCopy } from "../i18n/copy/shell";
import type { AppLocale } from "../i18n/locales";

export type PreviewRunMode = "replay" | "live" | "pi" | "harness";
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

  if (input.mode === "pi") {
    return {
      modeLabel: "Pi agent",
      tone: "live",
      detail: input.liveState ?? "idle",
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
  runMode: "replay" | "live" | "pi";
  liveRunning: boolean;
}): { action: "run" | "stop"; label: "Run" | "Stop" } {
  if (input.surfaceMode === "saved-preview" && (input.runMode === "live" || input.runMode === "pi") && input.liveRunning) {
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

/**
 * Which mode the run preview opens in.
 *
 * Live only when live can actually answer. It used to be live whenever the
 * provider *spoke* the protocol — keyed or not — so with no key entered, 运行
 * opened on an empty transcript under 实时 LLM, the first prompt was refused by
 * a toast, and the canvas fell back to the replay placeholder: a run preview
 * that showed nothing that had been configured. Without a key it opens on the
 * replay, which plays the configured interface and event flow through — what
 * pressing 运行 is for — and live is one pick away once a key is in.
 */
export function initialSavedPreviewRunMode(input: {
  project: AgentFrontendProject;
  sessionKeys?: PreviewSessionKeys;
}): "replay" | "live" {
  return canUseLivePreview(input) ? "live" : "replay";
}
