/**
 * brands-list.js
 * Renders the /brands.html catalog page — a grid of brand cards.
 * Mirrors products.js architecture:
 *   - Auto-redirects to the language-prefixed URL if needed.
 *   - Fetches data/brands_index.json.
 *   - Mounts a #custom-brands-root-wrapper into #root once the SPA shell exists.
 *   - Re-mounts / cleans up on SPA navigation via the locationchange event.
 */

(function() {
  // Auto-redirect to the correct language-prefixed URL if the user's last
  // chosen language is non-English and they landed on the unprefixed page.
  var _path = location.pathname || '/';
  if (_path === '/brands.html') {
    var _lang = localStorage.getItem('site_lang');
    if (_lang && _lang !== 'en' && (_lang === 'ar' || _lang === 'fr')) {
      location.replace('/' + _lang + _path + location.search + location.hash);
      return;
    }
  }

  const INDEX_URL = '/data/brands_index.json';
  let allBrands = [];

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

  async function fetchBrands() {
    try {
      const res = await fetch(INDEX_URL);
      if (!res.ok) throw new Error('Network error');
      return await res.json();
    } catch (e) {
      console.error('Failed to fetch brands index:', e);
      return [];
    }
  }

  // Right-arrow chevron used in card footer + breadcrumb separator
  const ARROW_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

  function renderCard(brand) {
    const prefix = getLangPrefix();
    const href = prefix + '/brands/' + brand.id + '.html';
    const name = escapeHtml(brand.brand || '');
    const tagline = escapeHtml(t(brand.tagline));
    const count = brand.product_count || 0;
    const countLabel = (window.__site_i18n_dict && window.__site_i18n_dict.brand_products_count)
      ? window.__site_i18n_dict.brand_products_count.replace('{count}', count)
      : (count + ' products');

    const logoArea = brand.logo
      ? '<img src="' + escapeHtml(brand.logo) + '" alt="' + name + ' logo" loading="lazy" />'
      : '<div class="brand-card-name-fallback">' + name + '</div>';

    return (
      '<a href="' + href + '" class="brand-card">' +
        '<div class="brand-card-logo-area">' + logoArea + '</div>' +
        '<div class="brand-card-content">' +
          '<h3 class="brand-card-name">' + name + '</h3>' +
          '<p class="brand-card-tagline">' + tagline + '</p>' +
          '<div class="brand-card-footer">' +
            '<span class="brand-card-count" data-product-count="' + count + '">' +
              escapeHtml(countLabel) +
            '</span>' +
            '<span class="brand-card-arrow" aria-hidden="true">' + ARROW_SVG + '</span>' +
          '</div>' +
        '</div>' +
      '</a>'
    );
  }

  function renderPage() {
    const prefix = getLangPrefix();
    const cards = allBrands.map(renderCard).join('');

    return (
      '<div id="custom-brands-container">' +
        '<nav class="brand-breadcrumbs" aria-label="Breadcrumb">' +
          '<a href="' + prefix + '/" data-i18n="breadcrumb_home">Home</a>' +
          '<span class="brand-breadcrumb-sep">›</span>' +
          '<span class="brand-breadcrumb-current" data-i18n="nav_brands">Brands</span>' +
        '</nav>' +
        '<section class="brands-hero">' +
          '<div class="brands-hero-content">' +
            '<h1 class="brands-hero-title" data-i18n="brands_hero_title">Our Trusted Partners</h1>' +
            '<p class="brands-hero-subtitle" data-i18n="brands_hero_subtitle">World-class brands we proudly partner with to deliver premium smart-living solutions for Moroccan homes and businesses.</p>' +
          '</div>' +
        '</section>' +
        (cards ? ('<div class="brands-grid">' + cards + '</div>')
               : '<div class="brand-no-products" data-i18n="brands_empty">No brands available yet.</div>') +
      '</div>'
    );
  }

  let _mounted = false;

  async function initApp() {
    if (_mounted || document.getElementById('custom-brands-root-wrapper')) return;
    _mounted = true;

    const appContainer = document.createElement('div');
    appContainer.id = 'custom-brands-root-wrapper';
    appContainer.innerHTML = '<div class="brand-loading"><div class="brand-loading-spinner"></div></div>';

    const root = document.getElementById('root');
    const target = document.querySelector('main.notfound-root') || document.querySelector('main');

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

    allBrands = await fetchBrands();
    appContainer.innerHTML = renderPage();

    if (window.__site_i18n && window.__site_i18n.init) window.__site_i18n.init();

    window.addEventListener('locationchange', function() {
      if (isBrandsListPage()) {
        appContainer.innerHTML = renderPage();
        if (window.__site_i18n && window.__site_i18n.init) window.__site_i18n.init();
      }
    });
  }

  function isBrandsListPage() {
    const path = location.pathname || '/';
    // Matches /brands, /brands.html, /fr/brands.html, /ar/brands.html — but NOT
    // /brands/<slug>.html (that's brand-detail.js's territory).
    return /^\/(?:fr\/|ar\/)?brands(?:\.html)?$/.test(path);
  }

  function cleanupBrandsList() {
    const wrap = document.getElementById('custom-brands-root-wrapper');
    if (wrap) wrap.remove();
    _mounted = false;
  }

  function mountApp() {
    if (!isBrandsListPage()) return;

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
    if (!isBrandsListPage()) cleanupBrandsList();
    else if (!document.getElementById('custom-brands-root-wrapper')) mountApp();
  });
  window.addEventListener('popstate', function() {
    if (!isBrandsListPage()) cleanupBrandsList();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
  } else {
    mountApp();
  }
})();
