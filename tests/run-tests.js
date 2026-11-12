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
  var files = ['engine/core.js', 'engine/search.js', 'engine/sorts.js', 'engine/referee.js', 'engine/bigo.js', 'engine/lisp.js',
   'engine/hashing.js', 'engine/sorts2.js', 'engine/lists.js', 'engine/stacks.js', 'engine/trees.js', 'engine/choose.js', 'state/store.js', 'content/units.js'];
  fs.readdirSync(path.join(ROOT, 'content')).filter(function (f) { return /^unit\d+\.js$/.test(f); }).forEach(function (f) { files.push('content/' + f); });
  files.forEach(function (f) {
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

var SORTS = ['selection', 'insertion', 'insertionShift', 'binaryInsertion', 'bubble'];   // Unit 5's sorts (Units 6/7 tested below)
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


section('Unit 2: Big-O engine');
var Bo = E.bigo;
eq(Bo.classes.map(function (c) { return c.id; }), ['1', 'logn', 'n', 'nlogn', 'n2', 'n3', '2n', 'nfact'], 'classes in growth order');
var lec = [{ c: 2, k: 'n2', coefShown: true }, { c: 4, k: 'n', coefShown: true }, { c: 9, k: '1', coefShown: true }];
eq(Bo.evalTerms(lec, 10), 249, '2n²+4n+9 at n=10');
eq(Bo.dominant(lec).k, 'n2', 'dominant term of 2n²+4n+9');
ok(Bo.shares(lec, 1e6)[0] > 0.9999, 'dominant share -> 1 as n grows');
ok(Bo.shares(lec, 1)[2] > 0.5, 'constant dominates at n = 1');
var ng = [{ c: 1, k: 'n2' }], g3 = [{ c: 1, k: 'n2' }, { c: 3, k: 'n' }, { c: 2, k: '1' }];
ok(Math.abs(Bo.evalTerms(g3, 1000) - Bo.evalTerms(ng, 1000)) / Bo.evalTerms(ng, 1000) < 0.004, 'lecture: n² vs n²+3n+2 within 0.3% at n=1000');
eq(Bo.checkSimplify(lec, { type: 'term', i: 0 }).code, 'simp.dropDominant', 'dropping the dominant term is refused');
eq(Bo.checkSimplify(lec, { type: 'term', i: 2 }).ok, true, 'dropping 9 is fine');
eq(Bo.checkSimplify(lec, { type: 'coef', i: 2 }).code, 'simp.constCoef', 'constant has no coefficient to drop');
eq(Bo.checkSimplify(lec, { type: 'coef', i: 0 }).ok, true, 'dropping 2 from 2n² is fine');
eq(Bo.simplifyDone(lec), false, 'not done with three terms');
eq(Bo.simplifyDone([{ c: 2, k: 'n2', coefShown: false }]), true, 'done: n²');
eq(Bo.simplifyDone([{ c: 2, k: 'n2', coefShown: true }]), false, 'not done: coefficient left');
[1, 2, 3].forEach(function (tier) {
  for (var sd = 1; sd <= 30; sd++) {
    var ts = Bo.randomTerms(tier, sd), ks = ts.map(function (t) { return t.k; });
    ok(new Set(ks).size === ks.length, 'randomTerms tier ' + tier + ' distinct classes');
    ok(Bo.dominant(ts).c >= 2, 'randomTerms tier ' + tier + ' dominant has a coefficient to drop');
  }
});
var f = function (terms) { return function (n) { return Bo.evalTerms(terms, n); }; };
eq(Bo.crossover(f([{ c: 1, k: 'n2' }]), f([{ c: 10, k: 'n' }]), 1, 5000), 11, 'n² overtakes 10n at 11');
eq(Bo.crossover(f([{ c: 1, k: '2n' }]), f([{ c: 1, k: 'n3' }]), 1, 5000), 10, '2ⁿ overtakes n³ for good at 10');
eq(Bo.crossover(function (n) { return n - 1; }, function () { return 3; }, 1, 1000), 5, 'loop (n−1) costs more than formula (3) from n = 5');
eq(Bo.crossover(f([{ c: 2, k: 'n2' }]), f([{ c: 500, k: 'n' }]), 1, 5000), 251, '2n² overtakes 500n at 251');
Object.keys(ctx.CQ.content.unitData[2].races).forEach(function (t) {
  ctx.CQ.content.unitData[2].races[t].forEach(function (r) {
    var c = Bo.crossover(f(r.b), f(r.a), 1, 5000);
    ok(c != null && c > 1, 'race ' + r.aName + ' vs ' + r.bName + ' has a crossover (' + c + ')');
  });
});

section('Unit 2: step-counting interpreter');
var u2 = ctx.CQ.content.unitData[2];
var byId = {}; u2.snippets.forEach(function (sn) { byId[sn.id] = sn; });
for (var nn = 0; nn <= 20; nn++) eq(Bo.steps(byId['s-lecture'].code, 'work', nn), 3 * nn * nn + 2 * nn + 1, 'lecture snippet = 3n²+2n+1 at n=' + nn);
[1, 2, 3, 4, 5, 8, 9, 100, 1024].forEach(function (n2) {
  eq(Bo.steps(byId['s-doubling'].code, 'work', n2), 1 + Math.ceil(Math.log2(n2)), 'doubling loop: 1 + ceil(log2 n) at n=' + n2);
});
var expectClass = { 's-linear': 'n', 's-nested': 'n2', 's-const': '1', 's-sequential': 'n', 's-lin-sum': 'n', 's-lecture': 'n2', 's-doubling': 'logn',
  's-bound10': '1', 's-half': 'n', 's-triangle': 'n2', 's-nlogn': 'nlogn', 's-hidden': 'n2', 's-cubic': 'n3', 's-const-outer': 'logn' };
u2.snippets.forEach(function (sn) {
  eq(Bo.classify(sn.code, 'work'), expectClass[sn.id], 'classify ' + sn.id);
  Object.keys(sn.traps || {}).forEach(function (k) { ok(k !== expectClass[sn.id] && !!Bo.cls[k], sn.id + ' trap ' + k + ' is a wrong class'); });
});
// Big-O questions whose code is a DEFUN: the interpreter must agree with the stated answer.
u2.trace.concat(u2.boss).forEach(function (q) {
  if (q.type !== 'bigo' || !q.code || q.code.indexOf('(defun') < 0) return;
  var names = q.code.match(/\(defun ([\w-]+)/g).map(function (m) { return m.slice(7); });
  var label = Bo.cls[Bo.classify(q.code, names[names.length - 1])].label;
  eq(label, q.choices[q.answer], q.id + ' answer matches the interpreter');
});
eq(Bo.lineSteps(byId['s-nested'].code, 'work', 3).lines, { 4: 3, 6: 9 }, 'per-line tally for nested loops at n=3');
var threw = false; try { Bo.read('(defun x (n)'); } catch (e) { threw = true; }
ok(threw, 'reader rejects unbalanced parentheses');

section('Content integrity');
Object.keys(ctx.CQ.content.unitData).map(function (k) { return ctx.CQ.content.unitData[k]; }).forEach(function (U5) {
var qs = U5.trace.concat(U5.boss, U5.briefing.steps.filter(function (st) { return st.question; }).map(function (st) { return st.question; }));
qs.forEach(function (q) {
  ok(!!U5.concepts[q.concept], q.id + ' has a known concept');
  if (q.choices) {
    ok(q.answer >= 0 && q.answer < q.choices.length, q.id + ' answer index in range');
    q.choices.forEach(function (c, i) { if (i !== q.answer) ok(!!(q.explain.wrong[i] || q.explain.wrong.any), q.id + ' explains wrong choice ' + i); });
  }
  if (q.type === 'bug') q.answer.forEach(function (ln) { ok(ln >= 1 && ln <= q.code.split('\n').length, q.id + ' bug line in range'); });
});
Object.keys(U5.cards).forEach(function (k) { ok(U5.cards[k].unit === U5.id, k + ' card belongs to unit ' + U5.id); });
});
Object.keys(u5.lisp).forEach(function (k) {
  var L = u5.lisp[k], lines = L.code.split('\n').length;
  Object.keys(L.anchors).forEach(function (a) { ok(L.anchors[a] >= 1 && L.anchors[a] <= lines, k + ' anchor ' + a + ' in range'); });
});
// every engine anchor used by a sort has a line in its Lisp panel
SORTS.forEach(function (id) {
  E.runSort(id, [3, 1, 2, 2]).forEach(function (s) { ok(u5.lisp[id].anchors[s.at] != null, id + ' anchor "' + s.at + '" mapped'); });
});

section('Lisp interpreter (engine/lisp.js)');
var Lp = E.lisp;
[['(+ 2 (* 3 4))', '14'], ["'(a b . c)", '(A B . C)'], ['(/ 7 2)', '7/2'], ['(or nil 0)', '0'], ['(and 1 2 3)', '3'], ["(if '() 1 2)", '2'],
 ["(cons 'sink '(or swim))", '(SINK OR SWIM)'], ['(make-array 3)', '#(0 0 0)'], ['(do ((i 0 (1+ i)) (j 0 i)) ((= i 3) j))', '2'], ['(do* ((i 0 (1+ i)) (j 0 i)) ((= i 3) j))', '3'],
 ["(case 3 (1 'a) ((2 3) 'b) (otherwise 'c))", 'B'], ['(let ((s nil)) (push 1 s) (push 2 s) (list (pop s) s))', '(2 (1))'], ['(2 + 3)', 'ERROR: Illegal function call (2 + 3)'],
 ['(defun f (n) (if (< n 2) 1 (* n (f (- n 1))))) (f 10)', '3628800'], ['(defun g (n) (g n)) (g 1)', 'ERROR: Control stack exhausted (no more space for function call frames).'],
 ['(defstruct (tn (:conc-name nil)) key (lc nil)) (key (make-tn :key 4))', '4'], ['(loop for (k v) in \'((a 1) (b 2)) do (print k))', 'NIL'],
 ["(let ((h (make-hash-table :test 'equal))) (setf (gethash \"a\" h) 1) (multiple-value-list (gethash \"a\" h)))", '(1 T)'],
 ["(let ((h (make-hash-table))) (setf (gethash \"a\" h) 1) (gethash \"a\" h))", 'NIL'], ["(eval '(* (+ 7 3) (- 5 2)))", '30']
].forEach(function (c) { eq(Lp.run(c[0]), c[1], 'lisp: ' + c[0]); });
eq(Lp.isTailRecursive('(defun f (n &optional (a 1)) (if (< n 2) a (f (- n 1) (* n a))))', 'f'), true, 'tail: accumulator factorial');
eq(Lp.isTailRecursive('(defun f (n) (if (< n 2) 1 (* n (f (- n 1)))))', 'f'), false, 'tail: naive factorial');
eq(Lp.isTailRecursive('(defun f (x) (if (null x) 0 (+ (* (first x) (first x)) (f (rest x)))))', 'f'), false, 'tail: last line but inside +');
var u4 = ctx.CQ.content.unitData[4];
var tr4 = Lp.trace(Object.keys(u4.defs).map(function (k) { return u4.defs[k]; }).join('\n'), '(fib-rec 6)');
eq(tr4.events.filter(function (e) { return e.type === 'call'; }).length, 15, 'trace: (fib-rec 6) makes 15 calls');
eq(tr4.result, '8', 'trace: (fib-rec 6) = 8');
eq(Lp.trace(u4.broken.code, u4.broken.call, { maxDepth: 40 }).error, 'Control stack exhausted (no more space for function call frames).', 'trace: no base case overflows');

section('Hashing (engine/hashing.js)');
var Hh = E.hashing;
eq([0, 1, 2, 3].map(function (i) { return Hh.probe('linear', 13, i, 10); }), [3, 4, 5, 6], 'linear probe sequence');
eq([0, 1, 2].map(function (i) { return Hh.probe('quadratic', 13, i, 10); }), [3, 5, 9], 'quadratic (H1 + i + i²) mod M');
eq(Hh.probe('double', 25, 1, 11, 7), 6, 'double hashing H2 = PRIME − (k mod PRIME)');
for (var hs = 1; hs <= 20; hs++) {
  ['linear', 'quadratic', 'double'].forEach(function (stg) {
    var keys = Hh.keySets.random(7, hs, 60), b = Hh.build(keys, 11, stg);
    ok(keys.every(function (k) { return Hh.search(b.table, k).found; }), stg + ' seed ' + hs + ': every inserted key is found');
    var victim = keys[3], lazy = Hh.remove(b.table, victim, true).table;
    ok(keys.filter(function (k) { return k !== victim; }).every(function (k) { return Hh.search(lazy, k).found; }), stg + ' seed ' + hs + ': lazy delete keeps every other key reachable');
    ok(!Hh.search(lazy, victim).found, stg + ' seed ' + hs + ': deleted key is gone');
  });
}
var nt = Hh.remove(Hh.build([10, 17, 24], 7, 'linear').table, 17, false).table;
eq(Hh.search(nt, 24).found, false, 'naive delete makes 24 vanish (Tombstone Trap)');
eq(Hh.search(Hh.remove(Hh.build([10, 17, 24], 7, 'linear').table, 17, true).table, 24).found, true, 'lazy delete keeps 24');
eq(Hh.insert(Hh.remove(Hh.build([10, 17, 24], 7, 'linear').table, 17, true).table, 31).index, 4, 'insert reuses the tombstone');
eq(Math.round(Hh.birthday(23) * 1000) / 10, 50.7, 'birthday paradox: 23 people ≈ 50.7%');
eq(Hh.distribution(Hh.keySets.multiples7(6), 7, 'mod').max, 6, 'multiples of 7 mod 7 all collide');
var codes10 = ctx.CQ.content.unitData[10].codes;
var full4 = Hh.htCreate([['A', 1], ['B', 2], ['C', 3], ['D', 4]], 4, codes10);
eq(full4.slots.map(function (x) { return x && x.k; }), ['D', 'A', 'C', 'B'], 'HT-CREATE size 4 matches the lecture');
eq(Hh.htAdd(full4, 'E', 5, codes10).slots.map(function (x) { return x && x.k; }), [null, 'A', 'D', 'E', null, null, 'C', 'B'], 'HT-ADD grows to 8 like the lecture');
// The lecture's HT code, run in our interpreter with the lab codes, agrees with the JS mirror.
var u10 = ctx.CQ.content.unitData[10];
eq(new Lp.Interp({ sxhash: codes10 }).repl(u10.source + "(defvar *ht* (ht-create '((a 1) (b 2) (c 3) (d 4)) 4)) (ht-add 'e 5 *ht*) (ht-array *ht*)"), '#(NIL (A . 1) (D . 4) (E . 5) NIL NIL (C . 3) (B . 2))', 'lecture HT-ADD in the interpreter');
['probe', 'four'].forEach(function (tn) {
  var tb = u10.tables[tn], st = Hh.htCreate(tb.kvs, tb.size, codes10);
  tb.lookups.forEach(function (key) {
    var js = Hh.htGetTrace(st.slots, key, codes10[key]);
    var lispOut = new Lp.Interp({ sxhash: codes10 }).repl(u10.source + '(defvar *ht* (ht-create \'(' + tb.kvs.map(function (kv) { return '(' + kv[0] + ' ' + kv[1] + ')'; }).join(' ') + ') ' + tb.size + ')) (multiple-value-list (ht-get \'' + key + ' *ht*))');
    eq(lispOut, js.index == null ? '(NIL NIL)' : '(' + (js.value === null ? 'NIL' : js.value) + ' ' + js.index + ')', 'HT-GET ' + key + ' on table ' + tn + ': JS mirror = lecture code');
  });
});

section('Quicksort and merge sort (engine/sorts2.js)');
['quickLomuto', 'quickHoare', 'merge'].forEach(function (id) {
  Object.keys(inputs).forEach(function (kind) {
    var input = inputs[kind];
    eq(finalValues(E.runSort(id, input)), input.slice().sort(function (a, b) { return a - b; }), id + ' on ' + kind);
  });
  ['median3', 'random', 'first', 'last'].forEach(function (pv) {
    if (id === 'merge') return;
    for (var sd = 1; sd <= 10; sd++) { var v = E.makeInput(sd % 2 ? 'random' : 'dupes', 17, sd); ok(E.isSorted(E.values(E.countSort(E.sorts[id].gen(v, null, { pivot: pv, seed: sd })).arr)), id + ' ' + pv + ' seed ' + sd); }
  });
  var tr = E.runSort(id, [6, 2, 9, 1, 7, 4, 4, 8]);
  E.referee.decisions(id, tr).forEach(function (d, k) { ok(d.check(d.expected).ok, id + ' decision ' + k + ' accepts its expected move'); });
});
eq(finalValues(E.runSort('quickLomuto', [2, 4, 6, 5, 8, 9, 0, 1, 3, 5])), [0, 1, 2, 3, 4, 5, 5, 6, 8, 9], 'lecture quicksort example');
[5, 10, 20, 30].forEach(function (n) {
  var srt = E.makeInput('sorted', n, 1);
  eq(E.countSort(E.quickLomuto(srt)).counters.comparisons, n * (n - 1) / 2, 'Lomuto on sorted n=' + n + ' is n(n−1)/2 (worst case)');
  ok(E.countSort(E.quickLomuto(srt, null, { pivot: 'median3' })).depth < n - 1, 'median-of-3 avoids the n-deep tree, n=' + n);
});
var lom = E.collect(E.quickLomuto([2, 8, 1, 0, 5, 6, 3, 9, 7, 4]));
var place = lom.filter(function (s) { return s.at === 'place'; })[0];
eq(E.values(place.arr), [2, 1, 0, 3, 4, 6, 8, 9, 7, 5], 'first Lomuto partition matches the SBCL-verified u6t2 answer');
[16, 64, 256].forEach(function (n) {
  ['sorted', 'reversed', 'random'].forEach(function (k) {
    var c = E.countSort(E.mergeSort(E.makeInput(k, n, 3))).counters.comparisons;
    ok(c <= n * Math.log2(n), 'merge sort ' + k + ' n=' + n + ': ' + c + ' ≤ n log₂ n');
  });
});
var ml = E.collect(E.mergeLists([1, 2], [3, 4, 5, 6]));
eq(ml[ml.length - 1].comparisons, 2, 'MERGE-LISTS (1 2)(3 4 5 6): 2 comparisons (SBCL-verified)');
eq(E.collect(E.mergeLists([5], [5])).filter(function (s) { return s.at === 'decide'; })[0].take, 'b', 'MERGE-LISTS takes the second list on a tie (as the lecture code does)');
var pa = E.partitionAt([1, 2, 3, 4, 5], 0, 4, 2);
eq([pa.values, pa.p, pa.comparisons], [[1, 2, 3, 4, 5], 2, 4], 'partitionAt with the median pivot');

section('Linked lists and stacks (engine/lists.js, engine/stacks.js)');
var LLm = E.lists, ins = LLm.task('insert', [3, 8, 5], { x: 7, after: 1 });
var bad = LLm.check(ins, ins.start, { from: ins.after, to: 'new' });
eq([bad.ok, bad.code, bad.data.lost], [false, 'list.orphan', '5'], 'insert in the wrong order orphans 5');
var good1 = LLm.check(ins, ins.start, { from: 'new', to: ins.start.nodes[ins.after].next });
var good2 = LLm.check(ins, good1.state, { from: ins.after, to: 'new' });
eq([good1.ok, good2.ok, good2.done, LLm.values(good2.state)], [true, true, true, [3, 8, 7, 5]], 'insert in the right order');
var pre = LLm.task('prepend', [1, 2]);
eq(LLm.check(pre, pre.start, { from: 'head', to: 'new' }).code, 'list.orphan', 'prepend: moving HEAD first orphans the list');
var rem = LLm.task('remove', [1, 2, 3], { index: 1 });
eq(LLm.check(rem, rem.start, { from: rem.start.head, to: 'n2' }).done, true, 'remove: one move');
var St = E.stacks;
eq([St.parChecker(['[', '[', ']', ']']).result, St.parChecker(['[', ']', ']']).result, St.parChecker(['[', 'x', ']']).reason, St.parChecker(['[', '[', ']']).reason], [true, false, 'invalid', 'leftover'], 'PAR-CHECKER cases');
eq(St.monoPush([1, 2, 5, 7], 3), { stack: [1, 2, 3], popped: [7, 5] }, 'monotonic: pushing 3 onto 1 2 5 7 pops 7 and 5');
var q8 = St.ringCreate(4);
['a', 'b', 'c', 'd'].forEach(function (x) { q8 = St.ringOp(q8, 'enqueue', x).q; });
q8 = St.ringOp(q8, 'dequeue').q; q8 = St.ringOp(q8, 'enqueue', 'e').q;
eq([q8.head, q8.tail, q8.count, q8.data], [1, 1, 4, ['e', 'b', 'c', 'd']], 'ring buffer matches the SBCL run (head 1, tail 1, #(E B C D))');
var dq = { front: [], back: [] };
[['pushBack', 1], ['pushBack', 2], ['pushBack', 3]].forEach(function (o) { dq = St.dequeOp(dq, o[0], o[1]).dq; });
var pf = St.dequeOp(dq, 'popFront');
eq([pf.value, pf.moved], [1, 3], 'two-stack deque: pop-front moves 3 items across and returns the oldest');
eq([St.union([1, 2], [2, 3]).set.sort(), St.intersection([1, 2], [2, 3]).set, St.difference([1, 2], [2, 3]).set, St.subset([1, 2], [1, 2, 3]).result], [[1, 2, 3], [2], [1], true], 'set operations');

section('Trees (engine/trees.js)');
var TRe = E.trees, btx = TRe.sampleBinary();
eq(TRe.traverse(btx, 'pre').map(function (v) { return v.label; }).join(' '), '8 3 1 6 4 7 10 14 13', 'binary pre-order (lecture)');
eq(TRe.traverse(btx, 'in').map(function (v) { return v.label; }).join(' '), '1 3 4 6 7 8 10 13 14', 'binary in-order');
eq(TRe.traverse(btx, 'post').map(function (v) { return v.label; }).join(' '), '1 4 7 6 3 13 14 10 8', 'binary post-order');
eq(TRe.traverse(btx, 'level').map(function (v) { return v.label; }).join(' '), '8 3 10 1 6 14 4 7 13', 'binary level order (lecture)');
var nx = TRe.sampleNary();
eq(TRe.traverse(nx, 'level').map(function (v) { return v.label; }).join(''), '*E+FDMAXABC', 'n-ary level order prints *E+FDMAXABC (lecture)');
eq(TRe.traverse(nx, 'post').map(function (v) { return v.label; }).join(''), 'FEDABCMAX+*', 'n-ary post-order prints FEDABCMAX+* (lecture)');
var threwIn = false; try { TRe.traverse(nx, 'in'); } catch (e) { threwIn = true; }
ok(threwIn, 'in-order is refused on an n-ary tree');
var ixb = TRe.index(btx), n13 = TRe.flat(btx).filter(function (n) { return n.label === '13'; })[0];
eq([ixb[n13.id].depth, ixb[n13.id].level, ixb.treeHeight, ixb[btx.id].height], [3, 4, 3, 3], 'depth / level / height of the lecture tree');
[['3/(4-2)', '(/ 3 (- 4 2))'], ['2+3*4', '(+ 2 (* 3 4))'], ['8-2-1', '(- (- 8 2) 1)'], ['(7+3)*(5-2)', '(* (+ 7 3) (- 5 2))']].forEach(function (c) {
  eq(TRe.toPrefix(TRe.parse(c[0])), c[1], 'parse ' + c[0]);
  eq(Lp.run(c[1]), String(Lp.run(c[1])), 'prefix form runs: ' + c[1]);
});
eq(Lp.run(TRe.toPrefix(TRe.parse('3/(4-2)'))), '3/2', 'Lisp keeps 3/(4-2) as the ratio 3/2');

section('Choosing structures (engine/choose.js)');
var CHs = E.choose, u0 = ctx.CQ.content.unitData[0];
var expectBest = { drive: ['list', 'ring'], prepend: ['list'], lookup: ['hash'], pixels: ['array'], undo: ['array', 'list'], spell: ['hash'], phone: ['sorted'], org: ['tree'], playlist: ['list'],
  brackets: ['list'], bfs: ['ring'], cache: ['hash'], leaderboard: ['sorted'], filesystem: ['tree'] };
u0.scenarios.concat(u0.crossScenarios).forEach(function (sc) { eq(CHs.rank(sc.ops, sc.n, sc.offer).best.sort(), expectBest[sc.id].sort(), 'scenario ' + sc.id + ' best structure'); });

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
