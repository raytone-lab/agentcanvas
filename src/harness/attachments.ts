export type AgentAttachmentInput =
  | {
    kind: "file";
    name: string;
    mimeType: string;
    sizeBytes: number;
    content: { kind: "text"; text: string } | { kind: "uri"; uri: string };
  }
  | {
    kind: "image";
    name: string;
    mimeType: string;
    sizeBytes: number;
    dimensions?: { width: number; height: number };
    content: { kind: "data-url"; dataUrl: string } | { kind: "uri"; uri: string };
  };

export type AttachmentInputDraft =
  | {
    kind: "file";
    name: string;
    mimeType: string;
    sizeBytes: number;
    text?: string;
    uri?: string;
  }
  | {
    kind: "image";
    name: string;
    mimeType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    dataUrl?: string;
    uri?: string;
  };

export type ProviderPromptContext =
  | { type: "input_file"; name: string; mimeType: string; text?: string; uri?: string }
  | { type: "input_image"; name: string; mimeType: string; imageUrl?: string; uri?: string };

export function createAttachmentInput(draft: AttachmentInputDraft): AgentAttachmentInput {
  if (draft.kind === "file") {
    if (draft.text !== undefined) {
      return {
        kind: "file",
        name: draft.name,
        mimeType: draft.mimeType,
        sizeBytes: draft.sizeBytes,
        content: { kind: "text", text: draft.text },
      };
    }
    if (draft.uri === undefined) {
      throw new Error("File attachments require text or uri content.");
    }
    return {
      kind: "file",
      name: draft.name,
      mimeType: draft.mimeType,
      sizeBytes: draft.sizeBytes,
      content: { kind: "uri", uri: draft.uri },
    };
  }

  if (draft.dataUrl !== undefined) {
    return {
      kind: "image",
      name: draft.name,
      mimeType: draft.mimeType,
      sizeBytes: draft.sizeBytes,
      dimensions: draft.width && draft.height ? { width: draft.width, height: draft.height } : undefined,
      content: { kind: "data-url", dataUrl: draft.dataUrl },
    };
  }
  if (draft.uri === undefined) {
    throw new Error("Image attachments require dataUrl or uri content.");
  }
  return {
    kind: "image",
    name: draft.name,
    mimeType: draft.mimeType,
    sizeBytes: draft.sizeBytes,
    dimensions: draft.width && draft.height ? { width: draft.width, height: draft.height } : undefined,
    content: { kind: "uri", uri: draft.uri },
  };
}

export function promptContextFromAttachments(attachments: readonly AgentAttachmentInput[]): ProviderPromptContext[] {
  return attachments.map((attachment) => {
    if (attachment.kind === "file") {
      return {
        type: "input_file",
        name: attachment.name,
        mimeType: attachment.mimeType,
        text: attachment.content.kind === "text" ? attachment.content.text : undefined,
        uri: attachment.content.kind === "uri" ? attachment.content.uri : undefined,
      };
    }

    return {
      type: "input_image",
      name: attachment.name,
      mimeType: attachment.mimeType,
      imageUrl: attachment.content.kind === "data-url" ? attachment.content.dataUrl : undefined,
      uri: attachment.content.kind === "uri" ? attachment.content.uri : undefined,
    };
  });
}
