/* CPS305 Quest — ui/games/lists.js
 * Unit 3: Pointer Surgery (rewire), Shift Cost / Access Race (count moves),
 * Cons Cell Builder (translate). Refereed by engine/lists.js and engine/lisp.js.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, LL = E.lists, Lisp = E.lisp, G = CQ.games, h = U.h;

  /* One surgery task: select a pointer, then the node it should point to. */
  G.surgeryTask = function (el, opts) {
    var unit = opts.unit, T = unit.templates, X = unit.explain;
    var task = LL.task(opts.kind, opts.values, { x: opts.x, after: opts.after, index: opts.index });
    var st = task.start, selected = null, moves = 0, misses = 0, hints = 0, lostIds = null;
    var removedVal = task.target ? st.nodes[task.target].data : null;
    var d = { x: opts.x, goal: '(' + task.goal.join(' ') + ')', after: task.after ? st.nodes[task.after].data : '', v: removedVal };
    var g = h('p.note'); g.appendChild(U.rich(U.fmt(T.surgeryGoal[opts.kind], d))); el.appendChild(g);
    var prompt = h('p.prompt', { 'aria-live': 'polite' }, 'Select a pointer to change.'); el.appendChild(prompt);
    var view = U.listView(el, { onPick: pick });
    var tools = h('div.tools'); el.appendChild(tools);
    var fb = U.feedback(el);
    if (opts.hints) tools.appendChild(U.button('Why?', function () { hints++; fb.show({ info: true, title: 'Plan', why: U.fmt(T.surgeryHint[opts.kind], d) }); }));
    tools.appendChild(U.button('Reset', function () { st = task.start; selected = null; lostIds = null; fb.hide(); draw(); }));
    function draw() { view.render(st, { selected: selected, lost: lostIds }); }
    function pick(p) {
      if (p.kind === 'pointer') { selected = p.from; prompt.textContent = T.surgeryPick; draw(); return; }
      if (!selected) { prompt.textContent = 'First select a pointer (HEAD or a node\'s .next).'; return; }
      var move = { from: selected, to: p.id };
      var res = LL.check(task, st, move);
      selected = null;
      if (!res.ok) {
        misses++; CQ.store.record('pointer-order', false, true);
        if (opts.gameId) CQ.store.noteMiss(opts.gameId, 'pointer-order');
        var ex = U.explain(X, res);
        lostIds = res.lost || null;
        view.render(res.state, { lost: lostIds });   // show the damage...
        fb.show({ ok: false, title: res.code === 'list.cycle' ? 'That makes a loop' : 'Orphaned!', why: ex.why, misconception: ex.misconception,
          actions: [{ label: 'Undo that move', primary: true, fn: function () { lostIds = null; fb.hide(); draw(); } }] });
        prompt.textContent = 'The move was undone for you once you press Undo.';
        return;
      }
      st = res.state; moves++; lostIds = null; fb.hide();
      CQ.store.record('pointer-order', true, true);
      prompt.textContent = 'Select a pointer to change.';
      draw();
      if (res.done) {
        U.clear(tools);
        var dd = { moves: moves, optimal: task.optimal };
        fb.show({ ok: true, title: 'List is (' + task.goal.join(' ') + ')', why: U.fmt(T.surgeryDone, dd) });
        opts.onDone({ misses: misses, hints: hints, optimal: moves <= task.optimal, summary: U.fmt(T.surgeryDone, dd) });
      }
    }
    draw();
  };

  function surgery(el, ctx) {
    var tasks = ctx.level.tasks, k = 0, misses = 0, hints = 0, optimal = true;
    var area = h('div'); el.appendChild(area);
    function next() {
      U.clear(area);
      var n = ctx.size, values = E.makeInput('random', n, ctx.seed + k * 13), kind = tasks[k];
      area.appendChild(h('h3', null, 'Operation ' + (k + 1) + ' of ' + tasks.length));
      G.surgeryTask(area, { unit: ctx.unit, kind: kind, values: values, x: 99, after: Math.min(1, n - 2), index: Math.floor(n / 2), hints: ctx.hints, gameId: ctx.gameId, onDone: function (r) {
        misses += r.misses; hints += r.hints; optimal = optimal && r.optimal; k++;
        if (k < tasks.length) G.continueBtn(area, 'Next operation', next);
        else G.continueBtn(area, 'Finish level', function () { CQ.store.noteRound(ctx.gameId, misses === 0 && hints === 0); ctx.complete({ stars: 1 + (hints ? 0 : 1) + (misses === 0 && optimal ? 1 : 0), summary: tasks.length + ' operations, ' + misses + ' slip(s).' }); });
      } });
    }
    next();
  }

  /* Prepend: frames of every shift, from the engine. */
  function prependFrames(values) {
    var r = LL.prependArray(values, values.length + 4);
    var frames = [{ arr: values.slice(), msg: 'Before: index 0 holds ' + values[0] + '.', shifts: 0 }].concat(r.frames);
    var fin = frames[frames.length - 1].arr.slice(); fin[0] = 0;
    frames.push({ arr: fin, msg: 'Index 0 is free: write the new value. ' + r.shifts + ' elements moved.', shifts: r.shifts });
    return frames;
  }
  function itemsOf(arr) { return arr.map(function (v, i) { return { id: 'p' + i + '_' + v, v: v }; }); }
  function prepend(el, ctx) {
    var T = ctx.unit.templates, n = ctx.size, values = E.makeInput('random', n, ctx.seed);
    var q = G.choiceQ({ id: 'arr-prep', concept: 'array-basics', seed: ctx.seed, prompt: U.fmt(T.prependQ, { n: n }), options: [
      { text: n, ok: true, why: U.fmt(T.prependOk, { n: n }) }, { text: 1, why: 'Index 0 is taken: everything has to move over first.' }, { text: 0, why: 'That\'s the linked list. An array has no "front pointer" to change.' }
    ] });
    G.predictThen(el, q, 'Watch it ▶', function (ft) {
      var frames = prependFrames(values);
      var view = U.arrayView(el, { label: 'Array during prepend' });
      var cnt = U.counters(el, ['shifts']);
      var narr = h('p.narration', { 'aria-live': 'polite' }); el.appendChild(narr);
      var ctrl = h('div'); el.insertBefore(ctrl, view.el);
      var st = U.stepper(ctrl, { count: frames.length, onShow: function (k) {
        var f = frames[k];
        view.render({ arr: f.arr.map(function (v, i) { return { id: 'c' + i, v: v === undefined ? '' : v }; }), marks: {}, regions: [], cellState: f.hole != null ? (function () { var o = {}; o[f.hole] = 'picked'; return o; })() : {} });
        cnt.set({ shifts: f.shifts || 0 }); narr.textContent = f.msg;
      } });
      st.play();
      G.note(el, 'Linked list: make a node, set its .next to the old head, point HEAD at it. **2 reference updates**, whatever n is.');
      G.continueBtn(el, 'Finish level', function () { st.destroy(); ctx.complete({ stars: G.stars(0, ft), summary: 'Array prepend moved all ' + n + ' elements.' }); }, true);
    });
    void itemsOf;
  }

  function access(el, ctx) {
    var T = ctx.unit.templates, i = 6;
    var q = G.choiceQ({ id: 'acc', concept: 'list-basics', seed: ctx.seed, prompt: U.fmt(T.accessQ, { i: i }), options: [
      { text: i, ok: true, why: 'From HEAD (index 0) you follow .next ' + i + ' times. An array computes base + ' + i + ' × size in one step.' }, { text: 1, why: 'That\'s the array: one address computation. A list has no addresses to compute.' }, { text: 'log₂ ' + i, why: 'No halving: links are followed one at a time.' }
    ] });
    G.predictThen(el, q, 'Race them ▶', function (ft) {
      var s = h('input', { type: 'range', min: 0, max: 5000, value: 5000, 'aria-label': 'Index to access' });
      var out = h('output.n-out');
      el.appendChild(h('label.slider-row', null, 'index ', s, out));
      var lanes = h('div.lanes', { 'aria-live': 'polite' }); el.appendChild(lanes);
      function upd() {
        var k = +s.value, a = LL.accessCost('array', k), l = LL.accessCost('list', k);
        out.textContent = 'index ' + k;
        U.clear(lanes);
        [['array', a, 1], ['linked list', l, 2]].forEach(function (r) {
          lanes.appendChild(h('div.lane', null, h('span.lane-name', null, r[0]), h('span.lane-track', null, h('span.lane-bar.seg' + r[2], { style: { width: Math.max(0.5, r[1] / 5001 * 100) + '%' } })), h('span.lane-val', null, r[1] + (r[1] === 1 ? ' step' : ' steps'))));
        });
      }
      s.addEventListener('input', upd); upd();
      var pts1 = [], pts2 = []; for (var k = 0; k <= 5000; k += 250) { pts1.push([k, 1]); pts2.push([k, k + 1]); }
      U.chart(el, { label: 'Steps to reach index i', xLabel: 'index i', yLabel: 'steps', series: [{ label: 'array: O(1)', points: pts1 }, { label: 'linked list: O(n)', points: pts2 }] });
      G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(0, ft), summary: 'Index 5000: 1 step vs 5001.' }); }, true);
    });
  }

  /* Cons Cell Builder: printed forms and diagrams come from the interpreter. */
  function consBuilder(el, ctx) {
    var pool = ctx.unit.consPool.filter(function (c) { return c.tier <= ctx.size; });
    var rand = E.rng(ctx.seed), list = E.shuffle(pool, rand).slice(0, ctx.level.count || 4), k = 0, first = 0;
    var area = h('div'); el.appendChild(area);
    function value(expr) { var it = new Lisp.Interp(); return it.evalString(expr); }
    function next() {
      U.clear(area);
      if (k >= list.length) {
        CQ.store.noteRound(ctx.gameId, first === list.length);
        return G.continueBtn(area, 'Finish level', function () { ctx.complete({ stars: first === list.length ? 3 : first >= list.length - 1 ? 2 : 1, summary: first + ' of ' + list.length + ' on the first try.' }); });
      }
      var item = list[k], v = value(item.expr), printed = Lisp.print(v);
      var others = E.shuffle(ctx.unit.consPool.filter(function (c) { return c.id !== item.id; }), E.rng(ctx.seed + k)).map(function (c) { return { expr: c.expr, val: value(c.expr) }; })
        .filter(function (c) { return Lisp.print(c.val) !== printed; });
      area.appendChild(h('h3', null, 'Structure ' + (k + 1) + ' of ' + list.length));
      var tries = 0, done = false;
      var fb;
      if (ctx.level.kind === 'toText') {
        U.consDiagram(area, v);
        area.appendChild(h('p.q-prompt', null, 'What does the REPL print for this structure?'));
        var row = h('div.choices'); area.appendChild(row);
        var opts = E.shuffle([printed].concat(others.slice(0, 3).map(function (o) { return Lisp.print(o.val); })), rand);
        opts.forEach(function (o) {
          var b = U.button(o, function () {
            if (done || b.disabled) return;
            if (o === printed) { done = true; if (!tries) first++; b.classList.add('is-right'); CQ.store.record('cons-cells', true, tries === 0); fb.show({ ok: true, title: printed, why: 'Built by ' + item.expr + '. Each box pair is one cons cell: CAR on the left, CDR on the right; a slash is NIL.' }); k++; G.continueBtn(area, 'Next', next); }
            else { tries++; b.disabled = true; b.classList.add('is-wrong'); CQ.store.record('cons-cells', false, tries === 1); fb.show({ ok: false, title: 'Not ' + o, why: o.indexOf(' . ') >= 0 ? 'A dot appears only when a CDR holds an atom, not a list or NIL. Check each right-hand box.' : 'Follow the arrows: right-hand boxes (CDR) lead to the rest of the list; arrows down from a left box (CAR) mean that element is itself a list.' }); }
          }, { cls: 'choice mono' });
          row.appendChild(b);
        });
      } else {
        area.appendChild(h('p.q-prompt', null, 'Which diagram does this expression build?'));
        area.appendChild(h('pre.code-inline', null, item.expr));
        var grid = h('div.diagram-choices'); area.appendChild(grid);
        var cands = E.shuffle([{ val: v, ok: true }].concat(others.slice(0, 2).map(function (o) { return { val: o.val, ok: false }; })), rand);
        cands.forEach(function (c, i) {
          var b = h('button.diagram-choice', { type: 'button', 'aria-label': 'Diagram ' + (i + 1) + ': ' + Lisp.print(c.val) });
          U.consDiagram(b, c.val, { label: 'Diagram of ' + Lisp.print(c.val) });
          b.addEventListener('click', function () {
            if (done || b.disabled) return;
            if (c.ok) { done = true; if (!tries) first++; b.classList.add('is-right'); CQ.store.record('cons-cells', true, tries === 0); fb.show({ ok: true, title: printed, why: item.expr + ' prints as ' + printed + '.' }); k++; G.continueBtn(area, 'Next', next); }
            else { tries++; b.disabled = true; b.classList.add('is-wrong'); CQ.store.record('cons-cells', false, tries === 1); fb.show({ ok: false, title: 'That one is ' + Lisp.print(c.val), why: 'Evaluate ' + item.expr + ' step by step: what is its CAR, and what is its CDR?' }); }
          });
          grid.appendChild(b);
        });
      }
      fb = U.feedback(area);
    }
    next();
  }

  /* Briefing steps and Boss tasks. */
  G.briefingKinds = G.briefingKinds || {};
  G.briefingKinds.prependRace = function (area, s, unit, after) {
    var vals = [3, 1, 4, 1, 5, 9, 2, 6], frames = prependFrames(vals);
    var view = U.arrayView(area, { label: 'Array' }), cnt = U.counters(area, ['shifts']), narr = h('p.narration', { 'aria-live': 'polite' });
    area.appendChild(narr);
    var lst = LL.fromArray(vals); lst.nodes.new = { data: 0, next: lst.head }; lst.head = 'new';
    area.appendChild(h('p.small', null, 'Linked list after prepend (2 reference updates):'));
    U.listView(area, { onPick: function () {} }).render(lst);
    var ctrl = h('div'); area.insertBefore(ctrl, view.el);
    var done = false;
    U.stepper(ctrl, { count: frames.length, onShow: function (k) {
      var f = frames[k];
      view.render({ arr: f.arr.map(function (v, i) { return { id: 'c' + i, v: v === undefined ? '' : v }; }), marks: {}, regions: [] });
      cnt.set({ shifts: f.shifts || 0 }); narr.textContent = f.msg;
      if (k === frames.length - 1 && !done) { done = true; after(); }
    } }).play();
  };
  G.briefingKinds.accessRace = function (area, s, unit, after) {
    var lanes = h('div.lanes'); area.appendChild(lanes);
    [['array', 1, 1], ['linked list', 7, 2]].forEach(function (r) { lanes.appendChild(h('div.lane', null, h('span.lane-name', null, r[0]), h('span.lane-track', null, h('span.lane-bar.seg' + r[2], { style: { width: (r[1] / 7 * 100) + '%' } })), h('span.lane-val', null, r[1] + (r[1] === 1 ? ' step' : ' steps')))); });
    G.continueBtn(area, 'I see it', after, true);
  };
  G.tasks = G.tasks || {};
  G.tasks.surgery = function (container, q, unit, done) { G.surgeryTask(container, { unit: unit, kind: q.kindT, values: q.values, x: q.x, after: q.after, hints: false, onDone: done }); };

  G.surgery = { mount: surgery };
  G.shift = { mount: function (el, ctx) { (ctx.level.kind === 'prepend' ? prepend : access)(el, ctx); } };
  G.conscell = { mount: consBuilder };
})(typeof globalThis !== 'undefined' ? globalThis : this);
