/*
 * se-articles.js — the articles list (scripts/build_article_pages.py writes its HTML):
 * two filter rows (protocol, type) show the matching cards. The choice lives in the address
 * (?protocol=knx&type=guide), so a protocol page can link to "all KNX articles" and a filtered
 * list can be shared.
 */
(function () {
  'use strict';
  var grid = document.getElementById('agrid');
  if (!grid) return;
  var none = document.getElementById('anone');
  var rail = window.seRail ? window.seRail(document.getElementById('arail')) : { center: function () {} };
  var state = { protocol: 'all', type: 'all' };

  var q = new URLSearchParams(location.search);
  ['protocol', 'type'].forEach(function (k) {
    var v = q.get(k);
    if (v && document.querySelector('[data-f="' + k + '"][data-v="' + CSS.escape(v) + '"]')) state[k] = v;
  });

  function apply(push) {
    var shown = 0;
    grid.querySelectorAll('.art-card').forEach(function (c) {
      var ok = (state.protocol === 'all' || (' ' + c.getAttribute('data-p') + ' ').indexOf(' ' + state.protocol + ' ') >= 0) &&
               (state.type === 'all' || c.getAttribute('data-t') === state.type);
      c.hidden = !ok;
      if (ok) shown++;
    });
    if (none) none.hidden = shown > 0;
    document.querySelectorAll('[data-f]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(state[b.getAttribute('data-f')] === b.getAttribute('data-v')));
    });
    if (push) {
      var p = new URLSearchParams();
      if (state.protocol !== 'all') p.set('protocol', state.protocol);
      if (state.type !== 'all') p.set('type', state.type);
      var s = p.toString();
      history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
    }
  }

  document.getElementById('main').addEventListener('click', function (e) {
    var b = e.target.closest('[data-f]');
    if (!b) return;
    state[b.getAttribute('data-f')] = b.getAttribute('data-v');
    apply(true);
    if (b.closest('#arail')) rail.center(b);
  });
  apply(false);
})();
