#!/usr/bin/env python3
"""
Check every content file before anything is built.

    python scripts/validate.py      # full report; exit code 1 on errors

build_all.py and each build_*.py call `ensure()` first, so a broken file
stops the build before a single page is written.

Errors stop the build — the site would show something broken: a missing
translation, a dead link, an unknown filter value, a missing image, a field
with a typo in its name, a placeholder new_product.py left behind.

Warnings never stop it — house-style rules worth a look: a short description
over 10 words (cards get crowded), a brand with no products yet. Oversized
originals are reported by build_images.py itself.

What it checks:
  data/products/*.json   fields, id = file name, en/fr/ar text, specs with
                         the same number of rows in each language, values
                         from data/taxonomy.json, brand has a file, images
                         exist in media/products/, document links
  data/brands/*.json     fields, id, en/fr/ar text, logo file, unique names
  data/projects/*.json   fields, id, date, categories from the taxonomy,
                         related products exist, cover/media files exist
  data/protocols/*.json  fields, id, en/fr/ar text, the technology names it
                         covers, logo file, diagram labels in every language
  assets/locales/*.json  fr and ar have every key en has, and the same keys
                         as each other (fr/ar-only keys feed the localized
                         copies of the root pages); no empty values
  data/taxonomy.json     well-formed, every label in en/fr/ar
"""

from __future__ import annotations

import difflib
import json
import re
import sys
from datetime import date
from pathlib import Path

import _lib
from _lib import LANGS, ROOT

DATA = ROOT / "data"
ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SHORT_DESC_MAX_WORDS = 10
# new_product.py / new_brand.py write this in front of every text still to
# be filled in; the build refuses to publish one.
PLACEHOLDER = "TODO"

PRODUCT_REQUIRED = {
    "id", "brand", "technology", "product_type", "installation", "title",
    "short_description", "description", "specs", "images", "files",
}
# rating: optional and deliberately not inspected here (the derived rating
# fallback lives in build_products.derive_rating).
PRODUCT_OPTIONAL = {"rating"}

BRAND_REQUIRED = {"id", "brand", "tagline", "description"}
# Omitted (or logo: null) when unknown — the page shows a text card instead.
BRAND_OPTIONAL = {"country_of_origin", "founded", "website", "logo"}

PROJECT_REQUIRED = {
    "id", "date", "location", "categories", "title", "short_description",
    "description", "cover", "media", "related_products", "duration_days",
}
# seo_title: {lang: text}, only where the title is too long for search results (build_projects.py)
PROJECT_OPTIONAL = {"testimonial", "extra_brands", "extra_protocols", "seo_title"}
PROTOCOL_REQUIRED = {"id", "name", "match", "tagline", "description"}
PROTOCOL_OPTIONAL = {"logo", "standard", "diagram", "graph", "seo_title", "kicker", "medium", "when",
                     "less_suited", "diagram_labels"}
MEDIA_TYPES = {"image", "video", "reel"}      # video also needs a "poster" image


class Report:
    def __init__(self):
        self.errors: list = []
        self.warnings: list = []

    def error(self, where: str, msg: str) -> None:
        self.errors.append(f"{where}: {msg}")

    def warn(self, where: str, msg: str) -> None:
        self.warnings.append(f"{where}: {msg}")


# ---------------- Generic checks ----------------

def _suggest(word: str, choices) -> str:
    close = difflib.get_close_matches(word, list(choices), n=1, cutoff=0.6)
    return f' (did you mean "{close[0]}"?)' if close else ""


def _read(rep: Report, path: Path, where: str):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        rep.error(where, f"not valid JSON ({exc})")
        return None
    if not isinstance(data, dict):
        rep.error(where, "must be a JSON object { ... }")
        return None
    return data


def _fields(rep: Report, where: str, data: dict, required: set, optional: set) -> None:
    for key in sorted(required - data.keys()):
        rep.error(where, f'missing field "{key}"')
    for key in sorted(data.keys() - required - optional):
        rep.error(where, f'unknown field "{key}"{_suggest(key, required | optional)}')


def _id(rep: Report, where: str, data: dict, path: Path) -> None:
    ident = data.get("id")
    if ident != path.stem:
        rep.error(where, f'"id" is "{ident}" but the file is {path.name} — they must match')
    elif not ID_RE.match(ident):
        rep.error(where, f'"id" "{ident}" — use lowercase letters, digits and single hyphens')


def _text(value) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _localized(rep: Report, where: str, data: dict, key: str) -> None:
    """data[key] must be {"en": "...", "fr": "...", "ar": "..."}, none empty."""
    value = data.get(key)
    if key not in data:
        return                                  # reported by _fields
    if not isinstance(value, dict):
        rep.error(where, f'"{key}" must be {{"en": ..., "fr": ..., "ar": ...}}')
        return
    missing = [lang for lang in LANGS if not _text(value.get(lang))]
    if missing:
        rep.error(where, f'"{key}" has no text for: {", ".join(missing)}')
    extra = sorted(set(value) - set(LANGS))
    if extra:
        rep.error(where, f'"{key}" has unknown language(s): {", ".join(extra)}')


def _placeholders(rep: Report, where: str, node, path: str = "") -> None:
    if isinstance(node, str):
        if node.lstrip().startswith(PLACEHOLDER):
            rep.error(where, f'"{path}" still holds the placeholder "{node.strip()[:60]}"')
    elif isinstance(node, dict):
        for k, v in node.items():
            _placeholders(rep, where, v, f"{path}.{k}" if path else k)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            _placeholders(rep, where, v, f"{path}[{i}]")


def _local_file(url: str) -> Path:
    return ROOT / url.lstrip("/").split("?")[0].split("#")[0]


# ---------------- Products ----------------

def check_products(rep: Report, taxonomy, brand_names: set) -> dict:
    """Returns {id: product} for the files that could be read."""
    import build_images                  # one image rule set, shared with the pipeline

    products = {}
    readable = []
    for path in sorted((DATA / "products").glob("*.json")):
        where = f"data/products/{path.name}"
        data = _read(rep, path, where)
        if data is None:
            continue
        readable.append((path.name, data))
        products[data.get("id") or path.stem] = data

        _fields(rep, where, data, PRODUCT_REQUIRED, PRODUCT_OPTIONAL)
        _id(rep, where, data, path)
        _placeholders(rep, where, data)
        for key in ("title", "short_description", "description"):
            _localized(rep, where, data, key)

        brand = data.get("brand")
        if "brand" in data and brand not in brand_names:
            rep.error(where, f'brand "{brand}" has no file in data/brands/'
                             f'{_suggest(str(brand), brand_names)} — add it with new_brand.py')

        tech = data.get("technology")
        if "technology" in data and (not isinstance(tech, list) or not tech
                                     or not all(_text(t) for t in tech)):
            rep.error(where, '"technology" must list at least one value, e.g. ["KNX"]')
        elif isinstance(tech, list) and len(set(tech)) != len(tech):
            rep.error(where, '"technology" lists a value twice')
        if "installation" in data and not _text(data.get("installation")):
            rep.error(where, '"installation" is empty')
        if taxonomy is not None:
            for msg in taxonomy.check_product(data):
                rep.error(where, msg)

        _specs(rep, where, data)
        _files(rep, where, data)

        short = data.get("short_description")
        if isinstance(short, dict) and _text(short.get("en")):
            words = len(short["en"].split())
            if words > SHORT_DESC_MAX_WORDS:
                rep.warn(where, f"English short_description has {words} words "
                                f"(house style: at most {SHORT_DESC_MAX_WORDS})")

    for msg in build_images.check_product_images(readable):
        rep.errors.append(f"data/products/{msg}")
    return products


def _specs(rep: Report, where: str, data: dict) -> None:
    specs = data.get("specs")
    if "specs" not in data:
        return
    if not isinstance(specs, dict) or any(not isinstance(specs.get(l), dict) for l in LANGS):
        rep.error(where, '"specs" must be {"en": {...}, "fr": {...}, "ar": {...}}')
        return
    counts = {lang: len(specs[lang]) for lang in LANGS}
    if len(set(counts.values())) > 1:
        rep.error(where, "specs need the same number of rows in every language ("
                  + ", ".join(f"{l} {n}" for l, n in counts.items()) + ")")
    if not counts["en"]:
        rep.error(where, '"specs" is empty')
    for lang in LANGS:
        empty = [k for k, v in specs[lang].items() if not _text(k) or not _text(v)]
        if empty:
            rep.error(where, f'specs.{lang} has empty rows: {", ".join(map(repr, empty[:3]))}')


def _files(rep: Report, where: str, data: dict) -> None:
    files = data.get("files")
    if "files" not in data:
        return
    if not isinstance(files, list):
        rep.error(where, '"files" must be a list (use [] when there are none)')
        return
    for i, item in enumerate(files):
        if not isinstance(item, dict) or set(item) != {"name", "url"}:
            rep.error(where, f'files[{i}] must be {{"name": ..., "url": ...}}')
            continue
        url = item["url"]
        if not _text(item["name"]):
            rep.error(where, f"files[{i}] has no name")
        if not isinstance(url, str) or not url.startswith(("https://", "/")):
            rep.error(where, f'files[{i}] url must start with https:// or / (got {url!r})')
        elif url.startswith("/") and not _local_file(url).is_file():
            rep.error(where, f"files[{i}] points to {url}, which does not exist")


# ---------------- Brands ----------------

def check_brands(rep: Report) -> set:
    """Returns the set of brand names that have a file."""
    names: dict = {}
    for path in sorted((DATA / "brands").glob("*.json")):
        where = f"data/brands/{path.name}"
        data = _read(rep, path, where)
        if data is None:
            continue
        _fields(rep, where, data, BRAND_REQUIRED, BRAND_OPTIONAL)
        _id(rep, where, data, path)
        _placeholders(rep, where, data)
        for key in ("tagline", "description"):
            _localized(rep, where, data, key)

        name = data.get("brand")
        if not _text(name):
            rep.error(where, '"brand" (the display name products use) is empty')
        elif name in names:
            rep.error(where, f'brand name "{name}" is also used by {names[name]}')
        else:
            names[name] = path.name
            # Product pages and cards link a brand to /brands/<this slug>.html.
            if data.get("id") != brand_slug(name):
                rep.error(where, f'"id" must be "{brand_slug(name)}" — product pages link '
                                 f'"{name}" to /brands/{brand_slug(name)}.html')

        if "country_of_origin" in data and not _text(data.get("country_of_origin")):
            rep.error(where, '"country_of_origin" is empty (leave the field out if unknown)')
        founded = data.get("founded")
        if "founded" in data and not (isinstance(founded, int) and 1800 <= founded <= date.today().year):
            rep.error(where, f'"founded" must be a year, e.g. 2006 (got {founded!r})')
        site = data.get("website")
        if "website" in data and not (isinstance(site, str) and site.startswith("https://")):
            rep.error(where, f'"website" must start with https:// (got {site!r})')
        logo = data.get("logo")
        if logo is not None and "logo" in data:
            if not (isinstance(logo, str) and logo.startswith("/assets/brands/")):
                rep.error(where, f'"logo" must be a file in /assets/brands/ or null (got {logo!r})')
            elif not _local_file(logo).is_file():
                rep.error(where, f"logo {logo} does not exist")
            elif logo != f"/assets/brands/{data.get('id')}.svg":
                rep.warn(where, f"product cards show /assets/brands/{data.get('id')}.svg; "
                                f"with {logo} they fall back to the brand name")
    return set(names)


def brand_slug(name: str) -> str:
    """Brand id from its name: lower case, spaces -> '-' (as the brand page URLs)."""
    return re.sub(r"\s+", "-", str(name).lower())


# ---------------- Projects ----------------

def check_projects(rep: Report, taxonomy, product_ids: set) -> None:
    for path in sorted((DATA / "projects").glob("*.json")):
        where = f"data/projects/{path.name}"
        data = _read(rep, path, where)
        if data is None:
            continue
        _fields(rep, where, data, PROJECT_REQUIRED, PROJECT_OPTIONAL)
        _id(rep, where, data, path)
        _placeholders(rep, where, data)
        for key in ("title", "short_description", "description"):
            _localized(rep, where, data, key)
        seo = data.get("seo_title")
        if "seo_title" in data and not (isinstance(seo, dict) and seo and all(
                l in ("en", "fr", "ar") and isinstance(v, str) and v.strip() for l, v in seo.items())):
            rep.error(where, '"seo_title" must map some of en/fr/ar to a non-empty text')

        if "location" in data and not _text(data.get("location")):
            rep.error(where, '"location" is empty')
        try:
            date.fromisoformat(str(data.get("date")))
        except ValueError:
            if "date" in data:
                rep.error(where, f'"date" must be YYYY-MM-DD (got {data.get("date")!r})')
        days = data.get("duration_days")
        if "duration_days" in data and not (isinstance(days, int) and days > 0):
            rep.error(where, f'"duration_days" must be a whole number of days (got {days!r})')

        cats = data.get("categories")
        if "categories" in data and (not isinstance(cats, list) or not cats):
            rep.error(where, '"categories" must list at least one project category')
        elif taxonomy is not None:
            for msg in taxonomy.check_project(data):
                rep.error(where, msg)

        related = data.get("related_products")
        if isinstance(related, list):
            for pid in related:
                if pid not in product_ids:
                    rep.error(where, f'related product "{pid}" does not exist'
                                     f'{_suggest(str(pid), product_ids)}')
        elif "related_products" in data:
            rep.error(where, '"related_products" must be a list of product ids')

        cover = data.get("cover")
        if "cover" in data and not (isinstance(cover, str) and _local_file(cover).is_file()):
            rep.error(where, f"cover {cover!r} does not exist")
        _media(rep, where, data)

        quote = data.get("testimonial")
        if quote is not None:
            if not isinstance(quote, dict) or not _text(quote.get("author")) or "quote" not in quote:
                rep.error(where, '"testimonial" needs an "author" and a "quote" in en/fr/ar')
            else:
                _localized(rep, where + " testimonial", quote, "quote")


def _media(rep: Report, where: str, data: dict) -> None:
    media = data.get("media")
    if "media" not in data:
        return
    if not isinstance(media, list) or not media:
        rep.error(where, '"media" must list at least one image')
        return
    for i, item in enumerate(media):
        if not isinstance(item, dict) or item.get("type") not in MEDIA_TYPES:
            rep.error(where, f'media[{i}] needs "type": one of {", ".join(sorted(MEDIA_TYPES))}')
            continue
        src = item.get("src")
        if not (isinstance(src, str) and _local_file(src).is_file()):
            rep.error(where, f"media[{i}] file {src!r} does not exist")
        if item["type"] == "video":
            poster = item.get("poster")
            if not (isinstance(poster, str) and _local_file(poster).is_file()):
                rep.error(where, f"media[{i}] video needs a \"poster\" image that exists (got {poster!r})")
        _localized(rep, f"{where} media[{i}]", item, "alt")
        if "alt" not in item:
            rep.error(where, f"media[{i}] has no alt text")


# ---------------- Protocols ----------------

def check_protocols(rep: Report, technologies: set) -> None:
    """technologies: every "technology" value the products use (lower case)."""
    claimed: dict = {}
    for path in sorted((DATA / "protocols").glob("*.json")):
        where = f"data/protocols/{path.name}"
        data = _read(rep, path, where)
        if data is None:
            continue
        _fields(rep, where, data, PROTOCOL_REQUIRED, PROTOCOL_OPTIONAL)
        _id(rep, where, data, path)
        _placeholders(rep, where, data)
        for key in ("tagline", "description", "kicker", "medium", "less_suited", "seo_title"):
            _localized(rep, where, data, key)
        if not _text(data.get("name")):
            rep.error(where, '"name" is empty')
        match = data.get("match")
        if not (isinstance(match, list) and match and all(_text(m) for m in match)):
            rep.error(where, '"match" must list the technology names it covers, e.g. ["KNX"]')
        else:
            for m in match:
                if m.lower() in claimed:
                    rep.error(where, f'"{m}" is also claimed by {claimed[m.lower()]}')
                claimed[m.lower()] = path.name
                if m.lower() not in technologies:
                    rep.warn(where, f'no product has the technology "{m}" yet')
        logo = data.get("logo")
        if "logo" in data and not (isinstance(logo, str) and _local_file(logo).is_file()):
            rep.error(where, f"logo {logo!r} does not exist")
        when = data.get("when")
        if "when" in data and not (isinstance(when, dict) and all(
                isinstance(when.get(l), list) and when[l] and all(_text(x) for x in when[l]) for l in LANGS)):
            rep.error(where, '"when" must give a list of points in en, fr and ar')
        elif isinstance(when, dict) and len({len(when[l]) for l in LANGS}) != 1:
            rep.error(where, '"when" has a different number of points per language')
        labels = data.get("diagram_labels")
        graph = data.get("graph")
        if ("diagram" in data or "graph" in data) and not isinstance(labels, dict):
            rep.error(where, '"diagram" / "graph" needs "diagram_labels" in en, fr and ar')
        elif isinstance(graph, dict):
            ids = [n.get("id") for n in graph.get("nodes") or []]
            if len(ids) != len(set(ids)) or None in ids:
                rep.error(where, '"graph" nodes need a unique "id" each')
            for link in graph.get("links") or []:
                if not (isinstance(link, list) and len(link) == 3 and link[0] in ids and link[1] in ids
                        and link[2] in ("wire", "radio", "mesh", "load", "net")):
                    rep.error(where, f'"graph" link {link!r} must be [node, node, wire|radio|mesh|load|net]')
            if isinstance(labels, dict) and set(labels.get("en") or {}) != set(ids):
                rep.error(where, '"diagram_labels" must have one label per "graph" node')
        elif isinstance(labels, dict):
            keys = {l: set(labels.get(l) or {}) for l in LANGS}
            for l in LANGS:
                if keys[l] != keys["en"] or not all(_text(v) for v in (labels.get(l) or {}).values()):
                    rep.error(where, f'"diagram_labels" in {l} must have the same, non-empty labels as en')


# ---------------- Locales ----------------

def _flatten(node: dict, prefix: str = "") -> dict:
    out = {}
    for key, value in node.items():
        if isinstance(value, dict):
            out.update(_flatten(value, f"{prefix}{key}."))
        else:
            out[prefix + key] = value
    return out


def check_locales(rep: Report) -> None:
    tables = {}
    for lang in LANGS:
        path = _lib.LOCALES_DIR / f"{lang}.json"
        data = _read(rep, path, f"assets/locales/{lang}.json")
        if data is None:
            return
        tables[lang] = _flatten(data)
        empty = sorted(k for k, v in tables[lang].items() if not _text(v))
        if empty:
            rep.error(f"assets/locales/{lang}.json", f'empty value for: {", ".join(empty[:8])}')

    for lang in ("fr", "ar"):
        missing = sorted(set(tables["en"]) - set(tables[lang]))
        if missing:
            rep.error(f"assets/locales/{lang}.json",
                      f'missing {len(missing)} key(s) that en.json has: {", ".join(missing[:8])}')
    only_fr = sorted(set(tables["fr"]) - set(tables["ar"]))
    only_ar = sorted(set(tables["ar"]) - set(tables["fr"]))
    if only_fr:
        rep.error("assets/locales/ar.json", f'missing key(s) that fr.json has: {", ".join(only_fr[:8])}')
    if only_ar:
        rep.error("assets/locales/fr.json", f'missing key(s) that ar.json has: {", ".join(only_ar[:8])}')


# ---------------- Entry points ----------------

def run() -> Report:
    rep = Report()
    _lib.load_taxonomy.cache_clear()
    try:
        taxonomy = _lib.load_taxonomy()
    except _lib.TaxonomyError as exc:
        rep.error("data/taxonomy.json", str(exc))
        taxonomy = None

    brand_names = check_brands(rep)
    products = check_products(rep, taxonomy, brand_names)
    check_projects(rep, taxonomy, set(products))
    check_protocols(rep, {str(x).lower() for p in products.values() for x in p.get("technology") or []})
    check_locales(rep)

    used = {p.get("brand") for p in products.values()}
    for name in sorted(brand_names - used):
        rep.warn("data/brands", f'brand "{name}" has no products yet (its page will be empty)')
    return rep


_ensured = False


def ensure() -> None:
    """Stop the build on any error; print one line about warnings. Runs once
    per process, however many build stages call it."""
    global _ensured
    if _ensured:
        return
    rep = run()
    _lib.abort_on_problems(
        rep.errors, "the content files",
        hint="Run python scripts/validate.py for the full report.",
    )
    if rep.warnings:
        print(f"  validate: OK, {len(rep.warnings)} warning(s) — "
              f"python scripts/validate.py lists them")
    else:
        print("  validate: OK")
    _ensured = True


def main() -> int:
    rep = run()
    for title, lines in (("ERRORS (the build stops)", rep.errors),
                         ("Warnings (the build continues)", rep.warnings)):
        if lines:
            print(f"\n{title}: {len(lines)}")
            for line in lines:
                print(f"  - {line}")
    if not rep.errors:
        print(f"\nOK — no errors, {len(rep.warnings)} warning(s).")
    return 1 if rep.errors else 0


if __name__ == "__main__":
    sys.exit(main())
