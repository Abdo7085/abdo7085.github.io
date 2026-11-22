# Article Writer — Smart Electricity

You are writing articles for the Smart Electricity website: plain explanations, comparisons and
problem/solution pieces about smart-home systems (KNX, Wi-Fi, LAN, Zigbee, Matter, Thread,
Bluetooth). Each article is one trilingual JSON file (EN/FR/AR); the build turns it into three
static pages, lists it on the articles page and shows it on the pages of the protocols it covers.
The goal is useful answers for visitors (and search engines), never sales copy.

## Architecture

```
data/articles/<id>.json        → one file per article (the only file you write)
data/protocols/<id>.json       → the protocols an article can be about (knx, wifi, lan, zigbee, matter, thread, bluetooth)
scripts/validate.py            → checks every article (runs first in every build and stops it on any error)
scripts/build_articles.py      → head of each article page (title, description, hreflang, Article JSON-LD) + ItemList in articles.html
scripts/build_article_pages.py → body: the articles list with its filters, each article page, the block on protocol pages
assets/se-articles.js          → the filters on articles.html (?protocol=<id>&type=<type> in the address)
articles.html                  → root template of the list (fr/ar copies come from generate_localized.py)
articles/<id>.html             → the generated pages (and fr/, ar/) — never edit by hand
```

Where an article shows up, automatically:
- `/articles.html` — every article, newest first, filtered by protocol and type.
- `/protocols/<id>.html` — "Articles about <name>": the three newest articles on that protocol and a
  link to `/articles.html?protocol=<id>`.
- The sitemap (`sitemap.xml`), with the date moving only when the article file changes.

## The file

```json
{
  "id": "wifi-local-vs-cloud",
  "date": "2026-11-21",
  "type": "problems",
  "protocols": ["wifi"],
  "related_products": ["shelly-1-gen3", "shelly-pro-4pm"],
  "icon": "cloud",
  "figures": {
    "paths": {
      "graph": {"view": [1060, 400], "nodes": [ … ], "links": [ … ]},
      "labels": {"en": {"<node id>": "…", "caption": "…"}, "fr": { … }, "ar": { … }}
    }
  },
  "title":     {"en": "…", "fr": "…", "ar": "…"},
  "seo_title": {"en": "…", "fr": "…", "ar": "…"},
  "summary":   {"en": "…", "fr": "…", "ar": "…"},
  "body": {
    "en": [
      {"h2": "A section title"},
      {"p": "A paragraph."},
      {"ul": ["A point.", "Another point."]},
      {"figure": "paths"},
      {"tip": "One practical take-away, shown in a yellow box."}
    ],
    "fr": [ …the same blocks, in the same order… ],
    "ar": [ …the same blocks, in the same order… ]
  }
}
```

- `id` = the file name, lowercase, words joined by hyphens, starting with the main topic
  (`knx-new-build-guide`, `wifi-big-house-coverage`).
- `date` — `YYYY-MM-DD`, the publication day (today's date for a new article).
- `type` — one of `guide` (how to plan or do something), `comparison` (A or B), `problems`
  (a problem, its causes, the fixes), `explainer` (how something works).
- `protocols` — the ids of the protocol files the article is about (at least one). They drive the
  filter and the block on each protocol page, so list only the protocols the article really covers.
- `related_products` — optional; ids from `data/products_index.json`. They appear as product cards
  under the article. Pick the products the text talks about (3–6), never invent an id.
- `seo_title` — optional; a shorter title for search results when `title` is long. The site name is
  added after it (keep it under ~45 characters).
- `summary` — two sentences at most: it is the meta description, the card text and the lead.
- `icon` — the icon drawn large on the article's card (black glass header). One of the diagram
  icons in `scripts/_diagram.py` (`GRAPH_ICONS`): router, switch, ap, phone, cloud, relay, dimmer,
  shutter, bulb, cameras, door, monitor, hub, sensor, apps, buttons, thermostat, panel, actuators,
  gateway, ip, bluetooth. Validation lists them if you pick a wrong one.
- `scene` — the picture on the article's card: a small **wordless** drawing (shapes and icons only,
  so it works in every language) that tells the article's idea before anyone reads the title — e.g.
  a house where phone → router → lamp work (✓) and the link to the cloud is cut (✗). Items, drawn in
  order on a 320 × 132 canvas: `{"house": [x, y, w, h], "floors": 2, "dashed": true}`,
  `{"icon": name, "at": [x, y], "size": 24, "dim": true}`, `{"line": [x1, y1, x2, y2, …], "style":
  "wire|radio|net"}`, `{"mark": "ok|x", "at": [x, y]}`, `{"waves": [x, y], "r": [9, 15]}` (see
  `scene()` in `scripts/_diagram.py`). Every article needs one; look at it on `/articles.html`
  and ask: would someone guess the topic from the picture alone? Without a scene the card shows
  the `icon` alone, which says much less.
- `figures` — the article's diagrams, drawn like the protocol diagrams (black glass, yellow lines).
  `graph` is language-free: `view` [width, height] (use 1060 wide), `nodes` placed by their centre
  (`{"id", "icon", "x", "y", "w"}` boxes of 82 px high; `"kind": "pill"`, `"bus"` with `x1`/`x2`/`lx`,
  or `"text"` for a yellow caption line; `"accent": true` gives a brass outline), `links`
  `[from, to, style]` with style `wire` (yellow line), `radio` (dotted), `mesh`, `load`, `net`
  (grey dashes). `labels` names every node in each language; `"
"` breaks a box label over two
  lines; an optional `caption` is shown under the diagram. Every article should have one diagram
  that explains its main idea. After building, check that every label sits inside its box in the
  three languages (French is the longest; Arabic two-line labels are the tallest).
- Photos: put the file in `assets/articles/` (WebP, about 1600 px wide) and add the block
  `{"image": {"src": "/assets/articles/<file>.webp", "alt": "…", "caption": "…"}}` — `alt` and
  `caption` in that block's language. Use only photos the user provides (their own work or
  products), never stock images of other companies' projects.
- `body` — per language, a list of blocks: `h2`, `p`, `ul` (a list of strings), `tip`, `figure`
  (a name from `figures`), `image`. **Every
  language must have the same blocks in the same order, and each `ul` the same number of points** —
  the build refuses the file otherwise. Plain text only (no HTML, no Markdown).

## Writing rules

- **Write EN first, then FR, then AR** (each translated from the English, never FR→AR).
- 500–900 words in English; short paragraphs (2–4 sentences); 4–7 `h2` sections; one `tip` at most,
  usually last.
- Explain, compare, solve. No sales pitch, no prices, no promises, no invented figures, client
  stories or statistics. Facts about a standard must be true (check them if unsure).
- Talk about systems and product *types* in the text (relay modules, access points, IP interface);
  model names belong in `related_products`, not in the body.
- Never name the home server software (say "a home server" / "advanced server"), never name
  Aidoo (say "climate gateway"). Do not present a brand we do not sell as ours.
- A sentence about "our catalogue" must be true of the products in it.
- **Arabic**: translate technical terms (IP → بروتوكول الإنترنت, actuator → وحدة التشغيل,
  router → الراوتر, access point → نقطة وصول, switch → محوّل الشبكة); keep the names of
  standards and protocols in Latin letters (KNX, Wi-Fi, Zigbee, Matter, Thread, PoE, ETS).
- **French**: natural French for Morocco ("box" for the provider's router, "tableau" for the panel).

## Steps

1. Ask the user for the topic if it is not given. Propose: title, type, protocols, the outline (the
   `h2` titles), the diagram (what it shows), the card scene (what it shows) and the related products (with their
   names), in Arabic, and wait for approval. Ask whether they have photos for it.
2. Write the file `data/articles/<id>.json` (EN, then FR, then AR).
3. Build: `python scripts/build_all.py` — validation runs first and names the file and block if
   anything is wrong. Then `python scripts/check_seo.py`.
4. Check the pages at `http://localhost:8000/articles/<id>.html` (and `/fr/`, `/ar/`): the
   reading flow, the product cards, and that the article appears on `/articles.html` and on each
   of its protocol pages.
5. Report the three local links. Do not commit or publish unless the user asks.
