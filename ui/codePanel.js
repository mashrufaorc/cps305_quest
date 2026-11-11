/* CPS305 Quest — ui/codePanel.js
 * Monospace Lisp panel. The executing line is highlighted in sync with the
 * visual (anchors from the engine -> line numbers from content).
 */
(function (root) {
  'use strict';
  var U = root.CQ.ui;
  var h = U.h;

  /* Light syntax tint: comments, strings, keywords, parens. Escapes first. */
  function tint(line) {
    var esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var ci = esc.indexOf(';');
    var comment = '';
    if (ci >= 0) { comment = '<span class="tk-c">' + esc.slice(ci) + '</span>'; esc = esc.slice(0, ci); }
    esc = esc.replace(/\b(defun|dotimes|do|let|if|cond|when|return|setf|rotatef|funcall|aref|length|floor|defvar|make-array|t|nil|minusp|1\+|1-)\b/gi,
      '<span class="tk-k">$1</span>');
    esc = esc.replace(/([()])/g, '<span class="tk-p">$1</span>');
    esc = esc.replace(/(#'[<>=])/g, '<span class="tk-s">$1</span>');
    return esc + comment;
  }

  U.codePanel = function (container, opts) {
    opts = opts || {};
    var lines = String(opts.code || '').replace(/\n$/, '').split('\n');
    var wrap = h('figure.code-panel');
    if (opts.title) wrap.appendChild(h('figcaption', null, opts.title));
    var pre = h('pre', { tabindex: opts.onLineClick ? null : '0', 'aria-label': (opts.title || 'Lisp code') });
    var rows = lines.map(function (ln, i) {
      var row = h(opts.onLineClick ? 'button.ln.ln-btn' : 'span.ln', opts.onLineClick ? { type: 'button', 'data-line': i + 1, on: { click: function () { opts.onLineClick(i + 1, row); } } } : { 'data-line': i + 1 });
      row.appendChild(h('span.lno', { 'aria-hidden': 'true' }, String(i + 1)));
      var code = h('span.lcode');
      code.innerHTML = ln.length ? tint(ln) : ' ';
      row.appendChild(code);
      if (opts.onLineClick) row.setAttribute('aria-label', 'Line ' + (i + 1) + ': ' + ln.trim());
      pre.appendChild(row);
      return row;
    });
    wrap.appendChild(pre);
    container.appendChild(wrap);
    var current = null;
    return {
      el: wrap,
      rows: rows,
      highlight: function (lineNo) {
        if (current) { current.classList.remove('is-exec'); current.removeAttribute('aria-current'); }
        current = lineNo ? rows[lineNo - 1] : null;
        if (current) {
          current.classList.add('is-exec'); current.setAttribute('aria-current', 'step');
          var top = current.offsetTop - pre.clientHeight / 2;
          if (pre.scrollHeight > pre.clientHeight) pre.scrollTop = Math.max(0, top);
        }
      },
      mark: function (lineNo, cls) { if (rows[lineNo - 1]) rows[lineNo - 1].classList.add(cls); }
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
