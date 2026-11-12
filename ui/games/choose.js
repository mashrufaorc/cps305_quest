/* CPS305 Quest — ui/games/choose.js
 * Unit 0: Right Tool (pick a structure, see the cost) and ADT or Not?.
 * Also used by the cross-unit "Pick the Right Structure" mode.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, CH = E.choose, G = CQ.games, h = U.h;

  function opsText(ops) { return Object.keys(ops).map(function (op) { return ops[op].toLocaleString('en-US') + '× ' + CH.opNames[op]; }).join(', '); }

  /* One scenario card, refereed by the cost model. */
  G.rightToolTask = function (el, opts) {
    var sc = opts.scenario, rank = CH.rank(sc.ops, sc.n, sc.offer), misses = 0, done = false;
    el.appendChild(h('div.scenario', null, h('h4', null, sc.title), h('p', null, sc.text), h('p.small', null, 'Per day: ' + opsText(sc.ops) + ' · n = ' + sc.n.toLocaleString('en-US'))));
    var row = h('div.choices'); el.appendChild(row);
    var bars = h('div.lanes', { 'aria-live': 'polite' }); el.appendChild(bars);
    var fb = U.feedback(el);
    if (opts.hints) el.appendChild(h('div.tools', null, U.button('Why?', function () { fb.show({ info: true, title: 'Think about the operations', why: 'Which operation happens most here? Which structure does that operation in O(1)?' }); })));
    function costBars(highlight) {
      U.clear(bars);
      var finite = rank.rows.filter(function (r) { return isFinite(r.total); }), max = Math.max.apply(null, finite.map(function (r) { return r.total; }).concat([1]));
      rank.rows.forEach(function (r, i) {
        var label = isFinite(r.total) ? U.fmtNum(r.total) + ' steps' : 'can\'t ' + r.missing.map(function (m) { return CH.opNames[m]; }).join(', ');
        bars.appendChild(h('div.lane' + (r.id === highlight ? '.is-chosen' : ''), null, h('span.lane-name', null, r.name + (rank.best.indexOf(r.id) >= 0 ? ' ★' : '')),
          h('span.lane-track', null, h('span.lane-bar.seg' + (i % 4 + 1), { style: { width: isFinite(r.total) ? Math.max(1, Math.log10(r.total + 1) / Math.log10(max + 1) * 100) + '%' : '0%' } })),
          h('span.lane-val', null, label)));
      });
      bars.appendChild(h('p.small', null, 'Bars use a log scale; ★ = cheapest. Costs are Big-O classes from the lectures evaluated at n.'));
    }
    sc.offer.forEach(function (id) {
      var b = U.button(CH.structures[id].name, function () {
        if (done || b.disabled) return;
        costBars(id);
        if (rank.best.indexOf(id) >= 0) {
          done = true; b.classList.add('is-right');
          CQ.store.record('context', true, misses === 0);
          fb.show({ ok: true, title: CH.structures[id].name, why: 'Cheapest for these operations.' + (sc.note ? ' ' + sc.note : '') + (rank.best.length > 1 ? ' (Tied with: ' + rank.best.filter(function (x) { return x !== id; }).map(function (x) { return CH.structures[x].name; }).join(', ') + '.)' : '') });
          opts.onDone({ misses: misses, summary: sc.title + ': ' + CH.structures[id].name });
        } else {
          misses++; b.disabled = true; b.classList.add('is-wrong');
          CQ.store.record('context', false, misses === 1);
          var mine = rank.rows.filter(function (r) { return r.id === id; })[0], best = rank.rows[0];
          fb.show({ ok: false, title: 'Costly choice', why: isFinite(mine.total) ? CH.structures[id].name + ' would take about ' + U.fmtNum(mine.total) + ' steps a day, vs ' + U.fmtNum(best.total) + ' for the best choice. Look at the bars: which operation dominates?' : CH.structures[id].name + ' can\'t ' + mine.missing.map(function (m) { return CH.opNames[m]; }).join(' or ') + '.', misconception: misses === 1 ? '"Elegant" or "simple" is a valid reason to pick a structure.' : null });
        }
      }, { cls: 'choice' });
      row.appendChild(b);
    });
  };

  function rightTool(el, ctx) {
    var pool = ctx.unit.scenarios.filter(function (s) { return s.tier <= ctx.size; });
    var list = E.shuffle(pool, E.rng(ctx.seed)).slice(0, ctx.level.count || 4), k = 0, misses = 0;
    var area = h('div'); el.appendChild(area);
    function next() {
      U.clear(area);
      if (k >= list.length) { CQ.store.noteRound(ctx.gameId, misses === 0); return G.continueBtn(area, 'Finish level', function () { ctx.complete({ stars: misses === 0 ? 3 : misses <= 2 ? 2 : 1, summary: list.length + ' jobs, ' + misses + ' costly choice(s).' }); }); }
      area.appendChild(h('h3', null, 'Job ' + (k + 1) + ' of ' + list.length));
      G.rightToolTask(area, { scenario: list[k], hints: ctx.hints, onDone: function (r) { misses += r.misses; k++; G.continueBtn(area, 'Next job', next); } });
    }
    next();
  }

  function adt(el, ctx) {
    var cards = E.shuffle(ctx.unit.adtCards, E.rng(ctx.seed)).slice(0, ctx.level.count || 8), k = 0, right = 0;
    var card = h('div.flashcard', { 'aria-live': 'polite' }); el.appendChild(card);
    var row = h('div.choice-row'); el.appendChild(row);
    var fb = U.feedback(el);
    function next() {
      U.clear(row);
      if (k >= cards.length) { card.textContent = right + ' / ' + cards.length; return G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: right === cards.length ? 3 : right >= cards.length - 2 ? 2 : 1, summary: right + ' of ' + cards.length + '.' }); }); }
      var c = cards[k], answered = false;
      U.clear(card); card.appendChild(h('span.big-form', null, c[0]));
      [['adt', 'ADT (the concept)'], ['ds', 'Data structure (the build)']].forEach(function (o, i) {
        row.appendChild(U.button(h('span', null, h('kbd', null, String(i + 1)), ' ' + o[1]), function () {
          if (answered) return; answered = true;
          var ok = o[0] === c[1]; if (ok) right++;
          CQ.store.record('adt-vs-ds', ok, true);
          fb.show({ ok: ok, title: ok ? 'Yes' : 'No', why: c[2], misconception: ok ? null : 'An ADT and a data structure are the same thing.' });
          k++; G.continueBtn(row, 'Next ▶', next);
        }, { cls: 'choice big' }));
      });
    }
    function onKey(e) { if (!document.body.contains(el)) { document.removeEventListener('keydown', onKey); return; } if (U.typing(e)) return; var b = row.querySelectorAll('.choice')[parseInt(e.key, 10) - 1]; if (b) b.click(); }
    document.addEventListener('keydown', onKey);
    next();
  }

  G.briefingKinds = G.briefingKinds || {};
  G.briefingKinds.twoTools = function (area, s, unit, after) {
    var n = 10000, jobs = [{ ops: { index: 1 }, name: 'Read item #9,000' }, { ops: { prepend: 1 }, name: 'Add at the front' }];
    jobs.forEach(function (j) {
      var rk = CH.rank(j.ops, n, ['array', 'list']);
      area.appendChild(h('h4', null, j.name));
      var lanes = h('div.lanes'); area.appendChild(lanes);
      var steps = function (id) { return id === 'list' && j.ops.index ? 9001 : rk.rows.filter(function (r) { return r.id === id; })[0].total; };
      ['array', 'list'].forEach(function (id, i) {
        var v = steps(id);
        lanes.appendChild(h('div.lane', null, h('span.lane-name', null, CH.structures[id].name), h('span.lane-track', null, h('span.lane-bar.seg' + (i + 1), { style: { width: Math.max(0.5, v / 10000 * 100) + '%' } })), h('span.lane-val', null, U.fmtNum(v) + (v === 1 ? ' step' : ' steps'))));
      });
    });
    G.continueBtn(area, 'I see it', after, true);
  };
  G.tasks = G.tasks || {};
  G.tasks.righttool = function (container, q, unit, done) { G.rightToolTask(container, { scenario: unit.scenarios.filter(function (s) { return s.id === q.scenario; })[0], hints: false, onDone: done }); };

  G.righttool = { mount: rightTool };
  G.adt = { mount: adt };
})(typeof globalThis !== 'undefined' ? globalThis : this);
