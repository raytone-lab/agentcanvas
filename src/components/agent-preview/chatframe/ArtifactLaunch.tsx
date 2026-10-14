import type { AgentUXArtifactTimelineItem } from "@agent-ux/render-core";
import { ArrowUpRight, Globe2, Play, Volume2 } from "../../../agentmatrix/uiIcons";
import type { CSSProperties } from "react";

import { StateIcon } from "../../../agentmatrix";

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

/**
 * The comic style's artifact mark: a page with a folded corner and a pair of
 * chevrons cut out of it.
 *
 * A file, said as a file. The shared glyph here is a globe — right for a
 * website preview, which is what this card was originally for, and wrong for
 * the Notes.md it usually shows.
 *
 * Off the `iconStyle` switch for the same reason the new-task icon is: `studio`
 * resolves to "line", which three other styles share. The sibling-span switch
 * below it is what picks by style.
 */
function ComicArtifactIcon({ size }: { size: number }) {
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
      <path d="M7 4H21.5L26 7.5L29 12.5V32H7V4Z" fill="#FECD0F" />
      <path
        d="M31.5 12.1923C31.5 12.1606 31.4965 12.1325 31.493 12.1044C31.493 12.1009 31.493 12.0938 31.4895 12.0903C31.4824 12.0306 31.4719 11.9743 31.4543 11.9181C31.4367 11.8583 31.4191 11.8021 31.3945 11.7458V11.7423C31.384 11.7142 31.3699 11.6896 31.3559 11.6614V11.6579C31.3418 11.6333 31.3277 11.6052 31.3137 11.5806C31.3102 11.5771 31.3102 11.5735 31.3066 11.57C31.2926 11.5489 31.2785 11.5278 31.2609 11.5032C31.2574 11.4997 31.2574 11.4962 31.2539 11.4962C31.2363 11.4751 31.2188 11.4505 31.2012 11.4294C31.1977 11.4259 31.1941 11.4188 31.1871 11.4153C31.1695 11.3942 31.152 11.3731 31.1309 11.3556L31.1273 11.3521L22.4051 2.61924C22.384 2.59814 22.3629 2.58057 22.3418 2.56299C22.3383 2.55947 22.3312 2.55596 22.3277 2.54893C22.3066 2.53135 22.2855 2.51377 22.2609 2.49619C22.2574 2.49619 22.2574 2.49268 22.2539 2.49268C22.2328 2.4751 22.2082 2.46104 22.1871 2.44697C22.1836 2.44346 22.1801 2.44346 22.1766 2.43994C22.152 2.42588 22.1273 2.4083 22.0992 2.39424C22.0711 2.38018 22.0465 2.36611 22.0184 2.35557H22.0148C21.9586 2.33096 21.9023 2.30986 21.8426 2.2958C21.7863 2.28174 21.7301 2.26768 21.6703 2.26064C21.6668 2.26064 21.6598 2.26064 21.6562 2.25713C21.607 2.2501 21.5578 2.24658 21.5051 2.24658H5.76562C5.06602 2.24658 4.5 2.8126 4.5 3.51221V32.4563C4.5 33.156 5.06602 33.722 5.76562 33.722H30.2344C30.934 33.722 31.5 33.156 31.5 32.4563V12.2556V12.1923ZM22.7742 6.5708L27.1828 10.9864H22.7742V6.5708ZM7.03125 31.1907V4.77783H20.243V12.2556C20.243 12.9552 20.809 13.5212 21.5086 13.5212H28.9688V31.1942H7.03125V31.1907Z"
        fill="black"
      />
      <path
        d="M13.3173 21.2307L15.4161 18.9174C15.8872 18.4006 15.845 17.599 15.3282 17.1279C14.8114 16.6568 14.0099 16.699 13.5388 17.2158L10.6981 20.3482C10.2727 20.8158 10.2587 21.526 10.6665 22.0111L13.5106 25.4037C13.7602 25.7025 14.1188 25.8572 14.4809 25.8572C14.7692 25.8572 15.0575 25.7588 15.2931 25.5619C15.8274 25.1119 15.8977 24.3139 15.4513 23.7795L13.3173 21.2307ZM22.4649 17.2158C21.9938 16.699 21.1958 16.6603 20.6755 17.1279C20.1587 17.599 20.12 18.3971 20.5876 18.9174L22.6864 21.2307L20.5524 23.776C20.1024 24.3103 20.1727 25.1084 20.7106 25.5584C20.9462 25.7588 21.2345 25.8537 21.5227 25.8537C21.8849 25.8537 22.2434 25.699 22.4931 25.4002L25.3372 22.0076C25.745 21.5225 25.7309 20.8123 25.3056 20.3447L22.4649 17.2158Z"
        fill="black"
      />
    </svg>
  );
}

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
          <span className="comic-artifact-icon">
            <ComicArtifactIcon size={24} />
          </span>
          {/* The pixel styles draw this from the icon registry instead of the
              hardcoded globe: `StateIcon` routes to pixelarticons there, so the
              card's mark lands on the same grid as every other glyph. Added as
              a third element rather than by branching, which is the pattern the
              comic variant above already established — all three render and CSS
              shows one. */}
          <span className="pixel-artifact-icon">
            <StateIcon slot="content.text" size={24} />
          </span>
          <span className="default-artifact-icon">
            <Globe2 size={24} />
          </span>
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
          disabled={!onOpenArtifact}
          onClick={() => onOpenArtifact?.(artifactLaunchOpenRequest(item, copy, project))}
        >
          {/* 打开, not 打开方式, and an outbound arrow rather than a chevron: the
              button opens the artifact in the panel, it does not drop a menu
              of ways to open it, and the chevron promised one. 漫画风 already
              drew it this way; every style does now. */}
          <span>{copy.chat.artifactLaunch.open}</span>
          <ArrowUpRight size={15} aria-hidden="true" />
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
