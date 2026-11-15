/**
 * product-detail.js
 * Renders a single product page (/products/<id>.html, or the bare template
 * product.html?id=…) inside the SPA layout. Mounting, language, product
 * cards, link transitions and data loading come from assets/site-core.js
 * (SE); the language redirect of unprefixed pages lives in assets/i18n.js.
 */

(function() {
  'use strict';

  const getLang = SE.lang;
  const getLangPrefix = SE.prefix;
  const t = SE.t;

  function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    let val = urlParams.get(name);
    if (!val && name === 'id') {
      const match = window.location.pathname.match(/\/product(?:s)?\/([^/.]+)(?:\.html)?/);
      if (match) val = match[1];
    }
    return val;
  }

  function fetchProduct(id) {
    return id ? SE.data.json(`/data/products/${id}.json`, null) : Promise.resolve(null);
  }

  // The product's images (descriptors from data/product_images.json),
  // primary first. Falls back to the catalog entry's primary image if the
  // gallery file could not be read.
  let gallery = [];

  const HOST = 'https://smartelectricity.ma';

  // <head> for the bare template; generated pages already carry these tags
  // (the share card stays, the hreflang set is rewritten to the same values).
  function updateMeta(product) {
    const title = t(product.title);
    const descText = t(product.short_description) || t(product.description);
    const image = gallery.length ? SE.img.largest(gallery[0]) : '';
    const path = '/products/' + product.id + '.html';

    SE.meta.title(title);
    SE.meta.set('meta-canonical', HOST + getLangPrefix() + path);
    SE.meta.set('meta-description', descText);
    SE.meta.set('meta-og-title', `${title} | S‑ELECTRICITY`);
    SE.meta.set('meta-og-description', descText);
    SE.meta.fill('meta-og-image', image && HOST + image);
    SE.meta.set('meta-twitter-title', `${title} | S‑ELECTRICITY`);
    SE.meta.set('meta-twitter-description', descText);
    SE.meta.fill('meta-twitter-image', image && HOST + image);
    SE.meta.hreflang(path);
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

  // Product JSON-LD for the bare template only. Generated pages carry the
  // build's own block (#product-jsonld, with the page's language URL), which
  // this must not replace.
  function injectJsonLd(product) {
    if (document.getElementById('product-jsonld')) return;

    var title = t(product.title);
    var descText = t(product.description) || t(product.short_description);
    var image = gallery.length ? SE.img.largest(gallery[0]) : '';

    var rating = (product.rating && product.rating.value && product.rating.count)
      ? product.rating
      : deriveRating(product.id || '');

    var jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": title,
      "description": descText,
      "sku": product.id || '',
      "url": HOST + getLangPrefix() + '/products/' + product.id + '.html',
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

  // images: descriptors from data/product_images.json, primary first.
  // The main image is the page's largest element, so it loads first (eager,
  // high priority); thumbnails and everything else stay lazy.
  function renderGallery(images, title) {
    const hasMultiple = images.length > 1;

    let thumbsHtml = '';
    if (hasMultiple) {
      thumbsHtml = `<div class="pd-thumbs">`;
      images.forEach((img, i) => {
        thumbsHtml += `<button class="pd-thumb ${i === 0 ? 'pd-thumb-active' : ''}" data-idx="${i}">
          ${SE.img(img, { box: 'thumb', alt: title })}
        </button>`;
      });
      thumbsHtml += `</div>`;
    }

    return `
      <div class="pd-gallery-wrapper">
        ${thumbsHtml}
        <div class="pd-gallery">
          ${SE.img(images[0], { box: 'main', alt: title, cls: 'pd-main-img prod-fade-in', id: 'pd-main-image', priority: true })}
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
        <h3 class="pd-block-label" data-i18n="specifications">Specifications</h3>
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          ${f.name}
        </a>
      `;
    });
    return `
      <div class="pd-files">
        <h3 class="pd-block-label" data-i18n="downloads">Downloads & Manuals</h3>
        <div class="pd-file-list">
          ${items}
        </div>
      </div>
    `;
  }

  function renderRelatedProducts(allProducts, currentProduct) {
     if(!allProducts || allProducts.length === 0) return '';

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

     let html = `<div class="pd-related">
                   <h3 class="pd-related-title" data-i18n="related_products">Related Products</h3>
                   <div class="prod-grid" style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));">`;

     html += related.map(p => SE.productCard(p, 'related')).join('');
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

    // Feature cells (preview .feature-bar): label + value plates.
    // Protocols cell reuses the shared icon dictionary (SE.protoMarkup, site-core.js);
    // Installation cell shows the translated installation value.
    const protoCell = techs.length ? `
      <div class="pd-feature">
        <span class="pd-feature-label" data-i18n="pd_protocols">Protocols</span>
        <div class="pd-feature-protos">${techs.map(SE.protoMarkup).join('')}</div>
      </div>` : '';
    const installCell = product.installation ? `
      <div class="pd-feature">
        <span class="pd-feature-label" data-i18n="pd_installation">Installation</span>
        <b class="pd-feature-value">${SE.escapeHtml(SE.taxonomy.label('installation', product.installation))}</b>
      </div>` : '';
    const featureBar = (protoCell || installCell)
      ? `<div class="pd-feature-bar">${protoCell}${installCell}</div>`
      : '';

    // Eyebrow: "Brand / Type" — brand stays a link to its brand page
    const brandSlugLink = product.brand
      ? `<a href="${prefix}/brands/${SE.brandSlug(product.brand)}.html" class="pd-brand-link link-transition" title="About ${SE.escapeHtml(product.brand)}">${SE.escapeHtml(product.brand)}</a>`
      : '';
    const typeLabel = product.product_type
      ? `<span class="pd-eyebrow-type">${SE.escapeHtml(SE.taxonomy.label('type', product.product_type))}</span>`
      : '';
    const eyebrow = (brandSlugLink || typeLabel)
      ? `<div class="pd-eyebrow">${brandSlugLink}${brandSlugLink && typeLabel ? '<span class="pd-eyebrow-sep" aria-hidden="true">/</span>' : ''}${typeLabel}</div>`
      : '';

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
          ${renderGallery(gallery, title)}

          <!-- Right side: Info -->
          <div class="pd-info prod-fade-in">
            ${eyebrow}
            <h1 class="pd-title">${title}</h1>
            <p class="pd-desc">${t(product.description)}</p>

            ${featureBar}

            <div class="pd-quote-group">
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
            </div>

            ${renderFiles(product.files)}
          </div>
        </div>

        ${renderSpecs(product.specs)}
        ${renderRelatedProducts(allProducts, product)}
      </div>
    `;
  }

  // Links, quantity buttons and gallery thumbnails of a freshly rendered page.
  function wireInteractions(container) {
    SE.linkTransitions(container, '.link-transition');

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
        if (mainImg && gallery[idx]) {
          mainImg.style.opacity = '0';
          setTimeout(() => {
            SE.img.set(mainImg, gallery[idx], 'main');
            mainImg.classList.toggle('pd-main-img-fill', idx !== 0);
            const frame = mainImg.closest('.pd-gallery');
            if (frame) frame.style.padding = idx !== 0 ? '0.3rem' : '';
            mainImg.style.opacity = '1';
          }, 200);
        }
        container.querySelectorAll('.pd-thumb').forEach(t => t.classList.remove('pd-thumb-active'));
        this.classList.add('pd-thumb-active');
      });
    });
  }

  function isProductDetailPage(path) {
    return path.endsWith('/product.html') || path.endsWith('/product') || /\/products\/[^/]+\.html$/.test(path);
  }

  SE.mount({
    id: 'custom-product-detail-wrapper',
    isPage: isProductDetailPage,
    html: '<div id="custom-products-container"><div class="prod-spinner-wrapper"><div class="prod-spinner"></div></div></div>',
    start: async function (wrap) {
      const [product, allProductsList, galleries] = await Promise.all([
        fetchProduct(getQueryParam('id')),
        SE.data.products(),
        SE.data.galleries(),
        SE.taxonomy.load()
      ]);
      if (product) {
        const entry = allProductsList.find(p => p.id === product.id);
        gallery = galleries[product.id] || (entry && entry.image ? [entry.image] : []);
        if (!gallery.length) gallery = [''];   // SE.img draws the logo
      }

      function render() {
        if (!product) {
          wrap.innerHTML = `<div id="custom-products-container">${renderError()}</div>`;
        } else {
          updateMeta(product);
          injectJsonLd(product);
          wrap.innerHTML = renderProductContent(product, allProductsList);
        }
        wireInteractions(wrap);
        setTimeout(SE.translate, 50);
      }

      render();
      // The bare template re-renders when the SPA changes its URL (language switch).
      window.addEventListener('locationchange', () => {
        if (location.pathname.includes('product.')) render();
      });
    }
  });
})();
