/**
 * products.js
 * Logic for fetching products index and rendering the products listing page.
 */

(function() {
  // Auto-redirect to correct language-prefixed URL if needed
  var _path = location.pathname || '/';
  if (_path === '/products.html') {
    var _lang = localStorage.getItem('site_lang');
    if (_lang && _lang !== 'en' && (_lang === 'ar' || _lang === 'fr')) {
      location.replace('/' + _lang + _path + location.search + location.hash);
      return; // stop execution, page will reload
    }
  }

  const INDEX_URL = '/data/products_index.json';

  let allProducts = [];
  let filtersState = {
    brand: new Set(),
    technology: new Set(),
    product_type: new Set(),
    installation: new Set()
  };
  let searchQuery = '';

  let currentPage = 1;
  const ITEMS_PER_PAGE = 12;

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

  // Debounce utility
  function debounce(fn, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Read filters from URL params
  function readFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const brandParam = params.get('brand');
    const techParam = params.get('technology');
    const typeParam = params.get('product_type');
    const installParam = params.get('installation');
    const search = params.get('q');
    const page = params.get('page');

    if (brandParam) brandParam.split(',').forEach(v => filtersState.brand.add(v));
    if (techParam) techParam.split(',').forEach(v => filtersState.technology.add(v));
    if (typeParam) typeParam.split(',').forEach(v => filtersState.product_type.add(v));
    if (installParam) installParam.split(',').forEach(v => filtersState.installation.add(v));
    if (search) searchQuery = search;
    if (page) currentPage = parseInt(page, 10) || 1;
  }

  // Write filters to URL params (without page reload)
  function writeFiltersToURL() {
    const params = new URLSearchParams();
    if (filtersState.brand.size > 0) params.set('brand', Array.from(filtersState.brand).join(','));
    if (filtersState.technology.size > 0) params.set('technology', Array.from(filtersState.technology).join(','));
    if (filtersState.product_type.size > 0) params.set('product_type', Array.from(filtersState.product_type).join(','));
    if (filtersState.installation.size > 0) params.set('installation', Array.from(filtersState.installation).join(','));
    if (searchQuery) params.set('q', searchQuery);
    if (currentPage > 1) params.set('page', currentPage);

    const qs = params.toString();
    const newUrl = window.location.pathname + (qs ? '?' + qs : '');
    history.replaceState(null, '', newUrl);
  }

  async function fetchProducts() {
    try {
      const response = await fetch(INDEX_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch products index:', error);
      return [];
    }
  }

  function getUniqueValues(products, key, isArray = false) {
    const values = new Set();
    products.forEach(p => {
      const val = p[key];
      if (val) {
        if (isArray && Array.isArray(val)) val.forEach(v => values.add(v));
        else if (!isArray) values.add(val);
      }
    });
    return Array.from(values).sort();
  }

  function renderSidebar() {
    const brands = getUniqueValues(allProducts, 'brand');
    const technologies = getUniqueValues(allProducts, 'technology', true);
    const productTypes = getUniqueValues(allProducts, 'product_type');
    const installations = getUniqueValues(allProducts, 'installation');

    const createFilterGroup = (title, key, values, isArray = false) => {
      if(values.length === 0) return '';
      const isOpen = key === 'brand' ? 'open' : '';
      let html = `<details class="prod-filter-group" ${isOpen}>
                    <summary class="prod-filter-title" data-i18n="filter_${key}">${title}</summary>
                    <div class="prod-filter-content">`;
      values.forEach(val => {
        const id = `filter-${key}-${val.replace(/\s+/g, '-')}`;
        const safeVal = val.replace(/\s+/g, '_');

        const count = allProducts.filter(p => {
           if(!p[key]) return false;
           if(isArray) return Array.isArray(p[key]) && p[key].includes(val);
           return p[key] === val;
        }).length;

        const isChecked = filtersState[key] && filtersState[key].has(val) ? 'checked' : '';

        html += `
          <div class="prod-filter-item">
            <input type="checkbox" id="${id}" data-key="${key}" value="${val}" ${isChecked}>
            <label for="${id}" data-i18n="val_${safeVal}">${val}</label>
            <span class="prod-count-badge">${count}</span>
          </div>
        `;
      });
      html += `</div></details>`;
      return html;
    };

    const mobileHeader = `
      <div class="prod-mobile-filter-header">
        <h2 data-i18n="filters_title_modal">Filters</h2>
        <button type="button" class="prod-modal-close" aria-label="Close filters">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    `;

    const mobileFooter = `
      <div class="prod-mobile-filter-footer">
        <button type="button" class="prod-btn-clear" id="prod-clear-filters" data-i18n="clear_all">Clear all</button>
        <button type="button" class="prod-btn prod-btn-apply" id="prod-apply-filters" data-i18n="apply">Apply</button>
      </div>
    `;

    const desktopHeader = `
      <div class="prod-desktop-filter-header">
         <span class="prod-filter-heading" data-i18n="filters">Filters</span>
         <button type="button" class="prod-btn-clear-desktop" id="prod-clear-filters-desktop" data-i18n="clear_all">Clear all</button>
      </div>
    `;

    return `
      <aside class="prod-sidebar" id="prod-sidebar">
        ${mobileHeader}
        ${desktopHeader}
        <div class="prod-sidebar-scroll">
          ${createFilterGroup('Brand', 'brand', brands)}
          ${createFilterGroup('Product Type', 'product_type', productTypes)}
          ${createFilterGroup('Technology', 'technology', technologies, true)}
          ${createFilterGroup('Installation', 'installation', installations)}
        </div>
        ${mobileFooter}
      </aside>
    `;
  }

  function renderTopFilters() {
    let hasFilters = false;
    let chipsHtml = '';

    Object.keys(filtersState).forEach(key => {
       if (filtersState[key].size > 0) {
         hasFilters = true;
         filtersState[key].forEach(val => {
            const safeVal = val.replace(/\s+/g, '_');
            chipsHtml += `
              <button class="prod-chip" data-key="${key}" data-val="${val}">
                <span data-i18n="val_${safeVal}">${val}</span>
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            `;
         });
       }
    });

    const activeTextHtml = hasFilters ? `<div class="prod-applied-text" data-i18n="applied_filters">Applied filters:</div>` : '';

    return `
      <div class="prod-top-filters">
        <div class="prod-quick-filters">
           <button class="prod-mobile-filter-toggle" id="prod-mobile-filter-btn">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
             <span data-i18n="all_filters">All filters</span>
           </button>
        </div>
        ${activeTextHtml}
        <div class="prod-active-chips" id="prod-active-chips">
           ${chipsHtml}
        </div>
      </div>
    `;
  }

  function renderTopFiltersWrapper() {
     const container = document.getElementById('prod-top-filters-container');
     if(container) {
        container.innerHTML = renderTopFilters();

        // Attach chips remove event
        container.querySelectorAll('.prod-chip').forEach(chip => {
           chip.addEventListener('click', function() {
              const key = this.getAttribute('data-key');
              const val = this.getAttribute('data-val');
              filtersState[key].delete(val);

              const id = `filter-${key}-${val.replace(/\s+/g, '-')}`;
              const cb = document.getElementById(id);
              if(cb) cb.checked = false;

              currentPage = 1;
              renderTopFiltersWrapper();
              updateGrid();
              writeFiltersToURL();
              if(window.__site_i18n && window.__site_i18n.init) window.__site_i18n.init();
           });
        });

        // Mobile Filter Toggle Open
        const toggleBtn = document.getElementById('prod-mobile-filter-btn');
        if (toggleBtn) {
           toggleBtn.addEventListener('click', () => {
              const sidebar = document.getElementById('prod-sidebar');
              if (sidebar) {
                sidebar.classList.add('open-modal');
                document.body.style.overflow = 'hidden';
              }
           });
        }
     }
  }

  function renderCard(product) {
    const defaultImage = '/assets/S‑ELECTRICITY-LOGO.svg';
    const image = product.image || defaultImage;
    const title = t(product.title);
    const desc = t(product.short_description);
    const techs = Array.isArray(product.technology) ? product.technology : [];
    const prefix = getLangPrefix();

    let techChips = '';
    if (techs.length > 0) {
      techChips = techs.map(tech => `<span class="prod-card-tech">${tech}</span>`).join('');
    }

    return `
      <a href="${prefix}/products/${product.id}.html" class="prod-card prod-fade-in product-link">
        <div class="prod-card-img-wrapper">
          <img src="${image}" alt="${title}" class="prod-card-img" loading="lazy" />
        </div>
        <div class="prod-card-content">
          <div class="prod-card-brand">${product.brand || ''}</div>
          <h3 class="prod-card-title">${title}</h3>
          <p class="prod-card-desc">${desc}</p>
          <div class="prod-card-footer">
            <div class="prod-card-techs">${techChips}</div>
            <span class="prod-card-arrow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          </div>
        </div>
      </a>
    `;
  }

  function renderGrid(products) {
    if (products.length === 0) {
      return `
        <div class="prod-empty">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin: 0 auto 1rem; color: #9ca3af;">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m-1.6-8L3 3m4 10a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z"></path>
          </svg>
          <p data-i18n="no_products_found">No products found matching your criteria.</p>
        </div>
      `;
    }
    let html = '<div class="prod-grid">';
    products.forEach(p => {
      html += renderCard(p);
    });
    html += '</div>';
    return html;
  }

  function updateGrid() {
    const gridContainer = document.getElementById('prod-grid-container');
    if (!gridContainer) return;

    // Filter logic
    const filtered = allProducts.filter(p => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        let textToSearch = `${p.brand} ${p.product_type} ${p.installation} `;
        if (Array.isArray(p.technology)) textToSearch += p.technology.join(' ');

        const searchInField = (f) => {
           if (!f) return '';
           if (typeof f === 'string') return f;
           return Object.values(f).join(' ');
        };
        textToSearch += searchInField(p.title) + ' ' + searchInField(p.short_description);

        if (!textToSearch.toLowerCase().includes(query)) return false;
      }

      if (filtersState.brand.size > 0 && !filtersState.brand.has(p.brand)) return false;
      if (filtersState.product_type.size > 0 && !filtersState.product_type.has(p.product_type)) return false;
      if (filtersState.installation.size > 0 && !filtersState.installation.has(p.installation)) return false;

      if (filtersState.technology.size > 0) {
        if (!p.technology || !Array.isArray(p.technology)) return false;
        let match = false;
        for (const tech of filtersState.technology) {
          if (p.technology.includes(tech)) {
            match = true;
            break;
          }
        }
        if (!match) return false;
      }

      return true;
    });

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginated = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    let html = renderGrid(paginated);

    // Results count
    if (filtered.length > 0) {
      const showStart = startIdx + 1;
      const showEnd = Math.min(startIdx + ITEMS_PER_PAGE, filtered.length);
      // Build localized results text
      const lang = getLang();
      let resultsText = '';
      if (lang === 'ar') {
        resultsText = `\u0639\u0631\u0636 ${showStart}\u2013${showEnd} \u0645\u0646 \u0623\u0635\u0644 ${filtered.length} \u0645\u0646\u062a\u062c`;
      } else if (lang === 'fr') {
        resultsText = `Affichage de ${showStart}\u2013${showEnd} sur ${filtered.length} produits`;
      } else {
        resultsText = `Showing ${showStart}\u2013${showEnd} of ${filtered.length} products`;
      }
      html += `<div class="prod-results-count" style="text-align:center; color: var(--prod-text-muted); font-size: 0.9rem; margin-top: 1rem;">${resultsText}</div>`;
    }

    // Pagination controls
    if (totalPages > 1) {
       html += `
         <div class="prod-pagination">
           <button class="prod-page-btn" id="prod-prev-page" ${currentPage === 1 ? 'disabled' : ''}>
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
             </svg>
           </button>
           <span class="prod-page-info" dir="ltr">${currentPage} / ${totalPages}</span>
           <button class="prod-page-btn" id="prod-next-page" ${currentPage === totalPages ? 'disabled' : ''}>
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
             </svg>
           </button>
         </div>
       `;
    }

    gridContainer.innerHTML = html;

    // Attach pagination listeners
    const prevBtn = document.getElementById('prod-prev-page');
    const nextBtn = document.getElementById('prod-next-page');

    if (prevBtn) {
       prevBtn.addEventListener('click', () => {
         if (currentPage > 1) {
           currentPage--;
           updateGrid();
           writeFiltersToURL();
           window.scrollTo({ top: gridContainer.offsetTop - 100, behavior: 'smooth' });
         }
       });
    }
    if (nextBtn) {
       nextBtn.addEventListener('click', () => {
         if (currentPage < totalPages) {
           currentPage++;
           updateGrid();
           writeFiltersToURL();
           window.scrollTo({ top: gridContainer.offsetTop - 100, behavior: 'smooth' });
         }
       });
    }

    // Smooth transition for product links
    document.querySelectorAll('.product-link').forEach(link => {
       link.addEventListener('click', function(e) {
         const anchor = e.target.closest('a');
         if (e.ctrlKey || e.metaKey || (anchor && anchor.target === '_blank')) return;
         e.preventDefault();
         const href = this.getAttribute('href');
         const container = document.getElementById('custom-products-container');
         if (container) {
           container.style.transition = 'opacity 0.2s ease-out';
           container.style.opacity = '0';
         }
         setTimeout(() => {
           window.location.href = href;
         }, 200);
       });
    });

    if(window.__site_i18n && typeof window.__site_i18n.init === 'function') {
         setTimeout(()=> window.__site_i18n.init(), 50);
    }
  }

  function closeMobileModal() {
    const sidebar = document.getElementById('prod-sidebar');
    if (sidebar) {
      sidebar.classList.remove('open-modal');
      document.body.style.overflow = '';
    }
  }

  function attachListeners() {
    // Search input with debounce
    const searchInput = document.getElementById('prod-search');
    if (searchInput) {
      if (searchQuery) searchInput.value = searchQuery;
      const debouncedSearch = debounce((value) => {
        searchQuery = value.trim();
        currentPage = 1;
        updateGrid();
        writeFiltersToURL();
      }, 300);
      searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
      });
    }

    // Checkboxes
    const sidebar = document.getElementById('prod-sidebar');
    if (sidebar) {
      sidebar.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
          const key = e.target.getAttribute('data-key');
          const value = e.target.value;
          if (e.target.checked) {
            filtersState[key].add(value);
          } else {
            filtersState[key].delete(value);
          }
          currentPage = 1;
          renderTopFiltersWrapper();
          updateGrid();
          writeFiltersToURL();
          if(window.__site_i18n && window.__site_i18n.init) window.__site_i18n.init();
        }
      });

      // Mobile Modal Close & Actions
      const closeBtn = sidebar.querySelector('.prod-modal-close');
      const applyBtn = sidebar.querySelector('#prod-apply-filters');
      const clearBtn = sidebar.querySelector('#prod-clear-filters');
      const clearBtnDesktop = sidebar.querySelector('#prod-clear-filters-desktop');

      if(closeBtn) closeBtn.addEventListener('click', closeMobileModal);
      if(applyBtn) applyBtn.addEventListener('click', closeMobileModal);

      const performClear = () => {
         filtersState = { brand: new Set(), technology: new Set(), product_type: new Set(), installation: new Set() };
         sidebar.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
         currentPage = 1;
         renderTopFiltersWrapper();
         updateGrid();
         writeFiltersToURL();
         closeMobileModal();
         if(window.__site_i18n && window.__site_i18n.init) window.__site_i18n.init();
      };

      if(clearBtn) clearBtn.addEventListener('click', performClear);
      if(clearBtnDesktop) clearBtnDesktop.addEventListener('click', performClear);

      // Close modal with Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open-modal')) {
          closeMobileModal();
        }
      });
    }
  }

  function injectProductListJsonLd(products) {
    var existing = document.getElementById('productlist-jsonld');
    if (existing) existing.remove();

    var items = products.map(function(p, i) {
      var title = p.title;
      if (typeof title === 'object') {
        var lang = document.documentElement.lang || 'en';
        title = title[lang] || title['en'] || '';
      }
      return {
        "@type": "ListItem",
        "position": i + 1,
        "url": "https://smartelectricity.ma/products/" + p.id + ".html",
        "name": title
      };
    });

    var jsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Smart Home Products",
      "numberOfItems": products.length,
      "itemListElement": items
    };

    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'productlist-jsonld';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }

  let _mounted = false;

  async function initApp() {
    // Prevent double mounting
    if (_mounted || document.getElementById('custom-products-root-wrapper')) return;
    _mounted = true;

    // Read filters from URL before rendering
    readFiltersFromURL();

    const appHtml = `
      <div id="custom-products-container">
        <!-- Hero Banner -->
        <div class="prod-hero">
          <div class="prod-hero-content">
            <nav class="prod-breadcrumbs">
              <a href="${getLangPrefix()}/" data-i18n="breadcrumb_home">Home</a>
              <span class="prod-breadcrumb-sep">›</span>
              <span class="prod-breadcrumb-current" data-i18n="breadcrumb_products">Products</span>
            </nav>
            <h1 class="prod-header-title" data-i18n="products_title">All Products</h1>
            <p class="prod-header-desc" data-i18n="products_desc">Explore our premium selection of smart home devices, sensors, and actuators.</p>
            <div class="prod-search-wrapper">
              <svg class="prod-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" id="prod-search" class="prod-search-input" placeholder="Search products..." data-i18n-attr="placeholder:search_placeholder" />
            </div>
          </div>
        </div>

        <div id="prod-top-filters-container"></div>

        <div class="prod-layout" id="prod-layout-container">
           <!-- Loading State -->
           <div class="prod-spinner-wrapper"><div class="prod-spinner"></div></div>
        </div>
      </div>
    `;

    const appContainer = document.createElement('div');
    appContainer.id = 'custom-products-root-wrapper';
    appContainer.innerHTML = appHtml;

    const root = document.getElementById('root');
    let target = document.querySelector('main.notfound-root') || document.querySelector('main');

    if(target && target.nodeName === 'MAIN') {
       target.innerHTML = '';
       target.appendChild(appContainer);
    } else {
       const footer = document.querySelector('footer');
       if(footer) {
         footer.parentNode.insertBefore(appContainer, footer);
       } else if (root) {
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

    // Data Loading
    allProducts = await fetchProducts();
    // Shuffle products with a daily seed so brands appear mixed but order stays consistent per day
    (function seedShuffle(arr) {
      var d = new Date(), seed = d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate();
      function rng() { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; }
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
    })(allProducts);

    injectProductListJsonLd(allProducts);

    const layoutContainer = document.getElementById('prod-layout-container');
    if (layoutContainer) {
      layoutContainer.innerHTML = `
        ${renderSidebar()}
        <div class="prod-main-content">
          <div id="prod-grid-container"></div>
        </div>
      `;
      renderTopFiltersWrapper();
      attachListeners();
      updateGrid();

      // Final Translation
      if(window.__site_i18n && window.__site_i18n.init) window.__site_i18n.init();

      // If language dynamically changes, re-render
      window.addEventListener('locationchange', () => {
         if (window.location.pathname.includes('product.')) {
             layoutContainer.innerHTML = `
               ${renderSidebar()}
               <div class="prod-main-content">
                 <div id="prod-grid-container"></div>
               </div>
             `;
             renderTopFiltersWrapper();
             attachListeners();
             updateGrid();
             if(window.__site_i18n && window.__site_i18n.init) window.__site_i18n.init();
         }
      });
    }
  }

  // Check if the current page is a products listing page
  function isProductsPage() {
    const path = location.pathname || '/';
    return path.endsWith('/products.html') || path.endsWith('/products');
  }

  // Remove any leftover products content from the DOM
  function cleanupProducts() {
    const wrap = document.getElementById('custom-products-root-wrapper');
    if (wrap) wrap.remove();
  }

  function mountApp() {
    // Only mount on products pages
    if (!isProductsPage()) return;

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

  // Cleanup when navigating away via SPA (pushState/popstate)
  window.addEventListener('locationchange', () => {
    if (!isProductsPage()) cleanupProducts();
  });
  window.addEventListener('popstate', () => {
    if (!isProductsPage()) cleanupProducts();
  });

  // Auto mount
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
  } else {
    mountApp();
  }

  // Handle SPA navigation (including browser Back/Forward via popstate)
  window.addEventListener('locationchange', () => {
    if (window.location.pathname.includes('product')) {
      // Re-mount products app if it was cleaned up
      if (!document.getElementById('custom-products-root-wrapper')) {
        mountApp();
      }
    } else {
      // Cleanup products UI when navigating away
      const wrap = document.getElementById('custom-products-root-wrapper');
      if (wrap) wrap.remove();
    }
  });

})();
