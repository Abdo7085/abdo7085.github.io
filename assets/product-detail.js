/**
 * product-detail.js
 * Logic for fetching specific product details and rendering the single product page.
 */

(function() {
  // Auto-redirect to correct language-prefixed URL if needed
  var _path = location.pathname || '/';
  if (_path === '/product.html') {
    var _lang = localStorage.getItem('site_lang');
    if (_lang && _lang !== 'en' && (_lang === 'ar' || _lang === 'fr')) {
      location.replace('/' + _lang + _path + location.search + location.hash);
      return;
    }
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

  function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
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

    document.title = `${title} | SMART ELECTRICITY`;
    const canonical = document.getElementById('meta-canonical');
    const ogTitle = document.getElementById('meta-og-title');
    const ogDesc = document.getElementById('meta-og-description');
    const desc = document.getElementById('meta-description');

    if (canonical) canonical.href = window.location.href;
    if (ogTitle) ogTitle.content = `${title} | SMART ELECTRICITY`;
    if (ogDesc) ogDesc.content = descText;
    if (desc) desc.content = descText;
  }

  function injectJsonLd(product) {
    // Remove any existing JSON-LD for product
    const existing = document.getElementById('product-jsonld');
    if (existing) existing.remove();

    const title = t(product.title);
    const descText = t(product.short_description) || t(product.description);
    const image = (product.images && product.images.length > 0) ? product.images[0] : '';

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": title,
      "description": descText,
      "brand": {
        "@type": "Brand",
        "name": product.brand || ''
      },
      "category": product.product_type || ''
    };
    if (image) {
      jsonLd.image = window.location.origin + image;
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'product-jsonld';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }

  function renderGallery(images, title) {
    const defaultImage = '/assets/S‑ELECTRICITY-LOGO.svg';
    const mainImg = images && images.length > 0 ? images[0] : defaultImage;
    return `
      <div class="pd-gallery">
        <img src="${mainImg}" alt="${title}" class="pd-main-img prod-fade-in" loading="lazy" />
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
      <h3 style="margin-top:2rem; font-size:1.5rem;" data-i18n="specifications">Specifications</h3>
      <table class="pd-specs-table">
        <tbody>
          ${rows}
        </tbody>
      </table>
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
          <a href="${prefix}/product.html?id=${p.id}" class="prod-card link-transition">
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
    const techs = Array.isArray(product.technology) ? product.technology.join(', ') : '';

    return `
      <div id="custom-products-container">
        <!-- Breadcrumbs -->
        <nav style="font-size:0.9rem; margin-bottom: 2rem; color: #6b7280; display:flex; gap:0.5rem; align-items:center;">
          <a href="${prefix}/" style="text-decoration:none; color:inherit;" data-i18n="breadcrumb_home">Home</a> /
          <a href="${prefix}/products.html" class="link-transition" style="text-decoration:none; color:inherit;" data-i18n="breadcrumb_products">Products</a> /
          <span style="color: #1f2937; font-weight:500;">${title}</span>
        </nav>

        <a href="${prefix}/products.html" class="pd-back-link link-transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span data-i18n="back_to_products">Back to all products</span>
        </a>

        <div class="pd-layout">
          <!-- Left side: Gallery -->
          ${renderGallery(product.images, title)}

          <!-- Right side: Info -->
          <div class="pd-info prod-fade-in">
            <div class="pd-brand">${product.brand || ''}</div>
            <h1 class="pd-title">${title}</h1>
            <div class="pd-meta">
              ${techs ? `<div class="pd-meta-item">${techs}</div>` : ''}
              ${product.product_type ? `<div class="pd-meta-item">${product.product_type}</div>` : ''}
              ${product.installation ? `<div class="pd-meta-item">${product.installation}</div>` : ''}
            </div>
            <div class="pd-desc">${t(product.description)}</div>

            ${renderSpecs(product.specs)}
            ${renderFiles(product.files)}
          </div>
        </div>

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
        fetchAllProducts()
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
    return path.endsWith('/product.html') || path.endsWith('/product');
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
    if (window.location.pathname.includes('product.')) {
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
