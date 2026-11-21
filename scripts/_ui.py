"""
Shared pieces for the pages written at build time (redesign phase 7):
strings per language, counted nouns, links, images, the product card,
protocol chips, breadcrumbs and section heads. Same markup as the design
prototype (docs/redesign/proto.js); styles in assets/se-pages.css.
"""

from __future__ import annotations

import html as _html
import json
from functools import lru_cache
from urllib.parse import quote

from _icons import ic
from _lib import ROOT, load_locale, load_taxonomy, t

WHATSAPP = "212654132112"
PHONE_TEL = "+212654132112"
PHONE_TXT = "+212 654-132112"

# Counted nouns. Arabic: 1 / 2 / 3–10 / 11+
NOUNS = {
    "product": {"en": ["product", "products"], "fr": ["produit", "produits"], "ar": ["منتج واحد", "منتجان", "منتجات", "منتجاً"]},
    "brand": {"en": ["brand", "brands"], "fr": ["marque", "marques"], "ar": ["علامة واحدة", "علامتان", "علامات", "علامة"]},
    "day": {"en": ["day", "days"], "fr": ["jour", "jours"], "ar": ["يوم واحد", "يومان", "أيام", "يوماً"]},
    "project": {"en": ["case study", "case studies"], "fr": ["étude de cas", "études de cas"], "ar": ["مشروع واحد", "مشروعان", "مشاريع", "مشروعاً"]},
    "media": {"en": ["photo & video", "photos & videos"], "fr": ["photo et vidéo", "photos et vidéos"], "ar": ["صورة واحدة", "صورتان", "صور وفيديو", "صورة وفيديو"]},
}
MONTHS = {
    "en": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    "fr": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
    "ar": ["يناير", "فبراير", "مارس", "أبريل", "ماي", "يونيو", "يوليوز", "غشت", "شتنبر", "أكتوبر", "نونبر", "دجنبر"],
}
CITY = {"Tetouan, Morocco": {"fr": "Tétouan, Maroc", "ar": "تطوان، المغرب"}}
COUNTRIES = {"Spain": {"fr": "Espagne", "ar": "إسبانيا"}, "Turkey": {"fr": "Turquie", "ar": "تركيا"},
             "Bulgaria": {"fr": "Bulgarie", "ar": "بلغاريا"}, "China": {"fr": "Chine", "ar": "الصين"}}


def esc(v) -> str:
    return _html.escape("" if v is None else str(v), quote=True)


def wa(text: str = "") -> str:
    return f"https://wa.me/{WHATSAPP}" + (f"?text={quote(text)}" if text else "")


@lru_cache(maxsize=None)
def data():
    """Everything the pages read from data/, loaded once per build."""
    rd = lambda p: json.loads((ROOT / p).read_text(encoding="utf-8"))
    products = rd("data/products_index.json")
    projects = rd("data/projects_index.json")
    full = {}
    for pj in projects:
        f = ROOT / "data" / "projects" / f"{pj['id']}.json"
        full[pj["id"]] = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    brands = rd("data/brands_index.json")
    protocols = [json.loads(f.read_text(encoding="utf-8")) for f in sorted((ROOT / "data" / "protocols").glob("*.json"))]
    return {"products": products, "by_id": {p["id"]: p for p in products},
            "brands": brands, "brand_by_name": {b["brand"]: b for b in brands},
            "protocols": protocols, "protocol_by_tech": {m.lower(): pr for pr in protocols for m in pr.get("match") or []},
            "projects": projects, "full": full, "tax": load_taxonomy(),
            "tax_raw": rd("data/taxonomy.json"), "images": rd("data/product_images.json")}


@lru_cache(maxsize=None)
def product(pid: str) -> dict:
    return json.loads((ROOT / "data" / "products" / f"{pid}.json").read_text(encoding="utf-8"))


class Page:
    """Strings and links for one language."""

    def __init__(self, lang: str):
        self.lang = lang
        self.L = load_locale(lang)
        self.base = "/" if lang == "en" else f"/{lang}/"

    def s(self, key: str, **kv) -> str:
        if key not in self.L:
            raise SystemExit(f"build: string '{key}' missing in assets/locales/{self.lang}.json")
        v = str(self.L[key])
        for k, x in kv.items():
            v = v.replace("{" + k + "}", str(x))
        return v

    def e(self, key: str, **kv) -> str:
        return esc(self.s(key, **kv))

    def count(self, n: int, noun: str) -> str:
        f = NOUNS[noun][self.lang]
        if self.lang == "ar":
            if n == 1: return f[0]
            if n == 2: return f[1]
            return f"{n} {f[2] if 3 <= n <= 10 else f[3]}"
        return f"{n} {f[0] if n == 1 else f[1]}"

    def date(self, iso: str) -> str:
        return f"{MONTHS[self.lang][int(iso[5:7]) - 1]} {iso[:4]}"

    def city(self, v: str) -> str:
        return v if self.lang == "en" else CITY.get(v, {}).get(self.lang, v)

    def country(self, v: str) -> str:
        return v if self.lang == "en" else COUNTRIES.get(v, {}).get(self.lang, v)

    # labels from data/taxonomy.json
    def cat(self, cid: str) -> str:
        lab = data()["tax"].category_labels.get(cid)
        return t(lab, self.lang) if lab else cid

    def type(self, tid: str) -> str:
        lab = data()["tax"].type_labels.get(tid)
        return t(lab, self.lang) if lab else tid

    def inst(self, iid: str) -> str:
        lab = data()["tax"].installation_labels.get(iid)
        return t(lab, self.lang) if lab else iid

    # links
    def product_url(self, pid: str) -> str:
        return f"{self.base}products/{pid}.html"

    def catalog_url(self, cat: str = "") -> str:
        return f"{self.base}products.html" + (f"?category={cat}" if cat else "")

    def brand_url(self, bid: str) -> str:
        return f"{self.base}brands/{bid}.html"

    def protocol_url(self, pid: str) -> str:
        return f"{self.base}protocols/{pid}.html"


def pimg(desc, sizes: str, alt: str = "", eager: bool = False) -> str:
    if not desc:
        return ""
    srcset = f' srcset="{esc(desc["srcset"])}" sizes="{esc(sizes)}"' if desc.get("srcset") else ""
    wh = f' width="{desc["width"]}" height="{desc["height"]}"' if desc.get("width") else ""
    lazy = ' fetchpriority="high"' if eager else ' loading="lazy"'
    return f'<img class="prod-img" src="{esc(desc["src"])}"{srcset}{wh} alt="{esc(alt)}"{lazy} decoding="async">'


def ruler(label: str, meta: str = "") -> str:
    return (f'<div class="sh"><span class="kicker">{esc(label)}</span><span class="sh-line"></span>'
            + (f'<span class="sh-meta">{esc(meta)}</span>' if meta else "") + "</div>")


def crumbs(items) -> str:
    out = []
    for i, (label, href) in enumerate(items):
        if i:
            out.append(ic("chev", "sep"))
        out.append(f'<span aria-current="page">{esc(label)}</span>' if href is None
                   else f'<a href="{esc(href)}">{esc(label)}</a>')
    return '<nav class="crumbs" aria-label="Breadcrumb">' + "".join(out) + "</nav>"


# Protocol chips — same icons as the prototype / SE.protoMarkup
_PROTO = {
    "wifi": '<path d="M5 12.55a11 11 0 0114 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
    "bt": '<polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/>',
    "lan": '<path d="m15 20 3-3h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2l3 3z"/><path d="M6 8v1"/><path d="M10 8v1"/><path d="M14 8v1"/><path d="M18 8v1"/>',
    "zwave": '<path d="M16.247 7.761a6 6 0 0 1 0 8.478"/><path d="M19.075 4.933a10 10 0 0 1 0 14.134"/><path d="M4.925 19.067a10 10 0 0 1 0-14.134"/><path d="M7.753 16.239a6 6 0 0 1 0-8.478"/><circle cx="12" cy="12" r="2"/>',
}
_PROTO_FILL = {
    "zigbee": '<svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><path d="M32.042,9.792c4.595,1.238,4.88,3.165,5.524,5.048C34.841,17.664,17.35,35.7,17.35,35.7s10.901,1.177,23.487-1.003c-0.001,0.029-0.002,0.048-0.003,0.076C42.829,31.661,44,27.97,44,24c0-11.046-8.954-20-20-20c-5.634,0-10.715,2.338-14.35,6.087C15.489,9.124,26.89,8.403,32.042,9.792z"/><path d="M14.724,37.285c-1.982-0.347-4.212-2.131-4.707-5.302c1.437-1.239,19.994-20.507,19.994-20.507c-7.008-0.424-14.569-0.465-22.237,0.864C5.408,15.625,4,19.644,4,24c0,11.046,8.954,20,20,20c6.173,0,11.689-2.8,15.358-7.195C35.486,37.33,23.257,38.769,14.724,37.285z"/></svg>',
    "matter": '<svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M152 134.4c21.5 17.5 47.1 29.2 74.4 34.2V22.9l29.7-17.1 29.6 17.1v145.6c27.3-4.9 52.9-16.7 74.5-34.2l53.8 31.1c-87.6 86.6-228.5 86.6-316.1 0zm65.5 371.8C248.7 387 178.1 264.9 59.3 232.5v62.3c25.9 9.9 48.9 26.2 66.8 47.4L0 414.9v34.2l29.7 17 126.1-72.8c9.4 26.1 12 54.2 7.6 81.5zm235.3-273.7C334 265 263.6 387.1 294.8 506.2l54-31.2c-4.4-27.4-1.7-55.4 7.6-81.5l126 72.7 29.6-17.1v-34.2l-126.1-72.8c17.9-21.2 40.9-37.5 66.8-47.4z"/></svg>',
    "thread": '<svg viewBox="0 0 165 165" fill="currentColor" aria-hidden="true"><path d="M82.498,0C37.008,0,0,37.008,0,82.496c0,45.181,36.51,81.977,81.573,82.476V82.569l-27.002-0.002c-8.023,0-14.554,6.53-14.554,14.561c0,8.023,6.531,14.551,14.554,14.551v17.98c-17.939,0-32.534-14.595-32.534-32.531c0-17.944,14.595-32.543,32.534-32.543l27.002,0.004v-9.096c0-14.932,12.146-27.08,27.075-27.08c14.932,0,27.082,12.148,27.082,27.08c0,14.931-12.15,27.08-27.082,27.08l-9.097-0.001v80.641C136.889,155.333,165,122.14,165,82.496C165,37.008,127.99,0,82.498,0z"/><path d="M117.748,55.493c0-5.016-4.082-9.098-9.1-9.098c-5.015,0-9.097,4.082-9.097,9.098v9.097l9.097,0.001C113.666,64.591,117.748,60.51,117.748,55.493z"/></svg>',
}


def proto_icon(tech: str) -> str:
    x = str(tech).lower()
    stroke = lambda p: ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
                        f'stroke-linejoin="round" aria-hidden="true">{p}</svg>')
    if "wi-fi" in x or "wifi" in x: return stroke(_PROTO["wifi"])
    if "bluetooth" in x: return stroke(_PROTO["bt"])
    if "zigbee" in x: return _PROTO_FILL["zigbee"]
    if "matter" in x: return _PROTO_FILL["matter"]
    if "thread" in x: return _PROTO_FILL["thread"]
    if "lan" in x or "ethernet" in x or "poe" in x: return stroke(_PROTO["lan"])
    if "z-wave" in x: return stroke(_PROTO["zwave"])
    return ""


def protocol_of(tech: str):
    """The protocol page (data/protocols/<id>.json) a technology name belongs to, or None."""
    return data()["protocol_by_tech"].get(str(tech).lower())


def proto(tech: str, p: "Page | None" = None) -> str:
    """A protocol chip. With a Page, and when the protocol has its own page, the chip links to it
    (not inside product cards, whose title link covers the whole card)."""
    pr = protocol_of(tech) if p is not None else None
    tag, href = ("a", f' href="{p.protocol_url(pr["id"])}"') if pr else ("span", "")
    if "knx" in str(tech).lower():   # the official KNX logo in its colours stands for icon and name
        return f'<{tag} class="proto proto-knx"{href}><img src="/assets/knx-logo.svg" alt="KNX" width="1069" height="510"></{tag}>'
    return f'<{tag} class="proto"{href}>{proto_icon(tech)}{esc(tech)}</{tag}>'


def protos(lst, p: "Page | None" = None) -> str:
    return ('<div class="protos">' + "".join(proto(x, p) for x in lst) + "</div>") if lst else ""


def brand_mark(b: dict, decorative: bool = False) -> str:
    """A brand's logo for the logo rows (homepage strip, "other brands", brand list); its name as
    text when the brand has no logo file (a new brand can be added without one). decorative=True
    when the name is already written next to it (empty alt, so it is not read twice)."""
    if b.get("logo"):
        alt = "" if decorative else esc(b["brand"])
        return f'<img src="{esc(b["logo"])}" alt="{alt}" loading="lazy">'
    return f'<span class="brand-txt">{esc(b["brand"])}</span>'


def brand_logo(name: str, cls: str = "") -> str:
    b = data()["brand_by_name"].get(name)
    if b and b.get("logo"):
        return f'<img class="{cls}" src="{esc(b["logo"])}" alt="{esc(name)}" loading="lazy">'
    return f'<span class="card-logo-text">{esc(name)}</span>'


def add_btn(p: Page, pid: str) -> str:
    """'Add to quote' on a card: cart.js handles data-trigger="cart-add"; se.js shows the added state."""
    return (f'<button class="btn-add" type="button" data-trigger="cart-add" data-product-id="{esc(pid)}" '
            f'aria-label="{p.e("cart_aria_add_btn")}" data-added="{p.e("added")}">'
            f'<span class="lbl-long">{p.e("cart_add_to_quote")}</span><span class="lbl-short">{p.e("add_short")}</span></button>')


def card(p: Page, prod: dict, extra: str = "") -> str:
    link = p.product_url(prod["id"])
    title = t(prod["title"], p.lang)
    return (
        f'<article class="card crop-host" data-id="{esc(prod["id"])}"{extra}>'
        f'<a class="card-media recess crop" href="{link}" tabindex="-1" aria-hidden="true">'
        + pimg(prod.get("image"), "(max-width: 820px) 46vw, 300px") + '</a>'
        '<div class="card-body">'
        f'<p class="card-kicker">{esc(p.type(prod.get("product_type")))}</p>'
        f'<h3 class="card-title"><a href="{link}">{esc(title)}</a></h3>'
        + protos(prod.get("technology")) +
        '</div>'
        f'<div class="card-foot">{brand_logo(prod.get("brand"), "card-logo")}{add_btn(p, prod["id"])}</div>'
        '</article>'
    )
