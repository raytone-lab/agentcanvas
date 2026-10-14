/**
 * Which 复古风 marks have their stroke clipped by their own viewBox?
 *
 * Reported as "他底部没有展示全" over the file mark: the sheet had no bottom
 * border. Not a CSS clip — the path itself ends at y=19.2 inside a
 * `viewBox="0 0 19 19"`, and `strokeWidth: 1.38` puts the outline's outer edge
 * at y≈19.89, so the bottom 0.89 units are outside the viewport and never
 * painted. Resizing the icon scales the clipping with it, which is why making
 * it smaller did not help.
 *
 * The set is drawn on the reference's 18.86 grid in a 19 viewBox — 0.14 of
 * slack against the 0.69 a centred 1.38 stroke needs on each side — so this
 * measures every mark rather than the one that was pointed at.
 *
 * `getBBox()` excludes stroke, so the half-weight is added back explicitly.
 *
 *   node scripts/probe-retro-clipping.mjs [port]
 */
import { writeFileSync } from "node:fs";

import { connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";

const devPort = process.argv[2] ?? "5191";
const PORT = 9366;

const chrome = launchChrome({ port: PORT, userDataDir: "/tmp/retro-clip-probe" });
const page = await connectPage({ port: PORT });
await page.send("Page.enable");
await page.send("Emulation.setDeviceMetricsOverride", {
  width: 1680, height: 1200, deviceScaleFactor: 1, mobile: false,
});
await page.send("Page.navigate", { url: `http://localhost:${devPort}/icon-sheet.html?style=retro` });
await sleep(4500);

const report = await evaluate(page, `
  const round = (n) => Math.round(n * 100) / 100;
  const rows = [];
  for (const svg of document.querySelectorAll("svg")) {
    const vb = svg.getAttribute("viewBox");
    if (vb !== "0 0 19 19") continue;

    const half = (parseFloat(svg.getAttribute("stroke-width")) || 0) / 2;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const child of svg.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon")) {
      const b = child.getBBox();
      // A child may override the shared weight.
      const own = parseFloat(child.getAttribute("stroke-width"));
      const m = (Number.isFinite(own) ? own : half * 2) / 2;
      // A child with stroke:none contributes no outline margin.
      const none = child.getAttribute("stroke") === "none";
      const pad = none ? 0 : m;
      x0 = Math.min(x0, b.x - pad); y0 = Math.min(y0, b.y - pad);
      x1 = Math.max(x1, b.x + b.width + pad); y1 = Math.max(y1, b.y + b.height + pad);
    }
    if (!Number.isFinite(x0)) continue;

    const over = {
      top: round(Math.max(0, 0 - y0)),
      left: round(Math.max(0, 0 - x0)),
      bottom: round(Math.max(0, y1 - 19)),
      right: round(Math.max(0, x1 - 19)),
    };
    const worst = Math.max(over.top, over.left, over.bottom, over.right);
    rows.push({
      name: svg.closest(".cell")?.querySelector(".id")?.textContent?.trim() ?? "(?)",
      inked: [round(x0), round(y0), round(x1), round(y1)],
      over,
      worst: round(worst),
    });
  }
  return rows;
`);

const clipped = report.filter((r) => r.worst > 0.01).sort((a, b) => b.worst - a.worst);
const seen = new Map();
for (const r of clipped) if (!seen.has(r.name)) seen.set(r.name, r);

console.log(`${report.length} retro marks measured · ${seen.size} distinct clipped\n`);
console.log("name".padEnd(26), "worst", " top  left  bot right");
for (const r of seen.values()) {
  console.log(
    r.name.padEnd(26),
    String(r.worst).padEnd(6),
    [r.over.top, r.over.left, r.over.bottom, r.over.right].map((n) => String(n).padStart(5)).join(" "),
  );
}

const worst = Math.max(0, ...report.map((r) => r.worst));
console.log(`\nworst overflow across the set: ${Math.round(worst * 100) / 100} units`);
console.log(`a viewBox of "${-worst} ${-worst} ${19 + worst * 2} ${19 + worst * 2}" would clear every mark`);

writeFileSync("/tmp/retro-clipping.json", JSON.stringify(report, null, 2));

chrome.kill();
process.exit(0);
