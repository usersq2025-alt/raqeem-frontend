from pathlib import Path

import numpy as np
from PIL import Image

SHEET = Path(r"C:\Users\vip\.cursor\projects\d-laragon\assets\subject-covers-sheet.png")
OUT_DIR = Path(r"C:\Users\vip\.cursor\projects\d-laragon\assets\subject-covers-split")
NAMES = ["arabic", "english", "french", "math", "religion", "social", "science"]


def label_components(mask: np.ndarray) -> list[tuple[int, int, int, int]]:
    height, width = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    boxes: list[tuple[int, int, int, int]] = []

    def neighbors(x: int, y: int):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height:
                yield nx, ny

    for y in range(height):
        for x in range(width):
            if not mask[y, x] or seen[y, x]:
                continue
            stack = [(x, y)]
            seen[y, x] = True
            min_x = max_x = x
            min_y = max_y = y
            count = 0
            while stack:
                cx, cy = stack.pop()
                count += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)
                for nx, ny in neighbors(cx, cy):
                    if mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((nx, ny))
            if count > 2500:
                boxes.append((min_x, min_y, max_x + 1, max_y + 1))
    return boxes


def main() -> None:
    image = Image.open(SHEET).convert("RGBA")
    small = image.resize((image.width // 4, image.height // 4), Image.Resampling.NEAREST)
    arr = np.asarray(small)
    luma = 0.2126 * arr[:, :, 0] + 0.7152 * arr[:, :, 1] + 0.0722 * arr[:, :, 2]
    spread = arr[:, :, :3].max(axis=2) - arr[:, :, :3].min(axis=2)
    mask = ~((luma >= 228) & (spread <= 32))
    boxes = label_components(mask)
    boxes = [(x0 * 4, y0 * 4, x1 * 4, y1 * 4) for x0, y0, x1, y1 in boxes]
    boxes.sort(key=lambda b: (b[1] // 120, b[0]))
    print("boxes", len(boxes), boxes)
    if len(boxes) != 7:
        raise SystemExit(f"expected 7 books, found {len(boxes)}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pad = 18
    width, height = image.size
    for name, (x0, y0, x1, y1) in zip(NAMES, boxes):
        crop = image.crop(
            (
                max(0, x0 - pad),
                max(0, y0 - pad),
                min(width, x1 + pad),
                min(height, y1 + pad),
            )
        )
        crop.save(OUT_DIR / f"{name}.png", "PNG")
        print(name, crop.size)


if __name__ == "__main__":
    main()
