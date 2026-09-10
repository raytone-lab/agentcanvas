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
  it("rings no tile until its slot has been chosen", () => {
    // Every slot always holds an icon — a tool card has to draw something — so
    // "the current icon" is never empty and every row opened with its first
    // tile ringed. That read as a dozen picks the reader had not made, while
    // the canvas showed none of them.
    const markup = render([]);
    expect(markup).toContain("am-state-option");
    expect(markup).not.toContain('data-active="true"');
  });

  it("rings the chosen tile once its slot is picked", () => {
    const cards = visibleStateCards("tool-calls").map((card) => rawStateCardToStateCard(card, "zh"));
    const markup = render([cards[0]!.slot]);
    expect(markup).toContain('data-active="true"');
    // Only that slot: picking one tool's icon does not ring every other row.
    expect(markup.match(/data-active="true"/g)).toHaveLength(1);
  });

  it("leaves galleries that pass no picked slots alone", () => {
    // Undefined keeps the old behaviour, for a gallery where showing the
    // current icon is the useful thing.
    expect(render()).toContain('data-active="true"');
  });
});
