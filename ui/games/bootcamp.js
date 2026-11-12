/* CPS305 Quest — ui/games/bootcamp.js
 * Unit 1: Evaluator (pick the next form), Quote or Not? / Truthy or Falsy
 * (rapid fire), Loop Tracer (fill the variable table). Every value comes from
 * running the form in engine/lisp.js.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, Lisp = E.lisp, G = CQ.games, h = U.h;

  function run(src) { return new Lisp.Interp().repl(src); }

  /* Build an evaluation tree: calls are nodes, atoms are leaves. Steps = calls in
   * the order the REPL finishes them (arguments left to right, innermost first). */
  function evalTree(expr) {
    var form = Lisp.read(expr)[0], steps = [], idc = 0;
    function build(f) {
      if (f instanceof Lisp.Cons) {
        var parts = Lisp.toArray(f);
        var n = { id: 'e' + (++idc), op: Lisp.print(parts[0]), form: f, label: Lisp.print(parts[0]), children: parts.slice(1).map(build), call: true };
        n.value = run(Lisp.print(f));
        steps.push(n);
        return n;
      }
      return { id: 'e' + (++idc), label: Lisp.print(f), children: [], call: false, state: 'done' };
    }
    var rootN = build(form);
    return { root: rootN, steps: steps, value: rootN.value };
  }

  G.evalTask = function (el, opts) {
    var unit = opts.unit, T = unit.templates, et = evalTree(opts.expr), k = 0, misses = 0, hints = 0, done = {};
    el.appendChild(h('pre.code-inline', null, '* ' + opts.expr));
    var prompt = h('p.prompt', { 'aria-live': 'polite' }, T.evalPrompt); el.appendChild(prompt);
    var tv = U.treeView(el, { label: 'Evaluation tree', nodeW: 58, onPick: pick, selectable: function (x) { return x.call && !done[x.id] && k < et.steps.length; } });
    var tools = h('div.tools'); el.appendChild(tools);
    var fb = U.feedback(el);
    if (opts.hints) tools.appendChild(U.button('Why?', function () { hints++; var nx = et.steps[k]; fb.show({ info: true, title: 'Next', why: 'The leftmost form whose arguments are all values: (' + nx.op + ' …). ' + T.evalWrongOuter.replace('{form}', 'Anything above it') }); }));
    function draw(bad) {
      (function w(x) {
        if (x.call) { x.state = done[x.id] ? 'done' : bad === x.id ? 'bad' : x.children.every(function (c) { return !c.call || done[c.id]; }) ? 'active' : null; x.sub = done[x.id] ? '= ' + x.value : ''; }
        x.children.forEach(function (c) { if (x.call && done[x.id]) c.hidden = true; w(c); });
      })(et.root);
      tv.render(et.root);
    }
    function textOf(x) { return '(' + x.op + ' ' + x.children.map(function (c) { return c.call ? (done[c.id] ? c.value : textOf(c)) : c.label; }).join(' ') + ')'; }
    function pick(x) {
      var exp = et.steps[k];
      if (x.id === exp.id) {
        CQ.store.record('eval-order', true, true);
        done[x.id] = true; k++; fb.show({ ok: true, title: textOf(x) + ' → ' + x.value, why: 'Its arguments were all values, so it could run.' });
        draw();
        if (k >= et.steps.length) {
          U.clear(tools); prompt.innerHTML = ''; prompt.appendChild(U.rich(U.fmt(T.evalDone, { value: et.value })));
          opts.onDone({ misses: misses, hints: hints, summary: opts.expr + ' → ' + et.value });
        } else setTimeout(function () { tv.focus(); }, 20);
      } else {
        misses++; CQ.store.record('eval-order', false, true);
        if (opts.gameId) CQ.store.noteMiss(opts.gameId, 'eval-order');
        var ready = x.children.every(function (c) { return !c.call || done[c.id]; });
        draw(x.id);
        fb.show({ ok: false, title: 'Not yet', why: ready ? U.fmt(T.evalWrongOrder, { exp: textOf(exp), form: textOf(x) }) : U.fmt(T.evalWrongOuter, { form: textOf(x) }) });
      }
    }
    draw();
    setTimeout(function () { tv.focus(); }, 50);
  };

  function evaluator(el, ctx) {
    var pool = ctx.unit.evalPool.filter(function (e) { return e.tier === ctx.size; });
    if (!pool.length) pool = ctx.unit.evalPool;
    var list = E.shuffle(pool, E.rng(ctx.seed)).slice(0, ctx.level.count || 2), k = 0, misses = 0, hints = 0;
    var area = h('div'); el.appendChild(area);
    function next() {
      U.clear(area);
      area.appendChild(h('h3', null, 'Form ' + (k + 1) + ' of ' + list.length));
      G.evalTask(area, { unit: ctx.unit, expr: list[k].expr, hints: ctx.hints, gameId: ctx.gameId, onDone: function (r) {
        misses += r.misses; hints += r.hints; k++;
        if (k < list.length) G.continueBtn(area, 'Next form', next);
        else G.continueBtn(area, 'Finish level', function () { CQ.store.noteRound(ctx.gameId, misses === 0 && hints === 0); ctx.complete({ stars: G.stars(hints, misses === 0), summary: list.length + ' forms evaluated.' }); });
      } });
    }
    next();
  }

  /* Rapid fire classification. kind: 'quote' (call/data/error) or 'truthy'. */
  function rapid(el, ctx) {
    var T = ctx.unit.templates, isQuote = ctx.level.kind === 'quote';
    var pool = isQuote ? ctx.unit.quotePool : ctx.unit.truthPool;
    var list = E.shuffle(pool, E.rng(ctx.seed)).slice(0, ctx.level.count || 6), k = 0, right = 0, misses = 0;
    var card = h('div.flashcard', { 'aria-live': 'polite' }); el.appendChild(card);
    var row = h('div.choice-row'); el.appendChild(row);
    var fb = U.feedback(el);
    var score = h('p.status'); el.appendChild(score);
    var t0 = Date.now();
    function classify(x) {
      if (isQuote) {
        var out = run(x);
        if (/^ERROR/.test(out)) return { kind: 'error', out: out };
        return { kind: /^'|^\(quote /i.test(x) ? 'data' : 'call', out: out };
      }
      var v = run(x), t = run("(if " + x + " 'truthy 'falsy)");
      return { kind: t === 'TRUTHY' ? 'truthy' : 'falsy', out: v };
    }
    function next() {
      U.clear(row);
      if (k >= list.length) {
        var secs = Math.round((Date.now() - t0) / 1000);
        card.textContent = right + ' / ' + list.length + ' in ' + secs + ' s';
        CQ.store.noteRound(ctx.gameId, misses === 0);
        return G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: misses === 0 ? 3 : misses <= 2 ? 2 : 1, summary: right + ' of ' + list.length + ' right.' }); });
      }
      var x = list[k], c = classify(x);
      U.clear(card); card.appendChild(h('code.big-form', null, x));
      var options = isQuote ? [['call', '⚙ Call'], ['data', '📦 Data'], ['error', '💥 Error']] : [['truthy', '✔ Truthy'], ['falsy', '✘ Falsy']];
      var answered = false;
      options.forEach(function (o, i) {
        row.appendChild(U.button(h('span', null, h('kbd', null, String(i + 1)), ' ' + o[1]), function () {
          if (answered) return; answered = true;
          var ok = o[0] === c.kind;
          if (ok) right++; else misses++;
          CQ.store.record(isQuote ? 'quote' : (/and|or/.test(x) ? 'and-or' : 'truthiness'), ok, true);
          var why = isQuote ? x + ' is ' + T.quoteKinds[c.kind] + '. The REPL prints: ' + c.out + (c.kind === 'error' ? ' (the first element of a call must name a function).' : '')
                            : U.fmt(T.truthWhy[c.kind], { x: x, v: c.out });
          fb.show({ ok: ok, title: ok ? 'Yes' : 'No: ' + c.kind, why: why, misconception: !ok && x === '0' ? '0 is false.' : !ok && /and|or/.test(x) ? 'AND and OR return only T or NIL.' : null });
          k++; score.textContent = 'Score: ' + right + ' / ' + k;
          G.continueBtn(row, 'Next ▶', next);
        }, { cls: 'choice big' }));
      });
    }
    function onKey(e) { if (!document.body.contains(el)) { document.removeEventListener('keydown', onKey); return; } if (U.typing(e)) return; var b = row.querySelectorAll('.choice')[parseInt(e.key, 10) - 1]; if (b) b.click(); }
    document.addEventListener('keydown', onKey);
    next();
  }

  /* Loop Tracer: the table is the program's own output (rows it pushed). */
  function tracer(el, ctx) {
    var T = ctx.unit.templates, pool = ctx.unit.loops.filter(function (l) { return l.tier === ctx.size; });
    if (ctx.level.mode === 'solo') pool = ctx.unit.loops.filter(function (l) { return l.id === 'l4' || l.id === 'l5'; });
    var list = ctx.level.mode === 'solo' ? pool : [pool[ctx.seed % pool.length]], li = 0, misses = 0, hints = 0;
    var area = h('div'); el.appendChild(area);
    function next() {
      U.clear(area);
      if (li >= list.length) { CQ.store.noteRound(ctx.gameId, misses === 0 && hints === 0); return G.continueBtn(area, 'Finish level', function () { ctx.complete({ stars: G.stars(hints, misses === 0), summary: list.length + ' loop(s) traced.' }); }); }
      var lp = list[li], it = new Lisp.Interp(), rowsV = it.evalString(lp.code);
      var rows = Lisp.toArray(rowsV).map(function (r) { return Lisp.toArray(r).map(Lisp.print); });
      area.appendChild(h('h3', null, lp.title));
      U.codePanel(area, { code: lp.code, title: 'The loop' });
      var table = h('table.var-table', null, h('thead', null, h('tr', null, h('th', null, 'iteration'), lp.cols.map(function (c) { return h('th', null, c); }))));
      var tb = h('tbody'); table.appendChild(tb); area.appendChild(h('div.table-wrap', null, table));
      var prompt = h('p.prompt', { 'aria-live': 'polite' }); area.appendChild(prompt);
      var row = h('div.choices'); area.appendChild(row);
      var tools = h('div.tools'); area.appendChild(tools);
      var fb = U.feedback(area);
      var r = 0;
      if (ctx.hints) tools.appendChild(U.button('Why?', function () { hints++; fb.show({ info: true, title: 'How the variables step', why: /do\*/.test(lp.code) ? 'DO* updates one variable at a time, so later steps see the NEW values.' : /\(do /.test(lp.code) ? 'DO computes all the step forms with the OLD values, then assigns them together (parallel).' : 'DOTIMES runs i = 0, 1, 2, …; the body runs once per value.' }); }));
      function ask() {
        U.clear(row);
        if (r >= rows.length) { U.clear(tools); prompt.textContent = 'The loop is done: ' + rows.length + ' iterations.'; li++; return G.continueBtn(area, li < list.length ? 'Next loop' : 'Done', next); }
        prompt.textContent = U.fmt(T.tracerPrompt, { n: r + 1, cols: lp.cols.join(', ') });
        var correct = '(' + rows[r].join(' ') + ')';
        var alts = {}; alts[correct] = 1;
        var nums = rows[r].map(Number);
        [[0, 1], [1, 0], [0, -1]].forEach(function (d) { var v = nums.map(function (x, i) { return i === 1 ? x + d[1] : x + d[0]; }); alts['(' + v.join(' ') + ')'] = 1; });
        if (r + 1 < rows.length) alts['(' + rows[r + 1].join(' ') + ')'] = 1;
        var tries = 0;
        E.shuffle(Object.keys(alts).slice(0, 4), E.rng(ctx.seed + r)).forEach(function (o) {
          var b = U.button(o, function () {
            if (b.disabled) return;
            if (o === correct) {
              CQ.store.record('loops', true, tries === 0);
              tb.appendChild(h('tr', null, h('td', null, String(r + 1)), rows[r].map(function (v) { return h('td', null, v); })));
              fb.hide(); r++; ask();
            } else { tries++; misses++; CQ.store.record('loops', false, tries === 1); b.disabled = true; b.classList.add('is-wrong'); fb.show({ ok: false, title: 'Not ' + o, why: 'Trace the body once more with the previous row\'s values. ' + (/\(do /.test(lp.code) ? 'Remember: DO updates in parallel.' : '') }); }
          }, { cls: 'choice mono' });
          row.appendChild(b);
        });
      }
      ask();
    }
    next();
  }

  /* Briefing steps, Boss task. */
  G.briefingKinds = G.briefingKinds || {};
  G.briefingKinds.evalDemo = function (area, s, unit, after) {
    var et = evalTree('(* (+ 1 2) (- 7 3))'), k = 0, done = {};
    var tv = U.treeView(area, { label: 'Evaluation tree', nodeW: 56 });
    var narr = h('p.narration', { 'aria-live': 'polite' }, 'Press "Evaluate next".'); area.appendChild(narr);
    function draw() { (function w(x) { if (x.call) { x.state = done[x.id] ? 'done' : null; x.sub = done[x.id] ? '= ' + x.value : ''; } x.children.forEach(function (c) { if (done[x.id]) c.hidden = true; w(c); }); })(et.root); tv.render(et.root); }
    draw();
    var b = U.button('Evaluate next ▶', function () {
      var st = et.steps[k]; done[st.id] = true; k++;
      narr.textContent = '(' + st.op + ' …) → ' + st.value;
      draw();
      if (k >= et.steps.length) { b.remove(); after(); }
    }, { cls: 'primary' });
    area.appendChild(h('div.actions', null, b));
  };
  G.briefingKinds.quoteDemo = function (area, s, unit, after) {
    var out = h('div');
    ['(+ 1 2)', "'(+ 1 2)"].forEach(function (f) { out.appendChild(h('pre.code-inline', null, '* ' + f + '\n' + run(f))); });
    area.appendChild(out);
    G.continueBtn(area, 'I see it', after, true);
  };
  G.tasks = G.tasks || {};
  G.tasks.evaluate = function (container, q, unit, done) { G.evalTask(container, { unit: unit, expr: q.expr, hints: false, onDone: done }); };

  G.evaluator = { mount: evaluator };
  G.quoting = { mount: rapid };
  G.tracer = { mount: tracer };
})(typeof globalThis !== 'undefined' ? globalThis : this);
