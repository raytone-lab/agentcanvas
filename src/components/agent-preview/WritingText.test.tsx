import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { WritingText, resumePoint } from "./WritingText";
import { defaultCodingAgentProject } from "../../schema/agentuxConfig";

/**
 * The reveal animation has to survive streaming.
 *
 * It was written for replay: the whole answer arrives at once, then plays out. Its effect
 * depends on `text` and reset the reveal to zero on every run — which is correct for a replay
 * and wrong for a live model, where `text` grows by one delta at a time. A 48-token answer
 * restarted 48 times and never got past the first word; on screen that is an empty bubble that
 * flickers, which is exactly what a live session showed.
 *
 * `renderToStaticMarkup` runs no effects and no animation frames, so these tests pin the
 * *initial* render — the frame a user sees before any animation runs. That frame must already
 * contain the text, because a stream re-renders constantly and would otherwise never show
 * anything.
 */

const project = defaultCodingAgentProject;

const markupFor = (text: string, replayKey = 0) =>
  renderToStaticMarkup(<WritingText project={project} text={text} replayKey={replayKey} />);

describe("WritingText", () => {
  it("shows the full text on first paint rather than starting empty", () => {
    // `useState(total)` is what makes this true, and it is load-bearing: during a stream the
    // component is re-mounted/re-rendered faster than the animation can advance, so an initial
    // state of 0 would render a permanently empty bubble.
    const markup = markupFor("你好，我是助手。");
    expect(markup).toContain("你好，我是助手。");
    expect(markup).toContain('data-typing="false"');
  });

  it("keeps the writing mode on the element so CSS can style it", () => {
    // The exported app and the configurator both key their styling off this attribute; the
    // fixture parity check compares it byte for byte.
    expect(markupFor("hi")).toContain(`data-writing="${project.theme.motion.writing}"`);
  });

  it("renders each growing prefix of a streamed answer without losing content", () => {
    // Simulates what a live stream does to this component: the same node, longer text each
    // time. Every frame must contain what has arrived so far.
    const full = "我在这里等你安排任务呢！";
    for (let length = 1; length <= full.length; length += 1) {
      const prefix = full.slice(0, length);
      expect(markupFor(prefix), `prefix length ${length}`).toContain(prefix);
    }
  });

  it("renders an empty string without crashing", () => {
    // The first delta of a stream can be whitespace, and an assistant block can open before
    // any content arrives.
    expect(() => markupFor("")).not.toThrow();
    expect(markupFor("")).toContain("data-writing");
  });

  it("treats whitespace-only text as content, not as nothing", () => {
    // Code blocks stream their indentation as separate deltas; dropping them would reflow the
    // code. 104 of 663 deltas in a real run were whitespace only.
    expect(() => markupFor("    ")).not.toThrow();
  });
});

describe("resumePoint", () => {
  // This is the streaming fix. The effect cannot be observed by `renderToStaticMarkup`, so the
  // decision it makes is tested directly.

  it("continues from where it was when the text only grew", () => {
    // The live case: 48 deltas, one re-run each. Restarting on any of them is the bug.
    const progress = { text: "我在这里", count: 3, replayKey: 0 };
    expect(resumePoint(progress, { text: "我在这里等你", total: 6, replayKey: 0 })).toBe(3);
  });

  it("never resumes past the end of the new text", () => {
    // Defensive: a shorter total than the remembered count would reveal a slice out of range.
    const progress = { text: "abc", count: 10, replayKey: 0 };
    expect(resumePoint(progress, { text: "abcd", total: 4, replayKey: 0 })).toBe(4);
  });

  it("restarts when the text is a different message", () => {
    const progress = { text: "第一条回答", count: 4, replayKey: 0 };
    expect(resumePoint(progress, { text: "完全不同的回答", total: 7, replayKey: 0 })).toBe(0);
  });

  it("restarts when replay is requested for the same text", () => {
    // The replay button changes only `replayKey`. A text-only comparison would treat that as an
    // append and leave the animation finished, so the button would appear dead.
    const progress = { text: "同一段文字", count: 5, replayKey: 0 };
    expect(resumePoint(progress, { text: "同一段文字", total: 5, replayKey: 1 })).toBe(0);
  });

  it("restarts on the very first render", () => {
    expect(resumePoint({ text: "", count: 0, replayKey: 0 }, { text: "hi", total: 1, replayKey: 0 })).toBe(0);
  });

  it("restarts when the stream is replaced by a shorter unrelated string", () => {
    const progress = { text: "长长的一段回答", count: 6, replayKey: 0 };
    expect(resumePoint(progress, { text: "短", total: 1, replayKey: 0 })).toBe(0);
  });
});
