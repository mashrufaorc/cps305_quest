/* CPS305 Quest — ui/arrayView.js
 * SVG array visualizer. Elements are keyed by item id so a swap animates as a
 * real move. Markers (cur, j, lb, ub, mid...) use a shape AND a text label, and
 * regions use patterns, so colour is never the only signal.
 */
(function (root) {
  'use strict';
  var U = root.CQ.ui;
  var h = U.h, s = U.s;

  var CW = 48, GAP = 8, PADX = 6;
  /* Marker legend: shape + label + colour (Okabe–Ito colour-blind-safe palette). */
  var MARKS = {
    cur: { glyph: '▲', label: 'cur', cls: 'm-cur' },
    best: { glyph: '◆', label: 'best', cls: 'm-best' },
    i: { glyph: '▲', label: 'i', cls: 'm-cur' },
    key: { glyph: '★', label: 'next', cls: 'm-best' },
    j: { glyph: '●', label: 'j', cls: 'm-j' },
    end: { glyph: '■', label: 'end', cls: 'm-end' },
    lb: { glyph: '[', label: 'lb', cls: 'm-lb' },
    ub: { glyph: ']', label: 'ub', cls: 'm-lb' },
    mid: { glyph: '▼', label: 'mid', cls: 'm-mid' },
    pivot: { glyph: '◆', label: 'pivot', cls: 'm-best' },
    k: { glyph: '■', label: 'k', cls: 'm-end' }
  };
  U.MARKS = MARKS;

  U.arrayView = function (container, opts) {
    opts = opts || {};
    var root = h('div.arrview-wrap');
    var svg = s('svg', { class: 'arrview', role: 'group', 'aria-label': opts.label || 'Array', preserveAspectRatio: 'xMidYMin meet' });
    var defs = s('defs', null,
      s('pattern', { id: 'pat-sorted', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
        s('rect', { width: 8, height: 8, class: 'pat-sorted-bg' }), s('line', { x1: 0, y1: 0, x2: 0, y2: 8, class: 'pat-sorted-line' })),
      s('pattern', { id: 'pat-disc', width: 8, height: 8, patternUnits: 'userSpaceOnUse' },
        s('path', { d: 'M0 0 L8 8 M8 0 L0 8', class: 'pat-disc-line' })),
      s('pattern', { id: 'pat-tag-b', width: 6, height: 6, patternUnits: 'userSpaceOnUse' },
        s('circle', { cx: 3, cy: 3, r: 1.2, class: 'pat-dot' })),
      s('pattern', { id: 'pat-tag-c', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(-45)' },
        s('line', { x1: 0, y1: 0, x2: 0, y2: 6, class: 'pat-dot-line' }))
    );
    var gRegions = s('g', { class: 'regions' });
    var gIdx = s('g', { class: 'indexes', 'aria-hidden': 'true' });
    var gCells = s('g', { class: 'cells' });
    var gMarks = s('g', { class: 'marks', 'aria-hidden': 'true' });
    var gOver = s('g', { class: 'overlay', 'aria-hidden': 'true' });
    svg.appendChild(defs); svg.appendChild(gRegions); svg.appendChild(gIdx); svg.appendChild(gCells); svg.appendChild(gMarks); svg.appendChild(gOver);
    root.appendChild(svg);
    container.appendChild(root);

    var nodes = {};          // id -> <g>
    var last = null;
    var focusIdx = 0;

    function x(i) { return PADX + i * (CW + GAP); }

    function render(st) {
      last = st;
      var arr = st.arr || [];
      var n = arr.length;
      var bars = !!opts.bars;
      var top = opts.held ? 58 : 22;
      var maxV = Math.max.apply(null, arr.map(function (it) { return Math.abs(it.v); }).concat([1]));
      var cellH = bars ? 110 : 46;
      var small = n > 16;
      var markRows = 3;
      var H = top + cellH + 18 + markRows * 16 + 4;
      var W = Math.max(PADX * 2 + n * (CW + GAP) - GAP, CW * 3);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.style.maxWidth = Math.min(W * 1.35, 980) + 'px';

      // Regions: sorted (hatched + label) and discarded (crossed + faded).
      U.clear(gRegions);
      (st.regions || []).forEach(function (r) {
        if (r.to < r.from || n === 0) return;
        var x0 = x(r.from) - GAP / 2, x1 = x(r.to) + CW + GAP / 2;
        gRegions.appendChild(s('rect', { x: x0, y: top - 4, width: x1 - x0, height: cellH + 8, rx: 6,
          class: 'region region-' + r.kind, fill: 'url(#pat-' + (r.kind === 'sorted' ? 'sorted' : 'disc') + ')' }));
        if (r.kind === 'sorted' && (x1 - x0) > 50)
          gRegions.appendChild(s('text', { x: x0 + 4, y: top - 7, class: 'region-label' }, 'sorted'));
      });

      // Index row under the cells.
      U.clear(gIdx);
      if (!small || opts.showIndex) for (var i = 0; i < n; i++)
        gIdx.appendChild(s('text', { x: x(i) + CW / 2, y: top + cellH + 14, class: 'idx' }, String(i)));

      // Cells, keyed by id so moves animate.
      var seen = {};
      var cmp = st.compare || [], sw = st.swap || [];
      arr.forEach(function (it, i) {
        seen[it.id] = true;
        var g = nodes[it.id];
        if (!g) {
          g = s('g', { class: 'cell' });
          g.appendChild(s('rect', { class: 'cell-box', rx: 6 }));
          g.appendChild(s('rect', { class: 'cell-tag', rx: 6 }));
          g.appendChild(s('text', { class: 'cell-val' }));
          g.appendChild(s('text', { class: 'cell-sub' }));
          g.appendChild(s('text', { class: 'cell-badge' }));
          g.addEventListener('click', function () { pick(+g.getAttribute('data-index')); });
          g.addEventListener('keydown', onKey);
          nodes[it.id] = g;
          gCells.appendChild(g);
        }
        var hgt = bars ? Math.max(14, Math.round((Math.abs(it.v) / maxV) * cellH)) : cellH;
        var y0 = top + (cellH - hgt);
        var box = g.childNodes[0], tag = g.childNodes[1], val = g.childNodes[2], sub = g.childNodes[3], badge = g.childNodes[4];
        box.setAttribute('x', 0); box.setAttribute('y', y0); box.setAttribute('width', CW); box.setAttribute('height', hgt);
        tag.setAttribute('x', 0); tag.setAttribute('y', y0); tag.setAttribute('width', CW); tag.setAttribute('height', hgt);
        tag.setAttribute('fill', it.tag === 'b' ? 'url(#pat-tag-b)' : it.tag === 'c' ? 'url(#pat-tag-c)' : 'none');
        val.setAttribute('x', CW / 2); val.setAttribute('y', bars ? top + cellH - 8 : top + cellH / 2 + (it.tag ? 0 : 6));
        var concealed = !!(st.conceal && st.conceal(i));
        val.textContent = concealed ? '?' : small && bars ? '' : String(it.v);
        sub.setAttribute('x', CW / 2); sub.setAttribute('y', top + cellH / 2 + 17);
        sub.textContent = it.tag && !bars ? it.tag : '';
        var cls = ['cell'];
        if (concealed) cls.push('is-concealed');
        if (it.tag) cls.push('tag-' + it.tag);
        var st8 = st.cellState && st.cellState[i];
        if (cmp.indexOf(i) >= 0) cls.push('is-compare');
        if (sw.indexOf(i) >= 0 && sw[0] !== sw[1]) cls.push('is-swap');
        if (st.found === i) cls.push('is-found');
        if (st.focus && st.focus.indexOf(i) >= 0) cls.push('is-focus');
        if (st8) cls.push('is-' + st8);
        if (st.movingId != null && it.id === st.movingId) cls.push('is-moving');
        var inDisc = (st.regions || []).some(function (r) { return r.kind === 'discarded' && i >= r.from && i <= r.to; });
        if (inDisc) cls.push('is-discarded');
        if (st.hole === i && st.held) cls.push('is-hole');
        g.setAttribute('class', cls.join(' '));
        // Non-colour signal for state: a symbol badge above the cell.
        badge.setAttribute('x', CW / 2); badge.setAttribute('y', y0 - 5);
        badge.textContent = st8 === 'ok' ? '✓' : st8 === 'bad' ? '✗' : st.found === i ? '✓' : cmp.indexOf(i) >= 0 ? '?' : '';
        g.setAttribute('data-index', i);
        var selectable = !!(st.selectable && st.selectable(i));
        g.setAttribute('tabindex', selectable ? (i === focusIdx ? '0' : '-1') : '-1');
        if (selectable) { g.setAttribute('role', 'button'); g.setAttribute('aria-disabled', 'false'); }
        else g.removeAttribute('role');
        var marksHere = Object.keys(st.marks || {}).filter(function (k) { return st.marks[k] === i; });
        g.setAttribute('aria-label', 'Index ' + i + ', value ' + (concealed ? 'hidden' : it.v) + (it.tag ? ' ' + it.tag : '') +
          (marksHere.length ? ', marked ' + marksHere.map(function (k) { return MARKS[k] ? MARKS[k].label : k; }).join(' and ') : '') +
          (inDisc ? ', discarded' : '') + (st8 === 'ok' ? ', correct' : st8 === 'bad' ? ', wrong' : ''));
        var hidden = st.hole === i && st.held;
        g.style.opacity = hidden ? '0.15' : '';
        g.style.transform = 'translate(' + x(i) + 'px, 0px)';
      });
      Object.keys(nodes).forEach(function (id) { if (!seen[id]) { gCells.removeChild(nodes[id]); delete nodes[id]; } });

      // Markers: shape + label, stacked when several share an index.
      U.clear(gMarks);
      var stack = {};
      Object.keys(st.marks || {}).forEach(function (k) {
        var idx = st.marks[k];
        if (idx == null || idx < 0 || idx >= n) return;
        var m = MARKS[k] || { glyph: '•', label: k, cls: 'm-j' };
        var row = stack[idx] = (stack[idx] || 0) + 1;
        if (row > markRows) return;
        var yy = top + cellH + 18 + row * 15;
        gMarks.appendChild(s('text', { x: x(idx) + CW / 2, y: yy, class: 'mark ' + m.cls }, m.glyph + ' ' + m.label));
      });

      // Held element (insertion sort with shifting): floats above its hole.
      U.clear(gOver);
      if (st.held && st.hole != null) {
        var hx = x(st.hole);
        gOver.appendChild(s('rect', { x: hx, y: 4, width: CW, height: 40, rx: 6, class: 'held-box' }));
        gOver.appendChild(s('text', { x: hx + CW / 2, y: 29, class: 'cell-val held-val' }, String(st.held.v)));
        gOver.appendChild(s('text', { x: hx + CW + 3, y: 16, class: 'held-label' }, 'key'));
      }
      if (sw.length === 2 && sw[0] !== sw[1] && !opts.held) {
        var a = Math.min(sw[0], sw[1]), b = Math.max(sw[0], sw[1]);
        var xa = x(a) + CW / 2, xb = x(b) + CW / 2;
        gOver.appendChild(s('path', { d: 'M' + xa + ' 14 Q' + (xa + xb) / 2 + ' ' + (b - a > 1 ? -4 : 2) + ' ' + xb + ' 14', class: 'swap-arc' }));
      }
    }

    function pick(i) {
      if (!last || !last.selectable || !last.selectable(i)) return;
      focusIdx = i;
      if (opts.onPick) opts.onPick(i);
    }
    function onKey(e) {
      var i = +e.currentTarget.getAttribute('data-index');
      var n = last ? last.arr.length : 0;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); return; }
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'Home' ? -n : e.key === 'End' ? n : 0;
      if (!d) return;
      e.preventDefault(); e.stopPropagation();
      var j = Math.max(0, Math.min(n - 1, i + d));
      while (j >= 0 && j < n && !(last.selectable && last.selectable(j))) j += d > 0 ? 1 : -1;
      if (j < 0 || j >= n) return;
      focusIdx = j;
      render(last);
      var target = gCells.querySelector('[data-index="' + j + '"]');
      if (target) target.focus();
    }

    return {
      el: root,
      render: render,
      focus: function () {
        if (!last || !last.selectable) return;
        var n = last.arr.length;
        if (!last.selectable(focusIdx)) for (var i = 0; i < n; i++) if (last.selectable(i)) { focusIdx = i; break; }
        render(last);
        var t = gCells.querySelector('[data-index="' + focusIdx + '"]');
        if (t) t.focus();
      },
      destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); }
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
