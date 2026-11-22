/*
 * se-brand.js — a brand page (scripts/build_brand_pages.py writes its HTML):
 * the category tabs filter the brand's products, and "Show all" opens the list
 * past the first twelve.
 */
(function () {
  'use strict';
  var grid = document.getElementById('bgrid');
  if (!grid) return;
  var more = document.getElementById('bmore');
  var rail = window.seRail ? window.seRail(document.getElementById('btabs')) : { center: function () {} };

  document.getElementById('main').addEventListener('click', function (e) {
    if (e.target.closest('[data-bmore]')) {
      grid.classList.remove('collapsed');
      if (more) more.hidden = true;
      return;
    }
    var t = e.target.closest('[data-bcat]');
    if (!t) return;
    var c = t.getAttribute('data-bcat');
    // the first-twelve limit only applies to "all"; one category shows whole
    grid.classList.toggle('collapsed', c === 'all' && !!more && !more.hidden);
    document.querySelectorAll('[data-bcat]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
    rail.center(t);
    grid.querySelectorAll('[data-c]').forEach(function (el) { el.hidden = c !== 'all' && el.getAttribute('data-c').split(' ').indexOf(c) < 0; });
  });
})();
