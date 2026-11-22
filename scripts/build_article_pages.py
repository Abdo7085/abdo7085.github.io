#!/usr/bin/env python3
"""
Article pages as static HTML.

`articles(lang)`      — articles.html: every article as a card, newest first, with two filter
                        rows (protocol, article type); assets/se-articles.js filters them and keeps
                        the choice in the address (?protocol=knx&type=guide), so a protocol page
                        can link to "all KNX articles".
`article(lang, id)`   — articles/<id>.html: type, date and reading time, the title, the summary,
                        the protocols it covers (links), the text, the products it mentions,
                        more articles on the same protocols, then the contact block.
`latest(p, pid)`      — the "Articles about <protocol>" block of a protocol page: its three newest
                        articles and a link to all of them.

Data: data/articles/<id>.json — date, type, protocols (ids of data/protocols), related_products,
title / summary / seo_title in en/fr/ar, "icon" (a diagram icon name, drawn on the card), and
"body": per language a list of blocks {"h2": text} {"p": text} {"ul": [text, ...]} {"tip": text}
{"figure": name} (a diagram from the article's "figures": {name: {"graph", "labels": {lang: {...}}}},
drawn like the protocol diagrams; labels may hold a "caption") or {"image": {"src", "alt"}} (a picture
from /assets/articles/). The head of each article page is
written by build_articles.py; build_layout.py puts this between the header and the footer.
"""

from __future__ import annotations

import json
import math

from _diagram import GRAPH_ICONS, graph_diagram, scene
from _icons import ic
from _lib import LANGS, ROOT, t
from _ui import MONTHS, Page, card, crumbs, data, esc, proto, proto_icon, ruler
from build_home import contact

TYPES = ("guide", "comparison", "problems", "explainer")
WORDS_PER_MINUTE = 200


def load_all() -> list:
    """Every article, newest first (then by id, so the order never moves between builds)."""
    arts = [json.loads(f.read_text(encoding="utf-8")) for f in sorted((ROOT / "data" / "articles").glob("*.json"))]
    return sorted(arts, key=lambda a: (a.get("date", ""), a.get("id", "")), reverse=True)


def minutes(a: dict, lang: str) -> int:
    words = 0
    for b in (a.get("body") or {}).get(lang) or []:
        for v in b.values():
            words += sum(len(str(x).split()) for x in (v if isinstance(v, list) else [v]))
    return max(1, math.ceil(words / WORDS_PER_MINUTE))


def day(iso: str, lang: str) -> str:
    return f"{int(iso[8:10])} {MONTHS[lang][int(iso[5:7]) - 1]} {iso[:4]}"


def nb(text: str) -> str:
    """Escaped text in which "Wi-Fi" cannot break at its hyphen (in Arabic a break there
    scrambles the line); the data and the head keep the plain hyphen."""
    return esc(text).replace("Wi-Fi", "Wi‑Fi")


def article_url(p: Page, aid: str) -> str:
    return f"{p.base}articles/{aid}.html"


def _protocols(d: dict) -> dict:
    return {pr["id"]: pr for pr in d["protocols"]}


def cover(a: dict) -> str:
    """The card's header on black glass: the article's "scene" (a small wordless picture of its
    idea, _diagram.scene) — or, without one, its icon drawn large over the bus wires."""
    if a.get("scene"):
        return f'<span class="art-cover art-scene dark" aria-hidden="true">{scene(a["scene"])}</span>'
    icon = GRAPH_ICONS.get(a.get("icon") or "", "")
    return ('<span class="art-cover dark" aria-hidden="true"><i class="art-wires"></i>'
            f'<svg viewBox="0 0 24 24">{icon}</svg></span>')


def art_card(p: Page, a: dict, d: dict) -> str:
    prs = _protocols(d)
    chips = "".join(proto(prs[x]["name"]) for x in a.get("protocols") or [] if x in prs)
    return (
        f'<a class="art-card" href="{article_url(p, a["id"])}" data-p="{esc(" ".join(a.get("protocols") or []))}" data-t="{esc(a["type"])}">'
        + cover(a) +
        f'<span class="art-kind">{p.e("art_type_" + a["type"])}</span>'
        f'<h3 class="h3">{nb(t(a["title"], p.lang))}</h3>'
        f'<p>{nb(t(a["summary"], p.lang))}</p>'
        f'<span class="art-foot"><span class="protos">{chips}</span>'
        f'<span class="art-meta">{esc(day(a["date"], p.lang))} · {esc(p.count(minutes(a, p.lang), "minute"))}</span></span>'
        '</a>')


# ---------------- articles.html ----------------

def articles(lang: str) -> str:
    p, d = Page(lang), data()
    arts = d["articles"]
    prs = _protocols(d)
    used_p = [pr for pr in d["protocols"] if any(pr["id"] in (a.get("protocols") or []) for a in arts)]
    used_t = [x for x in TYPES if any(a["type"] == x for a in arts)]

    def mark(pr):
        if pr.get("logo"):
            return f'<span class="ct-i"><img src="{esc(pr["logo"])}" alt="" width="1069" height="510"></span>'
        icon = proto_icon(pr["name"])
        return f'<span class="ct-i">{icon}</span>' if icon else ""

    tabs = (f'<button class="cat-tab" type="button" data-f="protocol" data-v="all" aria-pressed="true">'
            f'<span class="ct-t">{p.e("all")}</span><span class="n">{len(arts)}</span></button>'
            + "".join(f'<button class="cat-tab" type="button" data-f="protocol" data-v="{esc(pr["id"])}" aria-pressed="false">'
                      f'{mark(pr)}<span class="ct-t">{esc(pr["name"])}</span>'
                      f'<span class="n">{sum(1 for a in arts if pr["id"] in (a.get("protocols") or []))}</span></button>'
                      for pr in used_p))
    rail = ('<div class="tabs-wrap"><div class="wrap rail-box">'
            '<button type="button" class="rail-btn rail-prev" data-rail="-1" tabindex="-1" aria-hidden="true"></button>'
            f'<div class="cat-rail cat-line" id="arail" role="toolbar" aria-label="{p.e("art_filter_protocol")}">{tabs}</div>'
            '<button type="button" class="rail-btn rail-next" data-rail="1" tabindex="-1" aria-hidden="true"></button>'
            '</div></div>')
    types = (f'<div class="art-types" role="toolbar" aria-label="{p.e("art_filter_type")}">'
             f'<span class="label-sm">{p.e("art_filter_type")}</span>'
             f'<button class="art-type" type="button" data-f="type" data-v="all" aria-pressed="true">{p.e("all")}</button>'
             + "".join(f'<button class="art-type" type="button" data-f="type" data-v="{x}" aria-pressed="false">'
                       f'{p.e("art_type_" + x)}<span class="n">{sum(1 for a in arts if a["type"] == x)}</span></button>'
                       for x in used_t)
             + '</div>')
    return (
        '<section class="page-head"><div class="wrap">'
        + crumbs([(p.s("breadcrumb_home"), p.base), (p.s("nav_articles"), None)])
        + '<div class="page-head-grid"><div class="reveal">'
        f'<p class="kicker">{p.e("articles_kicker", n=p.count(len(arts), "article"))}</p>'
        f'<h1 class="h2">{p.e("articles_hero_title")}</h1></div><p class="lead">{p.e("articles_hero_subtitle")}</p></div></div></section>'
        + rail + '<section class="sec-tight art-list"><div class="wrap">' + types
        + '<div class="art-grid" id="agrid">' + "".join(art_card(p, a, d) for a in arts) + '</div>'
        f'<p class="art-none" id="anone" hidden>{p.e("art_none")}</p></div></section>'
        + contact(p)
    )


# ---------------- articles/<id>.html ----------------

def _block(b: dict, a: dict, lang: str) -> str:
    if "figure" in b:
        fig = a["figures"][b["figure"]]
        return graph_diagram(fig["graph"], fig["labels"][lang], t(a["title"], lang))
    if "image" in b:
        im = b["image"]
        return (f'<figure class="art-img"><img src="{esc(im["src"])}" alt="{esc(im["alt"])}" loading="lazy" decoding="async">'
                + (f'<figcaption>{nb(im["caption"])}</figcaption>' if im.get("caption") else "") + '</figure>')
    if "h2" in b:
        return f'<h2 class="h3">{nb(b["h2"])}</h2>'
    if "p" in b:
        return f'<p>{nb(b["p"])}</p>'
    if "ul" in b:
        return "<ul>" + "".join(f"<li>{nb(x)}</li>" for x in b["ul"]) + "</ul>"
    if "tip" in b:
        return f'<aside class="art-tip">{nb(b["tip"])}</aside>'
    return ""


def article(lang: str, aid: str) -> str:
    p, d = Page(lang), data()
    a = next(x for x in d["articles"] if x["id"] == aid)
    prs = _protocols(d)
    names = [prs[x]["name"] for x in a.get("protocols") or [] if x in prs]
    mine = [d["by_id"][x] for x in a.get("related_products") or [] if x in d["by_id"]]
    more = [x for x in d["articles"] if x["id"] != aid and set(x.get("protocols") or []) & set(a.get("protocols") or [])][:3]

    out = (
        '<div class="wrap pd-wrap art-wrap">'
        + crumbs([(p.s("breadcrumb_home"), p.base), (p.s("nav_articles"), f"{p.base}articles.html"), (t(a["title"], lang), None)])
        + '<header class="art-head reveal">'
        f'<p class="kicker">{p.e("art_type_" + a["type"])} · {esc(day(a["date"], lang))} · {esc(p.count(minutes(a, lang), "minute"))}</p>'
        f'<h1 class="h2">{nb(t(a["title"], lang))}</h1>'
        f'<p class="lead">{nb(t(a["summary"], lang))}</p>'
        + ('<div class="protos">' + "".join(proto(n, p) for n in names) + '</div>' if names else "")
        + '</header>'
        '<div class="art-body">' + "".join(_block(b, a, lang) for b in a["body"][lang]) + '</div></div>'
    )
    if mine:
        out += ('<section class="sec-tight"><div class="wrap">' + ruler(p.s("art_products"), p.count(len(mine), "product"))
                + '<div class="grid grid-4">' + "".join(card(p, q) for q in mine) + '</div></div></section>')
    if more:
        out += ('<section class="sec-tight"><div class="wrap">' + ruler(p.s("art_more"))
                + '<div class="art-grid">' + "".join(art_card(p, x, d) for x in more) + '</div>'
                f'<a class="link-arrow" href="{p.base}articles.html">{p.e("art_all")}{ic("arrow")}</a></div></section>')
    return out + contact(p)


# ---------------- block on a protocol page ----------------

def latest(p: Page, pid: str, name: str) -> str:
    d = data()
    arts = [a for a in d["articles"] if pid in (a.get("protocols") or [])]
    if not arts:
        return ""
    return ('<section class="sec-tight"><div class="wrap">' + ruler(p.s("art_proto_t", name=name), p.count(len(arts), "article"))
            + '<div class="art-grid">' + "".join(art_card(p, a, d) for a in arts[:3]) + '</div>'
            f'<a class="link-arrow" href="{p.base}articles.html?protocol={esc(pid)}">{p.e("art_proto_all", name=name)}{ic("arrow")}</a>'
            '</div></section>')


if __name__ == "__main__":
    for l in LANGS:
        print(l, len(articles(l)), [len(article(l, a["id"])) for a in load_all()])
