import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { LAYER_HIGHLIGHT_SELECTORS } from "./presetRailData";
import { defaultCodingAgentProject } from "../../schema/agentuxConfig";
import { presetGroups } from "../../schema/presets";

const styles = readFileSync(new URL("../../styles/app.css", import.meta.url), "utf8");

/** Selectors listed in the `.preview-frame :is(...)::after` overlay rules. */
const overlayTargets = Array.from(styles.matchAll(/\.preview-frame :is\(([^)]*)\)::after/g))
  .flatMap((match) => match[1].split(",").map((part) => part.trim()));

describe("layer row highlights", () => {
  it("has a CSS rule for every mapped module", () => {
    // The map is TypeScript and the rules are CSS, so nothing but this test
    // keeps them in step. A missing rule is silent: the row selects, the
    // attribute lands on the frame, and nothing lights up — which is exactly
    // how `sidebar-new-button` shipped mis-keyed as `sidebar-new-chat`.
    for (const [moduleId, selector] of Object.entries(LAYER_HIGHLIGHT_SELECTORS)) {
      expect(styles, `missing rule for ${moduleId}`).toContain(
        `.preview-frame[data-selected-module="${moduleId}"] ${selector}::after`,
      );
      // And the module needs the overlay box, or the rule has nothing to show:
      // an `::after` that was never given `content`/`inset` cannot be revealed.
      expect(overlayTargets, `${selector} has no overlay box`).toContain(selector);
    }
  });

  it("keys on ids that exist", () => {
    const slotIds = new Set(defaultCodingAgentProject.layout.slots.map((slot) => slot.id));
    const optionIds = new Set(presetGroups.flatMap((group) => group.options.map((option) => option.id)));
    for (const moduleId of Object.keys(LAYER_HIGHLIGHT_SELECTORS)) {
      expect(slotIds.has(moduleId) || optionIds.has(moduleId), `unknown id ${moduleId}`).toBe(true);
    }
  });

  it("makes the innermost thing under the pointer win on hover", () => {
    // One rule, not one per level: it lights on hover unless something
    // highlightable inside it is hovered. The three hand-written rules this
    // replaced guarded each level against a hardcoded list of its children, and
    // the sidebar had no guard at all — so it lit up together with the
    // conversation list inside it.
    const hoverRules = styles.match(
      /\.preview-frame :is\(([^)]*)\):hover:not\(:has\(:is\(([^)]*)\):hover\)\)::after/,
    );
    expect(hoverRules, "innermost-wins hover rule missing").toBeTruthy();
    const [, targets, guard] = hoverRules!;
    // The guard list must be the target list, or a level goes unguarded.
    expect(guard).toBe(targets);

    // Every module a layer row can highlight also takes part in hover, or the
    // pointer would fall through it to the column.
    const hoverTargets = targets.split(",").map((part) => part.trim());
    for (const selector of Object.values(LAYER_HIGHLIGHT_SELECTORS)) {
      expect(hoverTargets, `${selector} is not a hover target`).toContain(selector);
    }
    for (const column of [".session-sidebar", ".preview-stack", ".right-panel"]) {
      expect(hoverTargets).toContain(column);
    }
  });

  it("points the conversation-list row at the list, not the column", () => {
    // A row that says "会话列表" lighting the entire left column is the bug this
    // map was added to fix.
    expect(LAYER_HIGHLIGHT_SELECTORS.sessions).toBe(".session-list");
    expect(styles).not.toContain('[data-selected-slot="SessionSidebar"]');
  });
});
