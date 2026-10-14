/**
 * Is the error row's icon still, in every style?
 *
 * "No animation" is not a source-level fact. A rule in any of the five style
 * branches, or a broad `svg` selector, could animate this element without ever
 * naming `.error-icon` — so the only honest check is the computed
 * `animationName` on the rendered element, style by style. The pseudo-elements
 * are read too: the hourglass motion that used to live here was on `::before`
 * and `::after`, which `getComputedStyle(el)` alone does not see.
 *
 * The error rows arrive in the *second* exchange of the replay, so this waits
 * for them rather than for a fixed delay.
 */
import { connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";

const PORT = 9357;
const STYLES = ["原生风", "游戏风", "复古风", "手绘风", "水墨风"];

const chrome = launchChrome({ port: PORT, userDataDir: "/tmp/still-probe" });
const page = await connectPage({ port: PORT });
await page.send("Emulation.setDeviceMetricsOverride", {
  width: 1680, height: 1200, deviceScaleFactor: 1, mobile: false,
});
await page.send("Page.navigate", { url: "http://localhost:5179/editor.html" });
await sleep(4500);

const readIcons = `
  const rows = [...document.querySelectorAll(".error-item")];
  if (!rows.length) return { found: 0 };
  return {
    found: rows.length,
    icons: rows.map((row) => {
      const box = row.querySelector(".error-icon");
      const svg = box?.querySelector("svg");
      if (!box) return { note: "no .error-icon" };
      return {
        text: row.querySelector("p")?.textContent?.slice(0, 16) ?? "",
        anim: box.getAttribute("data-anim") ?? "(absent)",
        boxAnim: getComputedStyle(box).animationName,
        /* 游戏风's marks are <img>, not <svg> — the first run of this probe
           read "no svg" there and my own filter counted the absence of an svg
           as motion. Walk the box, whatever it holds. (And no backticks in
           here: this whole block is a template literal.) */
        mark: box.firstElementChild?.tagName?.toLowerCase() ?? "empty",
        markAnim: box.firstElementChild ? getComputedStyle(box.firstElementChild).animationName : "none",
        // The hourglass sand lived on these two.
        beforeAnim: getComputedStyle(box, "::before").animationName,
        afterAnim: getComputedStyle(box, "::after").animationName,
        // And a transform would move it without an animation name.
        svgTransform: svg ? getComputedStyle(svg).transform : null,
        childAnims: [...box.querySelectorAll("*")]
          .map((n) => n.tagName.toLowerCase() + ":" + getComputedStyle(n).animationName)
          .filter((n) => !n.endsWith(":none")),
      };
    }),
  };
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
    const preset = await evaluate(page, `return document.querySelector(".preview-frame")?.dataset.stylePreset ?? null;`);
    if (clicked === "clicked" && preset) break;
    if (i === 19) console.log(`${label}: never applied (${clicked})`);
  }

  // The error rows are in the second exchange; wait for the replay to reach it.
  let read = { found: 0 };
  for (let t = 0; t < 40 && !read.found; t += 1) {
    await sleep(1000);
    read = await evaluate(page, readIcons);
  }

  const preset = await evaluate(page, `return document.querySelector(".preview-frame")?.dataset.stylePreset ?? null;`);
  const moving = (read.icons ?? []).filter(
    (i) =>
      [i.boxAnim, i.markAnim, i.beforeAnim, i.afterAnim].some((n) => n && n !== "none")
      || i.childAnims.length > 0,
  );
  console.log(
    `${label} (${preset}): ${read.found} rows, ${moving.length} moving`,
    moving.length ? JSON.stringify(moving, null, 1) : "",
  );
  if (!moving.length && read.icons?.[0]) {
    console.log(`   sample: <${read.icons[0].mark}> data-anim=${read.icons[0].anim} markAnim=${read.icons[0].markAnim} transform=${read.icons[0].svgTransform}`);
  }
}

chrome.kill();
