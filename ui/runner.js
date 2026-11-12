/* CPS305 Quest — ui/runner.js
 * The Try/Solo player. Runs the real algorithm, asks the player to make each
 * decision the algorithm makes, and lets the referee judge it.
 *   correct -> animate the algorithm's next steps (counters tick up)
 *   wrong   -> explain why, name the misconception, offer "Show next step"
 * Two misses on one concept -> a worked example (and the tier drops next round).
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, h = U.h;

  function buildTrace(o) {
    if (o.algo === 'binary') return E.collect(E.binarySearch(o.values, o.key));
    if (o.algo === 'linear') return E.collect(E.linearSearch(o.values, o.key));
    if (o.sortOpts) return E.collect(E.sorts[o.algo].gen(o.values, o.comp, o.sortOpts));
    return E.runSort(o.algo, o.values, o.comp);
  }

  /* opts: { algo, values, key, unit, gameId, hints, maxDecisions, bars, conceal, showCode, onDone(result) } */
  U.runner = function (container, opts) {
    var unit = opts.unit;
    var trace = buildTrace(opts);
    var ds = E.referee.decisions(opts.algo, trace);
    if (opts.maxDecisions) ds = ds.slice(0, opts.maxDecisions);
    var isSearch = opts.algo === 'binary' || opts.algo === 'linear';
    var lisp = unit.lisp[opts.algo];

    var wrap = h('div.runner');
    container.appendChild(wrap);
    if (isSearch && opts.key != null) wrap.appendChild(h('p.target', null, 'Looking for key ', h('strong.key', null, String(opts.key))));
    var promptEl = h('p.prompt', { 'aria-live': 'polite' });
    wrap.appendChild(promptEl);
    var stage = h('div.stage');
    wrap.appendChild(stage);
    var view = U.arrayView(stage, { onPick: choose, bars: opts.bars, held: opts.algo === 'insertionShift' || opts.algo === 'binaryInsertion', label: 'Array for ' + (lisp ? lisp.title : opts.algo) });
    var choiceRow = h('div.choice-row'); wrap.appendChild(choiceRow);
    var tools = h('div.tools');
    wrap.appendChild(tools);
    var keys = isSearch ? ['probes'] : opts.algo === 'insertionShift' || opts.algo === 'binaryInsertion' ? ['comparisons', 'shifts'] : opts.algo === 'merge' ? ['comparisons', 'writes'] : ['comparisons', 'swaps'];
    var side = h('div.runner-side'); wrap.appendChild(side);
    var counters = U.counters(side, keys);
    var narr = h('p.narration', { 'aria-live': 'polite' });
    side.appendChild(narr);
    var code = opts.showCode !== false && lisp ? U.codePanel(side, { code: lisp.code, title: lisp.title }) : null;
    var fb = U.feedback(wrap);

    var d = 0, misses = 0, hintsUsed = 0, missHere = 0, busy = false, dead = false, workedShown = 0;
    var probed = {};
    var badCell = null;

    if (opts.hints) {
      tools.appendChild(U.button('Why?', why, { attrs: { title: 'Explain the rule for this step' } }));
      tools.appendChild(U.button('Show next step', function () { showNext(false); }, { attrs: { title: 'The game makes this move for you and explains it' } }));
    }

    function anchor(s) { return lisp && lisp.anchors[s.at]; }
    function decorate(s, dec) {
      var st = Object.assign({}, s);
      st.cellState = {};
      if (badCell != null) st.cellState[badCell] = 'bad';
      if (dec) {
        if (dec.type === 'pick') st.selectable = function () { return !busy && !dead; };
        if (dec.focus) st.focus = dec.focus;
        st.compare = null; st.swap = null;
        if (opts.algo === 'binary') {
          st.marks = { lb: dec.lb, ub: dec.ub };
          st.regions = [];
          if (dec.lb > 0) st.regions.push({ from: 0, to: dec.lb - 1, kind: 'discarded' });
          if (dec.ub < s.arr.length - 1) st.regions.push({ from: dec.ub + 1, to: s.arr.length - 1, kind: 'discarded' });
        }
        if (opts.algo === 'selection') st.marks = { cur: dec.promptData.cur };
        if (opts.algo === 'linear') st.marks = {};
      }
      if (opts.conceal) st.conceal = function (i) { return !probed[i] && !dead; };
      return st;
    }
    function show(s, dec) {
      view.render(decorate(s, dec));
      counters.set(s.counters);
      if (code) code.highlight(anchor(s));
    }

    function present() {
      if (d >= ds.length) { finish(); return; }
      var dec = ds[d];
      badCell = null;
      show(trace[dec.showAt], dec);
      var p = U.fmt(unit.prompts[dec.prompt], dec.promptData);
      promptEl.textContent = p;
      U.clear(choiceRow);
      if (dec.type === 'choice') {
        dec.options.forEach(function (o, i) {
          var lab = dec.labels && dec.labels[o] ? dec.labels[o] : o === 'swap' ? '⇄ Swap' : '✓ Keep';
          choiceRow.appendChild(U.button(h('span', null, h('kbd', null, String(i + 1)), ' ', lab), function () { choose(o); }, { cls: 'choice big' }));
        });
      }
      U.announce(p);
    }

    function choose(choice) {
      if (busy || dead || d >= ds.length) return;
      var dec = ds[d];
      var res = dec.check(choice);
      if (res.ok) {
        CQ.store.record(dec.concept, true, missHere === 0);
        fb.hide();
        if (opts.onCorrect) opts.onCorrect();
        advance(dec);
      } else {
        misses++; missHere++;
        CQ.store.record(dec.concept, false, missHere === 1);
        var adapt = CQ.store.noteMiss(opts.gameId || 'misc', dec.concept);
        var ex = U.explain(unit.explain, res);
        if (typeof choice === 'number') { badCell = choice; show(trace[dec.showAt], dec); }
        var actions = [{ label: 'Try again', fn: function () { fb.hide(); badCell = null; show(trace[dec.showAt], dec); view.focus(); }, primary: true },
                       { label: 'Show next step', fn: function () { showNext(true); } }];
        fb.show({ ok: false, title: ex.title || 'Not quite', why: ex.why, misconception: ex.misconception, actions: actions });
        U.announce('Not quite. ' + ex.why);
        if (adapt.workedExample && workedShown < 2) {
          workedShown++;
          fb.show({ ok: false, title: 'Two slips on this idea. Here\'s a worked example.', why: ex.why + ' Watch the algorithm make this move, then you take the next one.', misconception: ex.misconception,
            actions: [{ label: 'Show me', fn: function () { showNext(true); }, primary: true }] });
        }
      }
    }

    function why() {
      if (d >= ds.length) return;
      hintsUsed++;
      var dec = ds[d];
      fb.show({ info: true, title: 'Why?', why: U.fmt(unit.prompts[dec.hint.code], dec.hint.data) });
    }

    /* Worked step: the game makes the correct move and says why. */
    function showNext(fromMiss) {
      if (busy || d >= ds.length) return;
      if (!fromMiss) hintsUsed++;
      var dec = ds[d];
      badCell = null;
      var hint = U.fmt(unit.prompts[dec.hint.code], dec.hint.data);
      fb.show({ info: true, title: 'Next step', why: hint });
      if (typeof dec.expected === 'number') {
        var s = decorate(trace[dec.showAt], dec);
        s.cellState = {}; s.cellState[dec.expected] = 'ok';
        view.render(s);
      }
      busy = true;
      setTimeout(function () { busy = false; advance(dec); }, U.reducedMotion() ? 300 : 900);
    }

    function stepDelay() { return U.reducedMotion() ? 0 : 420 / (CQ.store.setting('speed') || 1); }

    function advance(dec) {
      busy = true;
      if (typeof dec.expected === 'number' && (opts.algo === 'binary' || opts.algo === 'linear')) probed[dec.expected] = true;
      var k = dec.showAt + 1;
      U.clear(choiceRow);
      function step() {
        if (k > dec.resumeTo) {
          busy = false; missHere = 0; d++;
          narr.textContent = trace[dec.resumeTo].msg || '';
          present();
          return;
        }
        show(trace[k]);
        narr.textContent = trace[k].msg || '';
        k++;
        var t = stepDelay();
        if (t === 0) step(); else setTimeout(step, t);
      }
      step();
    }

    function finish() {
      // Play out whatever is left after the last decision (e.g. the final RETURN).
      dead = true;
      var cut = opts.maxDecisions && ds.length && ds.length < E.referee.decisions(opts.algo, trace).length;
      var lastS = cut ? trace[ds[ds.length - 1].resumeTo] : trace[trace.length - 1];
      show(lastS);
      narr.textContent = lastS.msg || '';
      promptEl.textContent = cut ? 'Those were the passes we needed.' : isSearch ? (lastS.found != null ? 'Found it at index ' + lastS.found + '.' : 'Not in the array: ' + (opts.algo === 'binary' ? 'BIN-SEARCH' : 'LIN-SEARCH') + ' returns NIL.') : 'Sorted!';
      U.clear(choiceRow); U.clear(tools);
      if (opts.onDone) opts.onDone({ misses: misses, hintsUsed: hintsUsed, counters: lastS.counters, found: lastS.found });
    }

    // S / K keyboard shortcuts for swap/keep decisions.
    function onKey(e) {
      if (!document.body.contains(wrap)) { document.removeEventListener('keydown', onKey); return; }
      if (U.typing(e) || e.ctrlKey || e.metaKey || e.altKey || d >= ds.length || ds[d].type !== 'choice') return;
      var opts2 = ds[d].options, n = parseInt(e.key, 10);
      if (n >= 1 && n <= opts2.length) choose(opts2[n - 1]);
      else if ((e.key === 's' || e.key === 'S') && opts2.indexOf('swap') >= 0) choose('swap');
      else if ((e.key === 'k' || e.key === 'K') && opts2.indexOf('keep') >= 0) choose('keep');
    }
    document.addEventListener('keydown', onKey);

    present();
    setTimeout(function () { if (ds[d] && ds[d].type === 'pick') view.focus(); }, 50);
    return { el: wrap, trace: trace, decisions: ds };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
