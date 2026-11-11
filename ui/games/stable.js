/* CPS305 Quest — ui/games/stable.js
 * Stable or Not? Core verb: PREDICT ORDER. Cards with equal values carry a tag
 * (a, b) shown as a letter AND a pattern. Predict whether the tags keep their
 * order, then watch. The engine decides the answer by running the real sort.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, G = CQ.games, h = U.h;

  /* One deck, three sorts. 5a starts before 5b. */
  var DECK = [{ id: 0, v: 5, tag: 'a' }, { id: 1, v: 3 }, { id: 2, v: 5, tag: 'b' }, { id: 3, v: 1 }];

  function three(el, ctx) {
    var T = ctx.unit.templates;
    var algos = ['selection', 'insertion', 'bubble'], k = 0, firstAll = true, hints = 0;
    var area = h('div'); el.appendChild(area);
    function round() {
      U.clear(area);
      var algo = algos[k];
      var out = E.runSort(algo, DECK).pop().arr;
      var kept = E.isStableResult(E.toItems(DECK), out);
      var d = { algo: E.sorts[algo].name, final: out.map(function (it) { return it.v + (it.tag || ''); }).join(' ') };
      area.appendChild(h('h3', null, 'Sort ' + (k + 1) + ' of 3: ' + d.algo));
      var deckView = U.arrayView(area, { label: 'The deck before sorting' });
      deckView.render({ arr: E.toItems(DECK), marks: {}, regions: [] });
      var q = G.choiceQ({ id: 'st-' + algo, concept: 'stability', shuffle: false, prompt: U.fmt(T.stable.prompt, d),
        options: kept
          ? [{ text: 'Yes, 5a stays before 5b', ok: true, why: U.fmt(T.stable.keptWhy[algo], d) }, { text: 'No, they swap places', why: U.fmt(T.stable.keptWrong[algo], d) }]
          : [{ text: 'No, they swap places', ok: true, why: U.fmt(T.stable.brokeWhy[algo], d) }, { text: 'Yes, 5a stays before 5b', why: U.fmt(T.stable.brokeWrong[algo], d) }] });
      G.predictThen(area, q, 'Watch it ▶', function (ft) {
        if (!ft) firstAll = false;
        deckView.destroy();
        var w = U.watcher(area, [{ algo: algo, values: DECK }], { unit: ctx.unit });
        w.stepper.play();
        k++;
        if (k < algos.length) G.continueBtn(area, 'Next sort', function () { w.destroy(); round(); });
        else G.continueBtn(area, 'One more question', function () { w.destroy(); wrapUp(); });
      });
    }
    function wrapUp() {
      U.clear(area);
      var q = G.choiceQ({ id: 'st-always', concept: 'stability', seed: ctx.seed, prompt: T.stable.always.prompt, misconception: T.stable.always.misconception,
        options: [
          { text: T.stable.always.ok, ok: true, why: T.stable.always.okWhy },
          { text: T.stable.always.bad, misconception: true, why: T.stable.always.badWhy },
          { text: T.stable.always.bad2, why: T.stable.always.bad2Why }
        ] });
      U.question(area, q, { onResult: function (c, ft) {
        G.continueBtn(area, 'Finish level', function () { ctx.complete({ stars: G.stars(hints, firstAll && ft), summary: T.stable.summary }); });
      } });
    }
    round();
  }

  /* Multi-key sort: the class list is already in name order; now sort by section. */
  function multikey(el, ctx) {
    var T = ctx.unit.templates;
    var names = ['Ada', 'Bo', 'Cy', 'Di', 'Eve', 'Fay'];
    // Chosen so selection sort's first long-distance swap jumps Ada past Bo.
    var sections = [2, 2, 1, 3, 1, 1];
    var people = names.map(function (nm, i) { return { id: i, v: sections[i], tag: nm }; });
    G.note(el, T.multikey.intro);
    var v0 = U.arrayView(el, { label: 'Students sorted by name; the number is their section' });
    v0.render({ arr: people, marks: {}, regions: [] });
    var sel = E.runSort('selection', people).pop().arr, ins = E.runSort('insertion', people).pop().arr;
    var selOk = E.isStableResult(people, sel);
    var q = G.choiceQ({ id: 'mk', concept: 'stability', seed: ctx.seed, prompt: T.multikey.prompt, misconception: T.multikey.misconception,
      options: [
        { text: 'Insertion sort', ok: true, why: T.multikey.ok },
        { text: 'Either one, they give the same result', misconception: true, why: selOk ? T.multikey.sameLucky : T.multikey.same },
        { text: 'Selection sort', why: T.multikey.sel }
      ] });
    G.predictThen(el, q, 'Sort by section with both ▶', function (ft) {
      v0.destroy();
      var w = U.watcher(el, [{ algo: 'selection', values: people }, { algo: 'insertion', values: people }], { unit: ctx.unit, code: false });
      w.stepper.go(Math.max(w.panes[0].trace.length, w.panes[1].trace.length) - 1);
      G.note(el, selOk ? T.multikey.afterLucky : T.multikey.after);
      G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: G.stars(0, ft), summary: T.multikey.summary }); });
    });
  }

  function sandbox(el, ctx) {
    var T = ctx.unit.templates;
    var form = h('form.sandbox-form');
    var inp = h('input', { type: 'text', value: '4 2 4 1 2', 'aria-label': 'Card values; repeats get tags a, b, c' });
    var s = h('select', { 'aria-label': 'Sort' });
    Object.keys(E.sorts).forEach(function (k) { s.appendChild(h('option', { value: k }, E.sorts[k].name)); });
    form.appendChild(h('label.wide', null, 'Cards (repeats get tags a, b, c) ', inp));
    form.appendChild(h('label', null, 'Sort ', s));
    form.appendChild(U.button('Sort ▶', null, { cls: 'primary', attrs: { type: 'submit' } }));
    var err = h('p.error', { role: 'alert' });
    el.appendChild(form); el.appendChild(err);
    var out = h('div'); el.appendChild(out);
    var w = null;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var p = E.parseNumberList(inp.value, 16);
      err.textContent = p.error || '';
      if (p.error) return;
      var seen = {};
      var deck = p.values.map(function (v, i) { seen[v] = (seen[v] || 0) + 1; return { id: i, v: v, tag: 'abcdefgh'[seen[v] - 1] }; });
      deck.forEach(function (c) { if (seen[c.v] === 1) delete c.tag; });
      if (w) w.destroy();
      U.clear(out);
      var res = E.runSort(s.value, deck).pop().arr;
      G.note(out, E.isStableResult(deck, res) ? T.stableSandbox.kept : T.stableSandbox.broke);
      w = U.watcher(out, [{ algo: s.value, values: deck }], { unit: ctx.unit });
      G.continueBtn(out, 'Done practising', function () { ctx.complete({ stars: 1, summary: 'Practice logged.' }); }, true);
    });
  }

  G.stable = { mount: function (el, ctx) { ({ stable: three, multikey: multikey, sandbox: sandbox })[ctx.level.kind](el, ctx); } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
