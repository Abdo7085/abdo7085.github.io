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
    """Insert `snippet` immediately before the first </head>.

    Idempotent in the trivial sense — callers must ensure they don't inject
    duplicates (if the snippet is re-injectable, strip old copies first with a
    regex and then call this).

    Collapses any trailing whitespace that immediately precedes </head> so that
    repeated injections don't cause indentation drift (bug: each run was adding
    2 spaces of leading whitespace before the injected tag).
    """
    return re.sub(r"[ \t]*</head>", f"  {snippet}\n  </head>", html, count=1)


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


# ---------------- Sitemap ----------------

def _sitemap_url_block(loc: str, lastmod: str, suffix: str) -> str:
    """One <url>…</url> block with hreflang alternates (en/fr/ar/x-default)."""
    en_href = f"{HOST}/{suffix}" if suffix else f"{HOST}/"
    fr_href = f"{HOST}/fr/{suffix}" if suffix else f"{HOST}/fr/"
    ar_href = f"{HOST}/ar/{suffix}" if suffix else f"{HOST}/ar/"
    return (
        f"  <url>\n"
        f"    <loc>{loc}</loc>\n"
        f"    <lastmod>{lastmod}</lastmod>\n"
        f'    <xhtml:link rel="alternate" hreflang="en" href="{en_href}" />\n'
        f'    <xhtml:link rel="alternate" hreflang="fr" href="{fr_href}" />\n'
        f'    <xhtml:link rel="alternate" hreflang="ar" href="{ar_href}" />\n'
        f'    <xhtml:link rel="alternate" hreflang="x-default" href="{en_href}" />\n'
        f"  </url>"
    )


def write_sitemap() -> None:
    """Write the authoritative sitemap.xml covering: static root pages,
    every product, every project.

    Idempotent and order-independent: reads everything from disk, so it
    doesn't matter which of build_products / build_projects / generate_localized
    ran last. Callers can invoke this from any script without fearing that a
    later script will overwrite and drop entries.

    URL ordering (preserved from the legacy pipeline so golden-diffs stay clean):
      1. Static pages (index, previous-work, products) × (en, fr, ar)
      2. Products, sorted by id (ascending) × (en, fr, ar)
      3. Projects, in the order stored in data/projects_index.json × (en, fr, ar)

    lastmod policy:
      - static pages: today()
      - products: today()
      - projects: entry["date"] if set, else today()
    """
    td = today()
    urls: list = []

    # 1. Static root pages. Uses ROOT.glob('*.html') minus SITEMAP_EXCLUDE and
    # 404.html, matching generate_localized.py's source of truth — so adding a
    # new root page automatically flows into the sitemap.
    root_pages = sorted(
        f.name for f in ROOT.glob("*.html")
        if f.name not in SITEMAP_EXCLUDE and f.name != "404.html"
    )
    # Preserve canonical order: index first, then alphabetical.
    if "index.html" in root_pages:
        root_pages = ["index.html"] + [p for p in root_pages if p != "index.html"]
    for filename in root_pages:
        suffix = "" if filename == "index.html" else filename
        for lang in LANGS:
            prefix = "" if lang == "en" else f"/{lang}"
            loc = f"{HOST}{prefix}/{suffix}"
            urls.append(_sitemap_url_block(loc, td, suffix))

    # 2. Products (sorted by id, matching legacy behavior).
    products_dir = ROOT / "data" / "products"
    product_ids: list = []
    if products_dir.exists():
        for pf in sorted(products_dir.glob("*.json")):
            try:
                pid = json.loads(pf.read_text(encoding="utf-8")).get("id")
            except Exception:
                continue
            if pid:
                product_ids.append(pid)
    for pid in sorted(product_ids):
        for lang in LANGS:
            prefix = "" if lang == "en" else f"/{lang}"
            loc = f"{HOST}{prefix}/products/{pid}.html"
            urls.append(_sitemap_url_block(loc, td, f"products/{pid}.html"))

    # 3. Projects (order preserved from projects_index.json — date desc).
    projects_index_path = ROOT / "data" / "projects_index.json"
    if projects_index_path.exists():
        try:
            entries = json.loads(projects_index_path.read_text(encoding="utf-8"))
        except Exception:
            entries = []
        for entry in entries:
            pid = entry.get("id")
            if not pid:
                continue
            lastmod = entry.get("date") or td
            for lang in LANGS:
                prefix = "" if lang == "en" else f"/{lang}"
                loc = f"{HOST}{prefix}/projects/{pid}.html"
                urls.append(_sitemap_url_block(loc, lastmod, f"projects/{pid}.html"))

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(urls) + "\n"
        "</urlset>\n"
    )
    (ROOT / "sitemap.xml").write_text(xml, encoding="utf-8")


# ---------------- Export a safe escape alias for consumers ----------------

escape = html_module.escape
