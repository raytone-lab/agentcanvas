import { useEffect, useRef, useState } from "react";
import { Activity, ChevronDown, Download, Eye, Save, Settings2 } from "lucide-react";

import { SelectMenu } from "../../components/ui";
import { APP_LOCALES, type UiCopy, type AppLocale } from "../../i18n/uiCopy";
import { previewScenarios, type PreviewScenarioId } from "../../preview-runner/PreviewRunner";
import type { RunMode } from "../appTypes";
import { previewScenarioLabel } from "../projection/previewDefaults";
import type { SelectedComponentItem } from "../projection/selectedComponents";

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
  onSavePreview,
  selectedComponentSummary,
  selectedComponentItems,
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
  onSavePreview: () => void;
  selectedComponentSummary: string;
  selectedComponentItems: SelectedComponentItem[];
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
          <h1 className="brand-logo" aria-label="AgentCanvas">AgentCanvas<span>．</span></h1>
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
        {showDebugViewToggle ? (
          <button
            className="mode-toggle-button"
            type="button"
            data-mode={workspaceView}
            aria-label={workspaceView === "preview" ? copy.shell.topbar.viewDebug : copy.shell.topbar.viewPreview}
            title={workspaceView === "preview" ? copy.shell.topbar.viewDebug : copy.shell.topbar.viewPreview}
            onClick={onWorkspaceViewToggle}
          >
            {workspaceView === "preview" ? <Eye size={21} /> : <Activity size={22} />}
          </button>
        ) : surfaceMode === "saved-preview" ? (
          <button className="secondary-button" type="button" onClick={onReturnToBuilder}>
            <Settings2 size={16} />
            {copy.shell.topbar.editUiUx}
          </button>
        ) : null}
        {surfaceMode === "builder" ? (
          <div className="topbar-action-group" role="group" aria-label={`${copy.shell.topbar.save} / ${selectedComponentSummary}`}>
            <button
              className="topbar-group-button"
              type="button"
              aria-label={copy.shell.topbar.save}
              title={copy.shell.topbar.save}
              onClick={onSavePreview}
            >
              <Save size={21} />
            </button>
            <div className="selected-components-menu" ref={selectedComponentsRef}>
              <button
                className="topbar-group-button selected-components-trigger"
                type="button"
                aria-label={selectedComponentSummary}
                aria-haspopup="dialog"
                aria-expanded={selectedComponentsOpen}
                onClick={() => setSelectedComponentsOpen((open) => !open)}
              >
                <span>{selectedComponentSummary}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              {selectedComponentsOpen ? (
                <div className="selected-components-popover" role="dialog" aria-label={selectedComponentSummary}>
                  <div className="selected-components-popover-header">
                    <span>{selectedComponentSummary}</span>
                  </div>
                  {selectedComponentItems.length > 0 ? (
                    <div className="selected-components-list" role="list">
                      {selectedComponentItems.map((item) => (
                        <div className="selected-component-item" role="listitem" key={item.id}>
                          <span className="selected-component-name">{item.group} - {item.label}</span>
                          {item.section ? <span className="selected-component-section">{item.section}</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="selected-components-empty">
                      {copy.shell.editor.noSelectedComponents}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        <button className="primary-button topbar-deploy-button" type="button" onClick={onExport}>
          <Download size={16} />
          {copy.shell.topbar.exportScaffold}
        </button>
      </div>
    </header>
  );
}
