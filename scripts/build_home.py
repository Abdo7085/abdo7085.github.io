#!/usr/bin/env python3
"""
Homepage content as static HTML (redesign phase 7, wave 2).

`home(lang)` returns the inside of <main> for index.html in one language: the
approved design D from docs/redesign/ (hero film, brand strip, who we work
with, projects, services, the live panel, categories, method, FAQ, contact).
Numbers, brands, categories and projects come from data/, so the page follows
the catalog on every build. build_layout.py puts it between the header and
the footer; assets/se.js wires the brand strip arrows and the demo panel.

Strings live in assets/locales/*.json. A few of them carry markup on purpose
(hero_title's <br>/<em>, the &amp; in client names and method steps) and are
inserted as-is; everything else is escaped.
"""

from __future__ import annotations

import json

from _icons import WA_ICON, ic
from _lib import LANGS, t
from _ui import PHONE_TEL, PHONE_TXT, Page, data, esc, pimg, ruler, wa

VIDEO = "/assets/example01.mp4"
POSTER = "/assets/example01-poster.webp"
VILLA = "/assets/home/"          # the demo panel's three layers (night base + two light layers)

# The panel's light layers and shutters, as % of the photo (docs/redesign/media/villa-geometry.json)
SCENE_GEO = {"int": {"left": 43.152, "top": 6.848, "width": 38.696, "height": 65.217},
             "ext": {"left": 4.457, "top": 14.674, "width": 80.543, "height": 85.326},
             "shutters": {"A": {"left": 44.022, "top": 7.717, "width": 10.978, "height": 18.804},
                          "B": {"left": 72.065, "top": 17.717, "width": 8.804, "height": 18.478},
                          "C": {"left": 72.065, "top": 62.174, "width": 8.696, "height": 8.913}}}
SCENES = ["sc_dinner", "sc_movie", "sc_sleep", "sc_away"]
SCENE_ICON = {"sc_dinner": "dinner", "sc_movie": "movie", "sc_sleep": "sleep", "sc_away": "away"}

SERVICES = [
    ("spa_feat_thermostats", ["spa_title_smart_lighting", "svc_shutters", "spa_title_thermostat", "spa_title_voice_integration"], "controls", "smart_home"),
    ("spa_feat_locks", ["spa_title_security_cameras", "spa_title_smart_locks", "svc_intercom", "svc_access"], "security", "cameras"),
    ("spa_feat_voice", ["spa_title_network", "svc_mesh", "svc_ap", "svc_office"], "networking", "network"),
    ("spa_feat_lighting", ["spa_title_electrical_installations", "spa_title_power_distribution_panels",
                           "spa_title_lighting_fixture_installation", "spa_title_cabling_wiring_solutions"], "system", "electrical"),
]
# (wizard building id or "" for WhatsApp, icon, string key)
CLIENTS = [("villa", "villa", "cl_villa"), ("apartment", "apartment", "cl_apt"), ("restaurant", "restaurant", "cl_shop"),
           ("office", "office", "cl_office"), ("", "plan", "cl_pro")]
FAQ = [("spa_q_services", "spa_a_services"), ("spa_q_price", "spa_a_prices"),
       ("spa_q_sell_products", "spa_a_sell_products"), ("spa_q_schedule", "spa_a_schedule")]


def chev(d: str) -> str:
    return ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" '
            f'stroke-linejoin="round" aria-hidden="true"><path d="{d}"/></svg>')


def wizard_btn(p: Page, cls: str = "btn btn-primary") -> str:
    return (f'<button class="{cls}" type="button" data-trigger="find-solution">{p.e("spa_cta_find_solution")}'
            + ic("arrow", "flip") + "</button>")


def geo(g) -> str:
    return f'left:{g["left"]}%;top:{g["top"]}%;width:{g["width"]}%;height:{g["height"]}%'


# ---------------- sections ----------------

def hero(p: Page, d) -> str:
    meter = ('<dl class="meter">'
             f'<div><dt>{len(d["products"])}</dt><dd>{p.e("fact_products")}</dd></div>'
             f'<div><dt>{len(d["brands"])}</dt><dd>{p.e("fact_brands")}</dd></div>'
             f'<div><dt>{len(d["tax"].technologies)}</dt><dd>{p.e("fact_protocols")}</dd></div></dl>')
    return (
        '<section class="hero-b dark" id="hero">'
        f'<video class="hb-video" autoplay muted loop playsinline preload="metadata" poster="{POSTER}" width="1280" height="720">'
        f'<source src="{VIDEO}" type="video/mp4"></video>'
        '<div class="wrap hb-in"><div class="hb-copy reveal">'
        f'<span class="tape">{p.e("hero_kicker")}</span>'
        f'<h1 class="display">{p.s("hero_title")}</h1>'
        f'<p class="lead">{p.e("spa_tagline")}</p>'
        '<div class="actions">' + wizard_btn(p)
        + f'<a class="btn btn-ghost" href="{p.base}products.html">{p.e("spa_browse_products")}</a></div></div>'
        + meter + '</div></section>'
    )


def strip(p: Page, d) -> str:
    logos = "".join(
        f'<a href="{p.base}brands/{esc(b["id"])}.html" title="{esc(b["brand"])}">'
        f'<img src="{esc(b["logo"])}" alt="{esc(b["brand"])}" loading="lazy"></a>'
        for b in d["brands"])
    return (
        '<section class="brand-strip" id="bstrip"><div class="wrap brand-strip-in"><div class="bs-head">'
        f'<p class="brand-strip-label">{p.e("strip_label")}</p>'
        '<span class="bs-nav">'
        f'<button type="button" data-bs="-1" aria-label="‹">{chev("m15 6-6 6 6 6")}</button>'
        f'<button type="button" data-bs="1" aria-label="›">{chev("m9 6 6 6-6 6")}</button></span></div>'
        f'<div class="brand-logos">{logos}</div></div></section>'
    )


def clients(p: Page) -> str:
    cards = []
    for building, icon, key in CLIENTS:
        inner = (f'<span class="client-ic">{ic(icon)}</span><span class="client-t"><b>{p.s(key)}</b>'
                 f'<span>{p.e(key + "_d")}</span></span>' + ic("arrow", "flip client-go"))
        if building:
            cards.append(f'<button class="client" type="button" data-trigger="find-solution" data-building="{building}">{inner}</button>')
        else:
            cards.append(f'<a class="client" href="{wa()}" target="_blank" rel="noopener">{inner}</a>')
    return ('<section class="sec-tight"><div class="wrap">' + ruler(p.s("sec_clients"))
            + f'<div class="sec-head"><h2 class="h2">{p.e("clients_title")}</h2><p class="lead">{p.e("clients_lead")}</p></div>'
            + '<div class="clients">' + "".join(cards) + '</div></div></section>')


def plate(p: Page, d, pj, i: int) -> str:
    full = d["full"].get(pj["id"]) or {}
    link = f'{p.base}projects/{esc(pj["id"])}.html'
    tst = full.get("testimonial")
    meta = (f'<span>{ic("pin")}{esc(p.city(pj.get("location", "")))}</span>'
            f'<span>{ic("cal")}{esc(p.date(pj["date"]))}</span>'
            + (f'<span>{ic("media")}{esc(p.count(pj["media_count"], "media"))}</span>' if pj.get("media_count") else ""))
    tags = "".join(f'<span class="chip">{esc(t(d["tax"].project_category_labels.get(c, c), p.lang))}</span>'
                   for c in pj.get("categories") or [])
    quote_html = ""
    if tst and t(tst.get("quote"), p.lang):
        quote_html = (f'<blockquote class="quote-mini">{esc(t(tst["quote"], p.lang))}'
                      f'<cite>— {esc(tst.get("author", ""))}</cite></blockquote>')
    return (
        '<article class="plate crop-host">'
        f'<a class="plate-media crop" href="{link}" tabindex="-1" aria-hidden="true">'
        f'<img src="{esc(pj["cover"])}" alt="" loading="lazy" decoding="async"></a>'
        '<div class="plate-body">'
        f'<span class="kicker plate-n">{p.e("case_n", n=f"{i + 1:02d}")}</span>'
        f'<h3 class="h3"><a href="{link}">{esc(t(pj["title"], p.lang))}</a></h3>'
        f'<div class="plate-meta">{meta}</div>'
        f'<p>{esc(t(pj.get("short_description"), p.lang))}</p>'
        f'<div class="plate-tags">{tags}</div>' + quote_html
        + f'<a class="link-arrow" href="{link}">{p.e("case_study")}{ic("arrow")}</a>'
        '</div></article>'
    )


def work(p: Page, d) -> str:
    return ('<section class="sec"><div class="wrap">' + ruler(p.s("sec_field"))
            + f'<div class="sec-head"><h2 class="h2">{p.e("spa_recent_projects")}</h2>'
            f'<div class="sec-aside"><p class="lead">{p.e("spa_recent_projects_desc")}</p>'
            f'<a class="link-arrow" href="{p.base}previous-work.html">{p.e("all_projects")}{ic("arrow")}</a></div></div>'
            + '<div class="plates">' + "".join(plate(p, d, pj, i) for i, pj in enumerate(d["projects"])) + '</div></div></section>')


def services(p: Page) -> str:
    cards = []
    for key, items, cat, icon in SERVICES:
        raw = p.s(key)
        title, _, desc = raw.partition(" — ")
        cards.append(
            f'<div class="svc"><span class="svc-n">{ic(icon)}</span>'
            f'<div><h3 class="h3">{esc(title)}</h3><p>{esc(desc)}</p></div>'
            '<ul class="svc-items">' + "".join(f"<li>{p.e(k)}</li>" for k in items) + '</ul>'
            f'<div class="svc-foot"><a class="link-arrow" href="{esc(wa(p.s("svc_msg", t=title)))}" target="_blank" rel="noopener">'
            f'{p.e("svc_ask")}{ic("arrow")}</a>'
            f'<a class="svc-prod" href="{p.base}products.html?category={cat}">{p.e("svc_go")}</a></div></div>')
    return ('<section class="sec" id="services"><div class="wrap">' + ruler(p.s("sec_expertise"))
            + f'<div class="sec-head"><h2 class="h2">{p.e("spa_trusted_partner")}</h2><p class="lead">{p.e("spa_transform_house")}</p></div>'
            + '<div class="svc-list">' + "".join(cards) + '</div></div></section>')


def panel(p: Page) -> str:
    up = chev("m6 15 6-6 6 6")
    down = chev("m6 9 6 6 6-6")
    shutters = "".join(f'<span class="shutter" style="{geo(SCENE_GEO["shutters"][k])}"><i></i></span>' for k in "ABC")
    scenes = "".join(
        f'<button type="button" class="scene-key" data-scene="{k}" aria-pressed="{"true" if i == 0 else "false"}">'
        f'{ic(SCENE_ICON[k])}<span>{p.e(k)}</span></button>' for i, k in enumerate(SCENES))
    # the strings the panel script swaps in when a key or a scene changes
    words = {k: p.s(k) for k in ["st_on", "st_off", "custom"] + SCENES}
    return (
        f'<div class="dev" id="dev" style="--dim:0" data-words="{esc(json.dumps(words, ensure_ascii=False))}"><div class="dev-face">'
        '<span class="dev-sensor" aria-hidden="true"></span>'
        f'<div class="dev-top"><span><span class="led on"></span>{p.e("room_villa")}</span><small id="dev-scene">{p.e("sc_dinner")}</small></div>'
        '<div class="screen">'
        f'<img class="sc-base" src="{VILLA}villa-night.webp" alt="{p.e("scene_alt")}" width="920" height="920" loading="lazy" decoding="async">'
        '<span class="sc-dim"></span>'
        f'<img class="sc-lt" id="lt-int" src="{VILLA}villa-light-int.webp" alt="" style="{geo(SCENE_GEO["int"])};opacity:0" loading="lazy">'
        + shutters
        + f'<img class="sc-lt" id="lt-ext" src="{VILLA}villa-light-ext.webp" alt="" style="{geo(SCENE_GEO["ext"])};opacity:0" loading="lazy">'
        f'<span class="sim">{p.e("simulation")}</span></div>'
        '<div class="dev-ctl">'
        f'<label class="key key-wide" id="key-light" data-type="light"><span class="key-head">{ic("bulb")}<span class="key-name">{p.e("ctl_lights")}</span>'
        '<output class="key-val" id="dev-light-v">80%</output></span>'
        f'<input id="dev-light" type="range" min="0" max="100" step="10" value="80" aria-label="{p.e("ctl_lights")}"></label>'
        f'<button class="key" type="button" data-type="facade" data-dev="facade" aria-pressed="true"><span class="key-head">{ic("sconce")}<span class="led"></span></span>'
        f'<span class="key-name">{p.e("ctl_facade")}</span><span class="key-state" id="st-facade">{p.e("st_on")}</span></button>'
        f'<div class="key key-shut" data-type="shutter" role="group" aria-label="{p.e("ctl_shutters")}"><span class="key-head">{ic("blinds")}<span class="led"></span></span>'
        f'<span class="key-name">{p.e("ctl_shutters")}</span>'
        f'<span class="shut-btns"><button type="button" data-dev="open" aria-pressed="true" aria-label="{p.e("shut_open")}">{up}</button>'
        f'<button type="button" data-dev="close" aria-pressed="false" aria-label="{p.e("shut_close")}">{down}</button></span></div>'
        f'<button class="key" type="button" data-type="climate" data-dev="clim" aria-pressed="true"><span class="key-head">{ic("thermo")}<span class="led"></span></span>'
        f'<span class="key-name">{p.e("ctl_climate")}</span><span class="key-state" id="st-clim">22.5°</span></button>'
        '</div>'
        f'<div class="scenes">{scenes}</div>'
        '<p class="dev-brand" aria-hidden="true">S‑ELECTRICITY</p>'
        '</div></div>'
    )


def demo(p: Page) -> str:
    return ('<section class="demo-band dark"><div class="wrap demo">'
            '<div class="demo-copy">' + ruler(p.s("sec_demo"))
            + f'<h2 class="h2">{p.e("spa_home_at_fingertips")}</h2>'
            f'<p class="lead">{p.e("spa_thanks_home_automation")}</p>'
            f'<p class="demo-hint">{ic("bulb")}{p.e("demo_hint")}</p></div>'
            + panel(p) + '</div></section>')


def tiles(p: Page, d) -> str:
    counts, best = {}, {}
    for x in d["products"]:
        c = x.get("category")
        counts[c] = counts.get(c, 0) + 1
        img = x.get("image")
        if img and (c not in best or (img.get("width") or 0) > (best[c].get("width") or 0)):
            best[c] = img
    tax = d["tax"]
    cards = "".join(
        f'<a class="tile" href="{p.base}products.html?category={esc(cid)}">'
        f'<span class="tile-img recess">{pimg(best.get(cid), "(max-width: 760px) 46vw, 280px")}<span class="tile-n">{counts[cid]}</span></span>'
        f'<span class="tile-t"><b>{esc(t(tax.category_labels[cid], p.lang))}</b><small>{esc(p.count(counts[cid], "product"))}</small></span>'
        f'<span class="tile-go">{ic("arrow", "flip")}</span></a>'
        for cid in tax.category_order if counts.get(cid))
    return ('<section class="sec" id="cats"><div class="wrap">'
            + ruler(p.s("sec_catalogue"), p.count(len(d["products"]), "product"))
            + f'<div class="sec-head"><h2 class="h2">{p.e("cat_title")}</h2><p class="lead">{p.e("cat_lead")}</p></div>'
            + f'<div class="tiles tiles-base">{cards}</div></div></section>')


def method(p: Page) -> str:
    steps = "".join(f'<li><span class="step-n">{n:02d}</span><h3 class="h3">{p.s(f"st{n}")}</h3><p>{p.e(f"st{n}d")}</p></li>'
                    for n in range(1, 6))
    return ('<section class="sec-tight"><div class="wrap">' + ruler(p.s("sec_method"))
            + f'<h2 class="h2 method-title">{p.e("method_title")}</h2><ol class="steps">{steps}</ol></div></section>')


def faq(p: Page) -> str:
    qa = "".join(f'<details{" open" if i == 0 else ""}><summary>{p.e(q)}<span class="pm" aria-hidden="true"></span></summary>'
                 f'<p class="ans">{p.e(a)}</p></details>' for i, (q, a) in enumerate(FAQ))
    return ('<section class="sec"><div class="wrap">' + ruler(p.s("sec_questions"))
            + f'<div class="faq-grid"><div class="faq-aside"><h2 class="h2">{p.e("spa_faq_title")}</h2><p class="lead">{p.e("faq_aside")}</p></div>'
            + f'<div class="faq">{qa}</div></div></div></section>')


def contact(p: Page) -> str:
    return ('<section class="wrap sec-tight"><div class="cta">'
            f'<div class="cta-copy"><span class="kicker">{p.e("ticket_kicker")}</span>'
            f'<h2 class="h2">{p.e("spa_need_custom")}</h2><p>{p.e("spa_team")}</p></div>'
            '<div class="cta-side">' + wizard_btn(p).replace(ic("arrow", "flip"), "")
            + f'<a class="btn btn-line" href="{wa()}" target="_blank" rel="noopener">{WA_ICON}{p.e("spa_cta_whatsapp")}</a>'
            f'<a class="readout" href="tel:{PHONE_TEL}" dir="ltr">{PHONE_TXT}</a>'
            '</div></div></section>')


def home(lang: str) -> str:
    p, d = Page(lang), data()
    # the film and the brand strip share the first screen exactly, on any screen size
    return ('<div class="first-screen">' + hero(p, d) + strip(p, d) + '</div>' + clients(p) + work(p, d) + services(p)
            + demo(p) + tiles(p, d) + method(p) + faq(p) + contact(p))


if __name__ == "__main__":
    for l in LANGS:
        print(l, len(home(l)), "chars")
