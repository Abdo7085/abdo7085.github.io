"""
Remove background from a product image using traditional Edge Flood Fill.
This is designed as a FALLBACK tool when the AI (remove_bg.py) mistakenly
deletes internal features of a product (like flat black screens).

Usage:
    python scripts/remove_bg_traditional.py <input_image> [output_image]
"""
import sys
from pathlib import Path
from PIL import Image

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/remove_bg_traditional.py <input> [output]")
        sys.exit(1)
        
    in_path = Path(sys.argv[1])
    out_path = Path(sys.argv[2]) if len(sys.argv) >= 3 else in_path.with_suffix(".png")
        
    if not in_path.exists():
        print(f"Error: {in_path} not found.")
        sys.exit(1)
        
    print(f"[remove_bg_traditional] Processing {in_path.name} with Edge Flood Fill...")
    img = Image.open(in_path).convert("RGBA")
    
    w, h = img.size
    px = img.load()
    
    # Do a simple edge-preserving flood fill
    # Starting from all outer border pixels
    q = [(x, y) for x in range(w) for y in (0, h-1)] + [(x, y) for x in (0, w-1) for y in range(h)]
    visited = set(q)
    
    # We consider pixels > 235 as "white background"
    while q:
        x, y = q.pop()
        r, g, b, a = px[x, y]
        if r > 235 and g > 235 and b > 235:
            px[x, y] = (255, 255, 255, 0)
            for dx, dy in ((0,1), (0,-1), (1,0), (-1,0)):
                nx, ny = x+dx, y+dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    visited.add((nx, ny))
                    q.append((nx, ny))
                    
    # Add minor anti-aliasing to edges (optional but improves look)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, "PNG", optimize=True)
    print(f"[remove_bg_traditional] Saved -> {out_path.name} ({out_path.stat().st_size // 1024} KB)")

if __name__ == "__main__":
    main()
