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

describe("multi-turn transcript", () => {
  it("keeps a thinking animation visible after a delivery pick", () => {
    // The reason the canvas shows more than one turn. Thinking and delivery are
    // two instants of the same turn, so a single frozen moment can only show
    // one of them — pick the animation, then pick a renderer, and the animation
    // was gone.
    const project = togglePresetOption(emptyStructureProject, "thinking-wave");
    const parts = canvasTimelineParts({
      project,
      items: [],
      picked: ["thinking-wave", "renderer-markdown"],
    });
    expect(parts.artifact).toBe(true);
    expect(parts.liveTurn).toBe(true);
    expect(parts.liveReasoning).toBe(true);

    const types = canvasTimelineEvents({
      project,
      items: [],
      picked: ["thinking-wave", "renderer-markdown"],
      locale: "zh",
    }).map((event) => event.type);
    // A finished first turn carrying the artifact, then a second turn that has
    // not ended — no `run.finished`, or the animation would render as history.
    expect(types).toContain("artifact.created");
    // Two messages, not three: both picks are agent-side, so the finished turn
    // carries only the reply. Nothing is shown that was not picked, which is
    // the rule the canvas is built on.
    expect(types.filter((type) => type === "text.started")).toHaveLength(2);
    expect(types).not.toContain("run.finished");
    expect(types.at(-1)).toBe("reasoning.delta");
  });

  it("ends the run when nothing transient is picked", () => {
    const types = canvasTimelineEvents({
      project: emptyStructureProject,
      items: [],
      picked: ["renderer-markdown"],
      locale: "zh",
    }).map((event) => event.type);
    expect(types.at(-1)).toBe("run.finished");
  });
});
