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
| `assets/products/` | Processed images |
| `products/`, `fr/products/`, `ar/products/` | Auto-generated SEO pages |
| `data/products_index.json` | Auto-generated index — **never edit manually** |

### Build Command
```bash
python scripts/build_products.py
```
This single command updates: index + static SEO pages + ItemList JSON-LD + sitemap.xml.

For full rebuild (after template/locale changes too):
```bash
python scripts/build_all.py
```

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
  "images": ["/assets/products/<slug>.png"],
  "rating": {"value":4.3,"count":17},
  "files": [{"name":"Datasheet","url":"https://..."}]
}
```

### Image Processing Pipeline
**Only the primary image** (first in the `images` array) goes through this pipeline. Secondary/additional images must be kept as-is (raw from source, no background removal, no crop, no edge polish).

1. **Background removal** — choose based on product type:
   - `remove_bg.py` (AI): standard products (relays, actuators, switches, sensors)
   - `remove_bg_traditional.py` (Flood Fill): screens/panels, dark housing, thin antennas
2. **Crop**: `python scripts/crop_image.py assets/products/<slug>.png` — always
3. **Edge polish**: alpha-channel Gaussian blur radius 0.8 (recommended after any background removal)

### Existing Filter Values
**Brands**: `EAE Technology`, `Shelly`, `Reyee`, `SONOFF`, `Zennio`, `Tuya`, `Dahua`
**Technologies**: `KNX`, `Wi-Fi`, `Bluetooth`, `LAN`, `Zigbee`, `Matter`, `Thread`
**Product Types**: `Actuator`, `Power Supply`, `Switch`, `Smart Relay`, `Room Control Unit`, `Touch Panel`, `Door Station`, `Network`, `Dimmer`, `Shutter`, `Thermostat`, `Universal Interface`, `Gateway`
**Installation**: `DIN Rail mounting`, `Wall mount`, `Free standing`, `Door frame`, `Behind wall switch`, `Ceiling mounting`

### Arabic Translation Rules
Keep in English: brand names, model numbers, protocols (Wi-Fi, KNX, MQTT, Zigbee), platform names (Home Assistant, Alexa). Translate only descriptive language.

### Technology Icons
When adding a new `technology` value, you MUST also add its SVG icon in `assets/product-detail.js` inside `renderProductContent()` (~line 320). Use official logo for known protocols (Zigbee, Matter, Thread) or Lucide icon for others.

### Critical Rules
- **Never use PowerShell for JSON editing** — it corrupts UTF-8 Arabic text (mojibake)
- **Never manually edit** `products_index.json`, `sitemap.xml`, or files in `products/`, `fr/products/`, `ar/products/`
- **Always run `build_products.py`** after any product change
- **Rating**: prefer real data from Amazon/manufacturer. If none, omit field entirely (build script derives fallback 3.8-4.7 deterministically from slug hash)
- **short_description**: max 8-10 words, focus on WHAT the product IS, not connectivity
- When introducing a new `product_type` or `installation` value, add its `val_*` key to both `fr.json` and `ar.json`
