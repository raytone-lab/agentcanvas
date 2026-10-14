import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * The error row's icon does not move, in any style.
 *
 * Four motions used to reach this one 15px element from two stylesheets: a
 * one-second `spin` from `agentmatrix.css` whenever the incident was retryable,
 * and — keyed off which retrying icon the reader had picked — a counter-rotating
 * arrow, a sweeping second hand, and two sand dots falling through an
 * hourglass. Asked for directly, for every style: these icons take no motion.
 *
 * A continuously rotating glyph at that size has no legible frame, so the
 * incident row — the one place a reader most needs to identify a shape — was
 * the one place the shape would not hold still. The row says 正在重试（第 2 次）
 * in words, which is the part that carries the meaning.
 *
 * Asserted three ways because the motion arrived three ways: from the shared
 * component that set the attribute, from a selector list that happened to name
 * this class alongside three others, and from pseudo-elements that
 * `getComputedStyle(el)` does not even see. Verified live as well, style by
 * style — `scripts/probe-error-icon-still.mjs`.
 */
const STYLESHEETS = ["../styles/app.css", "../styles/agentmatrix.css"] as const;

/**
 * Rules that animate something, with comments stripped first.
 *
 * The stripping is not tidiness. The notes in these stylesheets quote the
 * declarations they replaced — the comment left where the hourglass used to be
 * names `.error-icon` and the word "animation" — and a scanner that reads
 * comments reports the explanation as the offence. This exact false positive
 * happened twice while writing this, once here and once in a probe.
 */
function animatedRules(css: string): { line: number; selector: string; value: string }[] {
  const out: { line: number; selector: string; value: string }[] = [];
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "));
  for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].replace(/\s+/g, " ").trim();
    if (!selector) continue;
    for (const decl of match[2].matchAll(/(?:^|;|\s)animation(?:-name)?\s*:\s*([^;]+)/g)) {
      const value = decl[1].trim();
      if (/^none\b/.test(value)) continue;
      out.push({
        line: withoutComments.slice(0, match.index).split("\n").length,
        selector,
        value,
      });
    }
  }
  return out;
}

describe("error row icon motion", () => {
  it("is not animated by any rule in either stylesheet", () => {
    const offenders: string[] = [];
    for (const path of STYLESHEETS) {
      const css = readFileSync(new URL(path, import.meta.url), "utf8");
      for (const rule of animatedRules(css)) {
        // Matches `.error-icon`, `.error-icon svg`, `.error-icon::before`, and
        // the four-class list this used to hide in.
        if (!/\.error-icon\b/.test(rule.selector)) continue;
        offenders.push(`${path}:${rule.line} → ${rule.value}  ${rule.selector.slice(-70)}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("keeps the shared spin rule for the rows that do move", () => {
    /*
     * The fix was to drop one class from a list, not to delete the rule: the
     * status pill, the tool source mark and the lifecycle step row still spin
     * while they are working, and that is not what was asked about. Pinned so
     * "remove the animation" is never read as "remove the animation everywhere".
     */
    const css = readFileSync(new URL("../styles/agentmatrix.css", import.meta.url), "utf8");
    expect(css).toContain('.step-icon[data-anim="spin"] svg');
    expect(css).toContain("animation: am-spin 1s linear infinite");
  });

  it("does not ask for an animation on the error icon in the component", () => {
    /*
     * The attribute is the request; the CSS only answers it. Both halves are
     * checked because either one alone leaves a live path: the attribute with
     * no rule is dead weight that the next style branch could pick up, and a
     * rule with no attribute is what a grep for "animation" finds and
     * reinstates.
     */
    const source = readFileSync(
      new URL("../components/agent-preview/ChatFrame.tsx", import.meta.url),
      "utf8",
    );
    const errorIcon = /<span className="error-icon"([^>]*)>/.exec(source);
    expect(errorIcon, "the error row still renders an .error-icon").not.toBeNull();
    expect(errorIcon?.[1].trim()).toBe("");
    // The helper that chose between the four motions, and its keyframes.
    expect(source).not.toContain("errorIconAnimation");
    for (const keyframe of [
      "retry-rotate-counter",
      "timer-hand-rotate",
      "hourglass-top-sand",
      "hourglass-bottom-sand",
    ]) {
      const css = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");
      expect(css, `${keyframe} left behind`).not.toContain(keyframe);
    }
  });
});

/**
 * The error row is not red on the canvas, in any style.
 *
 * Asked for directly, over a screenshot of four consecutive red rows under one
 * assistant turn — 写入失败 / 正在重试 / 重试耗尽 / 沙箱已关闭 — with the tool rows
 * above them as the reference: 所有风格的画布内容区都不要这个红色，要和工具行的色调
 * 一致.
 *
 * The same shape as the motion problem above, and that is why this lives here:
 * the red also arrived from two independent places, so fixing the obvious one
 * left the row red.
 *
 *   - `agentmatrix.css` sets `.error-icon { color: var(--danger) }` for the
 *     component library. Every style inherited it on the canvas except 原生风,
 *     which had already overridden it locally — with a comment saying exactly
 *     what was later asked for, "the native surface stays calm". That override
 *     is the rule now instead of one style's exception.
 *   - `[data-style-preset="studio"] .error-item > p` reddened the *sentence*,
 *     so that style was the one place the whole row went red. Nothing about the
 *     icon would have caught it.
 *
 * `agentmatrix.css` is deliberately not asserted on: outside the canvas, a run's
 * incident list is a place where red is the point. What changed is the canvas,
 * where four red rows in a column read as an alarm rather than a transcript.
 *
 * Verified live across all thirteen style branches with
 * `scripts/probe-error-row-tone.mjs`, which injects a row and reads the computed
 * colour — that pass is the authoritative one and needs Chrome. This is the half
 * that runs in CI.
 */
describe("the canvas error row is not red", () => {
  const css = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

  /** Rule bodies whose selector mentions the error row, comments stripped. */
  const errorRowRules = () => {
    const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const out: { selector: string; body: string }[] = [];
    for (const m of bare.matchAll(/([^{}]*\.error-(?:item|icon)[^{}]*)\{([^{}]*)\}/g)) {
      out.push({ selector: m[1].trim().replace(/\s+/g, " "), body: m[2] });
    }
    return out;
  };

  it("reaches for --danger in no canvas rule", () => {
    const offenders = errorRowRules()
      .filter((r) => r.selector.includes(".preview-frame"))
      .filter((r) => /var\(--danger\)/.test(r.body))
      .map((r) => r.selector);

    expect(offenders, "canvas error-row rules still painting --danger").toEqual([]);
  });

  /**
   * And the positive half: the canvas rule has to actually *set* a colour, or
   * the row silently falls back to `agentmatrix.css`'s red the moment the
   * override is removed. Pinned to the tool row's own token, which is what
   * "和工具行的色调一致" names.
   */
  it("paints the mark with the tool row's own --text-muted", () => {
    const rule = errorRowRules().find(
      (r) => r.selector === ".preview-frame .error-item .error-icon",
    );

    expect(rule, "the canvas override for the error mark is gone").toBeTruthy();
    expect(rule?.body).toMatch(/color:\s*var\(--text-muted\)/);
    // The same token the tool rows' status mark uses — the stated reference.
    expect(css).toMatch(/\.tool-status-icon\s*\{[^}]*color:\s*var\(--text-muted\)/);
  });
});
