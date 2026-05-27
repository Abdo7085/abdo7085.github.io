# Brand Catalog Manager — Smart Electricity

You are managing the brand pages for the Smart Electricity website. Each brand we install (EAE Technology, Shelly, Zennio, Reyee, SONOFF, Dahua, Tuya …) gets a dedicated trilingual landing page (EN/FR/AR) with hero, story, auto-derived tech/category chips, paginated product grid, and CTA. This skill mirrors the architecture of the product and project catalogs but is **optimized for brand-identity copy** — what the manufacturer makes, who they target, what makes them distinctive — independent of which SKUs we happen to stock today.

## Architecture

```
data/brands/             → Individual brand JSON files (one per manufacturer)
data/brands_index.json   → Aggregated index (auto-generated, never edit manually)
assets/brands/<slug>.<ext> → Brand logos (optional — null in JSON = text fallback)
scripts/_lib.py            → Shared helpers (i18n, SEO, JSON-LD, sitemap)
scripts/build_all.py       → One-shot orchestrator (localize → projects → products → brands)
scripts/build_brands.py    → Unified build: index + per-brand SEO pages + sitemap + ItemList injection
scripts/build_products.py  → Products catalog build (MUST run before brands)
scripts/patch_navbar_brands.py → One-shot SPA bundle surgery (already applied, idempotent)

brands.html              → Root template for the brands index (indexable)
brand.html               → SPA template for individual brand routes (noindex — overridden by build)
brands/<slug>.html       → Per-brand static HTML pages (EN, auto-generated)
fr/brands/<slug>.html    → Per-brand static HTML pages (FR, auto-generated)
ar/brands/<slug>.html    → Per-brand static HTML pages (AR, auto-generated)
sitemap.xml              → Auto-generated, includes all brand URLs with hreflang
```

## Brand URLs

Brands use **static HTML pages** for SEO:
- English: `https://smartelectricity.ma/brands/<brand-slug>.html`
- French:  `https://smartelectricity.ma/fr/brands/<brand-slug>.html`
- Arabic:  `https://smartelectricity.ma/ar/brands/<brand-slug>.html`
- Index:   `https://smartelectricity.ma/brands.html` (+ `/fr/brands.html`, `/ar/brands.html`)

Each static page has pre-rendered `og:image`, `og:title`, `og:description`, `JSON-LD` (`Brand` + `BreadcrumbList` + `ItemList` of that brand's products), `hreflang` (incl. `x-default`), `og:locale`, `robots: index,follow`, an `<h1>` in `<noscript>`, and inline `window.__BRAND__` with the full data + products list pre-embedded so `brand-detail.js` renders instantly without a second fetch.

## Operations

### Adding a New Brand

**The interaction is conversational, not a rigid questionnaire.** You leverage what you already know about the brand (most major manufacturers have a stable, well-documented identity) and only ask the user for things genuinely ambiguous or specific to their installation experience.

The flow has three phases — **A: Identify**, **B: Draft**, **C: Build**. Do NOT write any files before the end of Phase B.

---

#### Phase A — Identify the brand

Open with a simple free-form prompt:

> "ما العلامة التجارية التي تريد إضافتها؟ وهل لديك أي ملاحظات أو تجارب معها تريد أن أُدرجها (مثل لماذا تختارها للعملاء، أو في أي نوع من المشاريع)؟"

From the user's reply, work out silently:
- The **canonical brand name** — must match exactly what would be (or already is) in `data/products/*.json` `brand` field. Casing matters. E.g. `"EAE Technology"` not `"eae technology"`; `"SONOFF"` not `"Sonoff"`. If you're unsure, ask the user to confirm the exact casing they use for their product JSONs.
- The slug: `brand.toLowerCase().replace(/\s+/g, '-')` — must be ASCII, kebab-case. E.g. `"EAE Technology"` → `eae-technology`. **This slug is hardcoded into the URL convention** used by `product-detail.js` (`product.brand → /brands/<slug>.html`), so it cannot be customized.
- Whether the brand already exists in `data/brands/<slug>.json` — if so, this is an **edit**, not an add. Switch to the edit flow.

Ask follow-up only for genuinely ambiguous things:
- Brand name spelling/casing ("`Tuya` or `Tuya Smart`?")
- Slug collision ("`shelly` already exists — did you mean to edit it?")

Never ask for things you can find out yourself (country of origin, founding year, product portfolio).

---

#### Phase B — Draft generation (still NO files written)

1. **Source the positioning from the official brand site.** Before drafting, fetch the brand's official About / Company page (via `WebFetch`) and synthesise the identity from how the brand describes itself. Don't rely on training knowledge alone for positioning language — manufacturers often refresh their messaging, and drawing from the official source is the user's stated preference. Cite the URL you used when presenting the draft. If the About page 404s, try `/`, `/about`, `/company`, `/about-us`, `/en/about`, or a parent-company page (e.g. `ruijie.com` for Reyee). Acceptable fallbacks: a sister page on the official domain, or general public knowledge (note it as such).

2. **Assemble the brand JSON** structured per the schema below. Specifically:
   - `country_of_origin`, `founded`, `website` → from the official site; if uncertain, ask once.
   - `logo` → set to `null` unless the user has already provided a path. The page renders an elegant text-name card when logo is absent; the user can drop a file in `assets/brands/<slug>.<ext>` later and update `logo`.
   - `tagline` (en/fr/ar) — one short professional sentence capturing the brand's positioning (e.g. "KNX building automation and lighting control, engineered and manufactured in Türkiye.").
   - `description` (en/fr/ar) — 3–5 sentences following the structure in **"Writing Style"** below. **MUST cover the brand as a whole, NOT just the SKUs we currently sell. Use generic product categories only — no model names, series names, or SKU numbers.**
   - **Do NOT include `tech_focus` or `category_focus`** — these are auto-derived from `data/products_index.json` by `build_brands.py` and `brand-detail.js`, sorted by frequency descending. Manual values would be ignored.

3. **Present the draft** to the user in a human-readable form (NOT raw JSON):
   - Proposed `id` slug + match check (does it align with how products reference this brand?)
   - Brand name + country + founded year + website
   - Source URL used (the official page you fetched)
   - Tagline EN / FR / AR
   - First two lines of description EN / FR / AR
   - Logo: present (path) or absent (text fallback) — and the recipe to add one later
   - **Auto-derived preview**: a note about which `tech_focus` and `category_focus` values will appear, computed from products currently in the catalog with `brand === "<name>"`. (Read `data/products_index.json` and filter.)
   Close with: **"هل نعدّل أي شيء قبل إنشاء الملفات؟"**

4. **Iterate on corrections.** Free-form: "اقصر الوصف", "غيّر الـ tagline إلى…", "احذف ذكر hospitality لأننا لا نستهدفه", etc. Apply in place and re-show until approved.

Do not proceed to Phase C before explicit approval.

---

#### Phase C — File creation + build

1. **Write the JSON file** at `data/brands/<brand-slug>.json` using the schema below. Use Python (never PowerShell — see Important Rules).

2. **Build everything:**
   ```bash
   python scripts/build_all.py
   ```
   Or if only brand JSONs changed in this session:
   ```bash
   python scripts/build_products.py   # required first — build_brands reads products_index.json
   python scripts/build_brands.py
   ```

3. **Report back** the three static URLs (EN/FR/AR) plus the brands index URL so the user can open them:
   - `https://smartelectricity.ma/brands/<slug>.html`
   - `https://smartelectricity.ma/fr/brands/<slug>.html`
   - `https://smartelectricity.ma/ar/brands/<slug>.html`
   - `https://smartelectricity.ma/brands.html`

4. **Remind about the logo** (if `logo: null`): "Drop a logo at `assets/brands/<slug>.svg` (or `.png`), update `logo` in the JSON to that path, and re-run `build_all.py` whenever you have one ready."

---

### Editing an Existing Brand

1. Read the brand file from `data/brands/<slug>.json`.
2. Make the requested changes (preserve all three languages, never add `tech_focus`/`category_focus` manually).
3. Rebuild with `python scripts/build_brands.py` (no need for `build_all.py` unless products also changed).
4. If editing the `brand` field (rare), confirm the new value still matches `brand` in all relevant `data/products/*.json` files. Mismatch silently breaks the JOIN and the brand page shows zero products.

### Listing Brands

List files in `data/brands/` to show available brands. Read individual files for details. The compact `data/brands_index.json` is also a good overview (one row per brand with auto-derived counts).

### Deleting a Brand

1. Delete the JSON file from `data/brands/`.
2. Delete the static HTML pages: `brands/<slug>.html`, `fr/brands/<slug>.html`, `ar/brands/<slug>.html`.
3. Optionally delete the logo from `assets/brands/<slug>.<ext>` if present.
4. Rebuild with `python scripts/build_all.py`.

**Caution:** Deleting a brand JSON while products still reference it in their `brand` field leaves the catalog's brand filter listing the brand name with no landing page (product chips will 404 on `/brands/<slug>.html`). Either remove the products too, or leave the brand JSON in place.

---

## Brand JSON Schema

```json
{
  "id": "<brand-slug>",
  "brand": "<Exact Brand Name>",
  "country_of_origin": "<Country>",
  "founded": 2017,
  "website": "https://www.example.com",
  "logo": null,

  "tagline": {
    "en": "Short, professional one-line positioning statement.",
    "fr": "Énoncé de positionnement court et professionnel en une ligne.",
    "ar": "جملة موقع قصيرة واحترافية في سطر واحد."
  },

  "description": {
    "en": "Three to five sentences covering the brand identity + full portfolio + target solutions + distinguishing strength.",
    "fr": "Trois à cinq phrases couvrant l'identité de la marque + portefeuille complet + solutions cibles + force distinctive.",
    "ar": "ثلاث إلى خمس جمل تغطّي هوية العلامة + المحفظة الكاملة + الحلول المستهدَفة + ميزتها الأبرز."
  }
}
```

**Schema rules:**
- `id` **MUST** equal the filename without `.json` AND **MUST** equal `brand.toLowerCase().replace(/\s+/g, '-')`. Same invariant as products/projects.
- `brand` **MUST** match — character for character, casing included — the `brand` field in `data/products/*.json` files. This is the join key. A mismatch silently breaks `tech_focus`/`category_focus` derivation and the products grid on the brand page.
- `logo`: `null` (renders styled text fallback) OR a path starting with `/` (e.g. `/assets/brands/shelly.svg`). Relative paths or external URLs are not supported.
- `founded`: integer (year only). Used for the "Founded {year}" badge in the hero. Omit if genuinely unknown.
- `country_of_origin`: string. Used for the globe icon badge in the hero. Omit if genuinely unknown.
- `website`: full URL. Used for the "Visit Website" button in the hero. Omit if the brand has no usable public site.
- **Do NOT add `tech_focus` or `category_focus`.** Both are auto-derived from products at build time (Python in `build_brands.py`) and at render time (JS in `brand-detail.js`), sorted by frequency descending. Manual values are ignored.
- **Do NOT add `products`.** The build script injects `window.__BRAND__.products` automatically by filtering `products_index.json` by brand name.

---

## Auto-derived Fields (DO NOT touch in JSON)

Two fields shown in the brand page hero/chips are computed from the catalog, NOT from the brand JSON:

| Field | Source | Sort |
|---|---|---|
| `tech_focus` | union of all `technology[]` arrays from products with `brand === <name>` | by frequency desc, ties broken alphabetically |
| `category_focus` | set of `product_type` values from products with `brand === <name>` | by frequency desc, ties broken alphabetically |

The Python implementation is `deriveChips()` in `scripts/build_brands.py`. The JavaScript implementation is `deriveChips()` in `assets/brand-detail.js`. **Both must stay in sync** — if you change the sort logic in one, change it in the other.

**Practical implication:** Adding/removing/editing a product with brand `X` automatically updates brand `X`'s chips on the next build. No brand JSON edit needed.

---

## Logo Handling

- **Hybrid strategy:** brands can ship with `logo: null` and the page renders a clean text-name card. Logos can be added any time after — just drop the file and update the JSON.
- **Where to put logos:** `assets/brands/<slug>.<ext>`. Prefer `.svg` (crisp at any size). `.png` with transparent background is the second choice. Avoid `.jpg`.
- **Recommended size:** SVG = no size constraint. Raster = at least 400×200 px for retina sharpness on the brand-card grid.
- **Source ethics:** download the logo from the manufacturer's own brand-assets / press kit when available (e.g. `shelly.com/brand-assets`, `dahuasecurity.com/brand`). Avoid lifting logos from third-party listings or low-resolution favicons.

---

## Writing Style

### Source of truth: the manufacturer's own positioning

The brand's own About / Company page is the canonical reference. Synthesise tagline and description in your own words from how the brand presents itself — don't copy phrasing verbatim, don't invent claims they don't make, and don't lean on outdated training-data positioning. If the official page doesn't load, try alternate paths (`/about`, `/company`, `/en/about`, parent-company site) before falling back to general knowledge — and note the fallback to the user when presenting the draft.

### `tagline` (one line, ~10–15 words)

Position the brand in one sentence. Lead with what they're known for, in installer-grade, generic language — no model names. Examples:

- ✅ "KNX building automation and lighting control, engineered and manufactured in Türkiye."
- ✅ "Smart, interoperable devices that retrofit any standard electrical installation."
- ✅ "Cloud-managed networking for small and medium businesses, by Ruijie."
- ❌ "The best brand in the world for everything smart." (generic, no positioning)
- ❌ "Shelly is a great company." (zero information)
- ❌ "Smart relays (Plus 1, Pro 4PM) and Wall Display touchscreens." (model names in tagline)

### `description` (3–5 sentences, structured)

Mandatory structure — same four beats in the same order:

1. **Who they are** — country, year founded, market position.
   _"Shelly is a Bulgarian smart-home and IoT manufacturer founded in 2017, focused on compact devices that retrofit existing electrical installations without rewiring."_

2. **Portfolio in generic categories** — cover the brand's full product range across categories, NOT just the SKUs in our catalog. Use generic category nouns only ("touch panels", "DIN-rail actuators", "video intercoms"). **Do NOT name specific models, series, or SKU numbers** — they bloat the description, age fast, and the user's stated preference is generic professional copy.
   _"Its catalogue spans smart switching and dimming, environmental and presence sensors, thermostats, energy metering, smart plugs and lighting, door locks, and professional-grade DIN-rail controllers for electrical panels."_

3. **Target solutions / customer segments** — markets, project types, customer profiles. Be specific about the segment, not the SKU.
   _"The brand serves both residential customers upgrading their homes and commercial integrators handling office and facilities projects."_

4. **Distinguishing strength** — what makes the brand different from competitors. Their philosophy, business model, technical edge. Protocol names (KNX, Matter, Zigbee, ONVIF…) are fine here because they're standards, not products.
   _"Its distinguishing strength is broad interoperability: devices speak Wi-Fi, Bluetooth, Matter, Zigbee, Z-Wave, LAN and KNXnet/IP, so they slot natively into any standards-compliant smart-home or building-management stack."_

### Key rules

- **Generic categories only — no model/series/SKU names.** "Touch panels" ✅, "Touch panels (Miola, TD4, Rosa Metal)" ❌. The user's stated preference is professional generic copy free of product names. The catalog grid below the description already shows the actual SKUs we stock.
- **Comprehensive, not catalog-limited.** Cover EVERY major product line the brand sells, even what we don't stock — described in generic terms. A visitor researching "is this a serious brand?" should get the full picture, building trust in our installation expertise.
- **Synthesise, don't paste.** Read the official site, write the description in your own words. Never copy more than short common phrases.
- **Avoid sales talk.** No "best", "leading", "amazing" without substance. Use specific verifiable facts ("operates in over 200 countries", "founded 1973", "KNX Association training centre since 2012").
- **No prices, no promises.** This is a catalog brand page, not a sales pitch.
- **3–5 sentences means 3–5.** If you can say it in 3 punchy sentences, don't pad to 5.
- **Protocol and standard names are NOT products.** KNX, Matter, Zigbee, Wi-Fi, Bluetooth, ONVIF, RTSP, SIP, DALI, MQTT — keep these in the copy; they describe what the brand supports, not what they sell.
- **Platform / ecosystem names are NOT products.** Home Assistant, Alexa, Google Home, SmartThings, Zigbee2MQTT — fine to mention as integration targets in the differentiator sentence.

### Tagline vs description vs page chips — what goes where

| Where | What | Length |
|---|---|---|
| `tagline` | Brand positioning hook (generic, no models) | 1 sentence, ~10–15 words |
| `description` (intro line) | Identity + market position | 1 sentence |
| `description` (middle) | Full portfolio in generic categories | 1–2 sentences |
| `description` (targets) | Customer segments + markets | 1 sentence |
| `description` (close) | Differentiator (protocols/standards ok) | 1 sentence |
| `tech_focus` chips | Protocols (auto-derived from products) | NOT in JSON |
| `category_focus` chips | Product types (auto-derived from products) | NOT in JSON |
| Hero meta badges | Country / founded year / product count | from JSON fields |

---

## Arabic Translation Rules

Identical to the product and project skill rules. In Arabic (`ar`) text, **never translate** the following — keep them in their original English form:
- **Brand names**: Shelly, EAE Technology, Zennio, Reyee, SONOFF, Dahua, Tuya, Ruijie, Itead, Hikvision, etc.
- **Protocol/standard names**: KNX, Wi-Fi, Bluetooth, Matter, Zigbee, Thread, LAN, MQTT, PoE, ONVIF, RTSP, SIP, DALI, etc.
- **Platform / app names**: Home Assistant, Alexa, Google Home, Zigbee2MQTT, ZHA, SmartThings, Hue Bridge, Reyee Cloud, Smart Life, Tuya Smart, etc.
- **Industry-standard English terms**: mesh, gateway, hub, switch, router, retrofit, firmware, dashboard, stack, controller, latency, actuator, dimmer, etc. — when they're recognised English jargon in installer circles.

Only translate **common nouns and descriptive language** — e.g. "شركة" (company), "مصنّع" (manufacturer), "تأسّست سنة" (founded in), "منزل ذكي" (smart home), "تستهدف" (targets), "ميزتها الأبرز" (their distinguishing strength). When in doubt, keep the English term.

**Model numbers and series should not appear at all** in the description (see Writing Style above), so the historical "don't translate model names" rule is now moot — there are no model names to translate. If you encounter one in an existing brand JSON during an edit, that's an artefact of the older style and should be removed unless the user asks to keep it.

---

## Existing Brands (for consistency)

Current brands in `data/brands/` (7 total). Always check this list before proposing a new one — the user may be referring to an existing brand by an alternate name:

| Slug | Brand (exact `brand` field) | Country | Founded |
|---|---|---|---|
| `eae-technology` | EAE Technology | Turkey | 1973 |
| `shelly` | Shelly | Bulgaria | 2017 |
| `zennio` | Zennio | Spain | 2006 |
| `reyee` | Reyee | China | 2019 |
| `sonoff` | SONOFF | China | 2015 |
| `dahua` | Dahua | China | 2001 |
| `tuya` | Tuya | China | 2014 |

### Self-Updating Brand List

After adding any new brand, you MUST update this section of the skill file (`.claude/commands/brand.md`) by appending the new row to the table above. This keeps the reference always in sync with the actual catalog, so future sessions don't need to scan `data/brands/` to discover existing brands.

---

## Important Rules

- The `id` field MUST match the filename (without `.json`) AND match `brand.toLowerCase().replace(/\s+/g, '-')`.
- The `brand` field MUST match — exactly — the `brand` value used in `data/products/*.json` files. Casing matters.
- All text fields (`tagline`, `description`) MUST have `en`, `fr`, and `ar` versions.
- **NEVER add `tech_focus` or `category_focus` to the JSON.** They are auto-derived; manual values are ignored.
- **NEVER add a `products` array.** The build script injects it automatically into `window.__BRAND__`.
- Logos go in `assets/brands/<slug>.<ext>` (prefer `.svg`). Reference them as absolute paths starting with `/assets/brands/...`. `null` is a valid value — the page renders a text fallback.
- **Always run `python scripts/build_all.py` after any brand JSON change.** Or `build_products.py` then `build_brands.py` in that order (the latter reads `products_index.json` to compute counts and chips).
- Never manually edit `data/brands_index.json`, `sitemap.xml`, or files in `brands/`, `fr/brands/`, `ar/brands/` — they are all auto-generated.
- **Never use PowerShell (`ConvertTo-Json`, `Set-Content`) to edit brand JSON files.** PowerShell 5.1 corrupts UTF-8 encoding of Arabic text, producing irrecoverable mojibake. Always use Python (`json.load` + `json.dump` with `encoding='utf-8'`) for any JSON manipulation. If you need batch changes across multiple brand files, write a small Python script — never use a PowerShell pipeline.
- The "Brands" navbar link is **already wired** into the SPA bundle via `scripts/patch_navbar_brands.py` (one-shot, idempotent). You do NOT need to re-patch the SPA bundle when adding a new brand — the link goes to `/brands.html` and the new brand appears in the grid automatically after `build_all.py`.

---

## Build Pipeline Reference

```bash
# Recommended for any session that touched brand JSONs:
python scripts/build_all.py
# Order: generate_localized → build_projects → build_products → build_brands

# If only brands changed (rare — usually products and brands evolve together):
python scripts/build_products.py    # required first — derives chip frequencies
python scripts/build_brands.py
```

**What `build_brands.py` does** (mirrors `build_products.py`):
- Reads `data/brands/*.json` and `data/products_index.json`.
- Computes `tech_focus` and `category_focus` from products (by frequency).
- Writes `data/brands_index.json` (lean, for the brands grid).
- Generates static HTML in `brands/`, `fr/brands/`, `ar/brands/` with full SEO (title, meta description, hreflang × 4 incl. `x-default`, og:locale, Twitter card, robots index,follow override).
- Injects JSON-LD: `Brand` + `BreadcrumbList` + `ItemList` of brand's products.
- Injects `window.__BRAND__` inline (full data + filtered products) for instant client-side hydration.
- Injects `<h1>` + lead paragraph in `<noscript>` for crawlers without JS.
- Injects ItemList JSON-LD into `brands.html` (EN/FR/AR).
- Writes complete `sitemap.xml` via `_lib.write_sitemap()` (idempotent, order-independent).

**Order matters because:**
- `build_brands.py` reads `data/products_index.json` to derive chips and count products → `build_products.py` must run first.
- `build_brands.py` injects ItemList into `brands.html` produced by `generate_localized.py` → localized roots must exist first.
- `build_all.py` enforces this order automatically.
