/**
 * Probe: what the left rail actually offers, by visible label.
 *
 * Dev-only, throwaway. Exists because two probes guessed at a group row label
 * ("思考中") and missed — the canvas is the empty skeleton until something is
 * picked, so a probe that cannot navigate the rail cannot measure the canvas.
 *
 *   URL=http://localhost:5180/editor.html node scripts/probe-rail-map.mjs
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { assertReachable, connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";

const URL_ = process.env.URL ?? "http://localhost:5180/editor.html";
const PORT = Number(process.env.CDP_PORT ?? 9351);

const chrome = launchChrome({ port: PORT, userDataDir: mkdtempSync(join(tmpdir(), "railmap-probe-")) });
try {
  await assertReachable(URL_);
  const page = await connectPage({ port: PORT });
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 1680, height: 1300, deviceScaleFactor: 2, mobile: false,
  });
  await page.send("Page.navigate", { url: URL_ });
  await sleep(3500);

  console.log("nav:", await evaluate(
    page,
    `return JSON.stringify([...document.querySelectorAll(".preset-nav button")]
       .map((b) => ({
         cls: b.className,
         text: (b.textContent || "").trim().slice(0, 18),
         group: b.getAttribute("data-preset-group"),
         section: b.getAttribute("data-nav-section"),
       }))
       .filter((b) => b.text), null, 1);`,
  ));
} finally {
  chrome.kill();
}
