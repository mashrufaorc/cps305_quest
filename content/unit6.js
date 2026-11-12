/* CPS305 Quest — content/unit6.js
 * Unit 6: Quicksort (Topic 6). DATA ONLY. Games run engine/sorts2.js
 * (Lomuto and Hoare partitions); the Lisp panels match lisp/unit6.lisp.
 */
(function (root) {
  'use strict';
  var C = root.CQ.content;

  var QUICKSORT = [
    '(defun quicksort (vec comp)',
    '  (when (> (length vec) 1)',
    '    (let ((ppvt 0)',
    '          (pivot (aref vec (1- (length vec)))))  ; last element',
    '      (dotimes (i (1- (length vec)))             ; finds position of the pivot',
    '        (when (funcall comp (aref vec i) pivot)',
    '          (rotatef (aref vec i) (aref vec ppvt))',
    '          (incf ppvt)))',
    '      ;; swap the pivot (last element) to its proper place',
    '      (rotatef (aref vec (1- (length vec))) (aref vec ppvt))',
    '      (quicksort (rtl:slice vec 0 ppvt) comp)          ; sort left',
    '      (quicksort (rtl:slice vec (1+ ppvt)) comp)))     ; sort right',
    '  vec)'
  ].join('\n');
  var HOARE = [
    '(defun hoare-partition (vec lo hi comp)',
    '  (let ((pivot (aref vec lo))       ; first element',
    '        (i (1- lo))',
    '        (j (1+ hi)))',
    '    (loop',
    '      (loop (incf i) (unless (funcall comp (aref vec i) pivot) (return)))',
    '      (loop (decf j) (unless (funcall comp pivot (aref vec j)) (return)))',
    '      (when (>= i j) (return j))',
    '      (rotatef (aref vec i) (aref vec j)))))',
    '',
    '(defun quicksort-hoare (vec comp &optional (lo 0) (hi (1- (length vec))))',
    '  (when (< lo hi)',
    '    (let ((p (hoare-partition vec lo hi comp)))',
    '      (quicksort-hoare vec comp lo p)',
    '      (quicksort-hoare vec comp (1+ p) hi)))',
    '  vec)'
  ].join('\n');

  var lisp = {
    quickLomuto: { title: 'QUICKSORT, Lomuto partition (lecture)', code: QUICKSORT, anchors: { start: 2, partition: 4, compare: 6, swap: 7, place: 10, done: 13 } },
    quickHoare: { title: 'Hoare partition (in the lecture\'s style)', code: HOARE, anchors: { start: 12, partition: 2, iStop: 6, jStop: 7, 'return': 8, swap: 9, done: 16 } }
  };

  var explain = {
    'lomuto.shouldSwap': { why: '{v} < {p}, so it belongs on the left: `(funcall comp (aref vec i) pivot)` is true, ROTATEF swaps it into slot {i}, and ppvt moves right.' },
    'lomuto.shouldSkip': { why: '{v} is not less than the pivot {p}, so it stays where it is (it belongs on the right).' },
    'lomuto.equal': { why: '{v} equals the pivot. `(< {v} {p})` is false, so it stays: equal elements end up on the right.' },
    'lomuto.place': { why: 'After the scan, everything left of slot {i} is smaller than the pivot. The final ROTATEF puts the pivot in slot **{i}**: its final position.', misconception: 'The pivot stays where it started.' },
    'hoare.iWrong': { why: 'i moves right from its start and stops at the first element **≥ {p}**. That\'s slot {exp} ({ve}).' },
    'hoare.jWrong': { why: 'j moves left and stops at the first element **≤ {p}**. That\'s slot {exp} ({ve}).' },
    'hoare.shouldSwap': { why: 'i ({i}) is still left of j ({j}): those two elements are on the wrong sides, so swap them and keep going.' },
    'hoare.shouldReturn': { why: 'i ({i}) has met or passed j ({j}): partitioning is done, return j. Note the pivot need not be in its final place.', misconception: 'The pivot always ends in its final position.' },
    'merge.wrong': { why: '{take} goes first: MERGE takes the left front only if left < right.' },
    'merge.tie': { why: 'A tie: `(< i1 i2)` is false, so the right front ({r}) is taken.' }
  };
  var prompts = {
    'lomuto.prompt': 'Compare {v} with the pivot {p}. Swap it into slot i = {i}, or leave it?',
    'lomuto.hint': 'Swap only if {v} < {p}.',
    'lomuto.placePrompt': 'Scan done. Where does the pivot {p} land?',
    'lomuto.placeHint': 'Slot i = ppvt = {i}: everything before it is smaller.',
    'hoare.iPrompt': 'Move i right. Where does it stop? (pivot {p})',
    'hoare.iHint': 'i stops at the first element ≥ {p}.',
    'hoare.jPrompt': 'Move j left. Where does it stop? (pivot {p})',
    'hoare.jHint': 'j stops at the first element ≤ {p}.',
    'hoare.decide': 'i = {i}, j = {j}. Swap them, or return j?',
    'hoare.decideHint': 'If i ≥ j, return j. Otherwise swap.'
  };

  var concepts = {
    'lomuto': 'Lomuto partition',
    'hoare': 'Hoare partition',
    'pivot-choice': 'Pivot choice',
    'worst-case': 'Sorted input: the O(n²) case',
    'quick-props': 'Properties: in place, not stable',
    'flashback': 'Earlier units (flashback)'
  };

  var briefing = {
    core: 'Quicksort picks a pivot, partitions the array so smaller elements go left and larger go right, then sorts both sides recursively; good pivots split evenly (O(n log n)), bad ones split 1 and n−1 (O(n²)).',
    steps: [
      { kind: 'partitionDemo', title: 'One partition', text: 'Lomuto\'s partition uses the **last** element as the pivot. Step through one partition of this array.',
        after: 'Everything smaller than the pivot ended up on its left, everything else on its right, and the pivot is in its **final** position. Now each side is sorted the same way, recursively. Base case: size 0 or 1.' },
      { kind: 'treeDemo', title: 'Balanced or lopsided?', text: 'The same idea, two inputs: random, and already **sorted**. Compare the recursion trees.',
        after: 'On sorted input, the last element is always the largest: each split is n−1 and 0. That\'s n levels: O(n²). Good pivots give log n levels: O(n log n).' },
      { kind: 'check', title: 'Say it in one sentence',
        question: { id: 'brief6-core', type: 'mcq', concept: 'pivot-choice', prompt: 'What makes quicksort fast or slow?',
          choices: ['How evenly the pivot splits each subarray', 'Whether the array has duplicates', 'How many swaps the partition makes', 'Whether it is written recursively'], answer: 0,
          explain: { correct: 'Even splits → log n levels → O(n log n). Lopsided splits → n levels → O(n²).', wrong: { 1: 'Duplicates matter a little; the split balance matters most.', 2: 'Swaps cost something, but the number of levels dominates.', 3: 'An iterative quicksort has the same cost.' } } } }
    ]
  };

  var games = [
    {
      id: 'dance', title: 'Partition Dance', verb: 'Move i and j', icon: '💃',
      blurb: 'Run the partition yourself: Lomuto (pivot last, one scan) and Hoare (pivot first, i and j move inward). The game checks every move.',
      concepts: ['lomuto', 'hoare'],
      levels: [
        { id: 'lomuto', mode: 'try', title: 'Lomuto', goal: 'Swap smaller elements into slot i, then place the pivot. Hints on.', kind: 'dance', algo: 'quickLomuto', tiers: [5, 6, 7] },
        { id: 'hoare', mode: 'try', title: 'Hoare', goal: 'Stop i and j, swap or return j. Hints on.', kind: 'dance', algo: 'quickHoare', tiers: [5, 6, 7] },
        { id: 'solo', mode: 'solo', title: 'Solo partition', goal: 'Lomuto or Hoare, no hints.', kind: 'dance', algo: 'mixed', tiers: [6, 7, 8] }
      ]
    },
    {
      id: 'picker', title: 'Pivot Picker', verb: 'Choose pivots', icon: '🎯',
      blurb: 'Choose the pivot for every subarray and watch the recursion tree turn balanced or lopsided.',
      concepts: ['pivot-choice', 'worst-case'],
      levels: [
        { id: 'try', mode: 'try', title: 'Balance the tree', goal: 'Pick every pivot on a sorted array. Beat the last-element rule.', kind: 'picker', input: 'sorted', tiers: [7, 8, 9] },
        { id: 'solo', mode: 'solo', title: 'Random input', goal: 'Pick pivots on a random array; get close to the best.', kind: 'picker', input: 'random', tiers: [8, 9, 10] }
      ]
    },
    {
      id: 'qtrap', title: 'Sorted-Input Trap', verb: 'Compare', icon: '🪤',
      blurb: 'Last-element pivot vs median of three, on an already sorted array.',
      concepts: ['worst-case', 'pivot-choice'],
      levels: [
        { id: 'watch', mode: 'watch', title: 'The trap', goal: 'Predict, then watch both pivot rules on sorted input.', kind: 'trap', tiers: [12, 12, 16] },
        { id: 'sandbox', mode: 'sandbox', title: 'Pivot lab', goal: 'Any input, any pivot rule, both partitions.', kind: 'sandbox' }
      ]
    }
  ];

  var templates = {
    pickerIntro: 'Each box is a subarray waiting to be sorted. Tap a box, then tap the element you want as its pivot. Lomuto partitions around it (the pivot is moved to the end first).',
    pickerDone: 'Your pivots: {mine} comparisons, depth {depth}. Last-element rule: {last}. Best possible (true median every time): {best}.',
    trapQ: 'Quicksort on an already sorted array of {n}. Last-element pivot vs median-of-three: which makes far fewer comparisons?',
    trapOk: 'Median-of-three: {m3} vs {last}. With the last element as pivot, sorted input splits n−1 / 0 every time: n(n−1)/2 = {quad} comparisons.',
    trapBad: 'Sorted input is the trap: the last element is always the largest, so every partition is lopsided.',
    misconceptionSorted: 'Sorted input is the easy case for quicksort.'
  };

  var trace = [
    { id: 'u6t1', type: 'predict', concept: 'lomuto', prompt: 'What does the REPL print?', code: "(quicksort #(2 4 6 5 8 9 0 1 3 5) '<)", choices: ['#(0 1 2 3 4 5 5 6 8 9)', '#(9 8 6 5 5 4 3 2 1 0)', '#(2 4 6 5 8 9 0 1 3 5)', '(0 1 2 3 4 5 5 6 8 9)'], answer: 0,
      explain: { correct: 'Sorted ascending, in place. RTL:SLICE shares storage, so sorting the slices sorts VEC.', wrong: { 1: 'That\'s with \'>.', 2: 'QUICKSORT mutates VEC and returns it sorted.', 3: 'It returns the vector, printed #(...).' } },
      verify: { form: "(quicksort (copy-seq #(2 4 6 5 8 9 0 1 3 5)) '<)", expect: '#(0 1 2 3 4 5 5 6 8 9)' }, interpSkip: true },
    { id: 'u6t2', type: 'predict', concept: 'lomuto', prompt: 'One Lomuto partition (pivot 4, the last element). What does VEC look like after it?',
      code: "(let ((vec (copy-seq #(2 8 1 0 5 6 3 9 7 4)))\n      (ppvt 0) (pivot 4))\n  (dotimes (i 9)\n    (when (< (aref vec i) pivot)\n      (rotatef (aref vec i) (aref vec ppvt))\n      (incf ppvt)))\n  (rotatef (aref vec 9) (aref vec ppvt))\n  vec)",
      choices: ['#(2 1 0 3 4 6 8 9 7 5)', '#(0 1 2 3 4 5 6 7 8 9)', '#(2 1 0 3 5 6 8 9 7 4)', '#(4 2 8 1 0 5 6 3 9 7)'], answer: 0,
      explain: { correct: '2, 1, 0, 3 are swapped into slots 0–3; then the pivot swaps into slot 4, its final position. The right side is not sorted yet.', wrong: { 1: 'One partition doesn\'t sort everything: only the pivot is final.', 2: 'The last ROTATEF moves the pivot into slot ppvt = 4.', 3: 'Lomuto doesn\'t move the pivot to the front.' } },
      verify: { form: "(let ((vec (copy-seq #(2 8 1 0 5 6 3 9 7 4))) (ppvt 0) (pivot 4)) (dotimes (i 9) (when (< (aref vec i) pivot) (rotatef (aref vec i) (aref vec ppvt)) (incf ppvt))) (rotatef (aref vec 9) (aref vec ppvt)) vec)", expect: '#(2 1 0 3 4 6 8 9 7 5)' } },
    { id: 'u6t3', type: 'fill', concept: 'lomuto', prompt: 'Lomuto takes the LAST element as the pivot. Fill the blank.', code: '(pivot (aref vec ___))', choices: ['(1- (length vec))', '0', '(length vec)', '(floor (length vec) 2)'], answer: 0,
      explain: { correct: 'The last index is length − 1.', wrong: { 1: 'Index 0 is the first element (that\'s Hoare\'s choice).', 2: 'Index (length vec) is past the end.', 3: 'That\'s the middle element.' } },
      verify: { defs: 'fill', form: "(quicksort (copy-seq #(3 1 2)) '<)", expect: '#(1 2 3)' }, interpSkip: true },
    { id: 'u6t4', type: 'predict', concept: 'hoare', prompt: 'What does HOARE-PARTITION return?', code: "(hoare-partition (copy-seq #(5 3 8 1)) 0 3 #'<)", choices: ['1', '2', '3', '0'], answer: 0,
      explain: { correct: 'Pivot 5. i stops at 0 (5), j at 3 (1): swap → #(1 3 8 5). i stops at 2 (8), j at 1 (3): i ≥ j, return 1.', wrong: { 1: 'That\'s where i stopped, but HOARE-PARTITION returns j.', 2: 'j keeps moving after the first swap.', 3: 'j stops at 1 on the second pass.' } },
      verify: { form: "(hoare-partition (copy-seq #(5 3 8 1)) 0 3 #'<)", expect: '1' } },
    { id: 'u6t5', type: 'mcq', concept: 'hoare', prompt: 'After a partition, is the pivot always in its final sorted position?', choices: ['With Lomuto yes; with Hoare not necessarily', 'Yes, for both', 'No, for neither', 'Only on sorted input'], answer: 0,
      explain: { correct: 'Lomuto ends by swapping the pivot into slot ppvt. Hoare just returns a split point j.', wrong: { 1: 'Hoare\'s pivot can end up anywhere in the left part.', 2: 'Lomuto\'s final ROTATEF places the pivot exactly.', 3: 'Input order doesn\'t change what the schemes guarantee.' } },
      misconception: 'The pivot always ends in its final position.' },
    { id: 'u6t6', type: 'bigo', concept: 'worst-case', prompt: 'Lomuto quicksort (last-element pivot) on an already sorted array of n:', choices: ['O(n²)', 'O(n log n)', 'O(n)', 'O(log n)'], answer: 0,
      explain: { correct: 'The pivot is always the largest: splits of n−1 and 0, n levels, n(n−1)/2 comparisons.', wrong: { 1: 'That needs balanced splits; sorted input gives the most lopsided ones.', 2: 'Every level still scans its whole subarray.', 3: 'Every element is compared at least once.' } },
      misconception: 'Quicksort is always O(n log n).' },
    { id: 'u6t7', type: 'mcq', concept: 'quick-props', prompt: 'Which is true of quicksort?', choices: ['It can run in place, and it is not stable', 'It is stable', 'It needs an O(n) helper array', 'It is O(n log n) in the worst case'], answer: 0,
      explain: { correct: 'Partitioning swaps within the array (in place), and long-distance swaps can reorder equal keys.', wrong: { 1: 'Swaps across the array can jump equal elements past each other.', 2: 'That\'s merge sort.', 3: 'Worst case is O(n²).' } },
      misconception: 'Quicksort is stable.' },
    { id: 'u6t8', type: 'mcq', concept: 'pivot-choice', prompt: 'The lecture\'s experiments: random pivot ≈ 1.386 n log n comparisons, median-of-three ≈ 1.188 n log n. What does median-of-three choose?', choices: ['The median of the first, middle and last elements', 'The true median of the subarray', 'A random element', 'The middle element'], answer: 0,
      explain: { correct: 'A cheap estimate of the median that also defeats sorted and reverse-sorted inputs.', wrong: { 1: 'The true median is the ideal pivot, but expensive to find.', 2: 'That\'s the random rule.', 3: 'Close, but it takes the median of three candidates.' } } },
    { id: 'u6t9', type: 'mcq', concept: 'lomuto', prompt: 'The lecture\'s QUICKSORT sorts (rtl:slice vec 0 ppvt). Why does that sort VEC itself?', choices: ['The slice shares storage with VEC (a displaced array)', 'SLICE copies the result back afterwards', 'QUICKSORT returns the sorted slice', 'It doesn\'t; VEC stays unsorted'], answer: 0,
      explain: { correct: 'RTL:SLICE returns a view into the same memory, so swaps inside the slice change VEC.', wrong: { 1: 'Nothing is copied back; the slice IS that part of VEC.', 2: 'The recursive calls\' return values are ignored.', 3: 'The lecture\'s example shows VEC sorted.' } } },
    { id: 'u6t10', type: 'mcq', concept: 'worst-case', prompt: 'Which input is the worst case for quicksort with a last-element pivot?', choices: ['Already sorted (or reverse sorted)', 'Random', 'All distinct values', 'Small arrays'], answer: 0,
      explain: { correct: 'Every pivot is the max (or min), so every split is lopsided.', wrong: { 1: 'Random input gives balanced splits on average.', 2: 'Distinct values don\'t help if they\'re sorted.', 3: 'Small arrays are cheap anyway.' } },
      misconception: 'Sorted input is the easy case.' }
  ];

  var boss = [
    { id: 'u6b1', type: 'task', task: 'dance', concept: 'lomuto', algo: 'quickLomuto', values: [6, 2, 9, 1, 7, 4], decisions: 6, prompt: 'Hands-on: run the first Lomuto partition (pivot 4).' },
    { id: 'u6b2', type: 'mcq', concept: 'pivot-choice', prompt: 'Why is a random pivot better than the last element on sorted input?', choices: ['It is unlikely to pick the max every time, so splits stay balanced on average', 'It makes fewer swaps', 'It is always the median', 'It makes quicksort stable'], answer: 0,
      explain: { correct: 'A random pivot avoids the systematic worst case (though bad luck is still possible).', wrong: { 1: 'The benefit is in balance, not swaps.', 2: 'A random element is not the median.', 3: 'Quicksort stays unstable.' } } },
    { id: 'u6b3', type: 'mcq', concept: 'hoare', prompt: 'In Hoare\'s scheme, j stops when it finds an element that is…', choices: ['≤ the pivot', '< the pivot', '> the pivot', 'equal to i'], answer: 0,
      explain: { correct: 'i stops at ≥ pivot, j stops at ≤ pivot; then they swap if i < j.', wrong: { 1: 'Equal elements stop j too.', 2: 'That\'s what j skips over.', 3: 'j compares values with the pivot.' } } },
    { id: 'u6b4', type: 'predict', concept: 'lomuto', prompt: 'What does the REPL print?', code: "(quicksort #(2 4 6 5 8 9 0 1 3 5) '>)", choices: ['#(9 8 6 5 5 4 3 2 1 0)', '#(0 1 2 3 4 5 5 6 8 9)', '#(5 3 1 0 9 8 5 6 4 2)', 'NIL'], answer: 0,
      explain: { correct: 'COMP decides the order: with \'> it sorts descending.', wrong: { 1: 'That\'s \'<.', 2: 'It sorts fully.', 3: 'It returns VEC.' } },
      verify: { form: "(quicksort (copy-seq #(2 4 6 5 8 9 0 1 3 5)) '>)", expect: '#(9 8 6 5 5 4 3 2 1 0)' }, interpSkip: true },
    { id: 'u6b5', type: 'mcq', concept: 'worst-case', prompt: 'Lomuto quicksort on a sorted array of 1000: recursion depth is about…', choices: ['1000', '10', '500', '1'], answer: 0,
      explain: { correct: 'Each call peels off one element: depth n. (Deep enough to worry about the stack.)', wrong: { 1: 'log₂ 1000 ≈ 10 is the balanced case.', 2: 'Each split removes only the pivot.', 3: 'It recurses on the n−1 side every time.' } } },
    { id: 'u6b6', type: 'mcq', concept: 'quick-props', prompt: 'Quicksort vs merge sort:', choices: ['Quicksort is usually faster on average and in place; merge sort guarantees O(n log n) and needs O(n) memory', 'Quicksort is always faster', 'Merge sort is in place', 'Quicksort is stable'], answer: 0,
      explain: { correct: 'That\'s the trade-off from the lectures.', wrong: { 1: 'Its worst case is O(n²).', 2: 'Merge sort needs a helper array.', 3: 'Quicksort is not stable.' } } },
    { id: 'u6b7', type: 'mcq', concept: 'flashback', flashback: 'Unit 7 · Merge sort', prompt: 'Both quicksort and merge sort recurse on two parts. Where does each one do its main work?', choices: ['Quicksort before recursing (partition); merge sort after (merge)', 'Both before recursing', 'Both after recursing', 'Quicksort after; merge sort before'], answer: 0,
      explain: { correct: 'Quicksort partitions first, then recurses; merge sort recurses first, then merges.', wrong: { 1: 'Merge sort splits without comparing; its work is the merge after the calls.', 2: 'Quicksort\'s partition comes before its calls.', 3: 'It\'s the other way round.' } } },
    { id: 'u6b8', type: 'mcq', concept: 'flashback', flashback: 'Unit 5 · Stability', prompt: 'You must keep students in name order within each section. Quicksort or merge sort (with a stable merge)?', choices: ['A stable merge sort', 'Quicksort', 'Either', 'Neither can'], answer: 0,
      explain: { correct: 'Quicksort\'s long-distance swaps aren\'t stable; a merge that takes from the left on ties is.', wrong: { 1: 'Quicksort can reorder equal keys.', 2: 'Only one of them is stable.', 3: 'A stable merge sort keeps equal keys in order.' } } }
  ];

  var cards = {
    'u6-quick': { title: 'Quicksort', unit: 6, def: 'Pick a pivot, partition (smaller left, larger right), recurse on both sides. Base case: size 0 or 1.', cost: 'Average O(n log n), worst O(n²); in place; not stable', lisp: '(quicksort (rtl:slice vec 0 ppvt) comp)' },
    'u6-lomuto': { title: 'Lomuto partition', unit: 6, def: 'Pivot = last element. Scan j; swap smaller elements into slot i; finally swap the pivot into slot i: its final place.', cost: 'n − 1 comparisons per partition', lisp: '(rotatef (aref vec i) (aref vec ppvt))' },
    'u6-hoare': { title: 'Hoare partition', unit: 6, def: 'Pivot = first element. i and j move inward (i stops at ≥ pivot, j at ≤ pivot), swap, repeat; return j when i ≥ j.', cost: 'Fewer swaps; the pivot is not necessarily in its final place', lisp: '(when (>= i j) (return j))' },
    'u6-pivot': { title: 'Pivot choice', unit: 6, def: 'Sorted input + first/last pivot = O(n²). Median-of-three or random pivots avoid it.', cost: 'Lecture: random ≈ 1.386 n log n, median-of-3 ≈ 1.188 n log n', lisp: '; median of first, middle, last' }
  };

  C.unitData[6] = {
    id: 6, title: 'Quicksort', room: 'The Partition Floor', bossTitle: 'The Pivot',
    intro: 'The Partition Floor splits every shipment around one crate. Pick good pivots or the line backs up for miles.',
    lisp: lisp, explain: explain, prompts: prompts, templates: templates, concepts: concepts, briefing: briefing,
    games: games, trace: trace, boss: boss, cards: cards,
    summary: { canExplain: [
      'How Lomuto\'s partition works, and why its pivot ends in its final position.',
      'How Hoare\'s i and j move inward, and why its pivot may not be final.',
      'Why sorted input is quicksort\'s worst case with a first or last pivot.',
      'How median-of-three and random pivots fix that.',
      'Why quicksort is in place but not stable.'
    ] }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
