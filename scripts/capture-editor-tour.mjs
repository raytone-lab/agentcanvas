#!/usr/bin/env node
/**
 * Record the README tour by driving the real editor, then hand the frames to the compositor.
 *
 *   npm run dev                              # in one terminal
 *   npm run capture:tour                     # records, composes, encodes
 *
 * Writes:
 *
 *   public/landing/editor-tour.mp4   25s, 1920×1200, the editor on a paper stage with captions
 *   public/landing/editor-tour.gif   the same cut, 960px wide, for the README
 *
 * The GIF exists because GitHub will not play a repository-local mp4: `![](x.mp4)` renders as
 * a broken link, and only an uploaded attachment URL gets a player. A GIF is the only format
 * that animates inline from a committed file.
 *
 * The story is the product in five beats, built up from an empty canvas: lay out the
 * sidebar and composer, add modules, restyle the whole canvas three times, replay an event
 * stream, open the export. Every click is a real mouse event on the real editor — nothing is
 * mocked or re-staged. The pointer arrow is an injected overlay, because headless
 * screenshots contain no cursor and without it the UI appears to change on its own.
 *
 * Recording and acting run concurrently: a screenshot loop writes timestamped frames while
 * the timeline performs its clicks, so a click never stalls the frame clock. The compositor
 * (scripts/compose-editor-tour.py) resamples those frames onto a constant frame rate.
 *
 * Recorded in English: the README is English. The locale is seeded into localStorage before
 * the app boots rather than clicked, so the switch is never on screen.
 *
 * Options (env):
 *   URL     editor URL       (default http://localhost:5175/editor.html)
 *   PORT    devtools port    (default 9225)
 *   FFMPEG  encoder path     (default "ffmpeg" on PATH)
 *   KEEP    keep the frame directory and print its path
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertReachable, connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";

const EDITOR_URL = process.env.URL ?? "http://localhost:5175/editor.html";
const PORT = Number(process.env.PORT ?? 9225);
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const LOCALE_STORAGE_KEY = "agentcanvas.locale";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "landing");

/**
 * The editor's own viewport, at 1x: the compositor places it on the stage pixel for pixel,
 * so nothing is resampled. (A fractional device scale renders tiled, offset frames in
 * headless Chrome and puts real mouse events in the wrong place.)
 */
const VIEW = { width: 1600, height: 1000, deviceScaleFactor: 1 };
const DURATION_S = 25;

/**
 * The timeline. `at` is seconds from the first frame; each step is one gesture. Targets are
 * structural selectors (data attributes, aria labels) resolved at the moment of the step,
 * because what a step finds depends on what the previous one opened.
 */
const TIMELINE = [
  { at: 0.9, click: option("sidebar-title") },
  { at: 1.4, click: option("sidebar-new-button") },
  { at: 1.9, click: option("sidebar-search") },
  { at: 2.4, click: option("sidebar-sessions") },
  { at: 2.9, click: option("sidebar-grouping") },
  { at: 3.6, click: groupRow("Chat area") },
  { at: 4.2, click: option("chat-visible") },
  { at: 4.9, click: groupRow("Composer") },
  { at: 5.5, click: option("prompt-shortcuts") },
  { at: 6.0, click: option("model-config") },
  { at: 6.8, click: `.nav-section-tile[data-nav-section="components"]` },
  { at: 7.5, click: option("thinking-orbit") },
  { at: 8.1, click: option("reasoning-writing-typewriter") },
  { at: 9.2, style: "inkwash" },
  { at: 11.7, style: "game" },
  { at: 14.2, style: "tech" },
  { at: 16.6, click: `button[aria-label="Run preview"]` },
  { at: 22.0, click: `button[aria-label="Export"]` },
];

function option(id) {
  return `.preset-option-cell[data-option-id="${id}"] .preset-option`;
}

/** A group row in the open section, by its English label (the recording is English). */
function groupRow(label) {
  return { row: label };
}

const POINTER_SETUP = `
  if (!document.getElementById("__demo_pointer")) {
    const style = document.createElement("style");
    style.textContent = \`
      #__demo_pointer {
        position: fixed; top: 0; left: 0; width: 26px; height: 32px;
        pointer-events: none; z-index: 2147483647; opacity: 0;
        transform: var(--at, translate(800px, 520px));
        transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms linear;
        filter: drop-shadow(0 4px 8px rgba(13, 18, 28, 0.32));
      }
      #__demo_pointer svg { transition: transform 140ms ease; transform-origin: 2px 2px; }
      #__demo_pointer[data-down="true"] svg { transform: scale(0.86); }
      #__demo_pointer i {
        position: absolute; left: 0; top: 0; width: 16px; height: 16px;
        margin: -8px 0 0 -8px; border-radius: 999px;
        background: rgba(255, 106, 0, 0.28); border: 1.5px solid rgba(255, 106, 0, 0.75); opacity: 0;
      }
      #__demo_pointer[data-down="true"] i { animation: __demo_ping 520ms cubic-bezier(0.22, 1, 0.36, 1); }
      @keyframes __demo_ping {
        from { opacity: 1; transform: scale(0.4); }
        to   { opacity: 0; transform: scale(2.8); }
      }
    \`;
    document.head.appendChild(style);
    const pointer = document.createElement("div");
    pointer.id = "__demo_pointer";
    pointer.innerHTML =
      '<i></i><svg width="26" height="32" viewBox="0 0 24 30" fill="none">' +
      '<path d="M2 1.5 L2 22 L7.2 17.2 L10.6 25.5 L14.2 24 L10.8 15.8 L17.8 15.4 Z"' +
      ' fill="#ffffff" stroke="#111214" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.appendChild(pointer);
  }
  return "ok";
`;

/** Centre of the first match, scrolled into view first; null if absent or not visible. */
async function centerOf(page, target) {
  const find =
    typeof target === "string"
      ? `document.querySelector(${JSON.stringify(target)})`
      : `[...document.querySelectorAll(".preset-panel .group-row")].find((r) => r.textContent.trim().startsWith(${JSON.stringify(target.row)}))`;
  return evaluate(
    page,
    `const el = ${find};
     if (!el) return null;
     el.scrollIntoView({ block: "nearest", inline: "nearest" });
     const r = el.getBoundingClientRect();
     if (!r.width || !r.height) return null;
     return { x: r.x + r.width / 2, y: r.y + r.height / 2 };`,
  );
}

async function glide(page, point) {
  await evaluate(
    page,
    `const p = document.getElementById("__demo_pointer");
     p.style.setProperty("--at", "translate(${point.x}px, ${point.y}px)");
     p.style.opacity = "1";
     return "ok";`,
  );
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
}

async function press(page, point) {
  await evaluate(
    page,
    `const p = document.getElementById("__demo_pointer");
     p.dataset.down = "true";
     setTimeout(() => { delete p.dataset.down; }, 260);
     return "ok";`,
  );
  const common = { x: point.x, y: point.y, button: "left", clickCount: 1 };
  await page.send("Input.dispatchMouseEvent", { type: "mousePressed", ...common });
  await sleep(70);
  await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...common });
}

async function click(page, target, label) {
  const point = await centerOf(page, target);
  if (!point) {
    if (process.env.KEEP) {
      const { data } = await page.send("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(tmpdir(), "agentcanvas-tour-miss.png"), Buffer.from(data, "base64"));
    }
    throw new Error(`tour target not found: ${label ?? JSON.stringify(target)}`);
  }
  await glide(page, point);
  await sleep(430);
  await press(page, point);
}

/** Hover a style card so it opens, then press its apply button. */
async function applyStyle(page, style) {
  const card = await centerOf(page, `.style-card[data-style="${style}"]`);
  if (!card) throw new Error(`no style card "${style}"`);
  await glide(page, card);
  await sleep(600);
  await click(page, `.style-card[data-style="${style}"] .style-card-apply`, `${style} apply`);
}

async function act(page, started) {
  for (const step of TIMELINE) {
    const wait = step.at * 1000 - (Date.now() - started);
    if (wait > 0) await sleep(wait);
    const t = ((Date.now() - started) / 1000).toFixed(1);
    if (step.style) {
      await applyStyle(page, step.style);
      console.log(`  ${t}s  style ${step.style}`);
    } else {
      await click(page, step.click);
      console.log(`  ${t}s  ${typeof step.click === "string" ? step.click : step.click.row}`);
    }
  }
}

/**
 * Frames come from the screencast, which pushes one whenever the page repaints — far
 * smoother than a screenshot loop, which managed ~12 fps at this size. A still page sends
 * nothing; the compositor holds the last frame across the gap.
 */
async function shoot(page, dir, started) {
  const stamps = [];
  let index = 0;
  const off = page.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    const t = metadata.timestamp - started / 1000;
    const name = `f-${String(index).padStart(5, "0")}.jpg`;
    index += 1;
    writeFileSync(join(dir, name), Buffer.from(data, "base64"));
    stamps.push({ t, name });
    page.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await page.send("Page.startScreencast", {
    format: "jpeg",
    quality: 92,
    maxWidth: VIEW.width,
    maxHeight: VIEW.height,
    everyNthFrame: 1,
  });
  return async () => {
    await page.send("Page.stopScreencast");
    off();
    stamps.sort((a, b) => a.t - b.t);
    return stamps;
  };
}

function run(cmd, args, label) {
  const result = spawnSync(cmd, args, { stdio: ["ignore", "inherit", "inherit"] });
  if (result.error || result.status !== 0) throw new Error(`${label} failed`);
}

const mb = (file) => `${(statSync(file).size / 1024 / 1024).toFixed(1)} MB`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  await assertReachable(EDITOR_URL);
  const frames = mkdtempSync(join(tmpdir(), "agentcanvas-tour-"));
  const chrome = launchChrome({ port: PORT, userDataDir: join(ROOT, "node_modules", ".cache", "editor-tour") });

  try {
    const page = await connectPage({ port: PORT });
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `try { localStorage.setItem(${JSON.stringify(LOCALE_STORAGE_KEY)}, "en"); } catch {}`,
    });
    await page.send("Emulation.setDeviceMetricsOverride", { ...VIEW, mobile: false });
    await page.send("Page.navigate", { url: EDITOR_URL });
    await sleep(6000);
    await evaluate(page, POINTER_SETUP);
    await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 800, y: 520 });

    // The tour ends on Export, which really downloads a zip; nothing needs to land on disk.
    await page.send("Page.setDownloadBehavior", { behavior: "deny" });

    console.log("recording");
    const started = Date.now();
    const finish = await shoot(page, frames, started);
    await act(page, started);
    const rest = DURATION_S * 1000 - (Date.now() - started);
    if (rest > 0) await sleep(rest);
    const stamps = await finish();
    writeFileSync(join(frames, "stamps.json"), JSON.stringify(stamps));
    console.log(`  captured ${stamps.length} frames (${(stamps.length / DURATION_S).toFixed(1)} fps)`);
    page.close();
  } finally {
    chrome.kill();
  }

  console.log("composing");
  const composed = join(frames, "out");
  run("python3", [join(ROOT, "scripts", "compose-editor-tour.py"), frames, composed, String(DURATION_S)], "compose");

  const mp4 = join(OUT, "editor-tour.mp4");
  run(
    FFMPEG,
    [
      "-y", "-loglevel", "error", "-framerate", "30", "-i", join(composed, "c-%05d.jpg"),
      "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart", mp4,
    ],
    "mp4 encode",
  );
  console.log(`  wrote ${mp4} (${mb(mp4)})`);

  // GIF in two passes: a single pass picks its palette from the first frames only, which
  // bands the dark styles that arrive later. `stats_mode=diff` weights what changes.
  const gif = join(OUT, "editor-tour.gif");
  const palette = join(frames, "palette.png");
  const scale = "fps=12,scale=960:-1:flags=lanczos";
  run(FFMPEG, ["-y", "-loglevel", "error", "-i", mp4, "-vf", `${scale},palettegen=stats_mode=diff:max_colors=200`, palette], "gif palette");
  run(
    FFMPEG,
    [
      "-y", "-loglevel", "error", "-i", mp4, "-i", palette,
      "-lavfi", `${scale} [x]; [x][1:v] paletteuse=dither=sierra2_4a:diff_mode=rectangle`,
      "-loop", "0", gif,
    ],
    "gif encode",
  );
  console.log(`  wrote ${gif} (${mb(gif)})`);

  if (process.env.KEEP) console.log(`frames kept in ${frames}`);
  else rmSync(frames, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
