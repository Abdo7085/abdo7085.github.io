#!/usr/bin/env python3
"""
Build the article pages' head: articles/<id>.html, fr/articles/<id>.html, ar/articles/<id>.html.

For every data/articles/*.json this writes the page from the brand.html template with its
title, meta description (the summary), canonical, hreflang, Open Graph (og:type article) and
JSON-LD (Article + BreadcrumbList), and puts an ItemList of every article into articles.html.
The page body is written by build_article_pages.py, via build_layout.py, which runs after this
stage. Pages whose article file is gone are deleted; sitemap.xml lists the rest.

Usage:
    python scripts/build_articles.py
"""

from __future__ import annotations

import html as html_module
import json
import re

import _lib
import validate
from _lib import HOST, LANGS, OG_LOCALES, ROOT, t, write_sitemap
from build_article_pages import load_all

TEMPLATE_PATH = ROOT / "brand.html"
LABEL = {"en": "Articles", "fr": "Articles", "ar": "المقالات"}


def description(a: dict, lang: str) -> str:
    return _lib.make_meta_description({"description": a.get("summary")}, lang)


def jsonld(a: dict, lang: str, canonical: str, desc: str) -> list:
    prefix = "" if lang == "en" else f"/{lang}"
    org = {"@type": "Organization", "name": "S‑ELECTRICITY", "url": f"{HOST}/",
           "logo": {"@type": "ImageObject", "url": f"{HOST}/assets/android-chrome-512x512.png"}}
    protocols = {f.stem: json.loads(f.read_text(encoding="utf-8")) for f in (ROOT / "data" / "protocols").glob("*.json")}
    art = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": t(a["title"], lang),
        "description": desc,
        "datePublished": a["date"],
        "dateModified": a["date"],
        "inLanguage": lang,
        "mainEntityOfPage": canonical,
        "author": org,
        "publisher": org,
        "about": [{"@type": "Thing", "name": protocols[x]["name"], "url": f"{HOST}{prefix}/protocols/{x}.html"}
                  for x in a.get("protocols") or [] if x in protocols],
    }
    crumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "S‑ELECTRICITY", "item": f"{HOST}{prefix}/"},
            {"@type": "ListItem", "position": 2, "name": LABEL[lang], "item": f"{HOST}{prefix}/articles.html"},
            {"@type": "ListItem", "position": 3, "name": t(a["title"], lang), "item": canonical},
        ],
    }
    return [art, crumbs]


def page_html(template: str, a: dict, lang: str) -> str:
    aid = a["id"]
    title = _lib.page_title(t(a.get("seo_title"), lang) or t(a["title"], lang), lang)
    desc = description(a, lang)
    s_title = html_module.escape(title, quote=True)
    s_desc = html_module.escape(desc, quote=True)
    prefix = "" if lang == "en" else f"/{lang}"
    canonical = f"{HOST}{prefix}/articles/{aid}.html"
    urls = {l: f"{HOST}{'' if l == 'en' else '/' + l}/articles/{aid}.html" for l in LANGS}
    image = f"{HOST}/assets/android-chrome-512x512.png"

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
        (r'<meta\s+property="og:type"[^>]*>', '<meta property="og:type" content="article" />'),
        (r'<meta\s+property="og:image"[^>]*>', f'<meta property="og:image" content="{image}" id="meta-og-image" />'),
        (r'<meta\s+name="twitter:title"[^>]*>', f'<meta name="twitter:title" content="{s_title}" id="meta-twitter-title" />'),
        (r'<meta\s+name="twitter:description"[^>]*>', f'<meta name="twitter:description" content="{s_desc}" id="meta-twitter-description" />'),
        (r'<meta\s+name="twitter:image"[^>]*>', f'<meta name="twitter:image" content="{image}" id="meta-twitter-image" />'),
    ]
    for pat, rep in subs:
        out, n = re.subn(pat, lambda m: rep, out, count=1, flags=re.S)
        if not n:
            raise SystemExit(f"build_articles: brand.html has no tag matching {pat}")

    ld = "".join(f'\n  <script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>'
                 for x in jsonld(a, lang, canonical, desc))
    locales = f'<meta property="og:locale" content="{OG_LOCALES[lang]}" />' + "".join(
        f'\n  <meta property="og:locale:alternate" content="{OG_LOCALES[l]}" />' for l in LANGS if l != lang)
    out = out.replace("</head>", f"  {locales}{ld}\n  </head>", 1)
    out = out.replace(
        '<p>S‑ELECTRICITY - Smart Home Solutions</p>',
        f'<h1>{html_module.escape(t(a["title"], lang))}</h1>\n      <p>{html_module.escape(t(a["summary"], lang))}</p>\n'
        '      <p>S‑ELECTRICITY - Smart Home Solutions</p>', 1)
    return out


def inject_list_itemlist(arts: list) -> None:
    """ItemList JSON-LD in articles.html (en/fr/ar): one entry per article, newest first."""
    for lang in LANGS:
        path = ROOT / "articles.html" if lang == "en" else ROOT / lang / "articles.html"
        if not path.exists():
            continue
        prefix = "" if lang == "en" else f"/{lang}"
        ld = {"@context": "https://schema.org", "@type": "ItemList", "name": LABEL[lang],
              "numberOfItems": len(arts),
              "itemListElement": [{"@type": "ListItem", "position": i, "url": f"{HOST}{prefix}/articles/{a['id']}.html",
                                   "name": t(a["title"], lang)} for i, a in enumerate(arts, 1)]}
        html = path.read_text(encoding="utf-8")
        html = re.sub(r'^[ \t]*<script type="application/ld\+json" id="articles-itemlist-jsonld">.*?</script>[ \t]*(?:\r?\n)?',
                      '', html, flags=re.S | re.M)
        tag = f'<script type="application/ld+json" id="articles-itemlist-jsonld">{json.dumps(ld, ensure_ascii=False)}</script>'
        path.write_text(html.replace("</head>", f"  {tag}\n  </head>", 1), encoding="utf-8")


def main():
    print("=== Building article pages ===\n")
    validate.ensure()
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    arts = load_all()
    for a in arts:
        for lang in LANGS:
            folder = ROOT / "articles" if lang == "en" else ROOT / lang / "articles"
            folder.mkdir(parents=True, exist_ok=True)
            path = folder / f"{a['id']}.html"
            path.write_text(page_html(template, a, lang), encoding="utf-8")
            print(f"  OK {path.relative_to(ROOT)}")
    inject_list_itemlist(arts)
    for page in _lib.remove_orphan_pages("articles", [a.get("id") for a in arts]):
        print(f"  Removed {page} (its article file is gone)")
    write_sitemap()
    print("\n=== Article build complete. ===")


if __name__ == "__main__":
    main()
