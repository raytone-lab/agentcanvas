/**
 * Probe: the interface-preview eye in the topbar.
 *
 * Dev-only, throwaway. Opens the editor, measures the four pieces of editor
 * furniture, clicks the eye, and measures them again — then presses Esc and
 * checks they all came back. Reports the canvas's own rect too, because the
 * point of the mode is that the interface gets the window.
 *
 *   URL=http://localhost:5178/editor.html node scripts/probe-ui-preview.mjs
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { assertReachable, connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";

const URL_ = process.env.URL ?? "http://localhost:5178/editor.html";
const PORT = Number(process.env.CDP_PORT ?? 9341);

/** Opacity/visibility and the rect, for each card the mode is supposed to fold. */
const MEASURE = `(() => {
  const read = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      opacity: style.opacity,
      visibility: style.visibility,
      pointerEvents: style.pointerEvents,
      w: Math.round(rect.width),
      h: Math.round(rect.height),
    };
  };
  const frame = document.querySelector(".preview-frame");
  const frameStyle = frame ? getComputedStyle(frame) : null;
  return JSON.stringify({
    attr: document.querySelector(".workspace-layout")?.getAttribute("data-ui-preview") ?? null,
    topbar: read(".topbar"),
    rail: read(".preset-nav"),
    labels: read(".region-labels"),
    exitPill: read(".ui-preview-exit"),
    frame: frame
      ? {
          w: Math.round(frame.getBoundingClientRect().width),
          h: Math.round(frame.getBoundingClientRect().height),
          selectLine: frameStyle.getPropertyValue("--select-line").trim(),
          selectFill: frameStyle.getPropertyValue("--select-fill").trim(),
        }
      : null,
    toolbar: document.querySelector(".module-toolbar") ? "mounted" : "absent",
  });
})()`;

const chrome = launchChrome({ port: PORT, userDataDir: mkdtempSync(join(tmpdir(), "uipreview-probe-")) });
try {
  await assertReachable(URL_);
  const page = await connectPage({ port: PORT });
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 1680,
    height: 1050,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await page.send("Page.navigate", { url: URL_ });
  await sleep(3500);

  /*
   * Put one pick on the canvas first, so what the eye reveals is visibly *this*
   * project rather than the opening skeleton. The editor opens in the welcome
   * state, so the conversation column stays a composer either way — the mode is
   * about the furniture, not the transcript, and the pick is enough to confirm
   * the live project is what gets the window.
   */
  const option = await evaluate(
    page,
    `const button = document.querySelector(".preset-panel-body button.preset-option");
     if (!button) return "MISS";
     button.click();
     return (button.closest(".preset-option-cell")?.textContent || "").trim().slice(0, 24);`,
  );
  console.log("option:", option);
  await sleep(1200);

  console.log("before:", await evaluate(page, `return ${MEASURE};`));

  const clicked = await evaluate(
    page,
    `const eye = document.querySelector(".topbar-ui-preview-button");
     if (!eye) return "MISS";
     eye.click();
     return eye.getAttribute("aria-label");`,
  );
  console.log("eye:", clicked);
  // Past `--motion-base`, so the fade has finished rather than been caught halfway.
  await sleep(1200);
  console.log("inside:", await evaluate(page, `return ${MEASURE};`));

  const shot = await page.send("Page.captureScreenshot", { format: "png" });
  writeFileSync("/tmp/ui-preview-in.png", Buffer.from(shot.data, "base64"));

  /*
   * The canvas stops being inert in here, which is the half of the mode that
   * matters for reading: the hover/pan handlers bail on `uiPreview`, so the
   * conversation column scrolls itself and the composer takes a click.
   */
  console.log(
    "interactive:",
    await evaluate(
      page,
      `const stack = document.querySelector(".preview-stack");
       if (!stack) return "no stack";
       const before = stack.scrollTop;
       stack.scrollTop = stack.scrollTop + 200;
       const field = document.querySelector(".preview-frame textarea, .preview-frame [contenteditable]");
       if (field) field.focus();
       return JSON.stringify({
         scrollable: stack.scrollHeight > stack.clientHeight,
         scrolledFrom: before,
         scrolledTo: stack.scrollTop,
         focused: document.activeElement?.tagName ?? null,
       });`,
    ),
  );

  await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(1200);
  console.log("after Esc:", await evaluate(page, `return ${MEASURE};`));

  const back = await page.send("Page.captureScreenshot", { format: "png" });
  writeFileSync("/tmp/ui-preview-out.png", Buffer.from(back.data, "base64"));
} finally {
  chrome.kill();
}
