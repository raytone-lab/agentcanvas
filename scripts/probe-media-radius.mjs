/**
 * The right panel's image loader, per style: does it round to the style's own
 * corner?
 *
 * Measured rather than read, because the literal this replaced lived in a CSS
 * module — a module cannot see which style it renders inside, so the mismatch
 * only exists on the live element.
 *
 * Getting here cost four wrong turns, all worth recording:
 *
 *  - The panel has no image tab by default; it needs a generated image, which
 *    means picking one of the 图片加载 options first.
 *  - That option only renders while its own group's panel is open, and the
 *    group reads 进度 on screen, not 加载 (the copy file carries both).
 *  - The token read sat inside an early `return` and came back empty in every
 *    style, which looked like the token not resolving.
 *  - The first element found was the *inline* loader in the chat, not the
 *    panel's. That one is governed by an `inherit` rule so it matches its card,
 *    which is correct and is not what was asked about. The panel is reached by
 *    clicking the inline image, which opens it as a tab.
 */
import { clickPresetOption, connectPage, evaluate, launchChrome, sleep } from "/Users/nz/Documents/agentcanvas_online_9.14/scripts/lib/cdp.mjs";
const PORT = 9369;
const chrome = launchChrome({ port: PORT, userDataDir: "/tmp/panel-probe" });
const page = await connectPage({ port: PORT });
await page.send("Emulation.setDeviceMetricsOverride", { width: 1680, height: 1200, deviceScaleFactor: 1, mobile: false });
await page.send("Page.navigate", { url: "http://localhost:5180/editor.html" });
await sleep(4500);

for (const label of ["原生风", "游戏风", "复古风", "手绘风", "水墨风"]) {
  for (let i = 0; i < 20; i++) {
    const c = await evaluate(page, `
      const card = [...document.querySelectorAll(".style-card")].find((c) => c.textContent.includes("${label}") && !c.textContent.includes("像素"));
      if (!card) return "no card";
      card.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      const a = [...card.querySelectorAll("button")].find((b) => /应用|Apply/.test(b.textContent));
      if (!a) return "no apply"; a.click(); return "clicked";`);
    await sleep(1200); if (c === "clicked") break;
  }
  await evaluate(page, `[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "组件")?.click(); return true;`);
  await sleep(500);
  await evaluate(page, `[...document.querySelectorAll(".layers-row.group-row")].find((b) => b.textContent.trim().startsWith("进度"))?.click(); return true;`);
  await sleep(800);
  for (const id of ["media-image-blur", "media-image-grid", "media-image-palette", "media-image-layers"]) {
    try { await clickPresetOption(page, id); break; } catch {}
  }

  let opened = "no inline image";
  for (let t = 0; t < 45; t++) {
    await sleep(800);
    opened = await evaluate(page, `
      const b = document.querySelector(".generated-image-inline-button");
      if (!b) return "no inline image";
      b.click(); return "clicked inline image";`);
    if (opened === "clicked inline image") break;
  }
  await sleep(500);

  const read = await evaluate(page, `
    const frame = document.querySelector(".preview-frame");
    const token = getComputedStyle(frame).getPropertyValue("--preview-media-radius").trim();
    const host = document.querySelector(".image-output-preview");
    if (!host) return { token, found: false, tabs: [...document.querySelectorAll(".opened-output-item")].map(t => t.textContent.trim().slice(0,12)) };
    const rows = [host, ...host.querySelectorAll("*")]
      .map((n) => ({ cls: (n.getAttribute("class") ?? n.tagName.toLowerCase()).split(" ")[0].slice(0, 30), r: getComputedStyle(n).borderTopLeftRadius }))
      .filter((x) => x.r !== "0px");
    return { token, found: true, rows: rows.slice(0, 6) };`);

  console.log(`\n${label}  token=${read.token}  [${opened}]`);
  if (!read.found) { console.log(`   no .image-output-preview; tabs: ${JSON.stringify(read.tabs)}`); continue; }
  for (const r of read.rows) console.log(`   ${r.r.padEnd(11)} ${r.cls}`);
}
chrome.kill();
