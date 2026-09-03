import { Maximize2, Minimize2, PanelRight } from "lucide-react";
import { useState } from "react";
import type { AgentUXArtifactTimelineItem, AgentUXViewModel } from "@agent-ux/render-core";

import type { AgentFrontendProject, OutputSource } from "../../schema/agentuxConfig";
import { useCopy } from "../../i18n/LocaleContext";
import { consoleLogEntries } from "../../runtime/toolDisplaySpec";
import { OutputContent } from "./outputframe/OutputContent";
import { ExpandOutputIcon, OutputSourceSwitch, RightSidebarIcon } from "./outputframe/OutputSourceSwitch";
import { outputTitle } from "./outputframe/labels";
import { resolveArtifactRenderer } from "./outputframe/artifactPreview";
import type { OutputPanelItem, OutputPanelOpenRequest } from "./outputframe/panelItem";
import { languageFromFileName, fallbackOutputPanelBody, normalizeOutputPanelRequest } from "./outputframe/panelItem";
import { OutputPanelModal } from "./outputframe/OutputPanelModal";

// The panel-item helpers stay re-exported from this module: App, ToolCallCard and ChatFrame
// import them from "./components/agent-preview/OutputFrame", and the scaffold export asserts
// on that path.
export type { OutputPanelItem, OutputPanelOpenRequest } from "./outputframe/panelItem";
export { languageFromFileName, fallbackOutputPanelBody, normalizeOutputPanelRequest } from "./outputframe/panelItem";
export { OutputPanelModal } from "./outputframe/OutputPanelModal";

export function OutputFrame({
  project,
  viewModel,
  onCollapse,
  openItems = [],
  activeOpenItemId,
  onSelectOpenItem,
  onCloseOpenItem,
  onSourceChange,
}: {
  project: AgentFrontendProject;
  viewModel: AgentUXViewModel;
  onCollapse?: () => void;
  openItems?: readonly OutputPanelItem[];
  activeOpenItemId?: string;
  onSelectOpenItem?: (id: string) => void;
  onCloseOpenItem?: (id: string) => void;
  onSourceChange?: (source: OutputSource) => void;
}) {
  const copy = useCopy();
  const c = copy.workspace.outputFrame;
  const [expanded, setExpanded] = useState(false);
  const artifact = [...viewModel.timeline].reverse().find((item): item is AgentUXArtifactTimelineItem => item.kind === "artifact");
  const artifactRenderer = resolveArtifactRenderer(artifact, project.output.artifactRenderer);

  return (
    <>
      {expanded ? (
        <div className="artifact-expand-backdrop" aria-hidden="true" onClick={() => setExpanded(false)} />
      ) : null}
      <section
        className="utility-card artifact-frame"
        data-preview-anchor="output"
        data-expanded={expanded}
        data-output-source={project.output.source}
        data-artifact-renderer={project.output.artifactRenderer}
        data-output-surface={project.output.surface}
        data-view={`${project.output.source}:${artifactRenderer}`}
      >
        <header className="utility-header output-header" aria-label={outputTitle(project.output.source, artifactRenderer, c)}>
          <div className="utility-header-leading">
            {onSourceChange ? (
              <OutputSourceSwitch source={project.output.source} copy={c} onChange={onSourceChange} />
            ) : null}
          </div>
          <div className="utility-header-actions">
            <button
              className="rail-icon-btn"
              type="button"
              aria-label={expanded ? c.collapseOutput : c.expandOutput}
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? (
                <Minimize2 size={15} />
              ) : (
                <>
                  <span className="native-rail-icon"><ExpandOutputIcon size={15} /></span>
                  <span className="legacy-rail-icon"><Maximize2 size={15} /></span>
                </>
              )}
            </button>
            {onCollapse && !expanded ? (
              <button
                className="rail-icon-btn"
                type="button"
                aria-label={c.collapseOutput}
                onClick={onCollapse}
              >
                <span className="native-rail-icon"><RightSidebarIcon size={15} /></span>
                <span className="legacy-rail-icon"><PanelRight size={15} /></span>
              </button>
            ) : null}
          </div>
        </header>
        <OutputContent
          project={project}
          source={project.output.source}
          artifact={artifact}
          renderer={artifactRenderer}
          copy={c}
          openItems={openItems}
          activeOpenItemId={activeOpenItemId}
          onSelectOpenItem={onSelectOpenItem}
          onCloseOpenItem={onCloseOpenItem}
          consoleEntries={consoleLogEntries(viewModel.timeline)}
        />
      </section>
    </>
  );
}
