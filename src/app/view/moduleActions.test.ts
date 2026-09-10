import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  LAYER_EDIT_OPTIONS,
  LAYER_HIGHLIGHT_SELECTORS,
  LAYER_PRESENCE_OPTIONS,
  missingRequirementsForProject,
  optionIdForModule,
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
      const optionId = optionIdForModule(moduleId);
      expect(optionId, `no option for ${moduleId}`).toBeTruthy();
      expect(railLocationForOption(optionId!), `no rail location for ${optionId}`).toBeTruthy();
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

  it("suppresses canvas interaction in the configurator only", () => {
    // The preview surface is where the real interactions are meant to be tried.
    expect(appSource).toContain('if (state.surfaceMode !== "builder") return;');
    // Capture phase, on real listeners: React's synthetic stopPropagation does
    // not stop native listeners that components attach themselves.
    expect(appSource).toContain('frame.addEventListener(type, suppress, { capture: true })');
    for (const type of ["pointerdown", "mousedown", "click", "keydown", "input"]) {
      expect(appSource).toContain(`"${type}"`);
    }
    // Column resizing is a layout edit, not a component interaction.
    expect(appSource).toContain('closest(".resize-handle")');
  });
});

describe("preview and export completeness", () => {
  it("asks before running a project that cannot run", () => {
    // A conversation and a composer: an agent frontend the reader cannot read
    // or type into is not a frontend. The side columns stay optional — plenty
    // of agent UIs are one column.
    const missing = missingRequirementsForProject(emptyStructureProject, []);
    // Only the conversation: the composer is on from the start, because an
    // agent frontend without a way to type is not one.
    expect(missing.map((item) => item.groupId)).toEqual(["conversation"]);
    // It carries the option that satisfies it: the group's first option, which
    // is its presence toggle.
    expect(missing.map((item) => item.optionId)).toEqual(["chat-visible"]);
  });

  it("stops asking once the gaps are filled", () => {
    const filled = missingRequirementsForProject(emptyStructureProject, []).reduce(
      (project, item) => togglePresetOption(project, item.optionId),
      emptyStructureProject,
    );
    expect(missingRequirementsForProject(filled, [])).toEqual([]);
  });

  it("still asks for the conversation when only its contents were picked", () => {
    // The conversation has its own visible toggle, so it does not appear just
    // because something inside it was picked — that would put a thing on the
    // canvas the reader had not selected. So the requirement stands until the
    // toggle is ticked, and preview offers to tick it.
    const withLabels = togglePresetOption(emptyStructureProject, "speaker-labels");
    const items = [{ id: "speaker-labels", groupId: "conversation" as const }];
    expect(missingRequirementsForProject(withLabels, items).map((item) => item.optionId)).toEqual([
      "chat-visible",
    ]);
    expect(
      missingRequirementsForProject(togglePresetOption(withLabels, "chat-visible"), items),
    ).toEqual([]);
  });

  it("waits for the filled project before running", () => {
    // `saveScaffoldPreview` snapshots the project it was built with, so running
    // in the same tick as the fill preserved the gaps that had just been
    // filled — the preview opened with no conversation and no composer.
    expect(appSource).toContain("if (!runAfterFill || missingRequirements.length > 0) return;");
  });
});
