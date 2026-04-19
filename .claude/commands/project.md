# Project Portfolio Manager — Smart Electricity

You are managing the "Previous Work" project portfolio for the Smart Electricity website. This is a static JSON-based system with trilingual support (English, French, Arabic), mirroring the product-catalog architecture but optimized for **rich case-study pages with heterogeneous media** (photos, user-produced MP4 videos, and third-party Instagram Reels).

## Architecture

```
data/projects/             → Individual project JSON files (one per case study)
data/projects_index.json   → Aggregated index (auto-generated, never edit manually)
assets/projects/<slug>/    → Project media: photos, mp4 videos, video posters
scripts/build_projects.py  → Unified build: index + static SEO pages + sitemap + ItemList injection
scripts/generate_static_seo.py → Shared SEO helpers (reused by build_projects.py)
scripts/generate_localized.py  → Root-page localization (index.html, previous-work.html, etc.)

projects/                  → Static project HTML pages (EN, auto-generated)
fr/projects/               → Static project HTML pages (FR, auto-generated)
ar/projects/               → Static project HTML pages (AR, auto-generated)
sitemap.xml                → Auto-generated sitemap (all URLs)
```

## Project URLs

Projects use **static HTML pages** (not query params) for SEO:
- English: `https://smartelectricity.ma/projects/<project-slug>.html`
- French: `https://smartelectricity.ma/fr/projects/<project-slug>.html`
- Arabic: `https://smartelectricity.ma/ar/projects/<project-slug>.html`

Each static page has pre-rendered `og:image`, `og:title`, `og:description`, `JSON-LD` (`Article` / `CreativeWork` + `BreadcrumbList` + `mentions` linking to related products), `hreflang` (including `x-default`), `og:locale`, `robots: index,follow`, and `<h1>` in `<noscript>` — so search engines and social media crawlers can read the case study without JavaScript.

## Media Philosophy

Every project mixes different media types, and the mix varies **per project**. The schema must support:

1. **`image`** — JPG/PNG/AVIF/WebP photos the user owns (from the job site). Rendered in a horizontal scrollable strip ("Project Gallery") with side-arrow navigation and drag-to-scroll.

2. **`video`** — MP4 videos **produced by the user** (self-hosted). Aspect ratio varies (16:9 or 9:16). Must include a poster frame for fast LCP and SEO. Rendered inside the gallery strip with click-to-play.

3. **`reel`** — A **9:16 portrait short video** owned by the user. Stored as a local MP4 under `/assets/reels/<project-slug>.mp4` and rendered as a **sticky card next to the project description narrative** (not inside the gallery strip). Autoplays muted in a loop, with a tap-to-unmute button and an optional "View on Instagram" button underneath that opens the same clip on Instagram.

**Layout rule:**
- Photos + 16:9 videos → horizontal scrollable gallery strip below the narrative.
- 9:16 reels → sticky vertical card to the left of the narrative text on desktop, above the text on mobile.

The build script extracts real pixel dimensions via Pillow (for images and video posters) so the mosaic renders with accurate `aspect-ratio` and avoids layout shift (CLS). Reels default to `1080×1920` unless the optional poster declares otherwise.

## Operations

### Adding a New Project

**The interaction is conversational, not a rigid questionnaire.** Claude listens to what the user describes in natural language, extracts every fact already given, and auto-generates everything that can be inferred (title, short/long description in all three languages, categories, matched related products, extra brands/protocols). The user should only have to re-state things the narrative genuinely did not cover.

The flow has four phases — **A: Narrative**, **B: Draft**, **C: Media**, **D: Build**. Do NOT write any files before the end of Phase C.

---

#### Phase A — Narrative capture

Open with a single free-form prompt. Do NOT send a numbered checklist. Use something like:

> "أخبرني عن المشروع بكلماتك الخاصة — ماذا طلب العميل؟ ماذا ركّبت؟ أين ومتى؟ ما المعدات والعلامات التجارية التي استخدمتها؟ وإذا كان المشروع استغرق عدة أيام اذكر ذلك."

From the user's reply, extract silently (do NOT ask again if already given):
- `location` (city + country — infer "Morocco" if a Moroccan city is mentioned without country)
- `date` in ISO `YYYY-MM-DD`. Convert relative dates ("last month", "قبل أسبوعين") to absolute using today's date.
- `duration_days` if mentioned
- equipment / brand / protocol / technology keywords for product matching
- implicit categories (inferred from equipment + context)
- a testimonial hint if the user quotes the client

Ask follow-up questions **only** for truly missing critical info. Typical gaps:
- date not mentioned → "متى تم المشروع تقريباً؟"
- location ambiguous → ask for the city
- core scope unclear → ask one focused clarifying question

Never re-ask for something the user already said. Never ask for things that belong to Phase C (media paths, Instagram link, testimonial) in Phase A.

---

#### Phase B — Draft generation (still NO files written)

1. **Read `data/products_index.json`** and match related products from the narrative (see "Matching Related Products from the Narrative" below).
2. **Assemble a draft** covering everything that can be auto-generated:
   - Proposed `id` slug (see "Drafting Guidance")
   - `title.en` → `title.fr` → `title.ar` (write EN first, then translate)
   - `short_description` (12–15 words max, lead with deliverable) in all three languages
   - `description` (4–8 sentences, case-study narrative) in all three languages
   - `categories` from the approved list — reuse existing values (see "Existing Category Values")
   - `related_products` — array of IDs from the catalog
   - `extra_brands` / `extra_protocols` for anything mentioned that isn't already covered by the matched products
   - `duration_days` if given
   - `testimonial` if the user quoted the client (ask only for the author initials — never the full name)
3. **Present the draft** to the user in a human-readable form (NOT raw JSON). Show:
   - Proposed `id`
   - Title + short description + first two lines of description in EN / FR / AR
   - Categories as chips
   - Matched products as a bullet list with their titles (not just IDs)
   - Extra brands / extra protocols as chip rows
   Close with: **"هل نعدّل أي شيء قبل إنشاء الملفات؟"**
4. **Iterate on corrections.** The user may reply in free-form ("غيّر العنوان إلى…", "احذف Ruijie واضف Hikvision في extra_brands", "اختصر الوصف"). Apply changes in place and re-show the updated draft until the user approves.

Do not proceed to Phase C before explicit approval of the draft.

---

#### Phase C — Media collection

Once the draft is approved, ask for media in **one compact message** (still conversational, not a numbered bureaucracy):

- مسار الصورة الرئيسية (cover) على جهازك
- مسارات صور المعرض (بالترتيب الذي تريد عرضه)
- هل لديك فيديو 9:16 (reel)؟ إذا نعم: المسار + رابط Instagram اختياري
- هل توجد شهادة للعميل ننشرها؟ إذا نعم: الاقتباس + الاسم المختصر (مثل "Mr. X")

Only after receiving paths (and reel/testimonial answers), move to Phase D.

---

#### Phase D — File creation + build

1. **Create folders:**
   ```bash
   mkdir -p assets/projects/<project-slug>
   mkdir -p assets/reels                  # once per repo
   ```

2. **Copy and rename media** into `assets/projects/<project-slug>/` using kebab-case names (`living-room.webp`, `panel-close-up.webp`, …). Copy the reel MP4 to `assets/reels/<project-slug>.mp4`.

3. **Poster frames** — for every `type: "video"` entry, drop a poster frame alongside (same name + `-poster.webp`). Extract with ffmpeg if missing:
   ```bash
   ffmpeg -i walkthrough.mp4 -ss 00:00:01 -vframes 1 walkthrough-poster.webp
   ```

4. **Write the JSON file** at `data/projects/<project-slug>.json` using the schema template below.

5. **Build everything:** `python scripts/build_projects.py` (see build-order warning further down if products/root pages also changed in the same session).

6. **Report back** the three static URLs (EN/FR/AR) so the user can open them.

---

#### Matching Related Products from the Narrative

When you generate the draft in Phase B, do product matching from **`data/products_index.json`** (the product catalog index — one row per product, currently 75 products). Do not open individual files in `data/products/` unless you need to disambiguate.

Match on, in order of priority:
1. **Explicit model numbers or product names** in the narrative (e.g. "RG-EW3200", "KNX actuator 8ch")
2. **Brand name + product type** (e.g. "Reyee mesh" → match Reyee mesh routers)
3. **Technology + installation context** (e.g. "KNX dimmer in a villa" → KNX dimmer actuators)
4. **Categorical inference** (e.g. "surveillance cameras" → all camera products of the brand mentioned, or the most-commonly-used brand if unspecified)

Rules:
- **Never invent product IDs.** Every `related_products` ID must exist in `products_index.json`. Verify before adding.
- **Prefer the specific over the generic.** If the narrative mentions a specific model and you have it, use it. Don't add ten vaguely-related SKUs to pad the list.
- **If ambiguous**, include your best candidate and mention the alternatives to the user during draft review ("I matched X — also considered Y and Z, let me know if you'd prefer those").
- **Equipment not in the catalog** (e.g. Hikvision cameras when we don't stock them) goes into `extra_brands` / `extra_protocols`, never fake-added to `related_products`.

---

#### Drafting Guidance

- **Write EN first, then translate** to FR and AR. Never translate FR→AR or AR→EN — quality degrades.
- Follow the **"Writing Style"** section below for length and tone (lead with deliverable, case-study narrative, never name the client).
- Follow the **"Arabic Translation Rules"** section below when translating — keep brand names, model numbers, protocols, and industry-standard English tech terms in English inside the Arabic text.
- **Do NOT mention specific product models, brand names, or protocols in `description` or `short_description`.** They are rendered separately by the page's **Brands & Protocols** card (fed by `related_products` + `extra_brands` + `extra_protocols`), so repeating names like "RG-EG105GW-X", "Dahua NVR", "Shelly Pro 4PM", "RTSP", "PoE", "Home Assistant" inside the narrative is redundant visual noise. Describe **what was delivered** in system-level terms instead — e.g. "a managed network backbone with ceiling-mounted Wi-Fi access points covering the whole venue", "PoE surveillance with centralized recording", "smart automation for lighting scenes, motorized shutters, and zoned power control". The reader sees the exact models in the chip rows.
- **Propose the `id` slug** as `<primary-category-keyword>-<location-city>`, kebab-case, ASCII only. Examples: `surveillance-tangier`, `knx-villa-tetouan`, `mesh-wifi-casablanca-apt`. Before using the slug, check `data/projects/` for collisions — if a file with that slug exists, append a discriminator (`-v2`, `-2026`, or a more specific keyword).
- **Don't pad the description.** 4–8 sentences means 4–8. If the narrative only supports 4, write 4. Do not invent client reactions or numbers not provided by the user.
- **Categories**: pick from the approved list (see "Existing Category Values"). If the narrative genuinely doesn't fit any existing category, propose a new one to the user during draft review (do NOT silently introduce it).

---

#### Target Schema (reference — assembled during Phase B, written in Phase D)

```json
{
  "id": "<project-slug>",
  "date": "2026-04-10",
  "location": "Tetouan, Morocco",
  "categories": ["Smart Home Automation", "Security & Surveillance"],

  "title": {
    "en": "English Project Title",
    "fr": "Titre du projet en français",
    "ar": "عنوان المشروع بالعربية"
  },

  "short_description": {
    "en": "One-line summary (max 12–15 words, shown on the previous-work listing card).",
    "fr": "Résumé en une ligne (max 12–15 mots).",
    "ar": "ملخص في سطر واحد (12-15 كلمة كحد أقصى)."
  },

  "description": {
    "en": "Full case-study narrative: what the client wanted, what was installed, how it turned out. 4–8 sentences.",
    "fr": "Récit complet de l'étude de cas: ce que le client voulait, ce qui a été installé, comment cela s'est passé. 4-8 phrases.",
    "ar": "سرد تفصيلي للمشروع: ماذا أراد العميل، ما الذي تم تركيبه، وكيف كانت النتيجة. 4-8 جمل."
  },

  "cover": "/assets/projects/<project-slug>/cover.jpg",

  "media": [
    {
      "type": "image",
      "src": "/assets/projects/<project-slug>/living-room.jpg",
      "alt": {
        "en": "KNX-powered living room after installation",
        "fr": "Salon équipé en KNX après installation",
        "ar": "غرفة المعيشة بعد تركيب نظام KNX"
      }
    },
    {
      "type": "video",
      "src": "/assets/projects/<project-slug>/walkthrough.mp4",
      "poster": "/assets/projects/<project-slug>/walkthrough-poster.jpg",
      "alt": {
        "en": "Smart home walkthrough",
        "fr": "Visite guidée de la maison intelligente",
        "ar": "جولة داخل المنزل الذكي"
      }
    },
    {
      "type": "reel",
      "src": "/assets/reels/<project-slug>.mp4",
      "poster": "/assets/reels/<project-slug>-poster.webp",
      "instagram_url": "https://www.instagram.com/reels/XXXXXXX/",
      "alt": {
        "en": "Short 9:16 video showing the entrance automation in action",
        "fr": "Courte vidéo 9:16 montrant l'automatisation de l'entrée en action",
        "ar": "فيديو قصير 9:16 يعرض أتمتة المدخل قيد التشغيل"
      }
    }
  ],

  "related_products": ["eae-knx-actuator-8ch", "reyee-rg-ew3200gx-pro"],

  "extra_brands": ["Hikvision", "Dahua"],
  "extra_protocols": ["RTSP", "ONVIF", "PoE"],

  "testimonial": {
    "author": "Mr. X",
    "quote": {
      "en": "The team delivered on time and the system works flawlessly.",
      "fr": "L'équipe a livré à temps et le système fonctionne parfaitement.",
      "ar": "الفريق سلّم في الوقت المحدد والنظام يعمل بشكل مثالي."
    }
  },

  "duration_days": 5
}
```

**Schema notes**:
- `id` MUST match the filename (without `.json`).
- `date` uses ISO format `YYYY-MM-DD`. Used for `datePublished` in JSON-LD and sitemap `lastmod`.
- `cover` is the image used on the listing card and as `og:image`. It MUST be listed as `type: image` in `media` too if you also want it in the gallery (the build script does NOT auto-duplicate).
- `media[].alt` is **required** for images and videos (accessibility + SEO). For `reel`, `alt` is used for the placeholder's aria-label only.
- `media[].type` is one of `"image"`, `"video"`, `"reel"`. The build script extracts dimensions:
  - `image` → Pillow reads pixel size, writes `width`/`height` into the index.
  - `video` → Pillow reads the `poster` pixel size (video dimensions cannot be read without ffprobe; the poster drives the layout slot in the gallery strip).
  - `reel` → `src` points to a local MP4 (e.g. `/assets/reels/<slug>.mp4`). Defaults to `1080×1920`; if a `poster` is present, Pillow reads its actual dimensions.
- **Reel entries are NOT rendered in the gallery strip**. They appear as a sticky card beside the project description. The gallery strip only contains `image` and `video` items, in the order they appear in the `media` array.
- `reel.instagram_url` is optional — when present, a small "View on Instagram" button appears below the sticky video card. When absent, only the autoplay-muted MP4 is shown.
- At most **one reel per project** is meaningful. If you list multiple, only the first is rendered as the sticky card; the rest are ignored.
- `related_products` is an array of `id`s from `data/products/`. The build script validates they exist and emits a `mentions` JSON-LD array linking to the product pages. It also feeds the **Brands & Protocols** card on the project page (the renderer reads each product's `brand` + `technology[]` from `products_index.json` and deduplicates them into two chip rows).
- `extra_brands` (optional, string array) — manually-added brand names for equipment used on-site that we **don't sell or carry in the catalog** (e.g. `"Hikvision"`, `"Dahua"`). Merged with and deduped against brands derived from `related_products`. Leave out entirely if not needed — the section still renders from `related_products` alone. Names are never translated across languages (same rule as product brand names).
- `extra_protocols` (optional, string array) — manually-added protocols/technologies not already covered by the `related_products` (e.g. `"RTSP"`, `"ONVIF"`, `"PoE"`). Same merge-and-dedupe behavior as `extra_brands`. Never translated.
- `testimonial` is optional. When present, rendered as a `<blockquote>` styled component and included in JSON-LD as a `review.reviewBody` on the CreativeWork.
- `duration_days` is optional, used only in the page's "Project Facts" badge strip.

#### What the Build Does

```bash
python scripts/build_projects.py
```

This single command:
- Runs Pillow on every image + video poster to populate `width`/`height` in the index.
- Builds `data/projects_index.json` (sorted by `date` descending).
- Generates static HTML pages in `projects/`, `fr/projects/`, `ar/projects/` with:
  - `<title>` + `<meta description>` translated per language.
  - hreflang tags for all 3 languages + x-default (pointing to EN).
  - Open Graph + Twitter Card with `cover` as `og:image`.
  - og:locale + og:locale:alternate for each language.
  - JSON-LD `CreativeWork` (or `Article` when a written narrative dominates) + BreadcrumbList + `mentions[]` for related products.
  - `<meta name="robots" content="index, follow">` override.
  - `<h1>` + `<p>` inside `<noscript>` so crawlers that don't execute JS still get the core content.
  - Inline `<script>window.__PROJECT__ = {...}</script>` with the enriched project data (so `project-detail.js` renders instantly without a second fetch).
- Injects ItemList JSON-LD into `previous-work.html` (EN/FR/AR) for portfolio rich results.
- Appends all project URLs + lastmod + hreflang alternates to `sitemap.xml`.

**⚠️ Build order matters:** `sitemap.xml` is rewritten by both `build_products.py` and `build_projects.py`. If you modified root pages AND projects AND products in the same session, run in this order so the final sitemap is complete:
```bash
python scripts/generate_localized.py    # root pages + partial sitemap
python scripts/build_projects.py         # projects appended to sitemap
python scripts/build_products.py         # MUST run LAST (products + final sitemap merge)
```
`build_products.py` is the authoritative final writer — it reads `projects_index.json` and merges project URLs into its sitemap output so nothing is lost.

### Editing an Existing Project

1. Read the project file from `data/projects/`.
2. Make the requested changes (preserve all three languages, keep `media` order intentional — it's the visual order in the mosaic).
3. Rebuild with `python scripts/build_projects.py`.

### Listing Projects

List files in `data/projects/` to show available projects. Read individual files for details.

### Deleting a Project

1. Delete the JSON file from `data/projects/`.
2. Delete the static HTML pages: `projects/<slug>.html`, `fr/projects/<slug>.html`, `ar/projects/<slug>.html`.
3. Rebuild with `python scripts/build_projects.py`.
4. Optionally delete the project's media folder at `assets/projects/<slug>/`.

## Existing Category Values (for consistency)

These are the values currently in use across projects. Always prefer reusing existing values:

**Categories**: `Smart Home Automation`, `Security & Surveillance`, `Network & Wi-Fi`, `Electrical Installation`, `Lighting Design`, `Access Control`

### Self-Updating Category Values

After adding any project that introduces a **new** `category` value not listed above, you MUST update this section of the skill file (`.claude/commands/project.md`) by appending the new value to the list above. This keeps the reference always in sync with the actual portfolio.

## Writing Style

- **`short_description`**: One line, max 12–15 words. Lead with what was **delivered** (not how). Example: "Complete KNX home automation with lighting, shutters, and HVAC control." NOT "We installed a very modern and advanced system for our client's new home."
- **`description`**: 4–8 sentences. Structure: (1) the context (villa, office, retrofit?), (2) the client brief, (3) what was installed (technology + scope), (4) a tangible outcome (energy saved, comfort, security improvement). Write it as a case study a potential client would skim — avoid buzzwords, keep numbers concrete.
- **Never name the client** unless they've given written consent. Use "the client", "a villa in Tetouan", "a retail space in Tangier", etc.

## Arabic Translation Rules

In Arabic (`ar`) text, **never translate** the following — keep them in their original English form:
- **Product/platform names**: Home Assistant, Alexa, Google Home, Zigbee2MQTT, ZHA, Ruijie Cloud, Reyee Mesh, etc.
- **Technical terms that are industry-standard in English**: mesh, webhook, firmware, Layer 2, uplink, SFP, etc.
- **Protocol/standard names**: MQTT, PoE, VPN, VLAN, Wi-Fi, Bluetooth, KNX, Zigbee, LAN, GHz, etc.
- **Model numbers and brand names**: always keep as-is.

Only translate **common nouns and descriptive language** — for example "منزل ذكي" (smart home), "كاميرات المراقبة" (surveillance cameras), "لوحة التحكم" (control panel). When in doubt, keep the English term.

## Reels — Rendering & Behavior

Reels are 9:16 portrait clips that we host ourselves (the client owns the footage). They are NOT Instagram iframe embeds.

**What the page does:**
- The MP4 at `src` is played inline next to the description narrative, autoplaying muted in a loop (iOS/Android friendly — `playsinline` + `muted` are required for mobile autoplay).
- On desktop ≥ 900px, the reel card is **sticky** (`position: sticky; top: 6rem`) so it remains visible while the reader scrolls the description text.
- A small unmute button in the top-right corner of the video toggles audio. Clicking the video body also toggles audio.
- An `IntersectionObserver` pauses the video when it leaves the viewport and resumes when it comes back — saves battery and bandwidth.

**Instagram button:**
- When `instagram_url` is set, a prominent button with the Instagram gradient (purple → red → yellow) sits directly under the video.
- The button opens the Instagram reel in a new tab (`target="_blank"`).
- If `instagram_url` is omitted, the button is not rendered at all.

**Copyright reminder:** Only add a reel if the client has consented to the video appearing on the site. Do not host third-party Instagram rips — if the reel belongs to someone else, skip the `src` entirely and do not create a reel entry.

## Important Rules

- The `id` field MUST match the filename (without `.json`).
- All text fields (`title`, `short_description`, `description`, `media[].alt`, `testimonial.quote`) MUST have `en`, `fr`, and `ar` versions.
- `cover` MUST exist on disk before running the build — Pillow will error otherwise.
- Every `video` media entry MUST include a `poster` that exists on disk.
- MP4 videos MUST be web-optimized: H.264 baseline, AAC audio, `faststart` flag so browsers can start playing without downloading the full file. Re-encode if needed:
  ```bash
  ffmpeg -i input.mp4 -c:v libx264 -profile:v baseline -c:a aac -movflags +faststart output.mp4
  ```
- Never commit client personal data (names, addresses, door codes, network passwords) in JSON, `alt` text, or descriptions. Review every text field before building.
- **Always run `python scripts/build_projects.py` after any changes** — this is the single command that updates index, SEO pages, and sitemap.
- Never manually edit `data/projects_index.json`, `sitemap.xml`, or files in `projects/`, `fr/projects/`, `ar/projects/` — they are all auto-generated.
