/*
 * se-projects.js — the projects page (previous-work.html, written by
 * scripts/build_project_pages.py): the tabs show the case studies of one kind of work.
 */
(function () {
  'use strict';
  var tabs = document.getElementById('ptabs');
  if (!tabs) return;
  var rail = window.seRail ? window.seRail(tabs) : { center: function () {} }; // one scrolling row, like the catalog
  tabs.addEventListener('click', function (e) {
    var t = e.target.closest('[data-pcat]');
    if (!t) return;
    var c = t.getAttribute('data-pcat');
    tabs.querySelectorAll('[data-pcat]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
    rail.center(t);
    document.querySelectorAll('#plates [data-cats]').forEach(function (el) {
      el.hidden = c !== 'all' && el.getAttribute('data-cats').split('|').indexOf(c) < 0;
    });
  });
})();
