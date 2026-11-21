/*
 * se.js — behaviour for the static header and footer (scripts/build_layout.py writes their HTML).
 *
 * The quote button and the "find a solution" buttons need nothing here: they carry
 * data-trigger="cart-open" / "find-solution", which the page's cart and wizard handlers
 * already catch, and cart.js paints the [data-cart-badge] count.
 */
(function () {
  'use strict';

  // The header's real height (logo, wire stripe, safe area), for layouts that fill the screen
  // under it (the homepage's first screen): exposed as --hdr-real on <html>.
  var hdr = document.querySelector('.hdr');
  function hdrHeight() {
    if (hdr) document.documentElement.style.setProperty('--hdr-real', hdr.getBoundingClientRect().bottom + 'px');
  }
  hdrHeight();
  window.addEventListener('resize', hdrHeight);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(hdrHeight);

  var menu = document.getElementById('menu');
  var burger = document.querySelector('.hdr [data-menu]');

  function setMenu(open) {
    if (!menu || !burger) return;
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (menu && burger) {
    burger.addEventListener('click', function () {
      setMenu(!menu.classList.contains('open'));
    });
    // A link inside the menu (#contact, another page) or a button closes it. Listened on the
    // document in the capture phase: the cart and wizard handlers in the page <head> stop the
    // click there, and only listeners on that same node still run.
    // A click outside the menu (the quote button, the page) closes it too.
    document.addEventListener('click', function (e) {
      if (!menu.classList.contains('open') || burger.contains(e.target)) return;
      if (!menu.contains(e.target) || e.target.closest('a, button')) setMenu(false);
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); burger.focus(); }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1020) setMenu(false);
    });
  }

  /* ---------- Scrolling tab rows (catalog categories, brand page): swipe, mouse wheel or the
     arrows at the ends; the arrow + fade show only on a side with more tabs hidden.
     window.seRail(row) wires one row; it returns { nav, center(tab) }. ---------- */
  window.seRail = function (rail) {
    if (!rail) return { nav: function () {}, center: function () {} };
    var dir = document.documentElement.dir === 'rtl' ? -1 : 1;
    var box = rail.parentNode;
    function nav() {
      var max = rail.scrollWidth - rail.clientWidth, at = Math.abs(rail.scrollLeft);
      box.classList.toggle('can-start', at > 2);
      box.classList.toggle('can-end', max - at > 2);
    }
    rail.addEventListener('scroll', nav, { passive: true });
    rail.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      var max = rail.scrollWidth - rail.clientWidth, at = Math.abs(rail.scrollLeft), fwd = e.deltaY > 0;
      if (max < 2 || (fwd && max - at < 2) || (!fwd && at < 2)) return; // at an end: let the page scroll
      e.preventDefault(); rail.scrollLeft += dir * e.deltaY;
    }, { passive: false });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rail]');
      if (b) rail.scrollBy({ left: +b.getAttribute('data-rail') * dir * rail.clientWidth * 0.7, behavior: 'smooth' });
    });
    window.addEventListener('resize', nav);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(nav);
    nav();
    return {
      nav: nav,
      center: function (t) {
        if (t) rail.scrollTo({ left: t.offsetLeft - (rail.clientWidth - t.offsetWidth) / 2, behavior: 'smooth' });
      }
    };
  };

  /* ---------- Homepage (scripts/build_home.py writes the HTML) ---------- */

  // Brand strip: arrows and soft edges appear only when the logos don't all fit
  var strip = document.getElementById('bstrip');
  if (strip) {
    var row = strip.querySelector('.brand-logos');
    var rtl = document.documentElement.dir === 'rtl';
    var updStrip = function () {
      var max = row.scrollWidth - row.clientWidth, pos = Math.abs(row.scrollLeft);
      strip.classList.toggle('is-scroll', max > 2);
      var before = pos > 2, after = pos < max - 2; // in reading direction
      row.style.setProperty('--fl', (rtl ? after : before) ? '0' : '1');
      row.style.setProperty('--fr', (rtl ? before : after) ? '0' : '1');
      strip.querySelector('[data-bs="-1"]').disabled = !before;
      strip.querySelector('[data-bs="1"]').disabled = !after;
    };
    strip.addEventListener('click', function (e) {
      var b = e.target.closest('[data-bs]');
      if (b) row.scrollBy({ left: +b.getAttribute('data-bs') * row.clientWidth * 0.75 * (rtl ? -1 : 1), behavior: 'smooth' });
    });
    row.addEventListener('scroll', updStrip, { passive: true });
    window.addEventListener('resize', updStrip);
    window.addEventListener('load', updStrip); // after the logos have their size
    updStrip();
  }

  // The demo panel: a villa photo split into a lights-off base and two light layers;
  // a scene is a few opacities plus shutters that roll down.
  var dev = document.getElementById('dev');
  if (dev) {
    var words = {};
    try { words = JSON.parse(dev.getAttribute('data-words')) || {}; } catch (err) { /* keep keys */ }
    var w = function (k) { return words[k] || k; };
    var SCENES = {
      sc_dinner: { light: 80, facade: true, shut: false, clim: true, dim: 0 },
      sc_movie: { light: 20, facade: true, shut: true, clim: true, dim: 0.35 },
      sc_sleep: { light: 0, facade: false, shut: true, clim: true, dim: 0.55 },
      sc_away: { light: 0, facade: true, shut: true, clim: false, dim: 0.62 }
    };
    var HS = { light: 80, facade: true, shut: false, clim: true, dim: 0 };
    var scene = 'sc_dinner';
    var $ = function (id) { return document.getElementById(id); };
    var range = $('dev-light');
    var paint = function () {
      dev.style.setProperty('--dim', String(HS.dim));
      $('lt-int').style.opacity = String(Math.min(1, HS.light / 80));
      $('lt-ext').style.opacity = HS.facade ? '1' : '0';
      dev.querySelectorAll('.shutter').forEach(function (el) { el.classList.toggle('closed', HS.shut); });
      if (+range.value !== HS.light) range.value = HS.light;
      range.style.setProperty('--v', HS.light + '%');
      $('dev-light-v').textContent = HS.light + '%';
      $('key-light').classList.toggle('is-on', HS.light > 0);
      dev.querySelector('[data-dev="facade"]').setAttribute('aria-pressed', String(HS.facade));
      $('st-facade').textContent = w(HS.facade ? 'st_on' : 'st_off');
      dev.querySelector('[data-dev="clim"]').setAttribute('aria-pressed', String(HS.clim));
      $('st-clim').textContent = HS.clim ? '22.5°' : w('st_off');
      dev.querySelector('[data-dev="open"]').setAttribute('aria-pressed', String(!HS.shut));
      dev.querySelector('[data-dev="close"]').setAttribute('aria-pressed', String(HS.shut));
      dev.querySelector('.key-shut').classList.toggle('is-on', HS.shut);
      $('dev-scene').textContent = w(scene || 'custom');
    };
    var custom = function () {
      scene = '';
      dev.querySelectorAll('[data-scene]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    };
    dev.addEventListener('click', function (e) {
      var t = e.target.closest('[data-scene]');
      if (t) {
        scene = t.getAttribute('data-scene');
        var sc = SCENES[scene];
        Object.keys(sc).forEach(function (k) { HS[k] = sc[k]; });
        dev.querySelectorAll('[data-scene]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
        paint();
        return;
      }
      t = e.target.closest('[data-dev]');
      if (!t) return;
      var k = t.getAttribute('data-dev');
      if (k === 'facade') HS.facade = !HS.facade;
      else if (k === 'clim') HS.clim = !HS.clim;
      else HS.shut = k === 'close';
      custom(); paint();
    });
    range.addEventListener('input', function () { HS.light = +range.value; custom(); paint(); });
    // Phones: the panel must fit the visible screen (address bar + bottom bar shown). CSS sizes the
    // square picture from 100svh; it needs the height of everything else in the panel.
    var screenEl = dev.querySelector('.screen');
    var fitPanel = function () {
      dev.style.setProperty('--dev-chrome', (dev.offsetHeight - screenEl.offsetHeight) + 'px');
    };
    fitPanel();
    window.addEventListener('resize', fitPanel);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPanel);
    // the villa switches its lights on when the panel first comes into view
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { io.disconnect(); setTimeout(paint, 350); }
      }, { threshold: 0.3 });
      io.observe(dev);
    } else {
      paint();
    }
  }

  /* ---------- "Add to quote" buttons on cards: show which products are already in the request ---------- */
  function paintAdds() {
    if (!window.Cart || !window.Cart.getItems) return;
    var inCart = {};
    window.Cart.getItems().forEach(function (it) { inCart[it.id] = 1; });
    document.querySelectorAll('.btn-add[data-product-id]').forEach(function (b) {
      var on = !!inCart[b.getAttribute('data-product-id')];
      if (b.classList.contains('is-added') === on) return;
      b.classList.toggle('is-added', on);
      if (!b._label) b._label = b.innerHTML;
      b.innerHTML = on ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>' +
        b.getAttribute('data-added') + '</span>' : b._label;
    });
  }
  if (document.querySelector('.btn-add[data-product-id]')) {
    document.addEventListener('cart:change', paintAdds);
    window.addEventListener('pageshow', paintAdds); // back button: the cart may have changed elsewhere
    (function wait(n) { if (window.Cart) paintAdds(); else if (n) setTimeout(function () { wait(n - 1); }, 100); })(50);
  }

  // A visitor who chose French or Arabic and opens an English catalog, brand or project
  // address (a shared link, a search result) lands on the same page in their language.
  // The homepage (/) stays English on purpose, so the language can always be changed there.
  (function () {
    var path = location.pathname || '/';
    var localized = /^\/(?:products|product|brands|brand|project|previous-work)\.html$/.test(path) ||
      /^\/(?:products|brands|projects)\/[^/]+\.html$/.test(path);
    if (!localized) return;
    var saved = null;
    try { saved = localStorage.getItem('site_lang'); } catch (err) { /* private mode */ }
    if (saved === 'fr' || saved === 'ar') location.replace('/' + saved + path + location.search + location.hash);
  })();

  // GitHub Pages answers every missing address with the root (English) 404.html:
  // on a /fr/… or /ar/… address, show that language's 404 instead.
  (function () {
    var m = location.pathname.match(/^\/(fr|ar)\//);
    if (m && document.body.classList.contains('pg-404') && document.documentElement.lang !== m[1]) {
      location.replace('/' + m[1] + '/404.html');
    }
  })();

  // Legacy query-string pages (product.html, brand.html, project.html ?id=…): the page now lives at its own address
  (function () {
    var m = location.pathname.match(/^(.*\/)(product|brand|project)\.html$/);
    var id = new URLSearchParams(location.search).get('id');
    if (m && id && /^[\w-]+$/.test(id)) location.replace(m[1] + m[2] + 's/' + id + '.html');
  })();

  // Language links are plain links to the page in that language; remember the choice
  // (key site_lang), so the next English address opens in it. The query string
  // (catalog filters, ?id= on the old product.html links) goes along to the other language.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.lang a[hreflang]');
    if (!a) return;
    try { localStorage.setItem('site_lang', a.getAttribute('hreflang')); } catch (err) { /* private mode */ }
    if (location.search && a.getAttribute('href').indexOf('?') < 0) a.setAttribute('href', a.getAttribute('href') + location.search);
  }, true);
})();
