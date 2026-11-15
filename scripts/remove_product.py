#!/usr/bin/env python3
"""
Remove a product and everything generated from it, in one command.

    python scripts/remove_product.py <id>          # shows what would go
    python scripts/remove_product.py <id> --yes    # removes it and rebuilds

Removed: data/products/<id>.json and its originals in media/products/ (an
image another product also lists is kept). The rebuild then drops its pages
in /, /fr/ and /ar/, its WebP variants and share card, and its entries in
the catalog index, the brand page and sitemap.xml.

Stops without touching anything if a project still lists the product in
"related_products" — edit that project first. Nothing is committed; the
files can be restored with git until you commit.
"""

from __future__ import annotations

import argparse
import difflib
import json
import sys

from _lib import ROOT, LANGS

PRODUCTS_DIR = ROOT / "data" / "products"
MEDIA_PRODUCTS = ROOT / "media" / "products"


def main() -> int:
    ap = argparse.ArgumentParser(description="Remove a product (see the top of this file).")
    ap.add_argument("id")
    ap.add_argument("--yes", action="store_true", help="really remove it")
    args = ap.parse_args()

    pid = args.id
    path = PRODUCTS_DIR / f"{pid}.json"
    ids = sorted(p.stem for p in PRODUCTS_DIR.glob("*.json"))
    if not path.exists():
        close = difflib.get_close_matches(pid, ids, n=3, cutoff=0.6)
        raise SystemExit(f'\nNo product "{pid}".' + (f" Closest: {', '.join(close)}" if close else ""))

    product = json.loads(path.read_text(encoding="utf-8"))

    used_by = [
        pf.name for pf in sorted((ROOT / "data" / "projects").glob("*.json"))
        if pid in (json.loads(pf.read_text(encoding="utf-8")).get("related_products") or [])
    ]
    if used_by:
        raise SystemExit(
            f'\nNot removed: "{pid}" is still in related_products of '
            f'{", ".join("data/projects/" + n for n in used_by)}. Delete it there first.'
        )

    shared = set()
    for pf in PRODUCTS_DIR.glob("*.json"):
        if pf != path:
            shared.update(json.loads(pf.read_text(encoding="utf-8")).get("images") or [])
    images = [n for n in product.get("images") or [] if isinstance(n, str)]
    delete = [path] + [MEDIA_PRODUCTS / n for n in images
                       if n not in shared and (MEDIA_PRODUCTS / n).is_file()]
    kept = [n for n in images if n in shared]

    print(f"\n{product.get('brand')} — {(product.get('title') or {}).get('en', pid)}")
    print("Removes:")
    for f in delete:
        print(f"  {f.relative_to(ROOT).as_posix()}")
    for n in kept:
        print(f"  (keeps media/products/{n}: another product uses it)")
    print("Then the rebuild drops:")
    for lang in LANGS:
        prefix = "" if lang == "en" else f"{lang}/"
        print(f"  {prefix}products/{pid}.html")
    print(f"  assets/products/<{pid} variants>.webp, assets/og/products/{pid}.jpg,\n"
          f"  and its entries in the catalog, the {product.get('brand')} page and sitemap.xml")

    if not args.yes:
        print("\nNothing changed. Run again with --yes to remove it.")
        return 0

    for f in delete:
        f.unlink()
    print("\nRemoved. Rebuilding the site...")
    import build_all
    build_all.main()
    print(f"\nDone: {pid} is gone from the site. Nothing is committed "
          f"(git restore brings it back until you commit).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
