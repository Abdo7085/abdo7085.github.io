#!/usr/bin/env python3
"""
Build the Previous-Work project portfolio:
  1. Read every data/projects/*.json.
  2. Enrich each media item with real pixel dimensions via Pillow (for images
     and video poster frames). Reels default to 9:16.
  3. Write data/projects_index.json (sorted by date desc).
  4. Generate static SEO HTML pages in projects/, fr/projects/, ar/projects/
     with full meta tags, hreflang, og:locale, Article/CreativeWork + BreadcrumbList
     JSON-LD, window.__PROJECT__ inline pre-embed, <h1>/<p> fallback in <noscript>.
  5. Inject an ItemList JSON-LD into previous-work.html (EN/FR/AR) for portfolio
     rich results.
  6. Overwrite sitemap.xml with static pages + project URLs (build_products.py
     will run afterwards and regenerate the sitemap with products + projects
     merged via its own read of projects_index.json).

Usage:
    python scripts/build_projects.py
"""

import json
import glob
import re
import html as html_module
from pathlib import Path
from datetime import datetime

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow is required. Install with: pip install Pillow")
    raise

import _lib
from _lib import HOST, LANGS, OG_LOCALES, ROOT, t, make_meta_description, today

PROJECTS_DIR = ROOT / "data" / "projects"
PROJECTS_INDEX_PATH = ROOT / "data" / "projects_index.json"
TEMPLATE_PATH = ROOT / "project.html"


def get_image_dimensions(relative_src):
    """relative_src starts with `/` — resolve from ROOT. Returns (w,h) or (None,None)."""
    if not relative_src or not isinstance(relative_src, str):
        return None, None
    local = ROOT / relative_src.lstrip("/")
    if not local.exists():
        print(f"    WARN: media not found on disk: {relative_src}")
        return None, None
    try:
        with Image.open(local) as im:
            return im.size  # (width, height)
    except Exception as e:
        print(f"    WARN: could not read dimensions of {relative_src}: {e}")
        return None, None


def enrich_media(media):
    """Mutate the media list in place, adding width/height where possible."""
    enriched = []
    for item in media or []:
        kind = item.get("type")
        new = dict(item)
        if kind == "image":
            w, h = get_image_dimensions(item.get("src"))
            if w and h:
                new["width"] = w
                new["height"] = h
        elif kind == "video":
            poster = item.get("poster")
            if poster:
                w, h = get_image_dimensions(poster)
                if w and h:
                    new["width"] = w
                    new["height"] = h
        elif kind == "reel":
            # Reels are self-hosted 9:16 MP4s. If a poster image exists on disk,
            # read its real dimensions; otherwise fall back to the canonical
            # portrait 1080×1920 so the layout slot is still CLS-safe.
            poster = item.get("poster")
            w, h = (None, None)
            if poster:
                w, h = get_image_dimensions(poster)
            if w and h:
                new["width"] = w
                new["height"] = h
            else:
                new.setdefault("width", 1080)
                new.setdefault("height", 1920)
            # Sanity: warn if the MP4 src is declared but missing on disk.
            src = item.get("src")
            if src and not (ROOT / src.lstrip("/")).exists():
                print(f"    WARN: reel MP4 not found on disk: {src}")
        enriched.append(new)
    return enriched


# ---------------- Index build ----------------

def build_index():
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
    project_files = sorted(glob.glob(str(PROJECTS_DIR / "*.json")))
    projects = []

    for pf in project_files:
        try:
            with open(pf, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"  ERROR reading {pf}: {e}")
            continue

        # Enrich media with dimensions (mutates the data we pass onward)
        data["media"] = enrich_media(data.get("media", []))
        projects.append(data)
        print(f"  Enriched {data.get('id')} ({len(data['media'])} media items).")

    # Sort by date desc (newer first)
    def _date_key(p):
        raw = p.get("date") or ""
        try:
            return datetime.fromisoformat(raw)
        except Exception:
            return datetime.min
    projects.sort(key=_date_key, reverse=True)

    # Build a lean listing index (what the previous-work page card grid needs)
    index_entries = []
    for p in projects:
        index_entries.append({
            "id": p.get("id"),
            "date": p.get("date"),
            "location": p.get("location"),
            "categories": p.get("categories", []),
            "title": p.get("title", {}),
            "short_description": p.get("short_description", {}),
            "cover": p.get("cover"),
            "media_count": len(p.get("media", [])),
        })

    PROJECTS_INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(PROJECTS_INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(index_entries, f, indent=2, ensure_ascii=False)

    print(f"\n[1/3] Wrote {PROJECTS_INDEX_PATH.relative_to(ROOT)} with {len(index_entries)} projects.")
    return projects


# ---------------- Static HTML per project ----------------

def build_json_ld(project, lang, products_index):
    """CreativeWork + BreadcrumbList as a JSON array. Adds `mentions` for related products and a review entry if a testimonial exists."""
    pid = project.get("id", "")
    title = t(project.get("title"), lang)
    desc = t(project.get("description"), lang) or t(project.get("short_description"), lang)
    cover = project.get("cover") or ""
    cover_url = HOST + cover if cover else ""

    prefix = "" if lang == "en" else f"/{lang}"
    canonical = f"{HOST}{prefix}/projects/{pid}.html"

    mentions = []
    for rpid in project.get("related_products", []) or []:
        prod = next((p for p in products_index if p.get("id") == rpid), None)
        if not prod:
            continue
        mentions.append({
            "@type": "Product",
            "name": t(prod.get("title"), lang),
            "url": f"{HOST}/products/{rpid}.html"
        })

    cw = {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": title,
        "headline": title,
        "description": desc,
        "url": canonical,
        "author": {
            "@type": "Organization",
            "name": "S\u2011ELECTRICITY",
            "url": HOST
        }
    }
    if project.get("date"):
        cw["datePublished"] = project["date"]
    if project.get("location"):
        cw["locationCreated"] = {"@type": "Place", "name": project["location"]}
    if cover_url:
        cw["image"] = cover_url
    if mentions:
        cw["mentions"] = mentions

    testimonial = project.get("testimonial")
    if testimonial and testimonial.get("quote"):
        cw["review"] = {
            "@type": "Review",
            "reviewBody": t(testimonial.get("quote"), lang),
            "author": {
                "@type": "Person",
                "name": testimonial.get("author", "Client")
            }
        }

    # BreadcrumbList
    prev_work_label = {"en": "Previous Work", "fr": "Réalisations", "ar": "\u0623\u0639\u0645\u0627\u0644\u0646\u0627 \u0627\u0644\u0633\u0627\u0628\u0642\u0629"}[lang]
    home_url = f"{HOST}{prefix}/"
    pw_url = f"{HOST}{prefix}/previous-work.html"
    bc = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "S\u2011ELECTRICITY", "item": home_url},
            {"@type": "ListItem", "position": 2, "name": prev_work_label, "item": pw_url},
            {"@type": "ListItem", "position": 3, "name": title, "item": canonical},
        ],
    }

    return json.dumps(cw, ensure_ascii=False), json.dumps(bc, ensure_ascii=False)


def generate_project_html(template_html, project, lang, products_index):
    pid = project.get("id", "")
    title = t(project.get("title"), lang)
    desc_text = make_meta_description(project, lang)
    cover = project.get("cover") or ""
    cover_url = HOST + cover if cover else f"{HOST}/assets/S\u2011ELECTRICITY-LOGO.svg"

    suffix = {
        "en": "S\u2011ELECTRICITY Morocco",
        "fr": "S\u2011ELECTRICITY Maroc",
        "ar": "S\u2011ELECTRICITY \u0627\u0644\u0645\u063a\u0631\u0628",
    }[lang]
    page_title = f"{title} | {suffix}"

    safe_title = html_module.escape(page_title, quote=True)
    safe_desc = html_module.escape(desc_text, quote=True)

    out = _lib.set_html_lang_dir(template_html, lang)

    out = re.sub(r"<title[^>]*>.*?</title>", f"<title>{safe_title}</title>", out, flags=re.S, count=1)

    out = re.sub(
        r'<meta\s+name="description"[^>]*>',
        f'<meta name="description" content="{safe_desc}" id="meta-description" />',
        out, count=1
    )

    out = re.sub(
        r'<meta\s+name="robots"[^>]*>',
        '<meta name="robots" content="index, follow" />',
        out, count=1
    )

    prefix = "" if lang == "en" else f"/{lang}"
    canonical_url = f"{HOST}{prefix}/projects/{pid}.html"
    out = re.sub(
        r'<link\s+rel="canonical"[^>]*>',
        f'<link rel="canonical" href="{canonical_url}" id="meta-canonical" />',
        out, count=1
    )

    en_url = f"{HOST}/projects/{pid}.html"
    fr_url = f"{HOST}/fr/projects/{pid}.html"
    ar_url = f"{HOST}/ar/projects/{pid}.html"

    out = re.sub(r'<link\s+rel="alternate"\s+hreflang="en"[^>]*/?>',
                 f'<link rel="alternate" hreflang="en" href="{en_url}" />', out, count=1)
    out = re.sub(r'<link\s+rel="alternate"\s+hreflang="fr"[^>]*/?>',
                 f'<link rel="alternate" hreflang="fr" href="{fr_url}" />', out, count=1)
    out = re.sub(r'<link\s+rel="alternate"\s+hreflang="ar"[^>]*/?>',
                 f'<link rel="alternate" hreflang="ar" href="{ar_url}" />', out, count=1)
    # x-default: strip existing and re-insert after the AR alternate
    out = re.sub(r'\s*<link\s+rel="alternate"\s+hreflang="x-default"[^>]*/?>', '', out)
    xdef = f'<link rel="alternate" hreflang="x-default" href="{en_url}" />'
    out = out.replace(
        f'<link rel="alternate" hreflang="ar" href="{ar_url}" />',
        f'<link rel="alternate" hreflang="ar" href="{ar_url}" />\n    {xdef}',
        1
    )

    out = re.sub(r'<meta\s+property="og:title"[^>]*>',
                 f'<meta property="og:title" content="{safe_title}" id="meta-og-title" />', out, count=1)
    out = re.sub(r'<meta\s+property="og:description"[^>]*>',
                 f'<meta property="og:description" content="{safe_desc}" id="meta-og-description" />', out, count=1)
    out = re.sub(r'<meta\s+property="og:url"[^>]*>',
                 f'<meta property="og:url" content="{canonical_url}" />', out, count=1)
    out = re.sub(r'<meta\s+property="og:image"[^>]*>',
                 f'<meta property="og:image" content="{cover_url}" id="meta-og-image" />', out, count=1)

    out = re.sub(r'<meta\s+name="twitter:title"[^>]*>',
                 f'<meta name="twitter:title" content="{safe_title}" id="meta-twitter-title" />', out, count=1)
    out = re.sub(r'<meta\s+name="twitter:description"[^>]*>',
                 f'<meta name="twitter:description" content="{safe_desc}" id="meta-twitter-description" />', out, count=1)
    out = re.sub(r'<meta\s+name="twitter:image"[^>]*>',
                 f'<meta name="twitter:image" content="{cover_url}" id="meta-twitter-image" />', out, count=1)

    # JSON-LD: CreativeWork + BreadcrumbList
    cw_json, bc_json = build_json_ld(project, lang, products_index)
    ld_script = f'<script type="application/ld+json" id="project-jsonld">{cw_json}</script>'
    bc_script = f'<script type="application/ld+json" id="breadcrumb-jsonld">{bc_json}</script>'

    og_locale = OG_LOCALES[lang]
    alt_locales = "".join(
        f'\n  <meta property="og:locale:alternate" content="{OG_LOCALES[l]}" />'
        for l in LANGS if l != lang
    )
    locale_tags = f'<meta property="og:locale" content="{og_locale}" />{alt_locales}'

    # Inline pre-embed of the full project so project-detail.js can render
    # instantly without a second fetch.
    embedded = json.dumps(project, ensure_ascii=False)
    pre_embed = f'<script id="project-preload">window.__PROJECT__ = {embedded};</script>'

    inject = f"  {locale_tags}\n  {ld_script}\n  {bc_script}\n  {pre_embed}\n  </head>"
    out = out.replace("</head>", inject, 1)

    # <noscript> fallback — H1 + short description
    safe_h1 = html_module.escape(title)
    safe_lead = html_module.escape(t(project.get("short_description"), lang))
    out = out.replace(
        '<p>S\u2011ELECTRICITY - Smart Home Solutions</p>',
        f'<h1>{safe_h1}</h1>\n      <p>{safe_lead}</p>\n      <p>S\u2011ELECTRICITY - Smart Home Solutions</p>',
        1
    )

    return out


def generate_all_pages(projects, products_index):
    if not TEMPLATE_PATH.exists():
        print(f"ERROR: template {TEMPLATE_PATH} not found.")
        return
    template_html = TEMPLATE_PATH.read_text(encoding="utf-8")

    for project in projects:
        pid = project.get("id")
        for lang in LANGS:
            out_dir = ROOT / "projects" if lang == "en" else ROOT / lang / "projects"
            out_dir.mkdir(parents=True, exist_ok=True)
            out_path = out_dir / f"{pid}.html"
            page_html = generate_project_html(template_html, project, lang, products_index)
            out_path.write_text(page_html, encoding="utf-8")
            print(f"  OK {out_path.relative_to(ROOT)}")


# ---------------- ItemList injection into previous-work.html ----------------

def inject_previous_work_itemlist(projects):
    for lang in LANGS:
        page_path = ROOT / "previous-work.html" if lang == "en" else ROOT / lang / "previous-work.html"
        if not page_path.exists():
            continue

        prefix = "" if lang == "en" else f"/{lang}"
        items = []
        for i, project in enumerate(projects, 1):
            pid = project.get("id", "")
            title = t(project.get("title"), lang)
            items.append({
                "@type": "ListItem",
                "position": i,
                "url": f"{HOST}{prefix}/projects/{pid}.html",
                "name": title
            })

        ld = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": {"en": "Previous Work", "fr": "Réalisations", "ar": "\u0623\u0639\u0645\u0627\u0644\u0646\u0627 \u0627\u0644\u0633\u0627\u0628\u0642\u0629"}[lang],
            "numberOfItems": len(items),
            "itemListElement": items
        }

        html = page_path.read_text(encoding="utf-8")
        ld_script = f'<script type="application/ld+json" id="projects-itemlist-jsonld">{json.dumps(ld, ensure_ascii=False)}</script>'
        html = re.sub(
            r'<script type="application/ld\+json" id="projects-itemlist-jsonld">.*?</script>\s*',
            '', html, flags=re.S
        )
        html = html.replace("</head>", f"  {ld_script}\n  </head>", 1)
        page_path.write_text(html, encoding="utf-8")
        print(f"  Injected ItemList JSON-LD into {page_path.relative_to(ROOT)}")


# ---------------- Sitemap (partial — merged later by build_products.py) ----------------

def write_partial_sitemap(project_ids):
    """Write a sitemap.xml covering static pages + project URLs.
    build_products.py will rewrite this later including product URLs too,
    so this only matters when the user runs build_projects.py standalone."""
    urls = []

    static_pages = [
        {"suffix": ""},
        {"suffix": "previous-work.html"},
        {"suffix": "products.html"},
    ]
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
                f"    <lastmod>{today()}</lastmod>\n"
                f'    <xhtml:link rel="alternate" hreflang="en" href="{en_href}" />\n'
                f'    <xhtml:link rel="alternate" hreflang="fr" href="{fr_href}" />\n'
                f'    <xhtml:link rel="alternate" hreflang="ar" href="{ar_href}" />\n'
                f'    <xhtml:link rel="alternate" hreflang="x-default" href="{en_href}" />\n'
                f"  </url>"
            )

    for pid in sorted(project_ids):
        for lang in LANGS:
            prefix = "" if lang == "en" else f"/{lang}"
            loc = f"{HOST}{prefix}/projects/{pid}.html"
            en_href = f"{HOST}/projects/{pid}.html"
            fr_href = f"{HOST}/fr/projects/{pid}.html"
            ar_href = f"{HOST}/ar/projects/{pid}.html"
            urls.append(
                f"  <url>\n"
                f"    <loc>{loc}</loc>\n"
                f"    <lastmod>{today()}</lastmod>\n"
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
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    print(f"\nOK Wrote sitemap.xml (static + {len(project_ids)} project URLs). build_products.py will merge product URLs in.")


# ---------------- Entry point ----------------

def main():
    print("=== Building Project Portfolio ===\n")

    projects = build_index()
    if not projects:
        print("No projects found. Nothing to generate.")
        return

    # Load products_index.json (if it exists) so related_products can resolve to names
    products_index = []
    products_index_path = ROOT / "data" / "products_index.json"
    if products_index_path.exists():
        try:
            products_index = json.loads(products_index_path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  WARN: couldn't load products_index.json: {e}")

    print(f"\n[2/3] Generating static HTML pages for {len(projects)} projects × {len(LANGS)} languages...")
    generate_all_pages(projects, products_index)

    print(f"\n[3/3] Injecting ItemList JSON-LD into previous-work.html...")
    inject_previous_work_itemlist(projects)

    write_partial_sitemap([p.get("id") for p in projects])

    print("\n=== Project build complete. Run `python scripts/build_products.py` afterwards to finalize the sitemap. ===")


if __name__ == "__main__":
    main()
