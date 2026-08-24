/**
 * AgentMatrix workspace.
 *
 * The controlled Session surface: a Transcript (messages, thinking, tool
 * cards), a Session-side result container (Activity / Diagnostics), and a
 * Composer with a compact incident surface. It consumes only the projected
 * `SessionViewModel` from the client — no SSE, no correlation here.
 */

import { useMemo } from "react";

import type { AgentMatrixClient, SessionViewModel } from "../../agentmatrix";
import { useAgentMatrixSession } from "../../agentmatrix";
import { Composer } from "./Composer";
import { TranscriptItemView } from "./MessageRow";
import { ToolCallCard } from "./ToolCallCard";
import { ActivityPanel, DiagnosticsPanel, RuntimeNotice } from "./SidePanels";

export function AgentMatrixWorkspace({
  client,
  sidePanel,
  autoConnect = true,
}: {
  client: AgentMatrixClient;
  sidePanel: "activity" | "diagnostics";
  autoConnect?: boolean;
}) {
  const { viewModel, status } = useAgentMatrixSession(client, { autoConnect });

  return (
    <div className="am-workspace" data-status={status}>
      <main className="am-transcript" data-preview-anchor="transcript">
        {viewModel.transcript.length === 0 ? (
          <div className="am-empty am-transcript-empty">Waiting for the first event…</div>
        ) : (
          viewModel.transcript.map((turn, ti) => (
            <div className="am-turn" key={turn.turnId || `turn-${ti}`}>
              {turn.items.map((item) =>
                item.kind === "tool" ? (
                  <ToolCallCard
                    key={item.id}
                    tool={item}
                    onConfirm={(id, result) => void client.confirmTool(id, result)}
                  />
                ) : (
                  <TranscriptItemView key={item.id} item={item} />
                ),
              )}
            </div>
          ))
        )}

        {viewModel.runtimeNotices.map((notice) => (
          <RuntimeNotice key={notice.id} notice={notice} />
        ))}
      </main>

      <aside className="am-side">
        {sidePanel === "activity" ? (
          <ActivityPanel vm={viewModel} />
        ) : (
          <DiagnosticsPanel vm={viewModel} />
        )}
      </aside>

      <footer className="am-footer">
        <Composer
          vm={viewModel}
          onSend={(t) => void client.sendUserMessage(t)}
          onInterrupt={() => void client.interrupt()}
        />
      </footer>
    </div>
  );
}

/** Small header summarizing the projected Session state. */
export function SessionHeader({ vm }: { vm: SessionViewModel }) {
  const counts = useMemo(
    () => ({
      turns: vm.transcript.length,
      approvals: vm.approvals.length,
      incidents: vm.incidents.filter((i) => !i.resolved).length,
      ops: vm.runtimeOperations.length,
    }),
    [vm],
  );
  return (
    <div className="am-session-header">
      <span className="am-chip" data-lifecycle={vm.lifecycle}>
        {vm.lifecycle}
      </span>
      <span className="am-chip-muted">cursor #{vm.cursor}</span>
      <span className="am-chip-muted">{counts.turns} turns</span>
      {counts.approvals ? <span className="am-chip-warn">{counts.approvals} approvals</span> : null}
      {counts.incidents ? <span className="am-chip-danger">{counts.incidents} incidents</span> : null}
    </div>
  );
}
