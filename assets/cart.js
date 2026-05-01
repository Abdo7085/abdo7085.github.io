/* WhatsApp Cart — collects products from the catalog and generates a
   formatted WhatsApp message to the shop owner. No real checkout, no prices.
   Mirrors find-solution.js architecture. State persists in localStorage.
   Triggers:
     [data-trigger="cart-open"]                              → open modal
     [data-trigger="cart-add"][data-product-id="..."]        → add (qty=1)
     [data-trigger="cart-add"][data-qty-source]              → reads qty from
                                                                nearest input.cart-qty-input
                                                                inside .pd-cart-row
*/
(function () {
  'use strict';

  const WHATSAPP_NUMBER = '212654132112';
  const AVAILABLE_LANGS = ['en', 'fr', 'ar'];
  const DEFAULT_LANG = 'en';
  const STORAGE_KEY = 'se_cart_v1';
  const SITE_ORIGIN = 'https://smartelectricity.ma';

  // ---------- Language detection ----------
  function detectLang() {
    try {
      const parts = (location.pathname || '/').split('/').filter(Boolean);
      if (parts.length) {
        const first = parts[0].toLowerCase();
        if (AVAILABLE_LANGS.includes(first)) return first;
      }
    } catch (e) {}
    try {
      const stored = localStorage.getItem('site_lang');
      if (stored && AVAILABLE_LANGS.includes(stored)) return stored;
    } catch (e) {}
    return DEFAULT_LANG;
  }

  function langPrefix(lang) {
    if (lang === 'ar') return '/ar';
    if (lang === 'fr') return '/fr';
    return '';
  }

  function pickLangText(obj, lang) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj['en'] || obj['fr'] || obj['ar'] || '';
  }

  // ---------- Locale loader ----------
  const localeCache = {};
  function loadLocale(lang) {
    if (localeCache[lang]) return localeCache[lang];
    const candidates = [
      '/assets/locales/' + lang + '.json',
      'assets/locales/' + lang + '.json',
      './assets/locales/' + lang + '.json',
      '../assets/locales/' + lang + '.json'
    ];
    const promise = (async () => {
      for (const url of candidates) {
        try {
          const res = await fetch(url, { cache: 'force-cache' });
          if (res && res.ok) return await res.json();
        } catch (e) {}
      }
      return {};
    })();
    localeCache[lang] = promise;
    return promise;
  }

  let dict = {};
  function t(key, fallback) {
    const v = dict[key];
    if (typeof v === 'string' && v.length) return v;
    return fallback != null ? fallback : key;
  }

  // ---------- Products index loader ----------
  let productsMap = null;
  let productsLoadPromise = null;
  function loadProductsIndex() {
    if (productsMap) return Promise.resolve(productsMap);
    if (productsLoadPromise) return productsLoadPromise;
    const candidates = [
      '/data/products_index.json',
      'data/products_index.json',
      '../data/products_index.json',
      '../../data/products_index.json'
    ];
    productsLoadPromise = (async () => {
      for (const url of candidates) {
        try {
          const res = await fetch(url, { cache: 'force-cache' });
          if (res && res.ok) {
            const arr = await res.json();
            const map = {};
            for (let i = 0; i < arr.length; i++) {
              if (arr[i] && arr[i].id) map[arr[i].id] = arr[i];
            }
            productsMap = map;
            return map;
          }
        } catch (e) {}
      }
      productsMap = {};
      return productsMap;
    })();
    return productsLoadPromise;
  }

  // ---------- State + persistence ----------
  let state = { items: [] }; // [{id, qty}]
  let lang = DEFAULT_LANG;
  let modalEl = null;

  // Eagerly detect language and pre-load the dictionary so that toasts shown
  // by add() (which can fire before the modal is ever opened) display in the
  // active language. Without this, `dict` stays empty until open() runs and
  // showAddedToast falls back to the hard-coded English string.
  lang = detectLang();
  loadLocale(lang).then(function (d) { if (d) dict = d; });

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { items: [] };
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.items)) return { items: [] };
      const items = [];
      for (let i = 0; i < parsed.items.length; i++) {
        const it = parsed.items[i];
        if (it && typeof it.id === 'string' && Number.isFinite(it.qty) && it.qty > 0) {
          items.push({ id: it.id, qty: Math.min(99, Math.floor(it.qty)) });
        }
      }
      return { items: items };
    } catch (e) {
      return { items: [] };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, items: state.items }));
    } catch (e) {}
  }

  function totalCount() {
    let n = 0;
    for (let i = 0; i < state.items.length; i++) n += state.items[i].qty;
    return n;
  }

  function findItem(id) {
    for (let i = 0; i < state.items.length; i++) {
      if (state.items[i].id === id) return i;
    }
    return -1;
  }

  // ---------- Public API ops ----------
  function add(id, qty) {
    if (!id) return;
    qty = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
    const idx = findItem(id);
    if (idx >= 0) {
      state.items[idx].qty = Math.min(99, state.items[idx].qty + qty);
    } else {
      state.items.push({ id: id, qty: qty });
    }
    saveState();
    refreshBadges();
    pulseBadges();
    showAddedToast();
    if (modalEl && modalEl.classList.contains('cart-visible')) {
      renderModalBody();
    }
  }

  function setQty(id, qty) {
    qty = parseInt(qty, 10) || 0;
    const idx = findItem(id);
    if (idx < 0) return;
    if (qty <= 0) {
      state.items.splice(idx, 1);
    } else {
      state.items[idx].qty = Math.min(99, qty);
    }
    saveState();
    refreshBadges();
    if (modalEl && modalEl.classList.contains('cart-visible')) {
      renderModalBody();
    }
  }

  function remove(id) {
    const idx = findItem(id);
    if (idx < 0) return;
    state.items.splice(idx, 1);
    saveState();
    refreshBadges();
    if (modalEl && modalEl.classList.contains('cart-visible')) {
      renderModalBody();
    }
  }

  function clear() {
    state.items = [];
    saveState();
    refreshBadges();
    if (modalEl && modalEl.classList.contains('cart-visible')) {
      renderModalBody();
    }
  }

  // ---------- DOM helpers ----------
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'on') {
          for (const ev in attrs[k]) node.addEventListener(ev, attrs[k][ev]);
        } else if (k === 'style' && typeof attrs[k] === 'object') {
          Object.assign(node.style, attrs[k]);
        } else if (k in node && typeof attrs[k] !== 'string') {
          node[k] = attrs[k];
        } else {
          node.setAttribute(k, attrs[k]);
        }
      }
    }
    if (children != null) {
      const arr = Array.isArray(children) ? children : [children];
      for (const c of arr) {
        if (c == null) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    }
    return node;
  }

  // ---------- Badge updates ----------
  function refreshBadges() {
    const n = totalCount();
    const badges = document.querySelectorAll('[data-cart-badge]');
    for (let i = 0; i < badges.length; i++) {
      const b = badges[i];
      if (n > 0) {
        b.textContent = n > 99 ? '99+' : String(n);
        b.classList.add('cart-badge-visible');
      } else {
        b.textContent = '';
        b.classList.remove('cart-badge-visible');
      }
    }
  }

  function pulseBadges() {
    const badges = document.querySelectorAll('[data-cart-badge]');
    for (let i = 0; i < badges.length; i++) {
      const b = badges[i];
      b.classList.remove('cart-badge-pulse');
      // Force reflow so the animation replays even if we add the class again
      void b.offsetWidth;
      b.classList.add('cart-badge-pulse');
    }
  }

  // ---------- Toast ----------
  let toastTimer = null;
  function showAddedToast() {
    let toast = document.getElementById('cart-toast');
    if (!toast) {
      toast = el('div', { id: 'cart-toast', class: 'cart-toast', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(toast);
    }
    toast.innerHTML = '';
    toast.appendChild(el('span', {
      class: 'cart-toast-icon',
      'aria-hidden': 'true',
      html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
    }));
    toast.appendChild(el('span', { class: 'cart-toast-text' }, t('cart_added_toast', 'Added to your quote request')));
    requestAnimationFrame(function () { toast.classList.add('cart-toast-visible'); });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('cart-toast-visible');
    }, 1800);
  }

  // ---------- Pluralization helper ----------
  function totalText(n) {
    if (n === 1) return t('cart_total_one', '1 item');
    return t('cart_total_items', '{n} items').replace('{n}', String(n));
  }

  // ---------- WhatsApp message ----------
  function buildWhatsAppHref() {
    const lines = [];
    lines.push(t('cart_msg_header', '🛒 Quote request from smartelectricity.ma'));
    lines.push('');

    const prefix = langPrefix(lang);
    let idx = 1;
    for (let i = 0; i < state.items.length; i++) {
      const item = state.items[i];
      const product = (productsMap && productsMap[item.id]) || null;
      const title = product ? pickLangText(product.title, lang) : item.id;
      const brand = product && product.brand ? product.brand : '';
      const url = SITE_ORIGIN + prefix + '/products/' + item.id + '.html';
      lines.push(idx + ') ' + (brand ? '[' + brand + '] ' : '') + title);
      lines.push('   • ' + t('cart_msg_qty_label', 'Quantity:') + ' ' + item.qty);
      lines.push('   • ' + url);
      lines.push('');
      idx++;
    }

    const notesEl = modalEl ? modalEl.querySelector('#cart-notes') : null;
    const notes = notesEl ? notesEl.value.trim() : '';
    if (notes) {
      lines.push(t('cart_msg_notes_label', '📝 Notes:') + ' ' + notes);
      lines.push('');
    }

    lines.push(t('cart_msg_footer', 'Awaiting your quote, thank you.'));
    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
  }

  // ---------- Render ----------
  function renderItemRow(item, product) {
    const title = product ? pickLangText(product.title, lang) : item.id;
    const brand = product && product.brand ? product.brand : '';
    const image = product && product.image ? product.image : '/assets/S‑ELECTRICITY-LOGO.svg';
    const prefix = langPrefix(lang);
    const href = prefix + '/products/' + item.id + '.html';

    const row = el('div', { class: 'cart-item', 'data-item-id': item.id });

    row.appendChild(el('a', {
      class: 'cart-item-thumb',
      href: href,
      'aria-label': title
    }, el('img', { src: image, alt: title, loading: 'lazy' })));

    const info = el('div', { class: 'cart-item-info' });
    if (brand) info.appendChild(el('div', { class: 'cart-item-brand' }, brand));
    info.appendChild(el('a', { class: 'cart-item-title', href: href }, title));

    const ctrls = el('div', { class: 'cart-item-controls' });
    const qtyWrap = el('div', { class: 'cart-qty' });
    const dec = el('button', {
      type: 'button',
      class: 'cart-qty-btn',
      'aria-label': t('cart_aria_decrease', 'Decrease quantity'),
      on: { click: function () { setQty(item.id, item.qty - 1); } }
    }, '−');
    const input = el('input', {
      type: 'number',
      class: 'cart-qty-input',
      value: String(item.qty),
      min: '1',
      max: '99',
      inputmode: 'numeric',
      'aria-label': t('cart_item_qty', 'Qty'),
      on: {
        change: function (e) {
          const v = parseInt(e.target.value, 10);
          if (!Number.isFinite(v) || v < 1) {
            e.target.value = String(item.qty);
            return;
          }
          setQty(item.id, v);
        }
      }
    });
    const inc = el('button', {
      type: 'button',
      class: 'cart-qty-btn',
      'aria-label': t('cart_aria_increase', 'Increase quantity'),
      on: { click: function () { setQty(item.id, item.qty + 1); } }
    }, '+');
    qtyWrap.appendChild(dec);
    qtyWrap.appendChild(input);
    qtyWrap.appendChild(inc);
    ctrls.appendChild(qtyWrap);

    const removeBtn = el('button', {
      type: 'button',
      class: 'cart-item-remove',
      'aria-label': t('cart_item_remove', 'Remove'),
      title: t('cart_item_remove', 'Remove'),
      on: { click: function () { remove(item.id); } }
    });
    removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
    ctrls.appendChild(removeBtn);

    info.appendChild(ctrls);
    row.appendChild(info);
    return row;
  }

  function renderEmpty() {
    const wrap = el('div', { class: 'cart-empty' });
    wrap.appendChild(el('div', {
      class: 'cart-empty-icon',
      'aria-hidden': 'true',
      html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>'
    }));
    wrap.appendChild(el('p', { class: 'cart-empty-text' }, t('cart_empty', 'Your quote request is empty')));
    const prefix = langPrefix(lang);
    wrap.appendChild(el('a', {
      class: 'cart-btn cart-btn-primary',
      href: prefix + '/products.html'
    }, t('cart_empty_cta', 'Browse products')));
    return wrap;
  }

  function renderModalBody() {
    if (!modalEl) return;
    const body = modalEl.querySelector('.cart-body');
    const footer = modalEl.querySelector('.cart-footer');
    if (!body || !footer) return;

    body.innerHTML = '';
    footer.innerHTML = '';

    const n = totalCount();
    const countEl = modalEl.querySelector('.cart-count');
    if (countEl) countEl.textContent = n > 0 ? totalText(n) : '';

    if (state.items.length === 0) {
      body.appendChild(renderEmpty());
      return;
    }

    const list = el('div', { class: 'cart-items' });
    for (let i = 0; i < state.items.length; i++) {
      const item = state.items[i];
      const product = (productsMap && productsMap[item.id]) || null;
      list.appendChild(renderItemRow(item, product));
    }
    body.appendChild(list);

    const notesWrap = el('div', { class: 'cart-notes-wrap' });
    notesWrap.appendChild(el('label', {
      class: 'cart-notes-label',
      for: 'cart-notes'
    }, t('cart_notes_label', 'Notes (optional)')));
    notesWrap.appendChild(el('textarea', {
      id: 'cart-notes',
      class: 'cart-notes',
      rows: '2',
      placeholder: t('cart_notes_placeholder', 'e.g. installation needed, delivery to...')
    }));
    body.appendChild(notesWrap);

    // Footer with clear + WhatsApp
    const clearBtn = el('button', {
      type: 'button',
      class: 'cart-btn cart-btn-ghost',
      on: { click: function () {
        clear();
      }}
    }, t('cart_clear_all', 'Clear all'));
    footer.appendChild(clearBtn);

    const waBtn = el('a', {
      class: 'cart-btn cart-btn-whatsapp',
      href: buildWhatsAppHref(),
      target: '_blank',
      rel: 'noopener noreferrer',
      on: {
        click: function () {
          // Rebuild href right before navigation in case notes changed
          this.href = buildWhatsAppHref();
        }
      }
    }, [
      el('span', {
        'aria-hidden': 'true',
        html: '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20.52 3.48A11.85 11.85 0 0 0 12.04 0C5.5 0 .18 5.32.18 11.87c0 2.09.55 4.12 1.59 5.92L0 24l6.4-1.68a11.86 11.86 0 0 0 5.64 1.43h.01c6.54 0 11.86-5.32 11.86-11.87 0-3.17-1.23-6.15-3.39-8.4zM12.04 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.8 1 1.02-3.7-.24-.38a9.86 9.86 0 0 1-1.51-5.26c0-5.44 4.43-9.87 9.87-9.87 2.64 0 5.11 1.03 6.97 2.9a9.79 9.79 0 0 1 2.89 6.98c0 5.44-4.43 9.87-9.87 9.87zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.35.19 1.86.12.57-.08 1.76-.72 2.01-1.41.24-.7.24-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"/></svg>'
      }),
      el('span', null, t('cart_send_whatsapp', 'Send Request via WhatsApp'))
    ]);
    footer.appendChild(waBtn);
  }

  function buildModal() {
    const root = el('div', {
      id: 'cart-modal-root',
      class: 'cart-modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'cart-title'
    });
    root.appendChild(el('div', {
      class: 'cart-modal-backdrop',
      on: { click: close }
    }));

    const panel = el('div', { class: 'cart-modal-panel' });

    panel.appendChild(el('button', {
      type: 'button',
      class: 'cart-close',
      'aria-label': t('cart_aria_close', 'Close quote request'),
      html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
      on: { click: close }
    }));

    const header = el('header', { class: 'cart-header' });
    header.appendChild(el('h2', { id: 'cart-title', class: 'cart-title' }, t('cart_title', 'Your Quote Request')));
    header.appendChild(el('p', { class: 'cart-count' }, ''));
    panel.appendChild(header);

    panel.appendChild(el('div', { class: 'cart-body' }));
    panel.appendChild(el('footer', { class: 'cart-footer' }));

    root.appendChild(panel);
    document.body.appendChild(root);
    return root;
  }

  async function open() {
    document.querySelectorAll('.cart-modal').forEach(function (n) { n.remove(); });
    modalEl = null;

    lang = detectLang();
    const [d] = await Promise.all([loadLocale(lang), loadProductsIndex()]);
    dict = d || {};

    // Drop items whose products no longer exist in the index
    if (productsMap) {
      state.items = state.items.filter(function (it) { return !!productsMap[it.id]; });
      saveState();
    }

    modalEl = buildModal();
    modalEl.setAttribute('dir', document.documentElement.getAttribute('dir') || (lang === 'ar' ? 'rtl' : 'ltr'));
    renderModalBody();
    requestAnimationFrame(function () {
      document.body.classList.add('cart-open');
      modalEl.classList.add('cart-visible');
    });
  }

  function close() {
    if (!modalEl) return;
    modalEl.classList.remove('cart-visible');
    document.body.classList.remove('cart-open');
    setTimeout(function () {
      if (modalEl) { modalEl.remove(); modalEl = null; }
    }, 280);
  }

  // ---------- Boot ----------
  state = loadState();

  // Eagerly load products index so the badge filter (drop-stale) is accurate
  // before the user clicks. Cheap fetch, force-cache.
  loadProductsIndex().then(function (map) {
    if (map && Object.keys(map).length) {
      const before = state.items.length;
      state.items = state.items.filter(function (it) { return !!map[it.id]; });
      if (state.items.length !== before) saveState();
      refreshBadges();
    }
  });

  // Initial badge paint (covers the case where products didn't load yet).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshBadges);
  } else {
    refreshBadges();
  }

  // Watch for badge nodes inserted later (e.g. SPA mounts the navbar after
  // the cart.js defer script runs). Re-paint when a new badge appears so it
  // shows the correct count on first render.
  const obs = new MutationObserver(function (mutations) {
    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      for (let j = 0; j < m.addedNodes.length; j++) {
        const n = m.addedNodes[j];
        if (n.nodeType !== 1) continue;
        if (n.matches && (n.matches('[data-cart-badge]') || n.querySelector && n.querySelector('[data-cart-badge]'))) {
          refreshBadges();
          return;
        }
      }
    }
  });
  if (document.body) {
    obs.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      obs.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Esc closes
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalEl && modalEl.classList.contains('cart-visible')) close();
  });

  // Public API
  window.Cart = {
    open: open,
    close: close,
    add: add,
    remove: remove,
    setQty: setQty,
    clear: clear,
    count: totalCount,
    getItems: function () { return state.items.slice(); }
  };
})();
