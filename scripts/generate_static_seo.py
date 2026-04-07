#!/usr/bin/env python3
"""
Generate static SEO-optimized HTML pages for each product.
Creates /products/{id}.html, /fr/products/{id}.html, /ar/products/{id}.html
Also regenerates sitemap.xml with all product URLs included.

Usage:
    python scripts/generate_static_seo.py
"""

import json
import os
import glob
import re
import html as html_module
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS_DIR = ROOT / "data" / "products"
TEMPLATE_PATH = ROOT / "product.html"
HOST = "https://smartelectricity.ma"

LANGS = ["en", "fr", "ar"]

OG_LOCALES = {"en": "en_US", "fr": "fr_FR", "ar": "ar_AR"}


def make_meta_description(product, lang, max_len=160):
    """Build a SEO-optimal meta description (~150-160 chars) from the long description."""
    long_desc = t(product.get("description"), lang)
    short_desc = t(product.get("short_description"), lang)
    text = long_desc or short_desc or ""
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= max_len:
        return text
    cut = text[:max_len]
    sp = cut.rfind(" ")
    if sp > 80:
        cut = cut[:sp]
    return cut.rstrip(",.;:") + "…"


def load_locale(lang):
    """Load locale JSON file."""
    p = ROOT / "assets" / "locales" / f"{lang}.json"
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return {}


def t(obj, lang="en"):
    """Get localized text from a dict or string."""
    if not obj:
        return ""
    if isinstance(obj, str):
        return obj
    return obj.get(lang) or obj.get("en") or obj.get("fr") or obj.get("ar") or ""


def build_json_ld(product, lang):
    """Build JSON-LD structured data for a single product page."""
    title = t(product.get("title"), lang)
    desc = t(product.get("description"), lang) or t(product.get("short_description"), lang)
    pid = product.get("id", "")
    images = product.get("images", [])
    image_url = HOST + images[0] if images else ""

    ld = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": title,
        "description": desc,
        "sku": pid,
        "url": f"{HOST}/products/{pid}.html",
        "brand": {
            "@type": "Brand",
            "name": product.get("brand", "")
        },
        "category": product.get("product_type", ""),
    }
    if image_url:
        ld["image"] = image_url

    return json.dumps(ld, ensure_ascii=False)


def generate_product_html(template_html, product, lang):
    """
    Generate a static HTML page for a product in a specific language.
    Injects:
      - <title>
      - meta description
      - og:title, og:description, og:image, og:url
      - twitter:title, twitter:description, twitter:image
      - canonical
      - hreflang alternates
      - JSON-LD structured data
    """
    pid = product.get("id", "")
    title = t(product.get("title"), lang)
    brand = product.get("brand", "")
    desc_text = make_meta_description(product, lang)
    images = product.get("images", [])
    image_path = images[0] if images else ""
    image_url = HOST + image_path if image_path else f"{HOST}/assets/S‑ELECTRICITY-LOGO.svg"

    if brand and brand.lower() not in title.lower():
        page_title = f"{title} - {brand} | SMART ELECTRICITY"
    else:
        page_title = f"{title} | SMART ELECTRICITY"

    # Escape for HTML attributes
    safe_title = html_module.escape(page_title, quote=True)
    safe_desc = html_module.escape(desc_text, quote=True)

    out = template_html

    # Set <html lang="..."> and dir
    def repl_html_tag(m):
        tag = m.group(0)
        tag = re.sub(r'lang="[a-zA-Z-]*"', f'lang="{lang}"', tag)
        if lang == "ar":
            if "dir=" in tag:
                tag = re.sub(r'dir="[a-z]*"', 'dir="rtl"', tag)
            else:
                tag = tag.replace("<html", '<html dir="rtl"')
        else:
            if "dir=" in tag:
                tag = re.sub(r'dir="[a-z]*"', 'dir="ltr"', tag)
        return tag

    out = re.sub(r"<html[^>]*>", repl_html_tag, out, count=1)

    # <title>
    out = re.sub(
        r"<title[^>]*>.*?</title>",
        f"<title>{safe_title}</title>",
        out, flags=re.S, count=1
    )

    # meta description
    out = re.sub(
        r'<meta\s+name="description"[^>]*>',
        f'<meta name="description" content="{safe_desc}" />',
        out, count=1
    )

    # Canonical
    prefix = "" if lang == "en" else f"/{lang}"
    canonical_url = f"{HOST}{prefix}/products/{pid}.html"
    out = re.sub(
        r'<link\s+rel="canonical"[^>]*>',
        f'<link rel="canonical" href="{canonical_url}" />',
        out, count=1
    )

    # hreflang alternates
    en_url = f"{HOST}/products/{pid}.html"
    fr_url = f"{HOST}/fr/products/{pid}.html"
    ar_url = f"{HOST}/ar/products/{pid}.html"

    # Replace existing hreflang links
    out = re.sub(
        r'<link\s+rel="alternate"\s+hreflang="en"[^>]*/?>',
        f'<link rel="alternate" hreflang="en" href="{en_url}" />',
        out, count=1
    )
    out = re.sub(
        r'<link\s+rel="alternate"\s+hreflang="fr"[^>]*/?>',
        f'<link rel="alternate" hreflang="fr" href="{fr_url}" />',
        out, count=1
    )
    out = re.sub(
        r'<link\s+rel="alternate"\s+hreflang="ar"[^>]*/?>',
        f'<link rel="alternate" hreflang="ar" href="{ar_url}" />',
        out, count=1
    )

    # OG tags
    out = re.sub(
        r'<meta\s+property="og:title"[^>]*>',
        f'<meta property="og:title" content="{safe_title}" />',
        out, count=1
    )
    out = re.sub(
        r'<meta\s+property="og:description"[^>]*>',
        f'<meta property="og:description" content="{safe_desc}" />',
        out, count=1
    )
    out = re.sub(
        r'<meta\s+property="og:url"[^>]*>',
        f'<meta property="og:url" content="{canonical_url}" />',
        out, count=1
    )
    out = re.sub(
        r'<meta\s+property="og:image"[^>]*>',
        f'<meta property="og:image" content="{image_url}" />',
        out, count=1
    )

    # Twitter tags
    out = re.sub(
        r'<meta\s+name="twitter:title"[^>]*>',
        f'<meta name="twitter:title" content="{safe_title}" />',
        out, count=1
    )
    out = re.sub(
        r'<meta\s+name="twitter:description"[^>]*>',
        f'<meta name="twitter:description" content="{safe_desc}" />',
        out, count=1
    )
    out = re.sub(
        r'<meta\s+name="twitter:image"[^>]*>',
        f'<meta name="twitter:image" content="{image_url}" />',
        out, count=1
    )

    # Inject JSON-LD right before </head>
    json_ld = build_json_ld(product, lang)
    ld_script = f'<script type="application/ld+json" id="product-jsonld">{json_ld}</script>'

    # BreadcrumbList JSON-LD
    products_label = {"en": "Products", "fr": "Produits", "ar": "المنتجات"}[lang]
    home_url = f"{HOST}{prefix}/"
    products_url = f"{HOST}{prefix}/products.html"
    breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "SMART ELECTRICITY", "item": home_url},
            {"@type": "ListItem", "position": 2, "name": products_label, "item": products_url},
            {"@type": "ListItem", "position": 3, "name": title, "item": canonical_url},
        ],
    }
    bc_script = f'<script type="application/ld+json" id="breadcrumb-jsonld">{json.dumps(breadcrumb, ensure_ascii=False)}</script>'

    # og:locale tags
    og_locale = OG_LOCALES[lang]
    alt_locales = "".join(
        f'\n  <meta property="og:locale:alternate" content="{OG_LOCALES[l]}" />'
        for l in LANGS if l != lang
    )
    locale_tags = f'<meta property="og:locale" content="{og_locale}" />{alt_locales}'

    inject = f"  {locale_tags}\n  {ld_script}\n  {bc_script}\n  </head>"
    out = out.replace("</head>", inject, 1)

    return out


def generate_sitemap(all_product_ids):
    """Generate sitemap.xml including all static pages + all product pages."""
    urls = []

    # Static pages
    static_pages = [
        {"suffix": "", "file": "index.html"},  # Home
        {"suffix": "previous-work.html", "file": "previous-work.html"},
        {"suffix": "products.html", "file": "products.html"},
    ]

    for page in static_pages:
        for lang in LANGS:
            prefix = "" if lang == "en" else f"/{lang}"
            loc = f"{HOST}{prefix}/{page['suffix']}"
            en_href = f"{HOST}/{page['suffix']}"
            fr_href = f"{HOST}/fr/{page['suffix']}"
            ar_href = f"{HOST}/ar/{page['suffix']}"
            urls.append(
                f"  <url>\n"
                f"    <loc>{loc}</loc>\n"
                f'    <xhtml:link rel="alternate" hreflang="en" href="{en_href}" />\n'
                f'    <xhtml:link rel="alternate" hreflang="fr" href="{fr_href}" />\n'
                f'    <xhtml:link rel="alternate" hreflang="ar" href="{ar_href}" />\n'
                f"  </url>"
            )

    # Product pages
    for pid in sorted(all_product_ids):
        for lang in LANGS:
            prefix = "" if lang == "en" else f"/{lang}"
            loc = f"{HOST}{prefix}/products/{pid}.html"
            en_href = f"{HOST}/products/{pid}.html"
            fr_href = f"{HOST}/fr/products/{pid}.html"
            ar_href = f"{HOST}/ar/products/{pid}.html"
            urls.append(
                f"  <url>\n"
                f"    <loc>{loc}</loc>\n"
                f'    <xhtml:link rel="alternate" hreflang="en" href="{en_href}" />\n'
                f'    <xhtml:link rel="alternate" hreflang="fr" href="{fr_href}" />\n'
                f'    <xhtml:link rel="alternate" hreflang="ar" href="{ar_href}" />\n'
                f"  </url>"
            )

    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(urls) + "\n"
        "</urlset>\n"
    )
    return sitemap


def main():
    # Read the product.html template
    if not TEMPLATE_PATH.exists():
        print(f"ERROR: Template {TEMPLATE_PATH} not found!")
        return

    template_html = TEMPLATE_PATH.read_text(encoding="utf-8")

    # Load all product JSON files
    product_files = sorted(glob.glob(str(PRODUCTS_DIR / "*.json")))
    if not product_files:
        print("No product files found.")
        return

    all_product_ids = []
    products = []

    for pf in product_files:
        with open(pf, "r", encoding="utf-8") as f:
            data = json.load(f)
        products.append(data)
        all_product_ids.append(data.get("id"))

    print(f"Found {len(products)} products.")

    # Generate static HTML for each product in each language
    for product in products:
        pid = product.get("id")
        for lang in LANGS:
            # Determine output directory
            if lang == "en":
                out_dir = ROOT / "products"
            else:
                out_dir = ROOT / lang / "products"

            out_dir.mkdir(parents=True, exist_ok=True)
            out_path = out_dir / f"{pid}.html"

            page_html = generate_product_html(template_html, product, lang)
            out_path.write_text(page_html, encoding="utf-8")
            print(f"  OK {out_path.relative_to(ROOT)}")

    # Generate sitemap.xml
    sitemap = generate_sitemap(all_product_ids)
    sitemap_path = ROOT / "sitemap.xml"
    sitemap_path.write_text(sitemap, encoding="utf-8")
    print(f"\nOK Generated sitemap.xml with {len(all_product_ids) * 3} product URLs + static pages.")

    print("\nDONE! All static SEO pages generated successfully.")


if __name__ == "__main__":
    main()
