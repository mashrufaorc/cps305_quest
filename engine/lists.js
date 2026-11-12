/* CPS305 Quest — engine/lists.js
 * Unit 3 (and Unit 8): a pointer-level model of a singly linked list, used to
 * referee Pointer Surgery. Pure functions, no DOM.
 *   state: { nodes: { id: { data, next } }, head: id|null }
 *   move:  { from: 'head' | id   (the pointer being changed: HEAD or node.next),
 *            to: id | null }     (what it should point to)
 * A move that leaves a list node unreachable ORPHANS it: with no reference,
 * the node (and everything after it) is lost.
 */
(function (root) {
  'use strict';
  var E = root.CQ.engine;
  var LL = E.lists = {};

  LL.fromArray = function (values, prefix) {
    var nodes = {}, ids = values.map(function (v, i) { return (prefix || 'n') + i; });
    ids.forEach(function (id, i) { nodes[id] = { data: values[i], next: i + 1 < ids.length ? ids[i + 1] : null }; });
    return { nodes: nodes, head: ids.length ? ids[0] : null };
  };
  LL.clone = function (s) {
    var nodes = {};
    Object.keys(s.nodes).forEach(function (k) { nodes[k] = { data: s.nodes[k].data, next: s.nodes[k].next }; });
    return { nodes: nodes, head: s.head };
  };
  /* Walk from HEAD: the ids in list order (stops on a cycle). */
  LL.walk = function (s) {
    var out = [], seen = {}, p = s.head;
    while (p != null && !seen[p]) { seen[p] = true; out.push(p); p = s.nodes[p].next; }
    return out;
  };
  LL.values = function (s) { return LL.walk(s).map(function (id) { return s.nodes[id].data; }); };
  LL.hasCycle = function (s) {
    var seen = {}, p = s.head;
    while (p != null) { if (seen[p]) return true; seen[p] = true; p = s.nodes[p].next; }
    return false;
  };
  LL.apply = function (s, move) {
    var n = LL.clone(s);
    if (move.from === 'head') n.head = move.to; else n.nodes[move.from].next = move.to;
    return n;
  };

  /* Tasks. Each returns { start, goal (values in order), removed: [ids allowed to be lost], fresh: [new ids], optimal: moves } */
  LL.task = function (kind, values, opts) {
    opts = opts || {};
    var s = LL.fromArray(values), ids = LL.walk(s), x = opts.x != null ? opts.x : 99;
    if (kind === 'prepend') {
      s.nodes.new = { data: x, next: null };
      return { start: s, goal: [x].concat(values), removed: [], fresh: ['new'], optimal: 2, kind: kind };
    }
    if (kind === 'insert') {
      var at = opts.after != null ? opts.after : 1;
      s.nodes.new = { data: x, next: null };
      var g = values.slice(); g.splice(at + 1, 0, x);
      return { start: s, goal: g, removed: [], fresh: ['new'], optimal: 2, kind: kind, after: ids[at] };
    }
    if (kind === 'remove') {
      var k = opts.index != null ? opts.index : 2;
      var g2 = values.slice(); g2.splice(k, 1);
      return { start: s, goal: g2, removed: [ids[k]], fresh: [], optimal: 1, kind: kind, target: ids[k] };
    }
    if (kind === 'append') {
      s.nodes.new = { data: x, next: null };
      return { start: s, goal: values.concat([x]), removed: [], fresh: ['new'], optimal: 1, kind: kind };
    }
    throw new Error('Unknown task ' + kind);
  };

  /* Referee one move. ok=false with code 'orphan' if list nodes become unreachable
   * (and are not the ones being removed), 'cycle' for a loop. */
  LL.check = function (task, s, move) {
    var before = LL.walk(s), n = LL.apply(s, move);
    if (LL.hasCycle(n)) return { ok: false, code: 'list.cycle', state: n, data: {} };
    var after = LL.walk(n), lost = before.filter(function (id) { return after.indexOf(id) < 0 && task.removed.indexOf(id) < 0; });
    if (lost.length) return { ok: false, code: 'list.orphan', state: n, lost: lost, data: { lost: lost.map(function (id) { return n.nodes[id].data; }).join(', ') } };
    return { ok: true, state: n, done: LL.done(task, n) };
  };
  LL.done = function (task, s) {
    var v = LL.values(s);
    return v.length === task.goal.length && v.every(function (x, i) { return x === task.goal[i]; });
  };

  /* Access cost: array index is one address computation; a list walks i links. */
  LL.accessCost = function (structure, i) { return structure === 'array' ? 1 : i + 1; };
  /* Prepend cost: array shifts every element (and may reallocate); list changes 2 references. */
  LL.prependArray = function (values, capacity) {
    var frames = [], a = values.slice(), shifts = 0, copies = 0;
    if (a.length >= capacity) { copies = a.length; frames.push({ arr: a.slice(), msg: 'Full! Allocate a bigger array and copy all ' + a.length + ' elements.', copies: copies, shifts: 0 }); }
    for (var i = a.length - 1; i >= 0; i--) {
      a[i + 1] = a[i]; shifts++;
      frames.push({ arr: a.slice(), msg: 'Shift ' + a[i] + ' from index ' + i + ' to ' + (i + 1) + '.', shifts: shifts, copies: copies, hole: i });
    }
    return { frames: frames, shifts: shifts, copies: copies };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
