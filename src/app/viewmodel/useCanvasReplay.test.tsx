/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCanvasReplay } from "./useCanvasReplay";
import { canvasTimelineEvents } from "../projection/canvasTimeline";
import { CANVAS_THINKING_MS, canvasReplayDelay } from "../projection/canvasReplayPacing";
import type { AgentUXEvent } from "../../agentux";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const reply = canvasTimelineEvents({ locale: "zh" });

/**
 * The hook under a root, reporting through the DOM.
 *
 * Read back from an attribute rather than from a captured render value, so what
 * is asserted is what actually reached the document after a commit — the same
 * thing the canvas would have drawn.
 */
function Harness({ events, token }: { events: readonly AgentUXEvent[]; token?: unknown }) {
  const revealed = useCanvasReplay(events, token);
  return <div data-types={revealed.map((event) => event.type).join(",")} />;
}

const mounted: Array<() => void> = [];

async function mount(events: readonly AgentUXEvent[], token?: unknown) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted.push(() => root.unmount());

  await act(async () => {
    root.render(<Harness events={events} token={token} />);
  });

  const types = () => {
    const value = container.firstElementChild?.getAttribute("data-types") ?? "";
    return value === "" ? [] : value.split(",");
  };
  const rerender = async (nextToken?: unknown) => {
    await act(async () => {
      root.render(<Harness events={events} token={nextToken} />);
    });
  };
  const unmount = () => act(() => root.unmount());
  return { types, rerender, unmount };
}

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

/** Advance by the delay the driver would have set before `reply[at]`. */
const advanceTo = (at: number) => advance(canvasReplayDelay(reply[at]));

describe("canvas replay driver", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    for (const unmount of mounted.splice(0)) unmount();
    vi.useRealTimers();
  });

  it("opens on the prefix rather than on a blank canvas", async () => {
    /*
     * Seeded with the whole reply and trimmed by the effect, so a reader who has
     * not moved — and anything rendering before effects run — sees a coherent
     * conversation rather than an empty column.
     *
     * Two events, and both are free: `run.started` carries the title and draws
     * nothing, and the one after it opens the reader's own message, which was
     * already there before the agent replied.
     */
    const { types } = await mount(reply);
    expect(types()).toEqual(["run.started", "text.started"]);
  });

  it("reveals the reply one event at a time, in order", async () => {
    const { types } = await mount(reply);
    const lengths = [types().length];
    for (let index = 2; index < reply.length; index += 1) {
      await advanceTo(index);
      lengths.push(types().length);
    }

    expect(lengths).toEqual(Array.from({ length: reply.length - 1 }, (_, step) => step + 2));
    expect(types()).toEqual(reply.map((event) => event.type));
  });

  it("holds the wait for five seconds, with the block still open", async () => {
    const { types } = await mount(reply);
    const finishedIndex = reply.findIndex((event) => event.type === "reasoning.finished");

    for (let index = 2; index < finishedIndex; index += 1) {
      await advanceTo(index);
    }
    // The window the block's clock counts through, 已思考1秒 upward.
    expect(types()).toContain("reasoning.status");
    expect(types()).not.toContain("reasoning.finished");

    // One second short, still open — so the five seconds are really spent here
    // rather than somewhere earlier in the list.
    await advance(CANVAS_THINKING_MS - 1_000);
    expect(types()).not.toContain("reasoning.finished");

    await advance(1_000);
    expect(types()).toContain("reasoning.finished");
  });

  it("does not show the tool call until the wait has resolved", async () => {
    // The order is the reason the reply is worth playing: the work that answered
    // the question arrives after the thinking, not beside it.
    const { types } = await mount(reply);
    const finishedIndex = reply.findIndex((event) => event.type === "reasoning.finished");

    for (let index = 2; index <= finishedIndex; index += 1) {
      await advanceTo(index);
    }
    expect(types()).toContain("reasoning.finished");
    expect(types()).not.toContain("tool.call.started");

    await advanceTo(finishedIndex + 1);
    expect(types()).toContain("tool.call.started");
  });

  it("starts over when the restart token changes", async () => {
    /*
     * The behaviour the feature is for: edit a component and the reply plays
     * again from the wait, so the change takes part in a whole reply rather than
     * appearing in a still frame.
     *
     * Keyed on a token rather than on the events, because the reply's content no
     * longer depends on the project — the same list is correct for every
     * configuration, so its identity would not change on an edit.
     */
    const { types, rerender } = await mount(reply, {});
    for (let index = 2; index < 6; index += 1) {
      await advanceTo(index);
    }
    expect(types().length).toBeGreaterThan(2);

    await rerender({});
    expect(types()).toEqual(["run.started", "text.started"]);
  });

  it("keeps playing across a rerender that changed nothing", async () => {
    // The token's identity is the signal, so a rerender with the same token must
    // not restart — otherwise any unrelated parent render would reset the reply.
    const token = {};
    const { types, rerender } = await mount(reply, token);
    for (let index = 2; index < 6; index += 1) {
      await advanceTo(index);
    }
    const before = types().length;

    await rerender(token);
    expect(types().length).toBeGreaterThanOrEqual(before);
  });

  it("drops its timer on unmount instead of writing to a gone root", async () => {
    /*
     * There is nothing left in the document to read after unmounting, so what is
     * checked is the symptom a leaked timer produces: React complains when a
     * state update lands on a root that is gone. Advancing well past the whole
     * reply gives every remaining timeout a chance to fire.
     */
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = await mount(reply);
    await advanceTo(2);
    unmount();
    await advance(CANVAS_THINKING_MS * 3);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("passes an empty reply through rather than waiting on nothing", async () => {
    const { types } = await mount([]);
    expect(types()).toEqual([]);
  });
});
