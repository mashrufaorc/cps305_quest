/* CPS305 Quest — engine/trees.js
 * Unit 11. Pure functions, no DOM.
 * Generic tree nodes: { id, label, children: [] } (binary trees keep a left/right
 * slot with null for a missing child). Traversal step generators expose the
 * call stack (depth-first) or the queue (breadth-first). Terminology follows
 * the lecture: level = 1 + edges to the root, depth = edges from the root,
 * node height = edges on the longest path down to a leaf, tree height = root's.
 */
(function (root) {
  'use strict';
  var E = root.CQ.engine;
  var T = E.trees = {};

  var idc = 0;
  function node(label, children) { return { id: 't' + (++idc), label: String(label), children: children || [] }; }
  T.node = node;

  /* The lecture's binary sample tree *bt*. Binary nodes have exactly two child slots. */
  T.sampleBinary = function () {
    function b(k, l, r) { var n = node(k, [l || null, r || null]); n.binary = true; return n; }
    return b(8, b(3, b(1), b(6, b(4), b(7))), b(10, null, b(14, b(13))));
  };
  /* The lecture's list-of-lists tree '(* (e (f)) (+ (d) (max (a) (b) (c)))). */
  T.fromLists = function (x) {
    // x: nested JS arrays [label, child...]
    return node(String(x[0]).toUpperCase(), x.slice(1).map(T.fromLists));
  };
  T.sampleNary = function () { return T.fromLists(['*', ['e', ['f']], ['+', ['d'], ['max', ['a'], ['b'], ['c']]]]); };
  T.sampleTerms = function () { return T.fromLists(['A', ['B', ['E'], ['F']], ['C', ['G']], ['D']]); };
  T.toListString = function (n) { return '(' + n.label + (n.children.filter(Boolean).length ? ' ' + n.children.filter(Boolean).map(T.toListString).join(' ') : '') + ')'; };
  T.kids = function (n) { return (n.children || []).filter(Boolean); };

  /* Random binary tree of n nodes with distinct keys (for practice tiers). */
  T.randomBinary = function (n, seed) {
    var r = E.rng(seed), keys = E.shuffle(Array.from({ length: n }, function (_, i) { return i + 1; }), r);
    var rootN = null;
    keys.forEach(function (k) {
      var nn = node(k, [null, null]); nn.binary = true;
      if (!rootN) { rootN = nn; return; }
      var p = rootN;
      for (;;) { var side = r() < 0.5 ? 0 : 1; if (!p.children[side]) { p.children[side] = nn; break; } p = p.children[side]; }
    });
    return rootN;
  };

  /* ---------- terminology ---------- */
  T.index = function (rootN) {
    var info = {};
    (function walk(n, parent, depth) {
      info[n.id] = { node: n, parent: parent, depth: depth, level: depth + 1 };
      T.kids(n).forEach(function (c) { walk(c, n, depth + 1); });
    })(rootN, null, 0);
    function height(n) { var k = T.kids(n); return k.length ? 1 + Math.max.apply(null, k.map(height)) : 0; }
    Object.keys(info).forEach(function (id) {
      var x = info[id], n = x.node;
      x.height = height(n);
      x.degree = T.kids(n).length;
      x.leaf = x.degree === 0;
      x.siblings = x.parent ? T.kids(x.parent).filter(function (c) { return c !== n; }).map(function (c) { return c.id; }) : [];
      var anc = [], p = x.parent; while (p) { anc.push(p.id); p = info[p.id].parent; }
      x.ancestors = anc;
      var desc = []; (function d(m) { T.kids(m).forEach(function (c) { desc.push(c.id); d(c); }); })(n);
      x.descendants = desc;
    });
    info.treeHeight = height(rootN);
    return info;
  };
  T.flat = function (rootN) { var out = []; (function w(n) { out.push(n); T.kids(n).forEach(w); })(rootN); return out; };

  /* ---------- traversals ---------- */
  /* Returns the visit order and, for each visit, the call stack (DFS) or queue (BFS). */
  T.traverse = function (rootN, order) {
    var visits = [];
    if (order === 'level') {
      var queue = [rootN];
      while (queue.length) {
        var n = queue.shift();
        T.kids(n).forEach(function (c) { queue.push(c); });
        visits.push({ id: n.id, label: n.label, queue: queue.map(function (q) { return q.label; }) });
      }
      return visits;
    }
    if (order === 'in' && !T.isBinary(rootN)) throw new Error('In-order is only defined for binary trees');
    var stack = [];
    (function go(n) {
      if (!n) return;
      stack.push(n.label);
      var c = n.children || [];
      if (order === 'pre') visits.push({ id: n.id, label: n.label, stack: stack.slice() });
      if (order === 'in' || order === 'post') go(c[0]); else T.kids(n).forEach(go);
      if (order === 'in') { visits.push({ id: n.id, label: n.label, stack: stack.slice() }); go(c[1]); }
      if (order === 'post') { if (n.binary) go(c[1]); else T.kids(n).slice(1).forEach(go); visits.push({ id: n.id, label: n.label, stack: stack.slice() }); }
      stack.pop();
    })(rootN);
    return visits;
  };
  /* In-order needs a left/right distinction, which only binary nodes have. */
  T.isBinary = function (rootN) { return T.flat(rootN).every(function (n) { return n.binary === true; }); };

  /* ---------- parse trees ---------- */
  /* Parse an infix expression of numbers, + - * / and parentheses into a tree
   * (the usual precedence: * and / bind tighter; operators are left-associative). */
  /* Each node records span = [start, end) in the whitespace-free source, and
   * operators record pos (their index), so games can show the original text. */
  T.parse = function (src) {
    var s = String(src).replace(/\s+/g, ''), toks = [], m, re = /\d+|[()+\-*/]/g, p = 0;
    while ((m = re.exec(s))) toks.push({ t: m[0], at: m.index });
    function bin(op, l, r) { var n = node(op.t, [l, r]); n.pos = op.at; n.span = [l.span[0], r.span[1]]; return n; }
    function expr() { var l = term(); while (toks[p] && (toks[p].t === '+' || toks[p].t === '-')) { var op = toks[p++]; l = bin(op, l, term()); } return l; }
    function term() { var l = factor(); while (toks[p] && (toks[p].t === '*' || toks[p].t === '/')) { var op = toks[p++]; l = bin(op, l, factor()); } return l; }
    function factor() {
      var tk = toks[p++];
      if (!tk) throw new Error('Unexpected end');
      if (tk.t === '(') { var e = expr(); var close = toks[p++]; if (!close || close.t !== ')') throw new Error('Missing )'); e.span = [tk.at, close.at + 1]; return e; }
      if (/^\d+$/.test(tk.t)) { var n = node(tk.t, []); n.span = [tk.at, tk.at + tk.t.length]; return n; }
      throw new Error('Unexpected ' + tk.t);
    }
    var tree = expr();
    if (p !== toks.length) throw new Error('Unexpected ' + toks[p]);
    return tree;
  };
  /* The operator at the root of an expression string (what the player taps first). */
  T.rootOp = function (src) { var t = T.parse(src); return T.kids(t).length ? t.label : null; };
  T.toPrefix = function (n) { return T.kids(n).length ? '(' + n.label + ' ' + T.kids(n).map(T.toPrefix).join(' ') + ')' : n.label; };
  T.toInfix = function (n, top) { if (!T.kids(n).length) return n.label; var s = T.toInfix(n.children[0]) + n.label + T.toInfix(n.children[1]); return top ? s : '(' + s + ')'; };
  T.evalNode = function (n) {
    if (!T.kids(n).length) return Number(n.label);
    var a = T.evalNode(n.children[0]), b = T.evalNode(n.children[1]);
    return n.label === '+' ? a + b : n.label === '-' ? a - b : n.label === '*' ? a * b : a / b;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
