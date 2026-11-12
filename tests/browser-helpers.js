/* CPS305 Quest — tests/browser-helpers.js
 * Helpers for driving the game from a browser console during manual QA:
 *   eval(await (await fetch('tests/browser-helpers.js')).text())
 * Then e.g.  await QA.smoke(['#/u/4', '#/u/4/briefing'])  or  await QA.quiz('#/u/4/trace')
 * Not loaded by the game itself.
 */
window.QA = (function () {
  var errs = [];
  window.addEventListener('error', function (e) { errs.push(e.message); });
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var txt = function (sel) { return Array.prototype.map.call(document.querySelectorAll(sel), function (e) { return e.textContent.trim(); }); };
  var btn = function (label) {
    var b = Array.prototype.find.call(document.querySelectorAll('button, a.btn'), function (x) { return x.textContent.trim().indexOf(label) === 0 && !x.disabled; });
    if (!b) return 'NO BUTTON ' + label;
    b.click(); return 'clicked ' + b.textContent.trim();
  };
  var go = async function (hash, wait) { location.hash = hash; await sleep(wait || 250); };
  /* Try every visible choice until one is right (wrong answers are fine: they test the explanations). */
  var solve = function (scope) {
    var root = scope ? document.querySelector(scope) : document;
    var tries = 0;
    for (var b of root.querySelectorAll('.choice, .ln-btn')) {
      if (root.querySelector('.feedback.is-ok')) break;
      if (!b.disabled) { b.click(); tries++; }
    }
    return tries;
  };
  var smoke = async function (routes) {
    var out = [];
    for (var r of routes) {
      await go(r);
      var broke = document.querySelector('pre.error');
      out.push(r + ' :: ' + (broke ? 'BROKE ' + broke.textContent.slice(0, 300) : (txt('h1')[0] || '') + ' | ' + (txt('.q-prompt')[0] || txt('.note')[0] || txt('.goal')[0] || '').slice(0, 70)));
    }
    out.push('scrollW=' + document.documentElement.scrollWidth + ' vw=' + innerWidth);
    out.push('errors: ' + errs.join(' | '));
    return out;
  };
  /* Answer a Trace/Boss screen. Tasks are handed to `taskFn` (async). */
  var quiz = async function (hash, taskFn) {
    await go(hash);
    var log = [];
    for (var q = 0; q < 20; q++) {
      var type = txt('.q-type')[0];
      if (type === 'Hands-on') { if (taskFn) await taskFn(); else log.push('task skipped'); }
      else solve();
      log.push((type || '?') + ': ' + (txt('.feedback.is-ok').pop() || '??').slice(0, 60));
      if (btn('Next question').indexOf('NO') === 0) { btn('See results'); break; }
      await sleep(120);
    }
    await sleep(150);
    log.push(txt('.result p')[0] || txt('.result')[0] || 'no result');
    log.push('errors: ' + errs.join(' | '));
    return log;
  };
  return { sleep: sleep, txt: txt, btn: btn, go: go, solve: solve, smoke: smoke, quiz: quiz, errs: errs };
})();
'QA ready';
