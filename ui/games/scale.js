/* CPS305 Quest — ui/games/scale.js
 * Balance-Scale Sort. Core verb: COMPARE. The weights are hidden; the only way to
 * learn anything is to weigh two crates. That is all a comparison sort ever knows.
 * Par = the number of comparisons insertion sort makes on the same starting order.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, G = CQ.games, h = U.h;
  var NAMES = 'ABCDEFGH';

  function scale(el, ctx) {
    var T = ctx.unit.templates, n = ctx.size;
    var weights = G.values('random', n, ctx.seed);
    if (E.isSorted(weights)) weights = weights.slice().reverse();
    // crates: label + hidden weight; `order` is the row the player arranges
    var order = weights.map(function (w, i) { return { id: i, label: NAMES[i], w: w }; });
    var par = E.runSort('insertion', weights).pop().counters.comparisons;
    var weighings = 0, badChecks = 0, pan = [], lastPair = null;

    G.note(el, U.fmt(T.scale.intro, { n: n, par: par }));
    var cnt = U.counters(el, ['weighings']);
    cnt.theory({ weighings: U.fmt(T.scale.par, { par: par }) });
    var scaleEl = h('div.scale', { role: 'img', 'aria-label': 'Balance scale' });
    var beam = h('div.beam');
    var left = h('div.pan.pan-l', null, h('span.pan-label', null, '—'));
    var right = h('div.pan.pan-r', null, h('span.pan-label', null, '—'));
    beam.appendChild(left); beam.appendChild(right);
    scaleEl.appendChild(beam); scaleEl.appendChild(h('div.fulcrum', { 'aria-hidden': 'true' }, '▲'));
    el.appendChild(scaleEl);
    var verdict = h('p.verdict', { 'aria-live': 'polite' }, T.scale.pick);
    el.appendChild(verdict);
    var row = h('div.crates', { role: 'group', 'aria-label': 'Crates in their current order, lightest should end up on the left' });
    el.appendChild(row);
    var actions = h('div.tools'); el.appendChild(actions);
    var swapBtn = U.button('⇄ Swap the two weighed crates', function () {
      if (!lastPair) return;
      var a = order.indexOf(lastPair[0]), b = order.indexOf(lastPair[1]);
      var t = order[a]; order[a] = order[b]; order[b] = t;
      U.announce('Swapped crate ' + lastPair[0].label + ' and crate ' + lastPair[1].label + '.');
      render();
    }, { attrs: { disabled: true } });
    var checkBtn = U.button('✓ Check my order', check, { cls: 'primary' });
    actions.appendChild(swapBtn); actions.appendChild(checkBtn);
    var known = h('ul.known', { 'aria-label': 'What you have learned' });
    el.appendChild(h('details.known-wrap', { open: true }, h('summary', null, 'Your notebook'), known));
    var fb = U.feedback(el);

    function render() {
      U.clear(row);
      order.forEach(function (c, i) {
        var onPan = pan.indexOf(c) >= 0;
        row.appendChild(U.button(h('span.crate-inner', null, h('span.crate-label', null, c.label), h('span.crate-pos', null, 'slot ' + i)),
          function () { tap(c); }, { cls: 'crate' + (onPan ? ' on-pan' : ''), attrs: { 'aria-pressed': onPan ? 'true' : 'false', 'aria-label': 'Crate ' + c.label + ' in slot ' + i + (onPan ? ', on the scale' : '') } }));
      });
      swapBtn.disabled = !lastPair;
    }
    function tap(c) {
      if (pan.indexOf(c) >= 0) return;
      pan.push(c);
      if (pan.length === 1) {
        left.firstChild.textContent = c.label; right.firstChild.textContent = '—';
        beam.className = 'beam';
        verdict.textContent = U.fmt(T.scale.second, { a: c.label });
      } else {
        var a = pan[0], b = pan[1];
        right.firstChild.textContent = b.label;
        weighings++;
        cnt.set({ weighings: weighings });
        var heavier = a.w > b.w ? a : b, lighter = heavier === a ? b : a;
        beam.className = 'beam tip-' + (heavier === a ? 'left' : 'right');
        var msg = U.fmt(T.scale.result, { h: heavier.label, l: lighter.label });
        verdict.textContent = msg;
        known.appendChild(h('li', null, lighter.label + ' < ' + heavier.label));
        U.announce(msg);
        lastPair = [a, b];
        pan = [];
      }
      render();
    }
    function check() {
      var ws = order.map(function (c) { return c.w; });
      if (E.isSorted(ws)) {
        order.forEach(function (c) { c.revealed = true; });
        U.clear(row);
        order.forEach(function (c) { row.appendChild(h('div.crate.revealed', null, h('span.crate-label', null, c.label), h('span.crate-w', null, c.w + ' kg'))); });
        U.clear(actions);
        CQ.store.record('comparison-sort', true, badChecks === 0);
        var d = { w: weighings, par: par };
        fb.show({ ok: true, title: 'Sorted!', why: U.fmt(weighings <= par ? T.scale.winPar : T.scale.win, d) });
        CQ.store.noteRound(ctx.gameId, badChecks === 0 && weighings <= par);
        G.continueBtn(el, 'Finish level', function () { ctx.complete({ stars: 1 + (badChecks === 0 ? 1 : 0) + (weighings <= par ? 1 : 0), summary: U.fmt(T.scale.summary, d) }); });
      } else {
        badChecks++;
        CQ.store.record('comparison-sort', false, badChecks === 1);
        var i = 0; while (order[i].w <= order[i + 1].w) i++;
        fb.show({ ok: false, title: 'Not sorted yet', why: U.fmt(T.scale.wrong, { a: order[i].label, b: order[i + 1].label }) });
      }
    }
    render();
  }

  G.scale = { mount: scale };
})(typeof globalThis !== 'undefined' ? globalThis : this);
