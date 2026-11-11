/* CPS305 Quest — ui/widgets.js
 * Counters (cost made visible), the feedback panel (every wrong answer teaches),
 * and the level header shared by every mini-game.
 */
(function (root) {
  'use strict';
  var U = root.CQ.ui;
  var h = U.h;

  var LABELS = { comparisons: 'Comparisons', swaps: 'Swaps', shifts: 'Shifts', probes: 'Probes', weighings: 'Weighings' };

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

  /* Mode chips: Watch -> Try -> Solo (fading scaffolding). */
  U.modeChip = function (mode) {
    var map = { watch: '👀 Watch', try: '🛠 Try', solo: '🎯 Solo', sandbox: '🧪 Practice', boss: '👾 Boss' };
    return h('span.mode-chip.mode-' + mode, null, map[mode] || mode);
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
