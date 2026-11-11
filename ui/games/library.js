/* CPS305 Quest — ui/games/library.js
 * Library Detective. Core verb: PROBE. Linear vs binary search, with a probe counter.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, G = CQ.games, h = U.h;

  function probesOf(algo, values, key) {
    var t = E.collect(algo === 'binary' ? E.binarySearch(values, key) : E.linearSearch(values, key));
    return t[t.length - 1].counters.probes;
  }

  /* Watch: predict binary search's probe count, then race it against linear search. */
  function race(el, ctx) {
    var T = ctx.unit.templates, n = ctx.size, rand = E.rng(ctx.seed);
    var values = G.values('sorted', n, ctx.seed);
    var idx = E.randInt(rand, Math.floor(n * 2 / 3), n - 1);   // near the end: linear search's bad day
    var key = values[idx];
    var d = { n: n, key: key, idx: idx, bin: probesOf('binary', values, key), lin: probesOf('linear', values, key), worst: E.binaryWorstProbes(n) };
    var q = G.choiceQ({ id: 'lib-race', concept: 'binary-search', seed: ctx.seed, prompt: U.fmt(T.libRace.prompt, d),
      misconception: T.libRace.misconception,
      options: [
        { text: d.bin, ok: true, why: U.fmt(T.libRace.correct, d) },
        { text: d.lin, misconception: true, why: U.fmt(T.libRace.lin, d) },
        { text: Math.ceil(n / 2), why: U.fmt(T.libRace.half, d) },
        { text: 1, why: U.fmt(T.libRace.one, d) }
      ] });
    G.predictThen(el, q, 'Start the race ▶', function (firstTry) {
      G.note(el, U.fmt(T.libRace.watch, d));
      var w = U.watcher(el, [{ algo: 'linear', values: values, key: key, title: 'Linear search' }, { algo: 'binary', values: values, key: key, title: 'Binary search' }], { unit: ctx.unit });
      w.stepper.play();
      G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(0, firstTry), summary: U.fmt(T.libRace.summary, d) }); });
    });
  }

  /* Try: be the binary search. Values are hidden until probed, like closed files. */
  function probe(el, ctx) {
    var T = ctx.unit.templates, n = ctx.size, rand = E.rng(ctx.seed);
    var rounds = ctx.level.rounds || 2, r = 0, misses = 0, hints = 0;
    var area = h('div'); el.appendChild(area);
    function round() {
      U.clear(area);
      var values = G.values('sorted', n, ctx.seed + r * 17);
      var present = r % 2 === 0;
      var key = present ? values[E.randInt(rand, 0, n - 1)] : values[E.randInt(rand, 0, n - 2)] + 1;
      if (!present && values.indexOf(key) >= 0) key = values[n - 1] + 2;
      area.appendChild(h('h3', null, 'Case ' + (r + 1) + ' of ' + rounds + (present ? '' : ': this file may not exist')));
      U.runner(area, { algo: 'binary', values: values, key: key, unit: ctx.unit, gameId: ctx.gameId, hints: ctx.hints, conceal: true,
        onDone: function (res) {
          misses += res.misses; hints += res.hintsUsed;
          CQ.store.noteRound(ctx.gameId, res.misses === 0 && res.hintsUsed === 0);
          G.note(area, U.fmt(T.libProbe.done, { probes: res.counters.probes, worst: E.binaryWorstProbes(n), n: n }));
          r++;
          if (r < rounds) G.continueBtn(area, 'Next case', round);
          else G.continueBtn(area, 'Finish level', function () { ctx.complete({ stars: G.stars(hints, misses === 0), summary: U.fmt(T.libProbe.summary, { misses: misses }) }); });
        } });
    }
    round();
  }

  /* Solo: first decide whether binary search is even allowed, then search with no hints. */
  function solo(el, ctx) {
    var T = ctx.unit.templates, n = ctx.size;
    var sortedShelf = ctx.seed % 2 === 0;
    var values = G.values(sortedShelf ? 'nearly' : 'random', n, ctx.seed);
    if (sortedShelf) values = values.slice().sort(function (a, b) { return a - b; });
    var isSorted = E.isSorted(values);
    var first = true;
    var view = U.arrayView(el, { label: 'The shelf' });
    view.render({ arr: E.toItems(values), marks: {}, regions: [] });
    var q = G.choiceQ({ id: 'lib-sorted', concept: 'binary-needs-sorted', seed: ctx.seed, shuffle: false, prompt: T.libSolo.prompt,
      misconception: T.libSolo.misconception,
      options: isSorted
        ? [{ text: 'Yes', ok: true, why: T.libSolo.yesOk }, { text: 'No', why: T.libSolo.noWrong }]
        : [{ text: 'No', ok: true, why: T.libSolo.noOk }, { text: 'Yes', misconception: true, why: T.libSolo.yesWrong }] });
    var qa = h('div'); el.appendChild(qa);
    U.question(qa, q, { onResult: function (c, firstTry) {
      first = firstTry;
      G.continueBtn(qa, isSorted ? 'Search it' : 'Let the robot sort it, then search', part2);
    } });
    function part2() {
      U.clear(el);
      var sorted = values.slice().sort(function (a, b) { return a - b; });
      var uniq = sorted.filter(function (v, i) { return i === 0 || sorted[i - 1] !== v; });
      var key = uniq[E.randInt(E.rng(ctx.seed + 3), 0, uniq.length - 1)];
      U.runner(el, { algo: 'binary', values: uniq, key: key, unit: ctx.unit, gameId: ctx.gameId, hints: false, conceal: true,
        onDone: function (res) {
          CQ.store.noteRound(ctx.gameId, res.misses === 0);
          G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: 1 + (first ? 1 : 0) + (res.misses === 0 ? 1 : 0), summary: U.fmt(T.libSolo.summary, { probes: res.counters.probes, n: uniq.length }) }); });
        } });
    }
  }

  /* Practice: your own shelf and key; both searches side by side. */
  function sandbox(el, ctx) {
    var T = ctx.unit.templates;
    var form = h('form.sandbox-form');
    var inp = h('input', { type: 'text', value: '2 5 8 12 16 23 38 41 56 72', 'aria-label': 'Array values, separated by spaces', inputmode: 'numeric' });
    var keyInp = h('input', { type: 'number', value: '41', 'aria-label': 'Key to search for', style: { width: '6em' } });
    var err = h('p.error', { role: 'alert' });
    form.appendChild(h('label', null, 'Shelf (up to 30 numbers) ', inp));
    form.appendChild(h('label', null, 'Key ', keyInp));
    form.appendChild(U.button('Run both ▶', null, { cls: 'primary', attrs: { type: 'submit' } }));
    el.appendChild(form); el.appendChild(err);
    var out = h('div'); el.appendChild(out);
    var w = null;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var p = E.parseNumberList(inp.value, 30);
      err.textContent = p.error || '';
      if (p.error) return;
      var key = Number(keyInp.value);
      if (w) w.destroy();
      U.clear(out);
      if (!E.isSorted(p.values)) G.note(out, T.libSandbox.unsorted);
      w = U.watcher(out, [{ algo: 'linear', values: p.values, key: key, title: 'Linear search' }, { algo: 'binary', values: p.values, key: key, title: 'Binary search' }], { unit: ctx.unit });
      G.continueBtn(out, 'Done practising', function () { ctx.complete({ stars: 1, summary: 'Practice logged.' }); }, true);
    });
  }

  G.library = { mount: function (el, ctx) { ({ race: race, probe: probe, solo: solo, sandbox: sandbox })[ctx.level.kind](el, ctx); } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
