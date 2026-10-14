import { createElement, type ReactNode, type SVGProps } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * 科技风's own marks for the left column.
 *
 * Drawn from the style's plate — a glass ring with a sphere floating inside
 * it — rather than borrowed from the shared set, which gave this column the
 * same speech balloons every other style's column wears:
 *
 *   tech-node      a session: the ring with its sphere, the ring open at the
 *                  top right where a small node rides it, the plate's light
 *                  running round the glass
 *   tech-orbit-new 新建对话: the same ring and node, a plus where the sphere
 *                  would be — a new one, not yet filled
 *
 * One family, so the button and the rows it makes read as the same object.
 * Fine strokes on purpose: the style sets every svg in its frame to 2.6, and
 * `.tech-icon` is exempted from that in app.css — a ring this small drawn at
 * 2.6 closes up into a blob.
 */

type TechIconProps = SVGProps<SVGSVGElement> & { size?: number | string };

function techIcon(children: ReactNode): LucideIcon {
  const Icon = ({ size = 16, className, ...rest }: TechIconProps) =>
    createElement(
      "svg",
      {
        ...rest,
        className: ["tech-icon", className].filter(Boolean).join(" "),
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.7,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        xmlns: "http://www.w3.org/2000/svg",
        "aria-hidden": true,
        focusable: false,
      },
      children,
    );
  return Icon as unknown as LucideIcon;
}

const el = createElement;

/* The ring: r 8.2 round the centre, open over the top right between -20° and
   -70°, with the node sitting in the opening at -45°. */
const RING = "M19.71 9.2A8.2 8.2 0 1 1 14.8 4.3";
const ringParts = () => [
  el("path", { key: "ring", d: RING }),
  el("circle", { key: "node", cx: 17.8, cy: 6.2, r: 1.6, fill: "currentColor", stroke: "none" }),
];

export const TechNodeIcon = techIcon([
  ...ringParts(),
  el("circle", { key: "sphere", cx: 12, cy: 12, r: 3, fill: "currentColor", stroke: "none" }),
]);

export const TechNewChatIcon = techIcon([
  ...ringParts(),
  el("path", { key: "plus", d: "M12 8.6v6.8M8.6 12h6.8" }),
]);
