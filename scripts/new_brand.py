#!/usr/bin/env python3
"""
Add a brand in one command.

    python scripts/new_brand.py "Brand Name" [--country Spain] [--founded 2006] \\
        [--website https://www.example.com] [--logo path/to/logo.svg] \\
        [--content texts.json] [--no-build]

The name is written exactly as products will use it in "brand" (casing
included). The page id is derived from it the way product pages build the
link: lower case, spaces -> "-" ("EAE Technology" -> eae-technology).

What it does:
  1. Copies the logo to assets/brands/<id>.svg (an SVG is what the product
     cards show; .png/.webp work on the brand page only). Without --logo the
     page shows a text card; add a logo later and set "logo" in the file.
  2. Writes data/brands/<id>.json. Unknown country/year/website: leave the
     option out and the page simply omits that badge.
  3. With --content: rebuilds the site (the brand page appears and lists
     products once they use this "brand"). Without it: tagline and
     description hold "TODO: ..." placeholders and the build refuses to run
     until they are filled in.

--content is a JSON file:
    {
      "tagline":     {"en": "...", "fr": "...", "ar": "..."},
      "description": {"en": "...", "fr": "...", "ar": "..."}
    }

Then add its products with scripts/new_product.py --brand "Brand Name".
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import date
from pathlib import Path

import _lib
import validate
from _lib import ROOT, LANGS

BRANDS_DIR = ROOT / "data" / "brands"
LOGOS_DIR = ROOT / "assets" / "brands"
LOGO_EXT = {".svg", ".png", ".webp"}
CONTENT_KEYS = ("tagline", "description")


def main() -> int:
    ap = argparse.ArgumentParser(description="Add a brand (see the top of this file).")
    ap.add_argument("name", help='display name, exactly as products write it in "brand"')
    ap.add_argument("--country", help="country of origin, in English")
    ap.add_argument("--founded", type=int, help="year")
    ap.add_argument("--website", help="https://...")
    ap.add_argument("--logo", help="SVG preferred")
    ap.add_argument("--content", help="JSON file with tagline + description (see above)")
    ap.add_argument("--no-build", action="store_true")
    args = ap.parse_args()

    name = " ".join(args.name.split())
    bid = validate.brand_slug(name)
    if not validate.ID_RE.match(bid):
        raise SystemExit(f'\n"{name}" gives the page id "{bid}", which is not a valid URL name '
                         f"(letters a-z, digits, single hyphens).")
    path = BRANDS_DIR / f"{bid}.json"
    if path.exists():
        raise SystemExit(f"\n{path.relative_to(ROOT).as_posix()} already exists — edit it instead.")
    for bf in BRANDS_DIR.glob("*.json"):
        other = json.loads(bf.read_text(encoding="utf-8")).get("brand", "")
        if other.lower() == name.lower():
            raise SystemExit(f'\nBrand "{other}" already exists in {bf.name}.')
    if args.website and not args.website.startswith("https://"):
        raise SystemExit("\n--website must start with https://")
    if args.founded is not None and not 1800 <= args.founded <= date.today().year:
        raise SystemExit("\n--founded must be a year")

    logo = Path(args.logo) if args.logo else None
    if logo is not None:
        if not logo.is_file():
            raise SystemExit(f"\nLogo not found: {args.logo}")
        if logo.suffix.lower() not in LOGO_EXT:
            raise SystemExit(f"\nLogo must be one of {', '.join(sorted(LOGO_EXT))}")

    tag = validate.PLACEHOLDER
    langs = {"en": "English", "fr": "French", "ar": "Arabic"}
    texts = {
        "tagline": {l: f"{tag}: {langs[l]} one-line tagline" for l in LANGS},
        "description": {l: f"{tag}: {langs[l]} description, one paragraph" for l in LANGS},
    }
    if args.content:
        try:
            content = json.loads(Path(args.content).read_text(encoding="utf-8"))
        except Exception as exc:
            raise SystemExit(f"\nCannot read --content {args.content}: {exc}")
        unknown = sorted(set(content) - set(CONTENT_KEYS))
        if unknown:
            raise SystemExit(f"\n--content has unknown key(s): {', '.join(unknown)}")
        texts.update(content)

    brand = {"id": bid, "brand": name}
    if args.country:
        brand["country_of_origin"] = args.country.strip()
    if args.founded is not None:
        brand["founded"] = args.founded
    if args.website:
        brand["website"] = args.website
    brand["logo"] = None

    print()
    if logo is not None:
        LOGOS_DIR.mkdir(parents=True, exist_ok=True)
        dest = LOGOS_DIR / f"{bid}{logo.suffix.lower()}"
        if dest.resolve() != logo.resolve():
            if dest.exists():
                raise SystemExit(f"\n{dest.relative_to(ROOT).as_posix()} already exists.")
            shutil.copyfile(logo, dest)
        brand["logo"] = "/" + dest.relative_to(ROOT).as_posix()
        print(f"  {dest.relative_to(ROOT).as_posix()}")

    brand["tagline"] = texts["tagline"]
    brand["description"] = texts["description"]
    _lib.write_content_json(path, brand)
    print(f"  {path.relative_to(ROOT).as_posix()}  (page: /brands/{bid}.html)")

    report = validate.run()
    mine = [e for e in report.errors if f"/{bid}.json" in e]
    for line in report.warnings:
        if f"/{bid}.json" in line:
            print(f"  note: {line.split(': ', 1)[1]}")
    if mine and not all(tag in e for e in mine):
        print("\nThe new file has problems:")
        for line in mine:
            print(f"  - {line}")
        return 1
    if mine:
        print(f"\nNext: replace the {len(mine)} \"{tag}: ...\" text(s) in "
              f"{path.relative_to(ROOT).as_posix()}, then run  python scripts/build_all.py")
        return 0
    if report.errors:
        print("\nThe brand is fine, but other files have problems "
              "(python scripts/validate.py lists them); not rebuilding.")
        return 1
    if args.no_build:
        print("\nValid. Run  python scripts/build_all.py  to publish it locally.")
        return 0

    print("\nRebuilding the site...")
    import build_all
    build_all.main()
    print(f"\nDone: /brands/{bid}.html (+ /fr/, /ar/). Nothing is committed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
