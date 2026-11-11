/* CPS305 Quest — state/store.js
 * Progress, mastery, Leitner review boxes and settings, kept in localStorage.
 * Every storage call is wrapped in try/catch: if storage is blocked (private
 * window, file:// restrictions) the game keeps working in memory.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ = root.CQ || {};
  var KEY = 'cps305quest.v1';

  var defaults = function () {
    return {
      settings: { theme: 'auto', mode: 'guided', reducedMotion: 'auto', speed: 1, sound: false, timer: false },
      xp: 0,
      streak: { count: 0, last: null },
      levels: {},     // levelKey -> { stars, best, completed }
      units: {},      // unitId -> { briefing, trace, boss, summary }
      concepts: {},   // conceptId -> { attempts, firstTryRight, lastSeen, history: [1/0...] }
      leitner: {},    // conceptId -> { box: 1..5, due: dayNumber }
      adapt: {},      // gameId -> { tier, misses: {concept: n}, flawless }
      cards: {}       // conceptCardId -> true (unlocked into the Cheat Sheet)
    };
  };

  var mem = null;
  var storageOk = true;

  function load() {
    if (mem) return mem;
    mem = defaults();
    try {
      var raw = root.localStorage && root.localStorage.getItem(KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        var d = defaults();
        for (var k in d) if (saved[k] !== undefined) mem[k] = saved[k];
        mem.settings = Object.assign(d.settings, saved.settings || {});
      }
    } catch (e) { storageOk = false; }
    return mem;
  }
  function save() {
    try { root.localStorage.setItem(KEY, JSON.stringify(mem)); storageOk = true; }
    catch (e) { storageOk = false; }
  }
  function today() { return Math.floor(Date.now() / 86400000); }

  var S = CQ.store = {
    get: function () { return load(); },
    storageOk: function () { load(); return storageOk; },
    setting: function (k, v) {
      var st = load();
      if (v === undefined) return st.settings[k];
      st.settings[k] = v; save(); return v;
    },

    /* Daily streak: consecutive days with at least one completed activity. */
    touchStreak: function () {
      var st = load(), t = today();
      if (st.streak.last === t) return;
      st.streak.count = st.streak.last === t - 1 ? st.streak.count + 1 : 1;
      st.streak.last = t; save();
    },
    addXp: function (n) { var st = load(); st.xp += n; S.touchStreak(); save(); },

    /* Stars: 1 = completed, 2 = no hints, 3 = optimal (e.g. fewest probes / no misses). */
    completeLevel: function (key, stars, score) {
      var st = load();
      var prev = st.levels[key] || { stars: 0, best: null, completed: false };
      var gained = Math.max(0, stars - prev.stars);
      st.levels[key] = { stars: Math.max(prev.stars, stars), best: prev.best == null ? score : Math.max(prev.best, score), completed: true };
      st.xp += 20 + gained * 10;
      S.touchStreak(); save();
      return { gainedStars: gained, xp: 20 + gained * 10 };
    },
    level: function (key) { return load().levels[key] || { stars: 0, completed: false }; },

    unitFlag: function (unitId, flag, value) {
      var st = load();
      st.units[unitId] = st.units[unitId] || {};
      if (value === undefined) return !!st.units[unitId][flag];
      st.units[unitId][flag] = value; save(); return value;
    },

    /* Mastery: record each attempt on a concept. A miss sends its card to
     * Leitner box 1 (review soon); a first-try hit moves it up a box. */
    record: function (concept, correct, firstTry) {
      if (!concept) return;
      var st = load(), t = today();
      var c = st.concepts[concept] || { attempts: 0, firstTryRight: 0, firstTries: 0, lastSeen: t, history: [] };
      c.attempts++;
      if (firstTry) { c.firstTries++; if (correct) c.firstTryRight++; }
      c.lastSeen = t;
      c.history.push(correct ? 1 : 0);
      if (c.history.length > 20) c.history.shift();
      st.concepts[concept] = c;
      var lb = st.leitner[concept] || { box: 1, due: t };
      if (!correct) { lb.box = 1; lb.due = t; }
      else if (firstTry) { lb.box = Math.min(5, lb.box + 1); lb.due = t + [0, 1, 2, 4, 7, 14][lb.box]; }
      st.leitner[concept] = lb;
      if (correct && firstTry) st.xp += 5;
      save();
    },
    /* Confidence 0..1: first-try accuracy (recent attempts weigh more), faded by days since last seen. */
    confidence: function (concept) {
      var c = load().concepts[concept];
      if (!c || !c.history.length) return null;
      var w = 0, s = 0;
      c.history.forEach(function (h, i) { var wi = 1 + i; w += wi; s += wi * h; });
      var acc = s / w;
      var days = today() - c.lastSeen;
      var fade = Math.max(0.5, 1 - days * 0.05);
      return Math.round(acc * fade * 100) / 100;
    },
    dueForReview: function () {
      var st = load(), t = today();
      return Object.keys(st.leitner).filter(function (k) { return st.leitner[k].due <= t; });
    },

    /* Adaptive difficulty: tiers 1..3. Two misses on the same concept -> drop a
     * tier (and the game shows a worked example). Three flawless rounds -> up a tier. */
    adapt: function (gameId) {
      var st = load();
      return st.adapt[gameId] || (st.adapt[gameId] = { tier: 1, misses: {}, flawless: 0 });
    },
    noteMiss: function (gameId, concept) {
      var a = S.adapt(gameId);
      a.misses[concept] = (a.misses[concept] || 0) + 1;
      a.flawless = 0;
      var dropped = false;
      if (a.misses[concept] >= 2) {
        a.misses[concept] = 0;
        if (a.tier > 1) { a.tier--; dropped = true; }
        save();
        return { workedExample: true, dropped: dropped };
      }
      save();
      return { workedExample: false };
    },
    noteRound: function (gameId, flawless) {
      var a = S.adapt(gameId);
      if (!flawless) { a.flawless = 0; save(); return false; }
      a.flawless++;
      if (a.flawless >= 3 && a.tier < 3) { a.tier++; a.flawless = 0; save(); return true; }
      save(); return false;
    },
    setTier: function (gameId, tier) { var a = S.adapt(gameId); a.tier = tier; save(); },

    unlockCard: function (id) { var st = load(); if (!st.cards[id]) { st.cards[id] = true; save(); return true; } return false; },
    cardUnlocked: function (id) { return !!load().cards[id]; },

    reset: function () { mem = defaults(); save(); },
    _setBackend: function (fake) { root.localStorage = fake; mem = null; } // tests only
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
