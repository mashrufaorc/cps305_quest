/* CPS305 Quest — ui/games/simplify.js
 * Simplify It. Core verb: DRAG AWAY (tap is the alternative everywhere).
 * Rule 1: keep only the fastest-growing term. Rule 2: drop its coefficient.
 * The engine (bigo.checkSimplify) referees every removal.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, B = E.bigo, G = CQ.games, h = U.h;

  function exprText(terms) { return terms.map(function (t) { return B.termText(t, t.coefShown); }).join(' + '); }

  /* One function to simplify. opts: { terms, unit, gameId, hints, onDone({misses, hints}) } */
  G.simplifyTask = function (container, opts) {
    var T = opts.unit.templates.simplify, X = opts.unit.explain;
    var orig = opts.terms.map(function (t) { return { c: t.c, k: t.k, coefShown: true }; });
    var state = orig.map(function (t) { return Object.assign({}, t); });
    var origText = exprText(orig);
    var misses = 0, hintsUsed = 0, finished = false;
    var wrap = h('div.simplify');
    container.appendChild(wrap);
    var intro = h('p.note'); intro.appendChild(U.rich(T.intro)); wrap.appendChild(intro);
    var expr = h('div.expr', { role: 'group', 'aria-label': 'Cost function terms' });
    var bin = h('div.bin', { 'aria-hidden': 'true' }, '🗑 Drop here');
    wrap.appendChild(h('div.expr-row', null, h('span.expr-f', null, 'f(n) = '), expr, bin));
    var shares = U.shareBar(wrap, state, { start: 2 });
    var tools = h('div.tools'); wrap.appendChild(tools);
    var fb = U.feedback(wrap);
    tools.appendChild(U.button('✓ That\'s the Big-O', claimDone, { cls: 'primary' }));
    if (opts.hints) tools.appendChild(U.button('Why?', function () {
      hintsUsed++;
      var dom = B.dominant(state);
      fb.show({ info: true, title: 'The two rules', why: 'At n = 1000, look at the share bar: **' + B.termText(dom) + '** grows fastest. (1) Keep only it. (2) Drop its coefficient.' });
    }));

    var dragIdx = null;
    bin.addEventListener('dragover', function (e) { e.preventDefault(); bin.classList.add('over'); });
    bin.addEventListener('dragleave', function () { bin.classList.remove('over'); });
    bin.addEventListener('drop', function (e) { e.preventDefault(); bin.classList.remove('over'); if (dragIdx != null) act({ type: 'term', i: dragIdx }); });

    function render() {
      U.clear(expr);
      state.forEach(function (t, i) {
        if (i) expr.appendChild(h('span.plus', { 'aria-hidden': 'true' }, '+'));
        var chip = h('span.term-chip', { draggable: finished ? null : 'true' });
        chip.addEventListener('dragstart', function (e) { dragIdx = i; e.dataTransfer.setData('text/plain', String(i)); });
        var canCoef = t.k !== '1' && t.coefShown && t.c !== 1;
        if (canCoef) chip.appendChild(U.button(String(t.c), function () { act({ type: 'coef', i: i }); }, { cls: 'coef-btn', attrs: { 'aria-label': 'Drop the coefficient ' + t.c + ' of ' + B.termText(t), disabled: finished } }));
        chip.appendChild(U.button(t.k === '1' ? String(t.c) : B.termText(t, false), function () { act({ type: 'term', i: i }); },
          { cls: 'term-btn', attrs: { 'aria-label': 'Drop the term ' + B.termText(t, t.coefShown), disabled: finished } }));
        expr.appendChild(chip);
      });
      shares.setTerms(state);
    }
    function act(move) {
      if (finished) return;
      var res = B.checkSimplify(state, move);
      var concept = move.type === 'term' ? 'drop-terms' : 'drop-coef';
      if (res.ok) {
        CQ.store.record(concept, true, true);
        if (move.type === 'term') state.splice(move.i, 1); else state[move.i].coefShown = false;
        fb.hide();
        U.announce(move.type === 'term' ? 'Dropped ' + res.data.term + '.' : 'Dropped the coefficient of ' + res.data.term + '.');
        render();
      } else {
        misses++;
        CQ.store.record(concept, false, true);
        if (opts.gameId) CQ.store.noteMiss(opts.gameId, concept);
        var ex = U.explain(X, res);
        fb.show({ ok: false, title: 'Keep that one', why: ex.why, misconception: ex.misconception });
      }
    }
    function claimDone() {
      if (B.simplifyDone(state)) {
        finished = true;
        render();
        U.clear(tools);
        var cls = B.cls[state[0].k].label;
        CQ.store.record('growth-classes', true, misses === 0);
        fb.show({ ok: true, title: cls, why: U.fmt(T.done, { orig: origText, cls: cls }) });
        opts.onDone({ misses: misses, hints: hintsUsed, cls: cls });
        return;
      }
      misses++;
      var dom = B.dominant(state);
      var left = state.length > 1 ? (state.length - 1) + ' slower-growing term(s) still there' : 'the coefficient ' + dom.c + ' is still on ' + B.termText(dom, false);
      CQ.store.record(state.length > 1 ? 'drop-terms' : 'drop-coef', false, true);
      fb.show({ ok: false, title: 'Not simplified yet', why: U.fmt(X['simp.notDone'].why, { left: left }), misconception: state.length === 1 ? 'Coefficients change the complexity class.' : null });
    }
    render();
    return { el: wrap };
  };

  function level(el, ctx) {
    var T = ctx.unit.templates.simplify;
    var rounds = ctx.level.rounds || 3, r = 0, misses = 0, hints = 0;
    var area = h('div'); el.appendChild(area);
    function next() {
      U.clear(area);
      area.appendChild(h('h3', null, 'Function ' + (r + 1) + ' of ' + rounds));
      // First Try round is the lecture's own example.
      var terms = r === 0 && ctx.level.mode === 'try' && ctx.size === 1 ? [{ c: 2, k: 'n2' }, { c: 4, k: 'n' }, { c: 9, k: '1' }] : B.randomTerms(ctx.size, ctx.seed + r * 31);
      G.simplifyTask(area, { terms: terms, unit: ctx.unit, gameId: ctx.gameId, hints: ctx.hints, onDone: function (res) {
        misses += res.misses; hints += res.hints;
        CQ.store.noteRound(ctx.gameId, res.misses === 0 && res.hints === 0);
        r++;
        if (r < rounds) G.continueBtn(area, 'Next function', next);
        else G.continueBtn(area, 'Finish level', function () { ctx.complete({ stars: G.stars(hints, misses === 0), summary: U.fmt(T.summary, { rounds: rounds, misses: misses }) }); });
      } });
    }
    next();
  }

  G.simplify = { mount: level };
})(typeof globalThis !== 'undefined' ? globalThis : this);
