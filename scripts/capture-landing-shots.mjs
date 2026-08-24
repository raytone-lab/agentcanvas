#!/usr/bin/env node
/**
 * Capture the landing page's stills and annotation anchors from the running editor.
 *
 *   npm run dev                        # in one terminal
 *   node scripts/capture-landing-shots.mjs
 *
 * Writes:
 *   public/landing/editor.png       light theme, annotated base image and <video> poster
 *   public/landing/editor-dark.png  the same state recoloured, for the before/after slider
 *   src/landing/anchors.json        normalised rects of the six composable surfaces
 *
 * The JSON lands in src/, not public/: it is build-time data the page imports, not an asset
 * served as-is, and tsconfig's `include` only covers src.
 *
 * `anchors.json` is the point of this script. The landing page draws callout labels onto
 * `editor.png`, and those must land on the real components — so the coordinates are read
 * out of the live DOM via each component's `data-preview-anchor`, normalised 0..1 against
 * the viewport, and re-emitted every time the screenshots are retaken. Nothing is eyeballed
 * or hardcoded in the page.
 *
 * The state is reached by clicking into the coding-agent fixture ("对话" → 名称标签). That
 * is the only state where all six anchors are on screen at once: the tool-actions overview
 * has no reasoning block, and the thinking preview has no tool cards.
 *
 * deviceScaleFactor 1.5, not 2: the hero renders about 1160px wide, so 1.5x already exceeds
 * 2x density and costs ~30% fewer bytes.
 *
 * Options (env):
 *   URL     editor URL       (default http://localhost:5173/editor.html)
 *   CHROME  browser binary   (default the macOS Google Chrome path)
 *   PORT    devtools port    (default 9222)
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertReachable,
  clickPresetOption,
  clickRail,
  connectPage,
  evaluate,
  launchChrome,
  sleep,
} from "./lib/cdp.mjs";

const EDITOR_URL = process.env.URL ?? "http://localhost:5173/editor.html";
const PORT = Number(process.env.PORT ?? 9222);
const VIEW = { width: 1440, height: 900, deviceScaleFactor: 1.5 };

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "landing");
const DATA_OUT = join(ROOT, "src", "landing");

/**
 * Landing-page key -> the `data-preview-anchor` to measure.
 *
 * "chat" points at `conversation` (the message bubbles) rather than `chat` (the whole
 * column), because a callout wants to land on the thing being named, not on the region
 * that contains everything else too.
 */
const ANCHORS = {
  sessions: "sidebar",
  chat: "conversation",
  thinking: "reasoning",
  tools: "tool-call",
  output: "output",
  composer: "composer",
};

async function main() {
  mkdirSync(OUT, { recursive: true });
  await assertReachable(EDITOR_URL);

  const chrome = launchChrome({
    port: PORT,
    userDataDir: join(ROOT, "node_modules", ".cache", "landing-shots"),
  });

  try {
    const page = await connectPage({ port: PORT });
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Emulation.setDeviceMetricsOverride", { ...VIEW, mobile: false });
    await page.send("Page.navigate", { url: EDITOR_URL });
    await sleep(3800);

    // Into the coding-agent fixture: reasoning + tool calls + an artifact, all at once.
    await clickRail(page, "对话");
    await sleep(1200);
    await clickPresetOption(page, "speaker-labels");
    await sleep(5000);

    await shoot(page, "editor.png");
    writeFileSync(join(DATA_OUT, "anchors.json"), `${JSON.stringify(await readAnchors(page), null, 2)}\n`);
    console.log("  src/landing/anchors.json");

    // Same content, dark theme, for the before/after slider.
    await clickRail(page, "主题");
    await sleep(1200);
    await clickPresetOption(page, "warm-graphite");
    await sleep(2500);
    // Reopen the conversation group so both frames show identical chrome; only the
    // colours may differ, or the slider would be comparing two different screens.
    await clickRail(page, "对话");
    await sleep(2000);
    await shoot(page, "editor-dark.png");

    page.close();
  } finally {
    chrome.kill();
  }
}

async function shoot(page, name) {
  const { data } = await page.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  writeFileSync(join(OUT, name), Buffer.from(data, "base64"));
  console.log(`  ${name.padEnd(18)} ${VIEW.width}x${VIEW.height} @${VIEW.deviceScaleFactor}x`);
}

async function readAnchors(page) {
  const entries = await evaluate(
    page,
    `const wanted = ${JSON.stringify(ANCHORS)};
     const out = {};
     for (const [key, anchor] of Object.entries(wanted)) {
       const el = [...document.querySelectorAll('[data-preview-anchor="' + anchor + '"]')]
         .find((node) => {
           const r = node.getBoundingClientRect();
           return r.width > 4 && r.height > 4;
         });
       if (!el) continue;
       const r = el.getBoundingClientRect();
       out[key] = {
         x: +(r.x / window.innerWidth).toFixed(4),
         y: +(r.y / window.innerHeight).toFixed(4),
         w: +(r.width / window.innerWidth).toFixed(4),
         h: +(r.height / window.innerHeight).toFixed(4),
       };
     }
     return out;`,
  );

  const missing = Object.keys(ANCHORS).filter((key) => !entries[key]);
  if (missing.length > 0) {
    throw new Error(
      `Anchors missing from this state: ${missing.join(", ")}. ` +
        "The callouts would point at nothing — check the fixture still renders all six.",
    );
  }
  return entries;
}

await main();
