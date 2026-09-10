import { describe, expect, it } from "vitest";

import { canvasTimelineEvents, canvasTimelineParts } from "./canvasTimeline";
import { emptyStructureProject, type AgentFrontendProject } from "../../schema/agentuxConfig";
import { togglePresetOption } from "../../schema/presetActions";

const withAvatar = (side: "userAvatar" | "agentAvatar"): AgentFrontendProject => ({
  ...emptyStructureProject,
  conversation: { ...emptyStructureProject.conversation, [side]: true },
});

const items = (...entries: [string, string][]) =>
  entries.map(([id, groupId]) => ({ id, groupId: groupId as never }));

describe("canvas timeline", () => {
  it("shows nothing until something is picked", () => {
    expect(canvasTimelineEvents({ project: emptyStructureProject, items: [], locale: "zh" })).toEqual([]);
  });

  it("gives each avatar its own turn", () => {
    // Both avatars live in the same preset group, so keying off the group meant
    // picking the reader's avatar also produced the agent's reply.
    const user = canvasTimelineParts({
      project: withAvatar("userAvatar"),
      items: items(["state:author.user", "conversation"]),
    });
    expect(user.userTurn).toBe(true);
    expect(user.agentTurn).toBe(false);

    const agent = canvasTimelineParts({
      project: withAvatar("agentAvatar"),
      items: items(["state:author.agent", "conversation"]),
    });
    expect(agent.userTurn).toBe(false);
    expect(agent.agentTurn).toBe(true);
  });

  it("keeps reasoning, tools and artifacts out until their group is picked", () => {
    // These are what the reader saw and did not ask for: a thinking block, two
    // tool cards and an artifact card, loaded wholesale with the fixture.
    const parts = canvasTimelineParts({
      project: withAvatar("agentAvatar"),
      items: items(["state:author.agent", "conversation"]),
    });
    expect(parts).toMatchObject({ reasoning: false, tools: false, artifact: false });

    // Driven by the click, not by project state: `reasoning.show` is
    // "status" | "summary" | "thinking" with no off value, so one is always set
    // and the project cannot say whether a thinking block was asked for.
    const withThinking = togglePresetOption(emptyStructureProject, "thinking-wave");
    expect(
      canvasTimelineParts({
        project: withThinking,
        items: items(["thinking-wave", "ux-effects"]),
        picked: ["thinking-wave"],
      }).reasoning,
    ).toBe(true);
    expect(
      canvasTimelineParts({ project: withThinking, items: items(["thinking-wave", "ux-effects"]) }).reasoning,
    ).toBe(false);
  });

  it("captions both speakers when name labels are on", () => {
    // A label on one turn is half the thing being configured.
    const project = togglePresetOption(emptyStructureProject, "speaker-labels");
    const parts = canvasTimelineParts({ project, items: items(["speaker-labels", "conversation"]) });
    expect(parts.userTurn).toBe(true);
    expect(parts.agentTurn).toBe(true);
  });

  it("emits a well-formed stream in event order", () => {
    const events = canvasTimelineEvents({
      project: withAvatar("userAvatar"),
      items: items(["state:author.user", "conversation"]),
      locale: "zh",
    });
    expect(events[0]?.type).toBe("run.started");
    expect(events.at(-1)?.type).toBe("run.finished");
    expect(events.map((event) => event.seq)).toEqual(events.map((_, index) => index + 1));
    // Stable timestamps: a clock reading would rebuild the timeline on every
    // render, remounting it under the reader's pointer.
    const again = canvasTimelineEvents({
      project: withAvatar("userAvatar"),
      items: items(["state:author.user", "conversation"]),
      locale: "zh",
    });
    expect(again).toEqual(events);
  });
});
