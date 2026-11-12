/* CPS305 Quest — ui/hashView.js
 * Hash table as a row (or grid) of slots: index, content, probe-order badges.
 * EMPTY shows "—", DELETED shows a tombstone "† DEL" (shape + text, not colour).
 * Chaining mode draws each bucket's chain under its slot.
 */
(function (root) {
  'use strict';
  var U = root.CQ.ui, h = U.h;

  /* opts: { label, onPick(i) } ; state: { slots, chains?, path?, current?, selectable?(i), cellState?{i:'ok'|'bad'}, note? } */
  U.hashView = function (container, opts) {
    opts = opts || {};
    var el = h('div.hashview', { role: 'group', 'aria-label': opts.label || 'Hash table' });
    container.appendChild(el);
    var last = null;
    function fmt(v) {
      if (v === null || v === undefined) return '—';
      if (v === 'DELETED') return '† DEL';
      if (typeof v === 'object' && 'k' in v) return '(' + v.k + ' . ' + (v.v === null ? 'NIL' : v.v) + ')';
      return String(v);
    }
    function render(st) {
      last = st;
      U.clear(el);
      var order = {};
      (st.path || []).forEach(function (s, i) { (order[s] = order[s] || []).push(i + 1); });
      st.slots.forEach(function (v, i) {
        var cls = 'slot';
        if (v === null || v === undefined) cls += ' is-empty';
        if (v === 'DELETED') cls += ' is-deleted';
        if (order[i]) cls += ' on-path';
        if (st.current === i) cls += ' is-current';
        if (st.cellState && st.cellState[i]) cls += ' is-' + st.cellState[i];
        var sel = !!(opts.onPick && st.selectable && st.selectable(i));
        var label = 'Slot ' + i + ': ' + (v === null || v === undefined ? 'empty' : v === 'DELETED' ? 'deleted (tombstone)' : fmt(v)) +
          (order[i] ? ', probe ' + order[i].join(' and ') : '') + (st.cellState && st.cellState[i] === 'ok' ? ', correct' : st.cellState && st.cellState[i] === 'bad' ? ', wrong' : '');
        var node = h(sel ? 'button.' + cls.split(' ').join('.') : 'div.' + cls.split(' ').join('.'),
          sel ? { type: 'button', 'aria-label': label, on: { click: function () { opts.onPick(i); } } } : { 'aria-label': label, role: 'listitem' },
          h('span.slot-i', null, String(i)),
          h('span.slot-v', null, fmt(v)),
          order[i] ? h('span.slot-badge', { 'aria-hidden': 'true' }, order[i].map(function (n) { return '#' + n; }).join(' ')) : null,
          st.cellState && st.cellState[i] === 'ok' ? h('span.slot-mark', { 'aria-hidden': 'true' }, '✓') : st.cellState && st.cellState[i] === 'bad' ? h('span.slot-mark', { 'aria-hidden': 'true' }, '✗') : null);
        if (st.chains) {
          var chain = h('div.chain');
          (st.chains[i] || []).forEach(function (k, j) {
            chain.appendChild(h('span.chain-node' + (st.chainHit && st.chainHit[0] === i && st.chainHit[1] === j ? '.is-hit' : ''), null, String(k)));
          });
          node.appendChild(chain);
        }
        el.appendChild(node);
      });
    }
    return { el: el, render: render, focus: function () { var b = el.querySelector('button'); if (b) b.focus(); } };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
