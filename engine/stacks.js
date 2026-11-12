/* CPS305 Quest — engine/stacks.js
 * Unit 8: stacks, queues, deques, sets, association lists. Pure functions.
 * Each mirrors the lecture's Lisp (PAR-CHECKER, the circular-buffer QUEUE,
 * the two-stack DEQUE, INSERT-SET / REMOVE-SET / SUBSET-SET, ASSOC).
 */
(function (root) {
  'use strict';
  var E = root.CQ.engine;
  var S = E.stacks = {};

  /* PAR-CHECKER: push each [, pop on each ] (fail if the stack is empty),
   * fail on any other symbol; balanced iff the stack is empty at the end. */
  S.parChecker = function (symbols) {
    var stack = [], steps = [];
    for (var i = 0; i < symbols.length; i++) {
      var sym = symbols[i];
      if (sym === '[') { stack.push('['); steps.push({ i: i, sym: sym, action: 'push', stack: stack.slice() }); }
      else if (sym === ']') {
        if (!stack.length) { steps.push({ i: i, sym: sym, action: 'failEmpty', stack: [] }); return { steps: steps, result: false, reason: 'empty' }; }
        stack.pop(); steps.push({ i: i, sym: sym, action: 'pop', stack: stack.slice() });
      } else { steps.push({ i: i, sym: sym, action: 'failInvalid', stack: stack.slice() }); return { steps: steps, result: false, reason: 'invalid' }; }
    }
    return { steps: steps, result: stack.length === 0, reason: stack.length ? 'leftover' : 'ok', finalStack: stack.slice() };
  };
  S.bracketSets = {
    1: [['[', '[', ']', ']'], ['[', ']', ']'], ['[', '[', ']']],
    2: [['[', ']', '[', '[', ']', ']'], ['[', '[', ']', ']', ']', '['], ['[', 'x', ']'], [']', '[', ']']],
    3: [['[', '[', '[', ']', '[', ']', ']', ']'], ['[', '[', ']', '[', ']', ']', ']', '['], ['[', '[', '(', ']', ']'], ['[', ']', '[', ']', '[']]
  };

  /* Monotonic (increasing) stack: before pushing x, pop every top element > x.
   * The lecture's example: pushing 3 onto 1, 2, 5, 7 pops 7 and 5. */
  S.monoPush = function (stack, x) {
    var s = stack.slice(), popped = [];
    while (s.length && s[s.length - 1] > x) popped.push(s.pop());
    s.push(x);
    return { stack: s, popped: popped };
  };

  /* Circular buffer QUEUE (lecture): data array of *size*, head, tail, count.
   * ENQUEUE writes at tail then moves tail (wrapping to 0 after size−1);
   * DEQUEUE reads at head then moves head the same way. */
  S.ringCreate = function (size) { var d = []; for (var i = 0; i < size; i++) d.push(null); return { data: d, head: 0, tail: 0, count: 0, size: size }; };
  S.ringOp = function (q, op, x) {
    var n = { data: q.data.slice(), head: q.head, tail: q.tail, count: q.count, size: q.size };
    if (op === 'enqueue') {
      if (n.count === n.size) return { q: n, full: true, slot: null };
      n.count++; n.data[n.tail] = x;
      var slot = n.tail;
      n.tail = n.tail === n.size - 1 ? 0 : n.tail + 1;
      return { q: n, slot: slot, wrapped: n.tail === 0 };
    }
    if (n.count === 0) return { q: n, empty: true, slot: null };
    n.count--;
    var at = n.head, v = n.data[at];
    // Like the lecture's DEQUEUE, the old value stays in the array: the slot is free, not cleared.
    n.head = n.head === n.size - 1 ? 0 : n.head + 1;
    return { q: n, slot: at, value: v, wrapped: n.head === 0 };
  };
  /* A plain array queue: dequeue shifts every remaining element left. */
  S.shiftQueueOp = function (arr, op, x) {
    var a = arr.slice();
    if (op === 'enqueue') { a.push(x); return { arr: a, moves: 0 }; }
    var v = a.shift();
    return { arr: a, moves: a.length, value: v };
  };
  S.ringScript = function (size, seed) {
    var r = E.rng(seed), ops = [], count = 0, next = 1;
    for (var i = 0; i < size * 2 + 2; i++) {
      var enq = count === 0 || (count < size && r() < 0.6);
      if (enq) { ops.push({ op: 'enqueue', x: next++ }); count++; } else { ops.push({ op: 'dequeue' }); count--; }
    }
    return ops;
  };

  /* Deque from two stacks (lecture): push-front / push-back push onto their
   * stacks; popping from an empty side first moves everything across (reversing it). */
  S.dequeOp = function (dq, op, x) {
    var f = dq.front.slice(), b = dq.back.slice(), moved = 0, v;
    if (op === 'pushFront') f.push(x);
    else if (op === 'pushBack') b.push(x);
    else if (op === 'popFront') { if (!f.length) { while (b.length) { f.push(b.pop()); moved++; } } v = f.pop(); }
    else if (op === 'popBack') { if (!b.length) { while (f.length) { b.push(f.pop()); moved++; } } v = b.pop(); }
    return { dq: { front: f, back: b }, moved: moved, value: v };
  };

  /* Sets as lists. MEMBER scans from the front: count its comparisons. */
  S.member = function (x, list) { for (var i = 0; i < list.length; i++) if (list[i] === x) return { found: true, scans: i + 1, tail: list.slice(i) }; return { found: false, scans: list.length, tail: null }; };
  S.insertSet = function (x, set) { var m = S.member(x, set); return { set: m.found ? set : [x].concat(set), scans: m.scans }; };
  S.union = function (a, b) { var out = b.slice(), scans = 0; a.forEach(function (x) { var m = S.member(x, out); scans += m.scans; if (!m.found) out.unshift(x); }); return { set: out, scans: scans }; };
  S.intersection = function (a, b) { var out = [], scans = 0; a.forEach(function (x) { var m = S.member(x, b); scans += m.scans; if (m.found) out.push(x); }); return { set: out, scans: scans }; };
  S.difference = function (a, b) { var out = [], scans = 0; a.forEach(function (x) { var m = S.member(x, b); scans += m.scans; if (!m.found) out.push(x); }); return { set: out, scans: scans }; };
  S.subset = function (a, b) { var scans = 0; for (var i = 0; i < a.length; i++) { var m = S.member(a[i], b); scans += m.scans; if (!m.found) return { result: false, scans: scans }; } return { result: true, scans: scans }; };
  /* ASSOC walks the a-list comparing keys. */
  S.assocScans = function (key, alist) { for (var i = 0; i < alist.length; i++) if (alist[i][0] === key) return { found: true, scans: i + 1 }; return { found: false, scans: alist.length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);
