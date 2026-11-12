/* CPS305 Quest — engine/lisp.js
 * A small Common Lisp interpreter covering the forms used in CPS 305 lectures.
 * Pure (no DOM). Used to run lecture code inside games: recursion call stacks,
 * cons cells, structs, hash tables, bracket checking, trees.
 * Printing follows the SBCL REPL: uppercase symbols, NIL, (1 . 2), #(1 2 3), "str".
 * tests/verify-lisp.js checks this interpreter's output against real SBCL.
 */
(function (root) {
  'use strict';
  var E = root.CQ.engine;
  var L = E.lisp = {};

  /* ---------- data ---------- */
  function Sym(name) { this.name = name; }
  var symtab = {};
  function sym(name) { name = name.toUpperCase(); return symtab[name] || (symtab[name] = new Sym(name)); }
  var NIL = null, T = sym('T');
  function Cons(car, cdr) { this.car = car; this.cdr = cdr; }
  function LStr(s) { this.s = s; }               // Lisp strings are objects (EQ identity matters)
  function Vec(items) { this.items = items; }
  function Struct(type, slots) { this.type = type; this.slots = slots; }
  function HashTab(test) { this.test = test; this.map = new Map(); }
  function Fn(name, params, body, env) { this.name = name; this.params = params; this.body = body; this.env = env; }
  function Builtin(name, f) { this.name = name; this.f = f; }
  function Ratio(n, d) { this.n = n; this.d = d; }
  L.Sym = Sym; L.Cons = Cons; L.LStr = LStr; L.Vec = Vec; L.Struct = Struct; L.HashTab = HashTab; L.sym = sym; L.T = T;

  L.list = function (arr, tail) { var r = tail === undefined ? NIL : tail; for (var i = arr.length - 1; i >= 0; i--) r = new Cons(arr[i], r); return r; };
  L.toArray = function (l) { var a = []; while (l instanceof Cons) { a.push(l.car); l = l.cdr; } return a; };

  function LispError(msg) { this.message = msg; this.lisp = true; }
  LispError.prototype = Object.create(Error.prototype);
  L.LispError = LispError;
  function err(m) { throw new LispError(m); }

  /* ---------- reader ---------- */
  L.read = function (src) {
    var s = String(src), i = 0, line = 1;
    function ws() {
      for (;;) {
        if (i >= s.length) return;
        var c = s[i];
        if (c === '\n') { line++; i++; }
        else if (/\s/.test(c)) i++;
        else if (c === ';') { while (i < s.length && s[i] !== '\n') i++; }
        else return;
      }
    }
    function form() {
      ws();
      if (i >= s.length) err('end of input');
      var c = s[i], ln = line;
      if (c === '(') {
        i++;
        var items = [], tail = NIL;
        for (;;) {
          ws();
          if (i >= s.length) err('Unbalanced parentheses');
          if (s[i] === ')') { i++; break; }
          if (s[i] === '.' && /[\s()]/.test(s[i + 1] || ' ')) { i++; tail = form(); ws(); if (s[i] !== ')') err('Bad dotted list'); i++; break; }
          items.push(form());
        }
        var l = L.list(items, tail);
        if (l instanceof Cons) l.line = ln;
        return l;
      }
      if (c === ')') err('Unexpected )');
      if (c === "'") { i++; return L.list([sym('QUOTE'), form()]); }
      if (c === '#' && s[i + 1] === "'") { i += 2; return L.list([sym('FUNCTION'), form()]); }
      if (c === '#' && s[i + 1] === '(') { i++; var lst = form(); return new Vec(L.toArray(lst)); }
      if (c === '"') {
        var j = i + 1, out = '';
        while (j < s.length && s[j] !== '"') { if (s[j] === '\\') j++; out += s[j]; j++; }
        i = j + 1;
        return new LStr(out);
      }
      var k = i;
      while (k < s.length && !/[\s()'";]/.test(s[k])) k++;
      var tok = s.slice(i, k); i = k;
      if (/^[+-]?\d+$/.test(tok)) return parseInt(tok, 10);
      if (/^[+-]?\d*\.\d+$/.test(tok)) return parseFloat(tok);
      if (/^[+-]?\d+\/\d+$/.test(tok)) { var p = tok.split('/'); return ratio(+p[0], +p[1]); }
      if (tok.toUpperCase() === 'NIL') return NIL;
      // One flat namespace: drop package prefixes like RTL:SLICE (keywords keep their colon).
      var colon = tok.indexOf(':');
      if (colon > 0) tok = tok.slice(tok.lastIndexOf(':') + 1);
      return sym(tok);
    }
    var forms = [];
    for (;;) { ws(); if (i >= s.length) break; forms.push(form()); }
    return forms;
  };

  /* ---------- printer (SBCL REPL style, ~S) ---------- */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  function ratio(n, d) {
    if (d === 0) err('arithmetic error DIVISION-BY-ZERO signalled');
    var g = gcd(n, d); n /= g; d /= g;
    if (d < 0) { n = -n; d = -d; }
    return d === 1 ? n : new Ratio(n, d);
  }
  L.print = function pr(x) {
    if (x === NIL) return 'NIL';
    if (typeof x === 'number') return Number.isInteger(x) ? String(x) : String(x);
    if (x instanceof Ratio) return x.n + '/' + x.d;
    if (x instanceof Sym) return x.name;
    if (x instanceof LStr) return '"' + x.s.replace(/(["\\])/g, '\\$1') + '"';
    if (x instanceof Vec) return '#(' + x.items.map(pr).join(' ') + ')';
    if (x instanceof Cons) {
      if (x.car === sym('QUOTE') && x.cdr instanceof Cons && x.cdr.cdr === NIL) return "'" + pr(x.cdr.car);
      var parts = [], c = x;
      while (c instanceof Cons) { parts.push(pr(c.car)); c = c.cdr; }
      return '(' + parts.join(' ') + (c !== NIL ? ' . ' + pr(c) : '') + ')';
    }
    if (x instanceof Struct) return '#S(' + x.type + Object.keys(x.slots).map(function (k) { return ' :' + k + ' ' + pr(x.slots[k]); }).join('') + ')';
    if (x instanceof HashTab) return '#<HASH-TABLE :TEST ' + x.test + ' :COUNT ' + x.map.size + '>';
    if (x instanceof Fn || x instanceof Builtin) return '#<FUNCTION ' + (x.name || '(LAMBDA)') + '>';
    return String(x);
  };
  /* PRINC-style (no quotes on strings) */
  L.princ = function (x) { return x instanceof LStr ? x.s : L.print(x); };

  /* ---------- equality ---------- */
  function eql(a, b) {
    if (a === b) return true;
    if (typeof a === 'number' && typeof b === 'number') return a === b;
    if (a instanceof Ratio && b instanceof Ratio) return a.n === b.n && a.d === b.d;
    return false;
  }
  function equal(a, b) {
    if (eql(a, b)) return true;
    if (a instanceof LStr && b instanceof LStr) return a.s === b.s;
    if (a instanceof Cons && b instanceof Cons) return equal(a.car, b.car) && equal(a.cdr, b.cdr);
    return false;
  }
  L.eql = eql; L.equal = equal;

  /* ---------- environment ---------- */
  function Env(parent) { this.vars = new Map(); this.parent = parent; }
  Env.prototype.find = function (s) { for (var e = this; e; e = e.parent) if (e.vars.has(s)) return e; return null; };

  function truthy(x) { return x !== NIL; }
  function bool(b) { return b ? T : NIL; }
  function num(x, fn) { if (typeof x !== 'number' && !(x instanceof Ratio)) err('The value ' + L.print(x) + ' is not of type NUMBER' + (fn ? ' (in ' + fn + ')' : '')); return x; }
  function toF(x) { return x instanceof Ratio ? x.n / x.d : x; }
  function add(a, b) {
    if (a instanceof Ratio || b instanceof Ratio) { var an = a instanceof Ratio ? a : new Ratio(a, 1), bn = b instanceof Ratio ? b : new Ratio(b, 1); return ratio(an.n * bn.d + bn.n * an.d, an.d * bn.d); }
    return a + b;
  }
  function mul(a, b) {
    if (a instanceof Ratio || b instanceof Ratio) { var an = a instanceof Ratio ? a : new Ratio(a, 1), bn = b instanceof Ratio ? b : new Ratio(b, 1); return ratio(an.n * bn.n, an.d * bn.d); }
    return a * b;
  }
  function div(a, b) {
    if (typeof a === 'number' && typeof b === 'number' && Number.isInteger(a) && Number.isInteger(b)) return ratio(a, b);
    var an = a instanceof Ratio ? a : new Ratio(a, 1), bn = b instanceof Ratio ? b : new Ratio(b, 1);
    return ratio(an.n * bn.d, an.d * bn.n);
  }
  function neg(a) { return a instanceof Ratio ? new Ratio(-a.n, a.d) : -a; }

  /* ---------- the interpreter ---------- */
  /* opts: { maxDepth (default 600), maxSteps, onCall(info), onReturn(info) } */
  L.Interp = function (opts) {
    opts = opts || {};
    var self = this;
    var global = new Env(null);
    var fns = new Map();          // symbol -> Fn | Builtin
    var depth = 0, steps = 0, out = [];
    var maxDepth = opts.maxDepth || 400, maxSteps = opts.maxSteps || 2e6;
    var structs = {};
    this.global = global; this.fns = fns; this.out = out;
    this.hooks = { onCall: opts.onCall, onReturn: opts.onReturn };

    function BlockReturn(name, value) { this.name = name; this.value = value; }
    function MV(vals) { this.vals = vals; }    // multiple values
    function prim(x) { return x instanceof MV ? (x.vals.length ? x.vals[0] : NIL) : x; }

    function def(name, f) { fns.set(sym(name), new Builtin(name.toUpperCase(), f)); }
    function arith(name, f, unit) {
      def(name, function (a) {
        a.forEach(function (x) { num(x, name.toUpperCase()); });
        if (!a.length) return unit;
        if (a.length === 1) return name === '-' ? neg(a[0]) : name === '/' ? div(1, a[0]) : a[0];
        return a.slice(1).reduce(f, a[0]);
      });
    }
    arith('+', add, 0); arith('*', mul, 1);
    arith('-', function (x, y) { return add(x, neg(y)); }, 0);
    arith('/', div, 1);
    function cmp(name, f) {
      def(name, function (a) {
        a.forEach(function (x) { num(x, name); });
        for (var i = 1; i < a.length; i++) if (!f(toF(a[i - 1]), toF(a[i]))) return NIL;
        return T;
      });
    }
    cmp('=', function (x, y) { return x === y; }); cmp('<', function (x, y) { return x < y; });
    cmp('>', function (x, y) { return x > y; }); cmp('<=', function (x, y) { return x <= y; });
    cmp('>=', function (x, y) { return x >= y; });
    def('/=', function (a) { return bool(toF(a[0]) !== toF(a[1])); });
    def('1+', function (a) { return add(num(a[0], '1+'), 1); });
    def('1-', function (a) { return add(num(a[0], '1-'), -1); });
    def('mod', function (a) { var m = a[0] % a[1]; return m !== 0 && (m < 0) !== (a[1] < 0) ? m + a[1] : m; });
    def('rem', function (a) { return a[0] % a[1]; });
    def('floor', function (a) { var q = a.length > 1 ? toF(a[0]) / toF(a[1]) : toF(a[0]); var f = Math.floor(q); return new MV([f, a.length > 1 ? a[0] - f * a[1] : toF(a[0]) - f]); });
    def('abs', function (a) { return Math.abs(a[0]); });
    def('max', function (a) { return Math.max.apply(null, a.map(toF)); });
    def('min', function (a) { return Math.min.apply(null, a.map(toF)); });
    def('expt', function (a) { return Math.pow(a[0], a[1]); });
    def('ceiling', function (a) { var q = a.length > 1 ? toF(a[0]) / toF(a[1]) : toF(a[0]); return Math.ceil(q - 1e-12); });
    def('log', function (a) { return a.length > 1 ? Math.log(toF(a[0])) / Math.log(toF(a[1])) : Math.log(toF(a[0])); });
    /* SXHASH codes are SBCL-internal; labs supply them (opts.sxhash: {NAME: code}). */
    def('sxhash', function (a) {
      var k = a[0], name = k instanceof Sym ? k.name : k instanceof LStr ? k.s : String(k);
      if (opts.sxhash && opts.sxhash[name] != null) return opts.sxhash[name];
      var h = 7; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 1000003;
      return h;
    });
    def('sqrt', function (a) { return Math.sqrt(toF(a[0])); });
    def('zerop', function (a) { return bool(toF(a[0]) === 0); });
    def('plusp', function (a) { return bool(toF(a[0]) > 0); });
    def('minusp', function (a) { return bool(toF(a[0]) < 0); });
    def('evenp', function (a) { return bool(a[0] % 2 === 0); });
    def('oddp', function (a) { return bool(Math.abs(a[0] % 2) === 1); });
    def('numberp', function (a) { return bool(typeof a[0] === 'number' || a[0] instanceof Ratio); });
    def('integerp', function (a) { return bool(Number.isInteger(a[0])); });
    def('symbolp', function (a) { return bool(a[0] === NIL || a[0] instanceof Sym); });
    def('stringp', function (a) { return bool(a[0] instanceof LStr); });
    def('null', function (a) { return bool(a[0] === NIL); });
    def('not', function (a) { return bool(a[0] === NIL); });
    def('atom', function (a) { return bool(!(a[0] instanceof Cons)); });
    def('consp', function (a) { return bool(a[0] instanceof Cons); });
    def('listp', function (a) { return bool(a[0] === NIL || a[0] instanceof Cons); });
    def('eq', function (a) { return bool(a[0] === a[1] || (typeof a[0] === 'number' && a[0] === a[1])); });
    def('eql', function (a) { return bool(eql(a[0], a[1])); });
    def('equal', function (a) { return bool(equal(a[0], a[1])); });
    function equalp(x, y) {
      if (equal(x, y)) return true;
      if (typeof x === 'number' && typeof y === 'number') return x === y;
      if (x instanceof LStr && y instanceof LStr) return x.s.toLowerCase() === y.s.toLowerCase();
      if (x instanceof Cons && y instanceof Cons) return equalp(x.car, y.car) && equalp(x.cdr, y.cdr);
      if (x instanceof Vec && y instanceof Vec) return x.items.length === y.items.length && x.items.every(function (v, i) { return equalp(v, y.items[i]); });
      if (x instanceof Struct && y instanceof Struct) return x.type === y.type && Object.keys(x.slots).every(function (k) { return equalp(x.slots[k], y.slots[k]); });
      return false;
    }
    def('equalp', function (a) { return bool(equalp(a[0], a[1])); });
    def('elt', function (a) { if (a[0] instanceof Vec) return a[0].items[a[1]]; var l = a[0]; for (var i = 0; i < a[1]; i++) l = l.cdr; return l.car; });
    def('make-list', function (a) { var o = kw(a, 1), r = []; for (var i = 0; i < a[0]; i++) r.push(o['INITIAL-ELEMENT'] !== undefined ? o['INITIAL-ELEMENT'] : NIL); return L.list(r); });
    def('cons', function (a) { return new Cons(a[0], a[1]); });
    def('list', function (a) { return L.list(a); });
    def('list*', function (a) { return L.list(a.slice(0, -1), a[a.length - 1]); });
    function car(x, n) { if (x === NIL) return NIL; if (!(x instanceof Cons)) err('The value ' + L.print(x) + ' is not of type LIST' + (n ? ' (in ' + n + ')' : '')); return x.car; }
    function cdr(x, n) { if (x === NIL) return NIL; if (!(x instanceof Cons)) err('The value ' + L.print(x) + ' is not of type LIST' + (n ? ' (in ' + n + ')' : '')); return x.cdr; }
    def('car', function (a) { return car(a[0], 'CAR'); }); def('first', function (a) { return car(a[0], 'FIRST'); });
    def('cdr', function (a) { return cdr(a[0], 'CDR'); }); def('rest', function (a) { return cdr(a[0], 'REST'); });
    def('second', function (a) { return car(cdr(a[0])); }); def('third', function (a) { return car(cdr(cdr(a[0]))); });
    def('cadr', function (a) { return car(cdr(a[0])); }); def('cddr', function (a) { return cdr(cdr(a[0])); }); def('caar', function (a) { return car(car(a[0])); });
    def('nth', function (a) { var l = a[1]; for (var i = 0; i < a[0]; i++) l = cdr(l); return car(l); });
    def('nthcdr', function (a) { var l = a[1]; for (var i = 0; i < a[0]; i++) l = cdr(l); return l; });
    def('last', function (a) { var l = a[0]; while (l instanceof Cons && l.cdr instanceof Cons) l = l.cdr; return l; });
    def('length', function (a) {
      var x = a[0];
      if (x instanceof Vec) return x.items.length;
      if (x instanceof LStr) return x.s.length;
      var n = 0; while (x instanceof Cons) { n++; x = x.cdr; } return n;
    });
    def('append', function (a) {
      if (!a.length) return NIL;
      var res = a[a.length - 1];
      for (var i = a.length - 2; i >= 0; i--) res = L.list(L.toArray(a[i]), res);
      return res;
    });
    def('reverse', function (a) {
      if (a[0] instanceof Vec) return new Vec(a[0].items.slice().reverse());
      return L.list(L.toArray(a[0]).reverse());
    });
    def('copy-list', function (a) { return L.list(L.toArray(a[0])); });
    def('subseq', function (a) {
      var x = a[0], end = a.length > 2 && a[2] !== NIL ? a[2] : undefined;
      if (x instanceof Vec) return new Vec(x.items.slice(a[1], end));
      if (x instanceof LStr) return new LStr(x.s.slice(a[1], end));
      return L.list(L.toArray(x).slice(a[1], end));
    });
    function kw(a, start) {
      var o = {};
      for (var i = start; i < a.length; i += 2) if (a[i] instanceof Sym && a[i].name[0] === ':') o[a[i].name.slice(1)] = a[i + 1];
      return o;
    }
    function testFn(o) {
      var t = o.TEST;
      if (!t) return eql;
      var f = asFn(t);
      return function (x, y) { return truthy(self.apply(f, [x, y])); };
    }
    function keyFn(o) { if (!o.KEY) return function (x) { return x; }; var f = asFn(o.KEY); return function (x) { return self.apply(f, [x]); }; }
    def('member', function (a) { var o = kw(a, 2), t = testFn(o), l = a[1]; while (l instanceof Cons) { if (t(a[0], l.car)) return l; l = l.cdr; } return NIL; });
    def('assoc', function (a) { var o = kw(a, 2), t = testFn(o), l = a[1]; while (l instanceof Cons) { if (l.car instanceof Cons && t(a[0], l.car.car)) return l.car; l = l.cdr; } return NIL; });
    def('remove', function (a) { var o = kw(a, 2), t = testFn(o), k = keyFn(o); return L.list(L.toArray(a[1]).filter(function (x) { return !t(a[0], k(x)); })); });
    def('find', function (a) { var o = kw(a, 2), t = testFn(o), k = keyFn(o); var r = L.toArray(a[1]).filter(function (x) { return t(a[0], k(x)); }); return r.length ? r[0] : NIL; });
    def('position', function (a) { var o = kw(a, 2), t = testFn(o), arr = a[1] instanceof Vec ? a[1].items : L.toArray(a[1]); for (var i = 0; i < arr.length; i++) if (t(a[0], arr[i])) return i; return NIL; });
    def('count', function (a) { var o = kw(a, 2), t = testFn(o); return L.toArray(a[1]).filter(function (x) { return t(a[0], x); }).length; });
    def('mapcar', function (a) { var f = asFn(a[0]); return L.list(L.toArray(a[1]).map(function (x) { return self.apply(f, [x]); })); });
    def('reduce', function (a) { var f = asFn(a[0]), arr = L.toArray(a[1]); if (!arr.length) return self.apply(f, []); return arr.slice(1).reduce(function (acc, x) { return self.apply(f, [acc, x]); }, arr[0]); });
    def('funcall', function (a) { return self.apply(asFn(a[0]), a.slice(1)); });
    def('apply', function (a) { var args = a.slice(1, -1).concat(L.toArray(a[a.length - 1])); return self.apply(asFn(a[0]), args); });
    def('identity', function (a) { return a[0]; });
    def('eval', function (a) { return prim(ev(a[0], global)); });
    def('values', function (a) { return new MV(a); });
    def('vector', function (a) { return new Vec(a.slice()); });
    def('make-array', function (a) {
      var o = kw(a, 1), n = a[0] instanceof Cons ? a[0].car : a[0];
      if (o['INITIAL-CONTENTS'] !== undefined) { var c = o['INITIAL-CONTENTS']; return new Vec(c instanceof Vec ? c.items.slice() : L.toArray(c)); }
      var items = []; for (var i = 0; i < n; i++) items.push(o['INITIAL-ELEMENT'] !== undefined ? o['INITIAL-ELEMENT'] : (o['ELEMENT-TYPE'] ? 0 : NIL));
      if (o['INITIAL-ELEMENT'] === undefined && !o['ELEMENT-TYPE']) items = items.map(function () { return 0; });
      return new Vec(items);
    });
    def('aref', function (a) {
      if (!(a[0] instanceof Vec)) err('The value ' + L.print(a[0]) + ' is not of type ARRAY');
      if (a[1] < 0 || a[1] >= a[0].items.length) err('Invalid index ' + a[1] + ' for (SIMPLE-VECTOR ' + a[0].items.length + ')');
      return a[0].items[a[1]];
    });
    def('copy-seq', function (a) { return a[0] instanceof Vec ? new Vec(a[0].items.slice()) : a[0] instanceof LStr ? new LStr(a[0].s) : L.list(L.toArray(a[0])); });
    def('make-hash-table', function (a) { var o = kw(a, 0); var t = o.TEST; var name = t ? (t instanceof Sym ? t.name : t.name || 'EQL') : 'EQL'; return new HashTab(name); });
    function hkey(h, k) {
      if (h.test === 'EQUAL') return k instanceof LStr ? 's:' + k.s : k instanceof Cons ? 'c:' + L.print(k) : typeof k === 'number' ? 'n:' + k : k;
      return typeof k === 'number' ? 'n:' + k : k;
    }
    def('gethash', function (a) { var h = a[1], key = hkey(h, a[0]); return h.map.has(key) ? new MV([h.map.get(key).v, T]) : new MV([a.length > 2 ? a[2] : NIL, NIL]); });
    def('remhash', function (a) { return bool(a[1].map.delete(hkey(a[1], a[0]))); });
    def('hash-table-count', function (a) { return a[0].map.size; });
    def('maphash', function (a) { var f = asFn(a[0]); Array.from(a[1].map.values()).forEach(function (e) { self.apply(f, [e.k, e.v]); }); return NIL; });
    def('clrhash', function (a) { a[0].map.clear(); return a[0]; });
    def('string=', function (a) { return bool(a[0].s === a[1].s); });
    def('string-upcase', function (a) { return new LStr(a[0].s.toUpperCase()); });
    def('char', function (a) { return new LStr(a[0].s[a[1]]); });
    def('print', function (a) { out.push('\n' + L.print(a[0]) + ' '); return a[0]; });
    def('princ', function (a) { out.push(L.princ(a[0])); return a[0]; });
    def('terpri', function () { out.push('\n'); return NIL; });
    def('format', function (a) {
      var s = a[1].s, k = 2;
      var str = s.replace(/~([%&ASDa-z])/gi, function (_, c) {
        c = c.toUpperCase();
        if (c === '%' || c === '&') return '\n';
        var v = a[k++];
        return c === 'S' ? L.print(v) : L.princ(v);
      });
      if (a[0] === NIL) return new LStr(str);
      out.push(str); return NIL;
    });
    def('error', function (a) { err(a[0] instanceof LStr ? a[0].s : L.print(a[0])); });

    function asFn(x) {
      if (x instanceof Fn || x instanceof Builtin) return x;
      if (x instanceof Sym) { var f = fns.get(x); if (!f) err('The function ' + x.name + ' is undefined.'); return f; }
      err(L.print(x) + ' is not a function');
    }
    this.asFn = asFn;

    /* Bind a lambda list: required, &optional (x default), &key, &rest. */
    function bind(fn, args, env) {
      var mode = 'req', i = 0, ps = fn.params;
      for (var p = 0; p < ps.length; p++) {
        var spec = ps[p];
        if (spec instanceof Sym && spec.name[0] === '&') { mode = spec.name; continue; }
        if (mode === 'req') { if (i >= args.length) err('invalid number of arguments: ' + args.length); env.vars.set(spec, args[i++]); }
        else if (mode === '&OPTIONAL') {
          var nm = spec instanceof Cons ? spec.car : spec, dflt = spec instanceof Cons ? spec.cdr.car : NIL;
          env.vars.set(nm, i < args.length ? args[i++] : (spec instanceof Cons ? ev(dflt, env) : NIL));
        } else if (mode === '&REST') { env.vars.set(spec, L.list(args.slice(i))); i = args.length; }
        else if (mode === '&KEY') {
          var kn = spec instanceof Cons ? spec.car : spec, kd = spec instanceof Cons ? spec.cdr.car : NIL, found = false;
          for (var q = i; q < args.length; q += 2) if (args[q] instanceof Sym && args[q].name === ':' + kn.name) { env.vars.set(kn, args[q + 1]); found = true; }
          if (!found) env.vars.set(kn, spec instanceof Cons ? ev(kd, env) : NIL);
        }
      }
      if (mode === 'req' && i < args.length) err('invalid number of arguments: ' + args.length);
    }

    var callId = 0;
    this.apply = function (fn, args) {
      if (fn instanceof Builtin) return fn.f(args.map(prim));
      depth++;
      var id = ++callId;
      if (depth > maxDepth) { depth = 0; err('Control stack exhausted (no more space for function call frames).'); }
      if (self.hooks.onCall) self.hooks.onCall({ id: id, name: fn.name, args: args.slice(), depth: depth });
      var env = new Env(fn.env);
      bind(fn, args, env);
      var r;
      try {
        r = progn(fn.body, env, fn.name);
      } catch (e) {
        if (e instanceof BlockReturn && e.name === fn.name) r = e.value;
        else { depth--; throw e; }
      }
      depth--;
      if (self.hooks.onReturn) self.hooks.onReturn({ id: id, name: fn.name, value: prim(r), depth: depth + 1 });
      return r;
    };

    function progn(list, env) { var r = NIL; while (list instanceof Cons) { r = ev(list.car, env); list = list.cdr; } return r; }
    function args(list, env) { var a = []; while (list instanceof Cons) { a.push(prim(ev(list.car, env))); list = list.cdr; } return a; }

    function setPlace(place, value, env) {
      if (place instanceof Sym) {
        var e = env.find(place) || global;
        e.vars.set(place, value); return value;
      }
      var h = place.car, a = L.toArray(place.cdr);
      var n = h.name;
      if (n === 'AREF') { var v = prim(ev(a[0], env)), i = prim(ev(a[1], env)); if (i < 0 || i >= v.items.length) err('Invalid index ' + i); v.items[i] = value; return value; }
      if (n === 'GETHASH') { var k = prim(ev(a[0], env)), ht = prim(ev(a[1], env)); ht.map.set(hkey(ht, k), { k: k, v: value }); return value; }
      if (n === 'CAR' || n === 'FIRST') { prim(ev(a[0], env)).car = value; return value; }
      if (n === 'CDR' || n === 'REST') { prim(ev(a[0], env)).cdr = value; return value; }
      if (n === 'NTH') { var idx = prim(ev(a[0], env)), l = prim(ev(a[1], env)); for (var q = 0; q < idx; q++) l = l.cdr; l.car = value; return value; }
      // struct accessor, e.g. (setf (node-next n) x)
      var acc = structAccessors[n];
      if (acc) { var obj = prim(ev(a[0], env)); obj.slots[acc.slot] = value; return value; }
      err('Unsupported SETF place ' + L.print(place));
    }
    var structAccessors = {};

    function ev(x, env) {
      if (++steps > maxSteps) err('Too many steps');
      if (x instanceof Sym) {
        if (x === T || x.name[0] === ':') return x;
        var e = env.find(x) || (global.vars.has(x) ? global : null);
        if (!e) err('The variable ' + x.name + ' is unbound.');
        return e.vars.get(x);
      }
      if (!(x instanceof Cons)) return x;
      var h = x.car, rest = x.cdr;
      if (h instanceof Sym) {
        switch (h.name) {
          case 'QUOTE': return rest.car;
          case 'DEFPACKAGE': case 'IN-PACKAGE': return NIL;   // packages are not modelled
          case 'FUNCTION': return rest.car instanceof Cons ? ev(rest.car, env) : asFn(rest.car);
          case 'IF': return truthy(prim(ev(rest.car, env))) ? ev(rest.cdr.car, env) : (rest.cdr.cdr instanceof Cons ? ev(rest.cdr.cdr.car, env) : NIL);
          case 'WHEN': return truthy(prim(ev(rest.car, env))) ? progn(rest.cdr, env) : NIL;
          case 'UNLESS': return truthy(prim(ev(rest.car, env))) ? NIL : progn(rest.cdr, env);
          case 'COND': {
            for (var c = rest; c instanceof Cons; c = c.cdr) {
              var test = prim(ev(c.car.car, env));
              if (truthy(test)) return c.car.cdr === NIL ? test : progn(c.car.cdr, env);
            }
            return NIL;
          }
          case 'CASE': {
            var key = prim(ev(rest.car, env));
            for (var cc = rest.cdr; cc instanceof Cons; cc = cc.cdr) {
              var k = cc.car.car;
              if (k === T || (k instanceof Sym && k.name === 'OTHERWISE') || (k instanceof Cons ? L.toArray(k).some(function (z) { return eql(z, key); }) : eql(k, key))) return progn(cc.car.cdr, env);
            }
            return NIL;
          }
          case 'AND': { var r = T; for (var a1 = rest; a1 instanceof Cons; a1 = a1.cdr) { r = prim(ev(a1.car, env)); if (!truthy(r)) return NIL; } return r; }
          case 'OR': { for (var o1 = rest; o1 instanceof Cons; o1 = o1.cdr) { var v = prim(ev(o1.car, env)); if (truthy(v)) return v; } return NIL; }
          case 'PROGN': return progn(rest, env);
          case 'LET': case 'LET*': {
            var e2 = new Env(env);
            for (var b = rest.car; b instanceof Cons; b = b.cdr) {
              var bnd = b.car, nm = bnd instanceof Cons ? bnd.car : bnd;
              var val = bnd instanceof Cons && bnd.cdr !== NIL ? prim(ev(bnd.cdr.car, h.name === 'LET*' ? e2 : env)) : NIL;
              e2.vars.set(nm, val);
            }
            return progn(rest.cdr, e2);
          }
          case 'SETF': case 'SETQ': {
            var rv = NIL;
            for (var s1 = rest; s1 instanceof Cons; s1 = s1.cdr.cdr) rv = setPlace(s1.car, prim(ev(s1.cdr.car, env)), env);
            return rv;
          }
          case 'INCF': case 'DECF': {
            var place = rest.car, d = rest.cdr instanceof Cons ? prim(ev(rest.cdr.car, env)) : 1;
            var cur = prim(ev(place, env));
            return setPlace(place, add(cur, h.name === 'INCF' ? d : neg(d)), env);
          }
          case 'PUSH': { var item = prim(ev(rest.car, env)); return setPlace(rest.cdr.car, new Cons(item, prim(ev(rest.cdr.car, env))), env); }
          case 'POP': { var lst = prim(ev(rest.car, env)); setPlace(rest.car, lst === NIL ? NIL : lst.cdr, env); return lst === NIL ? NIL : lst.car; }
          case 'ROTATEF': {
            var p1 = rest.car, p2 = rest.cdr.car, v1 = prim(ev(p1, env)), v2 = prim(ev(p2, env));
            setPlace(p1, v2, env); setPlace(p2, v1, env); return NIL;
          }
          case 'DEFUN': {
            var f = new Fn(rest.car.name, L.toArray(rest.cdr.car), rest.cdr.cdr, global);
            fns.set(rest.car, f); return rest.car;
          }
          case 'LAMBDA': return new Fn(null, L.toArray(rest.car), rest.cdr, env);
          case 'DEFVAR': case 'DEFPARAMETER': {
            if (h.name === 'DEFPARAMETER' || !global.vars.has(rest.car)) global.vars.set(rest.car, rest.cdr instanceof Cons ? prim(ev(rest.cdr.car, env)) : NIL);
            return rest.car;
          }
          case 'DEFSTRUCT': {
            var sname = (rest.car instanceof Cons ? rest.car.car : rest.car).name;
            // Options: (name (:conc-name nil)) makes accessors without the NAME- prefix.
            var prefix = sname + '-';
            if (rest.car instanceof Cons) L.toArray(rest.car.cdr).forEach(function (opt) {
              if (opt instanceof Cons && opt.car instanceof Sym && opt.car.name === ':CONC-NAME') prefix = opt.cdr === NIL || opt.cdr.car === NIL ? '' : (opt.cdr.car.name || '');
            });
            var slots = L.toArray(rest.cdr).filter(function (sp) { return !(sp instanceof LStr); }).map(function (sp) { return sp instanceof Cons ? { n: sp.car.name, d: sp.cdr === NIL ? NIL : sp.cdr.car } : { n: sp.name, d: NIL }; });
            structs[sname] = slots;
            fns.set(sym('MAKE-' + sname), new Builtin('MAKE-' + sname, function (a) {
              var o = kw(a, 0), sl = {};
              slots.forEach(function (sp) { sl[sp.n] = o[sp.n] !== undefined ? o[sp.n] : prim(ev(sp.d, global)); });
              return new Struct(sname, sl);
            }));
            slots.forEach(function (sp) {
              structAccessors[prefix + sp.n] = { slot: sp.n };
              fns.set(sym(prefix + sp.n), new Builtin(prefix + sp.n, function (a) {
                if (!(a[0] instanceof Struct)) err('The value ' + L.print(a[0]) + ' is not of type ' + sname);
                return a[0].slots[sp.n];
              }));
            });
            fns.set(sym(sname + '-P'), new Builtin(sname + '-P', function (a) { return bool(a[0] instanceof Struct && a[0].type === sname); }));
            return sym(sname);
          }
          case 'DOTIMES': {
            var spec = L.toArray(rest.car), cnt = prim(ev(spec[1], env)), e3 = new Env(env);
            try {
              for (var i = 0; i < cnt; i++) { e3.vars.set(spec[0], i); progn(rest.cdr, e3); }
              e3.vars.set(spec[0], cnt);
              return spec[2] !== undefined ? ev(spec[2], e3) : NIL;
            } catch (ex) { if (ex instanceof BlockReturn && ex.name === null) return ex.value; throw ex; }
          }
          case 'DOLIST': {
            var sp2 = L.toArray(rest.car), l2 = prim(ev(sp2[1], env)), e4 = new Env(env);
            try {
              while (l2 instanceof Cons) { e4.vars.set(sp2[0], l2.car); progn(rest.cdr, e4); l2 = l2.cdr; }
              e4.vars.set(sp2[0], NIL);
              return sp2[2] !== undefined ? ev(sp2[2], e4) : NIL;
            } catch (ex2) { if (ex2 instanceof BlockReturn && ex2.name === null) return ex2.value; throw ex2; }
          }
          case 'DO': case 'DO*': {
            var specs = L.toArray(rest.car), endc = L.toArray(rest.cdr.car), body = rest.cdr.cdr, e5 = new Env(env), seq = h.name === 'DO*';
            specs.forEach(function (s0) {
              var nm2 = s0 instanceof Cons ? s0.car : s0;
              e5.vars.set(nm2, s0 instanceof Cons && s0.cdr !== NIL ? prim(ev(s0.cdr.car, seq ? e5 : env)) : NIL);
            });
            try {
              for (var guard = 0; ; guard++) {
                if (truthy(prim(ev(endc[0], e5)))) return progn(L.list(endc.slice(1)), e5);
                progn(body, e5);
                if (seq) specs.forEach(function (s0) { if (s0 instanceof Cons && s0.cdr.cdr instanceof Cons) e5.vars.set(s0.car, prim(ev(s0.cdr.cdr.car, e5))); });
                else {
                  var nv = specs.map(function (s0) { return s0 instanceof Cons && s0.cdr.cdr instanceof Cons ? prim(ev(s0.cdr.cdr.car, e5)) : undefined; });
                  specs.forEach(function (s0, k2) { if (nv[k2] !== undefined) e5.vars.set(s0.car, nv[k2]); });
                }
                if (guard > maxSteps) err('Loop never ends');
              }
            } catch (ex3) { if (ex3 instanceof BlockReturn && ex3.name === null) return ex3.value; throw ex3; }
          }
          case 'LOOP': {
            // Only the lecture's shape: (loop for VAR in LIST do BODY...), VAR may be a list to destructure.
            var parts = L.toArray(rest);
            if (parts[0] instanceof Sym && parts[0].name === 'WHILE' && parts[2] instanceof Sym && parts[2].name === 'DO') {
              // (loop while TEST do BODY...)
              try { for (var g8 = 0; truthy(prim(ev(parts[1], env))); g8++) { progn(L.list(parts.slice(3)), env); if (g8 > maxSteps) err('Loop never ends'); } }
              catch (ex6) { if (ex6 instanceof BlockReturn && ex6.name === null) return ex6.value; throw ex6; }
              return NIL;
            }
            if (!(parts[0] instanceof Sym && parts[0].name === 'FOR')) {
              // Simple LOOP: repeat the body forever, until a RETURN.
              try { for (var g9 = 0; ; g9++) { progn(rest, env); if (g9 > maxSteps) err('Loop never ends'); } }
              catch (ex5) { if (ex5 instanceof BlockReturn && ex5.name === null) return ex5.value; throw ex5; }
            }
            if (!(parts[0] instanceof Sym && parts[0].name === 'FOR' && parts[2] instanceof Sym && parts[2].name === 'IN' && parts[4] instanceof Sym && parts[4].name === 'DO')) err('Only (loop for x in list do ...) is supported');
            var lv = parts[1], items = prim(ev(parts[3], env)), e7 = new Env(env);
            try {
              while (items instanceof Cons) {
                if (lv instanceof Cons) { var vs = L.toArray(items.car); L.toArray(lv).forEach(function (nm4, q4) { e7.vars.set(nm4, q4 < vs.length ? vs[q4] : NIL); }); }
                else e7.vars.set(lv, items.car);
                progn(L.list(parts.slice(5)), e7);
                items = items.cdr;
              }
            } catch (ex4) { if (ex4 instanceof BlockReturn && ex4.name === null) return ex4.value; throw ex4; }
            return NIL;
          }
          case 'FLET': case 'LABELS': {
            // Local functions: our function namespace is global, so bind them for the body and restore after.
            var saved = [];
            L.toArray(rest.car).forEach(function (fd) {
              saved.push([fd.car, fns.get(fd.car)]);
              fns.set(fd.car, new Fn(fd.car.name, L.toArray(fd.cdr.car), fd.cdr.cdr, env));
            });
            try { return progn(rest.cdr, env); }
            finally { saved.forEach(function (sv) { if (sv[1]) fns.set(sv[0], sv[1]); else fns.delete(sv[0]); }); }
          }
          case 'RETURN': throw new BlockReturn(null, rest instanceof Cons ? ev(rest.car, env) : NIL);   // keeps multiple values
          case 'RETURN-FROM': throw new BlockReturn(rest.car.name, rest.cdr instanceof Cons ? prim(ev(rest.cdr.car, env)) : NIL);
          case 'MULTIPLE-VALUE-LIST': { var mv = ev(rest.car, env); return L.list(mv instanceof MV ? mv.vals : [mv]); }
          case 'MULTIPLE-VALUE-BIND': {
            var names = L.toArray(rest.car), mv2 = ev(rest.cdr.car, env), vals = mv2 instanceof MV ? mv2.vals : [mv2], e6 = new Env(env);
            names.forEach(function (nm3, k3) { e6.vars.set(nm3, k3 < vals.length ? vals[k3] : NIL); });
            return progn(rest.cdr.cdr, e6);
          }
        }
        var fn = fns.get(h);
        if (!fn) err('The function ' + h.name + ' is undefined.');
        if (fn instanceof Builtin) return fn.f(args(rest, env));
        return self.apply(fn, args(rest, env));
      }
      if (h instanceof Cons && h.car === sym('LAMBDA')) return self.apply(ev(h, env), args(rest, env));
      err('Illegal function call ' + L.print(x));
    }

    this.eval = function (form) { depth = 0; return prim(ev(form, global)); };
    this.evalString = function (src) { var r = NIL; L.read(src).forEach(function (f) { r = self.eval(f); }); return r; };
    /* REPL-style: run source, return the printed value of the last form (or the error). */
    this.repl = function (src) {
      try { return L.print(self.evalString(src)); }
      catch (e) {
        if (e.lisp) return 'ERROR: ' + e.message;
        // The host's own stack ran out first: same outcome as SBCL's.
        if (e instanceof RangeError) return 'ERROR: Control stack exhausted (no more space for function call frames).';
        throw e;
      }
    };
    this.stepsUsed = function () { return steps; };
  };

  /* One-shot helper: L.run("(defun ...) (f 3)") -> printed result. */
  L.run = function (src, opts) { return new L.Interp(opts).repl(src); };

  /* ---------- call tracing (recursion games) ----------
   * Runs `defs` then `call`, recording every user-function call and return.
   * events: [{type:'call'|'return', id, name, args|value, depth}]
   * opts.tco: frames for tail calls of `tcoName` replace their caller (depth shown). */
  L.trace = function (defs, call, opts) {
    opts = opts || {};
    var events = [];
    var it = new L.Interp({ maxDepth: opts.maxDepth || 400 });
    it.hooks.onCall = function (c) { events.push({ type: 'call', id: c.id, name: c.name, args: c.args.map(L.print), depth: c.depth }); if (events.length > (opts.maxEvents || 4000)) err('Too many calls to show'); };
    it.hooks.onReturn = function (r) { events.push({ type: 'return', id: r.id, name: r.name, value: L.print(r.value), depth: r.depth }); };
    var result, error = null;
    try { it.evalString(defs); result = L.print(it.evalString(call)); }
    catch (e) {
      if (e.lisp) error = e.message;
      else if (e instanceof RangeError) error = 'Control stack exhausted (no more space for function call frames).';
      else throw e;
    }
    return { events: events, result: result, error: error };
  };
  /* Build the call tree from trace events. */
  L.callTree = function (events) {
    var rootN = { children: [] }, stack = [rootN], byId = {};
    events.forEach(function (ev) {
      if (ev.type === 'call') {
        var node = { id: ev.id, name: ev.name, args: ev.args, label: '(' + ev.name + (ev.args.length ? ' ' + ev.args.join(' ') : '') + ')', children: [], value: null };
        stack[stack.length - 1].children.push(node); stack.push(node); byId[ev.id] = node;
      } else { byId[ev.id].value = ev.value; stack.pop(); }
    });
    return rootN.children[0];
  };

  /* ---------- static analysis: is a function tail recursive? ----------
   * Finds every call to `name` inside the DEFUN body and reports whether each
   * is in tail position (its value is returned directly, with no work after). */
  L.tailCalls = function (src, name) {
    var forms = L.read(src), target = sym(name), found = [];
    var def = forms.filter(function (f) { return f instanceof Cons && f.car === sym('DEFUN') && f.cdr.car === target; })[0];
    if (!def) err('No DEFUN named ' + name);
    function walk(x, tail, wrapper) {
      if (!(x instanceof Cons)) return;
      var h = x.car, a = L.toArray(x.cdr);
      if (h === target) { found.push({ tail: tail, line: x.line, wrapper: tail ? null : wrapper }); a.forEach(function (y) { walk(y, false, h.name); }); return; }
      var n = h instanceof Sym ? h.name : '';
      if (n === 'QUOTE') return;
      if (n === 'IF') { walk(a[0], false, 'IF test'); walk(a[1], tail, wrapper); if (a[2]) walk(a[2], tail, wrapper); return; }
      if (n === 'COND') { a.forEach(function (cl) { var c = L.toArray(cl); walk(c[0], c.length === 1 ? tail : false, 'COND test'); c.slice(1).forEach(function (y, i) { walk(y, tail && i === c.length - 2, wrapper); }); }); return; }
      if (n === 'PROGN' || n === 'WHEN' || n === 'UNLESS') { var st = n === 'PROGN' ? 0 : 1; if (st) walk(a[0], false, n + ' test'); a.slice(st).forEach(function (y, i) { walk(y, tail && i === a.length - st - 1, wrapper); }); return; }
      if (n === 'LET' || n === 'LET*') { L.toArray(a[0]).forEach(function (b) { if (b instanceof Cons) walk(b.cdr.car, false, n); }); a.slice(1).forEach(function (y, i) { walk(y, tail && i === a.length - 2, wrapper); }); return; }
      if (n === 'AND' || n === 'OR') { a.forEach(function (y, i) { walk(y, tail && i === a.length - 1, n); }); return; }
      // Any other function call: its arguments are NOT in tail position — the call runs after them.
      a.forEach(function (y) { walk(y, false, n); });
    }
    var body = L.toArray(def.cdr.cdr.cdr);
    body.forEach(function (f, i) { walk(f, i === body.length - 1, null); });
    return found;
  };
  L.isTailRecursive = function (src, name) {
    var c = L.tailCalls(src, name);
    return c.length > 0 && c.every(function (x) { return x.tail; });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
