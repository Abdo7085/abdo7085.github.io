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

Pages still drawn by the React bundle are skipped until their own wave:
the homepage (index.html) and the projects list (previous-work.html), whose
content lives inside the bundle, and 404.html, which has its own layout.

Usage:
    python scripts/build_layout.py
"""

from __future__ import annotations

import html as _html
import re
from pathlib import Path

from _lib import ROOT, LANGS, load_locale, load_taxonomy, t

SKIP = {"index.html", "previous-work.html", "404.html"}
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

# Stroke icons (24×24), same set as the prototype
ICONS = {
    "quote": '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 3h6v3H9z"/><path d="M8.5 11h7M8.5 15h4.5"/>',
    "menu": '<path d="M4 7h16M4 12h16M4 17h10"/>',
    "x": '<path d="M6 6l12 12M18 6 6 18"/>',
    "phone": '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    "pin": '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
}
WA_ICON = ('<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.41z"/></svg>')


def esc(s) -> str:
    return _html.escape(str(s), quote=True)


def ic(name: str) -> str:
    return ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>')


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
        '<header class="hdr"><div class="wrap hdr-in">'
        + logo(lang, s, True)
        + f'<nav class="nav" aria-label="Main">{nav}</nav>'
        '<div class="hdr-tools">' + switch
        + f'<button class="icon-btn" type="button" data-trigger="cart-open" aria-label="{esc(s["cart_aria_open"])}">'
        + ic("quote") + '<span class="count" data-cart-badge></span></button>'
        f'<button class="btn btn-primary btn-sm hdr-cta" type="button" data-trigger="find-solution">{cta}</button>'
        f'<button class="icon-btn burger" type="button" data-menu aria-controls="menu" aria-expanded="false" aria-label="{esc(s["menu"])}">'
        + ic("menu") + ic("x") + '</button>'
        '</div></div>' + wires() + '</header>\n'
        f'<div class="menu" id="menu"><nav aria-label="{esc(s["menu"])}">{menu}</nav>'
        f'<div class="menu-foot">{switch}'
        f'<button class="btn btn-primary btn-sm" type="button" data-trigger="find-solution">{cta}</button></div></div>'
    )


def footer(lang: str, s: dict, tax) -> str:
    b = base(lang)
    cats = "".join(
        f'<li><a href="{b}products.html?category={esc(cid)}">{esc(t(tax.category_labels[cid], lang))}</a></li>'
        for cid in tax.category_order[:6])
    return (
        '<footer class="ftr" id="contact">' + wires() + '<div class="wrap">'
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
    return ('<!-- se:layout -->\n' + header(lang, suffix, s)
            + '\n<main id="main"></main>\n' + footer(lang, s, tax) + '\n<!-- /se:layout -->')


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
