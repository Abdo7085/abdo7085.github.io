#!/usr/bin/env python3
"""
Add a product in one command.

    python scripts/new_product.py <id> --brand Zennio --type "Touch Panel" \\
        --tech KNX --install "Wall mount" \\
        --image path/to/photo.png [--image path/to/second.jpg ...] \\
        [--content texts.json] [--no-build]

What it does:
  1. Checks brand, type, technology and installation against data/brands/
     and data/taxonomy.json (case is fixed for you; a typo stops with the
     allowed values and the closest match).
  2. Copies the images into media/products/ as <id>.<ext>, <id>-2.<ext>, ...
     (first = primary), shrinking any original above 2000px.
  3. Writes data/products/<id>.json.
  4. With --content: rebuilds the site, and the product is live locally.
     Without it: every text field holds a "TODO: ..." placeholder and the
     build refuses to run until they are all filled in.

--content is a JSON file with the texts, in the same shape as a product file:
    {
      "title":             {"en": "...", "fr": "...", "ar": "..."},
      "short_description": {"en": "...", "fr": "...", "ar": "..."},
      "description":       {"en": "...", "fr": "...", "ar": "..."},
      "specs": {"en": {"Name": "Value"}, "fr": {...}, "ar": {...}},
      "files": [{"name": "Datasheet (PDF)", "url": "https://..."}],
      "rating": {"value": 4.4, "count": 89}          (optional, real data only)
    }

Remove a product with scripts/remove_product.py.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

import _lib
import validate
from _lib import ROOT, LANGS

PRODUCTS_DIR = ROOT / "data" / "products"
CONTENT_KEYS = ("title", "short_description", "description", "specs", "files", "rating")


def placeholder_texts() -> dict:
    tag = validate.PLACEHOLDER
    names = {"en": "English", "fr": "French", "ar": "Arabic"}
    return {
        "title": {l: f"{tag}: {names[l]} product name" for l in LANGS},
        "short_description": {l: f"{tag}: {names[l]} one-line summary, at most 10 words" for l in LANGS},
        "description": {l: f"{tag}: {names[l]} description, one paragraph" for l in LANGS},
        "specs": {l: {"Spec": f"{tag}: {names[l]} specification rows"} for l in LANGS},
        "files": [],
    }


def read_content(path: str) -> dict:
    try:
        content = json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception as exc:
        raise SystemExit(f"\nCannot read --content {path}: {exc}")
    unknown = sorted(set(content) - set(CONTENT_KEYS))
    if unknown:
        raise SystemExit(f"\n--content has unknown key(s): {', '.join(unknown)}. "
                         f"Allowed: {', '.join(CONTENT_KEYS)}")
    texts = placeholder_texts()
    texts.update(content)
    return texts


def import_images(pid: str, sources: list) -> list:
    """Copy originals into media/products/ under the product's name.
    Returns the file names, primary first."""
    from PIL import Image
    import build_images

    names = []
    for i, src in enumerate(sources, 1):
        path = Path(src)
        if not path.is_file():
            raise SystemExit(f"\nImage not found: {src}")
        ext = path.suffix.lower()
        if ext == ".avif":
            raise SystemExit(f"\n{path.name}: convert .avif to .png first (Pillow cannot read it).")
        if ext not in build_images.SOURCE_EXT:
            raise SystemExit(f"\n{path.name}: use one of {', '.join(sorted(build_images.SOURCE_EXT))}")
        name = f"{pid}{ext}" if i == 1 else f"{pid}-{i}{ext}"
        dest = build_images.MEDIA_PRODUCTS / name
        stem_taken = [p.name for p in build_images.MEDIA_PRODUCTS.glob(f"{Path(name).stem}.*")]
        if stem_taken and dest.resolve() != path.resolve():
            raise SystemExit(f"\nmedia/products/ already has {stem_taken[0]} — "
                             f"remove it or pick another product id.")
        names.append((path, dest))

    build_images.MEDIA_PRODUCTS.mkdir(parents=True, exist_ok=True)
    for path, dest in names:
        if dest.resolve() == path.resolve():
            continue
        with Image.open(path) as im:
            too_big = max(im.size) > build_images.MAX_SOURCE_PX
            if too_big:
                im.thumbnail((build_images.MAX_SOURCE_PX,) * 2, Image.LANCZOS)
                save = {"quality": 92} if dest.suffix in (".jpg", ".jpeg", ".webp") else {"optimize": True}
                im.save(dest, **save)
                print(f"  media/products/{dest.name}  (shrunk to {im.size[0]}x{im.size[1]})")
        if not too_big:
            shutil.copyfile(path, dest)
            print(f"  media/products/{dest.name}")
    return [dest.name for _, dest in names]


def main() -> int:
    ap = argparse.ArgumentParser(description="Add a product (see the top of this file).")
    ap.add_argument("id", help="lowercase-with-hyphens, becomes the file and page name")
    ap.add_argument("--brand", required=True)
    ap.add_argument("--type", required=True, dest="ptype", help="product type from data/taxonomy.json")
    ap.add_argument("--tech", required=True, action="append", help="repeat for several")
    ap.add_argument("--install", required=True, help="installation from data/taxonomy.json")
    ap.add_argument("--image", required=True, action="append", help="repeat; first = primary")
    ap.add_argument("--content", help="JSON file with the texts (see above)")
    ap.add_argument("--no-build", action="store_true", help="write the files, skip the rebuild")
    args = ap.parse_args()

    pid = args.id
    if not validate.ID_RE.match(pid):
        raise SystemExit(f'\n"{pid}": use lowercase letters, digits and single hyphens.')
    path = PRODUCTS_DIR / f"{pid}.json"
    if path.exists():
        raise SystemExit(f"\n{path.relative_to(ROOT).as_posix()} already exists — edit it instead.")

    taxonomy = _lib.load_taxonomy()
    brands = {}
    for bf in sorted((ROOT / "data" / "brands").glob("*.json")):
        name = json.loads(bf.read_text(encoding="utf-8")).get("brand")
        brands[name] = bf
    brand = _lib.match_choice(args.brand, brands, "brand", "data/brands/ (scripts/new_brand.py)")
    ptype = _lib.match_choice(args.ptype, taxonomy.type_order, "product type")
    techs = []
    for tech in args.tech:
        tech = _lib.match_choice(tech, taxonomy.technologies, "technology")
        if tech not in techs:
            techs.append(tech)
    install = _lib.match_choice(args.install, taxonomy.installation_labels, "installation")
    texts = read_content(args.content) if args.content else placeholder_texts()

    print(f"\nImporting {len(args.image)} image(s):")
    images = import_images(pid, args.image)

    product = {
        "id": pid,
        "brand": brand,
        "technology": techs,
        "product_type": ptype,
        "installation": install,
        "title": texts["title"],
        "short_description": texts["short_description"],
        "description": texts["description"],
        "specs": texts["specs"],
        "images": images,
        "files": texts["files"],
    }
    if "rating" in texts:
        product["rating"] = texts["rating"]
    _lib.write_content_json(path, product)
    print(f"\nWrote {path.relative_to(ROOT).as_posix()}  "
          f"({taxonomy.label('category', taxonomy.category_of(ptype))} / {ptype})")

    report = validate.run()
    mine = [e for e in report.errors if f"/{pid}.json" in e]
    others = [e for e in report.errors if e not in mine]
    placeholders_only = all(validate.PLACEHOLDER in e for e in mine)
    if mine and not placeholders_only:
        print("\nThe new file has problems:")
        for line in mine:
            print(f"  - {line}")
        return 1
    if mine:
        print(f"\nNext: replace the {len(mine)} \"{validate.PLACEHOLDER}: ...\" text(s) in "
              f"{path.relative_to(ROOT).as_posix()}, then run  python scripts/build_all.py")
        return 0
    if others:
        print("\nThe product is fine, but other files have problems "
              "(python scripts/validate.py lists them); not rebuilding.")
        return 1
    if args.no_build:
        print("\nValid. Run  python scripts/build_all.py  to publish it locally.")
        return 0

    print("\nRebuilding the site...")
    import build_all
    build_all.main()
    print(f"\nDone: /products/{pid}.html (+ /fr/, /ar/), listed in the catalog "
          f"and on the {brand} page. Nothing is committed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
