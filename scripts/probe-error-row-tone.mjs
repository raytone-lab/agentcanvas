/**
 * Are the canvas's incident rows red in any style?
 *
 * Reported as "所有风格的画布内容区的展示都不要是红色的，要和工具行的色调一致" over
 * four consecutive red rows (写入失败 / 正在重试 / 重试耗尽 / 沙箱已关闭) under one
 * assistant turn.
 *
 * Two independent sources, which is why fixing one was not enough:
 *   - `.error-icon { color: var(--danger) }` in `agentmatrix.css`, inherited by
 *     every style except 原生风, which had already overridden it locally.
 *   - `.preview-frame[data-style-preset="studio"] .error-item > p`, which
 *     reddened the sentence too.
 *
 * Measured per style against that style's own tool-row icon colour — the thing
 * the rows were asked to match — rather than against a hardcoded value.
 *
 *   node scripts/probe-error-row-tone.mjs [port]
 */
import { writeFileSync } from "node:fs";

import { connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";

const devPort = process.argv[2] ?? "5191";
const PORT = 9373;

/* By the label on the card: the id never matches the Chinese name here (漫画风
   is `studio`, 像素风 is `pixel`), so the label finds the card and the preset is
   read back to confirm which one actually landed. */
const STYLES = ["原生风", "水墨风", "游戏风", "手绘风", "复古风", "漫画风", "像素风", "牛皮纸"];

const isRed = (c) => {
  const m = String(c).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  if (!m) return false;
  const [r, g, b] = [+m[1], +m[2], +m[3]];
  return r > 110 && r - g > 40 && r - b > 40;
};

const chrome = launchChrome({ port: PORT, userDataDir: "/tmp/error-tone-probe" });
const page = await connectPage({ port: PORT });
await page.send("Page.enable");
await page.send("Emulation.setDeviceMetricsOverride", {
  width: 1680, height: 1200, deviceScaleFactor: 1, mobile: false,
});
await page.send("Page.navigate", { url: `http://localhost:${devPort}/editor.html` });
await sleep(4500);

/*
 * The incident rows are a module the default canvas does not switch on, so a
 * probe that measures only what is on screen reports "0 red" while the bug is
 * still there — it did, on the first run. What is being checked is purely a CSS
 * question ("what colour does an incident row resolve to in this style"), so the
 * row is injected in exactly the shape `ChatFrame` renders —
 * `<article class="error-item"><span class="error-icon"><svg/></span><p/></article>`
 * — measured, and removed again. A real row matches the same selectors, which is
 * the whole of what the fix touched.
 *
 * Removing it matters: the first version left every probe in the DOM, so each
 * style inherited the last one's litter and the "real rows" count climbed 1,2,3,4
 * as if the canvas were filling up.
 */
const MEASURE = `
  const frame = document.querySelector(".preview-frame");
  if (!frame) return { preset: null };

  const probe = document.createElement("article");
  probe.className = "error-item";
  probe.dataset.probe = "tone";
  probe.innerHTML = '<span class="error-icon">'
    + '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M4 4h10v16H4z"/></svg>'
    + '</span><p>写入 notes.md 失败，磁盘配额已满。</p>';
  // Inside the transcript, so it inherits what a real row would.
  (frame.querySelector(".timeline-list") ?? frame.querySelector(".chat-frame") ?? frame)
    .appendChild(probe);

  const tool = frame.querySelector(".tool-status-icon");
  const out = {
    preset: frame.dataset.stylePreset ?? null,
    errorIcon: getComputedStyle(probe.querySelector(".error-icon")).color,
    errorText: getComputedStyle(probe.querySelector("p")).color,
    toolIcon: tool ? getComputedStyle(tool).color : null,
    danger: getComputedStyle(frame).getPropertyValue("--danger").trim(),
  };
  probe.remove();
  return out;
`;

const rows = [];
for (const label of STYLES) {
  /* The picker is a scrolling list, so a card can be real but below the fold —
     three styles reported "absent" until this scrolled to them. */
  const applied = await evaluate(page, `
    const card = [...document.querySelectorAll(".style-card")]
      .find((c) => c.textContent.includes(${JSON.stringify(label)}));
    if (!card) return "absent";
    card.scrollIntoView({ block: "center" });
    card.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    const apply = [...card.querySelectorAll("button")].find((b) => /应用|Apply/.test(b.textContent));
    if (!apply) return "no-apply";
    apply.click();
    return "clicked";
  `);
  if (applied !== "clicked") { rows.push({ label, skipped: applied }); continue; }

  // The frame remounts on a style switch.
  await sleep(3000);
  rows.push({ label, ...(await evaluate(page, MEASURE)) });
}

console.log("style      preset      errorIcon                 errorText                 toolIcon");
let bad = 0;
for (const r of rows) {
  if (r.skipped) { console.log(`${r.label.padEnd(10)} — skipped (${r.skipped})`); continue; }
  const flags = [];
  if (isRed(r.errorIcon)) { flags.push("ICON RED"); bad += 1; }
  if (isRed(r.errorText)) { flags.push("TEXT RED"); bad += 1; }
  if (r.errorIcon !== r.toolIcon && r.toolIcon) flags.push("icon ≠ tool row");
  console.log(
    `${r.label.padEnd(10)} ${String(r.preset).padEnd(11)} ${String(r.errorIcon).padEnd(25)} ` +
    `${String(r.errorText).padEnd(25)} ${String(r.toolIcon).padEnd(25)}` +
    (flags.length ? `  ← ${flags.join(", ")}` : ""),
  );
}
const done = rows.filter((r) => !r.skipped).length;
console.log(`\n${bad} red readings across ${done} styles applied through the picker`);

/*
 * Second pass, and the exhaustive one.
 *
 * The picker only mounts a subset of cards — 漫画风, 像素风 and 牛皮纸 are not in
 * the DOM at all, so the pass above can never reach them, and `studio` is
 * exactly the style that reddened the sentence. The rules in question are keyed
 * on `data-style-preset`, so driving that attribute directly over the full
 * `presetStyleIds` union tests every branch, including ids the picker does not
 * offer.
 *
 * This deliberately does *not* apply the theme (`applyTheme` writes on
 * `documentElement`, and setting the attribute alone does not do it). That is
 * fine and is the point: `--danger` stays whatever the live theme resolves to,
 * and the question here is only whether a style branch *reaches for* it. A red
 * reading is a red reading.
 */
const ALL = ["blank", "native", "illustrated", "studio", "workbuddy", "zine", "game",
  "pixel", "retro", "handdrawn", "inkwash", "pixeldesk", "tech"];

const sweep = await evaluate(page, `
  const frame = document.querySelector(".preview-frame");
  const was = frame.dataset.stylePreset;
  const out = [];
  for (const id of ${JSON.stringify(ALL)}) {
    frame.dataset.stylePreset = id;
    const probe = document.createElement("article");
    probe.className = "error-item";
    probe.innerHTML = '<span class="error-icon">'
      + '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M4 4h10v16H4z"/></svg>'
      + '</span><p>写入失败</p>';
    (frame.querySelector(".timeline-list") ?? frame.querySelector(".chat-frame") ?? frame)
      .appendChild(probe);
    /* Border and background as well as foreground. Measuring the text colour
       alone is how a third red source survived the first pass: 漫画风 painted a
       red left edge bar and a 6% red wash on the card, and neither is visible
       to a foreground-only check. (No backticks in this comment on purpose --
       it lives inside a template literal.) */
    const cs = getComputedStyle(probe);
    out.push({
      id,
      icon: getComputedStyle(probe.querySelector(".error-icon")).color,
      text: getComputedStyle(probe.querySelector("p")).color,
      bg: cs.backgroundColor,
      edge: [cs.borderLeftColor, cs.borderInlineStartColor].find((c) => c && c !== "rgba(0, 0, 0, 0)")
        ?? cs.borderLeftColor,
      edgeWidth: cs.borderLeftWidth,
    });
    probe.remove();
  }
  frame.dataset.stylePreset = was;
  return out;
`);

console.log("\nall 13 style branches, driven directly:");
let sweepBad = 0;
for (const s of sweep) {
  const flags = [];
  if (isRed(s.icon)) { flags.push("ICON RED"); sweepBad += 1; }
  if (isRed(s.text)) { flags.push("TEXT RED"); sweepBad += 1; }
  if (isRed(s.bg)) { flags.push("BG RED"); sweepBad += 1; }
  if (isRed(s.edge) && parseFloat(s.edgeWidth) > 0) { flags.push("EDGE RED"); sweepBad += 1; }
  console.log(
    `  ${s.id.padEnd(12)} icon ${s.icon.padEnd(22)} text ${s.text.padEnd(22)} ` +
    `bg ${s.bg.padEnd(24)} edge ${String(s.edgeWidth).padStart(4)} ${s.edge.padEnd(22)}` +
    (flags.length ? "  ← " + flags.join(", ") : ""));
}
console.log(`\n${sweepBad} red readings across all ${ALL.length} style branches`);

writeFileSync("/tmp/error-row-tone.json", JSON.stringify({ picker: rows, sweep }, null, 2));

chrome.kill();
process.exit(0);
