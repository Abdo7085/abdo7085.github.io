#!/usr/bin/env python3
"""
Brand pages as static HTML (redesign phase 7, wave 4).

`brands(lang)`   — brands.html: the ledger of every brand we install (logo, origin,
                   tagline, protocols, categories, product count), then the contact block.
`brand(lang, id)` — brands/<id>.html: the brand's hero (logo, facts, description,
                   website), its products with category tabs, and the other brands.

Data: data/brands_index.json, data/brands/<id>.json and products_index.json.
The head of each page (title, meta, JSON-LD) stays with build_brands.py;
build_layout.py puts this between the header and the footer.
assets/se-brand.js filters the brand's products by category and shows all of them.
"""

from __future__ import annotations

import json

from _icons import ic
from _lib import LANGS, ROOT, t
from _ui import Page, brand_mark, card, cats_of, crumbs, data, esc, protos, ruler
from build_home import contact

LIMIT = 12


def _brand(bid: str) -> dict:
    f = ROOT / "data" / "brands" / f"{bid}.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}


def brands(lang: str) -> str:
    p, d = Page(lang), data()
    rows = []
    for b in d["brands"]:
        full = _brand(b["id"])
        origin = esc(p.country(b.get("country_of_origin", "")))
        if full.get("founded"):
            origin += " · " + p.e("since", y=full["founded"])
        cats = "".join(f'<span class="chip">{esc(p.cat(c))}</span>' for c in b.get("category_focus") or [])
        logo = brand_mark(b, decorative=True)  # the name as text when the brand has no logo file
        rows.append(
            '<article class="ledger-row crop-host">'
            f'<div class="ledger-logo recess crop">{logo}</div>'
            f'<div><div class="ledger-name"><h2 class="h3"><a href="{p.brand_url(b["id"])}">{esc(b["brand"])}</a></h2>'
            f'<span class="ledger-origin">{origin}</span></div>'
            f'<p class="ledger-tag">{esc(t(b.get("tagline"), lang))}</p></div>'
            f'<div class="ledger-focus">{protos(b.get("tech_focus"))}<div class="ledger-cats">{cats}</div></div>'
            f'<div class="ledger-count"><b>{b.get("product_count", 0)}</b><span>{p.e("in_catalogue")}</span></div>'
            '</article>')
    return (
        '<section class="page-head"><div class="wrap">'
        + crumbs([(p.s("breadcrumb_home"), p.base), (p.s("nav_brands"), None)])
        + '<div class="page-head-grid"><div class="reveal">'
        f'<p class="kicker">{p.e("brands_kicker", n=p.count(len(d["brands"]), "brand"))}</p>'
        f'<h1 class="h2">{p.e("brands_hero_title")}</h1></div><p class="lead">{p.e("brands_hero_subtitle")}</p></div></div></section>'
        '<section class="wrap"><div class="ledger">' + "".join(rows) + '</div></section>'
        + contact(p)
    )


def brand(lang: str, bid: str) -> str:
    p, d = Page(lang), data()
    b = _brand(bid)
    name = b.get("brand", bid)
    mine = [x for x in d["products"] if x.get("brand") == name]
    techs = []
    for x in mine:
        for tech in x.get("technology") or []:
            if tech not in techs:
                techs.append(tech)
    tax = d["tax"]
    cats = [c for c in tax.category_order if any(c in cats_of(x) for x in mine)]
    country = esc(p.country(b.get("country_of_origin", "")))

    logo = (f'<img src="{esc(b["logo"])}" alt="{esc(name)}">' if b.get("logo") else f'<span class="h2">{esc(name)}</span>')
    hero = (
        '<section class="brand-hero reveal">'
        f'<div class="brand-hero-logo recess crop static">{logo}</div>'
        f'<div class="brand-hero-body"><p class="kicker">{country}</p>'
        f'<h1 class="display brand-name">{esc(name)}</h1>'
        f'<p class="lead brand-tag">{esc(t(b.get("tagline"), lang))}</p>'
        '<dl class="facts">'
        f'<div><dt>{p.e("founded")}</dt><dd class="big">{esc(b.get("founded") or "—")}</dd></div>'
        f'<div><dt>{p.e("country")}</dt><dd>{country}</dd></div>'
        f'<div><dt>{p.e("products_lbl")}</dt><dd class="big">{len(mine)}</dd></div>'
        f'<div><dt>{p.e("pd_protocols")}</dt><dd>{protos(techs, p)}</dd></div>'
        '</dl>'
        f'<div class="prose"><p>{esc(t(b.get("description"), lang))}</p></div>'
        + (f'<a class="link-arrow" href="{esc(b["website"])}" target="_blank" rel="noopener">{p.e("website")}{ic("ext")}</a>' if b.get("website") else "")
        + '</div></section>'
    )

    tabs = ""
    if len(cats) > 1:
        tabs = ('<div class="rail-box in-wrap">'
                '<button type="button" class="rail-btn rail-prev" data-rail="-1" tabindex="-1" aria-hidden="true"></button>'
                '<div class="tabs cat-rail" id="btabs" role="toolbar">'
                f'<button class="cat-tab" type="button" data-bcat="all" aria-pressed="true">{p.e("all")}<span class="n">{len(mine)}</span></button>'
                + "".join(f'<button class="cat-tab" type="button" data-bcat="{esc(c)}" aria-pressed="false">{esc(p.cat(c))}'
                          f'<span class="n">{sum(1 for x in mine if c in cats_of(x))}</span></button>' for c in cats)
                + '</div><button type="button" class="rail-btn rail-next" data-rail="1" tabindex="-1" aria-hidden="true"></button></div>')
    many = len(mine) > LIMIT
    grid = (f'<div class="grid grid-4{" collapsed" if many else ""}" id="bgrid">'
            + "".join(card(p, x, f' data-c="{esc(" ".join(cats_of(x)))}"') for x in mine) + '</div>'
            + (f'<div class="load-more" id="bmore"><button class="btn btn-line" type="button" data-bmore>{p.e("show_all", n=len(mine))}</button></div>' if many else ""))
    others = "".join(f'<a class="mini-brand" href="{p.brand_url(x["id"])}" title="{esc(x["brand"])}">{brand_mark(x)}</a>'
                     for x in d["brands"] if x["id"] != bid)
    return (
        '<div class="wrap pd-wrap">'
        + crumbs([(p.s("breadcrumb_home"), p.base), (p.s("nav_brands"), f"{p.base}brands.html"), (name, None)])
        + hero + '</div>'
        '<section class="sec-tight"><div class="wrap">' + ruler(p.s("products_lbl"), p.count(len(mine), "product"))
        + f'<h2 class="h2 brand-products-title">{p.s("brand_products", b=esc(name))}</h2>' + tabs + grid + '</div></section>'
        '<section class="sec-tight"><div class="wrap">' + ruler(p.s("other_brands"))
        + f'<div class="mini-brands">{others}</div></div></section>'
    )


if __name__ == "__main__":
    for l in LANGS:
        print(l, len(brands(l)), len(brand(l, "zennio")), "chars")
