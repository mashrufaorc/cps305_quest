/* CPS305 Quest — ui/consView.js
 * Box-and-pointer diagrams for Lisp values from engine/lisp.js.
 * Each cons cell is two boxes (CAR | CDR). A CDR of NIL is drawn as a slash;
 * a CAR that is itself a list hangs below its cell. Also: linked-list nodes
 * (Unit 3 Pointer Surgery) drawn as data | next boxes with arrows.
 */
(function (root) {
  'use strict';
  var U = root.CQ.ui, Lisp = root.CQ.engine.lisp, h = U.h, s = U.s;
  var BW = 34, BH = 30, GAP = 26, ROW = 64;

  function atomText(v) { return Lisp.print(v); }

  U.consDiagram = function (container, value, opts) {
    opts = opts || {};
    var svg = s('svg', { class: 'consview', role: 'img', 'aria-label': opts.label || ('Box-and-pointer diagram of ' + Lisp.print(value)) });
    var defs = s('defs', null, s('marker', { id: 'arrowhead', markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: 'auto' }, s('path', { d: 'M0,0 L8,4 L0,8 z', class: 'cv-arrowhead' })));
    svg.appendChild(defs);
    var maxX = 0, maxY = 0;
    function width(v) {
      if (!(v instanceof Lisp.Cons)) return BW * 2;
      var w = 0, c = v;
      while (c instanceof Lisp.Cons) { w += Math.max(BW * 2 + GAP, c.car instanceof Lisp.Cons ? width(c.car) + GAP : 0); c = c.cdr; }
      if (c !== null) w += BW * 2;
      return w;
    }
    function draw(v, x, y) {
      if (!(v instanceof Lisp.Cons)) {
        svg.appendChild(s('rect', { x: x, y: y, width: BW * 2, height: BH, rx: 6, class: 'cv-atom' }));
        svg.appendChild(s('text', { x: x + BW, y: y + BH / 2 + 5, class: 'cv-text' }, atomText(v)));
        maxX = Math.max(maxX, x + BW * 2); maxY = Math.max(maxY, y + BH);
        return;
      }
      var c = v, cx = x;
      while (c instanceof Lisp.Cons) {
        var slot = Math.max(BW * 2 + GAP, c.car instanceof Lisp.Cons ? width(c.car) + GAP : 0);
        svg.appendChild(s('rect', { x: cx, y: y, width: BW, height: BH, class: 'cv-car' }));
        svg.appendChild(s('rect', { x: cx + BW, y: y, width: BW, height: BH, class: 'cv-cdr' }));
        if (c.car instanceof Lisp.Cons) {
          svg.appendChild(s('line', { x1: cx + BW / 2, y1: y + BH / 2, x2: cx + BW / 2, y2: y + ROW - 2, class: 'cv-ptr', 'marker-end': 'url(#arrowhead)' }));
          draw(c.car, cx, y + ROW);
        } else {
          var t = atomText(c.car);
          svg.appendChild(s('text', { x: cx + BW / 2, y: y + BH / 2 + 5, class: 'cv-text' + (t.length > 3 ? ' small' : '') }, t));
        }
        var next = c.cdr;
        if (next === null) {
          svg.appendChild(s('line', { x1: cx + BW + 4, y1: y + BH - 4, x2: cx + 2 * BW - 4, y2: y + 4, class: 'cv-nil' }));
        } else {
          svg.appendChild(s('line', { x1: cx + BW * 1.5, y1: y + BH / 2, x2: cx + slot - 2, y2: y + BH / 2, class: 'cv-ptr', 'marker-end': 'url(#arrowhead)' }));
          if (!(next instanceof Lisp.Cons)) draw(next, cx + slot, y);
        }
        maxX = Math.max(maxX, cx + 2 * BW); maxY = Math.max(maxY, y + BH);
        cx += slot; c = next;
      }
    }
    draw(value, 6, 6);
    svg.setAttribute('viewBox', '0 0 ' + (maxX + 12) + ' ' + (maxY + 10));
    svg.style.maxWidth = Math.min((maxX + 12) * 1.3, 760) + 'px';
    var wrap = h('div.consview-wrap');
    wrap.appendChild(svg);
    container.appendChild(wrap);
    return wrap;
  };

  /* Linked-list nodes for Pointer Surgery. state from engine/lists.js. opts.onPick(target) */
  U.listView = function (container, opts) {
    opts = opts || {};
    var el = h('div.listview');
    container.appendChild(el);
    return {
      el: el,
      render: function (st, ui) {
        ui = ui || {};
        U.clear(el);
        var order = root.CQ.engine.lists.walk(st);
        var floating = Object.keys(st.nodes).filter(function (id) { return order.indexOf(id) < 0; });
        function ptrBtn(label, from, target) {
          var sel = ui.selected === from;
          return U.button(label + ' → ' + (target == null ? 'NIL' : st.nodes[target].data), function () { opts.onPick({ kind: 'pointer', from: from }); },
            { cls: 'ptr-btn' + (sel ? ' is-selected' : ''), attrs: { 'aria-pressed': sel ? 'true' : 'false', 'aria-label': 'Pointer ' + label + ', currently points to ' + (target == null ? 'NIL' : st.nodes[target].data) + '. Select to change it.' } });
        }
        var headRow = h('div.ll-row');
        headRow.appendChild(ptrBtn('HEAD', 'head', st.head));
        el.appendChild(headRow);
        var row = h('div.ll-row', { role: 'list', 'aria-label': 'Reachable list, in order' });
        order.forEach(function (id) { row.appendChild(nodeBox(id, false)); });
        row.appendChild(h('span.ll-nil', null, 'NIL'));
        el.appendChild(row);
        if (floating.length) {
          var fl = h('div.ll-row.ll-floating', { role: 'list', 'aria-label': 'Nodes not reachable from HEAD' });
          fl.appendChild(h('span.small', null, 'Not in the list (nothing points to them yet): '));
          floating.forEach(function (id) { fl.appendChild(nodeBox(id, true)); });
          el.appendChild(fl);
        }
        function nodeBox(id, isFloating) {
          var n = st.nodes[id];
          var box = h('div.ll-node' + (isFloating ? '.is-floating' : '') + (ui.lost && ui.lost.indexOf(id) >= 0 ? '.is-lost' : '') + (ui.targets ? '.is-target' : ''), { role: 'listitem' });
          box.appendChild(U.button(String(n.data), function () { opts.onPick({ kind: 'node', id: id }); },
            { cls: 'll-data', attrs: { 'aria-label': 'Node ' + n.data + (ui.selected ? ': make the selected pointer point here' : '') } }));
          box.appendChild(ptrBtn('.next', id, n.next));
          return box;
        }
        if (ui.selected) el.appendChild(h('div.ll-row', null, U.button('NIL', function () { opts.onPick({ kind: 'node', id: null }); }, { cls: 'small', attrs: { 'aria-label': 'Make the selected pointer NIL' } })));
      }
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
