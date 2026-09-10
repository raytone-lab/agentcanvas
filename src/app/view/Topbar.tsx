import { useEffect, useRef, useState } from "react";
import { Activity, ChevronDown, Download, Eye, Save, Settings2 } from "lucide-react";

import { SelectMenu } from "../../components/ui";
import { APP_LOCALES, type UiCopy, type AppLocale } from "../../i18n/uiCopy";
import { previewScenarios, type PreviewScenarioId } from "../../preview-runner/PreviewRunner";
import type { RunMode } from "../appTypes";
import { previewScenarioLabel } from "../projection/previewDefaults";
import type { SelectedComponentItem } from "../projection/selectedComponents";
import { ZoomControl } from "./ZoomControl";

/**
 * App top bar (pure view). Owns only its local chrome state — the language
 * menu and the selected-components popover — everything else arrives as props
 * from the workspace controller.
 */
export function Topbar({
  copy,
  locale,
  setLocale,
  surfaceMode,
  onReturnToBuilder,
  runMode,
  onRunModeChange,
  selectedScenarioId,
  onScenarioChange,
  showDebugViewToggle,
  workspaceView,
  onWorkspaceViewToggle,
  onEnterPreview,
  selectedComponentSummary,
  selectedComponentItems,
  canvasZoom,
  onCanvasZoomChange,
  onExport,
}: {
  copy: UiCopy;
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  surfaceMode: "builder" | "saved-preview";
  onReturnToBuilder: () => void;
  runMode: RunMode;
  onRunModeChange: (mode: RunMode) => void;
  selectedScenarioId: PreviewScenarioId;
  onScenarioChange: (id: PreviewScenarioId) => void;
  showDebugViewToggle: boolean;
  workspaceView: "preview" | "debug";
  onWorkspaceViewToggle: () => void;
  onEnterPreview: () => void;
  selectedComponentSummary: string;
  selectedComponentItems: SelectedComponentItem[];
  canvasZoom: number;
  onCanvasZoomChange: (zoom: number) => void;
  onExport: () => void;
}) {
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [selectedComponentsOpen, setSelectedComponentsOpen] = useState(false);
  const selectedComponentsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedComponentsOpen) {
      return;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && selectedComponentsRef.current?.contains(target)) {
        return;
      }
      setSelectedComponentsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedComponentsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedComponentsOpen]);

  return (
    <header className="topbar">
      <div className="topbar-leading">
        <div className="brand-block">
          {/* The wordmark is in the image, so the h1 carries the name for
              assistive tech and the img is decorative. */}
          <h1 className="brand-logo">
            <img src="/brand-logo.png" alt="AgentCanvas" />
          </h1>
        </div>
        <div
          className="language-picker"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setLanguageMenuOpen(false);
            }
          }}
        >
          <button
            className="language-trigger"
            type="button"
            aria-label={copy.shell.topbar.languageSwitchAria}
            aria-haspopup="menu"
            aria-expanded={languageMenuOpen}
            onClick={() => setLanguageMenuOpen((open) => !open)}
          >
            <span>{copy.shell.topbar.languageLabels[locale]}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {languageMenuOpen ? (
            <div className="language-menu" role="menu">
              {APP_LOCALES.map((option) => (
                <button
                  key={option}
                  className="language-option"
                  type="button"
                  role="menuitemradio"
                  aria-checked={locale === option}
                  data-active={locale === option}
                  onClick={() => {
                    setLocale(option);
                    setLanguageMenuOpen(false);
                  }}
                >
                  {copy.shell.topbar.languageLabels[option]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="topbar-controls">
        {surfaceMode === "saved-preview" ? (
          <label className="run-mode-picker">
            <SelectMenu
              size="sm"
              ariaLabel={copy.shell.topbar.runModeLabel}
              value={runMode}
              onValueChange={(value) => onRunModeChange(value as RunMode)}
              options={[
                { value: "replay", label: copy.shell.topbar.runModeReplay },
                { value: "live", label: copy.shell.topbar.runModeLive },
                { value: "pi", label: copy.shell.topbar.runModePi },
              ]}
            />
          </label>
        ) : null}
        {surfaceMode === "saved-preview" && runMode === "replay" ? (
          <label className="scenario-picker">
            <SelectMenu
              size="sm"
              ariaLabel={copy.shell.topbar.scenarioLabel}
              value={selectedScenarioId}
              onValueChange={(value) => onScenarioChange(value as PreviewScenarioId)}
              options={previewScenarios.map((scenario) => ({
                value: scenario.id,
                label: previewScenarioLabel(scenario, locale),
              }))}
            />
          </label>
        ) : null}
        {/* The debug-view toggle is hidden for now. `showDebugViewToggle` and
            `onWorkspaceViewToggle` are still threaded through, so bringing it
            back is re-rendering the button rather than rebuilding the wiring. */}
        {surfaceMode === "saved-preview" ? (
          <button className="secondary-button" type="button" onClick={onReturnToBuilder}>
            <Settings2 size={16} />
            {copy.shell.topbar.editUiUx}
          </button>
        ) : null}
        {/* Two things left the topbar here.

            "已选组件 N 套": File → Layers lists the same components, arranged by
            the column they sit in rather than by preset group.

            "保存": it never saved anything. `saveScaffoldPreview` snapshots the
            project and enters the preview surface — nothing is written to disk,
            and nothing needs to be: the canvas already renders the current
            configuration as it is edited. So this is the same action under an
            honest label, not a replacement for saving. */}
        {surfaceMode === "builder" ? (
          <button
            className="topbar-icon-button topbar-preview-button"
            type="button"
            aria-label={copy.shell.topbar.viewPreview}
            title={copy.shell.topbar.viewPreview}
            onClick={onEnterPreview}
          >
            <PreviewPlayIcon />
          </button>
        ) : null}
        <ZoomControl copy={copy} zoom={canvasZoom} onZoomChange={onCanvasZoomChange} />
        <button className="primary-button topbar-deploy-button" type="button" onClick={onExport}>
          {copy.shell.topbar.exportScaffold}
        </button>
      </div>
    </header>
  );
}

/**
 * Preview control.
 *
 * Path is verbatim from the design; only the stroke is changed to
 * `currentColor` so it inherits the topbar's text colour instead of the
 * spec's literal #111E36 — that value is this theme's `--text-primary`, and
 * hardcoding it would leave the icon invisible on a dark theme.
 */
function PreviewPlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M33.25 17.835C34.9167 18.7972 34.9166 21.2028 33.25 22.165L12.25 34.2891C10.5833 35.2513 8.5 34.0485 8.5 32.124L8.5 7.87598C8.5 5.95147 10.5833 4.74869 12.25 5.71094L33.25 17.835Z"
        stroke="currentColor"
        strokeWidth="3"
      />
    </svg>
  );
}
