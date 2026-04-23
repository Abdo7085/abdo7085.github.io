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

import _lib
from _lib import ROOT, OG_LOCALES, SITEMAP_EXCLUDE, load_locale

# Default host placeholder; can be overridden with --host.
# (Duplicates _lib.HOST only so the --host CLI flag can rewrite it without
# mutating the shared module. See main() at the bottom.)
HOST = _lib.HOST


def replace_head(html, dict_l, lang, filename):
    html = _lib.set_html_lang_dir(html, lang)

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

    # update link alternates to absolute host (incl. x-default)
    en_alt = get_url('en', page_suffix)
    fr_alt = get_url('fr', page_suffix)
    ar_alt = get_url('ar', page_suffix)
    alternates = (
        f"<link rel=\"alternate\" hreflang=\"en\" href=\"{en_alt}\" />\n"
        f"    <link rel=\"alternate\" hreflang=\"fr\" href=\"{fr_alt}\" />\n"
        f"    <link rel=\"alternate\" hreflang=\"ar\" href=\"{ar_alt}\" />\n"
        f"    <link rel=\"alternate\" hreflang=\"x-default\" href=\"{en_alt}\" />"
    )
    html = re.sub(r'<!-- Language alternates for SEO -->[\s\S]*?<link rel="canonical"', f'<!-- Language alternates for SEO -->\n    {alternates}\n    <link rel="canonical"', html, count=1)

    # ensure og:url reflects the localized canonical
    html = re.sub(r'<meta\s+property="og:url"[^>]*>', f'<meta property="og:url" content="{canonical}" />', html, count=1)

    # Issue 5 fix: add/update og:locale tags
    og_locale = OG_LOCALES[lang]
    alt_locale_tags = "\n    ".join(
        f'<meta property="og:locale:alternate" content="{OG_LOCALES[l]}" />'
        for l in ["en", "fr", "ar"] if l != lang
    )
    locale_block = f'<meta property="og:locale" content="{og_locale}" />\n    {alt_locale_tags}'

    # Replace existing og:locale if present, otherwise insert before og:site_name
    if re.search(r'<meta\s+property="og:locale"', html):
        # Remove all existing og:locale and og:locale:alternate
        html = re.sub(r'\s*<meta\s+property="og:locale(?::alternate)?"[^>]*/>\s*', '\n    ', html)
    # Insert before og:site_name
    html = html.replace(
        '<meta property="og:site_name"',
        f'{locale_block}\n    <meta property="og:site_name"',
        1
    )

    # JSON-LD: update LocalBusiness (description + url) and WebSite (url + inLanguage).
    # Iterate across all JSON-LD blocks and mutate by @type.
    # FAQPage is handled separately in replace_faq_jsonld.
    def process_json_ld_block(text):
        json_match = re.search(r'<script type="application/ld\+json">\s*([\s\S]*?)\s*</script>', text)
        if not json_match:
            return text
        try:
            data = json.loads(json_match.group(1))
        except json.JSONDecodeError:
            return text

        t = data.get("@type")
        changed = False

        if t == "LocalBusiness" or (isinstance(t, list) and "LocalBusiness" in t):
            data["description"] = meta_desc
            data["url"] = canonical
            changed = True
        elif t == "WebSite":
            data["url"] = canonical
            # Narrow inLanguage to the specific language of this localized page
            data["inLanguage"] = lang
            changed = True

        if not changed:
            return text

        new_json = json.dumps(data, ensure_ascii=False, indent=10)
        return f'<script type="application/ld+json">\n      {new_json}\n    </script>'

    blocks = list(re.finditer(r'<script type="application/ld\+json">[\s\S]*?</script>', html))
    for block in reversed(blocks):  # reversed to keep indices valid
        content = block.group(0)
        if '"FAQPage"' in content:
            continue  # handled in replace_faq_jsonld
        replaced = process_json_ld_block(content)
        if replaced != content:
            html = html[:block.start()] + replaced + html[block.end():]

    return html


def replace_faq_jsonld(html, dict_l, lang):
    """Issue 1 fix: Translate FAQPage JSON-LD to the target language."""
    # Only process if FAQ keys exist in the locale
    if 'faq_q1' not in dict_l:
        return html

    def repl_faq(match):
        try:
            text = match.group(0)
            # Extract just the JSON content
            json_match = re.search(r'<script type="application/ld\+json">\s*([\s\S]*?)\s*</script>', text)
            if not json_match:
                return text
            data = json.loads(json_match.group(1))
            if data.get("@type") != "FAQPage":
                return text

            # Translate each FAQ entry
            for i, entity in enumerate(data.get("mainEntity", []), 1):
                q_key = f"faq_q{i}"
                a_key = f"faq_a{i}"
                if q_key in dict_l:
                    entity["name"] = dict_l[q_key]
                if a_key in dict_l:
                    entity["acceptedAnswer"]["text"] = dict_l[a_key]

            new_json = json.dumps(data, ensure_ascii=False, indent=10)
            return f'<script type="application/ld+json">\n      {new_json}\n    </script>'
        except (json.JSONDecodeError, KeyError):
            return text

    # Match ALL JSON-LD blocks and only replace the FAQPage one
    blocks = list(re.finditer(r'<script type="application/ld\+json">[\s\S]*?</script>', html))
    for block in reversed(blocks):  # reversed to keep indices valid
        content = block.group(0)
        if '"FAQPage"' in content:
            replaced = repl_faq(block)
            html = html[:block.start()] + replaced + html[block.end():]
            break

    return html


def replace_body_static(html, dict_l, lang):
    # Static translations for elements with data-i18n
    def repl_i18n(match):
        full_tag = match.group(0)
        key = match.group(1)
        if key in dict_l:
            tag_end_index = full_tag.find('>')
            if tag_end_index != -1:
                opening_tag = full_tag[:tag_end_index+1]
                return f'{opening_tag}{dict_l[key]}'
        return full_tag

    html = re.sub(r'<[^>]+data-i18n="([^"]+)"[^>]*>[^<]*', repl_i18n, html)

    # Translate language switcher buttons
    lang_word = { 'en': 'Language', 'fr': 'Langue', 'ar': 'اللغة' }
    word = lang_word.get(lang, 'Language')

    html = re.sub(r'(<button id="langDesktopBtn"[^>]*>)\s*Language ▾\s*(</button>)', fr'\1{word} ▾\2', html)
    html = re.sub(r'(<button id="langToggleBtn"[^>]*>)\s*Language\s*(</button>)', fr'\1{word}\2', html)
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
                b = f"{HOST}/{l}/" if l != 'en' else f"{HOST}/"
                return b + suffix

            loc = get_url(lang, page_suffix)

            # Only add to sitemap if not excluded
            if filename not in SITEMAP_EXCLUDE and filename != '404.html':
                en_href = get_url("en", page_suffix)
                fr_href = get_url("fr", page_suffix)
                ar_href = get_url("ar", page_suffix)
                alts = [
                    f'    <xhtml:link rel="alternate" hreflang="en" href="{en_href}" />',
                    f'    <xhtml:link rel="alternate" hreflang="fr" href="{fr_href}" />',
                    f'    <xhtml:link rel="alternate" hreflang="ar" href="{ar_href}" />',
                    f'    <xhtml:link rel="alternate" hreflang="x-default" href="{en_href}" />'
                ]
                sitemap_urls.append(f"  <url>\n    <loc>{loc}</loc>\n" + "\n".join(alts) + "\n  </url>")

            if lang == 'en':
                continue # source is already English

            # Output directory for localized versions
            outdir = ROOT / lang
            dict_l = {**en, **load_locale(lang)}
            out_html = replace_head(base_html, dict_l, lang, filename)
            out_html = replace_faq_jsonld(out_html, dict_l, lang)
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
