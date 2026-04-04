#!/usr/bin/env python3
"""
Build a unified index of all products from individual JSON files in data/products/
Then generate static SEO-optimized HTML pages for each product and update sitemap.xml.

Usage:
    python scripts/build_products.py
"""

import json
import os
import glob
import subprocess
import sys

# Paths
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRODUCTS_DIR = os.path.join(ROOT_DIR, "data", "products")
INDEX_PATH = os.path.join(ROOT_DIR, "data", "products_index.json")
SEO_SCRIPT = os.path.join(ROOT_DIR, "scripts", "generate_static_seo.py")

def build_index():
    if not os.path.exists(PRODUCTS_DIR):
        print(f"Creating directory {PRODUCTS_DIR}")
        os.makedirs(PRODUCTS_DIR, exist_ok=True)
    
    product_files = glob.glob(os.path.join(PRODUCTS_DIR, "*.json"))
    products_index = []

    for pf in product_files:
        try:
            with open(pf, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            # Extract only the essential fields needed for the listing page
            # We extract essential fields for the index, passing localized objects directly
            index_entry = {
                "id": data.get("id"),
                "brand": data.get("brand"),
                "technology": data.get("technology", []),
                "product_type": data.get("product_type", ""),
                "installation": data.get("installation", ""),
                "title": data.get("title", {}),
                "short_description": data.get("short_description", {}),
                "category": data.get("category", ""), # Keeping for backward compat if any
            }
            
            # Add primary image if available
            images = data.get("images", [])
            if images:
                index_entry["image"] = images[0]
            
            products_index.append(index_entry)
            print(f"  Added {data.get('id')} to index.")
        except Exception as e:
            print(f"  Error processing {pf}: {e}")
    
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(products_index, f, indent=2, ensure_ascii=False)
    
    print(f"\n[1/2] Successfully built index with {len(products_index)} products.")
    return len(products_index)


def generate_seo_pages():
    """Run the static SEO page generator script."""
    if not os.path.exists(SEO_SCRIPT):
        print(f"\nWARNING: SEO script not found at {SEO_SCRIPT}")
        print("Skipping static page generation.")
        return False
    
    print("\n[2/2] Generating static SEO pages + sitemap...")
    result = subprocess.run(
        [sys.executable, SEO_SCRIPT],
        cwd=ROOT_DIR,
        capture_output=False
    )
    return result.returncode == 0


if __name__ == "__main__":
    print("=== Building Product Catalog ===\n")
    count = build_index()
    
    if count > 0:
        success = generate_seo_pages()
        if success:
            print("\n=== All done! Index + SEO pages + Sitemap ready. ===")
        else:
            print("\n=== Index built, but SEO generation had issues. ===")
    else:
        print("\nNo products found. Nothing to generate.")
