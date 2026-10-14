import * as Tooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

/**
 * A named hint for an icon-only control: the name, and a line on what it does.
 *
 * For controls whose glyph alone is not enough — the topbar's eye and play
 * key were read as two unlabelled mysteries — but where a visible word is
 * wrong too: labels in three languages made the row change width with the
 * locale. The bubble carries the words instead, so the row stays icons.
 *
 * Radix underneath, for what is easy to get wrong by hand: portalled out of
 * the card (which clips), flipped and shifted at the window edge (the topbar
 * sits against it), Esc, and `aria-describedby`. The motion is in app.css
 * ("Hint bubble").
 */
export function HintBubble({
  title,
  description,
  side = "bottom",
  children,
}: {
  title: string;
  description?: string;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactNode;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="hint-bubble" side={side} sideOffset={8} collisionPadding={10}>
          <span className="hint-bubble-title">{title}</span>
          {description ? <span className="hint-bubble-description">{description}</span> : null}
          <Tooltip.Arrow className="hint-bubble-arrow" width={12} height={6} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * One per row of hinted controls. A first hint waits a beat so a pointer
 * crossing the row does not set it flashing; once one is showing, moving to
 * its neighbour switches at once (`skipDelayDuration`).
 *
 * `disableHoverableContent`: a hint has nothing to click, and Radix's default
 * keeps it open while the pointer is in the corridor toward it — which, for a
 * bubble wider than its trigger, covers the neighbouring control. Hovering
 * the play key went on showing the eye's hint.
 */
export function HintBubbleGroup({ children }: { children: ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={320} skipDelayDuration={500} disableHoverableContent>
      {children}
    </Tooltip.Provider>
  );
}
