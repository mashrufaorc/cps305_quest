/* CPS305 Quest — tests/verify-lisp.js
 * Checks every printed Lisp result in the content against real SBCL.
 *   node tests/verify-lisp.js
 * Each question runs in its own `sbcl --script` process: lisp/unitN.lisp is
 * loaded, then the question's buggy `defs` (if any) replace the canonical
 * definitions, then `setup` runs, then `form` is printed with ~S (REPL style).
 * `defs: 'fill'` means the filled-in fragment must appear in the canonical file.
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
['content/units.js', 'content/unit5.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
});

function norm(s) { return s.replace(/\s+/g, ' ').trim(); }

var units = ctx.CQ.content.unitData;
var pass = 0, fail = 0, skipped = 0;
Object.keys(units).forEach(function (u) {
  var lispFile = path.join(ROOT, 'lisp', 'unit' + u + '.lisp');
  var canonical = fs.readFileSync(lispFile, 'utf8');
  var data = units[u];

  // 1. The code panel shows the same definitions as the file SBCL runs.
  Object.keys(data.lisp).forEach(function (k) {
    var shown = norm(data.lisp[k].code);
    if (norm(canonical).indexOf(shown) >= 0) { pass++; }
    else { fail++; console.log('FAIL  code panel "' + k + '" differs from lisp/unit' + u + '.lisp'); }
  });

  // 2. Every question with a verify block.
  var qs = (data.trace || []).concat(data.boss || []);
  qs.forEach(function (q) {
    var v = q.verify;
    if (!v) { skipped++; return; }
    if (v.defs === 'fill') {
      var filled = norm(q.code.replace('___', q.choices[q.answer]));
      if (norm(canonical).indexOf(filled) < 0) { fail++; console.log('FAIL  ' + q.id + ': filled fragment not in canonical code: ' + filled); return; }
    }
    var src = '(load "' + lispFile.replace(/\\/g, '/') + '")\n' +
      (v.defs && v.defs !== 'fill' ? v.defs + '\n' : '') +
      (v.setup ? v.setup + '\n' : '') +
      '(format t "~S~%" ' + v.form + ')\n';
    var tmp = path.join(os.tmpdir(), 'cq-verify-' + q.id + '.lisp');
    fs.writeFileSync(tmp, src);
    var out;
    try {
      out = cp.execFileSync('sbcl', ['--script', tmp], { encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      fail++; console.log('FAIL  ' + q.id + ': SBCL error ' + (e.stderr || e.message).split('\n')[0]); return;
    } finally { try { fs.unlinkSync(tmp); } catch (e2) { /* ignore */ } }
    var lines = out.trim().split(/\r?\n/);
    var got = lines[lines.length - 1].trim();
    if (got === v.expect) { pass++; console.log('ok    ' + q.id + '  ' + v.form + '  =>  ' + got); }
    else { fail++; console.log('FAIL  ' + q.id + '  expected ' + v.expect + ' got ' + got); }
  });
});
console.log('\nLisp verification: ' + pass + ' passed, ' + fail + ' failed, ' + skipped + ' questions without Lisp.');
process.exit(fail ? 1 : 0);
