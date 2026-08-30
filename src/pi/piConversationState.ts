import type { AgentUXEvent } from "@agent-ux/protocol";

export const MAX_EPHEMERAL_PI_CONVERSATIONS = 12;

export type EphemeralPiConversation = {
  id: string;
  title: string;
  events: readonly AgentUXEvent[];
  createdAt: number;
};

export type PiConversationSidebarItem = Pick<EphemeralPiConversation, "id" | "title">;

export function createEphemeralPiConversation(
  id = createConversationId(),
  createdAt = Date.now(),
): EphemeralPiConversation {
  return { id, title: "New conversation", events: [], createdAt };
}

export function titlePiConversation(
  conversation: EphemeralPiConversation,
  prompt: string,
): EphemeralPiConversation {
  if (conversation.events.length > 0 || conversation.title !== "New conversation") return conversation;
  const normalized = prompt.trim().replace(/\s+/g, " ");
  if (!normalized) return conversation;
  return { ...conversation, title: normalized.length > 42 ? `${normalized.slice(0, 42)}…` : normalized };
}

/**
 * Pi starts event sequence numbers at one for every model turn. AgentUX sorts a combined stream by
 * sequence number, so each event appended to a browser conversation receives a conversation-wide
 * monotonic sequence while retaining its original event ID and run ID.
 */
export function appendPiConversationEvents(
  conversation: EphemeralPiConversation,
  incoming: readonly AgentUXEvent[],
): EphemeralPiConversation {
  if (incoming.length === 0) return conversation;
  const offset = conversation.events.length;
  const appended = incoming.map((event, index) => ({
    ...event,
    seq: offset + index + 1,
  })) as AgentUXEvent[];
  return { ...conversation, events: [...conversation.events, ...appended] };
}

export function replacePiConversation(
  conversations: readonly EphemeralPiConversation[],
  replacement: EphemeralPiConversation,
  max = MAX_EPHEMERAL_PI_CONVERSATIONS,
): readonly EphemeralPiConversation[] {
  const next = [replacement, ...conversations.filter((entry) => entry.id !== replacement.id)];
  return next.slice(0, Math.max(1, max));
}

export function piConversationSidebarItems(
  conversations: readonly EphemeralPiConversation[],
): readonly PiConversationSidebarItem[] {
  return conversations.map(({ id, title }) => ({ id, title }));
}

function createConversationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pi_${crypto.randomUUID()}`;
  }
  return `pi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}
