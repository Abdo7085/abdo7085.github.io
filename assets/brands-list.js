/**
 * brands-list.js
 * Renders the /brands.html page — a grid of brand cards from
 * data/brands_index.json. Mounting, language and data loading come from
 * assets/site-core.js (SE); the language redirect of /brands.html lives in
 * assets/i18n.js with the other unprefixed pages.
 */

(function () {
  'use strict';

  const t = SE.t;
  const escapeHtml = SE.escapeHtml;
  let dict = null;   // the page language's dictionary, loaded before rendering

  // Right-arrow chevron used in the card footer
  const ARROW_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

  function renderCard(brand) {
    const href = SE.prefix() + '/brands/' + brand.id + '.html';
    const name = escapeHtml(brand.brand || '');
    const tagline = escapeHtml(t(brand.tagline));
    const count = brand.product_count || 0;
    const countLabel = SE.msg('brand_products_count', '', dict).replace('{count}', count) || (count + ' products');

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

  function renderPage(brands) {
    const cards = brands.map(renderCard).join('');
    return (
      '<div id="custom-brands-container">' +
        '<nav class="brand-breadcrumbs" aria-label="Breadcrumb">' +
          '<a href="' + SE.prefix() + '/" data-i18n="breadcrumb_home">Home</a>' +
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

  // /brands, /brands.html, /fr/brands.html, /ar/brands.html — not
  // /brands/<slug>.html (brand-detail.js).
  function isBrandsListPage(path) {
    return /^\/(?:fr\/|ar\/)?brands(?:\.html)?$/.test(path);
  }

  SE.mount({
    id: 'custom-brands-root-wrapper',
    isPage: isBrandsListPage,
    html: '<div class="brand-loading"><div class="brand-loading-spinner"></div></div>',
    start: async function (wrap) {
      // The count label is a dictionary template ({count}), so wait for the
      // dictionary too — rendering first used to show the bare "36 products".
      const loaded = await Promise.all([SE.data.brands(), SE.locale()]);
      const brands = loaded[0];
      dict = loaded[1];
      function render() {
        wrap.innerHTML = renderPage(brands);
        SE.translate();
      }
      render();
      window.addEventListener('locationchange', function () {
        if (isBrandsListPage(location.pathname || '/')) render();
      });
    }
  });
})();
