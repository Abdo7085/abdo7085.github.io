"""
Remove background from a product image and save as PNG with transparency.
Uses rembg (U2Net AI model) for highly accurate removal.

Usage:
    python scripts/remove_bg.py <input_image> [output_image]

If output is omitted, writes alongside input with .png extension.
"""
import sys
from pathlib import Path
from rembg import remove
from PIL import Image

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/remove_bg.py <input> [output]")
        sys.exit(1)
        
    in_path = Path(sys.argv[1])
    if len(sys.argv) >= 3:
        out_path = Path(sys.argv[2])
    else:
        out_path = in_path.with_suffix(".png")
        
    if not in_path.exists():
        print(f"Error: {in_path} not found.")
        sys.exit(1)
        
    print(f"[remove_bg] Processing {in_path.name} with AI background removal...")
    img = Image.open(in_path)
    
    # Perform removal
    out_img = remove(img)
    
    # Ensure directory exists
    out_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Save optimized png
    out_img.save(out_path, "PNG", optimize=True)
    print(f"[remove_bg] Saved -> {out_path.name} ({out_path.stat().st_size // 1024} KB)")

if __name__ == "__main__":
    main()
