"""Split the 2x2 science unit-icon sheet, then knock out studio white."""

from __future__ import annotations

import importlib.util
from pathlib import Path

from PIL import Image

ROOT = Path(r"D:\laragon\www\raqeem-frontend")
spec = importlib.util.spec_from_file_location("knockout_white_bg", ROOT / "scripts" / "knockout-white-bg.py")
assert spec and spec.loader
knockout_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(knockout_mod)
knockout = knockout_mod.knockout

SHEET = Path(r"C:\Users\vip\.cursor\projects\d-laragon\assets\science-unit-icons-sheet.png")
TMP = Path(r"C:\Users\vip\.cursor\projects\d-laragon\assets\science-unit-icons-split")
OUT = ROOT / "public" / "images" / "units" / "icons"

NAMES = ["body", "matter", "energy", "earth"]


def main() -> None:
    image = Image.open(SHEET).convert("RGBA")
    width, height = image.size
    cols, rows = 2, 2
    cell_w = width / cols
    cell_h = height / rows
    inset_x = int(cell_w * 0.05)
    inset_y = int(cell_h * 0.05)
    TMP.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)

    for index, name in enumerate(NAMES):
        col = index % cols
        row = index // cols
        box = (
            int(col * cell_w) + inset_x,
            int(row * cell_h) + inset_y,
            int((col + 1) * cell_w) - inset_x,
            int((row + 1) * cell_h) - inset_y,
        )
        crop = image.crop(box)
        raw = TMP / f"{name}.png"
        crop.save(raw, "PNG")
        dest = OUT / f"{name}.png"
        knockout(raw, dest)
        print(name, dest, dest.stat().st_size)


if __name__ == "__main__":
    main()
