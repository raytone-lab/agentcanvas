import { describe, expect, it } from "vitest";

import { piErrorTurnEvents } from "./piErrorTurn";

describe("Pi error turn", () => {
  it("shows the prompt above the error when the turn had not started", () => {
    const events = piErrorTurnEvents({
      message: "Pi runtime is unavailable.",
      prompt: "  Build the page  ",
      code: "pi_configuration_error",
      runId: "run",
      now: 100,
    });

    expect(events.map((event) => event.type)).toEqual([
      "run.started",
      "text.started",
      "text.delta",
      "text.finished",
      "run.error",
    ]);
    expect(events[2]).toMatchObject({ payload: { delta: "Build the page" } });
    expect(events.at(-1)).toMatchObject({
      payload: { code: "pi_configuration_error", userMessage: "Pi runtime is unavailable." },
    });
    expect(events.map((event) => event.seq), "seq 在本批次内应单调").toEqual([1, 2, 3, 4, 5]);
  });

  it("appends only the error when the turn is already under way", () => {
    // Failing mid-run: the transcript already carries the question *and* an open run, so
    // repeating either would show the question twice and reopen a run that is in progress.
    const events = piErrorTurnEvents({ message: "boom", runId: "run", now: 0 });

    expect(events.map((event) => event.type)).toEqual(["run.error"]);
  });

  it("treats a blank prompt as no prompt", () => {
    const events = piErrorTurnEvents({ message: "boom", prompt: "   ", runId: "run", now: 0 });
    expect(events.map((event) => event.type)).toEqual(["run.error"]);
  });
});
