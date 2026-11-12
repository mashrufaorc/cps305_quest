/* CPS305 Quest — engine/bigo.js
 * Unit 2 (Big-O). Pure functions, no DOM.
 *  - complexity classes and their growth functions
 *  - cost functions as terms (2n² + 4n + 9) and the two simplification rules
 *  - crossover finding (where one cost overtakes another for good)
 *  - a tiny Lisp reader + step-counting interpreter, so Big-O Detective and
 *    Count the Steps get their answers by RUNNING the snippet shown on screen.
 * Step model (the lecture's): every simple body form (SETF, INCF, a call) costs
 * 1 step; loop overhead and LET bindings cost nothing; a call to a user DEFUN
 * costs the steps inside it.
 */
(function (root) {
  'use strict';
  var E = root.CQ.engine;
  var B = E.bigo = {};

  function lg(n) { return n <= 1 ? 0 : Math.log2(n); }
  function fact(n) { var r = 1; for (var i = 2; i <= n; i++) r *= i; return r; }

  /* Ordered by growth rate. All log bases are the same class. */
  B.classes = [
    { id: '1', label: 'O(1)', name: 'constant', f: function () { return 1; } },
    { id: 'logn', label: 'O(log n)', name: 'logarithmic', f: function (n) { return Math.max(1, lg(n)); } },
    { id: 'n', label: 'O(n)', name: 'linear', f: function (n) { return n; } },
    { id: 'nlogn', label: 'O(n log n)', name: 'log-linear', f: function (n) { return n * Math.max(1, lg(n)); } },
    { id: 'n2', label: 'O(n²)', name: 'quadratic', f: function (n) { return n * n; } },
    { id: 'n3', label: 'O(n³)', name: 'cubic', f: function (n) { return n * n * n; } },
    { id: '2n', label: 'O(2ⁿ)', name: 'exponential', f: function (n) { return Math.pow(2, n); } },
    { id: 'nfact', label: 'O(n!)', name: 'factorial', f: fact }
  ];
  B.cls = {};
  B.classes.forEach(function (c, i) { c.rank = i; B.cls[c.id] = c; });

  /* ---------- cost functions as terms ---------- */
  /* term: { c: coefficient, k: class id }  e.g. 2n² = {c:2, k:'n2'} */
  B.evalTerms = function (terms, n) {
    return terms.reduce(function (s, t) { return s + t.c * B.cls[t.k].f(n); }, 0);
  };
  B.dominant = function (terms) {
    var best = null;
    terms.forEach(function (t) { if (!best || B.cls[t.k].rank > B.cls[best.k].rank) best = t; });
    return best;
  };
  /* Share of total cost for each term at n — the dropped terms' share shrinks toward 0. */
  B.shares = function (terms, n) {
    var tot = B.evalTerms(terms, n);
    return terms.map(function (t) { return tot ? t.c * B.cls[t.k].f(n) / tot : 0; });
  };
  B.termText = function (t, showCoef) {
    var body = { '1': '', logn: 'log n', n: 'n', nlogn: 'n log n', n2: 'n²', n3: 'n³', '2n': '2ⁿ', nfact: 'n!' }[t.k];
    var c = showCoef === false ? '' : String(t.c);
    if (t.k === '1') return String(t.c);
    if (c === '1') c = '';
    return c + body;
  };

  /* Simplify It referee. state: [{c, k, coefShown}] ; move: {type:'term'|'coef', i}
   * Rule 1: keep only the fastest-growing term. Rule 2: drop its coefficient. */
  B.checkSimplify = function (state, move) {
    var dom = B.dominant(state), t = state[move.i];
    if (!t) return { ok: false, code: 'simp.none' };
    var d = { term: B.termText(t), dom: B.termText(dom), domClass: B.cls[dom.k].label };
    if (move.type === 'term') {
      if (t === dom) return { ok: false, code: 'simp.dropDominant', data: d };
      return { ok: true, data: d };
    }
    if (t.k === '1') return { ok: false, code: 'simp.constCoef', data: d };
    if (!t.coefShown || t.c === 1) return { ok: false, code: 'simp.noCoef', data: d };
    return { ok: true, data: d };
  };
  B.simplifyDone = function (state) {
    if (state.length !== 1) return false;
    var t = state[0];
    return t.k === '1' || t.c === 1 || !t.coefShown;
  };
  /* Random cost function with distinct classes (ties would need "combining terms"). */
  B.randomTerms = function (tier, seed) {
    var rand = E.rng(seed);
    var pool = tier === 1 ? ['1', 'n', 'n2'] : tier === 2 ? ['1', 'logn', 'n', 'nlogn', 'n2', 'n3'] : ['1', 'logn', 'n', 'nlogn', 'n2', 'n3', '2n'];
    var count = tier === 1 ? 3 : tier === 2 ? 3 : 4;
    var picked = E.shuffle(pool, rand).slice(0, count);
    picked.sort(function (a, b) { return B.cls[b].rank - B.cls[a].rank; });
    // Shuffle display order a little so the biggest term is not always first.
    var terms = picked.map(function (k) { return { k: k, c: E.randInt(rand, k === '1' ? 2 : 2, k === '1' ? 99 : 50), coefShown: true }; });
    // Make the trap visible: give a low-order term the biggest coefficient.
    if (terms.length > 1) terms[terms.length - 1].c = Math.max(terms[terms.length - 1].c, 100 + E.randInt(rand, 0, 900));
    return E.shuffle(terms, rand);
  };

  /* ---------- crossover ---------- */
  /* Smallest n in [lo, hi] such that a(m) > b(m) for every m in [n, hi]
   * (a has overtaken b for good). null if never. */
  B.crossover = function (a, b, lo, hi) {
    var ans = null;
    for (var n = hi; n >= lo; n--) {
      if (a(n) > b(n)) ans = n; else break;
    }
    return ans;
  };

  /* ---------- Lisp reader ---------- */
  B.read = function (src) {
    // Tokens remember their source line, so step counts can be shown per line.
    var toks = [], lines = [], i = 0, s = String(src), line = 1;
    while (i < s.length) {
      var ch = s[i];
      if (ch === '\n') { line++; i++; continue; }
      if (ch === ';') { while (i < s.length && s[i] !== '\n') i++; continue; }
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '(' || ch === ')') { toks.push(ch); lines.push(line); i++; continue; }
      var j = i;
      while (j < s.length && !/[\s()]/.test(s[j]) && s[j] !== ';') j++;
      toks.push(s.slice(i, j)); lines.push(line); i = j;
    }
    var p = 0;
    function form() {
      var ln = lines[p], t = toks[p++];
      if (t === '(') {
        var lst = [];
        lst.line = ln;
        while (toks[p] !== ')') { if (p >= toks.length) throw new Error('Unbalanced parentheses'); lst.push(form()); }
        p++;
        return lst;
      }
      if (t === ')') throw new Error('Unexpected )');
      if (/^-?\d+$/.test(t)) return Number(t);
      return t.toLowerCase();
    }
    var forms = [];
    while (p < toks.length) forms.push(form());
    return forms;
  };

  /* ---------- step-counting interpreter (lecture subset) ---------- */
  var BUILTIN = {
    '+': function (a) { return a.reduce(function (x, y) { return x + y; }, 0); },
    '*': function (a) { return a.reduce(function (x, y) { return x * y; }, 1); },
    '-': function (a) { return a.length === 1 ? -a[0] : a.slice(1).reduce(function (x, y) { return x - y; }, a[0]); },
    '/': function (a) { return a.slice(1).reduce(function (x, y) { return x / y; }, a[0]); },
    'floor': function (a) { return Math.floor(a.length > 1 ? a[0] / a[1] : a[0]); },
    '1+': function (a) { return a[0] + 1; }, '1-': function (a) { return a[0] - 1; },
    '<': function (a) { return a[0] < a[1]; }, '>': function (a) { return a[0] > a[1]; },
    '<=': function (a) { return a[0] <= a[1]; }, '>=': function (a) { return a[0] >= a[1]; },
    '=': function (a) { return a[0] === a[1]; }
  };
  var STEP_LIMIT = 5e7;

  /* Run (fname n) from the given source. Returns { value, steps, lineHits }.
   * lineHits counts steps per source form (for highlighting), keyed by a form id. */
  B.run = function (src, fname, args) {
    var forms = B.read(src);
    var fns = {};
    forms.forEach(function (f) { if (Array.isArray(f) && f[0] === 'defun') fns[f[1]] = f; });
    var steps = 0;
    var counts = new Map();   // form -> times counted

    function lookup(env, name) {
      for (var e = env; e; e = e.parent) if (Object.prototype.hasOwnProperty.call(e.vars, name)) return e;
      return null;
    }
    function get(env, name) {
      if (name === 't') return true;
      if (name === 'nil') return null;
      var e = lookup(env, name);
      if (!e) throw new Error('Unbound variable ' + name.toUpperCase());
      return e.vars[name];
    }
    function set(env, name, v) {
      var e = lookup(env, name);
      if (!e) throw new Error('Unbound variable ' + name.toUpperCase());
      e.vars[name] = v;
    }
    function scope(parent) { return { vars: {}, parent: parent }; }
    function step(form) {
      steps++;
      counts.set(form, (counts.get(form) || 0) + 1);
      if (steps > STEP_LIMIT) throw new Error('Too many steps');
    }
    /* Body forms: each one is a "statement". Simple statements cost 1 step. */
    function body(forms, env) {
      var v = null;
      for (var i = 0; i < forms.length; i++) {
        var f = forms[i];
        var head = Array.isArray(f) ? f[0] : null;
        var structural = head === 'dotimes' || head === 'do' || head === 'let' || head === 'let*' || head === 'progn' || head === 'when' || head === 'if' || (head && fns[head]);
        if (!structural) step(f);
        v = ev(f, env);
      }
      return v;
    }
    function call(fn, argv) {
      var params = fn[2], env = scope(null);
      params.forEach(function (p, i) { env.vars[p] = argv[i]; });
      return body(fn.slice(3), env);
    }
    function ev(f, env) {
      if (typeof f === 'number') return f;
      if (typeof f === 'string') return get(env, f);
      var h = f[0];
      switch (h) {
        case 'let': case 'let*': {
          var e2 = scope(env);
          f[1].forEach(function (b) {
            var name = Array.isArray(b) ? b[0] : b;
            e2.vars[name] = Array.isArray(b) ? ev(b[1], h === 'let*' ? e2 : env) : null;
          });
          return body(f.slice(2), e2);
        }
        case 'setf': {
          var v = null;
          for (var i = 1; i < f.length; i += 2) { v = ev(f[i + 1], env); set(env, f[i], v); }
          return v;
        }
        case 'incf': case 'decf': {
          var d = f.length > 2 ? ev(f[2], env) : 1;
          var nv = get(env, f[1]) + (h === 'incf' ? d : -d);
          set(env, f[1], nv); return nv;
        }
        case 'progn': return body(f.slice(1), env);
        case 'when': return ev(f[1], env) ? (step(f), body(f.slice(2), env)) : (step(f), null);
        case 'if': step(f); return ev(f[1], env) ? ev(f[2], env) : f[3] !== undefined ? ev(f[3], env) : null;
        case 'dotimes': {
          // (dotimes (var count [result]) body...)
          var spec = f[1], cnt = ev(spec[1], env), e3 = scope(env);
          for (var k = 0; k < cnt; k++) { e3.vars[spec[0]] = k; body(f.slice(2), e3); }
          e3.vars[spec[0]] = cnt;
          return spec[2] !== undefined ? ev(spec[2], e3) : null;
        }
        case 'do': {
          // (do ((var init step)...) (end-test result...) body...)
          var e4 = scope(env), specs = f[1];
          specs.forEach(function (s) { e4.vars[s[0]] = s.length > 1 ? ev(s[1], env) : null; });
          for (var guard = 0; ; guard++) {
            if (ev(f[2][0], e4)) return f[2].length > 1 ? ev(f[2][f[2].length - 1], e4) : null;
            body(f.slice(3), e4);
            var nxt = specs.map(function (s) { return s.length > 2 ? ev(s[2], e4) : e4.vars[s[0]]; });
            specs.forEach(function (s, i2) { e4.vars[s[0]] = nxt[i2]; });
            if (guard > STEP_LIMIT) throw new Error('Loop never ends');
          }
        }
        default: {
          var argv = f.slice(1).map(function (a) { return ev(a, env); });
          if (fns[h]) return call(fns[h], argv);
          if (BUILTIN[h]) return BUILTIN[h](argv);
          throw new Error('Unknown function ' + String(h).toUpperCase());
        }
      }
    }
    if (!fns[fname]) throw new Error('No DEFUN named ' + fname);
    var value = call(fns[fname], args);
    return { value: value, steps: steps, counts: counts, forms: forms };
  };

  B.steps = function (src, fname, n) { return B.run(src, fname, [n]).steps; };

  /* Steps charged to each source line (1-based) for one run. */
  B.lineSteps = function (src, fname, n) {
    var r = B.run(src, fname, [n]), out = {};
    r.counts.forEach(function (c, form) { if (form && form.line) out[form.line] = (out[form.line] || 0) + c; });
    return { steps: r.steps, value: r.value, lines: out };
  };

  /* Empirical class: the class whose ratio steps(n)/f(n) stays flattest as n
   * doubles (log-log slope closest to 0). Uses n = 64, 128, 256. */
  B.classify = function (src, fname, candidates) {
    var ns = [64, 128, 256];
    var counts = ns.map(function (n) { return B.steps(src, fname, n); });
    var best = null;
    (candidates || ['1', 'logn', 'n', 'nlogn', 'n2', 'n3']).forEach(function (id) {
      var c = B.cls[id];
      var r1 = counts[1] / c.f(ns[1]), r2 = counts[2] / c.f(ns[2]);
      if (r1 <= 0 || r2 <= 0) return;
      var slope = Math.abs(Math.log(r2 / r1) / Math.log(2));
      if (!best || slope < best.slope) best = { id: id, slope: slope };
    });
    return best ? best.id : null;
  };

  /* Exact step table for small n (Count the Steps, and the plotted curve). */
  B.table = function (src, fname, ns) {
    return ns.map(function (n) { return [n, B.steps(src, fname, n)]; });
  };

  /* Instrument a snippet for SBCL: every counted form is wrapped so it bumps
   * *STEPS*. Used by tests/verify-lisp.js to check this interpreter against SBCL. */
  B.instrument = function (src) {
    var forms = B.read(src);
    var fns = {};
    forms.forEach(function (f) { if (Array.isArray(f) && f[0] === 'defun') fns[f[1]] = true; });
    function wrapBody(list) {
      return list.map(function (f) {
        var head = Array.isArray(f) ? f[0] : null;
        var structural = head === 'dotimes' || head === 'do' || head === 'let' || head === 'let*' || head === 'progn' || head === 'when' || head === 'if' || (head && fns[head]);
        var inner = walk(f);
        return structural ? inner : ['progn', ['incf', '*steps*'], inner];
      });
    }
    function walk(f) {
      if (!Array.isArray(f)) return f;
      var h = f[0];
      if (h === 'defun') return f.slice(0, 3).concat(wrapBody(f.slice(3)));
      if (h === 'let' || h === 'let*') return [h, f[1].map(function (b) { return Array.isArray(b) ? [b[0], walk(b[1])] : b; })].concat(wrapBody(f.slice(2)));
      if (h === 'progn') return ['progn'].concat(wrapBody(f.slice(1)));
      if (h === 'when') return ['progn', ['incf', '*steps*'], ['when', walk(f[1])].concat(wrapBody(f.slice(2)))];
      if (h === 'if') return ['progn', ['incf', '*steps*'], ['if'].concat(f.slice(1).map(walk))];
      if (h === 'dotimes') return ['dotimes', f[1].map(walk)].concat(wrapBody(f.slice(2)));
      if (h === 'do') return ['do', f[1].map(function (s) { return s.map(walk); }), f[2].map(walk)].concat(wrapBody(f.slice(3)));
      return f.map(walk);
    }
    return forms.map(walk).map(B.print).join('\n');
  };
  B.print = function (f) {
    if (Array.isArray(f)) return '(' + f.map(B.print).join(' ') + ')';
    return String(f);
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
