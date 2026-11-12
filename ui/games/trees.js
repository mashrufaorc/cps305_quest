/* CPS305 Quest — ui/games/trees.js
 * Unit 11: Traversal Trail (click in order), Terminology Tagging, Build the
 * Parse Tree, Tree to Lists. Answers from engine/trees.js.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, TR = E.trees, G = CQ.games, h = U.h;

  function getTree(kind, ctx) {
    if (kind === 'binary') return TR.sampleBinary();
    if (kind === 'nary') return TR.sampleNary();
    if (kind === 'terms') return TR.sampleTerms();
    return TR.randomBinary(ctx ? ctx.size || 9 : 9, ctx ? ctx.seed : 1);
  }
  /* treeView needs every child present; binary null slots become hidden placeholders. */
  function viewTree(n) {
    var kids = (n.children || []).map(function (c, i) { return c ? viewTree(c) : (n.binary ? { id: n.id + '_e' + i, label: '', children: [], hidden: true } : null); }).filter(Boolean);
    return { id: n.id, label: n.label, children: kids, src: n };
  }
  function mapIds(vt, fn) { (function w(x) { fn(x); x.children.forEach(w); })(vt); }

  /* ---------- Traversal Trail ---------- */
  G.trailTask = function (el, opts) {
    var unit = opts.unit, T = unit.templates, tree = opts.tree, order = opts.order;
    var visits = TR.traverse(tree, order), k = 0, misses = 0, hints = 0, visited = {};
    var p = h('p.prompt', { 'aria-live': 'polite' }); p.appendChild(U.rich(U.fmt(T.trailPrompt, { order: T.orderNames[order] }))); el.appendChild(p);
    var cols = h('div.rec-cols'); el.appendChild(cols);
    var left = h('div'), right = h('div'); cols.appendChild(left); cols.appendChild(right);
    var vt = viewTree(tree);
    var tv = U.treeView(left, { label: 'Tree', nodeW: 46, onPick: pick, selectable: function (x) { return !x.hidden && !visited[x.id] && k < visits.length; } });
    var side = h('div'); right.appendChild(side);
    var out = h('p.status', { 'aria-live': 'polite' }); right.appendChild(out);
    var code = order === 'level' ? unit.lisp.level : order === 'pre' ? unit.lisp.btPre : order === 'in' ? unit.lisp.btIn : unit.lisp.btPost;
    U.codePanel(right, { code: code.code, title: code.title });
    var tools = h('div.tools'); el.appendChild(tools);
    var fb = U.feedback(el);
    if (opts.hints) tools.appendChild(U.button('Why?', function () { hints++; fb.show({ info: true, title: 'Rule', why: U.fmt(T.trailWrong[order], { exp: visits[k].label }) }); }));
    function drawSide() {
      U.clear(side);
      var v = visits[k - 1];
      if (order === 'level') {
        side.appendChild(h('p.small', null, 'Queue (front → back) after the last visit:'));
        side.appendChild(h('p.plainq', null, v ? (v.queue.length ? v.queue.join(' ← ') : '(empty)') : '(' + tree.label + ')'));
      } else {
        side.appendChild(h('p.small', null, 'Call stack at the last visit (bottom → top):'));
        side.appendChild(h('p.plainq', null, v ? v.stack.join(' → ') : '(empty)'));
      }
    }
    function draw(bad) {
      mapIds(vt, function (x) { x.state = visited[x.id] ? 'done' : bad === x.id ? 'bad' : null; x.badge = visited[x.id] ? '#' + visited[x.id] : null; });
      tv.render(vt);
      out.textContent = 'Visited: ' + visits.slice(0, k).map(function (v) { return v.label; }).join(' ');
      drawSide();
    }
    function pick(x) {
      var exp = visits[k];
      if (x.id === exp.id) {
        CQ.store.record(order === 'level' ? 'bfs' : 'dfs', true, true);
        k++; visited[x.id] = k; fb.hide();
        draw();
        if (k >= visits.length) { U.clear(tools); fb.show({ ok: true, title: 'Complete', why: 'Order: ' + visits.map(function (v) { return v.label; }).join(' ') }); opts.onDone({ misses: misses, hints: hints, summary: order + '-order: ' + visits.map(function (v) { return v.label; }).join(' ') }); }
        else setTimeout(function () { tv.focus(); }, 20);
      } else {
        misses++; CQ.store.record(order === 'level' ? 'bfs' : 'dfs', false, true);
        if (opts.gameId) CQ.store.noteMiss(opts.gameId, order === 'level' ? 'bfs' : 'dfs');
        draw(x.id);
        fb.show({ ok: false, title: 'Not ' + x.label + ' yet', why: U.fmt(T.trailWrong[order], { exp: exp.label }), misconception: null });
      }
    }
    draw();
    setTimeout(function () { tv.focus(); }, 50);
  };

  function trail(el, ctx) {
    var L0 = ctx.level, T = ctx.unit.templates, orders = L0.orders, k = 0, misses = 0, hints = 0;
    var area = h('div'); el.appendChild(area);
    function next() {
      U.clear(area);
      if (k >= orders.length) {
        if (L0.askIn) {
          var q = G.choiceQ({ id: 'in-nary', concept: 'dfs', seed: ctx.seed, prompt: T.inQ.prompt, misconception: T.inQ.misconception, options: [
            { text: 'No: in-order is for binary trees', ok: true, why: T.inQ.ok }, { text: 'Yes: left children, root, right children', misconception: true, why: T.inQ.bad }
          ] });
          return U.question(area, q, { onResult: function (c, ft) { if (!ft) misses++; done(); } });
        }
        return done();
      }
      var tree = getTree(L0.tree, ctx);
      area.appendChild(h('h3', null, 'Order ' + (k + 1) + ' of ' + orders.length + ': ' + T.orderNames[orders[k]]));
      G.trailTask(area, { unit: ctx.unit, tree: tree, order: orders[k], hints: ctx.hints, gameId: ctx.gameId, onDone: function (r) {
        misses += r.misses; hints += r.hints; k++;
        G.continueBtn(area, k < orders.length || L0.askIn ? 'Next' : 'Finish', next);
      } });
    }
    function done() { CQ.store.noteRound(ctx.gameId, misses === 0 && hints === 0); G.continueBtn(area, 'Finish level', function () { ctx.complete({ stars: G.stars(hints, misses === 0), summary: orders.length + ' traversals, ' + misses + ' slip(s).' }); }); }
    next();
  }

  /* ---------- Terminology Tagging ---------- */
  function tags(el, ctx) {
    var tree = getTree(ctx.level.tree, ctx), ix = TR.index(tree), nodes = TR.flat(tree);
    var vt = viewTree(tree), r = E.rng(ctx.seed);
    var byLabel = {}; nodes.forEach(function (n) { byLabel[n.id] = n.label; });
    var inner = nodes.filter(function (n) { return !ix[n.id].leaf && ix[n.id].parent; });
    var withSib = nodes.filter(function (n) { return ix[n.id].siblings.length; });
    var deep = nodes.filter(function (n) { return ix[n.id].depth >= 2; });
    var gens = [
      function () { var n = withSib[E.randInt(r, 0, withSib.length - 1)]; return { kind: 'tap', prompt: 'Tap every **sibling** of ' + n.label + '.', answer: ix[n.id].siblings, why: 'Siblings share a parent (' + ix[n.id].parent.label + ').' , concept: 'terminology' }; },
      function () { return { kind: 'tap', prompt: 'Tap every **leaf**.', answer: nodes.filter(function (n) { return ix[n.id].leaf; }).map(function (n) { return n.id; }), why: 'Leaves have no children (degree 0).', concept: 'terminology' }; },
      function () { var n = deep[E.randInt(r, 0, deep.length - 1)]; return { kind: 'tap', prompt: 'Tap every **ancestor** of ' + n.label + '.', answer: ix[n.id].ancestors, why: 'Ancestors are on the path from ' + n.label + ' up to the root.', concept: 'terminology' }; },
      function () { var n = deep[E.randInt(r, 0, deep.length - 1)], d = ix[n.id].depth; return { kind: 'num', prompt: 'What is the **depth** of ' + n.label + '?', answer: d, alts: [d + 1, d - 1, ix[n.id].height], why: 'Depth = edges from the root to ' + n.label + ': ' + d + '. (Its level is ' + (d + 1) + '.)', misconception: 'Depth and level are the same.', concept: 'depth-level-height' }; },
      function () { var n = deep[E.randInt(r, 0, deep.length - 1)], l = ix[n.id].level; return { kind: 'num', prompt: 'What is the **level** of ' + n.label + '?', answer: l, alts: [l - 1, l + 1], why: 'Level = 1 + edges to the root: ' + l + ' (depth ' + (l - 1) + ').', concept: 'depth-level-height' }; },
      function () { return { kind: 'num', prompt: 'What is the **height of the tree**?', answer: ix.treeHeight, alts: [ix.treeHeight + 1, nodes.length], why: 'Tree height = height of the root = edges on the longest path down to a leaf: ' + ix.treeHeight + '.', misconception: 'Height counts nodes, not edges.', concept: 'depth-level-height' }; },
      function () { var n = inner.length ? inner[E.randInt(r, 0, inner.length - 1)] : tree; return { kind: 'num', prompt: 'What is the **degree** of ' + n.label + '?', answer: ix[n.id].degree, alts: [ix[n.id].degree + 1, ix[n.id].descendants.length], why: 'Degree = number of children: ' + ix[n.id].degree + '.', concept: 'terminology' }; },
      function () { var n = inner.length ? inner[E.randInt(r, 0, inner.length - 1)] : tree; return { kind: 'num', prompt: 'What is the **height of node** ' + n.label + '?', answer: ix[n.id].height, alts: [ix[n.id].height + 1, ix[n.id].depth], why: 'Node height = edges on the longest path from ' + n.label + ' down to a leaf: ' + ix[n.id].height + '.', concept: 'depth-level-height' }; }
    ];
    var order = E.shuffle(gens.map(function (_, i) { return i; }), r).slice(0, ctx.level.count || 6);
    var k = 0, misses = 0, hints = 0;
    var tv = U.treeView(el, { label: 'Tree', nodeW: 46, onPick: function (x) { if (cur && cur.kind === 'tap') { chosen[x.id] = !chosen[x.id]; draw(); } }, selectable: function (x) { return !x.hidden && cur && cur.kind === 'tap'; } });
    var area = h('div'); el.appendChild(area);
    var cur = null, chosen = {};
    function draw(states) { mapIds(vt, function (x) { x.state = states && states[x.id] ? states[x.id] : chosen[x.id] ? 'hit' : null; x.badge = chosen[x.id] ? '✓' : null; }); tv.render(vt); }
    function next() {
      U.clear(area); chosen = {};
      if (k >= order.length) { cur = null; draw(); CQ.store.noteRound(ctx.gameId, misses === 0); return G.continueBtn(area, 'Finish level', function () { ctx.complete({ stars: G.stars(hints, misses === 0), summary: order.length + ' questions, ' + misses + ' slip(s).' }); }); }
      cur = gens[order[k]]();
      var pp = h('p.q-prompt'); pp.appendChild(U.rich(cur.prompt)); area.appendChild(pp);
      var fb;
      if (cur.kind === 'tap') {
        draw();
        area.appendChild(h('div.actions', null, U.button('Check', function () {
          var want = {}; cur.answer.forEach(function (id) { want[id] = true; });
          var ok = cur.answer.every(function (id) { return chosen[id]; }) && Object.keys(chosen).filter(function (id) { return chosen[id]; }).every(function (id) { return want[id]; });
          if (ok) { CQ.store.record(cur.concept, true, true); fb.show({ ok: true, title: 'Right', why: cur.why }); k++; G.continueBtn(area, 'Next', next); }
          else { misses++; CQ.store.record(cur.concept, false, true); var st = {}; cur.answer.forEach(function (id) { st[id] = 'ok'; }); draw(st); fb.show({ ok: false, title: 'Not quite', why: cur.why + ' The ✓-outlined nodes are the answer: ' + cur.answer.map(function (id) { return byLabel[id]; }).join(', ') + '.' }); k++; G.continueBtn(area, 'Next', next); }
        }, { cls: 'primary' })));
        if (ctx.hints) area.appendChild(h('div.tools', null, U.button('Why?', function () { hints++; fb.show({ info: true, title: 'Definition', why: cur.why.split('.')[0] + '.' }); })));
      } else {
        draw();
        var row = h('div.choices'); area.appendChild(row);
        var opts = [cur.answer].concat(cur.alts.filter(function (a) { return a !== cur.answer && a >= 0; })).filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 4);
        var tries = 0;
        E.shuffle(opts, r).forEach(function (o) {
          var b = U.button(String(o), function () {
            if (b.disabled) return;
            if (o === cur.answer) { CQ.store.record(cur.concept, true, tries === 0); b.classList.add('is-right'); fb.show({ ok: true, title: String(o), why: cur.why }); k++; G.continueBtn(area, 'Next', next); }
            else { tries++; misses++; CQ.store.record(cur.concept, false, tries === 1); b.disabled = true; b.classList.add('is-wrong'); fb.show({ ok: false, title: 'Not ' + o, why: cur.why, misconception: cur.misconception }); }
          }, { cls: 'choice' });
          row.appendChild(b);
        });
      }
      fb = U.feedback(area);
    }
    next();
  }

  /* ---------- Build the Parse Tree ---------- */
  function parse(el, ctx) {
    var T = ctx.unit.templates, exprs = ctx.level.exprs, k = 0, misses = 0;
    var area = h('div'); el.appendChild(area);
    function next() {
      U.clear(area);
      if (k >= exprs.length) { CQ.store.noteRound(ctx.gameId, misses === 0); return G.continueBtn(area, 'Finish level', function () { ctx.complete({ stars: misses === 0 ? 3 : misses < 3 ? 2 : 1, summary: exprs.length + ' expressions parsed and evaluated.' }); }); }
      var src = exprs[k], full = TR.parse(src);
      area.appendChild(h('h3', null, 'Expression ' + (k + 1) + ': ' + src));
      // Build phase: a stack of pending sub-expressions; the player picks each root operator.
      var pending = [{ node: full, slot: null }];
      var built = { id: 'b0', label: '?', children: [], sub: src };
      var map = {}; map[full.id] = built;
      var tv = U.treeView(area, { label: 'Parse tree being built', nodeW: 70 });
      var prompt = h('p.q-prompt', { 'aria-live': 'polite' }); area.appendChild(prompt);
      var row = h('div.choice-row'); area.appendChild(row);
      var fb = U.feedback(area);
      function buildStep() {
        tv.render(built);
        // next pending operator node (leaves are placed automatically)
        while (pending.length && !TR.kids(pending[0].node).length) {
          var leaf = pending.shift(); map[leaf.node.id].label = leaf.node.label; map[leaf.node.id].sub = 'leaf'; map[leaf.node.id].state = 'done';
        }
        tv.render(built);
        if (!pending.length) return evalPhase();
        // Show the original source text of this sub-expression (no added parentheses).
        var cur = pending[0], clean = src.replace(/\s+/g, ''), txt = clean.slice(cur.node.span[0], cur.node.span[1]);
        prompt.innerHTML = ''; prompt.appendChild(U.rich(U.fmt(T.parseRoot, { expr: '`' + txt + '`' })));   // code style: * in the text can't break bold markup
        U.clear(row);
        var ops = txt.split('').map(function (ch, i) { return { ch: ch, i: i }; }).filter(function (o) { return /[+\-*/]/.test(o.ch); });
        ops.forEach(function (o) {
          var b = U.button(txt.slice(0, o.i) + '[' + o.ch + ']' + txt.slice(o.i + 1), function () {
            // The engine's parse tree decides: the root is the operator at node.pos.
            if (cur.node.span[0] + o.i === cur.node.pos) {
              CQ.store.record('parse-trees', true, true);
              var bn = map[cur.node.id];
              bn.label = cur.node.label; bn.sub = 'operator';
              bn.children = cur.node.children.map(function (c) { var nb = { id: 'b' + c.id, label: '?', sub: TR.toInfix(c, true), children: [] }; map[c.id] = nb; return nb; });
              pending.shift();
              pending = cur.node.children.map(function (c) { return { node: c }; }).concat(pending);
              fb.hide();
              buildStep();
            } else { misses++; CQ.store.record('parse-trees', false, true); b.disabled = true; fb.show({ ok: false, title: 'Not that ' + o.ch, why: T.parseRootWhy }); }
          }, { cls: 'choice mono' });
          row.appendChild(b);
        });
      }
      function evalPhase() {
        prompt.textContent = T.evalPrompt; U.clear(row);
        var val = {};
        function ready(n) { return TR.kids(n).length && val[n.id] == null && TR.kids(n).every(function (c) { return !TR.kids(c).length || val[c.id] != null; }); }
        var flatN = TR.flat(full);
        function drawEval() {
          flatN.forEach(function (n) { var bn = map[n.id]; if (TR.kids(n).length) { bn.sub = val[n.id] != null ? '= ' + val[n.id] : 'tap'; bn.state = val[n.id] != null ? 'done' : ready(n) ? 'active' : null; } });
          tv.render(built);
        }
        tv = (function () { U.clear(tv.el); tv.el.remove(); var t2 = U.treeView(area, { label: 'Parse tree', nodeW: 70, onPick: pickEval, selectable: function (x) { return x.state !== 'done' && x.sub !== 'leaf'; } }); area.insertBefore(t2.el, prompt); return t2; })();
        function pickEval(x) {
          var n = flatN.filter(function (m) { return map[m.id] === x; })[0];
          if (!n) return;
          if (!ready(n)) { misses++; CQ.store.record('parse-trees', false, true); fb.show({ ok: false, title: 'Not yet', why: U.fmt(T.evalWrong, { op: n.label }) }); return; }
          val[n.id] = TR.evalNode(n); CQ.store.record('parse-trees', true, true); fb.hide();
          drawEval();
          if (val[full.id] != null) {
            var lispOut = new E.lisp.Interp().repl(TR.toPrefix(full));
            fb.show({ ok: true, title: src + ' = ' + lispOut, why: 'Bottom-up: every operator waited for its children. In Lisp the same tree is the prefix form ' + TR.toPrefix(full) + ', which evaluates to ' + lispOut + '.' });
            k++; G.continueBtn(area, 'Next', next);
          }
        }
        drawEval();
      }
      buildStep();
    }
    next();
  }

  /* ---------- Tree to Lists ---------- */
  function tolists(el, ctx) {
    var pool = [['A', ['B', ['E'], ['F']], ['C', ['G']], ['D']], ['*', ['E', ['F']], ['+', ['D'], ['MAX', ['A'], ['B'], ['C']]]], ['X', ['Y'], ['Z']], ['R', ['S', ['T', ['U']]]], ['P', ['Q', ['R'], ['S']], ['T']]];
    var r = E.rng(ctx.seed), list = E.shuffle(pool, r).slice(0, ctx.level.count || 4), k = 0, first = 0;
    var area = h('div'); el.appendChild(area);
    function variants(t) {
      var s = TR.toListString(TR.fromLists(t)), alts = {};
      alts[s] = 1;
      var flat = s.replace(/\(([A-Z*+]+)\)/g, '$1'); if (!alts[flat]) alts[flat] = 1;                           // leaves without parentheses
      var swapped = TR.toListString({ label: t[0], children: t.slice(1).reverse().map(TR.fromLists) }); alts[swapped] = 1;
      var noRoot = '(' + t.slice(1).map(function (c) { return TR.toListString(TR.fromLists(c)); }).join(' ') + ')'; alts[noRoot] = 1;
      return { right: s, all: Object.keys(alts) };
    }
    function next() {
      U.clear(area);
      if (k >= list.length) { CQ.store.noteRound(ctx.gameId, first === list.length); return G.continueBtn(area, 'Finish level', function () { ctx.complete({ stars: first === list.length ? 3 : first >= list.length - 1 ? 2 : 1, summary: first + ' of ' + list.length + ' first try.' }); }); }
      var t = list[k], v = variants(t);
      area.appendChild(h('h3', null, 'Tree ' + (k + 1) + ' of ' + list.length));
      U.treeView(area, { label: 'Tree diagram', nodeW: 46 }).render(viewTree(TR.fromLists(t)));
      area.appendChild(h('p.q-prompt', null, 'Which list of lists is this tree?'));
      var row = h('div.choices'); area.appendChild(row);
      var fb, tries = 0;
      E.shuffle(v.all, r).forEach(function (o) {
        var b = U.button(o, function () {
          if (b.disabled) return;
          if (o === v.right) { if (!tries) first++; CQ.store.record('nary-lists', true, tries === 0); b.classList.add('is-right'); fb.show({ ok: true, title: 'Right', why: 'First the label, then each subtree in the same format; a leaf is a one-element list.' }); k++; G.continueBtn(area, 'Next', next); }
          else { tries++; CQ.store.record('nary-lists', false, tries === 1); b.disabled = true; b.classList.add('is-wrong'); fb.show({ ok: false, title: 'Not that one', why: o.indexOf('(') !== 0 || /^\(\(/.test(o) ? 'The first element must be the root\'s label.' : 'Every leaf is a one-element list like (G), and children keep their left-to-right order.' }); }
        }, { cls: 'choice mono' });
        row.appendChild(b);
      });
      fb = U.feedback(area);
    }
    next();
  }

  /* ---------- briefing, tasks ---------- */
  G.briefingKinds = G.briefingKinds || {};
  G.briefingKinds.treeTour = function (area, s, unit, after) {
    var tree = TR.sampleBinary(), ix = TR.index(tree), vt = viewTree(tree), seen = 0;
    var info = h('p.narration', { 'aria-live': 'polite' }, 'Tap a node.');
    var tv = U.treeView(area, { label: 'The lecture\'s binary tree', nodeW: 46, onPick: function (x) {
      var i = ix[x.id]; if (!i) return;
      info.textContent = x.label + ': parent ' + (i.parent ? i.parent.label : '— (root)') + ', children ' + (TR.kids(i.node).map(function (c) { return c.label; }).join(', ') || 'none (leaf)') + ', depth ' + i.depth + ', level ' + i.level + ', height ' + i.height + '.';
      mapIds(vt, function (y) { y.state = y.id === x.id ? 'hit' : null; }); tv.render(vt);
      if (++seen === 2) after();
    }, selectable: function (x) { return !x.hidden; } });
    area.appendChild(info);
    tv.render(vt);
  };
  G.briefingKinds.twoOrders = function (area, s, unit, after) {
    var tree = TR.sampleBinary(), pre = TR.traverse(tree, 'pre'), lvl = TR.traverse(tree, 'level');
    var cols = h('div.rec-cols'); area.appendChild(cols);
    var a = h('div'), b = h('div'); cols.appendChild(a); cols.appendChild(b);
    var vA = viewTree(tree), vB = viewTree(tree);
    var tA = U.treeView(a, { label: 'Pre-order', nodeW: 40 }), tB = U.treeView(b, { label: 'Level order', nodeW: 40 });
    var oA = h('p.plainq'), oB = h('p.plainq'); a.appendChild(oA); b.appendChild(oB);
    var ctrl = h('div'); area.insertBefore(ctrl, cols);
    var done = false;
    U.stepper(ctrl, { count: pre.length + 1, onShow: function (k) {
      var setA = {}, setB = {}; pre.slice(0, k).forEach(function (v, i) { setA[v.id] = i + 1; }); lvl.slice(0, k).forEach(function (v, i) { setB[v.id] = i + 1; });
      mapIds(vA, function (x) { x.state = setA[x.id] ? 'done' : null; x.badge = setA[x.id] ? '#' + setA[x.id] : null; }); tA.render(vA);
      mapIds(vB, function (x) { x.state = setB[x.id] ? 'done' : null; x.badge = setB[x.id] ? '#' + setB[x.id] : null; }); tB.render(vB);
      oA.textContent = 'Pre-order: ' + pre.slice(0, k).map(function (v) { return v.label; }).join(' ') + (k ? '  · stack: ' + pre[k - 1].stack.join(' → ') : '');
      oB.textContent = 'Level order: ' + lvl.slice(0, k).map(function (v) { return v.label; }).join(' ') + (k ? '  · queue: ' + (lvl[k - 1].queue.join(' ← ') || 'empty') : '');
      if (k === pre.length && !done) { done = true; after(); }
    } }).play();
  };
  G.tasks = G.tasks || {};
  G.tasks.trail = function (container, q, unit, done) { G.trailTask(container, { unit: unit, tree: TR.sampleBinary(), order: q.order, hints: false, onDone: done }); };

  G.trail = { mount: trail };
  G.tags = { mount: tags };
  G.parse = { mount: parse };
  G.tolists = { mount: tolists };
})(typeof globalThis !== 'undefined' ? globalThis : this);
