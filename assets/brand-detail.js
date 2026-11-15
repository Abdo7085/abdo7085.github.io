/**
 * brand-detail.js
 * Renders a single brand page (/brands/<slug>.html) inside the SPA layout.
 *   - Reads window.__BRAND__ pre-embedded by build_brands.py (instant render).
 *   - Falls back to /data/brands/<slug>.json + the product index (bare template).
 * Mounting, language, product cards and data loading come from
 * assets/site-core.js (SE).
 */

(function () {
  'use strict';

  const t = SE.t;
  const escapeHtml = SE.escapeHtml;
  let dict = null;   // the page language's dictionary, loaded before rendering

  // ---------------- Data ----------------

  function getBrandSlug() {
    const match = location.pathname.match(/\/brands\/([^/.]+)(?:\.html)?$/);
    if (match) return match[1];
    return new URLSearchParams(location.search).get('id');
  }

  async function fetchBrand(slug) {
    // Prefer pre-embedded brand data (written by build_brands.py).
    if (window.__BRAND__ && (!slug || window.__BRAND__.id === slug)) {
      return window.__BRAND__;
    }
    if (!slug) return null;
    return SE.data.json('/data/brands/' + slug + '.json', null);
  }

  function getBrandProducts(brand, productsIndex) {
    // build_brands.py pre-embeds brand.products; otherwise filter the index.
    if (Array.isArray(brand.products)) return brand.products;
    const name = brand.brand || '';
    return (productsIndex || []).filter(function (p) { return p.brand === name; });
  }

  // Technologies and catalog categories of the brand's products, by frequency
  // (mirrors derive_chips() in scripts/build_brands.py — keep them in sync).
  function deriveChips(brandProducts) {
    const techCount = {};
    const catCount = {};
    brandProducts.forEach(function (p) {
      if (Array.isArray(p.technology)) {
        p.technology.forEach(function (x) {
          if (x) techCount[x] = (techCount[x] || 0) + 1;
        });
      }
      const cat = p.category || SE.taxonomy.categoryOf(p.product_type);
      if (cat) catCount[cat] = (catCount[cat] || 0) + 1;
    });
    function sortByFreq(counts) {
      return Object.keys(counts).sort(function (a, b) {
        return counts[b] - counts[a] || a.localeCompare(b);
      });
    }
    return { technologies: sortByFreq(techCount), categories: sortByFreq(catCount) };
  }

  // ---------------- URL / pagination state ----------------
  const ITEMS_PER_PAGE = 12;

  function readPageFromURL() {
    const p = parseInt(new URLSearchParams(location.search).get('page'), 10);
    return (Number.isFinite(p) && p > 0) ? p : 1;
  }

  function writePageToURL(page) {
    const params = new URLSearchParams(location.search);
    if (page > 1) params.set('page', String(page));
    else params.delete('page');
    const qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  // ---------------- <head> (bare template; generated pages already have it) ----------------
  function updateMeta(brand) {
    const description = t(brand.description) || t(brand.tagline);
    const brandName = brand.brand || '';
    const host = 'https://smartelectricity.ma';
    const logoUrl = host + (brand.logo || '/assets/S‑ELECTRICITY-LOGO.svg');

    SE.meta.title(brandName);
    SE.meta.set('meta-canonical', host + SE.prefix() + '/brands/' + brand.id + '.html');
    SE.meta.set('meta-description', description);
    SE.meta.set('meta-og-title', brandName + ' | S‑ELECTRICITY');
    SE.meta.set('meta-og-description', description);
    SE.meta.fill('meta-og-image', logoUrl);
    SE.meta.set('meta-twitter-title', brandName + ' | S‑ELECTRICITY');
    SE.meta.set('meta-twitter-description', description);
    SE.meta.fill('meta-twitter-image', logoUrl);
    SE.meta.hreflang('/brands/' + brand.id + '.html');
  }

  // ---------------- Rendering ----------------
  const ARROW_RIGHT = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
  const ICON_GLOBE  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  const ICON_CAL    = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const ICON_BOX    = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
  const ICON_EXTLINK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
  const ICON_SPARKLES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>';

  function renderBreadcrumbs(brand) {
    const prefix = SE.prefix();
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
      badges.push(
        '<span class="brand-meta-badge">' + ICON_CAL +
          '<span>' + escapeHtml(SE.msg('brand_founded', 'Founded {year}', dict).replace('{year}', brand.founded)) + '</span>' +
        '</span>'
      );
    }
    if (count > 0) {
      badges.push(
        '<span class="brand-meta-badge">' + ICON_BOX +
          '<span>' + escapeHtml(SE.msg('brand_products_count', '{count} products in our catalog', dict).replace('{count}', count)) + '</span>' +
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
                '<a href="' + SE.prefix() + '/products.html?brand=' + encodeURIComponent(brand.brand || '') + '" class="brand-hero-btn brand-hero-btn-primary">' +
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
    const paragraphs = desc.split(/\n\s*\n/).map(function (p) {
      return '<p>' + escapeHtml(p.trim()) + '</p>';
    }).join('');
    return (
      '<section class="brand-section">' +
        '<h2 class="brand-section-title" data-i18n="brand_about">About</h2>' +
        '<div class="brand-about-text">' + paragraphs + '</div>' +
      '</section>'
    );
  }

  function renderChips(brandProducts) {
    const derived = deriveChips(brandProducts);
    const techs = derived.technologies;
    const cats = derived.categories;
    if (!techs.length && !cats.length) return '';

    const techChips = techs.map(function (x) {
      return '<span class="brand-chip brand-chip-tech">' + escapeHtml(x) + '</span>';
    }).join('');
    const catChips = cats.map(function (x) {
      return '<span class="brand-chip">' + escapeHtml(SE.taxonomy.label('category', x)) + '</span>';
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
        '<div class="brand-chips-grid">' + techGroup + catGroup + '</div>' +
      '</section>'
    );
  }

  // The section shell; the grid, count and pagination go into
  // #brand-products-grid-container (updateProductsGrid) so a page change
  // does not rebuild the surrounding chrome.
  function renderProductsSection(brand, brandProducts) {
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
    const filterHref = SE.prefix() + '/products.html?brand=' + encodeURIComponent(brand.brand || '');
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
    let html = '<div class="prod-grid">' + paginated.map(function (p) { return SE.productCard(p, 'grid'); }).join('') + '</div>';

    // Same wording as the catalog's results count.
    const resultsText = SE.resultsText(startIdx + 1, Math.min(startIdx + ITEMS_PER_PAGE, brandProducts.length), brandProducts.length);
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
    SE.linkTransitions(container);

    function goTo(page) {
      writePageToURL(page);
      updateProductsGrid(brandProducts, page);
      const section = document.querySelector('.brand-products-section');
      if (section) window.scrollTo({ top: section.offsetTop - 100, behavior: 'smooth' });
    }
    const prev = document.getElementById('brand-prev-page');
    const next = document.getElementById('brand-next-page');
    if (prev) prev.addEventListener('click', function () {
      if (result.currentPage > 1) goTo(result.currentPage - 1);
    });
    if (next) next.addEventListener('click', function () {
      if (result.currentPage < result.totalPages) goTo(result.currentPage + 1);
    });

    setTimeout(SE.translate, 50);
    return result.currentPage;
  }

  function renderCta() {
    // Same .proj-cta block as project-detail.js, so the CTA looks identical
    // on project, brand and home pages.
    const servicesHref = SE.prefix() + '/#services';
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
    return (
      '<div class="brand-not-found">' +
        '<h2 data-i18n="brand_not_found">Brand Not Found</h2>' +
        '<p data-i18n="brand_not_found_desc">The brand you are looking for does not exist or has been removed.</p>' +
        '<a href="' + SE.prefix() + '/brands.html" class="brand-hero-btn brand-hero-btn-primary" data-i18n="nav_brands">Brands</a>' +
      '</div>'
    );
  }

  function renderContent(brand, brandProducts) {
    return (
      '<div id="custom-brand-detail-container">' +
        renderBreadcrumbs(brand) +
        renderHero(brand, brandProducts) +
        renderAbout(brand) +
        renderChips(brandProducts) +
        renderProductsSection(brand, brandProducts) +
        renderCta() +
      '</div>'
    );
  }

  // ---------------- Mount ----------------

  function isBrandDetailPage(path) {
    return path.endsWith('/brand.html') || path.endsWith('/brand') || /\/brands\/[^/]+\.html$/.test(path);
  }

  SE.mount({
    id: 'custom-brand-detail-wrapper',
    isPage: isBrandDetailPage,
    html: '<div class="brand-loading"><div class="brand-loading-spinner"></div></div>',
    start: async function (wrap) {
      // The hero badges are dictionary templates ({year}, {count}): wait for
      // the dictionary too, or they could render in English first.
      const loaded = await Promise.all([
        fetchBrand(getBrandSlug()),
        SE.data.products(),
        SE.taxonomy.load(),
        SE.locale()
      ]);
      const brand = loaded[0];
      const productsIndex = loaded[1];
      dict = loaded[3];

      function render() {
        let brandProducts = [];
        if (!brand) {
          wrap.innerHTML = '<div id="custom-brand-detail-container">' + renderError() + '</div>';
        } else {
          updateMeta(brand);
          brandProducts = getBrandProducts(brand, productsIndex);
          wrap.innerHTML = renderContent(brand, brandProducts);
        }
        SE.linkTransitions(wrap);
        if (brand && brandProducts.length) updateProductsGrid(brandProducts, readPageFromURL());
        setTimeout(SE.translate, 50);
      }

      render();
      window.addEventListener('locationchange', function () {
        if (isBrandDetailPage(location.pathname || '/')) render();
      });
    }
  });
})();
