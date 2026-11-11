/* CPS305 Quest — engine/search.js
 * Step generators for LIN-SEARCH and BIN-SEARCH, mirroring the Topic 5 Lisp code.
 * Each yield is a snapshot; `at` names the Lisp form being evaluated.
 */
(function (root) {
  'use strict';
  var E = root.CQ.engine;

  /* Linear search: check every element, one by one, until we find the key
   * or hit the end. Order of the array does not matter. O(n). */
  E.linearSearch = function* (values, key) {
    var items = E.toItems(values);
    var c = E.newCounters();
    yield E.snap(items, c, { at: 'start', msg: 'Start at index 0.' });
    for (var i = 0; i < items.length; i++) {
      c.probes++; c.comparisons++;
      var hit = items[i].v === key;
      yield E.snap(items, c, {
        at: 'compare', marks: { i: i }, probe: i, result: hit,
        regions: i > 0 ? [{ from: 0, to: i - 1, kind: 'discarded' }] : [],
        msg: '(= ' + items[i].v + ' ' + key + ') is ' + (hit ? 'true' : 'false') + '.'
      });
      if (hit) {
        yield E.snap(items, c, { at: 'return', marks: { i: i }, found: i, done: true, msg: 'Found at index ' + i + '.' });
        return;
      }
    }
    yield E.snap(items, c, {
      at: 'end', found: null, done: true,
      regions: items.length ? [{ from: 0, to: items.length - 1, kind: 'discarded' }] : [],
      msg: 'Checked all ' + items.length + ' elements. Returns NIL.'
    });
  };

  /* Binary search (lecture's BIN-SEARCH, a DO loop):
   *   lb = 0, ub = n-1; stop with NIL when lb > ub
   *   i = floor((lb+ub)/2); e < key -> lb = i+1; e > key -> ub = i-1; else return i
   * Requires sorted data. T(n) = 1 + T(n/2), so O(log n). */
  E.binarySearch = function* (values, key) {
    var items = E.toItems(values);
    var c = E.newCounters();
    var lb = 0, ub = items.length - 1;
    function discarded() {
      var r = [];
      if (lb > 0) r.push({ from: 0, to: Math.min(lb - 1, items.length - 1), kind: 'discarded' });
      if (ub < items.length - 1) r.push({ from: Math.max(ub + 1, 0), to: items.length - 1, kind: 'discarded' });
      return r;
    }
    yield E.snap(items, c, { at: 'start', marks: { lb: lb, ub: ub }, lb: lb, ub: ub, regions: discarded(),
      msg: 'lb = 0, ub = ' + ub + '. The whole array is still in play.' });
    while (true) {
      if (lb > ub) {
        yield E.snap(items, c, { at: 'end', lb: lb, ub: ub, found: null, done: true, regions: discarded(),
          msg: 'lb (' + lb + ') > ub (' + ub + '): nothing left to search. Returns NIL.' });
        return;
      }
      var i = Math.floor((lb + ub) / 2);
      c.probes++;
      var e = items[i].v;
      // The COND checks (< e key) then (> e key); we count one probe per element checked.
      c.comparisons += e < key ? 1 : 2;
      var marks = { lb: lb, ub: ub, mid: i };
      if (e < key) {
        yield E.snap(items, c, { at: 'less', marks: marks, probe: i, lb: lb, ub: ub, regions: discarded(),
          msg: e + ' < ' + key + ': discard index ' + i + ' and everything before it. lb = ' + (i + 1) + '.' });
        lb = i + 1;
      } else if (e > key) {
        yield E.snap(items, c, { at: 'greater', marks: marks, probe: i, lb: lb, ub: ub, regions: discarded(),
          msg: e + ' > ' + key + ': discard index ' + i + ' and everything after it. ub = ' + (i - 1) + '.' });
        ub = i - 1;
      } else {
        yield E.snap(items, c, { at: 'found', marks: marks, probe: i, lb: lb, ub: ub, found: i, done: true, regions: discarded(),
          msg: e + ' = ' + key + ': found at index ' + i + '.' });
        return;
      }
    }
  };

  /* Worst-case probes for binary search on n elements: floor(log2 n) + 1. */
  E.binaryWorstProbes = function (n) { return n <= 0 ? 0 : Math.floor(Math.log2(n)) + 1; };
})(typeof globalThis !== 'undefined' ? globalThis : this);
