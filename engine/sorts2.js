/* CPS305 Quest — engine/sorts2.js
 * Units 6 and 7: quicksort (Lomuto and Hoare partitions, four pivot rules)
 * and merge sort (top-down with an auxiliary array; optional insertion-sort
 * cutoff), plus the lecture's MERGE-LISTS. Step generators, no DOM.
 */
(function (root) {
  'use strict';
  var E = root.CQ.engine;

  function swap(a, i, j) { var t = a[i]; a[i] = a[j]; a[j] = t; }
  function finals(set) { return Object.keys(set).map(function (k) { return { from: +k, to: +k, kind: 'sorted' }; }); }
  function outside(n, lo, hi) {
    var r = [];
    if (lo > 0) r.push({ from: 0, to: lo - 1, kind: 'discarded' });
    if (hi < n - 1) r.push({ from: hi + 1, to: n - 1, kind: 'discarded' });
    return r;
  }

  /* Pivot rules. Returns the index of the chosen pivot in a[lo..hi]; median-of-3
   * costs comparisons (counted). */
  E.choosePivot = function (a, lo, hi, rule, comp, c, rand) {
    if (rule === 'first') return lo;
    if (rule === 'last') return hi;
    if (rule === 'random') return lo + Math.floor(rand() * (hi - lo + 1));
    // median of three: first, middle, last (needs at least 3 elements to mean anything)
    if (hi - lo + 1 < 3) return hi;
    var m = Math.floor((lo + hi) / 2), x = [lo, m, hi];
    c.comparisons += 3;
    x.sort(function (p, q) { return comp(a[p], a[q]) ? -1 : comp(a[q], a[p]) ? 1 : 0; });
    return x[1];
  };

  /* QUICKSORT with Lomuto partition (lecture): the pivot is the LAST element;
   * index j scans, elements smaller than the pivot are swapped into slot i (ppvt);
   * finally the pivot is swapped into slot i, its final position. */
  E.quickLomuto = function* (values, comp, opts) {
    comp = comp || E.lessThan; opts = opts || {};
    var rule = opts.pivot || 'last', rand = E.rng(opts.seed || 1);
    var a = E.toItems(values), n = a.length, c = E.newCounters(), done = {}, tree = [], depthMax = 0;
    var stack = [{ lo: 0, hi: n - 1, depth: 0, parent: null }];
    yield E.snap(a, c, { at: 'start', msg: 'Quicksort the whole array.' });
    while (stack.length) {
      var call = stack.pop(), lo = call.lo, hi = call.hi;
      var node = { id: tree.length, lo: lo, hi: hi, depth: call.depth, parent: call.parent, size: Math.max(0, hi - lo + 1), pivotIndex: null };
      tree.push(node); depthMax = Math.max(depthMax, call.depth);
      if (hi - lo + 1 <= 1) { if (lo === hi) done[lo] = true; continue; }   // base case: size 0 or 1
      var pi = E.choosePivot(a, lo, hi, rule, comp, c, rand);
      if (pi !== hi) { swap(a, pi, hi); c.swaps++; }
      var pivot = a[hi], ppvt = lo;
      yield E.snap(a, c, { at: 'partition', marks: { i: ppvt, pivot: hi }, regions: outside(n, lo, hi).concat(finals(done)), lo: lo, hi: hi, depth: call.depth, pivotValue: pivot.v,
        msg: 'Partition ' + lo + '…' + hi + ' around pivot ' + pivot.v + (rule === 'last' ? ' (last element).' : ' (moved to the end).') });
      // (dotimes (i (1- (length vec))) (when (funcall comp (aref vec i) pivot) (rotatef ...) (incf ppvt)))
      for (var j = lo; j < hi; j++) {
        c.comparisons++;
        var less = comp(a[j], pivot);
        yield E.snap(a, c, { at: 'compare', marks: { i: ppvt, j: j, pivot: hi }, compare: [j, hi], result: less, regions: outside(n, lo, hi).concat(finals(done)), lo: lo, hi: hi, ppvt: ppvt, j: j,
          msg: a[j].v + (less ? ' < ' : ' is not less than ') + pivot.v + (less ? ': swap it into slot ' + ppvt + ', then i moves right.' : ': leave it.') });
        if (less) {
          if (j !== ppvt) { swap(a, j, ppvt); c.swaps++; }
          yield E.snap(a, c, { at: 'swap', marks: { i: ppvt + 1, j: j, pivot: hi }, swap: [j, ppvt], regions: outside(n, lo, hi).concat(finals(done)), lo: lo, hi: hi, msg: 'Slot ' + ppvt + ' now holds ' + a[ppvt].v + '.' });
          ppvt++;
        }
      }
      if (ppvt !== hi) { swap(a, hi, ppvt); c.swaps++; }
      done[ppvt] = true; node.pivotIndex = ppvt;
      yield E.snap(a, c, { at: 'place', marks: { pivot: ppvt }, swap: [hi, ppvt], regions: outside(n, lo, hi).concat(finals(done)), lo: lo, hi: hi, landed: ppvt, depth: call.depth,
        msg: 'Pivot ' + a[ppvt].v + ' goes to slot ' + ppvt + ': its final position. Left side ' + (ppvt - lo) + ', right side ' + (hi - ppvt) + '.' });
      stack.push({ lo: ppvt + 1, hi: hi, depth: call.depth + 1, parent: node.id });
      stack.push({ lo: lo, hi: ppvt - 1, depth: call.depth + 1, parent: node.id });
    }
    yield E.snap(a, c, { at: 'done', regions: [{ from: 0, to: n - 1, kind: 'sorted' }], done: true, tree: tree, depth: depthMax,
      msg: 'Done: ' + c.comparisons + ' comparisons, ' + c.swaps + ' swaps, recursion depth ' + depthMax + '.' });
  };

  /* QUICKSORT with Hoare partition (lecture): pivot is the FIRST element,
   * i = lo−1 and j = hi+1 move inward; i stops at an element ≥ pivot, j at one ≤ pivot;
   * if i ≥ j return j, else swap. Recurse on lo..j and j+1..hi.
   * The pivot is NOT necessarily in its final place afterwards. */
  E.quickHoare = function* (values, comp, opts) {
    comp = comp || E.lessThan; opts = opts || {};
    var rule = opts.pivot || 'first', rand = E.rng(opts.seed || 1);
    var a = E.toItems(values), n = a.length, c = E.newCounters(), tree = [], depthMax = 0;
    var stack = [{ lo: 0, hi: n - 1, depth: 0, parent: null }];
    yield E.snap(a, c, { at: 'start', msg: 'Quicksort (Hoare) the whole array.' });
    while (stack.length) {
      var call = stack.pop(), lo = call.lo, hi = call.hi;
      var node = { id: tree.length, lo: lo, hi: hi, depth: call.depth, parent: call.parent, size: Math.max(0, hi - lo + 1), split: null };
      tree.push(node); depthMax = Math.max(depthMax, call.depth);
      if (lo >= hi) continue;
      var pi = E.choosePivot(a, lo, hi, rule, comp, c, rand);
      if (pi !== lo) { swap(a, pi, lo); c.swaps++; }
      var pivot = a[lo], i = lo - 1, j = hi + 1;
      yield E.snap(a, c, { at: 'partition', marks: { pivot: lo }, regions: outside(n, lo, hi), lo: lo, hi: hi, pivotValue: pivot.v, depth: call.depth,
        msg: 'Partition ' + lo + '…' + hi + ' around pivot ' + pivot.v + ' (first element). i starts at ' + i + ', j at ' + j + '.' });
      for (;;) {
        do { i++; c.comparisons++; } while (comp(a[i], pivot));
        yield E.snap(a, c, { at: 'iStop', marks: { i: i, j: Math.min(j, n - 1), pivot: lo }, regions: outside(n, lo, hi), lo: lo, hi: hi, iStop: i, pivotValue: pivot.v,
          msg: 'i stops at slot ' + i + ' (' + a[i].v + ' ≥ ' + pivot.v + ').' });
        do { j--; c.comparisons++; } while (comp(pivot, a[j]));
        yield E.snap(a, c, { at: 'jStop', marks: { i: i, j: j, pivot: lo }, regions: outside(n, lo, hi), lo: lo, hi: hi, jStop: j, pivotValue: pivot.v,
          msg: 'j stops at slot ' + j + ' (' + a[j].v + ' ≤ ' + pivot.v + ').' });
        if (i >= j) {
          node.split = j;
          yield E.snap(a, c, { at: 'return', marks: { j: j }, regions: outside(n, lo, hi), lo: lo, hi: hi, split: j, result: 'return', depth: call.depth,
            msg: 'i ≥ j: return j = ' + j + '. Recurse on ' + lo + '…' + j + ' and ' + (j + 1) + '…' + hi + '.' });
          break;
        }
        swap(a, i, j); c.swaps++;
        yield E.snap(a, c, { at: 'swap', marks: { i: i, j: j, pivot: a[lo] === pivot ? lo : -1 }, swap: [i, j], regions: outside(n, lo, hi), lo: lo, hi: hi, result: 'swap',
          msg: 'i < j: swap ' + a[j].v + ' and ' + a[i].v + '.' });
      }
      stack.push({ lo: j + 1, hi: hi, depth: call.depth + 1, parent: node.id });
      stack.push({ lo: lo, hi: j, depth: call.depth + 1, parent: node.id });
    }
    yield E.snap(a, c, { at: 'done', regions: [{ from: 0, to: n - 1, kind: 'sorted' }], done: true, tree: tree, depth: depthMax,
      msg: 'Done: ' + c.comparisons + ' comparisons, ' + c.swaps + ' swaps, recursion depth ' + depthMax + '.' });
  };

  /* Merge sort, top-down. Split in halves, sort each half, merge with two
   * indexes and an auxiliary array (O(n) extra memory). threshold > 1: below it,
   * switch to insertion sort (the practical hybrid). */
  E.mergeSort = function* (values, comp, opts) {
    comp = comp || E.lessThan; opts = opts || {};
    var cutoff = opts.threshold || 1;
    var a = E.toItems(values), n = a.length, c = E.newCounters(), tree = [];
    c.writes = 0;
    yield E.snap(a, c, { at: 'start', msg: 'Split, sort each half, merge.' });
    var gen = sort(0, n - 1, 0, null);
    var r = gen.next();
    while (!r.done) { yield r.value; r = gen.next(); }
    yield E.snap(a, c, { at: 'done', regions: [{ from: 0, to: Math.max(0, n - 1), kind: 'sorted' }], done: true, tree: tree,
      msg: 'Done: ' + c.comparisons + ' comparisons.' });

    function* sort(lo, hi, depth, parent) {
      var node = { id: tree.length, lo: lo, hi: hi, depth: depth, parent: parent, compares: 0 };
      tree.push(node);
      if (hi - lo + 1 <= cutoff) {
        if (cutoff > 1 && hi > lo) {
          // insertion sort on the small piece (counted like the lecture's version)
          var before = c.comparisons;
          for (var p = lo + 1; p <= hi; p++) {
            for (var q = p; q > lo; q--) {
              c.comparisons++;
              if (comp(a[q], a[q - 1])) { swap(a, q, q - 1); c.writes += 2; } else break;
            }
          }
          node.compares = c.comparisons - before;
          yield E.snap(a, c, { at: 'insertion', regions: [{ from: lo, to: hi, kind: 'sorted' }], lo: lo, hi: hi, depth: depth, msg: 'Small piece (' + (hi - lo + 1) + ' ≤ ' + cutoff + '): insertion sort.' });
        }
        return;
      }
      var mid = Math.floor((lo + hi) / 2);
      yield E.snap(a, c, { at: 'split', lo: lo, hi: hi, mid: mid, depth: depth, regions: outside(n, lo, hi), msg: 'Split ' + lo + '…' + hi + ' into ' + lo + '…' + mid + ' and ' + (mid + 1) + '…' + hi + '.' });
      yield* sort(lo, mid, depth + 1, node.id);
      yield* sort(mid + 1, hi, depth + 1, node.id);
      // merge with an auxiliary copy
      var aux = a.slice(lo, hi + 1), i = 0, j = mid - lo + 1, k = lo, before2 = c.comparisons;
      while (k <= hi) {
        var from;
        if (i > mid - lo) from = 'right';
        else if (j > hi - lo) from = 'left';
        else {
          c.comparisons++;
          // Same tie rule as the lecture's MERGE-LISTS: take from the left list only if (funcall comp left right).
          from = comp(aux[i], aux[j]) ? 'left' : 'right';
          yield E.snap(a, c, { at: 'compare', marks: { i: lo + i, j: lo + j, k: k }, lo: lo, hi: hi, depth: depth, result: from, left: aux[i].v, right: aux[j].v,
            regions: outside(n, lo, hi), msg: 'Compare ' + aux[i].v + ' and ' + aux[j].v + ': take ' + (from === 'left' ? aux[i].v : aux[j].v) + '.' });
        }
        a[k] = from === 'left' ? aux[i++] : aux[j++];
        c.writes++;
        k++;
      }
      node.compares = c.comparisons - before2;
      yield E.snap(a, c, { at: 'merged', lo: lo, hi: hi, depth: depth, regions: [{ from: lo, to: hi, kind: 'sorted' }].concat(outside(n, lo, hi)),
        msg: 'Merged ' + lo + '…' + hi + ' with ' + node.compares + ' comparisons.' });
    }
  };

  /* The lecture's MERGE-LISTS on two sorted lists: each step compares the two
   * fronts and takes i1 if (funcall comp i1 i2), else i2; when one list runs
   * out, the rest of the other is taken. */
  E.mergeLists = function* (l1, l2, comp) {
    comp = comp || function (x, y) { return x < y; };
    var a = l1.slice(), b = l2.slice(), out = [], cmp = 0;
    yield { a: a.slice(), b: b.slice(), out: out.slice(), comparisons: cmp, at: 'start' };
    while (a.length || b.length) {
      if (!a.length) { out.push(b.shift()); yield { a: a.slice(), b: b.slice(), out: out.slice(), comparisons: cmp, at: 'rest', from: 'b' }; continue; }
      if (!b.length) { out.push(a.shift()); yield { a: a.slice(), b: b.slice(), out: out.slice(), comparisons: cmp, at: 'rest', from: 'a' }; continue; }
      cmp++;
      var take = comp(a[0], b[0]) ? 'a' : 'b';
      var x = take === 'a' ? a[0] : b[0];
      yield { a: a.slice(), b: b.slice(), out: out.slice(), comparisons: cmp, at: 'decide', take: take, x: a[0], y: b[0] };
      out.push(take === 'a' ? a.shift() : b.shift());
      yield { a: a.slice(), b: b.slice(), out: out.slice(), comparisons: cmp, at: 'took', from: take, value: x };
    }
    yield { a: [], b: [], out: out.slice(), comparisons: cmp, at: 'done' };
  };

  /* Fast comparison counts for charts (no snapshots kept). */
  E.countSort = function (gen) { var last = null, r = gen.next(); while (!r.done) { last = r.value; r = gen.next(); } return last; };

  /* One Lomuto partition with a chosen pivot (Pivot Picker). */
  E.partitionAt = function (vals, lo, hi, pivotIndex) {
    var a = vals.slice(), cmp = 0;
    var t = a[pivotIndex]; a[pivotIndex] = a[hi]; a[hi] = t;
    var pivot = a[hi], p = lo;
    for (var j = lo; j < hi; j++) { cmp++; if (a[j] < pivot) { var u = a[j]; a[j] = a[p]; a[p] = u; p++; } }
    t = a[hi]; a[hi] = a[p]; a[p] = t;
    return { values: a, p: p, comparisons: cmp };
  };

  E.sorts.quickLomuto = { gen: E.quickLomuto, name: 'Quicksort (Lomuto)', stable: false, lisp: 'quicksort' };
  E.sorts.quickHoare = { gen: E.quickHoare, name: 'Quicksort (Hoare)', stable: false, lisp: 'quicksort-hoare' };
  /* With COMP = #'< the lecture's merge takes the RIGHT element on ties, so equal
   * keys can swap order (with #'<= it would be stable). The engine reports what the code does. */
  E.sorts.merge = { gen: E.mergeSort, name: 'Merge sort', stable: false, lisp: 'merge-sort' };
})(typeof globalThis !== 'undefined' ? globalThis : this);
