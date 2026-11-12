/* CPS305 Quest — content/unit3.js
 * Unit 3: Arrays vs linked lists (Topic 3). DATA ONLY.
 * Pointer Surgery is refereed by engine/lists.js; cons diagrams and printed
 * forms come from engine/lisp.js evaluating the expressions below.
 */
(function (root) {
  'use strict';
  var C = root.CQ.content;

  var MY_LIST = [
    '(defstruct node data next)',
    '',
    '(defstruct my-list',
    '  (head nil :type (or node null))',
    '  (size 0 :type (integer 0)))',
    '',
    '(defun my-cons (data list)',
    '  (let ((new-head (make-node :data data',
    '                             :next (my-list-head list))))',
    '    (make-my-list :head new-head',
    '                  :size (1+ (my-list-size list)))))'
  ].join('\n');
  var lisp = { myList: { title: 'MY-LIST and MY-CONS (lecture)', code: MY_LIST, anchors: {} } };

  /* Expressions for Cons Cell Builder; diagrams and printed forms are computed. */
  var consPool = [
    { id: 'c1', expr: '(cons 1 2)', tier: 1 }, { id: 'c2', expr: "(cons 1 '(2))", tier: 1 }, { id: 'c3', expr: '(list 1 2 3)', tier: 1 },
    { id: 'c4', expr: "(cons 'a 'b)", tier: 1 }, { id: 'c5', expr: "(cons 'sink '(or swim))", tier: 2 }, { id: 'c6', expr: "(cons '(or swim) ())", tier: 2 },
    { id: 'c7', expr: "'((a b) c)", tier: 2 }, { id: 'c8', expr: "'(a (b c))", tier: 2 }, { id: 'c9', expr: "(cons '(1 2) 3)", tier: 3 },
    { id: 'c10', expr: "(list (list 1) 2)", tier: 3 }, { id: 'c11', expr: '(cons 1 (cons 2 (cons 3 nil)))', tier: 3 }, { id: 'c12', expr: '(cons nil nil)', tier: 3 }
  ];

  var explain = {
    'list.orphan': { why: 'Nothing points to {lost} any more, so {lost} (and everything after it) is lost: without a reference, the node can\'t be reached. Set the new node\'s .next **before** you redirect the pointer that used to reach it.', misconception: 'Order doesn\'t matter when you update references.' },
    'list.cycle': { why: 'That makes the list loop back on itself: walking it would never reach NIL.' }
  };

  var concepts = {
    'array-basics': 'Arrays: O(1) index, O(n) prepend',
    'list-basics': 'Linked lists: O(1) prepend, O(n) index',
    'pointer-order': 'Updating references in the right order',
    'insert-cost': 'Insert at i = O(n) walk + O(1) relink',
    'cache': 'Memory, cache locality, mixed types',
    'cons-cells': 'Cons cells, CAR and CDR',
    'my-list': 'Building lists from scratch',
    'flashback': 'Earlier units (flashback)'
  };

  var briefing = {
    core: 'An array stores elements side by side, so indexing is one address computation (O(1)) but prepending shifts everything (O(n)); a linked list chains nodes by references, so prepending is O(1) but reaching index i walks i links (O(n)).',
    steps: [
      { kind: 'prependRace', title: 'Add to the front', text: 'Prepend 0 to an array and to a linked list holding the same 8 numbers. Count the work.',
        after: 'The array shifted all 8 elements one slot right (and would also have to reallocate if full). The list just made a new node and changed two references: O(1).' },
      { kind: 'accessRace', title: 'Now fetch index 6', text: 'Read the element at index 6 from each.',
        after: 'The array computes the address directly: base + 6 × size, one step. The list has to follow .next six times from HEAD: O(n). Each structure wins at something different.' },
      { kind: 'check', title: 'Say it in one sentence',
        question: { id: 'brief3-core', type: 'mcq', concept: 'insert-cost', prompt: 'Inserting into a linked list "is O(1)". When is that actually true?',
          choices: ['Only once you already have a reference to the node before the insertion point', 'Always', 'Only for arrays', 'Never'], answer: 0,
          explain: { correct: 'Relinking is O(1), but getting to index i first is an O(n) walk.', wrong: { 1: 'You have to walk to position i first, which is O(n).', 2: 'Arrays shift elements on insert: O(n).', 3: 'At the front (or with a reference in hand) it really is O(1).' } } } }
    ]
  };

  var games = [
    {
      id: 'surgery', title: 'Pointer Surgery', verb: 'Rewire', icon: '🩺',
      blurb: 'Change .next references to prepend, insert and remove. A wrong order orphans nodes, and you\'ll see them drop away.',
      concepts: ['pointer-order', 'list-basics'],
      levels: [
        { id: 'try', mode: 'try', title: 'Prepend and insert', goal: 'Select a pointer, then the node it should point to. Hints on.', kind: 'surgery', tasks: ['prepend', 'insert'], tiers: [3, 4, 5] },
        { id: 'solo', mode: 'solo', title: 'Remove and insert', goal: 'Remove from the middle, then insert. No hints.', kind: 'surgery', tasks: ['remove', 'insert'], tiers: [4, 5, 6] }
      ]
    },
    {
      id: 'shift', title: 'Shift Cost', verb: 'Count moves', icon: '📦',
      blurb: 'Prepend to an array and watch every element move; race array indexing against a list walk.',
      concepts: ['array-basics', 'list-basics', 'cache'],
      levels: [
        { id: 'prepend', mode: 'watch', title: 'Prepend to an array', goal: 'Predict how many elements move, then watch.', kind: 'prepend', tiers: [8, 10, 12] },
        { id: 'access', mode: 'watch', title: 'Access race', goal: 'Reach index i in an array and in a linked list.', kind: 'access' }
      ]
    },
    {
      id: 'conscell', title: 'Cons Cell Builder', verb: 'Translate', icon: '🧱',
      blurb: 'Box-and-pointer diagrams to Lisp printed forms and back.',
      concepts: ['cons-cells'],
      levels: [
        { id: 'try', mode: 'try', title: 'Diagram → printed form', goal: 'What does the REPL print for this structure?', kind: 'toText', count: 4, tiers: [1, 2, 3] },
        { id: 'solo', mode: 'solo', title: 'Expression → diagram', goal: 'Pick the diagram an expression builds. No hints.', kind: 'toDiagram', count: 4, tiers: [2, 3, 3] }
      ]
    }
  ];

  var templates = {
    surgeryGoal: { prepend: 'Prepend **{x}**: the list should become {goal}.', insert: 'Insert **{x}** after {after}: the list should become {goal}.', remove: 'Remove **{v}**: the list should become {goal}.' },
    surgeryHint: { prepend: 'Two moves: new.next → the old first node, then HEAD → new.', insert: 'Two moves: new.next → the node after {after}, then {after}.next → new. In that order!', remove: 'One move: make the node before {v} skip over it.' },
    surgeryDone: 'Done in {moves} move(s) (best possible: {optimal}).',
    surgeryPick: 'Now pick the node this pointer should point to (or NIL).',
    prependQ: 'An array holds {n} elements (with room to spare). How many elements move when you prepend one?',
    prependOk: 'All {n}: each one shifts right by a slot to free index 0. A linked list needs zero moves: one new node and two reference updates.',
    accessQ: 'How many steps to read index {i} in a linked list (following .next from HEAD)?'
  };

  var trace = [
    { id: 'u3t1', type: 'predict', concept: 'cons-cells', prompt: 'What does the REPL print?', code: "(cons 'sink '(or swim))", choices: ['(SINK OR SWIM)', '(SINK (OR SWIM))', '(SINK . OR SWIM)', '((SINK) OR SWIM)'], answer: 0,
      explain: { correct: 'CONS puts SINK in front of the existing list (OR SWIM).', wrong: { 1: 'That would be (list \'sink \'(or swim)). CONS adds one element to the front.', 2: 'The CDR is a proper list, so no dot is printed.', 3: 'SINK is an atom, not a list.' } },
      verify: { form: "(cons 'sink '(or swim))", expect: '(SINK OR SWIM)' } },
    { id: 'u3t2', type: 'predict', concept: 'cons-cells', prompt: 'What does the REPL print?', code: "(cons '(or swim) ())", choices: ['((OR SWIM))', '(OR SWIM)', '(OR SWIM . NIL)', 'NIL'], answer: 0,
      explain: { correct: 'A one-element list whose only element is the list (OR SWIM).', wrong: { 1: 'The CAR is the whole list (OR SWIM), so it\'s nested one level.', 2: 'A CDR of NIL ends a proper list: no dot.', 3: 'CONS always makes a new cell.' } },
      verify: { form: "(cons '(or swim) ())", expect: '((OR SWIM))' } },
    { id: 'u3t3', type: 'predict', concept: 'cons-cells', prompt: 'What does the REPL print?', code: '(cons 1 2)', choices: ['(1 . 2)', '(1 2)', '3', 'An error'], answer: 0,
      explain: { correct: 'The CDR is 2, not a list, so the cell prints as a dotted pair.', wrong: { 1: '(1 2) would need the CDR to be the list (2).', 2: 'CONS builds a cell; it doesn\'t add.', 3: 'Any two values can go in a cons cell.' } },
      verify: { form: '(cons 1 2)', expect: '(1 . 2)' } },
    { id: 'u3t4', type: 'predict', concept: 'cons-cells', prompt: 'What does the REPL print?', code: "(car (cdr '(a b c)))", choices: ['B', '(B C)', 'A', 'C'], answer: 0,
      explain: { correct: 'CDR gives (B C); CAR of that is B (same as SECOND).', wrong: { 1: 'That\'s just the CDR.', 2: 'A is the CAR of the whole list.', 3: 'C is the CAR of the CDDR.' } },
      verify: { form: "(car (cdr '(a b c)))", expect: 'B' } },
    { id: 'u3t5', type: 'predict', concept: 'my-list', prompt: 'What does this return?', code: "(mymake-list-it 3 'a)", choices: ['(A A A)', '(A)', 'A', '((A) (A) (A))'], answer: 0,
      explain: { correct: 'Three times, CONS A onto the accumulator, which starts as NIL.', wrong: { 1: 'DOTIMES runs 3 times.', 2: 'It returns ACC, the list.', 3: 'ELEM is CONSed, not wrapped in a list.' } },
      verify: { form: "(mymake-list-it 3 'a)", expect: '(A A A)' } },
    { id: 'u3t6', type: 'predict', concept: 'my-list', prompt: 'What does this return?', code: "(my-first (my-cons 'b (my-cons 'a (make-my-list))))", choices: ['B', 'A', '(B A)', 'NIL'], answer: 0,
      explain: { correct: 'MY-CONS puts the new node at the head, so the most recent item, B, is first.', wrong: { 1: 'A was added first, so it\'s at the end now.', 2: 'MY-FIRST returns one data item.', 3: 'The list isn\'t empty.' } },
      verify: { form: "(my-first (my-cons 'b (my-cons 'a (make-my-list))))", expect: 'B' } },
    { id: 'u3t7', type: 'predict', concept: 'array-basics', prompt: 'What does the REPL print?', code: '(defvar *arr* (make-array 5 :initial-contents \'(1 2 3 4 5)))\n(setf (aref *arr* 3) 42)\n*arr*', choices: ['#(1 2 3 42 5)', '#(1 2 42 4 5)', '(1 2 3 42 5)', '#(42 2 3 4 5)'], answer: 0,
      explain: { correct: 'AREF indexes from 0: index 3 is the fourth element.', wrong: { 1: 'Index 3 is the fourth slot, not the third.', 2: 'Arrays print with #( ).', 3: 'Only index 3 changes.' } },
      verify: { setup: "(defvar *arr* (make-array 5 :initial-contents '(1 2 3 4 5))) (setf (aref *arr* 3) 42)", form: '*arr*', expect: '#(1 2 3 42 5)' } },
    { id: 'u3t8', type: 'predict', concept: 'list-basics', prompt: 'What does this return?', code: "(dolist (x '(1 2 3))\n  (if (evenp x) (return \"HI\")))", choices: ['"HI"', 'NIL', '2', '(1 2 3)'], answer: 0,
      explain: { correct: 'RETURN leaves the DOLIST early with "HI" at x = 2.', wrong: { 1: 'Without the RETURN it would return NIL.', 2: 'The return value is "HI", not x.', 3: 'DOLIST doesn\'t return its list.' } },
      verify: { form: "(dolist (x '(1 2 3)) (if (evenp x) (return \"HI\")))", expect: '"HI"' } },
    { id: 'u3t9', type: 'mcq', concept: 'cache', prompt: 'Python\'s list is…', choices: ['An array of references (dynamic array)', 'A linked list', 'A hash table', 'A cons chain'], answer: 0,
      explain: { correct: 'That\'s why my_list[i] is O(1) and insert(0, x) is O(n) in Python.', wrong: { 1: 'Python lists index in O(1): array behaviour.', 2: 'That\'s Python\'s dict.', 3: 'Lisp lists are cons chains; Python\'s aren\'t.' } },
      misconception: 'Python lists are linked lists.' },
    { id: 'u3t10', type: 'mcq', concept: 'cache', prompt: 'A linked list never shifts elements. Why can an array still be faster in practice?', choices: ['Contiguous memory means better cache locality, and no per-node pointer overhead', 'Arrays use less CPU', 'Linked lists can\'t hold numbers', 'Arrays are always O(1)'], answer: 0,
      explain: { correct: 'Neighbouring elements arrive in the cache together; list nodes are scattered and each one carries extra references.', wrong: { 1: 'It\'s about memory access patterns, not CPU usage.', 2: 'Lists can hold any type, even mixed types.', 3: 'Array insertion is O(n).' } },
      misconception: 'Linked lists always win because they never shift.' }
  ];

  var boss = [
    { id: 'u3b1', type: 'task', task: 'surgery', concept: 'pointer-order', kindT: 'insert', values: [3, 8, 5, 1], after: 1, x: 7, prompt: 'Hands-on: insert 7 after 8 without losing anything.' },
    { id: 'u3b2', type: 'bigo', concept: 'insert-cost', prompt: 'Insert a value at index i of a singly linked list (only HEAD is known):', choices: ['O(n): walk to i, then O(1) relinking', 'O(1)', 'O(log n)', 'O(n²)'], answer: 0,
      explain: { correct: 'Reaching position i takes up to n steps; the relink itself is constant.', wrong: { 1: 'Only true once you already have the node before position i.', 2: 'There is no halving: you follow links one by one.', 3: 'One walk, one relink.' } },
      misconception: 'Linked-list insertion is always O(1).' },
    { id: 'u3b3', type: 'mcq', concept: 'array-basics', prompt: 'Which is O(1) for an array but O(n) for a linked list?', choices: ['Reading the element at index i', 'Adding to the front', 'Removing the first element', 'Storing mixed types'], answer: 0,
      explain: { correct: 'Address arithmetic jumps straight to index i.', wrong: { 1: 'Prepend is the other way round: O(n) array, O(1) list.', 2: 'Removing the head is O(1) for a list, O(n) for an array (shift).', 3: 'That\'s about types, not time.' } } },
    { id: 'u3b4', type: 'predict', concept: 'cons-cells', prompt: 'What does the REPL print?', code: "(cons '(1 2) 3)", choices: ['((1 2) . 3)', '(1 2 3)', '((1 2) 3)', '(1 2 . 3)'], answer: 0,
      explain: { correct: 'The CAR is the list (1 2) and the CDR is the atom 3: a dotted pair.', wrong: { 1: 'CONS doesn\'t splice the list in.', 2: 'The CDR is 3, not (3).', 3: 'The CAR is the whole list (1 2), not 1.' } },
      verify: { form: "(cons '(1 2) 3)", expect: '((1 2) . 3)' } },
    { id: 'u3b5', type: 'mcq', concept: 'list-basics', prompt: 'Doubly linked list nodes hold…', choices: ['Data plus references to both the next and the previous node', 'Two data items', 'Data plus a reference to the head', 'Twice as many nodes'], answer: 0,
      explain: { correct: 'So you can walk in both directions (at the cost of an extra reference per node).', wrong: { 1: 'Doubly refers to the links.', 2: 'That\'s not a standard variant.', 3: 'Same number of nodes, more references each.' } } },
    { id: 'u3b6', type: 'predict', concept: 'my-list', prompt: 'What does this return?', code: "(my-list-size (my-cons 'c (my-cons 'b (my-cons 'a (make-my-list)))))", choices: ['3', '0', '1', 'NIL'], answer: 0,
      explain: { correct: 'Each MY-CONS adds 1 to SIZE, which makes length O(1).', wrong: { 1: 'MAKE-MY-LIST starts at 0, then three MY-CONSes.', 2: 'Every MY-CONS increments it.', 3: 'SIZE is an integer.' } },
      verify: { form: "(my-list-size (my-cons 'c (my-cons 'b (my-cons 'a (make-my-list)))))", expect: '3' } },
    { id: 'u3b7', type: 'bigo', concept: 'flashback', flashback: 'Unit 2 · Big-O', prompt: 'Prepending n elements one at a time to the front of an array costs…', choices: ['O(n²)', 'O(n)', 'O(n log n)', 'O(1)'], answer: 0,
      explain: { correct: 'Each prepend shifts everything already there: 0 + 1 + … + (n−1) = n(n−1)/2.', wrong: { 1: 'That would be true for a linked list.', 2: 'Nothing halves here.', 3: 'Each prepend is O(current size).' } } },
    { id: 'u3b8', type: 'mcq', concept: 'flashback', flashback: 'Unit 4 · Recursion', prompt: 'MYMAKE-LIST-REC passes ACC along. That makes it…', choices: ['Tail recursive', 'Branching recursion', 'Exponential', 'Not recursive'], answer: 0,
      explain: { correct: 'The recursive call is the last thing it does: the running list is the accumulator.', wrong: { 1: 'It makes one call per level.', 2: 'One call per element: linear.', 3: 'It calls itself.' } } }
  ];

  var cards = {
    'u3-array': { title: 'Arrays', unit: 3, def: 'Contiguous memory. Index i by address arithmetic. Prepend/insert shifts elements; full arrays reallocate.', cost: 'Index O(1) · prepend/insert O(n) · good cache locality', lisp: "(aref #(1 2 3) 0)  ; (make-array 3)" },
    'u3-list': { title: 'Linked lists', unit: 3, def: 'Nodes hold data and a reference to the next node; NIL ends the list. Can hold mixed types; costs a reference per node.', cost: 'Prepend O(1) · index O(n) · insert at i = O(n) walk + O(1) relink', lisp: "(cons 'a '(b c))  ; (A B C)" },
    'u3-cons': { title: 'Cons cells', unit: 3, def: 'A cons cell has a CAR (first) and a CDR (rest). A list is a chain of cells ending in NIL; a non-list CDR prints as a dot.', cost: '(cons 1 2) → (1 . 2)', lisp: "(car '(a b)) ; A   (cdr '(a b)) ; (B)" },
    'u3-order': { title: 'Update order', unit: 3, def: 'When inserting, point the new node at its successor FIRST, then redirect the predecessor. The other order orphans the rest of the list.', cost: 'Two reference updates', lisp: '(setf (node-next new) (node-next prev)\n      (node-next prev) new)' }
  };

  C.unitData[3] = {
    id: 3, title: 'Arrays vs linked lists', room: 'The Pointer Workshop', bossTitle: 'The Chain Breaker',
    intro: 'The Pointer Workshop keeps losing parts: someone rewires the chains in the wrong order. Learn when to use an array, when to use a list, and how to relink safely.',
    lisp: lisp, consPool: consPool, explain: explain, prompts: {}, templates: templates, concepts: concepts, briefing: briefing,
    games: games, trace: trace, boss: boss, cards: cards,
    summary: { canExplain: [
      'Why arrays index in O(1) but prepend in O(n).',
      'Why linked lists prepend in O(1) but index in O(n), and why "insert is O(1)" needs a caveat.',
      'In which order to update references so no node is orphaned.',
      'How cons cells build Lisp lists, and when a dot appears in the printed form.',
      'Why arrays often win in practice anyway (cache locality, less memory per element).'
    ] }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
