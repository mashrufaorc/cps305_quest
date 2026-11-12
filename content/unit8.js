/* CPS305 Quest — content/unit8.js
 * Unit 8: Stacks, queues, sets and association lists (Topic 8). DATA ONLY.
 * Games run engine/stacks.js, which mirrors the lecture's Lisp in lisp/unit8.lisp.
 */
(function (root) {
  'use strict';
  var C = root.CQ.content;

  var PAR = [
    '(defun par-checker (list)',
    '  "Returns T if the [ in list are matched with their ]"',
    '  (let ((s nil))                        ; initialize stack s',
    '    (dolist (symbol list (null s))',
    '      (case symbol',
    '        ([ (push symbol s))',
    '        (] (if (null s) (return)) (pop s))   ; unbalanced []',
    '        (otherwise (return))))))             ; invalid symbol'
  ].join('\n');
  var RING = [
    '(defun enqueue (q x)',
    '  (unless (is-full q)',
    '    (incf (queue-count q))',
    '    (setf (aref (queue-data q) (queue-tail q)) x)',
    '    (if (= (queue-tail q) (1- *size*))',
    '        (setf (queue-tail q) 0)',
    '        (setf (queue-tail q) (1+ (queue-tail q))))))',
    '',
    '(defun dequeue (q)',
    '  (unless (is-empty q)',
    '    (decf (queue-count q))',
    '    (let ((x (aref (queue-data q) (queue-head q))))',
    '      (if (= (queue-head q) (1- *size*))',
    '          (setf (queue-head q) 0)',
    '          (setf (queue-head q) (1+ (queue-head q))))',
    '      x)))'
  ].join('\n');
  var lisp = { par: { title: 'PAR-CHECKER (lecture)', code: PAR, anchors: { push: 6, pop: 7, failEmpty: 7, failInvalid: 8, end: 4 } }, ring: { title: 'ENQUEUE / DEQUEUE on a circular buffer (lecture)', code: RING, anchors: { enqueue: 4, dequeue: 12 } } };

  var concepts = {
    'stack-lifo': 'Stack: LIFO, push / pop / peek',
    'par-checker': 'Bracket checking with a stack',
    'monotonic': 'Monotonic stacks',
    'queue-fifo': 'Queue: FIFO, enqueue / dequeue',
    'circular-buffer': 'Circular buffer (wrap with mod)',
    'deque': 'Deques (two stacks)',
    'sets': 'Sets as lists, MEMBER cost',
    'alists': 'Association lists',
    'push-cons': 'PUSH mutates, CONS doesn\'t',
    'flashback': 'Earlier units (flashback)'
  };

  var briefing = {
    core: 'A stack is LIFO (last in, first out: push and pop at the top) and a queue is FIFO (first in, first out: enqueue at the back, dequeue at the front); both can be O(1) per operation if they\'re built on the right foundation.',
    steps: [
      { kind: 'lifoFifo', title: 'Same arrivals, different exits', text: 'Plates 1, 2, 3 arrive in that order. A stack and a queue each take them in. Press "remove one" and compare.',
        after: 'The stack hands back the **newest** (3): last in, first out, like undo or the browser\'s back button. The queue hands back the **oldest** (1): first in, first out, like a drive-through line.' },
      { kind: 'ringDemo', title: 'A queue that never shifts', text: 'In a plain array, every dequeue shifts the remaining elements left. A **circular buffer** just moves its head and tail indexes, wrapping around at the end.',
        after: 'Head and tail chase each other around the ring; nothing moves. Every operation is O(1).' },
      { kind: 'check', title: 'Say it in one sentence',
        question: { id: 'brief8-core', type: 'mcq', concept: 'stack-lifo', prompt: 'You push 1, 2, 3 onto a stack and enqueue 1, 2, 3 into a queue. What does pop return, and what does dequeue return?',
          choices: ['pop → 3, dequeue → 1', 'pop → 1, dequeue → 3', 'Both return 1', 'Both return 3'], answer: 0,
          explain: { correct: 'LIFO vs FIFO.', wrong: { 1: 'That\'s backwards: pop takes the newest, dequeue the oldest.', 2: 'Only the queue returns the oldest item.', 3: 'Only the stack returns the newest item.' } } } }
    ]
  };

  var games = [
    {
      id: 'bracket', title: 'Bracket Bouncer', verb: 'Push / pop', icon: '🎟',
      blurb: 'Feed brackets one at a time into PAR-CHECKER\'s stack. Push, pop, or bounce the string out.',
      concepts: ['par-checker', 'stack-lifo'],
      levels: [
        { id: 'try', mode: 'try', title: 'Check the brackets', goal: 'For each symbol, choose what PAR-CHECKER does. Hints on.', kind: 'bracket', count: 3, tiers: [1, 2, 3] },
        { id: 'solo', mode: 'solo', title: 'Invalid symbols too', goal: 'Trickier strings, no hints.', kind: 'bracket', count: 4, tiers: [2, 3, 3] }
      ]
    },
    {
      id: 'ring', title: 'Ring Road', verb: 'Move head & tail', icon: '⭕',
      blurb: 'A circular buffer with head and tail markers that wrap around, next to a shifting array queue and its move counter.',
      concepts: ['circular-buffer', 'queue-fifo'],
      levels: [
        { id: 'try', mode: 'try', title: 'Drive the ring', goal: 'Tap the slot each operation uses. Hints on.', kind: 'ring', size: 4 },
        { id: 'solo', mode: 'solo', title: 'Bigger ring', goal: 'Size 6, no hints.', kind: 'ring', size: 6 },
        { id: 'deque', mode: 'watch', title: 'Two-stack deque', goal: 'Watch the reversal when one stack runs empty.', kind: 'deque' }
      ]
    },
    {
      id: 'mono', title: 'Monotonic Climb', verb: 'Predict pops', icon: '🧗',
      blurb: 'Keep the stack increasing: before a push, pop everything bigger. Predict which elements pop.',
      concepts: ['monotonic'],
      levels: [
        { id: 'try', mode: 'try', title: 'Climb', goal: 'Tap every element that pops, then confirm. Hints on.', kind: 'mono', rounds: 5 }
      ]
    },
    {
      id: 'setlab', title: 'Set Lab', verb: 'Build sets', icon: '🔣',
      blurb: 'Union, intersection, difference and subset with list-based sets, with a scan counter for MEMBER; then watch ASSOC walk an a-list.',
      concepts: ['sets', 'alists'],
      levels: [
        { id: 'venn', mode: 'try', title: 'Venn Lab', goal: 'Tap the elements of each result set. Count the MEMBER scans.', kind: 'venn' },
        { id: 'alist', mode: 'watch', title: 'A-List Lookup', goal: 'ASSOC walks the list: watch its cost grow with n.', kind: 'alist' }
      ]
    }
  ];

  var templates = {
    bracketPrompt: 'Next symbol: **{sym}** (stack holds {depth}). What does PAR-CHECKER do?',
    bracketEndPrompt: 'The list is finished and the stack holds {depth}. What does PAR-CHECKER return?',
    bracketWhy: { push: '`[` → PUSH it.', pop: '`]` with a non-empty stack → POP the matching [.', failEmpty: '`]` but the stack is empty: nothing to match, (return) gives NIL.', failInvalid: 'Not [ or ]: the OTHERWISE clause (return)s NIL.' },
    ringPrompt: { enqueue: '(enqueue q {x}): which slot does it write?', dequeue: '(dequeue q): which slot does it read?' },
    ringWhy: { enqueue: 'ENQUEUE writes at tail = {t}, then moves tail to {t2}{wrap}.', dequeue: 'DEQUEUE reads at head = {h}, then moves head to {h2}{wrap}.' },
    monoPrompt: 'Stack (bottom → top): {stack}. Push **{x}**: tap every element that pops, then confirm.',
    monoOk: 'Popped: {popped}. The stack stays increasing: {after}.',
    monoBad: 'Pops happen from the top while the top is bigger than {x}: {popped}.'
  };

  var trace = [
    { id: 'u8t1', type: 'predict', concept: 'par-checker', prompt: 'What does this return?', code: "(par-checker '([ [ ] ]))", choices: ['T', 'NIL', '0', '([ [)'], answer: 0,
      explain: { correct: 'Push, push, pop, pop: the stack ends empty, so (null s) is T.', wrong: { 1: 'Every [ is matched.', 2: 'The result form is (null s): T or NIL.', 3: 'It returns T/NIL, not the stack.' } },
      verify: { form: "(par-checker '([ [ ] ]))", expect: 'T' } },
    { id: 'u8t2', type: 'predict', concept: 'par-checker', prompt: 'What does this return?', code: "(par-checker '([ ] ]))", choices: ['NIL', 'T', 'An error', '(])'], answer: 0,
      explain: { correct: 'The second ] arrives with an empty stack: (if (null s) (return)) returns NIL.', wrong: { 1: 'One ] has nothing to match.', 2: 'The check catches it before POP would misbehave.', 3: 'RETURN gives NIL.' } },
      verify: { form: "(par-checker '([ ] ]))", expect: 'NIL' } },
    { id: 'u8t3', type: 'predict', concept: 'par-checker', prompt: 'What does this return?', code: "(par-checker '([ [ ]))", choices: ['NIL', 'T', '1', '([)'], answer: 0,
      explain: { correct: 'One [ is still on the stack at the end, so (null s) is NIL.', wrong: { 1: 'An unmatched [ remains.', 2: 'It doesn\'t count; it tests emptiness.', 3: 'It returns T or NIL.' } },
      verify: { form: "(par-checker '([ [ ]))", expect: 'NIL' } },
    { id: 'u8t4', type: 'predict', concept: 'push-cons', prompt: 'What does this return?', code: '(let ((s nil))\n  (push 1 s)\n  (push 2 s)\n  (list (pop s) s))', choices: ['(2 (1))', '(1 (2))', '(2 (2 1))', '(1 NIL)'], answer: 0,
      explain: { correct: 'PUSH and POP mutate S: pop returns the newest (2) and leaves (1).', wrong: { 1: 'POP takes from the front: the last thing pushed.', 2: 'POP removes the element from S.', 3: 'Two items were pushed.' } },
      misconception: 'Pop returns the oldest item.',
      verify: { form: '(let ((s nil)) (push 1 s) (push 2 s) (list (pop s) s))', expect: '(2 (1))' } },
    { id: 'u8t5', type: 'predict', concept: 'push-cons', prompt: 'What does this return?', code: "(let ((l (list 1 2)))\n  (cons 0 l)\n  l)", choices: ['(1 2)', '(0 1 2)', '(0)', 'NIL'], answer: 0,
      explain: { correct: 'CONS returns a new list but doesn\'t change L. To keep the result you must reassign: (setf l (cons 0 l)).', wrong: { 1: 'That would need PUSH, or SETF of the CONS result.', 2: 'L still has its elements.', 3: 'L is unchanged.' } },
      misconception: 'CONS changes a list in place like PUSH does.',
      verify: { form: '(let ((l (list 1 2))) (cons 0 l) l)', expect: '(1 2)' } },
    { id: 'u8t6', type: 'predict', concept: 'sets', prompt: 'What does MEMBER return?', code: "(member 3 '(1 2 3 4))", choices: ['(3 4)', 'T', '3', '2'], answer: 0,
      explain: { correct: 'MEMBER returns the tail of the list starting at the match, after scanning up to it.', wrong: { 1: 'It returns the tail (which is "true"), not T.', 2: 'It returns a list, not the element.', 3: 'It\'s not a position.' } },
      misconception: 'MEMBER returns T or NIL in constant time.',
      verify: { form: "(member 3 '(1 2 3 4))", expect: '(3 4)' } },
    { id: 'u8t7', type: 'predict', concept: 'sets', prompt: 'What does this return?', code: "(remove-set 3 '(4 6 8 3 5 9))", choices: ['(8 6 4 5 9)', '(4 6 8 5 9)', '(9 5 8 6 4)', '(4 6 8 3 5 9)'], answer: 0,
      explain: { correct: 'Visited elements are CONSed onto ACC (reversed: 8 6 4), then APPENDed to the rest. Order changes, which doesn\'t matter for a set.', wrong: { 1: 'The accumulator reverses the elements before 3.', 2: 'Only the part before 3 is reversed.', 3: '3 is found and removed.' } },
      verify: { form: "(remove-set 3 '(4 6 8 3 5 9))", expect: '(8 6 4 5 9)' } },
    { id: 'u8t8', type: 'predict', concept: 'circular-buffer', prompt: '*SIZE* is 4. What are head, tail and count at the end?', code: "(let ((q (make-queue)))\n  (enqueue q 'a) (enqueue q 'b)\n  (enqueue q 'c) (enqueue q 'd)\n  (dequeue q) (enqueue q 'e)\n  (list (queue-head q) (queue-tail q) (queue-count q)))", choices: ['(1 1 4)', '(1 5 4)', '(0 4 4)', '(1 0 4)'], answer: 0,
      explain: { correct: 'After 4 enqueues tail wraps to 0; the dequeue moves head to 1; E is written at slot 0 and tail moves to 1.', wrong: { 1: 'Indexes wrap: there is no slot 5 in a size-4 buffer.', 2: 'The dequeue moved head.', 3: 'Writing E moved tail from 0 to 1.' } },
      misconception: 'Circular-buffer indexes run off the end.',
      verify: { form: "(let ((q (make-queue))) (enqueue q 'a) (enqueue q 'b) (enqueue q 'c) (enqueue q 'd) (dequeue q) (enqueue q 'e) (list (queue-head q) (queue-tail q) (queue-count q)))", expect: '(1 1 4)' } },
    { id: 'u8t9', type: 'predict', concept: 'alists', prompt: 'What does this return?', code: "(assoc 'three '((one . un) (two . deux) (three . trois)))", choices: ['(THREE . TROIS)', 'TROIS', 'THREE', 'T'], answer: 0,
      explain: { correct: 'ASSOC returns the whole pair; use CDR to get the value.', wrong: { 1: 'That\'s (cdr (assoc ...)).', 2: 'That\'s the key, CAR of the pair.', 3: 'It returns the pair, not T.' } },
      verify: { form: "(assoc 'three '((one . un) (two . deux) (three . trois)))", expect: '(THREE . TROIS)' } },
    { id: 'u8t10', type: 'mcq', concept: 'queue-fifo', prompt: 'A queue is a linked list with only a FRONT reference. Enqueue (at the back) costs…', choices: ['O(n): walk to the end first', 'O(1)', 'O(log n)', 'O(n²)'], answer: 0,
      explain: { correct: 'Without a BACK reference you must walk the whole list. The lecture\'s MY-QUEUE keeps both front and back for O(1).', wrong: { 1: 'Only with a back reference.', 2: 'No halving in a list walk.', 3: 'One walk.' } },
      misconception: 'A linked-list queue needs only a front reference.' }
  ];

  var boss = [
    { id: 'u8b1', type: 'task', task: 'bracket', concept: 'par-checker', symbols: ['[', '[', ']', '[', ']', ']', ']'], prompt: 'Hands-on: run PAR-CHECKER on [ [ ] [ ] ] ].' },
    { id: 'u8b2', type: 'mcq', concept: 'queue-fifo', prompt: 'Dequeue from a plain array (not circular) costs…', choices: ['O(n): every remaining element shifts left', 'O(1)', 'O(log n)', 'Nothing, if the array is big enough'], answer: 0,
      explain: { correct: 'Removing index 0 shifts the rest. A circular buffer avoids it by moving HEAD.', wrong: { 1: 'Only with a circular buffer (or a linked list with front/back).', 2: 'No halving.', 3: 'Size doesn\'t remove the shift.' } },
      misconception: 'Dequeue from a plain array is O(1).' },
    { id: 'u8b3', type: 'mcq', concept: 'monotonic', prompt: 'Increasing monotonic stack 1, 2, 5, 7 (top = 7). Push 3. What pops?', choices: ['7 and 5', 'Only 7', '1 and 2', 'Nothing'], answer: 0,
      explain: { correct: 'Pop while the top is bigger than 3: 7, then 5. 2 < 3 stops it. Result: 1, 2, 3.', wrong: { 1: '5 is also bigger than 3.', 2: 'Pops come off the top.', 3: '3 is smaller than 7, so the order would break.' } } },
    { id: 'u8b4', type: 'predict', concept: 'sets', prompt: 'What does this return?', code: "(insert-set 3 '(1 2 3 4))", choices: ['(1 2 3 4)', '(3 1 2 3 4)', '(1 2 3 4 3)', 'NIL'], answer: 0,
      explain: { correct: '3 is already a member, so the set is returned as is: no duplicates.', wrong: { 1: 'INSERT-SET checks MEMBER first.', 2: 'It never appends.', 3: 'It returns the set.' } },
      verify: { form: "(insert-set 3 '(1 2 3 4))", expect: '(1 2 3 4)' } },
    { id: 'u8b5', type: 'bigo', concept: 'sets', prompt: 'INSERT-SET on a list-based set of n elements costs…', choices: ['O(n): MEMBER scans the list first', 'O(1): it just CONSes', 'O(log n)', 'O(n²)'], answer: 0,
      explain: { correct: 'The duplicate check scans the list. (A hash-table set would be O(1) on average.)', wrong: { 1: 'The CONS is O(1), but MEMBER runs first.', 2: 'The list isn\'t sorted.', 3: 'One scan.' } },
      misconception: 'Inserting into a list-based set is O(1).' },
    { id: 'u8b6', type: 'predict', concept: 'sets', prompt: 'What does this return?', code: "(subset-set '(1 2 3) '(0 2 3 4 5 6))", choices: ['NIL', 'T', '(2 3)', '1'], answer: 0,
      explain: { correct: '1 is not in B, so the DOLIST returns NIL.', wrong: { 1: 'Every element of A must be in B.', 2: 'It returns T or NIL.', 3: 'It returns NIL, not the missing element.' } },
      verify: { form: "(subset-set '(1 2 3) '(0 2 3 4 5 6))", expect: 'NIL' } },
    { id: 'u8b7', type: 'mcq', concept: 'deque', prompt: 'A deque made of two stacks: you pop-front, but the front stack is empty. What happens?', choices: ['Everything moves from the back stack to the front stack, reversing order, then pop', 'Return NIL', 'Pop from the back stack', 'The deque is reset'], answer: 0,
      explain: { correct: 'Moving reverses the order, so the oldest back element ends on top of the front stack.', wrong: { 1: 'The deque isn\'t empty: items are on the other stack.', 2: 'The back stack\'s top is the newest back item, the wrong end.', 3: 'Nothing is lost.' } } },
    { id: 'u8b8', type: 'mcq', concept: 'flashback', flashback: 'Unit 4 · Recursion', prompt: 'Why does deep recursion cause a "stack overflow"?', choices: ['Each call pushes a frame onto the call stack, which has a fixed size', 'Recursion uses a queue', 'The heap runs out of cons cells', 'Lisp limits recursion to 100 calls'], answer: 0,
      explain: { correct: 'The function call stack is a stack: frames are pushed on call and popped on return.', wrong: { 1: 'Calls are LIFO: the last call returns first.', 2: 'It\'s the stack, not the heap.', 3: 'The limit depends on stack memory, and tail calls avoid it.' } } }
  ];

  var cards = {
    'u8-stack': { title: 'Stack (LIFO)', unit: 8, def: 'push, pop, peek at the top; all O(1). Undo, back button, the call stack.', cost: 'Array: amortized O(1) push (doubling). List: O(1) at the front.', lisp: '(push x s)  (pop s)  ; both mutate s' },
    'u8-queue': { title: 'Queue (FIFO)', unit: 8, def: 'enqueue at the back, dequeue at the front. Linked list with front AND back references, or a circular buffer.', cost: 'O(1) each; a plain array dequeue is O(n) (shifting)', lisp: '(enqueue q x)  (dequeue q)' },
    'u8-ring': { title: 'Circular buffer', unit: 8, def: 'Fixed array with head (next to remove) and tail (next free slot) that wrap around at the end.', cost: 'O(1), nothing shifts', lisp: '(if (= tail (1- *size*)) 0 (1+ tail))' },
    'u8-sets': { title: 'Sets as lists', unit: 8, def: 'No duplicates, no order. MEMBER returns the tail at the match after an O(n) scan, so insert, subset, union are scans too.', cost: 'Best on a hash table (Unit 9)', lisp: "(if (member x set) set (cons x set))" },
    'u8-alist': { title: 'Association lists', unit: 8, def: 'A list of (key . value) pairs. ASSOC finds the pair (EQL by default; :test \'equal for strings).', cost: 'Add O(1), lookup/remove O(n)', lisp: "(assoc 'three *words*)  (remove 'three *words* :key 'car)" }
  };

  C.unitData[8] = {
    id: 8, title: 'Stacks, queues, sets', room: 'The Loading Bay', bossTitle: 'The Dispatcher',
    intro: 'The Loading Bay ships crates in the wrong order, and its bracket labels never match. Pick the right structure for each line.',
    lisp: lisp, explain: {}, prompts: {}, templates: templates, concepts: concepts, briefing: briefing,
    games: games, trace: trace, boss: boss, cards: cards,
    summary: { canExplain: [
      'The difference between LIFO and FIFO, and where each shows up.',
      'How PAR-CHECKER uses a stack to check brackets.',
      'How a circular buffer gives an O(1) queue with no shifting.',
      'Why list-based sets make insert and subset O(n), and why MEMBER returns a tail.',
      'Why PUSH changes a list but CONS doesn\'t, and how ASSOC finds a pair.'
    ] }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
