import { Maximize2, Minimize2, PanelRight } from "../../agentmatrix/uiIcons";
import { useEffect, useRef, useState } from "react";
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
import { WorkspaceFilesSection } from "./outputframe/RunPanelSections";

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
  /*
   * Expanded, the panel takes over the conversation's place — the way a coding
   * agent's side panel maximises — rather than opening as a dialog over it.
   *
   * It used to be portalled to the `.preview-frame` and drawn as a modal with a
   * backdrop. Now the panel stays in its column and says so on the frame
   * (`data-output-maximized`); the layout does the rest: the conversation
   * column gives its width up and fades, the right column grows into the room,
   * the session sidebar stays where it is. Both on `flex-grow`, so it is one
   * glide in either direction rather than a box appearing on top.
   *
   * An attribute on the frame rather than lifted state, so this works wherever
   * the panel is mounted — the editor's canvas and the exported app alike.
   */
  const sectionRef = useRef<HTMLElement | null>(null);
  const toggleExpanded = () => setExpanded((value) => !value);
  useEffect(() => {
    const frame = sectionRef.current?.closest<HTMLElement>(".preview-frame");
    if (!frame) return;
    if (expanded) frame.dataset.outputMaximized = "true";
    else delete frame.dataset.outputMaximized;
    return () => {
      delete frame.dataset.outputMaximized;
    };
  }, [expanded]);
  // Esc restores it, as it closes every dialog here.
  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [expanded]);
  /*
   * The delivery the renderer acts on: the latest *document*, falling back to
   * the latest artifact of any kind. Plain "latest" made it whatever media the
   * run produced last — a video, on the canvas — and a code / diff / data
   * renderer has nothing to say about a video.
   */
  const artifacts = viewModel.timeline.filter((item): item is AgentUXArtifactTimelineItem => item.kind === "artifact");
  const artifact = [...artifacts].reverse().find((item) => !isMediaArtifact(item)) ?? artifacts[artifacts.length - 1];
  const artifactRenderer = resolveArtifactRenderer(artifact, project.output.artifactRenderer);

  return (
      <section
        ref={sectionRef}
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
              onClick={toggleExpanded}
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
        {/*
          * The run's file index, below the delivery: what it changed sits with
          * what it produced. Progress and tasks are not here — they are about
          * the run in flight, so they dock above the composer instead
          * (`RunStatusDock` in `ComposerFrame`).
          *
          * Not while expanded: expanding is a request to read the artifact at
          * full size, and this index is what surrounds it.
          */}
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
        {!expanded && project.output.workspaceFiles ? (
          <WorkspaceFilesSection timeline={viewModel.timeline} copy={c} />
        ) : null}
      </section>
  );
}

function isMediaArtifact(item: AgentUXArtifactTimelineItem): boolean {
  const kind = String(item.artifactKind ?? "").toLowerCase();
  const mimeType = String((item as AgentUXArtifactTimelineItem & { mimeType?: string }).mimeType ?? "").toLowerCase();
  return /image|audio|video/.test(kind) || /^(image|audio|video)\//.test(mimeType);
}
