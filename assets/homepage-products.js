/**
 * homepage-products.js
 * Injects a "Our Products" section into the homepage between Services and FAQ.
 */
(function() {
  // Daily-seeded RNG so the selection is stable for the whole day.
  function dailyRng() {
    var d = new Date();
    var seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return function() {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
  }

  // Pick featured products daily: aim for TARGET cards, at most MAX_PER_BRAND per brand.
  var TARGET = 6;
  var MAX_PER_BRAND = 2;
  function pickFeatured(allProducts) {
    var rng = dailyRng();
    var byBrand = {};
    for (var i = 0; i < allProducts.length; i++) {
      var p = allProducts[i];
      var b = p.brand || 'Other';
      if (!byBrand[b]) byBrand[b] = [];
      byBrand[b].push(p);
    }
    // Shuffle each brand's list so picks are random within the brand.
    Object.keys(byBrand).forEach(function(b) {
      var list = byBrand[b];
      for (var j = list.length - 1; j > 0; j--) {
        var k = Math.floor(rng() * (j + 1));
        var tmp = list[j]; list[j] = list[k]; list[k] = tmp;
      }
    });
    // Round-robin up to MAX_PER_BRAND passes, until we reach TARGET.
    var picks = [];
    var brands = Object.keys(byBrand).sort();
    for (var pass = 0; pass < MAX_PER_BRAND && picks.length < TARGET; pass++) {
      for (var bi = 0; bi < brands.length && picks.length < TARGET; bi++) {
        var list2 = byBrand[brands[bi]];
        if (list2.length > pass) picks.push(list2[pass]);
      }
    }
    // Final shuffle of the picked order.
    for (var j2 = picks.length - 1; j2 > 0; j2--) {
      var k2 = Math.floor(rng() * (j2 + 1));
      var tmp2 = picks[j2]; picks[j2] = picks[k2]; picks[k2] = tmp2;
    }
    return picks;
  }

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
      var featured = pickFeatured(allProducts);

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

  // MutationObserver is only active while on the homepage, to catch React
  // re-renders that wipe our injected section. Disconnected on nav away.
  var _observer = null;
  function startObserver() {
    if (_observer) return;
    _observer = new MutationObserver(function() {
      if (!isHomepage()) { stopObserver(); return; }
      if (!document.getElementById('homepage-products-section')) inject();
    });
    _observer.observe(document.body || document.documentElement, {
      childList: true, subtree: true
    });
  }
  function stopObserver() {
    if (_observer) { _observer.disconnect(); _observer = null; }
    var existing = document.getElementById('homepage-products-section');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  }

  // Bounded retry — polls every 150ms for up to ~6s, then stops.
  function activateHomepage() {
    if (!isHomepage()) { stopObserver(); return; }
    startObserver();
    if (document.getElementById('homepage-products-section')) return;
    var tries = 0;
    var iv = setInterval(function() {
      tries++;
      if (!isHomepage() || document.getElementById('homepage-products-section') || tries >= 40) {
        clearInterval(iv);
        return;
      }
      inject();
    }, 150);
  }

  function hookHistory() {
    ['pushState', 'replaceState'].forEach(function(fn) {
      var orig = history[fn];
      history[fn] = function() {
        var r = orig.apply(this, arguments);
        activateHomepage();
        return r;
      };
    });
    window.addEventListener('popstate', activateHomepage);
    window.addEventListener('pageshow', activateHomepage);
  }

  function mount() {
    activateHomepage();
    hookHistory();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
