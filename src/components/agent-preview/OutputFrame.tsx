import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { AgentUXArtifactTimelineItem, AgentUXViewModel } from "@agent-ux/render-core";
import { Braces, Copy, FileAudio2, FileCode2, FileText, FileVideo2, ImageIcon, Maximize2, Minimize2, PanelRight, PanelsTopLeft, Play, TerminalSquare, Volume2, X } from "lucide-react";

import type { AgentFrontendProject, ArtifactRenderer, OutputSource } from "../../schema/agentuxConfig";
import { useCopy } from "../../i18n/LocaleContext";
import type { UiCopy } from "../../i18n/uiCopy";
import { consoleLogEntries, type ConsoleLogEntry } from "../../runtime/toolDisplaySpec";
import { ImageBlurFlowReveal, ImageDotFlickerReveal, ImageGenerationReveal, ImagePixelGridReveal, MediaLoadingReveal } from "./ImageGeneration";

type ConcreteArtifactRenderer = Exclude<ArtifactRenderer, "auto">;
type OutputFrameCopy = UiCopy["workspace"]["outputFrame"];

export type OutputPanelItem = {
  id: string;
  kind: "file" | "review";
  title: string;
  subtitle?: string;
  language?: string;
  body?: string;
  imageSrc?: string;
  mediaStyle?: string;
};

export type OutputPanelOpenRequest = string | Omit<OutputPanelItem, "id"> & { id?: string };

export function languageFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "ts" || ext === "tsx") return "typescript";
  if (ext === "js" || ext === "jsx") return "javascript";
  if (ext === "md" || ext === "mdx") return "markdown";
  return ext || "text";
}

export function fallbackOutputPanelBody(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(lower)) {
    return "image preview";
  }
  if (/\.(mp3|wav|m4a|aac|ogg|flac)$/.test(lower)) {
    return `media-generation:audio\nAudio placeholder preview for ${fileName}.`;
  }
  if (/\.(mp4|webm|mov|m4v)$/.test(lower)) {
    return `media-generation:video\nVideo placeholder preview for ${fileName}.`;
  }
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return `<main class="page"><section class="card"><h1>${fileName}</h1><p>Interactive HTML preview is ready.</p><button>Run preview</button></section></main>`;
  }
  if (lower.endsWith(".md") || lower.endsWith(".mdx")) {
    return `# ${fileName}\n\n- Summary preview\n- Changes are ready\n\nThis document is rendered as Markdown.`;
  }
  if (lower.endsWith(".json")) {
    return JSON.stringify({ file: fileName, status: "ready", preview: true }, null, 2);
  }
  return `// ${fileName}\n// File preview is ready.`;
}

/**
 * Turn an artifact-open request (a bare path, or a partial item) into a panel item.
 * Lives here rather than in App.tsx so the exported scaffold opens artifacts the same
 * way the configurator does.
 */
export function normalizeOutputPanelRequest(request: OutputPanelOpenRequest): OutputPanelItem {
  if (typeof request === "string") {
    const title = request.split("/").filter(Boolean).pop() ?? request;
    return {
      id: `file:${request}`,
      kind: "file",
      title,
      subtitle: request,
      language: languageFromFileName(title),
      body: fallbackOutputPanelBody(title),
    };
  }
  return {
    ...request,
    id: request.id ?? `${request.kind}:${request.title}`,
    language: request.language ?? languageFromFileName(request.title),
  };
}

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

export function OutputPanelModal({
  items,
  activeId,
  onSelectItem,
  onCloseItem,
  onClose,
}: {
  items: readonly OutputPanelItem[];
  activeId?: string;
  onSelectItem?: (id: string) => void;
  onCloseItem?: (id: string) => void;
  onClose: () => void;
}) {
  const copy = useCopy();
  const c = copy.workspace.outputFrame;
  const activeItem = items.find((item) => item.id === activeId) ?? items[items.length - 1];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!activeItem) {
    return null;
  }

  return (
    <>
      <div className="artifact-expand-backdrop" aria-hidden="true" onClick={onClose} />
      <section
        className="utility-card artifact-frame output-modal-frame"
        data-expanded="true"
        data-output-modal="true"
        data-output-source="artifact"
        role="dialog"
        aria-modal="true"
        aria-label={outputTitle("artifact", outputItemModalRenderer(activeItem), c)}
      >
        <header className="utility-header">
          <div>
            <h3>{outputTitle("artifact", outputItemModalRenderer(activeItem), c)}</h3>
          </div>
          <div className="utility-header-actions">
            <button
              className="rail-icon-btn"
              type="button"
              aria-label="Close output"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="artifact-content opened-output">
          {items.length > 1 ? (
            <OutputTabs
              items={items}
              activeId={activeItem.id}
              onSelectOpenItem={onSelectItem}
              onCloseOpenItem={onCloseItem}
            />
          ) : null}
          <OpenedOutputItem item={activeItem} copy={c} />
        </div>
      </section>
    </>
  );
}

function OutputSourceSwitch({
  source,
  copy,
  onChange,
}: {
  source: OutputSource;
  copy: OutputFrameCopy;
  onChange: (source: OutputSource) => void;
}) {
  return (
    <div className="output-source-switch" role="group" aria-label={copy.titleArtifactPrefix}>
      <button
        type="button"
        aria-label={copy.titleArtifactPrefix}
        aria-pressed={source === "artifact"}
        data-active={source === "artifact"}
        title={copy.subtitleArtifactPreview}
        onClick={() => onChange("artifact")}
      >
        <FileCode2 size={15} />
        <span className="output-source-label">{copy.sourceArtifact}</span>
      </button>
      <button
        type="button"
        aria-label={copy.titleConsole}
        aria-pressed={source === "console"}
        data-active={source === "console"}
        title={copy.consoleLogs}
        onClick={() => onChange("console")}
      >
        <TerminalSquare size={15} />
        <span className="output-source-label">{copy.sourceConsole}</span>
      </button>
    </div>
  );
}

function ExpandOutputIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M29.8652 7.32129V14.4404C29.8652 15.1523 29.3906 15.627 28.6787 15.627C27.9668 15.627 27.4922 15.1523 27.4922 14.4404V10.1689L21.2036 16.4575C20.9663 16.6948 20.729 16.8135 20.373 16.8135C20.0171 16.8135 19.7798 16.6948 19.5425 16.4575C19.43 16.3504 19.3404 16.2215 19.2793 16.0788C19.2181 15.936 19.1865 15.7823 19.1865 15.627C19.1865 15.4716 19.2181 15.3179 19.2793 15.1751C19.3404 15.0324 19.43 14.9035 19.5425 14.7964L25.8311 8.50781H21.5596C20.8477 8.50781 20.373 8.0332 20.373 7.32129C20.373 6.60938 20.8477 6.13477 21.5596 6.13477H28.6787C28.7974 6.13477 29.0347 6.13477 29.1533 6.25342C29.3906 6.37207 29.6279 6.60938 29.7466 6.84668C29.8652 6.96533 29.8652 7.20264 29.8652 7.32129ZM14.7964 19.5425L8.50781 25.8311V21.5596C8.50781 20.8477 8.0332 20.373 7.32129 20.373C6.60938 20.373 6.13477 20.8477 6.13477 21.5596V28.6787C6.13477 28.7974 6.13477 29.0347 6.25342 29.1533C6.37207 29.3906 6.60938 29.6279 6.84668 29.7466C6.96533 29.8652 7.20264 29.8652 7.32129 29.8652H14.4404C15.1523 29.8652 15.627 29.3906 15.627 28.6787C15.627 27.9668 15.1523 27.4922 14.4404 27.4922H10.1689L16.4575 21.2036C16.57 21.0965 16.6596 20.9676 16.7207 20.8249C16.7819 20.6821 16.8135 20.5284 16.8135 20.373C16.8135 20.2177 16.7819 20.064 16.7207 19.9212C16.6596 19.7785 16.57 19.6496 16.4575 19.5425C16.3504 19.43 16.2215 19.3404 16.0788 19.2793C15.936 19.2181 15.7823 19.1865 15.627 19.1865C15.4716 19.1865 15.3179 19.2181 15.1751 19.2793C15.0324 19.3404 14.9035 19.43 14.7964 19.5425Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RightSidebarIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="-1.3" y="1.3" width="27.4" height="27.4" rx="4.7" transform="matrix(-1 0 0 1 27.4 0)" stroke="currentColor" strokeWidth="2.6" />
      <rect width="2.6" height="27" transform="matrix(-1 0 0 1 20 2)" fill="currentColor" />
    </svg>
  );
}

function OutputContent({
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

function OutputTabs({
  items,
  activeId,
  onSelectOpenItem,
  onCloseOpenItem,
}: {
  items: readonly OutputPanelItem[];
  activeId: string;
  onSelectOpenItem?: (id: string) => void;
  onCloseOpenItem?: (id: string) => void;
}) {
  const activeTabRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeId]);

  return (
    <div className="output-tabs" role="tablist" aria-label="Opened output">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <div
            key={item.id}
            ref={active ? activeTabRef : undefined}
            className="output-tab"
            data-active={active}
          >
            <button
              className="output-tab-main"
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelectOpenItem?.(item.id)}
            >
              {outputItemIcon(item)}
              <span className="output-tab-title">{item.title}</span>
            </button>
            {onCloseOpenItem ? (
              <button
                className="output-tab-close"
                type="button"
                aria-label={`Close ${item.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseOpenItem(item.id);
                }}
              >
                <X size={12} />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function OpenedOutputItem({ item, copy }: { item: OutputPanelItem; copy: OutputFrameCopy }) {
  const language = item.language ?? languageFromTitle(item.title);
  const renderKind = outputItemRenderKind(item);
  return (
    <div className="opened-output-item" data-kind={item.kind} data-render-kind={renderKind}>
      <div className="artifact-title">
        {outputItemIcon(item, 16)}
        <span>{item.title}</span>
        {item.subtitle ? <em>{item.subtitle}</em> : null}
        <code>{language}</code>
      </div>
      {renderOpenedOutputBody(item, renderKind, language, copy)}
    </div>
  );
}

function outputItemIcon(item: OutputPanelItem, size = 13): ReactNode {
  const kind = outputItemRenderKind(item);
  if (kind === "image") {
    return <ImageIcon size={size} />;
  }
  if (kind === "audio") {
    return <FileAudio2 size={size} />;
  }
  if (kind === "video") {
    return <FileVideo2 size={size} />;
  }
  if (kind === "html") {
    return <PanelsTopLeft size={size} />;
  }
  if (kind === "markdown") {
    return <FileText size={size} />;
  }
  if (kind === "data") {
    return <Braces size={size} />;
  }
  return <FileCode2 size={size} />;
}

type OpenedOutputRenderKind = "image" | "audio" | "video" | "html" | "markdown" | "data" | "code";

function outputItemRenderKind(item: OutputPanelItem): OpenedOutputRenderKind {
  const language = (item.language ?? languageFromTitle(item.title)).toLowerCase();
  const title = item.title.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(title) || ["png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "image"].includes(language)) {
    return "image";
  }
  if (/\.(mp3|wav|m4a|aac|ogg|flac)$/.test(title) || ["mp3", "wav", "m4a", "aac", "ogg", "flac", "audio"].includes(language)) {
    return "audio";
  }
  if (/\.(mp4|webm|mov|m4v)$/.test(title) || ["mp4", "webm", "mov", "m4v", "video"].includes(language)) {
    return "video";
  }
  if (title.endsWith(".html") || title.endsWith(".htm") || language === "html") {
    return "html";
  }
  if (title.endsWith(".md") || title.endsWith(".mdx") || language === "markdown" || language === "md") {
    return "markdown";
  }
  if (title.endsWith(".json") || language === "json" || language === "data") {
    return "data";
  }
  return "code";
}

function outputItemModalRenderer(item: OutputPanelItem): ConcreteArtifactRenderer {
  const kind = outputItemRenderKind(item);
  if (kind === "markdown") {
    return "markdown";
  }
  if (kind === "data") {
    return "data";
  }
  if (kind === "image" || kind === "audio" || kind === "video" || kind === "html") {
    return "preview";
  }
  return "code";
}

function renderOpenedOutputBody(item: OutputPanelItem, kind: OpenedOutputRenderKind, language: string, copy: OutputFrameCopy): ReactNode {
  const body = item.body ?? fallbackOpenedItemBody(item);
  if (kind === "image") {
    return <ImageOutputPreview item={item} />;
  }
  if (kind === "audio") {
    return <AudioOutputPreview item={item} />;
  }
  if (kind === "video") {
    return <VideoOutputPreview item={item} />;
  }
  if (kind === "html") {
    return <iframe className="html-output-preview" title={item.title} srcDoc={htmlOutputDocument(body, item.title)} />;
  }
  if (kind === "markdown") {
    return <div className="markdown-preview">{renderMarkdownPreview(body, copy)}</div>;
  }
  if (kind === "data") {
    return <pre data-language="json">{normalizeJsonPreview(body)}</pre>;
  }
  return <pre data-language={language}>{body}</pre>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Demo asset shown once the load→present interaction finishes in the canvas.
const DEMO_MEDIA_IMAGE = "/output-previews/product-projector.png";

function ImageOutputPreview({ item }: { item: OutputPanelItem }) {
  const isGeneratedImage = isGeneratedMediaItem(item, "image");
  const mediaStyle = mediaStyleFromItem(item, "image");
  const image = isGeneratedImage
    ? { src: DEMO_MEDIA_IMAGE, alt: item.title || "Generated image preview" }
    : outputPreviewImage(item);
  const ImageReveal =
    mediaStyle === "blur" ? ImageDotFlickerReveal :
    mediaStyle === "palette" ? ImageBlurFlowReveal :
    mediaStyle === "layers" ? ImagePixelGridReveal :
    ImageGenerationReveal;
  return (
    <div className="image-output-preview" data-media-kind="image" data-media-style={mediaStyle}>
      <ImageReveal imageSrc={image.src} alt={item.title || image.alt} size="canvas" />
    </div>
  );
}

function AudioOutputPreview({ item }: { item: OutputPanelItem }) {
  const mediaStyle = mediaStyleFromItem(item, "audio");
  return (
    <div className="audio-output-preview" data-media-kind="audio" data-media-style={mediaStyle}>
      <MediaLoadingReveal className="media-audio-output-reveal" loaderStyle={mediaStyle} size="canvas">
        <div className="media-player-card">
          <div className="media-player-cover" aria-hidden="true">
            <img src={DEMO_MEDIA_IMAGE} alt="" />
            <span className="media-player-cover-icon"><Volume2 size={22} /></span>
          </div>
          <div className="media-player-body">
            <div className="media-player-meta">
              <strong>{item.title}</strong>
              <span>Audio preview</span>
            </div>
            <div className="media-player-controls" aria-hidden="true">
              <span className="media-player-play"><Play size={13} fill="currentColor" /></span>
              <span className="media-player-progress"><i /></span>
              <span className="media-player-time">0:18</span>
            </div>
          </div>
        </div>
      </MediaLoadingReveal>
    </div>
  );
}

function VideoOutputPreview({ item }: { item: OutputPanelItem }) {
  const mediaStyle = mediaStyleFromItem(item, "video");
  return (
    <div className="video-output-preview" data-media-kind="video" data-media-style={mediaStyle}>
      <MediaLoadingReveal className="media-video-output-reveal" loaderStyle={mediaStyle} size="canvas">
        <div className="media-player-video">
          <img src={DEMO_MEDIA_IMAGE} alt={item.title || "Video preview"} />
          <span className="media-player-video-play" aria-hidden="true"><Play size={26} fill="currentColor" /></span>
          <span className="media-player-video-bar" aria-hidden="true"><i /></span>
        </div>
        <div className="media-player-meta media-player-meta-video">
          <strong>{item.title}</strong>
          <span>Video preview</span>
        </div>
      </MediaLoadingReveal>
    </div>
  );
}

function isGeneratedMediaItem(item: OutputPanelItem, kind: "image" | "audio" | "video"): boolean {
  return (item.body ?? "").toLowerCase().includes(`media-generation:${kind}`);
}

function mediaStyleFromItem(item: OutputPanelItem, kind: "image" | "audio" | "video"): string {
  if (item.mediaStyle) {
    return item.mediaStyle;
  }
  if (kind === "image") return "grid";
  if (kind === "audio") return "waveform";
  return "storyboard";
}

const outputPreviewImages = [
  { src: "/output-previews/product-projector.png", alt: "Product projector preview" },
  { src: "/output-previews/aurora.png", alt: "Aurora preview" },
  { src: "/output-previews/lens.png", alt: "Lens preview" },
];

function outputPreviewImage(item: OutputPanelItem) {
  if (item.imageSrc) {
    return { src: item.imageSrc, alt: item.title || "Uploaded image preview" };
  }
  const key = `${item.id}:${item.title}`.toLowerCase();
  if (/\.(?:test|spec)\./.test(key)) {
    return outputPreviewImages[0];
  }
  if (/\.types?\./.test(key)) {
    return outputPreviewImages[2];
  }
  if (/aurora|chart|wide|landscape|banner/.test(key)) {
    return outputPreviewImages[1];
  }
  if (/lens|camera|photo|portrait/.test(key)) {
    return outputPreviewImages[2];
  }
  const index = Math.abs(hashString(key)) % outputPreviewImages.length;
  return outputPreviewImages[index];
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return hash;
}

function htmlOutputDocument(body: string, title: string): string {
  if (/<html|<body|<!doctype/i.test(body)) {
    return body;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font:14px system-ui;background:#f8fafc;color:#172033}.page{padding:24px}.card{border:1px solid #d8dde8;border-radius:14px;background:white;padding:18px;box-shadow:0 8px 26px rgba(20,30,45,.08)}button{border:0;border-radius:10px;background:#111e36;color:white;padding:10px 14px}</style></head><body><main class="page"><section class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(firstMeaningfulLine(body))}</p><button>Preview action</button></section></main></body></html>`;
}

function normalizeJsonPreview(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function fallbackOpenedItemBody(item: OutputPanelItem): string {
  if (item.kind === "review") {
    return `+ Review ready for ${item.title}\n- No issues selected yet`;
  }
  return `// ${item.title}\n// File preview is ready.`;
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

function outputTitle(source: OutputSource, renderer: ConcreteArtifactRenderer, copy: OutputFrameCopy): string {
  if (source === "console") {
    return copy.titleConsole;
  }
  return `${copy.titleArtifactPrefix}${rendererLabel(renderer, copy)}`;
}

function outputSubtitle(
  project: AgentFrontendProject,
  artifact: AgentUXArtifactTimelineItem | undefined,
  renderer: ConcreteArtifactRenderer,
  copy: OutputFrameCopy,
): string {
  if (project.output.source !== "artifact") {
    return `${project.output.surface}${copy.subtitleSurfaceSuffix}`;
  }
  const label = rendererLabel(renderer, copy);
  const rendererText = project.output.artifactRenderer === "auto" ? `${copy.subtitleAutoArrow}${label}` : label;
  return artifact ? `${artifactStatusLabel(artifact.status, copy)} · ${rendererText}` : `${copy.subtitleArtifactPreview} · ${rendererText}`;
}

function rendererLabel(renderer: ConcreteArtifactRenderer, copy: OutputFrameCopy): string {
  return copy.rendererLabels[renderer];
}

function artifactStatusLabel(status: string | undefined, copy: OutputFrameCopy): string {
  if (!status) {
    return "";
  }
  return status in copy.statusLabels ? copy.statusLabels[status as keyof OutputFrameCopy["statusLabels"]] : status;
}

function artifactDiffPreview(artifact: AgentUXArtifactTimelineItem, copy: OutputFrameCopy): string {
  return `--- ${artifact.title ?? artifact.id}\n+++ ${artifact.title ?? artifact.id}\n+ ${artifact.content ?? "artifact content"}\n- ${copy.previousImplementation}`;
}

function artifactText(artifact: AgentUXArtifactTimelineItem, copy: OutputFrameCopy): string {
  if (artifact.content) {
    return artifact.content;
  }
  if (artifact.data) {
    return JSON.stringify(artifact.data, null, 2);
  }
  return copy.artifactMetadataEmpty;
}

function artifactDataPreview(artifact: AgentUXArtifactTimelineItem): string {
  const metadata = {
    id: artifact.id,
    kind: artifact.artifactKind,
    title: artifact.title,
    status: artifact.status,
    mimeType: artifactMimeType(artifact),
    data: artifact.data ?? artifact.content ?? null,
  };

  return JSON.stringify(metadata, null, 2);
}

function artifactCodePreview(artifact: AgentUXArtifactTimelineItem, copy: OutputFrameCopy): { code: string; lang: string } {
  const text = artifactText(artifact, copy);
  const fenced = text.match(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/);
  const lang = normalizeLanguage(fenced?.[1] ?? languageFromTitle(artifact.title ?? artifact.id));
  return {
    code: (fenced?.[2] ?? text).trim(),
    lang,
  };
}

function renderMarkdownPreview(markdown: string, copy: OutputFrameCopy): ReactNode[] {
  const nodes: ReactNode[] = [];
  const lines = markdown.split(/\r?\n/);
  let inFence = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !line.trim()) {
      continue;
    }
    if (line.startsWith("# ")) {
      nodes.push(<h4 key={nodes.length}>{line.slice(2).trim()}</h4>);
      continue;
    }
    if (line.startsWith("- ")) {
      nodes.push(<li key={nodes.length}>{line.slice(2).trim()}</li>);
      continue;
    }
    nodes.push(<p key={nodes.length}>{line.trim()}</p>);
  }

  return nodes.length > 0 ? nodes : [<p key="empty">{copy.noMarkdownPreviewContent}</p>];
}

function resolveArtifactRenderer(
  artifact: AgentUXArtifactTimelineItem | undefined,
  configuredRenderer: ArtifactRenderer,
): ConcreteArtifactRenderer {
  if (configuredRenderer !== "auto") {
    return configuredRenderer;
  }
  if (!artifact) {
    return "data";
  }

  const title = (artifact.title ?? artifact.id).toLowerCase();
  const mimeType = artifactMimeType(artifact).toLowerCase();
  const kind = String(artifact.artifactKind ?? "").toLowerCase();
  const text = artifact.content ?? "";

  if (kind.includes("diff") || mimeType.includes("patch") || text.startsWith("--- ")) {
    return "diff";
  }
  if (mimeType.includes("markdown") || title.endsWith(".md") || text.startsWith("# ")) {
    return "markdown";
  }
  if (mimeType.startsWith("image/") || mimeType.startsWith("audio/") || mimeType.startsWith("video/") || /\.(png|jpe?g|gif|webp|avif|svg|mp3|wav|m4a|aac|ogg|flac|mp4|webm|mov|m4v)$/.test(title)) {
    return "preview";
  }
  if (kind.includes("ui") || kind.includes("html") || mimeType.includes("html")) {
    return "preview";
  }
  if (artifact.data && !artifact.content) {
    return "data";
  }
  if (kind.includes("code") || /\.(tsx?|jsx?|css|json|yaml|yml|py|go|rs)$/.test(title)) {
    return "code";
  }
  return "data";
}

function artifactMimeType(artifact: AgentUXArtifactTimelineItem): string {
  return (artifact as AgentUXArtifactTimelineItem & { mimeType?: string }).mimeType ?? "";
}

function outputPanelItemFromRenderedArtifact(artifact: AgentUXArtifactTimelineItem, project: AgentFrontendProject): OutputPanelItem {
  const originalTitle = artifact.title ?? artifact.id;
  const title = originalTitle.split("/").filter(Boolean).pop() ?? originalTitle;
  const renderKind = outputItemRenderKind({
    id: `artifact:${artifact.id}`,
    kind: "file",
    title,
    language: languageFromFileName(title),
  });
  return {
    id: `artifact:${artifact.id}`,
    kind: "file",
    title,
    subtitle: originalTitle,
    language: languageFromFileName(title),
    body: artifact.content ?? (artifact.data ? JSON.stringify(artifact.data, null, 2) : undefined),
    mediaStyle:
      renderKind === "image"
        ? project.mediaGeneration.imageStyle
        : renderKind === "audio"
          ? project.mediaGeneration.audioStyle
          : renderKind === "video"
            ? project.mediaGeneration.videoStyle
            : undefined,
  };
}

function firstMeaningfulLine(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, "").replace(/^-\s*/, "").trim())
    .find(Boolean) ?? "Preview content is ready.";
}

function languageFromTitle(title: string): string {
  const ext = title.split(".").pop()?.toLowerCase();
  if (ext === "ts" || ext === "tsx") {
    return "typescript";
  }
  if (ext === "js" || ext === "jsx") {
    return "javascript";
  }
  return ext || "text";
}

function normalizeLanguage(lang: string): string {
  if (lang === "ts" || lang === "tsx") {
    return "typescript";
  }
  if (lang === "js" || lang === "jsx") {
    return "javascript";
  }
  return lang || "text";
}
