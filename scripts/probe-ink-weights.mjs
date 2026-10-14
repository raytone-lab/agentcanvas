/**
 * Shoot the 水墨风 icon-candidate plate (`/icon-weights.html`).
 *
 * Dev-only, and paired with that file — both are throwaway once the weight is
 * chosen. Exists because "which Phosphor weight reads as ink at 15px" is not a
 * question source code answers; only pixels do.
 */
import { writeFileSync } from "node:fs";

import { connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";

const devPort = process.argv[2] ?? "5191";
const PORT = 9362;

const chrome = launchChrome({ port: PORT, userDataDir: "/tmp/ink-weight-probe" });
const page = await connectPage({ port: PORT });
await page.send("Page.enable");
await page.send("Emulation.setDeviceMetricsOverride", {
  width: 1560, height: 1200, deviceScaleFactor: 2, mobile: false,
});
await page.send("Page.navigate", { url: `http://localhost:${devPort}/icon-weights.html` });
await sleep(4500);

const missing = await evaluate(page, `
  return [...document.querySelectorAll("span")].filter((s) => s.textContent === "?").length;
`);
if (missing) console.log(`WARN: ${missing} Phosphor names did not resolve`);

const height = await evaluate(page, `return document.body.scrollHeight;`);
console.log(`plate is ${height}px tall`);

const BAND = 700;
for (let i = 0, y = 0; y < height; i += 1, y += BAND) {
  const { data } = await page.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y, width: 1560, height: Math.min(BAND, height - y), scale: 1 },
  });
  const path = `/tmp/ink-weights-${i}.png`;
  writeFileSync(path, Buffer.from(data, "base64"));
  console.log(path);
}

chrome.kill();
process.exit(0);
