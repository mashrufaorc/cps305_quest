/* CPS305 Quest — ui/games/divide.js
 * Unit 7: Merge Conveyor (pick the front), Split and Merge Tree, Threshold Slider.
 * Unit 6: Partition Dance (move i and j), Pivot Picker, Sorted-Input Trap.
 * All answers come from engine/sorts2.js.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, G = CQ.games, h = U.h;

  /* ===================== Unit 7 ===================== */

  function belts(el) {
    var wrap = h('div.belts', { 'aria-live': 'polite' });
    el.appendChild(wrap);
    return function (st, focus) {
      U.clear(wrap);
      [['A (l1)', st.a, 'a'], ['B (l2)', st.b, 'b'], ['Output (res, reversed at the end)', st.out, 'o']].forEach(function (row) {
        var line = h('div.belt' + (row[2] === 'o' ? '.belt-out' : ''), { role: 'list', 'aria-label': row[0] + ': ' + (row[1].length ? row[1].join(', ') : 'empty') });
        line.appendChild(h('span.belt-name', null, row[0]));
        if (!row[1].length) line.appendChild(h('span.belt-empty', null, 'empty'));
        row[1].forEach(function (v, i) { line.appendChild(h('span.belt-item' + (i === 0 && focus && row[2] !== 'o' ? '.is-front' : ''), { role: 'listitem' }, String(v))); });
        wrap.appendChild(line);
      });
    };
  }

  /* One merge, refereed step by step by E.mergeLists. */
  G.conveyorTask = function (el, opts) {
    var unit = opts.unit, T = unit.templates, a = opts.a, b = opts.b;
    var steps = E.collect(E.mergeLists(a, b)), k = 0, misses = 0, hints = 0;
    var draw = belts(el);
    var prompt = h('p.prompt', { 'aria-live': 'polite' }); el.appendChild(prompt);
    var row = h('div.choice-row'); el.appendChild(row);
    var cnt = U.counters(el, ['comparisons']);
    var panel = U.codePanel(el, { code: unit.lisp.mergeLists.code, title: unit.lisp.mergeLists.title });
    var tools = h('div.tools'); el.appendChild(tools);
    var fb = U.feedback(el);
    if (opts.hints) tools.appendChild(U.button('Why?', function () { hints++; var s = steps[k]; fb.show({ info: true, title: 'The rule', why: U.fmt(T.conveyorWhy, { a: s.x, b: s.y }) }); }));
    function advance() {
      // Auto-play leftovers ("rest") until the next decision.
      while (k < steps.length && steps[k].at !== 'decide' && steps[k].at !== 'done') { k++; }
      if (k >= steps.length || steps[k].at === 'done') return finish();
      var s = steps[k];
      draw(s, true); cnt.set({ comparisons: s.comparisons });
      panel.highlight(14);
      U.clear(row);
      prompt.innerHTML = ''; prompt.appendChild(U.rich(U.fmt(T.conveyorPrompt, { a: s.x, b: s.y })));
      [['a', '1', '↑ Take ' + s.x + ' (A)'], ['b', '2', '↓ Take ' + s.y + ' (B)']].forEach(function (o) {
        row.appendChild(U.button(h('span', null, h('kbd', null, o[1]), ' ' + o[2]), function () { choose(o[0]); }, { cls: 'choice big' }));
      });
    }
    function choose(c) {
      var s = steps[k];
      if (!s || s.at !== 'decide') return;
      if (c === s.take) {
        CQ.store.record('merge-step', true, true);
        fb.hide();
        k++;
        draw(steps[k]);
        // Show the leftover copy explicitly when a belt runs dry.
        var nxt = steps[k + 1];
        if (nxt && nxt.at === 'rest') { panel.highlight(nxt.from === 'b' ? 9 : 12); fb.show({ info: true, title: 'A belt ran dry', why: 'One list is empty, so the DOLIST pushes the rest of the other list without comparing.' }); }
        k++;
        advance();
      } else {
        misses++; CQ.store.record('merge-step', false, true);
        if (opts.gameId) CQ.store.noteMiss(opts.gameId, 'merge-step');
        var take = s.take === 'a' ? s.x : s.y;
        fb.show({ ok: false, title: 'Not that one', why: s.x === s.y ? U.fmt(T.conveyorTie, { a: s.x, b: s.y }) : U.fmt(T.conveyorWrong, { take: take, reason: take + ' < ' + (s.take === 'a' ? s.y : s.x) + '.' }) });
      }
    }
    function onKey(e) {
      if (!document.body.contains(el)) { document.removeEventListener('keydown', onKey); return; }
      if (U.typing(e)) return;
      if (e.key === '1') choose('a'); if (e.key === '2') choose('b');
    }
    document.addEventListener('keydown', onKey);
    function finish() {
      var last = steps[steps.length - 1];
      draw(last); cnt.set({ comparisons: last.comparisons });
      U.clear(row); U.clear(tools); prompt.textContent = 'Merged: (' + last.out.join(' ') + ')';
      panel.highlight(20);
      var d = { n: last.out.length, c: last.comparisons, max: a.length + b.length - 1 };
      G.note(el, U.fmt(T.conveyorDone, d));
      opts.onDone({ misses: misses, hints: hints, summary: U.fmt(T.conveyorDone, d) });
    }
    advance();
  };

  function conveyor(el, ctx) {
    var n = ctx.size, r = E.rng(ctx.seed);
    var mk = function (len) { var s = []; for (var i = 0; i < len; i++) s.push(E.randInt(r, 1, ctx.level.dupes ? 9 : 30)); return s.sort(function (x, y) { return x - y; }); };
    G.conveyorTask(el, { unit: ctx.unit, a: mk(n), b: mk(n - (ctx.seed % 2)), hints: ctx.hints, gameId: ctx.gameId, onDone: function (res) {
      CQ.store.noteRound(ctx.gameId, res.misses === 0 && res.hints === 0);
      G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(res.hints, res.misses === 0), summary: res.summary }); });
    } });
  }

  /* Merge sort's split tree, built from the engine trace. */
  function mergeTreeFrames(values) {
    var trace = E.collect(E.mergeSort(values)), nodes = {}, frames = [];
    var done = trace[trace.length - 1];
    done.tree.forEach(function (t) { nodes[t.id] = { id: t.id, lo: t.lo, hi: t.hi, depth: t.depth, parent: t.parent, children: [], hidden: true, compares: t.compares }; });
    Object.keys(nodes).forEach(function (id) { var nd = nodes[id]; if (nd.parent != null) nodes[nd.parent].children.push(nd); });
    var rootN = nodes[0]; rootN.hidden = false;
    function key(lo, hi) { for (var id in nodes) if (nodes[id].lo === lo && nodes[id].hi === hi) return nodes[id]; return null; }
    trace.forEach(function (s) {
      if (s.at !== 'split' && s.at !== 'merged' && s.at !== 'start' && s.at !== 'done') return;
      var nd = s.lo != null ? key(s.lo, s.hi) : null;
      if (s.at === 'split' && nd) { nd.children.forEach(function (c) { c.hidden = false; }); nd.phase = 'split'; }
      if (s.at === 'merged' && nd) { nd.phase = 'merged'; nd.merged = true; }
      frames.push({ msg: s.msg, vals: E.values(s.arr), active: nd ? nd.id : null, snapshot: JSON.parse(JSON.stringify(Object.keys(nodes).map(function (id) { var x = nodes[id]; return { id: x.id, hidden: x.hidden, phase: x.phase, merged: x.merged }; }))) });
    });
    return { nodes: nodes, root: rootN, frames: frames, total: done.counters.comparisons, depth: Math.max.apply(null, done.tree.map(function (t) { return t.depth; })) };
  }
  function renderMergeTree(tv, mt, f) {
    var byId = {}; f.snapshot.forEach(function (x) { byId[x.id] = x; });
    (function walk(nd) {
      var st = byId[nd.id];
      nd.hidden = st.hidden;
      nd.label = f.vals.slice(nd.lo, nd.hi + 1).join(' ');
      nd.sub = st.merged ? (nd.hi > nd.lo ? 'merged · ' + nd.compares + ' cmp' : 'size 1') : st.phase === 'split' ? 'split' : '';
      nd.state = f.active === nd.id ? 'active' : st.merged ? 'done' : null;
      nd.children.forEach(walk);
    })(mt.root);
    tv.render(mt.root);
  }
  function splitTree(el, ctx) {
    var T = ctx.unit.templates, n = ctx.size;
    var values = E.makeInput('random', n, ctx.seed);
    var mt = mergeTreeFrames(values);
    var lv = Math.ceil(Math.log2(n));
    var chain = []; for (var s = n; s >= 1; s = Math.floor(s / 2)) chain.push(s);
    var q = G.choiceQ({ id: 'ms-levels', concept: 'split-tree', seed: ctx.seed, prompt: U.fmt(T.levelsQ, { n: n }), options: [
      { text: lv, ok: true, why: U.fmt(T.levelsOk, { n: n, lv: lv, chain: chain.join(' → ') }) },
      { text: n - 1, why: 'Each level halves the size, so it takes log₂ n levels, not n − 1.' },
      { text: n / 2, why: 'Halving, not subtracting: ' + chain.join(' → ') + '.' }
    ] });
    G.predictThen(el, q, 'Step through it ▶', function (ft) {
      var tv = U.treeView(el, { label: 'Merge sort split tree', nodeW: Math.max(64, n * 9) });
      var narr = h('p.narration', { 'aria-live': 'polite' }); el.appendChild(narr);
      var ctrl = h('div'); el.insertBefore(ctrl, tv.el);
      var st = U.stepper(ctrl, { count: mt.frames.length, onShow: function (k) { renderMergeTree(tv, mt, mt.frames[k]); narr.textContent = mt.frames[k].msg; } });
      st.play();
      // Per-level comparison totals (each level ≤ n).
      var per = {}; Object.keys(mt.nodes).forEach(function (id) { var nd = mt.nodes[id]; per[nd.depth] = (per[nd.depth] || 0) + nd.compares; });
      var ul = h('ul.level-list');
      Object.keys(per).sort().forEach(function (d) { if (per[d]) ul.appendChild(h('li', null, 'Merging into level ' + d + ': ' + per[d] + ' comparisons (≤ n = ' + n + ')')); });
      el.appendChild(h('h3', null, 'Comparisons per level'));
      el.appendChild(ul);
      G.note(el, 'Total: ' + mt.total + ' comparisons ≈ n log₂ n = ' + Math.round(n * Math.log2(n)) + ' at most.');
      G.continueBtn(el, 'Finish level', function () { st.destroy(); ctx.complete({ stars: G.stars(0, ft), summary: lv + ' levels × ≤ ' + n + ' comparisons each.' }); }, true);
    });
  }

  function inputs(el, ctx) {
    var n = 64, kinds = ['sorted', 'reversed', 'random'];
    var counts = kinds.map(function (k) { return E.countSort(E.mergeSort(E.makeInput(k, n, ctx.seed))).counters.comparisons; });
    var q = G.choiceQ({ id: 'ms-inputs', concept: 'split-tree', seed: ctx.seed, prompt: 'Merge sort on 64 elements that are sorted, reversed, or random. What is its Big-O on each?', options: [
      { text: 'O(n log n) on all three', ok: true, why: 'Measured: sorted ' + counts[0] + ', reversed ' + counts[1] + ', random ' + counts[2] + ' comparisons. Merging sorted halves stops early, so counts vary by a constant factor, but the growth is n log n every time.' },
      { text: 'O(n) on sorted input', why: 'That\'s insertion sort. Merge sort still splits and merges every level.' },
      { text: 'O(n²) on reversed input', why: 'Merge sort has no bad inputs.' }
    ] });
    G.predictThen(el, q, 'Plot them ▶', function (ft) {
      var series = kinds.map(function (k) {
        var pts = []; for (var m = 16; m <= 1024; m *= 2) pts.push([m, E.countSort(E.mergeSort(E.makeInput(k, m, ctx.seed))).counters.comparisons]);
        return { label: k, points: pts };
      });
      var ref = series[0].points.map(function (p) { return [p[0], p[0] * Math.log2(p[0])]; });
      series.push({ label: 'n log₂ n', points: ref });
      U.chart(el, { label: 'Merge sort comparisons by input order', xLabel: 'n', yLabel: 'comparisons', series: series });
      G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(0, ft), summary: 'Merge sort is O(n log n) on every input.' }); });
    });
  }

  function threshold(el, ctx) {
    var T = ctx.unit.templates;
    var q = G.choiceQ({ id: 'ms-hybrid', concept: 'hybrid', seed: ctx.seed, prompt: T.hybridQ, misconception: T.misconceptionHybrid, options: [
      { text: 'Still O(n log n)', ok: true, why: T.hybridOk }, { text: 'O(n²)', misconception: true, why: 'Insertion sort only ever runs on pieces of at most 8: that\'s constant work per piece.' }, { text: 'O(n)', why: 'Merging still costs n per level for log n levels.' }
    ] });
    G.predictThen(el, q, 'Slide the cutoff ▶', function (ft) {
      var n = 512, vals = E.makeInput('random', n, ctx.seed);
      var s = h('input', { type: 'range', min: 1, max: 64, value: 1, 'aria-label': 'Insertion sort cutoff' });
      var out = h('output.n-out');
      el.appendChild(h('label.slider-row', null, 'cutoff ', s, out));
      var chartBox = h('div'); el.appendChild(chartBox);
      var chart = null;
      function upd() {
        var t = +s.value, c = E.countSort(E.mergeSort(vals, null, { threshold: t })).counters.comparisons;
        out.textContent = 'cutoff ' + t + ': ' + c + ' comparisons on n = ' + n;
        var mk = function (th) { var pts = []; for (var m = 32; m <= 2048; m *= 2) pts.push([m, E.countSort(E.mergeSort(E.makeInput('random', m, ctx.seed), null, { threshold: th })).counters.comparisons]); return pts; };
        var series = [{ label: 'cutoff 1 (plain)', points: mk(1) }, { label: 'cutoff ' + t, points: mk(t) }];
        if (chart) chart.update({ label: 'Hybrid merge sort', yLabel: 'comparisons', series: series }); else chart = U.chart(chartBox, { label: 'Hybrid merge sort', yLabel: 'comparisons', series: series });
      }
      s.addEventListener('change', upd); s.addEventListener('input', function () { out.textContent = 'cutoff ' + s.value + ' (release to recompute)'; });
      upd();
      G.note(el, 'Comparisons are only part of the story: insertion sort has very low overhead on tiny pieces, which is why real libraries (Timsort) use a cutoff. Both curves keep the same n log n shape.');
      G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(0, ft), summary: 'A cutoff changes the constant, not the class.' }); }, true);
    });
  }

  /* ===================== Unit 6 ===================== */

  function dance(el, ctx) {
    var algo = ctx.level.algo === 'mixed' ? (ctx.seed % 2 ? 'quickHoare' : 'quickLomuto') : ctx.level.algo;
    var values = E.makeInput('random', ctx.size, ctx.seed);
    G.note(el, algo === 'quickLomuto' ? '**Lomuto:** pivot = last element. Scan left to right: anything smaller than the pivot is swapped into slot i, and i moves right. Then the pivot swaps into slot i.' : '**Hoare:** pivot = first element. i moves right to an element ≥ pivot, j moves left to an element ≤ pivot; swap while i < j; return j.');
    U.runner(el, { algo: algo, values: values, unit: ctx.unit, gameId: ctx.gameId, hints: ctx.hints, onDone: function (res) {
      CQ.store.noteRound(ctx.gameId, res.misses === 0 && res.hintsUsed === 0);
      G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(res.hintsUsed, res.misses === 0), summary: E.sorts[algo].name + ': ' + res.counters.comparisons + ' comparisons, ' + res.counters.swaps + ' swaps.' }); });
    } });
  }

  /* Quicksort recursion tree from an engine "done" snapshot. */
  function quickTree(done, values) {
    var nodes = done.tree.map(function (t) { return { id: t.id, label: t.size ? 'n=' + t.size : '∅', sub: t.pivotIndex != null ? 'pivot @' + t.pivotIndex : t.split != null ? 'split @' + t.split : '', children: [], parent: t.parent, state: t.size <= 1 ? 'done' : null }; });
    nodes.forEach(function (n) { if (n.parent != null) nodes[n.parent].children.push(n); });
    void values;
    return nodes[0];
  }

  function picker(el, ctx) {
    var T = ctx.unit.templates, n = ctx.size;
    var values = ctx.level.input === 'sorted' ? E.makeInput('sorted', n, ctx.seed) : E.makeInput('random', n, ctx.seed);
    // Reference totals: always-last and always-median (best).
    function simulate(rule) {
      var total = 0, depth = 0;
      (function go(vals, d) {
        depth = Math.max(depth, d);
        if (vals.length <= 1) return;
        var idx = rule === 'last' ? vals.length - 1 : (function () { var s = vals.slice().sort(function (a, b) { return a - b; }); return vals.indexOf(s[Math.floor((s.length - 1) / 2)]); })();
        var r = E.partitionAt(vals, 0, vals.length - 1, idx);
        total += r.comparisons;
        go(r.values.slice(0, r.p), d + 1); go(r.values.slice(r.p + 1), d + 1);
      })(values.slice(), 0);
      return { total: total, depth: depth };
    }
    var last = simulate('last'), best = simulate('median');
    G.note(el, T.pickerIntro);
    var idc = 0;
    function node(vals, d) { return { id: ++idc, vals: vals, d: d, label: vals.length ? vals.join(' ') : '∅', children: [], state: vals.length <= 1 ? 'done' : 'active', sub: vals.length <= 1 ? 'done' : 'tap me' }; }
    var rootN = node(values, 0), total = 0, depthMax = 0, current = null;
    var stats = h('p.status', { 'aria-live': 'polite' }); el.appendChild(stats);
    var tv = U.treeView(el, { label: 'Quicksort recursion tree', nodeW: Math.max(70, n * 14), onPick: select, selectable: function (x) { return x.state === 'active'; } });
    var chooser = h('div.choice-row'); el.appendChild(chooser);
    var after = h('div'); el.appendChild(after);
    function select(x) {
      current = x;
      U.clear(chooser);
      chooser.appendChild(h('span.small', null, 'Pivot for [' + x.vals.join(' ') + ']: '));
      x.vals.forEach(function (v, i) { chooser.appendChild(U.button(String(v), function () { choose(i); }, { cls: 'choice mono' })); });
      chooser.firstChild.nextSibling.focus();
    }
    function choose(i) {
      var x = current, r = E.partitionAt(x.vals, 0, x.vals.length - 1, i);
      total += r.comparisons;
      x.state = null; x.sub = 'pivot ' + x.vals[i] + ' · ' + r.comparisons + ' cmp';
      x.children = [node(r.values.slice(0, r.p), x.d + 1), node(r.values.slice(r.p + 1), x.d + 1)];
      depthMax = Math.max(depthMax, x.d + 1);
      U.clear(chooser); current = null;
      draw();
    }
    function draw() {
      tv.render(rootN);
      var open = 0; (function w(x) { if (x.state === 'active') open++; x.children.forEach(w); })(rootN);
      stats.textContent = 'Comparisons so far: ' + total + ' · depth ' + depthMax + (open ? ' · subarrays left: ' + open : '');
      if (!open) {
        var d = { mine: total, depth: depthMax, last: last.total, best: best.total };
        G.note(after, U.fmt(T.pickerDone, d));
        var stars = total <= best.total * 1.1 ? 3 : total < last.total ? 2 : 1;
        CQ.store.record('pivot-choice', stars >= 2, true);
        CQ.store.noteRound(ctx.gameId, stars === 3);
        G.continueBtn(after, 'Finish level', function () { ctx.complete({ stars: stars, summary: U.fmt(T.pickerDone, d) }); });
      }
    }
    draw();
    setTimeout(function () { tv.focus(); }, 50);
  }

  function qtrap(el, ctx) {
    var T = ctx.unit.templates, n = ctx.size, values = E.makeInput('sorted', n, ctx.seed);
    var lastC = E.countSort(E.quickLomuto(values, null, { pivot: 'last' })).counters.comparisons;
    var m3 = E.countSort(E.quickLomuto(values, null, { pivot: 'median3' })).counters.comparisons;
    var d = { n: n, last: lastC, m3: m3, quad: n * (n - 1) / 2 };
    var q = G.choiceQ({ id: 'qs-trap', concept: 'worst-case', seed: ctx.seed, prompt: U.fmt(T.trapQ, d), misconception: T.misconceptionSorted, options: [
      { text: 'Median of three', ok: true, why: U.fmt(T.trapOk, d) }, { text: 'Last element: sorted input is easy', misconception: true, why: T.trapBad }, { text: 'About the same', why: U.fmt(T.trapOk, d) }
    ] });
    G.predictThen(el, q, 'Run both ▶', function (ft) {
      var w = U.watcher(el, [{ algo: 'quickLomuto', values: values, sortOpts: { pivot: 'last' }, title: 'Last-element pivot' }, { algo: 'quickLomuto', values: values, sortOpts: { pivot: 'median3' }, title: 'Median of three' }], { unit: ctx.unit, bars: true, code: false });
      w.stepper.speed(2); w.stepper.play();
      var tl = E.countSort(E.quickLomuto(values, null, { pivot: 'last' })), tm = E.countSort(E.quickLomuto(values, null, { pivot: 'median3' }));
      el.appendChild(h('h3', null, 'Recursion trees'));
      var cols = h('div.rec-cols'); el.appendChild(cols);
      var a = h('div'), b = h('div'); cols.appendChild(a); cols.appendChild(b);
      a.appendChild(h('p.small', null, 'Last element: depth ' + tl.depth)); U.treeView(a, { label: 'Last-element recursion tree', nodeW: 52 }).render(quickTree(tl));
      b.appendChild(h('p.small', null, 'Median of three: depth ' + tm.depth)); U.treeView(b, { label: 'Median-of-three recursion tree', nodeW: 52 }).render(quickTree(tm));
      G.continueBtn(el, 'Finish level', function () { w.destroy(); ctx.complete({ stars: G.stars(0, ft), summary: 'Sorted input: ' + lastC + ' vs ' + m3 + ' comparisons.' }); }, true);
    });
  }

  function qsandbox(el, ctx) {
    var form = h('form.sandbox-form');
    var inp = h('input', { type: 'text', value: '1 2 3 4 5 6 7 8 9 10', 'aria-label': 'Array values' });
    var rule = h('select', { 'aria-label': 'Pivot rule' }, h('option', { value: 'default' }, 'lecture default (Lomuto last, Hoare first)'), h('option', { value: 'median3' }, 'median of three'), h('option', { value: 'random' }, 'random'));
    form.appendChild(h('label.wide', null, 'Array (up to 30) ', inp)); form.appendChild(h('label', null, 'Pivot ', rule));
    form.appendChild(U.button('Run both ▶', null, { cls: 'primary', attrs: { type: 'submit' } }));
    var err = h('p.error', { role: 'alert' }), out = h('div'), w = null;
    el.appendChild(form); el.appendChild(err); el.appendChild(out);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var p = E.parseNumberList(inp.value, 30);
      err.textContent = p.error || ''; if (p.error) return;
      if (w) w.destroy(); U.clear(out);
      var r = rule.value === 'default' ? null : rule.value;
      w = U.watcher(out, [{ algo: 'quickLomuto', values: p.values, sortOpts: { pivot: r || 'last', seed: 7 } }, { algo: 'quickHoare', values: p.values, sortOpts: { pivot: r || 'first', seed: 7 } }], { unit: ctx.unit, bars: true });
      G.continueBtn(out, 'Done practising', function () { ctx.complete({ stars: 1, summary: 'Practice logged.' }); }, true);
    });
  }

  /* Briefing steps and Boss tasks. */
  G.briefingKinds = G.briefingKinds || {};
  G.briefingKinds.mergeDemo = function (area, s, unit, after) {
    var steps = E.collect(E.mergeLists([1, 4, 9], [2, 3, 10])), draw = belts(area), narr = h('p.narration', { 'aria-live': 'polite' });
    area.appendChild(narr);
    var ctrl = h('div'); area.insertBefore(ctrl, area.lastChild.previousSibling);
    var done = false;
    U.stepper(ctrl, { count: steps.length, onShow: function (k) {
      var st = steps[k]; draw(st, true);
      narr.textContent = st.at === 'decide' ? 'Compare ' + st.x + ' and ' + st.y + ': take ' + (st.take === 'a' ? st.x : st.y) + '.' : st.at === 'rest' ? 'One belt is empty: copy the rest.' : st.at === 'done' ? 'Merged with ' + st.comparisons + ' comparisons.' : '';
      if (k === steps.length - 1 && !done) { done = true; after(); }
    } });
  };
  G.briefingKinds.splitDemo = function (area, s, unit, after) {
    var mt = mergeTreeFrames([38, 27, 43, 3, 9, 82, 10, 5]), tv = U.treeView(area, { label: 'Merge sort tree', nodeW: 72 });
    var narr = h('p.narration', { 'aria-live': 'polite' }); area.appendChild(narr);
    var ctrl = h('div'); area.insertBefore(ctrl, tv.el);
    var done = false;
    var st = U.stepper(ctrl, { count: mt.frames.length, onShow: function (k) { renderMergeTree(tv, mt, mt.frames[k]); narr.textContent = mt.frames[k].msg; if (k === mt.frames.length - 1 && !done) { done = true; after(); } } });
    st.speed(1); st.play();
  };
  G.briefingKinds.partitionDemo = function (area, s, unit, after) {
    var vals = [2, 8, 1, 0, 5, 6, 3, 9, 7, 4];
    var full = E.collect(E.quickLomuto(vals)), cut = 0;
    for (var i = 0; i < full.length; i++) if (full[i].at === 'place') { cut = i; break; }
    var frames = full.slice(0, cut + 1);
    var view = U.arrayView(area, { label: 'One Lomuto partition' }), narr = h('p.narration', { 'aria-live': 'polite' });
    area.appendChild(narr);
    var ctrl = h('div'); area.insertBefore(ctrl, view.el);
    var done = false;
    var st = U.stepper(ctrl, { count: frames.length, onShow: function (k) { view.render(frames[k]); narr.textContent = frames[k].msg; if (k === frames.length - 1 && !done) { done = true; after(); } } });
    st.play();
  };
  G.briefingKinds.treeDemo = function (area, s, unit, after) {
    var cols = h('div.rec-cols'); area.appendChild(cols);
    [['Random input', E.makeInput('random', 10, 3)], ['Sorted input', E.makeInput('sorted', 10, 3)]].forEach(function (p) {
      var box = h('div'); cols.appendChild(box);
      var d = E.countSort(E.quickLomuto(p[1]));
      box.appendChild(h('p.small', null, p[0] + ': ' + d.counters.comparisons + ' comparisons, depth ' + d.depth));
      U.treeView(box, { label: p[0] + ' recursion tree', nodeW: 52 }).render(quickTree(d));
    });
    G.continueBtn(area, 'I see it', after, true);
  };
  G.tasks = G.tasks || {};
  G.tasks.conveyor = function (container, q, unit, done) { G.conveyorTask(container, { unit: unit, a: q.a, b: q.b, hints: false, onDone: done }); };
  G.tasks.dance = function (container, q, unit, done) {
    U.runner(container, { algo: q.algo, values: q.values, unit: unit, gameId: 'boss', hints: false, maxDecisions: q.decisions, onDone: function (r) { done({ misses: r.misses, summary: 'Partition done.' }); } });
  };

  G.conveyor = { mount: conveyor };
  G.splittree = { mount: function (el, ctx) { (ctx.level.kind === 'tree' ? splitTree : inputs)(el, ctx); } };
  G.threshold = { mount: threshold };
  G.dance = { mount: dance };
  G.picker = { mount: picker };
  G.qtrap = { mount: function (el, ctx) { (ctx.level.kind === 'trap' ? qtrap : qsandbox)(el, ctx); } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
