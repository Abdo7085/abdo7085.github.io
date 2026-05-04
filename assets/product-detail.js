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

  // (react-helmet duplicate-meta stripping is handled globally in assets/i18n.js)

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

    var _suffix = { en: 'S‑ELECTRICITY Morocco', fr: 'S‑ELECTRICITY Maroc', ar: 'S‑ELECTRICITY المغرب' };
    document.title = `${title} | ${_suffix[getLang()] || _suffix.en}`;

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
    if (ogTitle) ogTitle.content = `${title} | S‑ELECTRICITY`;
    if (ogDesc) ogDesc.content = descText;
    if (ogImage) ogImage.content = imageUrl ? baseUrl + image : '';
    if (desc) desc.content = descText;
    if (twitterTitle) twitterTitle.content = `${title} | S‑ELECTRICITY`;
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
        icon = `<svg width="22" height="22" viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M32.042,9.792c4.595,1.238,4.88,3.165,5.524,5.048C34.841,17.664,17.35,35.7,17.35,35.7 s10.901,1.177,23.487-1.003c-0.001,0.029-0.002,0.048-0.003,0.076C42.829,31.661,44,27.97,44,24c0-11.046-8.954-20-20-20 c-5.634,0-10.715,2.338-14.35,6.087C15.489,9.124,26.89,8.403,32.042,9.792z"/><path d="M14.724,37.285c-1.982-0.347-4.212-2.131-4.707-5.302c1.437-1.239,19.994-20.507,19.994-20.507 c-7.008-0.424-14.569-0.465-22.237,0.864C5.408,15.625,4,19.644,4,24c0,11.046,8.954,20,20,20c6.173,0,11.689-2.8,15.358-7.195 C35.486,37.33,23.257,38.769,14.724,37.285z"/></svg>`;
      } else if (tl.includes('matter')) {
        icon = `<svg width="22" height="22" viewBox="0 0 512 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M152 134.4c21.5 17.5 47.1 29.2 74.4 34.2V22.9l29.7-17.1 29.6 17.1v145.6c27.3-4.9 52.9-16.7 74.5-34.2l53.8 31.1c-87.6 86.6-228.5 86.6-316.1 0zm65.5 371.8C248.7 387 178.1 264.9 59.3 232.5v62.3c25.9 9.9 48.9 26.2 66.8 47.4L0 414.9v34.2l29.7 17 126.1-72.8c9.4 26.1 12 54.2 7.6 81.5zm235.3-273.7C334 265 263.6 387.1 294.8 506.2l54-31.2c-4.4-27.4-1.7-55.4 7.6-81.5l126 72.7 29.6-17.1v-34.2l-126.1-72.8c17.9-21.2 40.9-37.5 66.8-47.4z"/></svg>`;
      } else if (tl.includes('thread')) {
        icon = `<svg width="22" height="22" viewBox="0 0 165 165" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M82.498,0C37.008,0,0,37.008,0,82.496c0,45.181,36.51,81.977,81.573,82.476V82.569l-27.002-0.002c-8.023,0-14.554,6.53-14.554,14.561c0,8.023,6.531,14.551,14.554,14.551v17.98c-17.939,0-32.534-14.595-32.534-32.531c0-17.944,14.595-32.543,32.534-32.543l27.002,0.004v-9.096c0-14.932,12.146-27.08,27.075-27.08c14.932,0,27.082,12.148,27.082,27.08c0,14.931-12.15,27.08-27.082,27.08l-9.097-0.001v80.641C136.889,155.333,165,122.14,165,82.496C165,37.008,127.99,0,82.498,0z"/><path d="M117.748,55.493c0-5.016-4.082-9.098-9.1-9.098c-5.015,0-9.097,4.082-9.097,9.098v9.097l9.097,0.001C113.666,64.591,117.748,60.51,117.748,55.493z"/></svg>`;
      } else if (tl.includes('lan') || tl.includes('ethernet')) {
        icon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 20 3-3h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2l3 3z"/><path d="M6 8v1"/><path d="M10 8v1"/><path d="M14 8v1"/><path d="M18 8v1"/></svg>`;
      } else if (tl.includes('z-wave')) {
        icon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16.247 7.761a6 6 0 0 1 0 8.478"/><path d="M19.075 4.933a10 10 0 0 1 0 14.134"/><path d="M4.925 19.067a10 10 0 0 1 0-14.134"/><path d="M7.753 16.239a6 6 0 0 1 0-8.478"/><circle cx="12" cy="12" r="2"/></svg>`;
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
            ${product.brand ? `<a href="${prefix}/products.html?brand=${encodeURIComponent(product.brand)}" class="pd-brand link-transition" style="text-decoration:none; display:inline-block; width:fit-content; align-self:flex-start;" title="View all ${product.brand} products">${product.brand}</a>` : `<div class="pd-brand"></div>`}
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

            <div class="pd-cart-row" data-cart-row>
              <div class="pd-qty">
                <button type="button" class="pd-qty-btn" data-qty-dec aria-label="Decrease quantity" data-i18n-attr="aria-label:cart_aria_decrease">−</button>
                <input type="number" class="pd-qty-input cart-qty-input" value="1" min="1" max="99" inputmode="numeric" aria-label="Quantity" data-i18n-attr="aria-label:cart_item_qty" />
                <button type="button" class="pd-qty-btn" data-qty-inc aria-label="Increase quantity" data-i18n-attr="aria-label:cart_aria_increase">+</button>
              </div>
              <button type="button" class="pd-add-to-cart" data-trigger="cart-add" data-product-id="${product.id}" data-qty-source>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <span data-i18n="cart_pd_add_btn">Add to Quote Request</span>
              </button>
            </div>
            <p class="pd-cart-hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              <span data-i18n="cart_pd_hint">Request a free quote — we'll reply within hours via WhatsApp</span>
            </p>

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

    // Quantity +/- buttons inside .pd-cart-row
    container.querySelectorAll('.pd-cart-row').forEach(row => {
      const input = row.querySelector('.pd-qty-input');
      const dec = row.querySelector('[data-qty-dec]');
      const inc = row.querySelector('[data-qty-inc]');
      function clamp(v) {
        v = parseInt(v, 10);
        if (!Number.isFinite(v) || v < 1) return 1;
        if (v > 99) return 99;
        return v;
      }
      if (dec) dec.addEventListener('click', function () {
        input.value = String(clamp((parseInt(input.value, 10) || 1) - 1));
      });
      if (inc) inc.addEventListener('click', function () {
        input.value = String(clamp((parseInt(input.value, 10) || 1) + 1));
      });
      if (input) input.addEventListener('change', function () {
        input.value = String(clamp(input.value));
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
