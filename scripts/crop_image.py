"""
Auto-crop transparent padding from a product image, keeping only the
product content with a small margin. This ensures products fill their
card consistently, regardless of the original image canvas size.

Usage:
    python scripts/crop_image.py <image_path> [--margin PERCENT]

    --margin   Percentage of the longest side to add as padding (default: 4)

Overwrites the input file in place.
"""
import sys
from pathlib import Path
from PIL import Image


def crop_product_image(img_path: Path, margin_pct: float = 4.0) -> None:
    img = Image.open(img_path).convert("RGBA")
    original_size = img.size

    # To handle AI background removal which leaves faint ghost pixels (alpha < 10)
    # we extract the alpha channel and threshold it to find the true solid bounding box.
    alpha = img.split()[-1]
    solid_mask = alpha.point(lambda p: 255 if p > 10 else 0)
    bbox = solid_mask.getbbox()
    
    if not bbox:
        print(f"[crop] {img_path.name}: image is fully transparent, skipped.")
        return

    # Crop to content
    cropped = img.crop(bbox)
    cw, ch = cropped.size

    # Add uniform margin based on the longest side
    longest = max(cw, ch)
    margin = int(longest * margin_pct / 100)

    new_w = cw + 2 * margin
    new_h = ch + 2 * margin

    result = Image.new("RGBA", (new_w, new_h), (0, 0, 0, 0))
    result.paste(cropped, (margin, margin))

    result.save(img_path, "PNG", optimize=True)
    ow, oh = original_size
    print(
        f"[crop] {img_path.name}: {ow}x{oh} -> {new_w}x{new_h} "
        f"({img_path.stat().st_size // 1024} KB)"
    )


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/crop_image.py <image> [--margin PERCENT]")
        sys.exit(1)

    img_path = Path(sys.argv[1])
    margin = 4.0

    if "--margin" in sys.argv:
        idx = sys.argv.index("--margin")
        if idx + 1 < len(sys.argv):
            margin = float(sys.argv[idx + 1])

    crop_product_image(img_path, margin)


if __name__ == "__main__":
    main()
