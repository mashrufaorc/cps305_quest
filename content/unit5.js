/* CPS305 Quest — content/unit5.js
 * Unit 5: Searching and sorting (Topic 5). DATA ONLY: words, levels, questions,
 * Lisp snippets and concept cards. Logic lives in engine/ and ui/.
 * Every question with a `verify` block is checked against SBCL by tests/verify-lisp.js.
 */
(function (root) {
  'use strict';
  var C = root.CQ.content;

  /* Lisp shown in the code panel. `anchors` map engine step names (snapshot.at)
   * to the line that is executing. Definitions match lisp/unit5.lisp exactly. */
  var lisp = {
    linear: {
      title: 'LIN-SEARCH (lecture)',
      code: [
        '(defun lin-search (arr key)',
        '  (dotimes (i (length arr))',
        '    (if (= (aref arr i) key)',
        '        (return i))))'
      ].join('\n'),
      anchors: { start: 2, compare: 3, 'return': 4, end: 2 }
    },
    binary: {
      title: 'BIN-SEARCH (lecture)',
      code: [
        '(defun bin-search (arr key)',
        '  (do ((i nil) (lb 0) (ub (1- (length arr))))',
        '      ((> lb ub) nil)',
        '    (setf i (floor (+ lb ub) 2))',
        '    (let ((e (aref arr i)))',
        '      (cond ((< e key) (setf lb (1+ i)))',
        '            ((> e key) (setf ub (1- i)))',
        '            (t (return i))))))'
      ].join('\n'),
      anchors: { start: 2, less: 6, greater: 7, found: 8, end: 3 }
    },
    selection: {
      title: 'SELECTION-SORT (lecture)',
      code: [
        '(defun selection-sort (vec comp)',
        '  (dotimes (cur (1- (length vec)))',
        '    (let ((best (aref vec cur))',
        '          (idx cur))',
        '      (do ((j (1+ cur) (1+ j)))',
        '          ((= j (length vec)))',
        '        (when (funcall comp (aref vec j) best)',
        '          (setf best (aref vec j)',
        '                idx j)))',
        '      (rotatef (aref vec cur) (aref vec idx))))',
        '  vec)'
      ].join('\n'),
      anchors: { start: 2, pass: 3, compare: 7, newBest: 8, swap: 10, done: 11 }
    },
    insertion: {
      title: 'INSERTION-SORT (lecture)',
      code: [
        '(defun insertion-sort (vec comp)',
        '  (dotimes (i (1- (length vec)))',
        '    (do ((j i (1- j)))          ; starts at i, counts down',
        '        ((minusp j))            ; stop when j goes negative',
        '      (if (funcall comp (aref vec (1+ j)) (aref vec j))',
        '          (rotatef (aref vec (1+ j)) (aref vec j))',
        '          (return))))',
        '  vec)'
      ].join('\n'),
      anchors: { start: 2, pass: 3, compare: 5, swap: 6, 'return': 7, front: 4, done: 8 }
    },
    insertionShift: {
      title: 'INSERTION-SORT-SHIFT (optimization #1)',
      code: [
        '(defun insertion-sort-shift (vec comp)',
        '  (do ((i 1 (1+ i)))',
        '      ((>= i (length vec)) vec)',
        '    (let ((key (aref vec i))',
        '          (j (1- i)))',
        '      (do ()',
        '          ((or (minusp j)',
        '               (not (funcall comp key (aref vec j)))))',
        '        (setf (aref vec (1+ j)) (aref vec j))   ; shift right',
        '        (decf j))',
        '      (setf (aref vec (1+ j)) key))))'
      ].join('\n'),
      anchors: { start: 2, pass: 4, compare: 8, shift: 9, place: 11, done: 3 }
    },
    binaryInsertion: {
      title: 'BINARY-INSERTION-SORT (optimization #2)',
      code: [
        '(defun binary-insertion-sort (vec comp)',
        '  (do ((i 1 (1+ i)))',
        '      ((>= i (length vec)) vec)',
        '    (let ((key (aref vec i)) (lb 0) (ub (1- i)))',
        '      (do () ((> lb ub))                 ; binary search for the slot',
        '        (let ((mid (floor (+ lb ub) 2)))',
        '          (if (funcall comp key (aref vec mid))',
        '              (setf ub (1- mid))',
        '              (setf lb (1+ mid)))))',
        '      (do ((j (1- i) (1- j))) ((< j lb)) ; shifting is still O(n)',
        '        (setf (aref vec (1+ j)) (aref vec j)))',
        '      (setf (aref vec lb) key))))'
      ].join('\n'),
      anchors: { start: 2, pass: 4, probe: 7, shift: 11, place: 12, done: 3 }
    },
    bubble: {
      title: 'BUBBLE-SORT (in the lecture\'s style)',
      code: [
        '(defun bubble-sort (vec comp)',
        '  (do ((end (1- (length vec)) (1- end)))',
        '      ((< end 1) vec)',
        '    (dotimes (j end)',
        '      (when (funcall comp (aref vec (1+ j)) (aref vec j))',
        '        (rotatef (aref vec j) (aref vec (1+ j)))))))'
      ].join('\n'),
      anchors: { start: 2, pass: 4, compare: 5, swap: 6, passEnd: 2, done: 3 }
    }
  };

  /* Referee codes -> words. {placeholders} come from the referee's data. */
  var explain = {
    'select.sortedRegion': { why: 'Index {choice} is in the sorted region already. Everything left of `cur` = {cur} is final, so selection sort never looks there again.', misconception: 'The sorted region is still up for grabs.' },
    'select.firstSmaller': { why: '{cv} is smaller than the front ({front}), but selection sort scans the **whole** unsorted region before it swaps. The minimum is {min}, at index {exp}.', misconception: 'Swap with the first smaller element you meet.' },
    'select.notMin': { why: '{cv} is not the smallest in the unsorted region. The scan finds {min} at index {exp}.' },
    'select.equalLater': { why: '{cv} ties with the minimum, but the code tests `(funcall comp (aref vec j) best)` with a strict `<`. A later equal value never beats `best`, so `idx` stays at the first {min} (index {exp}).' },
    'insert.outside': { why: 'Insertion sort only moves the element at index {from} to the left, into the sorted region. It cannot land at index {choice}.' },
    'insert.stoppedEarly': { why: 'There is still a {blocker} to its left, and {v} < {blocker}. The inner loop keeps swapping left until the element on the left is not larger. {v} lands at index {exp}.', misconception: 'Insertion sort moves an element only one step.' },
    'insert.tooFar': { why: 'It stops as soon as the element on its left is not larger. {blocker} is not larger than {v}, so the inner loop RETURNs and {v} lands at index {exp}.', misconception: 'Insertion sort scans the whole sorted region every time (it does not, and that is why sorted input is fast).' },
    'insert.pastEqual': { why: '{blocker} equals {v}. `(funcall comp ...)` with `<` is false for equal values, so the loop stops: {v} lands at index {exp}, right after its twin. This is exactly what makes insertion sort stable.', misconception: 'Equal elements get swapped past each other.' },
    'bubble.shouldSwap': { why: '{a} > {b}: this neighbouring pair is out of order, so bubble sort swaps it. That is how the largest value bubbles toward the end.' },
    'bubble.shouldKeep': { why: '{a} ≤ {b}: already in order. Bubble sort only swaps a pair that is out of order.' },
    'bubble.equal': { why: '{a} and {b} are equal. The test uses strict `<`, so equal neighbours are never swapped, and that is why bubble sort is stable.', misconception: 'Equal values need swapping.' },
    'bsearch.discarded': { why: 'Index {choice} is outside lb = {lb} … ub = {ub}. An earlier probe already proved the key cannot be there.', misconception: 'Discarded halves still need checking.' },
    'bsearch.notMiddle': { why: 'BIN-SEARCH always probes the middle: i = floor((lb + ub) / 2) = floor(({lb} + {ub}) / 2) = {mid}. The middle guarantees half the range is thrown away whatever the answer is.' },
    'lsearch.skip': { why: 'Linear search cannot jump ahead: on unsorted data, index {i} could hold the key. It checks indexes in order, so the next probe is {i}.' },
    'lsearch.again': { why: 'Index {choice} was already checked. Linear search moves forward one element at a time; the next one is {i}.' },
    'inv.inOrder': { why: '{x} (index {i}) comes before {y} (index {j}) and {x} < {y}, so this pair is in order. An inversion needs the left element to be **larger**.' },
    'inv.equal': { why: '{x} and {y} are equal. Equal elements are not out of order, so this is not an inversion.' },
    'inv.same': { why: 'Tap two **different** elements.' }
  };

  var prompts = {
    'select.prompt': 'Pass {cur}: tap the element this pass will swap to index {cur}.',
    'select.hint': 'Scan indexes {cur} … {last}. Which is smallest? (Ties: the first one wins.)',
    'insert.prompt': 'Where does {v} (now at index {from}) land in the sorted region?',
    'insert.hint': 'Walk left from {v}. Stop at the first element that is not larger than {v}.',
    'bubble.prompt': 'Neighbours {a} and {b}: swap or keep?',
    'bubble.hint': 'Swap only if the left one is larger.',
    'bsearch.prompt': 'Range lb = {lb} … ub = {ub}. Tap the element to probe.',
    'bsearch.hint': 'floor(({lb} + {ub}) / 2) = {mid}.',
    'lsearch.prompt': 'Tap the next element to check.',
    'lsearch.hint': 'Index {i}: linear search goes in order.'
  };

  var concepts = {
    'linear-search': 'Linear search',
    'binary-search': 'Binary search',
    'binary-needs-sorted': 'Binary search needs sorted data',
    'comparison-sort': 'Comparison sorting',
    'stability': 'Stable vs unstable',
    'selection-sort': 'Selection sort',
    'insertion-sort': 'Insertion sort',
    'inversions': 'Inversions',
    'insertion-opt': 'Insertion sort optimizations',
    'bubble-sort': 'Bubble sort',
    'big-o': 'Big-O (flashback)'
  };

  /* Briefing: 60–90 s, interactive. Rendered by ui/screens/briefing.js. */
  var briefing = {
    core: 'Knowing the order of your data saves work: on a sorted array binary search throws away half the data with every look, and sorting is how you pay for that order.',
    steps: [
      { kind: 'shelf', sorted: true, target: 63, values: [3, 7, 12, 18, 22, 27, 33, 41, 46, 52, 58, 63, 69, 75, 88],
        title: 'Find the file',
        text: 'You\'re the new intern in the Archive. File **63** is somewhere on this shelf, which is **sorted** smallest to largest. Tap any file to open it.',
        after: 'Every look told you which **half** to ignore. That only works because the shelf is sorted. This is **binary search**: look in the middle, throw away the half that cannot hold the key, repeat.' },
      { kind: 'shelf', sorted: false, target: 63, values: [52, 18, 75, 3, 63, 27, 88, 46, 12, 69, 33, 7, 58, 41, 22],
        title: 'Same files, shuffled',
        text: 'Someone knocked the shelf over. Find file **63** again.',
        after: 'Opening a file now tells you nothing about its neighbours, so you\'re stuck checking files one at a time: **linear search**. Worst case, you open all n.' },
      { kind: 'race',
        title: 'Sorting has a price',
        text: 'Sorting is how you earn that order. Different sorts pay different prices. Both sorts below get the **same already-sorted** array of 10. Run them.',
        after: 'Selection sort made 45 comparisons; insertion sort made 9. Same input, very different cost. In this room you\'ll find out why.' },
      { kind: 'check',
        title: 'Say it in one sentence',
        question: {
          id: 'brief-core', type: 'mcq', concept: 'binary-search',
          prompt: 'Which sentence explains binary search\'s speed?',
          choices: [
            'Each probe of a sorted array throws away half of the remaining elements.',
            'It checks elements faster than linear search does.',
            'It starts in the middle, which is closer to most elements.',
            'It works on any array, sorted or not.'
          ],
          answer: 0,
          explain: {
            correct: 'Yes. Halving n again and again takes about log₂ n steps, so binary search is O(log n).',
            wrong: {
              1: 'Each check costs the same. Binary search wins by making **fewer** checks, not faster ones.',
              2: 'Starting point alone doesn\'t help. The win is discarding half the range after every probe.',
              3: 'On unsorted data, the middle element tells you nothing about either half.'
            }
          }
        } }
    ]
  };

  /* Mini-games. Each level has a mode (watch/try/solo) and per-tier sizes.
   * The algorithm, not the level, decides the right answers. */
  var games = [
    {
      id: 'library', title: 'Library Detective', verb: 'Probe', icon: '🔎',
      blurb: 'Find a file by probing the shelf: linear vs binary search, with a probe counter.',
      concepts: ['linear-search', 'binary-search', 'binary-needs-sorted'],
      levels: [
        { id: 'race', mode: 'watch', title: 'Race: linear vs binary', goal: 'Predict, then watch both searches on the same sorted shelf.', kind: 'race', tiers: [15, 31, 31] },
        { id: 'probe', mode: 'try', title: 'You are the binary search', goal: 'Find the key with as few probes as the algorithm. Hints on.', kind: 'probe', rounds: 2, tiers: [7, 15, 31] },
        { id: 'solo', mode: 'solo', title: 'Solo case: is it even sorted?', goal: 'First decide if binary search is allowed, then search. No hints.', kind: 'solo', tiers: [15, 31, 31] },
        { id: 'sandbox', mode: 'sandbox', title: 'Practice shelf', goal: 'Type your own shelf and key. Try an unsorted one!', kind: 'sandbox' }
      ]
    },
    {
      id: 'sortlab', title: 'Sort Lab', verb: 'Step', icon: '🧪',
      blurb: 'Step through selection, insertion and bubble sort with live counters, on random, sorted, reversed and nearly sorted inputs.',
      concepts: ['selection-sort', 'insertion-sort', 'bubble-sort', 'insertion-opt'],
      levels: [
        { id: 'watch', mode: 'watch', title: 'Selection vs insertion', goal: 'Predict which sort does less work on sorted input, then watch both.', kind: 'compare', algos: ['selection', 'insertion'], input: 'sorted', tiers: [8, 10, 12],
          predict: { id: 'sl-p1', type: 'mcq', concept: 'selection-sort', prompt: 'Both sorts get the same **already sorted** array. Which makes fewer comparisons?',
            choices: ['Insertion sort', 'Selection sort', 'They make the same number'], answer: 0,
            explain: { correct: 'Insertion sort stops each pass as soon as the left neighbour isn\'t larger: just n−1 comparisons. Selection sort still scans the whole unsorted region every pass.',
              wrong: { 1: 'Selection sort can\'t tell the array is sorted. Finding the minimum always scans the whole unsorted region: (n−1) + (n−2) + … + 1.', 2: 'Watch the counters: selection sort is n(n−1)/2 on **any** input, but insertion sort depends on how sorted the input is.' } } } },
        { id: 'try-select', mode: 'try', title: 'Be selection sort', goal: 'Each pass, tap the element that gets swapped to the front.', kind: 'try', algo: 'selection', input: 'random', tiers: [5, 6, 8] },
        { id: 'try-insert', mode: 'try', title: 'Be insertion sort', goal: 'Each pass, tap where the next element lands.', kind: 'try', algo: 'insertion', input: 'random', tiers: [5, 6, 8] },
        { id: 'try-bubble', mode: 'try', title: 'Be bubble sort', goal: 'For each pair of neighbours: swap or keep?', kind: 'try', algo: 'bubble', input: 'random', tiers: [4, 5, 6] },
        { id: 'opt', mode: 'watch', title: 'Binary insertion: a trap', goal: 'Does binary-searching the insertion point make insertion sort O(n log n)?', kind: 'compare', algos: ['insertionShift', 'binaryInsertion'], input: 'reversed', tiers: [10, 12, 16],
          predict: { id: 'sl-p2', type: 'mcq', concept: 'insertion-opt', prompt: 'Binary insertion sort finds each slot with binary search (O(log n) comparisons). On a reversed array, what is its Big-O?',
            choices: ['Still O(n²)', 'O(n log n)', 'O(log n)'], answer: 0,
            explain: { correct: 'Right. Comparisons drop, but every element still has to **shift** over to make room. The Shifts counter stays quadratic.',
              wrong: { 1: 'Comparisons become O(n log n) in total, but the shifting doesn\'t shrink: on reversed input, every element shifts past all the others. Still O(n²).', 2: 'Even one pass touches every element. Nothing that sorts n elements can be O(log n).' } } } },
        { id: 'solo', mode: 'solo', title: 'Solo shift', goal: 'A mystery sort on a tricky input. No hints, first try counts.', kind: 'solo', algos: ['selection', 'insertion', 'bubble'], tiers: [6, 7, 8] },
        { id: 'sandbox', mode: 'sandbox', title: 'Practice bench', goal: 'Type your own array, pick two sorts, compare them side by side.', kind: 'sandbox' }
      ]
    },
    {
      id: 'inversions', title: 'Inversion Hunt', verb: 'Tap pairs', icon: '🎯',
      blurb: 'Tap every out-of-order pair, then watch insertion sort remove exactly that many.',
      concepts: ['inversions', 'insertion-sort'],
      levels: [
        { id: 'hunt', mode: 'try', title: 'Hunt the inversions', goal: 'Find every pair that is out of order. Hints on.', kind: 'hunt', tiers: [4, 5, 6], input: 'random' },
        { id: 'solo', mode: 'solo', title: 'Solo hunt', goal: 'A bigger array, no hints. Then predict a formula.', kind: 'hunt', tiers: [6, 6, 7], input: 'random', formula: true },
        { id: 'sandbox', mode: 'sandbox', title: 'Inversion counter', goal: 'Type any array: see every inversion and insertion sort\'s swaps.', kind: 'sandbox' }
      ]
    },
    {
      id: 'scale', title: 'Balance-Scale Sort', verb: 'Compare', icon: '⚖',
      blurb: 'Sort hidden weights when your only tool is a balance scale: the essence of comparison sorting.',
      concepts: ['comparison-sort'],
      levels: [
        { id: 'four', mode: 'try', title: 'Four crates', goal: 'Sort the crates lightest to heaviest. You can only weigh two at a time.', kind: 'scale', tiers: [4, 4, 5] },
        { id: 'six', mode: 'solo', title: 'Six crates', goal: 'Beat insertion sort\'s weighing count.', kind: 'scale', tiers: [5, 6, 6] }
      ]
    },
    {
      id: 'stable', title: 'Stable or Not?', verb: 'Predict order', icon: '🃏',
      blurb: 'Sort cards with equal values and check whether their original order survived.',
      concepts: ['stability'],
      levels: [
        { id: 'three', mode: 'try', title: 'Three sorts, one deck', goal: 'Predict whether the equal cards keep their order, for each sort.', kind: 'stable' },
        { id: 'multikey', mode: 'solo', title: 'Sort by section, then name', goal: 'Why stability matters for multi-key sorts.', kind: 'multikey' },
        { id: 'sandbox', mode: 'sandbox', title: 'Card table', goal: 'Your own deck with repeats; any sort.', kind: 'sandbox' }
      ]
    }
  ];

  /* Trace the Code: read, trace, lightly complete. */
  var trace = [
    { id: 't1', type: 'predict', concept: 'linear-search',
      prompt: 'What does this return?', code: '(lin-search #(4 8 15 16 23 42) 16)',
      choices: ['3', '4', '16', 'T'], answer: 0,
      explain: { correct: 'DOTIMES counts i = 0, 1, 2, 3; at i = 3 the test is true and `(return i)` gives back the **index**.',
        wrong: { 1: 'Indexes start at 0. 4 is how many elements were checked, not the index.', 2: '`(return i)` returns the index i, not the value stored there.', 3: 'RETURN hands back i, not T.' } },
      verify: { form: '(lin-search #(4 8 15 16 23 42) 16)', expect: '3' } },
    { id: 't2', type: 'predict', concept: 'linear-search',
      prompt: 'The key appears twice. What comes back?', code: '(lin-search #(7 2 7 9) 7)',
      choices: ['0', '2', '(0 2)', '1'], answer: 0,
      explain: { correct: 'RETURN exits the DOTIMES at the **first** match, index 0.',
        wrong: { 1: 'The loop never reaches index 2: RETURN leaves at the first match.', 2: 'LIN-SEARCH returns one index, not a list of them.', 3: 'Index 0 already holds 7.' } },
      verify: { form: '(lin-search #(7 2 7 9) 7)', expect: '0' } },
    { id: 't3', type: 'predict', concept: 'binary-needs-sorted',
      prompt: '1 is definitely in this array. What does BIN-SEARCH return?', code: '(bin-search #(9 3 7 1 5) 1)',
      choices: ['NIL', '3', '0', 'An error'], answer: 0,
      explain: { correct: 'Probe index 2: 7 > 1, so ub = 1. Probe index 0: 9 > 1, so ub = −1. Now lb > ub: NIL. Binary search threw away the half that actually held 1.',
        wrong: { 1: 'The middle is 7 > 1, so BIN-SEARCH discards the right half, and 1 lives there. On unsorted data, the discarded half can hold the key.', 2: 'Index 0 holds 9.', 3: 'No error: it runs happily and returns a wrong answer, which is worse.' } },
      misconception: 'Binary search works on unsorted data.',
      verify: { form: '(bin-search #(9 3 7 1 5) 1)', expect: 'NIL' } },
    { id: 't4', type: 'predict', concept: 'binary-search',
      prompt: 'What does this return, and how many elements does it check?', code: '(bin-search #(2 5 8 12 16 23 38) 23)',
      choices: ['5, after checking 2', '5, after checking 6', '23, after checking 2', '4, after checking 3'], answer: 0,
      explain: { correct: 'lb = 0, ub = 6, so the middle is index 3 (12 < 23): lb = 4. The middle of 4…6 is index 5, which holds 23. Two checks.',
        wrong: { 1: 'Six checks would be linear search. Each probe halves the range: 7, then 3.', 2: 'BIN-SEARCH returns the index (5), not the value.', 3: 'The middle of 0…6 is index 3 (12), then index 5.' } },
      verify: { form: '(bin-search #(2 5 8 12 16 23 38) 23)', expect: '5' } },
    { id: 't5', type: 'fill', concept: 'binary-search',
      prompt: 'Fill the blank so BIN-SEARCH probes the middle.',
      code: '(setf i (floor (+ lb ub) ___))',
      choices: ['2', '1', '(length arr)', 'ub'], answer: 0,
      explain: { correct: 'floor((lb + ub) / 2) is the middle index of the current range.',
        wrong: { 1: 'Dividing by 1 gives lb + ub, which can be past the end of the array.', 2: '(lb + ub) / n is at most about 2, so it probes near the front of the array, not the middle of the current range.', 3: '(lb + ub) / ub is not an index into the current range.' } },
      verify: { defs: 'fill', form: '(bin-search #(1 2 4 5 7 9 10 12 18) 9)', expect: '5' } },
    { id: 't6', type: 'fill', concept: 'binary-search',
      prompt: 'The middle element e is smaller than the key. Fill the blank.',
      code: '((< e key) (setf lb ___))',
      choices: ['(1+ i)', 'i', '(1- i)', '(1+ lb)'], answer: 0,
      explain: { correct: 'Index i is ruled out too, so the new range starts just after it.',
        wrong: { 1: 'lb = i keeps an element you already ruled out. When lb and ub are neighbours, floor((lb+ub)/2) = lb again and the loop never ends.', 2: 'That moves lb left, back into the half you just discarded.', 3: 'That discards only one element per probe, which is linear search wearing a disguise.' } },
      verify: { defs: 'fill', form: '(bin-search #(1 2 4 5 7 9 10 12 18) 18)', expect: '8' } },
    { id: 't7', type: 'bug', concept: 'insertion-sort',
      prompt: 'This version still returns a sorted vector. But on an already-sorted vector of 10 it makes **45** comparisons instead of 9. Tap the line that lost something.',
      code: [
        '(defun insertion-sort (vec comp)',
        '  (dotimes (i (1- (length vec)))',
        '    (do ((j i (1- j)))',
        '        ((minusp j))',
        '      (if (funcall comp (aref vec (1+ j)) (aref vec j))',
        '          (rotatef (aref vec (1+ j)) (aref vec j)))))',
        '  vec)'
      ].join('\n'),
      answer: [5, 6],
      explain: { correct: 'The IF lost its else branch, `(return)`. Without it the inner loop always walks to the front, so even sorted input costs n(n−1)/2 comparisons. The early exit is the whole reason insertion sort is O(n) on sorted data.',
        wrong: { any: 'That line is the same as the lecture\'s. Look for what makes the inner loop **stop early** when the left neighbour isn\'t larger.' } },
      verify: { defs: '(defun insertion-sort (vec comp) (dotimes (i (1- (length vec))) (do ((j i (1- j))) ((minusp j)) (if (funcall comp (aref vec (1+ j)) (aref vec j)) (rotatef (aref vec (1+ j)) (aref vec j))))) vec)',
        form: "(let ((n 0)) (insertion-sort (make-array 10 :initial-contents '(0 1 2 3 4 5 6 7 8 9)) (lambda (a b) (incf n) (< a b))) n)", expect: '45' } },
    { id: 't8', type: 'bug', concept: 'selection-sort',
      prompt: '`(selection-sort v #\'<)` on #(3 1 0 7 8 2) returned **#(8 7 3 2 1 0)**. Tap the buggy line.',
      code: [
        '(defun selection-sort (vec comp)',
        '  (dotimes (cur (1- (length vec)))',
        '    (let ((best (aref vec cur))',
        '          (idx cur))',
        '      (do ((j (1+ cur) (1+ j)))',
        '          ((= j (length vec)))',
        '        (when (funcall comp best (aref vec j))',
        '          (setf best (aref vec j)',
        '                idx j)))',
        '      (rotatef (aref vec cur) (aref vec idx))))',
        '  vec)'
      ].join('\n'),
      answer: [7],
      explain: { correct: 'The arguments to COMP are swapped. `(funcall comp best (aref vec j))` is true when the new element is **larger**, so each pass selects the maximum. The lecture\'s version is `(funcall comp (aref vec j) best)`.',
        wrong: { any: 'That line matches the lecture. The result is perfectly reversed, so look for where the **order** of a comparison is decided.' } },
      verify: { defs: '(defun selection-sort (vec comp) (dotimes (cur (1- (length vec))) (let ((best (aref vec cur)) (idx cur)) (do ((j (1+ cur) (1+ j))) ((= j (length vec))) (when (funcall comp best (aref vec j)) (setf best (aref vec j) idx j))) (rotatef (aref vec cur) (aref vec idx)))) vec)',
        form: "(selection-sort (make-array 6 :initial-contents '(3 1 0 7 8 2)) #'<)", expect: '#(8 7 3 2 1 0)' } },
    { id: 't9', type: 'bug', concept: 'binary-search',
      prompt: 'This BIN-SEARCH returns **NIL** for `(bin-search #(1 3 5) 5)`. Tap the buggy line.',
      code: [
        '(defun bin-search (arr key)',
        '  (do ((i nil) (lb 0) (ub (1- (length arr))))',
        '      ((>= lb ub) nil)',
        '    (setf i (floor (+ lb ub) 2))',
        '    (let ((e (aref arr i)))',
        '      (cond ((< e key) (setf lb (1+ i)))',
        '            ((> e key) (setf ub (1- i)))',
        '            (t (return i))))))'
      ].join('\n'),
      answer: [3],
      explain: { correct: 'The end test should be `(> lb ub)`. When lb = ub there is still **one** element left to check; `>=` gives up before looking at it.',
        wrong: { any: 'Trace it: lb = 0, ub = 2, the middle is 3 < 5, so lb = 2. Now lb = ub = 2. What does the loop do next?' } },
      verify: { defs: '(defun bin-search (arr key) (do ((i nil) (lb 0) (ub (1- (length arr)))) ((>= lb ub) nil) (setf i (floor (+ lb ub) 2)) (let ((e (aref arr i))) (cond ((< e key) (setf lb (1+ i))) ((> e key) (setf ub (1- i))) (t (return i))))))',
        form: '(bin-search #(1 3 5) 5)', expect: 'NIL' } },
    { id: 't10', type: 'predict', concept: 'comparison-sort',
      prompt: 'What does the REPL print?',
      code: "(defvar *v* (make-array 5 :initial-contents '(4 9 1 7 3)))\n(insertion-sort *v* #'>)",
      choices: ['#(9 7 4 3 1)', '#(1 3 4 7 9)', '#(4 9 1 7 3)', '(9 7 4 3 1)'], answer: 0,
      explain: { correct: 'COMP decides the order. With `#\'>`, "goes first" means "is larger", so it sorts descending.',
        wrong: { 1: 'That would be `#\'<`. The sort itself never assumes ascending: COMP decides.', 2: 'INSERTION-SORT mutates the vector and returns it sorted.', 3: 'It returns the vector, which prints as #(...), not a list.' } },
      verify: { setup: "(defvar *v* (make-array 5 :initial-contents '(4 9 1 7 3)))", form: "(insertion-sort *v* #'>)", expect: '#(9 7 4 3 1)' } },
    { id: 't11', type: 'predict', concept: 'selection-sort',
      prompt: 'How many times does the WHEN test inside SELECTION-SORT run on a 6-element vector that is **already sorted**?',
      code: "(selection-sort (make-array 6 :initial-contents '(1 2 3 4 5 6)) #'<)",
      choices: ['15', '5', '0', '36'], answer: 0,
      explain: { correct: '5 + 4 + 3 + 2 + 1 = 15 = n(n−1)/2. Selection sort does the same scan on every input.',
        wrong: { 1: 'That would be one comparison per pass. Each pass compares against **every** remaining element.', 2: 'Selection sort can\'t tell the input is sorted. It never skips a scan.', 3: 'The inner loop starts at cur + 1, so it is 5 + 4 + 3 + 2 + 1, not 6 × 6.' } },
      misconception: 'Selection sort speeds up on sorted input.',
      verify: { form: "(let ((n 0)) (selection-sort (make-array 6 :initial-contents '(1 2 3 4 5 6)) (lambda (a b) (incf n) (< a b))) n)", expect: '15' } },
    { id: 't12', type: 'bigo', concept: 'insertion-sort',
      prompt: 'INSERTION-SORT gets a vector of n elements that is **already in order**. How many comparisons?',
      choices: ['n − 1', 'n(n − 1)/2', 'log₂ n', '0'], answer: 0,
      explain: { correct: 'Each pass does one comparison, finds the left neighbour isn\'t larger, and RETURNs. Best case O(n).',
        wrong: { 1: 'That is the worst case (reversed input). The inner loop runs once per inversion, and sorted input has none.', 2: 'There is no halving here: each pass looks at its left neighbour once.', 3: 'Each element still has to be compared once to know it\'s in place.' } },
      verify: { form: "(let ((n 0)) (insertion-sort (make-array 10 :initial-contents '(0 1 2 3 4 5 6 7 8 9)) (lambda (a b) (incf n) (< a b))) n)", expect: '9' } }
  ];

  /* Boss: mixed, one hands-on task, one flashback to an earlier unit. */
  var boss = [
    { id: 'b1', type: 'task', task: 'binary', concept: 'binary-search', n: 15, seed: 51,
      prompt: 'Hands-on: find the key with BIN-SEARCH. Probe exactly what the algorithm would.' },
    { id: 'b2', type: 'mcq', concept: 'stability',
      prompt: 'You sort a class list by last name, then sort it again by section. Which kind of sort keeps last names in order inside each section?',
      choices: ['A stable sort', 'Any comparison sort', 'Any in-place sort', 'Selection sort'], answer: 0,
      explain: { correct: 'A stable sort keeps equal keys (same section) in their previous order, which was by last name.',
        wrong: { 1: 'An unstable sort may reorder students in the same section and scramble the names.', 2: 'In-place is about memory, not about the order of equal keys.', 3: 'Selection sort\'s long-distance swap can jump an element past its equal twin, so it is unstable.' } } },
    { id: 'b3', type: 'mcq', concept: 'inversions',
      prompt: 'How many inversions does **3 1 2** have?',
      choices: ['2', '1', '3', '0'], answer: 0,
      explain: { correct: '(3,1) and (3,2) are out of order; (1,2) is fine. Insertion sort on this array makes exactly 2 swaps.',
        wrong: { 1: 'Count every pair i < j with a[i] > a[j], not only neighbours: (3,1) **and** (3,2).', 2: '(1,2) is in order, so it doesn\'t count.', 3: '3 comes before smaller elements, so there are inversions.' } } },
    { id: 'b4', type: 'task', task: 'insertion', concept: 'insertion-sort', values: [5, 2, 8, 3, 9, 1], decisions: 3,
      prompt: 'Hands-on: be insertion sort for three passes.' },
    { id: 'b5', type: 'bigo', concept: 'insertion-opt',
      prompt: 'Insertion sort that binary-searches the insertion point is…',
      choices: ['O(n²): the shifting is still quadratic', 'O(n log n): binary search fixes it', 'O(n) on every input', 'O(log n)'], answer: 0,
      explain: { correct: 'Fewer comparisons (O(n log n) total), but elements still shift one slot at a time.',
        wrong: { 1: 'Only the comparisons become O(n log n). Making room still shifts up to i elements on pass i.', 2: 'O(n) is the best case of plain insertion sort on sorted input, not every input.', 3: 'Every element must at least be looked at once: Ω(n).' } },
      misconception: 'Binary insertion makes insertion sort O(n log n).' },
    { id: 'b6', type: 'predict', concept: 'bubble-sort',
      prompt: 'How many comparisons does this BUBBLE-SORT (no early exit) make on 5 elements?',
      code: "(bubble-sort (make-array 5 :initial-contents '(1 2 3 4 5)) #'<)",
      choices: ['10', '4', '5', '25'], answer: 0,
      explain: { correct: '4 + 3 + 2 + 1 = 10: each pass stops one position shorter. Even sorted input pays it all.',
        wrong: { 1: 'That is one pass. There are n − 1 passes, each one shorter.', 2: 'Passes shrink by one: 4 + 3 + 2 + 1.', 3: 'The passes get shorter, so it\'s n(n−1)/2, not n².' } },
      verify: { form: "(let ((n 0)) (bubble-sort (make-array 5 :initial-contents '(1 2 3 4 5)) (lambda (a b) (incf n) (< a b))) n)", expect: '10' } },
    { id: 'b7', type: 'bigo', concept: 'big-o', flashback: 'Unit 2 · Big-O',
      prompt: 'Selection sort makes ½n² − ½n comparisons. Its Big-O class is…',
      choices: ['O(n²)', 'O(½n²)', 'O(n² − n)', 'O(n)'], answer: 0,
      explain: { correct: 'Keep the fastest-growing term (½n²), then drop the coefficient: O(n²).',
        wrong: { 1: 'Coefficients are dropped: ½n², 2n² and 1000n² are all O(n²).', 2: 'Keep only the fastest-growing term: the −n matters less and less as n grows.', 3: 'The n² term dominates for large n.' } },
      misconception: 'Coefficients change the complexity class.' },
    { id: 'b8', type: 'mcq', concept: 'insertion-sort',
      prompt: 'Which input makes insertion sort do the **most** work?',
      choices: ['Reversed', 'Already sorted', 'All elements equal', 'Nearly sorted'], answer: 0,
      explain: { correct: 'Reversed input has n(n−1)/2 inversions, the maximum, and insertion sort removes one per swap.',
        wrong: { 1: 'Sorted input is insertion sort\'s best case: n − 1 comparisons.', 2: 'Equal elements are never swapped (strict <), so it\'s the best case too.', 3: 'Nearly sorted has only O(n) inversions: fast.' } } }
  ];

  var cards = {
    'u5-linear': { title: 'Linear search', unit: 5, def: 'Check every element in order until you find the key or reach the end. Works on any array.', cost: 'Best 1 comparison, worst n: O(n)', lisp: '(dotimes (i (length arr))\n  (if (= (aref arr i) key) (return i)))' },
    'u5-binary': { title: 'Binary search', unit: 5, def: 'Probe the middle of a **sorted** array and discard the half that cannot hold the key. T(n) = 1 + T(n/2).', cost: 'O(log n), sorted data only', lisp: '(setf i (floor (+ lb ub) 2))' },
    'u5-compare': { title: 'Comparison sort', unit: 5, def: 'Orders elements only by comparing two at a time, like a balance scale. COMP decides what "first" means.', cost: 'Trade-offs: speed vs simplicity, in-place vs extra memory, stable vs unstable', lisp: "(selection-sort vec #'>)  ; descending" },
    'u5-stable': { title: 'Stable sort', unit: 5, def: 'Equal elements keep their relative order. Needed for multi-key sorts (name, then section).', cost: 'Insertion and bubble (strict <) are stable; selection is not.', lisp: '(funcall comp (aref vec (1+ j)) (aref vec j)) ; strict <' },
    'u5-selection': { title: 'Selection sort', unit: 5, def: 'Find the minimum of the unsorted region, swap it to the front. Repeat.', cost: 'Always (n−1)+…+1 = n(n−1)/2 comparisons: O(n²), even on sorted input', lisp: '(rotatef (aref vec cur) (aref vec idx))' },
    'u5-insertion': { title: 'Insertion sort', unit: 5, def: 'Move the next element left into the sorted region until its left neighbour isn\'t larger. One swap per inversion.', cost: 'Best O(n) (sorted), worst O(n²) (reversed)', lisp: '(if (funcall comp ...) (rotatef ...) (return))' },
    'u5-insopt': { title: 'Insertion sort optimizations', unit: 5, def: '#1 shift instead of swap (half-exchange). #2 binary-search the insertion point: fewer comparisons.', cost: 'Still O(n²): the shifting is quadratic', lisp: '(setf (aref vec (1+ j)) (aref vec j)) ; shift' },
    'u5-bubble': { title: 'Bubble sort', unit: 5, def: 'Swap out-of-order neighbours from the front; the largest bubbles to the end. Each pass is one shorter.', cost: 'n(n−1)/2 comparisons: O(n²)', lisp: '(rotatef (aref vec j) (aref vec (1+ j)))' }
  };

  /* Templates for questions the games compute from the engine (the numbers
   * come from running the algorithm; only the words live here). */
  var templates = {
    kinds: { random: 'random', sorted: 'sorted', reversed: 'reversed', nearly: 'nearly sorted', dupes: 'many duplicates' },
    theory: { quad: 'theory: n(n−1)/2 = {v}', inv: 'theory: one per inversion = {v}', insCmp: 'theory: {lo} (sorted) … {hi} (reversed)' },
    levelUp: '⬆ Three clean rounds: the next round uses a bigger array.',
    libRace: {
      prompt: 'The shelf holds **{n}** sorted files. File **{key}** sits at index {idx}. How many files will BIN-SEARCH open before it finds it?',
      correct: 'BIN-SEARCH opens {bin}. Each probe halves the range, so {n} files need at most {worst} probes. LIN-SEARCH needs {lin}, because it checks index 0, 1, 2, … in order.',
      lin: '{lin} is LIN-SEARCH\'s count: it checks every index up to {idx}. Binary search throws away half the range with each probe.',
      misconception: 'Binary search still has to walk past the elements before the key.',
      half: 'Binary search doesn\'t just skip to the middle and scan from there. It halves the range on **every** probe.',
      one: 'Only if the key sits exactly in the middle. Index {idx} is not the middle.',
      watch: 'Same shelf, same key. Watch the **Probes** counters: linear grows by one per step, while binary halves the shelf.',
      summary: 'Binary search: {bin} probes. Linear search: {lin}. With {n} files, binary search never needs more than {worst}.'
    },
    libProbe: {
      done: 'You opened {probes} file(s). With {n} files, binary search never needs more than {worst}.',
      summary: 'Binary search walked through with {misses} slip(s).'
    },
    libSolo: {
      prompt: 'Look at this shelf. Can BIN-SEARCH be trusted to find a file on it?',
      misconception: 'Binary search works on unsorted data.',
      yesOk: 'Every file is at least as large as the one before it, so it\'s sorted. Discarding a half is safe.',
      noWrong: 'Check each neighbour pair: none is out of order. The shelf is sorted, so binary search is safe.',
      noOk: 'Right. Some neighbours are out of order, so a probe in the middle says nothing about which half holds the key. Use LIN-SEARCH, or sort first.',
      yesWrong: 'Some neighbours are out of order. BIN-SEARCH would happily discard the half that holds the key and return NIL.',
      summary: 'Checked that the shelf was sorted, then found the file in {probes} probe(s) out of {n} files.'
    },
    libSandbox: { unsorted: '⚠ This shelf is **not sorted**. Watch binary search anyway: it may discard the half that holds the key.' },
    sortCompare: {
      watch: 'On sorted input, selection sort still made n(n−1)/2 comparisons; insertion sort made only n−1.',
      opt: 'Binary insertion cut comparisons but not shifts: still O(n²).'
    },
    sortTry: {
      selection: '**Selection sort:** find the smallest element of the unsorted region and swap it to the front. Tap the element each pass selects.',
      insertion: '**Insertion sort:** the next element moves left until its left neighbour is not larger. Tap where it lands.',
      bubble: '**Bubble sort:** compare neighbours from the front; swap if the left one is larger. The largest bubbles to the end.'
    },
    sortTryDone: 'Done: {cmp} comparisons and {sw} swaps on {n} elements ({inv} inversions).',
    sortSolo: {
      setup: 'Mystery job: **{algo}** on a **{kind}** array of {n}.',
      prompt: 'How many comparisons will {algo} make on this {kind} array?',
      why: {
        selection: 'Selection sort always makes n(n−1)/2 = {all}, whatever the input.',
        insertion: 'Insertion sort\'s inner loop runs once per inversion, plus one comparison per pass where it stops. Here that comes to {actual}.',
        bubble: 'This bubble sort has no early exit, so it is always n(n−1)/2 = {all}.'
      },
      wrongAll: 'n(n−1)/2 = {all} is the worst case. Does this sort pay it on this input?',
      wrongLinear: 'n−1 = {n} − 1 is insertion sort\'s best case (already sorted).',
      wrongSquare: 'The passes get shorter, so it\'s at most n(n−1)/2, never n².',
      summary: '{algo} on {kind} input: {actual} comparisons (worst case {all}).'
    },
    sandboxInfo: 'n = {n}, inversions = {inv}, n(n−1)/2 = {all}. Insertion sort makes exactly {inv} swaps here.',
    invHunt: {
      intro: 'An **inversion** is any pair of elements that are out of order: a larger element **before** a smaller one (not just neighbours). Tap two elements to test them.',
      status: 'Found {f} of {t} inversions.',
      statusSolo: 'Found {f} so far. Press "I found them all" when you\'re done.',
      dup: 'You already found ({x}, {y}).',
      found: '{x} sits before {y} but is larger, so that\'s one inversion.',
      hint: '{x} (index {i}) is larger than something to its right.',
      missed: 'Every pair counts, even pairs far apart. Look at the ✗ chips.',
      predict: 'This array has **{inv}** inversions. How many swaps will INSERTION-SORT make on it?',
      predictOk: 'Each swap in insertion sort fixes exactly one inversion, and nothing else creates new ones. So it makes {inv} swaps.',
      predictN: 'n − 1 is the number of passes, not swaps. A pass can make many swaps, or none.',
      predictAll: '{all} is the worst case, for a reversed array. This one has only {inv} inversions.',
      predictZero: 'Zero swaps happens only when the array is already sorted.',
      summary: '{inv} inversions, so insertion sort made {inv} swaps.'
    },
    invFormula: {
      prompt: 'A **reversed** array of {m} distinct elements has how many inversions?',
      ok: 'Every pair is out of order: (m−1) + (m−2) + … + 1 = m(m−1)/2 = {all}. That is why reversed input is insertion sort\'s worst case: O(n²).',
      n: 'Count pairs, not elements: the first element alone is inverted with all m−1 elements after it.',
      sq: 'Each pair is counted once, and an element can\'t be inverted with itself, so it\'s m(m−1)/2, not m².',
      adj: 'That counts only neighbours. Pairs far apart count too.'
    },
    invSandbox: 'This array has **{inv}** inversion(s). Watch insertion sort\'s Swaps counter land on exactly that number.',
    scale: {
      intro: 'Each crate hides its weight. Your only tool is the scale: tap two crates to weigh them. Arrange them from lightest (left) to heaviest (right). Insertion sort would need {par} weighings on this row.',
      par: 'par: {par}',
      pick: 'Tap a crate to put it on the left pan.',
      second: 'Crate {a} is on the scale. Tap another crate to weigh against it.',
      result: '{h} is heavier than {l}.',
      wrong: 'Crate {a} sits left of crate {b}, but {a} is heavier. (This check is a peek at the answer, so it costs a star.)',
      win: 'Sorted in {w} weighings (insertion sort\'s par: {par}). Comparisons are all a comparison sort ever learns, and fewer is better.',
      winPar: 'Sorted in {w} weighings, at or under insertion sort\'s par of {par}! You sorted using nothing but comparisons, which is what a comparison sort does.',
      summary: '{w} weighings (par {par}).'
    },
    stable: {
      prompt: 'Two cards share the value 5: **5a** comes before **5b**. After {algo}, will 5a still come before 5b?',
      keptWhy: {
        selection: 'This time the order survived.',
        insertion: 'Insertion sort only swaps when `(funcall comp right left)` is true. With strict `<`, an equal neighbour stops the walk, so 5b never jumps past 5a.',
        bubble: 'Bubble sort swaps neighbours only when the left one is strictly larger. Equal 5s never swap, so 5a stays ahead.'
      },
      keptWrong: {
        selection: 'Run it and see: the order survived here.',
        insertion: 'Insertion sort stops at an equal element (strict `<`), so equal cards never pass each other.',
        bubble: 'Equal neighbours are never swapped (strict `<`), so their order survives.'
      },
      brokeWhy: {
        selection: 'Selection sort\'s swap is long-distance: pass 1 swaps 5a with the 1 at the far end, jumping 5a past 5b. Result: {final}.',
        insertion: 'Here the order broke.',
        bubble: 'Here the order broke.'
      },
      brokeWrong: {
        selection: 'Watch pass 1: the minimum (1) is swapped with 5a at the front, which throws 5a to the back, behind 5b. Result: {final}.',
        insertion: 'Watch it run.',
        bubble: 'Watch it run.'
      },
      always: {
        prompt: 'Selection sort reordered the 5s here. Does an **unstable** sort always reorder equal keys?',
        misconception: 'Unstable means equal keys always get reordered.',
        ok: 'No: unstable means it **can** reorder them',
        okWhy: 'Right. "Unstable" means there is no guarantee. On some inputs selection sort happens to keep equal keys in order, but you can\'t rely on it.',
        bad: 'Yes, every time',
        badWhy: 'Not every time. On the deck 1 5a 5b, no swap ever moves the 5s. Unstable only means the order **isn\'t guaranteed**.',
        bad2: 'Only when the array is reversed',
        bad2Why: 'It depends on where the long-distance swaps land, not on reversal specifically.'
      },
      summary: 'Selection sort can reorder equal keys; insertion and bubble sort (with strict <) never do.'
    },
    multikey: {
      intro: 'This class list is already sorted **by name** (Ada, Bo, Cy…). Each card shows the student\'s section number. Now we sort by section.',
      prompt: 'Which sort keeps the names alphabetical **inside each section**?',
      misconception: 'Stable and unstable sorts give the same order for equal keys.',
      ok: 'Insertion sort is stable: students in the same section keep their earlier (alphabetical) order.',
      same: 'Look at section 2 after selection sort: Bo comes before Ada. An unstable sort can scramble the earlier ordering.',
      sameLucky: 'They happen to match on this list, but only stability **guarantees** it.',
      sel: 'Selection sort\'s long-distance swaps can jump a student past a classmate in the same section.',
      after: 'Compare section 2 in both results: selection sort put Bo before Ada; insertion sort kept Ada first.',
      afterLucky: 'Both happen to agree here, but only the stable sort guarantees it.',
      summary: 'For multi-key sorts (name, then section), use a stable sort.'
    },
    stableSandbox: { kept: '✓ Equal cards kept their original order (a before b before c).', broke: '✗ Equal cards changed order: the sort was not stable on this input.' }
  };

  C.unitData[5] = {
    id: 5,
    title: 'Searching and sorting',
    room: 'The Archive',
    intro: 'The Archive\'s filing robots are broken. Files are everywhere, and searches take forever. Fix the search, then fix the sorting.',
    lisp: lisp,
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
        'Why binary search is O(log n), and why it needs sorted data.',
        'Why selection sort is O(n²) on every input, sorted or not.',
        'Why insertion sort is O(n) on sorted input: it does one swap per inversion.',
        'What a stable sort is, and when you need one.',
        'Why binary insertion sort is still O(n²).'
      ]
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
