/* CPS305 Quest — ui/dom.js
 * Tiny DOM helpers shared by every component: element builder, text templates,
 * the aria-live announcer and motion preferences.
 */
(function (root) {
  'use strict';
  var CQ = root.CQ = root.CQ || {};
  var U = CQ.ui = CQ.ui || {};
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* h('div.card#id', {attrs}, children...) */
  U.h = function (tag, attrs) {
    var m = /^([a-z0-9]+)((?:[.#][\w-]+)*)$/i.exec(tag);
    var el = document.createElement(m ? m[1] : tag);
    if (m && m[2]) m[2].replace(/([.#])([\w-]+)/g, function (_, t, v) { if (t === '.') el.classList.add(v); else el.id = v; });
    if (attrs) setAttrs(el, attrs);
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };
  U.s = function (tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };
  function setAttrs(el, attrs) {
    for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'on') { for (var ev in v) el.addEventListener(ev, v[ev]); }
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  U.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  /* Fill "{name}" placeholders from data. Content stays plain strings. */
  U.fmt = function (tpl, data) {
    return String(tpl).replace(/\{(\w+)\}/g, function (_, k) { return data && data[k] != null ? data[k] : '{' + k + '}'; });
  };

  /* Very small inline markup for content strings: `code`, **bold**. Escapes HTML first. */
  U.rich = function (text) {
    var esc = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    esc = esc.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    var span = document.createElement('span');
    span.innerHTML = esc;
    return span;
  };

  /* Screen-reader announcements for state changes (aria-live="polite"). */
  U.announce = function (msg) {
    var live = document.getElementById('live');
    if (!live) return;
    live.textContent = '';
    setTimeout(function () { live.textContent = msg; }, 30);
  };

  U.reducedMotion = function () {
    var pref = CQ.store.setting('reducedMotion');
    if (pref === 'on') return true;
    if (pref === 'off') return false;
    return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  U.button = function (label, onClick, opts) {
    opts = opts || {};
    return U.h('button' + (opts.cls ? '.' + opts.cls.split(' ').join('.') : ''), Object.assign({ type: 'button', on: { click: onClick } }, opts.attrs || {}), label);
  };

  /* Is the user typing? Keyboard shortcuts must not steal keys from inputs. */
  U.typing = function (e) {
    var t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  };

  U.stars = function (n, max) {
    max = max || 3;
    var s = U.h('span.stars', { 'aria-label': n + ' of ' + max + ' stars', role: 'img' });
    for (var i = 0; i < max; i++) s.appendChild(U.h('span' + (i < n ? '.on' : '.off'), { 'aria-hidden': 'true' }, i < n ? '★' : '☆'));
    return s;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
