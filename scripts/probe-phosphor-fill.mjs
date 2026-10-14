/**
 * Which Phosphor icons degrade to a knocked-out square at `weight="fill"`?
 *
 * Phosphor's fill weight has nothing to fill for a glyph that is only strokes
 * (Check, X, Plus …), so for those it draws a full-bleed rounded rect with the
 * glyph reversed out. On a 15px sidebar mark that reads as a heavy block, not as
 * ink — and Check / X / Plus are the three marks 水墨风's timeline uses most.
 *
 * So this measures, rather than assuming: every candidate rendered at fill,
 * 22px, on white, and the fraction of dark pixels in its box. A real silhouette
 * lands well under 0.5; a knocked-out square lands far above it, because the
 * square *is* the mark.
 *
 * Output is the exemption list that `inkIcons.tsx` renders at `bold` instead,
 * and `inkFillExemptions.test.ts` pins it so the list cannot quietly grow.
 *
 *   node scripts/probe-phosphor-fill.mjs [port]
 */
import { writeFileSync } from "node:fs";

import { connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";

const devPort = process.argv[2] ?? "5191";
const PORT = 9363;

/* The whole vocabulary 水墨风 is about to draw with — the 37 marks behind its
   `ink-*` option ids, plus the expansion that lets 141 positions stop sharing
   twelve drawings. Measured together because the threshold has to be one
   number for the set, not a judgement per icon. */
const NAMES = [
  // the 37 behind the `ink-*` ids
  "Warning", "FlowerLotus", "PaintBrush", "ChatTeardrop", "ChatTeardropDots", "Check",
  "CaretDown", "CaretRight", "Copy", "X", "ArrowsClockwise", "Disc", "NotePencil",
  "BookOpenText", "FileMagnifyingGlass", "Files", "Drop", "CircleDashed", "File", "Folder",
  "GlobeHemisphereEast", "Hourglass", "Image", "ListDashes", "Microphone", "SidebarSimple",
  "Pause", "Plus", "Question", "ArrowUUpLeft", "MagnifyingGlass", "CaretUpDown",
  "PaperPlaneTilt", "ShieldCheck", "Stamp", "TerminalWindow", "Cloud",
  // the expansion
  "Brain", "GitBranch", "GitDiff", "Gauge", "Gear", "Sparkle", "Star", "Rocket", "Play",
  "Stop", "DownloadSimple", "FloppyDisk", "Bug", "Bell", "Eye", "Stack", "Cube",
  "SpeakerHigh", "FileAudio", "FileVideo", "FileCode", "Code", "Tent", "Robot",
  "Clock", "Info", "ShieldWarning", "ShieldSlash", "Prohibit", "Trash", "ArrowUp",
  "ArrowUpRight", "CornersOut", "CornersIn", "Paperclip", "ThumbsUp", "ThumbsDown",
  "Crosshair", "Mountains", "Wind", "Moon", "PenNib", "Scroll", "Circle", "CheckCircle",
  "WarningCircle", "SlidersHorizontal", "Compass", "MapPin", "Database", "HardDrives",
  "Plugs", "PuzzlePiece", "Broadcast", "Minus", "Equals", "ArrowRight", "ArrowLeft",
  "CaretUp", "DotsThree", "Lightning", "Fire", "Leaf", "Path", "Waves",
];

/*
 * The signature of a knocked-out square, and it took two passes to get right.
 *
 * Absolute coverage does not separate them: `Check` at fill measures 0.511 and
 * `Circle` 0.517, but the first is a box with a tick reversed out of it and the
 * second is a solid disc, which is the most ink-like mark in the set.
 *
 * The fill/bold *ratio* is the real signal — a glyph with a body gains 1.5–2.3x
 * when filled, a glyph that is only strokes gains 3–8x because the fill weight
 * has to invent a body for it. Alone it over-reports: `DotsThree` gains 7.9x and
 * is three honest dots.
 *
 * So both, conjoined. The square is a rounded rect at Phosphor's own padding
 * (~0.81 of the side) with the glyph cut out of it, which lands in a narrow
 * coverage band; the ratio then tells a box apart from a disc that happens to
 * cover the same area.
 */
const SQUARE_COVERAGE = [0.45, 0.55];
const SQUARE_RATIO = 3;
const isBlock = (r) =>
  r.fill >= SQUARE_COVERAGE[0] && r.fill <= SQUARE_COVERAGE[1] && r.fill / r.bold >= SQUARE_RATIO;

const chrome = launchChrome({ port: PORT, userDataDir: "/tmp/phosphor-fill-probe" });
const page = await connectPage({ port: PORT });
await page.send("Page.enable");
await page.send("Emulation.setDeviceMetricsOverride", {
  width: 900, height: 600, deviceScaleFactor: 1, mobile: false,
});
await page.send("Page.navigate", { url: `http://localhost:${devPort}/icon-weights.html` });
await sleep(4000);

/*
 * Rasterise each glyph in the page rather than screenshotting a contact sheet:
 * an OffscreenCanvas per icon gives an exact per-mark coverage number, where a
 * screenshot would need the marks located first. `Ph` is already on the page's
 * module graph via `icon-weights.html`, so this reuses the installed copy.
 */
const report = await evaluate(page, `
  return (async () => {
    const names = ${JSON.stringify(NAMES)};
    if (!window.__ink) throw new Error("icon-weights.html did not publish window.__ink");
    const { Ph, React, createRoot } = window.__ink;

    /* Rendered through the real client renderer into an off-document host, then
       serialised — not \`react-dom/server\`, which resolves to the Node build in
       a browser module graph and throws on import. */
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-9999px";
    document.body.appendChild(host);

    const WEIGHTS = ["fill", "bold"];
    const present = names.filter((n) => Ph[n]);
    createRoot(host).render(
      React.createElement(
        "div",
        null,
        present.flatMap((name) =>
          WEIGHTS.map((weight) =>
            React.createElement("span", { key: name + weight, "data-k": name + "|" + weight },
              React.createElement(Ph[name], { size: 64, weight, color: "#000" })))),
      ),
    );
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const coverage = async (svg) => {
      const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.outerHTML);
      const bmp = await new Promise((ok, no) => {
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = () => no(new Error("decode"));
        img.src = url;
      });
      const c = new OffscreenCanvas(64, 64);
      const ctx = c.getContext("2d");
      ctx.drawImage(bmp, 0, 0, 64, 64);
      const { data } = ctx.getImageData(0, 0, 64, 64);
      let dark = 0;
      // The glyph is black on transparent, so alpha is ink.
      for (let i = 3; i < data.length; i += 4) if (data[i] > 128) dark += 1;
      return dark / (64 * 64);
    };

    const rows = [];
    for (const name of names) {
      if (!Ph[name]) { rows.push({ name, missing: true }); continue; }
      const pick = (weight) =>
        host.querySelector('[data-k="' + name + "|" + weight + '"] svg');
      const fillSvg = pick("fill");
      const boldSvg = pick("bold");
      if (!fillSvg || !boldSvg) { rows.push({ name, missing: true }); continue; }
      rows.push({ name, fill: await coverage(fillSvg), bold: await coverage(boldSvg) });
    }
    return rows;
  })();
`);

const missing = report.filter((r) => r.missing).map((r) => r.name);
const measured = report.filter((r) => !r.missing);
const blocks = measured.filter(isBlock);

console.log(`measured ${measured.length} names · ${missing.length} missing · ${blocks.length} block at fill`);
if (missing.length) console.log(`\nMISSING (fix the name):\n  ${missing.join(", ")}`);

console.log(`\nBLOCK AT FILL — render these at bold:`);
for (const r of blocks.sort((a, b) => b.fill / b.bold - a.fill / a.bold)) {
  console.log(`  ${r.name.padEnd(22)} fill ${r.fill.toFixed(3)}  bold ${r.bold.toFixed(3)}  ${(r.fill / r.bold).toFixed(2)}x`);
}

/* The near-misses, printed because the classifier is a heuristic over a narrow
   band and the eye is the court of last resort. These are the ones to look at
   in the strip below before trusting the list above. */
const near = measured
  .filter((r) => !isBlock(r) && r.fill / r.bold >= 2 && r.fill >= 0.4)
  .sort((a, b) => b.fill / b.bold - a.fill / a.bold);
console.log(`\nnear misses (kept at fill — confirm by eye):`);
for (const r of near) {
  console.log(`  ${r.name.padEnd(22)} fill ${r.fill.toFixed(3)}  bold ${r.bold.toFixed(3)}  ${(r.fill / r.bold).toFixed(2)}x`);
}

writeFileSync("/tmp/phosphor-fill-report.json", JSON.stringify(report, null, 2));
console.log("\nfull table → /tmp/phosphor-fill-report.json");

/* Bring the flagged set and the near misses on screen at both weights. A
   classifier over a 0.1-wide coverage band is worth exactly as much as the
   picture it produces, so the picture is part of the output. */
const strip = [...blocks.map((r) => r.name), ...near.map((r) => r.name)];
await evaluate(page, `
  const names = ${JSON.stringify(strip)};
  const { Ph, React, createRoot } = window.__ink;
  const host = document.createElement("div");
  host.id = "verdict";
  host.style.cssText = "position:fixed;inset:0;z-index:99;background:#F3F0E9;color:#3A3F46;padding:24px;font:12px ui-monospace,Menlo,monospace";
  document.body.appendChild(host);
  const row = (weight, size) => React.createElement("div",
    { style: { display: "flex", alignItems: "center", gap: "0" } },
    React.createElement("span", { style: { width: "110px", opacity: 0.6 } }, weight + " " + size + "px"),
    names.map((n) => React.createElement("span",
      { key: n + weight + size, style: { width: "56px", display: "grid", placeItems: "center", height: "34px" } },
      React.createElement(Ph[n], { size, weight }))));
  createRoot(host).render(React.createElement("div", null,
    React.createElement("div", { style: { display: "flex", marginBottom: "6px" } },
      React.createElement("span", { style: { width: "110px" } }, ""),
      names.map((n) => React.createElement("span",
        { key: n, style: { width: "56px", fontSize: "8px", opacity: 0.7, wordBreak: "break-all", textAlign: "center" } }, n))),
    row("fill", 15), row("fill", 22), row("bold", 15), row("bold", 22)));
`);
await sleep(1200);
const { data } = await page.send("Page.captureScreenshot", {
  format: "png",
  clip: { x: 0, y: 0, width: Math.min(900, 120 + strip.length * 56 + 30), height: 180, scale: 2 },
});
writeFileSync("/tmp/phosphor-fill-verdict.png", Buffer.from(data, "base64"));
console.log("verdict strip → /tmp/phosphor-fill-verdict.png");

chrome.kill();
process.exit(0);
