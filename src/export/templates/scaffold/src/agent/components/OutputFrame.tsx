import type { AgentUXArtifactTimelineItem, AgentUXViewModel } from "@agent-ux/render-core";
import { FileCode2 } from "lucide-react";
import agentuxConfig from "../../../agentux.config";
import { useCopy } from "../i18n";

export function OutputFrame({ viewModel }: { viewModel: AgentUXViewModel }) {
  const copy = useCopy();
  const artifact = [...viewModel.timeline]
    .reverse()
    .find((item): item is AgentUXArtifactTimelineItem => item.kind === "artifact");

  return (
    <div
      data-output-frame
      data-output-source={agentuxConfig.output.source}
      data-artifact-renderer={agentuxConfig.output.artifactRenderer}
      data-output-surface={agentuxConfig.output.surface}
    >
      {artifact ? (
        <article data-output-card>
          <div data-output-title>
            <FileCode2 size={14} />
            <strong>{artifact.title ?? artifact.id}</strong>
            <span data-output-status data-status={artifact.status}>{artifact.status}</span>
          </div>
          <pre data-output-body>{artifact.content ?? copy.emptyOutput}</pre>
        </article>
      ) : (
        <div data-empty-panel>{copy.emptyOutput}</div>
      )}
    </div>
  );
}
