/* CPS305 Quest — app.js
 * Router and screens: hub map, unit room, briefing, mini-game levels,
 * Trace the Code, Boss, unit summary, Cheat Sheet, Mastery, Settings.
 * Hash routes keep everything working from file:// with no server.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ, U = CQ.ui, E = CQ.engine, S = CQ.store, C = CQ.content, G = CQ.games, h = U.h;
  var main = document.getElementById('main');
  var cleanup = [];

  /* ---------- theme, header ---------- */
  function applyTheme() {
    var t = S.setting('theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.toggle('reduce-motion', U.reducedMotion());
    document.documentElement.classList.toggle('motion-ok', S.setting('reducedMotion') === 'off');
  }
  function updateHud() {
    var st = S.get();
    document.getElementById('hud-xp').textContent = st.xp + ' XP';
    document.getElementById('hud-streak').textContent = '🔥 ' + st.streak.count + (st.streak.count === 1 ? ' day' : ' days');
    document.getElementById('hud-streak').setAttribute('aria-label', 'Daily streak: ' + st.streak.count + ' days');
  }

  function screen(title, crumbs) {
    cleanup.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
    cleanup = [];
    U.clear(main);
    document.title = title + ' · CPS305 Quest';
    if (crumbs) {
      var nav = h('nav.crumbs', { 'aria-label': 'Breadcrumb' });
      crumbs.forEach(function (c, i) {
        if (i) nav.appendChild(h('span.sep', { 'aria-hidden': 'true' }, '›'));
        nav.appendChild(c.href ? h('a', { href: c.href }, c.label) : h('span', { 'aria-current': 'page' }, c.label));
      });
      main.appendChild(nav);
    }
    var hd = h('h1', { tabindex: '-1' }, title);
    main.appendChild(hd);
    setTimeout(function () { hd.focus({ preventScroll: true }); }, 0);
    updateHud();
    return main;
  }

  function unitOf(id) { return C.unitData[id]; }
  function levelKey(u, g, l) { return u + '/' + g + '/' + l; }
  function gameStars(u, game) { return game.levels.reduce(function (a, l) { return a + S.level(levelKey(u, game.id, l.id)).stars; }, 0); }
  function unitStars(u) { var d = unitOf(u); return d ? d.games.reduce(function (a, g) { return a + gameStars(u, g); }, 0) : 0; }

  /* ---------- hub ---------- */
  function hub() {
    var el = screen('Parenthesis Labs');
    el.appendChild(h('p.lede', null, 'You\'re the new intern at Parenthesis Labs. Every lab room has a broken system, and every fix is a data structure. Pick a room.'));
    var map = h('ol.hub-map', { 'aria-label': 'Lab rooms, in course order' });
    C.units.forEach(function (u) {
      var built = u.built && unitOf(u.id);
      var inner = h('div.room-inner', null,
        h('span.room-icon', { 'aria-hidden': 'true' }, u.icon),
        h('span.room-unit', null, 'Unit ' + u.id + ' · ' + u.topic),
        h('span.room-title', null, u.title),
        h('span.room-name', null, u.room),
        built ? h('span.room-status', null, unitStars(u.id) + ' ★ · ' + (S.unitFlag(u.id, 'boss') ? 'Boss cleared' : 'Open')) : h('span.room-status.locked', null, '🚧 Under construction'));
      map.appendChild(h('li.room' + (built ? '.open' : '.closed'), null,
        built ? h('a.room-link', { href: '#/u/' + u.id }, inner) : h('div.room-link', { 'aria-disabled': 'true' }, inner)));
    });
    el.appendChild(map);
    var st = S.get();
    el.appendChild(h('div.hub-actions', null,
      nextUnitButton(),
      h('button.btn', { type: 'button', disabled: true, title: 'Arrives once several units are built' }, 'Placement quiz (coming soon)'),
      h('a.btn', { href: '#/cheatsheet' }, 'Cheat Sheet'),
      h('a.btn', { href: '#/mastery' }, 'Mastery')));
    var due = S.dueForReview();
    if (due.length) el.appendChild(h('p.note', null, '🔁 ' + due.length + ' concept(s) are due for review. (The Review Room opens in a later phase; you can see them on the Mastery page.)'));
    if (!S.storageOk()) el.appendChild(h('p.note.warn', null, 'Progress can\'t be saved in this browser (storage is blocked). Everything still works; it just resets when you close the tab.'));
    void st;
  }

  /* The next built unit (in course order) whose Boss isn't cleared yet. */
  function nextUnitButton() {
    var built = C.units.filter(function (u) { return u.built && unitOf(u.id); });
    var u = built.filter(function (x) { return !S.unitFlag(x.id, 'boss'); })[0] || built[0];
    var started = S.unitFlag(u.id, 'briefing');
    return h('a.btn.primary', { href: '#/u/' + u.id }, (started ? 'Continue in ' : 'Start in ') + u.room + ' (Unit ' + u.id + ')');
  }

  /* ---------- unit room ---------- */
  function unitRoom(uid) {
    var d = unitOf(uid);
    if (!d) return notFound();
    var el = screen('Unit ' + uid + ': ' + d.title, [{ label: 'Map', href: '#/' }, { label: d.room }]);
    el.appendChild(h('p.lede', null, d.intro));
    var next = recommend(uid);
    if (next) el.appendChild(h('a.btn.primary.next-up', { href: next.href }, '▶ Next: ' + next.label));
    var flow = h('ol.flow');
    flow.appendChild(step(1, 'Briefing', 'The one core idea, in 90 seconds.', '#/u/' + uid + '/briefing', S.unitFlag(uid, 'briefing')));
    var gamesLi = h('li.flow-step');
    gamesLi.appendChild(h('h2', null, h('span.num', null, '2'), ' Mini-games'));
    var grid = h('div.games');
    d.games.forEach(function (g) {
      var card = h('section.game-card', { 'aria-labelledby': 'g-' + g.id });
      card.appendChild(h('h3', { id: 'g-' + g.id }, h('span', { 'aria-hidden': 'true' }, g.icon + ' '), g.title, h('span.verb', null, g.verb)));
      card.appendChild(h('p', null, g.blurb));
      var ul = h('ul.levels');
      g.levels.forEach(function (l) {
        var rec = S.level(levelKey(uid, g.id, l.id));
        ul.appendChild(h('li', null, h('a', { href: '#/u/' + uid + '/g/' + g.id + '/' + l.id }, U.modeChip(l.mode), ' ', l.title), ' ', U.stars(rec.stars)));
      });
      card.appendChild(ul);
      grid.appendChild(card);
    });
    gamesLi.appendChild(grid);
    flow.appendChild(gamesLi);
    flow.appendChild(step(3, 'Trace the Code', 'Read and trace the lecture\'s Lisp: predict, fill the blank, spot the bug.', '#/u/' + uid + '/trace', S.unitFlag(uid, 'trace')));
    flow.appendChild(step(4, 'Boss', 'Eight mixed questions, one hands-on task, one flashback.', '#/u/' + uid + '/boss', S.unitFlag(uid, 'boss')));
    flow.appendChild(step(5, 'Summary', 'What you can now explain + concept cards.', '#/u/' + uid + '/summary', S.unitFlag(uid, 'summary')));
    el.appendChild(flow);
  }
  function step(n, title, text, href, done) {
    return h('li.flow-step', null, h('h2', null, h('span.num', null, String(n)), ' ', h('a', { href: href }, title), done ? h('span.done', { 'aria-label': 'done' }, ' ✓') : null), h('p', null, text));
  }
  /* No dead ends: always know the next thing to do. */
  function recommend(uid) {
    var d = unitOf(uid);
    if (!S.unitFlag(uid, 'briefing')) return { href: '#/u/' + uid + '/briefing', label: 'Briefing' };
    for (var i = 0; i < d.games.length; i++) {
      var g = d.games[i];
      for (var j = 0; j < g.levels.length; j++) {
        var l = g.levels[j];
        if (l.mode === 'sandbox') continue;
        if (!S.level(levelKey(uid, g.id, l.id)).completed) return { href: '#/u/' + uid + '/g/' + g.id + '/' + l.id, label: g.title + ': ' + l.title };
      }
    }
    if (!S.unitFlag(uid, 'trace')) return { href: '#/u/' + uid + '/trace', label: 'Trace the Code' };
    if (!S.unitFlag(uid, 'boss')) return { href: '#/u/' + uid + '/boss', label: 'Boss' };
    return { href: '#/u/' + uid + '/summary', label: 'Unit summary' };
  }

  /* ---------- briefing ---------- */
  function briefing(uid) {
    var d = unitOf(uid);
    var el = screen('Briefing: ' + d.title, [{ label: 'Map', href: '#/' }, { label: d.room, href: '#/u/' + uid }, { label: 'Briefing' }]);
    var steps = d.briefing.steps, k = 0;
    var progress = h('p.progress', { 'aria-live': 'polite' });
    var area = h('div.briefing');
    el.appendChild(progress); el.appendChild(area);
    function show() {
      U.clear(area);
      progress.textContent = 'Step ' + (k + 1) + ' of ' + steps.length;
      var s = steps[k];
      area.appendChild(h('h2', null, s.title));
      if (s.text) { var p = h('p'); p.appendChild(U.rich(s.text)); area.appendChild(p); }
      var nextBtn = function () {
        k++;
        if (k < steps.length) G.continueBtn(area, 'Next', show);
        else G.continueBtn(area, 'Finish briefing', function () {
          S.unitFlag(uid, 'briefing', true); S.addXp(15);
          var n = recommend(uid);
          location.hash = n.href;
        });
      };
      var afterText = function () { if (s.after) { var a = h('p.after'); a.appendChild(U.rich(s.after)); area.appendChild(a); } nextBtn(); };
      if (s.kind === 'shelf') shelf(area, s, afterText);
      else if (s.kind === 'tale') tale(area, afterText);
      else if (s.kind === 'shares') { U.shareBar(area, s.terms, { start: 0, label: 'f(n) = 2n² + 4n + 9. Share of the total at' }); G.continueBtn(area, 'I see it', afterText); }
      else if (s.kind === 'race') {
        var vals = E.makeInput('sorted', 10, 4);
        G.continueBtn(area, 'Run both ▶', function () {
          var w = U.watcher(area, [{ algo: 'selection', values: vals }, { algo: 'insertion', values: vals }], { unit: d, code: false, bars: true,
            onEnd: function () { if (!w.ended) { w.ended = true; afterText(); } } });
          cleanup.push(w.destroy);
          w.stepper.speed(2); w.stepper.play();
        });
      } else if (s.kind === 'check') {
        U.question(area, s.question, { onResult: function () { afterText(); } });
      }
    }
    show();
  }
  /* Briefing shelf: free exploration (not refereed). Sorted shelves discard the impossible side. */
  function shelf(area, s, after) {
    var vals = s.values;
    var opened = {}, lb = 0, ub = vals.length - 1, opens = 0, done = false;
    var cnt = U.counters(area, ['probes']);
    var view = U.arrayView(area, { onPick: open, label: 'Shelf of files' });
    var msg = h('p.narration', { 'aria-live': 'polite' }, 'Tap a file.');
    area.appendChild(msg);
    var skip = U.button('Skip ahead', function () { finish(); }, { cls: 'small ghost' });
    area.appendChild(h('div.actions', null, skip));
    function render() {
      var regions = [];
      if (s.sorted) {
        if (lb > 0) regions.push({ from: 0, to: lb - 1, kind: 'discarded' });
        if (ub < vals.length - 1) regions.push({ from: ub + 1, to: vals.length - 1, kind: 'discarded' });
      }
      var cs = {};
      Object.keys(opened).forEach(function (i) { cs[i] = vals[i] === s.target ? 'ok' : 'opened'; });
      view.render({ arr: E.toItems(vals), regions: regions, cellState: cs, marks: {}, conceal: function (i) { return !opened[i] && !done; },
        selectable: function (i) { return !done && !opened[i]; } });
      cnt.set({ probes: opens });
    }
    function open(i) {
      opened[i] = true; opens++;
      var v = vals[i];
      if (v === s.target) { msg.textContent = 'Found ' + s.target + ' after opening ' + opens + ' file' + (opens > 1 ? 's' : '') + '!'; finish(); return; }
      if (s.sorted) {
        if (v < s.target) { lb = Math.max(lb, i + 1); msg.textContent = v + ' < ' + s.target + ': everything left of it is smaller too. Discarded.'; }
        else { ub = Math.min(ub, i - 1); msg.textContent = v + ' > ' + s.target + ': everything right of it is larger too. Discarded.'; }
      } else msg.textContent = v + '. That tells you nothing about the files next to it.';
      U.announce(msg.textContent);
      render();
    }
    function finish() { if (done) return; done = true; skip.remove(); render(); after(); }
    render();
    setTimeout(function () { view.focus(); }, 50);
  }

  /* Briefing (Unit 2): the lecture's loop vs formula, with a slider for n. */
  function tale(area, after) {
    var n = 3;
    var slider = h('input', { type: 'range', min: 1, max: 30, value: n, 'aria-label': 'Input size n' });
    var out = h('output.n-out', null, 'n = ' + n);
    var lanes = h('div.lanes', { 'aria-live': 'polite' });
    area.appendChild(h('label.slider-row', null, 'n ', slider, out));
    area.appendChild(lanes);
    function draw() {
      n = +slider.value; out.textContent = 'n = ' + n;
      var rows = [{ name: 'Loop', v: Math.max(0, n - 1) }, { name: 'Formula', v: 3 }];
      var max = Math.max(rows[0].v, rows[1].v, 1);
      U.clear(lanes);
      rows.forEach(function (r, i) {
        var cheaper = r.v < rows[1 - i].v;
        lanes.appendChild(h('div.lane', null, h('span.lane-name', null, r.name), h('span.lane-track', null, h('span.lane-bar.seg' + (i + 1), { style: { width: Math.max(1, r.v / max * 100) + '%' } })),
          h('span.lane-val', null, r.v + ' operation' + (r.v === 1 ? '' : 's') + (cheaper ? '  ★ cheaper' : ''))));
      });
    }
    slider.addEventListener('input', draw);
    draw();
    G.continueBtn(area, 'I see it', after, true);
  }

  /* ---------- level ---------- */
  function level(uid, gid, lid) {
    var d = unitOf(uid);
    var game = d && d.games.filter(function (g) { return g.id === gid; })[0];
    var lv = game && game.levels.filter(function (l) { return l.id === lid; })[0];
    if (!lv) return notFound();
    var mode = S.setting('mode');
    var el = screen(lv.title, [{ label: 'Map', href: '#/' }, { label: d.room, href: '#/u/' + uid }, { label: game.title }]);
    var head = h('div.level-head', null, U.modeChip(lv.mode), h('p.goal', null, lv.goal));
    var adapt = S.adapt(gid);
    var tier = adapt.tier;
    if (lv.tiers) head.appendChild(h('span.chip.tier', { title: 'Difficulty tier adapts to how you play' }, 'Tier ' + tier + ' of 3'));
    var timerEl = null;
    if (mode === 'challenge' && S.setting('timer')) {
      timerEl = h('span.chip.timer', { 'aria-live': 'off' }, '⏱ 0:00');
      head.appendChild(timerEl);
      var t0 = Date.now();
      var iv = setInterval(function () { var s = Math.floor((Date.now() - t0) / 1000); timerEl.textContent = '⏱ ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }, 1000);
      cleanup.push(function () { clearInterval(iv); });
    }
    el.appendChild(head);
    var body = h('div.level-body');
    el.appendChild(body);
    var hints = lv.mode === 'try' && mode !== 'challenge';
    if (lv.mode === 'try' && mode === 'challenge') body.appendChild(h('p.note', null, 'Challenge mode: hints are off.'));
    var ctx = {
      unit: d, game: game, level: lv, gameId: gid, tier: tier, hints: hints, mode: mode,
      size: lv.tiers ? lv.tiers[tier - 1] : null,
      seed: (Date.now() % 100000) + 1,
      complete: function (res) {
        if (timerEl) cleanup.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
        var key = levelKey(uid, gid, lid);
        var r = S.completeLevel(key, res.stars, res.stars);
        updateHud();
        var idx = game.levels.indexOf(lv);
        var nextLv = game.levels[idx + 1];
        var nextGame = d.games[d.games.indexOf(game) + 1];
        var nextHref = nextLv && nextLv.mode !== 'sandbox' ? '#/u/' + uid + '/g/' + gid + '/' + nextLv.id : recommend(uid).href;
        var panel = h('section.result', { 'aria-labelledby': 'res-h' },
          h('h2#res-h', null, 'Level complete'),
          U.stars(res.stars),
          h('p', null, res.summary || ''),
          h('p.small', null, '+' + r.xp + ' XP' + (r.gainedStars ? ' · new best!' : '')),
          h('p.small', null, '★ completed · ★ no hints · ★ optimal (no slips / at par)'),
          h('div.actions', null,
            h('a.btn.primary', { href: nextHref }, 'Next ▶'),
            U.button('Replay', function () { route(); }),
            h('a.btn', { href: '#/u/' + uid }, 'Back to ' + d.room)));
        void nextGame;
        U.clear(body);
        body.appendChild(panel);
        panel.querySelector('a.btn.primary').focus();
        U.announce('Level complete. ' + res.stars + ' of 3 stars.');
      }
    };
    G[gid].mount(body, ctx);
  }

  /* ---------- quiz screens (Trace the Code, Boss) ---------- */
  function quizScreen(uid, which) {
    var d = unitOf(uid);
    var qs = d[which];
    var title = which === 'trace' ? 'Trace the Code' : 'Boss: ' + (d.bossTitle || d.room);
    var el = screen(title, [{ label: 'Map', href: '#/' }, { label: d.room, href: '#/u/' + uid }, { label: title }]);
    if (which === 'boss') el.appendChild(h('p.lede', null, 'Mixed questions from this unit, one hands-on task, and a flashback. No lives, no game over: a slip only costs score.'));
    else el.appendChild(h('p.lede', null, 'Short Lisp questions in the lecture\'s style. Read, trace, predict.'));
    var k = 0, first = 0;
    var progress = h('div.qprogress', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': qs.length });
    var bar = h('span.qbar'); progress.appendChild(bar);
    var label = h('p.progress', { 'aria-live': 'polite' });
    el.appendChild(label); el.appendChild(progress);
    var area = h('div'); el.appendChild(area);
    function show() {
      U.clear(area);
      label.textContent = 'Question ' + (k + 1) + ' of ' + qs.length + ' · first-try correct: ' + first;
      progress.setAttribute('aria-valuenow', k); bar.style.width = (k / qs.length * 100) + '%';
      U.question(area, qs[k], {
        mountTask: mountTask,
        onResult: function (correct, firstTry) {
          if (firstTry) first++;
          label.textContent = 'Question ' + (k + 1) + ' of ' + qs.length + ' · first-try correct: ' + first;
          k++;
          G.continueBtn(area, k < qs.length ? 'Next question' : 'See results', k < qs.length ? show : end);
        }
      });
    }
    function end() {
      U.clear(area);
      bar.style.width = '100%';
      var stars = first >= qs.length - 1 ? 3 : first >= Math.ceil(qs.length * 0.6) ? 2 : 1;
      S.unitFlag(uid, which, true);
      S.completeLevel(uid + '/' + which, stars, first);
      var next = which === 'trace' ? { href: '#/u/' + uid + '/boss', label: 'Face the Boss ▶' } : { href: '#/u/' + uid + '/summary', label: 'Unit summary ▶' };
      area.appendChild(h('section.result', null, h('h2', null, which === 'boss' ? 'Boss cleared!' : 'Trace complete'), U.stars(stars),
        h('p', null, first + ' of ' + qs.length + ' right on the first try.' + (first < qs.length ? ' The concepts you slipped on are queued for review.' : '')),
        h('div.actions', null, h('a.btn.primary', { href: next.href }, next.label), U.button('Retry', function () { route(); }), h('a.btn', { href: '#/u/' + uid }, 'Back to room'))));
      updateHud();
    }
    function mountTask(container, q, done) {
      if (q.task === 'simplify') {
        G.simplifyTask(container, { terms: q.terms, unit: d, hints: false, onDone: function (r) { done({ misses: r.misses, summary: 'It is ' + r.cls + '.' }); } });
      } else if (q.task === 'binary') {
        var vals = E.makeInput('sorted', q.n, q.seed);
        var key = vals[E.randInt(E.rng(q.seed + Date.now() % 97), 0, vals.length - 1)];
        U.runner(container, { algo: 'binary', values: vals, key: key, unit: d, gameId: 'boss', hints: false, conceal: true, showCode: false,
          onDone: function (r) { done({ misses: r.misses, summary: 'Found in ' + r.counters.probes + ' probes.' }); } });
      } else {
        U.runner(container, { algo: q.task, values: q.values, unit: d, gameId: 'boss', hints: false, maxDecisions: q.decisions, showCode: false,
          onDone: function (r) { done({ misses: r.misses, summary: 'Three passes done.' }); } });
      }
    }
    show();
  }

  /* ---------- summary, cheat sheet, mastery, settings ---------- */
  function summary(uid) {
    var d = unitOf(uid);
    var el = screen('Unit ' + uid + ' summary', [{ label: 'Map', href: '#/' }, { label: d.room, href: '#/u/' + uid }, { label: 'Summary' }]);
    S.unitFlag(uid, 'summary', true);
    var newly = Object.keys(d.cards).filter(function (id) { return S.unlockCard(id); });
    el.appendChild(h('h2', null, 'What you can now explain'));
    var ul = h('ul.explain-list');
    d.summary.canExplain.forEach(function (t) { ul.appendChild(h('li', null, t)); });
    el.appendChild(ul);
    el.appendChild(h('h2', null, newly.length ? 'Concept cards unlocked' : 'Your concept cards'));
    el.appendChild(cardGrid(Object.keys(d.cards).map(function (k) { return d.cards[k]; })));
    el.appendChild(h('div.actions', null, h('a.btn.primary', { href: '#/cheatsheet' }, 'Open Cheat Sheet'), h('a.btn', { href: '#/mastery' }, 'Mastery'), h('a.btn', { href: '#/' }, 'Back to map')));
    if (!S.unitFlag(uid, 'boss')) el.appendChild(h('p.note', null, 'Tip: the Boss is the best check that these ideas stuck.'));
  }
  function cardGrid(cards) {
    var g = h('div.cards');
    cards.forEach(function (c) {
      var def = h('p'); def.appendChild(U.rich(c.def));
      g.appendChild(h('article.card', null, h('h3', null, c.title), def, h('p.cost', null, c.cost), h('pre.card-code', null, c.lisp)));
    });
    return g;
  }
  function cheatsheet() {
    var el = screen('Cheat Sheet', [{ label: 'Map', href: '#/' }, { label: 'Cheat Sheet' }]);
    var any = false;
    C.units.forEach(function (u) {
      var d = unitOf(u.id);
      if (!d) return;
      var cards = Object.keys(d.cards).filter(S.cardUnlocked).map(function (k) { return d.cards[k]; });
      if (!cards.length) return;
      any = true;
      el.appendChild(h('h2', null, 'Unit ' + u.id + ': ' + d.title));
      el.appendChild(cardGrid(cards));
    });
    if (!any) el.appendChild(h('p.note', null, 'No cards yet. Reach a unit\'s summary to unlock its concept cards.'));
    else el.appendChild(h('div.actions.no-print', null, U.button('Print', function () { root.print(); })));
  }
  function mastery() {
    var el = screen('Mastery', [{ label: 'Map', href: '#/' }, { label: 'Mastery' }]);
    el.appendChild(h('p.lede', null, 'Confidence comes from your first-try accuracy, weighted toward recent attempts, and fades if you haven\'t practised in a while.'));
    var st = S.get(), lines = ['CPS305 Quest: mastery report (' + new Date().toISOString().slice(0, 10) + ')'];
    var table = h('table.mastery', null, h('thead', null, h('tr', null, h('th', null, 'Concept'), h('th', null, 'Confidence'), h('th', null, 'Attempts'), h('th', null, 'Review'))));
    var tb = h('tbody');
    C.units.forEach(function (u) {
      var d = unitOf(u.id);
      if (!d) return;
      lines.push('', 'Unit ' + u.id + ': ' + d.title);
      Object.keys(d.concepts).forEach(function (cid) {
        var conf = S.confidence(cid), c = st.concepts[cid], lb = st.leitner[cid];
        var pct = conf == null ? null : Math.round(conf * 100);
        var due = lb && S.dueForReview().indexOf(cid) >= 0;
        tb.appendChild(h('tr', null, h('td', null, d.concepts[cid]),
          h('td', null, pct == null ? h('span.muted', null, 'not tried') : h('span.meter', { role: 'meter', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': d.concepts[cid] + ' confidence' },
            h('span.meter-fill', { style: { width: pct + '%' } }), h('span.meter-txt', null, pct + '%'))),
          h('td', null, c ? String(c.attempts) : '0'),
          h('td', null, due ? '🔁 due' : lb ? 'box ' + lb.box : '–')));
        lines.push('  ' + d.concepts[cid] + ': ' + (pct == null ? 'not tried' : pct + '%') + (c ? ' (' + c.attempts + ' attempts)' : '') + (due ? ' [review due]' : ''));
      });
    });
    table.appendChild(tb);
    el.appendChild(h('div.table-wrap', null, table));
    lines.push('', 'XP: ' + st.xp + ', streak: ' + st.streak.count + ' day(s)');
    var text = lines.join('\n');
    var ta = h('textarea.copy-src', { readonly: true, 'aria-label': 'Mastery report as plain text', rows: 6 });
    ta.value = text;
    var copied = h('span.small', { 'aria-live': 'polite' });
    el.appendChild(h('div.actions', null, U.button('Copy as text', function () {
      ta.hidden = false; ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      if (root.navigator.clipboard && root.isSecureContext) root.navigator.clipboard.writeText(text).then(function () { copied.textContent = 'Copied.'; }, function () { copied.textContent = ok ? 'Copied.' : 'Select the text below and copy it.'; });
      else copied.textContent = ok ? 'Copied.' : 'Select the text below and copy it.';
    }, { cls: 'primary' }), copied));
    ta.hidden = true;
    el.appendChild(ta);
  }
  function settings() {
    var el = screen('Settings', [{ label: 'Map', href: '#/' }, { label: 'Settings' }]);
    function radio(name, label, options) {
      var fs = h('fieldset', null, h('legend', null, label));
      options.forEach(function (o) {
        var inp = h('input', { type: 'radio', name: name, value: o[0], checked: S.setting(name) === o[0] ? 'checked' : null });
        inp.addEventListener('change', function () { S.setting(name, o[0]); applyTheme(); });
        fs.appendChild(h('label.opt', null, inp, ' ', o[1], o[2] ? h('span.small', null, ' (' + o[2] + ')') : null));
      });
      return fs;
    }
    el.appendChild(radio('mode', 'Play mode', [['guided', 'Guided', 'default: hints and explanations on'], ['practice', 'Practice', 'same as guided; sandboxes are always in every game'], ['challenge', 'Challenge', 'no hints, optional timer']]));
    var timer = h('input', { type: 'checkbox', checked: S.setting('timer') ? 'checked' : null });
    timer.addEventListener('change', function () { S.setting('timer', timer.checked); });
    el.appendChild(h('label.opt', null, timer, ' Show a timer in Challenge mode'));
    el.appendChild(radio('theme', 'Theme', [['auto', 'Match my system'], ['light', 'Light'], ['dark', 'Dark']]));
    el.appendChild(radio('reducedMotion', 'Reduced motion', [['auto', 'Match my system'], ['on', 'On', 'no sliding animations'], ['off', 'Off']]));
    el.appendChild(h('p.small', null, 'Sound: off. (There is no sound in this build.)'));
    el.appendChild(h('h2', null, 'Keyboard'));
    el.appendChild(h('ul.keys', null,
      h('li', null, h('kbd', null, 'Space'), ' play / pause an animation'),
      h('li', null, h('kbd', null, '←'), ' ', h('kbd', null, '→'), ' step back / forward'),
      h('li', null, h('kbd', null, 'Home'), ' restart, ', h('kbd', null, '+'), ' ', h('kbd', null, '−'), ' speed'),
      h('li', null, h('kbd', null, 'Tab'), ' to an array, then ', h('kbd', null, '←'), ' ', h('kbd', null, '→'), ' to move and ', h('kbd', null, 'Enter'), ' to pick'),
      h('li', null, h('kbd', null, '1'), '–', h('kbd', null, '4'), ' answer choices, ', h('kbd', null, 'S'), ' / ', h('kbd', null, 'K'), ' swap / keep')));
    el.appendChild(h('h2', null, 'Data'));
    el.appendChild(h('p.small', null, S.storageOk() ? 'Progress is saved in this browser only. Nothing is sent anywhere.' : 'Storage is blocked: progress lasts until you close the tab.'));
    el.appendChild(U.button('Reset all progress', function () {
      if (root.confirm('Erase all stars, XP and mastery data in this browser?')) { S.reset(); applyTheme(); hub(); }
    }, { cls: 'danger' }));
  }
  function underConstruction(uid) {
    var u = C.units.filter(function (x) { return x.id === uid; })[0];
    if (!u) return notFound();
    var el = screen('Unit ' + u.id + ': ' + u.title, [{ label: 'Map', href: '#/' }, { label: u.room }]);
    el.appendChild(h('p', null, '🚧 ' + u.room + ' is still under construction. It opens in a later phase.'));
    el.appendChild(h('a.btn.primary', { href: '#/u/5' }, 'Go to The Archive (Unit 5)'));
  }
  function notFound() {
    var el = screen('Room not found', [{ label: 'Map', href: '#/' }]);
    el.appendChild(h('p', null, 'That room doesn\'t exist (yet).'));
    el.appendChild(h('a.btn.primary', { href: '#/' }, 'Back to the map'));
  }

  /* ---------- router ---------- */
  function route() {
    var p = (location.hash || '#/').slice(2).split('/').filter(Boolean);
    try {
      if (!p.length) return hub();
      if (p[0] === 'u') {
        var uid = +p[1];
        if (!unitOf(uid)) return underConstruction(uid);
        if (p.length === 2) return unitRoom(uid);
        if (p[2] === 'briefing') return briefing(uid);
        if (p[2] === 'g') return level(uid, p[3], p[4]);
        if (p[2] === 'trace') return quizScreen(uid, 'trace');
        if (p[2] === 'boss') return quizScreen(uid, 'boss');
        if (p[2] === 'summary') return summary(uid);
      }
      if (p[0] === 'cheatsheet') return cheatsheet();
      if (p[0] === 'mastery') return mastery();
      if (p[0] === 'settings') return settings();
      notFound();
    } catch (err) {
      // Never leave the player stranded: show the error and a way out.
      U.clear(main);
      main.appendChild(h('h1', null, 'Something broke in the lab'));
      main.appendChild(h('pre.error', null, String(err && err.stack || err)));
      main.appendChild(h('a.btn.primary', { href: '#/' }, 'Back to the map'));
      if (root.console) console.error(err);
    }
  }

  root.addEventListener('hashchange', route);
  if (root.matchMedia) {
    var mq = root.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.addEventListener) mq.addEventListener('change', applyTheme);
  }
  applyTheme();
  route();
})(typeof globalThis !== 'undefined' ? globalThis : this);
