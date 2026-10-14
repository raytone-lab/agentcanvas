/**
 * Do 水墨风's new marks actually reach the canvas, and at the right weight?
 *
 * The contact sheet (`/icon-sheet.html`) imports the icon registry *without*
 * the stylesheet, so it cannot see a CSS rule painting over a mark — which is
 * precisely how 复古风's icon bug survived four rounds of source reading
 * (`probe-retro-icons.mjs`). This one drives the real editor: applies the
 * style, waits out the replay, then reads every `.ink-icon` the frame rendered
 * and reports the weight each resolved to plus how many distinct marks are on
 * screen.
 *
 *   node scripts/probe-ink-canvas.mjs [port]
 */
import { writeFileSync } from "node:fs";

import { connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";

const devPort = process.argv[2] ?? "5191";
const PORT = 9364;

const chrome = launchChrome({ port: PORT, userDataDir: "/tmp/ink-canvas-probe" });
const page = await connectPage({ port: PORT });
await page.send("Page.enable");
await page.send("Emulation.setDeviceMetricsOverride", {
  width: 1680, height: 1100, deviceScaleFactor: 2, mobile: false,
});
await page.send("Page.navigate", { url: `http://localhost:${devPort}/editor.html` });
await sleep(4500);

/* Apply, then confirm — the retro probe's lesson: firing once and trusting it
   reports a clean pass on the style you never left. */
let applied = false;
for (let i = 0; i < 20; i += 1) {
  await evaluate(page, `
    const card = [...document.querySelectorAll(".style-card")]
      .find((c) => c.textContent.includes("水墨"));
    if (card) {
      card.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      const apply = [...card.querySelectorAll("button")].find((b) => /应用|Apply/.test(b.textContent));
      if (apply) apply.click();
    }
    return true;
  `);
  await sleep(1200);
  const now = await evaluate(
    page,
    `return document.querySelector(".preview-frame")?.dataset.stylePreset ?? null;`,
  );
  if (now === "inkwash") {
    console.log(`applied 水墨风 (attempt ${i + 1})`);
    applied = true;
    break;
  }
}
if (!applied) throw new Error("never reached 水墨风");

/* The canvas replays a conversation, so the tool rows do not exist yet. */
await sleep(6000);

const report = await evaluate(page, `
  const frame = document.querySelector(".preview-frame");
  const marks = [...frame.querySelectorAll("svg.ink-icon")];
  const byWeight = {};
  const shapes = new Set();
  const lucideLeftovers = [];

  for (const svg of marks) {
    const w = svg.dataset.inkWeight ?? "(none)";
    byWeight[w] = (byWeight[w] ?? 0) + 1;
    // The path geometry is the mark's identity — two slots drawing one picture
    // is the collapse this revision removed.
    shapes.add([...svg.querySelectorAll("path")].map((p) => p.getAttribute("d")).join("|"));
  }

  /* Anything in the frame that is still a lucide outline. Phosphor renders a
     256 viewBox, lucide a 24 — so the viewBox tells them apart without
     depending on class names. */
  for (const svg of frame.querySelectorAll("svg")) {
    if (svg.classList.contains("ink-icon")) continue;
    if (svg.getAttribute("viewBox") === "0 0 24 24") {
      lucideLeftovers.push(svg.dataset.lucideName ?? svg.dataset.iconSlot ?? "(anonymous)");
    }
  }

  return {
    total: marks.length,
    byWeight,
    distinctShapes: shapes.size,
    lucideLeftovers: [...new Set(lucideLeftovers)],
    fills: getComputedStyle(marks[0] ?? frame).fill,
  };
`);

console.log(JSON.stringify(report, null, 2));

const { data } = await page.send("Page.captureScreenshot", { format: "png", clip: {
  x: 0, y: 0, width: 1680, height: 1100, scale: 0.75,
} });
writeFileSync("/tmp/ink-canvas.png", Buffer.from(data, "base64"));
console.log("→ /tmp/ink-canvas.png");

chrome.kill();
process.exit(0);
