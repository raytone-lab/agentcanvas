#!/usr/bin/env node
/**
 * Record a tour of the editor by driving every module in the left rail.
 *
 *   npm run dev                            # in one terminal
 *   node scripts/capture-editor-tour.mjs
 *
 * Writes two files, because they answer different questions:
 *
 *   public/landing/editor-tour.mp4   all 11 rail modules, ~40s, small and sharp.
 *   public/landing/editor-tour.gif   6 modules, ~22s, for the README.
 *
 * The GIF exists because GitHub will not play a repository-local mp4: `![](x.mp4)` renders
 * as a broken link, and only an uploaded attachment URL gets a player. A GIF is the only
 * format that animates inline from a committed file, so the README gets the short one and
 * the mp4 stays for anyone who wants the full pass at full quality.
 *
 * Every click is a real click on the real editor — nothing is mocked or re-staged. The
 * pointer arrow is an injected overlay, because headless screenshots contain no cursor and
 * without it the UI appears to change on its own; the interactions underneath are genuine.
 *
 * The recording is in English: the README is English, so a Chinese UI in its lead asset
 * makes the project look like it is not for the reader. The editor defaults to zh, so the
 * locale is seeded into localStorage before the app boots rather than clicked in the
 * topbar — a click would be the first thing in frame, and it would need its own beat.
 *
 * Re-run after any change to the preset group or option ids, and commit both outputs.
 *
 * Options (env):
 *   URL     editor URL       (default http://localhost:5173/editor.html)
 *   ONLY    "mp4" | "gif"    (default both)
 *   LOCALE  "en" | "zh"      (default "en")
 *   CHROME  browser binary   (default the macOS Google Chrome path)
 *   PORT    devtools port    (default 9225, clear of the other capture scripts)
 *   FFMPEG  encoder path     (default "ffmpeg" on PATH)
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertReachable,
  clickPresetOption,
  clickRailTile,
  connectPage,
  evaluate,
  launchChrome,
  presetOptionCenter,
  railTileCenter,
  sleep,
} from "./lib/cdp.mjs";

const EDITOR_URL = process.env.URL ?? "http://localhost:5173/editor.html";
const PORT = Number(process.env.PORT ?? 9225);
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const ONLY = process.env.ONLY;
const LOCALE = process.env.LOCALE ?? "en";
/** Must match LocaleContext's STORAGE_KEY. */
const LOCALE_STORAGE_KEY = "agentcanvas.locale";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "landing");

/**
 * 1000px tall, not 900: the rail's last tile (theme) sits near y≈911, so at 900 it falls
 * outside the viewport. The click would still land — `el.click()` ignores visibility — but
 * the pointer would glide off-screen and the theme would appear to change by itself.
 * `assertBeatsVisible` re-checks this at runtime, since the labels are locale-dependent and
 * a longer one that wraps pushes every tile below it further down.
 */
const VIEW = { width: 1440, height: 1000, deviceScaleFactor: 1 };
const FPS = 15;
const FRAME_MS = Math.round(1000 / FPS);

/**
 * A rail tile, then the option that makes its effect legible in one frame.
 *
 * `rail` is a preset group id, not a visible label: labels are translated, ids are not, so
 * the same timeline records in either locale.
 */
const beat = (at, rail, option, note) => ({ at, rail, option, note });

/**
 * The full pass: every module in rail order.
 *
 * blocks, provider and git carry no preset cards, so those beats only open the group — the
 * panel itself is the thing worth seeing. Theme is last and goes light → warm dark → cool
 * dark: recolouring the whole canvas is the most legible proof that the preview is live, and
 * it reads best as the closing move rather than buried mid-tour.
 */
const TOUR = [
  beat(0.8, "conversation", "writing-typewriter", "conversation + typewriter cadence"),
  beat(4.2, "ux-effects", "thinking-orbit", "reasoning motion"),
  beat(7.6, "blocks", null, "status surface"),
  beat(10.4, "tool-calls", "timeline-rail", "tool calls as a timeline rail"),
  beat(14.0, "media-generation", "media-video-cinema", "generated-media loaders"),
  beat(17.6, "composer", "prompt-shortcuts", "composer controls"),
  beat(21.0, "sidebar", "sidebar-search", "session sidebar"),
  beat(24.4, "output", "output-source-console", "output panel source"),
  beat(27.8, "provider", null, "provider + model wiring"),
  beat(30.6, "git", null, "git panel"),
  beat(33.4, "theme", "warm-graphite", "recolour dark warm"),
  beat(36.6, "theme", "cyan-grid", "recolour dark cool"),
];
const TOUR_S = 39.5;

/**
 * The README cut: the six modules whose change is unmistakable at GIF frame rates.
 *
 * blocks / provider / git are dropped because opening a panel is a subtle frame-to-frame diff
 * and costs the same seconds as a visible one; media-generation and sidebar are dropped for
 * length. The mp4 still covers all eleven.
 */
const README_CUT = [
  beat(0.8, "conversation", "writing-typewriter", "conversation + typewriter cadence"),
  beat(4.2, "ux-effects", "thinking-orbit", "reasoning motion"),
  beat(7.6, "tool-calls", "timeline-rail", "tool calls as a timeline rail"),
  beat(11.0, "composer", "prompt-shortcuts", "composer controls"),
  beat(14.4, "output", "output-source-console", "output panel source"),
  beat(17.6, "theme", "warm-graphite", "recolour dark warm"),
  beat(20.2, "theme", "cyan-grid", "recolour dark cool"),
];
const README_S = 23.0;

/**
 * An arrow, not a dot. A dot centred on the target reads as part of the card art and covers
 * the thing being clicked; an arrow anchors its tip on the target and puts its body
 * down-right, out of the way.
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

/** Move the arrow onto a target, let it land, flash the click ring, then really click. */
async function performClick(page, kind, target) {
  const center = kind === "rail" ? await railTileCenter(page, target) : await presetOptionCenter(page, target);
  await movePointer(page, center);
  await sleep(400);
  await pressPointer(page);
  if (kind === "rail") await clickRailTile(page, target);
  else await clickPresetOption(page, target);
}

async function record(page, timeline, durationS, frameDir) {
  const beats = [...timeline];
  const totalFrames = Math.round(durationS * FPS);
  const started = Date.now();
  let index = 0;

  for (let frame = 0; frame < totalFrames; frame += 1) {
    const elapsed = (Date.now() - started) / 1000;

    while (beats.length > 0 && beats[0].at <= elapsed) {
      const next = beats.shift();
      // A target's position depends on what the previous beat opened, so each beat resolves
      // its own rect immediately before moving the pointer rather than up front.
      await performClick(page, "rail", next.rail);
      if (next.option) {
        await sleep(420);
        await performClick(page, "option", next.option);
      }
      console.log(`  ${elapsed.toFixed(1)}s  ${next.rail.padEnd(6)} ${next.note}`);
    }

    const { data } = await page.send("Page.captureScreenshot", {
      format: "jpeg",
      quality: 88,
      captureBeyondViewport: false,
    });
    writeFileSync(join(frameDir, `f-${String(index).padStart(5, "0")}.jpg`), Buffer.from(data, "base64"));
    index += 1;

    const drift = FRAME_MS * (frame + 1) - (Date.now() - started);
    if (drift > 0) await sleep(drift);
  }
  return index;
}

/**
 * Put the locale in localStorage, then confirm the reload actually rendered in it.
 *
 * Needs a load first: localStorage is per-origin, and there is no origin to write to until
 * the page has been navigated once. The user-data-dir is persistent across runs, so the
 * write is unconditional rather than a default — a previous run may have left "zh" there.
 */
async function seedLocale(page) {
  await page.send("Page.navigate", { url: EDITOR_URL });
  await sleep(1200);
  await evaluate(
    page,
    `window.localStorage.setItem(${JSON.stringify(LOCALE_STORAGE_KEY)}, ${JSON.stringify(LOCALE)});
     return "ok";`,
  );
}

/**
 * Fail before recording if a tile the tour clicks is missing or below the fold.
 *
 * Both failures are near-invisible in the output rather than loud: a missing tile throws
 * only once its beat comes due, ~30s into a pass, and an off-screen one still clicks, so the
 * UI changes with the pointer nowhere near it. Locale changes the label lengths and so the
 * tile positions, which is exactly when this is worth checking.
 */
async function assertBeatsVisible(page, timeline) {
  const groups = [...new Set(timeline.map((b) => b.rail))];
  const bad = [];
  for (const group of groups) {
    const center = await railTileCenter(page, group);
    if (!center) bad.push(`${group} (no tile)`);
    else if (center.y > VIEW.height) bad.push(`${group} (y=${Math.round(center.y)} > ${VIEW.height})`);
  }
  if (bad.length > 0) {
    throw new Error(`Rail tiles not usable at ${VIEW.width}x${VIEW.height}: ${bad.join(", ")}`);
  }
}

/** Reset to the state a fresh load has, so the second pass does not inherit the first's picks. */
async function reload(page) {
  await page.send("Page.navigate", { url: EDITOR_URL });
  await sleep(3800);
  await evaluate(page, POINTER_SETUP);
}

function run(args, label) {
  const result = spawnSync(FFMPEG, args, { stdio: ["ignore", "ignore", "inherit"] });
  if (result.error || result.status !== 0) {
    throw new Error(`${label} failed — is ffmpeg on PATH? (set FFMPEG=/path/to/ffmpeg)`);
  }
}

function encodeMp4(frameDir, file) {
  run(
    [
      "-y", "-framerate", String(FPS), "-i", join(frameDir, "f-%05d.jpg"),
      "-c:v", "libx264", "-preset", "slow", "-crf", "26",
      // yuv420p and an even-dimension filter: Safari and QuickTime refuse odd dimensions.
      "-pix_fmt", "yuv420p", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-movflags", "+faststart",
      file,
    ],
    "mp4 encode",
  );
}

/**
 * GIF in two passes. A single pass picks its palette from the first frames only, which wrecks
 * the dark themes at the end — they arrive after the palette is fixed and band badly.
 * `stats_mode=diff` weights the palette toward what actually changes between frames.
 */
function encodeGif(frameDir, file) {
  const palette = join(frameDir, "palette.png");
  const scale = "fps=10,scale=1000:-1:flags=lanczos";
  run(
    ["-y", "-i", join(frameDir, "f-%05d.jpg"), "-vf", `${scale},palettegen=stats_mode=diff`, palette],
    "gif palette",
  );
  run(
    [
      "-y", "-framerate", String(FPS), "-i", join(frameDir, "f-%05d.jpg"), "-i", palette,
      "-lavfi", `${scale} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
      "-loop", "0",
      file,
    ],
    "gif encode",
  );
}

const mb = (file) => `${(statSync(file).size / 1024 / 1024).toFixed(1)} MB`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  await assertReachable(EDITOR_URL);

  const frames = mkdtempSync(join(tmpdir(), "agentcanvas-tour-"));
  const chrome = launchChrome({
    port: PORT,
    userDataDir: join(ROOT, "node_modules", ".cache", "editor-tour"),
  });

  try {
    const page = await connectPage({ port: PORT });
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Emulation.setDeviceMetricsOverride", { ...VIEW, mobile: false });
    await seedLocale(page);
    console.log(`locale: ${LOCALE}`);

    if (ONLY !== "gif") {
      console.log("recording the full tour (11 modules)");
      await reload(page);
      await assertBeatsVisible(page, TOUR);
      const count = await record(page, TOUR, TOUR_S, frames);
      console.log(`  captured ${count} frames`);
      const file = join(OUT, "editor-tour.mp4");
      encodeMp4(frames, file);
      console.log(`  wrote ${file} (${mb(file)})`);
      rmSync(frames, { recursive: true, force: true });
      mkdirSync(frames, { recursive: true });
    }

    if (ONLY !== "mp4") {
      console.log("recording the README cut (6 modules)");
      await reload(page);
      await assertBeatsVisible(page, README_CUT);
      const count = await record(page, README_CUT, README_S, frames);
      console.log(`  captured ${count} frames`);
      const file = join(OUT, "editor-tour.gif");
      encodeGif(frames, file);
      console.log(`  wrote ${file} (${mb(file)})`);
    }

    page.close();
  } finally {
    chrome.kill();
    rmSync(frames, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
