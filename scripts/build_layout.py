#!/usr/bin/env python3
"""
Site header and footer as static HTML (redesign phase 7, wave 1).

The header, the phone menu and the footer used to be drawn by the React
bundle (assets/index-*.js) after the page loaded. This stage writes them
into every page's HTML at build time, in the page's own language, so they
show before any script arrives and search engines see the links.

What it does to each page it handles:
  - removes the React bundle <script> and the old language menu
  - puts header + <main id="main"> + footer where <div id="root"> was
    (the page apps in assets/*.js mount into that <main>, via SE.mount)
  - links assets/se.css (fonts, colours, header, footer) and assets/se.js
    (phone menu)

Idempotent: the block sits between <!-- se:layout --> markers and is
rewritten in place on every build, so the CI "rebuild changes nothing"
check stays green.

Wave 2: the homepage content is written here too (build_home.py, between
the header and the footer, in <main data-se>), and the page gets the page
styles (assets/se-pages.css, scoped to body.se-page).

Pages skipped until their own wave: the projects list (previous-work.html),
whose content still lives inside the React bundle, and 404.html, which has
its own layout.

Usage:
    python scripts/build_layout.py
"""

from __future__ import annotations

import html as _html
import re
from pathlib import Path

import build_brand_pages
import build_catalog
import build_home
import build_notfound
import build_product
import build_project_pages
from _icons import WA_ICON, ic
from _lib import ROOT, LANGS, load_locale, load_taxonomy, t

# Pages whose content is still drawn by the React bundle or has its own layout, until their wave
SKIP: set = set()
# Pages whose content is written here too (the rest: header/footer around a page app)
CONTENT = {"index.html": (build_home.home, None),
           "products.html": (build_catalog.catalog, "/assets/se-catalog.js"),
           "brands.html": (build_brand_pages.brands, None),
           "previous-work.html": (build_project_pages.projects, "/assets/se-projects.js"),
           "404.html": (build_notfound.notfound, None)}
# Generated detail pages: folder → (render(lang, id), page script)
DETAIL = {"products/": (build_product.page, "/assets/se-product.js"),
          "brands/": (build_brand_pages.brand, "/assets/se-brand.js"),
          "projects/": (build_project_pages.project, None)}


def content_for(suffix: str):
    """(render(lang) -> main HTML, page script or None) for pages written here, else None."""
    if suffix in CONTENT:
        return CONTENT[suffix]
    for folder, (render, script) in DETAIL.items():
        if suffix.startswith(folder) and suffix.endswith(".html"):
            pid = suffix[len(folder):-len(".html")]
            return (lambda lang: render(lang, pid)), script
    return None


PHONE_TEL = "+212654132112"
PHONE_TXT = "+212 654-132112"
WHATSAPP = "212654132112"

BUNDLE_JS = re.compile(r'[ \t]*<script type="module" crossorigin src="/assets/index-[\w-]+\.js"></script>\n?')
LANG_MENU = re.compile(r'[ \t]*<!-- Language menu[^\n]*-->\s*<div id="langMenuRoot"[\s\S]*?</div>\n?')
ROOT_DIV = re.compile(r'[ \t]*<div id="root"></div>\n?')
ROOT_NOTE = re.compile(r'[ \t]*<!-- Original Root[^\n]*-->\n?')
BLOCK = re.compile(r'<!-- se:layout -->[\s\S]*?<!-- /se:layout -->')
HEAD_MARK = '<!-- se:head -->'
HEAD_LINKS = (HEAD_MARK + '\n    <link rel="stylesheet" href="/assets/se.css">'
              '\n    <script defer src="/assets/se.js"></script>\n')
# pages fully in the new design (CONTENT) also get the page styles (body.se-page)
PAGE_CSS = '\n    <link rel="stylesheet" href="/assets/se-pages.css">'

def esc(s) -> str:
    return _html.escape(str(s), quote=True)


def page_of(rel: str):
    """'fr/products/x.html' → ('fr', 'products/x.html')."""
    parts = rel.split("/", 1)
    if parts[0] in ("fr", "ar") and len(parts) == 2:
        return parts[0], parts[1]
    return "en", rel


def section_of(suffix: str) -> str:
    if suffix.startswith("products/") or suffix in ("products.html", "product.html"):
        return "products"
    if suffix.startswith("brands/") or suffix in ("brands.html", "brand.html"):
        return "brands"
    if suffix.startswith("projects/") or suffix in ("previous-work.html", "project.html"):
        return "projects"
    return ""


def base(lang: str) -> str:
    return "/" if lang == "en" else f"/{lang}/"


def wires() -> str:
    return ('<div class="wires" aria-hidden="true"><i class="br"></i><i class="bk"></i>'
            '<i class="gy"></i><i class="bl"></i><i class="pe"></i></div>')


def logo(lang: str, s: dict, label: bool) -> str:
    aria = f' aria-label="{esc(s.get("logo_alt_link", "S‑ELECTRICITY"))}"' if label else ""
    return (f'<a class="logo" href="{base(lang)}"{aria}>'
            '<img src="/assets/logocircular.webp" alt="" width="42" height="42">'
            f'<span class="logo-word"><b>S‑ELECTRICITY</b><small>{esc(s["logo_sub"])}</small></span></a>')


def lang_switch(lang: str, suffix: str) -> str:
    out = []
    for l in LANGS:
        cls = ' class="on" aria-current="true"' if l == lang else ""
        out.append(f'<a href="{base(l)}{esc(suffix)}" hreflang="{l}" lang="{l}"{cls}>'
                   f'{"ع" if l == "ar" else l.upper()}</a>')
    return '<div class="lang" role="group" aria-label="Language">' + "".join(out) + "</div>"


def header(lang: str, suffix: str, s: dict) -> str:
    cur = section_of(suffix)
    b = base(lang)
    links = [
        ("products", f"{b}products.html", s["nav_products"]),
        ("brands", f"{b}brands.html", s["nav_brands"]),
        ("projects", f"{b}previous-work.html", s["nav_projects"]),
        ("services", f"{b}#services", s["nav_services"]),
        ("contact", "#contact", s["nav_contact"]),
    ]
    nav = "".join(
        f'<a href="{esc(h)}"{" aria-current=\"page\"" if k == cur else ""}>{esc(txt)}</a>'
        for k, h, txt in links)
    menu = "".join(
        f'<a href="{esc(h)}">{esc(txt)}<span>0{i + 1}</span></a>' for i, (k, h, txt) in enumerate(links))
    switch = lang_switch(lang, suffix)
    cta = esc(s["spa_cta_find_solution"])
    return (
        f'<a class="skip" href="#main">{esc(s["skip_to_content"])}</a>\n'
        '<header class="hdr" data-se><div class="wrap hdr-in">'
        + logo(lang, s, True)
        + f'<nav class="nav" aria-label="Main">{nav}</nav>'
        '<div class="hdr-tools">' + switch
        + f'<button class="icon-btn" type="button" data-trigger="cart-open" aria-label="{esc(s["cart_aria_open"])}">'
        + ic("quote") + '<span class="count" data-cart-badge></span></button>'
        f'<button class="btn btn-primary btn-sm hdr-cta" type="button" data-trigger="find-solution">{cta}</button>'
        f'<button class="icon-btn burger" type="button" data-menu aria-controls="menu" aria-expanded="false" aria-label="{esc(s["menu"])}">'
        + ic("menu") + ic("x") + '</button>'
        '</div></div>' + wires() + '</header>\n'
        f'<div class="menu" id="menu" data-se><nav aria-label="{esc(s["menu"])}">{menu}</nav>'
        f'<div class="menu-foot">{switch}'
        f'<button class="btn btn-primary btn-sm" type="button" data-trigger="find-solution">{cta}</button></div></div>'
    )


def footer(lang: str, s: dict, tax) -> str:
    b = base(lang)
    cats = "".join(
        f'<li><a href="{b}products.html?category={esc(cid)}">{esc(t(tax.category_labels[cid], lang))}</a></li>'
        for cid in tax.category_order[:6])
    return (
        '<footer class="ftr" id="contact" data-se>' + wires() + '<div class="wrap">'
        '<div class="ftr-grid">'
        '<div class="ftr-about">' + logo(lang, s, False) + f'<p>{esc(s["spa_tagline"])}</p></div>'
        f'<div><h2>{esc(s["ftr_explore"])}</h2><ul>'
        f'<li><a href="{b}products.html">{esc(s["nav_products"])}</a></li>'
        f'<li><a href="{b}brands.html">{esc(s["nav_brands"])}</a></li>'
        f'<li><a href="{b}previous-work.html">{esc(s["nav_projects"])}</a></li>'
        f'<li><a href="{b}#services">{esc(s["nav_services"])}</a></li>'
        f'<li><button type="button" data-trigger="find-solution">{esc(s["spa_cta_find_solution"])}</button></li>'
        '</ul></div>'
        f'<div><h2>{esc(s["ftr_catalogue"])}</h2><ul>{cats}</ul></div>'
        f'<div><h2>{esc(s["spa_contact"])}</h2><ul class="ftr-contact">'
        f'<li>{ic("phone")}<a href="tel:{PHONE_TEL}" dir="ltr">{PHONE_TXT}</a></li>'
        f'<li>{WA_ICON}<a href="https://wa.me/{WHATSAPP}" target="_blank" rel="noopener">{esc(s["spa_cta_whatsapp"])}</a></li>'
        f'<li>{ic("pin")}<span>{esc(s["ftr_location"])}</span></li>'
        '</ul></div>'
        '</div>'
        f'<div class="ftr-base"><span>{esc(s["spa_copyright"])}</span></div>'
        '</div></footer>'
    )


def block(lang: str, suffix: str, s: dict, tax) -> str:
    c = content_for(suffix)
    main = f'<main id="main" data-se>{c[0](lang)}</main>' if c else '<main id="main"></main>'
    return ('<!-- se:layout -->\n' + header(lang, suffix, s)
            + '\n' + main + '\n' + footer(lang, s, tax) + '\n<!-- /se:layout -->')


def apply(html: str, lang: str, suffix: str, s: dict, tax) -> str:
    html = BUNDLE_JS.sub("", html)
    html = LANG_MENU.sub("", html)
    html = ROOT_NOTE.sub("", html)
    # Readex Pro now comes from /assets/fonts (se.css); Google keeps serving only Fraunces,
    # which the page bodies still use until their own wave.
    html = html.replace("&family=Readex+Pro:wght@400;500;600;700", "")
    if HEAD_MARK not in html:
        html = html.replace("</head>", "  " + HEAD_LINKS + "  </head>", 1) if "</head>" in html \
            else html.replace("<body", HEAD_LINKS + "  <body", 1)
    c = content_for(suffix)
    if c:
        if PAGE_CSS not in html:
            html = html.replace('<link rel="stylesheet" href="/assets/se.css">', '<link rel="stylesheet" href="/assets/se.css">' + PAGE_CSS, 1)
        tag = f'<script defer src="{c[1]}"></script>' if c[1] else ""
        if tag and tag not in html:
            html = html.replace('<script defer src="/assets/se.js"></script>', '<script defer src="/assets/se.js"></script>\n    ' + tag, 1)
    new = block(lang, suffix, s, tax)
    if BLOCK.search(html):
        html = BLOCK.sub(lambda m: new, html, count=1)
    elif ROOT_DIV.search(html):
        html = ROOT_DIV.sub(lambda m: "    " + new + "\n", html, count=1)
    else:
        raise SystemExit(f"build_layout: no <div id=\"root\"> or layout block in a page ({lang}/{suffix})")
    return html


def pages():
    for p in sorted(ROOT.rglob("*.html")):
        rel = p.relative_to(ROOT).as_posix()
        top = rel.split("/", 1)[0]
        if top in ("docs", "media", "node_modules", "scripts", "assets"):
            continue
        lang, suffix = page_of(rel)
        if suffix in SKIP:
            continue
        yield p, lang, suffix


def main() -> int:
    tax = load_taxonomy()
    strings = {l: load_locale(l) for l in LANGS}
    changed = total = 0
    for p, lang, suffix in pages():
        old = p.read_text(encoding="utf-8")
        new = apply(old, lang, suffix, strings[lang], tax)
        total += 1
        if new != old:
            p.write_text(new, encoding="utf-8")  # platform line endings, like the other stages
            changed += 1
    print(f"  layout: {total} pages, {changed} updated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
