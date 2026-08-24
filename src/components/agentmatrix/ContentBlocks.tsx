/**
 * ContentBlock renderer.
 *
 * Renders text (Markdown-lite), image, audio, resource links, and embedded
 * resources. Unsupported/untrusted content degrades to a safe attachment row
 * — it never executes HTML/scripts and never opens unknown URI schemes.
 */

import { StateIcon } from "../../agentmatrix";
import type { ContentBlock } from "../../agentmatrix";

const OPENABLE_SCHEMES = ["agentmatrix://", "memory://", "https://"];

export function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  if (!blocks.length) return null;
  return (
    <div className="am-content">
      {blocks.map((block, i) => (
        <ContentBlockView key={i} block={block} />
      ))}
    </div>
  );
}

function ContentBlockView({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "text":
      return <TextBlock text={block.text} />;
    case "image":
      return <ImageBlock block={block} />;
    case "audio":
      return <AudioBlock block={block} />;
    case "resource_link":
      return (
        <ResourceChip
          uri={block.uri}
          name={block.name}
          mime={block.mime_type}
          size={block.size}
          description={block.description}
        />
      );
    case "resource":
      return <EmbeddedResource block={block} />;
    default:
      return <div className="am-content-unknown">Unsupported content</div>;
  }
}

/** Minimal, safe Markdown: paragraphs, inline code, and `- ` bullets. */
function TextBlock({ text }: { text: string }) {
  const lines = text.split(/\n/);
  return (
    <div className="am-text">
      {lines.map((line, i) => {
        if (line.trim().startsWith("- ")) {
          return (
            <div className="am-bullet" key={i}>
              <span className="am-bullet-dot" />
              <span>{renderInline(line.trim().slice(2))}</span>
            </div>
          );
        }
        if (!line.trim()) return <div className="am-text-gap" key={i} />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  // Split on `code` spans; everything else is plain text (no HTML injection).
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    return <span key={i}>{part}</span>;
  });
}

function ImageBlock({ block }: { block: Extract<ContentBlock, { type: "image" }> }) {
  const src = block.data
    ? `data:${block.mime_type};base64,${block.data}`
    : block.uri && block.uri.startsWith("https://")
      ? block.uri
      : undefined;
  if (!src) {
    return <ResourceChip uri={block.uri ?? "image"} name="Image" mime={block.mime_type} />;
  }
  return <img className="am-image" src={src} alt="attachment" />;
}

function AudioBlock({ block }: { block: Extract<ContentBlock, { type: "audio" }> }) {
  const src = block.data ? `data:${block.mime_type};base64,${block.data}` : block.uri;
  if (!src) return <ResourceChip uri="audio" name="Audio" mime={block.mime_type} />;
  return <audio className="am-audio" controls src={src} />;
}

function EmbeddedResource({ block }: { block: Extract<ContentBlock, { type: "resource" }> }) {
  const { resource } = block;
  if (resource.text) {
    return (
      <div className="am-embedded">
        <ResourceChip uri={resource.uri} name={resource.uri} mime={resource.mime_type} inline />
        <pre className="am-embedded-body">{resource.text}</pre>
      </div>
    );
  }
  return <ResourceChip uri={resource.uri} name={resource.uri} mime={resource.mime_type} />;
}

export function ResourceChip({
  uri,
  name,
  mime,
  size,
  description,
  inline = false,
}: {
  uri: string;
  name: string;
  mime?: string;
  size?: number;
  description?: string;
  inline?: boolean;
}) {
  const openable = OPENABLE_SCHEMES.some((s) => uri.startsWith(s));
  return (
    <div className="am-resource" data-inline={inline} data-openable={openable} title={description}>
      <StateIcon slot="content.diff" size={14} className="am-resource-icon" />
      <span className="am-resource-name">{name}</span>
      {mime ? <span className="am-resource-meta">{mime}</span> : null}
      {size != null ? <span className="am-resource-meta">{formatBytes(size)}</span> : null}
      {!openable ? <span className="am-resource-locked">unresolvable</span> : null}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
