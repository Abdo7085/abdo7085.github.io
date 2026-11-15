/**
 * products.js
 * The catalog page (/products.html): search, filters, paginated grid.
 * Language, product cards, data loading and mounting come from
 * assets/site-core.js (SE); the language redirect of /products.html lives
 * in assets/i18n.js.
 */

(function() {
  'use strict';

  // Filter facets, in sidebar order. `category` and `product_type` come from
  // data/taxonomy.json (every index entry carries its derived `category`).
  const FACETS = ['category', 'product_type', 'brand', 'technology', 'installation'];
  const emptyFilters = () => {
    const state = {};
    FACETS.forEach(key => { state[key] = new Set(); });
    return state;
  };

  let allProducts = [];
  let filtersState = emptyFilters();
  let searchQuery = '';

  // Display label for a filter value in the current language. Categories,
  // types and installation methods are translated by the taxonomy; brands
  // and technologies are proper names shown as they are.
  function valueLabel(key, val) {
    if (key === 'category') return SE.taxonomy.label('category', val);
    if (key === 'product_type') return SE.taxonomy.label('type', val);
    if (key === 'installation') return SE.taxonomy.label('installation', val);
    return val;
  }

  let currentPage = 1;
  const ITEMS_PER_PAGE = 12;

  const getLang = SE.lang;
  const getLangPrefix = SE.prefix;
  const t = SE.t;
  const escapeHtml = SE.escapeHtml;

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
    const search = params.get('q');
    const page = params.get('page');

    FACETS.forEach(key => {
      const raw = params.get(key);
      if (raw) raw.split(',').forEach(v => { if (v) filtersState[key].add(v); });
    });
    if (search) searchQuery = search;
    if (page) currentPage = parseInt(page, 10) || 1;
  }

  // Links saved before a product type was renamed or split keep working:
  // e.g. ?product_type=Network now selects Router + Network Switch + Access Point.
  // Runs once the taxonomy (which holds the alias table) has loaded.
  function applyTypeAliases() {
    const expanded = new Set();
    filtersState.product_type.forEach(v => {
      SE.taxonomy.expandAlias('product_type', v).forEach(x => expanded.add(x));
    });
    filtersState.product_type = expanded;
  }

  // Write filters to URL params (without page reload)
  function writeFiltersToURL() {
    const params = new URLSearchParams();
    FACETS.forEach(key => {
      if (filtersState[key].size > 0) params.set(key, Array.from(filtersState[key]).join(','));
    });
    if (searchQuery) params.set('q', searchQuery);
    if (currentPage > 1) params.set('page', currentPage);

    const qs = params.toString();
    const newUrl = window.location.pathname + (qs ? '?' + qs : '');
    history.replaceState(null, '', newUrl);
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
    const installations = getUniqueValues(allProducts, 'installation');
    // Categories and types follow the order of data/taxonomy.json, so related
    // types sit together instead of being scattered alphabetically.
    const categories = SE.taxonomy.sorted('category', getUniqueValues(allProducts, 'category'));
    const productTypes = SE.taxonomy.sorted('type', getUniqueValues(allProducts, 'product_type'));

    const createFilterGroup = (title, key, values, isArray = false) => {
      if(values.length === 0) return '';
      const isOpen = (key === 'category' || key === 'brand') ? 'open' : '';
      let html = `<details class="prod-filter-group" ${isOpen}>
                    <summary class="prod-filter-title" data-i18n="filter_${key}">${title}</summary>
                    <div class="prod-filter-content">`;
      values.forEach(val => {
        const id = `filter-${key}-${val.replace(/\s+/g, '-')}`;

        const count = allProducts.filter(p => {
           if(!p[key]) return false;
           if(isArray) return Array.isArray(p[key]) && p[key].includes(val);
           return p[key] === val;
        }).length;

        const isChecked = filtersState[key] && filtersState[key].has(val) ? 'checked' : '';

        html += `
          <div class="prod-filter-item">
            <input type="checkbox" id="${id}" data-key="${key}" value="${escapeHtml(val)}" ${isChecked}>
            <label for="${id}">${escapeHtml(valueLabel(key, val))}</label>
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
          ${createFilterGroup('Category', 'category', categories)}
          ${createFilterGroup('Product Type', 'product_type', productTypes)}
          ${createFilterGroup('Brand', 'brand', brands)}
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

    FACETS.forEach(key => {
       if (filtersState[key].size > 0) {
         hasFilters = true;
         filtersState[key].forEach(val => {
            chipsHtml += `
              <button class="prod-chip" data-key="${key}" data-val="${escapeHtml(val)}">
                <span>${escapeHtml(valueLabel(key, val))}</span>
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
              SE.translate();
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

  // Brand → clean SVG logo in the card foot. Falls back to the brand name as
  // text when the SVG fails to load (mirrors guide §7.2: logo:null → name text).
  // The onerror swaps the broken <img> for a styled text span, then clears
  // itself so it can't loop.
  function renderCard(product) {
    return SE.productCard(product, 'grid');
  }

  function renderGrid(products) {
    if (products.length === 0) {
      return `
        <div class="prod-empty">
          <svg class="prod-empty-icon" width="56" height="56" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
             <circle cx="11" cy="11" r="7" stroke-width="1.5"></circle>
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-4.35-4.35"></path>
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

  function pMatches(p, overrideCategory = null, overrideVal = null) {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      let textToSearch = `${p.brand} ${p.product_type} ${p.installation} `;
      // Also searchable by category / type / installation name in the
      // visitor's language (e.g. an Arabic search for "ستائر").
      textToSearch += `${valueLabel('category', p.category)} ${valueLabel('product_type', p.product_type)} ${valueLabel('installation', p.installation)} `;
      if (Array.isArray(p.technology)) textToSearch += p.technology.join(' ');

      const searchInField = (f) => {
         if (!f) return '';
         if (typeof f === 'string') return f;
         return Object.values(f).join(' ');
      };
      textToSearch += searchInField(p.title) + ' ' + searchInField(p.short_description);

      if (!textToSearch.toLowerCase().includes(query)) return false;
    }

    const checkState = (key, pVal, isArray = false) => {
       // If evaluating a specific category option, hypothetically enforce it
       if (overrideCategory === key) {
          if (!pVal) return false;
          if (isArray) return Array.isArray(pVal) && pVal.includes(overrideVal);
          return pVal === overrideVal;
       }
       // Otherwise, enforce active filters
       if (filtersState[key].size > 0) {
          if (isArray) {
            if (!pVal || !Array.isArray(pVal)) return false;
            let match = false;
            for (const fv of filtersState[key]) {
              if (pVal.includes(fv)) { match = true; break; }
            }
            if (!match) return false;
          } else {
            if (!filtersState[key].has(pVal)) return false;
          }
       }
       return true;
    };

    if (!checkState('category', p.category)) return false;
    if (!checkState('brand', p.brand)) return false;
    if (!checkState('product_type', p.product_type)) return false;
    if (!checkState('installation', p.installation)) return false;
    if (!checkState('technology', p.technology, true)) return false;

    return true;
  }

  function updateFilterCounts() {
     const checkboxes = document.querySelectorAll('#prod-sidebar input[type="checkbox"]');
     if(!checkboxes.length) return;
     checkboxes.forEach(cb => {
         const key = cb.getAttribute('data-key');
         const val = cb.value;
         
         let count = 0;
         for (let i = 0; i < allProducts.length; i++) {
             if (pMatches(allProducts[i], key, val)) {
                 count++;
             }
         }
         
         const badge = cb.parentElement.querySelector('.prod-count-badge');
         if (badge) badge.textContent = count;
         
         if (count === 0) {
             cb.parentElement.classList.add('empty');
         } else {
             cb.parentElement.classList.remove('empty');
         }
     });
  }

  function updateGrid() {
    const gridContainer = document.getElementById('prod-grid-container');
    if (!gridContainer) return;

    // Refresh dynamic facet counts
    updateFilterCounts();

    // Filter logic
    const filtered = allProducts.filter(p => pMatches(p));

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
      const resultsText = SE.resultsText(showStart, showEnd, filtered.length);
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

    // Fade out before opening a product
    SE.linkTransitions(gridContainer, '.product-link');

    setTimeout(SE.translate, 50);
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
          SE.translate();
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
         filtersState = emptyFilters();
         sidebar.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
         currentPage = 1;
         renderTopFiltersWrapper();
         updateGrid();
         writeFiltersToURL();
         closeMobileModal();
         SE.translate();
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

  function isProductsPage(path) {
    return path.endsWith('/products.html') || path.endsWith('/products');
  }

  SE.mount({
    id: 'custom-products-root-wrapper',
    isPage: isProductsPage,
    html: () => `
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
  `,
    start: async function () {
      // Filters from the URL before anything renders
      readFiltersFromURL();

      // Data Loading — products and the taxonomy (labels, category order,
      // aliases) are fetched together; nothing renders before both are in.
      const loaded = await Promise.all([SE.data.products(), SE.taxonomy.load()]);
      allProducts = loaded[0];
      applyTypeAliases();
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
        SE.translate();

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
               SE.translate();
           }
        });
      }
    }
  });
})();
