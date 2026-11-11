/* CPS305 Quest — ui/games/inversions.js
 * Inversion Hunt. Core verb: TAP PAIRS. Find every out-of-order pair, then watch
 * insertion sort make exactly that many swaps (its inner loop runs once per inversion).
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, G = CQ.games, h = U.h;

  function hunt(el, ctx) {
    var T = ctx.unit.templates, L = ctx.level;
    var values = G.values(L.input, ctx.size, ctx.seed);
    if (E.countInversions(values) === 0) values = values.slice().reverse();
    var pairs = E.inversionPairs(values);
    var found = {}, nFound = 0, first = null, misses = 0, hints = 0, over = false;
    var solo = ctx.level.mode === 'solo';

    G.note(el, T.invHunt.intro);
    var status = h('p.status', { 'aria-live': 'polite' });
    el.appendChild(status);
    var view = U.arrayView(el, { onPick: pick, label: 'Array: tap two elements to test a pair' });
    var chips = h('ul.pair-chips', { 'aria-label': 'Inversions found' });
    el.appendChild(chips);
    var tools = h('div.tools'); el.appendChild(tools);
    var fb = U.feedback(el);
    var after = h('div'); el.appendChild(after);
    if (ctx.hints) tools.appendChild(U.button('Hint', hint));
    if (solo) tools.appendChild(U.button('I found them all', doneHunting, { cls: 'primary' }));

    function render(extra) {
      var cs = {};
      if (first != null) cs[first] = 'picked';
      if (extra) for (var k in extra) cs[k] = extra[k];
      view.render({ arr: E.toItems(values), marks: {}, regions: [], cellState: cs, selectable: function () { return !over; } });
      status.textContent = solo ? U.fmt(T.invHunt.statusSolo, { f: nFound }) : U.fmt(T.invHunt.status, { f: nFound, t: pairs.length });
    }
    function pick(i) {
      if (first == null) { first = i; render(); U.announce('Picked index ' + i + ', value ' + values[i] + '. Now pick its partner.'); return; }
      var a = first; first = null;
      var res = CQ.engine.referee.checkInversion(values, a, i);
      if (res.ok) {
        var key = res.data.i + ',' + res.data.j;
        if (found[key]) { fb.show({ info: true, title: 'Already counted', why: U.fmt(T.invHunt.dup, res.data) }); render(); return; }
        found[key] = true; nFound++;
        CQ.store.record('inversions', true, true);
        chips.appendChild(h('li.chip', null, res.data.x + ' > ' + res.data.y + '  (' + res.data.i + ', ' + res.data.j + ')'));
        fb.show({ ok: true, title: 'Inversion!', why: U.fmt(T.invHunt.found, res.data) });
        var hl = {}; hl[res.data.i] = 'ok'; hl[res.data.j] = 'ok';
        render(hl);
        if (!solo && nFound === pairs.length) finishHunt();
      } else {
        misses++;
        CQ.store.record('inversions', false, true);
        CQ.store.noteMiss(ctx.gameId, 'inversions');
        var ex = U.explain(ctx.unit.explain, res);
        fb.show({ ok: false, title: 'Not an inversion', why: ex.why, misconception: ex.misconception });
        var bad = {}; bad[a] = 'bad'; bad[i] = 'bad';
        render(bad);
      }
    }
    function hint() {
      hints++;
      var p = pairs.filter(function (q) { return !found[q[0] + ',' + q[1]]; })[0];
      if (!p) return;
      var hl = {}; hl[p[0]] = 'ok';
      fb.show({ info: true, title: 'Hint', why: U.fmt(T.invHunt.hint, { x: values[p[0]], i: p[0] }) });
      render(hl);
    }
    function doneHunting() {
      var missing = pairs.filter(function (q) { return !found[q[0] + ',' + q[1]]; });
      if (missing.length) {
        misses += missing.length;
        CQ.store.record('inversions', false, true);
        missing.forEach(function (q) { chips.appendChild(h('li.chip.missed', null, '✗ missed: ' + values[q[0]] + ' > ' + values[q[1]] + '  (' + q[0] + ', ' + q[1] + ')')); });
        fb.show({ ok: false, title: 'You missed ' + missing.length, why: T.invHunt.missed });
      }
      finishHunt();
    }
    function finishHunt() {
      over = true; render(); U.clear(tools);
      var n = values.length, inv = pairs.length, d = { inv: inv, n: n, all: n * (n - 1) / 2 };
      var q = G.choiceQ({ id: 'inv-swaps', concept: 'insertion-sort', seed: ctx.seed, prompt: U.fmt(T.invHunt.predict, d),
        options: [
          { text: inv, ok: true, why: U.fmt(T.invHunt.predictOk, d) },
          { text: n - 1, why: U.fmt(T.invHunt.predictN, d) },
          { text: d.all, why: U.fmt(T.invHunt.predictAll, d) },
          { text: 0, why: T.invHunt.predictZero }
        ] });
      G.predictThen(after, q, 'Run insertion sort ▶', function (firstTry) {
        var w = U.watcher(after, [{ algo: 'insertion', values: values }], { unit: ctx.unit, theory: G.sortTheory(T) });
        w.stepper.play();
        if (L.formula) {
          var m = 8, fd = { m: m, all: m * (m - 1) / 2 };
          var fq = G.choiceQ({ id: 'inv-formula', concept: 'inversions', seed: ctx.seed + 1, prompt: U.fmt(T.invFormula.prompt, fd),
            options: [
              { text: fd.all, ok: true, why: U.fmt(T.invFormula.ok, fd) },
              { text: m, why: T.invFormula.n },
              { text: m * m, why: T.invFormula.sq },
              { text: m - 1, why: T.invFormula.adj }
            ] });
          var fbox = h('div'); after.appendChild(fbox);
          U.question(fbox, fq, { onResult: function (c, ft) { G.continueBtn(fbox, 'Finish level', function () { ctx.complete({ stars: G.stars(hints, misses === 0 && firstTry && ft), summary: U.fmt(T.invHunt.summary, d) }); }); } });
        } else {
          G.continueBtn(after, 'Finish level', function () { ctx.complete({ stars: G.stars(hints, misses === 0 && firstTry), summary: U.fmt(T.invHunt.summary, d) }); });
        }
        CQ.store.noteRound(ctx.gameId, misses === 0 && hints === 0);
      });
    }
    render();
  }

  function sandbox(el, ctx) {
    var T = ctx.unit.templates;
    var form = h('form.sandbox-form');
    var inp = h('input', { type: 'text', value: '4 1 3 2', 'aria-label': 'Array values' });
    form.appendChild(h('label.wide', null, 'Array (up to 12 numbers) ', inp));
    form.appendChild(U.button('Count inversions ▶', null, { cls: 'primary', attrs: { type: 'submit' } }));
    var err = h('p.error', { role: 'alert' });
    el.appendChild(form); el.appendChild(err);
    var out = h('div'); el.appendChild(out);
    var w = null;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var p = E.parseNumberList(inp.value, 12);
      err.textContent = p.error || '';
      if (p.error) return;
      if (w) w.destroy();
      U.clear(out);
      var pairs = E.inversionPairs(p.values);
      var ul = h('ul.pair-chips');
      pairs.forEach(function (q) { ul.appendChild(h('li.chip', null, p.values[q[0]] + ' > ' + p.values[q[1]] + '  (' + q[0] + ', ' + q[1] + ')')); });
      G.note(out, U.fmt(T.invSandbox, { inv: pairs.length }));
      out.appendChild(ul);
      w = U.watcher(out, [{ algo: 'insertion', values: p.values }], { unit: ctx.unit, theory: G.sortTheory(T) });
      G.continueBtn(out, 'Done practising', function () { ctx.complete({ stars: 1, summary: 'Practice logged.' }); }, true);
    });
  }

  G.inversions = { mount: function (el, ctx) { (ctx.level.kind === 'sandbox' ? sandbox : hunt)(el, ctx); } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
