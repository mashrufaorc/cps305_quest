/* CPS305 Quest — engine/hashing.js
 * Units 9 and 10. Pure functions, no DOM.
 * Open addressing (linear, quadratic, double hashing) with lazy deletion,
 * chaining, distributions, the birthday paradox, and a step-by-step mirror of
 * the lecture's HT-GET / HT-ADD (Unit 10).
 * Formulas follow Topic 9:
 *   H1(k) = k mod M
 *   linear:    (H1 + i) mod M
 *   quadratic: (H1 + i + i²) mod M
 *   double:    (H1 + i·H2(k)) mod M,  H2(k) = PRIME − (k mod PRIME)
 */
(function (root) {
  'use strict';
  var E = root.CQ.engine;
  var H = E.hashing = {};
  var EMPTY = null, DELETED = 'DELETED';
  H.EMPTY = EMPTY; H.DELETED = DELETED;

  function mod(a, m) { return ((a % m) + m) % m; }
  H.h1 = function (k, M) { return mod(k, M); };
  H.h2 = function (k, prime) { return prime - mod(k, prime); };
  /* Largest prime smaller than M (the lecture's PRIME < TABLE_SIZE). */
  H.primeBelow = function (M) {
    for (var p = M - 1; p >= 2; p--) { var ok = true; for (var d = 2; d * d <= p; d++) if (p % d === 0) { ok = false; break; } if (ok) return p; }
    return 1;
  };
  /* The i-th slot to try for key k. */
  H.probe = function (strategy, k, i, M, prime) {
    var a = H.h1(k, M);
    if (strategy === 'linear') return mod(a + i, M);
    if (strategy === 'quadratic') return mod(a + i + i * i, M);
    if (strategy === 'double') return mod(a + i * H.h2(k, prime || H.primeBelow(M)), M);
    return a;
  };
  H.formula = function (strategy, k, i, M, prime) {
    var a = H.h1(k, M);
    if (strategy === 'linear') return '(' + a + ' + ' + i + ') mod ' + M;
    if (strategy === 'quadratic') return '(' + a + ' + ' + i + ' + ' + i * i + ') mod ' + M;
    if (strategy === 'double') { var p = prime || H.primeBelow(M); return '(' + a + ' + ' + i + '·' + H.h2(k, p) + ') mod ' + M; }
    return k + ' mod ' + M;
  };

  /* ---------- open addressing ---------- */
  /* table: { M, strategy, prime, slots: [key|null|'DELETED'] }  (keys are integers) */
  H.create = function (M, strategy, prime) {
    var s = []; for (var i = 0; i < M; i++) s.push(EMPTY);
    return { M: M, strategy: strategy || 'linear', prime: prime || H.primeBelow(M), slots: s, count: 0 };
  };
  H.clone = function (t) { return { M: t.M, strategy: t.strategy, prime: t.prime, slots: t.slots.slice(), count: t.count }; };

  /* Insert: probe until an EMPTY or DELETED slot (DELETED is free for insert).
   * Returns { table, path: [slot...], index, probes } — the table is a new object. */
  H.insert = function (t, k) {
    var nt = H.clone(t), path = [];
    for (var i = 0; i < t.M; i++) {
      var s = H.probe(t.strategy, k, i, t.M, t.prime);
      path.push(s);
      if (nt.slots[s] === EMPTY || nt.slots[s] === DELETED) {
        nt.slots[s] = k; nt.count++;
        return { table: nt, path: path, index: s, probes: path.length };
      }
      if (nt.slots[s] === k) return { table: nt, path: path, index: s, probes: path.length, duplicate: true };
    }
    return { table: nt, path: path, index: null, probes: path.length, full: true };
  };
  /* Search: probe until the key or an EMPTY slot (DELETED counts as occupied for search). */
  H.search = function (t, k) {
    var path = [];
    for (var i = 0; i < t.M; i++) {
      var s = H.probe(t.strategy, k, i, t.M, t.prime);
      path.push(s);
      if (t.slots[s] === k) return { found: true, index: s, path: path, probes: path.length };
      if (t.slots[s] === EMPTY) return { found: false, index: null, path: path, probes: path.length, stoppedAt: s };
    }
    return { found: false, index: null, path: path, probes: path.length };
  };
  /* Delete. lazy=true marks DELETED (correct); lazy=false empties the slot (breaks probe chains). */
  H.remove = function (t, k, lazy) {
    var r = H.search(t, k), nt = H.clone(t);
    if (r.found) { nt.slots[r.index] = lazy ? DELETED : EMPTY; nt.count--; }
    return { table: nt, found: r.found, index: r.index, path: r.path };
  };
  H.build = function (keys, M, strategy, prime) {
    var t = H.create(M, strategy, prime), total = 0, paths = [];
    keys.forEach(function (k) { var r = H.insert(t, k); t = r.table; total += r.probes; paths.push(r); });
    return { table: t, totalProbes: total, inserts: paths };
  };
  /* Primary clustering: lengths of runs of occupied slots (wrapping ignored). */
  H.clusters = function (t) {
    var runs = [], cur = 0;
    t.slots.forEach(function (s) { if (s !== EMPTY) cur++; else { if (cur) runs.push(cur); cur = 0; } });
    if (cur) runs.push(cur);
    return runs;
  };
  H.loadFactor = function (n, M) { return n / M; };

  /* ---------- chaining ---------- */
  H.chainBuild = function (keys, M, moveToFront) {
    var buckets = []; for (var i = 0; i < M; i++) buckets.push([]);
    keys.forEach(function (k) { buckets[H.h1(k, M)].push(k); });
    return { M: M, buckets: buckets, mtf: !!moveToFront };
  };
  /* Search a chain: compares until found. With move-to-front, a found key moves to the head. */
  H.chainSearch = function (c, k) {
    var b = c.buckets[H.h1(k, c.M)], cmp = 0;
    for (var i = 0; i < b.length; i++) {
      cmp++;
      if (b[i] === k) {
        if (c.mtf && i > 0) { b.splice(i, 1); b.unshift(k); }
        return { found: true, bucket: H.h1(k, c.M), compares: cmp, position: i };
      }
    }
    return { found: false, bucket: H.h1(k, c.M), compares: cmp };
  };

  /* ---------- distributions ---------- */
  H.hashFns = {
    mod: { label: 'k mod M', f: function (k, M) { return mod(k, M); } },
    lastDigit: { label: 'last digit (k mod 10), then mod M', f: function (k, M) { return mod(mod(k, 10), M); } },
    digitSum: { label: 'sum of digits mod M', f: function (k, M) { var s = 0, x = Math.abs(k); while (x) { s += x % 10; x = Math.floor(x / 10); } return mod(s, M); } }
  };
  H.distribution = function (keys, M, fnId) {
    var f = H.hashFns[fnId || 'mod'].f, counts = [];
    for (var i = 0; i < M; i++) counts.push(0);
    keys.forEach(function (k) { counts[f(k, M)]++; });
    var max = Math.max.apply(null, counts.concat([0])), used = counts.filter(function (c) { return c > 0; }).length;
    return { counts: counts, max: max, used: used, collisions: keys.length - used };
  };
  /* Birthday paradox: chance that at least two of n people share one of d days. */
  H.birthday = function (n, d) {
    d = d || 365;
    if (n > d) return 1;
    var p = 1; for (var i = 0; i < n; i++) p *= (d - i) / d;
    return 1 - p;
  };
  H.keySets = {
    random: function (n, seed, max) { var r = E.rng(seed), out = [], used = {}; while (out.length < n) { var k = E.randInt(r, 1, max || 99); if (!used[k]) { used[k] = 1; out.push(k); } } return out; },
    multiples7: function (n) { var out = []; for (var i = 1; i <= n; i++) out.push(7 * i); return out; },
    sameLastDigit: function (n, seed) { var r = E.rng(seed), out = [], used = {}; while (out.length < n) { var k = E.randInt(r, 1, 30) * 10 + 3; if (!used[k]) { used[k] = 1; out.push(k); } } return out; }
  };

  /* ---------- Unit 10: the lecture's HT-GET and HT-ADD, step by step ----------
   * codes: { KEY: sxhash code } — SXHASH values are implementation-specific,
   * so the labs state them; these reproduce the lecture's printed slots. */
  H.htGetTrace = function (slots, key, code) {
    var size = slots.length, h1 = code % size, steps = [];
    for (var i = 0; ; i++) {
      var h = (h1 + i) % size, item = slots[h];
      if (item === null || i === size) { steps.push({ i: i, h: h, item: item, stop: i === size ? 'full' : 'nil' }); return { steps: steps, value: null, index: null }; }
      if (item.k === key) { steps.push({ i: i, h: h, item: item, stop: 'found' }); return { steps: steps, value: item.v, index: h }; }
      steps.push({ i: i, h: h, item: item, stop: null });
    }
  };
  /* HT-ADD's ADD-ITEM: start at code mod size, step by 1 to the first NIL. */
  H.htAddItem = function (slots, key, value, code) {
    var size = slots.length, path = [], i = code % size;
    while (slots[i] !== null) { path.push(i); i = (i + 1) % size; }
    path.push(i);
    var ns = slots.slice(); ns[i] = { k: key, v: value };
    return { slots: ns, index: i, path: path };
  };
  /* Full HT-ADD: grow to the next power of 2 when count = size, re-add old items in slot order. */
  H.htAdd = function (state, key, value, codes) {
    var slots = state.slots, count = state.count, size = slots.length, grew = null;
    if (count === size) {
      var newSize = Math.pow(2, Math.ceil(Math.log2(count + 1)));
      var fresh = []; for (var j = 0; j < newSize; j++) fresh.push(null);
      var moves = [];
      slots.forEach(function (it, oldIndex) {
        if (!it) return;
        var r = H.htAddItem(fresh, it.k, it.v, codes[it.k]);
        moves.push({ key: it.k, from: oldIndex, to: r.index, path: r.path });
        fresh = r.slots;
      });
      grew = { from: size, to: newSize, moves: moves };
      slots = fresh;
    }
    var r2 = H.htAddItem(slots, key, value, codes[key]);
    return { slots: r2.slots, count: count + 1, index: r2.index, path: r2.path, grew: grew };
  };
  H.htCreate = function (kvs, size, codes) {
    var st = { slots: [], count: 0 };
    for (var i = 0; i < size; i++) st.slots.push(null);
    kvs.forEach(function (kv) { var r = H.htAdd(st, kv[0], kv[1], codes); st = { slots: r.slots, count: r.count }; });
    return st;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
