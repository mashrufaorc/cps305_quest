/* CPS305 Quest — tests/run-tests.js
 * Plain Node test script, no framework:   node tests/run-tests.js
 * Loads the engine (and the state layer) into a vm sandbox exactly as the
 * browser loads them, then checks correctness and that counters match theory.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
function makeCtx() {
  var ctx = { console: console, Math: Math, Date: Date };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  ['engine/core.js', 'engine/search.js', 'engine/sorts.js', 'engine/referee.js', 'state/store.js',
   'content/units.js', 'content/unit5.js'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  });
  return ctx;
}
var ctx = makeCtx();
var E = ctx.CQ.engine;

var passed = 0, failed = 0, group = '';
function section(name) { group = name; console.log('\n# ' + name); }
function ok(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.log('  FAIL: ' + msg); }
}
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), msg + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }
function last(trace) { return trace[trace.length - 1]; }
function finalValues(trace) { return E.values(last(trace).arr); }

var SORTS = Object.keys(E.sorts);
var inputs = {
  random: E.makeInput('random', 12, 3),
  sorted: E.makeInput('sorted', 12, 3),
  reversed: E.makeInput('reversed', 12, 3),
  nearly: E.makeInput('nearly', 12, 3),
  dupes: E.makeInput('dupes', 12, 3),
  empty: [],
  single: [42],
  two: [2, 1],
  allEqual: [5, 5, 5, 5]
};

section('Every sort produces sorted output on every input shape');
SORTS.forEach(function (id) {
  Object.keys(inputs).forEach(function (kind) {
    var input = inputs[kind];
    var out = finalValues(E.runSort(id, input));
    var expect = input.slice().sort(function (a, b) { return a - b; });
    eq(out, expect, id + ' on ' + kind);
  });
  // descending via COMP, like (selection-sort b #'>)
  var desc = finalValues(E.runSort(id, [3, 1, 0, 7, 8, 2], function (a, b) { return a.v > b.v; }));
  eq(desc, [8, 7, 3, 2, 1, 0], id + ' with #\'> comp (lecture example)');
});
// many random seeds and sizes
for (var seed = 1; seed <= 40; seed++) {
  SORTS.forEach(function (id) {
    var n = seed % 17;
    var input = E.makeInput(seed % 2 ? 'random' : 'dupes', n, seed);
    ok(E.isSorted(finalValues(E.runSort(id, input))), id + ' random seed ' + seed + ' n=' + n);
  });
}
console.log('  sorts on 9 shapes + 40 random seeds: done');

section('Stability');
var deck = [{ id: 0, v: 5, tag: 'a' }, { id: 1, v: 3 }, { id: 2, v: 5, tag: 'b' }, { id: 3, v: 1 }, { id: 4, v: 3, tag: 'b' }];
['insertion', 'insertionShift', 'binaryInsertion', 'bubble'].forEach(function (id) {
  for (var s = 1; s <= 30; s++) {
    var inp = E.toItems(E.makeInput('dupes', 10, s));
    ok(E.isStableResult(inp, last(E.runSort(id, inp)).arr), id + ' stable on dupes seed ' + s);
  }
  ok(E.isStableResult(E.toItems(deck), last(E.runSort(id, deck)).arr), id + ' stable on tagged deck');
});
// Selection sort is unstable: the swap can jump 5a past 5b.
var unstableCase = [{ id: 0, v: 5, tag: 'a' }, { id: 1, v: 5, tag: 'b' }, { id: 2, v: 2 }];
var selOut = last(E.runSort('selection', unstableCase)).arr;
eq(selOut.map(function (it) { return it.v + (it.tag || ''); }), ['2', '5b', '5a'], 'selection sort reorders equal keys (5a 5b 2)');
ok(!E.isStableResult(E.toItems(unstableCase), selOut), 'selection sort reported unstable');
eq(E.sorts.selection.stable, false, 'registry: selection not stable');
// Claims made in content text:
var deck3 = [{ id: 0, v: 1 }, { id: 1, v: 5, tag: 'a' }, { id: 2, v: 5, tag: 'b' }];
ok(E.isStableResult(deck3, last(E.runSort('selection', deck3)).arr), 'content claim: selection keeps 1 5a 5b in order');
var stableDeck = [{ id: 0, v: 5, tag: 'a' }, { id: 1, v: 3 }, { id: 2, v: 5, tag: 'b' }, { id: 3, v: 1 }];
eq(last(E.runSort('selection', stableDeck)).arr.map(function (it) { return it.v + (it.tag || ''); }), ['1', '3', '5b', '5a'], 'content claim: Stable-or-Not deck breaks under selection');
var cls = ['Ada', 'Bo', 'Cy', 'Di', 'Eve', 'Fay'].map(function (nm, i) { return { id: i, v: [2, 2, 1, 3, 1, 1][i], tag: nm }; });
eq(last(E.runSort('selection', cls)).arr.map(function (it) { return it.tag; }), ['Cy', 'Eve', 'Fay', 'Bo', 'Ada', 'Di'], 'content claim: multikey selection puts Bo before Ada');
eq(last(E.runSort('insertion', cls)).arr.map(function (it) { return it.tag; }), ['Cy', 'Eve', 'Fay', 'Ada', 'Bo', 'Di'], 'content claim: multikey insertion keeps names in order');
eq([last(E.runSort('selection', E.makeInput('sorted', 10, 4))).counters.comparisons, last(E.runSort('insertion', E.makeInput('sorted', 10, 4))).counters.comparisons], [45, 9], 'briefing claim: 45 vs 9 on sorted 10');

section('Counters match the lecture\'s complexity claims');
[0, 1, 2, 5, 10, 17, 30].forEach(function (n) {
  ['random', 'sorted', 'reversed', 'nearly'].forEach(function (kind) {
    var input = E.makeInput(kind, n, n + 1);
    var sel = last(E.runSort('selection', input)).counters;
    eq(sel.comparisons, n * (n - 1) / 2, 'selection n=' + n + ' ' + kind + ' makes n(n-1)/2 comparisons');
    ok(sel.swaps <= Math.max(0, n - 1), 'selection n=' + n + ' at most n-1 swaps');
    var ins = last(E.runSort('insertion', input)).counters;
    eq(ins.swaps, E.countInversions(input), 'insertion n=' + n + ' ' + kind + ' swaps = inversions');
    var bub = last(E.runSort('bubble', input)).counters;
    eq(bub.comparisons, n * (n - 1) / 2, 'bubble n=' + n + ' ' + kind + ' comparisons n(n-1)/2');
    eq(bub.swaps, E.countInversions(input), 'bubble n=' + n + ' swaps = inversions');
    var sh = last(E.runSort('insertionShift', input)).counters;
    eq(sh.shifts, E.countInversions(input), 'insertion-shift n=' + n + ' shifts = inversions');
    eq(sh.comparisons, ins.comparisons, 'insertion-shift same comparisons as swap version n=' + n);
  });
  var sortedIn = E.makeInput('sorted', n, 1);
  eq(last(E.runSort('insertion', sortedIn)).counters.comparisons, Math.max(0, n - 1), 'insertion on sorted n=' + n + ' makes n-1 comparisons');
  var rev = E.makeInput('reversed', n, 1);
  eq(last(E.runSort('insertion', rev)).counters.comparisons, n * (n - 1) / 2, 'insertion on reversed n=' + n + ' makes n(n-1)/2');
  eq(E.countInversions(rev), n * (n - 1) / 2, 'reversed array has n(n-1)/2 inversions n=' + n);
});
// Binary insertion: fewer comparisons than plain insertion on reversed input, same shifts.
var rev30 = E.makeInput('reversed', 30, 2);
var bi = last(E.runSort('binaryInsertion', rev30)).counters;
var pi = last(E.runSort('insertionShift', rev30)).counters;
ok(bi.comparisons < pi.comparisons, 'binary insertion fewer comparisons on reversed (' + bi.comparisons + ' < ' + pi.comparisons + ')');
eq(bi.shifts, pi.shifts, 'binary insertion still shifts n(n-1)/2 on reversed');
var bound = 0; for (var i = 1; i < 30; i++) bound += Math.floor(Math.log2(i)) + 1;
ok(bi.comparisons <= bound, 'binary insertion comparisons <= sum(floor(log2 i)+1) = ' + bound);

section('Searches');
var lec = [1, 3, 5, 8, 6, 3, 6, 4, 9, 0];
[[5, 2], [55, null], [0, 9], [3, 1], [4, 7]].forEach(function (c) {
  eq(last(E.collect(E.linearSearch(lec, c[0]))).found, c[1], 'lin-search ' + c[0] + ' (lecture table)');
});
var sortedArr = [1, 2, 4, 5, 7, 9, 10, 12, 18];
[[4, 2], [18, 8], [1, 0], [9, 5], [10, 6], [5, 3], [11, null], [6, null]].forEach(function (c) {
  eq(last(E.collect(E.binarySearch(sortedArr, c[0]))).found, c[1], 'bin-search ' + c[0] + ' (lecture table)');
});
eq(last(E.collect(E.binarySearch([], 3))).found, null, 'bin-search empty array');
eq(last(E.collect(E.binarySearch([9, 3, 7, 1, 5], 1))).found, null, 'bin-search on unsorted data misses a present key');
eq(last(E.collect(E.binarySearch([2, 5, 8, 12, 16, 23, 38], 23))).counters.probes, 2, 'bin-search t4 checks 2 elements');
[1, 2, 7, 8, 15, 16, 31, 100, 1000].forEach(function (n) {
  var arr = []; for (var k = 0; k < n; k++) arr.push(k * 2);
  var worst = 0;
  for (var key = -1; key <= n * 2; key++) {
    var p = last(E.collect(E.binarySearch(arr, key))).counters.probes;
    if (p > worst) worst = p;
  }
  eq(worst, E.binaryWorstProbes(n), 'bin-search worst-case probes n=' + n + ' = floor(log2 n)+1');
  eq(last(E.collect(E.linearSearch(arr, -5))).counters.probes, n, 'lin-search worst case n=' + n + ' checks all n');
});
eq(last(E.collect(E.linearSearch([7, 1, 2], 7))).counters.probes, 1, 'lin-search best case is 1 comparison');

section('Referee: decisions come from the algorithm, wrong moves are explained');
function playAll(algo, values, key) {
  var trace = algo === 'binary' ? E.collect(E.binarySearch(values, key)) : algo === 'linear' ? E.collect(E.linearSearch(values, key)) : E.runSort(algo, values);
  var ds = E.referee.decisions(algo, trace);
  ds.forEach(function (d, k) {
    ok(d.check(d.expected).ok, algo + ' decision ' + k + ' accepts the expected move');
    ok(d.showAt <= d.resumeTo, algo + ' decision ' + k + ' ordering');
  });
  return { trace: trace, ds: ds };
}
var r = playAll('selection', [4, 2, 9, 1, 7]);
eq(r.ds.length, 4, 'selection on 5 has n-1 decisions');
eq(r.ds[0].expected, 3, 'selection pass 0 picks index of 1');
eq(r.ds[0].check(1).code, 'select.firstSmaller', 'tapping 2 (first smaller) names that misconception');
eq(r.ds[0].check(2).code, 'select.notMin', 'tapping 9 is not the minimum');
eq(r.ds[1].check(0).code, 'select.sortedRegion', 'tapping the sorted region is explained');
var r2 = playAll('insertion', [5, 2, 8, 3, 9, 1]);
eq(r2.ds.map(function (d) { return d.expected; }), [0, 2, 1, 4, 0], 'insertion landing spots for 5 2 8 3 9 1');
eq(r2.ds[2].check(2).code, 'insert.stoppedEarly', 'insertion: stopping early explained');
eq(r2.ds[2].check(0).code, 'insert.tooFar', 'insertion: going too far explained');
eq(r2.ds[2].check(5).code, 'insert.outside', 'insertion: unsorted region explained');
var r3 = playAll('insertion', [3, 5, 5]);
eq(r3.ds[1].check(1).code, 'insert.pastEqual', 'insertion: passing an equal element names stability');
playAll('insertionShift', [5, 2, 8, 3, 9, 1]);
playAll('binaryInsertion', [5, 2, 8, 3, 9, 1]);
var r4 = playAll('bubble', [3, 1, 2]);
eq(r4.ds.map(function (d) { return d.expected; }), ['swap', 'swap', 'keep'], 'bubble decisions for 3 1 2');
eq(playAll('bubble', [2, 2]).ds[0].check('swap').code, 'bubble.equal', 'bubble: swapping equals explained');
var r5 = playAll('binary', [1, 2, 4, 5, 7, 9, 10, 12, 18], 12);
eq(r5.ds.map(function (d) { return d.expected; }), [4, 6, 7], 'binary probes for key 12');
eq(r5.ds[1].check(1).code, 'bsearch.discarded', 'binary: probing a discarded element explained');
eq(r5.ds[1].check(5).code, 'bsearch.notMiddle', 'binary: probing off-middle explained');
var r6 = playAll('linear', [4, 7, 1], 1);
eq(r6.ds.length, 3, 'linear decisions = probes');
eq(r6.ds[1].check(2).code, 'lsearch.skip', 'linear: skipping ahead explained');
eq(E.referee.checkInversion([3, 1, 2], 0, 1).ok, true, 'inversion (3,1)');
eq(E.referee.checkInversion([3, 1, 2], 1, 2).code, 'inv.inOrder', 'non-inversion (1,2)');
eq(E.referee.checkInversion([2, 2], 0, 1).code, 'inv.equal', 'equal pair is not an inversion');
var u5 = ctx.CQ.content.unitData[5];
['select.firstSmaller', 'select.notMin', 'select.sortedRegion', 'select.equalLater', 'insert.stoppedEarly', 'insert.tooFar', 'insert.outside', 'insert.pastEqual',
 'bubble.shouldSwap', 'bubble.shouldKeep', 'bubble.equal', 'bsearch.discarded', 'bsearch.notMiddle', 'lsearch.skip', 'lsearch.again', 'inv.inOrder', 'inv.equal', 'inv.same'
].forEach(function (code) { ok(!!u5.explain[code], 'content explains referee code ' + code); });

section('Content integrity');
var qs = u5.trace.concat(u5.boss, [u5.briefing.steps[3].question]);
qs.forEach(function (q) {
  ok(!!u5.concepts[q.concept], q.id + ' has a known concept');
  if (q.choices) {
    ok(q.answer >= 0 && q.answer < q.choices.length, q.id + ' answer index in range');
    q.choices.forEach(function (c, i) { if (i !== q.answer) ok(!!(q.explain.wrong[i] || q.explain.wrong.any), q.id + ' explains wrong choice ' + i); });
  }
  if (q.type === 'bug') q.answer.forEach(function (ln) { ok(ln >= 1 && ln <= q.code.split('\n').length, q.id + ' bug line in range'); });
});
Object.keys(u5.lisp).forEach(function (k) {
  var L = u5.lisp[k], lines = L.code.split('\n').length;
  Object.keys(L.anchors).forEach(function (a) { ok(L.anchors[a] >= 1 && L.anchors[a] <= lines, k + ' anchor ' + a + ' in range'); });
});
// every engine anchor used by a sort has a line in its Lisp panel
SORTS.forEach(function (id) {
  E.runSort(id, [3, 1, 2, 2]).forEach(function (s) { ok(u5.lisp[id].anchors[s.at] != null, id + ' anchor "' + s.at + '" mapped'); });
});

section('State: storage blocked, mastery, adaptive tiers');
var ctx2 = makeCtx();
ctx2.CQ.store._setBackend({ getItem: function () { throw new Error('blocked'); }, setItem: function () { throw new Error('blocked'); } });
var S = ctx2.CQ.store;
S.addXp(5);
eq(S.get().xp, 5, 'store works in memory when localStorage throws');
eq(S.storageOk(), false, 'store reports storage blocked');
S.record('binary-search', false, true);
eq(S.dueForReview().indexOf('binary-search') >= 0, true, 'a miss puts the concept in Leitner review');
S.record('binary-search', true, true);
ok(S.confidence('binary-search') > 0 && S.confidence('binary-search') < 1, 'confidence between 0 and 1');
S.setTier('g', 2);
S.noteMiss('g', 'c'); var m = S.noteMiss('g', 'c');
eq([m.workedExample, S.adapt('g').tier], [true, 1], 'two misses on one concept: worked example, drop a tier');
S.noteRound('g', true); S.noteRound('g', true); var up = S.noteRound('g', true);
eq([up, S.adapt('g').tier], [true, 2], 'three flawless rounds: move up a tier');
var mem = {};
var ctx3 = makeCtx();
ctx3.CQ.store._setBackend({ getItem: function (k) { return mem[k] || null; }, setItem: function (k, v) { mem[k] = v; } });
ctx3.CQ.store.completeLevel('5/library/race', 2, 10);
var ctx4 = makeCtx();
ctx4.CQ.store._setBackend({ getItem: function (k) { return mem[k] || null; }, setItem: function (k, v) { mem[k] = v; } });
eq(ctx4.CQ.store.level('5/library/race').stars, 2, 'progress persists across reloads');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
