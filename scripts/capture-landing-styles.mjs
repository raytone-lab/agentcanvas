#!/usr/bin/env node
/**
 * Capture the landing page's style gallery from the running editor.
 *
 *   npm run dev                              # in one terminal
 *   node scripts/capture-landing-styles.mjs  # writes public/landing/styles/
 *
 * Writes, for each of the six styles the picker offers:
 *
 *   {style}-{palette}.webp  the canvas frame alone, once per colourway — the hero's
 *                           screen wall and the palette strip on each style's card
 *   {style}.webp            the whole editor on the style's opening colourway — the
 *                           style's cover card
 *
 * and `src/landing/styleShots.json`, the list the page imports, so the page only ever
 * names files that exist.
 *
 * Every module is switched on first, so each frame shows the whole product rather than an
 * empty three-column skeleton. The rail is driven by structure (`data-nav-section`,
 * `.group-row`, `.preset-option`) and the picker by `data-style`, never by label, because
 * the labels move with the locale; the locale itself is seeded to English before boot, the
 * same way `capture-editor-tour.mjs` does, so one set of stills serves all three languages.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public/landing/styles");
const MANIFEST = join(ROOT, "src/landing/styleShots.json");
const URL = process.env.EDITOR_URL ?? "http://localhost:5175/editor.html";
const PORT = Number(process.env.CDP_PORT ?? 9580);

/** The six styles the picker shows, in its order. */
const STYLES = ["native", "inkwash", "game", "handdrawn", "retro", "tech"];

const chrome = launchChrome({ port: PORT, userDataDir: `/tmp/agentcanvas-capture-styles-${PORT}` });
try {
  const page = await connectPage({ port: PORT });
  await page.send("Page.enable");
  await page.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `try { localStorage.setItem("agentcanvas.locale", "en"); } catch {}`,
  });
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1000, deviceScaleFactor: 2, mobile: false });
  await page.send("Page.navigate", { url: URL });
  await sleep(6000);

  await enableEverything(page);
  mkdirSync(OUT_DIR, { recursive: true });

  const manifest = [];
  for (const style of STYLES) {
    const palettes = await evaluate(
      page,
      `return [...document.querySelectorAll('.style-card[data-style="${style}"] .style-card-swatch')].map((b) => b.getAttribute("aria-label"));`,
    );
    const entry = { style, name: "", palettes: [] };
    // The opening colourway last: shot first, it caught the right panel's media still
    // loading, because entering a style restarts the replay. By the time the other three
    // have been shot the media is cached and the turn has settled.
    const order = [...palettes.keys()].slice(1).concat(0);
    const shots = [];
    for (const index of order) {
      const palette = palettes[index];
      await applyStyle(page, style, index);
      await sleep(index === order[0] ? 14000 : 7000);
      await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 2, y: 998 });
      await sleep(400);
      const themeId = await evaluate(page, `return document.querySelector(".preview-frame").dataset.themePreset;`);
      entry.name ||= await evaluate(page, `return document.querySelector('.style-card[data-style="${style}"] .style-card-name')?.textContent.trim() ?? "";`);
      const frame = await rectOf(page, ".preview-frame");
      const file = `${style}-${themeId}.webp`;
      await shoot(page, frame, join(OUT_DIR, file), 1.5);
      shots[index] = { id: themeId, name: palette, src: `/landing/styles/${file}` };
      if (index === 0) {
        await shoot(page, { x: 0, y: 0, width: 1600, height: 1000 }, join(OUT_DIR, `${style}.webp`), 1.25);
        entry.cover = `/landing/styles/${style}.webp`;
      }
      console.log(`${style} · ${palette} → ${file}`);
    }
    entry.palettes = shots;
    manifest.push(entry);
  }
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`wrote ${MANIFEST}`);
} finally {
  chrome.kill();
}

async function enableEverything(page) {
  for (const section of ["structure", "components"]) {
    await evaluate(page, `document.querySelector('.nav-section-tile[data-nav-section="${section}"]')?.click(); return 1;`);
    await sleep(600);
    const rows = await evaluate(page, `return document.querySelectorAll(".preset-panel .group-row").length;`);
    for (let row = 0; row < rows; row += 1) {
      await evaluate(page, `const r = document.querySelectorAll(".preset-panel .group-row")[${row}]; if (r && r.getAttribute("aria-expanded") === "false") r.click(); return 1;`);
      await sleep(500);
      // Additive options only: a variant re-clicked would just cycle the section.
      for (let i = 0; i < 24; i += 1) {
        const clicked = await evaluate(
          page,
          `const b = [...document.querySelectorAll(".preset-panel .preset-option-cell:not([data-pending]) > button.preset-option")].find((x) => x.getAttribute("data-active") !== "true" && !x.dataset.tried); if (!b) return 0; b.dataset.tried = "1"; b.click(); return 1;`,
        );
        if (!clicked) break;
        await sleep(250);
      }
    }
  }
}

async function applyStyle(page, style, paletteIndex) {
  await evaluate(
    page,
    `const card = document.querySelector('.style-card[data-style="${style}"]'); card.scrollIntoView({ block: "center" }); card.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true })); return 1;`,
  );
  await sleep(500);
  await evaluate(page, `document.querySelectorAll('.style-card[data-style="${style}"] .style-card-swatch')[${paletteIndex}]?.click(); return 1;`);
  await sleep(300);
  await evaluate(page, `document.querySelector('.style-card[data-style="${style}"] .style-card-apply')?.click(); return 1;`);
}

async function rectOf(page, selector) {
  return evaluate(page, `const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height };`);
}

async function shoot(page, clip, path, scale) {
  // The page renders at 2x; `scale` sets the file's density, so a frame is 1.5x and the
  // full editor 1.25x — enough for a retina card without a megabyte per still.
  const { data } = await page.send("Page.captureScreenshot", { format: "webp", quality: 80, clip: { ...clip, scale: scale / 2 } });
  writeFileSync(path, Buffer.from(data, "base64"));
}
