/* CPS305 Quest — content/unit2.js
 * Unit 2: Big-O (Topic 2, complexity analysis). DATA ONLY.
 * Big-O Detective and Count the Steps never store answers: the engine runs each
 * snippet below (engine/bigo.js) to get its step counts and its class.
 * tests/verify-lisp.js runs every snippet in SBCL with a step counter too.
 * Convention (as in unit5.js): in a question, choice index 1 is the
 * misconception distractor, so q.misconception shows when it is picked.
 */
(function (root) {
  'use strict';
  var C = root.CQ.content;

  var lisp = {
    firstNLin: {
      title: 'FIRST-N-LIN (lecture)',
      code: [
        '(defun first-n-lin (n)',
        '  (do ((i 1 (1+ i))',
        '       (sum 0 (+ i sum)))',
        '      ((> i n) sum)))'
      ].join('\n'),
      anchors: {}
    },
    firstNConst: {
      title: 'FIRST-N-CONST (lecture)',
      code: [
        '(defun first-n-const (n)',
        '  (/ (* n (+ n 1)) 2))'
      ].join('\n'),
      anchors: {}
    }
  };

  /* Snippets for Big-O Detective and Count the Steps. Each is a DEFUN named
   * WORK taking n, in the lecture's style. `why` explains the class; `traps`
   * explain specific wrong picks (keyed by class id). */
  var snippets = [
    { id: 's-linear', tier: 1, title: 'Two forms in a loop',
      code: ['(defun work (n)', '  (let ((x 0) (y 0))', '    (dotimes (i n)', '      (setf x (+ i 1))', '      (setf y (* x x)))))'].join('\n'),
      why: 'DOTIMES repeats its body n times, and the body is two O(1) forms: T(n) = 2n.',
      traps: { n2: 'Two forms in the body add (1 + 1), they don\'t multiply. Only a loop **inside** a loop multiplies.', '1': 'The loop runs n times, so the cost grows with n.' } },
    { id: 's-nested', tier: 1, title: 'A loop inside a loop',
      code: ['(defun work (n)', '  (let ((x 0) (y 0))', '    (dotimes (i n)', '      (setf x (+ i 1))', '      (dotimes (j n)', '        (setf y (+ j x))))))'].join('\n'),
      why: 'For each of n values of i, the inner loop runs n times: T(n) = n + n², so O(n²). Nested loops multiply.',
      traps: { n: 'Count the inner loop: it runs n times for **each** i. Nested loops multiply.' } },
    { id: 's-const', tier: 1, title: 'Straight-line code',
      code: ['(defun work (n)', '  (let ((a 5) (b 6) (c 10) (d 0))', '    (setf d (+ a b))', '    (setf a (* (/ b c) (+ d n)))', '    (setf c 33)))'].join('\n'),
      why: 'No form repeats. SETF and LET are O(1) when their forms are, even if n appears in an arithmetic expression.',
      traps: { n: 'n appears in the code, but nothing repeats n times. Using n in arithmetic is still one step.' } },
    { id: 's-sequential', tier: 1, title: 'Two loops, one after the other',
      code: ['(defun work (n)', '  (let ((x 0) (y 0))', '    (dotimes (i n)', '      (setf x (+ x i)))', '    (dotimes (j n)', '      (setf y (+ y j)))))'].join('\n'),
      why: 'Sequential loops **add**: n + n = 2n, which is O(n).',
      traps: { n2: 'These loops are side by side, not nested. Side by side adds (n + n); only nesting multiplies.' } },
    { id: 's-lin-sum', tier: 1, title: 'Summing 1..n with a loop',
      code: ['(defun work (n)', '  (let ((sum 0))', '    (do ((i 1 (1+ i)))', '        ((> i n))', '      (setf sum (+ sum i)))))'].join('\n'),
      why: 'One addition per value of i from 1 to n: O(n). The formula n(n+1)/2 would be O(1).' },
    { id: 's-lecture', tier: 2, title: 'The lecture\'s 3n² + 2n + 1',
      code: ['(defun work (n)', '  (let ((a 5) (b 6) (d 0) (v 1) (w 1) (y 1) (z 1))', '    (dotimes (i n)', '      (dotimes (j n)', '        (setf z (* i i))', '        (setf y (+ j j))', '        (setf z (+ i j))))', '    (dotimes (k n)', '      (setf w (+ (* a k) 45))', '      (setf v (* b b)))', '    (setf d 33)))'].join('\n'),
      why: '3 forms × n × n, plus 2 forms × n, plus 1: T(n) = 3n² + 2n + 1 = O(n²).',
      traps: { n3: 'There are three loops, but only two are nested. The k loop runs **after** the nested pair, so it adds.', n: 'The i and j loops are nested: that part alone is 3n².' } },
    { id: 's-doubling', tier: 2, title: 'The doubling update',
      code: ['(defun work (n)', '  (let ((k 0))', '    (setf k 0)', '    (do ((i 1 (* i 2)))   ; update is i*2!', '        ((>= i n))', '      (setf k (+ k (+ 2 2))))))'].join('\n'),
      why: 'i goes 1, 2, 4, 8, … and stops at n. It doubles about log₂ n times before reaching n: O(log n).',
      traps: { n: 'Look at the update form: `(* i 2)`, not `(1+ i)`. i doubles, so it reaches n after only about log₂ n iterations.' },
      misconception: 'Every loop is O(n).', misconceptionOn: 'n' },
    { id: 's-bound10', tier: 2, title: 'A loop with a fixed bound',
      code: ['(defun work (n)', '  (let ((x 0))', '    (dotimes (i 10)', '      (setf x (+ x i n)))))'].join('\n'),
      why: 'The loop always runs 10 times, whatever n is. A constant bound means O(1).',
      traps: { n: 'This loop is bounded by 10, not by n. Its cost doesn\'t grow with the input.' },
      misconception: 'Every loop is O(n).', misconceptionOn: 'n' },
    { id: 's-half', tier: 2, title: 'Only half the elements',
      code: ['(defun work (n)', '  (let ((x 0))', '    (dotimes (i (floor n 2))', '      (setf x (+ x i)))))'].join('\n'),
      why: 'n/2 iterations is ½·n: drop the coefficient, and it\'s O(n).',
      traps: { logn: 'Halving the **count** once is not the same as halving repeatedly. n/2 iterations is still linear.' } },
    { id: 's-triangle', tier: 2, title: 'Inner loop depends on i',
      code: ['(defun work (n)', '  (let ((x 0))', '    (dotimes (i n)', '      (dotimes (j i)', '        (setf x (+ x j))))))'].join('\n'),
      why: '0 + 1 + 2 + … + (n−1) = n(n−1)/2 = ½n² − ½n: O(n²). Same sum as selection sort.',
      traps: { n: 'The inner loop runs i times, and i grows up to n−1. That sums to about n²/2.', nlogn: 'The inner loop grows linearly with i, not logarithmically: the total is n(n−1)/2.' } },
    { id: 's-nlogn', tier: 3, title: 'n times a doubling loop',
      code: ['(defun work (n)', '  (let ((a 0))', '    (dotimes (i n)', '      (do ((j 1 (* j 2)))', '          ((>= j n))', '        (setf a (+ i j))))))'].join('\n'),
      why: 'The outer loop runs n times; the inner doubling loop runs about log₂ n times each: n · log₂ n = O(n log n).',
      traps: { n2: 'The inner loop doubles j, so it runs log₂ n times, not n times.', logn: 'The doubling loop is inside a DOTIMES over n, so its log₂ n cost is paid n times.' } },
    { id: 's-hidden', tier: 3, title: 'A function call hides a loop',
      code: ['(defun f (a b)', '  (let ((acc 0))', '    (dotimes (i a)', '      (incf acc))))', '', '(defun work (n)', '  (let ((x 0))', '    (dotimes (i n)', '      (dotimes (j n (f i j))', '        (setf x (+ i j))))))'].join('\n'),
      why: 'The inner loop is n² steps. Its result form `(f i j)` runs once per i, and F loops i times: 0 + 1 + … + (n−1). Total n² + n(n−1)/2: O(n²).',
      traps: { n: 'A function call is not automatically O(1). Look inside F: it loops `a` times.' } },
    { id: 's-cubic', tier: 3, title: 'Three nested loops',
      code: ['(defun work (n)', '  (let ((x 0))', '    (dotimes (i n)', '      (dotimes (j n)', '        (dotimes (k n)', '          (setf x (+ i j k)))))))'].join('\n'),
      why: 'n × n × n = n³: O(n³).',
      traps: { n2: 'There are three nested loops, so three factors of n.' } },
    { id: 's-const-outer', tier: 3, title: 'Constant outer, doubling inner',
      code: ['(defun work (n)', '  (let ((x 0))', '    (dotimes (i 100)', '      (do ((j 1 (* j 2)))', '          ((>= j n))', '        (setf x (+ x j))))))'].join('\n'),
      why: '100 × log₂ n: the 100 is a coefficient, so O(log n).',
      traps: { nlogn: 'The outer loop runs 100 times, not n times. 100·log n is O(log n).', n: 'Neither loop runs n times: one is bounded by 100, the other doubles.' } }
  ];

  var explain = {
    'simp.dropDominant': { why: '{term} is the fastest-growing term. Rule 1 keeps exactly that one and drops the rest.', misconception: 'The term with the biggest number in front is the one that matters.' },
    'simp.constCoef': { why: '{term} is a constant term. It goes away in rule 1, since it is not the fastest-growing term.' },
    'simp.noCoef': { why: '{term} has no coefficient left to drop.' },
    'simp.notDone': { why: 'Not yet: {left}. Rule 1 keeps **only** the fastest-growing term, and rule 2 drops its coefficient.' },
    'cross.early': { why: 'At n = {n}: {bName} = {bv} and {aName} = {av}. The faster-growing cost hasn\'t overtaken yet.' },
    'cross.late': { why: 'It overtakes earlier than that. At n = {cross}: {bName} = {bc} > {aName} = {ac}, and it stays ahead from then on.' },
    'cross.notForGood': { why: 'At n = {n}, {bName} costs more, but it falls back below {aName} at n = {back}. Find where it overtakes **for good**.' }
  };

  var prompts = {};

  var concepts = {
    'cost-function': 'Counting steps',
    'drop-terms': 'Keep the fastest-growing term',
    'drop-coef': 'Drop coefficients',
    'growth-classes': 'Complexity classes',
    'crossover': 'Growth beats constants',
    'upper-bound': 'Big-O is an upper bound',
    'loop-analysis': 'Reading loops (add vs multiply)',
    'doubling-loop': 'Doubling loops: O(log n)',
    'constant-bound': 'Constant-bound loops: O(1)',
    'hidden-call': 'Calls can hide work',
    'exp-vs-poly': 'Exponential vs polynomial',
    'lisp-basics': 'Lisp basics (flashback)'
  };

  var briefing = {
    core: 'Big-O describes how an algorithm\'s cost grows as n grows: keep the fastest-growing term and drop coefficients, because for large n the rest stops mattering.',
    steps: [
      { kind: 'tale', title: 'A tale of two algorithms',
        text: 'Two ways to add up 1 + 2 + … + n. The **loop** does n − 1 additions. The **formula** n(n+1)/2 always does 3 operations (add, multiply, divide). Drag n and watch the cost of each.',
        after: 'For tiny n the loop is cheaper. But its cost **grows** with n while the formula\'s doesn\'t: the loop is O(n), the formula O(1). Big-O asks what happens as n gets large.' },
      { kind: 'shares', title: 'Which term matters?',
        terms: [{ c: 2, k: 'n2', coefShown: true }, { c: 4, k: 'n', coefShown: true }, { c: 9, k: '1', coefShown: true }],
        text: 'Say an algorithm takes f(n) = **2n² + 4n + 9** steps. Drag n and watch each term\'s share of the total.',
        after: 'As n grows, 2n² takes over and the other terms\' share heads to zero. So: (1) keep only the fastest-growing term, (2) drop its coefficient. f(n) is **O(n²)**.' },
      { kind: 'check', title: 'Say it in one sentence',
        question: {
          id: 'brief2-core', type: 'mcq', concept: 'drop-terms',
          prompt: 'Why does Big-O drop the 4n + 9 in 2n² + 4n + 9?',
          choices: [
            'As n grows, their share of the total cost shrinks toward zero.',
            'They are smaller numbers than 2.',
            'They describe the best case, and Big-O is the worst case.',
            'Big-O only counts loops, not single steps.'
          ],
          answer: 0,
          explain: {
            correct: 'Yes. Big-O describes cost as n approaches infinity, where the lower-order terms contribute almost nothing.',
            wrong: {
              1: 'It\'s not about the size of the coefficients: 9 is bigger than 2. It\'s about how fast each term **grows**.',
              2: 'All three terms belong to the same cost function. They are dropped because they grow more slowly.',
              3: 'The 9 could be nine single steps; it is still counted, it just stops mattering as n grows.'
            }
          }
        } }
    ]
  };

  /* Growth Race pairs: costs as terms. `a` is the one that wins at first. */
  var races = {
    tier1: [
      { a: [{ c: 10, k: 'n' }], b: [{ c: 1, k: 'n2' }], aName: '10n', bName: 'n²' },
      { a: [{ c: 30, k: 'n' }], b: [{ c: 1, k: 'n2' }], aName: '30n', bName: 'n²' }
    ],
    tier2: [
      { a: [{ c: 100, k: 'n' }], b: [{ c: 2, k: 'n2' }], aName: '100n', bName: '2n²' },
      { a: [{ c: 1000, k: 'n' }], b: [{ c: 1, k: 'n3' }], aName: '1000n', bName: 'n³' }
    ],
    tier3: [
      { a: [{ c: 1, k: 'n3' }], b: [{ c: 1, k: '2n' }], aName: 'n³', bName: '2ⁿ' },
      { a: [{ c: 20, k: 'nlogn' }], b: [{ c: 1, k: 'n2' }], aName: '20·n log n', bName: 'n²' }
    ]
  };

  var games = [
    {
      id: 'growth', title: 'Growth Race', verb: 'Slide n', icon: '🏁',
      blurb: 'Race cost functions as n grows. Find the crossover where the faster-growing one overtakes for good.',
      concepts: ['crossover', 'growth-classes'],
      levels: [
        { id: 'tale', mode: 'watch', title: 'Loop vs formula', goal: 'Predict where the O(1) formula becomes cheaper than the O(n) loop, then explore.', kind: 'tale' },
        { id: 'cross', mode: 'try', title: 'Find the crossover', goal: 'Slide n to the point where the faster-growing cost overtakes for good. Hints on.', kind: 'cross', rounds: 2, tiers: [1, 2, 3] },
        { id: 'small', mode: 'solo', title: 'Fast today, slow tomorrow', goal: 'Faster on small inputs doesn\'t mean a better Big-O. No hints.', kind: 'small' },
        { id: 'sandbox', mode: 'sandbox', title: 'Race track', goal: 'Pick any classes and coefficients and race them.', kind: 'sandbox' }
      ]
    },
    {
      id: 'simplify', title: 'Simplify It', verb: 'Drag away', icon: '✂',
      blurb: 'Strip a cost function down to its Big-O: drag away the terms and coefficients that don\'t matter.',
      concepts: ['drop-terms', 'drop-coef'],
      levels: [
        { id: 'try', mode: 'try', title: 'Two rules', goal: 'Drop lower-order terms, then the coefficient. Hints on.', kind: 'simplify', rounds: 3, tiers: [1, 2, 3] },
        { id: 'solo', mode: 'solo', title: 'Messier functions', goal: 'Logs, n log n, exponentials. No hints.', kind: 'simplify', rounds: 3, tiers: [2, 3, 3] }
      ]
    },
    {
      id: 'detective', title: 'Big-O Detective', verb: 'Classify', icon: '🕵',
      blurb: 'Read Lisp snippets and name their Big-O. Watch out for doubling updates, constant bounds and hidden calls.',
      concepts: ['loop-analysis', 'doubling-loop', 'constant-bound', 'hidden-call'],
      levels: [
        { id: 'try', mode: 'try', title: 'Read the loops', goal: 'Classify five snippets. After each one, the game runs it and plots the steps.', kind: 'detective', count: 5, tiers: [1, 2, 3] },
        { id: 'solo', mode: 'solo', title: 'The trap room', goal: 'Six snippets full of traps. No hints.', kind: 'detective', count: 6, tiers: [2, 3, 3] }
      ]
    },
    {
      id: 'count', title: 'Count the Steps', verb: 'Tally', icon: '🧮',
      blurb: 'Tally the steps for a small n by hand, then watch the game plot the curve and name its class.',
      concepts: ['cost-function', 'loop-analysis'],
      levels: [
        { id: 'try', mode: 'try', title: 'Tally by hand', goal: 'Count the steps for a small n. Hints on.', kind: 'count', rounds: 2, tiers: [2, 3, 4] },
        { id: 'solo', mode: 'solo', title: 'Tally solo', goal: 'Bigger loops, no hints.', kind: 'count', rounds: 2, tiers: [3, 4, 5] }
      ]
    }
  ];

  /* Words for computed questions and game text. */
  var templates = {
    classOrder: ['1', 'logn', 'n', 'nlogn', 'n2', 'n3'],
    tale: {
      prompt: 'The loop costs n − 1 additions; the formula always costs 3 operations. From which n is the **formula** strictly cheaper?',
      correct: 'At n = {x}: the loop needs {lin} additions, more than the formula\'s 3. Below that, the loop is as cheap or cheaper.',
      wrong: 'Check n = {g}: the loop costs {gl}, the formula 3.',
      misconception: 'The O(1) algorithm is faster for every input.',
      summary: 'The formula wins from n = {x} on, and its lead grows forever.'
    },
    cross: {
      intro: 'Which cost is lower now? Slide n until **{bName}** overtakes **{aName}** for good, then lock it in.',
      hint: 'Solve where they meet: {aName} = {bName}. The first n after that point where {bName} is strictly bigger is the crossover.',
      found: 'Crossover at n = {cross}. Before it, {aName} costs more; from n = {cross} on, {bName} costs more, and the gap keeps growing.',
      summary: '{rounds} crossover(s) found with {misses} slip(s).'
    },
    small: {
      intro: 'Algorithm **A** takes 2n² steps. Algorithm **B** takes 500n steps.',
      q1: 'At n = 50, which algorithm takes fewer steps?',
      q1ok: 'A: 2·50² = {a50}, while B: 500·50 = {b50}. A wins at n = 50.',
      q1bad: 'Compute both: A = 2·50² = {a50}, B = 500·50 = {b50}.',
      q2: 'Which algorithm has the better Big-O?',
      q2ok: 'B is O(n), A is O(n²). Whatever the coefficients, A eventually loses.',
      q2bad: 'A wins at n = 50, but Big-O is about large n. A is O(n²), B is O(n).',
      misconception: 'Faster on small inputs means a better Big-O.',
      q3: 'Now find where A (2n²) overtakes B (500n) for good.',
      summary: 'A wins until n = {cross}. After that, B (the O(n) one) wins forever.'
    },
    simplify: {
      intro: 'Tap (or drag to the bin) a **term** to drop it, or tap a **coefficient** to drop it. Press "That\'s the Big-O" when you\'re done.',
      done: 'f(n) = {orig} is **{cls}**.',
      shares: 'Share of total cost at n = {n}:',
      summary: '{rounds} functions simplified with {misses} slip(s).'
    },
    detective: {
      prompt: 'What is the Big-O of `(work n)`?',
      ok: '{why}',
      plotted: 'Steps for n = 1…{max}: the curve hugs {cls}.',
      generic: { higher: 'That overestimates it. {why}', lower: 'That underestimates it. {why}' },
      summary: '{right} of {total} classified on the first try.'
    },
    count: {
      prompt: 'How many steps does `(work {n})` take? Count every SETF / INCF that runs (loop overhead and LET bindings are free).',
      ok: 'Exactly {steps}. Per line: {perLine}.',
      wrong: 'Not {guess}. Here is the tally per line: {perLine}. Total: {steps}.',
      hint: 'Trace it: write down the loop variable\'s values, then count how often each SETF / INCF runs.',
      plotted: 'Steps for n = 1…{max}, next to the {cls} curve.',
      summary: '{rounds} counts with {misses} slip(s).'
    }
  };

  /* Trace the Code. */
  var trace = [
    { id: 'u2t1', type: 'predict', concept: 'cost-function', prompt: 'What does this return?', code: '(first-n-lin 10)',
      choices: ['55', '45', '10', '100'], answer: 0,
      explain: { correct: 'The DO adds i = 1 … 10 into SUM and returns SUM when i > 10: 55.',
        wrong: { 1: '45 would be 1 … 9. The end test is `(> i n)`, so i = 10 is still added.', 2: 'It returns SUM, not the count.', 3: '1 + 2 + … + 10 is 55, not 10².' } },
      verify: { form: '(first-n-lin 10)', expect: '55' } },
    { id: 'u2t2', type: 'predict', concept: 'cost-function', prompt: 'What does this return?', code: '(first-n-const 100)',
      choices: ['5050', '5000', '10100', '100'], answer: 0,
      explain: { correct: '100 · 101 / 2 = 5050, in three operations no matter how big n is.',
        wrong: { 1: 'Check the arithmetic: (* 100 101) is 10100, halved is 5050.', 2: 'That\'s n(n+1) before dividing by 2.', 3: 'It returns the sum, not n.' } },
      verify: { form: '(first-n-const 100)', expect: '5050' } },
    { id: 'u2t3', type: 'bug', concept: 'cost-function',
      prompt: 'This version returns **45** for `(first-n-lin 10)` instead of 55. Tap the buggy line.',
      code: ['(defun first-n-lin (n)', '  (do ((i 1 (1+ i))', '       (sum 0 (+ i sum)))', '      ((>= i n) sum)))'].join('\n'),
      answer: [4],
      explain: { correct: 'With `(>= i n)` the loop stops when i reaches n, before adding it. The lecture uses `(> i n)`.',
        wrong: { any: 'That line matches the lecture. Which form decides when the DO **stops**?' } },
      verify: { defs: '(defun first-n-lin (n) (do ((i 1 (1+ i)) (sum 0 (+ i sum))) ((>= i n) sum)))', form: '(first-n-lin 10)', expect: '45' } },
    { id: 'u2t4', type: 'fill', concept: 'doubling-loop',
      prompt: 'Fill the blank so this loop is **O(log n)**.',
      code: '(do ((i 1 ___))',
      choices: ['(* i 2)', '(1+ i)', '(+ i 2)', '(- i 1)'], answer: 0,
      explain: { correct: 'Doubling i reaches n after about log₂ n updates.',
        wrong: { 1: 'Adding 1 each time takes n updates: O(n).', 2: 'Adding 2 takes n/2 updates, still O(n). Coefficients don\'t change the class.', 3: 'Counting down from 1 never reaches n, so the loop never ends.' } },
      misconception: 'Any loop is O(n).',
      verify: { defs: 'fill', form: '(doubling-loop 16)', expect: '16' } },
    { id: 'u2t5', type: 'predict', concept: 'doubling-loop',
      prompt: 'How many times does the body run?', code: "(let ((c 0))\n  (do ((i 1 (* i 2)))\n      ((>= i 16))\n    (incf c))\n  c)",
      choices: ['4', '16', '15', '5'], answer: 0,
      explain: { correct: 'i = 1, 2, 4, 8 run the body; at i = 16 the end test is true. 4 = log₂ 16.',
        wrong: { 1: 'i doubles: 1, 2, 4, 8, 16. That\'s far fewer than 16 iterations.', 2: 'The loop doesn\'t step by 1; it doubles.', 3: 'At i = 16 the end test `(>= i 16)` is already true, so the body doesn\'t run a fifth time.' } },
      misconception: 'Every loop runs n times.',
      verify: { form: '(let ((c 0)) (do ((i 1 (* i 2))) ((>= i 16)) (incf c)) c)', expect: '4' } },
    { id: 'u2t6', type: 'predict', concept: 'loop-analysis',
      prompt: 'What does this return?', code: "(let ((c 0))\n  (dotimes (i 4)\n    (dotimes (j i)\n      (incf c)))\n  c)",
      choices: ['6', '16', '4', '10'], answer: 0,
      explain: { correct: 'The inner loop runs 0 + 1 + 2 + 3 = 6 times: n(n−1)/2 with n = 4.',
        wrong: { 1: 'That would be a full 4 × 4. The inner bound is i, not 4.', 2: 'The inner loop runs more than once per i for larger i.', 3: '0 + 1 + 2 + 3: DOTIMES (j i) stops before i.' } },
      verify: { form: '(let ((c 0)) (dotimes (i 4) (dotimes (j i) (incf c))) c)', expect: '6' } },
    { id: 'u2t7', type: 'bigo', concept: 'constant-bound',
      prompt: 'Big-O of this form, in terms of n?', code: "(dotimes (i 10)\n  (setf x (+ x n)))",
      choices: ['O(1)', 'O(n)', 'O(10n)', 'O(log n)'], answer: 0,
      explain: { correct: 'Ten iterations, whatever n is: constant.',
        wrong: { 1: 'The loop is bounded by 10, not n. n only appears in the arithmetic.', 2: 'O(10n) isn\'t a class (coefficients are dropped), and the loop doesn\'t depend on n anyway.', 3: 'Nothing halves or doubles here.' } },
      misconception: 'Every loop is O(n).', misconceptionOn: 'n' },
    { id: 'u2t8', type: 'bigo', concept: 'loop-analysis',
      prompt: 'Two loops in a row. Big-O?', code: "(dotimes (i n)\n  (setf x (+ x i)))\n(dotimes (j n)\n  (setf y (+ y j)))",
      choices: ['O(n)', 'O(n²)', 'O(2n)', 'O(n log n)'], answer: 0,
      explain: { correct: 'Sequential loops add: n + n = 2n, which is O(n).',
        wrong: { 1: 'Only nested loops multiply. These run one after the other.', 2: 'Correct count, but drop the coefficient: 2n is O(n).', 3: 'Neither loop has a logarithmic part.' } },
      misconception: 'Two loops always mean O(n²).' },
    { id: 'u2t9', type: 'mcq', concept: 'upper-bound',
      prompt: 'Linear search is O(n). What does that guarantee?',
      choices: ['At most about n comparisons, in the worst case', 'Exactly n comparisons every time', 'At least n comparisons', 'n comparisons on average'], answer: 0,
      explain: { correct: 'Big-O is an upper bound. Linear search can finish after 1 comparison (best case); it never needs more than n.',
        wrong: { 1: 'If the key is first, linear search makes 1 comparison. O(n) is an upper bound, not an exact count.', 2: 'That would be a lower bound. The best case is 1 comparison.', 3: 'Big-O here describes the worst case, not the average.' } },
      misconception: 'O(n) means exactly n steps.' },
    { id: 'u2t10', type: 'bigo', concept: 'hidden-call',
      prompt: 'F loops `a` times. What is the Big-O of G?',
      code: "(defun f (a b)\n  (let ((acc 0))\n    (dotimes (i a)\n      (incf acc))))\n\n(defun g (n)\n  (let ((x 0))\n    (dotimes (i n)\n      (f n 0))))",
      choices: ['O(n²)', 'O(n)', 'O(1)', 'O(n log n)'], answer: 0,
      explain: { correct: 'G calls F n times, and each call loops n times: n · n = O(n²).',
        wrong: { 1: 'The call `(f n 0)` looks like one step, but F loops n times inside.', 2: 'G loops n times, so it can\'t be constant.', 3: 'F\'s loop is linear in its argument, not logarithmic.' } },
      misconception: 'A function call is always O(1).' }
  ];

  var boss = [
    { id: 'u2b1', type: 'task', task: 'simplify', concept: 'drop-terms', terms: [{ c: 7, k: 'n' }, { c: 3, k: 'nlogn' }, { c: 500, k: '1' }, { c: 40, k: 'logn' }],
      prompt: 'Hands-on: simplify f(n) = 7n + 3n log n + 500 + 40 log n.' },
    { id: 'u2b2', type: 'mcq', concept: 'crossover',
      prompt: 'A takes 100n steps, B takes n² steps. At n = 50, which is cheaper, and which has the better Big-O?',
      choices: ['B is cheaper at 50; A has the better Big-O', 'B is cheaper and has the better Big-O', 'A is cheaper and has the better Big-O', 'They tie at 50'], answer: 0,
      explain: { correct: 'At 50: A = 5000, B = 2500, so B is cheaper. But A is O(n), B is O(n²): from n = 101 on, A wins forever.',
        wrong: { 1: 'Being cheaper at one small n says nothing about growth. B is O(n²).', 2: 'At n = 50, A costs 5000 and B costs 2500.', 3: '100n = n² only at n = 100.' } },
      misconception: 'Faster on small inputs means a better Big-O.' },
    { id: 'u2b3', type: 'mcq', concept: 'exp-vs-poly',
      prompt: 'n¹⁰ versus 1.1ⁿ. Which grows faster as n → ∞?',
      choices: ['1.1ⁿ (exponential beats any polynomial)', 'n¹⁰ (bigger exponent)', 'They are the same class', 'It depends on the computer'], answer: 0,
      explain: { correct: 'Any exponential bⁿ with b > 1 eventually outgrows any polynomial nᵇ, even though n¹⁰ is far bigger for small n.',
        wrong: { 1: 'For small n, yes. But in bⁿ the variable is in the exponent, and that eventually wins.', 2: 'nᵇ and bⁿ are different classes: polynomial vs exponential.', 3: 'Big-O is machine-independent: it compares growth, not seconds.' } },
      misconception: 'nᵇ and bⁿ are the same class.' },
    { id: 'u2b4', type: 'bigo', concept: 'doubling-loop',
      prompt: 'Big-O of this function?', code: "(defun work (n)\n  (let ((a 0))\n    (dotimes (i n)\n      (do ((j 1 (* j 2)))\n          ((>= j n))\n        (setf a (+ i j))))))",
      choices: ['O(n log n)', 'O(n²)', 'O(log n)', 'O(n)'], answer: 0,
      explain: { correct: 'n outer iterations × about log₂ n inner iterations.',
        wrong: { 1: 'The inner loop doubles j: log₂ n iterations, not n.', 2: 'The doubling loop runs inside a loop over n.', 3: 'Each of the n outer iterations does about log₂ n work.' } },
      misconception: 'Every loop is O(n).', misconceptionOn: 'n' },
    { id: 'u2b5', type: 'mcq', concept: 'growth-classes',
      prompt: 'One algorithm is O(log₂ n), another is O(log₁₀ n). Which is in the faster-growing class?',
      choices: ['Neither: all log bases are the same class', 'log₂ n', 'log₁₀ n', 'Depends on n'], answer: 0,
      explain: { correct: 'log₂ n = log₁₀ n / log₁₀ 2, a constant factor apart, and Big-O drops constant factors.',
        wrong: { 1: 'log₂ n is bigger by a constant factor (about 3.3), and constants are dropped.', 2: 'log₁₀ n is smaller, but only by a constant factor.', 3: 'The ratio is the same constant for every n.' } } },
    { id: 'u2b6', type: 'predict', concept: 'loop-analysis',
      prompt: 'What does this return?', code: "(let ((c 0))\n  (dotimes (i 3)\n    (dotimes (j 3)\n      (incf c)))\n  (dotimes (k 3)\n    (incf c))\n  c)",
      choices: ['12', '27', '9', '6'], answer: 0,
      explain: { correct: 'Nested: 3 × 3 = 9, then sequential: + 3. 9 + 3 = 12, the shape of n² + n.',
        wrong: { 1: 'The k loop is not nested inside the others; it runs after them.', 2: 'Don\'t forget the k loop afterwards: + 3.', 3: 'The first two loops are nested: they multiply.' } },
      verify: { form: '(let ((c 0)) (dotimes (i 3) (dotimes (j 3) (incf c))) (dotimes (k 3) (incf c)) c)', expect: '12' } },
    { id: 'u2b7', type: 'mcq', concept: 'drop-coef',
      prompt: 'Algorithm A makes 1000n² steps; B makes 2n² steps. Their Big-O classes are…',
      choices: ['Both O(n²)', 'A is O(1000n²), B is O(2n²)', 'A is worse by a class', 'B is O(n)'], answer: 0,
      explain: { correct: 'Coefficients are dropped: 2n², 3n², 1000000n² are all O(n²). In practice A is slower, but by a constant factor.',
        wrong: { 1: 'Big-O classes don\'t carry coefficients.', 2: 'A is 500 times slower, but that\'s a constant factor. Same class.', 3: '2n² is still quadratic.' } },
      misconception: 'Coefficients change the complexity class.' },
    { id: 'u2b8', type: 'predict', concept: 'lisp-basics', flashback: 'Unit 1 · Lisp bootcamp',
      prompt: 'What does the REPL print?', code: '(+ 2 (* 3 4))',
      choices: ['14', '20', 'An error', '(+ 2 12)'], answer: 0,
      explain: { correct: 'Prefix notation, evaluated inside-out: (* 3 4) is 12, then (+ 2 12) is 14.',
        wrong: { 1: 'That\'s (2 + 3) × 4. In Lisp the inner form `(* 3 4)` is evaluated first.', 2: 'This is valid prefix notation: the first element of each list is the function.', 3: 'The REPL evaluates the whole form, not one step of it.' } },
      verify: { form: '(+ 2 (* 3 4))', expect: '14' } }
  ];

  var cards = {
    'u2-cost': { title: 'Counting steps', unit: 2, def: 'A cost function f(n) counts steps (simple forms like SETF) as the input size n grows. It ignores language and machine.', cost: 'Loop overhead and LET bindings are free; each simple body form is 1 step', lisp: '(dotimes (i n) (setf x (+ i 1)))  ; n steps' },
    'u2-rules': { title: 'Cost function → Big-O', unit: 2, def: '1) Keep only the fastest-growing term. 2) Drop its coefficient. The dropped parts\' share of the cost → 0 as n → ∞.', cost: '2n² + 4n + 9 → O(n²)', lisp: '; 3n^2 + 2n + 1 is O(n^2)' },
    'u2-classes': { title: 'Complexity classes', unit: 2, def: 'O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(n³) < O(nᵇ) < O(bⁿ) < O(n!). All log bases are one class; nᵇ and bⁿ are not.', cost: 'Big-O is an upper bound (worst case)', lisp: '; linear search: best 1, worst n -> O(n)' },
    'u2-loops': { title: 'Reading Lisp loops', unit: 2, def: 'Nested loops multiply; sequential loops add. A loop with a constant bound is O(1).', cost: 'n × n = O(n²); n + n = O(n); (dotimes (i 10)) = O(1)', lisp: '(dotimes (i n)\n  (dotimes (j n) (setf y (+ j x))))' },
    'u2-doubling': { title: 'Doubling loops', unit: 2, def: 'An update like (* i 2) reaches n after log₂ n steps. Inside a loop over n it becomes n log n.', cost: 'O(log n) alone, O(n log n) nested in a loop over n', lisp: '(do ((i 1 (* i 2))) ((>= i n)) ...)' },
    'u2-hidden': { title: 'Calls can hide work', unit: 2, def: 'A function call costs whatever the function does. Look inside before calling it O(1).', cost: 'n calls to an O(n) function: O(n²)', lisp: '(dotimes (i n) (f n 0))  ; F loops n times' }
  };

  C.unitData[2] = {
    id: 2,
    title: 'Big-O',
    room: 'The Growth Track',
    bossTitle: 'The Timekeeper',
    intro: 'The Growth Track\'s timing system is broken: it ranks racers by how they do on tiny inputs. Teach it to judge algorithms by how they grow.',
    lisp: lisp,
    snippets: snippets,
    races: races,
    explain: explain,
    prompts: prompts,
    templates: templates,
    concepts: concepts,
    briefing: briefing,
    games: games,
    trace: trace,
    boss: boss,
    cards: cards,
    summary: {
      canExplain: [
        'How to turn a cost function into Big-O with two rules, and why the dropped parts don\'t matter for large n.',
        'Why an O(n) algorithm can lose to an O(n²) one on small inputs, and win forever after the crossover.',
        'How to read Lisp loops: nested loops multiply, sequential loops add.',
        'Why a doubling loop is O(log n) and a loop with a constant bound is O(1).',
        'Why a function call isn\'t automatically O(1).'
      ]
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
