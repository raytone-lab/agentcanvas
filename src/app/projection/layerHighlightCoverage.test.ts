import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  avatarFlagForModule,
  groupForModule,
  LAYER_HIGHLIGHT_SELECTORS,
  messageActionKeyForModule,
} from "./presetRailData";
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
      if (avatarFlagForModule(moduleId)) {
        // A card is hover-marked by the outline rule on `.msg-avatar`, and has
        // no `data-selected-module` state — the rail shows its own selection in
        // the gallery.
        expect(styles, `${selector} does not light on hover`).toContain(".msg-avatar");
        continue;
      }
      /*
       * A component's *parts* are the same case as a card, one step further:
       * they are hover-marked by the outline rule and have no selected state of
       * their own, because the Layers list lists components and options, not
       * the title inside a tool card. What they need is a toolbar that points
       * at them — which is what they are in this map for — so the assertion is
       * the outline rule naming them, not a `data-selected-module` rule.
       */
      if (groupForModule(moduleId)) {
        expect(styles, `${selector} does not light on hover`).toContain(selector);
        continue;
      }
      const viaPseudo = styles.includes(
        `.preview-frame[data-selected-module="${moduleId}"] ${selector}::after`,
      );
      /*
       * Two mechanisms, one contract: "selecting this row marks this thing".
       *
       * The components and the sidebar's rows are marked with `::after`. The
       * finer objects inside a turn — the speaker labels, the message actions,
       * the composer's controls — are marked with an outline and an inset wash
       * instead, because both of their pseudo-elements are already spoken for
       * by the styles (Handdrawn's dotted shadow, Pixel's edges, Retro's send
       * arrow). What must never happen is a mapped module with neither.
       */
      const viaOutline = styles.includes(`.preview-frame[data-selected-module="${moduleId}"] `);
      expect(viaPseudo || viaOutline, `missing rule for ${moduleId}`).toBe(true);
      if (viaPseudo) {
        // An `::after` that was never given `content`/`inset` cannot be shown.
        expect(overlayTargets, `${selector} has no overlay box`).toContain(selector);
      }
    }
  });

  it("keys on ids that exist", () => {
    const slotIds = new Set(defaultCodingAgentProject.layout.slots.map((slot) => slot.id));
    const optionIds = new Set(presetGroups.flatMap((group) => group.options.map((option) => option.id)));
    for (const moduleId of Object.keys(LAYER_HIGHLIGHT_SELECTORS)) {
      /*
       * The `card:*` keys are state cards, not options: the two avatars are put
       * on the canvas by `conversation.userAvatar` / `agentAvatar`, which the
       * gallery in 组件 → 对话区 flips directly. They are in this map because the
       * toolbar has to find them under the pointer; `avatarFlagForModule` is
       * what reads them back, and the assertions about *options* below cannot
       * apply to them.
       */
      if (avatarFlagForModule(moduleId)) continue;
      /* And the `group:*` keys, for the same reason one step further: a part of
         a component is neither a slot nor an option. `groupForModule` returning
         a group is the check that matters, and it is the one
         `moduleActions.test.ts` makes. */
      if (groupForModule(moduleId)) continue;
      if (avatarFlagForModule(moduleId)) continue;
      /*
       * And the `message-action:*` keys — the third kind, for the same reason.
       * `selectedComponents` emits one row per entry in
       * `conversation.messageActions`, which is project state and not a card
       * in a group; `isAddedContentOption` carries the note about why ids
       * `isPresetOptionActive` has never heard of are in this list at all.
       */
      if (messageActionKeyForModule(moduleId)) continue;
      expect(slotIds.has(moduleId) || optionIds.has(moduleId), `unknown id ${moduleId}`).toBe(true);
    }
  });

  it("makes the innermost thing under the pointer win on hover", () => {
    // One rule, not one per level: it lights on hover unless something
    // highlightable inside it is hovered. The three hand-written rules this
    // replaced guarded each level against a hardcoded list of its children, and
    // the sidebar had no guard at all — so it lit up together with the
    // conversation list inside it.
    /* `:not([data-scrolling="true"])` sits between the frame and the list: it is
       the gate that stops the mark travelling with a wheel scroll (see `App`'s
       scroll effect), and it is optional in this pattern so the test says what
       it is about — innermost-wins — rather than pinning the gate's spelling. */
    const hoverRules = styles.match(
      /\.preview-frame(?::where\(\[data-editable="true"\]\))?(?::not\(\[data-scrolling="true"\]\))? :is\(([^)]*)\):hover:not\(:has\(:is\(([^)]*)\):hover\)\)::after/,
    );
    expect(hoverRules, "innermost-wins hover rule missing").toBeTruthy();
    const [, targets, guard] = hoverRules!;
    const hoverTargets = targets.split(",").map((part) => part.trim());
    const guarded = guard.split(",").map((part) => part.trim());
    // Every target must be guarded, or that level lights together with its own
    // children. The guard may be *wider* than the targets — see the columns
    // below, which disqualify an ancestor without lighting themselves.
    for (const target of hoverTargets) {
      expect(guarded, `${target} is unguarded`).toContain(target);
    }

    /*
     * Every module a layer row names has an overlay box, so selecting the row
     * can light it. Hover is a different question — see below.
     */
    for (const selector of Object.values(LAYER_HIGHLIGHT_SELECTORS)) {
      expect(styles, `${selector} has no overlay box`).toContain(selector);
    }

    /*
     * The four components are selection targets, not hover targets.
     *
     * They contain the blocks — the turns, the tool rows, the composer's
     * controls — and a pointer resting in the gap between two of them used to
     * mask the whole component: the entire transcript while crossing it, the
     * entire composer while reaching for the field. Both reported. A rail row
     * still highlights its component when *clicked*, which is the deliberate
     * act; hover follows the pointer, and the pointer is always on something
     * smaller.
     */
    for (const component of [".chat-frame", ".composer-frame", ".artifact-frame", ".git-panel"]) {
      expect(hoverTargets, `${component} should not light on its own hover`).not.toContain(component);
      expect(guarded, `${component} must still disqualify its column`).toContain(component);
    }

    // The sidebar's rows are leaves, so they stay hover targets.
    for (const leaf of [".session-brand-name", ".session-new", ".session-list", ".session-footer"]) {
      expect(hoverTargets, `${leaf} is not a hover target`).toContain(leaf);
    }

    /*
     * And the blocks inside the components light themselves, through the
     * outline rule rather than through `::after` — both pseudo-elements on
     * these objects are already spoken for by the styles.
     */
    for (const block of [".reasoning-block", ".tool-card", ".artifact-launch-card", ".message-bubble",
      ".composer-prompt-row", ".permission-mode-trigger", ".output-tabs"]) {
      expect(styles, `${block} does not light on hover`).toContain(block);
    }
    expect(styles).toContain("box-shadow: inset 0 0 0 9999px var(--select-fill);");

    /*
     * The three columns are deliberately *not* hover targets: a column is
     * revealed by hovering its label above the canvas, not by the pointer
     * wandering into it. Asked for directly — crossing the canvas used to mask
     * whichever column the pointer passed through.
     */
    for (const column of [".session-sidebar", ".preview-stack", ".right-panel"]) {
      expect(hoverTargets, `${column} should not light on its own hover`).not.toContain(column);
      expect(guarded, `${column} should still disqualify an ancestor`).toContain(column);
    }
    for (const [layer, column] of [
      ["left", ".session-sidebar"],
      ["center", ".preview-stack"],
      ["right", ".right-panel"],
    ] as const) {
      // `:has()` on the shared ancestor is the only way across: the labels are
      // siblings of the frame, not of the columns.
      expect(
        styles,
        `${layer} label does not light ${column}`,
      ).toContain(`.canvas-zoom:has(.region-label[data-layer="${layer}"]:hover) .preview-frame ${column}::after`);
    }
    // And the label has to be reachable: the strip around it stays transparent
    // to the pointer, so the words take it back on their own.
    expect(styles).toContain("pointer-events: auto;");

    /*
     * …and hover stops following the content while the canvas scrolls.
     *
     * A wheel scroll leaves the pointer still, so each block that passes under
     * it took `:hover` in turn and the mark ran up the column — reported as
     * 「这个线框…总跟着上下跑」. Both hover rules carry the gate; the *selection*
     * rules deliberately do not, because a click is not a pointer resting
     * somewhere.
     */
    const gated = [...styles.matchAll(/\.preview-frame(?::where\(\[data-editable="true"\]\))?(:not\(\[data-scrolling="true"\]\))? :is\([^)]*\):hover:not\(/g)];
    expect(gated.length, "both hover rules").toBe(2);
    for (const match of gated) {
      expect(match[1], `ungated: ${match[0].slice(0, 60)}`).toBeTruthy();
    }
  });

  it("points the conversation-list row at the list, not the column", () => {
    // A row for the list lighting the entire left column is the bug this map
    // was added to fix. The row is 内容模块 now — a module the reader picks —
    // and the sidebar itself has no row here at all: the empty left column
    // renders with the same `.session-sidebar` class, so an entry for it would
    // answer clicks for a component that is not on the canvas.
    expect(LAYER_HIGHLIGHT_SELECTORS["sidebar-sessions"]).toBe(".session-list");
    expect(LAYER_HIGHLIGHT_SELECTORS.sessions).toBeUndefined();
    expect(styles).not.toContain('[data-selected-slot="SessionSidebar"]');
  });

  it("has a row for every part of the sidebar", () => {
    // The column is nothing but these seven, and each one is a module a click
    // on the canvas has to be able to land on.
    for (const id of [
      "sidebar-title",
      "sidebar-collapse",
      "sidebar-new-button",
      "sidebar-search",
      "sidebar-sessions",
      "sidebar-grouping",
      "sidebar-footer",
    ]) {
      expect(LAYER_HIGHLIGHT_SELECTORS[id], `${id} has no canvas target`).toBeTruthy();
    }
  });
});
