import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { selectablePresetStyleOptions } from "../app/projection/presetRailData";
import { presetStyleIds } from "../schema/agentuxConfig";
import { hasPresetAction } from "../schema/presetActions";
import { presetGroups } from "../schema/presets";
import { retroThemePresetIds, themeTokens } from "./themeTokens";

const css = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

describe("Retro Paper style", () => {
  it("is selectable with its own actionable theme", () => {
    expect(presetStyleIds).toContain("retro");
    expect(selectablePresetStyleOptions.find((style) => style.id === "retro")?.label.zh).toBe("复古风");
    // Four now, like every other selectable style — the picker offers four
    // colourways a card. All four are light; see the note in
    // `stylePalettes.test.ts` for the artwork that makes a dark one a separate
    // piece of work.
    expect(retroThemePresetIds).toEqual(["retro-paper", "retro-linen", "retro-sepia", "retro-dusk"]);
    expect(hasPresetAction("retro-paper")).toBe(true);
    expect(presetGroups.find((group) => group.id === "theme")?.options)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: "retro-paper", themeStyle: "retro" })]));
  });

  it("uses the Figma type and paper colors without changing other styles", () => {
    const theme = themeTokens["retro-paper"];
    expect(theme.font.ui).toContain("EB Garamond");
    expect(theme.surface.canvas).toBe("#F8F5EF");
    expect(theme.text.primary).toBe("#332E26");
    expect(css).toContain('.preview-frame[data-style-preset="retro"] .preview-stack');
    expect(css).toContain('url("/retro-grid.svg")');
  });

  it("scales type from the preview containers and uses the exported Figma icons", () => {
    expect(css).toContain("container: retro-center / inline-size");
    expect(css).toContain("container: retro-sidebar / inline-size");
    expect(css).toContain("--retro-title: clamp(");
    expect(css).toContain("--session-width: var(--session-width-set, clamp(150px, 25.777cqi, 229.414px));");
    for (const icon of [
      "search",
      "new-chat",
      "copy",
      "edit",
      "thinking-dots",
      /*
       * `file-status` was here and is deliberately gone: it was painted onto
       * the tool row *over* the icon the left rail had set, so four of this
       * style's icon galleries changed nothing on the canvas. It is a port
       * inside the style's own set now (`RetroSheetIcon`) — same path, with
       * `currentColor` in place of the baked `#3A332B` — so the drawing
       * survives and the pick reaches the canvas.
       *
       * Everything else in this list is chrome, including `attachment-cube`:
       * the artifact card's icon box holds three hardcoded spans of which CSS
       * shows one, so no gallery was behind it. Painting those from the
       * exported files is right, and this assertion keeps them.
       */
      "attachment-cube",
      "composer-add",
      "permission",
      "effort",
      "model",
      "microphone",
      /* `send-button` is not in this list any more. Its plate was a single
         baked disc colour, and the key now has two states named as palette
         values — so the disc is drawn and only the arrow is still an asset,
         masked so it can take a colour. Asserted in
         `sendButtonDisabled.test.ts`. */
      "send-arrow",
    ]) {
      expect(css, icon).toContain(`url("/retro/${icon}.svg")`);
    }
  });

  it("keeps one visible divider while preserving the sidebar resize target", () => {
    // The guarantee is unchanged; where it lives is not. This style got here
    // first — a zero-width handle with its hit area as an overlay, so the seam
    // shows the column's own border and nothing else — and `.resize-handle`
    // now does that for every style. So the base rule owns the construction
    // and this style owns only the decision: no line of its own, because
    // `.session-sidebar` already draws one at exactly this seam.
    expect(css).toContain(".resize-handle {\n  position: relative;\n  z-index: 2;\n  width: 0;");
    expect(css).toContain(".resize-handle::before {");
    expect(css).toContain("left: -4px;");
    expect(css).toContain('.preview-frame[data-style-preset="retro"] {\n  --divider-w: 0;\n}');
  });

  /**
   * The tool row's status mark.
   *
   * Reported as "这个图标有点大了" over the file mark on 正在读取文件, and the
   * measurement agreed: at the full `--retro-icon` it was 17.6px against a 14px
   * label in an 18.2px line box, so a status mark was as tall as the line it
   * annotates.
   *
   * Two things worth holding, and neither is the number itself.
   *
   * The holder and the glyph must read *one* token. They disagreed for a while
   * — the holder was `0.88 × --retro-icon` wide against a square SVG at the
   * full size, so the glyph overflowed its container by 2.1px. The 0.88 was
   * correct for the exported `file-status.svg`, which was genuinely 30:34, and
   * went stale when `retroIcons.tsx` took over and drew the whole set on one
   * `viewBox="0 0 19 19"`. Nothing caught it because both values were legal.
   *
   * And it must stay *derived* from `--retro-icon` rather than pinned to a px:
   * that token is a `clamp()` on the preview's container, so a literal would
   * stop scaling with the frame — the exact bug the comment above these rules
   * was written about.
   */
  it("sizes the tool-row status mark from --retro-icon, square, through one token", () => {
    const body = (selector: string) => {
      const at = css.indexOf(`${selector} {`);
      expect(at, `no rule for ${selector}`).toBeGreaterThan(-1);
      return css.slice(at, css.indexOf("}", at));
    };

    const scope = '.preview-frame[data-style-preset="retro"] .tool-card .tool-status-icon';
    /* Derived from the style's one icon size, with or without a factor — not
       pinned to a px. The factor is deliberately absent today: it was 0.8 for a
       while to compensate for `RetroSheetIcon` being drawn 19% oversized, which
       is a drawing error and was fixed in the glyph. A factor is allowed here,
       but if one reappears it should be because the row wants a different size,
       not because a mark is wrong. */
    expect(body(scope)).toMatch(/--retro-status-icon:\s*(calc\(\s*)?var\(--retro-icon\)/);

    // Both consumers read the token, and both axes read the same one: the set
    // is square, so a lone width factor is the drift this guards.
    for (const selector of [
      '.preview-frame[data-style-preset="retro"] .tool-card[data-file-tool="true"] .tool-status-icon',
      '.preview-frame[data-style-preset="retro"] .tool-card .tool-status-icon > svg',
    ]) {
      const rule = body(selector);
      expect(rule, selector).toContain("width: var(--retro-status-icon);");
      expect(rule, selector).toContain("height: var(--retro-status-icon);");
    }
  });

  /**
   * The two sheets are described as the same sheet, so they are drawn on one
   * envelope.
   *
   * This is the narrow static half of a defect whose real audit needs a
   * browser. `RetroSheetIcon` overflowed its own `viewBox="0 0 19 19"` by 0.89
   * units at the bottom, so the sheet's whole bottom border was clipped away at
   * every size — reported as "他底部没有展示全" — and it was ~19% larger than
   * every sibling besides. Both symptoms came from one cause: the first port
   * kept `public/retro/file-status.svg`'s coordinates verbatim, which is a
   * faithful copy of a drawing made for a different box.
   *
   * **The extent itself is measured, not derived here.**
   * `scripts/probe-retro-clipping.mjs` walks all 64 marks with `getBBox()` and
   * adds the stroke half-weight — that is the authoritative check, and it needs
   * Chrome. A static version of it was written first and deleted: computing
   * path extents by regex means reimplementing the renderer, and it promptly
   * reported three false positives on the diagonal nib and highlighter paths,
   * which use implicit absolute linetos (`M15.9 7.9 10.2 13.6l…`) and decimal
   * runs (`-2.4.6.6-2.4`) that the arithmetic mis-walked. `getBBox()` cleared
   * all three.
   *
   * What is left here is the one thing static analysis can say honestly and the
   * thing that actually broke: a re-port that reintroduces foreign coordinates
   * would stop sharing the fold with the sibling it is supposed to match.
   */
  it("draws both sheets on one envelope", () => {
    const source = readFileSync(new URL("../agentmatrix/retroIcons.tsx", import.meta.url), "utf8");

    const foldOf = (exportName: string) => {
      const at = source.indexOf(`export const ${exportName} =`);
      expect(at, `no ${exportName}`).toBeGreaterThan(-1);
      const decl = source.slice(at, source.indexOf("]);", at));
      // The fold is the corner turn-back: the only `v…H…` path in a sheet.
      return decl.match(/d:\s*"(M[\d.]+ [\d.]+v[\d.]+H[\d.]+)"/)?.[1] ?? null;
    };

    const plain = foldOf("RetroSheetIcon");
    expect(plain, "RetroSheetIcon lost its folded corner").toBeTruthy();
    expect(plain).toBe(foldOf("RetroSheetRuledIcon"));
  });
});
