import { describe, expect, it } from "vitest";

import { emptyStructureProject } from "../../schema/agentuxConfig";
import { isAddedContentOption, mountedComponentsForProject } from "./presetRailData";

/**
 * The canvas opens empty, and the two avatars do not fill it.
 *
 * Two requirements met each other here and the second one lost silently. The
 * avatars are on from the first frame in every style — asked for, and written
 * down as a deliberate exception to `emptyStructureProject`'s "nothing is
 * picked yet" premise. But `selectedComponentItemsForProject` emits
 * `state:author.user` / `state:author.agent` whenever those fields are set, and
 * `mountedComponentsForProject` mounts a component when anything in its *own
 * group* is picked. So the conversation mounted at boot with nothing clicked,
 * and the canvas replay streamed a whole turn into it — a question, a reasoning
 * block, five tool rows, a reply, an artifact card and an image, on a canvas
 * that is meant to open blank for the reader to assemble.
 *
 * Nothing in the source said so: `OPENING_SLOT_IDS` correctly leaves `chat`
 * off, `App.test.tsx` asserts that, and both were true while the conversation
 * rendered anyway. It took loading the page on a fresh profile and counting
 * what was on it. Reported as "初次打开，对话区应该是空的，是可以让用户自己选、自己
 * 搭配的".
 *
 * Asserted against `mountedComponentsForProject` with the conversation group's
 * contribution passed in directly, rather than against a reconstructed boot
 * projection. The first version of this file did the latter and was wrong three
 * ways — it called `presetGroupsForProject` where the app passes the *visible*
 * subset, so it built nineteen items instead of the real two; it assumed the
 * side columns are presence-mounted when only the composer is; and it used
 * `chat-visible` as an example of a content pick when that id is the
 * conversation's presence toggle and is excluded by design. End-to-end
 * behaviour is verified in the browser instead (see below).
 */

/** What the conversation group contributes at boot, and nothing else. */
const AVATARS = [
  { id: "state:author.user", groupId: "conversation" as const },
  { id: "state:author.agent", groupId: "conversation" as const },
];

const withChatSlot = (enabled: boolean) => ({
  ...emptyStructureProject,
  layout: {
    ...emptyStructureProject.layout,
    slots: emptyStructureProject.layout.slots.map((slot) =>
      slot.component === "ChatFrame" ? { ...slot, enabled } : slot,
    ),
  },
});

describe("the empty canvas", () => {
  it("still has both avatars on", () => {
    // The premise of everything below. If this ever goes false the exclusion
    // has become dead code rather than a fix.
    expect(emptyStructureProject.conversation.userAvatar).toBe(true);
    expect(emptyStructureProject.conversation.agentAvatar).toBe(true);
  });

  it("opens with the conversation slot off", () => {
    const chat = emptyStructureProject.layout.slots.find((slot) => slot.component === "ChatFrame");
    expect(chat?.enabled).toBe(false);
  });

  it("does not mount the conversation for the avatars alone", () => {
    const mounted = mountedComponentsForProject(emptyStructureProject, AVATARS, []);

    expect(mounted.has("ChatFrame")).toBe(false);
  });

  it("mounts it when a real conversation option is picked", () => {
    /*
     * The other half, and the reason the fix is a two-id exclusion rather than
     * turning the avatars off: every *other* option in the conversation's group
     * still summons it, so picking one brings the conversation with it instead
     * of setting something with nowhere to show.
     */
    const item = { id: "speaker-labels", groupId: "conversation" as const };
    /* On in the project, not just present in the list: `isAddedContentOption`
       asks "is this an added content pick *right now*", and the projection only
       emits the item when the field is set — so passing the untouched project
       made it answer false and this assertion prove nothing. */
    const picked = {
      ...emptyStructureProject,
      conversation: { ...emptyStructureProject.conversation, speakerLabels: true },
    };
    expect(isAddedContentOption(picked, item.id)).toBe(true);

    const mounted = mountedComponentsForProject(picked, [...AVATARS, item], []);
    expect(mounted.has("ChatFrame")).toBe(true);
  });

  it("mounts it when the slot is enabled outright", () => {
    // The style path: applying a style turns the slot on through the kit.
    expect(mountedComponentsForProject(withChatSlot(true), AVATARS, []).has("ChatFrame")).toBe(true);
  });
});

/**
 * Measured in the browser on a fresh profile, `npm run dev` + CDP, because the
 * failure was invisible at this level — every source-level assertion about the
 * boot state was already passing while the conversation rendered.
 *
 *   boot (no style, nothing clicked):  0 timeline items, 0 bubbles, 0 avatars,
 *                                      composer present — held at 3s, 8s, 16s, 26s
 *   after 应用 原生风:                  2 timeline items, 1 bubble, 2 avatars
 *   after picking 显示对话流 alone:      1 chat frame,     1 bubble, 2 avatars
 *
 * The avatar count in the last two lines is the point: the faces still arrive
 * with the conversation, which is the requirement the exclusion had to keep.
 */
