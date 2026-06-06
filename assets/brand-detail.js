/**
 * brand-detail.js
 * Renders a single brand page (/brands/<slug>.html) by injecting content into the SPA layout.
 * Mirrors project-detail.js / product-detail.js architecture:
 *   - Reads window.__BRAND__ pre-embedded by build_brands.py (instant render, no fetch).
 *   - Falls back to fetching /data/brands/<slug>.json + /data/products_index.json (dev mode).
 *   - Mounts a #custom-brand-detail-wrapper into #root once the SPA shell exists.
 *   - Re-renders on SPA navigation via the locationchange event.
 */

(function() {
  // Auto-redirect to language-prefixed URL if needed.
  var _path = location.pathname || '/';
  if (_path === '/brand.html' || (_path.startsWith('/brands/') && _path.endsWith('.html'))) {
    var _lang = localStorage.getItem('site_lang');
    if (_lang && _lang !== 'en' && (_lang === 'ar' || _lang === 'fr')) {
      location.replace('/' + _lang + _path + location.search + location.hash);
      return;
    }
  }

  // ---------------- Helpers ----------------
  function getLang() {
    return document.documentElement.lang || 'en';
  }
  function getLangPrefix() {
    const lang = getLang();
    if (lang === 'ar') return '/ar';
    if (lang === 'fr') return '/fr';
    return '';
  }
  function t(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[getLang()] || obj['en'] || obj['fr'] || obj['ar'] || '';
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
  function dictLookup(key, fallback) {
    if (window.__site_i18n_dict && window.__site_i18n_dict[key]) {
      return window.__site_i18n_dict[key];
    }
    return fallback;
  }

  function getBrandSlug() {
    const match = location.pathname.match(/\/brands\/([^/.]+)(?:\.html)?$/);
    if (match) return match[1];
    const params = new URLSearchParams(location.search);
    return params.get('id');
  }

  async function fetchBrand(slug) {
    // Prefer pre-embedded brand data (written by build_brands.py).
    if (window.__BRAND__ && (!slug || window.__BRAND__.id === slug)) {
      return window.__BRAND__;
    }
    if (!slug) return null;
    try {
      const res = await fetch('/data/brands/' + slug + '.json');
      if (!res.ok) throw new Error('Brand not found');
      return await res.json();
    } catch (e) {
      console.error('Failed to fetch brand:', e);
      return null;
    }
  }

  async function fetchProductsIndex() {
    try {
      const res = await fetch('/data/products_index.json');
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      return [];
    }
  }

  function getBrandProducts(brand, productsIndex) {
    // If the page was pre-embedded with brand.products (build_brands.py does this),
    // trust it. Otherwise filter the products_index by the brand's `brand` field.
    if (Array.isArray(brand.products)) return brand.products;
    const name = brand.brand || '';
    return (productsIndex || []).filter(function(p) { return p.brand === name; });
  }

  // Derive the unique set of technologies and product types from the brand's
  // products, sorted by frequency descending. This replaces the previously
  // manually-curated tech_focus / category_focus arrays in the brand JSON —
  // the catalog is the single source of truth.
  function deriveChips(brandProducts) {
    const techCount = {};
    const typeCount = {};
    brandProducts.forEach(function(p) {
      if (Array.isArray(p.technology)) {
        p.technology.forEach(function(t) {
          if (t) techCount[t] = (techCount[t] || 0) + 1;
        });
      }
      if (p.product_type) {
        typeCount[p.product_type] = (typeCount[p.product_type] || 0) + 1;
      }
    });
    function sortByFreq(counts) {
      return Object.keys(counts).sort(function(a, b) {
        return counts[b] - counts[a] || a.localeCompare(b);
      });
    }
    return {
      technologies: sortByFreq(techCount),
      categories: sortByFreq(typeCount),
    };
  }

  // ---------------- URL / pagination state ----------------
  const ITEMS_PER_PAGE = 12;

  function readPageFromURL() {
    const params = new URLSearchParams(location.search);
    const p = parseInt(params.get('page'), 10);
    return (Number.isFinite(p) && p > 0) ? p : 1;
  }

  function writePageToURL(page) {
    const params = new URLSearchParams(location.search);
    if (page > 1) params.set('page', String(page));
    else params.delete('page');
    const qs = params.toString();
    const newUrl = location.pathname + (qs ? '?' + qs : '') + location.hash;
    history.replaceState(null, '', newUrl);
  }

  // ---------------- Meta / head updates (for SPA navigation, not the static build) ----------------
  function updateMeta(brand) {
    const tagline = t(brand.tagline);
    const description = t(brand.description) || tagline;
    const brandName = brand.brand || '';
    const suffix = { en: 'S‑ELECTRICITY Morocco', fr: 'S‑ELECTRICITY Maroc', ar: 'S‑ELECTRICITY المغرب' };
    document.title = brandName + ' | ' + (suffix[getLang()] || suffix.en);

    function setContent(id, value) {
      const el = document.getElementById(id);
      if (el) el.content = value;
    }
    function setHref(id, value) {
      const el = document.getElementById(id);
      if (el) el.href = value;
    }

    const baseUrl = 'https://smartelectricity.ma';
    const canonicalUrl = baseUrl + getLangPrefix() + '/brands/' + brand.id + '.html';
    const logoUrl = brand.logo ? (baseUrl + brand.logo) : (baseUrl + '/assets/S‑ELECTRICITY-LOGO.svg');

    setHref('meta-canonical', canonicalUrl);
    setContent('meta-description', description);
    setContent('meta-og-title', brandName + ' | S‑ELECTRICITY');
    setContent('meta-og-description', description);
    setContent('meta-og-image', logoUrl);
    setContent('meta-twitter-title', brandName + ' | S‑ELECTRICITY');
    setContent('meta-twitter-description', description);
    setContent('meta-twitter-image', logoUrl);

    document.querySelectorAll('link[hreflang]').forEach(function(link) {
      const lang = link.getAttribute('hreflang');
      const prefix = (lang === 'en' || lang === 'x-default') ? '' : '/' + lang;
      link.href = baseUrl + prefix + '/brands/' + brand.id + '.html';
    });
  }

  // ---------------- Rendering ----------------
  const ARROW_RIGHT = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
  const ICON_GLOBE  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  const ICON_CAL    = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const ICON_BOX    = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
  const ICON_EXTLINK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
  const ICON_SPARKLES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>';

  function renderBreadcrumbs(brand) {
    const prefix = getLangPrefix();
    return (
      '<nav class="brand-breadcrumbs" aria-label="Breadcrumb">' +
        '<a href="' + prefix + '/" data-i18n="breadcrumb_home">Home</a>' +
        '<span class="brand-breadcrumb-sep">›</span>' +
        '<a href="' + prefix + '/brands.html" data-i18n="nav_brands">Brands</a>' +
        '<span class="brand-breadcrumb-sep">›</span>' +
        '<span class="brand-breadcrumb-current">' + escapeHtml(brand.brand || '') + '</span>' +
      '</nav>'
    );
  }

  function renderHero(brand, brandProducts) {
    const prefix = getLangPrefix();
    const brandName = escapeHtml(brand.brand || '');
    const tagline = escapeHtml(t(brand.tagline));
    const count = brandProducts.length;

    const logoBlock = brand.logo
      ? '<img src="' + escapeHtml(brand.logo) + '" alt="' + brandName + ' logo" />'
      : '<div class="brand-hero-name-fallback">' + brandName + '</div>';

    const badges = [];
    if (brand.country_of_origin) {
      badges.push(
        '<span class="brand-meta-badge">' + ICON_GLOBE +
          '<span>' + escapeHtml(brand.country_of_origin) + '</span>' +
        '</span>'
      );
    }
    if (brand.founded) {
      const foundedTpl = dictLookup('brand_founded', 'Founded {year}');
      badges.push(
        '<span class="brand-meta-badge">' + ICON_CAL +
          '<span>' + escapeHtml(foundedTpl.replace('{year}', brand.founded)) + '</span>' +
        '</span>'
      );
    }
    if (count > 0) {
      const countTpl = dictLookup('brand_products_count', '{count} products in our catalog');
      badges.push(
        '<span class="brand-meta-badge">' + ICON_BOX +
          '<span>' + escapeHtml(countTpl.replace('{count}', count)) + '</span>' +
        '</span>'
      );
    }

    const websiteBtn = brand.website
      ? '<a href="' + escapeHtml(brand.website) + '" target="_blank" rel="noopener noreferrer" class="brand-hero-btn brand-hero-btn-secondary">' +
          ICON_EXTLINK +
          '<span data-i18n="brand_visit_website">Visit Website</span>' +
        '</a>'
      : '';

    return (
      '<section class="brand-hero">' +
        '<div class="brand-hero-content">' +
          '<div class="brand-hero-layout">' +
            '<div class="brand-hero-logo">' + logoBlock + '</div>' +
            '<div>' +
              '<h1 class="brand-hero-title">' + brandName + '</h1>' +
              '<p class="brand-hero-tagline">' + tagline + '</p>' +
              (badges.length ? '<div class="brand-hero-meta">' + badges.join('') + '</div>' : '') +
              '<div class="brand-hero-actions">' +
                '<a href="' + prefix + '/products.html?brand=' + encodeURIComponent(brand.brand || '') + '" class="brand-hero-btn brand-hero-btn-primary">' +
                  '<span data-i18n="brand_view_products">View All Products</span>' +
                  ARROW_RIGHT +
                '</a>' +
                websiteBtn +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function renderAbout(brand) {
    const desc = t(brand.description);
    if (!desc) return '';
    const paragraphs = desc.split(/\n\s*\n/).map(function(p) {
      return '<p>' + escapeHtml(p.trim()) + '</p>';
    }).join('');
    return (
      '<section class="brand-section">' +
        '<h2 class="brand-section-title" data-i18n="brand_about">About</h2>' +
        '<div class="brand-about-text">' + paragraphs + '</div>' +
      '</section>'
    );
  }

  function renderChips(brand, brandProducts) {
    // Technologies and Specialization are auto-derived from the brand's
    // products in the catalog (sorted by frequency desc). The catalog is the
    // single source of truth — no need to maintain parallel arrays in the JSON.
    const derived = deriveChips(brandProducts);
    const techs = derived.technologies;
    const cats = derived.categories;
    if (!techs.length && !cats.length) return '';

    const techChips = techs.map(function(x) {
      return '<span class="brand-chip brand-chip-tech">' + escapeHtml(x) + '</span>';
    }).join('');
    const catChips = cats.map(function(x) {
      return '<span class="brand-chip">' + escapeHtml(x) + '</span>';
    }).join('');

    const techGroup = techs.length ? (
      '<div class="brand-chip-group">' +
        '<div class="brand-chip-group-label" data-i18n="brand_tech_focus">Technologies</div>' +
        '<div class="brand-chips">' + techChips + '</div>' +
      '</div>'
    ) : '';

    const catGroup = cats.length ? (
      '<div class="brand-chip-group">' +
        '<div class="brand-chip-group-label" data-i18n="brand_category_focus">Specialization</div>' +
        '<div class="brand-chips">' + catChips + '</div>' +
      '</div>'
    ) : '';

    return (
      '<section class="brand-section">' +
        '<div class="brand-chips-grid">' +
          techGroup +
          catGroup +
        '</div>' +
      '</section>'
    );
  }

  // Protocol icon dictionary — mirrors products.js protoMarkup / product-detail.js.
  function protoMarkup(tech) {
    const tl = String(tech).toLowerCase();
    let icon = '';
    if (tl.includes('wi-fi') || tl.includes('wifi')) {
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0114 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>';
    } else if (tl.includes('bluetooth') || tl.includes('ble')) {
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/></svg>';
    } else if (tl.includes('knx')) {
      return '<span class="prod-proto prod-proto-knx">KNX</span>';
    } else if (tl.includes('zigbee')) {
      icon = '<svg viewBox="0 0 48 48" fill="currentColor"><path d="M32.042,9.792c4.595,1.238,4.88,3.165,5.524,5.048C34.841,17.664,17.35,35.7,17.35,35.7s10.901,1.177,23.487-1.003c-0.001,0.029-0.002,0.048-0.003,0.076C42.829,31.661,44,27.97,44,24c0-11.046-8.954-20-20-20c-5.634,0-10.715,2.338-14.35,6.087C15.489,9.124,26.89,8.403,32.042,9.792z"/><path d="M14.724,37.285c-1.982-0.347-4.212-2.131-4.707-5.302c1.437-1.239,19.994-20.507,19.994-20.507c-7.008-0.424-14.569-0.465-22.237,0.864C5.408,15.625,4,19.644,4,24c0,11.046,8.954,20,20,20c6.173,0,11.689-2.8,15.358-7.195C35.486,37.33,23.257,38.769,14.724,37.285z"/></svg>';
    } else if (tl.includes('matter')) {
      icon = '<svg viewBox="0 0 512 512" fill="currentColor"><path d="M152 134.4c21.5 17.5 47.1 29.2 74.4 34.2V22.9l29.7-17.1 29.6 17.1v145.6c27.3-4.9 52.9-16.7 74.5-34.2l53.8 31.1c-87.6 86.6-228.5 86.6-316.1 0zm65.5 371.8C248.7 387 178.1 264.9 59.3 232.5v62.3c25.9 9.9 48.9 26.2 66.8 47.4L0 414.9v34.2l29.7 17 126.1-72.8c9.4 26.1 12 54.2 7.6 81.5zm235.3-273.7C334 265 263.6 387.1 294.8 506.2l54-31.2c-4.4-27.4-1.7-55.4 7.6-81.5l126 72.7 29.6-17.1v-34.2l-126.1-72.8c17.9-21.2 40.9-37.5 66.8-47.4z"/></svg>';
    } else if (tl.includes('thread')) {
      icon = '<svg viewBox="0 0 165 165" fill="currentColor"><path d="M82.498,0C37.008,0,0,37.008,0,82.496c0,45.181,36.51,81.977,81.573,82.476V82.569l-27.002-0.002c-8.023,0-14.554,6.53-14.554,14.561c0,8.023,6.531,14.551,14.554,14.551v17.98c-17.939,0-32.534-14.595-32.534-32.531c0-17.944,14.595-32.543,32.534-32.543l27.002,0.004v-9.096c0-14.932,12.146-27.08,27.075-27.08c14.932,0,27.082,12.148,27.082,27.08c0,14.931-12.15,27.08-27.082,27.08l-9.097-0.001v80.641C136.889,155.333,165,122.14,165,82.496C165,37.008,127.99,0,82.498,0z"/><path d="M117.748,55.493c0-5.016-4.082-9.098-9.1-9.098c-5.015,0-9.097,4.082-9.097,9.098v9.097l9.097,0.001C113.666,64.591,117.748,60.51,117.748,55.493z"/></svg>';
    } else if (tl.includes('lan') || tl.includes('ethernet')) {
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 20 3-3h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2l3 3z"/><path d="M6 8v1"/><path d="M10 8v1"/><path d="M14 8v1"/><path d="M18 8v1"/></svg>';
    } else if (tl.includes('z-wave')) {
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16.247 7.761a6 6 0 0 1 0 8.478"/><path d="M19.075 4.933a10 10 0 0 1 0 14.134"/><path d="M4.925 19.067a10 10 0 0 1 0-14.134"/><path d="M7.753 16.239a6 6 0 0 1 0-8.478"/><circle cx="12" cy="12" r="2"/></svg>';
    } else {
      return '<span class="prod-proto">' + escapeHtml(tech) + '</span>';
    }
    return '<span class="prod-proto">' + icon + escapeHtml(tech) + '</span>';
  }

  function brandLogoMarkup(brand) {
    if (!brand) return '<span class="prod-card-logo-fallback"></span>';
    const slug = String(brand).toLowerCase().replace(/\s+/g, '-');
    const safe = escapeHtml(brand);
    return '<img class="prod-card-logo" src="/assets/brands/' + slug + '.svg" alt="' + safe +
      '" loading="lazy" onerror="this.onerror=null;this.insertAdjacentHTML(&quot;afterend&quot;,&quot;<span class=\\&quot;prod-card-logo-fallback\\&quot;>' + safe + '</span>&quot;);this.remove();" />';
  }

  function renderProductCard(product) {
    const prefix = getLangPrefix();
    const title = t(product.title);
    const desc = t(product.short_description);
    const image = product.image || (product.images && product.images[0]) || '/assets/S‑ELECTRICITY-LOGO.svg';
    const techs = Array.isArray(product.technology) ? product.technology : [];
    const protocolStrip = techs.length
      ? '<div class="prod-card-protocols">' + techs.map(protoMarkup).join('') + '</div>'
      : '';

    return (
      '<a href="' + prefix + '/products/' + product.id + '.html" class="prod-card prod-fade-in product-link">' +
        '<div class="prod-card-img-wrapper">' +
          '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(title) + '" class="prod-card-img" loading="lazy" />' +
        '</div>' +
        protocolStrip +
        '<div class="prod-card-content">' +
          '<div class="prod-card-brand">' + escapeHtml(product.brand || '') + '</div>' +
          '<h3 class="prod-card-title">' + escapeHtml(title) + '</h3>' +
          '<p class="prod-card-desc">' + escapeHtml(desc) + '</p>' +
          '<div class="prod-card-footer">' +
            brandLogoMarkup(product.brand) +
            '<button type="button" class="prod-card-add" data-trigger="cart-add" data-product-id="' + escapeHtml(product.id) + '" data-i18n="cart_add_to_quote" aria-label="Add to quote request" data-i18n-attr="aria-label:cart_aria_add_btn" onclick="event.preventDefault();event.stopPropagation();if(window.Cart)window.Cart.add(this.getAttribute(&quot;data-product-id&quot;),1);">+ Add to quote</button>' +
          '</div>' +
        '</div>' +
      '</a>'
    );
  }

  // Renders the products section shell — the inner grid + count + pagination
  // are rendered inside #brand-products-grid-container via renderProductsGrid()
  // so we can swap pages without rebuilding the surrounding chrome.
  function renderProductsSection(brand, brandProducts) {
    const prefix = getLangPrefix();
    if (!brandProducts.length) {
      return (
        '<section class="brand-products-section">' +
          '<div class="brand-products-section-header">' +
            '<h2 class="brand-section-title" data-i18n="brand_products_title">Products</h2>' +
          '</div>' +
          '<div class="brand-no-products" data-i18n="brand_no_products">No products from this brand yet.</div>' +
        '</section>'
      );
    }
    const filterHref = prefix + '/products.html?brand=' + encodeURIComponent(brand.brand || '');
    return (
      '<section class="brand-products-section">' +
        '<div class="brand-products-section-header">' +
          '<h2 class="brand-section-title" data-i18n="brand_products_title">Products</h2>' +
          '<a href="' + filterHref + '" class="brand-products-link">' +
            '<span data-i18n="brand_view_in_catalog">View in catalog</span>' +
            ARROW_RIGHT +
          '</a>' +
        '</div>' +
        '<div id="brand-products-grid-container"></div>' +
      '</section>'
    );
  }

  function renderProductsGrid(brandProducts, currentPage) {
    const totalPages = Math.max(1, Math.ceil(brandProducts.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginated = brandProducts.slice(startIdx, startIdx + ITEMS_PER_PAGE);
    const cards = paginated.map(renderProductCard).join('');

    let html = '<div class="prod-grid">' + cards + '</div>';

    // Localized results count, identical wording to products.html.
    const showStart = startIdx + 1;
    const showEnd = Math.min(startIdx + ITEMS_PER_PAGE, brandProducts.length);
    const lang = getLang();
    let resultsText;
    if (lang === 'ar') {
      resultsText = 'عرض ' + showStart + '–' + showEnd + ' من أصل ' + brandProducts.length + ' منتج';
    } else if (lang === 'fr') {
      resultsText = 'Affichage de ' + showStart + '–' + showEnd + ' sur ' + brandProducts.length + ' produits';
    } else {
      resultsText = 'Showing ' + showStart + '–' + showEnd + ' of ' + brandProducts.length + ' products';
    }
    html += '<div class="prod-results-count" style="text-align:center; color: var(--prod-text-muted); font-size: 0.9rem; margin-top: 1rem;">' +
              escapeHtml(resultsText) +
            '</div>';

    if (totalPages > 1) {
      html += (
        '<div class="prod-pagination">' +
          '<button class="prod-page-btn" id="brand-prev-page" ' + (currentPage === 1 ? 'disabled' : '') + '>' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
              '<polyline points="15 18 9 12 15 6"></polyline>' +
            '</svg>' +
          '</button>' +
          '<span class="prod-page-info" dir="ltr">' + currentPage + ' / ' + totalPages + '</span>' +
          '<button class="prod-page-btn" id="brand-next-page" ' + (currentPage === totalPages ? 'disabled' : '') + '>' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
              '<polyline points="9 18 15 12 9 6"></polyline>' +
            '</svg>' +
          '</button>' +
        '</div>'
      );
    }

    return { html: html, currentPage: currentPage, totalPages: totalPages };
  }

  function updateProductsGrid(brandProducts, currentPage) {
    const container = document.getElementById('brand-products-grid-container');
    if (!container) return currentPage;
    const result = renderProductsGrid(brandProducts, currentPage);
    container.innerHTML = result.html;
    attachLinkTransitions(container);

    const prev = document.getElementById('brand-prev-page');
    const next = document.getElementById('brand-next-page');
    const scrollTarget = function() {
      const section = document.querySelector('.brand-products-section');
      if (section) {
        window.scrollTo({ top: section.offsetTop - 100, behavior: 'smooth' });
      }
    };
    if (prev) {
      prev.addEventListener('click', function() {
        if (result.currentPage > 1) {
          const newPage = result.currentPage - 1;
          writePageToURL(newPage);
          updateProductsGrid(brandProducts, newPage);
          scrollTarget();
        }
      });
    }
    if (next) {
      next.addEventListener('click', function() {
        if (result.currentPage < result.totalPages) {
          const newPage = result.currentPage + 1;
          writePageToURL(newPage);
          updateProductsGrid(brandProducts, newPage);
          scrollTarget();
        }
      });
    }

    if (window.__site_i18n && typeof window.__site_i18n.init === 'function') {
      setTimeout(function() { window.__site_i18n.init(); }, 50);
    }

    return result.currentPage;
  }

  function renderCta() {
    // Mirror project-detail.js renderCta — same .proj-cta classes so the CTA
    // looks identical across project, brand, and homepage contexts.
    const prefix = getLangPrefix();
    const servicesHref = (prefix || '') + '/#services';
    return (
      '<section class="proj-cta">' +
        '<div class="proj-cta-inner">' +
          '<h2 class="proj-cta-title" data-i18n="spa_need_custom">Need a Custom Solution?</h2>' +
          '<p class="proj-cta-lead" data-i18n="spa_team">Our team of experts is ready to design a tailored smart home or commercial solution that perfectly fits your needs and budget.</p>' +
          '<div class="proj-cta-actions">' +
            '<button type="button" data-trigger="find-solution" class="proj-cta-btn proj-cta-btn-primary">' +
              ICON_SPARKLES +
              '<span data-i18n="spa_cta_find_solution">Find Your Solution</span>' +
            '</button>' +
            '<a href="' + servicesHref + '" class="proj-cta-btn proj-cta-btn-secondary">' +
              '<span data-i18n="spa_cta_discover_services">Discover Our Services</span>' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="proj-cta-arrow"><polyline points="9 18 15 12 9 6"/></svg>' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function renderError() {
    const prefix = getLangPrefix();
    return (
      '<div class="brand-not-found">' +
        '<h2 data-i18n="brand_not_found">Brand Not Found</h2>' +
        '<p data-i18n="brand_not_found_desc">The brand you are looking for does not exist or has been removed.</p>' +
        '<a href="' + prefix + '/brands.html" class="brand-hero-btn brand-hero-btn-primary" data-i18n="nav_brands">Brands</a>' +
      '</div>'
    );
  }

  function renderContent(brand, brandProducts) {
    return (
      '<div id="custom-brand-detail-container">' +
        renderBreadcrumbs(brand) +
        renderHero(brand, brandProducts) +
        renderAbout(brand) +
        renderChips(brand, brandProducts) +
        renderProductsSection(brand, brandProducts) +
        renderCta() +
      '</div>'
    );
  }

  // ---------------- Link transitions ----------------
  function attachLinkTransitions(container) {
    container.querySelectorAll('a[href]').forEach(function(link) {
      link.addEventListener('click', function(e) {
        const anchor = e.currentTarget;
        if (e.ctrlKey || e.metaKey || anchor.target === '_blank') return;
        const href = anchor.getAttribute('href') || '';
        if (!href || href.startsWith('#') || href.startsWith('mailto:') ||
            href.startsWith('tel:') || href.startsWith('https://wa.me')) return;
        try {
          const u = new URL(href, location.href);
          if (u.origin !== location.origin) return;
        } catch(_) {}
        e.preventDefault();
        const wrap = document.getElementById('custom-brand-detail-wrapper');
        if (wrap) {
          wrap.style.transition = 'opacity 0.2s ease-out';
          wrap.style.opacity = '0';
        }
        setTimeout(function() { window.location.href = href; }, 200);
      });
    });
  }

  // ---------------- Mount ----------------
  var _mounted = false;

  async function initApp() {
    if (_mounted || document.getElementById('custom-brand-detail-wrapper')) return;
    _mounted = true;

    const root = document.getElementById('root');
    const target = document.querySelector('main.notfound-root') || document.querySelector('main');

    const appContainer = document.createElement('div');
    appContainer.id = 'custom-brand-detail-wrapper';
    appContainer.innerHTML = '<div class="brand-loading"><div class="brand-loading-spinner"></div></div>';

    if (target && target.nodeName === 'MAIN') {
      target.innerHTML = '';
      target.appendChild(appContainer);
    } else {
      const footer = document.querySelector('footer');
      if (footer) {
        footer.parentNode.insertBefore(appContainer, footer);
      } else if (root) {
        root.appendChild(appContainer);
      }
    }

    window.addEventListener('pageshow', function() {
      appContainer.style.transition = 'none';
      appContainer.style.opacity = '1';
    });

    if (window.__site_i18n && window.__site_i18n.init) window.__site_i18n.init();

    const slug = getBrandSlug();
    const [brand, productsIndex] = await Promise.all([
      fetchBrand(slug),
      fetchProductsIndex()
    ]);

    function renderPage() {
      let html;
      let brandProducts = [];
      if (!brand) {
        html = '<div id="custom-brand-detail-container">' + renderError() + '</div>';
      } else {
        updateMeta(brand);
        brandProducts = getBrandProducts(brand, productsIndex);
        html = renderContent(brand, brandProducts);
      }
      appContainer.innerHTML = html;
      attachLinkTransitions(appContainer);
      if (brand && brandProducts.length) {
        updateProductsGrid(brandProducts, readPageFromURL());
      }
      if (window.__site_i18n && typeof window.__site_i18n.init === 'function') {
        setTimeout(function() { window.__site_i18n.init(); }, 50);
      }
    }

    renderPage();

    window.addEventListener('locationchange', function() {
      if (isBrandDetailPage()) renderPage();
    });
  }

  function isBrandDetailPage() {
    const path = location.pathname || '/';
    return path.endsWith('/brand.html') ||
           path.endsWith('/brand') ||
           /\/brands\/[^/]+\.html$/.test(path);
  }

  function cleanupBrandDetail() {
    const wrap = document.getElementById('custom-brand-detail-wrapper');
    if (wrap) wrap.remove();
    _mounted = false;
  }

  function mountApp() {
    if (!isBrandDetailPage()) return;

    const tryMount = function() {
      const hasShell = document.querySelector('main') || document.querySelector('footer');
      if (hasShell) { initApp(); return true; }
      return false;
    };

    if (tryMount()) return;

    const observer = new MutationObserver(function(_, obs) {
      if (tryMount()) obs.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener('locationchange', function() {
    if (!isBrandDetailPage()) cleanupBrandDetail();
    else if (!document.getElementById('custom-brand-detail-wrapper')) mountApp();
  });
  window.addEventListener('popstate', function() {
    if (!isBrandDetailPage()) cleanupBrandDetail();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
  } else {
    mountApp();
  }
})();
