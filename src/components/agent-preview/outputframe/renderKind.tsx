import { Braces, FileAudio2, FileCode2, FileText, FileVideo2, ImageIcon, PanelsTopLeft } from "lucide-react";
import type { ReactNode } from "react";

import type { ConcreteArtifactRenderer } from "./types";
import type { OutputPanelItem } from "./panelItem";

export type OpenedOutputRenderKind = "image" | "audio" | "video" | "html" | "markdown" | "data" | "code";

export function languageFromTitle(title: string): string {
  const ext = title.split(".").pop()?.toLowerCase();
  if (ext === "ts" || ext === "tsx") {
    return "typescript";
  }
  if (ext === "js" || ext === "jsx") {
    return "javascript";
  }
  return ext || "text";
}

export function outputItemRenderKind(item: OutputPanelItem): OpenedOutputRenderKind {
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

export function outputItemIcon(item: OutputPanelItem, size = 13): ReactNode {
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

export function outputItemModalRenderer(item: OutputPanelItem): ConcreteArtifactRenderer {
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
