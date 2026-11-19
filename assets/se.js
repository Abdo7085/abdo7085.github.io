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
