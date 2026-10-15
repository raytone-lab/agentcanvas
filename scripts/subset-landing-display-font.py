#!/usr/bin/env python3
"""Build the landing page's display font: Noto Sans SC Black, subset to its own glyphs.

    python3 scripts/subset-landing-display-font.py /path/to/NotoSansSC-Black.otf

Source: https://github.com/notofonts/noto-cjk/raw/main/Sans/SubsetOTF/SC/NotoSansSC-Black.otf
Needs:  pip install fonttools brotli

Why a subset: the headlines are Chinese and Japanese at 50-140px, and no system font
ships a Black weight for CJK — PingFang stops at Semibold, so the page's loudest type
would be the one thing the design does not control. The full face is 8.9 MB; the page
uses a few hundred distinct characters, so they go into one small woff2 fetched once.

The subset is every character in `src/landing/` (all three languages, body copy
included — any headline may be edited later), plus printable ASCII and the CJK
punctuation and full-width blocks, so a new 「」 or ； never needs a rebuild. A character
outside the subset falls back to the platform font mid-headline, silently; re-run this
script whenever the landing copy gains new characters.

License: SIL Open Font License 1.1, copied to public/fonts/OFL-NotoSansSC.txt.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "fonts" / "landing-display.woff2"
SOURCES = sorted((ROOT / "src" / "landing").rglob("*.ts")) + sorted((ROOT / "src" / "landing").rglob("*.tsx"))

EXTRA = (
    [chr(c) for c in range(0x20, 0x7F)]  # printable ASCII
    + [chr(c) for c in range(0x3000, 0x3040)]  # CJK symbols and punctuation
    + [chr(c) for c in range(0xFF01, 0xFF5F)]  # full-width ASCII forms
    + list("—–…·•’‘“”")
)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    source = Path(sys.argv[1])
    chars = set(EXTRA)
    for path in SOURCES:
        for ch in path.read_text(encoding="utf-8"):
            if ord(ch) > 0x2000:
                chars.add(ch)
    text = "".join(sorted(chars))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            sys.executable,
            "-m",
            "fontTools.subset",
            str(source),
            f"--text={text}",
            "--flavor=woff2",
            "--layout-features=palt,kern,liga",
            "--no-hinting",
            "--desubroutinize",
            f"--output-file={OUT}",
        ],
        check=True,
    )
    print(f"{len(chars)} characters -> {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
