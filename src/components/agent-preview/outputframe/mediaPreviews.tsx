import { Play, Volume2 } from "lucide-react";

import {
  ImageBlurFlowReveal,
  ImageDotFlickerReveal,
  ImageGenerationReveal,
  ImagePixelGridReveal,
  MediaLoadingReveal,
} from "../ImageGeneration";
import type { OutputPanelItem } from "./panelItem";

// Demo asset shown once the load→present interaction finishes in the canvas.
const DEMO_MEDIA_IMAGE = "/output-previews/product-projector.png";

export function ImageOutputPreview({ item }: { item: OutputPanelItem }) {
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

export function AudioOutputPreview({ item }: { item: OutputPanelItem }) {
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

export function VideoOutputPreview({ item }: { item: OutputPanelItem }) {
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
