import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CirclePlay, FileText, Network, Shield, Type, Wrench, type LucideIcon } from "lucide-react";

import type { LandingCopy } from "./copy";
import { useAutoplay } from "./useAutoplay";

/** One icon per event family, in the order `events.rows` declares them. */
const FAMILY_ICON: readonly LucideIcon[] = [CirclePlay, Type, Network, Wrench, Shield, FileText];

/** How long each family's route stays lit, in ms. */
const DWELL = 3000;

/**
 * The event mapping as a switchboard.
 *
 * Families on the left, the components that render them on the right, and a wire from
 * each family to its component — two families share ChatFrame, so two wires meet there,
 * which is the claim ("events are routed, components do not read the stream") drawn
 * rather than tabulated. It is deliberately not the tab-and-panel card the export uses:
 * this block is about connections, so the connections are the picture.
 *
 * A route lights in turn on its own while on screen: the wire draws in the signal, a
 * pulse runs along it and the component it reaches takes the signal outline; that wire's
 * `animationend` moves it on. Pointing at a family or a component lights its routes and
 * holds the walk.
 *
 * Geometry: rows and nodes share one fixed-height column, so row i's centre is
 * (i + .5) / rows of it and node j's is (j + .5) / nodes. The SVG is drawn in its real
 * pixel size (measured), never stretched: a stretched path needs a non-scaling stroke,
 * and a non-scaling stroke measures its dashes on screen, which cut the draw-in short.
 */
export function EventStream({ copy }: { copy: LandingCopy["events"] }) {
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<{ kind: "family" | "node"; index: number } | null>(null);
  const { ref, running } = useAutoplay<HTMLDivElement>(0.35);
  const wiresRef = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState({ w: 200, h: 444 });

  useEffect(() => {
    const svg = wiresRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setBox({ w: width, h: height });
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const rows = copy.rows;
  const nodes = [...new Set(rows.map((row) => row.component))];
  const nodeOf = rows.map((row) => nodes.indexOf(row.component));

  const lit = (family: number) => {
    if (hover?.kind === "family") return hover.index === family;
    if (hover?.kind === "node") return nodeOf[family] === hover.index;
    return family === active;
  };
  const nodeLit = (node: number) => rows.some((_, family) => nodeOf[family] === node && lit(family));
  const noteFor = (node: number) => {
    const family = rows.findIndex((_, index) => nodeOf[index] === node && lit(index));
    return rows[family >= 0 ? family : nodeOf.indexOf(node)].ui;
  };

  return (
    <div
      className="lp-board"
      ref={ref}
      data-running={running && !hover ? "true" : undefined}
      style={{ "--dwell": `${DWELL}ms`, "--rows": rows.length, "--nodes": nodes.length } as CSSProperties}
    >
      <ol className="lp-board-flow">
        {copy.flow.map((stage, index) => (
          <li key={stage.label}>
            <span className="lp-board-flow-stop">
              <span className="lp-board-flow-step">{stage.label}</span>
              {stage.file ? <code>{stage.file}</code> : null}
            </span>
            {index < copy.flow.length - 1 ? <span className="lp-board-flow-rule" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>

      <div className="lp-board-map">
        <p className="lp-board-caption">{copy.columnCategory}</p>
        <p className="lp-board-caption lp-board-caption--end">{copy.columnTarget}</p>

        <ul className="lp-board-families">
          {rows.map((row, index) => {
            const Icon = FAMILY_ICON[index] ?? CirclePlay;
            return (
              <li
                key={row.label}
                data-lit={lit(index) || undefined}
                onPointerEnter={() => setHover({ kind: "family", index })}
                onPointerLeave={() => setHover(null)}
              >
                <button
                  type="button"
                  aria-pressed={index === active}
                  aria-describedby={`lp-board-node-${nodeOf[index]}`}
                  onClick={() => setActive(index)}
                  onFocus={() => setHover({ kind: "family", index })}
                  onBlur={() => setHover(null)}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span className="lp-board-family">{row.label}</span>
                  <span className="lp-board-events">
                    {row.events.map((event) => (
                      <code key={event}>{event}</code>
                    ))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <svg
          ref={wiresRef}
          className="lp-board-wires"
          viewBox={`0 0 ${box.w} ${box.h}`}
          aria-hidden="true"
        >
          {rows.map((row, index) => {
            const y1 = ((index + 0.5) / rows.length) * box.h;
            const y2 = ((nodeOf[index] + 0.5) / nodes.length) * box.h;
            const inset = 6;
            const x1 = inset;
            const x2 = box.w - inset;
            const bend = (x2 - x1) * 0.55;
            const d = `M${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
            const on = lit(index);
            return (
              <g key={row.label} className="lp-board-route" data-lit={on || undefined}>
                <path className="lp-board-wire" d={d} pathLength={1} />
                {on ? (
                  <g key={`${index}-${active}-${hover ? "h" : "a"}`}>
                    <path
                      className="lp-board-wire-live"
                      d={d}
                      pathLength={1}
                      onAnimationEnd={
                        hover ? undefined : () => setActive((current) => (current + 1) % rows.length)
                      }
                    />
                    <path className="lp-board-wire-pulse" d={d} pathLength={1} />
                  </g>
                ) : null}
                {/* Ports: every wire leaves one and arrives at one, so an idle wire still
                    reads as a connection between two things rather than a stray line. */}
                <circle className="lp-board-port" cx={x1} cy={y1} r={3.5} />
                <circle className="lp-board-port" cx={x2} cy={y2} r={3.5} />
              </g>
            );
          })}
        </svg>

        <ul className="lp-board-nodes">
          {nodes.map((node, index) => (
            <li
              key={node}
              id={`lp-board-node-${index}`}
              data-lit={nodeLit(index) || undefined}
              onPointerEnter={() => setHover({ kind: "node", index })}
              onPointerLeave={() => setHover(null)}
            >
              <code>{node}</code>
              <span>{noteFor(index)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
