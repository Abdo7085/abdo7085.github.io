/*
 * se-catalog.js — filters, search, sort and paging on the catalog page (products.html).
 *
 * scripts/build_catalog.py writes every product card into the page, plus one JSON block
 * (#cat-data) with each product's facets and the filter labels. This script never builds
 * a card and never fetches product data: it shows, hides and orders the cards already there,
 * and patches the tabs, the filter drawer, the chips and the counts in place (only what
 * changed), so a click costs one layout.
 *
 * URL: ?category=…&q=…&brand=a,b&type=…&tech=…&inst=… (old links with product_type,
 * technology or installation still work).
 */
(function () {
  'use strict';
  var box = document.getElementById('cat-data');
  var grid = document.getElementById('grid');
  if (!box || !grid) return;
  var D = JSON.parse(box.textContent);
  var S = D.s;
  var main = document.getElementById('main');

  function s(k, v) {
    var x = S[k] != null ? String(S[k]) : k;
    if (v) Object.keys(v).forEach(function (n) { x = x.split('{' + n + '}').join(v[n]); });
    return x;
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function count(n) { // counted noun, Arabic: 1 / 2 / 3–10 / 11+
    var f = D.nouns;
    if (D.lang === 'ar') return n === 1 ? f[0] : n === 2 ? f[1] : n + ' ' + (n >= 3 && n <= 10 ? f[2] : f[3]);
    return n + ' ' + (n === 1 ? f[0] : f[1]);
  }

  // products: [id, category, type, brand, techs, installation, title, search text]
  var P = D.products.map(function (a, i) {
    return { id: a[0], cat: a[1], type: a[2], brand: a[3], tech: a[4], inst: a[5], title: a[6], hay: a[7], i: i };
  });
  var CATS = {}, TYPES = {}, INSTS = {};
  D.cats.forEach(function (c) { CATS[c[0]] = { label: c[1], types: c[2] }; c[2].forEach(function (t) { TYPES[t[0]] = t[1]; }); });
  D.insts.forEach(function (x) { INSTS[x[0]] = x[1]; });
  var CARDS = {};
  Array.prototype.forEach.call(grid.children, function (el) { CARDS[el.getAttribute('data-id')] = el; });

  // ---- state from the URL ----
  var q0 = new URLSearchParams(location.search);
  function set(k) { return new Set((q0.get(k) || '').split(',').filter(Boolean)); }
  function union(a, b) { b.forEach(function (x) { a.add(x); }); return a; }
  var cat0 = q0.get('category') || q0.get('cat');
  var ST = {
    cat: cat0 && CATS[cat0] ? cat0 : 'all',
    q: q0.get('q') || '',
    type: union(set('type'), set('product_type')),
    brand: set('brand'),
    tech: union(set('tech'), set('technology')),
    inst: union(set('inst'), set('installation')),
    sort: 'featured',
    shown: D.page
  };
  var FOPEN = {};

  // ---- matching ----
  function hit(p) {
    if (!ST.q) return true;
    return ST.q.toLowerCase().split(/\s+/).filter(Boolean).every(function (w) { return p.hay.indexOf(w) >= 0; });
  }
  function match(p, skip) {
    if (skip !== 'cat' && ST.cat !== 'all' && p.cat !== ST.cat) return false;
    if (!hit(p)) return false;
    if (skip !== 'type' && ST.type.size && !ST.type.has(p.type)) return false;
    if (skip !== 'brand' && ST.brand.size && !ST.brand.has(p.brand)) return false;
    if (skip !== 'tech' && ST.tech.size && !p.tech.some(function (t) { return ST.tech.has(t); })) return false;
    if (skip !== 'inst' && ST.inst.size && !ST.inst.has(p.inst)) return false;
    return true;
  }
  function tally(skip, key) {
    var m = {};
    P.forEach(function (p) {
      if (!match(p, skip)) return;
      [].concat(p[key]).forEach(function (k) { m[k] = (m[k] || 0) + 1; });
    });
    return m;
  }

  // ---- patch a box to new HTML in place: only changed text, attributes and nodes ----
  function morph(el, html) {
    if (!el) return;
    if (!el.firstChild) { el.innerHTML = html; return; }
    var tpl = document.createElement('template'); tpl.innerHTML = html;
    patch(el, tpl.content);
  }
  function patch(a, b) {
    var ak = a.childNodes, bk = Array.prototype.slice.call(b.childNodes), i, j, at;
    for (i = 0; i < bk.length; i++) {
      var x = ak[i], y = bk[i];
      if (!x) { a.appendChild(y); continue; }
      if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { a.replaceChild(y, x); continue; }
      if (x.nodeType === 3) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
      if (x.nodeType !== 1) continue;
      for (j = x.attributes.length - 1; j >= 0; j--) { at = x.attributes[j].name; if (!y.hasAttribute(at)) x.removeAttribute(at); }
      for (j = 0; j < y.attributes.length; j++) { at = y.attributes[j]; if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value); }
      if (x.nodeName === 'INPUT' && x.checked !== y.hasAttribute('checked')) x.checked = y.hasAttribute('checked');
      if (x.nodeName === 'DETAILS' && x.open !== y.hasAttribute('open')) x.open = y.hasAttribute('open');
      patch(x, y);
    }
    while (ak.length > bk.length) a.removeChild(a.lastChild);
  }

  // ---- filter drawer ----
  function fgroup(key, title, opts, first) {
    var picked = ST[key].size;
    var open = key in FOPEN ? FOPEN[key] : (first || picked > 0);
    return '<details class="fgroup" data-fg="' + key + '"' + (open ? ' open' : '') + '><summary><h3>' + esc(title) + '</h3>' +
      (picked ? '<span class="fg-n">' + picked + '</span>' : '') + '<span class="fg-chev" aria-hidden="true"></span></summary><div class="fg-body">' +
      opts.map(function (o) {
        var on = ST[key].has(o[0]);
        return '<label class="fopt' + (o[2] || on ? '' : ' is-zero') + '"><input type="checkbox" data-f="' + key + '" value="' + esc(o[0]) + '"' + (on ? ' checked' : '') + '>' +
          '<span class="lbl">' + (o[3] || '') + esc(o[1]) + '</span><span class="n">' + o[2] + '</span></label>';
      }).join('') + '</div></details>';
  }

  var PLUG = '<svg class="plug" viewBox="0 0 160 110" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 80c24 0 28-24 50-24h4"/><rect x="58" y="43" width="28" height="26" rx="7"/><path d="M86 50h11M86 62h11"/>' +
    '<path d="M106 44l7-5M108 56h9M106 68l7 5" opacity=".55"/>' +
    '<rect x="124" y="32" width="32" height="48" rx="10"/><circle cx="135" cy="56" r="2.6" fill="currentColor"/><circle cx="145" cy="56" r="2.6" fill="currentColor"/></svg>';
  var empty = null;

  function render() {
    var catN = tally('cat', 'cat'), allN = 0;
    Object.keys(catN).forEach(function (k) { allN += catN[k]; });

    // tabs: counts and the pressed one
    Array.prototype.forEach.call(document.querySelectorAll('#rail [data-cat]'), function (b) {
      var id = b.getAttribute('data-cat'), n = id === 'all' ? allN : (catN[id] || 0);
      var on = String(ST.cat === id);
      if (b.getAttribute('aria-pressed') !== on) b.setAttribute('aria-pressed', on);
      b.classList.toggle('is-zero', id !== 'all' && !n);
      var ns = b.querySelector('.n');
      if (ns.textContent !== String(n)) ns.textContent = n;
    });

    // heading
    var c = CATS[ST.cat];
    var title = c ? c.label : s('products_title');
    var lead = c ? c.types.map(function (x) { return x[1]; }).join(' · ') : s('products_desc');
    var tEl = document.getElementById('cat-title'), lEl = document.getElementById('cat-lead');
    if (tEl.textContent !== title) tEl.textContent = title;
    if (lEl.textContent !== lead) lEl.textContent = lead;

    // the list
    var list = P.filter(function (p) { return match(p); });
    if (ST.sort === 'name') list.sort(function (a, b) { return a.title.localeCompare(b.title, D.lang); });
    if (ST.sort === 'brand') list.sort(function (a, b) { return a.brand.localeCompare(b.brand) || a.title.localeCompare(b.title, D.lang); });

    // filter drawer: categories first (one choice, same as the tabs), then the groups
    var catRows = [['all', s('all'), allN]].concat(D.cats.map(function (x) { return [x[0], x[1], catN[x[0]] || 0]; }));
    var catOpen = 'cat' in FOPEN ? FOPEN.cat : true;
    var html = '<div class="filters-head"><h2 class="h3">' + esc(s('filters')) + '</h2><button class="x-btn" type="button" data-close aria-label="' + esc(s('wizard_close')) + '">' + D.x + '</button></div>' +
      '<details class="fgroup" data-fg="cat"' + (catOpen ? ' open' : '') + '><summary><h3>' + esc(s('f_cats')) + '</h3>' +
      (ST.cat !== 'all' ? '<span class="fg-n">1</span>' : '') + '<span class="fg-chev" aria-hidden="true"></span></summary><div class="fg-body fcats">' +
      catRows.map(function (r) {
        return '<button type="button" class="fcat' + (r[2] || ST.cat === r[0] ? '' : ' is-zero') + '" data-cat="' + r[0] + '" aria-pressed="' + (ST.cat === r[0]) + '">' +
          '<span class="lbl">' + esc(r[1]) + '</span><span class="n">' + r[2] + '</span></button>';
      }).join('') + '</div></details>';
    if (c && c.types.length > 1) {
      var tn = tally('type', 'type');
      html += fgroup('type', s('filter_product_type'), c.types.map(function (x) { return [x[0], x[1], tn[x[0]] || 0, '']; }), true);
    }
    var bn = tally('brand', 'brand');
    html += fgroup('brand', s('filter_brand'), D.brands.map(function (b) { return [b, b, bn[b] || 0, '']; }));
    var xn = tally('tech', 'tech');
    html += fgroup('tech', s('filter_technology'), D.techs.map(function (x) { return [x[0], x[0], xn[x[0]] || 0, x[1]]; }));
    var inN = tally('inst', 'inst');
    html += fgroup('inst', s('filter_installation'), D.insts.map(function (x) { return [x[0], x[1], inN[x[0]] || 0, '']; }));
    html += '<div class="filters-apply"><button class="btn btn-primary btn-block" type="button" data-close>' + esc(s('show_n', { n: list.length })) + '</button></div>';
    morph(document.getElementById('filters'), html);
    var picked = ST.type.size + ST.brand.size + ST.tech.size + ST.inst.size, fc = document.getElementById('fcount');
    fc.hidden = !picked; fc.textContent = picked;

    // chips
    var chips = [];
    if (ST.q) chips.push(['q', ST.q, '“' + ST.q + '”']);
    ST.type.forEach(function (v) { chips.push(['type', v, TYPES[v] || v]); });
    ST.brand.forEach(function (v) { chips.push(['brand', v, v]); });
    ST.tech.forEach(function (v) { chips.push(['tech', v, v]); });
    ST.inst.forEach(function (v) { chips.push(['inst', v, INSTS[v] || v]); });
    morph(document.getElementById('chips'), chips.map(function (ch) {
      return '<button class="chip chip-x" type="button" data-unset="' + ch[0] + '" data-v="' + esc(ch[1]) + '">' + esc(ch[2]) + D.x + '</button>';
    }).join('') + (chips.length > 1 ? '<button class="chip" type="button" data-clear>' + esc(s('clear_all')) + '</button>' : ''));

    // cards: same elements, reordered only when the order changes
    var shown = list.slice(0, ST.shown);
    var counted = s('results', { a: shown.length, n: esc(count(list.length)) });
    morph(document.getElementById('count'), counted);
    if (!list.length) {
      grid.hidden = true;
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'empty';
        empty.innerHTML = PLUG + '<h3 class="h3">' + esc(s('empty_title')) + '</h3><p>' + esc(s('empty_text')) + '</p>' +
          '<div class="actions" style="justify-content:center"><button class="btn btn-primary" type="button" data-clear>' + esc(s('clear_all')) + '</button>' +
          '<a class="btn btn-line" href="https://wa.me/212654132112" target="_blank" rel="noopener">' + D.wa + esc(s('ask_whatsapp')) + '</a></div>';
        grid.parentNode.insertBefore(empty, grid);
      }
      empty.hidden = false;
    } else {
      grid.hidden = false;
      if (empty) empty.hidden = true;
      var order = (ST.sort === 'featured' ? P : list.concat(P.filter(function (p) { return list.indexOf(p) < 0; })));
      var els = order.map(function (p) { return CARDS[p.id]; });
      var same = els.every(function (el, i) { return grid.children[i] === el; });
      if (!same) grid.replaceChildren.apply(grid, els);
      var on = {};
      shown.forEach(function (p) { on[p.id] = 1; });
      P.forEach(function (p) { var el = CARDS[p.id], h = !on[p.id]; if (el.hidden !== h) el.hidden = h; });
    }
    morph(document.getElementById('more'), list.length > shown.length
      ? '<div class="load-more"><div class="bar"><span style="width:' + Math.round(shown.length / list.length * 100) + '%"></span></div>' +
        '<p>' + counted + '</p><button class="btn btn-line" type="button" data-more>' + esc(s('load_more')) + '</button></div>'
      : '');

    // URL, so the view can be shared or restored with the back button
    var u = new URLSearchParams();
    if (ST.cat !== 'all') u.set('category', ST.cat);
    if (ST.q) u.set('q', ST.q);
    ['type', 'brand', 'tech', 'inst'].forEach(function (k) { if (ST[k].size) u.set(k, Array.from(ST[k]).join(',')); });
    var qs = u.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs.replace(/%2C/g, ',') : '')); } catch (e) { /* sandboxed */ }
    railNav();
  }

  // ---- category tabs that don't fit: shared row helper from se.js ----
  var rail = window.seRail(document.getElementById('rail'));
  var railNav = rail.nav;
  function railCenter() { rail.center(document.querySelector('#rail [data-cat="' + ST.cat + '"]')); }

  // ---- drawer open / close ----
  var drawer = document.getElementById('filters'), scrim = document.getElementById('scrim');
  function openDrawer(on) {
    drawer.classList.toggle('open', on);
    scrim.classList.toggle('open', on);
    document.documentElement.style.overflow = on ? 'hidden' : '';
  }
  drawer.addEventListener('toggle', function (e) {
    var g = e.target.getAttribute && e.target.getAttribute('data-fg');
    if (g) FOPEN[g] = e.target.open;
  }, true);
  scrim.addEventListener('click', function () { openDrawer(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) openDrawer(false); });

  // ---- inputs ----
  var input = document.getElementById('q'), timer;
  input.value = ST.q;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { ST.q = input.value.trim(); ST.shown = D.page; render(); }, 160);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement === document.body) { e.preventDefault(); input.focus(); }
  });
  document.getElementById('sort').addEventListener('change', function (e) { ST.sort = e.target.value; render(); });
  main.addEventListener('change', function (e) {
    var f = e.target.getAttribute('data-f');
    if (!f) return;
    if (e.target.checked) ST[f].add(e.target.value); else ST[f].delete(e.target.value);
    ST.shown = D.page; render();
  });
  main.addEventListener('click', function (e) {
    var t;
    if (e.target.closest('[data-rail]')) return;
    if ((t = e.target.closest('[data-cat]'))) {
      ST.cat = t.getAttribute('data-cat'); ST.type.clear(); ST.shown = D.page; render(); railCenter();
    } else if ((t = e.target.closest('[data-unset]'))) {
      var k = t.getAttribute('data-unset');
      if (k === 'q') { ST.q = ''; input.value = ''; } else ST[k].delete(t.getAttribute('data-v'));
      render();
    } else if (e.target.closest('[data-clear]')) {
      ST.q = ''; input.value = ''; ['type', 'brand', 'tech', 'inst'].forEach(function (k) { ST[k].clear(); });
      render();
    } else if (e.target.closest('[data-more]')) {
      ST.shown += D.page; render();
    } else if (e.target.closest('[data-filters]')) {
      openDrawer(true);
    } else if (e.target.closest('[data-close]')) {
      openDrawer(false);
    }
  });

  render();
  if (ST.cat !== 'all') railCenter();
})();
