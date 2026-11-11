/* CPS305 Quest — engine/sorts.js
 * Comparison sorts from Topic 5, written to mirror the lecture's Lisp line by line.
 * Every generator takes (values, comp) where comp(a, b) means "a goes before b",
 * exactly like the lecture's (funcall comp ...). Items are {id, v, tag}.
 */
(function (root) {
  'use strict';
  var E = root.CQ.engine;

  function swap(a, i, j) { var t = a[i]; a[i] = a[j]; a[j] = t; }
  function sortedRegion(from, to) { return to >= from ? [{ from: from, to: to, kind: 'sorted' }] : []; }

  /* SELECTION-SORT: repeatedly find the smallest element of the unsorted
   * region and swap it to the front of that region.
   * Always (n-1) + (n-2) + ... + 1 = n(n-1)/2 comparisons, even on sorted input. */
  E.selectionSort = function* (values, comp) {
    comp = comp || E.lessThan;
    var a = E.toItems(values), n = a.length, c = E.newCounters();
    yield E.snap(a, c, { at: 'start', msg: 'Unsorted region is the whole array.' });
    // (dotimes (cur (1- (length vec))) ...) : every element except the last
    for (var cur = 0; cur < n - 1; cur++) {
      var best = a[cur], idx = cur;
      yield E.snap(a, c, { at: 'pass', marks: { cur: cur, best: idx }, regions: sortedRegion(0, cur - 1), cur: cur,
        msg: 'Pass ' + (cur + 1) + ': best so far is ' + best.v + ' at index ' + cur + '.' });
      // (do ((j (1+ cur) (1+ j))) ((= j (length vec))) ...)
      for (var j = cur + 1; j < n; j++) {
        c.comparisons++;
        var better = comp(a[j], best);
        yield E.snap(a, c, { at: 'compare', marks: { cur: cur, best: idx, j: j }, compare: [j, idx], result: better,
          regions: sortedRegion(0, cur - 1), cur: cur,
          msg: 'Compare ' + a[j].v + ' with best ' + best.v + (better ? ': new best.' : ': keep ' + best.v + '.') });
        if (better) {
          best = a[j]; idx = j;
          yield E.snap(a, c, { at: 'newBest', marks: { cur: cur, best: idx, j: j }, regions: sortedRegion(0, cur - 1), cur: cur,
            msg: 'best = ' + best.v + ', idx = ' + idx + '.' });
        }
      }
      // (rotatef (aref vec cur) (aref vec idx)) — runs every pass, even when idx = cur.
      if (idx !== cur) c.swaps++;
      swap(a, cur, idx);
      yield E.snap(a, c, { at: 'swap', marks: { cur: cur }, swap: [cur, idx], minIndex: idx, regions: sortedRegion(0, cur), cur: cur,
        msg: idx === cur ? a[cur].v + ' is already at the front, so ROTATEF swaps it with itself.'
                         : 'Swap ' + a[cur].v + ' into index ' + cur + '. Index ' + cur + ' is now final.' });
    }
    yield E.snap(a, c, { at: 'done', regions: sortedRegion(0, n - 1), done: true,
      msg: 'Done: ' + c.comparisons + ' comparisons, ' + c.swaps + ' swaps.' });
  };

  /* INSERTION-SORT (lecture version, adjacent swaps): grow a sorted region on the
   * left; move the next element left until the element before it is not larger.
   * The inner loop runs once per inversion: best case n-1 comparisons (sorted),
   * worst case n(n-1)/2 (reversed). */
  E.insertionSort = function* (values, comp) {
    comp = comp || E.lessThan;
    var a = E.toItems(values), n = a.length, c = E.newCounters();
    yield E.snap(a, c, { at: 'start', regions: sortedRegion(0, Math.min(0, n - 1)),
      msg: 'Treat the first element as a sorted region of size 1.' });
    // (dotimes (i (1- (length vec))) ...)
    for (var i = 0; i < n - 1; i++) {
      var movingId = a[i + 1].id;
      yield E.snap(a, c, { at: 'pass', marks: { i: i, key: i + 1 }, regions: sortedRegion(0, i), pass: i, movingId: movingId,
        msg: 'Insert ' + a[i + 1].v + ' into the sorted region.' });
      // (do ((j i (1- j))) ((minusp j)) ...)
      for (var j = i; j >= 0; j--) {
        c.comparisons++;
        var before = comp(a[j + 1], a[j]);
        yield E.snap(a, c, { at: 'compare', marks: { j: j }, compare: [j + 1, j], result: before,
          regions: sortedRegion(0, i), pass: i, movingId: movingId,
          msg: before ? a[j + 1].v + ' < ' + a[j].v + ': out of order, swap.'
                      : a[j + 1].v + ' is not less than ' + a[j].v + ': stop (RETURN).' });
        if (before) {
          swap(a, j + 1, j); c.swaps++;
          yield E.snap(a, c, { at: 'swap', marks: { j: j }, swap: [j + 1, j], regions: sortedRegion(0, i + 1), pass: i, movingId: movingId,
            msg: 'Swapped. One inversion removed.' });
        } else {
          yield E.snap(a, c, { at: 'return', marks: { j: j }, regions: sortedRegion(0, i + 1), pass: i, movingId: movingId, landed: j + 1,
            msg: a[j + 1].v + ' lands at index ' + (j + 1) + '.' });
          break;
        }
        if (j === 0) {
          yield E.snap(a, c, { at: 'front', regions: sortedRegion(0, i + 1), pass: i, movingId: movingId, landed: 0,
            msg: 'Reached the front: ' + a[0].v + ' lands at index 0.' });
        }
      }
    }
    yield E.snap(a, c, { at: 'done', regions: sortedRegion(0, n - 1), done: true,
      msg: 'Done: ' + c.comparisons + ' comparisons, ' + c.swaps + ' swaps.' });
  };

  /* Insertion sort, optimization #1 (half-exchange): hold the element in a
   * variable, SHIFT larger elements right, then drop it into the gap.
   * Same comparisons as the swap version, but one write per shift instead of a full swap. */
  E.insertionSortShift = function* (values, comp) {
    comp = comp || E.lessThan;
    var a = E.toItems(values), n = a.length, c = E.newCounters();
    yield E.snap(a, c, { at: 'start', regions: sortedRegion(0, Math.min(0, n - 1)), msg: 'Sorted region: index 0.' });
    for (var i = 1; i < n; i++) {
      var key = a[i], j = i - 1;
      yield E.snap(a, c, { at: 'pass', marks: { i: i }, held: key, hole: i, regions: sortedRegion(0, i - 1), pass: i - 1, movingId: key.id,
        msg: 'Pick up ' + key.v + ' (key). Index ' + i + ' is now a hole.' });
      while (j >= 0) {
        c.comparisons++;
        var before = comp(key, a[j]);
        yield E.snap(a, c, { at: 'compare', marks: { j: j }, compare: [j, j + 1], held: key, hole: j + 1, result: before,
          regions: sortedRegion(0, i - 1), pass: i - 1, movingId: key.id,
          msg: before ? key.v + ' < ' + a[j].v + ': shift ' + a[j].v + ' right.' : key.v + ' is not less than ' + a[j].v + ': stop.' });
        if (!before) break;
        a[j + 1] = a[j]; c.shifts++;
        yield E.snap(a, c, { at: 'shift', marks: { j: j }, held: key, hole: j, regions: sortedRegion(0, i - 1), pass: i - 1, movingId: key.id,
          msg: 'Shifted ' + a[j + 1].v + ' to index ' + (j + 1) + '.' });
        j--;
      }
      a[j + 1] = key;
      yield E.snap(a, c, { at: 'place', marks: { j: j + 1 }, regions: sortedRegion(0, i), pass: i - 1, movingId: key.id, landed: j + 1,
        msg: 'Drop ' + key.v + ' into index ' + (j + 1) + '.' });
    }
    yield E.snap(a, c, { at: 'done', regions: sortedRegion(0, n - 1), done: true,
      msg: 'Done: ' + c.comparisons + ' comparisons, ' + c.shifts + ' shifts.' });
  };

  /* Insertion sort, optimization #2: binary-search the sorted region for the
   * insertion point. Comparisons drop to O(n log n) total, but the shifting is
   * still O(n^2), so the algorithm stays O(n^2).
   * We search for the first position whose element is strictly greater (keeps it stable). */
  E.binaryInsertionSort = function* (values, comp) {
    comp = comp || E.lessThan;
    var a = E.toItems(values), n = a.length, c = E.newCounters();
    yield E.snap(a, c, { at: 'start', regions: sortedRegion(0, Math.min(0, n - 1)), msg: 'Sorted region: index 0.' });
    for (var i = 1; i < n; i++) {
      var key = a[i], lb = 0, ub = i - 1;
      yield E.snap(a, c, { at: 'pass', marks: { i: i, lb: lb, ub: ub }, held: key, regions: sortedRegion(0, i - 1), pass: i - 1, movingId: key.id,
        msg: 'Binary-search the sorted region for where ' + key.v + ' goes.' });
      while (lb <= ub) {
        var mid = Math.floor((lb + ub) / 2);
        c.comparisons++;
        var before = comp(key, a[mid]);
        yield E.snap(a, c, { at: 'probe', marks: { lb: lb, ub: ub, mid: mid }, compare: [mid, i], held: key, result: before,
          regions: sortedRegion(0, i - 1), pass: i - 1, movingId: key.id,
          msg: before ? key.v + ' < ' + a[mid].v + ': look left.' : key.v + ' is not less than ' + a[mid].v + ': look right.' });
        if (before) ub = mid - 1; else lb = mid + 1;
      }
      var pos = lb;
      for (var j = i - 1; j >= pos; j--) {
        a[j + 1] = a[j]; c.shifts++;
        yield E.snap(a, c, { at: 'shift', marks: { j: j }, held: key, hole: j, regions: sortedRegion(0, i - 1), pass: i - 1, movingId: key.id,
          msg: 'Shift ' + a[j + 1].v + ' right. Shifting is still linear work.' });
      }
      a[pos] = key;
      yield E.snap(a, c, { at: 'place', marks: { j: pos }, regions: sortedRegion(0, i), pass: i - 1, movingId: key.id, landed: pos,
        msg: 'Drop ' + key.v + ' into index ' + pos + '.' });
    }
    yield E.snap(a, c, { at: 'done', regions: sortedRegion(0, n - 1), done: true,
      msg: 'Done: ' + c.comparisons + ' comparisons, ' + c.shifts + ' shifts.' });
  };

  /* BUBBLE-SORT: from the front, swap adjacent elements that are out of order,
   * so the largest bubbles to the end; repeat, stopping one position shorter.
   * (The lecture gives no Lisp for this; ours follows its description, no early exit.) */
  E.bubbleSort = function* (values, comp) {
    comp = comp || E.lessThan;
    var a = E.toItems(values), n = a.length, c = E.newCounters();
    yield E.snap(a, c, { at: 'start', msg: 'Each pass bubbles the largest remaining element to the end.' });
    // (do ((end (1- (length vec)) (1- end))) ((< end 1) vec) ...)
    for (var end = n - 1; end >= 1; end--) {
      yield E.snap(a, c, { at: 'pass', marks: { end: end }, regions: sortedRegion(end + 1, n - 1), end: end,
        msg: 'Pass: compare neighbours from index 0 up to ' + end + '.' });
      for (var j = 0; j < end; j++) {
        c.comparisons++;
        var out = comp(a[j + 1], a[j]);
        yield E.snap(a, c, { at: 'compare', marks: { j: j, end: end }, compare: [j, j + 1], result: out,
          regions: sortedRegion(end + 1, n - 1), end: end,
          msg: out ? a[j].v + ' > ' + a[j + 1].v + ': out of order, swap.' : a[j].v + ' and ' + a[j + 1].v + ' are in order.' });
        if (out) {
          swap(a, j, j + 1); c.swaps++;
          yield E.snap(a, c, { at: 'swap', marks: { j: j, end: end }, swap: [j, j + 1], regions: sortedRegion(end + 1, n - 1), end: end,
            msg: 'Swapped.' });
        }
      }
      yield E.snap(a, c, { at: 'passEnd', regions: sortedRegion(end, n - 1), end: end,
        msg: a[end].v + ' has bubbled into its final place at index ' + end + '.' });
    }
    yield E.snap(a, c, { at: 'done', regions: sortedRegion(0, n - 1), done: true,
      msg: 'Done: ' + c.comparisons + ' comparisons, ' + c.swaps + ' swaps.' });
  };

  /* Registry so UI and tests can look algorithms up by id. */
  E.sorts = {
    selection: { gen: E.selectionSort, name: 'Selection sort', stable: false, lisp: 'selection-sort' },
    insertion: { gen: E.insertionSort, name: 'Insertion sort', stable: true, lisp: 'insertion-sort' },
    insertionShift: { gen: E.insertionSortShift, name: 'Insertion sort (shift)', stable: true, lisp: 'insertion-sort-shift' },
    binaryInsertion: { gen: E.binaryInsertionSort, name: 'Binary insertion sort', stable: true, lisp: 'binary-insertion-sort' },
    bubble: { gen: E.bubbleSort, name: 'Bubble sort', stable: true, lisp: 'bubble-sort' }
  };

  E.runSort = function (id, values, comp) { return E.collect(E.sorts[id].gen(values, comp)); };
})(typeof globalThis !== 'undefined' ? globalThis : this);
