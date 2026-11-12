/* CPS305 Quest — content/unit4.js
 * Unit 4: Recursion (Topic 4). DATA ONLY. Games run this Lisp in
 * engine/lisp.js; tail-recursion answers come from static analysis of the code.
 */
(function (root) {
  'use strict';
  var C = root.CQ.content;

  var DEFS = {
    'fact-rec': '(defun fact-rec (n)\n  (if (< n 2) 1\n      (* n (fact-rec (- n 1)))))',
    'fact-tail': '(defun fact-tail (n &optional (f 1))\n  (if (< n 2) f\n      (fact-tail (- n 1) (* n f))))',
    'sum-rec': '(defun sum-rec (x)\n  (if (null x) 0\n      (+ (first x) (sum-rec (rest x)))))',
    'sum-tail': '(defun sum-tail (x &optional (acc 0))\n  (if (null x) acc\n      (sum-tail (rest x) (+ (first x) acc))))',
    'count-nums': '(defun count-nums (a)\n  (cond ((null a) 0)\n        ((listp (first a)) (+ (count-nums (first a))\n                              (count-nums (rest a))))\n        (t (+ 1 (count-nums (rest a))))))',
    'flatten': '(defun flatten (a)\n  (cond ((null a) a)\n        ((listp (first a)) (append (flatten (first a))\n                                   (flatten (rest a))))\n        (t (cons (first a) (flatten (rest a))))))',
    'mystery': '(defun mystery (x)\n  (if (null x) x\n      (append (mystery (rest x)) (list (first x)))))',
    'tr-reverse': '(defun tr-reverse (x &optional (acc nil))\n  (if (null x) acc\n      (tr-reverse (rest x) (cons (first x) acc))))',
    'fib-rec': '(defun fib-rec (n)\n  (if (<= n 2) 1\n      (+ (fib-rec (- n 1))\n         (fib-rec (- n 2)))))'
  };
  var lisp = {};
  Object.keys(DEFS).forEach(function (k) { lisp[k] = { title: k.toUpperCase() + ' (lecture)', code: DEFS[k], anchors: {} }; });

  /* Tail or Not? The answer is computed by engine/lisp.js (L.tailCalls). */
  var tailSnippets = [
    { id: 'fact-rec', name: 'fact-rec', code: DEFS['fact-rec'], tier: 1 },
    { id: 'fact-tail', name: 'fact-tail', code: DEFS['fact-tail'], tier: 1 },
    { id: 'sum-rec', name: 'sum-rec', code: DEFS['sum-rec'], tier: 1 },
    { id: 'sum-tail', name: 'sum-tail', code: DEFS['sum-tail'], tier: 1 },
    { id: 'mystery', name: 'mystery', code: DEFS.mystery, tier: 2 },
    { id: 'tr-reverse', name: 'tr-reverse', code: DEFS['tr-reverse'], tier: 2 },
    { id: 'len-rec', name: 'len-rec', tier: 2, code: '(defun len-rec (x)\n  (if (null x) 0\n      (1+ (len-rec (rest x)))))' },
    { id: 'len-tail', name: 'len-tail', tier: 2, code: '(defun len-tail (x &optional (n 0))\n  (if (null x) n\n      (len-tail (rest x) (1+ n))))' },
    { id: 'count-nums', name: 'count-nums', code: DEFS['count-nums'], tier: 3 },
    { id: 'find-it', name: 'find-it', tier: 3, code: '(defun find-it (k x)\n  (cond ((null x) nil)\n        ((= k (first x)) t)\n        (t (find-it k (rest x)))))' },
    { id: 'count-down', name: 'count-down', tier: 3, code: '(defun count-down (n)\n  (when (> n 0)\n    (print n)\n    (count-down (- n 1))))' },
    { id: 'last-line', name: 'sum-sq', tier: 3, code: '(defun sum-sq (x)\n  (if (null x) 0\n      (+ (* (first x) (first x))\n         (sum-sq (rest x)))))' }
  ];

  /* Stack Tower runs: defs + a call. `broken` removes the base case. */
  var towers = [
    { id: 'fact', fn: 'fact-rec', call: '(fact-rec 4)', tier: 1 },
    { id: 'sum', fn: 'sum-rec', call: "(sum-rec '(3 1 4))", tier: 1 },
    { id: 'fact5', fn: 'fact-rec', call: '(fact-rec 5)', tier: 2 },
    { id: 'sum5', fn: 'sum-rec', call: "(sum-rec '(2 7 1 8 2))", tier: 2 },
    { id: 'count', fn: 'count-nums', call: "(count-nums '(1 (2 3)))", tier: 3 }
  ];
  var broken = { name: 'fact-broken', code: '(defun fact-broken (n)\n  (* n (fact-broken (- n 1))))   ; no base case!', call: '(fact-broken 4)' };

  var explain = {
    'tail.notTail': { why: 'After the recursive call on line {line} returns, `{wrapper}` still has work to do with its value. The call is not the last thing the function does.', misconception: 'The call is on the last line, so it\'s tail recursive.' },
    'tail.isTail': { why: 'Every recursive call\'s value is returned directly: nothing runs after it. A running result is passed in as an argument instead.' },
    'tail.branching': { why: 'There are {k} recursive calls, and at least one feeds `{wrapper}`. Branching recursion like this can\'t all be in tail position.' }
  };

  var concepts = {
    'base-case': 'Base case and progress',
    'call-stack': 'The call stack',
    'tail-recursion': 'Tail recursion',
    'accumulator': 'Accumulator parameters',
    'tco': 'Tail call optimization',
    'branching': 'Branching recursion',
    'fib-overlap': 'Overlapping subproblems',
    'nested-lists': 'Recursion on nested lists',
    'big-o': 'Big-O (flashback)'
  };

  var briefing = {
    core: 'A recursive function solves a problem by calling itself on a smaller version of it, until it reaches a base case it can answer directly; each call waits on the stack until the smaller one returns.',
    steps: [
      { kind: 'tower', title: 'Watch the stack grow and shrink', run: { fn: 'fact-rec', call: '(fact-rec 4)' },
        text: '**FACT-REC** calls itself with n − 1 until n < 2 (the **base case**). Each call is a **stack frame** that waits for the one above it. Step through it.',
        after: 'Calls pile up until the base case answers 1. Then each waiting frame finishes its `*` and returns, unwinding the stack: 1, 2, 6, 24.' },
      { kind: 'overflow', title: 'Now remove the base case',
        text: 'Same function, but nothing ever stops the calls. Press run.',
        after: 'Without a base case (or without progress toward it), frames pile up until SBCL reports **Control stack exhausted**.' },
      { kind: 'check', title: 'Say it in one sentence',
        question: {
          id: 'brief4-core', type: 'mcq', concept: 'base-case',
          prompt: 'What does every recursive function need, so that it stops?',
          choices: [
            'A base case it answers directly, and recursive calls that move toward it',
            'A loop inside it',
            'A recursive call on its last line',
            'An accumulator parameter'
          ],
          answer: 0,
          explain: {
            correct: 'Yes. Base case + progress toward it. Without either, the stack overflows.',
            wrong: { 1: 'Recursion replaces the loop: the repetition comes from the function calling itself.', 2: 'That\'s about tail recursion, and even then you still need a base case.', 3: 'Accumulators make functions tail recursive, but they don\'t stop the recursion: the base case does.' }
          }
        } }
    ]
  };

  var games = [
    {
      id: 'tower', title: 'Stack Tower', verb: 'Push / unwind', icon: '🗼',
      blurb: 'Frames stack up and unwind. Predict each return value; remove the base case and watch the tower topple.',
      concepts: ['call-stack', 'base-case', 'tco'],
      levels: [
        { id: 'watch', mode: 'watch', title: 'Calls and returns', goal: 'Step through FACT-REC and SUM-REC on the stack.', kind: 'watch' },
        { id: 'try', mode: 'try', title: 'Predict the returns', goal: 'As the stack unwinds, say what each frame returns. Hints on.', kind: 'predict', tiers: [1, 2, 3] },
        { id: 'topple', mode: 'try', title: 'Topple the tower', goal: 'Break the base case and see what happens.', kind: 'topple' },
        { id: 'tco', mode: 'solo', title: 'Tail calls flatten the tower', goal: 'Compare FACT-REC and FACT-TAIL with tail call optimization.', kind: 'tco' }
      ]
    },
    {
      id: 'tail', title: 'Tail or Not?', verb: 'Classify', icon: '🎯',
      blurb: 'Is the recursive call the very last thing the function does? Spot the work that runs after it.',
      concepts: ['tail-recursion', 'accumulator'],
      levels: [
        { id: 'try', mode: 'try', title: 'Spot the work after the call', goal: 'Classify each function. Hints on.', kind: 'tail', count: 5, tiers: [1, 2, 3] },
        { id: 'solo', mode: 'solo', title: 'Last line, not last thing', goal: 'Six trickier functions, no hints.', kind: 'tail', count: 6, tiers: [2, 3, 3] }
      ]
    },
    {
      id: 'fib', title: 'Fib Explosion', verb: 'Expand', icon: '💥',
      blurb: 'Expand FIB-REC as a tree and watch repeated subproblems multiply. Not every branching recursion overlaps.',
      concepts: ['fib-overlap', 'branching'],
      levels: [
        { id: 'try', mode: 'try', title: 'Expand the tree', goal: 'Predict the number of calls, then expand (fib-rec 6) yourself.', kind: 'expand', tiers: [5, 6, 6] },
        { id: 'solo', mode: 'solo', title: 'Overlap or not?', goal: 'Compare FIB-REC with COUNT-NUMS, and watch the call count explode.', kind: 'overlap' }
      ]
    }
  ];

  var templates = {
    predictPrompt: 'Frame **{label}** is returning. What value does it return?',
    predictOk: 'Right: {label} returns {value}.',
    predictBad: 'Not {guess}. {label} returns {value}: {why}',
    retWhy: { 'fact-rec': 'n < 2 returns 1; otherwise it multiplies n by what the frame above returned.', 'sum-rec': 'an empty list returns 0; otherwise first + what the frame above returned.', 'count-nums': 'it adds up the counts returned by the frames above it.' },
    toppleQ: {
      prompt: 'FACT-BROKEN has no base case. What happens when you call (fact-broken 4)?',
      ok: 'It never stops calling itself. Every call adds a frame until the stack runs out: SBCL says **Control stack exhausted**.',
      misconception: 'Missing a base case just gives a wrong answer.',
      wrongAnswer: 'No answer ever comes back: there is no case that returns without calling again.',
      wrongZero: 'Even when n reaches 0 and goes negative, nothing tells it to stop.',
      wrongLoop: 'It doesn\'t loop forever quietly: each call uses stack memory, so it crashes.'
    },
    tcoQ: {
      prompt: 'With tail call optimization, how deep does the stack get for (fact-tail 8)?',
      ok: 'One frame. Each tail call has nothing left to do, so Lisp can reuse the frame instead of stacking a new one.',
      misconception: 'Tail recursion still needs one frame per call.',
      eight: 'That\'s FACT-REC\'s depth. FACT-TAIL\'s calls are in tail position, so with TCO each one replaces the last.',
      zero: 'At least one frame exists while a function runs.'
    },
    tailPrompt: 'Is **{name}** tail recursive?',
    fibPredict: 'How many calls to FIB-REC does **(fib-rec {n})** make in total, counting the first one?',
    fibOk: '{calls} calls. Each call that isn\'t a base case makes two more, and the same subproblems are solved again and again.',
    fibDone: 'Expanded! {calls} calls, but only {distinct} different subproblems. {repeats} calls were repeats.',
    overlap: {
      prompt: 'FIB-REC and COUNT-NUMS are both branching recursion. Which one recomputes the same subproblem?',
      ok: 'FIB-REC. (fib-rec 4) is computed inside (fib-rec 5) and again inside (fib-rec 6). COUNT-NUMS splits the list into first and rest: different pieces each time.',
      misconception: 'All branching recursion is exponential.',
      both: 'COUNT-NUMS branches too, but each branch gets a different part of the list, so nothing is computed twice.',
      count: 'COUNT-NUMS\'s branches work on disjoint parts of the list. FIB-REC\'s branches overlap.'
    },
    fibCurve: 'Calls made by (fib-rec n). Each step up in n multiplies the work by about 1.6: exponential.'
  };

  var trace = [
    { id: 'u4t1', type: 'predict', concept: 'call-stack', prompt: 'What does this return?', code: '(fact-rec 5)', choices: ['120', '24', '5', '15'], answer: 0,
      explain: { correct: '5 · 4 · 3 · 2 · 1 = 120, multiplied together as the stack unwinds.', wrong: { 1: 'That\'s (fact-rec 4).', 2: 'It returns the product, not n.', 3: 'That\'s 5 + 4 + 3 + 2 + 1. FACT-REC multiplies.' } },
      verify: { form: '(fact-rec 5)', expect: '120' } },
    { id: 'u4t2', type: 'predict', concept: 'nested-lists', prompt: 'How many numbers does COUNT-NUMS find?', code: "(count-nums '(1 (2 3) ((4))))", choices: ['4', '3', '1', '6'], answer: 0,
      explain: { correct: 'It recurses into every nested list: 1, 2, 3 and 4.', wrong: { 1: 'That counts top-level elements. COUNT-NUMS dives into nested lists too.', 2: 'Only 1 is a number at the top level, but nested lists are counted inside.', 3: 'Lists aren\'t counted, only numbers.' } },
      verify: { form: "(count-nums '(1 (2 3) ((4))))", expect: '4' } },
    { id: 'u4t3', type: 'predict', concept: 'nested-lists', prompt: 'What does this return?', code: "(flatten '((1 2) (3 (4))))", choices: ['(1 2 3 4)', '((1 2) (3 (4)))', '(1 2 3 (4))', '4'], answer: 0,
      explain: { correct: 'Each nested list is flattened and APPENDed, so every number ends up in one flat list.', wrong: { 1: 'That\'s the input unchanged.', 2: 'FLATTEN recurses all the way down, so (4) is flattened too.', 3: 'That\'s COUNT-NUMS\' kind of answer.' } },
      verify: { form: "(flatten '((1 2) (3 (4))))", expect: '(1 2 3 4)' } },
    { id: 'u4t4', type: 'predict', concept: 'tail-recursion', prompt: 'What does MYSTERY do?', code: "(mystery '(a b c))", choices: ['(C B A)', '(A B C)', 'C', '(B C A)'], answer: 0,
      explain: { correct: 'It appends the first element after the reversed rest: it reverses the list. (Not tail recursive: APPEND runs after the call.)', wrong: { 1: 'Each element is moved behind the result of the recursive call.', 2: 'It returns a list.', 3: 'Trace it: (mystery (b c)) is (C B), then A goes on the end.' } },
      verify: { form: "(mystery '(a b c))", expect: '(C B A)' } },
    { id: 'u4t5', type: 'fill', concept: 'accumulator', prompt: 'Fill the blank so FACT-TAIL is tail recursive and correct.', code: '(fact-tail (- n 1) ___)', choices: ['(* n f)', '(* n (fact-tail (- n 1)))', 'f', '(+ n f)'], answer: 0,
      explain: { correct: 'The running product goes in as the argument, so nothing is left to do after the call.', wrong: { 1: 'That nests a non-tail call inside the argument, which is exactly what we\'re avoiding.', 2: 'Then f never changes: (fact-tail 5) would return 1.', 3: 'Factorial multiplies.' } },
      verify: { defs: 'fill', form: '(fact-tail 6)', expect: '720' } },
    { id: 'u4t6', type: 'fill', concept: 'accumulator', prompt: 'Fill the blank in SUM-TAIL.', code: '(sum-tail (rest x) ___)', choices: ['(+ (first x) acc)', '(+ (rest x) acc)', '(first x)', 'acc'], answer: 0,
      explain: { correct: 'Add the current element to the running sum and pass it along.', wrong: { 1: '(rest x) is a list; you can\'t add it to a number.', 2: 'That throws away the running sum.', 3: 'Then nothing is ever added.' } },
      verify: { defs: 'fill', form: "(sum-tail '(6 4 2 1 3 5))", expect: '21' } },
    { id: 'u4t7', type: 'fill', concept: 'accumulator', prompt: 'Fill the blank so TR-REVERSE reverses its list.', code: '(tr-reverse (rest x) ___)', choices: ['(cons (first x) acc)', '(append acc (first x))', '(cons acc (first x))', '(rest acc)'], answer: 0,
      explain: { correct: 'Pushing each element onto the front of the accumulator reverses the order.', wrong: { 1: '(first x) isn\'t a list, and appending at the end would keep the original order.', 2: 'That builds a dotted mess: the accumulator becomes the CAR.', 3: 'That throws elements away.' } },
      verify: { defs: 'fill', form: "(tr-reverse '(1 2 3 4))", expect: '(4 3 2 1)' } },
    { id: 'u4t8', type: 'bug', concept: 'base-case', prompt: '`(fact-rec 0)` never returns: SBCL says **Control stack exhausted**. Tap the buggy line.',
      code: '(defun fact-rec (n)\n  (if (= n 1) 1\n      (* n (fact-rec (- n 1)))))', answer: [2],
      explain: { correct: 'With `(= n 1)`, a call with 0 skips the base case and counts down forever: −1, −2, … The lecture\'s `(< n 2)` catches 0 too.', wrong: { any: 'That line moves toward the base case. Which test decides when to **stop**?' } },
      interp: { defs: '(defun fact-rec (n) (if (= n 1) 1 (* n (fact-rec (- n 1)))))', form: '(fact-rec 0)', expect: 'ERROR: Control stack exhausted (no more space for function call frames).' } },
    { id: 'u4t9', type: 'predict', concept: 'fib-overlap', prompt: 'How many times is FIB-REC called in total?', code: "(let ((calls 0))\n  (defun fib-count (n)\n    (incf calls)\n    (if (<= n 2) 1\n        (+ (fib-count (- n 1)) (fib-count (- n 2)))))\n  (fib-count 6)\n  calls)",
      choices: ['15', '6', '8', '11'], answer: 0,
      explain: { correct: '(fib 6) → (fib 5) + (fib 4), and so on: 15 calls for an answer of 8. The count grows exponentially.', wrong: { 1: 'That would be one call per value of n. Each call branches into two.', 2: '8 is the answer, not the number of calls.', 3: 'Count the whole tree: 1 + 2 + 4 + … minus the missing branches.' } },
      misconception: 'Naive Fibonacci makes one call per number.',
      verify: { form: '(let ((calls 0)) (labels ((fib-count (n) (incf calls) (if (<= n 2) 1 (+ (fib-count (- n 1)) (fib-count (- n 2)))))) (fib-count 6)) calls)', expect: '15' }, interpSkip: true },
    { id: 'u4t10', type: 'mcq', concept: 'tco', prompt: 'Why can Lisp run `(fact-tail 1000000)` but not `(fact-rec 1000000)`?',
      choices: ['Lisp optimizes tail calls, so FACT-TAIL doesn\'t grow the stack', 'FACT-TAIL makes fewer calls', 'FACT-REC is O(n²)', 'FACT-TAIL uses a loop'], answer: 0,
      explain: { correct: 'Both make a million calls. Tail call optimization reuses the frame for FACT-TAIL; FACT-REC needs every frame because each still has a `*` to finish.', wrong: { 1: 'Both make n calls. The difference is how many frames stay on the stack.', 2: 'Both are O(n) in calls; the problem is stack depth, not time.', 3: 'It\'s recursive in the source; the compiler turns the tail call into a jump.' } },
      misconception: 'Tail recursion makes fewer calls.' }
  ];

  var boss = [
    { id: 'u4b1', type: 'task', task: 'tower', concept: 'call-stack', run: { fn: 'sum-rec', call: "(sum-rec '(5 2 6))" }, prompt: 'Hands-on: predict each frame\'s return value as SUM-REC unwinds.' },
    { id: 'u4b2', type: 'mcq', concept: 'tail-recursion', prompt: 'Is this tail recursive?', code: '(defun len-rec (x)\n  (if (null x) 0\n      (1+ (len-rec (rest x)))))',
      choices: ['No: 1+ runs after the call returns', 'Yes: the call is on the last line', 'Yes: it has a base case', 'No: it has no accumulator, so it can\'t be'], answer: 0,
      explain: { correct: 'The recursive call\'s value is handed to 1+, so there is still work after it.', wrong: { 1: 'Being on the last line isn\'t enough: 1+ still runs on its result.', 2: 'Every recursive function needs a base case; that says nothing about tail position.', 3: 'The real reason is the 1+ after the call. (An accumulator is the usual fix.)' } },
      misconception: 'The call is on the last line, so it\'s tail recursive.' },
    { id: 'u4b3', type: 'predict', concept: 'nested-lists', prompt: 'What does this return?', code: "(count-nums '((1 2) 3 ((4 5))))", choices: ['5', '3', '2', '4'], answer: 0,
      explain: { correct: '1, 2, 3, 4, 5: COUNT-NUMS recurses into every nested list.', wrong: { 1: 'That counts top-level elements only.', 2: 'Only 3 is a number at the top level, but nested numbers count too.', 3: 'Count again: 1, 2, 3, 4, 5.' } },
      verify: { form: "(count-nums '((1 2) 3 ((4 5))))", expect: '5' } },
    { id: 'u4b4', type: 'mcq', concept: 'fib-overlap', prompt: '(fib-rec 30) makes about 1.6 million calls. Why so many?',
      choices: ['The same subproblems are recomputed over and over', 'Recursion is always slow', 'Each call has a big stack frame', 'Lisp has no tail call optimization'], answer: 0,
      explain: { correct: 'Two branches per call, and they overlap: (fib 28) is computed by both (fib 30)\'s and (fib 29)\'s branches, and so on down.', wrong: { 1: 'COUNT-NUMS and binary search branch too, without exploding: their subproblems don\'t overlap.', 2: 'Frame size affects memory, not the number of calls.', 3: 'Lisp does optimize tail calls, but FIB-REC\'s calls are not in tail position, and the problem is the count of calls.' } },
      misconception: 'Recursion is always slow.' },
    { id: 'u4b5', type: 'fill', concept: 'accumulator', prompt: 'Make LEN-TAIL tail recursive.', code: '(len-tail (rest x) ___)', choices: ['(1+ n)', '(1+ (len-tail (rest x)))', 'n', '(rest n)'], answer: 0,
      explain: { correct: 'Count one more and pass it along: no work left after the call.', wrong: { 1: 'That puts a non-tail recursive call inside the argument.', 2: 'Then the count never grows.', 3: 'n is a number, not a list.' } },
      verify: { defs: '(defun len-tail (x &optional (n 0)) (if (null x) n (len-tail (rest x) (1+ n))))', form: "(len-tail '(a b c d))", expect: '4' } },
    { id: 'u4b6', type: 'predict', concept: 'call-stack', prompt: 'What does the REPL print?', code: "(tr-reverse '(x y z))", choices: ['(Z Y X)', '(X Y Z)', '(Z Y . X)', 'Z'], answer: 0,
      explain: { correct: 'Each element is CONSed onto the accumulator, which reverses the order.', wrong: { 1: 'CONS adds to the front, so the order flips.', 2: 'The accumulator starts as NIL, so the result is a proper list.', 3: 'It returns the whole accumulator.' } },
      verify: { form: "(tr-reverse '(x y z))", expect: '(Z Y X)' } },
    { id: 'u4b7', type: 'bigo', concept: 'big-o', flashback: 'Unit 2 · Big-O', prompt: 'How many calls does (fact-rec n) make, as Big-O?', code: DEFS['fact-rec'],
      choices: ['O(n)', 'O(2ⁿ)', 'O(n²)', 'O(1)'], answer: 0,
      explain: { correct: 'One call per value of n down to 1: linear recursion, n calls.', wrong: { 1: 'Only FIB-REC-style branching with overlap is exponential. FACT-REC makes one call per level.', 2: 'Each call does O(1) work besides its one recursive call.', 3: 'The number of calls grows with n.' } } },
    { id: 'u4b8', type: 'mcq', concept: 'branching', flashback: 'Unit 5 · Binary search', prompt: 'Binary search can be written recursively. Does it suffer from FIB-REC\'s explosion?',
      choices: ['No: it makes one call on one half, with no overlap', 'Yes: all recursion branches', 'Yes: it calls itself on both halves', 'Only on unsorted data'], answer: 0,
      explain: { correct: 'Each call recurses into one half and discards the other: O(log n) calls, nothing recomputed.', wrong: { 1: 'Linear recursion (one call per level) never explodes like that.', 2: 'It only searches the half that can hold the key.', 3: 'Sortedness affects correctness, not the number of calls.' } } }
  ];

  var cards = {
    'u4-base': { title: 'Base case + progress', unit: 4, def: 'Every recursive function needs a base case it answers directly, and recursive calls on a **smaller** problem that move toward it.', cost: 'No base case → Control stack exhausted', lisp: '(if (< n 2) 1 (* n (fact-rec (- n 1))))' },
    'u4-stack': { title: 'The call stack', unit: 4, def: 'Each call pushes a stack frame (its parameters and locals) that waits for the calls above it to return.', cost: 'Linear recursion depth n uses n frames', lisp: '(sum-rec (rest x))  ; one more frame' },
    'u4-tail': { title: 'Tail recursion', unit: 4, def: 'The recursive call is the last thing the function does: its value is returned directly, with no work after it.', cost: 'Lisp optimizes tail calls (TCO): one frame, no overflow. Python doesn\'t.', lisp: '(fact-tail (- n 1) (* n f))' },
    'u4-acc': { title: 'Accumulator parameter', unit: 4, def: 'Pass the running result as an extra (&optional) parameter so the call can be in tail position.', cost: 'fact, list sum, reverse', lisp: '(defun sum-tail (x &optional (acc 0)) ...)' },
    'u4-fib': { title: 'Overlapping subproblems', unit: 4, def: 'Naive FIB-REC recomputes the same subproblems: exponential calls. Branching without overlap (binary search, FLATTEN) is fine.', cost: '(fib-rec n) makes 2·fib(n) − 1 calls', lisp: '(+ (fib-rec (- n 1)) (fib-rec (- n 2)))' }
  };

  C.unitData[4] = {
    id: 4, title: 'Recursion', room: 'The Mirror Hall', bossTitle: 'The Infinite Mirror',
    intro: 'The Mirror Hall\'s reflections never stop, and the building keeps running out of stack. Teach it where to stop.',
    defs: DEFS, lisp: lisp, tailSnippets: tailSnippets, towers: towers, broken: broken,
    explain: explain, prompts: {}, templates: templates, concepts: concepts, briefing: briefing,
    games: games, trace: trace, boss: boss, cards: cards,
    summary: { canExplain: [
      'Why every recursive function needs a base case and progress toward it.',
      'How the call stack grows with each call and unwinds as calls return.',
      'Why a call on the last line isn\'t necessarily a tail call.',
      'How an accumulator makes factorial, list sum and reverse tail recursive, and why that matters in Lisp.',
      'Why naive Fibonacci is exponential, and why branching recursion isn\'t always.'
    ] }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
