/* CPS305 Quest — ui/games/common.js
 * Helpers shared by the mini-games: computed questions (answers come from the
 * engine, never hard-coded), predict-then-reveal, and star scoring.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, h = U.h;
  var G = CQ.games = CQ.games || {};

  /* Build a multiple-choice question whose correct option is computed.
   * options: [{text, ok?, why}] — duplicates (same text) are dropped, order is shuffled by seed. */
  G.choiceQ = function (spec) {
    var seen = {}, opts = [];
    spec.options.forEach(function (o) { var t = String(o.text); if (!seen[t]) { seen[t] = true; opts.push(o); } });
    if (spec.shuffle !== false) opts = E.shuffle(opts, E.rng(spec.seed || 1));
    var q = { id: spec.id, type: spec.type || 'mcq', concept: spec.concept, prompt: spec.prompt, code: spec.code,
      choices: opts.map(function (o) { return String(o.text); }), explain: { correct: '', wrong: {} } };
    opts.forEach(function (o, i) {
      if (o.ok) { q.answer = i; q.explain.correct = o.why; }
      else q.explain.wrong[i] = o.why;
    });
    // Show the named misconception only on the option that embodies it.
    if (spec.misconception) {
      var mi = opts.findIndex(function (o) { return o.misconception; });
      if (mi >= 0 && mi !== 1) { // quiz.js shows q.misconception on index 1; move that option there
        var tmp = opts[1]; opts[1] = opts[mi]; opts[mi] = tmp;
        return G.choiceQ(Object.assign({}, spec, { options: opts, shuffle: false }));
      }
      q.misconception = spec.misconception;
    }
    return q;
  };

  /* Predict, then reveal: the player commits to an answer before the animation runs. */
  G.predictThen = function (el, q, runLabel, next) {
    var box = h('div.predict');
    box.appendChild(h('div.predict-head', null, h('span.chip', null, '🔮 Predict first')));
    el.appendChild(box);
    U.question(box, q, {
      onResult: function (correct, firstTry) {
        var btn = U.button(runLabel || 'Run it ▶', function () { btn.remove(); next(firstTry); }, { cls: 'primary' });
        box.appendChild(h('div.actions', null, btn));
        btn.focus();
      }
    });
  };

  /* Stars: 1 = completed, +1 = no hints, +1 = optimal (no misses / beat par). */
  G.stars = function (hintsUsed, optimal) { return 1 + (hintsUsed ? 0 : 1) + (optimal ? 1 : 0); };

  G.values = function (kind, n, seed) { return E.makeInput(kind, n, seed); };

  G.note = function (el, text) { var p = h('p.note'); p.appendChild(U.rich(text)); el.appendChild(p); return p; };

  G.continueBtn = function (el, label, fn, noFocus) {
    var b = U.button(label, function () { b.disabled = true; fn(); }, { cls: noFocus ? '' : 'primary' });
    el.appendChild(h('div.actions', null, b));
    if (!noFocus) setTimeout(function () { b.focus(); }, 30);
    return b;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
