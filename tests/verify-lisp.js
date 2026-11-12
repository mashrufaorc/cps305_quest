/* CPS305 Quest — tests/verify-lisp.js
 * Checks every printed Lisp result in the content against real SBCL:
 *   node tests/verify-lisp.js
 * For each unit N with content/unitN.js:
 *  1. every code panel matches lisp/unitN.lisp exactly;
 *  2. every question's `verify` block runs in its own `sbcl --script` process
 *     (canonical file loaded, then the question's buggy `defs`, `setup`, and
 *     `form` printed with ~S, REPL style). `defs: 'fill'` means the filled-in
 *     fragment must also appear in the canonical file;
 *  3. the game's own interpreter (engine/lisp.js) must print the same result
 *     (skipped with `interpSkip`); `interp` blocks are interpreter-only checks;
 *  4. Big-O snippets: SBCL with a *STEPS* counter must count what the game counts.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var os = require('os');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var ctx = { console: console };
ctx.globalThis = ctx;
vm.createContext(ctx);
var unitFiles = fs.readdirSync(path.join(ROOT, 'content')).filter(function (f) { return /^unit\d+\.js$/.test(f); });
['engine/core.js', 'engine/bigo.js', 'engine/lisp.js', 'content/units.js'].concat(unitFiles.map(function (f) { return 'content/' + f; })).forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
});
var Lisp = ctx.CQ.engine.lisp;
var only = process.argv[2] ? Number(process.argv[2]) : null;

function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
function sbcl(src, tag) {
  var tmp = path.join(os.tmpdir(), 'cq-verify-' + tag + '.lisp');
  fs.writeFileSync(tmp, src);
  try { return cp.execFileSync('sbcl', ['--script', tmp], { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] }); }
  finally { try { fs.unlinkSync(tmp); } catch (e) { /* ignore */ } }
}

var units = ctx.CQ.content.unitData;
var pass = 0, fail = 0, skipped = 0, interpOk = 0;
Object.keys(units).forEach(function (u) {
  if (only != null && +u !== only) return;
  var lispFile = path.join(ROOT, 'lisp', 'unit' + u + '.lisp');
  var canonical = fs.existsSync(lispFile) ? fs.readFileSync(lispFile, 'utf8') : '';
  var data = units[u];

  // 1. Code panels match the canonical file.
  Object.keys(data.lisp || {}).forEach(function (k) {
    if (norm(canonical).indexOf(norm(data.lisp[k].code)) >= 0) pass++;
    else { fail++; console.log('FAIL  unit ' + u + ' code panel "' + k + '" differs from lisp/unit' + u + '.lisp'); }
  });

  var qs = (data.trace || []).concat(data.boss || [], data.extraChecks || []);
  qs.forEach(function (q) {
    var v = q.verify;
    // 3b. Interpreter-only checks.
    if (q.interp) {
      var gotI = new Lisp.Interp({ sxhash: q.interp.sxhash }).repl(canonical + '\n' + (q.interp.defs || '') + '\n' + (q.interp.setup || '') + '\n' + q.interp.form);
      if (gotI === q.interp.expect) { pass++; interpOk++; console.log('ok    ' + q.id + '  [interp] ' + q.interp.form + '  =>  ' + gotI); }
      else { fail++; console.log('FAIL  ' + q.id + ' [interp] expected ' + q.interp.expect + ' got ' + gotI); }
    }
    if (!v) { if (!q.interp) skipped++; return; }
    if (v.defs === 'fill') {
      var filled = norm(q.code.replace('___', q.choices[q.answer]));
      if (norm(canonical).indexOf(filled) < 0) { fail++; console.log('FAIL  ' + q.id + ': filled fragment not in canonical code: ' + filled); return; }
    }
    var defs = v.defs && v.defs !== 'fill' ? v.defs + '\n' : '';
    var src = (canonical ? '(load "' + lispFile.replace(/\\/g, '/') + '")\n' : '') + defs + (v.setup ? v.setup + '\n' : '') + '(format t "~S~%" ' + v.form + ')\n';
    var out;
    try { out = sbcl(src, q.id); }
    catch (e) { fail++; console.log('FAIL  ' + q.id + ': SBCL error ' + (e.stderr || e.message).split('\n').filter(Boolean).slice(-2).join(' ')); return; }
    var lines = out.trim().split(/\r?\n/);
    var got = lines[lines.length - 1].trim();
    if (got === v.expect) { pass++; console.log('ok    ' + q.id + '  ' + v.form + '  =>  ' + got); }
    else { fail++; console.log('FAIL  ' + q.id + '  expected ' + v.expect + ' got ' + got); return; }
    // 3. The game's interpreter agrees with SBCL.
    if (!q.interpSkip) {
      var mine = new Lisp.Interp().repl(canonical + '\n' + defs + (v.setup || '') + '\n' + v.form);
      if (mine === v.expect) { pass++; interpOk++; }
      else { fail++; console.log('FAIL  ' + q.id + '  game interpreter printed ' + mine + ', SBCL printed ' + v.expect); }
    }
  });

  // 4. Step-counting snippets (Unit 2).
  (data.snippets || []).forEach(function (sn) {
    var B = ctx.CQ.engine.bigo, ns = [0, 1, 2, 3, 5, 8, 13, 16];
    var src = '(defvar *steps* 0)\n' + B.instrument(sn.code) + '\n' +
      ns.map(function (n) { return '(setf *steps* 0) (work ' + n + ') (format t "~D " *steps*)'; }).join('\n') + '\n';
    var out;
    try { out = sbcl(src, sn.id); } catch (e) { fail++; console.log('FAIL  ' + sn.id + ': SBCL error ' + (e.stderr || e.message).split('\n')[0]); return; }
    var got = out.trim().split(/\s+/).map(Number);
    var want = ns.map(function (n) { return B.steps(sn.code, 'work', n); });
    if (JSON.stringify(got) === JSON.stringify(want)) { pass++; console.log('ok    ' + sn.id + '  steps ' + want.join(' ')); }
    else { fail++; console.log('FAIL  ' + sn.id + '  SBCL ' + got.join(' ') + ' vs game ' + want.join(' ')); }
  });
});
console.log('\nLisp verification: ' + pass + ' passed (' + interpOk + ' of them game-interpreter cross-checks), ' + fail + ' failed, ' + skipped + ' questions without Lisp.');
process.exit(fail ? 1 : 0);
