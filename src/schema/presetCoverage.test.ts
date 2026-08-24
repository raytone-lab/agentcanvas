import { describe, expect, it } from "vitest";

import previewSource from "../components/PresetOptionPreview.tsx?raw";
import { presetGroups } from "./presets";

describe("preset UI coverage", () => {
  it("renders every preset option with a specific card preview", () => {
    const optionIds = presetGroups.flatMap((group) => group.options.map((option) => option.id));
    const sharedPreviewIds = new Set([
      "summary-first",
      "reasoning-public-summary",
      "warm-graphite",
      "cocoa-system",
      "forest-ember",
      "soft-glass",
      "sand-workspace",
      "apricot-agent",
      "cold-mono",
      "slate-blue",
      "cyan-grid",
      "ice-white",
      "mist-blue",
      "polar-mono",
    ]);
    const missing = optionIds.filter((optionId) =>
      !optionId.startsWith("provider-") &&
      !optionId.startsWith("media-image-") &&
      !optionId.startsWith("media-audio-") &&
      !optionId.startsWith("media-video-") &&
      !sharedPreviewIds.has(optionId) &&
      !previewSource.includes(`optionId === "${optionId}"`)
    );

    expect(missing).toEqual([]);
  });
});
