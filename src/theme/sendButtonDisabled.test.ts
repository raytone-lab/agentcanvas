import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");
const composer = readFileSync(
  new URL("../components/agent-preview/ComposerFrame.tsx", import.meta.url),
  "utf8",
);

const SHARED = '.preview-frame[data-style-preset] .ui-button.send-button[data-size]:disabled';

describe("the send key, with nothing to send", () => {
  it("is disabled in the markup and greyed in every style", () => {
    /*
     * Reported across every style: the composer opens empty and the key was
     * still painted at full strength. The markup was already right — the bug
     * was entirely in the paint, in the eight styles that had not written a
     * `:disabled` branch of their own.
     */
    expect(composer).toContain("disabled={!isRunning && !canSubmit}");
    expect(composer).toContain("const canSubmit = promptValue.trim().length > 0 || attachedFiles.length > 0;");

    const at = css.indexOf(SHARED + " {");
    expect(at, "the shared disabled rule is gone").toBeGreaterThan(-1);
    const body = css.slice(at, css.indexOf("}", at));
    expect(body).toContain("grayscale(1)");
  });

  it("wins the cascade against every style's own send rule", () => {
    /*
     * Two ways this rule can stop working, and both are silent.
     *
     * Specificity: a style's send rule is (0,5,0) and this is (0,6,0), so it
     * clears them — but the four styles that also use `:disabled` tie at
     * (0,6,0) and are settled by *order*. So the shared rule has to be last.
     */
    const shared = css.indexOf(SHARED + " {");
    // The matcher anchors on `.ui-button…`, which is where the compound starts
    // rather than where the selector does — so the shared rule's own match is
    // offset by its `.preview-frame[data-style-preset] ` prefix. Comparing the
    // two anchors directly reported the rule as sitting after itself.
    const sharedCompound = shared + SHARED.indexOf(".ui-button");
    const others = [...css.matchAll(/\.ui-button\.send-button\[data-size\][^{,]*:disabled[^{]*\{/g)]
      .map((m) => m.index ?? -1)
      .filter((i) => i !== sharedCompound);
    for (const i of others) {
      expect(i, "a style's disabled send rule sits after the shared one").toBeLessThan(shared);
    }
  });

  it("lets 复古风 name its two colours instead of being greyed", () => {
    /*
     * Asked for by reference, not as hex: empty is the fill of the reader's own
     * bubble, live is the darkest value in the reader's own avatar. Measured:
     * the bubble is `--accent-soft`, and the avatar's figure (`--avatar-fg`)
     * resolves to `--accent`, which is the darkest of its three values — the
     * stroke and the ground are mixes above it. Tokens, so both follow all four
     * of the style's colourways.
     *
     * This style therefore cancels the shared greyscale: the colours *are* the
     * signal here, and a 45% wash on top would mute the answer. It can only do
     * that at (0,7,0) — the shared rule is last in the file, so order is not
     * available.
     */
    const at = css.indexOf(
      '.preview-frame[data-style-preset="retro"] .ui-button.send-button[data-size]:not([data-running="true"]):disabled {',
    );
    expect(at, "retro's disabled send rule is gone").toBeGreaterThan(-1);
    const body = css.slice(at, css.indexOf("}", at));
    expect(body).toContain("filter: none");
    expect(body).toContain("background-color: var(--accent-soft)");

    /*
     * Every body for the selector, not the first. This style declares it twice
     * — an earlier block sizes the key at 46px and fills it with
     * `--text-primary`, and this one, later and at the same specificity, wins
     * both. Reading only the first found the old fill and reported the new one
     * missing.
     */
    const selector =
      '.preview-frame[data-style-preset="retro"] .ui-button.send-button[data-size]:not([data-running="true"]) {';
    const bodies: string[] = [];
    for (let at = css.indexOf(selector); at >= 0; at = css.indexOf(selector, at + 1)) {
      bodies.push(css.slice(at, css.indexOf("}", at)));
    }
    const live = bodies.join("\n");
    expect(live).toContain("background-color: var(--accent)");
    // The supplied plate is a single baked colour, so it cannot carry two
    // states; the arrow is masked for the same reason.
    expect(live).toContain("background-image: none");
    expect(css).toContain('mask: url("/retro/send-arrow.svg") center / contain no-repeat');
  });

  it("keys on the attribute the export actually emits", () => {
    /*
     * `[data-style-preset]` and not `[data-style-id]`. The exported shell sets
     * only the former (`scaffoldManifest.ts` renders the frame with
     * `data-style-preset={project.theme.stylePreset}` and no style id), so a
     * rule written the other way would have fixed the editor's canvas and left
     * every exported app with a lit key. The same reason the right panel's
     * no-fill rules do *not* reach the export — a known gap, and not one to
     * widen.
     */
    const at = css.indexOf(SHARED + " {");
    const selector = css.slice(css.lastIndexOf("\n", at) + 1, at + SHARED.length);
    expect(selector).not.toContain("data-style-id");
  });
});
