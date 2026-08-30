import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPiFrameCommit } from "./piFrameCommit";

/**
 * The contract that makes coalescing safe: the *last* value always lands, and it lands exactly
 * once per frame. Anything weaker would drop a token from a live reply.
 */
describe("Pi frame commit", () => {
  let frames: Array<() => void>;

  beforeEach(() => {
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
      frames[handle - 1] = () => undefined;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const runFrames = () => {
    const queued = frames;
    frames = [];
    for (const frame of queued) frame();
  };

  it("commits once per frame with the newest value", () => {
    const commits: number[] = [];
    const committer = createPiFrameCommit<number>((value) => commits.push(value));

    committer.push(1);
    committer.push(2);
    committer.push(3);
    expect(commits, "帧到达前不应提交").toEqual([]);

    runFrames();
    expect(commits, "一帧只提交一次，且是最新值").toEqual([3]);
  });

  it("never loses the final value when a turn ends mid-frame", () => {
    // The failure this guards: a turn finishes, the loop exits, and the last few events are
    // still sitting in the queue waiting for a frame that the component may never see.
    const commits: string[] = [];
    const committer = createPiFrameCommit<string>((value) => commits.push(value));

    committer.push("a");
    committer.push("b");
    committer.flush();

    expect(commits).toEqual(["b"]);
    runFrames();
    expect(commits, "flush 之后不应再有重复提交").toEqual(["b"]);
  });

  it("drops queued work when the turn is aborted", () => {
    const commits: string[] = [];
    const committer = createPiFrameCommit<string>((value) => commits.push(value));

    committer.push("stale");
    committer.cancel();
    runFrames();

    expect(commits).toEqual([]);
  });

  it("commits synchronously where there are no frames", () => {
    // Server rendering and the test environment have no rAF. Queueing there would mean the
    // update never arrives at all, so it must pass straight through.
    vi.unstubAllGlobals();
    const commits: number[] = [];
    const committer = createPiFrameCommit<number>((value) => commits.push(value));

    committer.push(7);
    expect(commits).toEqual([7]);
  });
});
