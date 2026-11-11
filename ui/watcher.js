/* CPS305 Quest — ui/watcher.js
 * Watch mode: one or more algorithm runs side by side, driven by ONE stepper,
 * so the player compares two strategies on the same input step for step.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, h = U.h;

  /* runs: [{ algo, values, key?, title? }] ; opts: { unit, bars, theory(run) -> {counter: text} } */
  U.watcher = function (container, runs, opts) {
    opts = opts || {};
    var unit = opts.unit;
    var wrap = h('div.watcher' + (runs.length > 1 ? '.is-compare' : ''));
    container.appendChild(wrap);
    var panes = runs.map(function (r) {
      var trace = r.algo === 'binary' ? E.collect(E.binarySearch(r.values, r.key))
        : r.algo === 'linear' ? E.collect(E.linearSearch(r.values, r.key))
        : E.runSort(r.algo, r.values, r.comp);
      var lisp = unit.lisp[r.algo];
      var pane = h('section.pane', { 'aria-label': r.title || (lisp && lisp.title) || r.algo });
      pane.appendChild(h('h3.pane-title', null, r.title || (E.sorts[r.algo] ? E.sorts[r.algo].name : lisp.title)));
      var view = U.arrayView(pane, { bars: opts.bars, held: r.algo === 'insertionShift' || r.algo === 'binaryInsertion', label: r.title || r.algo });
      var keys = r.algo === 'binary' || r.algo === 'linear' ? ['probes'] : r.algo === 'insertionShift' || r.algo === 'binaryInsertion' ? ['comparisons', 'shifts'] : ['comparisons', 'swaps'];
      var counters = U.counters(pane, keys);
      if (opts.theory) counters.theory(opts.theory(r, trace));
      var narr = h('p.narration');
      pane.appendChild(narr);
      var code = lisp && opts.code !== false ? U.codePanel(pane, { code: lisp.code, title: lisp.title }) : null;
      wrap.appendChild(pane);
      return { trace: trace, view: view, counters: counters, narr: narr, code: code, lisp: lisp, run: r };
    });
    var max = Math.max.apply(null, panes.map(function (p) { return p.trace.length; }));
    var controls = h('div.watch-controls');
    wrap.insertBefore(controls, wrap.firstChild);
    var stepper = U.stepper(controls, {
      count: max,
      onShow: function (k) {
        var msgs = [];
        panes.forEach(function (p) {
          var s = p.trace[Math.min(k, p.trace.length - 1)];
          p.view.render(s);
          p.counters.set(s.counters);
          p.narr.textContent = s.msg || '';
          if (p.code) p.code.highlight(p.lisp.anchors[s.at]);
          msgs.push((panes.length > 1 ? (p.run.title || p.run.algo) + ': ' : '') + (s.msg || ''));
        });
        U.announce(msgs.join(' '));
        if (k === max - 1 && opts.onEnd) opts.onEnd(panes.map(function (p) { return p.trace[p.trace.length - 1]; }));
      }
    });
    return { el: wrap, stepper: stepper, panes: panes, destroy: function () { stepper.destroy(); } };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
