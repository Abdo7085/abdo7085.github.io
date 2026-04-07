/**
 * homepage-products.js
 * Injects a "Our Products" section into the homepage between Services and FAQ.
 */
(function() {
  // Featured product IDs — curated mix of brands and product types
  var FEATURED_IDS = [
    'eae-knx-rosa-switches',
    'eae-knx-td4-touch-panel',
    'shelly-1-gen3',
    'shelly-dimmer-gen3',
    'shelly-pro-4pm',
    'rg-eg105gw-t'
  ];

  // Page guard — only run on homepage
  function isHomepage() {
    var p = location.pathname || '/';
    return p === '/' || p === '/index.html'
      || p === '/fr' || p === '/fr/' || p === '/fr/index.html'
      || p === '/ar' || p === '/ar/' || p === '/ar/index.html';
  }

  function getLang() {
    return document.documentElement.lang || 'en';
  }

  function getLangPrefix() {
    var lang = getLang();
    if (lang === 'ar') return '/ar';
    if (lang === 'fr') return '/fr';
    return '';
  }

  function t(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    var lang = getLang();
    return obj[lang] || obj['en'] || obj['fr'] || obj['ar'] || '';
  }

  function buildSectionShell() {
    return '<section id="homepage-products-section" class="hp-products-section">'
      + '<div class="hp-products-inner">'
      + '<div class="hp-products-header">'
      + '<h2 class="hp-products-title" data-i18n="hp_products_title">Our Products</h2>'
      + '<p class="hp-products-subtitle" data-i18n="hp_products_subtitle">We sell and install premium smart home devices from leading brands.</p>'
      + '</div>'
      + '<div class="hp-products-grid" id="hp-products-grid"></div>'
      + '<div class="hp-products-cta">'
      + '<a href="' + getLangPrefix() + '/products.html" class="hp-products-btn" data-i18n="hp_products_browse">Browse All Products</a>'
      + '</div>'
      + '</div>'
      + '</section>';
  }

  function renderCard(product) {
    var title = t(product.title);
    var desc = t(product.short_description);
    var image = product.image || ((product.images && product.images.length > 0) ? product.images[0] : '');
    var prefix = getLangPrefix();
    var href = prefix + '/products/' + product.id + '.html';

    return '<a href="' + href + '" class="hp-product-card">'
      + '<div class="hp-product-card-img">'
      + '<img src="' + image + '" alt="' + title + '" loading="lazy" />'
      + '</div>'
      + '<div class="hp-product-card-body">'
      + '<span class="hp-product-card-brand">' + (product.brand || '') + '</span>'
      + '<h3 class="hp-product-card-title">' + title + '</h3>'
      + '<p class="hp-product-card-desc">' + desc + '</p>'
      + '</div>'
      + '</a>';
  }

  async function fetchProducts() {
    var paths = ['/data/products_index.json', '../data/products_index.json'];
    for (var i = 0; i < paths.length; i++) {
      try {
        var res = await fetch(paths[i]);
        if (res.ok) return await res.json();
      } catch(e) {}
    }
    return [];
  }

  var _cachedProducts = null;

  function inject() {
    // Already in DOM — nothing to do
    if (document.getElementById('homepage-products-section')) return true;

    // Find FAQ section to insert before it
    var faqTitle = document.querySelector('[data-i18n="spa_faq_title"]');
    if (!faqTitle) return false;
    var faqSection = faqTitle.closest('section') || faqTitle.closest('div.py-16');
    if (!faqSection) return false;

    // Create and insert section
    var wrapper = document.createElement('div');
    wrapper.innerHTML = buildSectionShell();
    var sectionEl = wrapper.firstElementChild;
    faqSection.parentNode.insertBefore(sectionEl, faqSection);

    // Fetch and render products (cache after first fetch)
    var loadProducts = _cachedProducts
      ? Promise.resolve(_cachedProducts)
      : fetchProducts().then(function(data) { _cachedProducts = data; return data; });

    loadProducts.then(function(allProducts) {
      var featured = FEATURED_IDS
        .map(function(id) { return allProducts.find(function(p) { return p.id === id; }); })
        .filter(Boolean);

      var grid = document.getElementById('hp-products-grid');
      if (grid && featured.length > 0) {
        grid.innerHTML = featured.map(renderCard).join('');
      }

      if (window.__site_i18n && window.__site_i18n.init) {
        setTimeout(function() { window.__site_i18n.init(); }, 100);
      }
    });

    return true;
  }

  // Persistent observer — keeps watching for React re-renders that wipe our section
  function startObserver() {
    var observer = new MutationObserver(function() {
      var existing = document.getElementById('homepage-products-section');
      if (!isHomepage()) {
        // Left the homepage (SPA navigation) — remove our injected section
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
        return;
      }
      // Re-inject if our section was removed by a React re-render
      if (!existing) {
        var faqTitle = document.querySelector('[data-i18n="spa_faq_title"]');
        if (faqTitle) inject();
      }
    });
    observer.observe(document.body || document.documentElement, {
      childList: true, subtree: true
    });
  }

  function check() {
    var existing = document.getElementById('homepage-products-section');
    if (!isHomepage()) {
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return;
    }
    if (!existing) inject();
  }

  // Keep retrying until the homepage FAQ exists (React may render async)
  function checkWithRetries() {
    var tries = 0;
    var max = 40; // ~6s
    var iv = setInterval(function() {
      tries++;
      check();
      if (document.getElementById('homepage-products-section') || !isHomepage() || tries >= max) {
        clearInterval(iv);
      }
    }, 150);
  }

  function hookHistory() {
    ['pushState', 'replaceState'].forEach(function(fn) {
      var orig = history[fn];
      history[fn] = function() {
        var r = orig.apply(this, arguments);
        checkWithRetries();
        return r;
      };
    });
    window.addEventListener('popstate', checkWithRetries);
  }

  function mount() {
    if (isHomepage()) inject();
    startObserver();
    hookHistory();
    // Safety net — poll every second forever
    setInterval(check, 1000);
    // Handle back/forward cache restore (bfcache) from static pages
    window.addEventListener('pageshow', checkWithRetries);
    // Intercept clicks on any in-app link to trigger a recheck
    document.addEventListener('click', function(e) {
      var a = e.target && e.target.closest && e.target.closest('a[href]');
      if (a) checkWithRetries();
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
