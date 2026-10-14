/**
 * Does 复古风's ink follow its colourway now?
 *
 * The point of redrawing this set rather than keeping the exported SVGs: those
 * files bake `#3A332B`, which is the reason this style has four light palettes
 * and no dark one. A `currentColor` set means the mark takes whatever the
 * palette says the ink is — so this reads the rendered stroke on each of the
 * four, and four identical values would mean nothing was gained.
 *
 * The swatches carry no text, only `aria-label` — a probe matching on
 * `textContent` reported "swatch not found" four times.
 *
 * Read the `themeId` column, not the `theme` one: picking a swatch and clicking
 * 应用 in the same `evaluate` fires Apply before React has re-rendered with the
 * new pick, so each row applies the *previous* swatch. Harmless for what this
 * measures — the question is whether distinct palettes give distinct ink, and
 * `themeId` is what actually landed.
 */
import { connectPage, evaluate, launchChrome, sleep } from "./lib/cdp.mjs";

const PORT = 9351;
const chrome = launchChrome({ port: PORT, userDataDir: "/tmp/retro-ink-probe" });
const page = await connectPage({ port: PORT });
await page.send("Emulation.setDeviceMetricsOverride", {
  width: 1680, height: 1200, deviceScaleFactor: 1, mobile: false,
});
await page.send("Page.navigate", { url: "http://localhost:5177/editor.html" });
await sleep(4000);

const markProbe = `
  const box = document.querySelector('.tool-card[data-file-tool="true"] .tool-status-icon');
  const svg = box?.querySelector("svg");
  if (!svg) return { found: false };
  const cs = getComputedStyle(svg);
  const filled = [...svg.querySelectorAll("path")].find((p) => getComputedStyle(p).fill !== "none");
  return {
    found: true,
    ink: cs.stroke,
    mass: filled ? getComputedStyle(filled).fill : "no filled path",
    onPaper: getComputedStyle(document.querySelector(".chat-frame") ?? document.body).backgroundColor,
  };
`;

const rows = [];
for (const name of ["Retro Paper", "Retro Linen", "Retro Sepia", "Retro Dusk"]) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const clicked = await evaluate(page, `
      const card = [...document.querySelectorAll(".style-card")]
        .find((c) => c.textContent.includes("复古风") && !c.textContent.includes("像素"));
      if (!card) return "no card";
      card.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      const swatch = [...card.querySelectorAll(".style-card-swatch")]
        .find((s) => s.getAttribute("aria-label") === "${name}");
      if (!swatch) return "no swatch";
      swatch.click();
      const apply = [...card.querySelectorAll("button")].find((b) => /应用|Apply/.test(b.textContent));
      if (!apply) return "no apply";
      apply.click();
      return "clicked";
    `);
    await sleep(1400);
    const preset = await evaluate(page, `return document.querySelector(".preview-frame")?.dataset.stylePreset ?? null;`);
    if (preset === "retro" && clicked === "clicked") break;
    if (attempt === 11) rows.push({ theme: name, note: `never applied: ${clicked} / ${preset}` });
  }

  let mark = { found: false };
  for (let t = 0; t < 22 && !mark.found; t += 1) {
    await sleep(700);
    mark = await evaluate(page, markProbe);
  }
  const themeId = await evaluate(page, `return document.querySelector(".preview-frame")?.dataset.themePreset ?? null;`);
  rows.push({ theme: name, themeId, ink: mark.ink, mass: mark.mass, paper: mark.onPaper });
}

console.log(JSON.stringify(rows, null, 1));
chrome.kill();
