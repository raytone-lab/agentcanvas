import { describe, expect, it } from "vitest";

import previewSource from "../components/PresetOptionPreview.tsx?raw";
import { isThemePresetId } from "../theme/themeTokens";
import { presetGroups } from "./presets";

describe("preset UI coverage", () => {
  it("renders every preset option with a specific card preview", () => {
    // Pending options intentionally fall through to the generic tile: they are
    // dimmed and inert, so a bespoke preview would oversell them.
    const optionIds = presetGroups.flatMap((group) =>
      group.options.filter((option) => !option.pending).map((option) => option.id),
    );
    // Theme cards share one swatch preview, so they are derived from the theme
    // table rather than listed — the previous literal list was the twelve ids
    // that existed when it was written.
    const sharedPreviewIds = new Set<string>(["summary-first", "reasoning-public-summary"]);
    const missing = optionIds.filter((optionId) =>
      !optionId.startsWith("provider-") &&
      !optionId.startsWith("media-image-") &&
      !optionId.startsWith("media-audio-") &&
      !optionId.startsWith("media-video-") &&
      !sharedPreviewIds.has(optionId) &&
      !isThemePresetId(optionId) &&
      // Named in the preview source at all, rather than specifically as an
      // `optionId === "…"` branch: the eight thinking motions are a lookup
      // table now (one branch instead of eight copies of it), and the ids are
      // its keys. What this test is for is that no option falls through to the
      // generic tile, and a mention is what rules that out.
      !previewSource.includes(`"${optionId}"`)
    );

    expect(missing).toEqual([]);
  });
});
