import type { AgentUXEvent } from "@agent-ux/protocol";
import type { AgentAttachmentInput } from "./attachments";

export type AgentInput = {
  prompt: string;
  model?: string;
  attachments?: AgentAttachmentInput[];
};

export type HarnessAdapter = {
  name: string;
  connect(input: AgentInput): AsyncIterable<AgentUXEvent>;
};
