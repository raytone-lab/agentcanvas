/**
 * Probe: the right panel's three run sections (任务列表 / 执行进度 / 工作区文件).
 *
 * Dev-only, throwaway. Opens the editor, ticks the three cards in 右栏, and
 * reports what the canvas drew — the rows it found, and whether any style has
 * put a border or a fill back on them.
 *
 *   node scripts/probe-panel-sections.mjs            # native
 *   STYLE=handdrawn node scripts/probe-panel-sections.mjs
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  assertReachable,
  connectPage,
  evaluate,
  launchChrome,
  sleep,
} from "./lib/cdp.mjs";

const URL_ = process.env.URL ?? "http://localhost:5175/editor.html";
const PORT = Number(process.env.CDP_PORT ?? 9333);

const chrome = launchChrome({ port: PORT, userDataDir: mkdtempSync(join(tmpdir(), "panel-probe-")) });
try {
  await assertReachable(URL_);
  const page = await connectPage({ port: PORT });
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 1680,
    height: 1300,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await page.send("Page.navigate", { url: URL_ });
  await sleep(3500);

  // Open 右栏 and tick all three panel contents.
  //
  // Keyed off the row's visible label, not `data-preset-group`: the rail is
  // mid-refactor in a parallel branch and the group tiles no longer carry that
  // attribute — the groups are `.layers-row.group-row` buttons now.
  const ticked = await evaluate(
    page,
    `const row = [...document.querySelectorAll("button.layers-row.group-row")]
       .find((el) => (el.textContent || "").trim() === "右栏");
     if (!row) return "MISS";
     row.click();
     return "ok";`,
  );
  console.log("group:", ticked);
  await sleep(900);

  for (const label of ["执行进度", "任务列表", "工作区文件"]) {
    const hit = await evaluate(
      page,
      `const cell = [...document.querySelectorAll(".preset-option-cell")]
         .find((el) => (el.textContent || "").includes(${JSON.stringify(label)}));
       const button = cell && cell.querySelector(".preset-option");
       if (!button) {
         const loose = [...document.querySelectorAll("button.preset-option")]
           .find((el) => (el.parentElement?.textContent || "").includes(${JSON.stringify(label)}));
         if (!loose) return "MISS";
         loose.click();
         return "clicked (loose)";
       }
       button.click();
       return "clicked";`,
    );
    console.log(`${label}: ${hit}`);
    await sleep(500);
  }

  // Let the replay run through the tool calls so the rows have something in them.
  /*
   * Picking a panel content does not restart the replay — only the thinking
   * options do, which is deliberate — so by the time the three are ticked the
   * run has finished and every row reads 已完成. Reloading replays from the
   * first event with the sections already on, which is the only way to watch a
   * row go from running to done.
   */
  if (process.env.REPLAY) {
    await page.send("Page.navigate", { url: URL_ });
    await sleep(Number(process.env.REPLAY));
  } else {
    await sleep(Number(process.env.SETTLE ?? 9000));
  }

  /*
   * Force the style on the frame rather than driving the picker.
   *
   * The picker is mid-refactor in a parallel branch (it is a collapsed chip
   * now), so clicking it is unreliable this week. Every style branch is keyed
   * on `data-style-preset` / `data-style-id`, so writing the attributes tests
   * the same cascade — which is what a border or a fill coming back would come
   * from. It does not swap the theme tokens, so read colours with that in mind.
   */
  if (process.env.STYLE) {
    const forced = await evaluate(
      page,
      `const frame = document.querySelector(".preview-frame");
       if (!frame) return "MISS";
       frame.setAttribute("data-style-preset", ${JSON.stringify(process.env.STYLE)});
       frame.setAttribute("data-style-id", ${JSON.stringify(process.env.STYLE)});
       return "forced";`,
    );
    console.log("style:", forced);
    await sleep(600);
  }

  const report = await evaluate(
    page,
    `const read = (sel) => {
       const el = document.querySelector(".preview-frame " + sel);
       if (!el) return null;
       const cs = getComputedStyle(el);
       return {
         rows: [...el.querySelectorAll("li")].map((li) => li.textContent.trim()),
         empty: el.querySelector(".panel-section-empty")?.textContent?.trim() ?? null,
         count: null,
         note: el.querySelector(".panel-section-note")?.textContent?.trim() ?? null,
         fillWidth: el.querySelector(".run-progress-fill")?.style?.width ?? null,
         border: cs.borderTopWidth + " " + cs.borderTopStyle,
         background: cs.backgroundColor,
         font: cs.fontSize,
         rowFont: (() => {
           const row = el.querySelector("li");
           if (!row) return null;
           const rs = getComputedStyle(row);
           const label = row.querySelector(".run-task-label, .workspace-file-name");
           return rs.fontSize + " / label " + (label ? getComputedStyle(label).fontSize : "-");
         })(),
         titleFont: (() => {
           const t = el.querySelector(".panel-section-title");
           return t ? getComputedStyle(t).fontSize + " w" + getComputedStyle(t).fontWeight : null;
         })(),
       };
     };
     return {
       style: document.querySelector(".preview-frame")?.getAttribute("data-style-preset"),
       progress: read(".run-progress"),
       tasks: read(".run-task-list"),
       files: read(".workspace-files"),
     };`,
  );
  console.log(JSON.stringify(report, null, 2));

  // A picture of the right column, which is the only way to judge the rhythm.
  const box = await evaluate(
    page,
    `const el = document.querySelector(".preview-frame .right-panel");
     if (!el) return null;
     const r = el.getBoundingClientRect();
     return { x: Math.floor(r.x) - 8, y: Math.floor(r.y) - 8, width: Math.ceil(r.width) + 16, height: Math.ceil(r.height) + 16 };`,
  );
  if (box) {
    const shot = await page.send("Page.captureScreenshot", {
      format: "png",
      clip: { ...box, scale: 2 },
    });
    const { writeFileSync } = await import("node:fs");
    const out = `/tmp/panel-sections-${process.env.STYLE ?? "native"}.png`;
    writeFileSync(out, Buffer.from(shot.data, "base64"));
    console.log("shot:", out);

    // And the top of the panel on its own: the three sections are what is being
    // judged, and they are a fifth of a full-height column.
    const topShot = await page.send("Page.captureScreenshot", {
      format: "png",
      clip: { ...box, height: Math.min(box.height, 300), scale: 3 },
    });
    const topOut = `/tmp/panel-top-${process.env.STYLE ?? "native"}.png`;
    writeFileSync(topOut, Buffer.from(topShot.data, "base64"));
    console.log("top:", topOut);
  }
} finally {
  chrome.kill();
}
