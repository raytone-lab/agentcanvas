import { useEffect, useRef, useState } from "react";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";

/**
 * Progressive reveal of assistant text for the preview. Unlike a CSS clip/width
 * animation (which wipes the whole block at once and can't follow wrapped
 * lines), this reveals real substrings over time so the text types out
 * character-by-character (typewriter), word-by-word (smooth stream), or
 * chunk-by-chunk (chunked) — flowing naturally line by line.
 */
export function WritingText({ project, text, replayKey = 0 }: { project: AgentFrontendProject; text: string; replayKey?: number }) {
  const { writing, writingParams } = project.theme.motion;
  const tokens = splitWordTokens(text);
  const total = writing === "typewriter" ? text.length : tokens.length;

  const [revealed, setRevealed] = useState(total);
  const frame = useRef<number | undefined>(undefined);
  /**
   * How far the reveal had got, and for which text.
   *
   * The effect below re-runs whenever `text` changes, and it used to restart the reveal from
   * zero every time. That is right for a replay (the whole answer arrives at once, then plays),
   * but a live model streams: `text` grows by one delta at a time, so the animation was
   * interrupted and reset on every token. A 48-delta answer restarted 48 times and never got
   * past the first word — on screen, an empty bubble that flickers.
   *
   * So progress is remembered across renders. Text that merely got longer continues from where
   * it was; anything else (a different message, or an explicit replay) starts over.
   */
  const progress = useRef({ text: "", count: total, replayKey });

  useEffect(() => {
    if (prefersReducedMotion()) {
      progress.current = { text, count: total, replayKey };
      setRevealed(total);
      return;
    }

    // Units revealed per second, and how many units advance per real chunk.
    const perStep = writing === "chunked" ? Math.max(1, writingParams.chunkSize) : 1;
    const stepMs = writing === "typewriter"
      ? 1000 / clampRate(writingParams.typeCps, 1, 120)
      : writing === "chunked"
        ? Math.max(30, writingParams.chunkIntervalMs)
        : 1000 / clampRate(writingParams.streamWps, 1, 200);

    let count = resumePoint(progress.current, { text, total, replayKey });
    setRevealed(count);
    let last: number | undefined;
    let acc = 0;

    const tick = (now: number) => {
      if (last === undefined) {
        last = now;
      }
      acc += now - last;
      last = now;
      while (acc >= stepMs && count < total) {
        acc -= stepMs;
        count = Math.min(total, count + perStep);
      }
      setRevealed(count);
      progress.current = { text, count, replayKey };
      if (count < total) {
        frame.current = window.requestAnimationFrame(tick);
      }
    };

    frame.current = window.requestAnimationFrame(tick);
    return () => {
      if (frame.current !== undefined) {
        window.cancelAnimationFrame(frame.current);
      }
    };
    // Re-run (replay) whenever the text or the active mode's params change.
  }, [text, writing, writingParams.typeCps, writingParams.streamWps, writingParams.chunkSize, writingParams.chunkIntervalMs, total, replayKey]);

  const shown = writing === "typewriter"
    ? text.slice(0, revealed)
    : tokens.slice(0, revealed).join("").trimEnd();
  const typing = revealed < total;

  return (
    <p data-writing={writing} data-typing={typing}>
      {shown}
      {writing === "typewriter" && typing ? <span className="writing-caret" aria-hidden="true" /> : null}
    </p>
  );
}

export type RevealProgress = { text: string; count: number; replayKey: number };

/**
 * Where the reveal should pick up when the effect re-runs.
 *
 * The whole streaming fix lives in this decision, so it is a pure function rather than an
 * inline condition:
 *
 * - a live model grows `text` one delta at a time, and each growth re-runs the effect. Starting
 *   from zero every time meant a 48-token answer restarted 48 times and never showed more than
 *   its first word — an empty, flickering bubble.
 * - a replay hands over the whole text at once, and re-playing the *same* text is a deliberate
 *   restart. Comparing `replayKey` keeps the replay button working, which a text-only check
 *   would have silently broken.
 */
export function resumePoint(
  previous: RevealProgress,
  next: { text: string; total: number; replayKey: number },
): number {
  const sameReplay = previous.replayKey === next.replayKey;
  const isAppend = previous.text.length > 0 && next.text.startsWith(previous.text);
  if (!sameReplay || !isAppend) return 0;
  return Math.min(previous.count, next.total);
}

function splitWordTokens(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}

function clampRate(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
