/**
 * 科技风's reader avatars: four gummy bots — soft, solid shapes with white pill
 * eyes, lit so they read as 3D.
 *
 * The register is the one asked for by example (the Grok Bot launch screen:
 * a scatter of single-colour blobs, each with two white eyes), and drawn from
 * scratch. What makes them sit in 科技风 rather than beside it is the light:
 * a spherical falloff, a softened specular patch on top, a darker belly with a
 * bounce of ambient along the bottom edge, and a tinted contact shadow — the
 * same "lit object on the page" the agent's TV heads are.
 *
 *   - 云团 — an electric-blue cloud, eyes tilted "/ \"
 *   - 软糖 — a violet gummy blob, two small eyes peeking from the upper right
 *   - 方块 — a cyan rounded block, leaning, with round dot eyes
 *   - 六角 — a mint rounded hexagon, eyes set "\ /"
 *
 * Motion is `techUserRig`'s: gaze following the pointer, the body following
 * with inertia, real blinks, a jelly squash on press. No mouth at rest, like
 * the reference; one appears as the mood rises (a small white smile, the eyes
 * turning to `^ ^`) and an `o` under a squeeze. A slow breathing squash runs in
 * CSS ("科技风's gummy avatars" in `app.css`).
 *
 * Layering for the rig: `.tu-head` takes follow and squeeze, `.tu-breathe` the
 * idle squash, `.tu-gaze` moves the eyes further than the body, `.tu-blink`
 * closes them.
 */

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";

import { attachOperatorRig } from "./techUserRig";

type AvatarProps = { size?: number | string; className?: string } & Record<string, unknown>;

/* Each body's colour, as a light / base / dark ramp. Fixed: these are the
   characters, the way the agent heads keep their package palette. */
type Ramp = { light: string; base: string; dark: string };
const RAMP: Record<"cloud" | "gummy" | "block" | "hex", Ramp> = {
  cloud: { light: "#86B6FF", base: "#2F7BFF", dark: "#1546C4" },
  gummy: { light: "#C5ADFF", base: "#8B5CF6", dark: "#5427C9" },
  block: { light: "#84E6F4", base: "#12B4D2", dark: "#077C98" },
  hex: { light: "#86EEBF", base: "#16C17A", dark: "#08854F" },
};

function seedDelay(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) % 9973;
  return `${-((hash % 4000) / 1000).toFixed(2)}s`;
}

/** Shared frame: sizing, seed, the rig, and the per-instance id prefix. */
/**
 * Each body framed tight. Drawn on a 64 grid with room to spare, they came out
 * at 65–80% of the slot while the agent's TV heads fill ~92% of theirs, so the
 * reader's side looked a size smaller. Each viewBox crops to its own body so
 * all four land near the heads' 92%; the contact shadow may overhang the box,
 * which the avatar's `overflow: visible` allows.
 */
const VIEWBOX: Record<string, string> = {
  cloud: "7.5 5 49 49",
  gummy: "9.5 6.5 46 46",
  block: "9 7.5 46 46",
  hex: "10 9 44 44",
};

function useAvatarFrame(kind: string, { size = 24, className, ...rest }: AvatarProps) {
  const raw = useId();
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => (ref.current ? attachOperatorRig(ref.current) : undefined), []);
  const uid = raw.replace(/[^a-zA-Z0-9_-]/g, "");
  const box = typeof size === "number" ? size : Number.parseInt(String(size), 10) || 24;
  const svgProps = {
    ref,
    className: `tech-user-face tech-user-${kind}${className ? ` ${className}` : ""}`,
    width: box,
    height: box,
    viewBox: VIEWBOX[kind] ?? "0 0 64 64",
    role: "img",
    "aria-hidden": (rest["aria-hidden"] as boolean | undefined) ?? true,
    focusable: "false" as const,
    style: { "--tu-delay": seedDelay(raw) } as CSSProperties,
  };
  return { uid, svgProps };
}

type Eye = { cx: number; cy: number; w: number; h: number; rotate?: number };

/**
 * A polygon with rounded corners, as one path. The hexagon used to be a
 * polygon with a fat round-joined stroke, which rounds the corners but paints
 * the stroke outside the shape's bounding box — and the lit gradient, measured
 * on that box, came out mismatched there: a bright chevron along the bottom.
 */
function roundedPolygon(points: [number, number][], radius: number): string {
  const n = points.length;
  let d = "";
  for (let i = 0; i < n; i += 1) {
    const [px, py] = points[(i - 1 + n) % n];
    const [cx, cy] = points[i];
    const [nx, ny] = points[(i + 1) % n];
    const toPrev = Math.hypot(px - cx, py - cy);
    const toNext = Math.hypot(nx - cx, ny - cy);
    const ax = cx + ((px - cx) / toPrev) * radius;
    const ay = cy + ((py - cy) / toPrev) * radius;
    const bx = cx + ((nx - cx) / toNext) * radius;
    const by = cy + ((ny - cy) / toNext) * radius;
    d += `${i === 0 ? "M" : "L"}${ax.toFixed(2)} ${ay.toFixed(2)} Q${cx} ${cy} ${bx.toFixed(2)} ${by.toFixed(2)} `;
  }
  return `${d}Z`;
}

const HEX_PATH = roundedPolygon(
  [0, 1, 2, 3, 4, 5].map((k) => {
    const angle = ((-90 + k * 60) * Math.PI) / 180;
    return [32 + 22 * Math.cos(angle), 32 + 22 * Math.sin(angle)] as [number, number];
  }),
  6,
);

/**
 * One lit body. `shape` draws the silhouette with whatever fill it is given:
 * once in the lit gradient, once as the clip the highlight and the shading are
 * painted inside, and again for the belly shade and the bounce light.
 */
function GummyBot({
  uid,
  ramp,
  shape,
  eyes,
  mouthAt,
  floor,
}: {
  uid: string;
  ramp: Ramp;
  shape: (fill: string) => ReactNode;
  eyes: [Eye, Eye];
  mouthAt: { x: number; y: number };
  /** Where the body's lowest point is, so the contact shadow sits just under it. */
  floor: number;
}) {
  const eye = (e: Eye, key: string, fill: string, dy = 0) => {
    const transform = e.rotate ? `rotate(${e.rotate} ${e.cx} ${e.cy + dy})` : undefined;
    return e.w === e.h ? (
      <circle key={key} cx={e.cx} cy={e.cy + dy} r={e.w / 2} fill={fill} />
    ) : (
      <rect key={key} x={e.cx - e.w / 2} y={e.cy - e.h / 2 + dy} width={e.w} height={e.h} rx={e.w / 2} fill={fill} transform={transform} />
    );
  };
  const arc = (e: Eye) => `M${e.cx - 2.8} ${e.cy + 1.2} Q${e.cx} ${e.cy - 2.6} ${e.cx + 2.8} ${e.cy + 1.2}`;
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-lit`} cx="34%" cy="28%" r="80%">
          <stop offset="0" stopColor={ramp.light} />
          <stop offset="0.48" stopColor={ramp.base} />
          <stop offset="1" stopColor={ramp.dark} />
        </radialGradient>
        <linearGradient id={`${uid}-belly`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor={ramp.dark} stopOpacity="0" />
          <stop offset="1" stopColor={ramp.dark} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${uid}-bounce`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.8" stopColor={ramp.light} stopOpacity="0" />
          <stop offset="1" stopColor={ramp.light} stopOpacity="0.5" />
        </linearGradient>
        <filter id={`${uid}-soft`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <filter id={`${uid}-shadow`} x="-40%" y="-80%" width="180%" height="260%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <clipPath id={`${uid}-body`}>{shape("#000")}</clipPath>
      </defs>
      {/* Contact shadow, tinted by the body: a lit object picks up its own colour underneath. */}
      <ellipse cx="32" cy={floor + 4.5} rx="15" ry="2.8" fill={ramp.dark} opacity="0.32" filter={`url(#${uid}-shadow)`} />
      <ellipse cx="32" cy={floor + 4.5} rx="9" ry="1.5" fill="#0B1220" opacity="0.22" filter={`url(#${uid}-shadow)`} />
      <g className="tu-head">
        <g className="tu-breathe">
          {shape(`url(#${uid}-lit)`)}
          <g clipPath={`url(#${uid}-body)`}>
            {shape(`url(#${uid}-belly)`)}
            {shape(`url(#${uid}-bounce)`)}
            {/* The specular patch: a soft white bloom upper-left, a crisp glint inside it. */}
            <ellipse cx="23" cy="19" rx="10" ry="6.5" fill="#FFFFFF" opacity="0.42" filter={`url(#${uid}-soft)`} />
            <ellipse cx="21.5" cy="18" rx="3.6" ry="2" fill="#FFFFFF" opacity="0.7" transform="rotate(-24 21.5 18)" />
          </g>
          <g className="tu-gaze">
            <g className="tu-eyes-open">
              <g className="tu-blink">
                {/* Each eye sits in a faint socket of the body's dark tone, so it reads as inset. */}
                {eyes.map((e, i) => eye(e, `s${i}`, ramp.dark, 0.9))}
                {eyes.map((e, i) => eye(e, `e${i}`, "#FFFFFF"))}
              </g>
            </g>
            <g className="tu-eyes-happy" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round">
              <path d={arc(eyes[0])} />
              <path d={arc(eyes[1])} />
            </g>
          </g>
          <g className="tu-gaze tu-gaze-soft">
            <g className="tu-mouth-happy">
              <path
                d={`M${mouthAt.x - 3} ${mouthAt.y} Q${mouthAt.x} ${mouthAt.y + 3.6} ${mouthAt.x + 3} ${mouthAt.y}`}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
            <g className="tu-mouth-o">
              <ellipse cx={mouthAt.x} cy={mouthAt.y + 1.4} rx="1.9" ry="2.4" fill="#FFFFFF" />
            </g>
          </g>
        </g>
      </g>
    </>
  );
}

/** 云团 — an electric-blue cloud, eyes tilted "/ \". */
export function TechUserCloudIcon(props: AvatarProps) {
  const { uid, svgProps } = useAvatarFrame("cloud", props);
  return (
    <svg {...svgProps}>
      <GummyBot
        uid={uid}
        ramp={RAMP.cloud}
        shape={(fill) => (
          <path
            d="M17 47 C9.5 47 6 39 10.5 33.6 C7 26.5 13.5 18.6 21.4 21.2 C23.6 12.4 37 11 40.6 19 C48 15.4 56.4 22.6 53.2 30.6 C59 34.6 57 47 47.6 47 Z"
            fill={fill}
          />
        )}
        eyes={[
          { cx: 27, cy: 31, w: 4.4, h: 9.6, rotate: 24 },
          { cx: 38, cy: 31, w: 4.4, h: 9.6, rotate: -24 },
        ]}
        mouthAt={{ x: 32.5, y: 39 }}
        floor={47}
      />
    </svg>
  );
}

/** 软糖 — a violet gummy blob, two small eyes peeking from the upper right. */
export function TechUserGummyIcon(props: AvatarProps) {
  const { uid, svgProps } = useAvatarFrame("gummy", props);
  return (
    <svg {...svgProps}>
      <GummyBot
        uid={uid}
        ramp={RAMP.gummy}
        shape={(fill) => (
          <path
            d="M19 19 C27 11.5 45 12 50.5 23.5 C55 33.5 50 46.5 36.5 47.5 C23.5 48.5 12 41.5 12.5 31 C12.7 25.8 15 22.4 19 19 Z"
            fill={fill}
          />
        )}
        eyes={[
          { cx: 37, cy: 27, w: 4.2, h: 8.4, rotate: 6 },
          { cx: 45, cy: 28, w: 4.2, h: 8.4, rotate: 6 },
        ]}
        mouthAt={{ x: 41, y: 36 }}
        floor={48}
      />
    </svg>
  );
}

/** 方块 — a cyan rounded block, leaning, with round dot eyes. */
export function TechUserBlockIcon(props: AvatarProps) {
  const { uid, svgProps } = useAvatarFrame("block", props);
  return (
    <svg {...svgProps}>
      <GummyBot
        uid={uid}
        ramp={RAMP.block}
        shape={(fill) => (
          <rect x="13" y="13" width="38" height="36" rx="12" fill={fill} transform="rotate(-7 32 31)" />
        )}
        eyes={[
          { cx: 27, cy: 32, w: 7, h: 7 },
          { cx: 37.5, cy: 31, w: 7, h: 7 },
        ]}
        mouthAt={{ x: 32.5, y: 39.5 }}
        floor={50.5}
      />
    </svg>
  );
}

/** 六角 — a mint rounded hexagon, eyes set "\ /". */
export function TechUserHexIcon(props: AvatarProps) {
  const { uid, svgProps } = useAvatarFrame("hex", props);
  return (
    <svg {...svgProps}>
      <GummyBot
        uid={uid}
        ramp={RAMP.hex}
        shape={(fill) => <path d={HEX_PATH} fill={fill} />}
        eyes={[
          { cx: 27, cy: 30.5, w: 4.4, h: 9.6, rotate: -26 },
          { cx: 37.5, cy: 30.5, w: 4.4, h: 9.6, rotate: 26 },
        ]}
        mouthAt={{ x: 32.3, y: 39 }}
        floor={53}
      />
    </svg>
  );
}
