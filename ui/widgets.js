/* CPS305 Quest — ui/widgets.js
 * Counters (cost made visible), the feedback panel (every wrong answer teaches),
 * and the level header shared by every mini-game.
 */
(function (root) {
  'use strict';
  var U = root.CQ.ui;
  var h = U.h;

  var LABELS = { comparisons: 'Comparisons', swaps: 'Swaps', shifts: 'Shifts', probes: 'Probes', weighings: 'Weighings', writes: 'Writes', calls: 'Calls' };

  /* counters(container, ['comparisons','swaps'], {theory: {comparisons: 'n(n−1)/2 = 15'}}) */
  U.counters = function (container, keys, opts) {
    opts = opts || {};
    var el = h('div.counters', { role: 'group', 'aria-label': opts.label || 'Operation counters' });
    var cells = {};
    keys.forEach(function (k) {
      var v = h('span.cnt-val', null, '0');
      var t = h('span.cnt-theory');
      cells[k] = { v: v, t: t };
      el.appendChild(h('div.cnt', null, h('span.cnt-label', null, LABELS[k] || k), v, t));
    });
    container.appendChild(el);
    return {
      el: el,
      set: function (counts) {
        keys.forEach(function (k) {
          var nv = String(counts[k] || 0);
          if (cells[k].v.textContent !== nv) {
            cells[k].v.textContent = nv;
            cells[k].v.classList.remove('bump'); void cells[k].v.offsetWidth; cells[k].v.classList.add('bump');
          }
        });
      },
      theory: function (map) { keys.forEach(function (k) { cells[k].t.textContent = map && map[k] ? map[k] : ''; }); }
    };
  };

  /* Feedback panel. show({ok, title, why, misconception, actions:[{label, fn}]}) */
  U.feedback = function (container) {
    var el = h('div.feedback', { role: 'status', 'aria-live': 'polite', hidden: true });
    container.appendChild(el);
    return {
      el: el,
      show: function (f) {
        U.clear(el);
        el.hidden = false;
        el.className = 'feedback ' + (f.ok ? 'is-ok' : f.info ? 'is-info' : 'is-bad');
        el.appendChild(h('div.fb-title', null, h('span.fb-icon', { 'aria-hidden': 'true' }, f.ok ? '✓' : f.info ? 'ℹ' : '✗'), ' ', f.title || (f.ok ? 'Correct' : 'Not quite')));
        if (f.misconception) el.appendChild(h('div.fb-mis', null, h('span.tag', null, 'Misconception'), ' ', U.rich(f.misconception)));
        if (f.why) el.appendChild(h('p.fb-why', null, U.rich(f.why)));
        if (f.actions && f.actions.length) {
          var row = h('div.fb-actions');
          f.actions.forEach(function (a) { row.appendChild(U.button(a.label, a.fn, { cls: a.primary ? 'primary' : '' })); });
          el.appendChild(row);
        }
      },
      hide: function () { el.hidden = true; U.clear(el); }
    };
  };

  /* Turn a referee result into feedback text using the content's explanation table. */
  U.explain = function (table, res) {
    var e = table[res.code];
    if (!e) return { why: 'That move does not match the algorithm.' };
    return { title: e.title ? U.fmt(e.title, res.data) : null, why: U.fmt(e.why, res.data), misconception: e.misconception ? U.fmt(e.misconception, res.data) : null };
  };

  /* Share bar: each term's share of the total cost at a chosen n. Segments carry
   * a pattern and a text label, so colour is never the only signal. */
  U.shareBar = function (container, terms, opts) {
    opts = opts || {};
    var B = root.CQ.engine.bigo;
    var ns = opts.ns || [1, 10, 100, 1000, 1000000];
    var el = h('div.sharebar');
    var row = h('div.share-ns', { role: 'radiogroup', 'aria-label': 'Choose n' });
    var bar = h('div.share-track');
    var list = h('ul.share-list', { 'aria-live': 'polite' });
    el.appendChild(h('div.share-head', null, h('span', null, opts.label || 'Share of the total cost at'), row));
    el.appendChild(bar); el.appendChild(list);
    container.appendChild(el);
    var cur = opts.start != null ? opts.start : 1, live = terms;
    ns.forEach(function (n, i) {
      var b = U.button('n = ' + (n >= 1e6 ? '10⁶' : n.toLocaleString('en-US')), function () { cur = i; draw(); }, { cls: 'small', attrs: { role: 'radio' } });
      row.appendChild(b);
    });
    function draw() {
      Array.prototype.forEach.call(row.children, function (b, i) { b.setAttribute('aria-checked', i === cur ? 'true' : 'false'); b.classList.toggle('primary', i === cur); });
      var n = ns[cur], sh = B.shares(live, n);
      U.clear(bar); U.clear(list);
      live.forEach(function (t, i) {
        var pct = sh[i] * 100;
        var seg = h('span.share-seg.seg' + (i % 4 + 1), { style: { width: pct + '%' }, title: B.termText(t) + ': ' + pct.toFixed(1) + '%' });
        if (pct >= 12) seg.textContent = B.termText(t);
        bar.appendChild(seg);
        list.appendChild(h('li', null, h('span.share-sw.seg' + (i % 4 + 1), { 'aria-hidden': 'true' }), B.termText(t) + ': ' + (pct < 0.01 && pct > 0 ? '< 0.01' : pct.toFixed(pct < 1 ? 2 : 1)) + '%'));
      });
    }
    draw();
    return { el: el, setTerms: function (t) { live = t; draw(); } };
  };

  /* Mode chips: Watch -> Try -> Solo (fading scaffolding). */
  U.modeChip = function (mode) {
    var map = { watch: '👀 Watch', try: '🛠 Try', solo: '🎯 Solo', sandbox: '🧪 Practice', boss: '👾 Boss' };
    return h('span.mode-chip.mode-' + mode, null, map[mode] || mode);
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
