"""
Shared helpers for the build pipeline.

Consumers: build_products.py, build_projects.py, generate_localized.py.
Image-pipeline scripts (remove_bg, crop_image, remove_bg_traditional) are
independent and do not import from here.

Kept deliberately as one file — there are only ~3 internal consumers, so
splitting into an i18n/seo/sitemap package would be premature.
"""

from __future__ import annotations

import functools
import html as html_module
import json
import re
from datetime import date
from pathlib import Path


# ---------------- Constants ----------------

HOST = "https://smartelectricity.ma"
LANGS = ("en", "fr", "ar")
OG_LOCALES = {"en": "en_US", "fr": "fr_FR", "ar": "ar_AR"}

ROOT = Path(__file__).resolve().parent.parent
LOCALES_DIR = ROOT / "assets" / "locales"

# Files that exist in the repo root but must NOT be emitted into sitemap.xml
# (SPA templates marked noindex, error pages, and search-engine verification pages).
SITEMAP_EXCLUDE = {"product.html", "project.html", "404.html"}


# ---------------- Date ----------------

def today() -> str:
    """Today's date as ISO-8601. Function (not module constant) so that long-running
    processes or imports at different times see a consistent `now`, not a frozen
    import-time value."""
    return date.today().isoformat()


# ---------------- Language helpers ----------------

def lang_prefix(lang: str) -> str:
    """URL path prefix for a given language. English is the default (no prefix)."""
    return "" if lang == "en" else f"/{lang}"


def t(obj, lang: str = "en") -> str:
    """Extract localized text from a {en,fr,ar} dict, falling back across languages.
    Returns the string unchanged if the input is already a string. Returns "" for
    None/empty."""
    if not obj:
        return ""
    if isinstance(obj, str):
        return obj
    return obj.get(lang) or obj.get("en") or obj.get("fr") or obj.get("ar") or ""


def make_meta_description(obj, lang: str, max_len: int = 160) -> str:
    """Build an SEO-safe meta description from a localized object.
    Prefers `description`, falls back to `short_description`. Truncates on a
    word boundary when possible and appends an ellipsis."""
    long_desc = t(obj.get("description"), lang)
    short_desc = t(obj.get("short_description"), lang)
    text = long_desc or short_desc or ""
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= max_len:
        return text
    cut = text[:max_len]
    sp = cut.rfind(" ")
    if sp > 80:
        cut = cut[:sp]
    return cut.rstrip(",.;:") + "…"


@functools.lru_cache(maxsize=8)
def load_locale(lang: str) -> dict:
    """Load assets/locales/{lang}.json. Returns {} if missing. Cached for the
    lifetime of the process — tests should call `load_locale.cache_clear()` between
    fixtures."""
    p = LOCALES_DIR / f"{lang}.json"
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding="utf-8"))


# ---------------- HTML tag mutation ----------------

def set_html_lang_dir(html: str, lang: str) -> str:
    """Rewrite the first <html …> tag's `lang` and `dir` attributes.

    Defensive: preserves existing attributes and only adds `lang=`/`dir=` when
    absent. For ar → dir="rtl", otherwise dir="ltr" (but only modifies dir if
    already present, to avoid polluting tags that legitimately omit it).
    """
    def repl(match):
        tag = match.group(0)
        if "lang=" in tag:
            tag = re.sub(r'lang="[a-zA-Z-]*"', f'lang="{lang}"', tag)
        else:
            tag = tag.replace("<html", f'<html lang="{lang}"')
        if lang == "ar":
            if "dir=" in tag:
                tag = re.sub(r'dir="[a-z]*"', 'dir="rtl"', tag)
            else:
                tag = tag.replace("<html", '<html dir="rtl"')
        else:
            if "dir=" in tag:
                tag = re.sub(r'dir="[a-z]*"', 'dir="ltr"', tag)
        return tag

    return re.sub(r"<html[^>]*>", repl, html, count=1)


# ---------------- hreflang ----------------

def hreflang_urls(path_suffix: str) -> dict:
    """Return the canonical {en, fr, ar, x-default} absolute URLs for a page path.

    `path_suffix` is relative to a language root (e.g. "products/abc.html" or
    "previous-work.html" or ""). x-default points at the English URL.
    """
    suffix = path_suffix.lstrip("/")
    en = f"{HOST}/{suffix}" if suffix else f"{HOST}/"
    fr = f"{HOST}/fr/{suffix}" if suffix else f"{HOST}/fr/"
    ar = f"{HOST}/ar/{suffix}" if suffix else f"{HOST}/ar/"
    return {"en": en, "fr": fr, "ar": ar, "x-default": en}


# ---------------- og:locale block ----------------

def og_locale_block(lang: str) -> str:
    """Build <meta property="og:locale"> plus og:locale:alternate for the other
    two languages. Returned as a single HTML snippet (no leading/trailing
    whitespace). Callers decide where to inject it."""
    primary = OG_LOCALES[lang]
    alternates = "".join(
        f'\n  <meta property="og:locale:alternate" content="{OG_LOCALES[l]}" />'
        for l in LANGS if l != lang
    )
    return f'<meta property="og:locale" content="{primary}" />{alternates}'


# ---------------- </head> injection ----------------

def inject_before_head_close(html: str, snippet: str) -> str:
    """Insert `snippet` immediately before the first </head>. Idempotent only in
    the trivial sense — callers must ensure they don't inject duplicates."""
    return html.replace("</head>", f"{snippet}\n  </head>", 1)


# ---------------- JSON-LD builders ----------------

def breadcrumb_jsonld(crumbs: list) -> dict:
    """Build a BreadcrumbList JSON-LD object. `crumbs` is a list of (name, url)
    tuples in order from root to current page."""
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i, "name": name, "item": url}
            for i, (name, url) in enumerate(crumbs, 1)
        ],
    }


def itemlist_jsonld(items: list, list_name: str) -> dict:
    """Build an ItemList JSON-LD object. `items` is a list of dicts with `url`
    and `name` (position is assigned here)."""
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": list_name,
        "numberOfItems": len(items),
        "itemListElement": [
            {"@type": "ListItem", "position": i, "url": it["url"], "name": it["name"]}
            for i, it in enumerate(items, 1)
        ],
    }


# ---------------- Export a safe escape alias for consumers ----------------

escape = html_module.escape
