#!/usr/bin/env python3
"""
Generate localized static HTML pages from the main root HTML files and locale JSON files.
Creates `/fr/` and `/ar/` versions of root HTML files.

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
LOCALES = ROOT / 'assets' / 'locales'
# default host placeholder; can be overridden with --host or env
HOST = 'https://smartelectricity.ma'


def load_locale(lang):
    p = LOCALES / f'{lang}.json'
    if not p.exists():
        raise FileNotFoundError(p)
    return json.loads(p.read_text(encoding='utf-8'))


def replace_head(html, dict_l, lang, filename):
    # set <html lang="..."> while preserving other attributes like dir="rtl"
    def repl_html(match):
        tag = match.group(0)
        # Update lang attribute
        if 'lang=' in tag:
            tag = re.sub(r'lang="[a-zA-Z-]*"', f'lang="{lang}"', tag)
        else:
            tag = tag.replace('<html', f'<html lang="{lang}"')

        # Handle dir attribute for Arabic
        if lang == 'ar':
            if 'dir=' in tag:
                tag = re.sub(r'dir="[a-z]*"', 'dir="rtl"', tag)
            else:
                tag = tag.replace('<html', '<html dir="rtl"')
        else:
            # For en/fr, ensure it's ltr or remove dir if it's there
            if 'dir=' in tag:
                tag = re.sub(r'dir="[a-z]*"', 'dir="ltr"', tag)
        return tag

    html = re.sub(r"<html[^>]*>", repl_html, html, count=1)

    stem = Path(filename).stem
    key_suffix = stem.replace('-', '_')
    title_key = f'page_title_{key_suffix}'
    desc_key = f'meta_description_{key_suffix}'

    # title: prefers page-specific key, fallback to spa_site_title or dict_l.get('title')
    title_val = dict_l.get(title_key) or dict_l.get('spa_site_title') or dict_l.get('title')
    # include data-i18n-title so client-side loader can manage titles consistently
    html = re.sub(r"<title[^>]*>.*?</title>", f'<title data-i18n-title="{title_key}">{title_val}</title>', html, flags=re.S, count=1)

    # meta description (meta[name="description"])
    meta_desc = dict_l.get(desc_key) or dict_l.get('spa_intro') or ''
    html = re.sub(r'<meta\s+name="description"[^>]*>', f'<meta name="description" content="{meta_desc}" data-i18n-meta="{desc_key}">', html, count=1)

    # meta keywords (meta[name="keywords"])
    keywords_key = f'meta_keywords_{key_suffix}'
    meta_keywords = dict_l.get(keywords_key) or ''
    if meta_keywords:
        html = re.sub(r'<meta\s+name="keywords"[^>]*>', f'<meta name="keywords" content="{meta_keywords}">', html, count=1)

    # og:title / og:description / twitter:title / twitter:description
    html = re.sub(r'<meta\s+property="og:title"[^>]*>', f'<meta property="og:title" content="{title_val}" />', html, count=1)
    html = re.sub(r'<meta\s+property="og:description"[^>]*>', f'<meta property="og:description" content="{meta_desc}" />', html, count=1)
    html = re.sub(r'<meta\s+name="twitter:title"[^>]*>', f'<meta name="twitter:title" content="{title_val}" />', html, count=1)
    html = re.sub(r'<meta\s+name="twitter:description"[^>]*>', f'<meta name="twitter:description" content="{meta_desc}" />', html, count=1)

    # rel alternates: canonical should point to the language root (with trailing slash) or the specific file
    page_suffix = "" if filename == 'index.html' else filename
    def get_url(l, suffix):
        b = f"{HOST}/{l}/" if l != 'en' else f"{HOST}/"
        return b + suffix

    canonical = get_url(lang, page_suffix)
    html = re.sub(r'<link rel="canonical" href="[^"]*"\s*/?>', f'<link rel="canonical" href="{canonical}" />', html, count=1)

    # update link alternates to absolute host
    en_alt = get_url('en', page_suffix)
    fr_alt = get_url('fr', page_suffix)
    ar_alt = get_url('ar', page_suffix)
    alternates = (
        f"<link rel=\"alternate\" hreflang=\"en\" href=\"{en_alt}\" />\n"
        f"    <link rel=\"alternate\" hreflang=\"fr\" href=\"{fr_alt}\" />\n"
        f"    <link rel=\"alternate\" hreflang=\"ar\" href=\"{ar_alt}\" />"
    )
    html = re.sub(r'<!-- Language alternates for SEO -->[\s\S]*?<link rel="canonical"', f'<!-- Language alternates for SEO -->\n    {alternates}\n    <link rel="canonical"', html, count=1)

    # ensure og:url reflects the localized canonical
    html = re.sub(r'<meta\s+property="og:url"[^>]*>', f'<meta property="og:url" content="{canonical}" />', html, count=1)

    # JSON-LD: replace description and url
    def repl_ld(match):
        text = match.group(0)
        text = re.sub(r'"description"\s*:\s*"[^"]*"', f'"description": "{meta_desc}"', text, count=1)
        text = re.sub(r'"url"\s*:\s*"[^"]*"', f'"url": "{canonical}"', text, count=1)
        return text
    html = re.sub(r'<script type="application/ld\+json">[\s\S]*?</script>', repl_ld, html, count=1)

    return html


def replace_body_static(html, dict_l, lang):
    # Static translations for elements with data-i18n
    # We match the opening tag with data-i18n and then everything until the next closing tag of any kind
    # This is still a bit fragile but better than before.
    # It assumes data-i18n is the last attribute or we stop at >.
    def repl_i18n(match):
        full_tag = match.group(0)
        key = match.group(1)
        if key in dict_l:
            # We want to replace the content AFTER the >
            # Find the first > that closes the tag with data-i18n
            tag_end_index = full_tag.find('>')
            if tag_end_index != -1:
                opening_tag = full_tag[:tag_end_index+1]
                return f'{opening_tag}{dict_l[key]}'
        return full_tag

    # Match <tag ... data-i18n="key" ...>Content
    # Using a non-greedy match for the content until the next tag starts
    html = re.sub(r'<[^>]+data-i18n="([^"]+)"[^>]*>[^<]*', repl_i18n, html)

    # Translate language switcher buttons
    lang_word = { 'en': 'Language', 'fr': 'Langue', 'ar': 'اللغة' }
    word = lang_word.get(lang, 'Language')

    # Replace "Language ▾" and "Language" in buttons
    # We look for the specific buttons by ID to be safe
    html = re.sub(r'(<button id="langDesktopBtn"[^>]*>)\s*Language ▾\s*(</button>)', fr'\1{word} ▾\2', html)
    html = re.sub(r'(<button id="langToggleBtn"[^>]*>)\s*Language\s*(</button>)', fr'\1{word}\2', html)
    # And the visually hidden label (for index.html and 404.html)
    html = re.sub(r'(<label for="langSelect(?:404)?" class="visually-hidden">)Language(</label>)', fr'\1{word}\2', html)

    return html


def generate():
    # Find all .html files in root, excluding those that shouldn't be localized
    exclude = []
    files_to_localize = [f.name for f in ROOT.glob('*.html') if f.name not in exclude]

    en = load_locale('en')

    # sitemap collector
    sitemap_urls = []

    for filename in files_to_localize:
        source_path = ROOT / filename
        base_html = source_path.read_text(encoding='utf-8')

        for lang in ['en', 'fr', 'ar']:
            page_suffix = "" if filename == 'index.html' else filename
            def get_url(l, suffix):
                # Ensure we don't have double slashes if suffix is empty
                b = f"{HOST}/{l}/" if l != 'en' else f"{HOST}/"
                return b + suffix

            loc = get_url(lang, page_suffix)
            if filename != '404.html':
                alts = [
                    f'    <xhtml:link rel="alternate" hreflang="en" href="{get_url("en", page_suffix)}" />',
                    f'    <xhtml:link rel="alternate" hreflang="fr" href="{get_url("fr", page_suffix)}" />',
                    f'    <xhtml:link rel="alternate" hreflang="ar" href="{get_url("ar", page_suffix)}" />'
                ]
                sitemap_urls.append(f"  <url>\n    <loc>{loc}</loc>\n" + "\n".join(alts) + "\n  </url>")

            if lang == 'en':
                continue # source is already English

            # Output directory for localized versions
            outdir = ROOT / lang
            dict_l = {**en, **load_locale(lang)}
            out_html = replace_head(base_html, dict_l, lang, filename)
            out_html = replace_body_static(out_html, dict_l, lang)

            outdir.mkdir(parents=True, exist_ok=True)
            target = outdir / filename

            # Write safely using a temporary file
            fd, tmp_path = tempfile.mkstemp(dir=str(outdir), text=True)
            with open(fd, 'w', encoding='utf-8') as f:
                f.write(out_html)
            shutil.move(tmp_path, str(target))
            print('Wrote', target)

    sitemap = f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
{"\n".join(sitemap_urls)}
</urlset>
'''
    (ROOT / 'sitemap.xml').write_text(sitemap, encoding='utf-8')
    print('Wrote sitemap.xml')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate localized pages for /fr and /ar')
    parser.add_argument('--host', help='Public host (e.g. https://example.com). Overrides HOST constant.', default=None)
    args = parser.parse_args()
    if args.host:
        HOST = args.host.rstrip('/')
    generate()
