import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { defaultCodingAgentProject } from "../../schema/agentuxConfig";
import { isPresetOptionActive, togglePresetOption } from "../../schema/presetActions";
import { applyStyleKit, styleKitOptionIds } from "../../schema/styleKit";
import { OPTION_GROUP_IDS, PRESENCE_OPTION_IDS, mountedComponentsForProject } from "./presetRailData";

const appSource = readFileSync(new URL("../../App.tsx", import.meta.url), "utf8");

/**
 * Delete has to survive a style kit.
 *
 * This is a regression only the *combination* produced, which is why neither
 * side's own tests caught it. `mountedComponentsForProject` keeps a component
 * mounted while anything in its own group has been picked — the rule that makes
 * picking an avatar bring the conversation with it rather than setting an option
 * with nowhere to show. That was safe while `pickedOptionIds` held only what the
 * reader had clicked. Choosing a style now fills it with a whole starting kit,
 * so every group has picks, and unticking a presence option left the component
 * exactly where it was.
 */
describe("deleting a module after a style kit has run", () => {
  const kit = styleKitOptionIds(0);
  const withKit = applyStyleKit(defaultCodingAgentProject, kit);

  it("reproduces the failure when the group's picks are kept", () => {
    const deleted = togglePresetOption(withKit, "chat-visible");
    expect(isPresetOptionActive(deleted, "chat-visible")).toBe(false);
    // The toggle is off and the component is still on the canvas.
    expect(mountedComponentsForProject(deleted, [], kit).has("ChatFrame")).toBe(true);
  });

  it("removes the component once its own group's picks go with it", () => {
    const deleted = togglePresetOption(withKit, "chat-visible");
    const group = OPTION_GROUP_IDS.get("chat-visible");
    const surviving = kit.filter((id) => OPTION_GROUP_IDS.get(id) !== group);
    expect(mountedComponentsForProject(deleted, [], surviving).has("ChatFrame")).toBe(false);
  });

  it("scopes the drop to that group, or one delete takes three columns", () => {
    // Measured: clearing every pick left only the composer standing. A column
    // is mounted by its own group's picks, so a wholesale clear is not a
    // heavier version of the right fix — it is a different bug.
    //
    // The sidebar is picked by hand here rather than taken from the kit: styles
    // no longer fill the structural columns, so the kit contributes nothing to
    // it. That makes this a truer setup anyway — the reader built the left
    // column themselves, and deleting the conversation must not take it.
    const built = togglePresetOption(withKit, "sidebar-search");
    const picks = [...kit, "sidebar-search"];
    const deleted = togglePresetOption(built, "chat-visible");

    expect(mountedComponentsForProject(deleted, [], []).has("SessionSidebar")).toBe(false);

    const group = OPTION_GROUP_IDS.get("chat-visible");
    const surviving = picks.filter((id) => OPTION_GROUP_IDS.get(id) !== group);
    expect(mountedComponentsForProject(deleted, [], surviving).has("SessionSidebar")).toBe(true);
  });

  it("only widens to the group when a presence option is the thing deleted", () => {
    // Deleting the sidebar's title is not deleting the sidebar. The widening is
    // gated on `PRESENCE_OPTION_IDS` so a content option takes nothing with it.
    expect(PRESENCE_OPTION_IDS.has("chat-visible")).toBe(true);
    expect(PRESENCE_OPTION_IDS.has("sidebar-title")).toBe(false);
  });

  it("is what App actually does", () => {
    expect(appSource).toContain("const groupsLosingTheirComponent = new Set(");
    expect(appSource).toContain(".filter((id) => PRESENCE_OPTION_IDS.has(id))");
    expect(appSource).toContain("pickedOptionIds: survivingPicks,");
  });
});
