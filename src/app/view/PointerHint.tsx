import { useEffect } from "react";

/** How long a hint stays up before it goes away on its own. */
const HINT_MS = 3000;

export type PointerHintState = { x: number; y: number; text: string } | null;

/**
 * A one-line answer, at the pointer.
 *
 * A bottom-corner toast makes the reader look away from what they just clicked
 * to find out why nothing happened, and by then the connection between the two
 * is gone. This appears where the click landed, says one thing, and leaves.
 *
 * Not a tooltip: it is a reply to an action, so it is not tied to hover and
 * cannot be dismissed by moving the mouse — it would vanish before it was read.
 */
export function PointerHint({ hint, onDismiss }: { hint: PointerHintState; onDismiss: () => void }) {
  useEffect(() => {
    if (!hint) return;
    // Keyed on the text and position so clicking again restarts the clock
    // rather than inheriting the first click's remaining time.
    const timer = window.setTimeout(onDismiss, HINT_MS);
    return () => window.clearTimeout(timer);
  }, [hint, onDismiss]);

  if (!hint) return null;

  return (
    <div
      className="pointer-hint"
      role="status"
      // Offset off the cursor so the pointer does not cover the first word,
      // and clamped so a click near an edge does not push it off screen.
      style={{
        left: `${Math.min(hint.x + 12, window.innerWidth - 240)}px`,
        top: `${Math.max(8, hint.y - 34)}px`,
      }}
    >
      {hint.text}
    </div>
  );
}
