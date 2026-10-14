/**
 * 科技风's agent avatars: the TV-headed robot from `robot-heads` (MIT), one per
 * outline the package offers.
 *
 * The style used to borrow 原生风's `blue-smile` / `orange-blob` pair — the
 * table in `presetRailData` said as much, "原生风's pair: this style draws that
 * set" — so it was the one style with no face of its own. A moulded shell with
 * an LED matrix for a face is the register this style was already in.
 *
 * Four shapes rather than four palettes: at the size the avatar slot gives, an
 * outline is legible in the gallery and a shell colour is not. The package's
 * own palette — deep glossy blue, pale steel trim, cool white LEDs — is left
 * alone.
 *
 * `state` is pinned to `idle` on purpose. These are skins, not indicators: the
 * event stream does not reach the icon slot, and a head that sat in `thinking`
 * forever would be lying about it. `idle` still blinks and glances.
 */

import { useId, type CSSProperties } from "react";
import { RobotHead, type RobotHeadShape } from "robot-heads";

/**
 * Where the head actually sits inside the square canvas the package draws.
 *
 * It does not fill it. The layout reserves air above for the antenna, its glow
 * and the hop a click triggers, plus a strip below for the floor shadow —
 * `0.80` and `0.22` of a head unit respectively, which is most of the frame.
 * The head comes out 43–54% of the canvas wide and 41–46% tall, centred ~65%
 * of the way down rather than halfway.
 *
 * Dropped into the 32px avatar slot unchanged, that left a ~14px head: the
 * LED matrix — the one detail the head is for — was a dark smudge. So the
 * canvas is blown up past the slot and pulled up until the head's centre meets
 * the slot's, and the surrounding air simply overhangs.
 *
 * - `fit`: canvas edge as a % of the slot, sized so the head spans 92% of the
 *   slot's width. Not 100%: the remaining 8% is what a hop travels into.
 * - `centreY`: the head's centre as a % of the canvas height, which is what
 *   the transform below has to cancel.
 *
 * Derived from the package's own layout maths at 0.1.0 (`dist/index.js`:464 for
 * the reserves, :671 for the scale, :678 for the origin) and the four shape
 * definitions at :96–99. They are internal, so a `robot-heads` minor bump
 * wants these re-derived — the failure is cosmetic and obvious (a head too
 * small again, or clipped), not silent.
 */
const PLACEMENT: Record<RobotHeadShape, { fit: number; centreY: number }> = {
  rectangle: { fit: 170.7, centreY: 65.7 },
  square: { fit: 212.4, centreY: 65.0 },
  circle: { fit: 202.3, centreY: 64.4 },
  hexagon: { fit: 183.0, centreY: 64.3 },
};

/**
 * Canvas pixels the head is drawn at, independent of the box it lands in.
 *
 * The call sites pass `size={15}` (`ChatFrame`), `size={40}` (`ComposerFrame`)
 * and `size={14}` (the gallery tile), while the CSS stretches the result to the
 * full slot — so the incoming number describes the box, not the raster. The
 * placement above then displays this canvas at ~2× the slot, so 128 leaves the
 * head itself ~55–69px of raster for a ~37px slot before the device ratio the
 * package applies on top.
 */
const RASTER = 128;

/**
 * 0–1, so a column of agent turns does not blink in unison — which is what the
 * package's `seed` is for. Derived from `useId` rather than `Math.random` to
 * keep the first client frame identical to the server's.
 */
function seedFromId(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 100_000;
  }
  return hash / 100_000;
}

function robotHeadAvatar(shape: RobotHeadShape) {
  const { fit, centreY } = PLACEMENT[shape];
  /*
   * `pointer-events: none` because the canvas is now wider than the slot and
   * would otherwise overhang the message bubble beside it and swallow clicks
   * meant for the text. The gaze survives — the package tracks the pointer on
   * `document`, not on the canvas (`dist/index.js`:807) — and only the
   * click-to-hop is given up, which is the right half of the trade at this
   * size.
   */
  /*
   * These have to be inline, unlike the span's box above: the package merges
   * whatever `style` it is given into the same object it sets `width`/`height`
   * on, so a stylesheet has nothing to win against. The lever a stylesheet gets
   * instead is `--robot-head-zoom`, read from here and composed onto the end of
   * the transform — `transform-origin` is pinned to the head's own centre so a
   * zoom grows the head in place rather than shoving it off the frame's middle.
   *
   * Worth the indirection because this is the second time the inline-style trap
   * bit: the gallery's selected state was written as a `scale()` on this canvas
   * and silently did nothing.
   */
  const canvasStyle: CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: `${fit}%`,
    height: `${fit}%`,
    transformOrigin: `50% ${centreY}%`,
    transform: `translate(-50%, -${centreY}%) scale(var(--robot-head-zoom, 1))`,
    pointerEvents: "none",
  };

  return function RobotHeadAvatar({
    size = 24,
    className,
    ...rest
  }: { size?: number | string; className?: string } & Record<string, unknown>) {
    const seed = seedFromId(useId());
    const box = typeof size === "number" ? size : Number.parseInt(String(size), 10) || 24;
    return (
      <span
        className={`robot-head-face${className ? ` ${className}` : ""}`}
        /*
         * The incoming size as a custom property rather than `width`/`height`,
         * because the slots that stretch their avatar to the full box do it
         * from a stylesheet — and an inline width beats any selector they
         * could write. The vector faces beside these get away with `width` as
         * an *attribute* on the `<svg>`, which loses to CSS; a span has no such
         * attribute, so the one lever left is a property the stylesheet reads.
         *
         * Measured: with an inline width the 40px chat slot still drew a 14px
         * head, while the 56px composer — which passes its real size — drew the
         * right one. The rule was there and losing.
         */
        style={{ "--robot-head-box": `${box}px` } as CSSProperties}
        role="img"
        aria-hidden={(rest["aria-hidden"] as boolean | undefined) ?? true}
      >
        <RobotHead
          shape={shape}
          state="idle"
          size={RASTER}
          seed={seed}
          floorShadow={false}
          style={canvasStyle}
        />
      </span>
    );
  };
}

export const RobotHeadTvIcon = robotHeadAvatar("rectangle");
export const RobotHeadSquareIcon = robotHeadAvatar("square");
export const RobotHeadRoundIcon = robotHeadAvatar("circle");
export const RobotHeadHexIcon = robotHeadAvatar("hexagon");
