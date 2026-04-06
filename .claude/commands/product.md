# Product Catalog Manager — Smart Electricity

You are managing the product catalog for the Smart Electricity website. This is a static JSON-based system with trilingual support (English, French, Arabic).

## Architecture

```
data/products/          → Individual product JSON files
data/products_index.json → Aggregated index (auto-generated, never edit manually)
assets/products/        → Product images
assets/locales/ar.json  → Arabic translations (filter values)
assets/locales/fr.json  → French translations (filter values)
scripts/build_products.py → Unified build: index + static SEO pages + sitemap
scripts/generate_static_seo.py → SEO page generator (called by build_products.py)

products/               → Static product HTML pages (EN, auto-generated)
fr/products/            → Static product HTML pages (FR, auto-generated)
ar/products/            → Static product HTML pages (AR, auto-generated)
sitemap.xml             → Auto-generated sitemap with all product URLs
```

## Product URLs

Products use **static HTML pages** (not query params) for SEO:
- English: `https://smartelectricity.ma/products/<product-slug>.html`
- French: `https://smartelectricity.ma/fr/products/<product-slug>.html`
- Arabic: `https://smartelectricity.ma/ar/products/<product-slug>.html`

Each static page has pre-rendered `og:image`, `og:title`, `og:description`, `JSON-LD`, and `hreflang` tags so that search engines and social media platforms (WhatsApp, Facebook) can read the product info without JavaScript.

## Operations

### Adding a New Product

1. **Create the JSON file** at `data/products/<product-slug>.json` using this template:

```json
{
  "id": "<product-slug>",
  "brand": "<Brand Name>",
  "technology": ["<Protocol1>", "<Protocol2>"],
  "product_type": "<Type>",
  "installation": "<Installation Method>",

  "title": {
    "en": "English Title",
    "fr": "French Title",
    "ar": "Arabic Title"
  },

  "short_description": {
    "en": "Brief one-line description (max 8-10 words).",
    "fr": "Description courte en une ligne (max 8-10 mots).",
    "ar": "وصف مختصر في سطر واحد (8-10 كلمات كحد أقصى)."
  },

  "description": {
    "en": "Full detailed description for the product page.",
    "fr": "Description détaillée complète.",
    "ar": "وصف شامل وتفصيلي للمنتج."
  },

  "specs": {
    "en": { "Spec Name": "Value" },
    "fr": { "Nom Spec": "Valeur" },
    "ar": { "اسم المواصفة": "القيمة" }
  },

  "images": ["/assets/products/<product-slug>.jpg"],

  "files": [
    { "name": "Datasheet", "url": "https://..." }
  ]
}
```

2. **Check filter value consistency** — Read a few existing products in `data/products/` to match the exact casing and naming of `brand`, `product_type`, `technology`, and `installation` values. Consistency is critical for the sidebar filters to group products correctly.
   - **Reuse existing `product_type` values when the products truly serve the same purpose and installation context.** Don't create a new type if the product is just a variant of an existing category (e.g. "Dimmer Switch" → use `"Dimmer"`). But DO create a new type when the product solves a different problem or has a fundamentally different installation method, even if the underlying technology is similar. For example: `"Smart Relay"` (compact, behind wall switch, retrofit) is distinct from `"Actuator"` (DIN rail, electrical panel, professional installation) — they serve different use cases and customers, so they deserve separate types.

3. **Update locale files if needed** — If you introduce a new `product_type` or `installation` value that doesn't already exist in the catalog, add its translation key to both `assets/locales/ar.json` and `assets/locales/fr.json`. The key format is `val_<Value>` where spaces become underscores:
   - Example: product_type `"Room Control Unit"` → key `"val_Room_Control_Unit"`
   - Example: installation `"Wall mount"` → key `"val_Wall_mount"`

4. **Build everything** (index + static SEO pages + sitemap):
   ```bash
   python scripts/build_products.py
   ```
   This single command does three things:
   - Builds `data/products_index.json` (product listing index)
   - Generates static HTML pages in `products/`, `fr/products/`, `ar/products/` (with og:image, JSON-LD, etc.)
   - Updates `sitemap.xml` with all product URLs

### Editing an Existing Product

1. Read the product file from `data/products/`
2. Make the requested changes (preserve all three languages)
3. Rebuild with `python scripts/build_products.py`

### Listing Products

List files in `data/products/` to show available products. Read individual files for details.

### Deleting a Product

1. Delete the JSON file from `data/products/`
2. Delete the static HTML pages: `products/<slug>.html`, `fr/products/<slug>.html`, `ar/products/<slug>.html`
3. Rebuild with `python scripts/build_products.py`
4. Optionally remove the product's images from `assets/products/`

## Existing Filter Values (for consistency)

These are the values currently in use across products. Always prefer reusing existing values:

**Brands**: `EAE Technology`, `Shelly`, `Reyee`, `SONOFF`
**Technologies**: `KNX`, `Wi-Fi`, `Bluetooth`, `LAN`, `Zigbee`
**Product Types**: `Actuator`, `Power Supply`, `Switch`, `Smart Relay`, `Room Control Unit`, `Touch Panel`, `Network`, `Dimmer`
**Installation**: `DIN Rail mounting`, `Wall mount`, `Free standing`, `Door frame`, `Behind wall switch`, `Ceiling mounting`

When the user provides product info in any language, translate it appropriately for all three languages (en, fr, ar). If the user only gives partial info, ask for the missing critical fields before creating the file.

## Writing Style

- **`short_description`**: Keep it very short — one concise line, max 8-10 words. Focus on what the product IS, not connectivity details. Connectivity info is already shown via the `technology` tags on the card. Example: "Dual cover/shutter controller with power metering." NOT "DIN-rail dual cover/shutter smart controller with power metering, Wi-Fi, Bluetooth, and LAN connectivity."
- **`description`**: Rich but accessible. Write 3-5 sentences that explain what the product does, how it fits into a smart home setup, and what benefits it brings — in clear language a homeowner would understand. Cover the use case, key advantages, and what makes it stand out. Avoid raw specs (voltages, frequencies, protocol codes) — those belong in the `specs` table. Avoid jargon — if a technical term is necessary, explain it simply. The goal: someone reading this should understand WHY they'd want this product without needing an engineering degree.

## Arabic Translation Rules

In Arabic (`ar`) text, **never translate** the following — keep them in their original English form:
- **Product/platform names**: Home Assistant, Alexa, Google Home, Zigbee2MQTT, ZHA, Ruijie Cloud, Reyee Mesh, etc.
- **Technical terms that are industry-standard in English**: mesh, webhook, trailing edge, mJS, flash, firmware, Layer 2, uplink, SFP, etc.
- **Protocol/standard names**: MQTT, PoE, VPN, VLAN, Wi-Fi, Bluetooth, KNX, Zigbee, LAN, GHz, etc.
- **Model numbers and brand names**: always keep as-is

Only translate **common nouns and descriptive language** — for example "وحدة تحكم" (controller), "مرحل ذكي" (smart relay), "قياس الطاقة" (power metering). When in doubt, keep the English term.

## Important Rules

- The `id` field MUST match the filename (without `.json`)
- All text fields (`title`, `short_description`, `description`, `specs`) MUST have `en`, `fr`, and `ar` versions
- Images should be optimized for web — prefer `.avif` when the source provides it (much smaller than PNG/JPG). Use `.png` or `.jpg` as fallback. Don't convert `.avif` to `.png` unnecessarily
- **Always run `python scripts/build_products.py` after any changes** — this is the single command that updates index, SEO pages, and sitemap
- Never manually edit `data/products_index.json`, `sitemap.xml`, or files in `products/`, `fr/products/`, `ar/products/` — they are all auto-generated
