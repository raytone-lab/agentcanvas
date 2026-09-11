import { useEffect, useRef, useState, type ReactNode } from "react";
import { Settings2 } from "lucide-react";

import { SidebarToggleIcon } from "../../components/agent-preview/SessionSidebar";
import { SelectMenu } from "../../components/ui";
import type { UiCopy, AppLocale } from "../../i18n/uiCopy";
import { previewScenarios, type PreviewScenarioId } from "../../preview-runner/PreviewRunner";
import type { RunMode } from "../appTypes";
import { previewScenarioLabel } from "../projection/previewDefaults";
import type { SelectedComponentItem } from "../projection/selectedComponents";
import { ZoomControl } from "./ZoomControl";

/**
 * The canvas's own panel (pure view), floating at the top right.
 *
 * Not a bar any more: the whole window is the canvas, so this is a card over it
 * rather than a row above it. The wordmark and language switch it used to carry
 * moved to `ShellBrand`, at the top of the rail card.
 *
 * Closed, it is the controls that have to be reachable at all times — preview
 * and export. Open, it holds what the canvas *is*: the layer list, and the zoom
 * the list is being read at. Those two belong together and belong here, next to
 * the canvas, rather than in the rail on the far side of the window, which
 * answers a different question ("what could be on the canvas").
 *
 * Owns only its local chrome state — the selected-components popover —
 * everything else arrives as props from the workspace controller.
 */
export function Topbar({
  copy,
  locale,
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
  layersPanel,
  panelOpen,
  onTogglePanel,
}: {
  copy: UiCopy;
  locale: AppLocale;
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
  /** The layer list, composed by the shell so this stays a view. */
  layersPanel: ReactNode;
  panelOpen: boolean;
  onTogglePanel: () => void;
}) {
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
    <header className="topbar" data-open={panelOpen ? "true" : undefined}>
      <div className="topbar-controls">
        {/* Opens the panel below. First in the row, the way the canvas
            sidebar's own toggle sits at the start of its header. */}
        <button
          type="button"
          className="rail-icon-btn topbar-panel-toggle"
          aria-label={panelOpen ? copy.shell.presetRail.collapse : copy.shell.presetRail.expand}
          aria-expanded={panelOpen}
          onClick={onTogglePanel}
        >
          <SidebarToggleIcon size={15} />
        </button>
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
        <button className="primary-button topbar-deploy-button" type="button" onClick={onExport}>
          {copy.shell.topbar.exportScaffold}
        </button>
      </div>
      {panelOpen ? (
        <div className="topbar-panel">
          {layersPanel}
          {/* The zoom sits under the list rather than in the row above: it is
              how the canvas is being looked at, which is the same subject as
              what is on it, and the closed card is for the two controls that
              cannot wait. Every zoom step has a shortcut, so nothing is
              unreachable while it is closed. */}
          <div className="topbar-panel-footer">
            <ZoomControl copy={copy} zoom={canvasZoom} onZoomChange={onCanvasZoomChange} />
          </div>
        </div>
      ) : null}
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
