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
scripts/generate_static_seo.py → SEO page generator (called by build_products.py) — full hreflang, og:locale, JSON-LD, robots override, noscript H1
scripts/generate_localized.py → Generates fr/ and ar/ root pages + translates FAQ JSON-LD + partial sitemap
scripts/remove_bg.py      → AI background removal (rembg/U²-Net) → transparent PNG
scripts/remove_bg_traditional.py → Traditional Fallback (Flood Fill) for flat screens/panels
scripts/crop_image.py     → Auto-crop transparent padding so product fills the card

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

Each static page has pre-rendered `og:image`, `og:title`, `og:description`, `JSON-LD` (Product + BreadcrumbList), `hreflang` (including `x-default`), `og:locale`, `robots: index,follow`, and `<h1>` in `<noscript>` — so that search engines and social media platforms (WhatsApp, Facebook) can read the product info without JavaScript.

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

  "rating": {
    "value": 4.3,
    "count": 17
  },

  "files": [
    { "name": "Datasheet", "url": "https://..." }
  ]
}
```

**About the `rating` field**: This drives the `aggregateRating` block in the product's JSON-LD, which Google requires for `Product` rich-result eligibility (alongside `offers` or `review`). Since the site is a catalog (no prices), `aggregateRating` is the only viable path.

- **Always try first** to find a real average rating from credible sources: Amazon listings of the same model, manufacturer's own product page, AliExpress, professional review sites, or trade reviews. If you find a real number, use it (e.g. Amazon shows 4.4 stars from 89 reviews → `{"value": 4.4, "count": 89}`).
- **Only if no real data exists**, omit the `rating` field entirely. The build scripts (`generate_static_seo.py` and `assets/product-detail.js`) will automatically derive a stable fallback in the range **3.8–4.7 stars** with **6–28 reviews**, hashed deterministically from the product `id` so the value never drifts between builds.
- **Never invent suspiciously high values** (4.9+) or unrealistic counts (1000+). Google's spam team flags fabricated ratings, and a manual penalty would remove the site from search results entirely.

2. **Remove the background from the product image** — Most manufacturer images have a studio background. Choose the right tool **before** running — do NOT try AI first and fall back; pick based on product type:

   - **`remove_bg.py` (AI)** — Use for standard products: relays, actuators, power supplies, routers, switches, sensors — anything with a plastic/metal housing and no large dark screen.
     ```bash
     python scripts/remove_bg.py assets/products/<product-slug>.<ext>
     ```
     *Requires: `pip install "rembg[cpu]"`. Uses rembg / U²-Net AI model.*

   - **`remove_bg_traditional.py` (Flood Fill)** — Use for **any product with a visible screen or large dark/black surface**: touch panels, room control units with displays, tablets, monitors. The AI model treats dark bezels and screens as background and removes them, destroying the product image. The traditional Flood Fill algorithm only removes the actual outer background and preserves internal colors.
     ```bash
     python scripts/remove_bg_traditional.py assets/products/<product-slug>.<ext>
     ```

   **Decision rule:** If the product image shows a screen, display, or large dark-colored face → always use `remove_bg_traditional.py`. For everything else → use `remove_bg.py`.

   Both tools produce a transparent `.png` next to the source image. Reference the `.png` in the JSON `images` array. Skip background removal only if the source image is already transparent.

   **Always crop the final image** — Whether or not background removal was needed, always run the auto-crop script to ensure the product fills its card consistently (no wasted transparent padding):
   ```bash
   python scripts/crop_image.py assets/products/<product-slug>.png
   ```
   This trims all transparent padding and adds a small uniform margin (4% of the longest side). The product should fill most of the image canvas — compare with existing product images like `rcu0808-room-control-unit.png` for reference. This step is **mandatory** for every product image, even if it already has a transparent background.

3. **Check filter value consistency** — Read a few existing products in `data/products/` to match the exact casing and naming of `brand`, `product_type`, `technology`, and `installation` values. Consistency is critical for the sidebar filters to group products correctly.
   - **Reuse existing `product_type` values when the products truly serve the same purpose and installation context.** Don't create a new type if the product is just a variant of an existing category (e.g. "Dimmer Switch" → use `"Dimmer"`). But DO create a new type when the product solves a different problem or has a fundamentally different installation method, even if the underlying technology is similar. For example: `"Smart Relay"` (compact, behind wall switch, retrofit) is distinct from `"Actuator"` (DIN rail, electrical panel, professional installation) — they serve different use cases and customers, so they deserve separate types.

4. **Update locale files if needed** — If you introduce a new `product_type` or `installation` value that doesn't already exist in the catalog, add its translation key to both `assets/locales/ar.json` and `assets/locales/fr.json`. The key format is `val_<Value>` where spaces become underscores:
   - Example: product_type `"Room Control Unit"` → key `"val_Room_Control_Unit"`
   - Example: installation `"Wall mount"` → key `"val_Wall_mount"`

5. **Build everything** (index + static SEO pages + sitemap):
   ```bash
   python scripts/build_products.py
   ```
   This single command does all of the following:
   - Builds `data/products_index.json` (product listing index)
   - Generates static HTML pages in `products/`, `fr/products/`, `ar/products/` with full SEO:
     - <title> + <meta description> translated per language
     - hreflang tags for all 3 languages + x-default (pointing to EN)
     - Open Graph + Twitter Card tags with product image
     - og:locale + og:locale:alternate for each language
     - JSON-LD Product schema with aggregateRating + BreadcrumbList
     - <meta name="robots" content="index, follow"> (overrides the noindex template)
     - <h1> inside <noscript> with product name — for crawlers that don't execute JS
   - Injects ItemList JSON-LD into products.html (EN/FR/AR) for catalog rich results
   - Updates sitemap.xml with all product URLs + lastmod dates + hreflang alternates

   **⚠️ Build order matters:** If you also modified root pages (index.html, products.html, previous-work.html), you must run `generate_localized.py` **first**, then `build_products.py` **last** — because both scripts write `sitemap.xml`, and `build_products.py` produces the complete sitemap (static pages + products):
   ```bash
   python scripts/generate_localized.py    # ← generates fr/ and ar/ root pages + partial sitemap
   python scripts/build_products.py         # ← must run LAST (produces complete sitemap)
   ```

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
**Product Types**: `Actuator`, `Power Supply`, `Switch`, `Smart Relay`, `Room Control Unit`, `Touch Panel`, `Network`, `Dimmer`, `Shutter`, `Thermostat`, `Universal Interface`
**Installation**: `DIN Rail mounting`, `Wall mount`, `Free standing`, `Door frame`, `Behind wall switch`, `Ceiling mounting`

When the user provides product info in any language, translate it appropriately for all three languages (en, fr, ar). If the user only gives partial info, ask for the missing critical fields before creating the file.

### Self-Updating Filter Values

After adding any product that introduces a **new** `brand`, `technology`, `product_type`, or `installation` value not listed above, you MUST update this section of the skill file (`.claude/commands/product.md`) by appending the new value to the appropriate line. This keeps the reference list always in sync with the actual catalog, so future sessions don't need to scan all product files to discover valid values.

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

## Downloads & Manuals (`files` array)

Each entry in `files` should link to **authoritative manufacturer content**, not marketing pages or third-party resellers. Strongly prefer, in this order:

1. **PDF documents** hosted by the manufacturer — datasheets, user manuals, installation guides, wiring diagrams, declarations of conformity. These are stable, printable, and search-engine friendly. Always label them clearly: `"Datasheet (PDF)"`, `"User Manual (PDF)"`, `"Installation Guide (PDF)"`.
2. **Manufacturer Knowledge Base / Help Center pages** — e.g. `kb.shelly.cloud`, `help.eaetechnology.com`, `sonoff.tech/product/...`, `reyee.ruijie.com/.../faq`. These are acceptable when no PDF exists for the topic, and they often contain richer setup info. Label them `"Knowledge Base"` or `"Setup Guide"`.

**Avoid** linking to: generic product/marketing pages (e.g. `shelly.com/products/shop/...`), Amazon/AliExpress listings, blog posts, YouTube videos, or any non-manufacturer source. If the only thing you can find is a marketing page, it's better to omit that file entry than to include a low-value link.

When researching a new product, actively search the manufacturer's site for `filetype:pdf <model number>` or browse their downloads/support section to locate proper PDFs before falling back to KB pages.

**Verify every URL before adding it.** Use WebFetch (or a HEAD request) on each candidate link to confirm it returns a 200 response and real content — never trust a guessed URL pattern. A broken link in `files` is worse than no link at all. If a PDF URL returns 404, drop it and search again; don't commit broken links.

## Important Rules

- The `id` field MUST match the filename (without `.json`)
- All text fields (`title`, `short_description`, `description`, `specs`) MUST have `en`, `fr`, and `ar` versions
- Images should be optimized for web — prefer `.avif` when the source provides it (much smaller than PNG/JPG). Use `.png` or `.jpg` as fallback. Don't convert `.avif` to `.png` unnecessarily
- **Always run `python scripts/build_products.py` after any changes** — this is the single command that updates index, SEO pages, and sitemap
- Never manually edit `data/products_index.json`, `sitemap.xml`, or files in `products/`, `fr/products/`, `ar/products/` — they are all auto-generated
