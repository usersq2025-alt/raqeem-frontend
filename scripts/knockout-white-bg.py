"""Knock out a near-white studio backdrop from a PNG/JPEG.

Generated illustrations for Raqeem screens must be saved as PNG with a real
alpha channel so they sit on the UI, not as a white rectangle.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


def is_backdrop(r: int, g: int, b: int) -> bool:
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    spread = max(r, g, b) - min(r, g, b)
    return luma >= 228 and spread <= 32


def knockout(src: Path, dest: Path) -> None:
    image = Image.open(src).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    assert pixels is not None

    seen = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def index(x: int, y: int) -> int:
        return y * width + x

    def try_push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= width or y >= height:
            return
        i = index(x, y)
        if seen[i]:
            return
        r, g, b, _a = pixels[x, y]
        if not is_backdrop(r, g, b):
            return
        seen[i] = 1
        queue.append((x, y))

    for x in range(width):
        try_push(x, 0)
        try_push(x, height - 1)
    for y in range(height):
        try_push(0, y)
        try_push(width - 1, y)

    while queue:
        x, y = queue.popleft()
        try_push(x + 1, y)
        try_push(x - 1, y)
        try_push(x, y + 1)
        try_push(x, y - 1)
        try_push(x + 1, y + 1)
        try_push(x - 1, y - 1)
        try_push(x + 1, y - 1)
        try_push(x - 1, y + 1)

    mask = Image.new("L", (width, height), 255)
    mask_px = mask.load()
    assert mask_px is not None
    for y in range(height):
        row = y * width
        for x in range(width):
            if seen[row + x]:
                mask_px[x, y] = 0

    mask = mask.filter(ImageFilter.GaussianBlur(radius=1.15))
    image.putalpha(mask)
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest, "PNG")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("src")
    parser.add_argument("dest")
    args = parser.parse_args()
    knockout(Path(args.src), Path(args.dest))


if __name__ == "__main__":
    main()
