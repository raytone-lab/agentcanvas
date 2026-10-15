#!/usr/bin/env python3
"""Compose the README tour: raw editor frames → the editor on a paper stage, with captions.

    python3 scripts/compose-editor-tour.py <frames-dir> <out-dir> <duration-s>

Called by scripts/capture-editor-tour.mjs; not usually run by hand. Reads the timestamped
frames that script recorded (stamps.json) and writes a constant 30 fps sequence
c-00000.jpg … for ffmpeg.

The stage is the landing page's own material — warm paper, the editor as a window with
rounded corners and a soft shadow — so the README's first image and the site agree. Each
beat of the tour is named by a caption under the window that crossfades in and out; the
captions are the only text added, and each says what the viewer is watching.

Needs: pip install pillow
"""

from __future__ import annotations

import json
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1200
WIN = (160, 56, 1600, 1000)  # x, y, w, h of the editor window: the frame, unscaled
RADIUS = 22
FPS = 30
FADE = 0.35

PAPER = (241, 237, 229)
INK = (18, 18, 20)
INK_2 = (110, 104, 96)
SIGNAL = (255, 106, 0)

# (start, end, step, caption) — seconds on the tour's clock (capture-editor-tour.mjs).
CAPTIONS = [
    (0.0, 6.6, "Compose the layout, one piece at a time"),
    (6.6, 9.0, "Add modules — thinking, writing, tool calls"),
    (9.0, 16.4, "Restyle every component in one click"),
    (16.4, 21.9, "Replay a real event stream through it"),
    (21.9, 99.0, "Export a React project that runs as-is"),
]

FONT = "/System/Library/Fonts/SFNS.ttf"


def font(size: int, weight: str) -> ImageFont.FreeTypeFont:
    face = ImageFont.truetype(FONT, size)
    try:
        face.set_variation_by_name(weight)
    except Exception:
        pass
    return face


def stage() -> Image.Image:
    """Paper, lit a little from the top, with the window's shadow already on it."""
    bg = Image.new("RGB", (W, H), PAPER)
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse((W * 0.1, -H * 0.55, W * 0.9, H * 0.55), fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    bg = Image.composite(Image.new("RGB", (W, H), (248, 245, 239)), bg, glow)
    x, y, w, h = WIN
    shadow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(shadow).rounded_rectangle((x + 30, y + 40, x + w - 30, y + h + 18), RADIUS, fill=120)
    shadow = shadow.filter(ImageFilter.GaussianBlur(38))
    bg = Image.composite(Image.new("RGB", (W, H), (120, 100, 75)), bg, shadow.point(lambda v: v * 0.55))
    return bg


def window_mask() -> Image.Image:
    _, _, w, h = WIN
    scale = 3
    m = Image.new("L", (w * scale, h * scale), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w * scale - 1, h * scale - 1), RADIUS * scale, fill=255)
    return m.resize((w, h), Image.LANCZOS)


def caption_layers() -> list[Image.Image]:
    """One RGBA strip per caption: step marker + text, centred under the window."""
    big = font(30, "Semibold")
    small = font(20, "Semibold")
    strip_h = H - (WIN[1] + WIN[3])
    layers = []
    for i, (_, _, text) in enumerate(CAPTIONS):
        layer = Image.new("RGBA", (W, strip_h), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        step = f"{i + 1}/{len(CAPTIONS)}"
        sw = d.textlength(step, font=small)
        tw = d.textlength(text, font=big)
        gap = 22
        total = sw + gap + tw
        x0 = (W - total) / 2
        cy = strip_h / 2 + 4
        d.text((x0, cy), step, font=small, fill=SIGNAL + (255,), anchor="lm")
        d.text((x0 + sw + gap, cy), text, font=big, fill=INK + (255,), anchor="lm")
        layers.append(layer)
    return layers


def alpha_for(t: float, start: float, end: float) -> float:
    if t < start or t > end:
        return 0.0
    a = min(1.0, (t - start) / FADE) if start > 0 else 1.0
    b = min(1.0, (end - t) / FADE)
    return max(0.0, min(a, b))


_BG = _MASK = _CAPS = None


def _init():
    global _BG, _MASK, _CAPS
    _BG, _MASK, _CAPS = stage(), window_mask(), caption_layers()


def _render(job):
    src, t, out = job
    img = _BG.copy()
    x, y, w, h = WIN
    frame = Image.open(src).convert("RGB")
    if frame.size != (w, h):
        frame = frame.resize((w, h), Image.LANCZOS)
    img.paste(frame, (x, y), _MASK)
    # A hairline round the window, so a light style's edge does not dissolve into paper.
    edge = Image.new("RGBA", (w + 2, h + 2), (0, 0, 0, 0))
    ImageDraw.Draw(edge).rounded_rectangle((0, 0, w + 1, h + 1), RADIUS + 1, outline=(18, 18, 20, 30), width=1)
    img.paste(edge, (x - 1, y - 1), edge)
    strip_y = y + h
    for (start, end, _), layer in zip(CAPTIONS, _CAPS):
        a = alpha_for(t, start, end)
        if a <= 0:
            continue
        lifted = layer.copy()
        lifted.putalpha(lifted.getchannel("A").point(lambda v: int(v * a)))
        # Rise 10px as it fades in.
        dy = int((1 - a) * 10) if t - start < FADE else 0
        img.paste(lifted, (0, strip_y + dy), lifted)
    img.save(out, quality=93, subsampling=0)


def main() -> None:
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    frames = Path(sys.argv[1])
    out = Path(sys.argv[2])
    duration = float(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    stamps = json.loads((frames / "stamps.json").read_text())
    jobs = []
    j = 0
    for k in range(int(duration * FPS)):
        t = k / FPS
        while j + 1 < len(stamps) and stamps[j + 1]["t"] <= t:
            j += 1
        # Before the first screencast frame, use the first one.
        jobs.append((str(frames / stamps[j]["name"]), t, str(out / f"c-{k:05d}.jpg")))
    with ProcessPoolExecutor(initializer=_init) as pool:
        list(pool.map(_render, jobs, chunksize=8))
    print(f"  composed {len(jobs)} frames")


if __name__ == "__main__":
    main()
