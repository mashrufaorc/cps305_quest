/* CPS305 Quest — engine/choose.js
 * Unit 0 and "Pick the Right Structure". A structure's efficiency can't be
 * judged apart from its operations: each scenario is a mix of operations, each
 * structure has a cost class per operation (from the lectures), and the engine
 * totals the cost at a given n. Unsupported operations rule a structure out.
 */
(function (root) {
  'use strict';
  var E = root.CQ.engine, B = E.bigo;
  var C = E.choose = {};

  /* Cost class per operation (B.cls ids); missing = not supported by that structure. */
  C.structures = {
    array: { name: 'Dynamic array', costs: { push: '1', pop: '1', insertAtRef: 'n', index: '1', prepend: 'n', append: '1', insertMiddle: 'n', removeFront: 'n', removeBack: '1', lookupKey: 'n', membership: 'n', iterate: 'n' } },
    list: { name: 'Linked list (head + tail refs)', costs: { push: '1', pop: '1', insertAtRef: '1', index: 'n', prepend: '1', append: '1', insertMiddle: 'n', removeFront: '1', removeBack: 'n', lookupKey: 'n', membership: 'n', iterate: 'n' } },
    ring: { name: 'Circular buffer', costs: { index: '1', append: '1', removeFront: '1', iterate: 'n' } },
    hash: { name: 'Hash table', costs: { lookupKey: '1', membership: '1', insertKey: '1', removeKey: '1', iterate: 'n' } },
    sorted: { name: 'Sorted array', costs: { index: '1', lookupKey: 'logn', membership: 'logn', insertKey: 'n', removeKey: 'n', iterate: 'n', rangeQuery: 'logn' } },
    tree: { name: 'Tree', costs: { parentChild: '1', iterate: 'n', hierarchy: '1' } }
  };
  C.opNames = { push: 'push on top', pop: 'pop from the top', insertAtRef: 'insert at a position you already hold', index: 'read by index', prepend: 'add at the front', append: 'add at the back', insertMiddle: 'insert in the middle', removeFront: 'remove from the front', removeBack: 'remove from the back', lookupKey: 'look up by key', membership: 'membership test', insertKey: 'insert a key', removeKey: 'remove a key', iterate: 'visit everything', rangeQuery: 'find in sorted order', parentChild: 'follow parent/child links', hierarchy: 'model a hierarchy' };

  /* Total cost of a scenario (ops: { op: count }) for one structure at size n. */
  C.cost = function (structureId, ops, n) {
    var s = C.structures[structureId], total = 0, missing = [];
    Object.keys(ops).forEach(function (op) {
      var cls = s.costs[op];
      if (!cls) { missing.push(op); return; }
      total += ops[op] * B.cls[cls].f(n);
    });
    return { total: missing.length ? Infinity : total, missing: missing };
  };
  /* All structures ranked; best = every structure tied at the minimum. */
  C.rank = function (ops, n, candidates) {
    var ids = candidates || Object.keys(C.structures);
    var rows = ids.map(function (id) { var c = C.cost(id, ops, n); return { id: id, name: C.structures[id].name, total: c.total, missing: c.missing }; });
    rows.sort(function (a, b) { return a.total - b.total; });
    var min = rows[0].total;
    return { rows: rows, best: rows.filter(function (r) { return r.total === min; }).map(function (r) { return r.id; }) };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
