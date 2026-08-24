/**
 * Mock SSE stream.
 *
 * Replays a reference fixture as a timed sequence of `StreamFrame`s, exactly
 * as a real beta SSE stream would interleave durable Event frames and ephemeral
 * deltas. This lets the whole projection + component stack run with zero
 * backend, and it is byte-compatible with the live client: swap the source,
 * keep everything else.
 *
 * Behaviors modelled from the reference:
 *  - durable Event frames carry a `stable_ordinal` when a delta previewed them;
 *  - delta frames stream a temporary block that the matching durable frame
 *    later replaces;
 *  - pause / resume / stop, and a speed multiplier for demos.
 */

import type { AnyDurableEvent, EventFixture, StreamFrame } from "./protocol";

export type FrameHandlers = {
  onFrame: (frame: StreamFrame) => void;
  onDone?: () => void;
  onError?: (error: unknown) => void;
};

export type FrameSource = {
  start(handlers: FrameHandlers): void;
  stop(): void;
  pause(): void;
  resume(): void;
  isRunning(): boolean;
};

export type MockStreamOptions = {
  /** Base delay between durable frames, ms. Default 420. */
  eventDelayMs?: number;
  /** Delay between delta frames, ms. Default 130. */
  deltaDelayMs?: number;
  /** Multiplier applied to every delay (2 = half speed). Default 1. */
  speed?: number;
  /** Emit the whole log instantly with no timers (durable replay). */
  instant?: boolean;
};

/**
 * Build the ordered frame timeline for a fixture. Durable events are wrapped as
 * event frames; where the fixture supplies delta previews for an event, the
 * deltas are spliced in immediately before that event frame.
 */
export function buildFrameTimeline(fixture: EventFixture): StreamFrame[] {
  const timeline: StreamFrame[] = [];

  // Index delta previews and the ordinal->event_id mapping from live_frames.
  const deltasByOrdinal = new Map<string, StreamFrame[]>();
  const ordinalByEventId = new Map<string, string>();
  for (const frame of fixture.live_frames) {
    if (frame.frame_type === "delta") {
      const list = deltasByOrdinal.get(frame.target_stable_ordinal) ?? [];
      list.push(frame);
      deltasByOrdinal.set(frame.target_stable_ordinal, list);
    } else if (frame.frame_type === "event" && frame.stable_ordinal) {
      ordinalByEventId.set(frame.event.event_id, frame.stable_ordinal);
    }
  }
  for (const list of deltasByOrdinal.values()) {
    list.sort((a, b) => (a.frame_type === "delta" && b.frame_type === "delta" ? a.delta_index - b.delta_index : 0));
  }

  const events = [...fixture.events].sort((a, b) => a.sequence - b.sequence);
  for (const event of events) {
    const ordinal = ordinalByEventId.get(event.event_id);
    if (ordinal && deltasByOrdinal.has(ordinal)) {
      for (const delta of deltasByOrdinal.get(ordinal)!) timeline.push(delta);
      timeline.push({ frame_type: "event", event, stable_ordinal: ordinal });
    } else {
      timeline.push({ frame_type: "event", event });
    }
  }
  return timeline;
}

export function createMockStreamSource(
  fixture: EventFixture,
  options: MockStreamOptions = {},
): FrameSource {
  const eventDelay = options.eventDelayMs ?? 420;
  const deltaDelay = options.deltaDelayMs ?? 130;
  const speed = options.speed ?? 1;
  const timeline = buildFrameTimeline(fixture);

  let handlers: FrameHandlers | null = null;
  let index = 0;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function clearTimer() {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function scheduleNext() {
    if (!running || !handlers) return;
    if (index >= timeline.length) {
      running = false;
      handlers.onDone?.();
      return;
    }
    const frame = timeline[index++];
    handlers.onFrame(frame);
    if (index >= timeline.length) {
      running = false;
      handlers.onDone?.();
      return;
    }
    const nextIsDelta = timeline[index]?.frame_type === "delta";
    const delay = (nextIsDelta ? deltaDelay : eventDelay) * speed;
    timer = setTimeout(scheduleNext, delay);
  }

  return {
    start(next) {
      handlers = next;
      index = 0;
      running = true;
      if (options.instant) {
        for (const frame of timeline) handlers.onFrame(frame);
        running = false;
        handlers.onDone?.();
        return;
      }
      // Kick off on next tick so subscribers can attach first.
      timer = setTimeout(scheduleNext, 0);
    },
    stop() {
      running = false;
      clearTimer();
    },
    pause() {
      running = false;
      clearTimer();
    },
    resume() {
      if (running || !handlers) return;
      running = true;
      timer = setTimeout(scheduleNext, 0);
    },
    isRunning() {
      return running;
    },
  };
}

/** Convenience: the durable events of a fixture as a plain committed log. */
export function fixtureDurableEvents(fixture: EventFixture): AnyDurableEvent[] {
  return [...fixture.events].sort((a, b) => a.sequence - b.sequence);
}
