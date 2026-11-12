/* CPS305 Quest — content/unit11.js
 * Unit 11: Trees (Topic 11). DATA ONLY. Traversal orders, terminology answers
 * and parse trees are computed by engine/trees.js; the Lisp matches lisp/unit11.lisp.
 */
(function (root) {
  'use strict';
  var C = root.CQ.content;

  var lisp = {
    btPre: { title: 'BT-PRE-ORDER (lecture)', code: '(defun bt-pre-order (node fn)\n  (when node\n    (funcall fn (key node))\n    (bt-pre-order (lc node) fn)\n    (bt-pre-order (rc node) fn)))', anchors: {} },
    btIn: { title: 'BT-IN-ORDER (same pattern)', code: '(defun bt-in-order (node fn)\n  (when node\n    (bt-in-order (lc node) fn)\n    (funcall fn (key node))\n    (bt-in-order (rc node) fn)))', anchors: {} },
    btPost: { title: 'BT-POST-ORDER (lecture)', code: '(defun bt-post-order (node fn)\n  (when node\n    (bt-post-order (lc node) fn)\n    (bt-post-order (rc node) fn)\n    (funcall fn (key node))))', anchors: {} },
    level: { title: 'LEVEL-ORDER (lecture)', code: '(defun level-order (tree fn)\n  (let ((queue (list tree))\n        (node nil))\n    (loop while queue do\n      (setf node (pop queue))\n      (funcall fn (first node))\n      (dolist (child (rest node))\n        (setf queue\n              (append queue (list child)))))))', anchors: {} },
    insert: { title: 'INSERT-LEFT (lecture)', code: '(defun insert-left (node item)\n  (if (null (lc node))\n      (setf (lc node) (make-tree-node :key item))\n      (setf (lc node) (make-tree-node :key item :lc (lc node)))))', anchors: {} }
  };

  var concepts = {
    'terminology': 'Tree terminology',
    'depth-level-height': 'Depth, level and height',
    'binary-trees': 'Binary trees (TREE-NODE)',
    'nary-lists': 'N-ary trees as lists of lists',
    'dfs': 'Depth-first: pre / in / post-order',
    'bfs': 'Breadth-first: level order with a queue',
    'parse-trees': 'Parse trees',
    'flashback': 'Earlier units (flashback)'
  };

  var briefing = {
    core: 'A tree is a hierarchy with no cycles: a root, children, and leaves; we visit every node either depth-first (pre-, in- or post-order, naturally recursive) or breadth-first (level by level, using a queue).',
    steps: [
      { kind: 'treeTour', title: 'Meet a tree', text: 'The lecture\'s binary tree. Tap any node to see its parent, children, depth, level and height.',
        after: 'Depth counts edges from the root (root depth 0); level is depth + 1; height counts edges down to the farthest leaf. A tree has no cycles.' },
      { kind: 'twoOrders', title: 'Two ways to visit', text: 'Watch a depth-first (pre-order) visit and a breadth-first (level-order) visit side by side.',
        after: 'Depth-first dives down one branch before backtracking, keeping its place on the call stack. Breadth-first visits level by level, keeping waiting nodes in a queue.' },
      { kind: 'check', title: 'Say it in one sentence',
        question: { id: 'brief11-core', type: 'mcq', concept: 'bfs', prompt: 'What does level-order traversal use to remember which nodes to visit next?',
          choices: ['A queue', 'A stack (recursion)', 'A hash table', 'Nothing: it just reads left to right'], answer: 0,
          explain: { correct: 'Visit the front of the queue, add its children at the back: level by level.', wrong: { 1: 'That\'s depth-first: recursion uses the call stack.', 2: 'No hashing is needed.', 3: 'Nodes aren\'t stored level by level, so something must remember the waiting ones.' } } } }
    ]
  };

  var games = [
    {
      id: 'trail', title: 'Traversal Trail', verb: 'Click in order', icon: '👣',
      blurb: 'Click the nodes in pre-, in-, post- or level order, with the call stack or the queue shown beside the tree.',
      concepts: ['dfs', 'bfs'],
      levels: [
        { id: 'binary', mode: 'try', title: 'The lecture\'s binary tree', goal: 'Four orders on *bt*. Hints on.', kind: 'trail', tree: 'binary', orders: ['pre', 'in', 'post', 'level'] },
        { id: 'nary', mode: 'solo', title: 'An n-ary tree', goal: 'Pre, post and level order on a list-of-lists tree. No hints.', kind: 'trail', tree: 'nary', orders: ['pre', 'post', 'level'], askIn: true },
        { id: 'random', mode: 'solo', title: 'Random binary trees', goal: 'A fresh tree each time, any order.', kind: 'trail', tree: 'random', orders: ['pre', 'in', 'post', 'level'], tiers: [7, 9, 11] }
      ]
    },
    {
      id: 'tags', title: 'Terminology Tagging', verb: 'Tap the node', icon: '🏷',
      blurb: 'Tap the sibling of X, the leaves, the ancestors; name the depth, level and height.',
      concepts: ['terminology', 'depth-level-height'],
      levels: [
        { id: 'try', mode: 'try', title: 'Name the parts', goal: 'Six questions on one tree. Hints on.', kind: 'tags', count: 6, tree: 'terms' },
        { id: 'solo', mode: 'solo', title: 'Off-by-one traps', goal: 'Depth vs level vs height on the binary tree. No hints.', kind: 'tags', count: 6, tree: 'binary' }
      ]
    },
    {
      id: 'parse', title: 'Build the Parse Tree', verb: 'Build & evaluate', icon: '🌱',
      blurb: 'Turn an infix expression into a parse tree (pick each root operator), then evaluate it from the leaves up.',
      concepts: ['parse-trees'],
      levels: [
        { id: 'try', mode: 'try', title: '3/(4−2)', goal: 'Build the lecture\'s example, then evaluate it bottom-up.', kind: 'parse', exprs: ['3/(4-2)', '(7+3)*(5-2)'] },
        { id: 'solo', mode: 'solo', title: 'Precedence', goal: 'No parentheses to help you. No hints.', kind: 'parse', exprs: ['2+3*4', '8-2-1', '6/3+4*2'] }
      ]
    },
    {
      id: 'tolists', title: 'Tree to Lists', verb: 'Translate', icon: '📜',
      blurb: 'Diagrams to list-of-lists form and back: first is the label, rest are the subtrees.',
      concepts: ['nary-lists'],
      levels: [
        { id: 'try', mode: 'try', title: 'Read the lists', goal: 'Match diagrams and list-of-lists forms.', kind: 'tolists', count: 4 }
      ]
    }
  ];

  var templates = {
    orderNames: { pre: 'pre-order (root, then children left to right)', 'in': 'in-order (left, root, right)', post: 'post-order (children, then root)', level: 'level order (breadth-first)' },
    trailPrompt: 'Visit the nodes in **{order}**. Tap the next node.',
    trailWrong: { pre: 'Pre-order visits a node **before** its subtrees. Next is {exp}.', 'in': 'In-order finishes the whole left subtree first, then the node, then the right subtree. Next is {exp}.', post: 'Post-order visits a node only **after** all its children. Next is {exp}.', level: 'Level order takes the front of the queue: {exp}. Children wait at the back.' },
    inQ: { prompt: 'Can you do an in-order traversal of this tree?', ok: 'No: "left, root, right" needs exactly two child slots. MAX has three children, so in-order isn\'t defined. It\'s for binary trees only.', bad: 'In-order needs a left and a right subtree. With three or more children, where does the root go?', misconception: 'In-order applies to any tree.' },
    parseRoot: 'Which operator is the **root** of {expr}? (It is applied last.)',
    parseRootWhy: 'The root is the operator applied last: outside all parentheses, and the lowest precedence (+ − before * /); with ties, the rightmost of left-associative operators.',
    evalPrompt: 'Evaluate bottom-up: tap a node whose children are already values.',
    evalWrong: 'Node {op} can\'t be evaluated yet: its children aren\'t values. Start from the leaves.'
  };

  var trace = [
    { id: 'u11t1', type: 'predict', concept: 'nary-lists', prompt: 'What does this return?', code: "(second '(a (b (e) (f)) (c (g)) (d)))", choices: ['(B (E) (F))', 'B', '((B (E) (F)) (C (G)) (D))', '(C (G))'], answer: 0,
      explain: { correct: 'SECOND is the first subtree, a whole list.', wrong: { 1: 'That\'s (first (second ...)): the subtree\'s label.', 2: 'That\'s REST: all the subtrees.', 3: 'That\'s the second subtree, i.e. THIRD.' } },
      verify: { form: "(second '(a (b (e) (f)) (c (g)) (d)))", expect: '(B (E) (F))' } },
    { id: 'u11t2', type: 'predict', concept: 'nary-lists', prompt: 'What does this return?', code: "(rest '(d))", choices: ['NIL', '(D)', 'D', 'An error'], answer: 0,
      explain: { correct: 'A leaf is a one-element list: it has no subtrees.', wrong: { 1: 'REST drops the label.', 2: 'That\'s FIRST.', 3: 'REST of a one-element list is NIL.' } },
      verify: { form: "(rest '(d))", expect: 'NIL' } },
    { id: 'u11t3', type: 'predict', concept: 'dfs', prompt: 'The labels collected in visit order:', code: "(let ((acc nil))\n  (pre-order *tree* (lambda (k) (push k acc)))\n  (reverse acc))   ; *tree* = (* (E (F)) (+ (D) (MAX (A) (B) (C))))", choices: ['(* E F + D MAX A B C)', '(* E + F D MAX A B C)', '(F E D A B C MAX + *)', '(E F * D + A B C MAX)'], answer: 0,
      explain: { correct: 'Root first, then each subtree completely, left to right.', wrong: { 1: 'That\'s level order (breadth-first).', 2: 'That\'s post-order.', 3: 'In-order isn\'t defined for this tree.' } },
      verify: { form: "(let ((acc nil)) (pre-order *tree* (lambda (k) (push k acc))) (reverse acc))", expect: '(* E F + D MAX A B C)' } },
    { id: 'u11t4', type: 'predict', concept: 'bfs', prompt: 'The labels collected in visit order:', code: "(let ((acc nil))\n  (level-order *tree* (lambda (k) (push k acc)))\n  (reverse acc))", choices: ['(* E + F D MAX A B C)', '(* E F + D MAX A B C)', '(* + E MAX D F C B A)', '(F E D A B C MAX + *)'], answer: 0,
      explain: { correct: 'Level by level, left to right: the queue holds the next level.', wrong: { 1: 'That\'s pre-order (depth-first).', 2: 'Children are added at the back of the queue, left to right.', 3: 'That\'s post-order.' } },
      verify: { form: "(let ((acc nil)) (level-order *tree* (lambda (k) (push k acc))) (reverse acc))", expect: '(* E + F D MAX A B C)' } },
    { id: 'u11t5', type: 'predict', concept: 'dfs', prompt: 'In-order on the lecture\'s *bt*:', code: "(let ((acc nil))\n  (bt-in-order *bt* (lambda (k) (push k acc)))\n  (reverse acc))", choices: ['(1 3 4 6 7 8 10 13 14)', '(8 3 1 6 4 7 10 14 13)', '(1 4 7 6 3 13 14 10 8)', '(8 3 10 1 6 14 4 7 13)'], answer: 0,
      explain: { correct: 'Left subtree, root, right subtree, recursively. (On this tree it comes out sorted.)', wrong: { 1: 'That\'s pre-order.', 2: 'That\'s post-order.', 3: 'That\'s level order.' } },
      verify: { form: "(let ((acc nil)) (bt-in-order *bt* (lambda (k) (push k acc))) (reverse acc))", expect: '(1 3 4 6 7 8 10 13 14)' } },
    { id: 'u11t6', type: 'predict', concept: 'binary-trees', prompt: 'INSERT-LEFT on a node that already has a left child. What is the key of the left child\'s left child?', code: "(let ((r (make-tree-node :key 3)))\n  (insert-left r 4)\n  (insert-left r 5)\n  (key (lc (lc r))))", choices: ['4', '5', '3', 'NIL'], answer: 0,
      explain: { correct: 'The new node (5) takes the left slot, and the old left child (4) becomes ITS left child.', wrong: { 1: '5 is the direct left child of 3.', 2: '3 is the root.', 3: 'The old child isn\'t thrown away: it moves down.' } },
      verify: { form: "(let ((r (make-tree-node :key 3))) (insert-left r 4) (insert-left r 5) (key (lc (lc r))))", expect: '4' } },
    { id: 'u11t7', type: 'predict', concept: 'nary-lists', prompt: 'What does this return?', code: "(add-subtree (make-tree 'a (make-tree 'b) (make-tree 'c))\n             (make-tree 'd (make-tree 'e)))", choices: ['(A (B) (C) (D (E)))', '(A (B) (C) D E)', '((A (B) (C)) (D (E)))', '(D (E) A (B) (C))'], answer: 0,
      explain: { correct: 'ADD-SUBTREE appends the new subtree as one more child of the root.', wrong: { 1: 'The subtree is added as a whole list, not spliced in.', 2: 'The root stays the first element.', 3: 'APPEND adds at the end.' } },
      verify: { form: "(add-subtree (make-tree 'a (make-tree 'b) (make-tree 'c)) (make-tree 'd (make-tree 'e)))", expect: '(A (B) (C) (D (E)))' } },
    { id: 'u11t8', type: 'predict', concept: 'parse-trees', prompt: 'A parse tree in Lisp is already a list of lists. What does this print?', code: "(eval '(* (+ 7 3) (- 5 2)))", choices: ['30', '20', '(* 10 3)', '17'], answer: 0,
      explain: { correct: 'Leaves up: (+ 7 3) = 10, (- 5 2) = 3, then (* 10 3) = 30.', wrong: { 1: 'Check (- 5 2) = 3.', 2: 'EVAL computes the whole tree.', 3: 'The * is the root: it\'s applied last.' } },
      verify: { form: "(eval '(* (+ 7 3) (- 5 2)))", expect: '30' } },
    { id: 'u11t9', type: 'mcq', concept: 'depth-level-height', prompt: 'In the lecture\'s *bt* (root 8), what is the depth of node 13?', choices: ['3', '4', '1', '2'], answer: 0,
      explain: { correct: '8 → 10 → 14 → 13: three edges from the root.', wrong: { 1: 'That\'s its level (depth + 1).', 2: 'Count every edge from the root down to 13.', 3: '13 is below 14, which is below 10.' } },
      misconception: 'Depth and level are the same thing.' },
    { id: 'u11t10', type: 'mcq', concept: 'bfs', prompt: 'Depth-first and breadth-first traversals differ in…', choices: ['Visit order AND the structure that drives them: recursion (a stack) vs a queue', 'Only the order of the output', 'Only speed', 'Nothing for binary trees'], answer: 0,
      explain: { correct: 'DFS is naturally recursive (the call stack remembers where to return); BFS needs an explicit queue.', wrong: { 1: 'The order follows from the data structure that drives each one.', 2: 'Both visit every node once: O(n).', 3: 'They differ on every tree with more than one level.' } },
      misconception: 'DFS and BFS differ only in output order.' }
  ];

  var boss = [
    { id: 'u11b1', type: 'task', task: 'trail', concept: 'dfs', order: 'post', prompt: 'Hands-on: click *bt*\'s nodes in post-order.' },
    { id: 'u11b2', type: 'mcq', concept: 'depth-level-height', prompt: 'The height of the lecture\'s *bt* (root 8; deepest leaf 13 at depth 3) is…', choices: ['3', '4', '9', '2'], answer: 0,
      explain: { correct: 'Tree height = edges on the longest path from the root down to a leaf: 8-10-14-13.', wrong: { 1: 'That counts nodes, not edges (or confuses height with level).', 2: 'That\'s the number of nodes.', 3: 'The path to 13 has three edges.' } } },
    { id: 'u11b3', type: 'mcq', concept: 'terminology', prompt: 'Which statement about trees is true?', choices: ['A tree has no cycles', 'Every node has two children', 'Leaves have exactly one child', 'The root has a parent'], answer: 0,
      explain: { correct: 'One path from the root to each node: no cycles, directed or undirected.', wrong: { 1: 'That\'s at most two, and only for binary trees.', 2: 'Leaves have no children.', 3: 'The root is the only node without a parent.' } } },
    { id: 'u11b4', type: 'predict', concept: 'dfs', prompt: 'Post-order on *bt*:', code: "(let ((acc nil))\n  (bt-post-order *bt* (lambda (k) (push k acc)))\n  (reverse acc))", choices: ['(1 4 7 6 3 13 14 10 8)', '(8 3 1 6 4 7 10 14 13)', '(1 3 4 6 7 8 10 13 14)', '(13 14 10 7 4 6 1 3 8)'], answer: 0,
      explain: { correct: 'Children first, root last: the root 8 is visited at the very end.', wrong: { 1: 'That\'s pre-order.', 2: 'That\'s in-order.', 3: 'Left subtree before right subtree.' } },
      verify: { form: "(let ((acc nil)) (bt-post-order *bt* (lambda (k) (push k acc))) (reverse acc))", expect: '(1 4 7 6 3 13 14 10 8)' } },
    { id: 'u11b5', type: 'mcq', concept: 'parse-trees', prompt: 'In the parse tree of 3/(4−2), what is the root?', choices: ['/', '-', '3', '('], answer: 0,
      explain: { correct: 'Division is applied last: / is the root, with 3 on the left and the subtree for (4−2) on the right.', wrong: { 1: '(4−2) is computed first, so − is lower in the tree.', 2: 'Numbers are leaves.', 3: 'Parentheses only group; they aren\'t nodes.' } } },
    { id: 'u11b6', type: 'predict', concept: 'nary-lists', prompt: 'What does this return?', code: "(search-tree 'max *tree*)", choices: ['T', 'NIL', 'MAX', '(MAX (A) (B) (C))'], answer: 0,
      explain: { correct: 'SEARCH-TREE recurses through FIRST and REST until it finds an atom EQL to MAX.', wrong: { 1: 'MAX is in the tree.', 2: 'It returns (eql item tree): T.', 3: 'It returns T/NIL, not the subtree.' } },
      verify: { form: "(search-tree 'max *tree*)", expect: 'T' } },
    { id: 'u11b7', type: 'mcq', concept: 'flashback', flashback: 'Unit 8 · Queues', prompt: 'LEVEL-ORDER keeps its queue as a list and uses (append queue (list child)). Each enqueue costs…', choices: ['O(n): APPEND copies the list', 'O(1)', 'O(log n)', 'Nothing'], answer: 0,
      explain: { correct: 'APPEND walks and copies its first argument. A queue with a back reference would make it O(1).', wrong: { 1: 'Only with a back reference (or a circular buffer).', 2: 'No halving.', 3: 'APPEND does real work.' } } },
    { id: 'u11b8', type: 'mcq', concept: 'flashback', flashback: 'Unit 4 · Recursion', prompt: 'BT-PRE-ORDER calls itself twice per node. Is it exponential like FIB-REC?', choices: ['No: each node is visited once, O(n)', 'Yes: two calls per level', 'Only on unbalanced trees', 'Only with TCO'], answer: 0,
      explain: { correct: 'The two calls go to disjoint subtrees: no overlap, each node once.', wrong: { 1: 'Branching is only explosive when subproblems overlap.', 2: 'Shape changes depth, not the total of n visits.', 3: 'TCO is about stack frames, not the number of calls.' } } }
  ];

  var cards = {
    'u11-terms': { title: 'Tree terminology', unit: 11, def: 'Root, parent/child, sibling, ancestor/descendant, leaf (no children), internal node, degree (number of children), edge, branch (root-to-leaf path). No cycles.', cost: 'Depth = edges from root; level = depth + 1; height = edges down to the farthest leaf', lisp: "(defstruct (tree-node (:conc-name nil)) key (lc nil) (rc nil))" },
    'u11-dfs': { title: 'Depth-first traversals', unit: 11, def: 'Pre-order: root, then children. In-order (binary only): left, root, right. Post-order: children, then root. Naturally recursive.', cost: 'O(n), each node once', lisp: '(funcall fn (key node)) ; where this line sits decides the order' },
    'u11-bfs': { title: 'Level order (breadth-first)', unit: 11, def: 'Visit the front of a queue, add its children at the back. Level by level, left to right.', cost: 'O(n) visits (plus APPEND\'s copying with a list-based queue)', lisp: '(setf queue (append queue (list child)))' },
    'u11-lists': { title: 'Trees as lists of lists', unit: 11, def: 'First = label, rest = subtrees; a leaf is a one-element list. A Lisp prefix expression is already a parse tree.', cost: "(* (+ 7 3) (- 5 2)) evaluates leaves up: 30", lisp: "'(A (B (E) (F)) (C (G)) (D))" }
  };

  C.unitData[11] = {
    id: 11, title: 'Trees', room: 'The Greenhouse', bossTitle: 'The Old Oak',
    intro: 'The Greenhouse\'s plant catalogue is a tangle of branches. Learn to name every part of a tree and to visit every node in exactly the right order.',
    lisp: lisp, explain: {}, prompts: {}, templates: templates, concepts: concepts, briefing: briefing,
    games: games, trace: trace, boss: boss, cards: cards,
    summary: { canExplain: [
      'Root, leaf, sibling, ancestor, degree, and the difference between depth, level and height.',
      'How the lecture builds binary trees with TREE-NODE and INSERT-LEFT / INSERT-RIGHT.',
      'How pre-, in- and post-order differ, and why in-order is for binary trees only.',
      'Why level order needs a queue while depth-first traversals use recursion (a stack).',
      'How a parse tree is built and evaluated from the leaves up, and why Lisp code is already one.'
    ] }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
