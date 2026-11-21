#!/usr/bin/env python3
"""
Protocol pages as static HTML: protocols/<id>.html (and fr/, ar/).

`protocol(lang, id)` — the protocol's hero (logo, facts, description), how an installation
works (a diagram), when to choose it, the brands we supply for it, its products with category
tabs, the projects that used it, then the contact block.

Data: data/protocols/<id>.json (texts in en/fr/ar, the technology names it covers in "match")
joined with products_index.json and projects_index.json. A product belongs to a protocol when
one of its "technology" values is in "match"; a project, when it uses one of those products or
lists the protocol in "extra_protocols". The head of each page (title, meta, JSON-LD) is written
by build_protocols.py; build_layout.py puts this between the header and the footer.
assets/se-brand.js filters the products by category and shows all of them.

The diagram is drawn per protocol (DIAGRAMS below, picked by the file's "diagram"); its labels
come from the file's "diagram_labels", and a label may break over two lines with "\\n".
"""

from __future__ import annotations

import json

from _icons import ICONS
from _lib import LANGS, ROOT, t
from _ui import Page, brand_mark, card, crumbs, data, esc, ruler
from build_home import contact, plate

LIMIT = 12


def load(pid: str) -> dict:
    f = ROOT / "data" / "protocols" / f"{pid}.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}


def products_of(pr: dict, products: list) -> list:
    names = {m.lower() for m in pr.get("match") or []}
    return [q for q in products if any(str(x).lower() in names for x in q.get("technology") or [])]


def projects_of(pr: dict, d: dict, mine: list) -> list:
    ids = {q["id"] for q in mine}
    names = {m.lower() for m in pr.get("match") or []}
    out = []
    for pj in d["projects"]:
        full = d["full"].get(pj["id"]) or {}
        if ids & set(full.get("related_products") or []) or \
                any(str(x).lower() in names for x in full.get("extra_protocols") or []):
            out.append(pj)
    return out


# ---------------- Diagrams ----------------

# 24-unit icons in the site's stroke style
_DEV_ICONS = dict(
    buttons='<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 3v18M3 12h18"/><path d="M7.5 7.5h.01M16.5 7.5h.01"/>',
    thermostat=ICONS["thermo"],
    panel='<rect x="2" y="4" width="20" height="15" rx="2"/><rect x="5" y="7" width="6" height="4" rx="1"/><rect x="13" y="7" width="6" height="4" rx="1"/><path d="M5 15h14"/>',
    actuators='<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 6h.01M12 6h.01M15 6h.01M9 18h.01M12 18h.01M15 18h.01"/><rect x="8" y="10" width="8" height="4" rx="1"/>',
    gateway='<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h8l-2-2M18 14h-8l2 2"/>',
    ip='<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
)


def knx_diagram(x: dict, title: str) -> str:
    """The bus as a yellow line on black glass; six devices hang off it; the actuators drive the
    lights and shutters, the climate gateway the air conditioning, the IP interface reaches the app."""
    W = 140

    def dev(cx, key):
        lines = x[key].split("\n")
        iy, ty = (183, (224, 245)) if len(lines) > 1 else (190, (236,))
        txt = "".join(f'<text x="{cx}" y="{y}" class="kd-t">{esc(l)}</text>' for l, y in zip(lines, ty))
        return (f'<g><line x1="{cx}" y1="150" x2="{cx}" y2="178" class="kd-drop"/>'
                f'<rect x="{cx - W // 2}" y="178" width="{W}" height="82" rx="10" class="kd-box"/>'
                f'<g transform="translate({cx - 13} {iy}) scale(1.0833)" class="kd-ic">{_DEV_ICONS[key]}</g>{txt}</g>')

    def pill(cx, key):
        return (f'<line x1="{cx}" y1="278" x2="{cx}" y2="294" class="kd-load"/>'
                f'<rect x="{cx - 60}" y="294" width="120" height="40" rx="20" class="kd-pill"/>'
                f'<text x="{cx}" y="314" class="kd-t">{esc(x[key])}</text>')

    C = [90, 242, 394, 546, 698, 850]
    keys = ("buttons", "thermostat", "panel", "actuators", "gateway", "ip")
    return (
        f'<figure class="kd dark"><svg viewBox="0 0 940 390" role="img" aria-label="{esc(title)}">'
        '<rect x="20" y="40" width="190" height="56" rx="10" class="kd-box kd-ps"/>'
        f'<text x="115" y="68" class="kd-t">{esc(x["power"])}</text>'
        '<line x1="115" y1="96" x2="115" y2="150" class="kd-drop"/>'
        '<line x1="20" y1="150" x2="920" y2="150" class="kd-bus"/>'
        f'<text x="570" y="126" class="kd-bus-t">{esc(x["bus"])}</text>'
        + "".join(dev(c, k) for c, k in zip(C, keys))
        + f'<line x1="{C[3]}" y1="260" x2="{C[3]}" y2="278" class="kd-load"/>'
          '<line x1="440" y1="278" x2="568" y2="278" class="kd-load"/>'
        + pill(440, "lights") + pill(568, "shutters")
        + f'<line x1="{C[4]}" y1="260" x2="{C[4]}" y2="278" class="kd-load"/>' + pill(C[4], "ac")
        + f'<text x="{C[5]}" y="364" class="kd-t kd-y">{esc(x["app"])}</text>'
        + f'<path d="M{C[5] + 24} 260 C {C[5] + 62} 286, {C[5] + 62} 322, {C[5] + 34} 346" class="kd-wifi"/>'
        '</svg></figure>')


DIAGRAMS = {"knx": knx_diagram}


# ---------------- Page ----------------

def protocol(lang: str, pid: str) -> str:
    p, d = Page(lang), data()
    pr = load(pid)
    name = pr.get("name", pid)
    mine = products_of(pr, d["products"])
    cats = [c for c in d["tax"].category_order if any(q.get("category") == c for q in mine)]
    brands = []
    for q in mine:
        if q.get("brand") not in brands:
            brands.append(q.get("brand"))
    brands.sort(key=lambda n: -sum(1 for q in mine if q.get("brand") == n))
    projs = projects_of(pr, d, mine)

    logo = (f'<img src="{esc(pr["logo"])}" alt="{esc(name)}">' if pr.get("logo") else f'<span class="h2">{esc(name)}</span>')
    facts = ([(p.s("proto_standard"), esc(pr["standard"]), "")] if pr.get("standard") else []) \
        + ([(p.s("proto_medium"), esc(t(pr["medium"], lang)), "")] if pr.get("medium") else []) \
        + [(p.s("proto_brands"), str(len(brands)), "big"), (p.s("products_lbl"), str(len(mine)), "big")]
    hero = (
        '<section class="brand-hero reveal">'
        f'<div class="brand-hero-logo recess crop static">{logo}</div>'
        f'<div class="brand-hero-body"><p class="kicker">{esc(t(pr.get("kicker"), lang))}</p>'
        f'<h1 class="display brand-name">{esc(name)}</h1>'
        f'<p class="lead brand-tag">{esc(t(pr.get("tagline"), lang))}</p>'
        '<dl class="facts">' + "".join(f'<div><dt>{esc(k)}</dt><dd{f" class={chr(34)}{c}{chr(34)}" if c else ""}>{v}</dd></div>' for k, v, c in facts)
        + '</dl>'
        f'<div class="prose"><p>{esc(t(pr.get("description"), lang))}</p></div></div></section>'
    )

    out = '<div class="wrap pd-wrap">' + crumbs([(p.s("breadcrumb_home"), p.base), (name, None)]) + hero + '</div>'

    draw = DIAGRAMS.get(pr.get("diagram"))
    if draw and pr.get("diagram_labels"):
        how = p.s("proto_how", name=name)
        out += ('<section class="sec-tight"><div class="wrap">' + ruler(how, p.s("proto_diagram"))
                + draw(pr["diagram_labels"][lang], how) + '</div></section>')

    yes = (pr.get("when") or {}).get(lang) or []
    if yes:
        no = t(pr.get("less_suited"), lang)
        out += ('<section class="sec-tight"><div class="wrap">' + ruler(p.s("proto_when", name=name), p.s("proto_fit"))
                + '<div class="kw"><ul class="kw-yes">' + "".join(f'<li><span>{esc(s)}</span></li>' for s in yes) + '</ul>'
                + (f'<div class="kw-no"><p class="label-sm">{p.e("proto_less")}</p><p>{esc(no)}</p></div>' if no else "")
                + '</div></div></section>')

    if brands:
        rows = []
        for bname in brands:
            b = d["brand_by_name"].get(bname) or {"brand": bname}
            full = {}
            if b.get("id"):
                f = ROOT / "data" / "brands" / f"{b['id']}.json"
                full = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
            origin = esc(p.country(b.get("country_of_origin", "")))
            if full.get("founded"):
                origin += " · " + p.e("since", y=full["founded"])
            own = [q for q in mine if q.get("brand") == bname]
            chips = "".join(f'<span class="chip">{esc(p.cat(c))}</span>' for c in cats if any(q.get("category") == c for q in own))
            title = f'<a href="{p.brand_url(b["id"])}">{esc(bname)}</a>' if b.get("id") else esc(bname)
            rows.append(
                '<article class="ledger-row crop-host">'
                f'<div class="ledger-logo recess crop">{brand_mark(b, decorative=True)}</div>'
                f'<div><div class="ledger-name"><h3 class="h3">{title}</h3>'
                f'<span class="ledger-origin">{origin}</span></div>'
                f'<p class="ledger-tag">{esc(t(b.get("tagline"), lang))}</p></div>'
                f'<div class="ledger-focus"><div class="ledger-cats">{chips}</div></div>'
                f'<div class="ledger-count"><b>{len(own)}</b><span>{p.e("proto_brand_n", name=name)}</span></div>'
                '</article>')
        out += ('<section class="sec-tight"><div class="wrap">' + ruler(p.s("proto_brands_t", name=name), p.count(len(brands), "brand"))
                + '<div class="ledger">' + "".join(rows) + '</div></div></section>')

    if mine:
        tabs = ""
        if len(cats) > 1:
            tabs = ('<div class="rail-box in-wrap">'
                    '<button type="button" class="rail-btn rail-prev" data-rail="-1" tabindex="-1" aria-hidden="true"></button>'
                    '<div class="tabs cat-rail" id="btabs" role="toolbar">'
                    f'<button class="cat-tab" type="button" data-bcat="all" aria-pressed="true">{p.e("all")}<span class="n">{len(mine)}</span></button>'
                    + "".join(f'<button class="cat-tab" type="button" data-bcat="{esc(c)}" aria-pressed="false">{esc(p.cat(c))}'
                              f'<span class="n">{sum(1 for q in mine if q.get("category") == c)}</span></button>' for c in cats)
                    + '</div><button type="button" class="rail-btn rail-next" data-rail="1" tabindex="-1" aria-hidden="true"></button></div>')
        many = len(mine) > LIMIT
        grid = (f'<div class="grid grid-4{" collapsed" if many else ""}" id="bgrid">'
                + "".join(card(p, q, f' data-c="{esc(q.get("category", ""))}"') for q in mine) + '</div>'
                + (f'<div class="load-more" id="bmore"><button class="btn btn-line" type="button" data-bmore>{p.e("show_all", n=len(mine))}</button></div>' if many else ""))
        out += ('<section class="sec-tight"><div class="wrap">' + ruler(p.s("proto_products", name=name), p.count(len(mine), "product"))
                + tabs + grid + '</div></section>')

    if projs:
        out += ('<section class="sec-tight"><div class="wrap">' + ruler(p.s("proto_projects", name=name), p.count(len(projs), "project"))
                + '<div class="plates">' + "".join(plate(p, d, pj, i) for i, pj in enumerate(projs)) + '</div></div></section>')

    return out + contact(p)


if __name__ == "__main__":
    for l in LANGS:
        print(l, len(protocol(l, "knx")), "chars")
