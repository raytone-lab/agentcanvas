import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  AVATAR_CARD_GROUP_ID,
  avatarFlagForModule,
  LAYER_EDIT_OPTIONS,
  LAYER_HIGHLIGHT_SELECTORS,
  LAYER_PRESENCE_OPTIONS,
  missingRequirementsForProject,
  groupForModule,
  messageActionKeyForModule,
  optionIdForModule,
  PART_PINNED_OPTIONS,
  railLocationForGroup,
  railLocationForOption,
} from "../projection/presetRailData";
import { isPresetOptionActive, togglePresetOption } from "../../schema/presetActions";
import { emptyStructureProject } from "../../schema/agentuxConfig";

const appSource = readFileSync(new URL("../../App.tsx", import.meta.url), "utf8");

describe("canvas module actions", () => {
  it("maps every highlightable module to an option the rail owns", () => {
    // Delete unticks an option and Edit jumps to it, so a module with no option
    // would give a toolbar whose buttons do nothing.
    for (const moduleId of Object.keys(LAYER_HIGHLIGHT_SELECTORS)) {
      /*
       * Except the `card:*` pair, which is the other kind of target.
       *
       * The two avatars are put on the canvas by a state card — the gallery in
       * 组件 → 对话区 flips `conversation.userAvatar` / `agentAvatar` — so there
       * is no option for Delete to untick and none for Edit to jump to. The
       * toolbar reads them through `avatarFlagForModule` instead: Delete clears
       * the flag and nothing else, Edit lands on the gallery. Before that
       * existed, the innermost module the toolbar could resolve under an avatar
       * was `.chat-frame`, so hovering a face offered to delete the whole
       * conversation.
       */
      const avatarFlag = avatarFlagForModule(moduleId);
      if (avatarFlag) {
        expect(["userAvatar", "agentAvatar"]).toContain(avatarFlag);
        expect(railLocationForOption("speaker-labels")?.groupId).toBe(AVATAR_CARD_GROUP_ID);
        continue;
      }
      /*
       * And the third kind: a part of a component (`group:<groupId>/<name>`).
       * A tool card's title is not an option and cannot be one — nothing
       * removes it and leaves the card — so Edit lands on the group that
       * governs it and Delete is not offered, which is the reader's own rule
       * for "editable but not deletable".
       */
      const partGroup = groupForModule(moduleId);
      if (partGroup) {
        expect(railLocationForGroup(partGroup), `no rail location for ${partGroup}`).toBeTruthy();
        continue;
      }
      /*
       * And the fourth: a message action (`message-action:<key>`). Same shape
       * as the avatars — `selectedComponents` emits one row per entry in
       * `conversation.messageActions`, which is project state, so there is no
       * option for Delete to untick. Edit lands on the conversation group that
       * governs the strip, which is where the actions are configured.
       */
      if (messageActionKeyForModule(moduleId)) {
        expect(railLocationForGroup(AVATAR_CARD_GROUP_ID), "no rail location for the turn's group").toBeTruthy();
        continue;
      }
      const optionId = optionIdForModule(moduleId);
      expect(optionId, `no option for ${moduleId}`).toBeTruthy();
      expect(railLocationForOption(optionId!), `no rail location for ${optionId}`).toBeTruthy();
    }
  });

/**
   * The outline and the toolbar have to agree on what a module *is*.
   *
   * This is the test that was missing. The hover outline is drawn by a long
   * `:is(…)` list in app.css; the toolbar resolves what it points at from
   * `LAYER_HIGHLIGHT_SELECTORS`. The two had drifted to forty targets against
   * twelve, and for the twenty-eight in between `moduleIdAtTarget` found
   * nothing and fell back to the column — so the canvas drew an 84×18 outline
   * around 正在读取文件 and parked the toolbar 306px above it, on the whole
   * centre column, with a Delete that emptied it.
   *
   * Asserted against the stylesheet because that is where the outline is
   * decided. Anything added to that list from now on has to be given a module,
   * of one of the three kinds, in the same change.
   */
  it("gives every element the hover outline draws a module the toolbar can resolve", () => {
    const css = readFileSync(new URL("../../styles/app.css", import.meta.url), "utf8");
    /* The outline rule: the long `:is(…)` list that ends in `:hover:not(:has(`.
       The `:not([data-scrolling="true"])` in front of it is the gate that stops
       the mark travelling with a wheel scroll — see `App`'s scroll effect. */
    const start = css.indexOf('.preview-frame:not([data-scrolling="true"]) :is(.run-progress');
    expect(start, "outline rule").toBeGreaterThan(-1);
    /* The `:is(` list, not the `:not(` gate in front of it — the first `(`
       after the anchor now belongs to the gate, which walked one entry
       (`[data-scrolling="true"]`) and reported the list as a single selector. */
    const open = css.indexOf(":is(", start) + ":is".length;
    let depth = 0;
    let end = open;
    for (let i = open; i < css.length; i += 1) {
      if (css[i] === "(") depth += 1;
      else if (css[i] === ")") {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const outlined = css
      .slice(open + 1, end)
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    expect(outlined.length).toBeGreaterThan(30);

    const mapped = new Set(
      Object.values(LAYER_HIGHLIGHT_SELECTORS)
        .flatMap((selector) => selector.split(","))
        // `[data-role="user"]` and `> h4` narrow a selector; the class is what
        // the outline list names.
        .map((selector) => selector.replace(/\[.*?\]|\s*>\s*[\w-]+/g, "").trim()),
    );
    const unresolved = outlined.filter((selector) => !mapped.has(selector));

    expect(unresolved).toEqual([]);
  });

/**
   * A pinned card has to live in the group Edit navigates to.
   *
   * Otherwise Edit opens one destination and flashes an option in another, and
   * the pin silently does nothing — the option card is not in the DOM to scroll
   * to. Four of these keys were re-grouped for exactly this reason: the source
   * switch and two renderer surfaces sit in the right panel but are configured
   * in 交付, and the media player in 生成中.
   */
  it("pins each part's Edit on a card that lives in the group it lands on", () => {
    for (const [moduleId, optionId] of Object.entries(PART_PINNED_OPTIONS)) {
      const groupId = groupForModule(moduleId);
      expect(groupId, `${moduleId} is not a part`).toBeTruthy();
      expect(LAYER_HIGHLIGHT_SELECTORS[moduleId], `${moduleId} is not on the canvas`).toBeTruthy();
      expect(railLocationForOption(optionId)?.groupId, `${moduleId} → ${optionId}`).toBe(groupId);
    }
  });

  it("gives every column somewhere for Edit to land", () => {
    // Edit and Delete read different maps. Sharing one left the centre's Edit
    // button doing nothing, because the centre has no presence option to
    // delete — the very thing that makes it undeletable.
    for (const [layerId, expected] of [
      ["left", "sidebar"],
      ["center", "conversation"],
      ["right", "output"],
    ] as const) {
      const optionId = LAYER_EDIT_OPTIONS[layerId];
      expect(optionId, `no edit target for ${layerId}`).toBeTruthy();
      expect(railLocationForOption(optionId)?.groupId).toBe(expected);
      expect(railLocationForOption(optionId)?.navSection).toBe("structure");
    }
  });

  it("leaves the centre column with nothing to delete", () => {
    // The centre cannot be deleted, from the rail or the canvas. It has no
    // presence options, which is how the toolbar ends up showing Edit only.
    expect(LAYER_PRESENCE_OPTIONS.center).toBeUndefined();
    expect(LAYER_PRESENCE_OPTIONS.left).toEqual(["sidebar-visible"]);
    expect(LAYER_PRESENCE_OPTIONS.right).toEqual(["output-visible", "git-visible"]);
  });

  it("turns the module off rather than toggling it", () => {
    // The preset patches are self-flipping booleans, so applying one to an
    // already-off option would switch it back on. Delete has to be a one-way
    // door, which is why it checks first.
    let project = emptyStructureProject;
    expect(isPresetOptionActive(project, "sidebar-visible")).toBe(true);
    project = togglePresetOption(project, "sidebar-visible");
    expect(isPresetOptionActive(project, "sidebar-visible")).toBe(false);
    // The guard App applies: only toggle what is currently active.
    expect(appSource).toContain("isPresetOptionActive(next, optionId) ? togglePresetOption(next, optionId) : next");
  });

  it("leaves canvas interaction live, and offers editing on hover instead", () => {
    // Inverted deliberately. This used to assert the opposite — a capture-phase
    // suppressor over `pointerdown / mousedown / click / keydown / input /
    // submit` that spent the click on selecting a module. That made the canvas
    // a drawing of the product: the composer could not be typed in and the
    // upload button did nothing.
    //
    // Editing moved to hover so the click could be given back. So the contract
    // now is that nothing suppresses, and the toolbar follows the pointer.
    expect(appSource).not.toContain("const suppress =");
    /*
     * Capture-phase listeners as such are allowed again — the scroll flag that
     * stops the hover mark travelling uses one, and it only observes. What must
     * not come back is a listener on the *interaction* events, which is what the
     * suppressor was made of and what took the click away from the canvas.
     */
    for (const event of ["pointerdown", "mousedown", "click", "submit", "input"]) {
      expect(appSource, event).not.toContain(`frame.addEventListener("${event}"`);
    }
    expect(appSource).not.toContain("data-canvas-inert");

    // Hover is tracked on the surface, not the frame: the toolbar is a sibling
    // of the frame, so tracking it on the frame made moving onto Edit count as
    // leaving the module and the toolbar pulled itself out from under the
    // cursor.
    expect(appSource).toContain('surface.addEventListener("pointermove", onMove)');
    expect(appSource).toContain('target.closest(".module-toolbar")');
    // And the toolbar acts on what is hovered, not on what is selected.
    expect(appSource).toContain("const toolbarSlotId = hoveredModule.slotId;");

    // The right column can still be brought back after it has been deleted, not
    // only after it has been collapsed: from the reader's side those look the
    // same, and deleting it used to leave no way back except the rail.
    expect(appSource).toContain("const rightColumnDeleted =");
    expect(appSource).toContain('togglePresetOption(current, "output-visible")');
  });

  it("zooms the canvas on the wheel and pans it on a drag", () => {
    expect(appSource).toContain("const intent = wheelIntent(event);");
    // Anything inside that scrolls keeps the wheel — the conversation, the
    // output panel — or the components chosen into a long conversation can
    // only be reached by dragging its scrollbar. ⌘/ctrl + wheel still zooms.
    expect(appSource).toContain(
      "if (!event.ctrlKey && !event.metaKey && scrollsUnderPointer(event.target, surface, intent)) return;",
    );
    // A drag moves it, and a drag never also clicks what it ended on.
    expect(appSource).toContain('window.addEventListener("click", swallowClick, { capture: true, once: true });');
  });

  it("keeps the product's breakpoints off the design canvas", () => {
    // They belong to the running product: a narrow window hides the right
    // panel. The canvas page is a fixed 4:3 of whatever the chrome leaves, so a
    // smallish editor window put it under those breakpoints and a configured
    // column vanished from the canvas *and* the region labels while the layer
    // tree went on listing it — measured at an 845px window, which gives a
    // 513px page against a 860px breakpoint.
    expect(appSource).toContain(
      'state.surfaceMode === "builder" ? { left: false, right: false } : state.autoHiddenRails',
    );
    // And nothing reads the raw value except that one line, or the canvas would
    // disagree with itself again.
    expect(appSource.match(/state\.autoHiddenRails/g)).toHaveLength(1);
  });
});

describe("preview and export completeness", () => {
  it("asks for the conversation on entry, and stops once it is on", () => {
    /*
     * The required pair is a conversation and a composer — an agent frontend the
     * reader cannot read or type into is not a frontend.
     *
     * The composer is on from the start and the conversation is not, now that
     * the configurator opens on 空白, so a fresh project has exactly one gap.
     * This asserted the empty list for a while, when the conversation was
     * permanently on; the requirement itself never moved.
     */
    const missing = missingRequirementsForProject(emptyStructureProject, []);
    expect(missing.map((item) => item.groupId)).toEqual(["conversation"]);
    // It carries the option that satisfies it: the group's first option, which
    // is its presence toggle.
    expect(missing.map((item) => item.optionId)).toEqual(["chat-visible"]);

    const withConversation = togglePresetOption(emptyStructureProject, "chat-visible");
    expect(missingRequirementsForProject(withConversation, [])).toEqual([]);
  });

  it("stops asking once the gaps are filled", () => {
    const filled = missingRequirementsForProject(emptyStructureProject, []).reduce(
      (project, item) => togglePresetOption(project, item.optionId),
      emptyStructureProject,
    );
    expect(missingRequirementsForProject(filled, [])).toEqual([]);
  });

  it("takes a pick from the conversation's own group as the conversation", () => {
    // Picking 名称标签 or an avatar is configuring the conversation, in the very
    // group that turns it on, so it appears and the requirement is met. The
    // reader is not being surprised by a component they were not looking at.
    const withLabels = togglePresetOption(emptyStructureProject, "speaker-labels");
    const items = [{ id: "speaker-labels", groupId: "conversation" as const }];
    expect(missingRequirementsForProject(withLabels, items)).toEqual([]);
  });

  it("still will not let another destination summon the conversation", () => {
    // A thinking effect renders *into* the conversation but does not belong to
    // it, so reaching in from the event flow stays refused — the requirement
    // stands and still names 显示对话流 as what would satisfy it. Reachable
    // straight from the empty start again, rather than only after a delete.
    const withThinking = togglePresetOption(emptyStructureProject, "thinking-wave");
    const items = [{ id: "thinking-wave", groupId: "ux-effects" as const }];
    expect(
      missingRequirementsForProject(withThinking, items).map((item) => item.optionId),
    ).toEqual(["chat-visible"]);
  });

  it("waits for the filled project before running", () => {
    // `saveScaffoldPreview` snapshots the project it was built with, so running
    // in the same tick as the fill preserved the gaps that had just been
    // filled — the preview opened with no conversation and no composer.
    expect(appSource).toContain("if (!runAfterFill || missingRequirements.length > 0) return;");
  });
});
