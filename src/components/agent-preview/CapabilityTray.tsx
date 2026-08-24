import type { AgentUXViewModel } from "@agent-ux/render-core";
import { Boxes, CircleDot } from "lucide-react";

import { useCopy } from "../../i18n/LocaleContext";

export function CapabilityTray({ viewModel }: { viewModel: AgentUXViewModel }) {
  const copy = useCopy();
  return (
    <section className="utility-card capability-tray">
      <header className="utility-header">
        <div>
          <h3>{copy.workspace.capabilityTray.title}</h3>
          <p>{copy.workspace.capabilityTray.subtitle}</p>
        </div>
        <Boxes size={16} />
      </header>
      {viewModel.capabilities.length === 0 ? (
        <div className="empty-state">{copy.workspace.capabilityTray.empty}</div>
      ) : (
        <div className="capability-list">
          {viewModel.capabilities.map((capability) => (
            <article key={capability.id} className="capability-item" data-status={capability.status}>
              <CircleDot size={13} />
              <div>
                <strong>{capability.title}</strong>
                <p>{capability.description ?? capability.source.kind}</p>
              </div>
              <code>{capability.itemCount}</code>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
