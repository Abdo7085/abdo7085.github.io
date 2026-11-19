/*
 * se-product.js — the product page (scripts/build_product.py writes its HTML):
 * gallery thumbnails, quantity, "show all specifications", and the buy bar that
 * appears on phones once the quote box has scrolled away.
 * Adding to the quote is the cart's job (data-trigger="cart-add"; the quantity is
 * read from .pd-qty-input in .pd-cart-row).
 */
(function () {
  'use strict';
  var stage = document.getElementById('stage');
  if (!stage) return;
  var main = document.getElementById('main');
  var fig = document.getElementById('fig');
  var out = document.getElementById('qty');
  var input = document.querySelector('.pd-qty-input');
  var qty = 1;
  var thumbs = Array.prototype.slice.call(document.querySelectorAll('.pd-thumb img'));
  var figText = fig ? fig.textContent : '';

  function setQty(n) {
    qty = Math.max(1, Math.min(99, n));
    out.textContent = qty;
    input.value = qty;
  }

  main.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-thumb]'))) {
      var i = +t.getAttribute('data-thumb'), src = thumbs[i], img = stage.querySelector('img');
      if (src && img) {
        // the thumbnail's own file is small; ask for the stage size from the same srcset family
        img.removeAttribute('srcset');
        img.src = src.currentSrc || src.src;
        if (src.getAttribute('srcset')) img.setAttribute('srcset', src.getAttribute('srcset'));
      }
      document.querySelectorAll('[data-thumb]').forEach(function (b) { b.setAttribute('aria-current', String(b === t)); });
      // "Fig. 01 / 05": swap the first number
      if (fig) fig.textContent = figText.replace(/\d+(?=\D*\/)/, (i < 9 ? '0' : '') + (i + 1));
    } else if ((t = e.target.closest('[data-qty]'))) {
      setQty(qty + (+t.getAttribute('data-qty')));
    } else if ((t = e.target.closest('[data-specs]'))) {
      var open = t.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.specs [data-extra]').forEach(function (r) { r.hidden = open; });
      t.setAttribute('aria-expanded', String(!open));
      t.textContent = t.getAttribute(open ? 'data-more' : 'data-less');
    }
  });

  // After "add to quote" the quantity goes back to 1. Capture phase on the document: the cart
  // handler in the page <head> stops the click there, and only same-node listeners still run.
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.pd-cart-row [data-trigger="cart-add"]')) {
      setTimeout(function () { setQty(1); }, 0); // the cart has read the quantity by now
    }
  }, true);

  var bar = document.getElementById('buybar'), buy = document.getElementById('buy');
  if (bar && buy && 'IntersectionObserver' in window) {
    document.body.classList.add('has-buybar');
    new IntersectionObserver(function (en) {
      bar.classList.toggle('show', !en[0].isIntersecting && en[0].boundingClientRect.top < 0);
    }).observe(buy);
  }
})();
