import type { AgentUXArtifactTimelineItem } from "@agent-ux/render-core";

import type { AgentFrontendProject, ArtifactRenderer } from "../../../schema/agentuxConfig";
import type { ConcreteArtifactRenderer, OutputFrameCopy } from "./types";
import { languageFromFileName } from "./panelItem";
import { languageFromTitle, outputItemRenderKind } from "./renderKind";

export function resolveArtifactRenderer(
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

export function artifactText(artifact: AgentUXArtifactTimelineItem, copy: OutputFrameCopy): string {
  if (artifact.content) {
    return artifact.content;
  }
  if (artifact.data) {
    return JSON.stringify(artifact.data, null, 2);
  }
  return copy.artifactMetadataEmpty;
}

export function artifactDiffPreview(artifact: AgentUXArtifactTimelineItem, copy: OutputFrameCopy): string {
  return `--- ${artifact.title ?? artifact.id}\n+++ ${artifact.title ?? artifact.id}\n+ ${artifact.content ?? "artifact content"}\n- ${copy.previousImplementation}`;
}

export function artifactDataPreview(artifact: AgentUXArtifactTimelineItem): string {
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

export function artifactCodePreview(artifact: AgentUXArtifactTimelineItem, copy: OutputFrameCopy): { code: string; lang: string } {
  const text = artifactText(artifact, copy);
  const fenced = text.match(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/);
  const lang = normalizeLanguage(fenced?.[1] ?? languageFromTitle(artifact.title ?? artifact.id));
  return {
    code: (fenced?.[2] ?? text).trim(),
    lang,
  };
}

export function outputPanelItemFromRenderedArtifact(artifact: AgentUXArtifactTimelineItem, project: AgentFrontendProject) {
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
    kind: "file" as const,
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

export function firstMeaningfulLine(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, "").replace(/^-\s*/, "").trim())
    .find(Boolean) ?? "Preview content is ready.";
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
