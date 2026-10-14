import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { IconSetProvider } from "./IconSetContext";
import { StateGallery } from "../components/agentmatrix/StateGallery";
import { visibleStateCards, rawStateCardToStateCard } from "../app/projection/presetRailData";

function render(pickedSlots?: readonly string[]) {
  const cards = visibleStateCards("tool-calls").map((card) => rawStateCardToStateCard(card, "zh"));
  return renderToStaticMarkup(
    <IconSetProvider>
      <StateGallery cards={cards} pickedSlots={pickedSlots} />
    </IconSetProvider>,
  );
}

describe("state gallery icon tiles", () => {
  it("rings the tile the canvas is drawing, before anything is picked", () => {
    /*
     * This asserted the opposite until 2026-09-20, and the premise it was
     * written on turned out to be false.
     *
     * The old reasoning: every slot always holds an icon, so every row opened
     * with its first tile ringed, which "read as a dozen picks the reader had
     * not made, while the canvas showed none of them". That last clause is the
     * load-bearing one, and it is not true — the canvas draws a tool row per
     * action, `ToolCallCard` draws `tool.pending_approval` on every call that
     * waits, `ChatFrame` draws the incident marks. The mark is on screen; the
     * gallery was the only place that disagreed with it. Reported twice, once
     * for the avatars and again for 人机协作 and 运行状态.
     *
     * So the ring follows the canvas, and one tile a row is ringed from the
     * first frame: the one that is being drawn.
     */
    const markup = render([]);
    expect(markup).toContain("am-state-option");
    const rows = visibleStateCards("tool-calls").length;
    expect(markup.match(/data-active="true"/g)).toHaveLength(rows);
  });

  it("moves the ring when a slot is picked, and leaves the other rows alone", () => {
    const cards = visibleStateCards("tool-calls").map((card) => rawStateCardToStateCard(card, "zh"));
    const markup = render([cards[0]!.slot]);
    // Still one a row: picking does not add a ring, it moves one.
    expect(markup.match(/data-active="true"/g)).toHaveLength(cards.length);
  });

  it("rings the current icon when no picked list is passed either", () => {
    expect(render()).toContain('data-active="true"');
  });
});

/**
 * The avatar cards are the inverse case, and they are why the gate above needed
 * a hole in it.
 *
 * The reason `pickedSlots` exists is in the first test: a row that opens with
 * its first tile ringed claims a pick the reader never made — *while the canvas
 * shows none of them*. That last clause is load-bearing. The two avatars are on
 * from the first frame in every style, so the canvas **is** drawing the face,
 * and the gallery was the only place that disagreed. Reported as "明明已经在画布
 * 上展示头像了，为什么左侧…头像那里相应的头像没有被选中".
 *
 * So an enabled *toggle* card counts as chosen. `selected` is what keeps that
 * honest: for these cards it reads the same `conversation.userAvatar` /
 * `agentAvatar` flag the canvas renders from, so turning the card off takes the
 * ring with it.
 *
 * Measured after the change, one style at a time: all five ring their own face
 * in both slots — 原生风 `blue-smile` / `orange-blob`, 游戏风 `game-wolf` /
 * `game-orb-bot`, 复古风 `user` / `bot`, 手绘风 `sketch-cat-portrait` /
 * `sketch-bot-classic`, 水墨风 `ink-peaks` / `ink-bot-leaf`.
 */
describe("avatar tiles", () => {
  const avatarCards = () =>
    visibleStateCards("conversation")
      .map((card) => rawStateCardToStateCard(card, "zh"))
      .filter((card) => Boolean(card.toggleKey));

  function renderAvatars({ enabled }: { enabled: boolean }) {
    const cards = avatarCards();
    return renderToStaticMarkup(
      <IconSetProvider>
        <StateGallery cards={cards} pickedSlots={[]} isSelected={() => enabled} />
      </IconSetProvider>,
    );
  }

  it("has toggle cards to test", () => {
    // The premise: if these stop being toggle cards the hole above closes
    // silently and the rings disappear again.
    expect(avatarCards().length).toBeGreaterThan(0);
  });

  it("rings the current face when the card is on, with nothing picked", () => {
    expect(renderAvatars({ enabled: true })).toContain('data-active="true"');
  });

  it("rings nothing when the card is off", () => {
    // The flag the canvas renders from is also the flag the ring follows.
    expect(renderAvatars({ enabled: false })).not.toContain('data-active="true"');
  });
});
