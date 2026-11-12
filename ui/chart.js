/* CPS305 Quest — ui/chart.js
 * Line chart for growth curves (SVG). One y-axis only. Identity never by
 * colour alone: each series has a dash pattern, a legend entry and a direct
 * label at its line end. Hover / arrow keys move a crosshair with a tooltip;
 * a data table is always available below.
 * Series colours are the validated categorical slots --s1..--s4 (css/style.css).
 */
(function (root) {
  'use strict';
  var U = root.CQ.ui, h = U.h, s = U.s;
  var H = 300, L = 62, R = 96, T = 14, Bm = 38;
  var DASH = ['', '8 5', '2 4', '10 4 2 4'];

  function fmtNum(v) {
    if (v == null || !isFinite(v)) return '–';
    if (Math.abs(v) >= 1e6) return v.toExponential(2).replace('e+', 'e');
    if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString('en-US');
    return String(Math.round(v * 100) / 100);
  }
  U.fmtNum = fmtNum;

  /* opts: { label, xLabel, yLabel, logY, series: [{label, points:[[x,y]]}], marker } */
  U.chart = function (container, opts) {
    var wrap = h('figure.chart');
    var legend = h('div.chart-legend', { 'aria-hidden': 'true' });
    var W = 640;
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img', tabindex: '0' });
    var tip = h('div.chart-tip', { hidden: true });
    var plotWrap = h('div.chart-plot', null, svg, tip);
    var tableBox = h('details.chart-table', null, h('summary', null, 'Show data table'));
    wrap.appendChild(legend); wrap.appendChild(plotWrap); wrap.appendChild(tableBox);
    container.appendChild(wrap);
    var cur = null, hoverIdx = null, xs = [], sx, sy;

    function render(o) {
      cur = o;
      // Draw at the container's real width (min 360) so labels keep their size on phones.
      W = Math.max(360, Math.min(640, Math.round(plotWrap.clientWidth || 640)));
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      U.clear(svg); U.clear(legend);
      svg.setAttribute('aria-label', (o.label || 'Chart') + '. ' + o.series.map(function (se) { return se.label; }).join(', ') + '. Use the data table for exact values.');
      var allX = [], allY = [];
      o.series.forEach(function (se) { se.points.forEach(function (p) { allX.push(p[0]); if (isFinite(p[1])) allY.push(p[1]); }); });
      var x0 = Math.min.apply(null, allX), x1 = Math.max.apply(null, allX);
      if (x1 === x0) x1 = x0 + 1;
      var yMax = o.yMax != null ? o.yMax : Math.max.apply(null, allY.concat([1]));
      var logY = !!o.logY;
      var yMin = logY ? 1 : 0;
      sx = function (x) { return L + (x - x0) / (x1 - x0) * (W - L - R); };
      sy = function (y) {
        var v = Math.min(y, yMax);
        if (logY) return H - Bm - (Math.log10(Math.max(v, 1)) - 0) / (Math.log10(Math.max(yMax, 10))) * (H - Bm - T);
        return H - Bm - (v - yMin) / (yMax - yMin || 1) * (H - Bm - T);
      };
      // Recessive grid and axes.
      var g = s('g', { class: 'chart-grid' });
      var ticks = logY ? [] : [0, 0.25, 0.5, 0.75, 1].map(function (f) { return yMin + f * (yMax - yMin); });
      if (logY) for (var p = 0; Math.pow(10, p) <= yMax * 1.0001; p++) ticks.push(Math.pow(10, p));
      ticks.forEach(function (tv) {
        var y = sy(tv);
        g.appendChild(s('line', { x1: L, x2: W - R, y1: y, y2: y }));
        g.appendChild(s('text', { x: L - 6, y: y + 4, class: 'chart-ytick' }, fmtNum(tv)));
      });
      var xt = niceTicks(x0, x1, 6);
      xt.forEach(function (tv) {
        var x = sx(tv);
        g.appendChild(s('text', { x: x, y: H - Bm + 16, class: 'chart-xtick' }, fmtNum(tv)));
      });
      g.appendChild(s('line', { x1: L, x2: W - R, y1: H - Bm, y2: H - Bm, class: 'chart-axis' }));
      g.appendChild(s('text', { x: (L + W - R) / 2, y: H - 4, class: 'chart-xlabel' }, o.xLabel || 'n'));
      g.appendChild(s('text', { x: 12, y: (T + H - Bm) / 2, class: 'chart-ylabel', transform: 'rotate(-90 12 ' + (T + H - Bm) / 2 + ')' }, (o.yLabel || 'steps') + (logY ? ' (log scale)' : '')));
      svg.appendChild(g);

      // Lines, then direct labels at the right end (nudged apart so they never collide).
      var ends = [];
      o.series.forEach(function (se, i) {
        var slot = 's' + ((se.slot != null ? se.slot : i) % 4 + 1);
        var d = '';
        se.points.forEach(function (pt, k) {
          if (!isFinite(pt[1])) return;
          d += (d ? 'L' : 'M') + sx(pt[0]).toFixed(1) + ' ' + sy(pt[1]).toFixed(1);
        });
        svg.appendChild(s('path', { d: d, class: 'chart-line ' + slot, 'stroke-dasharray': DASH[(se.slot != null ? se.slot : i) % 4] }));
        var last = se.points[se.points.length - 1];
        ends.push({ y: sy(last[1]), label: se.label, slot: slot });
        legend.appendChild(h('span.chart-key', null,
          (function () { var sv = s('svg', { width: 26, height: 10, 'aria-hidden': 'true' }); sv.appendChild(s('line', { x1: 1, x2: 25, y1: 5, y2: 5, class: 'chart-line ' + slot, 'stroke-dasharray': DASH[(se.slot != null ? se.slot : i) % 4] })); return sv; })(),
          ' ', se.label));
      });
      if (o.series.length <= 4) {
        ends.sort(function (a, b) { return a.y - b.y; });
        for (var k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 14) ends[k].y = ends[k - 1].y + 14;
        ends.forEach(function (e) {
          svg.appendChild(s('text', { x: W - R + 6, y: Math.min(e.y + 4, H - Bm), class: 'chart-direct' }, e.label));
        });
      }
      // Optional vertical marker (e.g. the slider's n).
      if (o.marker != null) {
        var mx = sx(o.marker);
        svg.appendChild(s('line', { x1: mx, x2: mx, y1: T, y2: H - Bm, class: 'chart-marker' }));
        svg.appendChild(s('text', { x: mx + 4, y: T + 10, class: 'chart-marker-label' }, (o.markerLabel || 'n = ') + o.marker));
      }
      // Crosshair layer (hover / keyboard).
      xs = o.series[0] ? o.series[0].points.map(function (pt) { return pt[0]; }) : [];
      svg.appendChild(s('g', { class: 'chart-cross' }));
      svg.appendChild(s('rect', { x: L, y: T, width: W - L - R, height: H - Bm - T, class: 'chart-hit' }));
      renderTable(o);
      if (hoverIdx != null) cross(hoverIdx);
    }

    function niceTicks(a, b, n) {
      var span = b - a, step = Math.pow(10, Math.floor(Math.log10(span / n)));
      [1, 2, 5, 10].some(function (m) { if (span / (step * m) <= n) { step *= m; return true; } return false; });
      var out = [];
      for (var v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(v);
      return out;
    }

    function cross(idx) {
      hoverIdx = idx;
      var layer = svg.querySelector('.chart-cross');
      if (!layer || idx == null || xs[idx] == null) return;
      U.clear(layer);
      var x = xs[idx], px = sx(x);
      layer.appendChild(s('line', { x1: px, x2: px, y1: T, y2: H - Bm, class: 'chart-crossline' }));
      var rows = cur.series.map(function (se, i) {
        var pt = se.points[idx];
        var slot = 's' + ((se.slot != null ? se.slot : i) % 4 + 1);
        if (pt && isFinite(pt[1])) layer.appendChild(s('circle', { cx: px, cy: sy(pt[1]), r: 4.5, class: 'chart-dot ' + slot }));
        return { label: se.label, v: pt ? pt[1] : null, slot: slot };
      });
      rows.sort(function (a, b) { return (b.v || 0) - (a.v || 0); });
      U.clear(tip);
      tip.appendChild(h('div.tip-h', null, (cur.xLabel || 'n') + ' = ' + fmtNum(x)));
      rows.forEach(function (r) { tip.appendChild(h('div.tip-row', null, h('span.tip-sw.' + r.slot), h('span', null, r.label), h('strong', null, fmtNum(r.v)))); });
      tip.hidden = false;
      var bb = svg.getBoundingClientRect(), scale = bb.width / W;
      var left = px * scale + 12;
      if (left + 180 > bb.width) left = px * scale - 192;
      tip.style.left = Math.max(0, left) + 'px';
      tip.style.top = (T * scale) + 'px';
    }
    function hide() { hoverIdx = null; tip.hidden = true; var layer = svg.querySelector('.chart-cross'); if (layer) U.clear(layer); }
    function idxAt(clientX) {
      var bb = svg.getBoundingClientRect(), x = (clientX - bb.left) / bb.width * W;
      var best = 0;
      xs.forEach(function (v, i) { if (Math.abs(sx(v) - x) < Math.abs(sx(xs[best]) - x)) best = i; });
      return best;
    }
    svg.addEventListener('pointermove', function (e) { if (xs.length) cross(idxAt(e.clientX)); });
    svg.addEventListener('pointerleave', hide);
    svg.addEventListener('blur', hide);
    svg.addEventListener('keydown', function (e) {
      if (!xs.length) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); e.stopPropagation();
        var i = hoverIdx == null ? 0 : Math.max(0, Math.min(xs.length - 1, hoverIdx + (e.key === 'ArrowRight' ? 1 : -1)));
        cross(i);
        U.announce(tip.textContent);
      } else if (e.key === 'Escape') hide();
    });

    function renderTable(o) {
      var keep = tableBox.open;
      U.clear(tableBox);
      tableBox.appendChild(h('summary', null, 'Show data table'));
      var t = h('table.chart-data');
      t.appendChild(h('thead', null, h('tr', null, h('th', null, o.xLabel || 'n'), o.series.map(function (se) { return h('th', null, se.label); }))));
      var tb = h('tbody');
      var pts = o.series[0] ? o.series[0].points : [];
      var stride = Math.max(1, Math.ceil(pts.length / 25));
      pts.forEach(function (pt, i) {
        if (i % stride && i !== pts.length - 1) return;
        tb.appendChild(h('tr', null, h('td', null, fmtNum(pt[0])), o.series.map(function (se) { return h('td', null, fmtNum(se.points[i] && se.points[i][1])); })));
      });
      t.appendChild(tb);
      tableBox.appendChild(h('div.table-wrap', null, t));
      tableBox.open = keep;
    }

    render(opts);
    return { el: wrap, update: render, destroy: function () { wrap.remove(); } };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
