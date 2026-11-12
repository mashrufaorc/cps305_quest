/* CPS305 Quest — content/unit0.js
 * Unit 0: Why data structures? (Topic 1). DATA ONLY. The best structure for
 * each scenario is computed by engine/choose.js from its operation mix.
 */
(function (root) {
  'use strict';
  var C = root.CQ.content;

  /* Scenarios: operation counts per "day", the size n, and which structures to offer. */
  var scenarios = [
    { id: 'drive', tier: 1, title: 'Drive-through line', text: 'Cars join at the back and are served from the front, thousands a day.', ops: { append: 5000, removeFront: 5000 }, n: 1000, offer: ['array', 'list', 'ring'], adt: 'queue' },
    { id: 'prepend', tier: 1, title: 'Breaking-news feed', text: 'Every new story goes on top of the feed; readers scroll from the top.', ops: { prepend: 5000, iterate: 20 }, n: 10000, offer: ['array', 'list'], adt: 'list' },
    { id: 'lookup', tier: 1, title: 'Student records by ID', text: 'Thousands of lookups by student number every hour; new students are rare.', ops: { lookupKey: 20000, insertKey: 50 }, n: 30000, offer: ['array', 'list', 'hash'], adt: 'map' },
    { id: 'pixels', tier: 2, title: 'Image pixels', text: 'A filter reads pixel number i over and over; the image never grows.', ops: { index: 100000 }, n: 1000000, offer: ['array', 'list', 'hash'], adt: 'array' },
    { id: 'undo', tier: 2, title: 'Undo history', text: 'Every edit is saved; Undo takes back the most recent one.', ops: { push: 3000, pop: 1000 }, n: 5000, offer: ['array', 'list', 'ring'], adt: 'stack', note: 'A stack works on either: the end of an array or the front of a linked list. Both are O(1).' },
    { id: 'spell', tier: 2, title: 'Spell checker', text: 'Is this word in the dictionary? Asked for every word you type.', ops: { membership: 50000 }, n: 100000, offer: ['list', 'sorted', 'hash'], adt: 'set' },
    { id: 'phone', tier: 3, title: 'Printed phone book', text: 'Names must be listed in alphabetical order, and people look names up.', ops: { rangeQuery: 10000, iterate: 5 }, n: 50000, offer: ['hash', 'sorted', 'list'], adt: 'sorted' },
    { id: 'org', tier: 3, title: 'Company org chart', text: 'Who reports to whom? Walk from a manager to their team and back up.', ops: { parentChild: 5000, hierarchy: 1 }, n: 2000, offer: ['array', 'hash', 'tree'], adt: 'tree' },
    { id: 'playlist', tier: 3, title: 'Playlist editor', text: 'Songs are inserted between others while you hold the spot you\'re editing; nobody jumps to song #500.', ops: { insertAtRef: 2000, iterate: 50 }, n: 500, offer: ['array', 'list'], adt: 'list', note: 'With a reference to the spot already in hand, a list relinks in O(1); an array still shifts everything after it.' }
  ];

  /* Extra scenarios for the cross-unit "Pick the Right Structure" mode. */
  var crossScenarios = [
    { id: 'brackets', tier: 3, title: 'Bracket checker', text: 'Each [ waits for its matching ]; the most recent open bracket must close first.', ops: { push: 4000, pop: 4000 }, n: 2000, offer: ['ring', 'hash', 'list'], adt: 'stack' },
    { id: 'bfs', tier: 3, title: 'Level-order traversal', text: 'Visit a tree level by level: children wait their turn at the back.', ops: { append: 10000, removeFront: 10000 }, n: 10000, offer: ['array', 'ring', 'sorted'], adt: 'queue' },
    { id: 'cache', tier: 3, title: 'Web cache', text: 'Has this URL been fetched before? Check on every request; add new ones as they come.', ops: { membership: 80000, insertKey: 5000 }, n: 50000, offer: ['list', 'sorted', 'hash'], adt: 'set' },
    { id: 'leaderboard', tier: 3, title: 'Leaderboard', text: 'Players are listed by score; a few scores change per minute, the whole board is shown constantly.', ops: { rangeQuery: 30000, insertKey: 10 }, n: 10000, offer: ['hash', 'sorted', 'list'], adt: 'sorted' },
    { id: 'filesystem', tier: 3, title: 'File system', text: 'Folders contain folders and files; you open a folder and go back up.', ops: { parentChild: 20000, hierarchy: 1 }, n: 100000, offer: ['array', 'tree', 'hash'], adt: 'tree' }
  ];

  /* ADT or data structure? */
  var adtCards = [
    ['Queue', 'adt', 'A queue is defined by its behaviour (FIFO: enqueue, dequeue), not its layout.'],
    ['Circular buffer', 'ds', 'A concrete layout (an array plus head and tail indexes) that can implement a queue.'],
    ['Stack', 'adt', 'Defined by behaviour: LIFO push and pop.'],
    ['Linked list', 'ds', 'A concrete layout: nodes holding data and references.'],
    ['Dynamic array', 'ds', 'Contiguous memory that grows by reallocating.'],
    ['Set', 'adt', 'Defined by behaviour: no duplicates, membership, union, …'],
    ['Hash table', 'ds', 'A concrete implementation: an array plus a hash function.'],
    ['Map (dictionary)', 'adt', 'Key → value behaviour; a hash table or an a-list can implement it.'],
    ['Association list', 'ds', 'A concrete implementation of a map: a list of cons pairs.'],
    ['Deque', 'adt', 'Behaviour: add and remove at both ends; implemented by a circular buffer, a doubly linked list or two stacks.']
  ];

  var concepts = {
    'ds-definition': 'What a data structure is',
    'adt-vs-ds': 'ADT vs data structure',
    'context': '"Better" depends on the operations',
    'cases': 'Best, worst and input size',
    'flashback': 'Later units (preview)'
  };

  var briefing = {
    core: 'A data structure is values, the relationships between them, and the operations on them, so whether it is "efficient" depends on which operations you do most; an ADT (like a queue) is the behaviour, and a data structure (like a circular buffer) is one way to build it.',
    steps: [
      { kind: 'twoTools', title: 'Same data, two jobs', text: 'One list of 10,000 numbers, stored two ways. Job 1: read item #9,000. Job 2: add a new item at the front.',
        after: 'The array wins job 1 (O(1) index) and loses job 2 (O(n) shift). The linked list is the opposite. Neither is "faster" until you know the job.' },
      { kind: 'check', title: 'ADT or data structure?',
        question: { id: 'brief0-adt', type: 'mcq', concept: 'adt-vs-ds', prompt: 'Which pair is "an ADT and one data structure that implements it"?',
          choices: ['Queue, and a circular buffer', 'A circular buffer, and a queue', 'An array, and a linked list', 'A hash table, and a set'], answer: 0,
          explain: { correct: 'The queue is the concept (FIFO); the circular buffer is the implementation.', wrong: { 1: 'Reversed: the queue is the concept.', 2: 'Both are data structures (layouts).', 3: 'Reversed: the set is the concept, the hash table one way to implement it.' } },
          misconception: 'An ADT and a data structure are the same thing.' } },
      { kind: 'check', title: 'Say it in one sentence',
        question: { id: 'brief0-core', type: 'mcq', concept: 'context', prompt: 'Why can\'t you say "a hash table is better than a list" in general?',
          choices: ['Which is better depends on which operations happen most, and on input size and order', 'Because hash tables are always better', 'Because lists are simpler', 'Because they hold different types'], answer: 0,
          explain: { correct: 'Efficiency is about operations: by key → hash table; in order or by position → something else.', wrong: { 1: 'Hash tables can\'t give you sorted order or index positions.', 2: 'Simplicity isn\'t the reason to pick a structure.', 3: 'Both can hold any type.' } },
          misconception: '"Elegant" or "simple" is a valid reason to pick a structure.' } }
    ]
  };

  var games = [
    {
      id: 'righttool', title: 'Right Tool', verb: 'Pick a structure', icon: '🧰',
      blurb: 'Scenario cards: pick the structure, and see the cost of a wrong choice on a live counter.',
      concepts: ['context', 'cases'],
      levels: [
        { id: 'try', mode: 'try', title: 'Everyday jobs', goal: 'Pick the best structure for each job. Hints on.', kind: 'righttool', count: 4, tiers: [1, 2, 3] },
        { id: 'solo', mode: 'solo', title: 'Trickier jobs', goal: 'No hints.', kind: 'righttool', count: 4, tiers: [2, 3, 3] }
      ]
    },
    {
      id: 'adt', title: 'ADT or Not?', verb: 'Classify', icon: '🏷',
      blurb: 'Concept or implementation? Sort ADTs from the data structures that build them.',
      concepts: ['adt-vs-ds'],
      levels: [
        { id: 'try', mode: 'try', title: 'Concept or build?', goal: 'Rapid fire: ADT or data structure.', kind: 'adt', count: 8 }
      ]
    }
  ];

  var trace = [
    { id: 'u0t1', type: 'mcq', concept: 'ds-definition', prompt: 'A data structure is…', choices: ['Values, the relationships between them, and the operations on them', 'Just a way to store values in memory', 'A programming language feature', 'The same as an algorithm'], answer: 0,
      explain: { correct: 'The operations are part of it, which is why efficiency can\'t be judged apart from them.', wrong: { 1: 'Without the operations you can\'t say anything about efficiency.', 2: 'Data structures exist in every language.', 3: 'Algorithms operate on data structures.' } } },
    { id: 'u0t2', type: 'mcq', concept: 'context', prompt: 'An array gives O(1) access by index. What does it cost to prepend?', choices: ['O(n): every element shifts', 'O(1)', 'O(log n)', 'Nothing'], answer: 0,
      explain: { correct: 'Index 0 must be freed by moving everything over.', wrong: { 1: 'That\'s the linked list.', 2: 'Nothing halves.', 3: 'Shifting is real work.' } } },
    { id: 'u0t3', type: 'mcq', concept: 'context', prompt: 'Python: `x in my_list` vs `x in my_set` for a million items?', choices: ['The list scans (O(n)); the set hashes (O(1) average)', 'Both O(1)', 'Both O(n)', 'The list is faster: it\'s simpler'], answer: 0,
      explain: { correct: 'Same question, different structures, very different cost.', wrong: { 1: 'A list has to compare items one by one.', 2: 'A set uses a hash table.', 3: 'Simple isn\'t fast.' } } },
    { id: 'u0t4', type: 'mcq', concept: 'cases', prompt: '"Algorithm A is faster than B." What is missing from that claim?', choices: ['The context: input size, best vs worst case, input order', 'Nothing', 'The programming language only', 'The colour of the code'], answer: 0,
      explain: { correct: 'Insertion sort beats merge sort on small or nearly sorted inputs and loses badly on large random ones.', wrong: { 1: 'Faster on which inputs, and how big?', 2: 'Analysis is language-independent; context matters more.', 3: 'Ha. Context matters.' } } },
    { id: 'u0t5', type: 'mcq', concept: 'adt-vs-ds', prompt: 'A stack is LIFO. Which of these is a data structure that can implement it?', choices: ['A dynamic array (push/pop at the end)', 'LIFO', 'A queue', 'A set'], answer: 0,
      explain: { correct: 'The array is the build; the stack is the behaviour.', wrong: { 1: 'LIFO is the behaviour, the ADT\'s rule.', 2: 'A queue is another ADT (FIFO).', 3: 'A set has no order at all.' } },
      misconception: 'An ADT and a data structure are the same thing.' },
    { id: 'u0t6', type: 'mcq', concept: 'context', prompt: 'You picked a linked list "because it\'s elegant". Lookups by position dominate your program. Result?', choices: ['Every lookup walks the list: O(n) each', 'It\'s fine: elegance wins', 'O(1) lookups', 'The list sorts itself'], answer: 0,
      explain: { correct: 'Choose from the operations, not the aesthetics.', wrong: { 1: 'The cost is real, whatever it looks like.', 2: 'Only arrays index in O(1).', 3: 'No.' } },
      misconception: '"Elegant" is a valid reason to pick a structure.' }
  ];

  var boss = [
    { id: 'u0b1', type: 'task', task: 'righttool', concept: 'context', scenario: 'spell', prompt: 'Hands-on: pick the structure for a spell checker.' },
    { id: 'u0b2', type: 'mcq', concept: 'adt-vs-ds', prompt: 'Which is an ADT?', choices: ['Map (dictionary)', 'Hash table', 'Association list', 'Circular buffer'], answer: 0,
      explain: { correct: 'A map is key → value behaviour. The others are ways to build things.', wrong: { 1: 'A hash table is one implementation of a map.', 2: 'An a-list is another implementation of a map.', 3: 'A circular buffer is a layout (it can implement a queue).' } } },
    { id: 'u0b3', type: 'mcq', concept: 'context', prompt: 'Lots of add-to-front, rare reads by position. Pick:', choices: ['Linked list', 'Array', 'Sorted array', 'Hash table'], answer: 0,
      explain: { correct: 'O(1) prepend; the rare O(n) reads don\'t matter much.', wrong: { 1: 'Every prepend shifts the array.', 2: 'Inserting keeps everything shifting.', 3: 'No notion of a front.' } } },
    { id: 'u0b4', type: 'mcq', concept: 'cases', prompt: 'Linear search makes 1 comparison when the key is first. Its Big-O is still O(n) because…', choices: ['Big-O is an upper bound: the worst case is n', 'It is always n', 'Big-O is the best case', 'The key is never first'], answer: 0,
      explain: { correct: 'Best case 1, worst case n: O(n) describes the worst.', wrong: { 1: 'It can be 1.', 2: 'The other way round.', 3: 'It can be first.' } } }
  ];

  var cards = {
    'u0-ds': { title: 'Data structure', unit: 0, def: 'Values + relationships + operations. Efficiency only makes sense for given operations: array index O(1), prepend O(n).', cost: 'Choose by the most frequent operations', lisp: '; (aref arr i) vs (cons x lst)' },
    'u0-adt': { title: 'ADT vs data structure', unit: 0, def: 'An ADT is the concept and its behaviour (queue = FIFO, stack = LIFO). A data structure is how it\'s built (circular buffer, linked list).', cost: 'One ADT, many possible implementations', lisp: '; queue ADT -> circular buffer or linked list' }
  };

  C.unitData[0] = {
    id: 0, title: 'Why data structures?', room: 'The Loading Dock', bossTitle: 'The Foreman',
    intro: 'Welcome to Parenthesis Labs. At the Loading Dock every job needs the right container, and the wrong one costs you all day.',
    lisp: {}, scenarios: scenarios, crossScenarios: crossScenarios, adtCards: adtCards, explain: {}, prompts: {}, templates: {}, concepts: concepts, briefing: briefing,
    games: games, trace: trace, boss: boss, cards: cards,
    summary: { canExplain: [
      'What a data structure is, and why its efficiency depends on its operations.',
      'The difference between an ADT (the concept) and a data structure (the build).',
      'Why "better" and "faster" need context: which operations, best or worst case, how much data.'
    ] }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
