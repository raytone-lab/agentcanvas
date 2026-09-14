/** @vitest-environment jsdom */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WRITING_REPLAY_DELAY_MS, replayWritingSoon } from "./controllerShared";
import type { WorkspaceRefs } from "./useWorkspaceState";
import type { WorkspaceDispatch } from "../state/workspaceState";

/**
 * Dragging a speed slider has to change something on the canvas.
 *
 * By the time the reader reaches for 打字速度 the reveal has finished, and a
 * finished reveal looks the same at any speed — so the slider moved a number
 * and nothing else. The in-flight case is handled by the animation effect's
 * deps; this is the replay that covers the finished one.
 */

function fakeRefs(): WorkspaceRefs {
  return { writingReplayTimerRef: { current: undefined } } as unknown as WorkspaceRefs;
}

describe("replayWritingSoon", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("replays once the hand stops, not once per frame of the drag", () => {
    // A range input fires an event per frame. Bumping on each one restarts the
    // reveal from the first character every 16ms, so the pace being configured
    // is the one thing you never get to see.
    const dispatch = vi.fn() as unknown as WorkspaceDispatch;
    const refs = fakeRefs();

    for (let frame = 0; frame < 12; frame += 1) {
      replayWritingSoon(refs, dispatch);
      vi.advanceTimersByTime(16);
    }
    expect(dispatch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(WRITING_REPLAY_DELAY_MS);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "bump", key: "writingReplayKey" });
  });

  it("clears its handle so the unmount cleanup has nothing left to cancel", () => {
    const dispatch = vi.fn() as unknown as WorkspaceDispatch;
    const refs = fakeRefs();
    replayWritingSoon(refs, dispatch);
    expect(refs.writingReplayTimerRef.current).toBeDefined();
    vi.advanceTimersByTime(WRITING_REPLAY_DELAY_MS);
    expect(refs.writingReplayTimerRef.current).toBeUndefined();
  });

  it("is what the speed sliders call", () => {
    // The wiring is the point: the control lives in the rail, the animation on
    // the canvas, and only this call connects them.
    // Read off the repo root: under jsdom `import.meta.url` is an http URL, so
    // the `new URL(…, import.meta.url)` form the other CSS/source checks use
    // throws here.
    const source = readFileSync(resolve(process.cwd(), "src/app/viewmodel/previewActions.ts"), "utf8");
    const updater = source.slice(source.indexOf("function updateWritingParam"));
    expect(updater.slice(0, updater.indexOf("\n  }\n"))).toContain("replayWritingSoon(refs, dispatch)");
  });
});
