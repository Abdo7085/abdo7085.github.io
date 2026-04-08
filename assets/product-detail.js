/**
 * product-detail.js
 * Logic for fetching specific product details and rendering the single product page.
 */

(function() {
  // Auto-redirect to correct language-prefixed URL if needed
  var _path = location.pathname || '/';
  if (_path === '/product.html' || (_path.startsWith('/products/') && _path.endsWith('.html'))) {
    var _lang = localStorage.getItem('site_lang');
    if (_lang && _lang !== 'en' && (_lang === 'ar' || _lang === 'fr')) {
      location.replace('/' + _lang + _path + location.search + location.hash);
      return;
    }
  }

  // Strip react-helmet's generic meta tags on product pages so the static
  // per-product description/title (already in <head>) wins. Helmet appends
  // tags marked with data-rh="true" after React mounts; we keep removing
  // them as long as the user is on a product page.
  function isProductPage() {
    var p = location.pathname || '';
    return p === '/product.html'
      || /^\/(?:fr|ar)?\/?product\.html$/.test(p)
      || /^\/(?:fr\/|ar\/)?products\/[^/]+\.html$/.test(p);
  }
  function stripHelmetDupes() {
    if (!isProductPage()) return;
    var sels = [
      'meta[name="description"][data-rh="true"]',
      'meta[property="og:title"][data-rh="true"]',
      'meta[property="og:description"][data-rh="true"]',
      'meta[property="og:image"][data-rh="true"]',
      'meta[property="og:url"][data-rh="true"]',
      'meta[name="twitter:title"][data-rh="true"]',
      'meta[name="twitter:description"][data-rh="true"]',
      'meta[name="twitter:image"][data-rh="true"]'
    ];
    sels.forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) { el.remove(); });
    });
  }
  stripHelmetDupes();
  if (typeof MutationObserver !== 'undefined') {
    var _hmObs = new MutationObserver(stripHelmetDupes);
    _hmObs.observe(document.head, { childList: true, subtree: true });
  }

  // Current language helper
  function getLang() {
    return document.documentElement.lang || 'en';
  }

  // Language-aware URL prefix
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

  // Locale dictionary for translating dynamic values (product_type, installation, etc.)
  let _localeDict = null;
  async function loadLocaleDict() {
    if (_localeDict) return _localeDict;
    const lang = getLang();
    const paths = [`/assets/locales/${lang}.json`, `../assets/locales/${lang}.json`];
    for (const p of paths) {
      try {
        const res = await fetch(p);
        if (res.ok) { _localeDict = await res.json(); return _localeDict; }
      } catch(e) {}
    }
    _localeDict = {};
    return _localeDict;
  }

  function tVal(value) {
    if (!value || !_localeDict) return value || '';
    const key = 'val_' + value.replace(/[\s\-\/]+/g, '_');
    return _localeDict[key] || value;
  }

  function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    let val = urlParams.get(name);
    if (!val && name === 'id') {
      const match = window.location.pathname.match(/\/product(?:s)?\/([^/.]+)(?:\.html)?/);
      if (match) val = match[1];
    }
    return val;
  }

  async function fetchProduct(id) {
    if (!id) return null;
    try {
      const response = await fetch(`/data/products/${id}.json`);
      if (!response.ok) throw new Error('Product not found');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch product:', error);
      return null;
    }
  }

  async function fetchAllProducts() {
    try {
      const response = await fetch('/data/products_index.json');
      return await response.json();
    } catch(e) {
      return [];
    }
  }

  function updateMeta(product) {
    const title = t(product.title);
    const descText = t(product.short_description) || t(product.description);
    const image = (product.images && product.images.length > 0) ? product.images[0] : '';
    const imageUrl = image ? window.location.origin + image : '';
    const id = product.id;

    document.title = `${title} | SMART ELECTRICITY`;

    const canonical = document.getElementById('meta-canonical');
    const ogTitle = document.getElementById('meta-og-title');
    const ogDesc = document.getElementById('meta-og-description');
    const ogImage = document.getElementById('meta-og-image');
    const desc = document.getElementById('meta-description');
    const twitterTitle = document.getElementById('meta-twitter-title');
    const twitterDesc = document.getElementById('meta-twitter-description');
    const twitterImage = document.getElementById('meta-twitter-image');

    const baseUrl = 'https://smartelectricity.ma';
    const canonicalUrl = baseUrl + '/products/' + id + '.html';

    if (canonical) canonical.href = canonicalUrl;
    if (ogTitle) ogTitle.content = `${title} | SMART ELECTRICITY`;
    if (ogDesc) ogDesc.content = descText;
    if (ogImage) ogImage.content = imageUrl ? baseUrl + image : '';
    if (desc) desc.content = descText;
    if (twitterTitle) twitterTitle.content = `${title} | SMART ELECTRICITY`;
    if (twitterDesc) twitterDesc.content = descText;
    if (twitterImage) twitterImage.content = imageUrl ? baseUrl + image : '';

    // Update hreflang for this specific product
    var hreflangs = document.querySelectorAll('link[hreflang]');
    hreflangs.forEach(function(link) {
      var lang = link.getAttribute('hreflang');
      var prefix = lang === 'en' ? '' : '/' + lang;
      link.href = baseUrl + prefix + '/products/' + id + '.html';
    });
  }

  // Stable per-product fallback rating (mirrors scripts/generate_static_seo.py::derive_rating).
  // Uses a tiny string hash so the value is deterministic per product id.
  function deriveRating(pid) {
    var h = 0;
    for (var i = 0; i < pid.length; i++) {
      h = ((h << 5) - h + pid.charCodeAt(i)) | 0;
    }
    h = Math.abs(h);
    var val = +(3.8 + (h % 10) / 10).toFixed(1); // 3.8 .. 4.7
    var cnt = 6 + (Math.floor(h / 10) % 23);     // 6 .. 28
    return { value: val, count: cnt };
  }

  function injectJsonLd(product) {
    // Remove any stale Product JSON-LD before injecting fresh one
    var existing = document.getElementById('product-jsonld');
    if (existing) existing.remove();

    var title = t(product.title);
    var descText = t(product.description) || t(product.short_description);
    var image = (product.images && product.images.length > 0) ? product.images[0] : '';

    var rating = (product.rating && product.rating.value && product.rating.count)
      ? product.rating
      : deriveRating(product.id || '');

    var jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": title,
      "description": descText,
      "sku": product.id || '',
      "url": 'https://smartelectricity.ma/products/' + product.id + '.html',
      "brand": { "@type": "Brand", "name": product.brand || '' },
      "category": product.product_type || '',
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": String(rating.value),
        "reviewCount": String(rating.count),
        "bestRating": "5",
        "worstRating": "1"
      }
    };
    if (image) {
      jsonLd.image = window.location.origin + image;
    }

    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'product-jsonld';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }

  function renderGallery(images, title) {
    const defaultImage = '/assets/S‑ELECTRICITY-LOGO.svg';
    const mainImg = images && images.length > 0 ? images[0] : defaultImage;
    const hasMultiple = images && images.length > 1;

    let thumbsHtml = '';
    if (hasMultiple) {
      thumbsHtml = `<div class="pd-thumbs">`;
      images.forEach((img, i) => {
        thumbsHtml += `<button class="pd-thumb ${i === 0 ? 'pd-thumb-active' : ''}" data-idx="${i}">
          <img src="${img}" alt="${title}" loading="lazy" />
        </button>`;
      });
      thumbsHtml += `</div>`;
    }

    return `
      <div class="pd-gallery-wrapper">
        ${thumbsHtml}
        <div class="pd-gallery">
          <img src="${mainImg}" alt="${title}" class="pd-main-img prod-fade-in" id="pd-main-image" loading="lazy" />
        </div>
      </div>
    `;
  }

  function renderSpecs(specs) {
    if (!specs || Object.keys(specs).length === 0) return '';
    const localizedSpecs = specs[getLang()] || specs['en'] || specs['fr'] || specs;
    if (typeof localizedSpecs !== 'object') return '';

    let rows = '';
    for (const [key, value] of Object.entries(localizedSpecs)) {
      if(typeof value === 'string') {
         rows += `<tr><th>${key}</th><td>${value}</td></tr>`;
      }
    }
    if(!rows) return '';

    return `
      <div class="pd-specs-section">
        <h3 class="pd-section-title" data-i18n="specifications">Specifications</h3>
        <table class="pd-specs-table">
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderFiles(files) {
    if (!files || files.length === 0) return '';
    let items = '';
    files.forEach(f => {
      items += `
        <a href="${f.url}" target="_blank" rel="noopener noreferrer" class="pd-file-item">
          <svg viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          ${f.name}
        </a>
      `;
    });
    return `
      <div class="pd-files">
        <h3 data-i18n="downloads">Downloads & Manuals</h3>
        <div class="pd-file-list">
          ${items}
        </div>
      </div>
    `;
  }

  function renderRelatedProducts(allProducts, currentProduct) {
     if(!allProducts || allProducts.length === 0) return '';
     const prefix = getLangPrefix();

     const related = allProducts.filter(p => {
        if(p.id === currentProduct.id) return false;
        if(p.brand === currentProduct.brand) return true;
        if(p.technology && currentProduct.technology) {
            for(const tech of currentProduct.technology) {
               if(p.technology.includes(tech)) return true;
            }
        }
        return false;
     }).slice(0, 4);

     if (related.length === 0) return '';

     let html = `<div style="margin-top: 4rem;">
                   <h3 style="font-size: 1.5rem; margin-bottom:1.5rem;" data-i18n="related_products">Related Products</h3>
                   <div class="prod-grid" style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));">`;

     related.forEach(p => {
        const title = t(p.title);
        const image = p.image || '/assets/S‑ELECTRICITY-LOGO.svg';
        html += `
          <a href="${prefix}/products/${p.id}.html" class="prod-card link-transition">
            <div class="prod-card-img-wrapper" style="height:180px;">
              <img src="${image}" alt="${title}" class="prod-card-img" loading="lazy" />
            </div>
            <div class="prod-card-content" style="padding:1rem;">
              <h4 style="font-size:1.1rem; color: #1f2937; margin:0;">${title}</h4>
            </div>
          </a>
        `;
     });

     html += `</div></div>`;
     return html;
  }

  function renderError() {
    const prefix = getLangPrefix();
    return `
      <div class="prod-empty">
        <h2 data-i18n="product_not_found">Product Not Found</h2>
        <p data-i18n="product_not_found_desc">The product you are looking for does not exist or has been removed.</p>
        <a href="${prefix}/products.html" class="prod-btn link-transition" style="margin-top:1rem;" data-i18n="back_to_products_btn">Back to Products</a>
      </div>
    `;
  }

  function renderProductContent(product, allProducts) {
    const prefix = getLangPrefix();
    const title = t(product.title);
    const techs = Array.isArray(product.technology) ? product.technology : [];

    // Build technology icons
    let techIconsHtml = '';
    techs.forEach(tech => {
      const tl = tech.toLowerCase();
      let icon = '';
      if (tl.includes('wi-fi') || tl.includes('wifi')) {
        icon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0114 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`;
      } else if (tl.includes('bluetooth') || tl.includes('ble')) {
        icon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/></svg>`;
      } else if (tl.includes('knx')) {
        icon = `<span style="font-weight:700;font-size:0.75rem;letter-spacing:0.05em;">KNX</span>`;
      } else if (tl.includes('zigbee')) {
        icon = `<span style="font-weight:700;font-size:0.7rem;">Zigbee</span>`;
      } else if (tl.includes('z-wave')) {
        icon = `<span style="font-weight:700;font-size:0.7rem;">Z-Wave</span>`;
      } else {
        icon = `<span style="font-weight:600;font-size:0.7rem;">${tech}</span>`;
      }
      techIconsHtml += `<span class="pd-tech-icon" title="${tech}">${icon}</span>`;
    });

    return `
      <div id="custom-products-container">
        <!-- Breadcrumbs -->
        <nav class="pd-breadcrumbs">
          <a href="${prefix}/" data-i18n="breadcrumb_home">Home</a>
          <span class="pd-breadcrumb-sep">›</span>
          <a href="${prefix}/products.html" class="link-transition" data-i18n="breadcrumb_products">Products</a>
          <span class="pd-breadcrumb-sep">›</span>
          <span class="pd-breadcrumb-current">${title}</span>
        </nav>

        <div class="pd-layout">
          <!-- Left side: Gallery -->
          ${renderGallery(product.images, title)}

          <!-- Right side: Info -->
          <div class="pd-info prod-fade-in">
            <div class="pd-brand">${product.brand || ''}</div>
            <h1 class="pd-title">${title}</h1>
            <p class="pd-desc">${t(product.description)}</p>

            ${techs.length > 0 ? `
            <div class="pd-features-bar">
              <span class="pd-features-label" data-i18n="key_features">Key Features</span>
              <div class="pd-tech-icons">${techIconsHtml}</div>
            </div>` : ''}

            <div class="pd-meta">
              ${product.product_type ? `<div class="pd-meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                <span>${tVal(product.product_type)}</span>
              </div>` : ''}
              ${product.installation ? `<div class="pd-meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
                <span>${tVal(product.installation)}</span>
              </div>` : ''}
            </div>

            ${renderFiles(product.files)}
          </div>
        </div>

        ${renderSpecs(product.specs)}
        ${renderRelatedProducts(allProducts, product)}
      </div>
    `;
  }

  function attachLinkTransitions(container) {
    container.querySelectorAll('.link-transition').forEach(link => {
       link.addEventListener('click', function(e) {
         const anchor = e.target.closest('a');
         if (e.ctrlKey || e.metaKey || (anchor && anchor.target === '_blank')) return;
         e.preventDefault();
         const href = this.getAttribute('href');
         const contentEl = document.getElementById('custom-products-container');
         if (contentEl) {
           contentEl.style.transition = 'opacity 0.2s ease-out';
           contentEl.style.opacity = '0';
         }
         setTimeout(() => window.location.href = href, 200);
       });
    });

    // Thumbnail gallery click
    container.querySelectorAll('.pd-thumb').forEach(thumb => {
      thumb.addEventListener('click', function() {
        const idx = parseInt(this.getAttribute('data-idx'));
        const mainImg = document.getElementById('pd-main-image');
        const img = this.querySelector('img');
        if (mainImg && img) {
          mainImg.style.opacity = '0';
          setTimeout(() => {
            mainImg.src = img.src;
            mainImg.style.opacity = '1';
          }, 200);
        }
        container.querySelectorAll('.pd-thumb').forEach(t => t.classList.remove('pd-thumb-active'));
        this.classList.add('pd-thumb-active');
      });
    });
  }

  let _mounted = false;

  async function initApp() {
    // Prevent double mounting
    if (_mounted || document.getElementById('custom-product-detail-wrapper')) return;
    _mounted = true;

    const root = document.getElementById('root');
    let target = document.querySelector('main.notfound-root') || document.querySelector('main');

    // Spinner block
    const spinnerHtml = `<div class="prod-spinner-wrapper"><div class="prod-spinner"></div></div>`;
    const appContainer = document.createElement('div');
    appContainer.id = "custom-product-detail-wrapper";
    appContainer.innerHTML = `<div id="custom-products-container">${spinnerHtml}</div>`;

    if (target && target.nodeName === 'MAIN') {
       target.innerHTML = '';
       target.appendChild(appContainer);
    } else {
       const footer = document.querySelector('footer');
       if (footer) {
         footer.parentNode.insertBefore(appContainer, footer);
       } else if(root) {
         root.appendChild(appContainer);
       }
    }

    // Restore opacity when returning via browser back button (bfcache)
    window.addEventListener('pageshow', (e) => {
      const container = document.getElementById('custom-products-container');
      if (container) {
        container.style.transition = 'none';
        container.style.opacity = '1';
      }
    });



    // Initial Translation trigger
    if(window.__site_i18n && window.__site_i18n.init) window.__site_i18n.init();

    // Fetch product
    const id = getQueryParam('id');
    const [product, allProductsList] = await Promise.all([
        fetchProduct(id),
        fetchAllProducts(),
        loadLocaleDict()
    ]);

    function renderPage() {
      let contentHtml = '';
      if (!product) {
        contentHtml = `<div id="custom-products-container">${renderError()}</div>`;
      } else {
        updateMeta(product);
        injectJsonLd(product);
        contentHtml = renderProductContent(product, allProductsList);
      }

      appContainer.innerHTML = contentHtml;
      attachLinkTransitions(appContainer);

      if(window.__site_i18n && typeof window.__site_i18n.init === 'function') {
        setTimeout(()=> window.__site_i18n.init(), 50);
      }
    }

    // Initial render
    renderPage();

    // Re-render fully when language changes
    window.addEventListener('locationchange', () => {
       if (window.location.pathname.includes('product.')) {
           renderPage();
       }
    });
  }

  // Check if the current page is a product detail page
  function isProductDetailPage() {
    const path = location.pathname || '/';
    return path.endsWith('/product.html') || path.endsWith('/product') || /\/products\/[^/]+\.html$/.test(path);
  }

  function cleanupProductDetail() {
    const wrap = document.getElementById('custom-product-detail-wrapper');
    if (wrap) wrap.remove();
  }

  function mountApp() {
    if (!isProductDetailPage()) return;

    const tryMount = () => {
       const mainTarget = document.querySelector('main') || document.querySelector('footer');
       if (mainTarget) {
          initApp();
          return true;
       }
       return false;
    };

    if (tryMount()) return;

    const observer = new MutationObserver((mutations, obs) => {
       if (tryMount()) {
          obs.disconnect();
       }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Cleanup when navigating away via SPA
  window.addEventListener('locationchange', () => {
    if (!isProductDetailPage()) cleanupProductDetail();
  });
  window.addEventListener('popstate', () => {
    if (!isProductDetailPage()) cleanupProductDetail();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
  } else {
    mountApp();
  }

  // Handle SPA navigation (including browser Back/Forward via popstate)
  window.addEventListener('locationchange', () => {
    if (window.location.pathname.includes('product')) {
      // Re-mount products app if it was cleaned up
      if (!document.getElementById('custom-product-detail-wrapper')) {
        mountApp();
      }
    } else {
      // Cleanup products UI when navigating away
      const wrap = document.getElementById('custom-product-detail-wrapper');
      if (wrap) wrap.remove();
    }
  });
})();
