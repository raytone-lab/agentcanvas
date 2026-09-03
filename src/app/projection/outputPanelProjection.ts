import type { AgentUXArtifactTimelineItem, AgentUXToolTimelineItem } from "@agent-ux/render-core";

import { languageFromFileName, type OutputPanelItem } from "../../components/agent-preview/OutputFrame";
import { outputPanelItemsFromTool } from "../../components/agent-preview/ToolCallCard";
import type { AppLocale } from "../../i18n/uiCopy";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";

const OPENABLE_OUTPUT_FILE_PATTERN = /\.(?:tsx?|jsx?|mjs|cjs|json|mdx?|css|scss|html?|py|sh|ya?ml|toml|txt|diff|patch|png|jpe?g|gif|webp|avif|svg|mp3|wav|m4a|aac|ogg|flac|mp4|webm|mov|m4v)$/i;

export function mergeOutputPanelItems(current: OutputPanelItem[], incoming: readonly OutputPanelItem[]): OutputPanelItem[] {
  if (incoming.length === 0) {
    return current;
  }
  const next = [...current];
  for (const item of incoming) {
    const existingIndex = next.findIndex((entry) => entry.id === item.id);
    if (existingIndex >= 0) {
      next[existingIndex] = item;
      continue;
    }
    next.push(item);
  }
  return next;
}

function outputPanelItemFromArtifact(artifact: AgentUXArtifactTimelineItem, project: AgentFrontendProject): OutputPanelItem | undefined {
  const originalTitle = artifact.title ?? artifact.id;
  if (!OPENABLE_OUTPUT_FILE_PATTERN.test(originalTitle)) {
    return undefined;
  }
  const title = originalTitle.split("/").filter(Boolean).pop() ?? originalTitle;
  const mediaStyle = outputMediaStyleFromTitle(title, project);
  return {
    id: `file:${originalTitle}`,
    kind: "file",
    title,
    subtitle: originalTitle,
    language: languageFromFileName(title),
    body: artifact.content ?? (artifact.data ? JSON.stringify(artifact.data, null, 2) : undefined),
    mediaStyle,
  };
}

function outputMediaStyleFromTitle(title: string, project: AgentFrontendProject): string | undefined {
  const lower = title.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(lower)) {
    return project.mediaGeneration.imageStyle;
  }
  if (/\.(mp3|wav|m4a|aac|ogg|flac)$/.test(lower)) {
    return project.mediaGeneration.audioStyle;
  }
  if (/\.(mp4|webm|mov|m4v)$/.test(lower)) {
    return project.mediaGeneration.videoStyle;
  }
  return undefined;
}

export function collectDefaultOutputPanelItems(
  timeline: readonly (AgentUXArtifactTimelineItem | AgentUXToolTimelineItem | { kind: string })[],
  locale: AppLocale,
  project: AgentFrontendProject,
): OutputPanelItem[] {
  const items: OutputPanelItem[] = [];
  for (const item of timeline) {
    if (item.kind === "tool") {
      items.push(...outputPanelItemsFromTool(item as AgentUXToolTimelineItem, locale));
      continue;
    }
    if (item.kind === "artifact") {
      const artifactItem = outputPanelItemFromArtifact(item as AgentUXArtifactTimelineItem, project);
      if (artifactItem) {
        items.push(artifactItem);
      }
    }
  }
  return mergeOutputPanelItems([], items);
}

export function outputPanelItemsSignature(items: readonly OutputPanelItem[]): string {
  return items
    .map((item) => [item.id, item.language ?? "", item.body ?? "", item.imageSrc ?? "", item.mediaStyle ?? ""].join("\u001f"))
    .join("\u001e");
}
