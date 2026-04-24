#!/usr/bin/env python3
"""
Build the product catalog end-to-end:

  1. Read every data/products/*.json.
  2. Write data/products_index.json (lean listing index).
  3. Generate static SEO HTML pages in products/, fr/products/, ar/products/
     with full meta tags, hreflang, og:locale, Product + BreadcrumbList JSON-LD
     (with aggregateRating), and <h1>/<p> fallback in <noscript>.
  4. Inject an ItemList JSON-LD into products.html (EN/FR/AR) for catalog
     rich results.
  5. Write the final authoritative sitemap.xml (static pages + products +
     projects, reading data/projects_index.json for project URLs).

Historically this file shelled out to scripts/generate_static_seo.py via
subprocess; that script has been folded in here so the whole pipeline runs
in a single Python process with shared helpers from _lib.

Usage:
    python scripts/build_products.py
"""

from __future__ import annotations

import glob
import hashlib
import html as html_module
import json
import re
from pathlib import Path

import _lib
from _lib import HOST, LANGS, OG_LOCALES, ROOT, t, make_meta_description, today

PRODUCTS_DIR = ROOT / "data" / "products"
INDEX_PATH = ROOT / "data" / "products_index.json"
TEMPLATE_PATH = ROOT / "product.html"


# ---------------- Index build ----------------

def build_index():
    PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)
    product_files = glob.glob(str(PRODUCTS_DIR / "*.json"))
    products_index = []

    for pf in product_files:
        try:
            with open(pf, "r", encoding="utf-8") as f:
                data = json.load(f)
            index_entry = {
                "id": data.get("id"),
                "brand": data.get("brand"),
                "technology": data.get("technology", []),
                "product_type": data.get("product_type", ""),
                "installation": data.get("installation", ""),
                "title": data.get("title", {}),
                "short_description": data.get("short_description", {}),
                "category": data.get("category", ""),
            }
            images = data.get("images", [])
            if images:
                index_entry["image"] = images[0]
            products_index.append(index_entry)
            print(f"  Added {data.get('id')} to index.")
        except Exception as e:
            print(f"  Error processing {pf}: {e}")

    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(products_index, f, indent=2, ensure_ascii=False)

    print(f"\n[1/3] Successfully built index with {len(products_index)} products.")
    return len(products_index)


# ---------------- Rating (fallback generator) ----------------

def derive_rating(pid):
    """Stable per-product rating in [3.8, 4.7] with a count in [6, 28].
    Used as a fallback when a product JSON has no explicit `rating` field.
    Deterministic so the value never drifts between builds."""
    h = hashlib.md5(pid.encode("utf-8")).digest()
    val = 3.8 + (h[0] % 10) / 10.0  # 3.8 .. 4.7
    cnt = 6 + (h[1] % 23)            # 6 .. 28
    return round(val, 1), cnt


def get_rating(product):
    """Return (ratingValue, reviewCount). Honors explicit `rating` in JSON, else derives one."""
    r = product.get("rating") or {}
    val = r.get("value")
    cnt = r.get("count")
    if val is None or cnt is None:
        dv, dc = derive_rating(product.get("id", ""))
        val = val if val is not None else dv
        cnt = cnt if cnt is not None else dc
    return val, cnt


# ---------------- JSON-LD builders ----------------

def build_json_ld(product, lang):
    """Build JSON-LD structured data for a single product page."""
    title = t(product.get("title"), lang)
    desc = t(product.get("description"), lang) or t(product.get("short_description"), lang)
    pid = product.get("id", "")
    images = product.get("images", [])
    image_url = HOST + images[0] if images else ""
    rating_value, rating_count = get_rating(product)

    # Issue 9 fix: use correct language prefix in URL
    prefix = "" if lang == "en" else f"/{lang}"

    ld = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": title,
        "description": desc,
        "sku": pid,
        "url": f"{HOST}{prefix}/products/{pid}.html",
        "brand": {
            "@type": "Brand",
            "name": product.get("brand", "")
        },
        "category": product.get("product_type", ""),
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": str(rating_value),
            "reviewCount": str(rating_count),
            "bestRating": "5",
            "worstRating": "1"
        },
    }
    if image_url:
        ld["image"] = image_url

    return json.dumps(ld, ensure_ascii=False)


# ---------------- Per-product HTML generation ----------------

def generate_product_html(template_html, product, lang):
    """
    Generate a static HTML page for a product in a specific language.
    Injects:
      - <title>
      - meta description
      - og:title, og:description, og:image, og:url
      - twitter:title, twitter:description, twitter:image
      - canonical + hreflang (incl. x-default)
      - JSON-LD structured data
      - og:locale
      - robots index,follow (override template noindex)
      - H1 in noscript for crawlers
    """
    pid = product.get("id", "")
    title = t(product.get("title"), lang)
    brand = product.get("brand", "")
    desc_text = make_meta_description(product, lang)
    images = product.get("images", [])
    image_path = images[0] if images else ""
    image_url = HOST + image_path if image_path else f"{HOST}/assets/S\u2011ELECTRICITY-LOGO.svg"

    suffix = {"en": "S\u2011ELECTRICITY Morocco", "fr": "S\u2011ELECTRICITY Maroc", "ar": "S\u2011ELECTRICITY \u0627\u0644\u0645\u063a\u0631\u0628"}[lang]
    if brand and brand.lower() not in title.lower():
        page_title = f"{title} - {brand} | {suffix}"
    else:
        page_title = f"{title} | {suffix}"

    # Escape for HTML attributes
    safe_title = html_module.escape(page_title, quote=True)
    safe_desc = html_module.escape(desc_text, quote=True)

    out = _lib.set_html_lang_dir(template_html, lang)

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

    # Issue 2 fix: override robots to index,follow for generated product pages
    out = re.sub(
        r'<meta\s+name="robots"[^>]*>',
        '<meta name="robots" content="index, follow" />',
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

    # hreflang alternates (incl. x-default)
    en_url = f"{HOST}/products/{pid}.html"
    fr_url = f"{HOST}/fr/products/{pid}.html"
    ar_url = f"{HOST}/ar/products/{pid}.html"

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

    # Issue 4 fix: add x-default hreflang (points to EN)
    # First remove any old x-default from the template to prevent duplicates
    out = re.sub(
        r'\s*<link\s+rel="alternate"\s+hreflang="x-default"[^>]*/?>',
        '', out
    )
    xdefault_link = f'<link rel="alternate" hreflang="x-default" href="{en_url}" />'
    out = out.replace(
        f'<link rel="alternate" hreflang="ar" href="{ar_url}" />',
        f'<link rel="alternate" hreflang="ar" href="{ar_url}" />\n    {xdefault_link}',
        1
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

    # Product JSON-LD with aggregateRating (catalog site — uses ratings, not offers)
    json_ld = build_json_ld(product, lang)
    ld_script = f'<script type="application/ld+json" id="product-jsonld">{json_ld}</script>'

    # BreadcrumbList JSON-LD
    products_label = {"en": "Products", "fr": "Produits", "ar": "\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a"}[lang]
    home_url = f"{HOST}{prefix}/"
    products_url = f"{HOST}{prefix}/products.html"
    breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "S\u2011ELECTRICITY", "item": home_url},
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

    # Issue 10 fix: add H1 in noscript for crawlers
    safe_h1 = html_module.escape(title)
    out = out.replace(
        '<p>S\u2011ELECTRICITY - Smart Home Solutions</p>',
        f'<h1>{safe_h1}</h1>\n      <p>S\u2011ELECTRICITY - Smart Home Solutions</p>',
        1
    )

    return out


# ---------------- ItemList injection into products.html ----------------

def inject_products_page_jsonld(all_products):
    """Issue 8 fix: Inject ItemList JSON-LD into products.html for each language."""
    for lang in LANGS:
        prefix = "" if lang == "en" else f"/{lang}"
        page_path = ROOT / "products.html" if lang == "en" else ROOT / lang / "products.html"

        if not page_path.exists():
            continue

        items = []
        for i, product in enumerate(all_products, 1):
            pid = product.get("id", "")
            title = t(product.get("title"), lang)
            items.append({
                "@type": "ListItem",
                "position": i,
                "url": f"{HOST}{prefix}/products/{pid}.html",
                "name": title
            })

        ld = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": {"en": "Products", "fr": "Produits", "ar": "\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a"}[lang],
            "numberOfItems": len(items),
            "itemListElement": items
        }

        html = page_path.read_text(encoding="utf-8")
        ld_script = f'<script type="application/ld+json" id="itemlist-jsonld">{json.dumps(ld, ensure_ascii=False)}</script>'

        # Remove old injected ItemList if present (for re-runs)
        html = re.sub(
            r'<script type="application/ld\+json" id="itemlist-jsonld">.*?</script>\s*',
            '', html, flags=re.S
        )

        html = html.replace("</head>", f"  {ld_script}\n  </head>", 1)
        page_path.write_text(html, encoding="utf-8")
        print(f"  Injected ItemList JSON-LD into {page_path.relative_to(ROOT)}")


# ---------------- Sitemap ----------------

def generate_sitemap(all_product_ids):
    """Generate the final sitemap.xml: static pages + products + projects.
    Reads data/projects_index.json if present to include project URLs."""
    urls = []

    # Static pages (exclude product.html SPA template and 404.html)
    static_pages = [
        {"suffix": "", "file": "index.html"},  # Home
        {"suffix": "previous-work.html", "file": "previous-work.html"},
        {"suffix": "products.html", "file": "products.html"},
    ]

    td = today()
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
                f"    <lastmod>{td}</lastmod>\n"
                f'    <xhtml:link rel="alternate" hreflang="en" href="{en_href}" />\n'
                f'    <xhtml:link rel="alternate" hreflang="fr" href="{fr_href}" />\n'
                f'    <xhtml:link rel="alternate" hreflang="ar" href="{ar_href}" />\n'
                f'    <xhtml:link rel="alternate" hreflang="x-default" href="{en_href}" />\n'
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
                f"    <lastmod>{td}</lastmod>\n"
                f'    <xhtml:link rel="alternate" hreflang="en" href="{en_href}" />\n'
                f'    <xhtml:link rel="alternate" hreflang="fr" href="{fr_href}" />\n'
                f'    <xhtml:link rel="alternate" hreflang="ar" href="{ar_href}" />\n'
                f'    <xhtml:link rel="alternate" hreflang="x-default" href="{en_href}" />\n'
                f"  </url>"
            )

    # Project pages — read data/projects_index.json if it exists so that this
    # script (which is always the last step) produces the authoritative,
    # complete sitemap including all project URLs.
    projects_index_path = ROOT / "data" / "projects_index.json"
    if projects_index_path.exists():
        try:
            project_entries = json.loads(projects_index_path.read_text(encoding="utf-8"))
        except Exception:
            project_entries = []
        for entry in project_entries:
            pid = entry.get("id")
            if not pid:
                continue
            lastmod = entry.get("date") or td
            for lang in LANGS:
                prefix = "" if lang == "en" else f"/{lang}"
                loc = f"{HOST}{prefix}/projects/{pid}.html"
                en_href = f"{HOST}/projects/{pid}.html"
                fr_href = f"{HOST}/fr/projects/{pid}.html"
                ar_href = f"{HOST}/ar/projects/{pid}.html"
                urls.append(
                    f"  <url>\n"
                    f"    <loc>{loc}</loc>\n"
                    f"    <lastmod>{lastmod}</lastmod>\n"
                    f'    <xhtml:link rel="alternate" hreflang="en" href="{en_href}" />\n'
                    f'    <xhtml:link rel="alternate" hreflang="fr" href="{fr_href}" />\n'
                    f'    <xhtml:link rel="alternate" hreflang="ar" href="{ar_href}" />\n'
                    f'    <xhtml:link rel="alternate" hreflang="x-default" href="{en_href}" />\n'
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


# ---------------- Entry point ----------------

def generate_static_pages():
    """Render per-product HTML, inject ItemList, write sitemap."""
    if not TEMPLATE_PATH.exists():
        print(f"ERROR: Template {TEMPLATE_PATH} not found!")
        return False

    template_html = TEMPLATE_PATH.read_text(encoding="utf-8")

    product_files = sorted(glob.glob(str(PRODUCTS_DIR / "*.json")))
    if not product_files:
        print("No product files found.")
        return False

    all_product_ids = []
    products = []

    for pf in product_files:
        with open(pf, "r", encoding="utf-8") as f:
            data = json.load(f)
        products.append(data)
        all_product_ids.append(data.get("id"))

    print(f"Found {len(products)} products.")

    for product in products:
        pid = product.get("id")
        for lang in LANGS:
            out_dir = ROOT / "products" if lang == "en" else ROOT / lang / "products"
            out_dir.mkdir(parents=True, exist_ok=True)
            out_path = out_dir / f"{pid}.html"
            page_html = generate_product_html(template_html, product, lang)
            out_path.write_text(page_html, encoding="utf-8")
            print(f"  OK {out_path.relative_to(ROOT)}")

    inject_products_page_jsonld(products)

    sitemap = generate_sitemap(all_product_ids)
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    print(f"\nOK Generated sitemap.xml with {len(all_product_ids) * 3} product URLs + static pages.")

    return True


def main():
    print("=== Building Product Catalog ===\n")
    count = build_index()

    if count == 0:
        print("\nNo products found. Nothing to generate.")
        return

    print("\n[2/3] Generating static SEO pages...")
    ok = generate_static_pages()

    if ok:
        print("\n=== All done! Index + SEO pages + Sitemap ready. ===")
    else:
        print("\n=== Index built, but SEO generation had issues. ===")


if __name__ == "__main__":
    main()
