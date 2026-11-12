/* CPS305 Quest — ui/games/recursion.js
 * Unit 4. Stack Tower (push/unwind), Tail or Not? (classify), Fib Explosion (expand).
 * Every answer comes from engine/lisp.js running or analysing the lecture code.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, L = E.lisp, G = CQ.games, h = U.h;

  function labelOf(ev) { return '(' + ev.name + (ev.args.length ? ' ' + ev.args.join(' ') : '') + ')'; }

  /* Frames after applying events[0..k]. tco: a call made by a frame of the same
   * function that is in tail position replaces that frame (tail call optimization). */
  function framesAt(events, k, tco) {
    var frames = [];
    for (var i = 0; i <= k && i < events.length; i++) {
      var ev = events[i];
      if (ev.type === 'call') {
        var f = { id: ev.id, label: labelOf(ev), sub: 'waiting…', state: 'active' };
        if (tco) frames = [f];   // the tail call reuses the single frame
        else { if (frames.length) frames[frames.length - 1].state = 'wait'; frames.push(f); }
      } else {
        if (tco) { if (frames.length) { frames[0].sub = 'returns ' + ev.value; frames[0].state = 'ret'; } continue; }
        var top = frames.pop();
        if (i === k && top) { top.sub = 'returns ' + ev.value; top.state = 'ret'; frames.push(top); }
        if (frames.length && i < k) frames[frames.length - 1].state = 'active';
      }
    }
    return frames;
  }
  function narrate(ev) {
    if (!ev) return '';
    return ev.type === 'call' ? 'Call ' + labelOf(ev) + ': push a new frame.' : '(' + ev.name + ' …) returns ' + ev.value + ' to the frame below and is popped.';
  }

  /* Watch: a stepper over trace events, stack + code side by side. */
  function watchRun(el, unit, run, opts) {
    opts = opts || {};
    var tr = L.trace(unit.defs[run.fn] ? Object.keys(unit.defs).map(function (k) { return unit.defs[k]; }).join('\n') : run.defs, run.call);
    var box = h('div.rec-run');
    el.appendChild(box);
    box.appendChild(h('p.target', null, 'Running ', h('code', null, run.call), tr.result != null ? h('span', null, ' → ', h('strong', null, tr.result)) : null));
    var cols = h('div.rec-cols'); box.appendChild(cols);
    var left = h('div'), right = h('div'); cols.appendChild(left); cols.appendChild(right);
    var sv = U.stackView(left);
    var narr = h('p.narration', { 'aria-live': 'polite' }); left.appendChild(narr);
    U.codePanel(right, { code: unit.defs[run.fn], title: run.fn.toUpperCase() });
    var ctrl = h('div'); box.insertBefore(ctrl, cols);
    var st = U.stepper(ctrl, { count: tr.events.length, onShow: function (k) {
      sv.render(framesAt(tr.events, k, opts.tco), 'Stack depth: ' + framesAt(tr.events, k, opts.tco).length);
      narr.textContent = narrate(tr.events[k]);
      if (k === tr.events.length - 1 && opts.onEnd) opts.onEnd(tr);
    } });
    return { stepper: st, trace: tr };
  }

  /* Try: predict each return value as the stack unwinds. Used by levels and the Boss task. */
  G.towerTask = function (el, opts) {
    var unit = opts.unit, T = unit.templates, run = opts.run;
    var defs = Object.keys(unit.defs).map(function (k) { return unit.defs[k]; }).join('\n');
    var tr = L.trace(defs, run.call), evs = tr.events;
    var k = 0, misses = 0, hints = 0;
    var box = h('div.rec-run'); el.appendChild(box);
    box.appendChild(h('p.target', null, 'Running ', h('code', null, run.call)));
    var cols = h('div.rec-cols'); box.appendChild(cols);
    var left = h('div'), right = h('div'); cols.appendChild(left); cols.appendChild(right);
    var sv = U.stackView(left);
    var narr = h('p.narration', { 'aria-live': 'polite' }); left.appendChild(narr);
    U.codePanel(right, { code: unit.defs[run.fn], title: run.fn.toUpperCase() });
    var qbox = h('div'); box.appendChild(qbox);
    var tools = h('div.tools'); box.appendChild(tools);
    var fb = U.feedback(box);
    if (opts.hints) tools.appendChild(U.button('Why?', function () { hints++; fb.show({ info: true, title: 'How this frame returns', why: T.retWhy[run.fn] || '' }); }));

    function show(i) { sv.render(framesAt(evs, i)); narr.textContent = narrate(evs[i]); }
    function advance() {
      // Play calls (and returns already predicted) until the next unpredicted return.
      while (k < evs.length && evs[k].type === 'call') { k++; }
      if (k >= evs.length) return finish();
      show(k - 1);
      var ev = evs[k];
      var callEv = evs.filter(function (e) { return e.type === 'call' && e.id === ev.id; })[0];
      var label = labelOf(callEv);
      var prevRet = k > 0 && evs[k - 1].type === 'return' ? evs[k - 1].value : null;
      var cand = [ev.value, callEv.args[0], prevRet, tr.result];
      if (/^-?\d+$/.test(ev.value)) cand.push(String(+ev.value + 1), String(+ev.value - 1));
      cand.push('0', 'NIL');
      var seen = {}, choices = [];
      cand.forEach(function (c) { if (c != null && !seen[c] && choices.length < 4) { seen[c] = true; choices.push(c); } });
      U.clear(qbox);
      var p = h('p.q-prompt'); p.appendChild(U.rich(U.fmt(T.predictPrompt, { label: label }))); qbox.appendChild(p);
      var row = h('div.choices', { role: 'group', 'aria-label': 'Return value' });
      var tries = 0;
      E.shuffle(choices, E.rng(k * 7 + 3)).forEach(function (c) {
        var b = U.button(c, function () {
          if (b.disabled) return;
          if (c === ev.value) {
            CQ.store.record('call-stack', true, tries === 0);
            fb.show({ ok: true, title: 'Returns ' + c, why: U.fmt(T.predictOk, { label: label, value: c }) });
            sv.render(framesAt(evs, k)); narr.textContent = narrate(ev);
            k++;
            U.clear(qbox);
            setTimeout(advance, U.reducedMotion() ? 50 : 700);
          } else {
            tries++; misses++;
            b.disabled = true; b.classList.add('is-wrong');
            CQ.store.record('call-stack', false, tries === 1);
            if (opts.gameId) CQ.store.noteMiss(opts.gameId, 'call-stack');
            fb.show({ ok: false, title: 'Not ' + c, why: U.fmt(T.predictBad, { guess: c, label: label, value: ev.value, why: T.retWhy[run.fn] || '' }) });
          }
        }, { cls: 'choice mono' });
        row.appendChild(b);
      });
      qbox.appendChild(row);
    }
    function finish() {
      show(evs.length - 1);
      U.clear(qbox); U.clear(tools);
      qbox.appendChild(h('p.after', null, run.call + ' → ' + tr.result));
      opts.onDone({ misses: misses, hints: hints, summary: run.call + ' returns ' + tr.result + '.' });
    }
    advance();
  };

  function watch(el, ctx) {
    var runs = [{ fn: 'fact-rec', call: '(fact-rec 4)' }, { fn: 'sum-rec', call: "(sum-rec '(6 4 2))" }];
    var i = 0;
    var area = h('div'); el.appendChild(area);
    function next() {
      U.clear(area);
      area.appendChild(h('h3', null, 'Run ' + (i + 1) + ' of ' + runs.length));
      var w = watchRun(area, ctx.unit, runs[i]);
      w.stepper.play();
      i++;
      if (i < runs.length) G.continueBtn(area, 'Next run', function () { w.stepper.destroy(); next(); }, true);
      else G.continueBtn(area, 'Finish level', function () { ctx.complete({ stars: 3, summary: 'Calls push frames; returns pop them.' }); }, true);
    }
    next();
  }

  function predict(el, ctx) {
    var pool = ctx.unit.towers.filter(function (t) { return t.tier === ctx.size; });
    var run = pool[ctx.seed % pool.length];
    G.towerTask(el, { unit: ctx.unit, run: run, hints: ctx.hints, gameId: ctx.gameId, onDone: function (res) {
      CQ.store.noteRound(ctx.gameId, res.misses === 0 && res.hints === 0);
      G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(res.hints, res.misses === 0), summary: res.summary }); });
    } });
  }

  function topple(el, ctx) {
    var T = ctx.unit.templates.toppleQ, B = ctx.unit.broken;
    U.codePanel(el, { code: B.code, title: 'FACT-BROKEN' });
    var q = G.choiceQ({ id: 'rec-topple', concept: 'base-case', seed: ctx.seed, prompt: T.prompt, misconception: T.misconception, options: [
      { text: 'The stack overflows: Control stack exhausted', ok: true, why: T.ok },
      { text: 'It returns a wrong answer', misconception: true, why: T.wrongAnswer },
      { text: 'It returns 0 when n reaches 0', why: T.wrongZero },
      { text: 'It loops forever without crashing', why: T.wrongLoop }
    ] });
    G.predictThen(el, q, 'Run it ▶', function (firstTry) {
      var tr = L.trace(B.code, B.call, { maxDepth: 60 });
      var sv = U.stackView(el);
      var banner = h('p.feedback.is-bad', { hidden: true, role: 'alert' });
      el.appendChild(banner);
      var shown = 0, calls = tr.events.filter(function (e) { return e.type === 'call'; });
      function tick() {
        shown++;
        var frames = calls.slice(0, shown).map(function (e, i) { return { label: labelOf(e), sub: 'waiting…', state: i === shown - 1 ? 'active' : 'wait' }; });
        sv.render(frames.slice(-12), 'Stack depth: ' + shown + (shown > 12 ? ' (showing the top 12)' : ''));
        if (shown < calls.length) setTimeout(tick, U.reducedMotion() ? 0 : 60);
        else {
          banner.hidden = false;
          banner.textContent = '💥 ' + (tr.error || 'Control stack exhausted') + ' (Real SBCL gets much deeper before giving up; this lab stops at 60 frames.)';
          G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(0, firstTry), summary: 'No base case → the stack overflows.' }); });
        }
      }
      tick();
    });
  }

  function tco(el, ctx) {
    var T = ctx.unit.templates.tcoQ;
    var q = G.choiceQ({ id: 'rec-tco', concept: 'tco', seed: ctx.seed, prompt: T.prompt, misconception: T.misconception, options: [
      { text: '1 frame', ok: true, why: T.ok }, { text: '8 frames', misconception: true, why: T.eight }, { text: '0 frames', why: T.zero }
    ] });
    G.predictThen(el, q, 'Compare them ▶', function (firstTry) {
      el.appendChild(h('h3', null, 'Without a tail call: FACT-REC'));
      var a = watchRun(el, ctx.unit, { fn: 'fact-rec', call: '(fact-rec 8)' });
      el.appendChild(h('h3', null, 'Tail call + TCO: FACT-TAIL'));
      var b = watchRun(el, ctx.unit, { fn: 'fact-tail', call: '(fact-tail 8)' }, { tco: true });
      b.stepper.activate();
      G.continueBtn(el, 'Finish level', function () { a.stepper.destroy(); b.stepper.destroy(); ctx.complete({ stars: G.stars(0, firstTry), summary: 'Tail calls with TCO reuse one frame.' }); }, true);
    });
  }

  /* Tail or Not? */
  function tail(el, ctx) {
    var X = ctx.unit.explain, T = ctx.unit.templates;
    var pool = ctx.unit.tailSnippets.filter(function (s) { return s.tier <= ctx.size; });
    var top = pool.filter(function (s) { return s.tier === ctx.size; }), rest = pool.filter(function (s) { return s.tier < ctx.size; });
    var rand = E.rng(ctx.seed);
    var list = E.shuffle(E.shuffle(top, rand).concat(E.shuffle(rest, rand)).slice(0, ctx.level.count || 5), rand);
    var k = 0, right = 0, misses = 0, hints = 0;
    var area = h('div'); el.appendChild(area);
    function next() {
      U.clear(area);
      var sn = list[k];
      var calls = L.tailCalls(sn.code, sn.name), isTail = L.isTailRecursive(sn.code, sn.name);
      area.appendChild(h('h3', null, 'Function ' + (k + 1) + ' of ' + list.length));
      var panel = U.codePanel(area, { code: sn.code, title: sn.name.toUpperCase() });
      var p = h('p.q-prompt'); p.appendChild(U.rich(U.fmt(T.tailPrompt, { name: sn.name.toUpperCase() }))); area.appendChild(p);
      var row = h('div.choices'); area.appendChild(row);
      var tools = h('div.tools'); area.appendChild(tools);
      var fb = U.feedback(area);
      var tries = 0, done = false;
      if (ctx.hints) tools.appendChild(U.button('Hint', function () { hints++; fb.show({ info: true, title: 'Hint', why: 'Find the recursive call to ' + sn.name.toUpperCase() + '. After it returns, does anything still use its value?' }); }));
      var bad = calls.filter(function (c) { return !c.tail; })[0];
      var d = { line: bad ? bad.line : '', wrapper: bad ? (bad.wrapper || '').toUpperCase() : '', k: calls.length };
      var explainCode = isTail ? 'tail.isTail' : calls.length > 1 ? 'tail.branching' : 'tail.notTail';
      [['Tail recursive', true], ['Not tail recursive', false]].forEach(function (opt) {
        var b = U.button(opt[0], function () {
          if (done || b.disabled) return;
          var ex = U.explain(X, { code: explainCode, data: d });
          if (opt[1] === isTail) {
            done = true; if (tries === 0) right++;
            CQ.store.record('tail-recursion', true, tries === 0);
            b.classList.add('is-right');
            calls.forEach(function (c) { panel.mark(c.line, c.tail ? 'is-right' : 'is-wrong'); });
            fb.show({ ok: true, title: opt[0], why: ex.why });
            U.clear(tools);
            k++;
            if (k < list.length) G.continueBtn(area, 'Next function', next);
            else G.continueBtn(area, 'Finish level', function () {
              CQ.store.noteRound(ctx.gameId, misses === 0 && hints === 0);
              ctx.complete({ stars: G.stars(hints, misses === 0), summary: right + ' of ' + list.length + ' right on the first try.' });
            });
          } else {
            tries++; misses++;
            b.disabled = true; b.classList.add('is-wrong');
            CQ.store.record('tail-recursion', false, tries === 1);
            CQ.store.noteMiss(ctx.gameId, 'tail-recursion');
            fb.show({ ok: false, title: 'Look again', why: isTail ? 'Check what happens to the recursive call\'s value: is anything done with it before returning?' : ex.why, misconception: !isTail ? ex.misconception : null });
          }
        }, { cls: 'choice big' });
        row.appendChild(b);
      });
    }
    next();
  }

  /* Fib Explosion: the player expands the call tree; repeats are flagged. */
  function fibCalls(n) { var memo = {}; function c(m) { if (m <= 2) return 1; if (memo[m]) return memo[m]; return (memo[m] = 1 + c(m - 1) + c(m - 2)); } return c(n); }
  function fibVal(n) { var a = 1, b = 1; for (var i = 3; i <= n; i++) { var t = a + b; a = b; b = t; } return n <= 2 ? 1 : b; }

  function expand(el, ctx) {
    var T = ctx.unit.templates, n = ctx.size;
    var tr = L.trace(ctx.unit.defs['fib-rec'], '(fib-rec ' + n + ')');
    var total = tr.events.filter(function (e) { return e.type === 'call'; }).length;
    var d = { n: n, calls: total };
    var q = G.choiceQ({ id: 'fib-pred', concept: 'fib-overlap', seed: ctx.seed, prompt: U.fmt(T.fibPredict, d), misconception: 'Naive Fibonacci makes one call per number.', options: [
      { text: total, ok: true, why: U.fmt(T.fibOk, d) },
      { text: n, misconception: true, why: 'One call per number would be linear. Every non-base call makes **two** calls.' },
      { text: fibVal(n), why: fibVal(n) + ' is the answer (fib ' + n + '), not the number of calls.' },
      { text: n * 2, why: 'Count the whole tree: the calls branch at every level.' }
    ] });
    G.predictThen(el, q, 'Expand it yourself ▶', function (firstTry) {
      U.codePanel(el, { code: ctx.unit.defs['fib-rec'], title: 'FIB-REC' });
      G.note(el, 'Tap a call to expand it into the two calls it makes. Base cases (n ≤ 2) return 1. Calls you have already seen are marked **↺ repeat**.');
      var stats = h('p.status', { 'aria-live': 'polite' }); el.appendChild(stats);
      var idc = 0;
      function node(m) { return { id: ++idc, m: m, label: '(fib ' + m + ')', children: [], expanded: m <= 2 }; }
      var rootN = node(n);
      var tv = U.treeView(el, { label: 'Call tree for (fib-rec ' + n + ')', nodeW: 58, onPick: pick, selectable: function (x) { return !x.expanded; } });
      var tools = h('div.tools'); el.appendChild(tools);
      tools.appendChild(U.button('Expand everything', function () { (function all(x) { if (!x.expanded) grow(x); x.children.forEach(all); })(rootN); draw(); }));
      var finished = false;
      function grow(x) { x.expanded = true; x.children = [node(x.m - 1), node(x.m - 2)]; }
      function pick(x) { if (x.expanded) return; grow(x); draw(); }
      function draw() {
        var seen = {}, count = 0, repeats = 0, open = 0;
        (function walk(x) {
          count++;
          seen[x.m] = (seen[x.m] || 0) + 1;
          x.children.forEach(walk);
        })(rootN);
        var order = {};
        (function walk(x) {
          order[x.m] = (order[x.m] || 0) + 1;
          x.state = !x.expanded ? 'active' : order[x.m] > 1 ? 'repeat' : x.m <= 2 ? 'done' : null;
          x.badge = order[x.m] > 1 ? '↺' : null;
          x.sub = x.m <= 2 ? '= 1' : (x.expanded && x.children.every(function (c) { return c.sub; }) ? '= ' + fibVal(x.m) : !x.expanded ? 'tap' : '');
          if (order[x.m] > 1) repeats++;
          if (!x.expanded) open++;
          x.children.forEach(walk);
        })(rootN);
        tv.render(rootN);
        var distinct = Object.keys(seen).length;
        stats.textContent = 'Calls so far: ' + count + ' · different subproblems: ' + distinct + ' · repeats: ' + repeats + (open ? ' · still to expand: ' + open : '');
        if (!open && !finished) {
          finished = true;
          U.clear(tools);
          G.note(el, U.fmt(T.fibDone, { calls: count, distinct: distinct, repeats: repeats }));
          var pts = [], val = [];
          for (var m = 1; m <= 25; m++) { pts.push([m, fibCalls(m)]); val.push([m, m]); }
          U.chart(el, { label: 'Calls made by FIB-REC', logY: true, yLabel: 'calls', series: [{ label: 'calls of (fib-rec n)', points: pts }, { label: 'n (linear, for comparison)', points: val }] });
          G.note(el, T.fibCurve);
          CQ.store.noteRound(ctx.gameId, firstTry);
          G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(0, firstTry), summary: U.fmt(T.fibDone, { calls: count, distinct: distinct, repeats: repeats }) }); });
        }
      }
      draw();
      setTimeout(function () { tv.focus(); }, 50);
    });
  }

  function overlap(el, ctx) {
    var T = ctx.unit.templates.overlap;
    var q = G.choiceQ({ id: 'rec-overlap', concept: 'branching', seed: ctx.seed, prompt: T.prompt, misconception: T.misconception, options: [
      { text: 'Only FIB-REC', ok: true, why: T.ok }, { text: 'Both: all branching recursion repeats work', misconception: true, why: T.both }, { text: 'Only COUNT-NUMS', why: T.count }
    ] });
    G.predictThen(el, q, 'Show both call trees ▶', function (firstTry) {
      [['fib-rec', '(fib-rec 5)'], ['count-nums', "(count-nums '(1 (2 3) 4))"]].forEach(function (pair) {
        var tr = L.trace(Object.keys(ctx.unit.defs).map(function (k) { return ctx.unit.defs[k]; }).join('\n'), pair[1]);
        var tree = L.callTree(tr.events), seen = {}, reps = 0, cnt = 0;
        (function walk(x) {
          cnt++;
          var key = x.label;
          seen[key] = (seen[key] || 0) + 1;
          x.label = x.label.replace('(FIB-REC', '(fib').replace('(COUNT-NUMS', '(cn');
          if (seen[key] > 1) { x.state = 'repeat'; x.badge = '↺'; reps++; }
          x.sub = '→ ' + x.value;
          x.children.forEach(walk);
        })(tree);
        el.appendChild(h('h3', null, pair[1] + ': ' + cnt + ' calls, ' + reps + ' repeated'));
        U.treeView(el, { label: 'Call tree for ' + pair[1], nodeW: pair[0] === 'fib-rec' ? 56 : 92 }).render(tree);
      });
      G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(0, firstTry), summary: 'Overlapping subproblems make FIB-REC exponential; COUNT-NUMS has none.' }); });
    });
  }

  /* Briefing steps and Boss tasks for Unit 4 (see app.js registries). */
  G.briefingKinds = G.briefingKinds || {};
  G.briefingKinds.tower = function (area, s, unit, after) {
    var w = watchRun(area, unit, s.run, { onEnd: function () { if (!w.done) { w.done = true; after(); } } });
    w.stepper.play();
  };
  G.briefingKinds.overflow = function (area, s, unit, after) {
    G.continueBtn(area, 'Run (fact-broken 4) ▶', function () {
      var tr = L.trace(unit.broken.code, unit.broken.call, { maxDepth: 40 });
      var sv = U.stackView(area);
      var calls = tr.events.filter(function (e) { return e.type === 'call'; }), shown = 0;
      (function tick() {
        shown++;
        sv.render(calls.slice(Math.max(0, shown - 8), shown).map(function (e) { return { label: labelOf(e), sub: 'waiting…', state: 'wait' }; }), 'Stack depth: ' + shown);
        if (shown < calls.length) setTimeout(tick, U.reducedMotion() ? 0 : 50);
        else { area.appendChild(h('p.feedback.is-bad', { role: 'alert' }, '💥 ' + tr.error)); after(); }
      })();
    });
  };
  G.tasks = G.tasks || {};
  G.tasks.tower = function (container, q, unit, done) { G.towerTask(container, { unit: unit, run: q.run, hints: false, onDone: done }); };

  G.tower = { mount: function (el, ctx) { ({ watch: watch, predict: predict, topple: topple, tco: tco })[ctx.level.kind](el, ctx); } };
  G.tail = { mount: tail };
  G.fib = { mount: function (el, ctx) { (ctx.level.kind === 'expand' ? expand : overlap)(el, ctx); } };
  G.recursionHelpers = { watchRun: watchRun, framesAt: framesAt };
})(typeof globalThis !== 'undefined' ? globalThis : this);
