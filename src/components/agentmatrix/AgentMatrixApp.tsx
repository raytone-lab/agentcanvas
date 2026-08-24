/**
 * AgentMatrix demo shell.
 *
 * Drives the workspace from the mock SSE stream: pick a reference scenario,
 * a theme, and an icon set; watch the projection assemble live; and export a
 * backend-ready project. Everything below the controls is the same code an
 * exported project runs against a real backend.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Pause, Play, RotateCcw } from "lucide-react";

import {
  IconSetProvider,
  SCENARIOS,
  createMockClient,
  useAgentMatrixSession,
  type AgentMatrixClient,
  type ScenarioId,
} from "../../agentmatrix";
import { applyTheme } from "../../theme/applyTheme";
import { themeTokens, type ThemePresetId } from "../../theme/themeTokens";
import { downloadProjectZip } from "../../agentmatrix/export/exportProject";
import { AgentMatrixWorkspace, SessionHeader } from "./AgentMatrixWorkspace";
import { IconSwapper } from "./IconSwapper";

const THEME_IDS = Object.keys(themeTokens) as ThemePresetId[];

export function AgentMatrixApp() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("tool-approval");
  const [theme, setTheme] = useState<ThemePresetId>("soft-glass");
  const [sidePanel, setSidePanel] = useState<"activity" | "diagnostics">("activity");
  const [speed, setSpeed] = useState(1);
  const [showIcons, setShowIcons] = useState(false);
  const [exporting, setExporting] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0],
    [scenarioId],
  );

  // A fresh client per scenario/speed so replay restarts cleanly.
  const client = useMemo(
    () => createMockClient(scenario.fixture, { speed }),
    [scenario, speed],
  );

  // Global page theme is the neutral console; the workspace surface is themed.
  useEffect(() => {
    applyTheme(themeTokens["polar-mono"]);
  }, []);
  useEffect(() => {
    if (surfaceRef.current) applyTheme(themeTokens[theme], surfaceRef.current);
  }, [theme]);

  return (
    <IconSetProvider>
      <div className="am-app">
        <header className="am-app-bar">
          <div className="am-app-brand">
            <span className="am-app-logo">◆</span>
            <div>
              <div className="am-app-title">AgentMatrix Canvas</div>
              <div className="am-app-subtitle">Public Session Event projection</div>
            </div>
          </div>

          <div className="am-app-controls">
            <label className="am-field">
              <span>Scenario</span>
              <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value as ScenarioId)}>
                {SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="am-field">
              <span>Theme</span>
              <select value={theme} onChange={(e) => setTheme(e.target.value as ThemePresetId)}>
                {THEME_IDS.map((id) => (
                  <option key={id} value={id}>
                    {themeTokens[id].name}
                  </option>
                ))}
              </select>
            </label>

            <label className="am-field">
              <span>Speed</span>
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                <option value={0.5}>2×</option>
                <option value={1}>1×</option>
                <option value={2}>0.5×</option>
                <option value={4}>0.25×</option>
              </select>
            </label>

            <div className="am-seg">
              <button data-active={sidePanel === "activity"} onClick={() => setSidePanel("activity")}>
                Activity
              </button>
              <button
                data-active={sidePanel === "diagnostics"}
                onClick={() => setSidePanel("diagnostics")}
              >
                Diagnostics
              </button>
            </div>

            <button className="am-ghost" onClick={() => setShowIcons((v) => !v)}>
              Icons
            </button>

            <button
              className="am-primary"
              disabled={exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  await downloadProjectZip();
                } finally {
                  setExporting(false);
                }
              }}
            >
              <Download size={14} />
              {exporting ? "Packaging…" : "Export project"}
            </button>
          </div>
        </header>

        <div className="am-app-meta">
          <p className="am-scenario-summary">{scenario.summary}</p>
        </div>

        <div className="am-app-body">
          <div className="am-surface" ref={surfaceRef} data-theme={theme}>
            <ClientChrome client={client} />
            <AgentMatrixWorkspace client={client} sidePanel={sidePanel} />
          </div>

          {showIcons ? (
            <div className="am-icons-panel">
              <IconSwapper />
            </div>
          ) : null}
        </div>
      </div>
    </IconSetProvider>
  );
}

function ClientChrome({ client }: { client: AgentMatrixClient }) {
  const { viewModel, status, controls } = useAgentMatrixSession(client, { autoConnect: false });
  return (
    <div className="am-chrome">
      <SessionHeader vm={viewModel} />
      <div className="am-chrome-actions">
        <span className="am-status-pill" data-status={status}>
          {status}
        </span>
        {status === "streaming" ? (
          <button onClick={controls.pause} title="Pause">
            <Pause size={14} />
          </button>
        ) : (
          <button onClick={status === "paused" ? controls.resume : controls.connect} title="Play">
            <Play size={14} />
          </button>
        )}
        <button onClick={controls.reset} title="Restart">
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
