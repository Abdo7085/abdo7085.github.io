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
import argparse
import tempfile
import shutil

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / 'index.html'
LOCALES = ROOT / 'assets' / 'locales'
OUT_DIRS = [('fr', ROOT / 'fr'), ('ar', ROOT / 'ar')]
# default host placeholder; can be overridden with --host or env
HOST = 'https://example.com'


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
  # include data-i18n-title so client-side loader can manage titles consistently
  html = re.sub(r"<title[^>]*>.*?</title>", f'<title data-i18n-title="page_title_index">{title_val}</title>', html, flags=re.S, count=1)

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

  # rel alternates: canonical should point to the language root with trailing slash
  canonical = f"{HOST}/" if lang == 'en' else f"{HOST}/{lang}/"
  html = re.sub(r'<link rel="canonical" href="[^"]*"\s*/?>', f'<link rel="canonical" href="{canonical}" />', html, count=1)

  # update link alternates to absolute host (keep all three, trailing slashes)
  alternates = (
    f"<link rel=\"alternate\" hreflang=\"en\" href=\"{HOST}/\" />\n"
    f"    <link rel=\"alternate\" hreflang=\"fr\" href=\"{HOST}/fr/\" />\n"
    f"    <link rel=\"alternate\" hreflang=\"ar\" href=\"{HOST}/ar/\" />"
  )
  html = re.sub(r'<!-- Language alternates for SEO -->[\s\S]*?<link rel="canonical"', f'<!-- Language alternates for SEO -->\n    {alternates}\n    <link rel="canonical"', html, count=1)

  # ensure og:url and JSON-LD url reflect the localized canonical
  html = re.sub(r'<meta\s+property="og:url"[^>]*>', f'<meta property="og:url" content="{canonical}" />', html, count=1)
  def repl_ld(match):
    text = match.group(0)
    text = re.sub(r'"description"\s*:\s*"[^"]*"', f'"description": "{meta_desc}"', text, count=1)
    # also replace the url inside JSON-LD if present
    text = re.sub(r'"url"\s*:\s*"[^"]*"', f'"url": "{canonical}"', text, count=1)
    return text
  html = re.sub(r'<script type="application/ld\+json">[\s\S]*?</script>', repl_ld, html, count=1)

    return html


def generate():
    base = read_index()
    en = load_locale('en')
  for lang, outdir in OUT_DIRS:
    dict_l = {**en, **load_locale(lang)}
    out_html = replace_head(base, dict_l, lang)

    # write file atomically
    outdir.mkdir(parents=True, exist_ok=True)
    target = outdir / 'index.html'
    # write to temp file then move
    with tempfile.NamedTemporaryFile('w', delete=False, encoding='utf-8', dir=str(outdir)) as tf:
      tf.write(out_html)
      tmpname = tf.name
    shutil.move(tmpname, str(target))
    print('Wrote', target)

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
  parser = argparse.ArgumentParser(description='Generate localized pages for /fr and /ar')
  parser.add_argument('--host', help='Public host (e.g. https://example.com). Overrides HOST constant.', default=None)
  args = parser.parse_args()
  if args.host:
    # normalize host (no trailing slash)
    HOST = args.host.rstrip('/')
  generate()
