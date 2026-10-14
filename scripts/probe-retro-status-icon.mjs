/**
 * How big is 复古风's tool-row status icon, and what is setting that size?
 *
 * Reported as "复古风的这个图标有点大了" over a red box round the file mark on the
 * 正在读取文件 row — and the row below it (正在编辑文件) was *not* boxed, so the
 * question is not "is this style's icon size right" but "why does this one row
 * differ from its neighbour".
 *
 * Measures the container, the SVG inside it, and the text beside it, for every
 * tool row on screen — then asks `CSS.getMatchedStylesForNode` which rule is
 * actually winning, rather than inferring it from the stylesheet.
 *
 *   node scripts/probe-retro-status-icon.mjs [port]
 */
import { writeFileSync } from "node:fs";

import { connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";

const devPort = process.argv[2] ?? "5191";
const PORT = 9365;

const chrome = launchChrome({ port: PORT, userDataDir: "/tmp/retro-status-probe" });
const page = await connectPage({ port: PORT });
await page.send("Page.enable");
await page.send("DOM.enable");
await page.send("CSS.enable");
await page.send("Emulation.setDeviceMetricsOverride", {
  width: 1680, height: 1100, deviceScaleFactor: 2, mobile: false,
});
await page.send("Page.navigate", { url: `http://localhost:${devPort}/editor.html` });
await sleep(4500);

let applied = false;
for (let i = 0; i < 20; i += 1) {
  await evaluate(page, `
    const card = [...document.querySelectorAll(".style-card")]
      .find((c) => c.textContent.includes("复古风") && !c.textContent.includes("像素"));
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
  if (now === "retro") { console.log(`applied 复古风 (attempt ${i + 1})`); applied = true; break; }
}
if (!applied) throw new Error("never reached 复古风");

// The canvas replays, so the tool rows are not there for the first few seconds.
await sleep(6000);

const rows = await evaluate(page, `
  const frame = document.querySelector(".preview-frame");
  const round = (n) => Math.round(n * 10) / 10;
  const out = [];
  for (const card of frame.querySelectorAll(".tool-card")) {
    const holder = card.querySelector(".tool-status-icon");
    if (!holder) continue;
    const svg = holder.querySelector("svg");
    const label = card.querySelector(".tool-card-title, .tool-title, [class*=title]");
    const hb = holder.getBoundingClientRect();
    const sb = svg?.getBoundingClientRect();
    const lcs = label ? getComputedStyle(label) : null;
    out.push({
      text: (card.textContent || "").trim().slice(0, 12),
      fileTool: card.dataset.fileTool ?? null,
      holder: { w: round(hb.width), h: round(hb.height) },
      svg: sb ? { w: round(sb.width), h: round(sb.height) } : null,
      svgViewBox: svg?.getAttribute("viewBox") ?? null,
      lineHeight: lcs ? round(parseFloat(lcs.lineHeight)) : null,
      fontSize: lcs ? round(parseFloat(lcs.fontSize)) : null,
    });
  }
  return {
    retroIcon: getComputedStyle(frame).getPropertyValue("--retro-icon").trim(),
    rows: out,
  };
`);

console.log(JSON.stringify(rows, null, 2));

/* The authoritative answer to "what is setting this". Asked of the *file* row's
   svg, which is the one in the red box. */
const { root } = await page.send("DOM.getDocument", { depth: -1 });
const { nodeId } = await page.send("DOM.querySelector", {
  nodeId: root.nodeId,
  selector: '.preview-frame .tool-card[data-file-tool="true"] .tool-status-icon > svg',
});
if (nodeId) {
  const matched = await page.send("CSS.getMatchedStylesForNode", { nodeId });
  console.log("\nrules painting the boxed svg, weakest → strongest:");
  for (const entry of matched.matchedCSSRules ?? []) {
    const text = entry.rule.style.cssText ?? "";
    if (!/width|height|transform|scale/.test(text)) continue;
    console.log(`  ${entry.rule.selectorList.text}\n      ${text.trim()}`);
  }
} else {
  console.log("\nno file-tool svg on screen — the row may not have replayed yet");
}

const { data } = await page.send("Page.captureScreenshot", { format: "png", clip: {
  x: 560, y: 150, width: 700, height: 420, scale: 2,
} });
writeFileSync("/tmp/retro-status-icon.png", Buffer.from(data, "base64"));
console.log("→ /tmp/retro-status-icon.png");

chrome.kill();
process.exit(0);
