import type { AgentUXArtifactTimelineItem, AgentUXTimelineItem, AgentUXToolTimelineItem, AgentUXViewModel } from "@agent-ux/render-core";
import { ChevronDown, Copy, Globe2, Pencil, Play, RotateCcw, Sparkles, User, Volume2 } from "lucide-react";
import { useState, type CSSProperties, type ReactElement } from "react";

import { StateIcon, errorDomainSlot, incidentSlot, runtimeOpSlot, useIconSet, type IconSlot } from "../../agentmatrix";
import { useCopy } from "../../i18n/LocaleContext";
import type { UiCopy } from "../../i18n/uiCopy";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";
import { IconTooltip } from "../common/IconTooltip";
import { ImageBlurFlowReveal, ImageDotFlickerReveal, ImageGenerationReveal, ImagePixelGridReveal, MediaLoadingReveal } from "./ImageGeneration";
import type { OutputPanelOpenRequest } from "./OutputFrame";
import { ReasoningBlock } from "./ReasoningBlock";
import { ToolCallCard, type ApprovalDecision } from "./ToolCallCard";
import { WritingText } from "./WritingText";

const GENERATED_IMAGE_PREVIEW_SRC = "/output-previews/product-projector.png";

export function ChatFrame({
  project,
  viewModel,
  showDebugBadges = false,
  previewPrompt = "Add validation to the search input and show a loading state while results are fetched.",
  previewPrompts,
  writingReplayKey = 0,
  onOpenArtifact,
  // Defaults to the placement the editor previews. It used to default to "timeline", which
  // only the editor was safe from because `App.tsx` passes "overlay" explicitly: the exported
  // app never set the prop, so a real run there put the permission card *inside* the
  // transcript, where it scrolls away from the field the user answers it with. Nothing asks
  // for the timeline placement, so the fallback is now the correct one and it stays opt-in.
  externalApprovalPlacement = "overlay",
  forceToolsOpen = false,
  toolCollapseSignal = 0,
  onApprovalDecision,
}: {
  project: AgentFrontendProject;
  viewModel: AgentUXViewModel;
  showDebugBadges?: boolean;
  previewPrompt?: string;
  previewPrompts?: readonly string[];
  writingReplayKey?: number;
  onOpenArtifact?: (artifact: OutputPanelOpenRequest) => void;
  externalApprovalPlacement?: "timeline" | "overlay";
  forceToolsOpen?: boolean;
  toolCollapseSignal?: number;
  onApprovalDecision?: (toolCallId: string, decision: ApprovalDecision) => void | Promise<void>;
}) {
  const copy = useCopy();
  const promptHistory = previewPrompts?.filter((prompt) => prompt.trim().length > 0);

  return (
    <section
      className="chat-frame"
      data-preview-anchor="chat"
      data-reasoning-motion={project.theme.motion.reasoning}
      data-tool-style={project.theme.motion.toolCall}
      data-writing-motion={project.theme.motion.writing}
    >
      <header className="frame-header">
        <div>
          <h2>{copy.chat.frame.title}</h2>
          <p>{viewModel.title ?? copy.chat.frame.fallbackConversationTitle} · {copy.chat.frame.subtitleSuffix}</p>
        </div>
      </header>
      <div className="timeline-list">
        {viewModel.timeline.length === 0 ? (
          <ConversationEmptyState project={project} />
        ) : (
          renderConversation(
            buildConversationEntries(viewModel.timeline, promptHistory, previewPrompt),
            project,
            showDebugBadges,
            writingReplayKey,
            onOpenArtifact,
            externalApprovalPlacement,
            forceToolsOpen,
            toolCollapseSignal,
            onApprovalDecision,
          )
        )}
      </div>
    </section>
  );
}

type ConversationEntry =
  | { kind: "user"; id: string; prompt: string }
  | { kind: "item"; item: AgentUXTimelineItem };

/**
 * Flatten the timeline into an ordered list of user prompts and assistant-side
 * items. When prompt history is available each assistant message is preceded by
 * the prompt that produced it; otherwise the single preview prompt opens the run.
 */
function buildConversationEntries(
  timeline: readonly AgentUXTimelineItem[],
  promptHistory: readonly string[] | undefined,
  previewPrompt: string,
): ConversationEntry[] {
  const entries: ConversationEntry[] = [];

  if (promptHistory?.length) {
    let assistantMessageIndex = 0;
    for (const item of timeline) {
      if (item.kind === "message" && item.role === "assistant") {
        const prompt = promptHistory[assistantMessageIndex];
        assistantMessageIndex += 1;
        if (prompt) {
          entries.push({ kind: "user", id: `prompt:${item.id}`, prompt });
        }
      }
      entries.push({ kind: "item", item });
    }
    return entries;
  }

  if (previewPrompt.trim()) {
    entries.push({ kind: "user", id: "preview-prompt", prompt: previewPrompt });
  }
  for (const item of timeline) {
    entries.push({ kind: "item", item });
  }
  return entries;
}

/**
 * Group consecutive assistant-side items into a single turn that shares one
 * avatar lane. A user message breaks the current turn and renders as its own row.
 */
function renderConversation(
  entries: ConversationEntry[],
  project: AgentFrontendProject,
  showDebugBadges: boolean,
  writingReplayKey: number,
  onOpenArtifact: ((artifact: OutputPanelOpenRequest) => void) | undefined,
  externalApprovalPlacement: "timeline" | "overlay",
  forceToolsOpen: boolean,
  toolCollapseSignal: number,
  onApprovalDecision: ((toolCallId: string, decision: ApprovalDecision) => void | Promise<void>) | undefined,
): ReactElement[] {
  const rows: ReactElement[] = [];
  let lane: AgentUXTimelineItem[] = [];
  let turnIndex = 0;

  const flushLane = () => {
    if (lane.length === 0) {
      return;
    }
    const laneItems = lane;
    lane = [];
    rows.push(
      <AssistantTurn
        key={`turn:${turnIndex}`}
        project={project}
        items={laneItems}
        showDebugBadges={showDebugBadges}
        writingReplayKey={writingReplayKey}
        onOpenArtifact={onOpenArtifact}
        externalApprovalPlacement={externalApprovalPlacement}
        forceToolsOpen={forceToolsOpen}
        toolCollapseSignal={toolCollapseSignal}
        onApprovalDecision={onApprovalDecision}
      />,
    );
    turnIndex += 1;
  };

  for (const entry of entries) {
    if (entry.kind === "user") {
      flushLane();
      rows.push(<UserPromptBubble key={entry.id} project={project} prompt={entry.prompt} />);
      continue;
    }
    if (entry.item.kind === "message" && entry.item.role === "user") {
      flushLane();
      rows.push(<UserPromptBubble key={`msg:${entry.item.id}`} project={project} prompt={entry.item.text || ""} />);
      continue;
    }
    lane.push(entry.item);
  }
  flushLane();

  return rows;
}

function AssistantTurn({
  project,
  items,
  showDebugBadges,
  writingReplayKey,
  onOpenArtifact,
  externalApprovalPlacement,
  forceToolsOpen,
  toolCollapseSignal,
  onApprovalDecision,
}: {
  project: AgentFrontendProject;
  items: readonly AgentUXTimelineItem[];
  showDebugBadges: boolean;
  writingReplayKey: number;
  onOpenArtifact?: (artifact: OutputPanelOpenRequest) => void;
  externalApprovalPlacement: "timeline" | "overlay";
  forceToolsOpen: boolean;
  toolCollapseSignal: number;
  onApprovalDecision?: (toolCallId: string, decision: ApprovalDecision) => void | Promise<void>;
}) {
  const copy = useCopy();
  const orderedItems = displayOrderForAssistantTurn(items);
  const isSingleLineAssistantMessage =
    !project.conversation.speakerLabels
    && orderedItems.length === 1
    && orderedItems[0]?.kind === "message"
    && orderedItems[0].role === "assistant"
    && !orderedItems[0].text?.includes("\n");

  return (
    <div className="assistant-turn" data-single-line-message={isSingleLineAssistantMessage ? "true" : undefined}>
      {project.conversation.agentAvatar ? (
        <span className="msg-avatar" data-role="assistant" aria-hidden="true"><StateIcon slot="author.agent" size={15} /></span>
      ) : null}
      <div className="assistant-lane">
        {project.conversation.speakerLabels ? (
          <div className="assistant-turn-label" aria-label={copy.chat.speakers.agentOutputLabel}>{copy.chat.speakers.agent}</div>
        ) : null}
        {orderedItems.map((item) => (
          <TimelineItem
            key={`${item.kind}:${item.id}`}
            item={item}
            project={project}
            showDebugBadges={showDebugBadges}
            writingReplayKey={writingReplayKey}
            onOpenArtifact={onOpenArtifact}
            externalApprovalPlacement={externalApprovalPlacement}
            forceToolsOpen={forceToolsOpen}
            toolCollapseSignal={toolCollapseSignal}
            onApprovalDecision={onApprovalDecision}
          />
        ))}
      </div>
    </div>
  );
}

function displayOrderForAssistantTurn(items: readonly AgentUXTimelineItem[]): AgentUXTimelineItem[] {
  const ordered: AgentUXTimelineItem[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const current = items[index];
    const next = items[index + 1];
    if (current?.kind === "artifact" && next?.kind === "message" && next.role === "assistant") {
      ordered.push(next, current);
      index += 1;
      continue;
    }
    ordered.push(current);
  }
  return ordered;
}

function UserPromptBubble({ project, prompt }: { project: AgentFrontendProject; prompt: string }) {
  const copy = useCopy();
  return (
    <article className="message-item message-bubble" data-role="user" data-preview-anchor="conversation">
      {project.conversation.userAvatar ? (
        <span className="msg-avatar" data-role="user" aria-hidden="true"><StateIcon slot="author.user" size={16} /></span>
      ) : null}
      <div className="msg-stack">
        {project.conversation.speakerLabels ? <div className="message-role">{copy.chat.speakers.user}</div> : null}
        <div className="msg-surface"><p>{prompt}</p></div>
        <MessageActions project={project} role="user" />
      </div>
    </article>
  );
}

function TimelineItem({
  item,
  project,
  showDebugBadges,
  writingReplayKey,
  onOpenArtifact,
  externalApprovalPlacement,
  forceToolsOpen,
  toolCollapseSignal,
  onApprovalDecision,
}: {
  item: AgentUXTimelineItem;
  project: AgentFrontendProject;
  showDebugBadges: boolean;
  writingReplayKey: number;
  onOpenArtifact?: (artifact: OutputPanelOpenRequest) => void;
  externalApprovalPlacement: "timeline" | "overlay";
  forceToolsOpen: boolean;
  toolCollapseSignal: number;
  onApprovalDecision?: (toolCallId: string, decision: ApprovalDecision) => void | Promise<void>;
}) {
  const copy = useCopy();
  const { iconSet } = useIconSet();
  switch (item.kind) {
    case "message": {
      const isAssistant = item.role === "assistant";
      const text = item.text || copy.chat.message.streaming;
      return (
        <article className="message-bubble lane-message" data-role={item.role}>
          {project.conversation.speakerLabels ? <div className="message-role">{messageRoleLabel(item.role, copy)}</div> : null}
          <div className="msg-surface">
            {isAssistant ? <WritingText project={project} text={text} replayKey={writingReplayKey} /> : <p>{text}</p>}
          </div>
          <MessageActions project={project} role={isAssistant ? "assistant" : "user"} />
        </article>
      );
    }
    case "reasoning":
      return <ReasoningBlock project={project} reasoning={item} showDebugBadges={showDebugBadges} />;
    case "tool":
      if (isMediaGenerationTool(item)) {
        return null;
      }
      return (
        <>
          {project.toolCalls.approval === "hidden" && externalApprovalPlacement === "timeline" && isPendingApprovalTool(item) ? (
            <ExternalApprovalSurface
              tool={item}
              onConfirm={(decision) => onApprovalDecision?.(item.id, decision)}
            />
          ) : null}
          <ToolCallCard
            project={project}
            tool={item}
            showDebugBadges={showDebugBadges}
            onOpenArtifact={onOpenArtifact}
            forceOpen={forceToolsOpen}
            collapseSignal={toolCollapseSignal}
          />
        </>
      );
    case "artifact":
      return <ArtifactLaunchCard project={project} item={item} copy={copy} onOpenArtifact={onOpenArtifact} />;
    case "step": {
      const kind = item.stepKind ?? item.scope?.kind ?? "runtime";
      const spin = item.status === "running" || item.status === "started";
      return (
        <article className="step-item" data-status={item.status}>
          <span className="step-icon" data-anim={spin ? "spin" : "none"}>
            <StateIcon slot={stepIconSlot(kind, item.status)} size={14} />
          </span>
          <span className="step-kind">{kind}</span>
          <strong>{item.label}</strong>
          {item.summary ? <p>{item.summary}</p> : null}
        </article>
      );
    }
    case "error": {
      // Incident states (retrying / exhausted / terminal) show a readable,
      // state-matching title instead of the raw error code.
      const incidentTitle =
        item.category === "retrying"
          ? copy.chat.error.incident.retrying
          : item.category === "exhausted"
            ? copy.chat.error.incident.exhausted
            : item.category === "terminal"
              ? copy.chat.error.incident.terminal
              : item.code;
      return (
        <article className="error-item" data-collapse={project.blocks.errorCollapse} data-preview-anchor="error-block">
          <span className="error-icon" data-anim={errorIconAnimation(item.category, item.retryable, iconSet["incident.retrying"])}>
            <StateIcon slot={errorIconSlot(item.category, item.code)} size={15} />
          </span>
          <strong>{incidentTitle}</strong>
          <p>{project.blocks.errorCollapse ? item.userMessage ?? item.message : item.developerMessage ?? item.message}</p>
          {project.blocks.errorCollapse ? <small>{copy.chat.error.debugHidden}</small> : null}
        </article>
      );
    }
  }
}

function sessionStatusSlot(status: string): IconSlot {
  if (status === "running") return "session.running";
  if (status === "error") return "session.terminated";
  if (status === "awaiting_input") return "session.requires_action";
  return "session.idle";
}

function errorIconSlot(category: string | undefined, code: string): IconSlot {
  if (category === "retrying" || category === "exhausted" || category === "terminal") {
    return incidentSlot(category);
  }
  return errorDomainSlot(code);
}

function errorIconAnimation(category: string | undefined, retryable: boolean | undefined, retryingIconId: string | undefined) {
  if (category === "retrying") {
    if (retryingIconId === "timer") return "timer-hand";
    if (retryingIconId === "rotate") return "retry-rotate";
    if (retryingIconId === "hourglass") return "hourglass";
  }
  return retryable ? "spin" : "none";
}

function stepIconSlot(kind: string, status: string): IconSlot {
  if (kind === "model") return "surface.model_span";
  if (kind === "config") return "surface.config";
  if (kind === "session") return "surface.interrupt";
  return runtimeOpSlot(status);
}

function messageRoleLabel(role: string, copy: UiCopy): string {
  if (role === "assistant") {
    return copy.chat.speakers.agent;
  }
  if (role === "user") {
    return copy.chat.speakers.user;
  }
  return role;
}

type ArtifactMediaKind = "image" | "audio" | "video";

function ArtifactLaunchCard({
  project,
  item,
  copy,
  onOpenArtifact,
}: {
  project: AgentFrontendProject;
  item: AgentUXArtifactTimelineItem;
  copy: UiCopy;
  onOpenArtifact?: (artifact: OutputPanelOpenRequest) => void;
}) {
  const mediaKind = artifactMediaKind(item);
  const mediaStyle = mediaKind ? mediaGenerationStyle(project, mediaKind) : undefined;
  const launchTitle = artifactLaunchTitle(item);
  if (
    mediaKind === "image" &&
    ((mediaStyle ?? "grid") === "grid" || mediaStyle === "blur" || mediaStyle === "palette" || mediaStyle === "layers")
  ) {
    const ImageReveal =
      mediaStyle === "blur" ? ImageDotFlickerReveal :
      mediaStyle === "palette" ? ImageBlurFlowReveal :
      mediaStyle === "layers" ? ImagePixelGridReveal :
      ImageGenerationReveal;
    return (
      <article
        className="artifact-inline generated-image-inline"
        data-status={item.status}
        data-media-kind={mediaKind}
        data-media-style={mediaStyle}
      >
        <button
          type="button"
          className="generated-image-inline-button"
          aria-label={launchTitle}
          onClick={() => onOpenArtifact?.(artifactLaunchOpenRequest(item, copy, project))}
        >
          <ImageReveal imageSrc={GENERATED_IMAGE_PREVIEW_SRC} alt={launchTitle} size="inline" />
        </button>
      </article>
    );
  }
  if (mediaKind === "audio" || mediaKind === "video") {
    return (
      <article
        className={`artifact-inline generated-media-inline generated-${mediaKind}-inline`}
        data-status={item.status}
        data-media-kind={mediaKind}
        data-media-style={mediaStyle}
      >
        <button
          type="button"
          className="generated-media-inline-button"
          aria-label={launchTitle}
          onClick={() => onOpenArtifact?.(artifactLaunchOpenRequest(item, copy, project))}
        >
          <MediaLoadingReveal
            className={mediaKind === "audio" ? "media-audio-inline-reveal" : "media-video-inline-reveal"}
            loaderStyle={mediaStyle}
            size="inline"
          >
            {mediaKind === "audio" ? (
              <AudioPlaybackDemo title={launchTitle} />
            ) : (
              <VideoPlaybackDemo title={launchTitle} />
            )}
          </MediaLoadingReveal>
        </button>
      </article>
    );
  }
  return (
    <article
      className={`artifact-inline artifact-launch-card${mediaKind ? " media-generation-inline" : ""}`}
      data-status={item.status}
      data-media-kind={mediaKind ?? "website"}
      data-media-style={mediaStyle}
    >
      {mediaKind ? (
        <MediaGenerationInlinePreview kind={mediaKind} style={mediaStyle ?? "grid"} />
      ) : (
        <span className="artifact-inline-icon" aria-hidden="true">
          <Globe2 size={24} />
        </span>
      )}
      <span className="artifact-inline-body">
        <strong>{launchTitle}</strong>
        <span className="artifact-launch-kind">{artifactLaunchKind(item, copy)}</span>
      </span>
      <span className="artifact-launch-actions">
        <button
          type="button"
          className="artifact-action-open"
          onClick={() => onOpenArtifact?.(artifactLaunchOpenRequest(item, copy, project))}
        >
          <span>{copy.chat.artifactLaunch.openWith}</span>
          <ChevronDown size={20} aria-hidden="true" />
        </button>
      </span>
    </article>
  );
}

function AudioPlaybackDemo({ title }: { title: string }) {
  return (
    <span className="media-player-card media-player-card-inline" data-demo-kind="audio">
      <span className="media-player-cover" aria-hidden="true">
        <img src={GENERATED_IMAGE_PREVIEW_SRC} alt="" />
        <span className="media-player-cover-icon"><Volume2 size={18} /></span>
      </span>
      <span className="media-player-body">
        <span className="media-player-meta">
          <strong>{title}</strong>
          <span>Audio demo</span>
        </span>
        <span className="media-player-controls" aria-hidden="true">
          <span className="media-player-play"><Play size={12} fill="currentColor" /></span>
          <span className="media-player-progress"><i /></span>
          <span className="media-player-time">0:18</span>
        </span>
      </span>
    </span>
  );
}

function VideoPlaybackDemo({ title }: { title: string }) {
  return (
    <span className="media-player-demo">
      <span className="media-player-video">
        <img src={GENERATED_IMAGE_PREVIEW_SRC} alt={title || "Video demo"} />
        <span className="media-player-video-play" aria-hidden="true"><Play size={24} fill="currentColor" /></span>
        <span className="media-player-video-bar" aria-hidden="true"><i /></span>
      </span>
      <span className="media-player-meta media-player-meta-video">
        <strong>{title}</strong>
        <span>Video demo</span>
      </span>
    </span>
  );
}

function MediaGenerationInlinePreview({ kind, style }: { kind: ArtifactMediaKind; style: string }) {
  if (kind === "audio") {
    return (
      <span className="media-generation-preview" data-media-kind="audio" data-media-style={style} aria-hidden="true">
        <span className="media-generation-audio-icon"><Volume2 size={18} /></span>
        <MiniWaveform bars={12} />
        <span className="media-generation-transcript">
          <i />
          <i />
        </span>
      </span>
    );
  }
  if (kind === "video") {
    return (
      <span className="media-generation-preview" data-media-kind="video" data-media-style={style} aria-hidden="true">
        <span className="media-generation-play"><Play size={18} fill="currentColor" /></span>
        <span className="media-generation-video-strip">
          {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
        </span>
      </span>
    );
  }
  return (
    <span className="media-generation-preview" data-media-kind="image" data-media-style={style} aria-hidden="true">
      <span className="media-generation-image-grid">
        {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
      </span>
      <span className="media-generation-layer-stack">
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}

function MiniWaveform({ bars }: { bars: number }) {
  return (
    <span className="mini-waveform">
      {Array.from({ length: bars }, (_, index) => (
        <span key={index} style={{ "--bar-index": index, "--bar-height": `${36 + ((index * 19) % 52)}%` } as CSSProperties} />
      ))}
    </span>
  );
}

/**
 * What the artifact actually is, rather than what the demo used to show.
 *
 * Both this and `artifactLaunchOpenRequest` used to hardcode "Agent Component Composer" and a
 * canned HTML snippet for anything that was not an image, audio or video — so a real run that
 * wrote a 10KB HTML deck displayed a fixture page instead of the file, and a `SearchInput.tsx`
 * was labelled a website. The real title and the real content are what the file is.
 */
function artifactLaunchTitle(item: AgentUXArtifactTimelineItem): string {
  const title = item.title ?? item.id;
  // Basenamed, as the media branch already does: a path is not a name.
  return title.split("/").filter(Boolean).pop() ?? title;
}

function artifactIsWebsite(item: AgentUXArtifactTimelineItem): boolean {
  const title = (item.title ?? item.id).toLowerCase();
  const mimeType = String((item as AgentUXArtifactTimelineItem & { mimeType?: string }).mimeType ?? "").toLowerCase();
  return /\.(html?|xhtml)$/.test(title) || mimeType.includes("html");
}

function artifactLaunchKind(item: AgentUXArtifactTimelineItem, copy: UiCopy): string {
  const kind = artifactMediaKind(item);
  if (kind === "image") return copy.chat.artifactLaunch.kindImage;
  if (kind === "audio") return copy.chat.artifactLaunch.kindAudio;
  if (kind === "video") return copy.chat.artifactLaunch.kindVideo;
  // Only an actual page is a website. Calling every other artifact one is how a `.tsx` file
  // ended up labelled 网站.
  return artifactIsWebsite(item) ? copy.chat.artifactLaunch.kindWebsite : copy.chat.artifactLaunch.kindFile;
}

function artifactLaunchOpenRequest(item: AgentUXArtifactTimelineItem, copy: UiCopy, project: AgentFrontendProject): OutputPanelOpenRequest {
  const originalTitle = item.title ?? item.id;
  const mediaKind = artifactMediaKind(item);
  if (mediaKind) {
    const title = originalTitle.split("/").filter(Boolean).pop() ?? originalTitle;
    return {
      id: `file:${originalTitle}`,
      kind: "file",
      title,
      subtitle: originalTitle,
      language: mediaKind,
      body: item.content ?? undefined,
      mediaStyle: mediaGenerationStyle(project, mediaKind),
    };
  }
  const website = artifactIsWebsite(item);
  return {
    id: `${website ? "website" : "file"}:${originalTitle}`,
    kind: "file",
    title: artifactLaunchTitle(item),
    subtitle: originalTitle,
    // Let the output panel decide by extension when the artifact does not say; forcing "html"
    // made every artifact render through the HTML preview path.
    language: website ? "html" : undefined,
    // The real content. Falling back to the demo page here is what hid a real deck behind a
    // fixture; with no content the panel shows its own empty state, which is the truth.
    body: item.content ?? undefined,
  };
}

function artifactMediaKind(item: AgentUXArtifactTimelineItem): ArtifactMediaKind | undefined {
  const title = (item.title ?? item.id).toLowerCase();
  const mimeType = String((item as AgentUXArtifactTimelineItem & { mimeType?: string }).mimeType ?? "").toLowerCase();
  const kind = String(item.artifactKind ?? "").toLowerCase();
  if (kind.includes("image") || mimeType.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|svg)$/.test(title)) {
    return "image";
  }
  if (kind.includes("audio") || mimeType.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac)$/.test(title)) {
    return "audio";
  }
  if (kind.includes("video") || mimeType.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/.test(title)) {
    return "video";
  }
  return undefined;
}

function mediaGenerationStyle(project: AgentFrontendProject, kind: ArtifactMediaKind): string {
  if (kind === "image") return project.mediaGeneration.imageStyle;
  if (kind === "audio") return project.mediaGeneration.audioStyle;
  return project.mediaGeneration.videoStyle;
}

function isMediaGenerationTool(item: AgentUXToolTimelineItem): boolean {
  return item.name.startsWith("preview.generate_");
}

function runStatusLabel(status: string | undefined, copy: UiCopy): string {
  if (!status) {
    return "";
  }
  const normalized = status === "awaiting_input" ? "awaitingInput" : status;
  return normalized in copy.chat.status
    ? copy.chat.status[normalized as keyof UiCopy["chat"]["status"]]
    : status;
}

function isPendingApprovalTool(item: AgentUXToolTimelineItem): item is AgentUXToolTimelineItem {
  return item.status === "awaiting_approval" && Boolean(item.approval);
}

export type InlineApprovalPromptOption = {
  id: string;
  title: string;
  body?: string;
  answerPlaceholder?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
};

export function InlineApprovalPrompt({
  ariaLabel,
  kicker,
  question,
  options,
  hint,
  secondaryLabel,
  primaryLabel,
  pending = false,
  approvalSurface,
  onSecondary,
  onPrimary,
}: {
  ariaLabel: string;
  kicker: string;
  question: string;
  options: readonly InlineApprovalPromptOption[];
  hint: string;
  secondaryLabel: string;
  primaryLabel: string;
  pending?: boolean;
  approvalSurface?: "inline";
  onSecondary?: () => void;
  onPrimary?: () => void;
}) {
  const [answer, setAnswer] = useState("");

  return (
    <aside
      className="inline-approval-panel"
      data-approval-surface={approvalSurface}
      data-preview-anchor="external-approval"
      aria-label={ariaLabel}
      aria-busy={pending}
    >
      <div className="inline-approval-head">
        <div>
          <span>{kicker}</span>
          <strong>{question}</strong>
        </div>
      </div>

      <ol className="inline-approval-options">
        {options.map((option, index) => (
          <li
            key={option.id}
            data-placeholder={option.answerPlaceholder ? "true" : undefined}
            data-interactive={option.onSelect ? "true" : undefined}
          >
            <span className="inline-approval-option-index">{index + 1}.</span>
            {option.answerPlaceholder ? (
              <input
                className="inline-approval-answer"
                type="text"
                value={answer}
                placeholder={option.title}
                aria-label={option.title}
                onChange={(event) => setAnswer(event.target.value)}
              />
            ) : option.onSelect ? (
              <button
                type="button"
                className="inline-approval-option-button"
                data-approval-action={option.id}
                disabled={pending || option.disabled}
                onClick={option.onSelect}
              >
                <strong>{option.title}</strong>
                {option.body ? <span>{option.body}</span> : null}
              </button>
            ) : (
              <div>
                <strong>{option.title}</strong>
                {option.body ? <span>{option.body}</span> : null}
              </div>
            )}
          </li>
        ))}
      </ol>

      <footer className="inline-approval-footer">
        <span>
          <span className="inline-approval-info" aria-hidden="true">i</span>
          {hint}
        </span>
        <div>
          <button
            type="button"
            className="inline-approval-secondary"
            disabled={pending}
            onClick={onSecondary}
          >
            {secondaryLabel}
          </button>
          <button
            type="button"
            className="inline-approval-primary"
            disabled={pending}
            onClick={onPrimary}
          >
            {primaryLabel}
          </button>
        </div>
      </footer>
    </aside>
  );
}

export function InlineApprovalSurface({
  tool,
  onConfirm,
}: {
  tool: AgentUXToolTimelineItem;
  onConfirm?: (decision: ApprovalDecision) => void | Promise<void>;
}) {
  const copy = useCopy();
  const [pending, setPending] = useState(false);
  const choices = approvalChoices(copy);
  const prompt = tool.approval?.prompt ?? copy.chat.approval.promptFallback;

  async function confirm(decision: ApprovalChoice) {
    if (pending) return;
    setPending(true);
    try {
      await onConfirm?.(decision);
    } catch {
      // The owner reports transport failures. Leave the prompt mounted and enabled for retry.
    } finally {
      setPending(false);
    }
  }

  return (
    <InlineApprovalPrompt
      ariaLabel={copy.chat.approval.actionsLabel}
      kicker={copy.chat.approval.permissionRequired}
      question={prompt}
      options={choices.map((choice) => ({
        id: choice.id,
        title: choice.label,
        body: choice.hint,
        onSelect: () => void confirm(choice.id),
      }))}
      hint={copy.chat.approval.chooseHint}
      secondaryLabel={copy.chat.approval.no}
      primaryLabel={copy.chat.approval.yes}
      pending={pending}
      approvalSurface="inline"
      onSecondary={() => void confirm("no")}
      onPrimary={() => void confirm("yes")}
    />
  );
}

export function ExternalApprovalSurface({
  tool,
  approvalIconSlot,
  onConfirm,
}: {
  tool: AgentUXToolTimelineItem;
  approvalIconSlot?: IconSlot;
  onConfirm?: (decision: ApprovalDecision) => void | Promise<void>;
}) {
  const copy = useCopy();
  const [selected, setSelected] = useState<ApprovalChoice>("yes");
  const choices = approvalChoices(copy);
  // Same precedence as the inline card: the backend's own question, else the dictionary's.
  const prompt = tool.approval?.prompt ?? copy.chat.approval.promptFallback;
  return (
    <aside
      className="external-approval-panel"
      data-approval-surface="external"
      data-preview-anchor="external-approval"
      aria-label={copy.chat.approval.externalLabel}
    >
      <div className="external-approval-head">
        <div>
          <span className="external-approval-title-row">
            {approvalIconSlot ? (
              <span className="external-approval-title-icon" aria-hidden="true">
                <StateIcon slot={approvalIconSlot} size={15} />
              </span>
            ) : null}
            <strong>{copy.chat.approval.permissionRequired}</strong>
          </span>
        </div>
        <small>{tool.title ?? tool.name}</small>
      </div>

      <p className="external-approval-prompt">{prompt}</p>

      <div className="external-approval-command">
        <code>{formatApprovalCommand(tool)}</code>
        <span>{copy.chat.approval.noOutput}</span>
      </div>

      <div className="external-approval-options" aria-label={copy.chat.approval.actionsLabel}>
        {choices.map((choice, index) => (
          <button
            key={choice.id}
            type="button"
            data-approval-action={choice.id}
            data-selected={selected === choice.id}
            onClick={() => setSelected(choice.id)}
          >
            <span className="external-approval-index">{index + 1}.</span>
            <span className="external-approval-option-copy">
              <strong>{choice.label}</strong>
              <span>{choice.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="external-approval-footer">
        <span>
          {copy.chat.approval.chooseHint}
        </span>
        <button
          type="button"
          className="external-approval-confirm"
          onClick={() => void Promise.resolve(onConfirm?.(selected)).catch(() => undefined)}
        >
          {copy.chat.approval.confirm}
        </button>
      </div>
    </aside>
  );
}

type ApprovalChoice = ApprovalDecision;

function approvalChoices(copy: UiCopy): Array<{ id: ApprovalChoice; label: string; hint: string }> {
  return [
    {
      id: "yes",
      label: copy.chat.approval.yes,
      hint: copy.chat.approval.hints.yes,
    },
    {
      id: "always",
      label: copy.chat.approval.always,
      hint: copy.chat.approval.hints.always,
    },
    {
      id: "no",
      label: copy.chat.approval.no,
      hint: copy.chat.approval.hints.no,
    },
  ];
}

function formatApprovalCommand(tool: AgentUXToolTimelineItem): string {
  const args = toPlainRecord(tool.approval?.argsPreview);
  const command = stringFromRecord(args, "cmd") || stringFromRecord(args, "command");
  if (command) {
    return `$ ${command}`;
  }

  if ((tool.name === "rm" || tool.name === "filesystem.rm") && args) {
    const path = stringFromRecord(args, "path");
    const recursive = args.recursive === true;
    const force = args.force === true;
    const flags = `${recursive ? "r" : ""}${force ? "f" : ""}`;
    return `$ rm ${flags ? `-${flags} ` : ""}${path || ""}`.trim();
  }

  if (tool.argsText) {
    return `$ ${tool.argsText}`;
  }

  if (args) {
    return JSON.stringify(args, null, 2);
  }

  return `$ ${tool.name}`;
}

function toPlainRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function stringFromRecord(value: Record<string, unknown> | undefined, key: string): string {
  const item = value?.[key];
  return typeof item === "string" ? item : "";
}

type MessageActionRole = "user" | "assistant";

function MessageActions({ project, role }: { project: AgentFrontendProject; role: MessageActionRole }) {
  const copy = useCopy();
  const { messageActions } = project.conversation;
  type MessageAction = { id: string; label: string; icon?: ReactElement; timeText?: string };
  const compactActions = (items: Array<MessageAction | undefined>) =>
    items.filter((action): action is MessageAction => Boolean(action));
  const actions = role === "user"
    ? compactActions([
      (messageActions.userCopy ?? messageActions.copy)
        ? { id: "copy", label: copy.chat.message.actions.copyPrompt, icon: <Copy size={14} /> }
        : undefined,
      (messageActions.userEdit ?? messageActions.edit)
        ? { id: "edit", label: copy.chat.message.actions.editPromptAndRerun, icon: <Pencil size={14} /> }
        : undefined,
      messageActions.userTime
        ? { id: "time", label: copy.chat.message.actions.promptTime, timeText: "09:47" }
        : undefined,
    ])
    : compactActions([
      (messageActions.agentCopy ?? messageActions.copy)
        ? { id: "copy", label: copy.chat.message.actions.copyResponse, icon: <Copy size={14} /> }
        : undefined,
      (messageActions.agentRegenerate ?? messageActions.regenerate)
        ? { id: "regenerate", label: copy.chat.message.actions.regenerateResponse, icon: <RotateCcw size={14} /> }
        : undefined,
      messageActions.agentEdit
        ? { id: "edit", label: copy.chat.message.actions.editResponse, icon: <Pencil size={14} /> }
        : undefined,
      messageActions.agentTime
        ? { id: "time", label: copy.chat.message.actions.responseTime, timeText: "09:48" }
        : undefined,
    ]);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div
      className="message-actions"
      data-message-actions={role}
      data-preview-anchor={role === "user" ? "user-message-actions" : "agent-message-actions"}
      aria-label={role === "user" ? copy.chat.message.actions.userActionsLabel : copy.chat.message.actions.agentActionsLabel}
    >
      {actions.map((action) => action.timeText ? (
        <span key={action.id} className="message-action-time" aria-label={action.label}>
          {action.timeText}
        </span>
      ) : (
        <IconTooltip key={action.id} label={action.label}>
          <button className="message-action-icon" aria-label={action.label} type="button">
            {action.icon}
          </button>
        </IconTooltip>
      ))}
    </div>
  );
}

function ConversationEmptyState({ project }: { project: AgentFrontendProject }) {
  const copy = useCopy();
  if (project.conversation.emptyState === "suggested-prompts") {
    return (
      <div className="empty-state starter-prompts">
        <button type="button">{copy.chat.emptyState.suggestedPrompts.inspectContext}</button>
        <button type="button">{copy.chat.emptyState.suggestedPrompts.draftResponse}</button>
        <button type="button">{copy.chat.emptyState.suggestedPrompts.summarizeWork}</button>
      </div>
    );
  }

  if (project.conversation.emptyState === "capability-hints") {
    return (
      <div className="empty-state capability-hints">
        <span>{copy.chat.emptyState.capabilityHints.files}</span>
        <span>{copy.chat.emptyState.capabilityHints.tools}</span>
        <span>{copy.chat.emptyState.capabilityHints.output}</span>
      </div>
    );
  }

  return <div className="empty-state">{copy.chat.emptyState.noEvents}</div>;
}
