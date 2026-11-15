---
name: catalog
description: Manage the Smart Electricity product catalog — add, edit, delete products with JSON + SSG + trilingual support. Use when adding/editing/deleting products, processing images, or rebuilding the catalog.
---

# Product Catalog Manager — Smart Electricity

Static JSON-based system with trilingual support (English, French, Arabic).

## Quick Reference

### File Locations
| Path | Role |
|---|---|
| `data/products/<id>.json` | Product definition |
| `media/products/` | Original product images — the only place image files go (max 2000px) |
| `assets/products/`, `assets/og/` | Generated WebP variants + 1200×630 share cards — **never edit or add files** |
| `data/taxonomy.json` | Allowed product types / technologies / installations with en/fr/ar labels |
| `products/`, `fr/products/`, `ar/products/` | Auto-generated SEO pages |
| `data/products_index.json` | Auto-generated index — **never edit manually** |

### Commands
```bash
# Add: checks the values, copies the images into media/products/, writes the file, rebuilds
python scripts/new_product.py <slug> --brand "<Brand>" --type "<Type>" --tech KNX \
    --install "<Method>" --image <scratch>/<slug>.png [--image ...] --content <scratch>/texts.json
# Remove (shows the plan; add --yes to do it and rebuild)
python scripts/remove_product.py <slug>
# Rebuild after any manual edit — validates first, then images, pages, brand pages, sitemap
python scripts/build_all.py
# Full content report (errors stop the build; warnings do not)
python scripts/validate.py
```
`texts.json` holds `title`, `short_description`, `description`, `specs`, `files` (and optionally a real `rating`) in the schema below. Without `--content` the file gets `"TODO: ..."` placeholders and the build refuses to run until they are replaced.

### Product JSON Schema
```json
{
  "id": "<slug>", "brand": "<Brand>",
  "technology": ["KNX","Wi-Fi"], "product_type": "<Type>",
  "installation": "<Method>",
  "title": {"en":"...","fr":"...","ar":"..."},
  "short_description": {"en":"...","fr":"...","ar":"..."},
  "description": {"en":"...","fr":"...","ar":"..."},
  "specs": {"en":{},"fr":{},"ar":{}},
  "images": ["<slug>.png", "<slug>-2.jpg"],
  "rating": {"value":4.3,"count":17},
  "files": [{"name":"Datasheet","url":"https://..."}]
}
```

### Image Processing Pipeline
Originals go in `media/products/`; `images` lists **file names only**, first = primary. The build makes the web versions (WebP 400/800/1200 + share card) — never resize or convert for the web yourself.

**Only the primary image** (first in the `images` array) goes through this pipeline. Secondary/additional images must be kept as-is (raw from source, no background removal, no crop, no edge polish).

1. **Background removal** — choose based on product type:
   - `remove_bg.py` (AI): standard products (relays, actuators, switches, sensors)
   - `remove_bg_traditional.py` (Flood Fill): screens/panels, dark housing, thin antennas
2. **Crop**: `python scripts/crop_image.py <scratch>/<slug>.png` — always

Process the primary in a scratch folder, then pass the result to `new_product.py --image`.
3. **Edge polish**: alpha-channel Gaussian blur radius 0.8 (recommended after any background removal)

### Filter Values
No list is kept here (copies went stale). `product_type`, `technology` and `installation` must be ids from `data/taxonomy.json`; `brand` must match the `brand` field of a file in `data/brands/`. Read those files — `new_product.py` and the build (`validate.py`) reject anything else, naming the closest allowed value.

### Arabic Translation Rules
Keep in English: brand names, model numbers, protocols (Wi-Fi, KNX, MQTT, Zigbee), platform names (Home Assistant, Alexa). Translate only descriptive language.

### Technology Icons
When adding a new `technology` value, add it to `data/taxonomy.json` and its SVG icon to `protoMarkup()` in `assets/site-core.js` (the one icon dictionary). Use official logo for known protocols (Zigbee, Matter, Thread) or Lucide icon for others.

### Critical Rules
- **Never use PowerShell for JSON editing** — it corrupts UTF-8 Arabic text (mojibake)
- **Never manually edit** `products_index.json`, `sitemap.xml`, or files in `products/`, `fr/products/`, `ar/products/`
- **Always run `build_all.py`** after any product change (`build_products.py` alone leaves brand pages stale)
- **Rating**: prefer real data from Amazon/manufacturer. If none, omit field entirely (build script derives fallback 3.8-4.7 deterministically from slug hash)
- **short_description**: max 8-10 words, focus on WHAT the product IS, not connectivity
- A new `product_type` / `installation` / `technology` is added in `data/taxonomy.json` only, with en/fr/ar labels (no locale keys)
