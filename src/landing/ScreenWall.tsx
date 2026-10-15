import { useEffect, useRef, type CSSProperties } from "react";

import styleShots from "./styleShots.json";

/**
 * The hero's wall of screens: every canvas the style gallery captured (six styles, four
 * colourways each), laid on a tilted desk and drifting.
 *
 * It says one thing before anything is read — "this is one product in two dozen looks" —
 * which is why the first screen is the work itself rather than a picture of a hero. The
 * gallery below then takes them one at a time.
 *
 * - **Drift** is the page's only ambient animation. Each column is rendered twice and
 *   translated exactly −50%, so the loop has no seam; alternate columns run the other way
 *   at different speeds. It is CSS, so it starts on the first frame.
 * - **Depth**: on a fine pointer the plane leans toward the cursor by at most 3° / 4°.
 *   Coarse pointers and reduced motion get the resting tilt.
 * - **Paused** whenever the hero is not the card on top (`data-paused`, set by the stack's
 *   ScrollTrigger — an IntersectionObserver cannot tell, because a sticky card covered by
 *   another sticky card is still geometrically in the viewport).
 */
const COLUMNS = 5;

type Shot = { src: string; alt: string };

function wallColumns(): Shot[][] {
  const shots: Shot[] = styleShots.flatMap((style) =>
    style.palettes.map((palette) => ({ src: palette.src, alt: `${style.name} · ${palette.name}` })),
  );
  // Deal round-robin with an offset per column, so neighbouring columns never start on the
  // same style and each column still cycles through all six.
  const columns: Shot[][] = Array.from({ length: COLUMNS }, () => []);
  shots.forEach((shot, index) => {
    columns[(index + Math.floor(index / COLUMNS)) % COLUMNS].push(shot);
  });
  return columns;
}

const COLUMN_DATA = wallColumns();

export function ScreenWall({ label, paused }: { label: string; paused: boolean }) {
  const planeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const plane = planeRef.current;
    if (!plane) return;
    const fine = matchMedia("(pointer: fine)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduced.matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = event.clientX / window.innerWidth - 0.5;
        const y = event.clientY / window.innerHeight - 0.5;
        plane.style.setProperty("--wall-lean-x", `${(-y * 6).toFixed(2)}deg`);
        plane.style.setProperty("--wall-lean-y", `${(x * 8).toFixed(2)}deg`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="lp-wall" role="img" aria-label={label} data-paused={paused || undefined}>
      <div className="lp-wall-plane" ref={planeRef}>
        {COLUMN_DATA.map((column, columnIndex) => (
          <div
            className="lp-wall-column"
            key={columnIndex}
            data-direction={columnIndex % 2 === 0 ? "up" : "down"}
            style={
              {
                "--wall-delay": `${columnIndex * 90}ms`,
                "--wall-duration": `${64 + columnIndex * 9}s`,
              } as CSSProperties
            }
          >
            <div className="lp-wall-track">
              {[0, 1].map((copy) =>
                column.map((shot, index) => (
                  <img
                    key={`${copy}-${shot.src}`}
                    className="lp-wall-screen"
                    src={shot.src}
                    alt=""
                    // The first copy of the first rows is above the fold; the repeat that
                    // closes the loop is not needed until the drift reaches it.
                    loading={copy === 0 && index < 2 ? "eager" : "lazy"}
                    decoding="async"
                    draggable={false}
                  />
                )),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
