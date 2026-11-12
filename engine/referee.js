/* CPS305 Quest — engine/referee.js
 * "The algorithm is the referee." Interactive levels never hard-code answers:
 * we run the real step generator, then pull out the decision points a player
 * must make. Each decision knows the correct move, can check a player's move,
 * and names the misconception behind a wrong one (as a code + data; the words
 * live in content/).
 */
(function (root) {
  'use strict';
  var E = root.CQ.engine;
  var R = E.referee = {};

  function vals(s) { return s.arr.map(function (it) { return it.v; }); }

  /* Selection sort: at the start of each pass, the player taps the minimum of
   * the unsorted region (the element the pass will swap to the front). */
  function selectionDecisions(trace) {
    var out = [];
    var passAt = null;
    trace.forEach(function (s, k) {
      if (s.at === 'pass') passAt = k;
      if (s.at === 'swap') {
        var show = trace[passAt], cur = s.cur, expected = s.minIndex;
        var v = vals(show), minV = v[expected];
        out.push({
          type: 'pick', showAt: passAt, resumeTo: k, expected: expected, concept: 'selection-sort',
          prompt: 'select.prompt', promptData: { cur: cur },
          hint: { code: 'select.hint', data: { cur: cur, last: v.length - 1 } },
          check: function (choice) {
            if (choice === expected) return { ok: true };
            var d = { choice: choice, cv: v[choice], min: minV, exp: expected, cur: cur, front: v[cur] };
            if (choice < cur) return { ok: false, code: 'select.sortedRegion', data: d };
            if (v[choice] === minV) return { ok: false, code: 'select.equalLater', data: d };
            if (v[choice] < v[cur]) return { ok: false, code: 'select.firstSmaller', data: d };
            return { ok: false, code: 'select.notMin', data: d };
          }
        });
      }
    });
    return out;
  }

  /* Insertion sort (any variant): at the start of each pass, the player taps
   * the index where the next element will land. */
  function insertionDecisions(trace) {
    var out = [];
    var passAt = null;
    trace.forEach(function (s, k) {
      if (s.at === 'pass') passAt = k;
      if (s.landed != null && passAt != null) {
        var show = trace[passAt];
        var v = vals(show);
        var p = show.pass;          // sorted region is 0..p, moving element at p+1
        var mv = v[p + 1], expected = s.landed;
        out.push({
          type: 'pick', showAt: passAt, resumeTo: k, expected: expected, concept: 'insertion-sort',
          prompt: 'insert.prompt', promptData: { v: mv, from: p + 1 },
          hint: { code: 'insert.hint', data: { v: mv } },
          check: function (choice) {
            if (choice === expected) return { ok: true };
            var d = { choice: choice, v: mv, exp: expected, from: p + 1 };
            if (choice > p + 1) return { ok: false, code: 'insert.outside', data: d };
            if (choice > expected) {
              // Player stopped while a larger element still sits to the left.
              d.blocker = v[choice - 1];
              return { ok: false, code: 'insert.stoppedEarly', data: d };
            }
            // choice < expected: went past an element that is <= the moving one.
            d.blocker = v[expected - 1];
            if (d.blocker === mv) return { ok: false, code: 'insert.pastEqual', data: d };
            return { ok: false, code: 'insert.tooFar', data: d };
          }
        });
        passAt = null;
      }
    });
    return out;
  }

  /* Bubble sort: at each comparison of neighbours, the player says swap or keep. */
  function bubbleDecisions(trace) {
    var out = [];
    trace.forEach(function (s, k) {
      if (s.at !== 'compare') return;
      var v = vals(s), j = s.compare[0];
      var expected = s.result ? 'swap' : 'keep';
      out.push({
        type: 'choice', options: ['swap', 'keep'], showAt: k, resumeTo: s.result ? k + 1 : k, expected: expected,
        concept: 'bubble-sort', focus: [j, j + 1],
        prompt: 'bubble.prompt', promptData: { a: v[j], b: v[j + 1] },
        hint: { code: 'bubble.hint', data: { a: v[j], b: v[j + 1] } },
        check: function (choice) {
          if (choice === expected) return { ok: true };
          var d = { a: v[j], b: v[j + 1] };
          if (choice === 'swap' && v[j] === v[j + 1]) return { ok: false, code: 'bubble.equal', data: d };
          return { ok: false, code: choice === 'swap' ? 'bubble.shouldKeep' : 'bubble.shouldSwap', data: d };
        }
      });
    });
    return out;
  }

  /* Binary search: the player taps the element to probe next. The lecture's
   * code always probes i = floor((lb+ub)/2). */
  function binaryDecisions(trace) {
    var out = [];
    trace.forEach(function (s, k) {
      if (s.probe == null) return;
      var lb = s.lb, ub = s.ub, expected = s.probe;
      out.push({
        type: 'pick', showAt: k - 1, resumeTo: k, expected: expected, concept: 'binary-search', lb: lb, ub: ub,
        prompt: 'bsearch.prompt', promptData: { lb: lb, ub: ub },
        hint: { code: 'bsearch.hint', data: { lb: lb, ub: ub, mid: expected } },
        check: function (choice) {
          if (choice === expected) return { ok: true };
          var d = { choice: choice, lb: lb, ub: ub, mid: expected };
          if (choice < lb || choice > ub) return { ok: false, code: 'bsearch.discarded', data: d };
          return { ok: false, code: 'bsearch.notMiddle', data: d };
        }
      });
    });
    return out;
  }

  /* Linear search: the player probes; the only legal move is the next index. */
  function linearDecisions(trace) {
    var out = [];
    trace.forEach(function (s, k) {
      if (s.probe == null) return;
      var expected = s.probe;
      out.push({
        type: 'pick', showAt: k - 1, resumeTo: s.found != null ? k + 1 : k, expected: expected, concept: 'linear-search',
        prompt: 'lsearch.prompt', promptData: { i: expected },
        hint: { code: 'lsearch.hint', data: { i: expected } },
        check: function (choice) {
          if (choice === expected) return { ok: true };
          return { ok: false, code: choice < expected ? 'lsearch.again' : 'lsearch.skip', data: { choice: choice, i: expected } };
        }
      });
    });
    return out;
  }

  /* Lomuto: at each comparison with the pivot, swap it into the i-region or leave
   * it; at the end, tap where the pivot lands (slot i). */
  function lomutoDecisions(trace) {
    var out = [];
    trace.forEach(function (s, k) {
      if (s.at === 'compare') {
        var v = s.arr[s.j].v, p = s.pivotValue != null ? s.pivotValue : s.arr[s.hi].v, exp = s.result ? 'swap' : 'skip';
        out.push({ type: 'choice', options: ['swap', 'skip'], labels: { swap: '⇄ Swap into i', skip: '→ Leave it' }, showAt: k, resumeTo: s.result ? k + 1 : k, expected: exp,
          concept: 'lomuto', focus: [s.j, s.hi], prompt: 'lomuto.prompt', promptData: { v: v, p: p, i: s.ppvt },
          hint: { code: 'lomuto.hint', data: { v: v, p: p } },
          check: function (ch) {
            if (ch === exp) return { ok: true };
            return { ok: false, code: exp === 'swap' ? 'lomuto.shouldSwap' : (v === p ? 'lomuto.equal' : 'lomuto.shouldSkip'), data: { v: v, p: p, i: s.ppvt } };
          } });
      }
      if (s.at === 'place') {
        var prev = trace[k - 1], land = s.landed;
        out.push({ type: 'pick', showAt: k - 1, resumeTo: k, expected: land, concept: 'lomuto', prompt: 'lomuto.placePrompt', promptData: { p: s.arr[land].v },
          hint: { code: 'lomuto.placeHint', data: { i: land } },
          check: function (ch) { return ch === land ? { ok: true } : { ok: false, code: 'lomuto.place', data: { i: land, choice: ch } }; } });
        void prev;
      }
    });
    return out;
  }
  function partitionPivot(trace, k) { for (var q = k; q >= 0; q--) if (trace[q].at === 'partition') return trace[q].pivotValue; return null; }
  /* Hoare: tap where i stops, where j stops, then decide swap or return j. */
  function hoareDecisions(trace) {
    var out = [];
    trace.forEach(function (s, k) {
      if (s.at === 'iStop' || s.at === 'jStop') {
        var isI = s.at === 'iStop', exp = isI ? s.iStop : s.jStop, p = partitionPivot(trace, k);
        out.push({ type: 'pick', showAt: k - 1, resumeTo: k, expected: exp, concept: 'hoare', prompt: isI ? 'hoare.iPrompt' : 'hoare.jPrompt', promptData: { p: p },
          hint: { code: isI ? 'hoare.iHint' : 'hoare.jHint', data: { p: p } },
          check: function (ch) {
            if (ch === exp) return { ok: true };
            var arr = trace[k].arr;
            return { ok: false, code: isI ? 'hoare.iWrong' : 'hoare.jWrong', data: { choice: ch, exp: exp, p: p, v: arr[ch] ? arr[ch].v : '?', ve: arr[exp].v } };
          } });
      }
      if (s.at === 'return' || s.at === 'swap') {
        var expd = s.at === 'return' ? 'return' : 'swap', prevS = trace[k - 1];
        var iS = prevS.marks.i, jS = prevS.marks.j;
        out.push({ type: 'choice', options: ['swap', 'return'], labels: { swap: '⇄ Swap i and j', 'return': '↩ Return j' }, showAt: k - 1, resumeTo: k, expected: expd, concept: 'hoare',
          focus: [iS, jS], prompt: 'hoare.decide', promptData: { i: iS, j: jS }, hint: { code: 'hoare.decideHint', data: { i: iS, j: jS } },
          check: function (ch) { return ch === expd ? { ok: true } : { ok: false, code: expd === 'swap' ? 'hoare.shouldSwap' : 'hoare.shouldReturn', data: { i: iS, j: jS } }; } });
      }
    });
    return out;
  }
  /* Merge sort: at each comparison of the two fronts, take left or right. */
  function mergeDecisions(trace) {
    var out = [];
    trace.forEach(function (s, k) {
      if (s.at !== 'compare') return;
      var exp = s.result, L = s.left, Rr = s.right;
      out.push({ type: 'choice', options: ['left', 'right'], labels: { left: '← Take ' + L, right: 'Take ' + Rr + ' →' }, showAt: k, resumeTo: k, expected: exp, concept: 'merge',
        focus: [s.marks.i, s.marks.j], prompt: 'merge.prompt', promptData: { l: L, r: Rr }, hint: { code: 'merge.hint', data: { l: L, r: Rr } },
        check: function (ch) { return ch === exp ? { ok: true } : { ok: false, code: L === Rr ? 'merge.tie' : 'merge.wrong', data: { l: L, r: Rr, take: exp === 'left' ? L : Rr } }; } });
    });
    return out;
  }

  R.decisions = function (algo, trace) {
    switch (algo) {
      case 'quickLomuto': return lomutoDecisions(trace);
      case 'quickHoare': return hoareDecisions(trace);
      case 'merge': return mergeDecisions(trace);
      case 'selection': return selectionDecisions(trace);
      case 'insertion': case 'insertionShift': case 'binaryInsertion': return insertionDecisions(trace);
      case 'bubble': return bubbleDecisions(trace);
      case 'binary': return binaryDecisions(trace);
      case 'linear': return linearDecisions(trace);
      default: throw new Error('No referee for ' + algo);
    }
  };

  /* Inversion Hunt referee: is the tapped pair an inversion? */
  R.checkInversion = function (values, i, j) {
    var a = Math.min(i, j), b = Math.max(i, j);
    if (a === b) return { ok: false, code: 'inv.same', data: {} };
    var d = { i: a, j: b, x: values[a], y: values[b] };
    if (values[a] > values[b]) return { ok: true, data: d };
    if (values[a] === values[b]) return { ok: false, code: 'inv.equal', data: d };
    return { ok: false, code: 'inv.inOrder', data: d };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
