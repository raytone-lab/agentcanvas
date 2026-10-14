/**
 * Does the avatar gallery ring the face the canvas is drawing?
 *
 * The reported gap: the canvas shows both avatars in every style, and the
 * 架构 → 对话区 → 头像 tiles showed none of them selected. So this compares the
 * two sides directly — what the canvas renders for `author.*`, and which tile
 * carries `data-active="true"` — rather than trusting either alone.
 */
import { connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";

const PORT = 9401;
const STYLES = ["原生风", "游戏风", "复古风", "手绘风", "水墨风"];

const chrome = launchChrome({ port: PORT, userDataDir: "/tmp/avatar-probe" });
const page = await connectPage({ port: PORT });
await page.send("Emulation.setDeviceMetricsOverride", {
  width: 1680, height: 1200, deviceScaleFactor: 1, mobile: false,
});
await page.send("Page.navigate", { url: "http://localhost:5183/editor.html" });
await sleep(4500);

/**
 * The 对话区 panel. A plain button in the 架构 list — not a
 * `.layers-row.group-row`, which belongs to the 组件 section.
 */
const openConversation = `
  const nav = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "架构");
  nav?.click();
  return true;
`;

const read = `
  const out = { canvas: [], tiles: [] };
  for (const slot of ["author.user", "author.agent"]) {
    /* What the canvas draws. The avatars render as <img> in the styles that
       ship painted portraits and as <svg> in the rest, so read either. */
    const host = document.querySelectorAll(".msg-avatar");
    const group = document.querySelector('.am-state-options[data-slot="' + slot + '"]');
    out.tiles.push({
      slot,
      present: Boolean(group),
      tiles: group
        ? [...group.querySelectorAll(".am-state-option")].map(
            (t) => t.dataset.optionId + (t.dataset.active === "true" ? " ●" : ""),
          )
        : [],
      ringed: group
        ? [...group.querySelectorAll(".am-state-option")].filter((t) => t.dataset.active === "true").length
        : 0,
    });
    out.canvasAvatars = host.length;
  }
  return out;
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
  await evaluate(page, openConversation);
  await sleep(600);
  await evaluate(page, `
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "对话区");
    b?.click(); return true;
  `);
  await sleep(1000);

  let state = null;
  for (let t = 0; t < 30; t += 1) {
    await sleep(800);
    state = await evaluate(page, read);
    if (state?.tiles?.[0]?.present && state.canvasAvatars > 0) break;
    /* Re-open on each attempt. 游戏风 and 手绘风 came back with the gallery
       *absent* rather than unringed on the first run — the panel had not
       opened, which is a different fact and would have read as a failure. */
    if (t % 5 === 4) {
      await evaluate(page, openConversation);
      await sleep(400);
      await evaluate(page, `
        const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "对话区");
        b?.click(); return true;
      `);
    }
  }
  const preset = await evaluate(page, `return document.querySelector(".preview-frame")?.dataset.stylePreset ?? null;`);
  console.log(`\n${label} (${preset})  canvas avatars: ${state?.canvasAvatars ?? "?"}`);
  for (const row of state?.tiles ?? []) {
    console.log(
      `   ${row.slot.padEnd(13)} ${row.present ? `ringed=${row.ringed}` : "GALLERY NOT ON SCREEN"}`
      + `  ${JSON.stringify(row.tiles)}`,
    );
  }
}

chrome.kill();
