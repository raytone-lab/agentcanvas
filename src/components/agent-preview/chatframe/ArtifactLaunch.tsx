import type { AgentUXArtifactTimelineItem } from "@agent-ux/render-core";
import { ChevronDown, Globe2, Play, Volume2 } from "lucide-react";
import type { CSSProperties } from "react";

import type { UiCopy } from "../../../i18n/uiCopy";
import type { AgentFrontendProject } from "../../../schema/agentuxConfig";
import {
  ImageBlurFlowReveal,
  ImageDotFlickerReveal,
  ImageGenerationReveal,
  ImagePixelGridReveal,
  MediaLoadingReveal,
} from "../ImageGeneration";
import type { OutputPanelOpenRequest } from "../OutputFrame";

const GENERATED_IMAGE_PREVIEW_SRC = "/output-previews/product-projector.png";

type ArtifactMediaKind = "image" | "audio" | "video";

export function ArtifactLaunchCard({
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
