/* CPS305 Quest — ui/treeView.js
 * Generic SVG tree: recursion call trees, merge-sort split trees, quicksort
 * recursion trees, binary/n-ary trees, parse trees, Lisp evaluation trees.
 * Layout: leaves get consecutive x slots, parents sit over their children.
 * Node state is shown with a class AND a text badge (never colour alone).
 * node: { id, label, sub?, children: [], state?: 'hit'|'ok'|'bad'|'dim'|'repeat'|'active'|'done', badge?, hidden? }
 */
(function (root) {
  'use strict';
  var U = root.CQ.ui, h = U.h, s = U.s;

  U.treeView = function (container, opts) {
    opts = opts || {};
    var wrap = h('div.treeview-wrap');
    var svg = s('svg', { class: 'treeview', role: 'group', 'aria-label': opts.label || 'Tree' });
    wrap.appendChild(svg);
    container.appendChild(wrap);
    var last = null, focusId = null;

    function render(rootNode) {
      last = rootNode;
      U.clear(svg);
      if (!rootNode) return;
      var NW = opts.nodeW || 64, NH = 34, GX = opts.gapX || 10, GY = opts.gapY || 30;
      var slot = 0, maxDepth = 0, flat = [];
      (function lay(n, d) {
        n._d = d; maxDepth = Math.max(maxDepth, d);
        var kids = (n.children || []).filter(function (c) { return !c.hidden; });
        if (!kids.length) { n._x = slot++; }
        else { kids.forEach(function (c) { lay(c, d + 1); }); n._x = (kids[0]._x + kids[kids.length - 1]._x) / 2; }
        flat.push(n);
      })(rootNode, 0);
      var W = Math.max(slot, 1) * (NW + GX) + GX, H = (maxDepth + 1) * (NH + GY) + 6;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.style.maxWidth = Math.min(W * 1.4, 1000) + 'px';
      function px(n) { return GX + n._x * (NW + GX) + NW / 2; }
      function py(n) { return 4 + n._d * (NH + GY); }
      var gE = s('g', { class: 'tv-edges' }), gN = s('g', { class: 'tv-nodes' });
      svg.appendChild(gE); svg.appendChild(gN);
      flat.forEach(function (n) {
        (n.children || []).forEach(function (c) {
          if (c.hidden) return;
          gE.appendChild(s('line', { x1: px(n), y1: py(n) + NH, x2: px(c), y2: py(c), class: 'tv-edge' + (c.edgeState ? ' ' + c.edgeState : '') }));
          if (c.edgeLabel) gE.appendChild(s('text', { x: (px(n) + px(c)) / 2 + 4, y: (py(n) + NH + py(c)) / 2, class: 'tv-edge-label' }, c.edgeLabel));
        });
      });
      flat.forEach(function (n) {
        var selectable = !!(opts.onPick && (!opts.selectable || opts.selectable(n)));
        var g = s('g', { class: 'tv-node' + (n.state ? ' is-' + n.state : ''), transform: 'translate(' + (px(n) - NW / 2) + ',' + py(n) + ')', 'data-id': n.id });
        g.appendChild(s('rect', { width: NW, height: NH, rx: 8, class: 'tv-box' }));
        var label = String(n.label);
        g.appendChild(s('text', { x: NW / 2, y: n.sub != null ? 14 : 21, class: 'tv-label' + (label.length > 9 ? ' small' : '') }, label));
        if (n.sub != null) g.appendChild(s('text', { x: NW / 2, y: 28, class: 'tv-sub' }, String(n.sub)));
        if (n.badge) g.appendChild(s('text', { x: NW - 3, y: -3, class: 'tv-badge' }, n.badge));
        var aria = label + (n.sub != null ? ', ' + n.sub : '') + (n.badge ? ', ' + n.badge : '') + (n.state ? ', ' + n.state : '');
        g.setAttribute('aria-label', aria);
        if (selectable) {
          g.setAttribute('role', 'button');
          g.setAttribute('tabindex', n.id === focusId ? '0' : '-1');
          g.addEventListener('click', function () { focusId = n.id; opts.onPick(n); });
          g.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focusId = n.id; opts.onPick(n); return; }
            var order = flat.filter(function (m) { return !opts.selectable || opts.selectable(m); }).sort(function (a, b) { return a._d - b._d || a._x - b._x; });
            var i = order.indexOf(n), d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
            if (!d || !order.length) return;
            e.preventDefault(); e.stopPropagation();
            var nx = order[(i + d + order.length) % order.length];
            focusId = nx.id; render(last);
            var el = svg.querySelector('[data-id="' + nx.id + '"]'); if (el) el.focus();
          });
        }
        gN.appendChild(g);
      });
      // Make sure exactly one selectable node is tabbable.
      if (opts.onPick && !svg.querySelector('[tabindex="0"]')) { var f = svg.querySelector('[role="button"]'); if (f) f.setAttribute('tabindex', '0'); }
    }
    return {
      el: wrap,
      render: render,
      focus: function () { var f = svg.querySelector('[tabindex="0"]') || svg.querySelector('[role="button"]'); if (f) f.focus(); }
    };
  };

  /* Stack view: frames as a vertical tower, newest on top. frames: [{label, sub, state}] */
  U.stackView = function (container, opts) {
    opts = opts || {};
    var el = h('div.stackview', { role: 'list', 'aria-label': opts.label || 'Call stack' });
    var cap = h('div.stack-cap');
    container.appendChild(h('div.stack-wrap', null, cap, el));
    return {
      el: el,
      render: function (frames, caption) {
        U.clear(el);
        cap.textContent = caption || ('Stack depth: ' + frames.length);
        frames.slice().reverse().forEach(function (f, i) {
          el.appendChild(h('div.frame' + (f.state ? '.is-' + f.state : '') + (i === 0 ? '.top' : ''), { role: 'listitem' },
            h('span.frame-label', null, f.label), f.sub ? h('span.frame-sub', null, f.sub) : null));
        });
        if (!frames.length) el.appendChild(h('div.frame-empty', null, '(empty)'));
      }
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
