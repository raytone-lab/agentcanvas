import type { AgentUXEvent } from "@agent-ux/protocol";

import type { AgentInput, HarnessAdapter } from "./HarnessAdapter";

export function createReplayHarness(events: readonly AgentUXEvent[], delayMs = 80): HarnessAdapter {
  return {
    name: "replay",
    connect(_input: AgentInput) {
      return replayEvents(events, delayMs);
    },
  };
}

async function* replayEvents(events: readonly AgentUXEvent[], delayMs: number): AsyncIterable<AgentUXEvent> {
  for (const event of events) {
    await wait(delayMs);
    yield event;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}
