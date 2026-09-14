import { useEffect, useRef, useState } from "react";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";

/**
 * Progressive reveal of assistant text for the preview. Unlike a CSS clip/width
 * animation (which wipes the whole block at once and can't follow wrapped
 * lines), this reveals real substrings over time so the text types out
 * character-by-character (typewriter), word-by-word (smooth stream), or
 * chunk-by-chunk (chunked) — flowing naturally line by line.
 */
export function WritingText({
  project,
  text,
  replayKey = 0,
  mode,
}: {
  project: AgentFrontendProject;
  text: string;
  replayKey?: number;
  /**
   * Which rhythm to reveal at. Defaults to the answer's
   * (`theme.motion.writing`); the reasoning body passes its own
   * (`reasoning.writing`), because the thinking and the answer are two
   * surfaces the reader can want written out differently.
   *
   * The *speeds* stay shared (`writingParams`) — how fast text appears is one
   * reading pace for the product, not a per-surface setting.
   */
  mode?: AgentFrontendProject["theme"]["motion"]["writing"];
}) {
  const { writingParams } = project.theme.motion;
  const writing = mode ?? project.theme.motion.writing;
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

/**
 * Han, kana, CJK punctuation and full-width forms: the scripts that put no
 * spaces between words.
 */
const CJK_RANGES =
  "\\u3000-\\u303f\\u3040-\\u30ff\\u31f0-\\u31ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\ufe30-\\ufe4f\\uff00-\\uff60\\uffe0-\\uffe6";
const HAS_CJK = new RegExp(`[${CJK_RANGES}]`);
/** One CJK character, one run of everything else, or one run of whitespace. */
const CJK_TOKEN = new RegExp(`[${CJK_RANGES}]|[^${CJK_RANGES}\\s]+|\\s+`, "g");

/**
 * The units a stream reveals one at a time.
 *
 * Splitting on whitespace is right for English and useless for Chinese: 正在理解你的需求
 * has no spaces, so a whole line came out as a single token and 平滑流式 / 分块 finished
 * in one step — on screen, text that simply appeared. Inside a CJK run each character
 * is its own unit; Latin words and numbers embedded in the line stay whole.
 */
function splitWordTokens(text: string): string[] {
  const words = text.match(/\S+\s*/g) ?? [];
  if (!HAS_CJK.test(text)) return words;

  const tokens: string[] = [];
  for (const word of words) {
    for (const part of word.match(CJK_TOKEN) ?? [word]) {
      // Trailing whitespace rides along with the character before it, so a
      // newline never costs a tick that reveals nothing.
      if (/^\s+$/.test(part) && tokens.length > 0) {
        tokens[tokens.length - 1] += part;
      } else {
        tokens.push(part);
      }
    }
  }
  return tokens;
}

function clampRate(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
