#!/usr/bin/env python3
"""
Build the protocol pages' head: protocols/<id>.html, fr/protocols/<id>.html, ar/protocols/<id>.html.

For every data/protocols/*.json this writes the page from the brand.html template with its
title, meta description, canonical, hreflang, Open Graph and JSON-LD (WebPage about the
protocol + BreadcrumbList + ItemList of its products). The page body is written by
build_protocol_pages.py, via build_layout.py, which runs after this stage.
Pages whose protocol file is gone are deleted; sitemap.xml lists the rest.

Usage:
    python scripts/build_protocols.py
"""

from __future__ import annotations

import html as html_module
import json
import re

import _lib
import validate
from _lib import HOST, LANGS, OG_LOCALES, ROOT, t, make_meta_description, write_sitemap
from build_protocol_pages import products_of

PROTOCOLS_DIR = ROOT / "data" / "protocols"
PRODUCTS_INDEX_PATH = ROOT / "data" / "products_index.json"
TEMPLATE_PATH = ROOT / "brand.html"


def load_all() -> list:
    return [json.loads(f.read_text(encoding="utf-8")) for f in sorted(PROTOCOLS_DIR.glob("*.json"))]


def jsonld(pr: dict, products: list, lang: str, canonical: str, desc: str) -> list:
    prefix = "" if lang == "en" else f"/{lang}"
    name = pr["name"]
    page = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": t(pr.get("seo_title"), lang) or name,
        "description": desc,
        "url": canonical,
        "inLanguage": lang,
        "about": {"@type": "Thing", "name": name, "description": t(pr.get("tagline"), lang)},
    }
    crumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "S‑ELECTRICITY", "item": f"{HOST}{prefix}/"},
            {"@type": "ListItem", "position": 2, "name": name, "item": canonical},
        ],
    }
    items = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": f"{name} products",
        "numberOfItems": len(products),
        "itemListElement": [
            {"@type": "ListItem", "position": i, "url": f"{HOST}{prefix}/products/{p.get('id', '')}.html",
             "name": t(p.get("title"), lang)}
            for i, p in enumerate(products, 1)
        ],
    }
    return [page, crumbs, items]


def page_html(template: str, pr: dict, products: list, lang: str) -> str:
    pid = pr["id"]
    title = _lib.page_title(t(pr.get("seo_title"), lang) or pr["name"], lang)
    desc = make_meta_description(pr, lang)
    s_title = html_module.escape(title, quote=True)
    s_desc = html_module.escape(desc, quote=True)
    prefix = "" if lang == "en" else f"/{lang}"
    canonical = f"{HOST}{prefix}/protocols/{pid}.html"
    urls = {l: f"{HOST}{'' if l == 'en' else '/' + l}/protocols/{pid}.html" for l in LANGS}
    image = HOST + pr["logo"] if pr.get("logo") else f"{HOST}/assets/S‑ELECTRICITY-LOGO.svg"

    out = _lib.set_html_lang_dir(template, lang)
    subs = [
        (r"<title[^>]*>.*?</title>", f"<title>{s_title}</title>"),
        (r'<meta\s+name="description"[^>]*>', f'<meta name="description" content="{s_desc}" id="meta-description" />'),
        (r'<meta\s+name="robots"[^>]*>', '<meta name="robots" content="index, follow" />'),
        (r'<link\s+rel="canonical"[^>]*>', f'<link rel="canonical" href="{canonical}" id="meta-canonical" />'),
        (r'<link\s+rel="alternate"\s+hreflang="en"[^>]*/?>', f'<link rel="alternate" hreflang="en" href="{urls["en"]}" />'),
        (r'<link\s+rel="alternate"\s+hreflang="fr"[^>]*/?>', f'<link rel="alternate" hreflang="fr" href="{urls["fr"]}" />'),
        (r'<link\s+rel="alternate"\s+hreflang="ar"[^>]*/?>', f'<link rel="alternate" hreflang="ar" href="{urls["ar"]}" />'),
        (r'<link\s+rel="alternate"\s+hreflang="x-default"[^>]*/?>', f'<link rel="alternate" hreflang="x-default" href="{urls["en"]}" />'),
        (r'<meta\s+property="og:title"[^>]*>', f'<meta property="og:title" content="{s_title}" id="meta-og-title" />'),
        (r'<meta\s+property="og:description"[^>]*>', f'<meta property="og:description" content="{s_desc}" id="meta-og-description" />'),
        (r'<meta\s+property="og:url"[^>]*>', f'<meta property="og:url" content="{canonical}" />'),
        (r'<meta\s+property="og:image"[^>]*>', f'<meta property="og:image" content="{image}" id="meta-og-image" />'),
        (r'<meta\s+name="twitter:title"[^>]*>', f'<meta name="twitter:title" content="{s_title}" id="meta-twitter-title" />'),
        (r'<meta\s+name="twitter:description"[^>]*>', f'<meta name="twitter:description" content="{s_desc}" id="meta-twitter-description" />'),
        (r'<meta\s+name="twitter:image"[^>]*>', f'<meta name="twitter:image" content="{image}" id="meta-twitter-image" />'),
    ]
    for pat, rep in subs:
        out, n = re.subn(pat, lambda m: rep, out, count=1, flags=re.S)
        if not n:
            raise SystemExit(f"build_protocols: brand.html has no tag matching {pat}")

    ld = "".join(f'\n  <script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>'
                 for x in jsonld(pr, products, lang, canonical, desc))
    locales = f'<meta property="og:locale" content="{OG_LOCALES[lang]}" />' + "".join(
        f'\n  <meta property="og:locale:alternate" content="{OG_LOCALES[l]}" />' for l in LANGS if l != lang)
    out = out.replace("</head>", f"  {locales}{ld}\n  </head>", 1)
    out = out.replace(
        '<p>S‑ELECTRICITY - Smart Home Solutions</p>',
        f'<h1>{html_module.escape(pr["name"])}</h1>\n      <p>{html_module.escape(t(pr.get("tagline"), lang))}</p>\n'
        '      <p>S‑ELECTRICITY - Smart Home Solutions</p>', 1)
    return out


def main():
    print("=== Building protocol pages ===\n")
    validate.ensure()
    products = json.loads(PRODUCTS_INDEX_PATH.read_text(encoding="utf-8"))
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    protocols = load_all()
    for pr in protocols:
        mine = products_of(pr, products)
        for lang in LANGS:
            folder = ROOT / "protocols" if lang == "en" else ROOT / lang / "protocols"
            folder.mkdir(parents=True, exist_ok=True)
            path = folder / f"{pr['id']}.html"
            path.write_text(page_html(template, pr, mine, lang), encoding="utf-8")
            print(f"  OK {path.relative_to(ROOT)}")
    for page in _lib.remove_orphan_pages("protocols", [pr.get("id") for pr in protocols]):
        print(f"  Removed {page} (its protocol file is gone)")
    write_sitemap()
    print("\n=== Protocol build complete. ===")


if __name__ == "__main__":
    main()
