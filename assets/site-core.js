/**
 * site-core.js — shared runtime helpers, exposed as window.SE.
 *
 * Loaded (defer) before the page scripts that need it: products.js,
 * product-detail.js, brand-detail.js, project-detail.js, homepage-products.js.
 *
 *  - SE.taxonomy   catalog classification read from /data/taxonomy.json:
 *                  categories -> product types, installation methods and
 *                  project categories, with their en/fr/ar labels. This is
 *                  the only place the browser gets those labels from.
 *  - SE.protoMarkup  the one protocol icon dictionary (Wi-Fi, KNX, Zigbee …).
 *  - SE.img        <img> markup for product images made by build_images.py
 *                  (srcset/sizes/width/height), plus .set / .largest / .sizes.
 *
 * To add a product type / category / installation: edit data/taxonomy.json.
 * To add a protocol: add it to data/taxonomy.json AND an icon branch in
 * protoMarkup() below (without one the name is shown as plain text).
 */
(function () {
  'use strict';
  if (window.SE) return;

  var TAXONOMY_URL = '/data/taxonomy.json';

  function lang() {
    return document.documentElement.lang || 'en';
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------------- Taxonomy ----------------

  var labels = { category: {}, type: {}, installation: {}, project_category: {} };
  var order = { category: [], type: [], installation: [], technology: [], project_category: [] };
  var typeCategory = {};
  var aliases = {};
  var loadPromise = null;

  function ingest(raw) {
    (raw.categories || []).forEach(function (cat) {
      order.category.push(cat.id);
      labels.category[cat.id] = cat.label || {};
      (cat.types || []).forEach(function (ty) {
        order.type.push(ty.id);
        labels.type[ty.id] = ty.label || {};
        typeCategory[ty.id] = cat.id;
      });
    });
    (raw.technologies || []).forEach(function (x) { order.technology.push(x.id); });
    (raw.installations || []).forEach(function (x) {
      order.installation.push(x.id);
      labels.installation[x.id] = x.label || {};
    });
    (raw.project_categories || []).forEach(function (x) {
      order.project_category.push(x.id);
      labels.project_category[x.id] = x.label || {};
    });
    aliases = raw.aliases || {};
  }

  // Fetches the taxonomy once. Never rejects: if the file cannot be loaded,
  // label() simply falls back to the raw (English) value.
  function load() {
    if (!loadPromise) {
      loadPromise = fetch(TAXONOMY_URL)
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(ingest)
        .catch(function (err) {
          console.error('Failed to load taxonomy:', err);
        });
    }
    return loadPromise;
  }

  // kind: 'category' | 'type' | 'installation' | 'project_category'.
  // Anything else (brand, technology) is a proper name and is returned as is.
  function label(kind, id) {
    var entry = labels[kind] && labels[kind][id];
    if (!entry) return id == null ? '' : String(id);
    return entry[lang()] || entry.en || String(id);
  }

  function categoryOf(typeId) {
    return typeCategory[typeId] || '';
  }

  // Sort values of one kind into taxonomy (display) order; values the
  // taxonomy does not know go last, alphabetically.
  function sorted(kind, values) {
    var ref = order[kind] || [];
    return values.slice().sort(function (a, b) {
      var ia = ref.indexOf(a), ib = ref.indexOf(b);
      if (ia === -1 && ib === -1) return String(a).localeCompare(String(b));
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  // Old filter links keep working after a value is renamed or split:
  // expandAlias('product_type', 'Network') -> ['Router', 'Network Switch', 'Access Point'].
  function expandAlias(kind, value) {
    var table = aliases[kind] || {};
    return table[value] ? table[value].slice() : [value];
  }

  // ---------------- Protocol icons ----------------

  var ICON_STROKE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';

  // One "<span class="prod-proto">icon name</span>" per technology string.
  // Official marks for Zigbee / Matter / Thread, Lucide icons for the rest.
  function protoMarkup(tech) {
    var tl = String(tech).toLowerCase();
    var icon = '';
    if (tl.includes('wi-fi') || tl.includes('wifi')) {
      icon = ICON_STROKE + '<path d="M5 12.55a11 11 0 0114 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>';
    } else if (tl.includes('bluetooth') || tl.includes('ble')) {
      icon = ICON_STROKE + '<polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/></svg>';
    } else if (tl.includes('knx')) {
      return '<span class="prod-proto prod-proto-knx">KNX</span>';
    } else if (tl.includes('zigbee')) {
      icon = '<svg viewBox="0 0 48 48" fill="currentColor"><path d="M32.042,9.792c4.595,1.238,4.88,3.165,5.524,5.048C34.841,17.664,17.35,35.7,17.35,35.7s10.901,1.177,23.487-1.003c-0.001,0.029-0.002,0.048-0.003,0.076C42.829,31.661,44,27.97,44,24c0-11.046-8.954-20-20-20c-5.634,0-10.715,2.338-14.35,6.087C15.489,9.124,26.89,8.403,32.042,9.792z"/><path d="M14.724,37.285c-1.982-0.347-4.212-2.131-4.707-5.302c1.437-1.239,19.994-20.507,19.994-20.507c-7.008-0.424-14.569-0.465-22.237,0.864C5.408,15.625,4,19.644,4,24c0,11.046,8.954,20,20,20c6.173,0,11.689-2.8,15.358-7.195C35.486,37.33,23.257,38.769,14.724,37.285z"/></svg>';
    } else if (tl.includes('matter')) {
      icon = '<svg viewBox="0 0 512 512" fill="currentColor"><path d="M152 134.4c21.5 17.5 47.1 29.2 74.4 34.2V22.9l29.7-17.1 29.6 17.1v145.6c27.3-4.9 52.9-16.7 74.5-34.2l53.8 31.1c-87.6 86.6-228.5 86.6-316.1 0zm65.5 371.8C248.7 387 178.1 264.9 59.3 232.5v62.3c25.9 9.9 48.9 26.2 66.8 47.4L0 414.9v34.2l29.7 17 126.1-72.8c9.4 26.1 12 54.2 7.6 81.5zm235.3-273.7C334 265 263.6 387.1 294.8 506.2l54-31.2c-4.4-27.4-1.7-55.4 7.6-81.5l126 72.7 29.6-17.1v-34.2l-126.1-72.8c17.9-21.2 40.9-37.5 66.8-47.4z"/></svg>';
    } else if (tl.includes('thread')) {
      icon = '<svg viewBox="0 0 165 165" fill="currentColor"><path d="M82.498,0C37.008,0,0,37.008,0,82.496c0,45.181,36.51,81.977,81.573,82.476V82.569l-27.002-0.002c-8.023,0-14.554,6.53-14.554,14.561c0,8.023,6.531,14.551,14.554,14.551v17.98c-17.939,0-32.534-14.595-32.534-32.531c0-17.944,14.595-32.543,32.534-32.543l27.002,0.004v-9.096c0-14.932,12.146-27.08,27.075-27.08c14.932,0,27.082,12.148,27.082,27.08c0,14.931-12.15,27.08-27.082,27.08l-9.097-0.001v80.641C136.889,155.333,165,122.14,165,82.496C165,37.008,127.99,0,82.498,0z"/><path d="M117.748,55.493c0-5.016-4.082-9.098-9.1-9.098c-5.015,0-9.097,4.082-9.097,9.098v9.097l9.097,0.001C113.666,64.591,117.748,60.51,117.748,55.493z"/></svg>';
    } else if (tl.includes('lan') || tl.includes('ethernet')) {
      icon = ICON_STROKE + '<path d="m15 20 3-3h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2l3 3z"/><path d="M6 8v1"/><path d="M10 8v1"/><path d="M14 8v1"/><path d="M18 8v1"/></svg>';
    } else if (tl.includes('z-wave') || tl.includes('zwave')) {
      icon = ICON_STROKE + '<path d="M16.247 7.761a6 6 0 0 1 0 8.478"/><path d="M19.075 4.933a10 10 0 0 1 0 14.134"/><path d="M4.925 19.067a10 10 0 0 1 0-14.134"/><path d="M7.753 16.239a6 6 0 0 1 0-8.478"/><circle cx="12" cy="12" r="2"/></svg>';
    } else {
      return '<span class="prod-proto">' + escapeHtml(tech) + '</span>';
    }
    return '<span class="prod-proto">' + icon + escapeHtml(tech) + '</span>';
  }

  // ---------------- Product images ----------------
  //
  // scripts/build_images.py turns every original in media/products/ into
  // WebP variants and describes each image as
  //   { src, srcset: "url 400w, url 800w, …", width, height }
  // (width/height = largest variant): data/products_index.json "image" for
  // the primary, data/product_images.json for galleries. img() turns one
  // into an <img> tag; a plain URL string (logo fallback) works too.
  //
  // `sizes` tells the browser which variant to download. The boxes below are
  // upper bounds, in CSS px, of the space each layout gives the image
  // (object-fit: contain) per breakpoint; the image's own aspect ratio then
  // narrows it, so a tall product in a wide card does not fetch a wide file.
  // Layout itself comes from the CSS + width/height, not from these numbers.
  var FALLBACK_IMG = '/assets/S‑ELECTRICITY-LOGO.svg';
  var IMG_BOXES = {
    // .prod-card-img — 75% of a card ≤400px wide x 75% of the 220px image
    // area; phones: 70% of a card ≤310px x 70% of 150px (products.css)
    card: [['(max-width: 640px)', 220, 105], [null, 300, 165]],
    // .hp-product-card-img img — 80% of the card x 80% of 200px / 150px
    // (homepage-products.css)
    home: [['(max-width: 640px)', 280, 120], [null, 400, 160]],
    // .pd-gallery on the product page, secondary images included (they fill it)
    main: [['(max-width: 900px)', 900, 680], [null, 600, 450]],
    thumb: [[null, 72, 72]],
    cart: [[null, 64, 64]]
  };

  function isDescriptor(desc) {
    return !!(desc && typeof desc === 'object' && desc.srcset && desc.width && desc.height);
  }

  function imgSizes(desc, box) {
    var ratio = desc.width / desc.height;
    return (IMG_BOXES[box] || IMG_BOXES.card).map(function (b) {
      var w = Math.ceil(Math.min(b[1], b[2] * ratio, desc.width));
      return (b[0] ? b[0] + ' ' : '') + w + 'px';
    }).join(', ');
  }

  // opts: { box: key of IMG_BOXES, alt, cls, id,
  //         priority: true for the one image that matters first on the page
  //         (loads eagerly with high priority; everything else is lazy) }
  function img(desc, opts) {
    opts = opts || {};
    var attrs;
    if (isDescriptor(desc)) {
      attrs = [
        'src="' + escapeHtml(desc.src) + '"',
        'srcset="' + escapeHtml(desc.srcset) + '"',
        'sizes="' + imgSizes(desc, opts.box) + '"',
        'width="' + desc.width + '"',
        'height="' + desc.height + '"'
      ];
    } else {
      attrs = ['src="' + escapeHtml(typeof desc === 'string' && desc ? desc : FALLBACK_IMG) + '"'];
    }
    attrs.push('alt="' + escapeHtml(opts.alt || '') + '"');
    if (opts.cls) attrs.push('class="' + escapeHtml(opts.cls) + '"');
    if (opts.id) attrs.push('id="' + escapeHtml(opts.id) + '"');
    attrs.push(opts.priority ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"');
    attrs.push('decoding="async"');
    return '<img ' + attrs.join(' ') + ' />';
  }

  // Point an existing <img> at another image (gallery thumbnail clicks).
  function setImg(el, desc, box) {
    if (isDescriptor(desc)) {
      el.setAttribute('sizes', imgSizes(desc, box));
      el.setAttribute('srcset', desc.srcset);
      el.setAttribute('width', desc.width);
      el.setAttribute('height', desc.height);
      el.setAttribute('src', desc.src);
    } else {
      ['srcset', 'sizes', 'width', 'height'].forEach(function (a) { el.removeAttribute(a); });
      el.setAttribute('src', typeof desc === 'string' && desc ? desc : FALLBACK_IMG);
    }
  }

  // Widest variant URL (structured data wants the biggest image).
  function imgLargest(desc) {
    if (!isDescriptor(desc)) return typeof desc === 'string' ? desc : '';
    return desc.srcset.split(', ').pop().split(' ')[0];
  }

  img.set = setImg;
  img.largest = imgLargest;
  img.sizes = imgSizes;

  window.SE = {
    lang: lang,
    escapeHtml: escapeHtml,
    protoMarkup: protoMarkup,
    img: img,
    taxonomy: {
      load: load,
      label: label,
      categoryOf: categoryOf,
      sorted: sorted,
      expandAlias: expandAlias
    }
  };
})();
