/*
 * site-core.js — shared runtime helpers for the quote cart (cart.js) and the
 * solution wizard (find-solution.js), exposed as window.SE. Loaded (defer)
 * before both.
 *
 *  - SE.lang / prefix / t / locale / msg / translate   language and text
 *  - SE.data       JSON fetched once per page (the cart reads the product index)
 *  - SE.whatsapp / el / modal   WhatsApp link, DOM builder, modal shell
 *
 * The pages themselves are written at build time (scripts/build_layout.py and
 * the build_*_pages.py renderers); their small scripts are assets/se*.js.
 */
(function () {
  'use strict';
  if (window.SE) return;

  function lang() {
    return document.documentElement.lang || 'en';
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

  // ---------------- Language & text ----------------
  //
  // The page language is written into <html lang> at build time (one page per
  // language); everything here reads it from there, so every script agrees.

  // '' for English, '/fr' or '/ar' — the prefix of every internal link.
  function prefix() {
    var l = lang();
    if (l === 'ar') return '/ar';
    if (l === 'fr') return '/fr';
    return '';
  }

  // The visitor's language out of a {en, fr, ar} object (a plain string is
  // returned as is), falling back to en, fr, ar.
  function t(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang()] || obj.en || obj.fr || obj.ar || '';
  }

  // The locale dictionary (assets/locales/<lang>.json), fetched once per page
  // whoever asks first.
  var localeCache = {};
  function locale(l) {
    l = l || lang();
    if (!localeCache[l]) {
      localeCache[l] = fetch('/assets/locales/' + l + '.json')
        .then(function (res) { return res.ok ? res.json() : {}; })
        .catch(function () { return {}; });
    }
    return localeCache[l];
  }

  // One string from a dictionary (default: the page's, loaded at start);
  // `fallback` (or the key itself) when it has none.
  function msg(key, fallback, dict) {
    var d = dict || window.__site_i18n_dict || {};
    var v = d[key];
    if (typeof v === 'string' && v.length) return v;
    return fallback != null ? fallback : key;
  }

  // ---------------- Data ----------------
  //
  // Each JSON file is fetched once per page, whichever script asks first
  // (the catalog, a detail page and the quote cart all read the product
  // index). Never rejects: a failed load gives `fallback`.

  var jsonCache = {};
  function json(url, fallback) {
    if (!jsonCache[url]) {
      jsonCache[url] = fetch(url)
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .catch(function (err) {
          console.error('Failed to load ' + url + ':', err);
          return fallback;
        });
    }
    return jsonCache[url];
  }

  var data = {
    json: json,
    // A fresh array per call — callers sort or shuffle their copy freely.
    products: function () {
      return json('/data/products_index.json', []).then(function (list) {
        return Array.isArray(list) ? list.slice() : [];
      });
    },
    galleries: function () { return json('/data/product_images.json', {}); },
    brands: function () {
      return json('/data/brands_index.json', []).then(function (list) {
        return Array.isArray(list) ? list.slice() : [];
      });
    }
  };

  // ---------------- Quote / contact over WhatsApp ----------------

  var WHATSAPP_NUMBER = '212654132112';
  function whatsapp(text) {
    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(text);
  }

  // ---------------- Modals (quote cart, solution wizard) ----------------

  // Small DOM builder: el('div', {class, html, on: {click: fn}, style: {}, …}, children)
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'on') {
          for (var ev in attrs[k]) node.addEventListener(ev, attrs[k][ev]);
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
      var list = Array.isArray(children) ? children : [children];
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c == null) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    }
    return node;
  }

  var CLOSE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';

  // The shared shell of a side/center modal. `name` prefixes every class:
  // <name>-modal, -modal-backdrop, -modal-panel, -close; <body> gets
  // <name>-open and the root <name>-visible while shown. The caller fills
  // the returned `panel` and then calls show(); hide() fades and removes it.
  //   SE.modal({ name: 'cart', id: 'cart-modal-root', labelledBy: 'cart-title',
  //              closeLabel: '…', onClose: fn })
  function modal(opts) {
    var name = opts.name;
    document.querySelectorAll('.' + name + '-modal').forEach(function (n) { n.remove(); });
    var root = el('div', {
      id: opts.id,
      class: name + '-modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': opts.labelledBy
    });
    var requestClose = function () { opts.onClose(); };
    root.appendChild(el('div', { class: name + '-modal-backdrop', on: { click: requestClose } }));
    var panel = el('div', { class: name + '-modal-panel' });
    panel.appendChild(el('button', {
      type: 'button',
      class: name + '-close',
      'aria-label': opts.closeLabel,
      html: CLOSE_ICON,
      on: { click: requestClose }
    }));
    root.appendChild(panel);
    document.body.appendChild(root);
    root.setAttribute('dir', document.documentElement.getAttribute('dir') || (lang() === 'ar' ? 'rtl' : 'ltr'));

    return {
      root: root,
      panel: panel,
      isOpen: function () { return root.classList.contains(name + '-visible'); },
      show: function () {
        // next frame, so the CSS transition runs from the hidden state
        requestAnimationFrame(function () {
          document.body.classList.add(name + '-open');
          root.classList.add(name + '-visible');
        });
      },
      hide: function () {
        root.classList.remove(name + '-visible');
        document.body.classList.remove(name + '-open');
        setTimeout(function () { root.remove(); }, 280);
      }
    };
  }

  // The page's dictionary, loaded once at start: SE.msg falls back to it, so the cart's
  // "added" toast speaks the page language even before the quote drawer has opened.
  locale().then(function (d) { window.__site_i18n_dict = d || {}; });

  window.SE = {
    lang: lang,
    prefix: prefix,
    t: t,
    locale: locale,
    msg: msg,
    escapeHtml: escapeHtml,
    data: data,
    whatsapp: whatsapp,
    el: el,
    modal: modal
  };
})();
