/**
 * One React commit per animation frame, for the live Pi turn loop.
 *
 * A Pi turn streams one canonical event at a time. Committing each one is quadratic, not merely
 * wasteful: `runtime.replay(events)` re-parses *and re-sorts the whole event list* on every
 * commit (`vendor/agent-ux/runtime/dist/index.js:31`), then the view model, the localization
 * pass and the output panel are all rebuilt. Over a turn of n events that is O(n² log n), which
 * is why a real reply visibly slowed down as it grew.
 *
 * A frame is the useful ceiling — nothing painted between two frames was ever seen. The latest
 * value wins, so no event is lost; only intermediate renders are. What the screen finally shows
 * is unchanged, which is the property `vendorParity.test.tsx` ("renders a streamed turn exactly
 * like a replayed one") holds this to.
 *
 * Lives here rather than in either shell because the editor (`App.tsx`) and the generated export
 * (`export/scaffoldManifest.ts`) each run their own copy of the turn loop; a coalescer written
 * twice is a coalescer that will differ.
 */
export type PiFrameCommit<T> = {
  /** Queue a value. The most recent one is what gets committed. */
  push(value: T): void;
  /** Commit any queued value now — call at the end of a turn so nothing waits on a frame. */
  flush(): void;
  /** Drop any queued value without committing, for an aborted turn. */
  cancel(): void;
};

export function createPiFrameCommit<T>(commit: (value: T) => void): PiFrameCommit<T> {
  let pending: { value: T } | undefined;
  let handle: number | undefined;

  // Absent under SSR and in the test environment. Committing straight through keeps behaviour
  // identical there instead of silently swallowing every update.
  const schedule = typeof requestAnimationFrame === "function"
    ? requestAnimationFrame
    : undefined;

  const commitPending = () => {
    const next = pending;
    pending = undefined;
    if (next) commit(next.value);
  };

  return {
    push(value) {
      if (!schedule) {
        commit(value);
        return;
      }
      pending = { value };
      if (handle !== undefined) return;
      handle = schedule(() => {
        handle = undefined;
        commitPending();
      });
    },
    flush() {
      if (handle !== undefined) {
        cancelAnimationFrame(handle);
        handle = undefined;
      }
      commitPending();
    },
    cancel() {
      if (handle !== undefined) {
        cancelAnimationFrame(handle);
        handle = undefined;
      }
      pending = undefined;
    },
  };
}
