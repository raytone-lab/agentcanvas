/**
 * Probe: the icons on the tool-call rows (Reading file / Editing file / …).
 *
 * Dev-only, throwaway. Reported as "为什么所有的图标又都变成这样了" over a red
 * box round the icon column, so this answers two questions and nothing else:
 * which glyph is actually being drawn, and what is painting it that colour.
 *
 * The canvas opens as the empty skeleton, so the probe has to build the state
 * it wants to measure: open 对话区 and tick everything in it, which is what
 * puts the five tool calls of the canvas timeline on screen.
 *
 *   URL=http://localhost:5180/editor.html node scripts/probe-tool-row-icons.mjs
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { assertReachable, connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";

const URL_ = process.env.URL ?? "http://localhost:5180/editor.html";
const PORT = Number(process.env.CDP_PORT ?? 9347);

const LABELS = JSON.stringify([
  "Reading file", "Editing file", "Validating", "Searching", "Running command",
  "正在读取文件", "正在编辑文件", "正在验证", "正在搜索", "正在执行命令",
  "读取文件", "编辑文件", "验证", "搜索文件", "执行命令",
]);

const chrome = launchChrome({ port: PORT, userDataDir: mkdtempSync(join(tmpdir(), "toolicon-probe-")) });
try {
  await assertReachable(URL_);
  const page = await connectPage({ port: PORT });
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 1680, height: 1300, deviceScaleFactor: 2, mobile: false,
  });
  await page.send("Page.navigate", { url: URL_ });
  await sleep(3500);

  console.log("group 对话区:", await evaluate(
    page,
    `const row = [...document.querySelectorAll("button.layers-row.group-row")]
       .find((el) => (el.textContent || "").trim() === "对话区");
     if (!row) return "MISS";
     row.click();
     return "ok";`,
  ));
  await sleep(1200);

  // Tick the lot. Which option owns the tool rows is exactly what is unknown,
  // and the canvas is a showcase — everything on is a legitimate state.
  console.log("ticked:", await evaluate(
    page,
    `const buttons = [...document.querySelectorAll(".preset-panel-body button.preset-option")];
     buttons.forEach((b) => b.click());
     return buttons.length;`,
  ));
  // The five tool calls arrive over the replay, so wait past the whole reply.
  await sleep(14000);

  console.log("style:", await evaluate(
    page,
    `const frame = document.querySelector(".preview-frame");
     return JSON.stringify({ stylePreset: frame?.getAttribute("data-style-preset") ?? null });`,
  ));

  /*
   * Every svg on the canvas, with the text next to it.
   *
   * Keyed off the glyphs rather than off the five labels: a first pass matched
   * on exact label text, found nothing, and that told me only that my selector
   * was wrong — not what the canvas draws. Reading the labels off the glyphs
   * cannot miss for that reason.
   */
  console.log("glyphs:", await evaluate(
    page,
    `const labels = ${LABELS};
     const out = [];
     for (const svg of document.querySelectorAll(".preview-frame svg")) {
       const rect = svg.getBoundingClientRect();
       if (rect.width === 0) continue;
       let row = svg.parentElement;
       while (row && (row.textContent || "").trim() === "") row = row.parentElement;
       const text = (row?.textContent || "").trim().slice(0, 36);
       if (!labels.some((l) => text.includes(l))) continue;
       const svgStyle = getComputedStyle(svg);
       const host = svg.parentElement;
       out.push({
         text,
         chain: (function () {
           const parts = [];
           for (let n = svg; n && n !== document.body && parts.length < 4; n = n.parentElement) {
             parts.push(n.tagName.toLowerCase() + (typeof n.className === "string" && n.className ? "." + n.className.trim().split(/\\s+/).join(".") : ""));
           }
           return parts.join(" < ");
         })(),
         viewBox: svg.getAttribute("viewBox"),
         size: Math.round(rect.width) + "x" + Math.round(rect.height),
         stroke: svg.getAttribute("stroke"),
         strokeWidth: svg.getAttribute("stroke-width"),
         fill: svg.getAttribute("fill"),
         color: svgStyle.color,
         opacity: svgStyle.opacity,
         hostOpacity: host ? getComputedStyle(host).opacity : null,
         d: (svg.querySelector("path")?.getAttribute("d") || "").slice(0, 40),
       });
     }
     return JSON.stringify(out, null, 1);`,
  ));

  const shot = await page.send("Page.captureScreenshot", { format: "png" });
  writeFileSync("/tmp/tool-rows.png", Buffer.from(shot.data, "base64"));
} finally {
  chrome.kill();
}
