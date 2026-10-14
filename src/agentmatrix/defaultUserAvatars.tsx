/**
 * The reader's avatars: four fixed defaults, the same in every style, plus
 * whatever picture the reader uploads in their place.
 *
 * Every style used to draw its own four — washes in 水墨风, animals in 手绘风,
 * gummy bots in 科技风 — which made the reader's side a second mascot slot.
 * Those moved to the agent's gallery (`STYLE_AVATAR_OPTIONS`), and the reader
 * gets a person: a bare head, no shoulders and no backing disc, the way the
 * agent's faces stand on the page.
 *
 * Lit as a modelled object rather than shaded flat, so it sits with the
 * moulded robot heads and gummy bots opposite it. The skin's radial ramp only
 * sets the base; the volume comes from soft-edged layers clipped to the face —
 * the jaw and far side turning away, a forehead and cheekbone catching the
 * light, a rim down the lit edge, and the hairline's shadow on the skin. Eyes
 * are one glossy dark shape with two glints rather than white, iris and lash:
 * at 32px the realistic eye mudded into a smudge. (A flat pass and a
 * two-gradient pass were both rejected as stiff, 2026-10-12.)
 *
 *   - 晴 `default-sky` — short, the fringe swept to one side in locks
 *   - 禾 `default-sage` — a bob with a fringe
 *   - 杏 `default-apricot` — pulled back into a high ponytail
 *   - 墨 `default-ink` — curls and round glasses
 *
 * The ids predate the drawings and are kept so nothing that names them moves.
 * Fixed palettes rather than theme tokens, like the other character avatars: a
 * face that changes colour with the accent is a different person.
 *
 * Built as markup rather than JSX: a head is ~60 elements, most of them
 * parameterised the same way, and every gradient, clip and blur needs the
 * instance's id. `custom-avatar-face` is on the root so the slot rules that
 * clear the `.msg-avatar` chrome for drawn faces apply here unchanged. The
 * motion is in app.css ("Default reader avatars"): a slow float and a blink;
 * the head turns toward the pointer; under it the eyes close into a smile and
 * the head tilts.
 *
 * The turn reuses 科技风's `techUserRig` — one pointer listener and one frame
 * loop for every avatar on the page, springs for the follow, a wander when the
 * pointer goes quiet, nothing at all under reduced motion. It only writes pose
 * properties (`--tu-hx`, `--tu-rot`, `--tu-ex`…); the stylesheet reads them as
 * parallax — features move further than the face, the fringe less, the ears
 * the other way — which is what makes a flat drawing read as turning.
 */

import { useEffect, useId, useMemo, useRef, type CSSProperties } from "react";

import { attachOperatorRig } from "./techUserRig";

type AvatarProps = { size?: number | string; className?: string } & Record<string, unknown>;

type Kind = "sky" | "sage" | "apricot" | "ink";

type Palette = {
  skin: string;
  light: string;
  shade: string;
  deep: string;
  blush: string;
  lip: string;
  hair: string;
  hairLight: string;
  hairDeep: string;
  iris: string;
  /** The one coloured thing on each: a hair tie, a frame. */
  accent: string;
};

type Hair = {
  /** Painted behind the face: a bob's sides, a ponytail. */
  back?: string;
  /** Over the face: the cap of the hair. */
  front?: string;
  /** Curls instead of a cap, as `[cx, cy, r]`. */
  curls?: [number, number, number][];
  /** A lock standing up off the crown, painted under the cap. */
  tuft?: string;
  /** Shading and sheen for `back`, where the generic pass does not fit. */
  backShade?: string;
  backSheen?: string;
  /** The sheen, as a stroke. */
  sheen: string;
  strands?: string[];
  /** The hairline's shadow, cast on the forehead. */
  ao?: string;
  tie?: [number, number];
  glasses?: boolean;
};

const VIEWBOX = "6 6 88 88";

const PALETTE: Record<Kind, Palette> = {
  sky:     { skin: "#F4CFB4", light: "#FDE9DA", shade: "#D99D7A", deep: "#B9765A", blush: "#F08C7C", lip: "#C05A47",
             hair: "#2E2522", hairLight: "#5A4740", hairDeep: "#17110F", iris: "#5B3A26", accent: "#5B8DEF" },
  sage:    { skin: "#F0C29F", light: "#FCE2CC", shade: "#D59772", deep: "#B26E4F", blush: "#EE8670", lip: "#BF5444",
             hair: "#7A4A30", hairLight: "#B07A55", hairDeep: "#4A2A1A", iris: "#6B4128", accent: "#E8826B" },
  apricot: { skin: "#F6D2B8", light: "#FFEDE0", shade: "#DDA383", deep: "#BC7D60", blush: "#F38E7C", lip: "#C45B4A",
             hair: "#33282A", hairLight: "#655157", hairDeep: "#1A1415", iris: "#4E3226", accent: "#F2B544" },
  ink:     { skin: "#C78A64", light: "#E6B693", shade: "#A46A47", deep: "#7F4C30", blush: "#D6705E", lip: "#9E4636",
             hair: "#231F29", hairLight: "#4F4859", hairDeep: "#100E13", iris: "#2E1D14", accent: "#2F2B45" },
};

/* The head every variant shares: a round crown, full cheeks, a small chin. */
const FACE = "M50 23.5C67.6 23.5 78.6 36 78.6 51.6c0 7.6-2.4 14-7 18.8C66 76 58.8 80 50 80s-16-4-21.6-9.6c-4.6-4.8-7-11.2-7-18.8C21.4 36 32.4 23.5 50 23.5Z";

const HAIR: Record<Kind, Hair> = {
  sky: {
    front: "M21.2 50.5C18.6 34 28 17.6 47.6 15.4 64 13.6 78.4 22 79.6 38c.4 4 0 8-.8 11.6-1.2-5.2-3.6-9-7.2-11.2Q69.6 41.4 66.8 43q-.2-5.4-5.4-8-3 4.6-8.2 6.2.8-5.8-5.6-7.4-3.8 3.8-10 5.8 1.8-4.8-4-4.8c-6.2.6-10.8 7.2-12.4 15.7Z",
    tuft: "M50.6 16.2c2.6-4.4 8.6-6.2 13.4-4.2-3.6.4-6.6 2.2-8.2 5Z",
    sheen: "M31.6 25.4c6-5.6 15.2-7.8 24.2-6.4M63 19.6c5 1.6 9.4 5 12 9.6",
    strands: ["M37.6 39.6C40 33 44 28 49 24", "M53.2 41.2C55.6 34 58.6 29 62.6 25", "M66.8 43C68.6 37 69 31 67 26"],
  },
  sage: {
    back: "M15.4 57.4C13.6 31.4 27.6 14.6 50 14.6s36.4 16.8 34.6 42.8l1.2 21c-5 3.6-12 3.4-15.4-.2L68.8 60H31.2l-1.6 18.2c-3.4 3.6-10.4 3.8-15.4.2Z",
    front: "M21 47.2C21.8 28.6 33.6 18.6 50 18.6s28.2 10 29 28.6c-9.2 1-18.4-2-24-8.4-2.6 5.2-8.8 8.2-15.6 8.2-6.6 0-11.8-.2-18.4.2Z",
    sheen: "M28.4 26.6c5.6-5 13.4-7.4 21.4-7",
    ao: "M21 47.2c6.6-.4 11.8-.2 18.4-.2 6.8 0 13-3 15.6-8.2 5.6 6.4 14.8 9.4 24 8.4l.2 4.2c-9.4.8-18.6-1.8-24.4-7.6-3 4.4-8.8 7.4-15.4 7.4-6.6 0-11.8 0-18.4.4Z",
  },
  apricot: {
    back: "M19.6 54C17.6 32.6 31 17 50 17c8.4 0 15.6 3 21 8.2 2.8-6.2 9-9.8 15-7.2 7.6 3.4 9.8 15.6 6.2 27.6-2 6.8-6 13.4-11 18.2 2-7.6 2.4-15.4.4-22-.6 2.6-1.4 5-2.4 7.2 1.8 9.6-2 18.4-9 23.8l-50-21Z",
    backShade: "M80.6 64.8c2-7.6 2.4-15.4.4-22-1.4-4.8-4-8.6-7.8-11.6l-1.6 6c4.2 7.6 4 17.8-.2 25.8Z",
    backSheen: "M76 21.4c6.4-2.6 12.6 2 14 9.6",
    front: "M21.4 52C19.4 33 31 18.4 50 18.4S80.6 33 78.6 52c-2-9.2-7.6-16-15.6-19.6-5-2.2-9.6-1.8-13 .8-3.4-2.6-8-3-13-.8-8 3.6-13.6 10.4-15.6 19.6Z",
    sheen: "M29.6 30.4c4.8-6 11.8-9.6 19.6-10.2M56 20.6c6.4.8 12 4 15.6 8.6",
    strands: ["M50 33.2c-.4-5 .6-9.6 3-13.6", "M39 32.6c2.6-5 6.4-9 11-11.2", "M61.4 32.4c-1.8-4.8-5-8.6-9-10.8"],
    tie: [71.4, 24.6],
  },
  ink: {
    curls: [
      [22.4, 46.6, 7.2], [25, 35.4, 8.4], [33.4, 26.4, 9.2], [44.6, 20.8, 9.6], [56.4, 20.6, 9.6],
      [67.4, 25.6, 9.2], [75.6, 34.4, 8.4], [78.2, 46, 7.2], [50.4, 30.2, 8.6], [38.6, 33.6, 7.4], [62.4, 33.6, 7.4],
    ],
    sheen: "",
    ao: "M24 50c2-10 9-17 18-18.6 5.4 2.4 11.2 2.4 16.6 0C67.6 33 74 40 76 50c-6-5.4-15.4-8.6-26-8.6S30 44.6 24 50Z",
    glasses: true,
  },
};

function headMarkup(kind: Kind, uid: string): string {
  const p = PALETTE[kind];
  const h = HAIR[kind];
  const id = (n: string) => `${uid}-${n}`;
  const url = (n: string) => `url(#${id(n)})`;
  const blur = (n: string, d: number) => `<filter id="${id(n)}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${d}"/></filter>`;

  let defs = `
    <radialGradient id="${id("skin")}" cx="40%" cy="34%" r="74%">
      <stop offset="0" stop-color="${p.light}"/><stop offset=".48" stop-color="${p.skin}"/><stop offset=".86" stop-color="${p.shade}"/><stop offset="1" stop-color="${p.deep}"/>
    </radialGradient>
    <linearGradient id="${id("hair")}" x1=".3" y1="0" x2=".7" y2="1">
      <stop offset="0" stop-color="${p.hairLight}"/><stop offset=".45" stop-color="${p.hair}"/><stop offset="1" stop-color="${p.hairDeep}"/>
    </linearGradient>
    <radialGradient id="${id("curl")}" cx="36%" cy="30%" r="72%">
      <stop offset="0" stop-color="${p.hairLight}"/><stop offset=".55" stop-color="${p.hair}"/><stop offset="1" stop-color="${p.hairDeep}"/>
    </radialGradient>
    <radialGradient id="${id("tie")}" cx="40%" cy="30%" r="80%">
      <stop offset="0" stop-color="${mix(p.accent, "#ffffff", .35)}"/><stop offset=".6" stop-color="${p.accent}"/><stop offset="1" stop-color="${mix(p.accent, "#000000", .3)}"/>
    </radialGradient>
    <radialGradient id="${id("ear")}" cx="60%" cy="45%" r="70%">
      <stop offset="0" stop-color="${p.skin}"/><stop offset=".7" stop-color="${p.shade}"/><stop offset="1" stop-color="${p.deep}"/>
    </radialGradient>
    <radialGradient id="${id("iris")}" cx="50%" cy="66%" r="66%">
      <stop offset="0" stop-color="${mix(p.iris, "#ffffff", .18)}"/><stop offset=".55" stop-color="${p.iris}"/><stop offset="1" stop-color="${mix(p.iris, "#000000", .6)}"/>
    </radialGradient>
    <linearGradient id="${id("white")}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#E9E3E0"/><stop offset=".45" stop-color="#FFFFFF"/>
    </linearGradient>
    <radialGradient id="${id("floor")}" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#1B2140" stop-opacity=".26"/><stop offset="1" stop-color="#1B2140" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="${id("face")}"><path d="${FACE}"/></clipPath>
    ${blur("b1", 1)}${blur("b2", 2)}${blur("b4", 4)}${blur("b6", 6)}`;
  if (h.front) defs += `<clipPath id="${id("hairclip")}"><path d="${h.front}"/></clipPath>`;
  if (h.back) defs += `<clipPath id="${id("backclip")}"><path d="${h.back}"/></clipPath>`;

  /* Back hair and ears, behind the face. */
  let back = "";
  if (h.back) {
    back += `<path d="${h.back}" fill="${url("hair")}"/>`;
    back += `<g clip-path="${url("backclip")}">` + (h.backShade
      ? `<path d="${h.backShade}" fill="${p.hairDeep}" opacity=".6" filter="${url("b2")}"/>`
      : `<ellipse cx="50" cy="66" rx="30" ry="10" fill="${p.hairDeep}" opacity=".55" filter="${url("b4")}"/>` +
        `<path d="M20 30c-3 10-3 24-1 40" stroke="${p.hairLight}" stroke-width="3" fill="none" opacity=".5" filter="${url("b2")}"/>`) +
      (h.backSheen ? `<path d="${h.backSheen}" stroke="#fff" stroke-width="3.6" fill="none" opacity=".3" stroke-linecap="round" filter="${url("b2")}"/>` : "") +
      `</g>`;
  }
  const ear = (cx: number, flip: number) => `<g><ellipse cx="${cx}" cy="56" rx="5.2" ry="7" fill="${url("ear")}"/>` +
    `<path d="M${cx + flip * 1.4} 51.6c${-flip * 2.2} 1.4 ${-flip * 2.6} 5.6 ${-flip * .4} 8.6" stroke="${p.deep}" stroke-width="1.3" fill="none" opacity=".45" stroke-linecap="round"/></g>`;
  back += `<g class="du-ears">${ear(21.8, 1) + ear(78.2, -1)}</g>`;

  /* The face and its light. */
  let face = `<path d="${FACE}" fill="${url("skin")}"/>`;
  face += `<g clip-path="${url("face")}">` +
    /* jaw and the far side turn away from the light */
    `<ellipse cx="58" cy="84" rx="30" ry="11" fill="${p.deep}" opacity=".42" filter="${url("b6")}"/>` +
    `<ellipse cx="84" cy="54" rx="10" ry="28" fill="${p.deep}" opacity=".32" filter="${url("b6")}"/>` +
    /* forehead and cheekbone catch it */
    `<ellipse cx="42" cy="38" rx="13" ry="7" fill="#fff" opacity=".42" filter="${url("b4")}"/>` +
    `<ellipse cx="33.6" cy="60" rx="4.6" ry="2.8" fill="#fff" opacity=".32" filter="${url("b1")}"/>` +
    `<ellipse cx="66.4" cy="60.6" rx="3.6" ry="2.2" fill="#fff" opacity=".16" filter="${url("b1")}"/>` +
    /* rim light down the lit edge */
    `<path d="M24.4 44c-2 8-1.4 16 2.6 22.6" stroke="#fff" stroke-width="2.2" fill="none" opacity=".55" filter="${url("b1")}"/>` +
    /* the hairline's shadow on the skin */
    ((h.ao ?? h.front) ? `<path d="${h.ao ?? h.front}" fill="${p.deep}" opacity=".5" transform="translate(0 1.8)" filter="${url("b2")}"/>` : "") +
    `</g>`;

  /* Cheeks: warm, soft-edged. */
  /* The cheeks ride with the features but stay on the face: the clip is on a
     group that does not move, so the turn cannot carry them past the edge. */
  face += `<g clip-path="${url("face")}"><g class="du-features">` +
          `<g class="du-blush" fill="${p.blush}" filter="${url("b2")}"><ellipse cx="31.6" cy="65" rx="6" ry="3.8" opacity=".55"/><ellipse cx="68.4" cy="65" rx="6" ry="3.8" opacity=".5"/></g>` +
          `</g></g>`;
  face += `<g class="du-features">`;

  /* Brows. */
  face += `<g fill="none" stroke="${p.hairDeep}" stroke-width="2.3" stroke-linecap="round" opacity=".82">` +
    `<path d="M33.4 45.6c2.4-2.2 6-2.6 9-1.2"/><path d="M57.6 44.4c3-1.4 6.6-1 9 1.2"/></g>`;

  /* Eyes. */
  const eye = (cx: number) => `
    <g>
      <ellipse cx="${cx}" cy="55.6" rx="4.5" ry="5.4" fill="${url("iris")}"/>
      <ellipse cx="${cx + .3}" cy="56.4" rx="2.3" ry="2.7" fill="#120B08" opacity=".75"/>
      <ellipse cx="${cx + 1.5}" cy="53.6" rx="1.6" ry="1.75" fill="#fff"/>
      <circle cx="${cx - 1.4}" cy="58.4" r=".75" fill="#fff" opacity=".8"/>
    </g>`;
  face += `<g class="du-gaze"><g class="du-eyes">${eye(38.6)}${eye(61.4)}</g>` +
    `<g class="du-eyes-happy" fill="none" stroke="#2A1A14" stroke-width="2.2" stroke-linecap="round"><path d="M33.6 56.6c1.8-4 8.2-4 10 0"/><path d="M56.4 56.6c1.8-4 8.2-4 10 0"/></g></g>`;

  /* Nose: a shadow under it and a glint on top, no outline. */
  face += `<ellipse cx="50.6" cy="64.6" rx="3.2" ry="1.8" fill="${p.deep}" opacity=".45" filter="${url("b1")}"/>` +
          `<ellipse cx="49.4" cy="62" rx="1.4" ry="1" fill="#fff" opacity=".55" filter="${url("b1")}"/>`;

  /* Mouth. */
  face += `<g class="du-mouth"><path d="M44.4 69.4c3.4 3.2 7.8 3.2 11.2 0" fill="none" stroke="${p.lip}" stroke-width="2.3" stroke-linecap="round"/>` +
          `<ellipse cx="50" cy="73.4" rx="2.6" ry=".9" fill="#fff" opacity=".3" filter="${url("b1")}"/></g>`;
  face += `<g class="du-mouth-happy"><path d="M43.2 68.6c2.6 7 11 7 13.6 0-4.4 1.4-9.2 1.4-13.6 0Z" fill="#7E2A22"/>` +
          `<path d="M45.4 72.4c2.6 1.8 6.6 1.8 9.2 0-1.4-1.6-7.8-1.6-9.2 0Z" fill="#E77C78"/>` +
          `<path d="M44 68.8c3.8 1 8.2 1 12 0l-.6 1.4c-3.6.8-7.2.8-10.8 0Z" fill="#fff" opacity=".9"/></g>`;
  face += `</g>`;

  /* Front hair. */
  let hair = "";
  if (h.curls) {
    for (const [cx, cy, r] of h.curls) {
      hair += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${url("curl")}"/>` +
              `<path d="M${cx - r * .55} ${cy - r * .28}a${r * .62} ${r * .62} 0 0 1 ${r * .7} ${-r * .44}" stroke="#fff" stroke-opacity=".34" stroke-width="${(r * .26).toFixed(2)}" fill="none" stroke-linecap="round" filter="${url("b1")}"/>`;
    }
  } else {
    if (h.tuft) hair += `<path d="${h.tuft}" fill="${url("hair")}"/>`;
    hair += `<path d="${h.front}" fill="${url("hair")}"/>`;
    hair += `<g clip-path="${url("hairclip")}">` +
      `<ellipse cx="66" cy="46" rx="20" ry="10" fill="${p.hairDeep}" opacity=".55" filter="${url("b4")}"/>` +
      (h.strands ?? []).map((d) => `<path d="${d}" stroke="${p.hairDeep}" stroke-width="2" fill="none" opacity=".5" stroke-linecap="round" filter="${url("b1")}"/>`).join("") +
      `<path d="${h.sheen}" stroke="#fff" stroke-width="4.4" fill="none" opacity=".34" stroke-linecap="round" filter="${url("b2")}"/>` +
      `<path d="${h.sheen}" stroke="#fff" stroke-width="2" fill="none" opacity=".3" stroke-linecap="round" filter="${url("b1")}"/>` +
      `</g>`;
  }
  if (h.tie) {
    const [x, y] = h.tie;
    hair += `<g transform="rotate(-38 ${x} ${y})">` +
            `<ellipse cx="${x}" cy="${y + .6}" rx="6.4" ry="3.4" fill="#000" opacity=".22" filter="${url("b1")}"/>` +
            `<ellipse cx="${x}" cy="${y}" rx="6" ry="3.6" fill="${url("tie")}"/>` +
            `<path d="M${x - 3.6} ${y - 1.4}c2.2-1.4 5-1.4 7.2 0" stroke="#fff" stroke-width="1.2" fill="none" opacity=".6" stroke-linecap="round"/>` +
            `</g>`;
  }

  /* Glasses: a frame with some thickness, and a glare on each lens. */
  let glasses = "";
  if (h.glasses) {
    const lens = (cx: number) => `<circle cx="${cx}" cy="55.6" r="8.2" fill="#fff" opacity=".1"/>` +
      `<path d="M${cx - 5.4} ${52.4}l7.4 -4.6" stroke="#fff" stroke-width="2.6" opacity=".38" stroke-linecap="round"/>`;
    glasses = `<g class="du-features">` + lens(38.6) + lens(61.4) +
      `<g fill="none" stroke="${p.accent}" stroke-width="2.4"><circle cx="38.6" cy="55.6" r="8.2"/><circle cx="61.4" cy="55.6" r="8.2"/><path d="M46.6 54.4c2.2-1.6 4.6-1.6 6.8 0"/></g>` +
      `<g fill="none" stroke="#fff" stroke-width=".8" opacity=".45"><path d="M31.6 52.6c1-3 3.6-5 6.6-5.4"/><path d="M54.4 52.6c1-3 3.6-5 6.6-5.4"/></g></g>`;
  }

  return `<defs>${defs}</defs>` +
    `<ellipse cx="50" cy="90.6" rx="21" ry="3.4" fill="${url("floor")}"/>` +
    `<g class="du-float"><g class="du-head"><g class="du-turn">${back}${face}<g class="du-hair">${hair}</g>${glasses}</g></g></g>`;
}

function mix(a: string, b: string, t: number): string {
  const pa = (a.match(/\w\w/g) ?? []).map((x) => parseInt(x, 16));
  const pb = (b.match(/\w\w/g) ?? []).map((x) => parseInt(x, 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

function seedDelay(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) % 9973;
  return `${-((hash % 6000) / 1000).toFixed(2)}s`;
}

function Head({ kind, size = 24, className, rest }: { kind: Kind; size?: number | string; className?: string; rest: Record<string, unknown> }) {
  const raw = useId();
  const uid = `du${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const markup = useMemo(() => ({ __html: headMarkup(kind, uid) }), [kind, uid]);
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => (ref.current ? attachOperatorRig(ref.current) : undefined), []);
  const box = typeof size === "number" ? size : Number.parseInt(String(size), 10) || 24;
  return (
    <svg
      ref={ref}
      className={["custom-avatar-face", "default-user-face", `default-user-${kind}`, className].filter(Boolean).join(" ")}
      width={box}
      height={box}
      viewBox={VIEWBOX}
      role="img"
      aria-hidden={(rest["aria-hidden"] as boolean | undefined) ?? true}
      focusable="false"
      data-icon-slot={rest["data-icon-slot"] as string | undefined}
      style={{ "--du-delay": seedDelay(raw) } as CSSProperties}
      dangerouslySetInnerHTML={markup}
    />
  );
}

/** 晴 — short, side-parted. */
export function DefaultUserSkyIcon({ size, className, ...rest }: AvatarProps) {
  return <Head kind="sky" size={size} className={className} rest={rest} />;
}

/** 禾 — a bob with a fringe. */
export function DefaultUserSageIcon({ size, className, ...rest }: AvatarProps) {
  return <Head kind="sage" size={size} className={className} rest={rest} />;
}

/** 杏 — a high ponytail. */
export function DefaultUserApricotIcon({ size, className, ...rest }: AvatarProps) {
  return <Head kind="apricot" size={size} className={className} rest={rest} />;
}

/** 墨 — curls and round glasses. */
export function DefaultUserInkIcon({ size, className, ...rest }: AvatarProps) {
  return <Head kind="ink" size={size} className={className} rest={rest} />;
}

/**
 * The reader's own picture, in the same circle the defaults are drawn in.
 *
 * An `<img>` rather than an SVG `<image>`, so the browser does the cover crop
 * and the decode. `custom-avatar-face` for the same reason as above.
 */
export function UploadedAvatarFace({
  src,
  size = 24,
  className,
  ...rest
}: { src: string } & AvatarProps) {
  const box = typeof size === "number" ? size : Number.parseInt(String(size), 10) || 24;
  return (
    <img
      className={["custom-avatar-face", "uploaded-avatar-face", className].filter(Boolean).join(" ")}
      src={src}
      width={box}
      height={box}
      alt=""
      draggable={false}
      aria-hidden={(rest["aria-hidden"] as boolean | undefined) ?? true}
      data-icon-slot={rest["data-icon-slot"] as string | undefined}
    />
  );
}

/** The option id the uploaded picture is chosen by. Not in `ICON_OPTIONS`: it has no component of its own. */
export const UPLOADED_AVATAR_ID = "user-upload";

/**
 * A picked file, as a small square data URL.
 *
 * Centre-cropped and drawn at 160px, which is 2x the largest slot an avatar
 * gets with room to spare — a phone photo straight into `localStorage` would be
 * several megabytes and over the quota.
 */
export function readAvatarFile(file: File, edge = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = edge;
      canvas.height = edge;
      const context = canvas.getContext("2d");
      if (!context || side === 0) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read image"));
        return;
      }
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        (image.naturalWidth - side) / 2,
        (image.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        edge,
        edge,
      );
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/webp", 0.86));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    image.src = url;
  });
}
