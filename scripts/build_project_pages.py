#!/usr/bin/env python3
"""
Project pages as static HTML (redesign phase 7, wave 5).

`projects(lang)`   — previous-work.html: every case study as a black-glass plate,
                     with tabs by kind of work, then the contact block.
`project(lang, id)` — projects/<id>.html: the cover hero, the facts (place, date,
                     duration, scope), the story and the client's words, the photo
                     and video gallery, the brands and protocols used, the products
                     installed, and the next project.

Data: data/projects_index.json, data/projects/<id>.json, products_index.json and
brands_index.json. Heads (title, meta, JSON-LD) stay with build_projects.py;
build_layout.py puts this between the header and the footer.
assets/se-projects.js runs the tabs on the list page; the project page needs no script.
"""

from __future__ import annotations

from _icons import ic
from _lib import LANGS, t
from _ui import Page, crumbs, data, esc, pimg, protos, ruler
from build_home import contact, plate


def _pcat(p: Page, c: str) -> str:
    return t(data()["tax"].project_category_labels.get(c, c), p.lang)


def projects(lang: str) -> str:
    p, d = Page(lang), data()
    lst = d["projects"]
    used = []
    for pj in lst:
        for c in pj.get("categories") or []:
            if c not in used:
                used.append(c)
    order = [x["id"] for x in d["tax_raw"].get("project_categories", []) if x["id"] in used]
    tabs = (f'<button class="cat-tab" type="button" data-pcat="all" aria-pressed="true">{p.e("all")}<span class="n">{len(lst)}</span></button>'
            + "".join(f'<button class="cat-tab" type="button" data-pcat="{esc(c)}" aria-pressed="false">{esc(_pcat(p, c))}'
                      f'<span class="n">{sum(1 for pj in lst if c in (pj.get("categories") or []))}</span></button>' for c in order))
    plates = "".join(plate(p, d, pj, i).replace('<article class="plate', f'<article data-cats="{esc("|".join(pj.get("categories") or []))}" class="plate', 1)
                     for i, pj in enumerate(lst))
    return (
        '<section class="page-head"><div class="wrap">'
        + crumbs([(p.s("breadcrumb_home"), p.base), (p.s("nav_projects"), None)])
        + '<div class="page-head-grid"><div class="reveal">'
        f'<p class="kicker">{p.e("pw_kicker", n=p.count(len(lst), "project"))}</p>'
        f'<h1 class="display pw-title">{p.s("pw_title")}</h1></div>'
        f'<p class="lead">{p.e("spa_previous_work_lead")}</p></div></div></section>'
        '<section class="wrap"><div class="rail-box in-wrap">'
        '<button type="button" class="rail-btn rail-prev" data-rail="-1" tabindex="-1" aria-hidden="true"></button>'
        f'<div class="tabs cat-rail" id="ptabs" role="toolbar">{tabs}</div>'
        '<button type="button" class="rail-btn rail-next" data-rail="1" tabindex="-1" aria-hidden="true"></button></div>'
        f'<div class="plates" id="plates">{plates}</div></section>'
        + contact(p)
    )


def _tile(p: Page, prod: dict) -> str:
    """An installed product, drawn like the homepage category cards (D8.4): light photo,
    black-glass base with the yellow hairline, name, brand · type, arrow key."""
    return (f'<a class="tile" href="{p.product_url(prod["id"])}">'
            f'<span class="tile-img recess">{pimg(prod.get("image"), "(max-width: 760px) 46vw, 280px")}</span>'
            f'<span class="tile-t"><b>{esc(t(prod["title"], p.lang))}</b>'
            f'<small>{esc(prod.get("brand"))} · {esc(p.type(prod.get("product_type")))}</small></span>'
            f'<span class="tile-go">{ic("arrow", "flip")}</span></a>')


def project(lang: str, pid: str) -> str:
    p, d = Page(lang), data()
    lst = d["projects"]
    pos = next((i for i, x in enumerate(lst) if x["id"] == pid), 0)
    nxt = lst[(pos + 1) % len(lst)] if lst else None
    pj = d["full"].get(pid) or {}
    title = t(pj.get("title"), lang)

    prods = [d["by_id"][x] for x in pj.get("related_products") or [] if x in d["by_id"]]
    brands = []
    for x in prods:
        if x.get("brand") not in brands:
            brands.append(x.get("brand"))
    for b in pj.get("extra_brands") or []:
        b = t(b, lang) if isinstance(b, dict) else b   # a generic name ("advanced server") is translated
        if b not in brands:
            brands.append(b)
    techs = []
    for x in prods:
        for tech in x.get("technology") or []:
            if tech not in techs:
                techs.append(tech)
    for tech in pj.get("extra_protocols") or []:
        if tech not in techs:
            techs.append(tech)
    tst = pj.get("testimonial")

    media = pj.get("media") or []
    has_reel = any(m.get("type") == "reel" for m in media)
    n_img = sum(1 for m in media if m.get("type") == "image")
    figs = []
    for i, m in enumerate(media):
        fig = p.s("fig", n=f"{i + 1:02d}")
        if m.get("type") == "image":
            size = " span8" if has_reel else (" hero" if n_img >= 3 and i == 0 else "")
            figs.append(f'<figure class="gal-item{size}"><img src="{esc(m["src"])}" alt="{esc(t(m.get("alt"), lang))}" loading="lazy" decoding="async">'
                        f'<figcaption><b>{esc(fig)}</b>{esc(t(m.get("alt"), lang))}</figcaption></figure>')
        else:
            poster = f' poster="{esc(m["poster"])}"' if m.get("poster") else ""
            cap = (f'<figcaption><b>{esc(fig)}</b><a href="{esc(m["instagram_url"])}" target="_blank" rel="noopener">{p.e("watch_reel")}</a></figcaption>'
                   if m.get("instagram_url") else "")
            figs.append(f'<figure class="gal-item{" tall" if m.get("type") == "reel" else " hero"}"><video src="{esc(m["src"])}"{poster} controls playsinline preload="metadata"></video>{cap}</figure>')

    logos = []
    for b in brands:
        bi = d["brand_by_name"].get(b)
        logos.append(f'<a class="recess" href="{p.brand_url(bi["id"])}"><img src="{esc(bi["logo"])}" alt="{esc(b)}" loading="lazy"></a>'
                     if bi and bi.get("logo") else f'<span class="recess txt">{esc(b)}</span>')

    story_side = (f'<aside class="testimonial dark"><p class="label-sm">{p.e("client_words")}</p>'
                  f'<blockquote>{esc(t(tst.get("quote"), lang))}</blockquote><cite>— {esc(tst.get("author", ""))}</cite></aside>'
                  if tst and t(tst.get("quote"), lang) else '<span></span>')
    days = pj.get("duration_days")
    return (
        f'<section class="pj-hero"><img src="{esc(pj.get("cover", ""))}" alt="" fetchpriority="high">'
        '<div class="wrap pj-hero-in reveal">'
        + crumbs([(p.s("breadcrumb_home"), p.base), (p.s("nav_projects"), f"{p.base}previous-work.html"), (title, None)])
        + f'<p class="kicker pj-n">{p.e("case_n", n=f"{pos + 1:02d}")}</p>'
        f'<h1 class="display">{esc(title)}</h1></div></section>'
        '<div class="wrap pj-facts"><dl class="facts">'
        f'<div><dt>{p.e("location")}</dt><dd>{esc(p.city(pj.get("location", "")))}</dd></div>'
        f'<div><dt>{p.e("completed")}</dt><dd>{esc(p.date(pj["date"])) if pj.get("date") else "—"}</dd></div>'
        f'<div><dt>{p.e("duration")}</dt><dd>{esc(p.count(int(days), "day")) if days else "—"}</dd></div>'
        f'<div><dt>{p.e("scope")}</dt><dd>{esc(" · ".join(_pcat(p, c) for c in pj.get("categories") or []))}</dd></div>'
        '</dl></div>'
        '<section class="sec-tight"><div class="wrap">' + ruler(p.s("the_project"))
        + f'<div class="pj-story"><div class="prose"><p>{esc(t(pj.get("description"), lang))}</p></div>{story_side}</div></div></section>'
        + ('<section class="sec-tight"><div class="wrap">' + ruler(p.s("proj_gallery_title"), p.count(len(media), "media"))
           + '<div class="gallery">' + "".join(figs) + '</div></div></section>' if figs else "")
        + '<section class="sec-tight"><div class="wrap">' + ruler(p.s("proj_brands_title"))
        + f'<div class="stack-row"><div class="stack-box"><p class="label-sm">{p.e("proj_brands_label")}</p><div class="stack-logos">{"".join(logos)}</div></div>'
        f'<div class="stack-box"><p class="label-sm">{p.e("proj_protocols_label")}</p>{protos(techs).replace('class="protos"', 'class="protos protos-lg"', 1)}</div></div>'
        '</div></section>'
        + ('<section class="sec-tight"><div class="wrap">' + ruler(p.s("products_used"), p.count(len(prods), "product"))
           + '<div class="tiles tiles-base">' + "".join(_tile(p, x) for x in prods) + '</div></div></section>' if prods else "")
        # next project: the same black-glass base with the yellow hairline, as one link
        + (f'<section class="sec-tight"><div class="wrap"><a class="next-pj" href="{p.base}projects/{esc(nxt["id"])}.html">'
           f'<span class="next-pj-t"><small>{p.e("next_project")}</small><b class="h3">{esc(t(nxt["title"], lang))}</b></span>'
           f'<span class="tile-go">{ic("arrow", "flip")}</span></a></div></section>' if nxt and nxt["id"] != pid else "")
        + contact(p)
    )


if __name__ == "__main__":
    for l in LANGS:
        print(l, len(projects(l)), len(project(l, "huerto-pool-tetouan")), "chars")
