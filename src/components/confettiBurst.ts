/**
 * A small confetti burst from a point on the page — the 模型 panel's tick.
 *
 * Physics on one shared canvas over the whole window, not CSS keyframes.
 * Keyframes can only tween between fixed points, which is why the first
 * version read as sticks flicking out and stopping: real confetti decelerates
 * against the air, falls, and flutters as it turns. Each piece here has a
 * velocity, gravity and drag; ribbons tumble (their apparent width follows the
 * cosine of a spin, which is what makes paper look like it is turning over)
 * and sway as they fall. On the window rather than in the rail, so pieces can
 * leave the panel without being clipped at its edge.
 *
 * The canvas is created on the first burst, shared by any that overlap, and
 * removed when the last piece has gone. Nothing runs between bursts, and
 * nothing at all under reduced motion.
 */

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Spin of the tumble, driving the apparent width. */
  tilt: number;
  tiltSpeed: number;
  /** Rotation in the plane. */
  angle: number;
  spin: number;
  /** Sideways sway while falling. */
  sway: number;
  swaySpeed: number;
  w: number;
  h: number;
  color: string;
  round: boolean;
  life: number;
  maxLife: number;
};

type Ring = { x: number; y: number; t: number; color: string };

const PALETTE = ["#FF6A00", "#FF8A2B", "#FFB547", "#FF6B8B", "#4FB3F6", "#8C7BFF", "#2FCB8F"];

let canvas: HTMLCanvasElement | null = null;
let context: CanvasRenderingContext2D | null = null;
let pieces: Piece[] = [];
let rings: Ring[] = [];
let frame = 0;
let last = 0;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "2147483000",
  });
  document.body.appendChild(canvas);
  context = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
}

function resize() {
  if (!canvas || !context) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function teardown() {
  window.removeEventListener("resize", resize);
  canvas?.remove();
  canvas = null;
  context = null;
}

function step(now: number) {
  frame = 0;
  if (!context || !canvas) return;
  // Time-based, clamped: a dropped frame slows the burst rather than
  // teleporting it.
  const dt = Math.min((now - last) / 16.667, 2.5);
  last = now;
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  /* The ring: a thin accent circle that opens fast and thins out — the
     "pop" the pieces leave from. */
  rings = rings.filter((ring) => {
    ring.t += 0.045 * dt;
    if (ring.t >= 1) return false;
    const ease = 1 - Math.pow(1 - ring.t, 3);
    context!.beginPath();
    context!.arc(ring.x, ring.y, 7 + ease * 13, 0, Math.PI * 2);
    context!.strokeStyle = ring.color;
    context!.globalAlpha = (1 - ring.t) * 0.55;
    context!.lineWidth = 2 * (1 - ring.t) + 0.4;
    context!.stroke();
    return true;
  });

  pieces = pieces.filter((piece) => {
    piece.life += dt;
    if (piece.life >= piece.maxLife) return false;
    // Air drag, then gravity: fast out, an arc at the top, an unhurried fall.
    piece.vx *= Math.pow(0.935, dt);
    piece.vy = piece.vy * Math.pow(0.935, dt) + 0.17 * dt;
    piece.tilt += piece.tiltSpeed * dt;
    piece.angle += piece.spin * dt;
    piece.sway += piece.swaySpeed * dt;
    piece.x += (piece.vx + Math.sin(piece.sway) * 0.35) * dt;
    piece.y += piece.vy * dt;

    const progress = piece.life / piece.maxLife;
    // Full strength on the way up, gone before it has fallen back onto the rows
    // below — the burst is upward, and the fall is only a hint of it.
    const alpha = progress < 0.5 ? 1 : 1 - (progress - 0.5) / 0.5;
    context!.save();
    context!.globalAlpha = Math.max(0, alpha);
    context!.translate(piece.x, piece.y);
    context!.rotate(piece.angle);
    context!.fillStyle = piece.color;
    if (piece.round) {
      context!.beginPath();
      context!.arc(0, 0, piece.w / 2, 0, Math.PI * 2);
      context!.fill();
    } else {
      // The tumble: width follows the cosine of the tilt, so a ribbon thins to
      // an edge and widens again, and the far face is a shade darker.
      const turn = Math.cos(piece.tilt);
      context!.scale(Math.max(Math.abs(turn), 0.08), 1);
      if (turn < 0) context!.globalAlpha *= 0.78;
      context!.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
    }
    context!.restore();
    return true;
  });

  context.globalAlpha = 1;
  if (pieces.length || rings.length) {
    frame = requestAnimationFrame(step);
  } else {
    teardown();
  }
}

export function burstConfetti(x: number, y: number, accent = "#FF6A00") {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  ensureCanvas();

  rings.push({ x, y, t: 0, color: accent });

  /* Small and few: at a 15px check, two dozen 7px pieces were a heap. A
     narrower fan launched harder rises clearly before it slows. */
  const count = 18;
  for (let index = 0; index < count; index += 1) {
    // A fan opening upward, -140° … -40°, denser toward the middle.
    const spread = (Math.random() + Math.random()) / 2;
    const angle = ((-140 + spread * 100) * Math.PI) / 180;
    const speed = 5.6 + Math.random() * 4.4;
    const round = Math.random() < 0.3;
    const size = round ? 1.8 + Math.random() * 1 : 1.9 + Math.random() * 1;
    pieces.push({
      x: x + Math.cos(angle) * 4,
      y: y + Math.sin(angle) * 4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      tilt: Math.random() * Math.PI * 2,
      tiltSpeed: 0.12 + Math.random() * 0.18,
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.22,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.06 + Math.random() * 0.08,
      w: size,
      h: round ? size : size * (2 + Math.random() * 0.9),
      color: index === 0 ? accent : PALETTE[Math.floor(Math.random() * PALETTE.length)]!,
      round,
      life: 0,
      maxLife: 52 + Math.random() * 22,
    });
  }

  if (!frame) {
    last = performance.now();
    frame = requestAnimationFrame(step);
  }
}
