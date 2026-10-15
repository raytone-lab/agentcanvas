import { useState, type CSSProperties } from "react";
import {
  MessagesSquare,
  PanelLeft,
  PanelsTopLeft,
  PenLine,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { landingPartKeys, type LandingCopy, type LandingPartKey } from "./copy";
import { useAutoplay } from "./useAutoplay";

/** Same icon each surface carries in the editor's own preset rail (App.tsx). */
const PART_ICON: Record<LandingPartKey, LucideIcon> = {
  sessions: PanelLeft,
  chat: MessagesSquare,
  thinking: Sparkles,
  tools: Wrench,
  output: PanelsTopLeft,
  composer: PenLine,
};

/** The still every part is pointed out on. */
const SCREEN = "/landing/styles/native-soft-glass.webp";

/**
 * Where each part sits on that still, as a percentage of the frame (left, top, width,
 * height). Read off the 1536×960 capture by hand; re-check them whenever
 * `scripts/capture-landing-styles.mjs` is re-run, since a new capture can scroll the chat
 * differently.
 */
const REGION: Record<LandingPartKey, [number, number, number, number]> = {
  sessions: [0.6, 0.8, 22.2, 98.4],
  chat: [24.4, 1.4, 51.4, 27.8],
  thinking: [24.6, 29.4, 51, 13.2],
  tools: [24.9, 42.8, 50.2, 32.2],
  output: [77.2, 0.8, 22.2, 98.4],
  composer: [24.9, 75.6, 50.2, 22.6],
};

/** How long each part stays lit before the next one, in ms. */
const DWELL = 2400;

/**
 * The parts, pointed out on a real canvas.
 *
 * The list sits beside the editor itself and the active part is lit on the screen while
 * the rest of the frame recedes under paper. It walks the parts on its own while on
 * screen — the active row's hairline fills as the dwell runs out, and that fill's
 * `animationend` moves it on — and holds while the pointer is over the section. Picking a
 * part jumps there and carries on from it. Under reduced motion it does not advance.
 *
 * It used to pin and follow the scroll instead; that made a reader scroll six screens to
 * see six parts, and the walk is the point, not the scroll.
 */
export function PartsAnatomy({
  copy,
  stepLabel,
}: {
  copy: LandingCopy["parts"];
  stepLabel: string;
}) {
  const [active, setActive] = useState(0);
  const { ref: rootRef, running } = useAutoplay<HTMLElement>(0.45);
  // The row under the pointer previews its part on the screen; the walk holds meanwhile.
  const [preview, setPreview] = useState<number | null>(null);
  const total = landingPartKeys.length;
  // The open row: the one under the pointer if any, else the one the walk is on. Hovering
  // a row opens it exactly as selecting it would.
  const open = preview ?? active;
  const key = landingPartKeys[open];
  const [left, top, width, height] = REGION[key];

  return (
    <section
      ref={rootRef}
      className="lp-anatomy lp-section"
      id="lp-parts"
      data-running={running || undefined}
      style={{ "--dwell": `${DWELL}ms` } as CSSProperties}
      aria-labelledby="lp-parts-title"
    >
      <div className="lp-shell lp-anatomy-inner">
        {/* The heading spans the block; below it the list and the screen share one row and
            one height, so their top and bottom edges meet the same lines. */}
        <div className="lp-anatomy-copy">
          <p className="lp-eyebrow">{stepLabel}</p>
          <h2 className="lp-section-title" id="lp-parts-title">
            {copy.title}
          </h2>
          <p className="lp-section-lede">{copy.lede}</p>
        </div>
        <ol className="lp-anatomy-list">
          {landingPartKeys.map((partKey, partIndex) => {
            const part = copy.items[partKey];
            const Icon = PART_ICON[partKey];
            const isActive = partIndex === active;
            return (
              <li
                key={partKey}
                data-active={isActive || undefined}
                data-open={open === partIndex || undefined}
                data-preview={preview === partIndex || undefined}
                onPointerEnter={() => setPreview(partIndex)}
                onPointerLeave={() => setPreview(null)}
              >
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActive(partIndex)}
                >
                  <span className="lp-anatomy-head">
                    <Icon size={16} aria-hidden="true" />
                    <span className="lp-anatomy-name">{part.name}</span>
                    <code>{part.component}</code>
                  </span>
                  {/* Collapsed by grid rows, not unmounted, so the height animates and
                        the text is still there for a screen reader. */}
                  <span className="lp-anatomy-body">
                    <span>{part.body}</span>
                  </span>
                </button>
                <span className="lp-anatomy-meter" aria-hidden="true">
                  {isActive ? (
                    <span
                      key={active}
                      className="lp-anatomy-fill"
                      onAnimationEnd={() =>
                        setActive((current) => (current + 1) % total)
                      }
                    />
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>

        <figure className="lp-anatomy-stage" aria-hidden="true">
          <div
            className="lp-anatomy-screen"
            style={
              {
                "--focus-x": `${left}%`,
                "--focus-y": `${top}%`,
                "--focus-w": `${width}%`,
                "--focus-h": `${height}%`,
              } as CSSProperties
            }
          >
            <img
              src={SCREEN}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <span className="lp-anatomy-focus" />
          </div>
        </figure>
      </div>
    </section>
  );
}
