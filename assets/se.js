/*
 * se.js — behaviour for the static header and footer (scripts/build_layout.py writes their HTML).
 *
 * The quote button and the "find a solution" buttons need nothing here: they carry
 * data-trigger="cart-open" / "find-solution", which the page's cart and wizard handlers
 * already catch, and cart.js paints the [data-cart-badge] count.
 */
(function () {
  'use strict';

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

  // Language links are plain links to the page in that language; remember the choice
  // the same way i18n.js does, so the homepage opens in it next time. The query string
  // (catalog filters, ?id= on the old product.html links) goes along to the other language.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.lang a[hreflang]');
    if (!a) return;
    try { localStorage.setItem('site_lang', a.getAttribute('hreflang')); } catch (err) { /* private mode */ }
    if (location.search && a.getAttribute('href').indexOf('?') < 0) a.setAttribute('href', a.getAttribute('href') + location.search);
  }, true);
})();
