#!/usr/bin/env python3
"""
Catalog page (products.html) as static HTML (redesign phase 7, wave 3).

`catalog(lang)` returns the inside of <main>: page head with search, the
category tabs, the toolbar and every product card, all in the page language.
The first 12 cards show; the rest carry `hidden` until "Load more".

assets/se-catalog.js then filters, sorts and pages these same cards in the
browser (no product data is fetched): the page embeds one small JSON block
(#cat-data) with each product's facets and the filter labels.
"""

from __future__ import annotations

import json

from _icons import WA_ICON, ic
from _lib import LANGS, t
from _ui import NOUNS, Page, card, cats_of, crumbs, data, esc, proto_icon, types_of

PAGE_SIZE = 12

# strings the catalog script needs in the browser
JS_STRINGS = ["all", "products_title", "products_desc", "f_cats", "filter_product_type", "filter_brand",
              "filter_technology", "filter_installation", "filters", "wizard_close", "show_n", "clear_all",
              "results", "load_more", "empty_title", "empty_text", "ask_whatsapp"]


def catalog(lang: str) -> str:
    p, d = Page(lang), data()
    tax, raw = d["tax"], d["tax_raw"]
    prods = d["products"]
    total = {}
    for x in prods:
        for c in cats_of(x):
            total[c] = total.get(c, 0) + 1
    cats = [c for c in raw["categories"] if total.get(c["id"])]

    # what the filter script needs, in this language
    js = {
        "lang": lang,
        "page": PAGE_SIZE,
        "products": [[x["id"], cats_of(x), types_of(x), x.get("brand", ""), x.get("technology") or [],
                      x.get("installation", ""), t(x["title"], lang),
                      " ".join([t(x["title"], lang), x["title"].get("en", ""), x.get("brand", ""), " ".join(p.type(y) for y in types_of(x)),
                                " ".join(types_of(x)), " ".join(p.cat(c) for c in cats_of(x)), " ".join(x.get("technology") or []),
                                t(x.get("short_description"), lang)]).lower()]
                     for x in prods],
        "cats": [[c["id"], t(c["label"], lang), [[ty["id"], t(ty["label"], lang)] for ty in c.get("types", [])]] for c in cats],
        "brands": [b["brand"] for b in d["brands"]],
        "techs": [[x["id"], "" if x["id"] == "KNX" else proto_icon(x["id"])] for x in raw.get("technologies", [])],
        "insts": [[x["id"], t(x["label"], lang)] for x in raw.get("installations", [])],
        "nouns": NOUNS["product"][lang],
        "s": {k: p.s(k) for k in JS_STRINGS},
        "wa": WA_ICON,
        "x": ic("x"),
    }

    tabs = (f'<button class="cat-tab" type="button" data-cat="all" aria-pressed="true"><span class="ct-t">{p.e("all")}</span>'
            f'<span class="n">{len(prods)}</span></button>'
            + "".join(f'<button class="cat-tab" type="button" data-cat="{esc(c["id"])}" aria-pressed="false">'
                      f'<span class="ct-t">{esc(t(c["label"], lang))}</span><span class="n">{total[c["id"]]}</span></button>'
                      for c in cats))
    rail = ('<div class="tabs-wrap"><div class="wrap rail-box">'
            '<button type="button" class="rail-btn rail-prev" data-rail="-1" tabindex="-1" aria-hidden="true"></button>'
            f'<div class="cat-rail cat-line" id="rail" role="toolbar">{tabs}</div>'
            '<button type="button" class="rail-btn rail-next" data-rail="1" tabindex="-1" aria-hidden="true"></button>'
            '</div></div>')

    head = (
        '<section class="page-head cat-head"><div class="wrap">'
        + crumbs([(p.s("breadcrumb_home"), p.base), (p.s("breadcrumb_products"), None)])
        + '<div class="page-head-grid"><div class="reveal">'
        f'<p class="kicker">{p.e("cat_kicker", n=p.count(len(prods), "product"))}</p>'
        f'<h1 class="h2" id="cat-title">{p.e("products_title")}</h1><p class="lead" id="cat-lead">{p.e("products_desc")}</p></div>'
        f'<label class="search"><span class="sr">{p.e("search_ph")}</span>{ic("search")}'
        f'<input id="q" type="search" autocomplete="off" placeholder="{p.e("search_ph")}"><kbd>/</kbd></label>'
        '</div></div></section>'
    )
    sort = (f'<label class="select"><span class="sr">{p.e("sort")}</span><select id="sort">'
            f'<option value="featured">{p.e("sort_featured")}</option><option value="name">{p.e("sort_name")}</option>'
            f'<option value="brand">{p.e("sort_brand")}</option></select></label>')
    fbtn = (f'<button class="btn btn-line btn-sm btn-filters" type="button" data-filters>{ic("filter")}{p.e("filters")}'
            '<span class="fg-n" id="fcount" hidden></span></button>')
    shown = min(PAGE_SIZE, len(prods))
    cards = "".join(card(p, x, "" if i < PAGE_SIZE else " hidden") for i, x in enumerate(prods))
    more = ""
    if len(prods) > PAGE_SIZE:
        more = (f'<div class="load-more"><div class="bar"><span style="width:{round(shown / len(prods) * 100)}%"></span></div>'
                f'<p>{p.s("results", a=shown, n=esc(p.count(len(prods), "product")))}</p>'
                f'<button class="btn btn-line" type="button" data-more>{p.e("load_more")}</button></div>')
    body = (
        '<div class="wrap cat-body" id="cbody">'
        f'<aside class="filters" id="filters" aria-label="{p.e("filters")}"></aside>'
        f'<div class="toolbar tb3">{fbtn}<div class="active-chips" id="chips"></div>'
        f'<div class="toolbar-r"><p class="results-count" id="count">{p.s("results", a=shown, n=esc(p.count(len(prods), "product")))}</p>{sort}</div></div>'
        f'<div class="grid grid-4" id="grid">{cards}</div><div id="more">{more}</div></div>'
        '<div class="scrim" id="scrim"></div>'
    )
    data_json = json.dumps(js, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return head + rail + body + f'<script type="application/json" id="cat-data">{data_json}</script>'


if __name__ == "__main__":
    for l in LANGS:
        print(l, len(catalog(l)), "chars")
