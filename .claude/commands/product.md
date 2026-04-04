# Product Catalog Manager — Smart Electricity

You are managing the product catalog for the Smart Electricity website. This is a static JSON-based system with trilingual support (English, French, Arabic).

## Architecture

```
data/products/          → Individual product JSON files
data/products_index.json → Aggregated index (auto-generated, never edit manually)
assets/products/        → Product images
assets/locales/ar.json  → Arabic translations (filter values)
assets/locales/fr.json  → French translations (filter values)
scripts/build_products.py → Index builder script
```

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

4. **Rebuild the index**:
   ```bash
   python scripts/build_products.py
   ```

### Editing an Existing Product

1. Read the product file from `data/products/`
2. Make the requested changes (preserve all three languages)
3. Rebuild the index with `python scripts/build_products.py`

### Listing Products

List files in `data/products/` to show available products. Read individual files for details.

### Deleting a Product

1. Delete the JSON file from `data/products/`
2. Rebuild the index with `python scripts/build_products.py`
3. Optionally remove the product's images from `assets/products/`

## Existing Filter Values (for consistency)

These are the values currently in use across products. Always prefer reusing existing values:

**Brands**: `EAE Technology`, `Shelly`, `Reyee`
**Technologies**: `KNX`, `Wi-Fi`, `Bluetooth`, `LAN`
**Product Types**: `Actuator`, `Power Supply`, `Switch`, `Smart Relay`, `Room Control Unit`, `Touch Panel`, `Network`, `Dimmer`
**Installation**: `DIN Rail mounting`, `Wall mount`, `Free standing`, `Door frame`, `Behind wall switch`, `Ceiling mounting`

When the user provides product info in any language, translate it appropriately for all three languages (en, fr, ar). If the user only gives partial info, ask for the missing critical fields before creating the file.

## Writing Style

- **`short_description`**: Keep it very short — one concise line, max 8-10 words. Focus on what the product IS, not connectivity details. Connectivity info is already shown via the `technology` tags on the card. Example: "Dual cover/shutter controller with power metering." NOT "DIN-rail dual cover/shutter smart controller with power metering, Wi-Fi, Bluetooth, and LAN connectivity."
- **`description`**: Rich but accessible. Write 3-5 sentences that explain what the product does, how it fits into a smart home setup, and what benefits it brings — in clear language a homeowner would understand. Cover the use case, key advantages, and what makes it stand out. Avoid raw specs (voltages, frequencies, protocol codes) — those belong in the `specs` table. Avoid jargon — if a technical term is necessary, explain it simply. The goal: someone reading this should understand WHY they'd want this product without needing an engineering degree.

## Important Rules

- The `id` field MUST match the filename (without `.json`)
- All text fields (`title`, `short_description`, `description`, `specs`) MUST have `en`, `fr`, and `ar` versions
- Images should be optimized for web (keep file sizes small)
- Always run the build script after any changes to product files
- Never manually edit `data/products_index.json` — it's auto-generated
