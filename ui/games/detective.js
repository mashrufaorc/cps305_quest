/* CPS305 Quest — ui/games/detective.js
 * Big-O Detective (core verb: CLASSIFY) and Count the Steps (core verb: TALLY).
 * Neither stores an answer: engine/bigo.js runs the snippet on screen, counts
 * its steps and fits its class.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, B = E.bigo, G = CQ.games, h = U.h;
  var CHOICES = ['1', 'logn', 'n', 'nlogn', 'n2', 'n3'];
  var CONCEPT_OF = { logn: 'doubling-loop', '1': 'constant-bound' };

  function conceptFor(sn, cls) {
    if (/hidden/.test(sn.id)) return 'hidden-call';
    return CONCEPT_OF[cls] || 'loop-analysis';
  }

  /* Plot steps(n) next to c·f(n), scaled so the curves meet at the largest n. */
  function plot(el, sn, cls, label) {
    var hi = cls === 'n3' ? 16 : 32, pts = [];
    for (var n = 1; n <= hi; n++) pts.push([n, B.steps(sn.code, 'work', n)]);
    var f = B.cls[cls].f, k = pts[pts.length - 1][1] / f(hi) || 1;
    var ref = pts.map(function (p) { return [p[0], k * f(p[0])]; });
    U.chart(el, { label: label, series: [{ label: 'steps of WORK', points: pts }, { label: B.cls[cls].label.replace('O(', 'c·').replace(/\)$/, ''), points: ref, slot: 1 }] });
    return hi;
  }

  function pickSnippets(unit, tier, count, seed) {
    var pool = unit.snippets.filter(function (s) { return s.tier <= tier; });
    var top = pool.filter(function (s) { return s.tier === tier; }), rest = pool.filter(function (s) { return s.tier < tier; });
    var rand = E.rng(seed);
    var picked = E.shuffle(top, rand).concat(E.shuffle(rest, rand)).slice(0, count);
    return E.shuffle(picked, rand);
  }

  function detective(el, ctx) {
    var T = ctx.unit.templates.detective;
    var list = pickSnippets(ctx.unit, ctx.size, ctx.level.count || 5, ctx.seed);
    var k = 0, right = 0, misses = 0, hints = 0;
    var area = h('div'); el.appendChild(area);
    function next() {
      U.clear(area);
      var sn = list[k];
      var cls = B.classify(sn.code, 'work');
      var concept = conceptFor(sn, cls);
      area.appendChild(h('h3', null, 'Case ' + (k + 1) + ' of ' + list.length + ': ' + sn.title));
      U.codePanel(area, { code: sn.code, title: 'Snippet' });
      var p = h('p.q-prompt'); p.appendChild(U.rich(T.prompt)); area.appendChild(p);
      var row = h('div.choices.bigo-choices', { role: 'group', 'aria-label': 'Complexity class' });
      area.appendChild(row);
      var tools = h('div.tools'); area.appendChild(tools);
      var fb = U.feedback(area);
      var tries = 0, done = false;
      if (ctx.hints) tools.appendChild(U.button('Hint: run it at n = 8 and 16', function () {
        hints++;
        var a = B.steps(sn.code, 'work', 8), b = B.steps(sn.code, 'work', 16);
        fb.show({ info: true, title: 'Doubling test', why: 'At n = 8: **' + a + '** steps. At n = 16: **' + b + '** steps. When n doubles, O(1) stays the same, O(log n) adds a little, O(n) doubles, O(n²) roughly quadruples, O(n³) multiplies by about 8.' });
      }));
      var order = CHOICES;
      order.forEach(function (id) {
        var b = U.button(B.cls[id].label, function () {
          if (done || b.disabled) return;
          if (id === cls) {
            done = true;
            b.classList.add('is-right');
            if (tries === 0) right++;
            CQ.store.record(concept, true, tries === 0);
            U.clear(tools);
            Array.prototype.forEach.call(row.children, function (x) { x.disabled = true; });
            fb.show({ ok: true, title: B.cls[cls].label, why: sn.why });
            var hi = plot(area, sn, cls, 'Steps of WORK versus ' + B.cls[cls].label);
            G.note(area, U.fmt(T.plotted, { max: hi, cls: B.cls[cls].label }));
            k++;
            if (k < list.length) G.continueBtn(area, 'Next case', next);
            else G.continueBtn(area, 'Finish level', function () {
              CQ.store.noteRound(ctx.gameId, misses === 0 && hints === 0);
              ctx.complete({ stars: G.stars(hints, misses === 0), summary: U.fmt(T.summary, { right: right, total: list.length }) });
            });
          } else {
            tries++; misses++;
            b.classList.add('is-wrong'); b.disabled = true;
            CQ.store.record(concept, false, tries === 1);
            CQ.store.noteMiss(ctx.gameId, concept);
            var trap = sn.traps && sn.traps[id];
            var why = trap || U.fmt(B.cls[id].rank > B.cls[cls].rank ? T.generic.higher : T.generic.lower, { why: ctx.hints ? 'Try the doubling hint.' : 'Count how many times each loop runs.' });
            fb.show({ ok: false, title: 'Not ' + B.cls[id].label, why: why, misconception: sn.misconceptionOn === id ? sn.misconception : null });
          }
        }, { cls: 'choice mono' });
        row.appendChild(b);
      });
    }
    next();
  }

  /* Count the Steps: tally by hand for a small n, then see the per-line tally and the curve. */
  var COUNT_POOL = ['s-linear', 's-nested', 's-sequential', 's-lin-sum', 's-lecture', 's-doubling', 's-triangle', 's-half'];
  function count(el, ctx) {
    var T = ctx.unit.templates.count;
    var pool = ctx.unit.snippets.filter(function (s) { return COUNT_POOL.indexOf(s.id) >= 0; });
    var rand = E.rng(ctx.seed);
    var list = E.shuffle(pool, rand).slice(0, ctx.level.rounds || 2);
    var r = 0, misses = 0, hints = 0;
    var area = h('div'); el.appendChild(area);
    function next() {
      U.clear(area);
      var sn = list[r], n = ctx.size;
      var res = B.lineSteps(sn.code, 'work', n);
      var cls = B.classify(sn.code, 'work');
      var perLine = Object.keys(res.lines).map(function (ln) { return 'line ' + ln + ' ×' + res.lines[ln]; }).join(', ');
      area.appendChild(h('h3', null, 'Tally ' + (r + 1) + ' of ' + list.length + ': ' + sn.title));
      var panel = U.codePanel(area, { code: sn.code, title: 'WORK' });
      var p = h('p.q-prompt'); p.appendChild(U.rich(U.fmt(T.prompt, { n: n }))); area.appendChild(p);
      var inp = h('input', { type: 'number', min: 0, max: 100000, 'aria-label': 'Your step count', style: { width: '7em' } });
      var form = h('form.row', null, inp, U.button('Check', null, { cls: 'primary', attrs: { type: 'submit' } }));
      area.appendChild(form);
      var tools = h('div.tools'); area.appendChild(tools);
      var fb = U.feedback(area);
      var tries = 0;
      if (ctx.hints) tools.appendChild(U.button('Why?', function () { hints++; fb.show({ info: true, title: 'How to count', why: T.hint }); }));
      function tally() {
        Object.keys(res.lines).forEach(function (ln) {
          var row = panel.rows[ln - 1];
          if (row && !row.querySelector('.ln-count')) row.appendChild(h('span.ln-count', null, '×' + res.lines[ln]));
        });
      }
      function reveal(ok) {
        tally();
        U.clear(tools); inp.disabled = true; form.querySelector('button').disabled = true;
        var hi = plot(area, sn, cls, 'Steps of WORK versus ' + B.cls[cls].label);
        G.note(area, U.fmt(T.plotted, { max: hi, cls: B.cls[cls].label }));
        r++;
        if (r < list.length) G.continueBtn(area, 'Next tally', next);
        else G.continueBtn(area, 'Finish level', function () {
          CQ.store.noteRound(ctx.gameId, misses === 0 && hints === 0);
          ctx.complete({ stars: G.stars(hints, misses === 0), summary: U.fmt(T.summary, { rounds: list.length, misses: misses }) });
        });
        void ok;
      }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (inp.value === '') return;
        var g = Number(inp.value);
        if (g === res.steps) {
          CQ.store.record('cost-function', true, tries === 0);
          fb.show({ ok: true, title: res.steps + ' steps', why: U.fmt(T.ok, { steps: res.steps, perLine: perLine }) });
          reveal(true);
        } else {
          tries++; misses++;
          CQ.store.record('cost-function', false, tries === 1);
          CQ.store.noteMiss(ctx.gameId, 'cost-function');
          if (tries >= 2) {
            fb.show({ ok: false, title: 'Here\'s the tally', why: U.fmt(T.wrong, { guess: g, steps: res.steps, perLine: perLine }) });
            reveal(false);
          } else {
            fb.show({ ok: false, title: 'Not ' + g, why: (g > res.steps ? 'Too many. ' : 'Too few. ') + 'Check how many times each loop actually runs for n = ' + n + '. One more try, then the game shows its tally.' });
          }
        }
      });
      setTimeout(function () { inp.focus(); }, 30);
    }
    next();
  }

  G.detective = { mount: detective };
  G.count = { mount: count };
})(typeof globalThis !== 'undefined' ? globalThis : this);
