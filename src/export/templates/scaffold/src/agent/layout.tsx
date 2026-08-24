import { useCallback, useMemo, useState } from "react";
import type { AgentUXEvent } from "@agent-ux/protocol";
import { useAgentUXReplay } from "@agent-ux/react";
import agentuxConfig from "../../agentux.config";
import { ChatFrame } from "./components/ChatFrame";
import { ComposerFrame } from "./components/ComposerFrame";
import { OutputFrame } from "./components/OutputFrame";
import { replayFixtureEvents } from "./replay";
import { LanguageSwitch, useCopy } from "./i18n";
import { runLiveTurn } from "./harness/liveTurn";
import { defaultProvider } from "./providers/providerConfig";
//#GIT_IMPORT_BEGIN
import { GitFrame } from "./components/GitFrame";
//#GIT_IMPORT_END

export function AgentApp() {
  const copy = useCopy();
  const seed = useMemo(() => replayFixtureEvents(), []);
  const [liveEvents, setLiveEvents] = useState<AgentUXEvent[]>([]);
  const [running, setRunning] = useState(false);
  const events = useMemo(() => [...seed, ...liveEvents], [seed, liveEvents]);
  const { viewModel } = useAgentUXReplay(events);

  const onSubmit = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || running) {
        return;
      }
      setRunning(true);
      try {
        for await (const event of runLiveTurn({ prompt, provider: defaultProvider() })) {
          setLiveEvents((current) => [...current, event]);
        }
      } catch (error) {
        setLiveEvents((current) => [
          ...current,
          {
            id: "live_error_" + current.length,
            type: "run.error",
            payload: {
              code: "live_turn_failed",
              userMessage: error instanceof Error ? error.message : "Live turn failed.",
            },
          },
        ]);
      } finally {
        setRunning(false);
      }
    },
    [running],
  );

  return (
    <div data-agent-shell data-theme={agentuxConfig.theme.preset} data-template={agentuxConfig.template}>
      <header data-agent-topbar>
        <div data-brand>
          <span data-brand-mark aria-hidden="true">AX</span>
          <div data-brand-text>
            <strong>{agentuxConfig.name}</strong>
            <span>{copy.brandSubtitle}</span>
          </div>
        </div>
        <div data-topbar-controls>
          <span data-run-status data-running={running}>{running ? copy.run.live : copy.run.idle}</span>
          <LanguageSwitch />
        </div>
      </header>
      <main data-agent-regions data-template={agentuxConfig.template} data-theme={agentuxConfig.theme.preset}>
        <section data-panel data-region="main">
          <header data-panel-header>
            <h2>{copy.panels.conversation}</h2>
            <span data-panel-status data-status={viewModel.status}>{viewModel.status}</span>
          </header>
          <ChatFrame viewModel={viewModel} />
          <ComposerFrame onSubmit={onSubmit} running={running} />
        </section>
        <div data-region-side>
        <section data-panel data-region="right">
          <header data-panel-header>
            <h2>{copy.panels.output}</h2>
          </header>
          <OutputFrame viewModel={viewModel} />
        </section>
{/*#GIT_PANEL_BEGIN*/}
        <section data-panel data-region="dock">
          <header data-panel-header>
            <h2>{copy.panels.git}</h2>
          </header>
          <GitFrame />
        </section>
{/*#GIT_PANEL_END*/}
        </div>
      </main>
    </div>
  );
}
