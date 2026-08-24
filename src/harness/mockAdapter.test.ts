import { describe, expect, it, vi } from "vitest";

import { createReplayHarness } from "./mockAdapter";

describe("replay harness", () => {
  it("uses global timers so exported adapters are not browser-window-only", async () => {
    vi.useFakeTimers();
    const event = {
      protocol: "agent-ux",
      version: "0.1",
      id: "evt_timer",
      runId: "run_timer",
      seq: 1,
      type: "run.started",
      ts: 1,
      payload: {},
    } as const;
    const harness = createReplayHarness([event], 10);
    const iterator = harness.connect({ prompt: "test" })[Symbol.asyncIterator]();
    const next = iterator.next();

    await vi.advanceTimersByTimeAsync(10);

    await expect(next).resolves.toMatchObject({ value: event, done: false });
    vi.useRealTimers();
  });
});
