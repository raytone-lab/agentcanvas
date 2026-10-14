/**
 * Style audit template.
 *
 * Copy to /tmp, edit the four legal sets and STYLE, run against a dev server:
 *
 *   npm run dev -- --port 5175      # in another shell
 *   node /tmp/audit.mjs
 *
 * It returns a count. That count is the whole point: a number that has to reach
 * zero is a different kind of instruction from "make the borders look right",
 * and it is the difference between converging in four passes and guessing for
 * an afternoon.
 *
 * What it will not catch: a legal value on the wrong element, and anything not
 * rendered in the default view. Pair it with a static guard over the stylesheet
 * (see src/styles/studioScale.test.ts) — that one runs in CI and catches the
 * declarations this never reaches.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The project's own CDP helpers. `evaluate(page, body)` wraps the body in an
// IIFE, so the body needs an explicit `return`.
import {
  assertReachable,
  connectPage,
  evaluate,
  launchChrome,
} from "../../scripts/lib/cdp.mjs";

const URL_ = "http://localhost:5175/editor.html";
const STYLE = "studio";

// ---- The spec, as four closed sets ---------------------------------------
// Heights are derived, not listed: H = lineBox + 2·padY + 2·border.
const LEGAL_HEIGHT = [28, 36, 40, 44];
const LEGAL_RADIUS = [0, 2, 4, 6, 8];
const LEGAL_FONT_SIZE = [11, 14, 15, 16, 20];
const LEGAL_FONT_WEIGHT = ["500", "600", "700", "800"];
const LEGAL_BORDER_WIDTH = [0, 1, 2];
// The one shadow this style has: zero blur, one offset. Anything else is the
// ambient soft shadow these styles do not use.
// What is allowed to carry a press shadow: things a reader can press. Panels
// and frames are not on this list, which is the point.
const PRESSABLE = /button|primary-button|secondary-button|session-new/;

const chrome = launchChrome({
  port: 9370,
  userDataDir: mkdtempSync(join(tmpdir(), "style-audit-")),
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const click = (page, expr) =>
  evaluate(page, `const el = ${expr}; if (!el) return 'MISS'; el.click(); return 'ok';`);

try {
  await assertReachable(URL_);
  const page = await connectPage({ port: 9370 });
  await page.send("Page.enable", {});
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 1680,
    height: 1050,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.send("Page.navigate", { url: URL_ });
  await wait(7000);

  // Pick the style, then confirm the swap dialog. Driving the real controls
  // rather than setting the attribute directly, because the attribute alone
  // does not apply the theme — `applyTheme` writes to documentElement, and the
  // style kit fills the canvas. Setting one without the others audits a state
  // no reader can actually reach.
  await click(page, `document.querySelector('.style-bar-tab[data-style="${STYLE}"]')`);
  await wait(900);
  await click(
    page,
    `[...document.querySelectorAll('button')].find((b) => /确认更换|Switch/.test(b.textContent))`,
  );
  /*
   * Long enough for the canvas's reply to finish playing.
   *
   * The canvas is no longer a still frame: `useCanvasReplay` reveals the reply
   * one event at a time, with a five-second hold on the thinking block, so a
   * shorter wait measures a half-drawn conversation — and every block that has
   * not arrived yet is silently absent from the audit rather than reported.
   */
  await wait(11000);

  const out = await evaluate(
    page,
    `
    const frame = document.querySelector('.preview-frame');
    const LEGAL_R = ${JSON.stringify(LEGAL_RADIUS)};
    const LEGAL_FS = ${JSON.stringify(LEGAL_FONT_SIZE)};
    const LEGAL_FW = ${JSON.stringify(LEGAL_FONT_WEIGHT)};
    const LEGAL_BW = ${JSON.stringify(LEGAL_BORDER_WIDTH)};
    const PRESSABLE = ${PRESSABLE};
    const fails = [];
    const px = (v) => Math.round(parseFloat(v) || 0);

    frame.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      // Collapsed and hidden nodes carry values nobody can see.
      if (rect.width < 2 || rect.height < 2) return;
      const tag = el.tagName.toLowerCase() + '.' + [...el.classList].slice(0, 2).join('.');

      const radius = px(cs.borderTopLeftRadius);
      // Pills use a huge radius to mean "fully round"; that is a shape, not a
      // tier, so it is exempt.
      if (radius > 0 && radius < 900 && !LEGAL_R.includes(radius)) {
        fails.push('radius ' + radius + '  ' + tag);
      }

      /*
       * Shadows, judged by two separate questions — and the second is the one
       * that was missing.
       *
       *   Is it this style's kind of shadow?  Zero blur. A blurred ambient
       *   shadow belongs to a different vocabulary.
       *
       *   Is it on something that can cast it?  This is the check that let a
       *   3px black rule ship across the conversation column. \`0 3px 0 0\` is
       *   the one legal shadow, so a shape-only test passed it — on a tool
       *   card, a utility card and the composer frame, none of which can be
       *   pressed.
       *
       * The second question has two failure modes, and both shipped:
       *   1. The element spans the column, so there is no 'around' from which
       *      to see an edge. It reads as a rule drawn across the view.
       *   2. The element paints no face at all, so the shadow is the only
       *      thing drawn — a detached arc tracing the corner of an invisible
       *      button.
       *
       * And one shape that is *not* a failure: an offset on both axes. That
       * reads as a second card sitting behind the first, which is a deliberate
       * effect. A single-axis offset is what reads as an edge. So the test is
       * "flat and offset on exactly one axis", not "flat and offset".
       *
       * Two properties make any of this invisible to the usual tools: a shadow
       * is not an element, so \`querySelectorAll('*')\` never sees it, and it is
       * not hit-testable, so \`elementFromPoint\` returns whatever is behind it.
       * It was found by scanning the rendered pixels for a long dark row.
       */
      for (const triple of cs.boxShadow.match(/-?[0-9.]+px\\s+-?[0-9.]+px\\s+-?[0-9.]+px/g) || []) {
        const [dx, dy, blur] = triple.match(/-?[0-9.]+/g).map(Number);
        if (blur > 0.5) {
          fails.push('blurred shadow  ' + tag);
          continue;
        }
        const flatX = Math.abs(dx) < 0.5;
        const flatY = Math.abs(dy) < 0.5;
        // Both zero is a ring — a border by another name. Neither zero is a
        // card behind a card. Exactly one zero is an edge.
        if (flatX === flatY) continue;
        const facePainted =
          cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0;
        if (!PRESSABLE.test(tag) && rect.width > 400) {
          fails.push('one-axis flat shadow on a wide panel  ' + tag);
        } else if (!facePainted) {
          fails.push('one-axis flat shadow with no face in front of it  ' + tag);
        }
      }

      // Only elements holding text directly: an ancestor's inherited size is
      // its own violation, reported once where it is declared.
      const holdsText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (holdsText) {
        if (!LEGAL_FS.includes(px(cs.fontSize))) fails.push('font-size ' + px(cs.fontSize) + '  ' + tag);
        if (!LEGAL_FW.includes(cs.fontWeight)) fails.push('font-weight ' + cs.fontWeight + '  ' + tag);
      }

      const borderWidth = px(cs.borderTopWidth);
      if (!LEGAL_BW.includes(borderWidth)) fails.push('border-width ' + borderWidth + '  ' + tag);
    });

    // The two derived heights, checked by name: these are what the reader
    // pointed at, and a formula is only worth having if its output is measured.
    const bubble = frame.querySelector('.msg-surface');
    const pill = frame.querySelector('.session-item-shell[data-active="true"] .session-item-bg');
    return {
      bubbleH: bubble ? Math.round(bubble.getBoundingClientRect().height) : null,
      pillH: pill ? Math.round(pill.getBoundingClientRect().height) : null,
      failCount: fails.length,
      // Deduped: one bad rule paints many elements, and thirty copies of the
      // same line hides the other four families.
      fails: [...new Set(fails)].slice(0, 18),
    };
  `,
  );

  console.log(JSON.stringify(out, null, 1));
  console.log(`\nlegal heights (derived): ${LEGAL_HEIGHT.join(", ")}`);
} finally {
  chrome.kill();
}
