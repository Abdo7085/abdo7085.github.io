#!/usr/bin/env python3
"""
SEO check of the built site, offline (reads the generated pages from disk).

Every URL in sitemap.xml must map to a page that:
  - has one <title>, a meta description, exactly one <h1>
  - has <html lang> of its language (and dir="rtl" in Arabic)
  - points its canonical at itself, and lists hreflang en / fr / ar / x-default
  - has og:title, og:description, og:image, og:url
  - carries valid JSON-LD
  - is not noindex
  - gives every <img> an alt attribute
and no internal link may point at a page that does not exist.
The pages kept out of the sitemap (product/brand/project templates, 404) must be noindex.

Errors stop with exit code 1 (the GitHub check turns red). Titles over 70 characters and
descriptions over 170 are warnings: search results cut them, nothing breaks.

Usage:
    python scripts/check_seo.py
"""

from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

from _lib import HOST, ROOT

NOT_IN_SITEMAP = ["404.html", "fr/404.html", "ar/404.html", "product.html", "brand.html", "project.html"]


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""; self._t = False; self.meta = {}; self.links = []; self.h1 = 0
        self.imgs = []; self.hrefs = []; self.ld = []; self._ld = None; self.html = {}

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html": self.html = a
        elif tag == "title": self._t = True
        elif tag == "meta":
            k = a.get("name") or a.get("property")
            if k: self.meta.setdefault(k.lower(), []).append(a.get("content") or "")
        elif tag == "link": self.links.append(a)
        elif tag == "h1": self.h1 += 1
        elif tag == "img": self.imgs.append(a)
        elif tag == "a" and a.get("href"): self.hrefs.append(a["href"])
        elif tag == "script" and a.get("type") == "application/ld+json": self._ld = ""

    def handle_endtag(self, tag):
        if tag == "title": self._t = False
        if tag == "script" and self._ld is not None:
            self.ld.append(self._ld); self._ld = None

    def handle_data(self, d):
        if self._t: self.title += d
        if self._ld is not None: self._ld += d


def local(url: str):
    """https://smartelectricity.ma/fr/x.html -> ROOT/fr/x.html ; .../fr/ -> fr/index.html"""
    path = urlparse(url).path.lstrip("/")
    if path == "" or path.endswith("/"):
        path += "index.html"
    return ROOT / path


def parse(path):
    p = Page()
    p.feed(path.read_text(encoding="utf-8"))
    return p


def main() -> int:
    errors, warnings = [], []
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    urls = re.findall(r"<loc>([^<]+)</loc>", sitemap)
    seen_links = set()

    for url in urls:
        f = local(url)
        where = str(f.relative_to(ROOT)).replace("\\", "/")
        if not f.is_file():
            errors.append(f"{where}: listed in sitemap.xml but missing"); continue
        p = parse(f)
        exp = "fr" if "/fr/" in url else "ar" if "/ar/" in url else "en"
        if "noindex" in " ".join(p.meta.get("robots", [])): errors.append(f"{where}: noindex but in the sitemap")
        t = p.title.strip()
        if not t: errors.append(f"{where}: no <title>")
        elif len(t) > 70: warnings.append(f"{where}: title {len(t)} characters")
        d = (p.meta.get("description") or [""])[0].strip()
        if not d: errors.append(f"{where}: no meta description")
        elif len(d) > 170: warnings.append(f"{where}: description {len(d)} characters")
        if p.h1 != 1: errors.append(f"{where}: {p.h1} <h1> (must be 1)")
        if p.html.get("lang") != exp: errors.append(f"{where}: <html lang={p.html.get('lang')!r}>, expected {exp!r}")
        if exp == "ar" and p.html.get("dir") != "rtl": errors.append(f"{where}: Arabic page without dir=\"rtl\"")
        canon = [l.get("href") for l in p.links if l.get("rel") == "canonical"]
        if len(canon) != 1: errors.append(f"{where}: {len(canon)} canonical links (must be 1)")
        elif canon[0].rstrip("/") != url.rstrip("/"): errors.append(f"{where}: canonical {canon[0]} is not the page")
        hl = {l.get("hreflang"): l.get("href") for l in p.links if l.get("rel") == "alternate" and l.get("hreflang")}
        for need in ("en", "fr", "ar", "x-default"):
            if need not in hl: errors.append(f"{where}: no hreflang {need}")
        for k in ("og:title", "og:description", "og:image", "og:url"):
            if not p.meta.get(k): errors.append(f"{where}: no {k}")
        if not p.ld: errors.append(f"{where}: no JSON-LD")
        for raw in p.ld:
            try: json.loads(raw)
            except ValueError: errors.append(f"{where}: JSON-LD does not parse")
        for im in p.imgs:
            if "alt" not in im: errors.append(f"{where}: <img src={im.get('src', '')!r}> without alt")
        for h in p.hrefs:
            if h.startswith(("tel:", "mailto:", "#", "javascript:")): continue
            full = urljoin(url, h)
            if full.startswith(HOST):
                seen_links.add((full.split("#")[0].split("?")[0], where))

    for rel in NOT_IN_SITEMAP:
        f = ROOT / rel
        if f.is_file() and "noindex" not in " ".join(parse(f).meta.get("robots", [])):
            errors.append(f"{rel}: kept out of the sitemap but indexable (needs noindex)")

    broken = {}
    for target, where in sorted(seen_links):
        f = local(target)
        if not f.is_file():
            broken.setdefault(str(f.relative_to(ROOT)).replace("\\", "/"), where)
    for target, where in broken.items():
        errors.append(f"broken internal link to {target} (first seen on {where})")

    print(f"SEO check: {len(urls)} pages, {len(seen_links)} internal links")
    if warnings:
        print(f"Warnings ({len(warnings)}):")
        for w in warnings[:20]: print("  -", w)
    if errors:
        print(f"ERRORS ({len(errors)}):")
        for e in errors[:50]: print("  -", e)
        return 1
    print("OK — no SEO errors.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
