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
import hashlib
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
SITEMAP_EXCLUDE = {"product.html", "project.html", "brand.html", "404.html"}

_NOINDEX_RE = re.compile(
    r"""<meta\s+name=["']robots["']\s+content=["'][^"']*noindex""", re.I
)


def is_noindex(html_path: Path) -> bool:
    """True if the page tells search engines not to index it. Such a page must
    never be listed in sitemap.xml, whether or not SITEMAP_EXCLUDE names it."""
    try:
        return bool(_NOINDEX_RE.search(html_path.read_text(encoding="utf-8")))
    except Exception:
        return False


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


# Build state that must survive between runs lives here (committed to git).
STATE_DIR = ROOT / "scripts" / "state"
SITEMAP_STATE_PATH = STATE_DIR / "sitemap.json"


def _fingerprint(*parts) -> str:
    """Short content hash of files (Path), strings, or bytes.

    Line endings are normalised first, so the same content hashes identically
    on Windows (CRLF working tree) and Linux (LF)."""
    h = hashlib.sha1()
    for part in parts:
        if isinstance(part, Path):
            data = part.read_bytes()
        elif isinstance(part, str):
            data = part.encode("utf-8")
        else:
            data = part
        h.update(data.replace(b"\r\n", b"\n"))
        h.update(b"\0")
    return h.hexdigest()[:16]


def _load_sitemap_state() -> dict:
    try:
        state = json.loads(SITEMAP_STATE_PATH.read_text(encoding="utf-8"))
        return state if isinstance(state, dict) else {}
    except Exception:
        return {}


def _existing_sitemap_lastmods() -> dict:
    """{loc: lastmod} from the sitemap.xml already on disk. Seeds the state the
    first time a URL is seen, so introducing the state file loses no dates."""
    try:
        text = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    except Exception:
        return {}
    return dict(re.findall(r"<loc>([^<]+)</loc>\s*<lastmod>([^<]+)</lastmod>", text))


def write_sitemap() -> None:
    """Write the authoritative sitemap.xml covering: static root pages,
    every product, every project, every brand.

    Idempotent and order-independent: reads everything from disk, so it
    doesn't matter which of build_products / build_projects / build_brands /
    generate_localized ran last. Callers can invoke this from any script
    without fearing that a later script will overwrite and drop entries.

    URL ordering (preserved from the legacy pipeline so golden-diffs stay clean):
      1. Static pages (index, previous-work, products, brands) × (en, fr, ar)
      2. Products, sorted by id (ascending) × (en, fr, ar)
      3. Projects, in the order stored in data/projects_index.json × (en, fr, ar)
      4. Brands, in the order stored in data/brands_index.json × (en, fr, ar)

    lastmod policy — a URL's date moves only when its source content changes:
      - static pages: the English root template (incl. its injected ItemList)
      - products:     data/products/<id>.json
      - projects:     data/projects/<id>.json
      - brands:       data/brands/<id>.json + the ids of that brand's products
    Each source's fingerprint and date are kept in scripts/state/sitemap.json.
    Unchanged fingerprint → date kept. Changed → today. First time seen → the
    date already in sitemap.xml if there is one, else today. Rebuilding with
    no content change therefore rewrites sitemap.xml byte-for-byte.
    """
    td = today()
    urls: list = []

    state = _load_sitemap_state()
    seed = _existing_sitemap_lastmods()
    new_state: dict = {}

    def lastmod_for(key: str, fingerprint: str, en_loc: str) -> str:
        prev = state.get(key)
        if isinstance(prev, dict) and prev.get("hash") == fingerprint and prev.get("lastmod"):
            lastmod = prev["lastmod"]
        elif prev is None and en_loc in seed:
            lastmod = seed[en_loc]
        else:
            lastmod = td
        new_state[key] = {"hash": fingerprint, "lastmod": lastmod}
        return lastmod

    # 1. Static root pages. Uses ROOT.glob('*.html') minus SITEMAP_EXCLUDE and
    # 404.html, matching generate_localized.py's source of truth — so adding a
    # new root page automatically flows into the sitemap.
    root_pages = sorted(
        f.name for f in ROOT.glob("*.html")
        if f.name not in SITEMAP_EXCLUDE and f.name != "404.html"
        and not is_noindex(f)
    )
    # Preserve canonical order: index first, then alphabetical.
    if "index.html" in root_pages:
        root_pages = ["index.html"] + [p for p in root_pages if p != "index.html"]
    for filename in root_pages:
        suffix = "" if filename == "index.html" else filename
        lastmod = lastmod_for(
            f"page:{filename}", _fingerprint(ROOT / filename), f"{HOST}/{suffix}"
        )
        for lang in LANGS:
            prefix = "" if lang == "en" else f"/{lang}"
            loc = f"{HOST}{prefix}/{suffix}"
            urls.append(_sitemap_url_block(loc, lastmod, suffix))

    # 2. Products (sorted by id, matching legacy behavior).
    products_dir = ROOT / "data" / "products"
    product_files: dict = {}            # id -> source JSON path
    brand_product_ids: dict = {}        # brand name -> [product ids]
    if products_dir.exists():
        for pf in sorted(products_dir.glob("*.json")):
            try:
                pdata = json.loads(pf.read_text(encoding="utf-8"))
            except Exception:
                continue
            pid = pdata.get("id")
            if pid:
                product_files[pid] = pf
                brand_product_ids.setdefault(pdata.get("brand"), []).append(pid)
    for pid in sorted(product_files):
        suffix = f"products/{pid}.html"
        lastmod = lastmod_for(
            f"product:{pid}", _fingerprint(product_files[pid]), f"{HOST}/{suffix}"
        )
        for lang in LANGS:
            prefix = "" if lang == "en" else f"/{lang}"
            loc = f"{HOST}{prefix}/{suffix}"
            urls.append(_sitemap_url_block(loc, lastmod, suffix))

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
            suffix = f"projects/{pid}.html"
            source = ROOT / "data" / "projects" / f"{pid}.json"
            fingerprint = _fingerprint(
                source if source.exists() else json.dumps(entry, sort_keys=True)
            )
            lastmod = lastmod_for(f"project:{pid}", fingerprint, f"{HOST}/{suffix}")
            for lang in LANGS:
                prefix = "" if lang == "en" else f"/{lang}"
                loc = f"{HOST}{prefix}/{suffix}"
                urls.append(_sitemap_url_block(loc, lastmod, suffix))

    # 4. Brands (order preserved from brands_index.json — product_count desc).
    brands_index_path = ROOT / "data" / "brands_index.json"
    if brands_index_path.exists():
        try:
            entries = json.loads(brands_index_path.read_text(encoding="utf-8"))
        except Exception:
            entries = []
        for entry in entries:
            bid = entry.get("id")
            if not bid:
                continue
            suffix = f"brands/{bid}.html"
            source = ROOT / "data" / "brands" / f"{bid}.json"
            # A brand page lists that brand's products, so it changes when the
            # brand's own data changes or when a product joins/leaves the brand.
            its_products = ",".join(sorted(brand_product_ids.get(entry.get("brand"), [])))
            fingerprint = _fingerprint(
                source if source.exists() else json.dumps(entry, sort_keys=True),
                its_products,
            )
            lastmod = lastmod_for(f"brand:{bid}", fingerprint, f"{HOST}/{suffix}")
            for lang in LANGS:
                prefix = "" if lang == "en" else f"/{lang}"
                loc = f"{HOST}{prefix}/{suffix}"
                urls.append(_sitemap_url_block(loc, lastmod, suffix))

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(urls) + "\n"
        "</urlset>\n"
    )
    (ROOT / "sitemap.xml").write_text(xml, encoding="utf-8")

    # Persist fingerprints/dates. Only URLs seen in this run are kept, so
    # entries for deleted products/brands/projects drop out on their own.
    state_text = json.dumps(new_state, indent=1, sort_keys=True, ensure_ascii=False) + "\n"
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        unchanged = SITEMAP_STATE_PATH.read_text(encoding="utf-8") == state_text
    except Exception:
        unchanged = False
    if not unchanged:
        SITEMAP_STATE_PATH.write_text(state_text, encoding="utf-8")


# ---------------- Export a safe escape alias for consumers ----------------

escape = html_module.escape
