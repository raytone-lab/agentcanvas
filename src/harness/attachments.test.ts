import { describe, expect, it } from "vitest";

import { createAttachmentInput, promptContextFromAttachments } from "./attachments";

describe("attachment input contract", () => {
  it("converts uploaded file and image metadata into typed request context", () => {
    const fileAttachment = createAttachmentInput({
      kind: "file",
      name: "SearchInput.tsx",
      mimeType: "text/typescript",
      sizeBytes: 1840,
      text: "export function SearchInput() {}",
    });
    const imageAttachment = createAttachmentInput({
      kind: "image",
      name: "screenshot.png",
      mimeType: "image/png",
      sizeBytes: 2048,
      width: 1280,
      height: 720,
      dataUrl: "data:image/png;base64,abc",
    });

    expect(fileAttachment).toMatchObject({
      kind: "file",
      name: "SearchInput.tsx",
      content: { kind: "text", text: "export function SearchInput() {}" },
    });
    expect(imageAttachment).toMatchObject({
      kind: "image",
      name: "screenshot.png",
      content: { kind: "data-url", dataUrl: "data:image/png;base64,abc" },
      dimensions: { width: 1280, height: 720 },
    });
    expect(promptContextFromAttachments([fileAttachment, imageAttachment])).toEqual([
      { type: "input_file", name: "SearchInput.tsx", mimeType: "text/typescript", text: "export function SearchInput() {}" },
      { type: "input_image", name: "screenshot.png", mimeType: "image/png", imageUrl: "data:image/png;base64,abc" },
    ]);
  });

  it("rejects attachment drafts without a concrete content source", () => {
    expect(() => createAttachmentInput({
      kind: "file",
      name: "empty.txt",
      mimeType: "text/plain",
      sizeBytes: 0,
    })).toThrow("File attachments require text or uri content.");

    expect(() => createAttachmentInput({
      kind: "image",
      name: "empty.png",
      mimeType: "image/png",
      sizeBytes: 0,
    })).toThrow("Image attachments require dataUrl or uri content.");
  });
});
