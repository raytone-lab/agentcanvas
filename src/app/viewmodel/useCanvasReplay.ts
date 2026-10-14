import { useEffect, useState } from "react";

import type { AgentUXEvent } from "../../agentux";
import { canvasReplayDelay } from "../projection/canvasReplayPacing";
import { initialPreviewRevealCount } from "../projection/previewReplayPacing";

/**
 * Reveals the canvas's reply one event at a time, and starts over whenever the
 * reply changes.
 *
 * The algorithm is `streamSavedReplayEvents`' (`runActions.ts`): take the whole
 * list, show the prefix that has nothing to animate, then append one event per
 * timeout until it runs out. Written as a hook rather than reused from there
 * because the two differ in what drives them — the saved replay is started by a
 * button and reports to a toast when it lands, this one is started by the
 * reader editing their project and has nothing to report.
 *
 * `restartToken` is what makes it start over: any value whose identity changes
 * when the reader has changed something. It is a separate argument rather than
 * read off the events, because the reply's content no longer depends on the
 * project — it is one fixed turn holding every component — so the events array
 * would only take a new identity when the *locale* changed. Passing the trigger
 * in keeps each input honest about what it is: the list says what to play, the
 * token says when to play it again.
 *
 * The consequence to know about: an edit made mid-reply interrupts it. That is
 * the intent — the reader wants to see their new change take part in the whole
 * reply, not spliced into a half-played one.
 *
 * `startSettled` is the exception to that, and it exists because replaying from
 * the top is the wrong answer for one group of options. The settled-block cards
 * change only how the block reads *after* it closes, so a reader clicking
 * through them got five seconds of 思考中 — the one phase those cards cannot
 * touch — before their pick appeared, and every click restarted the five
 * seconds. Measured: at 0.5s after a click the canvas still said 思考中; the
 * new title only showed up somewhere before the 10s mark. Read as "clicking
 * does nothing", which is exactly how it looked.
 */
export function useCanvasReplay(
  events: readonly AgentUXEvent[],
  restartToken?: unknown,
  startSettled = false,
): readonly AgentUXEvent[] {
  /*
   * Seeded with the whole list rather than empty.
   *
   * The effect below trims it to the opening prefix on the first commit, so the
   * difference is one frame — but it is the frame the reader sees when the app
   * boots or when they switch away from a live run, and starting empty made the
   * canvas flash blank before the reply began. A list that is already complete
   * also means anything rendering this before the effect runs (a test that does
   * not advance timers, a server render) sees a coherent reply.
   */
  const [revealed, setRevealed] = useState<readonly AgentUXEvent[]>(events);

  useEffect(() => {
    if (events.length === 0) {
      setRevealed(events);
      return;
    }

    // `run.started` carries the title and draws nothing on its own, so waiting
    // before it would just be an empty pause at the top of every replay.
    let index = initialPreviewRevealCount(events);
    if (startSettled) {
      /*
       * Jump the think phase, and only that. The reveal lands just past
       * `reasoning.finished` so the closed block is there on the first frame,
       * and everything after it — tools, artifacts, the reply — still streams
       * at its own pace. Skipping to the end instead would hand back a
       * finished canvas and lose the stream the rest of the rail is showing.
       */
      const settledAt = events.findIndex((event) => event.type === "reasoning.finished");
      if (settledAt >= 0) index = Math.max(index, settledAt + 1);
    }
    setRevealed(events.slice(0, index));

    if (index >= events.length) return;

    let timer: number | undefined;
    const tick = () => {
      index += 1;
      setRevealed(events.slice(0, index));
      if (index >= events.length) return;
      timer = window.setTimeout(tick, canvasReplayDelay(events[index]));
    };
    timer = window.setTimeout(tick, canvasReplayDelay(events[index]));

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [events, restartToken, startSettled]);

  return revealed;
}
