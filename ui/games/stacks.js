/* CPS305 Quest — ui/games/stacks.js
 * Unit 8: Bracket Bouncer (push/pop), Ring Road (circular buffer + shifting
 * queue), Two-Stack Deque, Monotonic Climb, Set Lab (Venn + A-list lookup).
 * Refereed by engine/stacks.js.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, S = E.stacks, G = CQ.games, h = U.h;

  /* ---------- Bracket Bouncer ---------- */
  G.bracketTask = function (el, opts) {
    var unit = opts.unit, T = unit.templates, sym = opts.symbols;
    var run = S.parChecker(sym), k = 0, misses = 0, hints = 0, stack = [];
    var tape = h('div.tape', { 'aria-label': 'Input symbols' }); el.appendChild(tape);
    var cols = h('div.rec-cols'); el.appendChild(cols);
    var left = h('div'), right = h('div'); cols.appendChild(left); cols.appendChild(right);
    var sv = U.stackView(left, { label: 'Stack s' });
    var panel = U.codePanel(right, { code: unit.lisp.par.code, title: unit.lisp.par.title });
    var prompt = h('p.prompt', { 'aria-live': 'polite' }); el.appendChild(prompt);
    var row = h('div.choice-row'); el.appendChild(row);
    var tools = h('div.tools'); el.appendChild(tools);
    var fb = U.feedback(el);
    if (opts.hints) tools.appendChild(U.button('Why?', function () { hints++; var st = run.steps[k]; fb.show({ info: true, title: 'The rule', why: st ? T.bracketWhy[st.action] : 'At the end, the result form is (null s): T only if the stack is empty.' }); }));
    function drawTape() {
      U.clear(tape);
      sym.forEach(function (x, i) { tape.appendChild(h('span.tape-sym' + (i === k ? '.is-current' : i < k ? '.is-done' : ''), null, x)); });
    }
    function present() {
      drawTape();
      sv.render(stack.map(function (x) { return { label: x }; }), 'Stack s: ' + stack.length);
      U.clear(row);
      var ended = k >= run.steps.length;
      if (ended && run.reason !== 'ok' && run.reason !== 'leftover') return finish();
      if (ended) {
        prompt.innerHTML = ''; prompt.appendChild(U.rich(U.fmt(T.bracketEndPrompt, { depth: stack.length })));
        panel.highlight(4);
        [['T', 'T (balanced)'], ['NIL', 'NIL (unbalanced)']].forEach(function (o, i) { row.appendChild(U.button(h('span', null, h('kbd', null, String(i + 1)), ' ' + o[1]), function () { answerEnd(o[0]); }, { cls: 'choice big' })); });
        return;
      }
      prompt.innerHTML = ''; prompt.appendChild(U.rich(U.fmt(T.bracketPrompt, { sym: sym[k], depth: stack.length })));
      [['push', '⬆ PUSH it'], ['pop', '⬇ POP'], ['failEmpty', '✋ Return NIL: nothing to match'], ['failInvalid', '🚫 Return NIL: invalid symbol']].forEach(function (o, i) {
        row.appendChild(U.button(h('span', null, h('kbd', null, String(i + 1)), ' ' + o[1]), function () { answer(o[0]); }, { cls: 'choice' }));
      });
    }
    function answer(a) {
      var st = run.steps[k];
      if (a === st.action) {
        CQ.store.record('par-checker', true, true);
        fb.hide();
        stack = st.stack.slice();
        panel.highlight(unit.lisp.par.anchors[st.action]);
        k++;
        if (st.action === 'failEmpty' || st.action === 'failInvalid') { fb.show({ ok: true, title: 'Returns NIL', why: T.bracketWhy[st.action] }); return finish(); }
        present();
      } else {
        misses++; CQ.store.record('par-checker', false, true);
        if (opts.gameId) CQ.store.noteMiss(opts.gameId, 'par-checker');
        fb.show({ ok: false, title: 'Not quite', why: T.bracketWhy[st.action] });
      }
    }
    function answerEnd(v) {
      var exp = run.result ? 'T' : 'NIL';
      if (v === exp) { CQ.store.record('par-checker', true, true); fb.show({ ok: true, title: 'Returns ' + exp, why: run.result ? 'Every [ was matched: the stack is empty.' : 'A [ is left on the stack: (null s) is NIL.' }); finish(); }
      else { misses++; CQ.store.record('par-checker', false, true); fb.show({ ok: false, title: 'Look at the stack', why: 'The result form is (null s). The stack holds ' + stack.length + ' element(s).' }); }
    }
    function onKey(e) {
      if (!document.body.contains(el)) { document.removeEventListener('keydown', onKey); return; }
      if (U.typing(e)) return;
      var n = parseInt(e.key, 10), b = row.children[n - 1];
      if (b) b.click();
    }
    document.addEventListener('keydown', onKey);
    function finish() {
      drawTape(); U.clear(row); U.clear(tools);
      prompt.textContent = '(par-checker \'(' + sym.join(' ') + ')) → ' + (run.result ? 'T' : 'NIL');
      opts.onDone({ misses: misses, hints: hints, summary: prompt.textContent });
    }
    present();
  };
  function bracket(el, ctx) {
    var pool = S.bracketSets[ctx.size] || S.bracketSets[1], list = E.shuffle(pool, E.rng(ctx.seed)).slice(0, ctx.level.count || 3), k = 0, misses = 0, hints = 0;
    var area = h('div'); el.appendChild(area);
    function next() {
      U.clear(area);
      area.appendChild(h('h3', null, 'String ' + (k + 1) + ' of ' + list.length));
      G.bracketTask(area, { unit: ctx.unit, symbols: list[k], hints: ctx.hints, gameId: ctx.gameId, onDone: function (r) {
        misses += r.misses; hints += r.hints; k++;
        if (k < list.length) G.continueBtn(area, 'Next string', next);
        else G.continueBtn(area, 'Finish level', function () { CQ.store.noteRound(ctx.gameId, misses === 0 && hints === 0); ctx.complete({ stars: G.stars(hints, misses === 0), summary: list.length + ' strings checked.' }); });
      } });
    }
    next();
  }

  /* ---------- Ring Road ---------- */
  function ringView(container) {
    var el = h('div.ring', { role: 'group', 'aria-label': 'Circular buffer' }); container.appendChild(el);
    return function (q, opts) {
      opts = opts || {};
      U.clear(el);
      for (var i = 0; i < q.size; i++) {
        var live = (i - q.head + q.size) % q.size < q.count;
        var tag = (i === q.head ? 'H' : '') + (i === q.tail ? 'T' : '');
        var label = 'Slot ' + i + (live ? ': ' + q.data[i] : ': free' + (q.data[i] != null ? ' (stale ' + q.data[i] + ')' : '')) + (i === q.head ? ', head' : '') + (i === q.tail ? ', tail' : '');
        var b = h(opts.pick ? 'button.ring-slot' : 'div.ring-slot', opts.pick ? { type: 'button', 'aria-label': label, on: { click: (function (j) { return function () { opts.pick(j); }; })(i) } } : { 'aria-label': label },
          h('span.slot-i', null, String(i)), h('span.ring-v' + (live ? '' : '.is-stale'), null, q.data[i] == null ? '—' : String(q.data[i])),
          tag ? h('span.ring-tag', null, (i === q.head ? '◀ head ' : '') + (i === q.tail ? 'tail ▶' : '')) : null);
        if (opts.state && opts.state[i]) b.classList.add('is-' + opts.state[i]);
        el.appendChild(b);
      }
    };
  }
  function ring(el, ctx) {
    var T = ctx.unit.templates, size = ctx.level.size, ops = S.ringScript(size, ctx.seed);
    var q = S.ringCreate(size), arr = [], moves = 0, k = 0, misses = 0, hints = 0;
    G.note(el, 'Lecture code: **head** is the next slot to remove, **tail** the next free slot. Both wrap to 0 after slot ' + (size - 1) + '.');
    var prompt = h('p.prompt', { 'aria-live': 'polite' }); el.appendChild(prompt);
    var draw = ringView(el);
    var cnt = U.counters(el, ['shifts']);
    el.appendChild(h('h3', null, 'Same operations on a plain array queue'));
    var plain = h('p.plainq', { 'aria-live': 'polite' }); el.appendChild(plain);
    U.codePanel(el, { code: ctx.unit.lisp.ring.code, title: ctx.unit.lisp.ring.title });
    var tools = h('div.tools'); el.appendChild(tools);
    var fb = U.feedback(el);
    if (ctx.hints) tools.appendChild(U.button('Why?', function () { hints++; var o = ops[k]; fb.show({ info: true, title: 'Where to look', why: o.op === 'enqueue' ? 'ENQUEUE writes at tail (slot ' + q.tail + ').' : 'DEQUEUE reads at head (slot ' + q.head + ').' }); }));
    function present(state) {
      draw(q, { pick: k < ops.length ? pick : null, state: state });
      plain.textContent = '[' + arr.join(' ') + ']  · shifts so far: ' + moves;
      cnt.set({ shifts: moves });
      if (k < ops.length) { var o = ops[k]; prompt.innerHTML = ''; prompt.appendChild(U.rich(U.fmt(T.ringPrompt[o.op], { x: o.x }))); }
    }
    function pick(i) {
      var o = ops[k], r = S.ringOp(q, o.op, o.x);
      if (i === r.slot) {
        CQ.store.record('circular-buffer', true, true);
        var d = { t: q.tail, t2: r.q.tail, h: q.head, h2: r.q.head, wrap: r.wrapped ? ' (it wrapped around to 0)' : '' };
        fb.show({ ok: true, title: o.op === 'enqueue' ? 'Wrote ' + o.x + ' at slot ' + i : 'Read ' + r.value + ' from slot ' + i, why: U.fmt(T.ringWhy[o.op], d) });
        q = r.q;
        var pr = S.shiftQueueOp(arr, o.op, o.x); arr = pr.arr; moves += pr.moves;
        k++;
        var st = {}; st[i] = 'ok';
        present(st);
        if (k >= ops.length) finish();
      } else {
        misses++; CQ.store.record('circular-buffer', false, true);
        CQ.store.noteMiss(ctx.gameId, 'circular-buffer');
        var bad = {}; bad[i] = 'bad';
        fb.show({ ok: false, title: 'Not slot ' + i, why: o.op === 'enqueue' ? 'ENQUEUE always writes at tail, which is slot ' + q.tail + '. Nothing ever shifts.' : 'DEQUEUE always reads at head, slot ' + q.head + ' (the oldest element).', misconception: o.op === 'dequeue' && i === q.tail ? 'Dequeue takes the newest element.' : null });
        present(bad);
      }
    }
    function finish() {
      U.clear(tools); prompt.textContent = '';
      G.note(el, 'Ring buffer: 0 elements moved. Plain array queue: ' + moves + ' shifts for the same ' + ops.length + ' operations.');
      CQ.store.noteRound(ctx.gameId, misses === 0 && hints === 0);
      G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(hints, misses === 0), summary: ops.length + ' operations, 0 shifts (plain array: ' + moves + ').' }); });
    }
    present();
  }

  function deque(el, ctx) {
    var script = [['pushBack', 1], ['pushBack', 2], ['pushBack', 3], ['popFront'], ['pushFront', 0], ['popBack'], ['popBack']];
    var frames = [{ dq: { front: [], back: [] }, msg: 'Empty deque: two stacks, FRONT and BACK.' }], dq = { front: [], back: [] };
    script.forEach(function (s) {
      var r = S.dequeOp(dq, s[0], s[1]); dq = r.dq;
      var name = { pushFront: 'push-front', pushBack: 'push-back', popFront: 'pop-front', popBack: 'pop-back' }[s[0]];
      frames.push({ dq: dq, msg: name + (s[1] != null ? ' ' + s[1] : '') + (r.moved ? ': that stack was empty, so ' + r.moved + ' item(s) moved across (reversed), then popped ' + r.value + '.' : r.value != null ? ': popped ' + r.value + '.' : '.') });
    });
    var cols = h('div.rec-cols'); el.appendChild(cols);
    var a = h('div'), b = h('div'); cols.appendChild(a); cols.appendChild(b);
    var fv = U.stackView(a, { label: 'Front stack' }), bv = U.stackView(b, { label: 'Back stack' });
    var narr = h('p.narration', { 'aria-live': 'polite' }); el.appendChild(narr);
    var ctrl = h('div'); el.insertBefore(ctrl, cols);
    var st = U.stepper(ctrl, { count: frames.length, onShow: function (k) {
      var f = frames[k];
      fv.render(f.dq.front.map(function (x) { return { label: String(x) }; }), 'FRONT stack (top = front of deque)');
      bv.render(f.dq.back.map(function (x) { return { label: String(x) }; }), 'BACK stack (top = back of deque)');
      narr.textContent = f.msg;
    } });
    st.play();
    G.continueBtn(el, 'Finish level', function () { st.destroy(); ctx.complete({ stars: 3, summary: 'A deque from two stacks: moving items across reverses them.' }); }, true);
  }

  /* ---------- Monotonic Climb ---------- */
  function mono(el, ctx) {
    var T = ctx.unit.templates, r = E.rng(ctx.seed), stack = [1, 2, 5, 7], rounds = ctx.level.rounds || 5, k = 0, misses = 0, hints = 0;
    var prompt = h('p.prompt', { 'aria-live': 'polite' }); el.appendChild(prompt);
    var sv = U.stackView(el, { label: 'Monotonic stack' });
    var pickRow = h('div.choice-row'); el.appendChild(pickRow);
    var tools = h('div.tools'); el.appendChild(tools);
    var fb = U.feedback(el);
    var x, chosen;
    function present() {
      x = k === 0 ? 3 : E.randInt(r, 1, 12);
      chosen = {};
      prompt.innerHTML = ''; prompt.appendChild(U.rich(U.fmt(T.monoPrompt, { stack: stack.join(', '), x: x })));
      sv.render(stack.map(function (v) { return { label: String(v) }; }));
      U.clear(pickRow);
      stack.slice().reverse().forEach(function (v, i) {
        var idx = stack.length - 1 - i;
        var b = U.button(String(v), function () { chosen[idx] = !chosen[idx]; b.classList.toggle('is-selected', chosen[idx]); b.setAttribute('aria-pressed', chosen[idx] ? 'true' : 'false'); }, { cls: 'choice mono pop-pick', attrs: { 'aria-pressed': 'false', 'aria-label': 'Element ' + v + (i === 0 ? ' (top)' : '') } });
        pickRow.appendChild(b);
      });
      pickRow.appendChild(U.button('Confirm pops', confirm, { cls: 'primary' }));
    }
    if (ctx.hints) tools.appendChild(U.button('Why?', function () { hints++; fb.show({ info: true, title: 'The rule', why: 'Look at the top. If it is bigger than ' + x + ', it pops. Repeat with the new top. Stop at the first element ≤ ' + x + '.' }); }));
    function confirm() {
      var res = S.monoPush(stack, x);
      var expIdx = {}; for (var i = 0; i < res.popped.length; i++) expIdx[stack.length - 1 - i] = true;
      var ok = Object.keys(expIdx).length === Object.keys(chosen).filter(function (q) { return chosen[q]; }).length && Object.keys(expIdx).every(function (q) { return chosen[q]; });
      var d = { popped: res.popped.length ? res.popped.join(', ') : 'nothing', after: res.stack.join(', '), x: x };
      if (ok) { CQ.store.record('monotonic', true, true); fb.show({ ok: true, title: 'Correct', why: U.fmt(T.monoOk, d) }); }
      else { misses++; CQ.store.record('monotonic', false, true); fb.show({ ok: false, title: 'Not quite', why: U.fmt(T.monoBad, d) + ' ' + U.fmt(T.monoOk, d) }); }
      stack = res.stack.length > 7 ? res.stack.slice(-5) : res.stack;
      k++;
      U.clear(pickRow);
      if (k < rounds) G.continueBtn(pickRow, 'Next push', present);
      else { U.clear(tools); CQ.store.noteRound(ctx.gameId, misses === 0 && hints === 0); G.continueBtn(pickRow, 'Finish level', function () { ctx.complete({ stars: G.stars(hints, misses === 0), summary: rounds + ' pushes, ' + misses + ' slip(s).' }); }); }
    }
    present();
  }

  /* ---------- Set Lab ---------- */
  function venn(el, ctx) {
    var r = E.rng(ctx.seed);
    var A = E.shuffle([1, 2, 3, 4, 5, 6, 7, 8], r).slice(0, 5), B = E.shuffle([3, 4, 5, 6, 7, 8, 9, 10], r).slice(0, 5);
    var tasks = [['union', 'A ∪ B: every element in A or B'], ['intersection', 'A ∩ B: elements in both'], ['difference', 'A − B: in A but not in B']];
    var k = 0, misses = 0;
    el.appendChild(h('p.status', null, 'A = (' + A.join(' ') + ')   B = (' + B.join(' ') + ')'));
    var area = h('div'); el.appendChild(area);
    function next() {
      U.clear(area);
      if (k >= tasks.length) {
        var sb = S.subset(A.slice(0, 2), B);
        area.appendChild(h('p.q-prompt', null, 'Is (' + A.slice(0, 2).join(' ') + ') a subset of B?'));
        var row = h('div.choices'); area.appendChild(row);
        var fb2 = U.feedback(area);
        [['T', true], ['NIL', false]].forEach(function (o) {
          var b = U.button(o[0], function () {
            if (o[1] === sb.result) { fb2.show({ ok: true, title: o[0], why: 'SUBSET-SET calls MEMBER for each element of A: ' + sb.scans + ' scans in total.' }); finish(); }
            else { misses++; b.disabled = true; fb2.show({ ok: false, title: 'Check each element', why: 'Every element of A must be a MEMBER of B.' }); }
          }, { cls: 'choice' });
          row.appendChild(b);
        });
        return;
      }
      var t = tasks[k], res = S[t[0]](A, B);
      var want = {}; res.set.forEach(function (v) { want[v] = true; });
      area.appendChild(h('p.q-prompt', null, 'Tap every element of ' + t[1] + ', then check.'));
      var chosen = {};
      var row2 = h('div.choice-row'); area.appendChild(row2);
      A.concat(B).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; }).forEach(function (v) {
        var b = U.button(String(v), function () { chosen[v] = !chosen[v]; b.classList.toggle('is-selected', chosen[v]); b.setAttribute('aria-pressed', chosen[v] ? 'true' : 'false'); },
          { cls: 'choice mono pop-pick', attrs: { 'aria-pressed': 'false', 'aria-label': v + (A.indexOf(v) >= 0 ? ', in A' : '') + (B.indexOf(v) >= 0 ? ', in B' : '') } });
        b.appendChild(h('span.small', null, ' ' + (A.indexOf(v) >= 0 ? 'A' : '') + (B.indexOf(v) >= 0 ? 'B' : '')));
        row2.appendChild(b);
      });
      var fb = U.feedback(area);
      area.appendChild(h('div.actions', null, U.button('Check', function () {
        var ok = Object.keys(want).every(function (v) { return chosen[v]; }) && Object.keys(chosen).filter(function (v) { return chosen[v]; }).every(function (v) { return want[v]; });
        if (ok) { CQ.store.record('sets', true, true); fb.show({ ok: true, title: '(' + res.set.join(' ') + ')', why: 'With list-based sets this takes ' + res.scans + ' MEMBER comparisons: each element of A scans B (or the growing result).' }); k++; G.continueBtn(area, 'Next', next); }
        else { misses++; CQ.store.record('sets', false, true); fb.show({ ok: false, title: 'Not quite', why: 'The answer is (' + res.set.join(' ') + '). Elements tagged A are in A, B in B.' }); }
      }, { cls: 'primary' })));
    }
    function finish() { G.continueBtn(area, 'Finish level', function () { ctx.complete({ stars: misses === 0 ? 3 : misses < 3 ? 2 : 1, summary: 'Set operations on lists cost O(n) MEMBER scans each.' }); }); }
    next();
  }
  function alist(el, ctx) {
    var words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    var q = G.choiceQ({ id: 'alist', concept: 'alists', seed: ctx.seed, prompt: 'An a-list has n pairs. Looking up a key that is missing makes how many key comparisons?', options: [
      { text: 'n', ok: true, why: 'ASSOC has to check every pair to be sure the key isn\'t there: O(n). That\'s the cost hash tables remove (Unit 9).' }, { text: '1', why: 'Only a hash table jumps straight to the right place.' }, { text: 'log₂ n', why: 'An a-list isn\'t sorted, and ASSOC walks it front to back.' }
    ] });
    G.predictThen(el, q, 'Watch ASSOC ▶', function (ft) {
      var al = words.map(function (w, i) { return [w, i + 1]; });
      var sel = h('select', { 'aria-label': 'Key to look up' });
      words.concat(['eleven']).forEach(function (w) { sel.appendChild(h('option', { value: w }, "'" + w)); });
      var out = h('div.lanes', { 'aria-live': 'polite' });
      el.appendChild(h('label.slider-row', null, '(assoc ', sel, ' *words*)')); el.appendChild(out);
      function upd() { var res = S.assocScans(sel.value, al); U.clear(out); out.appendChild(h('div.lane', null, h('span.lane-name', null, 'ASSOC'), h('span.lane-track', null, h('span.lane-bar.seg1', { style: { width: (res.scans / al.length * 100) + '%' } })), h('span.lane-val', null, res.scans + ' comparisons' + (res.found ? '' : ' → NIL')))); }
      sel.addEventListener('change', upd); upd();
      var pts = []; for (var n = 10; n <= 1000; n += 90) pts.push([n, n]);
      var hp = pts.map(function (p) { return [p[0], 1]; });
      U.chart(el, { label: 'Worst-case lookup cost', xLabel: 'pairs n', yLabel: 'comparisons', series: [{ label: 'a-list (ASSOC)', points: pts }, { label: 'hash table (average)', points: hp }] });
      G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(0, ft), summary: 'ASSOC is O(n); hashing is next.' }); }, true);
    });
  }

  /* ---------- briefing steps, tasks ---------- */
  G.briefingKinds = G.briefingKinds || {};
  G.briefingKinds.lifoFifo = function (area, s, unit, after) {
    var stack = [1, 2, 3], queue = [1, 2, 3];
    var cols = h('div.rec-cols'); area.appendChild(cols);
    var a = h('div'), b = h('div'); cols.appendChild(a); cols.appendChild(b);
    var sv = U.stackView(a, { label: 'Stack' });
    var qv = h('p.plainq'); b.appendChild(h('p.small', null, 'Queue (front on the left)')); b.appendChild(qv);
    var log = h('p.narration', { 'aria-live': 'polite' }); area.appendChild(log);
    function draw() { sv.render(stack.map(function (x) { return { label: 'plate ' + x }; }), 'Stack (top first)'); qv.textContent = queue.length ? queue.join(' ← ') : '(empty)'; }
    draw();
    var btn = U.button('Remove one from each', function () {
      var p = stack.pop(), d = queue.shift();
      log.textContent = 'pop → ' + p + '   ·   dequeue → ' + d;
      draw();
      if (!stack.length) { btn.remove(); after(); }
    }, { cls: 'primary' });
    area.appendChild(h('div.actions', null, btn));
  };
  G.briefingKinds.ringDemo = function (area, s, unit, after) {
    var q = S.ringCreate(4), draw = ringView(area), log = h('p.narration', { 'aria-live': 'polite' });
    area.appendChild(log);
    var ops = [['enqueue', 'a'], ['enqueue', 'b'], ['enqueue', 'c'], ['dequeue'], ['enqueue', 'd'], ['enqueue', 'e'], ['dequeue']], k = 0;
    draw(q);
    var btn = U.button('Next operation ▶', function () {
      var o = ops[k], r = S.ringOp(q, o[0], o[1]); q = r.q;
      log.textContent = '(' + o[0] + ' q' + (o[1] ? ' ' + o[1] : '') + ') used slot ' + r.slot + (r.wrapped ? ': and wrapped around to 0!' : '.');
      draw(q); k++;
      if (k >= ops.length) { btn.remove(); after(); }
    }, { cls: 'primary' });
    area.appendChild(h('div.actions', null, btn));
  };
  G.tasks = G.tasks || {};
  G.tasks.bracket = function (container, q, unit, done) { G.bracketTask(container, { unit: unit, symbols: q.symbols, hints: false, onDone: done }); };

  G.bracket = { mount: bracket };
  G.ring = { mount: function (el, ctx) { (ctx.level.kind === 'deque' ? deque : ring)(el, ctx); } };
  G.mono = { mount: mono };
  G.setlab = { mount: function (el, ctx) { (ctx.level.kind === 'venn' ? venn : alist)(el, ctx); } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
