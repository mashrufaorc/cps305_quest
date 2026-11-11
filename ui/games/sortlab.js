/* CPS305 Quest — ui/games/sortlab.js
 * Sort Lab. Core verb: STEP. Selection, insertion (and its two optimizations)
 * and bubble sort, with live counters, on random / sorted / reversed / nearly sorted input.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, G = CQ.games, h = U.h;

  /* What theory predicts for each counter, shown next to the live count. */
  function theory(T) {
    return function (run, trace) {
      var n = run.values.length, all = n * (n - 1) / 2, invs = E.countInversions(run.values);
      var map = {};
      if (run.algo === 'selection' || run.algo === 'bubble') map.comparisons = U.fmt(T.theory.quad, { v: all });
      if (run.algo === 'insertion' || run.algo === 'bubble') map.swaps = U.fmt(T.theory.inv, { v: invs });
      if (run.algo === 'insertion' || run.algo === 'insertionShift') map.comparisons = U.fmt(T.theory.insCmp, { lo: Math.max(0, n - 1), hi: all });
      if (run.algo === 'insertionShift' || run.algo === 'binaryInsertion') map.shifts = U.fmt(T.theory.inv, { v: invs });
      return map;
    };
  }

  function compare(el, ctx) {
    var T = ctx.unit.templates, L = ctx.level;
    var values = G.values(L.input, ctx.size, ctx.seed);
    G.predictThen(el, L.predict, 'Run both ▶', function (firstTry) {
      var w = U.watcher(el, L.algos.map(function (a) { return { algo: a, values: values }; }), { unit: ctx.unit, theory: theory(T), bars: true });
      w.stepper.play();
      G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(0, firstTry), summary: T.sortCompare[L.id] }); });
    });
  }

  function tryLevel(el, ctx) {
    var T = ctx.unit.templates, L = ctx.level;
    var values = G.values(L.input, ctx.size, ctx.seed);
    G.note(el, T.sortTry[L.algo]);
    U.runner(el, { algo: L.algo, values: values, unit: ctx.unit, gameId: ctx.gameId, hints: ctx.hints,
      onDone: function (res) {
        var leveledUp = CQ.store.noteRound(ctx.gameId, res.misses === 0 && res.hintsUsed === 0);
        var c = res.counters;
        G.note(el, U.fmt(T.sortTryDone, { cmp: c.comparisons, sw: c.swaps || 0, n: values.length, inv: E.countInversions(values) }) + (leveledUp ? ' ' + T.levelUp : ''));
        G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(res.hintsUsed, res.misses === 0), summary: U.fmt(T.sortTryDone, { cmp: c.comparisons, sw: c.swaps || 0, n: values.length, inv: E.countInversions(values) }) }); });
      } });
  }

  /* Solo: a mystery pairing of sort + input. Predict the comparison count, then run it with no hints. */
  function solo(el, ctx) {
    var T = ctx.unit.templates, L = ctx.level;
    var algo = L.algos[ctx.seed % L.algos.length];
    var kind = ['reversed', 'nearly', 'sorted', 'random'][Math.floor(ctx.seed / 3) % 4];
    var values = G.values(kind, ctx.size, ctx.seed);
    var n = values.length, all = n * (n - 1) / 2;
    var actual = E.runSort(algo, values).pop().counters.comparisons;
    var d = { algo: E.sorts[algo].name, kind: T.kinds[kind], n: n, actual: actual, all: all, inv: E.countInversions(values) };
    G.note(el, U.fmt(T.sortSolo.setup, d));
    var preview = U.arrayView(el, { bars: true, label: 'Input array' });
    preview.render({ arr: E.toItems(values), marks: {}, regions: [] });
    var q = G.choiceQ({ id: 'sl-solo', concept: algo === 'selection' ? 'selection-sort' : algo === 'insertion' ? 'insertion-sort' : 'bubble-sort', seed: ctx.seed,
      prompt: U.fmt(T.sortSolo.prompt, d),
      options: [
        { text: actual, ok: true, why: U.fmt(T.sortSolo.why[algo], d) },
        { text: all, why: U.fmt(T.sortSolo.wrongAll, d) },
        { text: n - 1, why: U.fmt(T.sortSolo.wrongLinear, d) },
        { text: n * n, why: U.fmt(T.sortSolo.wrongSquare, d) }
      ] });
    G.predictThen(el, q, 'Now sort it yourself ▶', function (firstTry) {
      preview.destroy();
      U.runner(el, { algo: algo, values: values, unit: ctx.unit, gameId: ctx.gameId, hints: false,
        onDone: function (res) {
          CQ.store.noteRound(ctx.gameId, res.misses === 0);
          G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: 1 + (firstTry ? 1 : 0) + (res.misses === 0 ? 1 : 0), summary: U.fmt(T.sortSolo.summary, d) }); });
        } });
    });
  }

  /* Practice bench: your own array (or a preset shape), any two sorts, side by side. */
  function sandbox(el, ctx) {
    var T = ctx.unit.templates;
    var form = h('form.sandbox-form');
    var inp = h('input', { type: 'text', value: '5 2 8 3 9 1 7', 'aria-label': 'Array values, separated by spaces', inputmode: 'numeric' });
    function sel(label, val, allowNone) {
      var s = h('select', { 'aria-label': label });
      if (allowNone) s.appendChild(h('option', { value: '' }, '(none)'));
      Object.keys(E.sorts).forEach(function (k) { s.appendChild(h('option', { value: k, selected: k === val ? 'selected' : null }, E.sorts[k].name)); });
      return s;
    }
    var a = sel('First sort', 'selection'), b = sel('Second sort', 'insertion', true);
    var n = h('input', { type: 'number', min: 2, max: 30, value: 10, 'aria-label': 'Size for presets', style: { width: '4.5em' } });
    var presets = h('div.presets', { role: 'group', 'aria-label': 'Preset inputs' });
    ['random', 'sorted', 'reversed', 'nearly', 'dupes'].forEach(function (k) {
      presets.appendChild(U.button(T.kinds[k], function () { inp.value = E.makeInput(k, Math.max(2, Math.min(30, +n.value || 10)), Date.now() % 9973).join(' '); }, { cls: 'small' }));
    });
    var bars = h('input', { type: 'checkbox', checked: 'checked' });
    form.appendChild(h('label.wide', null, 'Array (up to 30 numbers) ', inp));
    form.appendChild(h('div.row', null, h('span', null, 'Presets, size '), n, presets));
    form.appendChild(h('div.row', null, h('label', null, 'Sort A ', a), h('label', null, 'Sort B ', b), h('label', null, bars, ' bars')));
    form.appendChild(U.button('Run ▶', null, { cls: 'primary', attrs: { type: 'submit' } }));
    var err = h('p.error', { role: 'alert' });
    el.appendChild(form); el.appendChild(err);
    var out = h('div'); el.appendChild(out);
    var w = null;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var p = E.parseNumberList(inp.value, 30);
      err.textContent = p.error || '';
      if (p.error) return;
      if (w) w.destroy();
      U.clear(out);
      var runs = [{ algo: a.value, values: p.values }];
      if (b.value) runs.push({ algo: b.value, values: p.values });
      w = U.watcher(out, runs, { unit: ctx.unit, theory: theory(T), bars: bars.checked });
      G.note(out, U.fmt(T.sandboxInfo, { n: p.values.length, inv: E.countInversions(p.values), all: p.values.length * (p.values.length - 1) / 2 }));
      G.continueBtn(out, 'Done practising', function () { ctx.complete({ stars: 1, summary: 'Practice logged.' }); }, true);
    });
  }

  G.sortlab = { mount: function (el, ctx) {
    ({ compare: compare, 'try': tryLevel, solo: solo, sandbox: sandbox })[ctx.level.kind](el, ctx);
  } };
  G.sortTheory = theory;
})(typeof globalThis !== 'undefined' ? globalThis : this);
