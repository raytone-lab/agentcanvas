/**
 * The motion rig behind 科技风's operator avatars: gaze that follows the
 * pointer, a head that follows with inertia, real blinks, a press-to-squeeze
 * with a jelly return, and an antenna that lags the head on a second spring.
 *
 * The physics follows the approach of `agent-robot-avatar` (CX ArtLab, MIT) —
 * a critically-ish damped spring for the head's offset and tilt, an eased gaze
 * that wanders when the pointer goes quiet — written for these four SVGs rather
 * than taken from it, so nothing of that package ships in the export.
 *
 * One pointer listener and one animation frame loop for every avatar on the
 * page, however many turns there are. Each avatar writes its pose as custom
 * properties on its own `<svg>` (`--tu-hx`, `--tu-hy`, `--tu-rot`, `--tu-ex`,
 * `--tu-ey`, `--tu-blink`, `--tu-sx`, `--tu-sy`, `--tu-ant`, plus the face's
 * `--tu-mood` 0–1 and `--tu-sq` 0–1), and the
 * stylesheet turns those into transforms — so the parts stay declarative and
 * a reduced-motion reader simply gets the resting pose.
 *
 * Avatars scrolled out of view stop being stepped (IntersectionObserver), and
 * the loop stops entirely when none are visible.
 */

type Spring = { x: number; v: number };

type Rig = {
  el: SVGSVGElement;
  visible: boolean;
  look: { x: number; y: number };
  wander: { x: number; y: number; next: number };
  hx: Spring;
  hy: Spring;
  rot: Spring;
  sx: Spring;
  sy: Spring;
  ant: Spring;
  /** 0 calm → 1 delighted. Rises when the pointer comes close; drifts on its own otherwise. */
  mood: Spring;
  moodTarget: number;
  nextMoodAt: number;
  pressed: boolean;
  blink: { start: number; duration: number; next: number } | null;
  nextBlinkAt: number;
};

const rigs = new Set<Rig>();
const pointer = { x: 0, y: 0, lastMove: -Infinity };
let frame = 0;
let lastTime = 0;
let listening = false;
let observer: IntersectionObserver | null = null;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

function stepSpring(spring: Spring, target: number, stiffness: number, damping: number, dt: number) {
  const acceleration = (target - spring.x) * stiffness - spring.v * damping;
  spring.v += acceleration * dt;
  spring.x += spring.v * dt;
}

function onPointerMove(event: PointerEvent) {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.lastMove = performance.now();
  wake();
}

function onPointerUp() {
  for (const rig of rigs) rig.pressed = false;
}

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function wake() {
  if (frame || rigs.size === 0) return;
  lastTime = performance.now();
  frame = requestAnimationFrame(loop);
}

function loop(now: number) {
  frame = 0;
  const dt = Math.min(now - lastTime, 34) / 1000;
  lastTime = now;
  const pointerFresh = now - pointer.lastMove < 900;
  let anyVisible = false;

  for (const rig of rigs) {
    if (!rig.visible) continue;
    anyVisible = true;
    const box = rig.el.getBoundingClientRect();
    if (box.width === 0) continue;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;

    /* Gaze: toward the pointer within a few hundred pixels, fading with
       distance; otherwise a wander target that moves every second or two. */
    const dx = pointer.x - cx;
    const dy = pointer.y - cy;
    const distance = Math.hypot(dx, dy);
    const influence = pointerFresh ? Math.pow(clamp(1 - distance / 520, 0, 1), 0.6) : 0;
    if (now >= rig.wander.next) {
      rig.wander.x = (Math.random() * 2 - 1) * 0.7;
      rig.wander.y = (Math.random() * 2 - 1) * 0.45;
      rig.wander.next = now + 1150 + Math.random() * 1900;
    }
    const aimX = distance > 0 ? clamp(dx / Math.max(distance, 60), -1, 1) : 0;
    const aimY = distance > 0 ? clamp(dy / Math.max(distance, 60), -1, 1) : 0;
    const targetLookX = lerp(rig.wander.x, aimX, influence);
    const targetLookY = lerp(rig.wander.y, aimY, influence);
    const lookSpeed = influence > 0.05 ? 0.28 : 0.12;
    const k = 1 - Math.pow(1 - lookSpeed, dt * 60);
    rig.look.x = lerp(rig.look.x, targetLookX, k);
    rig.look.y = lerp(rig.look.y, targetLookY, k);

    /* Head: follows the gaze on a spring, so it overshoots a touch and settles. */
    const follow = influence > 0.03;
    stepSpring(rig.hx, follow ? rig.look.x * 2.2 : rig.look.x * 0.6, follow ? 95 : 80, follow ? 16 : 14, dt);
    stepSpring(rig.hy, follow ? rig.look.y * 1.8 : rig.look.y * 0.5, follow ? 95 : 80, follow ? 16 : 14, dt);
    stepSpring(rig.rot, rig.look.x * rig.look.y * 7 + rig.look.x * 2.5, 70, 15, dt);

    /* Antenna: a lighter spring driven by the head's own velocity. */
    stepSpring(rig.ant, clamp(-rig.hx.v * 5 - rig.rot.v * 0.6, -26, 26), 140, 7, dt);

    /* Squeeze: pressed flattens and widens, release springs back past rest. */
    stepSpring(rig.sx, rig.pressed ? 1.09 : 1, 260, 11, dt);
    stepSpring(rig.sy, rig.pressed ? 0.88 : 1, 260, 11, dt);

    /* Mood: the pointer close by cheers them up; left alone they drift between
       calm and the odd smile every few seconds, so a face is never frozen. */
    if (now >= rig.nextMoodAt) {
      rig.moodTarget = Math.random() < 0.35 ? 0.45 + Math.random() * 0.35 : 0;
      rig.nextMoodAt = now + 2400 + Math.random() * 3800;
    }
    /* Proximity, not freshness: a pointer resting beside the face still
       counts as company. Freshness only decides whether the gaze follows it
       or wanders. */
    const proximity = pointer.lastMove > -Infinity ? Math.pow(clamp(1 - distance / 520, 0, 1), 0.6) : 0;
    const near = clamp((proximity - 0.55) / 0.35, 0, 1);
    stepSpring(rig.mood, Math.max(rig.moodTarget, near), 38, 11, dt);
    const squeeze = clamp((1 - rig.sy.x) / 0.1, 0, 1);

    /* Blink: 150–220ms, every 1.9–4.5s. */
    let blink = 1;
    if (rig.blink) {
      const t = clamp((now - rig.blink.start) / rig.blink.duration, 0, 1);
      blink = t < 0.5 ? lerp(1, 0.08, t * 2) : lerp(0.08, 1, (t - 0.5) * 2);
      if (t >= 1) {
        rig.blink = null;
        rig.nextBlinkAt = now + 1900 + Math.random() * 2600;
      }
    } else if (now >= rig.nextBlinkAt) {
      rig.blink = { start: now, duration: 150 + Math.random() * 70, next: 0 };
    }

    const style = rig.el.style;
    style.setProperty("--tu-hx", rig.hx.x.toFixed(3));
    style.setProperty("--tu-hy", rig.hy.x.toFixed(3));
    style.setProperty("--tu-rot", rig.rot.x.toFixed(3));
    style.setProperty("--tu-ex", (rig.look.x * 2.6).toFixed(3));
    style.setProperty("--tu-ey", (rig.look.y * 2).toFixed(3));
    style.setProperty("--tu-blink", blink.toFixed(3));
    style.setProperty("--tu-sx", rig.sx.x.toFixed(4));
    style.setProperty("--tu-sy", rig.sy.x.toFixed(4));
    style.setProperty("--tu-ant", rig.ant.x.toFixed(3));
    style.setProperty("--tu-mood", clamp(rig.mood.x, 0, 1).toFixed(3));
    style.setProperty("--tu-sq", squeeze.toFixed(3));
  }

  if (anyVisible) frame = requestAnimationFrame(loop);
}

function ensureGlobals() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointercancel", onPointerUp, { passive: true });
  observer = typeof IntersectionObserver === "undefined"
    ? null
    : new IntersectionObserver((entries) => {
        for (const entry of entries) {
          for (const rig of rigs) if (rig.el === entry.target) rig.visible = entry.isIntersecting;
        }
        wake();
      });
}

function releaseGlobals() {
  if (!listening || rigs.size > 0) return;
  listening = false;
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onPointerUp);
  observer?.disconnect();
  observer = null;
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}

/** Attach an avatar to the rig. Returns the detach function. */
export function attachOperatorRig(el: SVGSVGElement): () => void {
  if (reducedMotion()) return () => {};
  ensureGlobals();
  const now = performance.now();
  const spring = (x = 0): Spring => ({ x, v: 0 });
  const rig: Rig = {
    el,
    visible: observer === null,
    look: { x: 0, y: 0 },
    wander: { x: 0, y: 0, next: now + Math.random() * 1500 },
    hx: spring(),
    hy: spring(),
    rot: spring(),
    sx: spring(1),
    sy: spring(1),
    ant: spring(),
    mood: spring(),
    moodTarget: 0,
    nextMoodAt: now + 1200 + Math.random() * 2500,
    pressed: false,
    blink: null,
    nextBlinkAt: now + 600 + Math.random() * 3000,
  };
  const onDown = () => {
    rig.pressed = true;
    wake();
  };
  el.addEventListener("pointerdown", onDown);
  rigs.add(rig);
  observer?.observe(el);
  wake();
  return () => {
    el.removeEventListener("pointerdown", onDown);
    observer?.unobserve(el);
    rigs.delete(rig);
    releaseGlobals();
  };
}
