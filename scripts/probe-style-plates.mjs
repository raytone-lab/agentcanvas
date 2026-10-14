/**
 * The style flyout's five plates: does each card resolve its own image, and
 * does the 104px crop keep the subject?
 *
 * The second half is the one worth measuring. `background-size: cover` reports
 * no error when it crops the wrong band — the card just looks like an empty
 * gradient — so this reads the natural size, the box, and what the crop keeps.
 */
import { connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";
import { writeFileSync } from "node:fs";

const PORT = 9353;
const chrome = launchChrome({ port: PORT, userDataDir: "/tmp/plate-probe" });
const page = await connectPage({ port: PORT });
await page.send("Emulation.setDeviceMetricsOverride", {
  width: 1680, height: 1200, deviceScaleFactor: 2, mobile: false,
});
await page.send("Page.navigate", { url: "http://localhost:5178/editor.html" });
await sleep(4500);

console.log("cards:", JSON.stringify(await evaluate(page, `
  const out = [];
  for (const card of document.querySelectorAll(".style-card")) {
    const art = card.querySelector(".style-card-art");
    const thumb = card.querySelector(".style-card-thumb");
    const cs = art ? getComputedStyle(art) : null;
    const r = art?.getBoundingClientRect();
    out.push({
      name: card.querySelector(".style-card-name")?.textContent?.trim() ?? "?",
      plate: cs?.backgroundImage?.replace(/^url\\("?|"?\\)$/g, "").split("/").pop() ?? null,
      position: cs?.backgroundPosition ?? null,
      box: r ? [Math.round(r.width), Math.round(r.height)] : null,
      thumbPlate: thumb ? getComputedStyle(thumb).backgroundImage.split("/").pop().replace(/"?\\)$/, "") : null,
    });
  }
  return out;
`), null, 1));

/** Did every plate actually load, or is one a 404 the card paints over? */
console.log("loaded:", JSON.stringify(await evaluate(page, `
  const urls = [...document.querySelectorAll(".style-card-art")]
    .map((a) => getComputedStyle(a).backgroundImage.replace(/^url\\("?|"?\\)$/g, ""))
    .filter((u) => u && u !== "none");
  return Promise.all(urls.map((u) => new Promise((res) => {
    const img = new Image();
    img.onload = () => res({ file: u.split("/").pop(), natural: img.naturalWidth + "x" + img.naturalHeight });
    img.onerror = () => res({ file: u.split("/").pop(), natural: "FAILED TO LOAD" });
    img.src = u;
  })));
`), null, 1));

const shot = await page.send("Page.captureScreenshot", { format: "png" });
writeFileSync("/tmp/style-plates.png", Buffer.from(shot.data, "base64"));
console.log("screenshot → /tmp/style-plates.png");

chrome.kill();
