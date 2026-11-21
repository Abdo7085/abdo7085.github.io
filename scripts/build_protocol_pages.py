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
from _ui import Page, brand_mark, card, crumbs, data, esc, proto_mark, ruler
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


# Icons for the "graph" diagrams (24-unit grid, same stroke style)
_GRAPH_ICONS = dict(_DEV_ICONS,
    router='<rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 17h.01M10 17h.01"/><path d="M8.5 9.5a5 5 0 0 1 7 0M6 7a8.5 8.5 0 0 1 12 0"/>',
    switch='<rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 11h2M10 11h2M14 11h2M6 14h12"/>',
    ap='<circle cx="12" cy="15" r="6"/><circle cx="12" cy="15" r="1.5"/><path d="M8.5 6.5a5 5 0 0 1 7 0M6 4a8.5 8.5 0 0 1 12 0"/>',
    phone='<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
    cloud='<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5z"/>',
    relay='<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h5"/><path d="M16 16h.01"/>',
    dimmer='<circle cx="12" cy="12" r="8"/><path d="M12 4v4"/><path d="M12 12l4-3"/>',
    shutter=ICONS["blinds"],
    bulb=ICONS["bulb"],
    cameras='<rect x="1.5" y="4.5" width="2.5" height="15" rx="1"/><path d="M4 15.5h3.5l3-3.6"/><g transform="rotate(24 14 8)"><path d="M7 4.2h14.5l-1.6 2.8H7z"/><path d="M8.2 7h10.6v4.2H9.7a1.5 1.5 0 0 1-1.5-1.5z"/><rect x="18.8" y="7.9" width="2.6" height="2.5" rx=".6"/></g>',   # wall-mounted surveillance camera
    door='<rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="8" r="2.5"/><path d="M10 15h4M10 18h4"/>',
    monitor='<rect x="2" y="4" width="20" height="13" rx="2"/><circle cx="8" cy="10.5" r="2.5"/><path d="M13 9h5M13 12h4M9 21h6"/>',
    hub='<rect x="3" y="8" width="18" height="10" rx="3"/><circle cx="12" cy="13" r="1.5"/><path d="M8.5 5a5 5 0 0 1 7 0"/>',
    sensor='<rect x="7" y="3" width="10" height="18" rx="3"/><path d="M12 8v4"/>',
    bluetooth='<path d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11"/>',
    apps='<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
)

_LINK = {"wire": "kd-drop", "radio": "kd-wifi", "mesh": "kd-mesh", "load": "kd-load", "net": "kd-net"}


def graph_diagram(g: dict, x: dict, title: str) -> str:
    """A diagram described in the protocol file ("graph"): nodes placed by their centre, links
    between them. Node kinds: box (icon + label, 140 x 82), pill (label, 120 x 40), bus (a yellow
    line from x1 to x2 with its label above), text (a yellow caption). Link styles: wire, radio,
    mesh, load, net. A link meets the edge of each box; a link to a bus drops straight onto it."""
    nodes = {n["id"]: n for n in g["nodes"]}

    def size(n):
        k = n.get("kind", "box")
        if k == "box":
            return n.get("w", 140) / 2, n.get("h", 82) / 2
        if k == "pill":
            return n.get("w", 120) / 2, 20
        return 0, 0

    def edge(n, tx, ty):
        hw, hh = size(n)
        dx, dy = tx - n["x"], ty - n["y"]
        if not (hw and (dx or dy)):
            return n["x"], n["y"]
        k = min(hw / abs(dx) if dx else 1e9, hh / abs(dy) if dy else 1e9)
        return n["x"] + dx * k, n["y"] + dy * k

    links = ""
    for a, b, style in g.get("links", []):
        na, nb = nodes[a], nodes[b]
        if nb.get("kind") == "bus":
            x1, y1 = edge(na, na["x"], nb["y"])
            x2, y2 = na["x"], nb["y"]
        else:
            x1, y1 = edge(na, nb["x"], nb["y"])
            x2, y2 = edge(nb, na["x"], na["y"])
        links += f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" class="{_LINK[style]}"/>'

    body = ""
    for n in g["nodes"]:
        k, cx, cy = n.get("kind", "box"), n.get("x"), n["y"]
        label = x.get(n["id"], "")
        if k == "bus":
            body += (f'<line x1="{n["x1"]}" y1="{cy}" x2="{n["x2"]}" y2="{cy}" class="kd-bus"/>'
                     f'<text x="{n.get("lx", (n["x1"] + n["x2"]) / 2)}" y="{cy - 24}" class="kd-bus-t">{esc(label)}</text>')
        elif k == "text":
            body += f'<text x="{cx}" y="{cy}" class="kd-t kd-y">{esc(label)}</text>'
        elif k == "pill":
            hw, _ = size(n)
            body += (f'<rect x="{cx - hw}" y="{cy - 20}" width="{hw * 2}" height="40" rx="20" class="kd-pill"/>'
                     f'<text x="{cx}" y="{cy}" class="kd-t">{esc(label)}</text>')
        else:
            hw, hh = size(n)
            lines = label.split("\n")
            top = cy - hh
            iy, ty = (top + 5, (top + 46, top + 67)) if len(lines) > 1 else (top + 12, (top + 58,))
            txt = "".join(f'<text x="{cx}" y="{yy}" class="kd-t">{esc(l)}</text>' for l, yy in zip(lines, ty))
            cls = "kd-box kd-ps" if n.get("accent") else "kd-box"
            body += (f'<rect x="{cx - hw}" y="{top}" width="{hw * 2}" height="{hh * 2}" rx="10" class="{cls}"/>'
                     f'<g transform="translate({cx - 13} {iy}) scale(1.0833)" class="kd-ic">{_GRAPH_ICONS[n["icon"]]}</g>{txt}')
    w, h = g.get("view", [940, 390])
    return (f'<figure class="kd dark"><svg viewBox="0 0 {w} {h}" role="img" aria-label="{esc(title)}">'
            + links + body + '</svg></figure>')


DIAGRAMS = {"knx": knx_diagram}


# ---------------- Protocols list (protocols.html) ----------------

def ordered(d: dict) -> list:
    """Every protocol, the one with the most products first (then by name)."""
    return sorted(d["protocols"], key=lambda pr: (-len(products_of(pr, d["products"])), pr["name"].lower()))


def protocols(lang: str) -> str:
    p, d = Page(lang), data()
    rows = []
    for pr in ordered(d):
        mine = products_of(pr, d["products"])
        rows.append(
            '<article class="ledger-row crop-host">'
            f'<div class="ledger-logo recess crop">{proto_mark(pr, decorative=True)}</div>'
            f'<div><div class="ledger-name"><h2 class="h3"><a href="{p.protocol_url(pr["id"])}">{esc(pr["name"])}</a></h2>'
            f'<span class="ledger-origin">{esc(t(pr.get("kicker"), lang))}</span></div>'
            f'<p class="ledger-tag">{esc(t(pr.get("tagline"), lang))}</p></div>'
            '<div class="ledger-focus"></div>'
            f'<div class="ledger-count"><b>{len(mine)}</b><span>{p.e("in_catalogue")}</span></div>'
            '</article>')
    return (
        '<section class="page-head"><div class="wrap">'
        + crumbs([(p.s("breadcrumb_home"), p.base), (p.s("nav_protocols"), None)])
        + '<div class="page-head-grid"><div class="reveal">'
        f'<p class="kicker">{p.e("protocols_kicker", n=p.count(len(d["protocols"]), "protocol"))}</p>'
        f'<h1 class="h2">{p.e("protocols_hero_title")}</h1></div><p class="lead">{p.e("protocols_hero_subtitle")}</p></div></div></section>'
        '<section class="wrap"><div class="ledger">' + "".join(rows) + '</div></section>'
        + contact(p)
    )


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

    logo = proto_mark(pr)
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

    out = ('<div class="wrap pd-wrap">'
           + crumbs([(p.s("breadcrumb_home"), p.base), (p.s("nav_protocols"), f"{p.base}protocols.html"), (name, None)])
           + hero + '</div>')

    if pr.get("diagram_labels"):
        how = p.s("proto_how", name=name)
        labels = pr["diagram_labels"][lang]
        fig = graph_diagram(pr["graph"], labels, how) if pr.get("graph") else DIAGRAMS[pr["diagram"]](labels, how)
        out += ('<section class="sec-tight"><div class="wrap">' + ruler(how, p.s("proto_diagram")) + fig + '</div></section>')

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
        print(l, len(protocols(l)), len(protocol(l, "knx")), "chars")
