/* CPS305 Quest — engine/core.js
 * Pure helpers shared by every step generator. No DOM access here.
 * Loaded as a classic script (works from file://) and also inside Node's vm for tests.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ = root.CQ || {};
  var E = CQ.engine = CQ.engine || {};

  /* Operation counters. Making cost visible is the point of the whole game:
   * every generator bumps these and copies them into each snapshot. */
  E.newCounters = function () {
    return { comparisons: 0, swaps: 0, shifts: 0, probes: 0 };
  };

  /* Items carry a stable id so the UI can animate an element as it moves,
   * and an optional tag (used to tell equal keys apart in stability games). */
  E.toItems = function (values) {
    return values.map(function (v, i) {
      if (v && typeof v === 'object' && 'v' in v) return { id: v.id != null ? v.id : i, v: v.v, tag: v.tag };
      return { id: i, v: v };
    });
  };
  E.values = function (items) { return items.map(function (it) { return it.v; }); };

  /* Default comparison: the lecture's sorts take COMP, e.g. #'< ("a goes before b").
   * Strict < matters: it is what makes insertion sort and bubble sort stable. */
  E.lessThan = function (a, b) { return a.v < b.v; };

  /* Snapshot: a frozen picture of the algorithm's state at one step.
   * `at` is a named anchor; content files map anchors to Lisp line numbers. */
  E.snap = function (items, counters, extra) {
    var s = { arr: items.slice(), counters: Object.assign({}, counters), marks: {}, regions: [] };
    if (extra) for (var k in extra) s[k] = extra[k];
    return s;
  };

  /* Run a generator to completion and keep every snapshot (arrays are small,
   * so storing them all gives us free "step back"). */
  E.collect = function (gen) {
    var out = [];
    var r = gen.next();
    while (!r.done) { out.push(r.value); r = gen.next(); }
    return out;
  };

  /* Seeded PRNG (mulberry32) so a level is reproducible. */
  E.rng = function (seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  E.randInt = function (rand, lo, hi) { return lo + Math.floor(rand() * (hi - lo + 1)); };
  E.shuffle = function (arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  /* Input shapes from the lecture: sortedness changes how much work a sort does. */
  E.makeInput = function (kind, n, seed) {
    var rand = E.rng(seed == null ? 7 : seed);
    var distinct = [];
    var used = {};
    while (distinct.length < n) {
      var x = E.randInt(rand, 1, Math.max(20, n * 3));
      if (!used[x]) { used[x] = true; distinct.push(x); }
    }
    var sorted = distinct.slice().sort(function (a, b) { return a - b; });
    switch (kind) {
      case 'sorted': return sorted;
      case 'reversed': return sorted.slice().reverse();
      case 'nearly': {
        // Nearly sorted: a couple of adjacent swaps, so only O(n) inversions.
        var a = sorted.slice();
        for (var k = 0; n >= 2 && k < Math.max(1, Math.floor(n / 5)); k++) {
          var i = E.randInt(rand, 0, Math.max(0, n - 2));
          var t = a[i]; a[i] = a[i + 1]; a[i + 1] = t;
        }
        return a;
      }
      case 'dupes': {
        var b = [];
        for (var m = 0; m < n; m++) b.push(E.randInt(rand, 1, Math.max(2, Math.floor(n / 3))));
        return b;
      }
      default: return E.shuffle(sorted, rand);
    }
  };

  /* An inversion is any pair i < j with a[i] > a[j] (two elements out of order). */
  E.inversionPairs = function (values) {
    var pairs = [];
    for (var i = 0; i < values.length; i++)
      for (var j = i + 1; j < values.length; j++)
        if (values[i] > values[j]) pairs.push([i, j]);
    return pairs;
  };
  E.countInversions = function (values) { return E.inversionPairs(values).length; };

  E.isSorted = function (values) {
    for (var i = 1; i < values.length; i++) if (values[i - 1] > values[i]) return false;
    return true;
  };

  /* Stable means: equal keys keep their original relative order. */
  E.isStableResult = function (before, after) {
    var order = {};
    before.forEach(function (it, i) { order[it.id] = i; });
    for (var i = 1; i < after.length; i++) {
      if (after[i - 1].v === after[i].v && order[after[i - 1].id] > order[after[i].id]) return false;
    }
    return true;
  };

  E.parseNumberList = function (text, max) {
    var parts = String(text).split(/[\s,]+/).filter(Boolean);
    var nums = [];
    for (var i = 0; i < parts.length; i++) {
      var n = Number(parts[i]);
      if (!isFinite(n) || Math.floor(n) !== n) return { error: '"' + parts[i] + '" is not a whole number.' };
      if (Math.abs(n) > 999) return { error: 'Keep numbers between -999 and 999.' };
      nums.push(n);
    }
    if (nums.length === 0) return { error: 'Type at least one number.' };
    if (max && nums.length > max) return { error: 'At most ' + max + ' numbers, please.' };
    return { values: nums };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
