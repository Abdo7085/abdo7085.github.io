#!/usr/bin/env python3
"""
Generate localized static HTML pages from the main `index.html` and locale JSON files.
Creates `/fr/index.html` and `/ar/index.html` by default.

Usage:
  python scripts/generate_localized.py

Requires Python 3.8+
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / 'index.html'
LOCALES = ROOT / 'assets' / 'locales'
OUT_DIRS = [('fr', ROOT / 'fr'), ('ar', ROOT / 'ar')]
HOST = 'https://example.com'  # change to your real host before deploying


def load_locale(lang):
    p = LOCALES / f'{lang}.json'
    if not p.exists():
        raise FileNotFoundError(p)
    return json.loads(p.read_text(encoding='utf-8'))


def read_index():
    return INDEX.read_text(encoding='utf-8')


def replace_head(html, dict_l, lang):
    # set <html lang="...">
    html = re.sub(r"<html[^>]*lang=\"[a-zA-Z-]+\"[^>]*>", f'<html lang="{lang}">', html, count=1)

    # title: prefers page_title_index, fallback to spa_site_title or dict_l.get('title')
    title_val = dict_l.get('page_title_index') or dict_l.get('spa_site_title') or dict_l.get('title')
    html = re.sub(r"<title[^>]*>.*?</title>", f'<title>{title_val}</title>', html, flags=re.S, count=1)

    # meta description (meta[name="description"])
    meta_desc = dict_l.get('meta_description_index') or dict_l.get('spa_intro') or ''
    html = re.sub(r'<meta\s+name="description"[^>]*>', f'<meta name="description" content="{meta_desc}" data-i18n-meta="meta_description_index">', html, count=1)

    # og:title / og:description / twitter:title / twitter:description
    html = re.sub(r'<meta\s+property="og:title"[^>]*>', f'<meta property="og:title" content="{title_val}" />', html, count=1)
    html = re.sub(r'<meta\s+property="og:description"[^>]*>', f'<meta property="og:description" content="{meta_desc}" />', html, count=1)
    html = re.sub(r'<meta\s+name="twitter:title"[^>]*>', f'<meta name="twitter:title" content="{title_val}" />', html, count=1)
    html = re.sub(r'<meta\s+name="twitter:description"[^>]*>', f'<meta name="twitter:description" content="{meta_desc}" />', html, count=1)

    # JSON-LD: replace the description value if present
    def repl_ld(match):
        text = match.group(0)
        text = re.sub(r'"description"\s*:\s*"[^"]*"', f'"description": "{meta_desc}"', text, count=1)
        return text
    html = re.sub(r'<script type="application/ld\+json">[\s\S]*?</script>', repl_ld, html, count=1)

    # rel alternates: keep, but ensure canonical points to language root
    html = re.sub(r'<link rel="canonical" href="[^"]*"\s*/?>', f'<link rel="canonical" href="{HOST}/{lang if lang!="en" else ""}" />', html, count=1)

    # update link alternates to absolute host (keep all three)
    alternates = f"<link rel=\"alternate\" hreflang=\"en\" href=\"{HOST}/\" />\n    <link rel=\"alternate\" hreflang=\"fr\" href=\"{HOST}/fr/\" />\n    <link rel=\"alternate\" hreflang=\"ar\" href=\"{HOST}/ar/\" />"
    html = re.sub(r'<!-- Language alternates for SEO -->[\s\S]*?<link rel="canonical"', f'<!-- Language alternates for SEO -->\n    {alternates}\n    <link rel="canonical"', html, count=1)

    return html


def generate():
    base = read_index()
    en = load_locale('en')
    for lang, outdir in OUT_DIRS:
        dict_l = {**en, **load_locale(lang)}
        out_html = replace_head(base, dict_l, lang)

        # ensure head contains hreflang alternates and canonical as absolute URLs
        # write file
        outdir.mkdir(parents=True, exist_ok=True)
        (outdir / 'index.html').write_text(out_html, encoding='utf-8')
        print('Wrote', outdir / 'index.html')

    # generate a simple sitemap with hreflang entries
    sitemap = f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>{HOST}/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="{HOST}/" />
    <xhtml:link rel="alternate" hreflang="fr" href="{HOST}/fr/" />
    <xhtml:link rel="alternate" hreflang="ar" href="{HOST}/ar/" />
  </url>
  <url>
    <loc>{HOST}/fr/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="{HOST}/" />
    <xhtml:link rel="alternate" hreflang="fr" href="{HOST}/fr/" />
    <xhtml:link rel="alternate" hreflang="ar" href="{HOST}/ar/" />
  </url>
  <url>
    <loc>{HOST}/ar/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="{HOST}/" />
    <xhtml:link rel="alternate" hreflang="fr" href="{HOST}/fr/" />
    <xhtml:link rel="alternate" hreflang="ar" href="{HOST}/ar/" />
  </url>
</urlset>
'''
    (ROOT / 'sitemap.xml').write_text(sitemap, encoding='utf-8')
    print('Wrote sitemap.xml')


if __name__ == '__main__':
    generate()
