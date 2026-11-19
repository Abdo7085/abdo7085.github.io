#!/usr/bin/env python3
"""
Product pages (products/<id>.html) as static HTML (redesign phase 7, wave 3).

`page(lang, pid)` returns the inside of <main> for one product in one
language: breadcrumbs, the photo gallery, the info cells, the quote box
(quantity + "add to quote"), the description, the specifications and four
related products, plus the sticky buy bar for phones. Everything comes from
data/products/<id>.json, data/product_images.json and products_index.json.

assets/se-product.js wires the gallery thumbnails, the quantity, the
"show all specifications" toggle and the buy bar; the add buttons use the
cart's data-trigger="cart-add" (qty from .pd-qty-input in .pd-cart-row).
"""

from __future__ import annotations

from _icons import WA_ICON, ic
from _lib import LANGS, t
from _ui import Page, card, crumbs, data, esc, pimg, product, protos, ruler, brand_logo

SPEC_LIMIT = 8


def page(lang: str, pid: str) -> str:
    p, d = Page(lang), data()
    prod = product(pid)
    idx = d["by_id"].get(pid, {})
    cat = idx.get("category", "")
    title = t(prod["title"], lang)
    imgs = d["images"].get(pid) or ([idx["image"]] if idx.get("image") else [])
    n_img = max(len(imgs), 1)
    fig = lambda i: f'{p.s("fig", n=f"{i:02d}")} / {n_img:02d}'

    related = [x for x in d["products"] if x.get("category") == cat and x["id"] != pid]
    related.sort(key=lambda x: x.get("brand") != prod.get("brand"))  # same brand first, stable
    related = related[:4]

    specs = (prod.get("specs") or {}).get(lang) or (prod.get("specs") or {}).get("en") or {}
    files = prod.get("files") or []
    brand_id = (d["brand_by_name"].get(prod.get("brand")) or {}).get("id") or str(prod.get("brand", "")).lower().replace(" ", "-")

    thumbs = ""
    if len(imgs) > 1:
        thumbs = '<div class="pd-thumbs">' + "".join(
            f'<button class="pd-thumb recess" type="button" data-thumb="{i}" aria-current="{"true" if i == 0 else "false"}" '
            f'aria-label="{esc(p.s("fig", n=f"{i + 1:02d}"))}">{pimg(img, "76px")}</button>'
            for i, img in enumerate(imgs)) + '</div>'
    gallery = ('<div class="pd-gallery"><div class="pd-stage recess crop static" id="stage">'
               + pimg(imgs[0] if imgs else None, "(max-width: 960px) 92vw, 560px", title, eager=True)
               + f'<span class="pd-fig" id="fig" data-of="{n_img:02d}">{esc(fig(1))}</span></div>' + thumbs + '</div>')

    qty = ('<div class="qty">'
           f'<button type="button" data-qty="-1" aria-label="{p.e("cart_aria_decrease")}">{ic("minus")}</button>'
           '<output id="qty">1</output><input class="pd-qty-input" type="hidden" value="1">'
           f'<button type="button" data-qty="1" aria-label="{p.e("cart_aria_increase")}">{ic("plus")}</button></div>')
    info = (
        '<div class="pd-info">'
        f'<div class="pd-eyebrow"><a href="{p.brand_url(brand_id)}">{brand_logo(prod.get("brand"))}</a>'
        f'<span class="dash"></span><span>{esc(p.type(prod.get("product_type")))}</span></div>'
        f'<h1 class="h2 pd-title">{esc(title)}</h1>'
        f'<p class="pd-short">{esc(t(prod.get("short_description"), lang))}</p>'
        '<dl class="pd-cells">'
        f'<div class="pd-cell recess"><dt>{p.e("pd_protocols")}</dt><dd>{protos(prod.get("technology"))}</dd></div>'
        f'<div class="pd-cell recess"><dt>{p.e("pd_installation")}</dt><dd>{esc(p.inst(prod.get("installation")))}</dd></div>'
        f'<div class="pd-cell recess"><dt>{p.e("filter_category")}</dt><dd><a href="{p.catalog_url(cat)}">{esc(p.cat(cat))}</a></dd></div>'
        '</dl>'
        '<div class="pd-buy" id="buy"><div class="pd-buy-row pd-cart-row">' + qty
        + f'<button class="btn btn-primary" type="button" data-trigger="cart-add" data-product-id="{esc(pid)}" data-qty-source>'
        f'{ic("quote")}{p.e("cart_pd_add_btn")}</button></div>'
        f'<p class="pd-hint">{WA_ICON}{p.e("cart_pd_hint")}</p></div>'
        + (f'<div><p class="label-sm">{p.e("downloads")}</p><div class="files">' + "".join(
            f'<a class="file" href="{esc(f["url"])}" target="_blank" rel="noopener">{ic("file")}{esc(f["name"])}</a>' for f in files)
           + '</div></div>' if files else "")
        + '</div>'
    )

    keys = list(specs)
    rows = "".join(f'<tr{" data-extra hidden" if i >= SPEC_LIMIT else ""}><th scope="row">{esc(k)}</th><td>{esc(specs[k])}</td></tr>'
                   for i, k in enumerate(keys))
    more = ('<div class="pd-more">'
            f'<section class="panel"><h2 class="h3">{p.e("about_product")}</h2><div class="prose"><p>{esc(t(prod.get("description"), lang))}</p></div></section>'
            + (f'<section class="panel"><h2 class="h3">{p.e("specifications")}</h2><table class="specs"><tbody>{rows}</tbody></table>'
               + (f'<button class="btn btn-line btn-sm specs-more" type="button" data-specs aria-expanded="false" '
                  f'data-more="{p.e("specs_more", n=len(keys))}" data-less="{p.e("specs_less")}">{p.e("specs_more", n=len(keys))}</button>'
                  if len(keys) > SPEC_LIMIT else "")
               + '</section>' if keys else "")
            + '</div>')

    rel = ""
    if related:
        rel = ('<section class="sec-tight"><div class="wrap">'
               + ruler(p.s("related_products"), p.s("more_in", c=p.cat(cat)))
               + '<div class="grid grid-4 rail">' + "".join(card(p, x) for x in related) + '</div></div></section>')

    return (
        '<div class="wrap pd-wrap">'
        + crumbs([(p.s("breadcrumb_home"), p.base), (p.s("breadcrumb_products"), p.catalog_url()),
                  (p.cat(cat), p.catalog_url(cat)), (title, None)])
        + '<div class="pd reveal">' + gallery + info + '</div>' + more + '</div>' + rel
        + f'<div class="buybar" id="buybar"><span class="buybar-t">{esc(title)}</span>'
        f'<button class="btn btn-primary btn-sm" type="button" data-trigger="cart-add" data-product-id="{esc(pid)}">{p.e("cart_add_to_quote")}</button></div>'
    )


if __name__ == "__main__":
    for l in LANGS:
        print(l, len(page(l, "zennio-z50")), "chars")
