/**
 * Does a pick in 复古风's left rail reach the centre column?
 *
 * The bug being verified is invisible to every source-level check: the rail set
 * the slot, the slot resolved, React rendered the icon, and the stylesheet hid
 * it and painted `/retro/file-status.svg` on top. So this measures the rendered
 * mark's *geometry* — the `d` of its first path — for each tile in turn, and a
 * tile that draws what the one before it drew is the failure.
 *
 * Two waits that are not optional: the canvas replays the conversation, so the
 * tool row does not exist for the first several seconds, and switching styles
 * remounts the frame.
 */
import { connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";

const PORT = 9349;
const chrome = launchChrome({ port: PORT, userDataDir: "/tmp/retro-icon-probe" });
const page = await connectPage({ port: PORT });
await page.send("Emulation.setDeviceMetricsOverride", {
  width: 1680, height: 1200, deviceScaleFactor: 1, mobile: false,
});
await page.send("Page.navigate", { url: "http://localhost:5177/editor.html" });
await sleep(4000);

/* Apply it, then confirm. The first version of this probe fired once and read
   `native/blank` back — the cards had not rendered yet, and a probe that does
   not check reports a clean pass on the style it never left. */
for (let i = 0; i < 20; i += 1) {
  const applied = await evaluate(page, `
    const card = [...document.querySelectorAll(".style-card")]
      .find((c) => c.textContent.includes("复古风") && !c.textContent.includes("像素"));
    if (!card) return "no card";
    card.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    const apply = [...card.querySelectorAll("button")].find((b) => /应用|Apply/.test(b.textContent));
    if (!apply) return "no apply";
    apply.click();
    return "clicked";
  `);
  await sleep(1200);
  const now = await evaluate(page, `return document.querySelector(".preview-frame")?.dataset.stylePreset ?? null;`);
  if (now === "retro") { console.log(`applied 复古风 (attempt ${i + 1}, ${applied})`); break; }
  if (i === 19) throw new Error(`never reached 复古风: last ${applied} / ${now}`);
}

console.log("frame:", JSON.stringify(await evaluate(page, `
  const f = document.querySelector(".preview-frame");
  return f ? { preset: f.dataset.stylePreset, id: f.dataset.styleId } : null;
`)));

/**
 * Open a group's panel in the left rail — that is where the galleries render
 * (`PresetRail` → `StateGallery`), one section per group, not all at once.
 */
async function openGroup(label) {
  const hit = await evaluate(page, `
    const nav = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "组件");
    nav?.click();
    return true;
  `);
  await sleep(600);
  const row = await evaluate(page, `
    const row = [...document.querySelectorAll(".layers-row.group-row")]
      .find((b) => b.textContent.trim().startsWith("${label}"));
    if (!row) return [...document.querySelectorAll(".layers-row.group-row")].map((b) => b.textContent.trim().slice(0, 10));
    row.click();
    return "clicked";
  `);
  await sleep(900);
  return { nav: hit, row };
}

console.log("open 工具调用:", JSON.stringify(await openGroup("工具调用")));

/** The replay has to reach the tool calls before there is anything to measure. */
for (let i = 0; i < 24; i += 1) {
  const n = await evaluate(page, `return document.querySelectorAll('.tool-card[data-file-tool="true"]').length;`);
  if (n > 0) { console.log(`file tool rows: ${n} (after ${i}s)`); break; }
  await sleep(1000);
}

console.log("galleries:", JSON.stringify(await evaluate(page, `
  return [...document.querySelectorAll(".am-state-options[data-slot]")].map((g) => ({
    slot: g.dataset.slot,
    tiles: [...g.querySelectorAll(".am-state-option")].map(
      (t) => t.dataset.optionId + (t.dataset.active === "true" ? " *" : ""),
    ),
  }));
`), null, 1));

/** The tool row's mark, identified by its geometry rather than by its name. */
const markProbe = `
  const box = document.querySelector('.tool-card[data-file-tool="true"] .tool-status-icon');
  if (!box) return { found: false };
  const svg = box.querySelector("svg");
  return {
    found: true,
    slot: svg?.dataset.iconSlot ?? null,
    d: svg?.querySelector("path")?.getAttribute("d")?.slice(0, 40) ?? null,
    paths: svg?.querySelectorAll("path").length ?? 0,
    boxBackground: getComputedStyle(box).backgroundImage,
    svgDisplay: svg ? getComputedStyle(svg).display : "no svg",
    stroke: svg ? getComputedStyle(svg).stroke : null,
    size: svg ? svg.getBoundingClientRect().width.toFixed(1) : null,
  };
`;
console.log("tool row, as applied:", JSON.stringify(await evaluate(page, markProbe), null, 1));

/** Walk all four tiles of 查看 and record what each one draws. */
const walk = [];
for (let i = 0; i < 4; i += 1) {
  const clicked = await evaluate(page, `
    const g = document.querySelector('.am-state-options[data-slot="tool.file_read"]');
    const tiles = [...(g?.querySelectorAll(".am-state-option") ?? [])];
    if (!tiles[${i}]) return null;
    tiles[${i}].click();
    return tiles[${i}].dataset.optionId;
  `);
  if (!clicked) break;
  /* A pick restarts the canvas replay, so the tool row is briefly absent — the
     third tile read back `found: false` on the first run of this probe for
     exactly that reason, which would have looked like a tile that draws
     nothing. Wait for the row rather than for a fixed delay. */
  let mark = { found: false };
  for (let t = 0; t < 20 && !mark.found; t += 1) {
    await sleep(700);
    mark = await evaluate(page, markProbe);
  }
  walk.push({ picked: clicked, draws: mark.d, paths: mark.paths, size: mark.size });
}
console.log("each tile of 查看:", JSON.stringify(walk, null, 1));

for (let i = 0; i < 25; i += 1) {
  const n = await evaluate(page, `return document.querySelectorAll(".artifact-launch-card .artifact-inline-icon").length;`);
  if (n > 0) break;
  await sleep(1000);
}
console.log("artifact icon:", JSON.stringify(await evaluate(page, `
  const box = document.querySelector(".artifact-launch-card .artifact-inline-icon");
  if (!box) return { found: false };
  const svg = box.querySelector("svg");
  return {
    found: true,
    slot: svg?.dataset.iconSlot ?? null,
    d: svg?.querySelector("path")?.getAttribute("d")?.slice(0, 36) ?? null,
    boxBackground: getComputedStyle(box).backgroundImage,
    svgDisplay: svg ? getComputedStyle(svg).display : "no svg",
    size: svg ? svg.getBoundingClientRect().width.toFixed(1) : null,
  };
`), null, 1));

/* The gain over the baked SVGs: the ink follows the palette. The exported
   files hardcode `#3A332B`, which is why this style has four light colourways
   and no dark one — a `currentColor` set is what unblocks that. */
const inks = [];
for (const name of ["Retro Paper", "Retro Linen", "Retro Sepia", "Retro Dusk"]) {
  const ok = await evaluate(page, `
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "${name}");
    if (!b) return false;
    b.click();
    const card = b.closest(".style-card");
    [...(card?.querySelectorAll("button") ?? [])].find((x) => /应用|Apply/.test(x.textContent))?.click();
    return true;
  `);
  if (!ok) { inks.push({ theme: name, ink: "swatch not found" }); continue; }
  let mark = { found: false };
  for (let t = 0; t < 20 && !mark.found; t += 1) {
    await sleep(700);
    mark = await evaluate(page, markProbe);
  }
  inks.push({ theme: name, ink: mark.stroke, draws: mark.d?.slice(0, 18) });
}
console.log("ink per colourway:", JSON.stringify(inks, null, 1));

console.log("terminal gallery drives the run row:", JSON.stringify(await (async () => {
  const out = [];
  for (let i = 0; i < 4; i += 1) {
    const clicked = await evaluate(page, `
      const g = document.querySelector('.am-state-options[data-slot="content.terminal"]');
      const tiles = [...(g?.querySelectorAll(".am-state-option") ?? [])];
      if (!tiles[${i}]) return null;
      tiles[${i}].click();
      return tiles[${i}].dataset.optionId;
    `);
    if (!clicked) break;
    let mark = { found: false };
    for (let t = 0; t < 20 && !mark.found; t += 1) {
      await sleep(700);
      mark = await evaluate(page, `
        const box = [...document.querySelectorAll('.tool-card .tool-status-icon')]
          .find((b) => b.querySelector('svg[data-icon-slot="content.terminal"]'));
        if (!box) return { found: false };
        const svg = box.querySelector("svg");
        return { found: true, d: svg.querySelector("path")?.getAttribute("d")?.slice(0, 28) };
      `);
    }
    out.push({ picked: clicked, draws: mark.d ?? "no run row on canvas" });
  }
  return out;
})(), null, 1));

console.log("session row mark:", JSON.stringify(await evaluate(page, `
  const svg = document.querySelector(".session-item svg[data-icon-slot]");
  return svg ? { slot: svg.dataset.iconSlot, d: svg.querySelector("path")?.getAttribute("d")?.slice(0, 36) } : null;
`)));

chrome.kill();
