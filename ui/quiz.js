/* CPS305 Quest — ui/quiz.js
 * Renders one question: mcq, predict (Lisp + choices), fill (blank in code),
 * bigo, bug (tap the buggy line) and task (a hands-on mini-level).
 * Wrong answers stay on screen, explained; the player retries until right.
 * Convention: in content, choice index 1 is the misconception distractor, so
 * q.misconception is shown when that choice is picked.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, h = U.h;

  /* opts: { onResult(correct, firstTry, info), mountTask(el, q, done) } */
  U.question = function (container, q, opts) {
    opts = opts || {};
    var wrap = h('div.question', { 'data-qid': q.id });
    container.appendChild(wrap);
    var tries = 0, done = false;
    if (q.flashback) wrap.appendChild(h('span.chip.flashback', null, '↩ Flashback: ' + q.flashback));
    var typeLabel = { predict: 'Predict the output', fill: 'Fill the blank', bug: 'Spot the bug', bigo: 'Classify the cost', mcq: 'Question', task: 'Hands-on' }[q.type] || 'Question';
    wrap.appendChild(h('div.q-type', null, typeLabel));
    var promptEl = h('p.q-prompt'); promptEl.appendChild(U.rich(q.prompt)); wrap.appendChild(promptEl);
    var fb;

    function finish(correct, info) {
      if (done) return;
      done = true;
      CQ.store.record(q.concept, true, tries === 0);
      if (opts.onResult) opts.onResult(correct, tries === 0, info || {});
    }
    function wrong(idx) {
      tries++;
      CQ.store.record(q.concept, false, tries === 1);
      var w = q.explain.wrong || {};
      fb.show({ ok: false, title: 'Not quite. Try again.', why: w[idx] || w.any || 'Look again at the code.', misconception: idx === 1 && q.misconception ? q.misconception : null });
      U.announce('Wrong. ' + (w[idx] || w.any || ''));
    }
    function right() {
      fb.show({ ok: true, title: tries === 0 ? 'Correct, first try!' : 'Correct', why: q.explain.correct });
      U.announce('Correct. ' + q.explain.correct);
      finish(true);
    }

    if (q.type === 'task') {
      var area = h('div.q-task'); wrap.appendChild(area);
      fb = U.feedback(wrap);
      opts.mountTask(area, q, function (res) {
        tries = res.misses || 0;
        fb.show({ ok: true, title: res.misses ? 'Done, with ' + res.misses + ' slip' + (res.misses > 1 ? 's' : '') : 'Flawless', why: res.summary || '' });
        finish(true, res);
      });
      return { el: wrap };
    }

    if (q.type === 'bug') {
      var panel = U.codePanel(wrap, { code: q.code, title: 'Tap the buggy line', onLineClick: function (ln, row) {
        if (done) return;
        if (q.answer.indexOf(ln) >= 0) { row.classList.add('is-right'); right(); lockRows(); }
        else { row.classList.add('is-wrong'); row.disabled = true; wrong('any'); }
      } });
      var lockRows = function () { panel.rows.forEach(function (r) { r.disabled = true; }); };
      fb = U.feedback(wrap);
      return { el: wrap };
    }

    if (q.code) {
      if (q.type === 'fill') {
        var pre = h('pre.code-inline');
        pre.appendChild(U.rich('`' + q.code + '`'));
        pre.innerHTML = pre.innerHTML.replace('___', '<span class="blank" aria-label="blank">___</span>');
        wrap.appendChild(pre);
      } else {
        U.codePanel(wrap, { code: q.code, title: q.type === 'predict' ? '* (at the REPL)' : null });
      }
    }
    var list = h('div.choices', { role: 'group', 'aria-label': 'Answer choices' });
    // Content lists the right answer first; shuffle on every render so position
    // never gives it away. `i` stays the ORIGINAL index (explanations key on it).
    var order = q.choices.map(function (_, i) { return i; });
    if (!q.fixedOrder) order = CQ.engine.shuffle(order, CQ.engine.rng((Date.now() ^ (q.id || '').length * 7919) >>> 0));
    order.forEach(function (i, pos) {
      var c = q.choices[i];
      var b = U.button(h('span.choice-inner', null, h('kbd', null, String(pos + 1)), ' ', U.rich(c)), function () {
        if (done || b.disabled) return;
        if (i === q.answer) { b.classList.add('is-right'); b.setAttribute('aria-pressed', 'true'); right(); lock(); }
        else { b.classList.add('is-wrong'); b.disabled = true; wrong(i); }
      }, { cls: 'choice' + (q.type === 'predict' || q.type === 'fill' ? ' mono' : '') });
      list.appendChild(b);
    });
    function lock() { Array.prototype.forEach.call(list.children, function (b) { b.disabled = true; }); }
    wrap.appendChild(list);
    fb = U.feedback(wrap);
    // Number keys pick a choice (when the question is on screen and not typing).
    function onKey(e) {
      if (!document.body.contains(wrap)) { document.removeEventListener('keydown', onKey); return; }
      if (done || U.typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= q.choices.length) { var b = list.children[n - 1]; if (!b.disabled) b.click(); }
    }
    document.addEventListener('keydown', onKey);
    return { el: wrap };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
