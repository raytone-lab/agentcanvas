/**
 * Is the error row's text centred in its row, in every style?
 *
 * The lesson this measures for is the header row's: "centred inside its own box"
 * and "centred in the row" are two different questions, and
 * `getBoundingClientRect` answers the first one while the reader is looking at
 * the second. So this reports the space *above* the text and the space *below*
 * it, per row, per style. Equal is centred; anything else is the number.
 *
 * The ink is measured, not the line box — a 14px glyph in a 1.35 line box has
 * ~2.5px of leading on each side, and reporting the box would call a row
 * centred while the letters sat high in it. `Range.getClientRects()` over the
 * text node gives the box; the cap/baseline offsets come from the font metrics
 * the browser already resolved.
 */
import { connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";

const PORT = 9373;
const STYLES = ["原生风", "游戏风", "复古风", "手绘风", "水墨风"];

const chrome = launchChrome({ port: PORT, userDataDir: "/tmp/centring-probe" });
const page = await connectPage({ port: PORT });
await page.send("Emulation.setDeviceMetricsOverride", {
  width: 1680, height: 1200, deviceScaleFactor: 2, mobile: false,
});
await page.send("Page.navigate", { url: "http://localhost:5181/editor.html" });
await sleep(4500);

const readRows = `
  const rows = [...document.querySelectorAll(".error-item")];
  if (!rows.length) return { found: 0 };
  return {
    found: rows.length,
    rows: rows.map((row) => {
      const p = row.querySelector("p");
      const icon = row.querySelector(".error-icon");
      const rr = row.getBoundingClientRect();
      const pr = p?.getBoundingClientRect();
      const ir = icon?.getBoundingClientRect();
      const cs = getComputedStyle(row);
      /* The ink, not the line box. A text node's client rect is the line box,
         so the leading is subtracted using the metrics the browser resolved. */
      let ink = null;
      if (p?.firstChild) {
        const range = document.createRange();
        range.selectNodeContents(p);
        const box = range.getBoundingClientRect();
        const ps = getComputedStyle(p);
        const fontSize = parseFloat(ps.fontSize);
        const lineHeight = parseFloat(ps.lineHeight) || fontSize * 1.35;
        const leading = (lineHeight - fontSize) / 2;
        ink = { top: box.top + leading, bottom: box.bottom - leading };
      }
      return {
        text: p?.textContent?.slice(0, 12) ?? "",
        rowH: +rr.height.toFixed(1),
        align: cs.alignItems,
        padTop: cs.paddingTop,
        padBottom: cs.paddingBottom,
        // Space above the text's ink, and below it.
        above: ink ? +(ink.top - rr.top).toFixed(1) : null,
        below: ink ? +(rr.bottom - ink.bottom).toFixed(1) : null,
        // And the icon, which is the other thing in the row.
        iconAbove: ir ? +(ir.top - rr.top).toFixed(1) : null,
        iconBelow: ir ? +(rr.bottom - ir.bottom).toFixed(1) : null,
      };
    }),
  };
`;

for (const label of STYLES) {
  for (let i = 0; i < 20; i += 1) {
    const clicked = await evaluate(page, `
      const card = [...document.querySelectorAll(".style-card")]
        .find((c) => c.textContent.includes("${label}") && !c.textContent.includes("像素"));
      if (!card) return "no card";
      card.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      const apply = [...card.querySelectorAll("button")].find((b) => /应用|Apply/.test(b.textContent));
      if (!apply) return "no apply";
      apply.click();
      return "clicked";
    `);
    await sleep(1200);
    if (clicked === "clicked") break;
  }

  let read = { found: 0 };
  for (let t = 0; t < 40 && !read.found; t += 1) {
    await sleep(1000);
    read = await evaluate(page, readRows);
  }

  const preset = await evaluate(page, `return document.querySelector(".preview-frame")?.dataset.stylePreset ?? null;`);
  console.log(`\n${label} (${preset})  ${read.found} rows`);
  for (const r of read.rows ?? []) {
    const skew = r.above != null && r.below != null ? (r.below - r.above).toFixed(1) : "?";
    console.log(
      `   h=${String(r.rowH).padEnd(6)} align=${r.align.padEnd(10)} pad=${r.padTop}/${r.padBottom}`
      + `  text ${String(r.above).padStart(5)}↑ ${String(r.below).padStart(5)}↓  skew ${String(skew).padStart(6)}`
      + `  icon ${String(r.iconAbove).padStart(5)}↑ ${String(r.iconBelow).padStart(5)}↓   ${r.text}`,
    );
  }
}

chrome.kill();
