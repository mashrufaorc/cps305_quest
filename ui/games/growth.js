/* CPS305 Quest — ui/games/growth.js
 * Growth Race. Core verb: SLIDE n. Two cost functions race; the player finds
 * the crossover where the faster-growing one overtakes for good. The engine
 * (bigo.crossover) is the referee.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, B = E.bigo, G = CQ.games, h = U.h;

  function costFn(terms) { return function (n) { return B.evalTerms(terms, n); }; }

  /* The race readout: two lanes; the cheaper one is marked ahead (★ + text). */
  function lanes(container) {
    var el = h('div.lanes', { 'aria-live': 'polite' });
    container.appendChild(el);
    return function (rows) {
      U.clear(el);
      var max = Math.max.apply(null, rows.map(function (r) { return r.v; }).concat([1]));
      var min = Math.min.apply(null, rows.map(function (r) { return r.v; }));
      rows.forEach(function (r, i) {
        var ahead = r.v === min && rows.filter(function (q) { return q.v === min; }).length === 1;
        el.appendChild(h('div.lane', null,
          h('span.lane-name', null, r.name),
          h('span.lane-track', null, h('span.lane-bar.seg' + (i + 1), { style: { width: Math.max(1, r.v / max * 100) + '%' } })),
          h('span.lane-val', null, U.fmtNum(r.v) + (r.v === 1 ? ' step' : ' steps') + (ahead ? '  ★ cheaper' : ''))));
      });
    };
  }

  /* One crossover round: chart + slider + lanes + lock-in, refereed by the engine. */
  function crossRound(el, ctx, pair, hints, done) {
    var T = ctx.unit.templates, X = ctx.unit.explain;
    var a = costFn(pair.a), b = costFn(pair.b);
    var cross = B.crossover(b, a, 1, 5000);
    var hi = Math.max(20, cross * 2);
    var logY = b(hi) / Math.max(1, a(hi)) > 1e3;
    var d = { aName: pair.aName, bName: pair.bName, cross: cross };
    G.note(el, U.fmt(T.cross.intro, d));
    var pts = function (f) { var out = []; var step = Math.max(1, Math.floor(hi / 120)); for (var n = 1; n <= hi; n += step) out.push([n, f(n)]); return out; };
    var n = 1, misses = 0, hintsUsed = 0;
    var chart = U.chart(el, { label: pair.aName + ' versus ' + pair.bName, logY: logY, series: [{ label: pair.aName, points: pts(a) }, { label: pair.bName, points: pts(b) }], marker: n });
    var slider = h('input', { type: 'range', min: 1, max: hi, value: n, 'aria-label': 'Input size n' });
    var nOut = h('output.n-out', null, 'n = 1');
    el.appendChild(h('label.slider-row', null, 'n ', slider, nOut));
    var nudge = h('div.tools', null,
      U.button('−1', function () { set(n - 1); }, { cls: 'small' }), U.button('+1', function () { set(n + 1); }, { cls: 'small' }));
    el.appendChild(nudge);
    var draw = lanes(el);
    var tools = h('div.tools'); el.appendChild(tools);
    var fb = U.feedback(el);
    function set(v) {
      n = Math.max(1, Math.min(hi, v)); slider.value = n; nOut.textContent = 'n = ' + n;
      chart.update({ label: pair.aName + ' versus ' + pair.bName, logY: logY, series: [{ label: pair.aName, points: pts(a) }, { label: pair.bName, points: pts(b) }], marker: n });
      draw([{ name: pair.aName, v: a(n) }, { name: pair.bName, v: b(n) }]);
    }
    slider.addEventListener('input', function () { set(+slider.value); });
    tools.appendChild(U.button('🔒 Lock in n', lock, { cls: 'primary' }));
    if (hints) tools.appendChild(U.button('Why?', function () { hintsUsed++; fb.show({ info: true, title: 'Hint', why: U.fmt(T.cross.hint, d) }); }));
    function lock() {
      var dd = Object.assign({ n: n, av: U.fmtNum(a(n)), bv: U.fmtNum(b(n)), ac: U.fmtNum(a(cross)), bc: U.fmtNum(b(cross)) }, d);
      if (n === cross) {
        CQ.store.record('crossover', true, misses === 0);
        fb.show({ ok: true, title: 'Crossover found', why: U.fmt(T.cross.found, d) });
        U.clear(tools); slider.disabled = true; U.clear(nudge);
        done({ misses: misses, hints: hintsUsed });
        return;
      }
      misses++;
      CQ.store.record('crossover', false, misses === 1);
      CQ.store.noteMiss(ctx.gameId, 'crossover');
      var code;
      if (n > cross) code = 'cross.late';
      else if (b(n) > a(n)) { code = 'cross.notForGood'; for (var m = n + 1; m <= cross; m++) if (b(m) <= a(m)) { dd.back = m; break; } }
      else code = 'cross.early';
      var ex = U.explain(X, { code: code, data: dd });
      fb.show({ ok: false, title: 'Not the crossover', why: ex.why });
    }
    set(1);
  }

  /* Watch: the lecture's loop (n − 1 additions) vs formula (3 operations). */
  function tale(el, ctx) {
    var T = ctx.unit.templates;
    var lin = function (n) { return Math.max(0, n - 1); }, cst = function () { return 3; };
    var x = B.crossover(lin, cst, 1, 1000);
    var guessData = function (g) { return { x: x, lin: lin(x), g: g, gl: lin(g) }; };
    var q = G.choiceQ({ id: 'gr-tale', concept: 'crossover', seed: ctx.seed, prompt: T.tale.prompt, misconception: T.tale.misconception,
      options: [
        { text: 'n = ' + x, ok: true, why: U.fmt(T.tale.correct, guessData(x)) },
        { text: 'n = 1 (the formula is always cheaper)', misconception: true, why: U.fmt(T.tale.wrong, guessData(1)) },
        { text: 'n = ' + (x - 1), why: U.fmt(T.tale.wrong, guessData(x - 1)) },
        { text: 'n = 10', why: U.fmt(T.tale.wrong, guessData(10)) }
      ] });
    G.predictThen(el, q, 'Explore it ▶', function (firstTry) {
      U.codePanel(el, { code: ctx.unit.lisp.firstNLin.code, title: ctx.unit.lisp.firstNLin.title });
      U.codePanel(el, { code: ctx.unit.lisp.firstNConst.code, title: ctx.unit.lisp.firstNConst.title });
      var n = 3;
      var slider = h('input', { type: 'range', min: 1, max: 40, value: n, 'aria-label': 'Input size n' });
      var out = h('output.n-out', null, 'n = ' + n);
      el.appendChild(h('label.slider-row', null, 'n ', slider, out));
      var draw = lanes(el);
      var pts = function (f) { var r = []; for (var k = 1; k <= 40; k++) r.push([k, f(k)]); return r; };
      var chart = U.chart(el, { label: 'Loop versus formula', series: [{ label: 'loop (n − 1)', points: pts(lin) }, { label: 'formula (3)', points: pts(cst) }], marker: n });
      function set() {
        n = +slider.value; out.textContent = 'n = ' + n;
        draw([{ name: 'FIRST-N-LIN', v: lin(n) }, { name: 'FIRST-N-CONST', v: cst(n) }]);
        chart.update({ label: 'Loop versus formula', series: [{ label: 'loop (n − 1)', points: pts(lin) }, { label: 'formula (3)', points: pts(cst) }], marker: n });
      }
      slider.addEventListener('input', set);
      set();
      G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(0, firstTry), summary: U.fmt(T.tale.summary, { x: x }) }); });
    });
  }

  function cross(el, ctx) {
    var T = ctx.unit.templates;
    var pool = ctx.unit.races['tier' + ctx.size];
    var rounds = ctx.level.rounds || 2, r = 0, misses = 0, hints = 0;
    var area = h('div'); el.appendChild(area);
    function next() {
      U.clear(area);
      area.appendChild(h('h3', null, 'Race ' + (r + 1) + ' of ' + rounds));
      crossRound(area, ctx, pool[r % pool.length], ctx.hints, function (res) {
        misses += res.misses; hints += res.hints;
        CQ.store.noteRound(ctx.gameId, res.misses === 0 && res.hints === 0);
        r++;
        if (r < rounds) G.continueBtn(area, 'Next race', next);
        else G.continueBtn(area, 'Finish level', function () { ctx.complete({ stars: G.stars(hints, misses === 0), summary: U.fmt(T.cross.summary, { rounds: rounds, misses: misses }) }); });
      });
    }
    next();
  }

  /* Solo: the "fast on small inputs" trap, then find the crossover with no hints. */
  function small(el, ctx) {
    var T = ctx.unit.templates.small;
    var A = function (n) { return 2 * n * n; }, Bf = function (n) { return 500 * n; };
    var d = { a50: A(50), b50: Bf(50), cross: B.crossover(A, Bf, 1, 5000) };
    G.note(el, T.intro);
    var first = 0;
    var q1 = G.choiceQ({ id: 'gr-s1', concept: 'crossover', shuffle: false, prompt: T.q1,
      options: A(50) < Bf(50) ? [{ text: 'A (2n²)', ok: true, why: U.fmt(T.q1ok, d) }, { text: 'B (500n)', why: U.fmt(T.q1bad, d) }]
                              : [{ text: 'B (500n)', ok: true, why: U.fmt(T.q1ok, d) }, { text: 'A (2n²)', why: U.fmt(T.q1bad, d) }] });
    var box = h('div'); el.appendChild(box);
    U.question(box, q1, { onResult: function (c, ft) {
      if (ft) first++;
      var q2 = G.choiceQ({ id: 'gr-s2', concept: 'growth-classes', shuffle: false, prompt: T.q2, misconception: T.misconception,
        options: [{ text: 'B: O(n)', ok: true, why: T.q2ok }, { text: 'A: it was faster at n = 50', misconception: true, why: T.q2bad }] });
      var box2 = h('div'); el.appendChild(box2);
      U.question(box2, q2, { onResult: function (c2, ft2) {
        if (ft2) first++;
        var box3 = h('div'); el.appendChild(box3);
        box3.appendChild(h('h3', null, T.q3));
        crossRound(box3, ctx, { a: [{ c: 500, k: 'n' }], b: [{ c: 2, k: 'n2' }], aName: '500n (B)', bName: '2n² (A)' }, false, function (res) {
          CQ.store.noteRound(ctx.gameId, res.misses === 0 && first === 2);
          G.continueBtn(box3, 'Finish level', function () { ctx.complete({ stars: 1 + (first === 2 ? 1 : 0) + (res.misses === 0 ? 1 : 0), summary: U.fmt(T.summary, d) }); });
        });
      } });
    } });
  }

  /* Practice: race up to four classes with your own coefficients. */
  function sandbox(el, ctx) {
    var rows = [{ c: 100, k: 'n' }, { c: 1, k: 'n2' }, { c: 1, k: 'nlogn' }];
    var form = h('div.sandbox-form');
    var maxN = h('input', { type: 'number', min: 2, max: 2000, value: 200, 'aria-label': 'Largest n', style: { width: '6em' } });
    var logBox = h('input', { type: 'checkbox' });
    var list = h('div.racers');
    form.appendChild(list);
    form.appendChild(h('div.row', null, h('label', null, 'n up to ', maxN), h('label', null, logBox, ' log-scale y'), U.button('+ racer', function () { if (rows.length < 4) { rows.push({ c: 1, k: 'n' }); build(); } }, { cls: 'small' })));
    el.appendChild(form);
    var out = h('div'); el.appendChild(out);
    var chart = null;
    function build() {
      U.clear(list);
      rows.forEach(function (r, i) {
        var c = h('input', { type: 'number', min: 1, max: 100000, value: r.c, 'aria-label': 'Coefficient for racer ' + (i + 1), style: { width: '6em' } });
        var s = h('select', { 'aria-label': 'Class for racer ' + (i + 1) });
        B.classes.filter(function (k) { return k.id !== 'nfact'; }).forEach(function (k) { s.appendChild(h('option', { value: k.id, selected: k.id === r.k ? 'selected' : null }, k.label.replace('O(', '').replace(/\)$/, ''))); });
        c.addEventListener('input', function () { r.c = Math.max(1, +c.value || 1); draw(); });
        s.addEventListener('change', function () { r.k = s.value; draw(); });
        list.appendChild(h('div.row', null, h('span', null, 'Racer ' + (i + 1) + ': '), c, ' × ', s,
          rows.length > 1 ? U.button('✕', function () { rows.splice(i, 1); build(); }, { cls: 'small', attrs: { 'aria-label': 'Remove racer ' + (i + 1) } }) : null));
      });
      draw();
    }
    function draw() {
      var hi = Math.max(2, Math.min(2000, +maxN.value || 200));
      var step = Math.max(1, Math.floor(hi / 150));
      var series = rows.map(function (r) {
        var pts = []; for (var n = 1; n <= hi; n += step) pts.push([n, B.evalTerms([r], n)]);
        return { label: B.termText(r), points: pts };
      });
      if (chart) chart.update({ label: 'Race', logY: logBox.checked, series: series });
      else chart = U.chart(out, { label: 'Race', logY: logBox.checked, series: series });
    }
    maxN.addEventListener('input', draw); logBox.addEventListener('change', draw);
    build();
    G.continueBtn(el, 'Done practising', function () { ctx.complete({ stars: 1, summary: 'Practice logged.' }); }, true);
  }

  G.growth = { mount: function (el, ctx) { ({ tale: tale, cross: cross, small: small, sandbox: sandbox })[ctx.level.kind](el, ctx); } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
