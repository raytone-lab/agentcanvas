#!/usr/bin/env node
/**
 * Record the landing page's hero demo by driving the real editor.
 *
 *   npm run dev                        # in one terminal
 *   node scripts/capture-landing-demo.mjs
 *
 * Writes public/landing/editor-demo.mp4 (and reuses public/landing/editor.png as the
 * <video> poster). Every click in the recording is a real click on the real editor —
 * nothing is mocked or re-created for the video. Re-run after any editor UI change.
 *
 * A pointer indicator is injected before recording and glides to each target before the
 * click lands. Headless screenshots contain no cursor, so without it the video looks
 * like a UI changing on its own. The dot is an overlay for the viewer's benefit; the
 * interactions underneath are genuine.
 *
 * Options (env):
 *   URL     editor URL       (default http://localhost:5173/editor.html)
 *   CHROME  browser binary   (default the macOS Google Chrome path)
 *   PORT    devtools port    (default 9223, to avoid clashing with the stills script)
 *   FFMPEG  encoder path     (default "ffmpeg" on PATH)
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertReachable,
  clickPresetOption,
  clickRail,
  connectPage,
  evaluate,
  launchChrome,
  presetOptionCenter,
  railCenter,
  sleep,
} from "./lib/cdp.mjs";

const EDITOR_URL = process.env.URL ?? "http://localhost:5173/editor.html";
const PORT = Number(process.env.PORT ?? 9223);
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";

// Captured at 1x: the hero renders about 1040px wide, and h264 at 1440x900 is already
// oversampled for that. 15fps is plenty for UI motion and keeps the file small.
const VIEW = { width: 1440, height: 900, deviceScaleFactor: 1 };
const FPS = 15;
const FRAME_MS = Math.round(1000 / FPS);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "landing");
const OUT_FILE = join(OUT, "editor-demo.mp4");

/**
 * The demo beats, in seconds from the start of recording.
 *
 * Chosen to show the product's actual loop — pick a preset, the real component redraws —
 * rather than a feature tour. Theme switching is last because recolouring the whole
 * canvas is the most legible proof that the preview is live.
 */
const TIMELINE = [
  { at: 0.8, kind: "rail", target: "思考", note: "open the thinking group" },
  { at: 2.0, kind: "option", target: "thinking-shimmer", note: "pick a thinking motion" },
  { at: 5.0, kind: "rail", target: "工具", note: "tool cards + a real diff in the output panel" },
  { at: 9.0, kind: "rail", target: "主题", note: "open the theme group" },
  { at: 10.2, kind: "option", target: "warm-graphite", note: "recolour dark warm" },
  { at: 13.0, kind: "option", target: "cyan-grid", note: "recolour dark cool" },
  { at: 15.8, kind: "option", target: "soft-glass", note: "back to the default light" },
];
const DURATION_S = 18.5;

/**
 * An arrow, not a dot. A dot centred on the target both reads ambiguously (it looks like
 * part of the card art) and covers the thing being clicked; an arrow anchors its tip on
 * the target and puts its body down-right, out of the way.
 */
const POINTER_SETUP = `
  if (!document.getElementById("__demo_pointer")) {
    const style = document.createElement("style");
    style.textContent = \`
      #__demo_pointer {
        position: fixed; top: 0; left: 0; width: 24px; height: 30px;
        pointer-events: none; z-index: 2147483647; opacity: 0;
        transform: var(--at, translate(0, 0));
        transition: transform 380ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms linear;
        filter: drop-shadow(0 3px 6px rgba(13, 18, 28, 0.35));
      }
      #__demo_pointer i {
        position: absolute; left: 0; top: 0; width: 14px; height: 14px;
        margin: -7px 0 0 -7px; border-radius: 999px;
        border: 2px solid rgba(17, 30, 54, 0.5); opacity: 0;
      }
      #__demo_pointer[data-down="true"] i { animation: __demo_ping 440ms ease-out; }
      @keyframes __demo_ping {
        from { opacity: 0.95; transform: scale(0.4); }
        to   { opacity: 0;    transform: scale(2.6); }
      }
    \`;
    document.head.appendChild(style);
    const pointer = document.createElement("div");
    pointer.id = "__demo_pointer";
    pointer.innerHTML =
      '<i></i><svg width="24" height="30" viewBox="0 0 24 30" fill="none">' +
      '<path d="M2 1.5 L2 22 L7.2 17.2 L10.6 25.5 L14.2 24 L10.8 15.8 L17.8 15.4 Z"' +
      ' fill="#ffffff" stroke="#111e36" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.appendChild(pointer);
  }
  return "ok";
`;

async function movePointer(page, point) {
  if (!point) return;
  await evaluate(
    page,
    `const dot = document.getElementById("__demo_pointer");
     if (dot) {
       dot.style.setProperty("--at", "translate(${point.x}px, ${point.y}px)");
       dot.style.opacity = "1";
     }
     return "ok";`,
  );
}

async function pressPointer(page) {
  await evaluate(
    page,
    `const dot = document.getElementById("__demo_pointer");
     if (dot) {
       dot.dataset.down = "true";
       setTimeout(() => { delete dot.dataset.down; }, 420);
     }
     return "ok";`,
  );
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  await assertReachable(EDITOR_URL);

  const frames = mkdtempSync(join(tmpdir(), "agentcanvas-demo-"));
  const chrome = launchChrome({
    port: PORT,
    userDataDir: join(ROOT, "node_modules", ".cache", "landing-demo"),
  });

  try {
    const page = await connectPage({ port: PORT });
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Emulation.setDeviceMetricsOverride", { ...VIEW, mobile: false });
    await page.send("Page.navigate", { url: EDITOR_URL });
    await sleep(3800);
    await evaluate(page, POINTER_SETUP);

    // Pre-resolve nothing: a target's position depends on what the previous beat opened,
    // so each beat looks up its own rect just before moving the pointer.
    const beats = [...TIMELINE];
    const totalFrames = Math.round(DURATION_S * FPS);
    const started = Date.now();
    let index = 0;

    for (let frame = 0; frame < totalFrames; frame += 1) {
      const elapsed = (Date.now() - started) / 1000;

      while (beats.length > 0 && beats[0].at <= elapsed) {
        const beat = beats.shift();
        const center =
          beat.kind === "rail"
            ? await railCenter(page, beat.target)
            : await presetOptionCenter(page, beat.target);
        await movePointer(page, center);
        await sleep(400);
        await pressPointer(page);
        if (beat.kind === "rail") await clickRail(page, beat.target);
        else await clickPresetOption(page, beat.target);
        console.log(`  ${elapsed.toFixed(1)}s  ${beat.target.padEnd(18)} ${beat.note}`);
      }

      const { data } = await page.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: 85,
        captureBeyondViewport: false,
      });
      writeFileSync(join(frames, `f-${String(index).padStart(5, "0")}.jpg`), Buffer.from(data, "base64"));
      index += 1;

      const drift = FRAME_MS * (frame + 1) - (Date.now() - started);
      if (drift > 0) await sleep(drift);
    }

    page.close();
    console.log(`  captured ${index} frames`);
    encode(frames, index);
  } finally {
    chrome.kill();
    rmSync(frames, { recursive: true, force: true });
  }
}

function encode(framesDir, frameCount) {
  const args = [
    "-y",
    "-framerate", String(FPS),
    "-i", join(framesDir, "f-%05d.jpg"),
    // Scaled down from the 1440px capture: the hero is ~1040px wide, so 1280 still
    // oversamples it, and the smaller raster is a large share of the byte saving.
    "-vf", "scale=1280:-2:flags=lanczos",
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "30",
    "-pix_fmt", "yuv420p",
    // Lets the browser start playing before the whole file arrives.
    "-movflags", "+faststart",
    "-an",
    OUT_FILE,
  ];
  const result = spawnSync(FFMPEG, args, { stdio: ["ignore", "ignore", "pipe"] });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed:\n${result.stderr?.toString().split("\n").slice(-12).join("\n")}`);
  }
  console.log(`  encoded ${frameCount} frames -> public/landing/editor-demo.mp4`);
}

await main();
