/* CPS305 Quest — content/unit1.js
 * Unit 1: Lisp bootcamp (Topics 1–2). DATA ONLY. The Evaluator, Truthy or
 * Falsy and Loop Tracer get every value by running the forms in engine/lisp.js.
 */
(function (root) {
  'use strict';
  var C = root.CQ.content;

  var concepts = {
    'prefix': 'Prefix notation and the REPL',
    'eval-order': 'Evaluation: innermost first, left to right',
    'quote': 'QUOTE: forms as data',
    'truthiness': 'NIL is false, everything else is true',
    'and-or': 'AND / OR short-circuit',
    'special-forms': 'Special forms (IF, LET, COND, CASE)',
    'loops': 'DOTIMES, DO and DO*',
    'structs-arrays': 'DEFSTRUCT and arrays'
  };

  /* Evaluator expressions (tiered). */
  var evalPool = [
    { expr: '(+ 2 (* 3 4))', tier: 1 }, { expr: '(* (+ 1 2) (- 7 3))', tier: 1 }, { expr: '(- 10 (/ 8 2))', tier: 1 },
    { expr: '(+ (* 2 3) (* 4 5))', tier: 2 }, { expr: '(max (+ 1 1) (* 2 3) (- 9 1))', tier: 2 }, { expr: '(* (+ 1 (* 2 3)) (- 9 4))', tier: 2 },
    { expr: '(+ (- 10 (* 2 3)) (* (+ 1 1) (- 6 2)))', tier: 3 }, { expr: '(1+ (* (- 8 (+ 1 2)) (max 2 (/ 9 3))))', tier: 3 }
  ];
  /* Truthy or Falsy: (if X 'truthy 'falsy) is evaluated to grade each card. */
  var truthPool = ['0', 'nil', "'()", '""', 't', "'nil", '(and 1 nil)', '(or nil 0)', '(> 3 5)', "(member 9 '(1 2 3))", "(member 2 '(1 2 3))", '(and)', '(or)', "'(nil)", '(not 0)'];
  /* Quote or Not: each card is a form; kinds are computed by running it. */
  var quotePool = ["(+ 1 2)", "'(+ 1 2)", "(quote (a b))", "(list '+ 1 2)", "(2 + 3)", "'a", "(car '(x y))", "(first (+ 1 2))"];
  /* Loop Tracer programs: each returns the table of rows it pushed. */
  var loops = [
    { id: 'l1', tier: 1, title: 'DOTIMES with a running sum', code: '(let ((rows nil) (sum 0))\n  (dotimes (i 4)\n    (setf sum (+ sum i))\n    (push (list i sum) rows))\n  (reverse rows))', cols: ['i', 'sum'] },
    { id: 'l2', tier: 1, title: 'DOTIMES with a product', code: '(let ((rows nil) (p 1))\n  (dotimes (i 4)\n    (setf p (* p (1+ i)))\n    (push (list i p) rows))\n  (reverse rows))', cols: ['i', 'p'] },
    { id: 'l3', tier: 2, title: 'DO counting by two', code: '(let ((rows nil))\n  (do ((i 0 (+ i 2))\n       (acc 0 (+ acc i)))\n      ((> i 6))\n    (push (list i acc) rows))\n  (reverse rows))', cols: ['i', 'acc'] },
    { id: 'l4', tier: 3, title: 'DO vs DO*: parallel update', code: '(let ((rows nil))\n  (do ((i 0 (1+ i))\n       (j 0 i))          ; uses the OLD i\n      ((= i 4))\n    (push (list i j) rows))\n  (reverse rows))', cols: ['i', 'j'] },
    { id: 'l5', tier: 3, title: 'DO*: sequential update', code: '(let ((rows nil))\n  (do* ((i 0 (1+ i))\n        (j 0 i))         ; uses the NEW i\n       ((= i 4))\n    (push (list i j) rows))\n  (reverse rows))', cols: ['i', 'j'] }
  ];

  var briefing = {
    core: 'Lisp code is made of forms: a list whose first element names a function or special form, followed by its arguments, written in prefix notation; the REPL evaluates arguments first (left to right), then applies the function.',
    steps: [
      { kind: 'evalDemo', title: 'Inside out', text: 'The REPL reads a form, evaluates it, and prints the result. Watch `(* (+ 1 2) (- 7 3))` collapse from the inside out.',
        after: 'Each list is a function call: the first element is the function, the rest are arguments. Arguments are evaluated first, left to right; then the function is applied. Numbers evaluate to themselves.' },
      { kind: 'quoteDemo', title: 'Code or data?', text: 'Same list, with and without a quote.',
        after: 'QUOTE (written \') returns its form **unevaluated**: the list (+ 1 2) as data. Without it, the REPL calls +.' },
      { kind: 'check', title: 'Say it in one sentence',
        question: { id: 'brief1-core', type: 'mcq', concept: 'prefix', prompt: 'How does the REPL evaluate (+ 2 (* 3 4))?',
          choices: ['Evaluate the arguments 2 and (* 3 4) first, then apply + to 2 and 12', 'Left to right: 2 + 3, then × 4', 'Apply + first, then evaluate (* 3 4)', 'It returns the list unchanged'], answer: 0,
          explain: { correct: '→ 14. Arguments first, innermost first, left to right.', wrong: { 1: 'That\'s infix thinking. In prefix, (* 3 4) is one argument.', 2: '+ needs its arguments as values before it can run.', 3: 'Only a quoted form is returned unevaluated.' } } } }
    ]
  };

  var games = [
    {
      id: 'evaluator', title: 'Evaluator', verb: 'Pick the next form', icon: '⚙',
      blurb: 'A nested prefix expression collapses inside-out. Pick which form the REPL evaluates next.',
      concepts: ['eval-order', 'prefix'],
      levels: [
        { id: 'try', mode: 'try', title: 'Inside out', goal: 'Pick each form in evaluation order. Hints on.', kind: 'evaluator', count: 2, tiers: [1, 2, 3] },
        { id: 'solo', mode: 'solo', title: 'Deeper nests', goal: 'Longer expressions, no hints.', kind: 'evaluator', count: 2, tiers: [2, 3, 3] }
      ]
    },
    {
      id: 'quoting', title: 'Quote or Not? · Truthy or Falsy', verb: 'Classify fast', icon: '⚡',
      blurb: 'Rapid fire: is this form code or data? Is this value true or false in Lisp?',
      concepts: ['quote', 'truthiness', 'and-or'],
      levels: [
        { id: 'quote', mode: 'try', title: 'Quote or Not?', goal: 'Call, data, or error? Hints on.', kind: 'quote', count: 6 },
        { id: 'truthy', mode: 'solo', title: 'Truthy or Falsy', goal: 'Rapid fire, no hints. 0 is a trap.', kind: 'truthy', count: 10 }
      ]
    },
    {
      id: 'tracer', title: 'Loop Tracer', verb: 'Fill the table', icon: '📋',
      blurb: 'A DOTIMES or DO variable table fills in as you predict each iteration.',
      concepts: ['loops'],
      levels: [
        { id: 'try', mode: 'try', title: 'DOTIMES', goal: 'Predict the variables after each iteration. Hints on.', kind: 'tracer', tiers: [1, 2, 3] },
        { id: 'solo', mode: 'solo', title: 'DO vs DO*', goal: 'Parallel vs sequential updates. No hints.', kind: 'tracer', tiers: [3, 3, 3] }
      ]
    }
  ];

  var templates = {
    evalPrompt: 'Which form does the REPL evaluate next? Tap it.',
    evalWrongOuter: '{form} can\'t run yet: its arguments must be values first. Evaluate the innermost forms first.',
    evalWrongOrder: 'Arguments are evaluated **left to right**: {exp} comes before {form}.',
    evalDone: 'The REPL prints **{value}**.',
    quoteKinds: { call: 'a function call (evaluated)', data: 'data (quoted, returned as is)', error: 'an error' },
    truthWhy: { truthy: 'Everything except NIL is true in Lisp: {x} → {v}.', falsy: '{x} evaluates to {v}, which is NIL: the only false value. (\'() and NIL are the same.)' },
    tracerPrompt: 'Iteration {n}: what are ({cols}) at the end of the body?'
  };

  var trace = [
    { id: 'u1t1', type: 'predict', concept: 'prefix', prompt: 'What does the REPL print?', code: '(+ 2 (* 3 4))', choices: ['14', '20', '(+ 2 12)', '24'], answer: 0,
      explain: { correct: '(* 3 4) is 12, then (+ 2 12) is 14.', wrong: { 1: 'That reads it as (2 + 3) × 4. In prefix, (* 3 4) is one argument.', 2: 'The REPL evaluates the whole form.', 3: 'Only * and + appear once each: 2 + 12.' } },
      verify: { form: '(+ 2 (* 3 4))', expect: '14' } },
    { id: 'u1t2', type: 'mcq', concept: 'prefix', prompt: 'What happens at the REPL with `(2 + 3)`?', choices: ['An error: 2 is not a function', '5', '(2 + 3)', '6'], answer: 0,
      explain: { correct: 'The first element of a form names the function. 2 isn\'t one: "illegal function call".', wrong: { 1: 'Lisp is prefix: write (+ 2 3).', 2: 'Without a quote the list is evaluated, not returned.', 3: 'Nothing is added.' } },
      misconception: 'Infix (2 + 3) works in Lisp.', interp: { form: '(2 + 3)', expect: 'ERROR: Illegal function call (2 + 3)' } },
    { id: 'u1t3', type: 'predict', concept: 'quote', prompt: 'What does the REPL print?', code: "'(+ 1 2)", choices: ['(+ 1 2)', '3', '+', 'An error'], answer: 0,
      explain: { correct: 'QUOTE returns the form as data, unevaluated.', wrong: { 1: 'The quote stops evaluation.', 2: 'It returns the whole list.', 3: 'Quoting any form is fine.' } },
      misconception: 'A quoted list is still called.',
      verify: { form: "'(+ 1 2)", expect: '(+ 1 2)' } },
    { id: 'u1t4', type: 'predict', concept: 'truthiness', prompt: 'What does this return?', code: "(if 0 'yes 'no)", choices: ['YES', 'NO', 'NIL', '0'], answer: 0,
      explain: { correct: 'Only NIL is false. 0 is a perfectly true value.', wrong: { 1: 'In C and Python 0 is false; in Lisp it is true.', 2: 'IF returns one of its branches.', 3: 'IF returns the branch value.' } },
      misconception: '0 is false.',
      verify: { form: "(if 0 'yes 'no)", expect: 'YES' } },
    { id: 'u1t5', type: 'predict', concept: 'and-or', prompt: 'What does this return?', code: '(or nil 0 5)', choices: ['0', 'T', '5', 'NIL'], answer: 0,
      explain: { correct: 'OR returns the first true value it finds, and 0 is true. It stops there.', wrong: { 1: 'OR returns the deciding value itself, not T.', 2: 'It short-circuits at 0.', 3: '0 is true.' } },
      misconception: 'AND and OR return only T or NIL.',
      verify: { form: '(or nil 0 5)', expect: '0' } },
    { id: 'u1t6', type: 'predict', concept: 'and-or', prompt: 'What does this return?', code: '(and 1 2 3)', choices: ['3', 'T', '1', '6'], answer: 0,
      explain: { correct: 'AND returns the last value if all are true.', wrong: { 1: 'AND returns the value that decided the result: here the last one.', 2: 'It keeps going while values are true.', 3: 'AND doesn\'t add.' } },
      misconception: 'AND and OR return only T or NIL.',
      verify: { form: '(and 1 2 3)', expect: '3' } },
    { id: 'u1t7', type: 'predict', concept: 'special-forms', prompt: 'What does this return?', code: "(cond ((> 3 5) 'a)\n      ((= 1 1) 'b)\n      (t 'c))", choices: ['B', 'A', 'C', 'T'], answer: 0,
      explain: { correct: 'COND returns the body of the first clause whose test is true.', wrong: { 1: '(> 3 5) is false.', 2: 'COND stops at the first true clause.', 3: 'It returns the clause\'s body value.' } },
      verify: { form: "(cond ((> 3 5) 'a) ((= 1 1) 'b) (t 'c))", expect: 'B' } },
    { id: 'u1t8', type: 'predict', concept: 'special-forms', prompt: 'What does this return?', code: "(case 3\n  (1 'one)\n  ((2 3) 'two-or-three)\n  (otherwise 'many))", choices: ['TWO-OR-THREE', 'MANY', 'ONE', 'NIL'], answer: 0,
      explain: { correct: 'A clause with a list of keys matches any of them.', wrong: { 1: 'OTHERWISE only runs if nothing matched.', 2: '3 isn\'t 1.', 3: 'A clause matched.' } },
      verify: { form: "(case 3 (1 'one) ((2 3) 'two-or-three) (otherwise 'many))", expect: 'TWO-OR-THREE' } },
    { id: 'u1t9', type: 'predict', concept: 'loops', prompt: 'What does this return?', code: '(do ((i 0 (1+ i))\n     (j 0 i))\n    ((= i 3) j))', choices: ['2', '3', '0', '6'], answer: 0,
      explain: { correct: 'DO updates in parallel: j gets the OLD i. When i becomes 3, j was set from i = 2.', wrong: { 1: 'That\'s DO*, which updates sequentially (j gets the new i).', 2: 'j is updated every iteration.', 3: 'j is set, not summed.' } },
      verify: { form: '(do ((i 0 (1+ i)) (j 0 i)) ((= i 3) j))', expect: '2' } },
    { id: 'u1t10', type: 'predict', concept: 'structs-arrays', prompt: 'What does the REPL print?', code: '(make-point :x 1)', choices: ['#S(POINT :X 1 :Y NIL)', '(POINT 1 NIL)', '#(1 NIL)', 'POINT'], answer: 0,
      explain: { correct: 'DEFSTRUCT POINT made MAKE-POINT; unspecified slots default to NIL.', wrong: { 1: 'Structs print as #S(...).', 2: 'That\'s an array.', 3: 'MAKE-POINT returns an instance.' } },
      verify: { form: '(make-point :x 1)', expect: '#S(POINT :X 1 :Y NIL)' } }
  ];

  var boss = [
    { id: 'u1b1', type: 'task', task: 'evaluate', concept: 'eval-order', expr: '(* (+ 1 (* 2 3)) (- 9 4))', prompt: 'Hands-on: evaluate this form step by step, in the REPL\'s order.' },
    { id: 'u1b2', type: 'predict', concept: 'truthiness', prompt: 'What does this return?', code: "(if '() 'full 'empty)", choices: ['EMPTY', 'FULL', 'NIL', '()'], answer: 0,
      explain: { correct: '\'() is NIL: the empty list is false.', wrong: { 1: 'The empty list and NIL are the same object.', 2: 'IF returns one of the branches.', 3: 'IF returns a branch value.' } },
      verify: { form: "(if '() 'full 'empty)", expect: 'EMPTY' } },
    { id: 'u1b3', type: 'predict', concept: 'special-forms', prompt: 'What does this return?', code: '(let ((x 3) (y 4))\n  (+ (* x x) (* y y)))', choices: ['25', '49', '14', '7'], answer: 0,
      explain: { correct: 'LET binds x = 3 and y = 4, then evaluates 9 + 16.', wrong: { 1: 'That\'s (3 + 4)².', 2: '9 + 16 = 25.', 3: 'That\'s x + y.' } },
      verify: { form: '(let ((x 3) (y 4)) (+ (* x x) (* y y)))', expect: '25' } },
    { id: 'u1b4', type: 'predict', concept: 'loops', prompt: 'What does this return?', code: '(let ((sum 0))\n  (dotimes (i 5 sum)\n    (setf sum (+ sum i))))', choices: ['10', '15', '5', 'NIL'], answer: 0,
      explain: { correct: 'i runs 0 … 4: 0 + 1 + 2 + 3 + 4 = 10. The result form SUM is returned.', wrong: { 1: 'DOTIMES stops before 5.', 2: 'It sums, it doesn\'t count.', 3: 'The result form returns SUM.' } },
      verify: { form: '(let ((sum 0)) (dotimes (i 5 sum) (setf sum (+ sum i))))', expect: '10' } },
    { id: 'u1b5', type: 'predict', concept: 'structs-arrays', prompt: 'What does this return?', code: "(let ((a (make-array 3 :initial-element 0)))\n  (setf (aref a 1) 'x)\n  a)", choices: ['#(0 X 0)', '#(X 0 0)', '(0 X 0)', '#(0 0 X)'], answer: 0,
      explain: { correct: 'AREF indexes from 0; SETF stores X in slot 1.', wrong: { 1: 'Index 1 is the second slot.', 2: 'Arrays print with #( ).', 3: 'Slot 2 is the third.' } },
      verify: { form: "(let ((a (make-array 3 :initial-element 0))) (setf (aref a 1) 'x) a)", expect: '#(0 X 0)' } },
    { id: 'u1b6', type: 'mcq', concept: 'quote', prompt: "Which form returns the list (A B)?", choices: ["'(a b)", '(a b)', '(list a b)', "(quote a b)"], answer: 0,
      explain: { correct: 'Quoting returns the list as data (symbols print in uppercase).', wrong: { 1: 'Unquoted, Lisp tries to call a function named A.', 2: 'A and B would be evaluated as variables.', 3: 'QUOTE takes exactly one form.' } } },
    { id: 'u1b7', type: 'predict', concept: 'and-or', prompt: 'What does this return?', code: "(and (member 2 '(1 2 3)) 'found)", choices: ['FOUND', '(2 3)', 'T', 'NIL'], answer: 0,
      explain: { correct: 'MEMBER returns (2 3), which is true, so AND moves on and returns the last value, FOUND.', wrong: { 1: 'AND returns the last value when all are true.', 2: 'AND returns a value, not T.', 3: '(2 3) is true.' } },
      verify: { form: "(and (member 2 '(1 2 3)) 'found)", expect: 'FOUND' } },
    { id: 'u1b8', type: 'predict', concept: 'loops', prompt: 'DO* updates sequentially. What does this return?', code: '(do* ((i 0 (1+ i))\n      (j 0 i))\n     ((= i 3) j))', choices: ['3', '2', '0', '6'], answer: 0,
      explain: { correct: 'With DO*, j is computed after i is updated: j = 3 when the loop ends.', wrong: { 1: 'That\'s DO (parallel).', 2: 'j is updated each iteration.', 3: 'j is set, not summed.' } },
      verify: { form: '(do* ((i 0 (1+ i)) (j 0 i)) ((= i 3) j))', expect: '3' } }
  ];

  var cards = {
    'u1-forms': { title: 'Forms and the REPL', unit: 1, def: 'A form is evaluated by the REPL. Literals evaluate to themselves. A list is a call: first element = function, the rest = arguments (prefix).', cost: 'Arguments first, left to right; then apply', lisp: '(+ 2 (* 3 4))  ; 14' },
    'u1-special': { title: 'Special forms', unit: 1, def: 'QUOTE (\'), IF, LET, DEFUN, LAMBDA, CASE, DEFVAR don\'t evaluate all their arguments the normal way.', cost: "'(+ 1 2) → (+ 1 2)", lisp: "(if test then else)  (let ((x 1)) ...)" },
    'u1-truth': { title: 'Truth and AND / OR', unit: 1, def: 'NIL and () are false; everything else is true, including 0. AND / OR short-circuit and return the value that decided the result.', cost: '(or nil 0) → 0 ; (and 1 2) → 2', lisp: '(cond ((test) result) (t default))' },
    'u1-loops': { title: 'Loops', unit: 1, def: 'DOTIMES counts 0..n−1. DO updates its variables in parallel; DO* sequentially. RETURN exits early.', cost: '(dotimes (i n result) body)', lisp: '(do ((i 0 (1+ i))) ((= i n) result) body)' }
  };

  C.unitData[1] = {
    id: 1, title: 'Lisp bootcamp', room: 'The Paren Forge', bossTitle: 'The Parenthesis',
    intro: 'The Paren Forge hammers out Lisp forms, but half of them come out inside out. Learn how the REPL reads, evaluates and prints.',
    lisp: {}, evalPool: evalPool, truthPool: truthPool, quotePool: quotePool, loops: loops,
    explain: {}, prompts: {}, templates: templates, concepts: concepts, briefing: briefing,
    games: games, trace: trace, boss: boss, cards: cards,
    summary: { canExplain: [
      'How the REPL evaluates a prefix form: arguments first, left to right, then apply.',
      'Why (2 + 3) is an error, and what QUOTE does.',
      'Why 0 is true in Lisp, and what AND and OR return.',
      'How IF, COND, CASE and LET work.',
      'How DOTIMES, DO and DO* step their variables.'
    ] }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
