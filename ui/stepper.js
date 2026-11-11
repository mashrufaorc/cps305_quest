/* CPS305 Quest — ui/stepper.js
 * Play / pause / step forward / step back / restart / speed, for any list of
 * snapshots. Keyboard: Space = play/pause, ←/→ = step, Home = restart, +/- = speed.
 * Only one stepper owns the keyboard at a time (the most recently mounted).
 */
(function (root) {
  'use strict';
  var U = root.CQ.ui;
  var h = U.h;
  var active = null;

  document.addEventListener('keydown', function (e) {
    if (!active || U.typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!document.body.contains(active.el)) { active = null; return; }
    var k = e.key;
    if (k === ' ' && e.target && e.target.closest && e.target.closest('button, [role="button"]')) return;
    if (k === ' ') { e.preventDefault(); active.toggle(); }
    else if (k === 'ArrowRight' && !(e.target.closest && e.target.closest('.cell'))) { e.preventDefault(); active.next(); }
    else if (k === 'ArrowLeft' && !(e.target.closest && e.target.closest('.cell'))) { e.preventDefault(); active.prev(); }
    else if (k === 'Home') { active.go(0); }
    else if (k === '+' || k === '=') active.speed(1);
    else if (k === '-') active.speed(-1);
  });

  var SPEEDS = [0.25, 0.5, 1, 2, 4];

  /* opts: { count, onShow(k), canAdvance(k)?: false blocks moving forward (prediction gate) } */
  U.stepper = function (container, opts) {
    var k = 0, timer = null, count = opts.count;
    var speedIdx = Math.max(0, SPEEDS.indexOf(root.CQ.store.setting('speed') || 1));
    if (speedIdx < 0) speedIdx = 2;
    var btnRestart = U.button('⏮', function () { api.go(0); }, { cls: 'icon', attrs: { 'aria-label': 'Restart (Home)', title: 'Restart (Home)' } });
    var btnPrev = U.button('◀', function () { api.prev(); }, { cls: 'icon', attrs: { 'aria-label': 'Step back (Left arrow)', title: 'Step back (←)' } });
    var btnPlay = U.button('▶', function () { api.toggle(); }, { cls: 'icon primary', attrs: { 'aria-label': 'Play (Space)', title: 'Play / pause (Space)' } });
    var btnNext = U.button('▶|', function () { api.next(); }, { cls: 'icon', attrs: { 'aria-label': 'Step forward (Right arrow)', title: 'Step forward (→)' } });
    var range = h('input', { type: 'range', min: 0, max: SPEEDS.length - 1, step: 1, value: speedIdx, 'aria-label': 'Animation speed' });
    var speedLabel = h('span.speed-label', null, SPEEDS[speedIdx] + '×');
    range.addEventListener('input', function () { speedIdx = +range.value; speedLabel.textContent = SPEEDS[speedIdx] + '×'; root.CQ.store.setting('speed', SPEEDS[speedIdx]); });
    var pos = h('span.step-pos', { 'aria-live': 'off' });
    var el = h('div.stepper', { role: 'toolbar', 'aria-label': 'Animation controls' },
      btnRestart, btnPrev, btnPlay, btnNext,
      h('label.speed', null, h('span.sr', null, 'Speed'), '🐢', range, '🐇', speedLabel), pos);
    container.appendChild(el);

    function delay() { return (U.reducedMotion() ? 900 : 700) / SPEEDS[speedIdx]; }
    function show() {
      pos.textContent = 'Step ' + (k + 1) + ' / ' + count;
      btnPrev.disabled = k === 0;
      btnNext.disabled = k >= count - 1 || (opts.canAdvance && !opts.canAdvance(k));
      opts.onShow(k);
    }
    function stop() { if (timer) { clearTimeout(timer); timer = null; } btnPlay.textContent = '▶'; btnPlay.setAttribute('aria-label', 'Play (Space)'); }
    function tick() {
      if (k >= count - 1 || (opts.canAdvance && !opts.canAdvance(k))) { stop(); return; }
      k++; show();
      timer = setTimeout(tick, delay());
    }
    var api = {
      el: el,
      get index() { return k; },
      go: function (i) { stop(); k = Math.max(0, Math.min(count - 1, i)); show(); },
      next: function () { stop(); if (k < count - 1 && !(opts.canAdvance && !opts.canAdvance(k))) { k++; show(); } },
      prev: function () { stop(); if (k > 0) { k--; show(); } },
      play: function () {
        if (timer) return;
        if (k >= count - 1) k = 0;
        btnPlay.textContent = '⏸'; btnPlay.setAttribute('aria-label', 'Pause (Space)');
        timer = setTimeout(tick, delay() / 2);
      },
      pause: stop,
      toggle: function () { if (timer) stop(); else api.play(); },
      speed: function (d) { speedIdx = Math.max(0, Math.min(SPEEDS.length - 1, speedIdx + d)); range.value = speedIdx; speedLabel.textContent = SPEEDS[speedIdx] + '×'; },
      setCount: function (c) { count = c; if (k >= c) k = c - 1; show(); },
      refresh: show,
      activate: function () { active = api; },
      destroy: function () { stop(); if (active === api) active = null; }
    };
    active = api;
    show();
    return api;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
