import { useEffect, useRef } from "react";

/**
 * The hero's product mark, drawn as a field of dots that scatter away from the pointer.
 *
 * Why a canvas and not the CSS mask this replaces: the mask built the grid from one tiled
 * `radial-gradient`, which paints a single layer with no addressable dots in it. Repulsion
 * needs every dot to hold its own position, so the grid has to become real geometry. Sampling
 * the mark's own SVG for that geometry keeps one source of truth for the shape — the asset
 * stays the thing designers edit, and nothing here hardcodes the glyph.
 *
 * The glint moved in here too. Running it as a CSS animation over a canvas would mean two
 * clocks over the same pixels, and the band has to know where each dot is anyway to tint it.
 */

/** Distance between dots, in CSS pixels. Tight enough that the glyph reads as itself. */
const DOT_PITCH = 4;
const DOT_RADIUS = 0.85;
/** Alpha in the sampled SVG above which a grid cell counts as part of the mark. */
const COVERAGE_THRESHOLD = 0.42;

/** Pointer influence, in CSS pixels, and how hard a dot is pushed at the very centre. */
const REPEL_RADIUS = 78;
const REPEL_STRENGTH = 26;
/** Spring back to home. Stiffness and damping are per-frame at 60fps, scaled by delta below. */
const SPRING = 0.055;
const DAMPING = 0.86;

const GLINT_CYCLE_MS = 8500;
const GLINT_DELAY_MS = 2600;
/** Share of the cycle the band spends crossing; the rest it is parked off the far edge. */
const GLINT_PASS = 0.28;
/** Half-width of the band as a share of the box's diagonal reach. */
const GLINT_HALF_WIDTH = 0.38;

type Dot = {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

/** Symmetric ease-in-out, matching the CSS the glint used before it moved in here. */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function mixRgba(base: string, fallback: string): string {
  return base.trim() || fallback;
}

export function HeroMark({ src, className }: { src: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const styles = getComputedStyle(canvas);
    // The palette stays authoritative in CSS; `getComputedStyle` resolves the `color-mix()`
    // tokens to concrete rgba, which is what a canvas needs.
    const restColor = mixRgba(styles.getPropertyValue("--lp-mark-fill"), "rgba(41, 39, 34, 0.07)");
    const glintColor = mixRgba(styles.getPropertyValue("--lp-mark-glint"), "rgba(223, 174, 57, 0.6)");

    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastTime = 0;
    let startTime = 0;
    // Pointer position in CSS pixels, or null when the pointer is not over the mark.
    let pointer: { x: number; y: number } | null = null;
    let disposed = false;

    const image = new Image();

    /**
     * Rebuild the dot field for the current box size.
     *
     * The mark is rasterised once at grid resolution rather than at display resolution: one
     * pixel per cell is all the coverage test needs, and it keeps the offscreen buffer at a
     * few thousand pixels instead of a few hundred thousand.
     */
    function sample() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (width === 0 || height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      context!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.floor(width / DOT_PITCH);
      const rows = Math.floor(height / DOT_PITCH);
      if (cols === 0 || rows === 0) return;

      const probe = document.createElement("canvas");
      probe.width = cols;
      probe.height = rows;
      const probeContext = probe.getContext("2d", { willReadFrequently: true });
      if (!probeContext) return;
      probeContext.drawImage(image, 0, 0, cols, rows);

      let pixels: Uint8ClampedArray;
      try {
        pixels = probeContext.getImageData(0, 0, cols, rows).data;
      } catch {
        // A tainted canvas would only happen if the asset stopped being same-origin; leaving
        // the field empty degrades to a blank decorative box rather than throwing.
        return;
      }

      // Centre the grid on any remainder, so the glyph is not pinned to the top-left.
      const offsetX = (width - cols * DOT_PITCH) / 2 + DOT_PITCH / 2;
      const offsetY = (height - rows * DOT_PITCH) / 2 + DOT_PITCH / 2;

      const next: Dot[] = [];
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const alpha = pixels[(row * cols + col) * 4 + 3] / 255;
          if (alpha < COVERAGE_THRESHOLD) continue;
          const x = offsetX + col * DOT_PITCH;
          const y = offsetY + row * DOT_PITCH;
          next.push({ homeX: x, homeY: y, x, y, vx: 0, vy: 0 });
        }
      }
      dots = next;
    }

    /** Where the glint's centre sits along the sweep axis, or null while it is parked. */
    function glintCentre(elapsed: number): number | null {
      if (elapsed < GLINT_DELAY_MS) return null;
      const phase = ((elapsed - GLINT_DELAY_MS) % GLINT_CYCLE_MS) / GLINT_CYCLE_MS;
      if (phase > GLINT_PASS) return null;
      return easeInOut(phase / GLINT_PASS);
    }

    function draw(now: number) {
      if (disposed) return;
      const delta = lastTime === 0 ? 1 : Math.min((now - lastTime) / 16.67, 3);
      lastTime = now;
      if (startTime === 0) startTime = now;

      context!.clearRect(0, 0, width, height);

      const centre = reduceMotion.matches ? null : glintCentre(now - startTime);
      // The band is tilted, so a dot's position along the sweep is a blend of x and y — the
      // same 100deg feel the CSS gradient had, without a second coordinate system.
      const reach = width + height * 0.32;

      for (const dot of dots) {
        if (pointer && !reduceMotion.matches) {
          const dx = dot.x - pointer.x;
          const dy = dot.y - pointer.y;
          const distance = Math.hypot(dx, dy) || 0.0001;
          if (distance < REPEL_RADIUS) {
            // Falls off with the square of the normalised distance: a firm shove close in,
            // almost nothing at the rim, which is what keeps the edge of the effect from
            // showing up as a visible circle.
            const falloff = (1 - distance / REPEL_RADIUS) ** 2;
            const push = (REPEL_STRENGTH * falloff) / distance;
            dot.vx += dx * push * delta * 0.12;
            dot.vy += dy * push * delta * 0.12;
          }
        }

        dot.vx += (dot.homeX - dot.x) * SPRING * delta;
        dot.vy += (dot.homeY - dot.y) * SPRING * delta;
        dot.vx *= DAMPING ** delta;
        dot.vy *= DAMPING ** delta;
        dot.x += dot.vx * delta;
        dot.y += dot.vy * delta;

        // Base dot first, glint over it. The other order paints the rest colour on top of the
        // light and the band disappears.
        context!.fillStyle = restColor;
        context!.beginPath();
        context!.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
        context!.fill();

        if (centre === null) continue;
        // A dot's place along the tilted sweep axis — the same 100deg feel the CSS gradient
        // had, without introducing a second coordinate system. Keyed to `home` rather than the
        // live position so a scattered dot does not also shift the band under it.
        const along = (dot.homeX + dot.homeY * 0.32) / reach;
        const offset = Math.abs(along - centre) / GLINT_HALF_WIDTH;
        if (offset >= 1) continue;
        // Squared falloff, so the band blooms in and out rather than arriving as an edge —
        // the two-stop CSS gradient this replaces, expressed as a curve.
        context!.globalAlpha = (1 - offset) ** 2;
        context!.fillStyle = glintColor;
        context!.beginPath();
        context!.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
        context!.fill();
        context!.globalAlpha = 1;
      }

      frame = requestAnimationFrame(draw);
    }

    function start() {
      cancelAnimationFrame(frame);
      lastTime = 0;
      frame = requestAnimationFrame(draw);
    }

    function drawStill() {
      cancelAnimationFrame(frame);
      context!.clearRect(0, 0, width, height);
      context!.fillStyle = restColor;
      for (const dot of dots) {
        context!.beginPath();
        context!.arc(dot.homeX, dot.homeY, DOT_RADIUS, 0, Math.PI * 2);
        context!.fill();
      }
    }

    function render() {
      if (reduceMotion.matches) drawStill();
      else start();
    }

    image.onload = () => {
      if (disposed) return;
      sample();
      render();
    };
    image.src = src;

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onPointerLeave = () => {
      pointer = null;
    };
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);

    const observer = new ResizeObserver(() => {
      sample();
      if (reduceMotion.matches) drawStill();
    });
    observer.observe(canvas);

    // Off-screen the loop is pure waste; the mark is above the fold but the hero scrolls away.
    const visibility = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible) render();
      else cancelAnimationFrame(frame);
    });
    visibility.observe(canvas);

    const onReduceMotionChange = () => render();
    reduceMotion.addEventListener("change", onReduceMotionChange);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      observer.disconnect();
      visibility.disconnect();
      reduceMotion.removeEventListener("change", onReduceMotionChange);
    };
  }, [src]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
