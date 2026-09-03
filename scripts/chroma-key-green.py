"""Remove a near-green studio backdrop from a PNG."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


def chroma_key_green(src: Path, dest: Path, threshold: int = 95) -> None:
    image = Image.open(src).convert("RGBA")
    pixels = image.load()
    assert pixels is not None
    width, height = image.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if g >= 140 and g - r >= 35 and g - b >= 35:
                dist = ((r - 0) ** 2 + (g - 255) ** 2 + (b - 0) ** 2) ** 0.5
                if dist <= threshold or (r < 90 and b < 90 and g > 160):
                    pixels[x, y] = (r, g, b, 0)
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest, "PNG")


if __name__ == "__main__":
    import sys

    chroma_key_green(Path(sys.argv[1]), Path(sys.argv[2]))
