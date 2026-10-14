import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { chatCopy } from "../../i18n/copy/chat";

const source = readFileSync(new URL("./ReasoningBlock.tsx", import.meta.url), "utf8");

/**
 * The thinking clock.
 *
 * It used to hold `null` for the whole wait and take a single measurement when
 * the span closed, so the only number the reader ever saw was the total and the
 * wait itself was silent. Now it counts while the block is open.
 */
describe("reasoning elapsed label", () => {
  it("counts while the span is open rather than only at the end", () => {
    // The interval is what makes it a clock; without it the label is a still
    // frame with a number on it.
    expect(source).toContain("window.setInterval(tick, 1000)");
    expect(source).toContain("window.clearInterval(timer)");
    // The final value still comes from the transition, so a run that ends
    // between ticks reports what it actually took rather than the last tick.
    expect(source).toContain("setThinkingMs(Date.now() - startedAtRef.current);");
  });

  it("opens at 1s instead of flashing 0s", () => {
    expect(source).toContain("Math.max(1, Math.round(thinkingMs / 1000))");
  });

  it("switches to minutes past 60s instead of growing the seconds", () => {
    // "Thought for 143s" is a number the reader has to divide.
    expect(source).toContain("if (total < 60) return short");
    expect(source).toContain("Math.floor(total / 60)");
    expect(source).toContain("total % 60");
  });

  it("carries a finished phrase and an appendable fragment, in every locale", () => {
    // The running form is a *suffix* rather than a phrase, because the title it
    // joins may be a cycling stage name — "Thinking for 12s" cannot compose
    // with "Reading files". The finished form stays a whole phrase.
    for (const [locale, copy] of Object.entries(chatCopy)) {
      for (const key of ["reasonedFor", "reasonedForLong", "elapsedSuffix", "elapsedSuffixLong"] as const) {
        const value = copy.reasoning[key];
        expect(value, `${locale}.${key}`).toBeTruthy();
        expect(value, `${locale}.${key} needs a seconds slot`).toContain("{seconds}");
      }
      expect(copy.reasoning.reasonedForLong, `${locale} long form`).toContain("{minutes}");
      expect(copy.reasoning.elapsedSuffixLong, `${locale} long form`).toContain("{minutes}");
    }
  });

  it("composes the glyph, the words and the clock instead of choosing between them", () => {
    /*
     * The three used to displace each other, because the text cycle was a value
     * of `theme.motion.reasoning` — the same field the glyphs use — so picking
     * it lost the glyph, and the clock replaced the cycling words.
     *
     * Now: the glyph comes from the motion, the words from `textCycle`, the
     * clock from `doneStyle`. None of the three reads a field another writes.
     */
    expect(source).toContain("const cyclesStages = project.reasoning.textCycle;");
    expect(source).toContain("const runningClock = timedStyle");
    expect(source).toContain("const runningTitle = cyclesStages");
    // Clock without cycling text: the card's own phrase, so the two agree.
    expect(source).toContain("elapsedLabel(copy.chat.reasoning.reasonedFor, copy.chat.reasoning.reasonedForLong)");
    // Clock with cycling text: a suffix, because a phrase cannot compose with a
    // phrase.
    expect(source).toContain("runningClock ? `${stageLabel} ${runningClock}` : stageLabel");
    // The glyph is rendered from the motion, unconditionally — not gated on
    // either of the other two.
    expect(source).toContain("<ReasoningIndicator motion={project.theme.motion.reasoning} active={running} />");
  });
});
