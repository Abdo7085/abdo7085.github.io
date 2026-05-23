#!/usr/bin/env python3
"""
Build the entire site in one shot.

Runs the three build stages in the recommended order, in a single Python
process (no subprocess boundaries), so shared helpers in `_lib.py` stay
warm and the `load_locale` cache hits across modules.

Order:
  1. generate_localized — emit /fr/ and /ar/ localized copies of root HTML.
  2. build_projects     — read data/projects/*.json, enrich media, write
                          per-project HTML, inject ItemList into previous-work.
  3. build_products     — read data/products/*.json, write per-product HTML,
                          inject ItemList into products.html.
  4. build_brands       — read data/brands/*.json (joined with products_index.json
                          from stage 3), write per-brand HTML, inject ItemList
                          into brands.html. Runs after build_products so the
                          freshest products_index.json is available.

Each stage writes sitemap.xml via `_lib.write_sitemap()`. Because that
writer is idempotent and reads indexes from disk, the final sitemap is
always complete — regardless of which stage ran last.

Usage:
    python scripts/build_all.py
"""

from __future__ import annotations

import sys
import time

import generate_localized
import build_projects
import build_products
import build_brands


def run_stage(name: str, fn) -> None:
    print(f"\n======================================")
    print(f"  Stage: {name}")
    print(f"======================================\n")
    t0 = time.perf_counter()
    fn()
    dt = time.perf_counter() - t0
    print(f"\n  ({name} finished in {dt:.2f}s)")


def main() -> int:
    run_stage("generate_localized", generate_localized.main)
    run_stage("build_projects", build_projects.main)
    run_stage("build_products", build_products.main)
    run_stage("build_brands", build_brands.main)
    print("\n=== Full site build complete. ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
