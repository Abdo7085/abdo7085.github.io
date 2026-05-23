#!/usr/bin/env python3
"""
Build the brand catalog end-to-end:

  1. Read every data/brands/*.json.
  2. Filter data/products_index.json by each brand's `brand` value to know which
     products belong to which brand.
  3. Write data/brands_index.json (lean listing index with product_count per brand).
  4. Generate static SEO HTML pages in brands/, fr/brands/, ar/brands/ with full
     meta tags, hreflang, og:locale, Brand + BreadcrumbList + ItemList JSON-LD,
     <h1>/<p> fallback in <noscript>, and window.__BRAND__ inline pre-embed
     (so brand-detail.js renders without a second fetch).
  5. Inject ItemList JSON-LD into the root brands.html (EN/FR/AR) for catalog
     rich results — listing all brands as entry points.
  6. Write the authoritative sitemap.xml via _lib.write_sitemap().

Mirrors build_products.py's architecture exactly.

Usage:
    python scripts/build_brands.py
"""

from __future__ import annotations

import glob
import html as html_module
import json
import re
from pathlib import Path

import _lib
from _lib import HOST, LANGS, OG_LOCALES, ROOT, t, make_meta_description, write_sitemap

BRANDS_DIR = ROOT / "data" / "brands"
BRANDS_INDEX_PATH = ROOT / "data" / "brands_index.json"
PRODUCTS_INDEX_PATH = ROOT / "data" / "products_index.json"
LIST_TEMPLATE_PATH = ROOT / "brands.html"
DETAIL_TEMPLATE_PATH = ROOT / "brand.html"


# ---------------- Index build ----------------

def derive_chips(brand_products):
    """Return (technologies, categories) — both sorted by frequency desc.
    Mirrors the deriveChips() function in assets/brand-detail.js so the
    JSON-LD / index agree with what the page renders client-side."""
    tech_count, type_count = {}, {}
    for p in brand_products:
        for tech in (p.get("technology") or []):
            if tech:
                tech_count[tech] = tech_count.get(tech, 0) + 1
        pt = p.get("product_type")
        if pt:
            type_count[pt] = type_count.get(pt, 0) + 1
    techs = sorted(tech_count.keys(), key=lambda k: (-tech_count[k], k))
    cats  = sorted(type_count.keys(), key=lambda k: (-type_count[k], k))
    return techs, cats


def build_index(products_index):
    """Read every brand JSON, count its products, write lean index."""
    BRANDS_DIR.mkdir(parents=True, exist_ok=True)
    brand_files = sorted(glob.glob(str(BRANDS_DIR / "*.json")))
    brands = []
    full_brands = []  # full data, used downstream for per-brand pages

    for bf in brand_files:
        try:
            with open(bf, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"  Error processing {bf}: {e}")
            continue

        brand_name = data.get("brand", "")
        brand_products = [p for p in products_index if p.get("brand") == brand_name]
        techs, cats = derive_chips(brand_products)

        index_entry = {
            "id": data.get("id"),
            "brand": brand_name,
            "tagline": data.get("tagline", {}),
            "logo": data.get("logo"),
            "tech_focus": techs,
            "category_focus": cats,
            "country_of_origin": data.get("country_of_origin"),
            "product_count": len(brand_products),
        }
        brands.append(index_entry)
        full_brands.append(data)
        print(f"  Indexed {data.get('id')} ({brand_name}, {len(brand_products)} products).")

    # Sort by product_count desc — biggest brands first on the index page.
    brands.sort(key=lambda b: -b["product_count"])

    with open(BRANDS_INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(brands, f, indent=2, ensure_ascii=False)

    print(f"\n[1/3] Wrote {BRANDS_INDEX_PATH.relative_to(ROOT)} with {len(brands)} brands.")
    return full_brands


# ---------------- JSON-LD ----------------

def build_brand_jsonld(brand, brand_products, lang):
    """Brand schema + BreadcrumbList + ItemList of this brand's products."""
    bid = brand.get("id", "")
    brand_name = brand.get("brand", "")
    tagline = t(brand.get("tagline"), lang)
    description = t(brand.get("description"), lang)
    website = brand.get("website") or ""
    logo = brand.get("logo")

    prefix = "" if lang == "en" else f"/{lang}"
    canonical = f"{HOST}{prefix}/brands/{bid}.html"

    brand_ld = {
        "@context": "https://schema.org",
        "@type": "Brand",
        "name": brand_name,
        "description": description or tagline,
        "url": canonical,
    }
    if website:
        brand_ld["sameAs"] = [website]
    if logo:
        brand_ld["logo"] = HOST + logo if logo.startswith("/") else logo

    brands_label = {"en": "Brands", "fr": "Marques", "ar": "العلامات التجارية"}[lang]
    home_url = f"{HOST}{prefix}/"
    brands_url = f"{HOST}{prefix}/brands.html"
    breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "S‑ELECTRICITY", "item": home_url},
            {"@type": "ListItem", "position": 2, "name": brands_label, "item": brands_url},
            {"@type": "ListItem", "position": 3, "name": brand_name, "item": canonical},
        ],
    }

    item_list = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": f"{brand_name} products",
        "numberOfItems": len(brand_products),
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": i,
                "url": f"{HOST}{prefix}/products/{p.get('id', '')}.html",
                "name": t(p.get("title"), lang),
            }
            for i, p in enumerate(brand_products, 1)
        ],
    }

    return (
        json.dumps(brand_ld, ensure_ascii=False),
        json.dumps(breadcrumb, ensure_ascii=False),
        json.dumps(item_list, ensure_ascii=False),
    )


# ---------------- Per-brand HTML generation ----------------

def generate_brand_html(template_html, brand, brand_products, lang):
    bid = brand.get("id", "")
    brand_name = brand.get("brand", "")
    tagline = t(brand.get("tagline"), lang)
    desc_text = make_meta_description(brand, lang)
    logo = brand.get("logo")

    suffix = {
        "en": "S‑ELECTRICITY Morocco",
        "fr": "S‑ELECTRICITY Maroc",
        "ar": "S‑ELECTRICITY المغرب",
    }[lang]
    page_title = f"{brand_name} | {suffix}"

    safe_title = html_module.escape(page_title, quote=True)
    safe_desc = html_module.escape(desc_text, quote=True)
    safe_brand_name = html_module.escape(brand_name)
    safe_tagline = html_module.escape(tagline)

    out = _lib.set_html_lang_dir(template_html, lang)

    out = re.sub(r"<title[^>]*>.*?</title>", f"<title>{safe_title}</title>", out, flags=re.S, count=1)

    out = re.sub(
        r'<meta\s+name="description"[^>]*>',
        f'<meta name="description" content="{safe_desc}" id="meta-description" />',
        out, count=1
    )

    out = re.sub(
        r'<meta\s+name="robots"[^>]*>',
        '<meta name="robots" content="index, follow" />',
        out, count=1
    )

    prefix = "" if lang == "en" else f"/{lang}"
    canonical_url = f"{HOST}{prefix}/brands/{bid}.html"
    out = re.sub(
        r'<link\s+rel="canonical"[^>]*>',
        f'<link rel="canonical" href="{canonical_url}" id="meta-canonical" />',
        out, count=1
    )

    en_url = f"{HOST}/brands/{bid}.html"
    fr_url = f"{HOST}/fr/brands/{bid}.html"
    ar_url = f"{HOST}/ar/brands/{bid}.html"

    out = re.sub(r'<link\s+rel="alternate"\s+hreflang="en"[^>]*/?>',
                 f'<link rel="alternate" hreflang="en" href="{en_url}" />', out, count=1)
    out = re.sub(r'<link\s+rel="alternate"\s+hreflang="fr"[^>]*/?>',
                 f'<link rel="alternate" hreflang="fr" href="{fr_url}" />', out, count=1)
    out = re.sub(r'<link\s+rel="alternate"\s+hreflang="ar"[^>]*/?>',
                 f'<link rel="alternate" hreflang="ar" href="{ar_url}" />', out, count=1)
    # x-default: strip existing and re-insert after the AR alternate.
    out = re.sub(r'\s*<link\s+rel="alternate"\s+hreflang="x-default"[^>]*/?>', '', out)
    xdef = f'<link rel="alternate" hreflang="x-default" href="{en_url}" />'
    out = out.replace(
        f'<link rel="alternate" hreflang="ar" href="{ar_url}" />',
        f'<link rel="alternate" hreflang="ar" href="{ar_url}" />\n    {xdef}',
        1
    )

    # OG image: brand logo if present, else fallback to S-ELECTRICITY logo.
    og_image = (HOST + logo) if logo else f"{HOST}/assets/S‑ELECTRICITY-LOGO.svg"

    out = re.sub(r'<meta\s+property="og:title"[^>]*>',
                 f'<meta property="og:title" content="{safe_title}" id="meta-og-title" />', out, count=1)
    out = re.sub(r'<meta\s+property="og:description"[^>]*>',
                 f'<meta property="og:description" content="{safe_desc}" id="meta-og-description" />', out, count=1)
    out = re.sub(r'<meta\s+property="og:url"[^>]*>',
                 f'<meta property="og:url" content="{canonical_url}" />', out, count=1)
    out = re.sub(r'<meta\s+property="og:image"[^>]*>',
                 f'<meta property="og:image" content="{og_image}" id="meta-og-image" />', out, count=1)

    out = re.sub(r'<meta\s+name="twitter:title"[^>]*>',
                 f'<meta name="twitter:title" content="{safe_title}" id="meta-twitter-title" />', out, count=1)
    out = re.sub(r'<meta\s+name="twitter:description"[^>]*>',
                 f'<meta name="twitter:description" content="{safe_desc}" id="meta-twitter-description" />', out, count=1)
    out = re.sub(r'<meta\s+name="twitter:image"[^>]*>',
                 f'<meta name="twitter:image" content="{og_image}" id="meta-twitter-image" />', out, count=1)

    # JSON-LD: Brand + BreadcrumbList + ItemList of this brand's products
    brand_json, bc_json, il_json = build_brand_jsonld(brand, brand_products, lang)
    brand_script = f'<script type="application/ld+json" id="brand-jsonld">{brand_json}</script>'
    bc_script = f'<script type="application/ld+json" id="breadcrumb-jsonld">{bc_json}</script>'
    il_script = f'<script type="application/ld+json" id="brand-itemlist-jsonld">{il_json}</script>'

    og_locale = OG_LOCALES[lang]
    alt_locales = "".join(
        f'\n  <meta property="og:locale:alternate" content="{OG_LOCALES[l]}" />'
        for l in LANGS if l != lang
    )
    locale_tags = f'<meta property="og:locale" content="{og_locale}" />{alt_locales}'

    # Inline pre-embed of the full brand + filtered products so brand-detail.js
    # can render instantly without a second fetch.
    brand_with_products = dict(brand)
    brand_with_products["products"] = brand_products
    embedded = json.dumps(brand_with_products, ensure_ascii=False)
    pre_embed = f'<script id="brand-preload">window.__BRAND__ = {embedded};</script>'

    inject = f"  {locale_tags}\n  {brand_script}\n  {bc_script}\n  {il_script}\n  {pre_embed}\n  </head>"
    out = out.replace("</head>", inject, 1)

    # <noscript> fallback — H1 + tagline
    out = out.replace(
        '<p>S‑ELECTRICITY - Smart Home Solutions</p>',
        f'<h1>{safe_brand_name}</h1>\n      <p>{safe_tagline}</p>\n      <p>S‑ELECTRICITY - Smart Home Solutions</p>',
        1
    )

    return out


def generate_all_brand_pages(brands, products_index):
    if not DETAIL_TEMPLATE_PATH.exists():
        print(f"ERROR: template {DETAIL_TEMPLATE_PATH} not found.")
        return
    template_html = DETAIL_TEMPLATE_PATH.read_text(encoding="utf-8")

    for brand in brands:
        bid = brand.get("id")
        brand_name = brand.get("brand", "")
        brand_products = [p for p in products_index if p.get("brand") == brand_name]
        for lang in LANGS:
            out_dir = ROOT / "brands" if lang == "en" else ROOT / lang / "brands"
            out_dir.mkdir(parents=True, exist_ok=True)
            out_path = out_dir / f"{bid}.html"
            page_html = generate_brand_html(template_html, brand, brand_products, lang)
            out_path.write_text(page_html, encoding="utf-8")
            print(f"  OK {out_path.relative_to(ROOT)}")


# ---------------- ItemList injection into brands.html ----------------

def inject_brands_page_itemlist(brands):
    """Inject ItemList JSON-LD into brands.html (EN/FR/AR) — one ListItem per brand."""
    for lang in LANGS:
        page_path = ROOT / "brands.html" if lang == "en" else ROOT / lang / "brands.html"
        if not page_path.exists():
            continue

        prefix = "" if lang == "en" else f"/{lang}"
        items = []
        for i, brand in enumerate(brands, 1):
            bid = brand.get("id", "")
            brand_name = brand.get("brand", "")
            items.append({
                "@type": "ListItem",
                "position": i,
                "url": f"{HOST}{prefix}/brands/{bid}.html",
                "name": brand_name,
            })

        ld = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": {"en": "Brands", "fr": "Marques", "ar": "العلامات التجارية"}[lang],
            "numberOfItems": len(items),
            "itemListElement": items,
        }

        html = page_path.read_text(encoding="utf-8")
        ld_script = f'<script type="application/ld+json" id="brands-itemlist-jsonld">{json.dumps(ld, ensure_ascii=False)}</script>'
        html = re.sub(
            r'<script type="application/ld\+json" id="brands-itemlist-jsonld">.*?</script>\s*',
            '', html, flags=re.S
        )
        html = html.replace("</head>", f"  {ld_script}\n  </head>", 1)
        page_path.write_text(html, encoding="utf-8")
        print(f"  Injected ItemList JSON-LD into {page_path.relative_to(ROOT)}")


# ---------------- Entry point ----------------

def main():
    print("=== Building Brand Catalog ===\n")

    # Load products index — required to count products per brand and to filter
    # them onto each brand's detail page.
    if not PRODUCTS_INDEX_PATH.exists():
        print(f"ERROR: {PRODUCTS_INDEX_PATH} not found. Run build_products.py first.")
        return
    try:
        products_index = json.loads(PRODUCTS_INDEX_PATH.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"ERROR: couldn't load products_index.json: {e}")
        return

    brands = build_index(products_index)
    if not brands:
        print("No brands found. Nothing to generate.")
        return

    print(f"\n[2/3] Generating static HTML pages for {len(brands)} brands × {len(LANGS)} languages...")
    generate_all_brand_pages(brands, products_index)

    print(f"\n[3/3] Injecting ItemList JSON-LD into brands.html...")
    # Sort by product_count desc (same as index) for stable ItemList ordering.
    brands_sorted = sorted(brands, key=lambda b: -sum(1 for p in products_index if p.get("brand") == b.get("brand", "")))
    inject_brands_page_itemlist(brands_sorted)

    write_sitemap()
    print("\nOK Wrote sitemap.xml (complete — static + products + projects + brands).")

    print("\n=== Brand build complete. ===")


if __name__ == "__main__":
    main()
