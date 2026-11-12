/* CPS305 Quest — content/unit7.js
 * Unit 7: Merge sort (Topic 7). DATA ONLY. Games run engine/sorts2.js
 * (E.mergeLists mirrors the lecture's MERGE-LISTS; E.mergeSort is the array version).
 */
(function (root) {
  'use strict';
  var C = root.CQ.content;

  var MERGE_LISTS = [
    '(defun merge-lists (l1 l2 comp)',
    '  "Merges the sorted lists l1 and l2 and returns the sorted resulting list"',
    '  (let ((res ()))                       ; result starts as empty list',
    '    (do ()                              ; no var initializations, no result-form',
    '        ((and (null l1) (null l2)))     ; exit when both inputs are empty',
    '      (let ((i1 (first l1))             ; get first element of each list',
    '            (i2 (first l2)))',
    '        (cond ((null i1)                ; i1 NIL, take rest of i2',
    '               (dolist (i l2) (push i res))',
    '               (return))',
    '              ((null i2)                ; i2 NIL, take rest of i1',
    '               (dolist (i l1) (push i res))',
    '               (return))',
    '              ((funcall comp i1 i2)     ; i1 appears before i2 in sorted list',
    '               (push i1 res)',
    '               (setf l1 (rest l1)))',
    '              (t                        ; i2 appears before i1 in sorted list',
    '               (push i2 res)',
    '               (setf l2 (rest l2))))))',
    '    (reverse res)))                     ; we\'ve been prepending, must reverse'
  ].join('\n');
  var MERGE_SORT = [
    '(defun merge-sort (list comp)',
    '  "Sorts the list comparing items using comp"',
    '  (if (null (rest list)) list           ; one element, already sorted',
    '      (let ((half (floor (length list) 2)))',
    '        (merge-lists (merge-sort (subseq list 0 half) comp)',
    '                     (merge-sort (subseq list half) comp)',
    '                     comp))))'
  ].join('\n');
  var lisp = {
    mergeLists: { title: 'MERGE-LISTS (lecture)', code: MERGE_LISTS, anchors: { decide: 14, rest: 9, took: 15, done: 20 } },
    mergeSort: { title: 'MERGE-SORT (lecture)', code: MERGE_SORT, anchors: { split: 4, merged: 5, done: 1 } }
  };

  var concepts = {
    'merge-step': 'Merging two sorted lists',
    'merge-cost': 'Merge cost O(n1 + n2)',
    'split-tree': 'log n levels × n work',
    'extra-memory': 'O(n) extra memory',
    'hybrid': 'Hybrid with insertion sort',
    'linked-lists': 'Merge sort suits linked lists',
    'flashback': 'Earlier units (flashback)'
  };

  var briefing = {
    core: 'Merge sort splits the list in half until pieces have one element, then merges sorted pieces back together; every level of merging costs about n, and there are log₂ n levels, so it is O(n log n) on every input.',
    steps: [
      { kind: 'mergeDemo', title: 'Merging is easy', text: 'Two lists that are **already sorted**. To merge them, keep comparing their two **fronts** and take the smaller. Press step.',
        after: 'Each comparison places one element, so merging lists of n1 and n2 elements costs at most n1 + n2 − 1 comparisons. When one list runs out, the rest of the other is copied over.' },
      { kind: 'splitDemo', title: 'Split until it\'s trivial', text: 'Merge sort splits the list in half, again and again, until every piece has one element (already sorted). Then it merges back up.',
        after: 'There are log₂ n levels of splitting, and each level of merging touches all n elements: n · log₂ n. The comparisons happen while **merging**, not while splitting.' },
      { kind: 'check', title: 'Say it in one sentence',
        question: { id: 'brief7-core', type: 'mcq', concept: 'split-tree', prompt: 'Why is merge sort O(n log n)?',
          choices: ['There are log₂ n levels of halving, and merging each level costs about n', 'Splitting each list costs log n', 'It compares each element log n times on average, but only on random input', 'It uses binary search to merge'], answer: 0,
          explain: { correct: 'Yes, and that holds on every input: sorted, reversed or random.', wrong: { 1: 'Splitting doesn\'t compare anything. The work is in merging.', 2: 'Merge sort is O(n log n) on every input, not just random.', 3: 'Merging walks two fronts; no binary search.' } } } }
    ]
  };

  var games = [
    {
      id: 'conveyor', title: 'Merge Conveyor', verb: 'Pick the front', icon: '🛤',
      blurb: 'Two sorted conveyor belts feed one output. Pick which front element goes next, exactly like MERGE-LISTS.',
      concepts: ['merge-step', 'merge-cost'],
      levels: [
        { id: 'try', mode: 'try', title: 'Two sorted belts', goal: 'Merge two sorted lists. Hints on.', kind: 'conveyor', tiers: [3, 4, 5] },
        { id: 'solo', mode: 'solo', title: 'Ties and leftovers', goal: 'Bigger belts with equal values, no hints.', kind: 'conveyor', dupes: true, tiers: [5, 6, 7] }
      ]
    },
    {
      id: 'splittree', title: 'Split and Merge Tree', verb: 'Watch the levels', icon: '🌲',
      blurb: 'Watch the list split down to single elements, then merge back up, with the comparison count of each level.',
      concepts: ['split-tree', 'extra-memory'],
      levels: [
        { id: 'watch', mode: 'watch', title: 'Down and back up', goal: 'Predict the number of levels, then step through the tree.', kind: 'tree', tiers: [8, 8, 16] },
        { id: 'solo', mode: 'solo', title: 'Any input, same cost', goal: 'Sorted, reversed, random: predict merge sort\'s comparisons.', kind: 'inputs' }
      ]
    },
    {
      id: 'threshold', title: 'Threshold Slider', verb: 'Slide the cutoff', icon: '🎚',
      blurb: 'Switch to insertion sort below a size cutoff. The count changes; the growth curve doesn\'t.',
      concepts: ['hybrid'],
      levels: [
        { id: 'try', mode: 'try', title: 'Hybrid merge sort', goal: 'Find a cutoff that helps, and check the Big-O.', kind: 'threshold' }
      ]
    }
  ];

  var templates = {
    conveyorPrompt: 'Fronts: **{a}** and **{b}**. Which goes to the output next?',
    conveyorWhy: 'MERGE-LISTS takes i1 if `(funcall comp i1 i2)` is true, otherwise i2. With `<`, take {a} only if {a} < {b}.',
    conveyorWrong: '{take} goes first: {reason}',
    conveyorTie: '{a} and {b} are equal. `(< i1 i2)` is false on a tie, so the lecture\'s code takes i2: the element from the **second** list.',
    conveyorDone: 'Merged {n} elements with {c} comparisons (at most n1 + n2 − 1 = {max}).',
    levelsQ: 'Merge sort on {n} elements: how many levels of splitting (below the full list) until every piece has one element?',
    levelsOk: 'log₂ {n} = {lv}. Each level halves the piece size: {chain}.',
    inputsQ: 'Merge sort gets {n} elements that are **{kind}**. Roughly how many comparisons, compared with a random input?',
    hybridQ: 'Switching to insertion sort for pieces of 8 or fewer: what happens to merge sort\'s Big-O?',
    hybridOk: 'Still O(n log n). Insertion sort on pieces of at most k elements costs at most k² per piece, a constant, and there are about n/k pieces.',
    misconceptionHybrid: 'The hybrid version changes the complexity class.'
  };

  var trace = [
    { id: 'u7t1', type: 'predict', concept: 'merge-step', prompt: 'What does this return?', code: "(merge-lists '(1 4 9) '(2 3 10) #'<)", choices: ['(1 2 3 4 9 10)', '(1 4 9 2 3 10)', '(10 9 4 3 2 1)', '(1 2 3 4 9)'], answer: 0,
      explain: { correct: 'Fronts are compared, the smaller is pushed, and RES is reversed at the end.', wrong: { 1: 'That just appends the lists. MERGE-LISTS interleaves them in order.', 2: 'It PUSHes (prepending) but then REVERSEs the result.', 3: 'Leftovers are copied too: 10 is not lost.' } },
      verify: { form: "(merge-lists '(1 4 9) '(2 3 10) #'<)", expect: '(1 2 3 4 9 10)' } },
    { id: 'u7t2', type: 'predict', concept: 'split-tree', prompt: 'What does this return?', code: "(merge-sort '(38 27 43 3 9 82 10) #'<)", choices: ['(3 9 10 27 38 43 82)', '(82 43 38 27 10 9 3)', '(38 27 43 3 9 82 10)', '(3 27 38 43 9 10 82)'], answer: 0,
      explain: { correct: 'Split down to single elements, merge back up: sorted ascending with #\'<.', wrong: { 1: 'That would be #\'>.', 2: 'It returns a new sorted list.', 3: 'That\'s two sorted halves, not yet merged.' } },
      verify: { form: "(merge-sort '(38 27 43 3 9 82 10) #'<)", expect: '(3 9 10 27 38 43 82)' } },
    { id: 'u7t3', type: 'predict', concept: 'merge-cost', prompt: 'How many times is COMP called?', code: "(let ((c 0))\n  (merge-lists '(1 2) '(3 4 5 6)\n               (lambda (a b) (incf c) (< a b)))\n  c)", choices: ['2', '6', '5', '4'], answer: 0,
      explain: { correct: '1 vs 3, then 2 vs 3. Then L1 is empty, and the rest of L2 is copied without comparing.', wrong: { 1: 'Leftovers are copied with DOLIST, no comparisons.', 2: 'n1 + n2 − 1 is the most it could be, not what happens here.', 3: 'Once L1 runs out, there is nothing left to compare.' } },
      verify: { form: "(let ((c 0)) (merge-lists '(1 2) '(3 4 5 6) (lambda (a b) (incf c) (< a b))) c)", expect: '2' } },
    { id: 'u7t4', type: 'fill', concept: 'linked-lists', prompt: 'MERGE-LISTS PUSHes onto RES (prepending). Fill the blank so it returns the right order.', code: '(___ res)))', choices: ['reverse', 'first', 'rest', 'length'], answer: 0,
      explain: { correct: 'PUSH puts each new element at the front, so RES is backwards until it\'s reversed.', wrong: { 1: 'That returns only one element.', 2: 'That drops the first element.', 3: 'That returns a number.' } },
      verify: { defs: 'fill', form: "(merge-lists '(5 7) '(6) #'<)", expect: '(5 6 7)' } },
    { id: 'u7t5', type: 'mcq', concept: 'split-tree', prompt: 'When does merge sort compare elements?', choices: ['While merging', 'While splitting', 'Both, equally', 'Only at the base case'], answer: 0,
      explain: { correct: 'Splitting just cuts a list in half. All comparisons happen in MERGE-LISTS.', wrong: { 1: 'SUBSEQ cuts by position; it never looks at values.', 2: 'Splitting makes no comparisons at all.', 3: 'A one-element list needs no comparisons.' } },
      misconception: 'The comparisons happen while splitting.' },
    { id: 'u7t6', type: 'mcq', concept: 'extra-memory', prompt: 'Does array merge sort run in place?', choices: ['No: merging needs an O(n) auxiliary array', 'Yes, like quicksort', 'Yes, it only swaps neighbours', 'It needs O(n²) extra memory'], answer: 0,
      explain: { correct: 'The two halves are copied into a helper array (or new lists) while merging.', wrong: { 1: 'Quicksort can run in place; merge sort\'s merge step needs room for the output.', 2: 'That\'s bubble sort. Merge sort moves elements into a new array.', 3: 'One helper array of size n is enough.' } },
      misconception: 'Merge sort works in place.' },
    { id: 'u7t7', type: 'bigo', concept: 'split-tree', prompt: 'Merge sort on an already sorted list of n elements is…', choices: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'], answer: 0,
      explain: { correct: 'It splits and merges the same way on every input: O(n log n), always.', wrong: { 1: 'That\'s insertion sort\'s best case. Merge sort doesn\'t notice sortedness.', 2: 'Merge sort never degrades to O(n²).', 3: 'Every element has to be placed at every level.' } } },
    { id: 'u7t8', type: 'bug', concept: 'split-tree', prompt: '`(merge-sort \'(5) #\'<)` never returns: Control stack exhausted. Tap the buggy line.',
      code: "(defun merge-sort (list comp)\n  (if (null list) list\n      (let ((half (floor (length list) 2)))\n        (merge-lists (merge-sort (subseq list 0 half) comp)\n                     (merge-sort (subseq list half) comp)\n                     comp))))", answer: [2],
      explain: { correct: 'A one-element list has half = 0, so the second call gets the same one-element list again, forever. The base case must be "one element": `(null (rest list))`.', wrong: { any: 'That line matches the lecture. Which test decides when to stop?' } },
      interp: { defs: "(defun merge-sort (list comp) (if (null list) list (let ((half (floor (length list) 2))) (merge-lists (merge-sort (subseq list 0 half) comp) (merge-sort (subseq list half) comp) comp))))", form: "(merge-sort '(5) #'<)", expect: 'ERROR: Control stack exhausted (no more space for function call frames).' } },
    { id: 'u7t9', type: 'mcq', concept: 'hybrid', prompt: 'A hybrid merge sort uses insertion sort below 16 elements. Its Big-O is…', choices: ['Still O(n log n)', 'O(n²), because insertion sort is O(n²)', 'O(n)', 'O(n log n) only on sorted input'], answer: 0,
      explain: { correct: 'Insertion sort runs only on pieces of bounded size: constant cost per piece. Real libraries (Timsort) do something similar for speed.', wrong: { 1: 'Insertion sort is O(k²) on pieces of size k ≤ 16: a constant. The O(n log n) merging still dominates.', 2: 'Merging still costs n per level.', 3: 'Merge sort\'s cost doesn\'t depend on the input order.' } },
      misconception: 'The hybrid version changes the complexity class.' },
    { id: 'u7t10', type: 'mcq', concept: 'linked-lists', prompt: 'Why does merge sort suit linked lists?', choices: ['It only needs FIRST, REST and PUSH-style operations, no random access', 'Linked lists are faster to index', 'It sorts in place by swapping', 'It needs a hash table'], answer: 0,
      explain: { correct: 'Merging walks the fronts of two lists: exactly what linked lists are good at.', wrong: { 1: 'Linked lists are slow to index (O(n)). Merge sort doesn\'t need indexing.', 2: 'MERGE-LISTS builds a new list rather than swapping.', 3: 'No hashing involved.' } } }
  ];

  var boss = [
    { id: 'u7b1', type: 'task', task: 'conveyor', concept: 'merge-step', a: [2, 5, 7, 11], b: [1, 5, 8], prompt: 'Hands-on: merge these belts exactly like MERGE-LISTS with #\'<.' },
    { id: 'u7b2', type: 'mcq', concept: 'merge-cost', prompt: 'Merging two sorted lists of 50 and 30 elements costs at most…', choices: ['79 comparisons', '1500 comparisons', '80 comparisons', '50 comparisons'], answer: 0,
      explain: { correct: 'Each comparison outputs one element; the very last element needs no comparison: n1 + n2 − 1.', wrong: { 1: 'That\'s n1 × n2: comparing every pair. Merging only compares the fronts.', 2: 'The last element is placed without a comparison.', 3: 'Both lists contribute.' } } },
    { id: 'u7b3', type: 'mcq', concept: 'split-tree', prompt: 'Merge sort on 1024 elements has how many levels of merging?', choices: ['10', '1024', '512', '32'], answer: 0,
      explain: { correct: 'log₂ 1024 = 10: halving ten times reaches pieces of size 1.', wrong: { 1: 'That\'s n, not the number of halvings.', 2: 'That\'s n/2.', 3: 'That\'s √1024.' } } },
    { id: 'u7b4', type: 'predict', concept: 'merge-step', prompt: 'What does this return?', code: "(merge-sort '(5 1 4) #'>)", choices: ['(5 4 1)', '(1 4 5)', '(5 1 4)', '(4 5 1)'], answer: 0,
      explain: { correct: 'With #\'> the larger front is taken first: descending.', wrong: { 1: 'That\'s #\'<.', 2: 'It is sorted, not left as is.', 3: 'Check the merge of (5) with (1 4)… then descending.' } },
      verify: { form: "(merge-sort '(5 1 4) #'>)", expect: '(5 4 1)' } },
    { id: 'u7b5', type: 'mcq', concept: 'extra-memory', prompt: 'Which statement is true?', choices: ['Merge sort is O(n log n) on every input but needs O(n) extra memory', 'Merge sort is in place and O(n log n)', 'Merge sort is O(n²) on reversed input', 'Merge sort compares while splitting'], answer: 0,
      explain: { correct: 'Guaranteed O(n log n), at the price of a helper array.', wrong: { 1: 'Merging needs extra space.', 2: 'Reversed input costs the same as any other.', 3: 'Comparisons happen while merging.' } } },
    { id: 'u7b6', type: 'mcq', concept: 'hybrid', prompt: 'Raising the insertion-sort cutoff from 1 to 8 on random input usually…', choices: ['Changes the comparison count a bit, but keeps the n log n growth', 'Makes merge sort O(n²)', 'Makes merge sort O(n)', 'Has no effect at all'], answer: 0,
      explain: { correct: 'It\'s a constant-factor tweak; the curve keeps its shape.', wrong: { 1: 'Insertion sort runs only on small pieces.', 2: 'Merging still dominates.', 3: 'It does change the count: try the Threshold Slider.' } },
      misconception: 'The hybrid version changes the complexity class.' },
    { id: 'u7b7', type: 'mcq', concept: 'flashback', flashback: 'Unit 4 · Recursion', prompt: 'MERGE-SORT calls itself twice. Is it like naive FIB-REC (exponential)?', choices: ['No: the two calls work on disjoint halves, nothing is recomputed', 'Yes: two calls per level is exponential', 'Yes, but only on sorted input', 'No, because it is tail recursive'], answer: 0,
      explain: { correct: 'Branching recursion is only explosive when subproblems overlap. The halves don\'t overlap.', wrong: { 1: 'Two calls on halves give log n levels with n work each, not 2ⁿ.', 2: 'Input order doesn\'t change the call tree.', 3: 'It isn\'t tail recursive: MERGE-LISTS runs after both calls return.' } } },
    { id: 'u7b8', type: 'mcq', concept: 'flashback', flashback: 'Unit 5 · Insertion sort', prompt: 'Why is insertion sort the usual choice for the small pieces in a hybrid?', choices: ['It is simple and fast on tiny or nearly sorted inputs', 'It is O(n log n)', 'It needs no comparisons', 'It is the only stable sort'], answer: 0,
      explain: { correct: 'Low overhead and O(n) on nearly sorted data.', wrong: { 1: 'Insertion sort is O(n²) in the worst case; on tiny inputs that doesn\'t matter.', 2: 'It compares neighbours.', 3: 'Bubble sort is stable too (with strict <).' } } }
  ];

  var cards = {
    'u7-merge': { title: 'Merging', unit: 7, def: 'Compare the fronts of two sorted lists, take the smaller, repeat; copy the leftovers.', cost: 'O(n1 + n2) time, O(n) extra memory', lisp: '((funcall comp i1 i2) (push i1 res) ...)' },
    'u7-sort': { title: 'Merge sort', unit: 7, def: 'Split in halves until size 1, then merge back up. log₂ n levels × ~n work per level.', cost: 'O(n log n) on every input', lisp: '(merge-lists (merge-sort left) (merge-sort right) comp)' },
    'u7-hybrid': { title: 'Hybrid merge sort', unit: 7, def: 'Below a size cutoff, use insertion sort. Same Big-O, faster in practice (Timsort does similar).', cost: 'Constant-factor change only', lisp: '; (if (<= (length list) k) (insertion-sort ...) ...)' }
  };

  C.unitData[7] = {
    id: 7, title: 'Merge sort', room: 'The Conveyor Room', bossTitle: 'The Belt Boss',
    intro: 'The Conveyor Room merges parcels from two belts, but the sorter keeps jamming. Merge them right, then sort anything by splitting and merging.',
    lisp: lisp, explain: {}, prompts: {
      'merge.prompt': 'Fronts {l} and {r}: which goes next?', 'merge.hint': 'Take the left one only if left < right.'
    }, templates: templates, concepts: concepts, briefing: briefing, games: games, trace: trace, boss: boss, cards: cards,
    summary: { canExplain: [
      'How merging two sorted lists works, and why it costs at most n1 + n2 − 1 comparisons.',
      'Why merge sort is O(n log n) on every input: log₂ n levels × n work per level.',
      'Where the comparisons happen (merging, not splitting).',
      'Why merge sort needs O(n) extra memory.',
      'Why a hybrid with insertion sort is faster in practice but keeps the same Big-O.'
    ] }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
