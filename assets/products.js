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

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  // Protocol icon dictionary — mirrors the official-mark set in product-detail.js.
  // Returns one "<span class=proto>icon name</span>" for a technology string.
  function protoMarkup(tech) {
    const tl = String(tech).toLowerCase();
    let icon = '';
    let cls = 'prod-proto';
    if (tl.includes('wi-fi') || tl.includes('wifi')) {
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0114 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>';
    } else if (tl.includes('bluetooth') || tl.includes('ble')) {
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/></svg>';
    } else if (tl.includes('knx')) {
      return '<span class="prod-proto prod-proto-knx">KNX</span>';
    } else if (tl.includes('zigbee')) {
      icon = '<svg viewBox="0 0 48 48" fill="currentColor"><path d="M32.042,9.792c4.595,1.238,4.88,3.165,5.524,5.048C34.841,17.664,17.35,35.7,17.35,35.7s10.901,1.177,23.487-1.003c-0.001,0.029-0.002,0.048-0.003,0.076C42.829,31.661,44,27.97,44,24c0-11.046-8.954-20-20-20c-5.634,0-10.715,2.338-14.35,6.087C15.489,9.124,26.89,8.403,32.042,9.792z"/><path d="M14.724,37.285c-1.982-0.347-4.212-2.131-4.707-5.302c1.437-1.239,19.994-20.507,19.994-20.507c-7.008-0.424-14.569-0.465-22.237,0.864C5.408,15.625,4,19.644,4,24c0,11.046,8.954,20,20,20c6.173,0,11.689-2.8,15.358-7.195C35.486,37.33,23.257,38.769,14.724,37.285z"/></svg>';
    } else if (tl.includes('matter')) {
      icon = '<svg viewBox="0 0 512 512" fill="currentColor"><path d="M152 134.4c21.5 17.5 47.1 29.2 74.4 34.2V22.9l29.7-17.1 29.6 17.1v145.6c27.3-4.9 52.9-16.7 74.5-34.2l53.8 31.1c-87.6 86.6-228.5 86.6-316.1 0zm65.5 371.8C248.7 387 178.1 264.9 59.3 232.5v62.3c25.9 9.9 48.9 26.2 66.8 47.4L0 414.9v34.2l29.7 17 126.1-72.8c9.4 26.1 12 54.2 7.6 81.5zm235.3-273.7C334 265 263.6 387.1 294.8 506.2l54-31.2c-4.4-27.4-1.7-55.4 7.6-81.5l126 72.7 29.6-17.1v-34.2l-126.1-72.8c17.9-21.2 40.9-37.5 66.8-47.4z"/></svg>';
    } else if (tl.includes('thread')) {
      icon = '<svg viewBox="0 0 165 165" fill="currentColor"><path d="M82.498,0C37.008,0,0,37.008,0,82.496c0,45.181,36.51,81.977,81.573,82.476V82.569l-27.002-0.002c-8.023,0-14.554,6.53-14.554,14.561c0,8.023,6.531,14.551,14.554,14.551v17.98c-17.939,0-32.534-14.595-32.534-32.531c0-17.944,14.595-32.543,32.534-32.543l27.002,0.004v-9.096c0-14.932,12.146-27.08,27.075-27.08c14.932,0,27.082,12.148,27.082,27.08c0,14.931-12.15,27.08-27.082,27.08l-9.097-0.001v80.641C136.889,155.333,165,122.14,165,82.496C165,37.008,127.99,0,82.498,0z"/><path d="M117.748,55.493c0-5.016-4.082-9.098-9.1-9.098c-5.015,0-9.097,4.082-9.097,9.098v9.097l9.097,0.001C113.666,64.591,117.748,60.51,117.748,55.493z"/></svg>';
    } else if (tl.includes('lan') || tl.includes('ethernet')) {
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 20 3-3h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2l3 3z"/><path d="M6 8v1"/><path d="M10 8v1"/><path d="M14 8v1"/><path d="M18 8v1"/></svg>';
    } else if (tl.includes('z-wave')) {
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16.247 7.761a6 6 0 0 1 0 8.478"/><path d="M19.075 4.933a10 10 0 0 1 0 14.134"/><path d="M4.925 19.067a10 10 0 0 1 0-14.134"/><path d="M7.753 16.239a6 6 0 0 1 0-8.478"/><circle cx="12" cy="12" r="2"/></svg>';
    } else {
      return '<span class="prod-proto">' + escapeHtml(tech) + '</span>';
    }
    return '<span class="' + cls + '">' + icon + escapeHtml(tech) + '</span>';
  }

  // Brand → clean SVG logo in the card foot. Falls back to the brand name as
  // text when the SVG fails to load (mirrors guide §7.2: logo:null → name text).
  // The onerror swaps the broken <img> for a styled text span, then clears
  // itself so it can't loop.
  function brandLogoMarkup(brand) {
    if (!brand) return '<span class="prod-card-logo-fallback"></span>';
    const slug = String(brand).toLowerCase().replace(/\s+/g, '-');
    const safe = escapeHtml(brand);
    return '<img class="prod-card-logo" src="/assets/brands/' + slug + '.svg" alt="' + safe +
      '" loading="lazy" onerror="this.onerror=null;this.insertAdjacentHTML(&quot;afterend&quot;,&quot;<span class=\\&quot;prod-card-logo-fallback\\&quot;>' + safe + '</span>&quot;);this.remove();" />';
  }

  function renderCard(product) {
    const defaultImage = '/assets/S‑ELECTRICITY-LOGO.svg';
    const image = product.image || defaultImage;
    const title = t(product.title);
    const desc = t(product.short_description);
    const techs = Array.isArray(product.technology) ? product.technology : [];
    const prefix = getLangPrefix();

    // Protocol strip — icon + name per technology (shared official-mark dictionary)
    const protocolStrip = techs.length
      ? '<div class="prod-card-protocols">' +
          techs.map(protoMarkup).join('') +
        '</div>'
      : '';

    // Brand logo in the foot (clean SVG), balanced opposite the quote button.
    const footBrand = brandLogoMarkup(product.brand);

    return `
      <a href="${prefix}/products/${product.id}.html" class="prod-card prod-fade-in product-link">
        <div class="prod-card-img-wrapper">
          <img src="${image}" alt="${title}" class="prod-card-img" loading="lazy" />
        </div>
        ${protocolStrip}
        <div class="prod-card-content">
          <div class="prod-card-brand">${product.brand || ''}</div>
          <h3 class="prod-card-title">${title}</h3>
          <p class="prod-card-desc">${desc}</p>
          <div class="prod-card-footer">
            ${footBrand}
            <button type="button" class="prod-card-add" data-trigger="cart-add" data-product-id="${escapeHtml(product.id)}" data-i18n="cart_add_to_quote" aria-label="Add to quote request" data-i18n-attr="aria-label:cart_aria_add_btn" onclick="event.preventDefault();event.stopPropagation();if(window.Cart)window.Cart.add(this.getAttribute('data-product-id'),1);">+ Add to quote</button>
          </div>
        </div>
      </a>
    `;
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
