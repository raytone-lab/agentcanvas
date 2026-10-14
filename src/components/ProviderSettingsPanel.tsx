import { motion } from "motion/react";
import { Check, Eye, EyeOff, Loader2, Lock, RefreshCw, RotateCcw } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import type { ProviderCheckResult } from "../app/viewmodel/useProviderSettings";
import { burstConfetti } from "./confettiBurst";
import { ProviderLogo } from "./providerLogos";
import { SelectMenu } from "./ui";

type ProviderPatch = Partial<Pick<ProviderConnection, "baseUrl" | "defaultModel" | "label" | "models">> & {
  authEnvVar?: string;
};

type CheckState = { status: "testing" } | ProviderCheckResult;


/**
 * A box whose height follows its content on a spring.
 *
 * The form changes height with the provider — the custom one has a name field
 * the others do not — and swapped in one frame, the rail's scroll position was
 * clamped by the sudden drop and the whole panel jumped up. Measured with a
 * ResizeObserver and animated, the drop is a glide the scroll can follow.
 */
function AutoHeight({ children }: { children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const element = innerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);
    setHeight(element.offsetHeight);
    return () => observer.disconnect();
  }, []);
  return (
    <motion.div
      className="mp-autoheight"
      initial={false}
      animate={{ height }}
      transition={{ type: "spring", stiffness: 380, damping: 40 }}
    >
      <div ref={innerRef}>{children}</div>
    </motion.div>
  );
}

/**
 * The 模型 panel. Same two jobs as before, laid out as what they are:
 *
 *   - 输入框可选模型: which providers the composer's model menu offers. A
 *     multi-select of marks; at least one stays on (the old keep-one rule).
 *   - 接口配置: one form, for the provider picked at its top. The system cannot
 *     know whose key the reader holds, so the key is what takes effect; picking
 *     the provider fills in its Base URL, key variable and model list, and the
 *     reader supplies the key.
 *
 * It used to render one full form per enabled provider, stacked, so switching
 * two on doubled the panel and read as two things to fill in. The data has not
 * changed: each provider still keeps its own fields and its own session key,
 * and the form shows whichever provider is picked. Every handler is the old
 * one — toggle, field updates (including a key pasted into the env-var field
 * being moved to the session key), test, fetch, save.
 *
 * What is new is only what the reader sees: the marks, a show/hide on the key,
 * a reset on a Base URL that was edited, and the last check's outcome next to
 * the buttons instead of only in a toast.
 */
export function ProviderSettingsPanel({
  project,
  sessionKeys,
  onToggleProvider,
  onUpdateProvider,
  onSessionKeyChange,
  onTestProvider,
  onFetchModels,
  onSave,
}: {
  project: AgentFrontendProject;
  sessionKeys: Record<string, string>;
  onToggleProvider: (id: ProviderCatalogId) => void;
  /**
   * Unused while the 展示设置 section is withheld — see the note at the end of
   * this file. Kept in the signature so `PresetRail` and `App` do not have to
   * change and the row can come back on its own.
   */
  onToggleSettingsLauncher: () => void;
  /** Unused here, as before; kept so the callers do not change. */
  onSetDefaultProvider: (id: ProviderConnectionId) => void;
  onUpdateProvider: (id: ProviderConnectionId, patch: ProviderPatch) => void;
  onSessionKeyChange: (id: ProviderConnectionId, value: string) => void;
  onTestProvider: (provider: ProviderConnection, sessionKey?: string) => void | Promise<ProviderCheckResult>;
  onFetchModels: (provider: ProviderConnection, sessionKey?: string) => void | Promise<ProviderCheckResult>;
  onSave: () => void;
}) {
  const copy = useCopy().composer.settingsPanel;
  /**
   * Providers whose env-var field just had a pasted key redirected to the session key.
   *
   * Inline rather than a toast, matching `ProviderFloatingSettings`: the explanation belongs next
   * to the field that confused the reader, and it should stay put rather than time out.
   */
  const [redirectedKeyFor, setRedirectedKeyFor] = useState<readonly string[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [checks, setChecks] = useState<Partial<Record<ProviderConnectionId, CheckState>>>({});

  const enabledProviders = enabledProviderConnections(project);
  const providersById = useMemo(
    () => new Map(project.providers.connections.map((provider) => [provider.id, provider])),
    [project.providers.connections],
  );

  /*
   * The provider the form is showing. Starts on the project's default and
   * follows it back there if the picked one is switched off above, so the form
   * never shows a provider the composer no longer offers.
   */
  const [pickedId, setPickedId] = useState<ProviderConnectionId>(project.providers.defaultProviderId);
  const configured =
    enabledProviders.find((provider) => provider.id === pickedId)
    ?? enabledProviders.find((provider) => provider.id === project.providers.defaultProviderId)
    ?? enabledProviders[0];

  function handleToggleProvider(id: ProviderCatalogId, enabled: boolean) {
    if (enabled && enabledProviders.length <= 1) {
      toast.info(copy.keepOneModelToast);
      return;
    }

    // The list only decides what the composer offers. It used to point the
    // form at whatever was just switched on, which re-ran the form for every
    // tick — the form changes when the provider menu above it does, and only
    // then.
    onToggleProvider(id);
  }

  async function runCheck(provider: ProviderConnection, action: typeof onTestProvider) {
    setChecks((current) => ({ ...current, [provider.id]: { status: "testing" } }));
    const result = await action(provider, sessionKeys[provider.id] ?? "");
    setChecks((current) => {
      const next = { ...current };
      if (result) next[provider.id] = result;
      else delete next[provider.id];
      return next;
    });
  }

  function renderStatus(provider: ProviderConnection) {
    const check = checks[provider.id];
    if (!check) return null;
    if (check.status === "testing") {
      return (
        <span className="mp-status" data-tone="busy">
          <Loader2 size={12} className="mp-spin" aria-hidden="true" />
          {copy.statusTesting}
        </span>
      );
    }
    if (check.status === "ok") {
      return (
        <span className="mp-status" data-tone="ok">
          <i aria-hidden="true" />
          {copy.statusOk}
          {check.models ? ` · ${copy.statusOkModels.replace("{count}", String(check.models))}` : ""}
        </span>
      );
    }
    if (check.status === "needs-key") {
      return (
        <span className="mp-status" data-tone="warn">
          <i aria-hidden="true" />
          {copy.statusNeedsKey}
        </span>
      );
    }
    return (
      <span className="mp-status" data-tone="error" title={check.message}>
        <i aria-hidden="true" />
        {copy.statusFailed}
      </span>
    );
  }

  function renderConfig(provider: ProviderConnection) {
    const catalogProvider = providerOptionForId(provider.id);
    const modelOptions = provider.models.length > 0 ? provider.models : [...catalogProvider.modelOptions];
    const envVar = provider.auth.mode === "env" ? provider.auth.envVar : "";
    const sessionKey = sessionKeys[provider.id] ?? "";
    const noKey = provider.auth.mode === "none";
    const check = checks[provider.id];

    return (
      <div className="mp-form">
        {provider.kind === "custom" ? (
          <label className="mp-field">
            <span className="mp-field-label">{copy.name}</span>
            <input
              className="mp-input"
              value={provider.label}
              onChange={(event) => onUpdateProvider(provider.id, { label: event.target.value })}
            />
          </label>
        ) : null}

        <label className="mp-field">
          <span className="mp-field-label">
            {copy.baseUrl}
            {catalogProvider.baseUrl && provider.baseUrl !== catalogProvider.baseUrl ? (
              <button
                type="button"
                className="mp-field-action"
                title={copy.resetBaseUrl}
                aria-label={copy.resetBaseUrl}
                onClick={(event) => {
                  event.preventDefault();
                  onUpdateProvider(provider.id, { baseUrl: catalogProvider.baseUrl });
                }}
              >
                <RotateCcw size={11} aria-hidden="true" />
              </button>
            ) : null}
          </span>
          <input
            className="mp-input mp-input-mono"
            value={provider.baseUrl}
            spellCheck={false}
            onChange={(event) => onUpdateProvider(provider.id, { baseUrl: event.target.value })}
          />
        </label>

        <label className="mp-field">
          <span className="mp-field-label" title={copy.envVarHint}>{copy.apiKeyEnv}</span>
          <input
            className="mp-input mp-input-mono"
            disabled={noKey}
            spellCheck={false}
            value={noKey ? copy.noKeyRequired : envVar}
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
            <small className="mp-field-note" role="status">
              {copy.keyPastedIntoEnvVarToast}
            </small>
          ) : null}
        </label>

        <label className="mp-field">
          <span className="mp-field-label">{copy.sessionKey}</span>
          <span className="mp-input-wrap">
            <input
              className="mp-input mp-input-mono"
              disabled={noKey}
              placeholder={noKey ? copy.sessionKeyPlaceholderNone : copy.sessionKeyPlaceholder}
              type={showKey ? "text" : "password"}
              spellCheck={false}
              autoComplete="off"
              value={sessionKey}
              onChange={(event) => onSessionKeyChange(provider.id, event.target.value)}
            />
            {noKey ? null : (
              <button
                type="button"
                className="mp-input-icon"
                aria-label={showKey ? copy.hideKey : copy.showKey}
                title={showKey ? copy.hideKey : copy.showKey}
                onClick={(event) => {
                  event.preventDefault();
                  setShowKey((value) => !value);
                }}
              >
                {showKey ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
              </button>
            )}
          </span>
        </label>

        <div className="mp-field">
          {/* Fetching the model list is about this menu, so it sits on the
              menu's own label rather than in a row of buttons below. */}
          <span className="mp-field-label">
            {copy.defaultModel}
            <button
              type="button"
              className="mp-field-link"
              disabled={check?.status === "testing"}
              title={copy.fetchModels}
              onClick={() => void runCheck(provider, onFetchModels)}
            >
              <RefreshCw size={11} className={check?.status === "testing" ? "mp-spin" : undefined} aria-hidden="true" />
              {copy.refreshModels}
            </button>
          </span>
          <SelectMenu
            ariaLabel={copy.defaultModel}
            value={provider.defaultModel}
            onValueChange={(value) => onUpdateProvider(provider.id, { defaultModel: value })}
            options={modelOptions.map((model) => ({ value: model, label: model }))}
          />
        </div>

        {/* The result on a line of its own, then two equal buttons. A row
            of three — test, fetch, save — did not fit the panel in English
            or Japanese, and put save on a line by itself. */}
        <div className="mp-actions">
          {renderStatus(provider)}
          <div className="mp-actions-row">
            <button
              type="button"
              className="mp-check"
              disabled={check?.status === "testing"}
              title={copy.testKey}
              onClick={() => void runCheck(provider, onTestProvider)}
            >
              <Check size={13} aria-hidden="true" />
              {copy.testShort}
            </button>
            <button type="button" className="mp-save" onClick={onSave}>
              {copy.save}
            </button>
          </div>
        </div>
        {check?.status === "error" && check.message ? (
          <p className="mp-error" role="status">{check.message}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mp">
      <section className="mp-section">
        <h3 className="mp-section-title">{copy.enabledProviders}</h3>
        <div className="mp-chips" role="group" aria-label={copy.enabledProviders}>
          {providerCatalog.map((catalogProvider) => {
            const provider = providersById.get(catalogProvider.connectionId);
            const enabled = Boolean(provider?.enabled);
            return (
              <button
                key={catalogProvider.id}
                type="button"
                className="mp-chip"
                data-active={enabled ? "true" : undefined}
                data-provider={catalogProvider.id}
                aria-pressed={enabled}
                onClick={(event) => {
                  const turningOn = !enabled;
                  handleToggleProvider(catalogProvider.id, enabled);
                  // Confetti from the check, only for a tick the reader made.
                  if (turningOn) {
                    const check = event.currentTarget.querySelector(".mp-chip-check");
                    const box = check?.getBoundingClientRect();
                    if (box) {
                      const accent = getComputedStyle(event.currentTarget).getPropertyValue("--select-color").trim();
                      // After the disc's pop has started, so the burst leaves a
                      // check that is already there.
                      window.setTimeout(
                        () => burstConfetti(box.left + box.width / 2, box.top + box.height / 2, accent || undefined),
                        90,
                      );
                    }
                  }
                }}
              >
                <span className="mp-chip-logo">
                  <ProviderLogo id={catalogProvider.id} size={14} />
                </span>
                <span className="mp-chip-name">
                  {catalogProvider.id === "custom"
                    ? copy.customProvider
                    : catalogProvider.id === "local"
                      ? copy.localModels
                      : catalogProvider.label}
                </span>
                {/* Drawn for 16px rather than a 9px stock glyph scaled into
                    place, which came out soft. */}
                <span className="mp-chip-check" aria-hidden="true">
                    {/* Its own 10px box, centred in the disc: drawn at 16px it
                      sat inside the border and came out low and right. The
                      tick's ink is centred on (5, 5) — the short stroke's
                      weight is what makes a tick look low when its box is. */}
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2.1 5.15 4.05 7.05 7.9 2.95"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {configured ? (
        <section className="mp-section">
          <h3 className="mp-section-title">{copy.connections}</h3>
          {/* Which provider the form below is for: one of those switched on
              above. A list of one is still shown, so the form always says whose
              key it is asking for. */}
          <div className="mp-field">
            <span className="mp-field-label">{copy.provider}</span>
            <SelectMenu
              ariaLabel={copy.provider}
              value={configured.id}
              onValueChange={(value) => setPickedId(value as ProviderConnectionId)}
              options={enabledProviders.map((provider) => ({
                value: provider.id,
                label: (
                  <span className="mp-option">
                    <ProviderLogo id={provider.id as ProviderCatalogId} size={14} />
                    {provider.label}
                  </span>
                ),
              }))}
            />
          </div>
          {/* The fields update in place — switching provider is new values,
              not a new form, so there is nothing to fade. Only the height
              glides, for the custom provider's extra name field. */}
          <AutoHeight>{renderConfig(configured)}</AutoHeight>
        </section>
      ) : null}

      {/*
        The 展示设置 section — a single row toggling the generated agent's
        bottom-left provider-settings launcher — was pulled on request
        ("先不要了").

        Withheld, not deleted: `providers.settingsLauncher` is still in the
        schema and still read by `ProviderFloatingSettings` and the exported
        scaffold's `ComposerFrame`, and the option id is withheld from the rail
        in `presetRailData`'s `RAIL_WITHHELD_OPTION_IDS` rather than removed —
        see the note there. The field defaults to `false`, so with no control
        the launcher never appears.

        Putting it back is restoring this section and deleting one line from
        that set. `copy.providerUi` / `copy.settingsGear` are left in the three
        locale files for the same reason.
      */}

      <p className="mp-note">
        <Lock size={12} aria-hidden="true" />
        <span>{copy.secretNote}</span>
      </p>
    </div>
  );
}
