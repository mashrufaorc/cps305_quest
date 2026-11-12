/* CPS305 Quest — ui/games/hashing.js
 * Unit 9: Hash Hotel (place guests), Tombstone Trap, Collision Lab.
 * Unit 10: Code Detective (trace HT-GET), The NIL Trap, Resize Puzzle.
 * Probe sequences come from engine/hashing.js; Lisp results from engine/lisp.js
 * running the lecture's own code.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, H = E.hashing, L = E.lisp, G = CQ.games, h = U.h;

  /* ===================== Unit 9 ===================== */

  /* One guest at a time, one probe at a time. Used by levels and the Boss task. */
  G.hotelTask = function (el, opts) {
    var unit = opts.unit, T = unit.templates, X = unit.explain;
    var strategy = opts.strategy, M = opts.M, keys = opts.keys;
    var prime = H.primeBelow(M);
    var table = H.create(M, strategy === 'chain' ? 'linear' : strategy, prime);
    var chains = []; for (var c = 0; c < M; c++) chains.push([]);
    var ki = 0, step = 0, path = [], misses = 0, hints = 0, totalProbes = 0;
    var intro = h('p.note'); intro.appendChild(U.rich(U.fmt(T.hotelIntro[strategy], { M: M, P: prime }))); el.appendChild(intro);
    var queue = h('p.queue', { 'aria-live': 'polite' }); el.appendChild(queue);
    var prompt = h('p.prompt', { 'aria-live': 'polite' }); el.appendChild(prompt);
    var view = U.hashView(el, { label: 'Hotel rooms (hash table slots)', onPick: pick });
    var cnt = U.counters(el, ['probes']);
    var tools = h('div.tools'); el.appendChild(tools);
    var fb = U.feedback(el);
    if (opts.hints) tools.appendChild(U.button('Why?', function () {
      hints++;
      var k = keys[ki];
      fb.show({ info: true, title: 'Next probe', why: strategy === 'chain' ? k + ' mod ' + M + ' = ' + H.h1(k, M) : U.fmt(T.hotelHint, { n: step + 1, formula: H.formula(strategy, k, step, M, prime), exp: H.probe(strategy, k, step, M, prime) }) });
    }));
    var cellState = {};
    function render() {
      var st = { slots: strategy === 'chain' ? chains.map(function () { return null; }) : table.slots, path: path, cellState: cellState, selectable: function () { return ki < keys.length; } };
      if (strategy === 'chain') st.chains = chains;
      view.render(st);
      queue.textContent = ki < keys.length ? 'Guests waiting: ' + keys.slice(ki).join(', ') : 'Everyone is seated.';
      if (ki < keys.length) {
        var k = keys[ki];
        prompt.innerHTML = '';
        prompt.appendChild(U.rich(strategy === 'chain' ? U.fmt(T.hotelChainPrompt, { k: k }) : U.fmt(T.hotelPrompt, { k: k, n: step + 1 })));
      } else prompt.textContent = '';
      cnt.set({ probes: totalProbes });
    }
    function pick(i) {
      if (ki >= keys.length) return;
      var k = keys[ki];
      cellState = {};
      if (strategy === 'chain') {
        var b = H.h1(k, M);
        if (i === b) {
          CQ.store.record('chaining', true, true);
          chains[b].push(k); totalProbes++;
          fb.show({ ok: true, title: k + ' → bucket ' + b, why: chains[b].length > 1 ? 'Collision: bucket ' + b + ' now holds a list of ' + chains[b].length + ' keys.' : 'Bucket ' + b + ' was empty.' });
          ki++; cellState[b] = 'ok';
        } else {
          misses++; CQ.store.record('chaining', false, true);
          cellState[i] = 'bad';
          fb.show({ ok: false, title: 'Not bucket ' + i, why: U.fmt(X['hotel.chain'].why, { k: k, M: M, exp: b }) });
        }
        render(); if (ki >= keys.length) finish(); return;
      }
      var exp = H.probe(strategy, k, step, M, prime);
      var concept = strategy === 'linear' ? 'linear-probing' : strategy === 'double' ? 'double-hashing' : 'quadratic-probing';
      if (i === exp) {
        totalProbes++;
        path.push(exp);
        if (table.slots[exp] === null || table.slots[exp] === H.DELETED) {
          CQ.store.record(concept, true, true);
          var r = H.insert(table, k);
          table = r.table;
          cellState[exp] = 'ok';
          fb.show({ ok: true, title: k + ' → slot ' + exp, why: step === 0 ? 'No collision: slot ' + exp + ' was free.' : 'Seated after ' + (step + 1) + ' probes: ' + path.join(' → ') + '.' });
          ki++; step = 0; path = [];
        } else {
          fb.show({ info: true, title: 'Collision at slot ' + exp, why: 'Slot ' + exp + ' holds ' + table.slots[exp] + '. Keep probing: i = ' + (step + 1) + '.' });
          step++;
        }
      } else {
        misses++; CQ.store.record(concept, false, true);
        if (opts.gameId) CQ.store.noteMiss(opts.gameId, concept);
        cellState[i] = 'bad';
        var d = { n: step + 1, k: k, formula: H.formula(strategy, k, step, M, prime), exp: exp, choice: i };
        var later = false;
        for (var j = step + 1; j < M; j++) if (H.probe(strategy, k, j, M, prime) === i) { later = true; break; }
        fb.show({ ok: false, title: 'Not slot ' + i, why: U.fmt(X[later ? 'hotel.skipCollision' : 'hotel.wrongProbe'].why, d) });
      }
      render();
      if (ki >= keys.length) finish();
    }
    function finish() {
      U.clear(tools);
      var lf = (keys.length / M).toFixed(2);
      G.note(el, U.fmt(T.hotelDone, { n: keys.length, probes: totalProbes, lf: lf }));
      opts.onDone({ misses: misses, hints: hints, summary: U.fmt(T.hotelDone, { n: keys.length, probes: totalProbes, lf: lf }) });
    }
    render();
    setTimeout(function () { view.focus(); }, 50);
  };

  /* Keys that are sure to collide a bit: random keys plus one deliberate collision. */
  function hotelKeys(M, n, seed) {
    var ks = H.keySets.random(n, seed, 60);
    if (n > 2 && H.h1(ks[1], M) !== H.h1(ks[0], M)) { var k = ks[0] + M; if (ks.indexOf(k) < 0) ks[1] = k; }
    return ks;
  }

  function hotel(el, ctx) {
    var L0 = ctx.level;
    G.hotelTask(el, { unit: ctx.unit, strategy: L0.strategy, M: L0.M, keys: hotelKeys(L0.M, ctx.size, ctx.seed), hints: ctx.hints, gameId: ctx.gameId, onDone: function (res) {
      CQ.store.noteRound(ctx.gameId, res.misses === 0 && res.hints === 0);
      G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(res.hints, res.misses === 0), summary: res.summary }); });
    } });
  }

  /* Bonus: cuckoo hashing, watched step by step. */
  function cuckoo(el, ctx) {
    var T = ctx.unit.templates.cuckoo, M = 7;
    G.note(el, U.fmt(T.intro, { M: M }));
    var keys = [10, 3, 17, 24, 8, 31];
    var h1 = function (k) { return k % M; }, h2 = function (k) { return Math.floor(k / M) % M; };
    var slots = []; for (var i = 0; i < M; i++) slots.push(null);
    var frames = [{ slots: slots.slice(), msg: 'Empty table.' }];
    keys.forEach(function (k) {
      var cur = k, pos = h1(cur), kicks = 0;
      for (;;) {
        if (slots[h1(cur)] === null) { pos = h1(cur); slots[pos] = cur; frames.push({ slots: slots.slice(), path: [pos], msg: cur + ' → slot ' + pos + ' (H1).' }); break; }
        if (slots[h2(cur)] === null) { pos = h2(cur); slots[pos] = cur; frames.push({ slots: slots.slice(), path: [pos], msg: cur + ': H1 slot ' + h1(cur) + ' taken, so slot ' + pos + ' (H2).' }); break; }
        // Both taken: take H1's slot and kick its occupant to the occupant's other slot.
        var spot = kicks % 2 === 0 ? h1(cur) : h2(cur), old = slots[spot];
        slots[spot] = cur;
        frames.push({ slots: slots.slice(), path: [spot], msg: 'Both of ' + cur + '\'s slots are taken: ' + cur + ' kicks ' + old + ' out of slot ' + spot + '.' });
        cur = old; kicks++;
        if (kicks > 10) { frames.push({ slots: slots.slice(), msg: 'Too many kicks: a real table would rehash.' }); break; }
      }
    });
    var view = U.hashView(el, { label: 'Cuckoo table' });
    var narr = h('p.narration', { 'aria-live': 'polite' }); el.appendChild(narr);
    var ctrl = h('div'); el.insertBefore(ctrl, view.el);
    U.stepper(ctrl, { count: frames.length, onShow: function (k) { view.render(frames[k]); narr.textContent = frames[k].msg; } });
    G.note(el, 'Lookup checks only two slots, H1(k) and H2(k): a strong worst-case guarantee. Inserts can trigger chains of kicks.');
    G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: 3, summary: 'Cuckoo hashing: two possible rooms per key.' }); }, true);
  }

  function trap(el, ctx) {
    var T = ctx.unit.templates.trap, M = 7, a = 10, b = 17, c = 24;
    var built = H.build([a, b, c], M, 'linear').table;
    var d = { a: a, b: b, c: c, s: H.h1(a, M), s1: H.h1(a, M) + 1, s2: H.h1(a, M) + 2 };
    G.note(el, U.fmt(T.setup, d));
    U.hashView(el, { label: 'Table before deleting' }).render({ slots: built.slots });
    var naive = H.remove(built, b, false).table, lazy = H.remove(built, b, true).table;
    var s1 = H.search(naive, c), s2 = H.search(lazy, c);
    var first = 0;
    var q1 = G.choiceQ({ id: 'tomb1', concept: 'lazy-deletion', seed: ctx.seed, prompt: U.fmt(T.q1, d), misconception: T.misconception, options: [
      { text: s1.found ? 'Found in slot ' + s1.index : 'Not found: the search stops at the empty slot ' + s1.stoppedAt, ok: true, why: U.fmt(T.q1ok, d) },
      { text: 'Found in slot ' + d.s2, misconception: true, why: U.fmt(T.q1bad, d) },
      { text: 'Found in slot ' + d.s1, why: U.fmt(T.q1bad, d) }
    ] });
    G.predictThen(el, q1, 'Show me ▶', function (ft) {
      if (ft) first++;
      U.hashView(el, { label: 'After a naive delete' }).render({ slots: naive.slots, path: s1.path, cellState: (function () { var o = {}; o[s1.path[s1.path.length - 1]] = 'bad'; return o; })() });
      var q2 = G.choiceQ({ id: 'tomb2', concept: 'lazy-deletion', seed: ctx.seed + 1, prompt: U.fmt(T.q2, d), options: [
        { text: s2.found ? 'Found in slot ' + s2.index : 'Not found', ok: true, why: U.fmt(T.q2ok, d) },
        { text: 'Not found: it stops at the tombstone', why: U.fmt(T.q2bad, d) }
      ] });
      G.predictThen(el, q2, 'Show me ▶', function (ft2) {
        if (ft2) first++;
        U.hashView(el, { label: 'After a lazy delete' }).render({ slots: lazy.slots, path: s2.path, cellState: (function () { var o = {}; o[s2.index] = 'ok'; return o; })() });
        CQ.store.noteRound(ctx.gameId, first === 2);
        G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: 1 + first, summary: T.summary }); });
      });
    });
  }

  function reuse(el, ctx) {
    var T = ctx.unit.templates.reuse, X = ctx.unit.explain, M = 7;
    var t = H.remove(H.build([10, 17, 24], M, 'linear').table, 17, true).table;
    var newKeys = [31, 38], r = 0, misses = 0;
    var area = h('div'); el.appendChild(area);
    function next() {
      U.clear(area);
      var k = newKeys[r], ins = H.insert(t, k);
      G.note(area, U.fmt(T.setup, { d: t.slots.indexOf(H.DELETED) >= 0 ? t.slots.indexOf(H.DELETED) : '—', k: k, h: H.h1(k, M) }));
      var fb;
      var view = U.hashView(area, { label: 'Table with a tombstone', onPick: function (i) {
        if (i === ins.index) {
          CQ.store.record('lazy-deletion', true, true);
          t = ins.table;
          view.render({ slots: t.slots, path: ins.path, cellState: (function () { var o = {}; o[i] = 'ok'; return o; })() });
          fb.show({ ok: true, title: 'Slot ' + i, why: U.fmt(T.done, { k: k, exp: i }) });
          r++;
          if (r < newKeys.length) G.continueBtn(area, 'Next key', next);
          else G.continueBtn(area, 'Finish level', function () { ctx.complete({ stars: misses ? 2 : 3, summary: 'DELETED slots are reused by inserts.' }); });
        } else {
          misses++; CQ.store.record('lazy-deletion', false, true);
          var o = {}; o[i] = 'bad';
          view.render({ slots: t.slots, cellState: o, selectable: function () { return true; } });
          fb.show({ ok: false, title: 'Not slot ' + i, why: t.slots[ins.index] === H.DELETED ? U.fmt(X['tomb.insert'].why, { k: k, exp: ins.index }) : 'Probe in order: ' + ins.path.join(' → ') + '. The first free slot is ' + ins.index + '.' });
        }
      } });
      view.render({ slots: t.slots, selectable: function () { return true; } });
      fb = U.feedback(area);
    }
    next();
  }

  /* Bar view of bucket loads (counts are always printed: never height alone). */
  function bars(container) {
    var el = h('div.bucket-bars', { role: 'img' }); container.appendChild(el);
    return function (dist) {
      U.clear(el);
      var max = Math.max(dist.max, 1);
      el.setAttribute('aria-label', 'Bucket loads: ' + dist.counts.join(', '));
      dist.counts.forEach(function (c, i) {
        el.appendChild(h('div.bucket', null, h('span.bucket-n', null, String(c)), h('span.bucket-bar', { style: { height: (c / max * 100) + '%' } }), h('span.bucket-i', null, String(i))));
      });
    };
  }

  function dist(el, ctx) {
    var T = ctx.unit.templates.dist;
    G.note(el, T.intro);
    var mult = H.keySets.multiples7(6), ends3 = [13, 23, 33, 43, 53, 63];
    var d1 = H.distribution(mult, 7, 'mod'), d2 = H.distribution(ends3, 10, 'mod');
    var first = 0;
    var q1 = G.choiceQ({ id: 'dist1', concept: 'hash-function', seed: ctx.seed, prompt: T.q1, options: [
      { text: d1.max, ok: true, why: T.q1ok }, { text: 1, why: 'Check 7 mod 7, 14 mod 7, …: all 0.' }, { text: 2, why: 'Every one of them is a multiple of 7.' }
    ] });
    var box = h('div'); el.appendChild(box);
    U.question(box, q1, { onResult: function (c, ft) {
      if (ft) first++;
      bars(box)(d1);
      var q2 = G.choiceQ({ id: 'dist2', concept: 'hash-function', seed: ctx.seed + 1, prompt: T.q2, options: [
        { text: d2.used, ok: true, why: T.q2ok }, { text: 6, why: 'k mod 10 is the last digit, and every key ends in 3.' }, { text: 10, why: 'Only the last digit matters here.' }
      ] });
      var box2 = h('div'); el.appendChild(box2);
      U.question(box2, q2, { onResult: function (c2, ft2) {
        if (ft2) first++;
        bars(box2)(d2);
        G.note(box2, 'Now explore: change the table size, the keys and the hash function.');
        explorer(box2, ctx);
        G.continueBtn(box2, 'Finish level', function () { ctx.complete({ stars: 1 + first, summary: 'Spread depends on the keys AND the hash function.' }); }, true);
      } });
    } });
  }
  function explorer(el, ctx) {
    var form = h('div.sandbox-form');
    var M = h('input', { type: 'number', min: 2, max: 30, value: 10, 'aria-label': 'Table size M', style: { width: '5em' } });
    var set = h('select', { 'aria-label': 'Key set' },
      h('option', { value: 'random' }, '12 random keys'), h('option', { value: 'multiples7' }, 'multiples of 7'), h('option', { value: 'sameLastDigit' }, 'all end in 3'));
    var fn = h('select', { 'aria-label': 'Hash function' });
    Object.keys(H.hashFns).forEach(function (k) { fn.appendChild(h('option', { value: k }, H.hashFns[k].label)); });
    var stats = h('p.status', { 'aria-live': 'polite' });
    form.appendChild(h('label', null, 'M ', M)); form.appendChild(h('label', null, 'Keys ', set)); form.appendChild(h('label', null, 'H(k) ', fn));
    el.appendChild(form); el.appendChild(stats);
    var draw = bars(el);
    function update() {
      var m = Math.max(2, Math.min(30, +M.value || 10)), keys = H.keySets[set.value](12, ctx.seed, 99);
      var d = H.distribution(keys, m, fn.value);
      draw(d);
      stats.textContent = 'Keys: ' + keys.join(', ') + ' · load factor ' + (keys.length / m).toFixed(2) + ' · biggest bucket ' + d.max + ' · empty buckets ' + (m - d.used);
    }
    [M, set, fn].forEach(function (x) { x.addEventListener('input', update); x.addEventListener('change', update); });
    update();
  }

  function birthday(el, ctx) {
    var T = ctx.unit.templates.birthday;
    var n50 = 1; while (H.birthday(n50) < 0.5) n50++;
    var d = { n: n50, p: (H.birthday(n50) * 100).toFixed(1) };
    var q = G.choiceQ({ id: 'bday', concept: 'collisions', seed: ctx.seed, prompt: T.prompt, options: [
      { text: n50, ok: true, why: U.fmt(T.ok, d) }, { text: 183, why: 'Half of 365 feels right, but the number of **pairs** grows like n²: 23 people make 253 pairs.' },
      { text: 366, why: '366 guarantees a match (pigeonhole). Even odds arrive much earlier.' }, { text: 60, why: 'At 60 people the chance is already over 99%.' }
    ] });
    G.predictThen(el, q, 'Explore ▶', function (ft) {
      var s = h('input', { type: 'range', min: 1, max: 80, value: 23, 'aria-label': 'People in the room' });
      var out = h('output.n-out');
      el.appendChild(h('label.slider-row', null, 'people ', s, out));
      var pts = []; for (var n = 1; n <= 80; n++) pts.push([n, Math.round(H.birthday(n) * 1000) / 10]);
      var chart = U.chart(el, { label: 'Chance of a shared birthday', yLabel: '% chance', xLabel: 'people', yMax: 100, series: [{ label: 'P(shared birthday) %', points: pts }], marker: 23 });
      function upd() { out.textContent = s.value + ' people: ' + (H.birthday(+s.value) * 100).toFixed(1) + '%'; chart.update({ label: 'Chance of a shared birthday', yLabel: '% chance', xLabel: 'people', yMax: 100, series: [{ label: 'P(shared birthday) %', points: pts }], marker: +s.value }); }
      s.addEventListener('input', upd); upd();
      G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(0, ft), summary: T.summary }); }, true);
    });
  }

  function cluster(el, ctx) {
    var T = ctx.unit.templates.cluster, M = 11, n = 8, seed = ctx.seed, lin, dbl, keys;
    // Pick a key set where clustering clearly shows (double hashing strictly better).
    for (var tries = 0; tries < 50; tries++) {
      keys = H.keySets.random(n, seed + tries, 60);
      lin = H.build(keys, M, 'linear'); dbl = H.build(keys, M, 'double');
      if (dbl.totalProbes < lin.totalProbes) break;
    }
    var d = { n: n, M: M, lp: lin.totalProbes, dp: dbl.totalProbes, lc: Math.max.apply(null, H.clusters(lin.table)), dc: Math.max.apply(null, H.clusters(dbl.table)) };
    G.note(el, 'Keys: ' + keys.join(', ') + ' · M = ' + M + ' · load factor ' + (n / M).toFixed(2));
    var q = G.choiceQ({ id: 'clus', concept: 'clustering', seed: seed, prompt: U.fmt(T.prompt, d), options: [
      { text: 'Double hashing', ok: true, why: U.fmt(T.ok, d) }, { text: 'Linear probing', why: U.fmt(T.lin, d) }, { text: 'Same number', why: U.fmt(T.same, d) }
    ] });
    G.predictThen(el, q, 'Build both ▶', function (ft) {
      el.appendChild(h('h3', null, 'Linear probing: ' + d.lp + ' probes, longest run ' + d.lc));
      U.hashView(el, { label: 'Linear probing' }).render({ slots: lin.table.slots });
      el.appendChild(h('h3', null, 'Double hashing: ' + d.dp + ' probes, longest run ' + d.dc));
      U.hashView(el, { label: 'Double hashing' }).render({ slots: dbl.table.slots });
      G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(0, ft), summary: U.fmt(T.summary, d) }); });
    });
  }

  function sandbox(el, ctx) {
    var form = h('form.sandbox-form');
    var inp = h('input', { type: 'text', value: '15 25 35 7 17 99', 'aria-label': 'Keys' });
    var M = h('input', { type: 'number', min: 3, max: 23, value: 10, 'aria-label': 'Table size', style: { width: '5em' } });
    var st = h('select', { 'aria-label': 'Strategy' }, h('option', { value: 'linear' }, 'linear probing'), h('option', { value: 'quadratic' }, 'quadratic probing'), h('option', { value: 'double' }, 'double hashing'));
    form.appendChild(h('label.wide', null, 'Keys ', inp)); form.appendChild(h('label', null, 'M ', M)); form.appendChild(h('label', null, 'Strategy ', st));
    form.appendChild(U.button('Build ▶', null, { cls: 'primary', attrs: { type: 'submit' } }));
    var err = h('p.error', { role: 'alert' }), out = h('div');
    el.appendChild(form); el.appendChild(err); el.appendChild(out);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var p = E.parseNumberList(inp.value, 23), m = Math.max(3, Math.min(23, +M.value || 10));
      err.textContent = p.error || (p.values && p.values.length > m ? 'More keys than slots: open addressing can\'t hold them.' : '');
      if (err.textContent) return;
      U.clear(out);
      var b = H.build(p.values, m, st.value);
      out.appendChild(h('p.status', null, 'Total probes: ' + b.totalProbes + ' · load factor ' + (p.values.length / m).toFixed(2) + (st.value === 'double' ? ' · PRIME = ' + H.primeBelow(m) : '')));
      U.hashView(out, { label: 'Your table' }).render({ slots: b.table.slots });
      b.inserts.forEach(function (r, i) { out.appendChild(h('div.small', null, p.values[i] + ': ' + r.path.join(' → ') + (r.full ? ' (table full!)' : ''))); });
      G.continueBtn(out, 'Done practising', function () { ctx.complete({ stars: 1, summary: 'Practice logged.' }); }, true);
    });
  }

  /* ===================== Unit 10 ===================== */

  function lispRun(unit, src) { return new L.Interp({ sxhash: unit.codes }).repl(unit.source + '\n' + src); }
  function kvsLisp(kvs) { return "'(" + kvs.map(function (kv) { return '(' + kv[0].toLowerCase() + ' ' + kv[1] + ')'; }).join(' ') + ')'; }
  function slotsOf(st) { return st.slots.map(function (x) { return x ? { k: x.k, v: x.v } : null; }); }
  function codesNote(el, unit, keys) {
    G.note(el, U.fmt(unit.templates.codesNote, { codes: keys.map(function (k) { return '(sxhash \'' + k.toLowerCase() + ') = ' + unit.codes[k]; }).join(', ') }));
  }

  /* Trace HT-GET: tap each slot it checks, then choose its return values. */
  G.htTraceTask = function (el, opts) {
    var unit = opts.unit, T = unit.templates, tb = unit.tables[opts.table], key = opts.key;
    var st = H.htCreate(tb.kvs, tb.size, unit.codes), code = unit.codes[key];
    var tr = H.htGetTrace(st.slots, key, code);
    var ret = lispRun(unit, '(defvar *ht* (ht-create ' + kvsLisp(tb.kvs) + ' ' + tb.size + ')) (multiple-value-list (ht-get \'' + key.toLowerCase() + ' *ht*))');
    var s = 0, misses = 0, hints = 0;
    var box = h('div'); el.appendChild(box);
    codesNote(box, unit, tb.kvs.map(function (kv) { return kv[0]; }).concat([key]).filter(function (k, i, a) { return a.indexOf(k) === i; }));
    var panel = U.codePanel(box, { code: unit.lisp.htGet.code, title: unit.lisp.htGet.title });
    var vars = h('table.var-table', null, h('thead', null, h('tr', null, h('th', null, 'i'), h('th', null, 'h'), h('th', null, 'item'), h('th', null, 'result'))));
    var vbody = h('tbody'); vars.appendChild(vbody);
    var prompt = h('p.prompt', { 'aria-live': 'polite' }); box.appendChild(prompt);
    var view = U.hashView(box, { label: 'The array of *ht*', onPick: pick });
    box.appendChild(h('div.table-wrap', null, vars));
    var tools = h('div.tools'); box.appendChild(tools);
    var fb = U.feedback(box);
    var h1 = code % tb.size, path = [];
    if (opts.hints) tools.appendChild(U.button('Why?', function () { hints++; fb.show({ info: true, title: 'Next probe', why: U.fmt(T.traceHint, { h1: h1, i: s, size: tb.size, h: (h1 + s) % tb.size }) }); }));
    function render(cs) {
      view.render({ slots: slotsOf(st), path: path, cellState: cs || {}, selectable: function () { return s < tr.steps.length; } });
      if (s < tr.steps.length) prompt.textContent = U.fmt(T.tracePrompt, { k: key.toLowerCase(), i: s });
      panel.highlight(s === 0 ? 3 : 5);
    }
    function pick(i) {
      if (s >= tr.steps.length) return;
      var stp = tr.steps[s];
      if (i !== stp.h) {
        misses++; CQ.store.record('ht-get', false, true);
        if (opts.gameId) CQ.store.noteMiss(opts.gameId, 'ht-get');
        var o = {}; o[i] = 'bad'; render(o);
        fb.show({ ok: false, title: 'Not slot ' + i, why: U.fmt(T.traceWrong, { i: s, h1: h1, size: tb.size, h: stp.h, choice: i }) });
        return;
      }
      CQ.store.record('ht-get', true, true);
      path.push(i);
      var itemTxt = stp.item ? '(' + stp.item.k + ' . ' + (stp.item.v === null ? 'NIL' : stp.item.v) + ')' : 'NIL';
      var what = stp.stop === 'found' ? 'finds ' + key + ': (funcall comp key (car item)) is true' : stp.stop === 'nil' ? 'stops: (null item) is true, so ' + key + ' can\'t be further on' : 'compares ' + key + ' with ' + stp.item.k + ': no match, probe on';
      vbody.appendChild(h('tr', null, h('td', null, String(stp.i)), h('td', null, String(stp.h)), h('td', null, itemTxt), h('td', null, stp.stop || 'keep probing')));
      fb.show({ info: true, title: 'Slot ' + stp.h, why: U.fmt(T.traceStop, { h: stp.h, item: itemTxt, what: what }) });
      s++;
      panel.highlight(stp.stop === 'found' ? 10 : stp.stop === 'nil' ? 8 : 9);
      render();
      if (s >= tr.steps.length) askReturn();
    }
    function askReturn() {
      U.clear(tools);
      prompt.textContent = '';
      var last = tr.steps[tr.steps.length - 1];
      var cand = [ret, '(NIL NIL)', '(' + (last.item ? (last.item.v === null ? 'NIL' : last.item.v) : 'NIL') + ' ' + h1 + ')', last.item ? '(' + last.item.k + ' . ' + last.item.v + ')' : '(NIL ' + last.h + ')'];
      var seen = {}, opts2 = [];
      cand.forEach(function (c, i) { if (!seen[c]) { seen[c] = 1; opts2.push({ text: c, ok: i === 0, why: i === 0 ? U.fmt(T.retOk, { ret: ret }) : c === '(NIL NIL)' ? 'That\'s the not-found result: (values nil nil).' : 'HT-GET returns (values (cdr item) h): the value and the slot where it was found.' }); } });
      var q = G.choiceQ({ id: 'ht-ret', concept: 'ht-get', seed: 3, prompt: U.fmt(T.retPrompt, { k: key.toLowerCase() }), options: opts2 });
      var qb = h('div'); box.appendChild(qb);
      U.question(qb, q, { onResult: function (c, ft) { if (!ft) misses++; opts.onDone({ misses: misses, hints: hints, summary: '(ht-get \'' + key.toLowerCase() + ') → ' + ret }); } });
    }
    render();
  };

  function htTrace(el, ctx) {
    var tb = ctx.unit.tables[ctx.level.table], keys = tb.lookups, k = 0, misses = 0, hints = 0;
    var area = h('div'); el.appendChild(area);
    function next() {
      U.clear(area);
      area.appendChild(h('h3', null, 'Lookup ' + (k + 1) + ' of ' + keys.length + ': (ht-get \'' + keys[k].toLowerCase() + ' *ht*)'));
      G.htTraceTask(area, { unit: ctx.unit, table: ctx.level.table, key: keys[k], hints: ctx.hints, gameId: ctx.gameId, onDone: function (r) {
        misses += r.misses; hints += r.hints; k++;
        if (k < keys.length) G.continueBtn(area, 'Next lookup', next);
        else G.continueBtn(area, 'Finish level', function () { CQ.store.noteRound(ctx.gameId, misses === 0); ctx.complete({ stars: G.stars(hints, misses === 0), summary: keys.length + ' lookups traced.' }); });
      } });
    }
    next();
  }

  /* NIL Trap: answers come from running the lecture's code. */
  function nilTrap(el, ctx) {
    var T = ctx.unit.templates.nil, unit = ctx.unit, tb = unit.tables.four;
    var setup = '(defvar *ht* (ht-create ' + kvsLisp(tb.kvs) + ' 16)) (ht-add \'e nil *ht*) ';
    var r1 = lispRun(unit, setup + "(multiple-value-list (ht-get 'e *ht*))"), r2 = lispRun(unit, setup + "(multiple-value-list (ht-get 'f *ht*))");
    var buggy = "(defun ht-set (key value ht) (multiple-value-bind (v i) (ht-get key ht) (when v (setf (cdr (aref (ht-array ht) i)) value)))) ";
    var r3 = lispRun(unit, buggy + setup + "(ht-set 'e 7 *ht*) (multiple-value-list (ht-get 'e *ht*))");
    var fixed = lispRun(unit, setup + "(ht-set 'e 7 *ht*) (multiple-value-list (ht-get 'e *ht*))");
    var p = h('p.note'); p.appendChild(U.rich(T.setup)); el.appendChild(p);
    codesNote(el, unit, ['A', 'B', 'C', 'D', 'E', 'F']);
    var first = 0, qs = [
      { prompt: T.q1, ans: r1, alts: ['(NIL NIL)', 'NIL', '(E . NIL)'], why: 'E is in slot ' + r1.replace(/[()]/g, '').split(' ')[1] + ' with value NIL: the value is NIL but the index proves it was found.' },
      { prompt: T.q2, ans: r2, alts: [r1, 'NIL', '(F NIL)'], why: 'F is missing: (values nil nil). Its first value looks exactly like E\'s.' }
    ];
    var area = h('div'); el.appendChild(area);
    function ask(i) {
      if (i >= qs.length) return bug();
      var qd = qs[i];
      var opts = [{ text: qd.ans, ok: true, why: qd.why }].concat(qd.alts.filter(function (a) { return a !== qd.ans; }).map(function (a) { return { text: a, why: 'Run it in your head: ' + qd.why }; }));
      var q = G.choiceQ({ id: 'nil' + i, concept: 'gethash-two-values', seed: ctx.seed + i, prompt: 'What does `' + qd.prompt + '` print?', options: opts });
      var b = h('div'); area.appendChild(b);
      U.question(b, q, { onResult: function (c, ft) { if (ft) first++; ask(i + 1); } });
    }
    function bug() {
      var b = h('div'); area.appendChild(b);
      var pp = h('p.note'); pp.appendChild(U.rich(T.bugIntro)); b.appendChild(pp);
      U.codePanel(b, { code: '(defun ht-set (key value ht)\n  (multiple-value-bind (v i) (ht-get key ht)\n    (when v      ; buggy: should test i\n      (setf (cdr (aref (ht-array ht) i)) value))))', title: 'Buggy HT-SET' });
      var q = G.choiceQ({ id: 'nilbug', concept: 'ht-set-nil', seed: ctx.seed + 9, prompt: T.bugQ, misconception: T.misconception, options: [
        { text: r3, ok: true, why: T.why + ' The lecture\'s version gives ' + fixed + '.' },
        { text: fixed, misconception: true, why: T.why },
        { text: '(NIL NIL)', why: 'E is still in the table; HT-SET never removes anything.' }
      ] });
      U.question(b, q, { onResult: function (c, ft) {
        if (ft) first++;
        CQ.store.noteRound(ctx.gameId, first === 3);
        G.continueBtn(b, 'Finish level', function () { ctx.complete({ stars: first === 3 ? 3 : first >= 2 ? 2 : 1, summary: 'Test the index, not the value.' }); });
      } });
    }
    ask(0);
  }

  function eqlEqual(el, ctx) {
    var T = ctx.unit.templates.equal;
    var cases = [
      { setup: '(defvar *h1* (make-hash-table)) (setf (gethash "foo" *h1*) 1)', form: '(gethash "foo" *h1*)' },
      { setup: "(defvar *h2* (make-hash-table :test 'equal)) (setf (gethash \"foo\" *h2*) 1)", form: '(gethash "foo" *h2*)' },
      { setup: "(defvar *h3* (make-hash-table)) (setf (gethash 'foo *h3*) 1)", form: "(gethash 'foo *h3*)" },
      { setup: "(defvar *h4* (make-hash-table)) (setf (gethash '(1 2) *h4*) 1)", form: "(gethash '(1 2) *h4*)" },
      { setup: "(defvar *a* '((\"foo\" . bar)))", form: "(assoc \"foo\" *a* :test 'equal)" }
    ];
    var k = 0, first = 0;
    var area = h('div'); el.appendChild(area);
    function next() {
      if (k >= cases.length) {
        CQ.store.noteRound(ctx.gameId, first === cases.length);
        return G.continueBtn(area, 'Finish level', function () { ctx.complete({ stars: first === cases.length ? 3 : first >= 3 ? 2 : 1, summary: 'Strings and lists need EQUAL; symbols and numbers are fine with EQL.' }); });
      }
      var c = cases[k], it = new L.Interp();
      var ans = it.repl(c.setup + ' ' + c.form);
      var why = /make-hash-table\)\)/.test(c.setup) && /"/.test(c.form) ? 'Default EQL: the looked-up "foo" is a different string object.' :
        /'\(1 2\)/.test(c.form) ? 'Default EQL: two separately written lists are different objects. Lists need :test \'equal too.' :
        /:test 'equal/.test(c.setup + c.form) ? 'EQUAL compares contents, so the same characters match.' : 'Symbols are interned: \'FOO is the same object every time, so EQL finds it.';
      var alts = ['NIL', '1', '("foo" . BAR)', 'T'].filter(function (a) { return a !== ans; }).slice(0, 2);
      var q = G.choiceQ({ id: 'eq' + k, concept: 'eql-equal', seed: ctx.seed + k, prompt: T.q, code: c.setup.replace(/\) \(/g, ')\n(') + '\n' + c.form, misconception: T.misconception,
        options: [{ text: ans, ok: true, why: why }].concat(alts.map(function (a, i) { return { text: a, misconception: i === 0 && ans === 'NIL', why: why }; })) });
      q.type = 'predict';
      var b = h('div'); area.appendChild(b);
      U.question(b, q, { onResult: function (cc, ft) { if (ft) first++; k++; next(); } });
    }
    next();
  }

  /* Resize Puzzle: the player re-adds each entry after the grow, then adds the new one. */
  function resize(el, ctx) {
    var unit = ctx.unit, T = unit.templates.resize, X = unit.templates, codes = unit.codes;
    var kvs, size, add;
    if (ctx.level.big) { kvs = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(function (k, i) { return [k, i + 1]; }); size = 8; add = ['Z', 9]; }
    else { kvs = unit.tables.full.kvs; size = unit.tables.full.size; add = unit.tables.full.add; }
    var st = H.htCreate(kvs, size, codes);
    var res = H.htAdd(st, add[0], add[1], codes);
    var moves = res.grew.moves.concat([{ key: add[0], to: res.index, path: res.path, isNew: true, from: null }]);
    codesNote(el, unit, kvs.map(function (kv) { return kv[0]; }).concat([add[0]]));
    var p = h('p.note'); p.appendChild(U.rich(U.fmt(T.intro, { old: size, new: res.grew.to, order: res.grew.moves.map(function (m) { return m.key; }).join(', '), nk: add[0] }))); el.appendChild(p);
    el.appendChild(h('h3', null, 'Old array (' + size + ' slots)'));
    U.hashView(el, { label: 'Old array' }).render({ slots: slotsOf(st) });
    el.appendChild(h('h3', null, 'New array (' + res.grew.to + ' slots)'));
    var prompt = h('p.prompt', { 'aria-live': 'polite' }); el.appendChild(prompt);
    var newSlots = []; for (var i = 0; i < res.grew.to; i++) newSlots.push(null);
    var view = U.hashView(el, { label: 'New array', onPick: pick });
    var tools = h('div.tools'); el.appendChild(tools);
    var fb = U.feedback(el);
    var m = 0, misses = 0, hints = 0;
    if (ctx.hints) tools.appendChild(U.button('Why?', function () { hints++; var mv = moves[m]; fb.show({ info: true, title: 'Where it goes', why: '(rem ' + codes[mv.key] + ' ' + res.grew.to + ') = ' + (codes[mv.key] % res.grew.to) + (mv.path.length > 1 ? '; that slot is taken, so ADD-ITEM steps forward: ' + mv.path.join(' → ') : '') + '.' }); }));
    function valOf(k) { var kv = kvs.filter(function (x) { return x[0] === k; })[0]; return kv ? kv[1] : add[1]; }
    function render(cs) {
      view.render({ slots: newSlots, cellState: cs || {}, selectable: function () { return m < moves.length; } });
      if (m < moves.length) {
        var mv = moves[m], d = { k: mv.key, v: valOf(mv.key), code: codes[mv.key], size: res.grew.to, h: codes[mv.key] % res.grew.to };
        prompt.innerHTML = ''; prompt.appendChild(U.rich(U.fmt(mv.isNew ? T.newPrompt : T.prompt, d)));
      } else prompt.textContent = '';
    }
    function pick(i) {
      if (m >= moves.length) return;
      var mv = moves[m];
      if (i === mv.to) {
        CQ.store.record('resize', true, true);
        newSlots[i] = { k: mv.key, v: valOf(mv.key) };
        var o = {}; o[i] = 'ok';
        fb.show({ ok: true, title: mv.key + ' → slot ' + i, why: mv.path.length > 1 ? 'Collision on the way: ' + mv.path.join(' → ') + '.' : 'Straight to (rem ' + codes[mv.key] + ' ' + res.grew.to + ') = ' + i + '.' });
        m++; render(o);
        if (m >= moves.length) {
          U.clear(tools);
          var lispOut = lispRun(unit, '(defvar *ht* (ht-create ' + kvsLisp(kvs) + ' ' + size + ')) (ht-add \'' + add[0].toLowerCase() + ' ' + add[1] + ' *ht*) (ht-array *ht*)');
          G.note(el, T.done + ' The lecture\'s HT-ADD, run on the same table, prints `' + lispOut + '`.');
          CQ.store.noteRound(ctx.gameId, misses === 0 && hints === 0);
          G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(hints, misses === 0), summary: 'Every entry re-added at (rem code ' + res.grew.to + ').' }); });
        }
      } else {
        misses++; CQ.store.record('resize', false, true);
        if (ctx.gameId) CQ.store.noteMiss(ctx.gameId, 'resize');
        var d2 = { k: mv.key, choice: i, old: size, code: codes[mv.key], size: res.grew.to, h: codes[mv.key] % res.grew.to, exp: mv.to, probe: mv.path.length > 1 ? U.fmt(T.probeNote, { exp: mv.to }) : '' };
        var oo = {}; oo[i] = 'bad'; render(oo);
        fb.show({ ok: false, title: 'Not slot ' + i, why: U.fmt(mv.from === i ? T.wrongOld : T.wrongOther, d2), misconception: mv.from === i ? T.misconception : null });
      }
    }
    void X;
    render();
  }

  /* Briefing steps and Boss tasks. */
  G.briefingKinds = G.briefingKinds || {};
  G.briefingKinds.alistRace = function (area, s, unit, after) {
    var keys = H.keySets.random(12, 5, 99), M = 13;
    var sel = h('select', { 'aria-label': 'Key to look up' });
    keys.forEach(function (k) { sel.appendChild(h('option', { value: k }, String(k))); });
    sel.value = keys[keys.length - 1];
    var out = h('div.lanes', { 'aria-live': 'polite' });
    area.appendChild(h('label.slider-row', null, 'Look up key ', sel)); area.appendChild(out);
    function draw() {
      var k = +sel.value, pos = keys.indexOf(k) + 1;
      U.clear(out);
      out.appendChild(h('div.lane', null, h('span.lane-name', null, 'ASSOC (a-list)'), h('span.lane-track', null, h('span.lane-bar.seg1', { style: { width: (pos / keys.length * 100) + '%' } })), h('span.lane-val', null, pos + ' comparisons')));
      out.appendChild(h('div.lane', null, h('span.lane-name', null, 'hash table'), h('span.lane-track', null, h('span.lane-bar.seg2', { style: { width: (1 / keys.length * 100) + '%' } })), h('span.lane-val', null, '1 hash, slot ' + (k % M))));
    }
    sel.addEventListener('change', draw); draw();
    G.continueBtn(area, 'I see it', after, true);
  };
  G.briefingKinds.collide = function (area, s, unit, after) {
    var t = H.create(10, 'linear'), keys = [15, 25, 35], i = 0;
    var view = U.hashView(area, { label: 'Table of size 10' });
    view.render({ slots: t.slots });
    var b = U.button('Insert ' + keys[0] + ' ▶', function () {
      var k = keys[i], target = H.h1(k, 10);
      t.slots[target] = t.slots[target] === null ? k : t.slots[target] + ', ' + k;
      view.render({ slots: t.slots, path: [target] });
      i++;
      if (i < keys.length) b.textContent = 'Insert ' + keys[i] + ' ▶';
      else { b.remove(); after(); }
    }, { cls: 'primary' });
    area.appendChild(h('div.actions', null, b));
  };
  G.briefingKinds.twoValues = function (area, s, unit, after) {
    var it = new L.Interp();
    it.evalString('(defvar *ht* (make-hash-table)) (setf (gethash :foo *ht*) "bar") (setf (gethash :empty *ht*) nil)');
    var out = h('div');
    [':foo', ':empty', ':nope'].forEach(function (k) {
      area.appendChild(U.button('(multiple-value-list (gethash ' + k + ' *ht*))', function () {
        out.appendChild(h('pre.code-inline', null, '* (multiple-value-list (gethash ' + k + ' *ht*))\n' + it.repl('(multiple-value-list (gethash ' + k + ' *ht*))')));
        if (out.children.length === 3) after();
      }, { cls: 'mono small' }));
    });
    area.appendChild(out);
  };
  G.briefingKinds.eqlEqual = function (area, s, unit, after) {
    var src = "(defvar *h1* (make-hash-table))\n(defvar *h2* (make-hash-table :test 'equal))\n(setf (gethash \"foo\" *h1*) 1)\n(setf (gethash \"foo\" *h2*) 1)\n(list (gethash \"foo\" *h1*) (gethash \"foo\" *h2*))";
    U.codePanel(area, { code: src, title: 'At the REPL' });
    G.continueBtn(area, 'Run it ▶', function () { area.appendChild(h('pre.code-inline', null, '→ ' + new L.Interp().repl(src))); after(); });
  };
  G.tasks = G.tasks || {};
  G.tasks.hotel = function (container, q, unit, done) { G.hotelTask(container, { unit: unit, strategy: q.strategy, M: q.M, keys: q.keys, hints: false, onDone: done }); };
  G.tasks.htTrace = function (container, q, unit, done) { G.htTraceTask(container, { unit: unit, table: q.table, key: q.key, hints: false, onDone: done }); };

  G.hotel = { mount: function (el, ctx) { (ctx.level.kind === 'cuckoo' ? cuckoo : hotel)(el, ctx); } };
  G.tomb = { mount: function (el, ctx) { (ctx.level.kind === 'trap' ? trap : reuse)(el, ctx); } };
  G.lab = { mount: function (el, ctx) { ({ dist: dist, birthday: birthday, cluster: cluster, sandbox: sandbox })[ctx.level.kind](el, ctx); } };
  G.codedet = { mount: htTrace };
  G.niltrap = { mount: function (el, ctx) { (ctx.level.kind === 'nil' ? nilTrap : eqlEqual)(el, ctx); } };
  G.resize = { mount: resize };
})(typeof globalThis !== 'undefined' ? globalThis : this);
