import { describe, expect, it } from "vitest";
import { agentUXEventBuilders } from "@agent-ux/protocol";

import {
  appendPiConversationEvents,
  createEphemeralPiConversation,
  piConversationSidebarItems,
  replacePiConversation,
  titlePiConversation,
} from "./piConversationState";

function textEvent(id: string, runId: string, seq: number) {
  return agentUXEventBuilders.textDelta(
    { id, runId, seq, ts: seq, messageId: `${runId}_message` },
    { textId: `${runId}_text`, delta: id },
  );
}

describe("ephemeral Pi conversation state", () => {
  it("appends multiple Pi turns with conversation-wide sequence numbers", () => {
    let conversation = createEphemeralPiConversation("conversation-1", 1);
    conversation = appendPiConversationEvents(conversation, [
      textEvent("first-a", "run-a", 1),
      textEvent("first-b", "run-a", 2),
    ]);
    conversation = appendPiConversationEvents(conversation, [
      textEvent("second-a", "run-b", 1),
      textEvent("second-b", "run-b", 2),
    ]);

    expect(conversation.events.map((event) => event.seq)).toEqual([1, 2, 3, 4]);
    expect(conversation.events.map((event) => event.id)).toEqual(["first-a", "first-b", "second-a", "second-b"]);
    expect(conversation.events.map((event) => event.runId)).toEqual(["run-a", "run-a", "run-b", "run-b"]);
  });

  it("derives a bounded first-prompt title and stable identity", () => {
    const original = createEphemeralPiConversation("conversation-1", 1);
    const titled = titlePiConversation(original, `  ${"A".repeat(50)}  `);

    expect(titled.id).toBe("conversation-1");
    expect(titled.title).toBe(`${"A".repeat(42)}…`);
  });

  it("updates, reorders, and bounds temporary conversations by identity", () => {
    const first = { ...createEphemeralPiConversation("first", 1), title: "First" };
    const second = { ...createEphemeralPiConversation("second", 2), title: "Second" };
    const updatedFirst = { ...first, title: "Updated" };
    const conversations = replacePiConversation([second, first], updatedFirst, 2);

    expect(conversations.map((entry) => entry.id)).toEqual(["first", "second"]);
    expect(piConversationSidebarItems(conversations)).toEqual([
      { id: "first", title: "Updated", createdAt: 1 },
      { id: "second", title: "Second", createdAt: 2 },
    ]);
  });
});
