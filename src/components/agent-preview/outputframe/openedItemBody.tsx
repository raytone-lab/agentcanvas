import type { ReactNode } from "react";

import type { OutputFrameCopy } from "./types";
import type { OutputPanelItem } from "./panelItem";
import type { OpenedOutputRenderKind } from "./renderKind";
import { AudioOutputPreview, ImageOutputPreview, VideoOutputPreview } from "./mediaPreviews";
import { renderMarkdownPreview as renderMarkdown } from "./markdown/renderMarkdown";

// Re-exported for the artifact renderer branch in OutputContent, which shares
// the same markdown pipeline as opened .md tabs.
export { renderMarkdownPreview } from "./markdown/renderMarkdown";

export function renderOpenedOutputBody(item: OutputPanelItem, kind: OpenedOutputRenderKind, language: string, copy: OutputFrameCopy): ReactNode {
  // An artifact with nothing in it says so. Synthesizing a body here produced a page that
  // looked like a real preview — a heading, a line of filler and a "Preview action" button —
  // sitting next to the genuine article in a second tab.
  if (item.body === undefined || item.body.trim() === "") {
    return <div className="empty-state">{copy.emptyNoArtifact}</div>;
  }
  const body = item.body;
  if (kind === "image") {
    return <ImageOutputPreview item={item} />;
  }
  if (kind === "audio") {
    return <AudioOutputPreview item={item} />;
  }
  if (kind === "video") {
    return <VideoOutputPreview item={item} />;
  }
  // The extension says "html"; the body decides whether there is a page to render. A `.html`
  // tab holding something else (a tool's JSON receipt, for instance) shows its source rather
  // than being dressed up as a page.
  if (kind === "html" && looksLikeHtmlDocument(body)) {
    return <iframe className="html-output-preview" title={item.title} srcDoc={htmlOutputDocument(body, item.title)} />;
  }
  if (kind === "markdown") {
    return <div className="markdown-preview">{renderMarkdown(body, copy)}</div>;
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

/**
 * Whether there is a page here to render.
 *
 * A full document renders as itself; a bare fragment (`<main>…</main>`) still renders once
 * wrapped. Anything without markup at all is not a page, and dressing it up as one is how a
 * tool's JSON receipt came to be displayed as a styled card with a "Preview action" button.
 */
function looksLikeHtmlDocument(body: string): boolean {
  return /<!doctype|<html|<body|<[a-z][a-z0-9-]*[\s>/]/i.test(body.trim());
}

function htmlOutputDocument(body: string, title: string): string {
  if (/<html|<body|<!doctype/i.test(body)) {
    return body;
  }
  // A fragment, wrapped so it can render — and nothing else. This used to build a card with the
  // file's name as a heading, one line of its text, and a dead "Preview action" button, which
  // read as a working preview of something that had not been previewed at all.
  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    `<title>${escapeHtml(title)}</title>`,
    "<style>body{margin:0;font:14px system-ui;color:#172033}</style>",
    "</head><body>",
    body,
    "</body></html>",
  ].join("");
}

function normalizeJsonPreview(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
