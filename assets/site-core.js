/**
 * site-core.js — shared runtime helpers, exposed as window.SE.
 *
 * Loaded (defer) right after i18n.js and before every other site script:
 * the page apps (products.js, product-detail.js, brand-detail.js,
 * brands-list.js, project-detail.js), homepage-products.js, cart.js and
 * find-solution.js. Anything two of them need lives here, once.
 *
 *  - SE.lang / prefix / t / locale / msg / translate   language and text
 *  - SE.data       JSON fetched once per page (product index, galleries…)
 *  - SE.mount      render a page app inside the React shell, SPA-aware
 *  - SE.productCard / brandLogo   the one product card ('grid' | 'related' | 'mini')
 *  - SE.linkTransitions   fade out before following an internal link
 *  - SE.meta       <head> tags for the bare templates
 *  - SE.whatsapp / el / modal   quote cart + wizard: WhatsApp link, DOM
 *                  builder, modal shell
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

  // ---------------- Language & text ----------------
  //
  // assets/i18n.js decides the page language (URL prefix, then the saved
  // choice) and writes it to <html lang>; everything here reads it from
  // there, so every script agrees with the page.

  // '' for English, '/fr' or '/ar' — the prefix of every internal link.
  function prefix() {
    var l = lang();
    if (l === 'ar') return '/ar';
    if (l === 'fr') return '/fr';
    return '';
  }

  // The visitor's language out of a {en, fr, ar} object (a plain string is
  // returned as is), falling back to en, fr, ar.
  function t(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang()] || obj.en || obj.fr || obj.ar || '';
  }

  // The locale dictionary (assets/locales/<lang>.json). Shares i18n.js's
  // cache, so the file is fetched once per page whoever asks first.
  var localeCache = {};
  function locale(l) {
    l = l || lang();
    var i18n = window.__site_i18n;
    if (i18n && typeof i18n.loadLocale === 'function') return i18n.loadLocale(l);
    if (!localeCache[l]) {
      localeCache[l] = fetch('/assets/locales/' + l + '.json')
        .then(function (res) { return res.ok ? res.json() : {}; })
        .catch(function () { return {}; });
    }
    return localeCache[l];
  }

  // One string from a dictionary (default: the one i18n.js applied to the
  // page); `fallback` (or the key itself) when it has none.
  function msg(key, fallback, dict) {
    var d = dict || window.__site_i18n_dict || {};
    var v = d[key];
    if (typeof v === 'string' && v.length) return v;
    return fallback != null ? fallback : key;
  }

  // Re-apply data-i18n translations to content a script just rendered.
  function translate() {
    var i18n = window.__site_i18n;
    if (i18n && typeof i18n.init === 'function') i18n.init();
  }

  // ---------------- Data ----------------
  //
  // Each JSON file is fetched once per page, whichever script asks first
  // (the catalog, a detail page and the quote cart all read the product
  // index). Never rejects: a failed load gives `fallback`.

  var jsonCache = {};
  function json(url, fallback) {
    if (!jsonCache[url]) {
      jsonCache[url] = fetch(url)
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .catch(function (err) {
          console.error('Failed to load ' + url + ':', err);
          return fallback;
        });
    }
    return jsonCache[url];
  }

  var data = {
    json: json,
    // A fresh array per call — callers sort or shuffle their copy freely.
    products: function () {
      return json('/data/products_index.json', []).then(function (list) {
        return Array.isArray(list) ? list.slice() : [];
      });
    },
    galleries: function () { return json('/data/product_images.json', {}); },
    brands: function () {
      return json('/data/brands_index.json', []).then(function (list) {
        return Array.isArray(list) ? list.slice() : [];
      });
    }
  };

  // ---------------- Product cards ----------------
  //
  // Every product card on the site, in four variants:
  //   'grid'    catalog and brand pages (protocols, summary, brand, quote button)
  //   'related' "Related products" on a product page (same card, tighter)
  //   'mini'    a project's equipment list (image + name only)
  //   'home'    the homepage's featured products (brand, name, summary)

  function brandSlug(name) {
    return String(name).toLowerCase().replace(/\s+/g, '-');
  }

  // Brand logo for the card foot; falls back to the name if the SVG is missing.
  function brandLogo(brand) {
    if (!brand) return '<span class="prod-card-logo-fallback"></span>';
    var safe = escapeHtml(brand);
    return '<img class="prod-card-logo" src="/assets/brands/' + brandSlug(brand) + '.svg" alt="' + safe +
      '" loading="lazy" onerror="this.onerror=null;this.insertAdjacentHTML(&quot;afterend&quot;,&quot;<span class=\\&quot;prod-card-logo-fallback\\&quot;>' + safe + '</span>&quot;);this.remove();" />';
  }

  var QUOTE_BUTTON_ATTRS = 'type="button" class="prod-card-add" data-trigger="cart-add" data-i18n="cart_add_to_quote" ' +
    'aria-label="Add to quote request" data-i18n-attr="aria-label:cart_aria_add_btn" ' +
    'onclick="event.preventDefault();event.stopPropagation();if(window.Cart)window.Cart.add(this.getAttribute(&quot;data-product-id&quot;),1);"';

  function productCard(p, variant) {
    variant = variant || 'grid';
    var title = t(p.title);
    var href = prefix() + '/products/' + p.id + '.html';

    if (variant === 'home') {
      return '<a href="' + href + '" class="hp-product-card">' +
          '<div class="hp-product-card-img">' + img(p.image, { box: 'home', alt: title }) + '</div>' +
          '<div class="hp-product-card-body">' +
            '<span class="hp-product-card-brand">' + escapeHtml(p.brand || '') + '</span>' +
            '<h3 class="hp-product-card-title">' + escapeHtml(title) + '</h3>' +
            '<p class="hp-product-card-desc">' + escapeHtml(t(p.short_description)) + '</p>' +
          '</div>' +
        '</a>';
    }

    var image = img(p.image, { box: 'card', alt: title, cls: 'prod-card-img' });
    if (variant === 'mini') {
      return '<a href="' + href + '" class="prod-card link-transition">' +
          '<div class="prod-card-img-wrapper" style="height:180px;">' + image + '</div>' +
          '<div class="prod-card-content" style="padding:1rem;">' +
            '<h4 style="font-size:1.1rem; color: #1f2937; margin:0;">' + escapeHtml(title) + '</h4>' +
          '</div>' +
        '</a>';
    }

    var related = variant === 'related';
    var techs = Array.isArray(p.technology) ? p.technology : [];
    var protocols = techs.length
      ? '<div class="prod-card-protocols">' + techs.map(protoMarkup).join('') + '</div>'
      : '';
    return '<a href="' + href + '" class="' + (related ? 'prod-card link-transition' : 'prod-card prod-fade-in product-link') + '">' +
        '<div class="prod-card-img-wrapper"' + (related ? ' style="height:180px;"' : '') + '>' + image + '</div>' +
        protocols +
        '<div class="prod-card-content"' + (related ? ' style="padding:1rem;"' : '') + '>' +
          '<h3 class="prod-card-title">' + escapeHtml(title) + '</h3>' +
          '<p class="prod-card-desc">' + escapeHtml(t(p.short_description)) + '</p>' +
          '<div class="prod-card-footer">' +
            brandLogo(p.brand) +
            '<button ' + QUOTE_BUTTON_ATTRS + ' data-product-id="' + escapeHtml(p.id) + '">+ Add to quote</button>' +
          '</div>' +
        '</div>' +
      '</a>';
  }

  // "Showing 1–12 of 40 products" under a paginated product grid.
  function resultsText(first, last, total) {
    var l = lang();
    if (l === 'ar') return 'عرض ' + first + '–' + last + ' من أصل ' + total + ' منتج';
    if (l === 'fr') return 'Affichage de ' + first + '–' + last + ' sur ' + total + ' produits';
    return 'Showing ' + first + '–' + last + ' of ' + total + ' products';
  }

  // ---------------- Page apps ----------------
  //
  // The catalog, product, brand, brands-list and project scripts each render
  // a page inside the React shell: into the router's catch-all <main>
  // (main.notfound-root), else before the footer, else into #root. mount()
  // waits for that shell, renders once, re-mounts when SPA navigation comes
  // back to the page and removes the app when it leaves.
  //
  //   SE.mount({
  //     id:     'custom-…-wrapper',          the wrapper element's id
  //     isPage: function (path) { … },       does this URL belong to the app?
  //     html:   '<div class="…spinner">…',   shown until start() renders
  //             (or a function returning it, called at mount time)
  //     start:  function (wrapper) { … }     fills the wrapper (may be async)
  //   });

  function mount(app) {
    var mounted = false;

    function here() { return app.isPage(location.pathname || '/'); }
    function existing() { return document.getElementById(app.id); }

    function init() {
      if (mounted || existing()) return;
      mounted = true;
      var wrap = document.createElement('div');
      wrap.id = app.id;
      wrap.setAttribute('data-se-app', '');
      wrap.innerHTML = (typeof app.html === 'function' ? app.html() : app.html) || '';
      var target = document.querySelector('main.notfound-root') || document.querySelector('main');
      if (target && target.nodeName === 'MAIN') {
        target.innerHTML = '';
        target.appendChild(wrap);
      } else {
        var footer = document.querySelector('footer');
        var root = document.getElementById('root');
        if (footer) footer.parentNode.insertBefore(wrap, footer);
        else if (root) root.appendChild(wrap);
      }
      // The back button can restore a page that a link transition faded out.
      window.addEventListener('pageshow', function () {
        wrap.style.transition = 'none';
        wrap.style.opacity = '1';
      });
      translate();
      app.start(wrap);
    }

    function cleanup() {
      var wrap = existing();
      if (wrap) wrap.remove();
      mounted = false;
    }

    function shellReady() {
      if (!(document.querySelector('main') || document.querySelector('footer'))) return false;
      init();
      return true;
    }

    function mountWhenReady() {
      if (!here() || shellReady()) return;
      var observer = new MutationObserver(function () {
        if (shellReady()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener('locationchange', function () {
      if (!here()) cleanup();
      else if (!existing()) mountWhenReady();
    });
    window.addEventListener('popstate', function () {
      if (!here()) cleanup();
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountWhenReady);
    else mountWhenReady();
  }

  // Fade the page app out before following an internal link. Links to
  // other sites, new tabs, mail, phone, WhatsApp and #anchors are left alone.
  function linkTransitions(container, selector) {
    container.querySelectorAll(selector || 'a[href]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var anchor = e.currentTarget;
        if (e.ctrlKey || e.metaKey || anchor.target === '_blank') return;
        var href = anchor.getAttribute('href') || '';
        if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|https:\/\/wa\.me)/.test(href)) return;
        try {
          if (new URL(href, location.href).origin !== location.origin) return;
        } catch (_) {}
        e.preventDefault();
        var wrap = anchor.closest('[data-se-app]');
        if (wrap) {
          wrap.style.transition = 'opacity 0.2s ease-out';
          wrap.style.opacity = '0';
        }
        setTimeout(function () { window.location.href = href; }, 200);
      });
    });
  }

  // ---------------- <head> updates ----------------
  //
  // Generated pages already carry the right tags; these keep the bare
  // templates (product.html?id=…, brand.html, project.html) in step.

  var HOST = 'https://smartelectricity.ma';
  var meta = {
    // content of <meta id="…"> / href of <link id="…">
    set: function (id, value) {
      var el = document.getElementById(id);
      if (!el) return;
      if (el.nodeName === 'LINK') el.href = value;
      else el.content = value;
    },
    // only when still empty (share images: the static card wins)
    fill: function (id, value) {
      var el = document.getElementById(id);
      if (el && !el.content && value) el.content = value;
    },
    // every <link hreflang> -> the same page in that language
    // ('x-default' is the English URL)
    hreflang: function (path) {
      document.querySelectorAll('link[hreflang]').forEach(function (link) {
        var l = link.getAttribute('hreflang');
        link.href = HOST + (l === 'en' || l === 'x-default' ? '' : '/' + l) + path;
      });
    },
    title: function (name) {
      var suffix = { en: 'S‑ELECTRICITY Morocco', fr: 'S‑ELECTRICITY Maroc', ar: 'S‑ELECTRICITY المغرب' };
      document.title = name + ' | ' + (suffix[lang()] || suffix.en);
    }
  };

  // ---------------- Quote / contact over WhatsApp ----------------

  var WHATSAPP_NUMBER = '212654132112';
  function whatsapp(text) {
    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(text);
  }

  // ---------------- Modals (quote cart, solution wizard) ----------------

  // Small DOM builder: el('div', {class, html, on: {click: fn}, style: {}, …}, children)
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'on') {
          for (var ev in attrs[k]) node.addEventListener(ev, attrs[k][ev]);
        } else if (k === 'style' && typeof attrs[k] === 'object') {
          Object.assign(node.style, attrs[k]);
        } else if (k in node && typeof attrs[k] !== 'string') {
          node[k] = attrs[k];
        } else {
          node.setAttribute(k, attrs[k]);
        }
      }
    }
    if (children != null) {
      var list = Array.isArray(children) ? children : [children];
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c == null) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    }
    return node;
  }

  var CLOSE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';

  // The shared shell of a side/center modal. `name` prefixes every class:
  // <name>-modal, -modal-backdrop, -modal-panel, -close; <body> gets
  // <name>-open and the root <name>-visible while shown. The caller fills
  // the returned `panel` and then calls show(); hide() fades and removes it.
  //   SE.modal({ name: 'cart', id: 'cart-modal-root', labelledBy: 'cart-title',
  //              closeLabel: '…', onClose: fn })
  function modal(opts) {
    var name = opts.name;
    document.querySelectorAll('.' + name + '-modal').forEach(function (n) { n.remove(); });
    var root = el('div', {
      id: opts.id,
      class: name + '-modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': opts.labelledBy
    });
    var requestClose = function () { opts.onClose(); };
    root.appendChild(el('div', { class: name + '-modal-backdrop', on: { click: requestClose } }));
    var panel = el('div', { class: name + '-modal-panel' });
    panel.appendChild(el('button', {
      type: 'button',
      class: name + '-close',
      'aria-label': opts.closeLabel,
      html: CLOSE_ICON,
      on: { click: requestClose }
    }));
    root.appendChild(panel);
    document.body.appendChild(root);
    root.setAttribute('dir', document.documentElement.getAttribute('dir') || (lang() === 'ar' ? 'rtl' : 'ltr'));

    return {
      root: root,
      panel: panel,
      isOpen: function () { return root.classList.contains(name + '-visible'); },
      show: function () {
        // next frame, so the CSS transition runs from the hidden state
        requestAnimationFrame(function () {
          document.body.classList.add(name + '-open');
          root.classList.add(name + '-visible');
        });
      },
      hide: function () {
        root.classList.remove(name + '-visible');
        document.body.classList.remove(name + '-open');
        setTimeout(function () { root.remove(); }, 280);
      }
    };
  }

  window.SE = {
    lang: lang,
    prefix: prefix,
    t: t,
    locale: locale,
    msg: msg,
    translate: translate,
    escapeHtml: escapeHtml,
    protoMarkup: protoMarkup,
    img: img,
    data: data,
    brandSlug: brandSlug,
    brandLogo: brandLogo,
    productCard: productCard,
    resultsText: resultsText,
    mount: mount,
    linkTransitions: linkTransitions,
    meta: meta,
    whatsapp: whatsapp,
    el: el,
    modal: modal,
    taxonomy: {
      load: load,
      label: label,
      categoryOf: categoryOf,
      sorted: sorted,
      expandAlias: expandAlias
    }
  };
})();
