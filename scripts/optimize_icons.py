from pathlib import Path

from PIL import Image


ASSETS = Path(__file__).resolve().parent.parent / "assets" / "images"
ICON_NAMES = [
    "icon.png",
    "splash-icon.png",
    "favicon.png",
    "android-icon-foreground.png",
]


def optimize_icon(path: Path) -> None:
    with Image.open(path) as source:
        image = source.convert("RGBA")
        image.thumbnail((512, 512), Image.Resampling.LANCZOS)
        image.save(path, format="PNG", optimize=True, compress_level=9)


for icon_name in ICON_NAMES:
    optimize_icon(ASSETS / icon_name)
