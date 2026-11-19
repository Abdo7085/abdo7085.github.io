#!/usr/bin/env python3
"""
404 page as static HTML (redesign phase 7, wave 6): a tripped breaker, then a
catalog search (a plain form to products.html?q=…, no script), the main sections
and the way home. GitHub Pages serves the root 404.html for every missing address;
assets/se.js sends a visitor on a /fr/ or /ar/ address to that language's 404.
"""

from __future__ import annotations

from _icons import ic
from _lib import LANGS
from _ui import PHONE_TEL, PHONE_TXT, Page, esc


def notfound(lang: str) -> str:
    p = Page(lang)
    links = [("nav_products", f"{p.base}products.html"), ("nav_brands", f"{p.base}brands.html"),
             ("nav_projects", f"{p.base}previous-work.html"), ("nav_services", f"{p.base}#services")]
    return (
        '<div class="wrap"><section class="nf">'
        '<div class="nf-art dark" aria-hidden="true"><span class="nf-code">404</span>'
        '<span class="brk"><span class="brk-top"><span>Q404</span><span class="led"></span></span><span class="brk-lever"></span>'
        f'<span class="brk-name">{p.e("nf_kicker")}</span></span></div>'
        f'<div class="reveal"><p class="kicker">{p.e("nf_kicker")}</p><h1 class="display nf-title">{p.e("title")}</h1>'
        f'<p class="lead">{p.e("lead")}</p>'
        f'<form class="search nf-search" action="{p.base}products.html" method="get" role="search">{ic("search")}'
        f'<input name="q" type="search" placeholder="{p.e("nf_search")}" aria-label="{p.e("nf_search")}"></form>'
        '<div class="nf-links">' + "".join(f'<a href="{h}">{p.e(k)}{ic("arrow", "flip")}</a>' for k, h in links) + '</div>'
        f'<div class="actions nf-actions"><a class="btn btn-primary" href="{p.base}">{p.e("go_home")}</a>'
        f'<a class="btn btn-line" href="tel:{PHONE_TEL}">{ic("phone")}<span dir="ltr">{PHONE_TXT}</span></a></div>'
        '</div></section></div>'
    )


if __name__ == "__main__":
    for l in LANGS:
        print(l, len(notfound(l)), "chars")
