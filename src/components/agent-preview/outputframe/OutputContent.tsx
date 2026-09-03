import { Braces, Copy, FileCode2, FileText, PanelsTopLeft, TerminalSquare } from "lucide-react";
import type { AgentUXArtifactTimelineItem } from "@agent-ux/render-core";

import type { AgentFrontendProject, OutputSource } from "../../../schema/agentuxConfig";
import type { ConsoleLogEntry } from "../../../runtime/toolDisplaySpec";
import type { ConcreteArtifactRenderer, OutputFrameCopy } from "./types";
import type { OutputPanelItem } from "./panelItem";
import { languageFromTitle, outputItemRenderKind } from "./renderKind";
import { renderMarkdownPreview } from "./openedItemBody";
import { renderOpenedOutputBody } from "./openedItemBody";
import { OpenedOutputItem, OutputTabs } from "./OutputTabs";
import {
  artifactCodePreview,
  artifactDataPreview,
  artifactDiffPreview,
  artifactText,
  firstMeaningfulLine,
  outputPanelItemFromRenderedArtifact,
} from "./artifactPreview";

export function OutputContent({
  project,
  source,
  artifact,
  renderer,
  copy,
  openItems,
  activeOpenItemId,
  onSelectOpenItem,
  onCloseOpenItem,
  consoleEntries,
}: {
  project: AgentFrontendProject;
  source: OutputSource;
  artifact?: AgentUXArtifactTimelineItem;
  renderer: ConcreteArtifactRenderer;
  copy: OutputFrameCopy;
  consoleEntries: readonly ConsoleLogEntry[];
  openItems: readonly OutputPanelItem[];
  activeOpenItemId?: string;
  onSelectOpenItem?: (id: string) => void;
  onCloseOpenItem?: (id: string) => void;
}) {
  if (source === "console") {
    return <ConsoleOutput copy={copy} entries={consoleEntries} />;
  }

  if (openItems.length > 0) {
    const active = openItems.find((item) => item.id === activeOpenItemId) ?? openItems[openItems.length - 1];
    return (
      <div className="artifact-content opened-output">
        {openItems.length > 1 ? (
          <OutputTabs
            items={openItems}
            activeId={active.id}
            onSelectOpenItem={onSelectOpenItem}
            onCloseOpenItem={onCloseOpenItem}
          />
        ) : null}
        <OpenedOutputItem item={active} copy={copy} />
      </div>
    );
  }

  if (!artifact) {
    return <div className="empty-state">{copy.emptyNoArtifact}</div>;
  }

  if (renderer === "code") {
    const code = artifactCodePreview(artifact, copy);
    return (
      <div className="artifact-content code-output">
        <div className="artifact-title">
          <FileCode2 size={16} />
          <span>{artifact.title ?? artifact.id}</span>
          <code>{code.lang}</code>
          <button
            className="code-copy-button"
            type="button"
            aria-label={copy.copyCode}
            onClick={() => void navigator.clipboard?.writeText(code.code)}
          >
            <Copy size={14} />
          </button>
        </div>
        <pre data-language={code.lang}>{code.code}</pre>
      </div>
    );
  }

  if (renderer === "markdown") {
    return (
      <div className="artifact-content markdown-output">
        <div className="artifact-title">
          <FileText size={16} />
          <span>{artifact.title ?? artifact.id}</span>
          <code>{copy.rendererLabels.markdown}</code>
        </div>
        <div className="markdown-preview">{renderMarkdownPreview(artifactText(artifact, copy), copy)}</div>
      </div>
    );
  }

  if (renderer === "preview") {
    const artifactItem = outputPanelItemFromRenderedArtifact(artifact, project);
    const artifactRenderKind = outputItemRenderKind(artifactItem);
    if (artifactRenderKind === "image" || artifactRenderKind === "audio" || artifactRenderKind === "video") {
      return (
        <div className="artifact-content preview-output media-preview-output" data-render-kind={artifactRenderKind}>
          {renderOpenedOutputBody(artifactItem, artifactRenderKind, artifactItem.language ?? languageFromTitle(artifactItem.title), copy)}
        </div>
      );
    }
    return (
      <div className="artifact-content preview-output">
        <div className="artifact-title">
          <PanelsTopLeft size={16} />
          <span>{copy.renderedPreview}</span>
          <code>{artifact.artifactKind}</code>
        </div>
        <div className="rendered-preview">
          <strong>{artifact.title ?? artifact.id}</strong>
          <p>{firstMeaningfulLine(artifactText(artifact, copy))}</p>
        </div>
      </div>
    );
  }

  if (renderer === "data") {
    return (
      <div className="artifact-content data-output">
        <div className="artifact-title">
          <Braces size={16} />
          <span>{artifact.title ?? artifact.id}</span>
          <code>{copy.rendererLabels.data}</code>
        </div>
        <pre>{artifactDataPreview(artifact)}</pre>
      </div>
    );
  }

  return (
    <div className="artifact-content diff-output">
      <div className="artifact-title">
        <FileCode2 size={16} />
        <span>{artifact.title ?? artifact.id}{copy.diffSuffix}</span>
        <code>{copy.rendererLabels.diff}</code>
      </div>
      <pre>{artifactDiffPreview(artifact, copy)}</pre>
    </div>
  );
}

/**
 * The console surface, driven by the shell commands the run actually issued.
 *
 * It used to print four fixed lines regardless of the session, so switching to this tab
 * changed nothing recognisable and read as a dead control. A run with no shell commands now
 * says so instead of inventing a transcript.
 */
function ConsoleOutput({
  copy,
  entries,
}: {
  copy: OutputFrameCopy;
  entries: readonly ConsoleLogEntry[];
}) {
  return (
    <div className="artifact-content terminal-output">
      <div className="artifact-title">
        <TerminalSquare size={16} />
        <span>{copy.consoleLogs}</span>
        <code>{copy.consoleCode}</code>
      </div>
      {entries.length === 0 ? (
        <p className="artifact-empty">{copy.emptyNoConsole}</p>
      ) : (
        <pre>
          {entries
            .map((entry) => `> ${entry.command}${entry.output ? `\n${entry.output}` : ""}`)
            .join("\n")}
        </pre>
      )}
    </div>
  );
}
