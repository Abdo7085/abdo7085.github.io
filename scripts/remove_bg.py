"""
Remove white/near-white background from a product image and save as PNG
with transparency. Uses edge flood-fill so interior white areas (labels,
screens) are preserved.

Usage:
    python scripts/remove_bg.py <input_image> [output_image]

If output is omitted, writes alongside input with .png extension.
"""
import sys
from pathlib import Path
from collections import deque
from PIL import Image


def remove_white_background(
    in_path: Path,
    out_path: Path,
    hard_tolerance: int = 8,
    soft_tolerance: int = 40,
) -> None:
    """
    Edge-flood-fill white removal with soft alpha at edges.

    - Pixels with min(R,G,B) >= 255 - hard_tolerance are treated as pure
      background (fully transparent) during flood fill.
    - Pixels with min(R,G,B) between (255 - soft_tolerance) and
      (255 - hard_tolerance) get a partial alpha so edges anti-alias
      smoothly instead of being jagged.
    - Flood fill starts from the image border so interior whites (logos,
      labels, screens) are preserved.
    """
    img = Image.open(in_path).convert("RGBA")
    w, h = img.size
    px = img.load()

    hard_thr = 255 - hard_tolerance   # >= this = background
    soft_thr = 255 - soft_tolerance   # < this = keep opaque

    def brightness(p):
        return min(p[0], p[1], p[2])

    # 1) Flood fill from edges across "hard white" pixels, marking them transparent.
    visited = bytearray(w * h)

    def idx(x, y):
        return y * w + x

    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if brightness(px[x, y]) >= hard_thr and not visited[idx(x, y)]:
                q.append((x, y))
                visited[idx(x, y)] = 1
    for y in range(h):
        for x in (0, w - 1):
            if brightness(px[x, y]) >= hard_thr and not visited[idx(x, y)]:
                q.append((x, y))
                visited[idx(x, y)] = 1

    bg_mask = bytearray(w * h)  # 1 = reachable background
    while q:
        x, y = q.popleft()
        bg_mask[idx(x, y)] = 1
        px[x, y] = (255, 255, 255, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[idx(nx, ny)]:
                if brightness(px[nx, ny]) >= hard_thr:
                    visited[idx(nx, ny)] = 1
                    q.append((nx, ny))

    # 2) Soft edge: any opaque pixel that neighbors a background pixel AND
    #    falls in the soft range gets partial alpha based on how white it is.
    for y in range(h):
        for x in range(w):
            if bg_mask[idx(x, y)]:
                continue
            p = px[x, y]
            b = brightness(p)
            if b <= soft_thr:
                continue  # clearly foreground
            # Neighboring a background pixel?
            neighbor_bg = False
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and bg_mask[idx(nx, ny)]:
                    neighbor_bg = True
                    break
            if not neighbor_bg:
                continue
            # Map brightness in [soft_thr, hard_thr] to alpha in [255, 0]
            t = (b - soft_thr) / max(1, (hard_thr - soft_thr))
            t = max(0.0, min(1.0, t))
            new_alpha = int(round(255 * (1 - t)))
            px[x, y] = (p[0], p[1], p[2], new_alpha)

    # Crop to content
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, "PNG", optimize=True)
    print(f"[remove_bg] {in_path.name} -> {out_path.name} ({out_path.stat().st_size // 1024} KB)")


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/remove_bg.py <input> [output]")
        sys.exit(1)
    in_path = Path(sys.argv[1])
    if len(sys.argv) >= 3:
        out_path = Path(sys.argv[2])
    else:
        out_path = in_path.with_suffix(".png")
    remove_white_background(in_path, out_path)


if __name__ == "__main__":
    main()
