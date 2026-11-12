/* CPS305 Quest — content/unit10.js
 * Unit 10: Hash tables in Lisp (Topic 10). DATA ONLY.
 * Built-in hash table questions are verified in SBCL. Our own HT (the lecture's
 * HT-GET / HT-ADD) depends on SXHASH, whose values are implementation-specific,
 * so the labs state hash codes; these codes reproduce the lecture's printed tables.
 */
(function (root) {
  'use strict';
  var C = root.CQ.content;

  var CODES = { A: 1, B: 7, C: 14, D: 10, E: 18, F: 5, G: 3, H: 19, N: 2, Z: 9 };

  var HT_GET = [
    '(defun ht-get (key ht)',
    '  (let* ((size (length (ht-array ht)))',
    '         (h1 (rem (sxhash key) size)))   ; SXHASH: integer hash code',
    '    (do* ((i 0 (1+ i))',
    '          (h h1 (rem (+ h1 i) size))     ; linear probing',
    '          (item (aref (ht-array ht) h1) (aref (ht-array ht) h)))',
    '         ((or (null item) (= i size))',
    '          (values nil nil))              ; not found',
    '      (when (funcall (ht-comp ht) key (car item))',
    '        (return (values (cdr item) h))))))'
  ].join('\n');
  var HT_SET = [
    '(defun ht-set (key value ht)',
    '  (multiple-value-bind (v i) (ht-get key ht)',
    '    (when i      ; HT-GET found the key',
    '      (setf (cdr (aref (ht-array ht) i)) value))))'
  ].join('\n');
  var HT_ADD = [
    '(defun ht-add (key val ht)',
    '  (let* ((temp (ht-array ht))',
    '         (size (length temp)))',
    '    (flet ((add-item (k v)        ; FLET: a local function',
    '             (do ((i (rem (sxhash k) size) (rem (1+ i) size)))',
    '                 ((null (aref (ht-array ht) i))   ; stop test',
    '                  (setf (aref (ht-array ht) i) (cons k v))))))',
    '      (when (= (ht-count ht) size)',
    '        ;; full: grow to the next power of 2 ...',
    '        (setf size (expt 2 (ceiling (log (1+ (ht-count ht)) 2)))',
    '              (ht-array ht) (make-array size :initial-element nil))',
    '        ;; ... and re-add the old contents',
    '        (dotimes (j (length temp))',
    '          (let ((item (aref temp j)))',
    '            (add-item (car item) (cdr item)))))',
    '      ;; add the new item',
    '      (incf (ht-count ht))',
    '      (add-item key val))))'
  ].join('\n');

  var HT_STRUCT = [
    '(defstruct ht',
    '  array      ; where the key-values are stored',
    '  (count 0)  ; number of entries currently in the table',
    '  comp)      ; function used to compare keys'
  ].join('\n');
  var HT_CREATE = [
    '(defun ht-create (kvs size &key (test #\'eql))',
    '  "Creates a hash table, adds the key-values from KVS, returns it"',
    '  (let ((res (make-ht :array (make-array size :initial-element nil)',
    '                      :comp test)))',
    '    (loop for (k v) in kvs do',
    '      (ht-add k v res))',
    '    res))'
  ].join('\n');

  var lisp = {
    htStruct: { title: 'HT struct (lecture)', code: HT_STRUCT, anchors: {} },
    htCreate: { title: 'HT-CREATE (lecture)', code: HT_CREATE, anchors: {} },
    htGet: { title: 'HT-GET (lecture)', code: HT_GET, anchors: { start: 3, probe: 6, stop: 7, match: 9, found: 10 } },
    htSet: { title: 'HT-SET (lecture)', code: HT_SET, anchors: {} },
    htAdd: { title: 'HT-ADD (lecture)', code: HT_ADD, anchors: {} }
  };

  var concepts = {
    'gethash-two-values': 'GETHASH returns two values',
    'eql-equal': 'EQL vs EQUAL keys',
    'builtin-api': 'Built-in hash table API',
    'ht-get': 'Tracing HT-GET',
    'ht-set-nil': 'Testing the index, not the value',
    'resize': 'Resizing re-adds every entry',
    'alist-vs-hash': 'A-list vs hash table',
    'flashback': 'Earlier units (flashback)'
  };

  var briefing = {
    core: 'Lisp\'s hash tables give O(1) average lookup by key: GETHASH returns the value AND whether the key was found, and string keys need :test \'equal; under the hood it is an array plus a hash code and probing.',
    steps: [
      { kind: 'twoValues', title: 'Two answers from one lookup',
        text: 'The table stores **:empty → NIL**. Look up three keys and watch the two values GETHASH returns.',
        after: 'A stored NIL and a missing key both give NIL as the **first** value. Only the **second** value (found?) tells them apart.' },
      { kind: 'eqlEqual', title: 'Same letters, different object',
        text: 'Two tables, one with the default test (EQL) and one with :test \'equal. Store "foo" in both, then look "foo" up again.',
        after: 'EQL asks "the same object?"; a freshly read "foo" is a different string object. EQUAL compares contents. Use :test \'equal for string or list keys.' },
      { kind: 'check', title: 'Say it in one sentence',
        question: { id: 'brief10-core', type: 'mcq', concept: 'gethash-two-values', prompt: 'How do you tell "key stored with value NIL" from "key missing"?',
          choices: ['Check GETHASH\'s second value (found?)', 'Check whether the first value is NIL', 'Use REMHASH first', 'You can\'t'], answer: 0,
          explain: { correct: 'The second value is T when the key is in the table, NIL when it isn\'t.', wrong: { 1: 'The first value is NIL in both cases.', 2: 'REMHASH removes a key; it doesn\'t look anything up.', 3: 'You can: that\'s exactly what the second value is for.' } } } }
    ]
  };

  /* The lecture's tables (key, value), built with the codes above. */
  var tables = {
    probe: { kvs: [['A', 4], ['G', 5], ['H', 8]], size: 16, lookups: ['H', 'N', 'A', 'G'] },
    four: { kvs: [['A', 4], ['B', 9], ['C', 16], ['D', 4]], size: 16, lookups: ['D', 'F', 'C', 'B'] },
    full: { kvs: [['A', 1], ['B', 2], ['C', 3], ['D', 4]], size: 4, add: ['E', 5] }
  };

  var games = [
    {
      id: 'codedet', title: 'Code Detective', verb: 'Trace HT-GET', icon: '🔍',
      blurb: 'Trace the lecture\'s HT-GET on a real array: which slot does it check next, and what does it return?',
      concepts: ['ht-get'],
      levels: [
        { id: 'try', mode: 'try', title: 'Probe until found or NIL', goal: 'Tap each slot HT-GET checks, then pick its return values. Hints on.', kind: 'trace', table: 'probe' },
        { id: 'solo', mode: 'solo', title: 'Another table', goal: 'Same code, different table. No hints.', kind: 'trace', table: 'four' }
      ]
    },
    {
      id: 'niltrap', title: 'The NIL Trap', verb: 'Read two values', icon: '🪤',
      blurb: 'Why HT-SET tests the index, not the value; why string keys "disappear" from an EQL table.',
      concepts: ['gethash-two-values', 'ht-set-nil', 'eql-equal'],
      levels: [
        { id: 'nil', mode: 'try', title: 'A stored NIL', goal: 'Predict HT-GET\'s two values, then find the bug in a broken HT-SET.', kind: 'nil' },
        { id: 'equal', mode: 'solo', title: 'EQL vs EQUAL', goal: 'Predict which lookups find their string keys. No hints.', kind: 'equal' }
      ]
    },
    {
      id: 'resize', title: 'Resize Puzzle', verb: 'Re-add', icon: '🧩',
      blurb: 'The table is full. HT-ADD grows it to the next power of 2: put every entry where HT-GET will look for it.',
      concepts: ['resize'],
      levels: [
        { id: 'try', mode: 'try', title: 'Grow 4 → 8', goal: 'Re-add each entry in the new 8-slot array, then add E. Hints on.', kind: 'resize' },
        { id: 'solo', mode: 'solo', title: 'Grow 8 → 16', goal: 'A bigger table, no hints.', kind: 'resize', big: true }
      ]
    }
  ];

  var templates = {
    codesNote: 'Lab hash codes (real SXHASH values are SBCL-specific; these reproduce the lecture\'s tables): {codes}',
    tracePrompt: '(ht-get \'{k} *ht*): probe i = {i}. Which slot does it check?',
    traceHint: 'h = (rem (+ h1 i) size) = (rem (+ {h1} {i}) {size}) = {h}.',
    traceWrong: 'Probe i = {i} checks slot (rem (+ {h1} {i}) {size}) = **{h}**, not {choice}.',
    traceStop: 'Slot {h} holds {item}. HT-GET {what}.',
    retPrompt: 'What does (multiple-value-list (ht-get \'{k} *ht*)) print?',
    retOk: 'It returns {ret}.',
    nil: {
      setup: 'The lecture\'s table, then `(ht-add \'e nil *ht*)`: E is stored with the value NIL.',
      q1: '(multiple-value-list (ht-get \'e *ht*))',
      q2: '(multiple-value-list (ht-get \'f *ht*))',
      bugIntro: 'Here is HT-SET written with `(when v …)` instead of `(when i …)`. We run `(ht-set \'e 7 *ht*)`, then look E up.',
      bugQ: 'What does (multiple-value-list (ht-get \'e *ht*)) print after the buggy HT-SET?',
      why: 'V is the stored value: NIL for E. So `(when v …)` skips the update. I (the index) is NIL only when the key is missing, which is why the lecture tests I.',
      misconception: 'Test the returned value to see if the key was found.'
    },
    equal: {
      q: 'Predict what this prints.',
      misconception: 'EQL compares string keys correctly.'
    },
    resize: {
      intro: 'The table was full (count = size = {old}), so HT-ADD grows it to {new} slots and re-adds the old entries in slot order: {order}. Then it adds {nk}.',
      prompt: 'Re-add **({k} . {v})**: code {code}, and (rem {code} {size}) = {h}. Where does it end up?',
      newPrompt: 'Now add the new entry **({k} . {v})**: (rem {code} {size}) = {h}. Where does it go?',
      wrongOld: 'Slot {choice} is where {k} was in the **old** {old}-slot table. The slot depends on the size: (rem {code} {size}) = {h}{probe}.',
      wrongOther: '(rem {code} {size}) = {h}{probe}, so {k} ends up in slot **{exp}**.',
      probeNote: ', and ADD-ITEM steps forward past full slots to {exp}',
      done: 'All entries are where HT-GET will look for them.',
      misconception: 'When resizing, copy old slot i to new slot i.'
    }
  };

  var setupHT = "(defvar *ht* (make-hash-table))\n(setf (gethash :foo *ht*) \"bar\")\n(setf (gethash :empty *ht*) nil)";
  var trace = [
    { id: 'u10t1', type: 'predict', concept: 'gethash-two-values', prompt: 'After the setup below, what prints?', code: setupHT + "\n(multiple-value-list (gethash :empty *ht*))",
      choices: ['(NIL T)', '(NIL NIL)', 'NIL', '(:EMPTY NIL)'], answer: 0,
      explain: { correct: 'The value is NIL, and found? is T: the key is there.', wrong: { 1: 'That\'s what a missing key gives. :EMPTY is in the table.', 2: 'MULTIPLE-VALUE-LIST collects both values into a list.', 3: 'GETHASH returns the value, not the key.' } },
      verify: { setup: '(defvar *ht* (make-hash-table)) (setf (gethash :foo *ht*) "bar") (setf (gethash :empty *ht*) nil)', form: '(multiple-value-list (gethash :empty *ht*))', expect: '(NIL T)' } },
    { id: 'u10t2', type: 'predict', concept: 'gethash-two-values', prompt: 'Same table. What prints?', code: '(multiple-value-list (gethash :nope *ht*))', choices: ['(NIL NIL)', '(NIL T)', 'NIL', 'An error'], answer: 0,
      explain: { correct: 'Missing key: value NIL, found? NIL.', wrong: { 1: 'found? is T only when the key is in the table.', 2: 'Both values are collected into a list.', 3: 'Looking up a missing key is not an error.' } },
      verify: { setup: '(defvar *ht* (make-hash-table)) (setf (gethash :foo *ht*) "bar") (setf (gethash :empty *ht*) nil)', form: '(multiple-value-list (gethash :nope *ht*))', expect: '(NIL NIL)' } },
    { id: 'u10t3', type: 'predict', concept: 'eql-equal', prompt: 'The table uses the default test. What prints?', code: '(defvar *h1* (make-hash-table))\n(setf (gethash "foo" *h1*) 1)\n(gethash "foo" *h1*)', choices: ['NIL', '1', '"foo"', 'T'], answer: 0,
      explain: { correct: 'The default test is EQL: "same object". The second "foo" is a different string object, so it isn\'t found.', wrong: { 1: 'That needs :test \'equal. EQL doesn\'t compare string contents.', 2: 'GETHASH returns the value, never the key.', 3: 'It returns the value (or NIL), not T.' } },
      misconception: 'EQL compares string keys correctly.',
      verify: { setup: '(defvar *h1* (make-hash-table)) (setf (gethash "foo" *h1*) 1)', form: '(gethash "foo" *h1*)', expect: 'NIL' } },
    { id: 'u10t4', type: 'predict', concept: 'eql-equal', prompt: 'Now with :test \'equal. What prints?', code: "(defvar *h2* (make-hash-table :test 'equal))\n(setf (gethash \"foo\" *h2*) 1)\n(gethash \"foo\" *h2*)", choices: ['1', 'NIL', 'T', '"foo"'], answer: 0,
      explain: { correct: 'EQUAL compares contents: same characters, same key.', wrong: { 1: 'With EQUAL, strings with the same characters match.', 2: 'The first value is the stored value, 1.', 3: 'GETHASH returns the value.' } },
      verify: { setup: "(defvar *h2* (make-hash-table :test 'equal)) (setf (gethash \"foo\" *h2*) 1)", form: '(gethash "foo" *h2*)', expect: '1' } },
    { id: 'u10t5', type: 'predict', concept: 'eql-equal', prompt: 'What prints?', code: '(list (eql "foo" (copy-seq "foo"))\n      (equal "foo" (copy-seq "foo")))', choices: ['(NIL T)', '(T T)', '(NIL NIL)', '(T NIL)'], answer: 0,
      explain: { correct: 'COPY-SEQ makes a new string: not the same object (EQL is NIL) but the same contents (EQUAL is T).', wrong: { 1: 'EQL checks identity: a copy is a different object.', 2: 'EQUAL compares contents, and they match.', 3: 'It\'s the other way round.' } },
      verify: { form: '(list (eql "foo" (copy-seq "foo")) (equal "foo" (copy-seq "foo")))', expect: '(NIL T)' } },
    { id: 'u10t6', type: 'predict', concept: 'builtin-api', prompt: 'What prints?', code: "(defvar *ht* (make-hash-table))\n(setf (gethash :foo *ht*) \"bar\")\n(list (remhash :foo *ht*) (remhash :foo *ht*))", choices: ['(T NIL)', '(T T)', '(NIL NIL)', '("bar" NIL)'], answer: 0,
      explain: { correct: 'REMHASH returns T if the key was there and removed, NIL if it was already gone.', wrong: { 1: 'The second REMHASH finds nothing to remove.', 2: 'The first one removes :FOO, so it returns T.', 3: 'REMHASH returns T/NIL, not the old value.' } },
      verify: { setup: '(defvar *ht* (make-hash-table)) (setf (gethash :foo *ht*) "bar")', form: '(list (remhash :foo *ht*) (remhash :foo *ht*))', expect: '(T NIL)' } },
    { id: 'u10t7', type: 'predict', concept: 'builtin-api', prompt: 'What prints?', code: "(defvar *ht* (make-hash-table))\n(setf (gethash :foo *ht*) \"bar\")\n(setf (gethash :baz *ht*) 42)\n(setf (gethash :foo *ht*) \"qux\")\n(hash-table-count *ht*)", choices: ['2', '3', '1', '4'], answer: 0,
      explain: { correct: 'Setting :FOO again replaces its value; it doesn\'t add a second entry.', wrong: { 1: 'The same key is set twice, so there are still 2 entries.', 2: ':FOO and :BAZ are both there.', 3: 'Three SETFs, two distinct keys.' } },
      verify: { setup: '(defvar *ht* (make-hash-table)) (setf (gethash :foo *ht*) "bar") (setf (gethash :baz *ht*) 42) (setf (gethash :foo *ht*) "qux")', form: '(hash-table-count *ht*)', expect: '2' } },
    { id: 'u10t8', type: 'predict', concept: 'eql-equal', prompt: 'ASSOC also defaults to EQL. What prints?', code: "(assoc \"foo\" '((\"foo\" . bar)))", choices: ['NIL', '("foo" . BAR)', 'BAR', 'An error'], answer: 0,
      explain: { correct: 'Without :test \'equal, ASSOC compares the strings with EQL: different objects, no match.', wrong: { 1: 'That needs :test \'equal.', 2: 'ASSOC returns the whole pair, and here it finds none.', 3: 'No error, just NIL.' } },
      verify: { form: "(assoc \"foo\" '((\"foo\" . bar)))", expect: 'NIL' } },
    { id: 'u10t9', type: 'bug', concept: 'ht-set-nil', prompt: 'After `(ht-add \'e nil *ht*)`, this HT-SET never updates E. Tap the buggy line.',
      code: '(defun ht-set (key value ht)\n  (multiple-value-bind (v i) (ht-get key ht)\n    (when v      ; found?\n      (setf (cdr (aref (ht-array ht) i)) value))))', answer: [3],
      explain: { correct: 'V is the stored value, NIL for E, so the WHEN skips the update. Test I: it is NIL only when the key is missing.', wrong: { any: 'That line is the same as the lecture\'s. Which variable tells you whether the key was found?' } },
      interp: { sxhash: CODES, setup: "(defun ht-set (key value ht) (multiple-value-bind (v i) (ht-get key ht) (when v (setf (cdr (aref (ht-array ht) i)) value)))) (defvar *ht* (ht-create '((a 4) (b 9) (c 16) (d 4)) 16)) (ht-add 'e nil *ht*) (ht-set 'e 7 *ht*)", form: "(multiple-value-list (ht-get 'e *ht*))", expect: '(NIL 2)' } },
    { id: 'u10t10', type: 'mcq', concept: 'resize', prompt: 'When HT-ADD grows the array from 4 to 8 slots, why not copy old slot i into new slot i?',
      choices: ['The slot depends on the size: (rem (sxhash k) size) changes', 'Copying is slower than re-adding', 'The old array is deleted first', 'Slots 4–7 would be wasted'], answer: 0,
      explain: { correct: 'With 8 slots, a key belongs at (rem code 8). HT-GET would look there, not at its old index.', wrong: { 1: 'Speed isn\'t the issue: correctness is.', 2: 'The old array (TEMP) is kept until everything is re-added.', 3: 'The new slots get used naturally when keys are re-added.' } },
      misconception: 'When resizing, copy old slot i to new slot i.' }
  ];

  var boss = [
    { id: 'u10b1', type: 'task', task: 'htTrace', concept: 'ht-get', table: 'four', key: 'D', prompt: 'Hands-on: trace (ht-get \'d *ht*) on the lecture\'s table.' },
    { id: 'u10b2', type: 'predict', concept: 'gethash-two-values', prompt: 'What prints?', code: "(defvar *h* (make-hash-table))\n(setf (gethash 'batman *h*) 1939)\n(multiple-value-list (gethash 'spiderman *h*))", choices: ['(NIL NIL)', '(NIL T)', 'NIL', '(1939 T)'], answer: 0,
      explain: { correct: 'SPIDERMAN isn\'t in the table: value NIL, found? NIL.', wrong: { 1: 'found? is T only for keys in the table.', 2: 'Both values are collected.', 3: 'That\'s BATMAN\'s entry.' } },
      verify: { setup: "(defvar *h* (make-hash-table)) (setf (gethash 'batman *h*) 1939)", form: "(multiple-value-list (gethash 'spiderman *h*))", expect: '(NIL NIL)' } },
    { id: 'u10b3', type: 'mcq', concept: 'eql-equal', prompt: 'Your keys are student names (strings). How should you make the table?', choices: ["(make-hash-table :test 'equal)", '(make-hash-table)', "(make-hash-table :test 'eq)", 'Use an a-list instead'], answer: 0,
      explain: { correct: 'EQUAL compares string contents.', wrong: { 1: 'The default EQL compares identity: equal strings read separately won\'t match.', 2: 'EQ is even stricter than EQL.', 3: 'An a-list works but lookup is O(n), and ASSOC still needs :test \'equal.' } },
      misconception: 'EQL compares string keys correctly.' },
    { id: 'u10b4', type: 'mcq', concept: 'ht-get', prompt: 'HT-GET stops probing when it reaches…', choices: ['a NIL slot, or after checking every slot', 'the end of the array', 'the first slot with a different key', 'slot 0'], answer: 0,
      explain: { correct: 'A NIL slot means the key can\'t be further on (insertion would have used it). i = size means every slot was checked.', wrong: { 1: 'Probing wraps around with REM, so there is no "end".', 2: 'A different key means a collision: keep probing.', 3: 'Slot 0 isn\'t special.' } } },
    { id: 'u10b5', type: 'predict', concept: 'builtin-api', prompt: 'What prints?', code: "(defvar *h* (make-hash-table))\n(setf (gethash 'a *h*) 1 (gethash 'b *h*) 2)\n(let ((sum 0))\n  (maphash (lambda (k v) (incf sum v)) *h*)\n  sum)", choices: ['3', '2', 'NIL', '(A B)'], answer: 0,
      explain: { correct: 'MAPHASH calls the function on every key and value: 1 + 2.', wrong: { 1: 'Both entries are visited.', 2: 'The LET returns SUM, not MAPHASH\'s result.', 3: 'The function adds values, not keys.' } },
      verify: { setup: "(defvar *h* (make-hash-table)) (setf (gethash 'a *h*) 1 (gethash 'b *h*) 2)", form: '(let ((sum 0)) (maphash (lambda (k v) (incf sum v)) *h*) sum)', expect: '3' } },
    { id: 'u10b6', type: 'mcq', concept: 'resize', prompt: 'HT-ADD on a full 8-slot table grows it to…', choices: ['16 slots', '9 slots', '8 slots', '64 slots'], answer: 0,
      explain: { correct: '(expt 2 (ceiling (log 9 2))) = 2⁴ = 16: the next power of 2.', wrong: { 1: 'It grows to a power of 2, not by one slot.', 2: 'A full table must grow.', 3: 'Next power of 2 above 8 is 16.' } } },
    { id: 'u10b7', type: 'mcq', concept: 'alist-vs-hash', prompt: 'An a-list and a hash table each hold 1,000,000 entries. Looking up a missing key costs…', choices: ['A-list: up to 1,000,000 comparisons; hash table: a hash and a short probe', 'Both about 1,000,000', 'Both O(1)', 'A-list O(log n)'], answer: 0,
      explain: { correct: 'ASSOC walks the whole list to be sure; the hash table computes the slot.', wrong: { 1: 'The hash table doesn\'t walk all its entries.', 2: 'ASSOC is linear.', 3: 'An a-list isn\'t sorted or indexed.' } } },
    { id: 'u10b8', type: 'mcq', concept: 'flashback', flashback: 'Unit 9 · Hashing', prompt: 'HT-GET probes (h1 + i) mod size. Which strategy is that?', choices: ['Linear probing', 'Double hashing', 'Quadratic probing', 'Chaining'], answer: 0,
      explain: { correct: 'Step by 1 each time: linear probing (it clusters).', wrong: { 1: 'Double hashing would step by a second hash, H2(k).', 2: 'Quadratic would add i + i².', 3: 'Chaining keeps lists in the slots; this array holds one pair per slot.' } } }
  ];

  var cards = {
    'u10-api': { title: 'Built-in hash tables', unit: 10, def: 'MAKE-HASH-TABLE, GETHASH, (setf (gethash k ht) v), REMHASH, HASH-TABLE-COUNT, MAPHASH.', cost: 'O(1) average lookup vs O(n) ASSOC', lisp: "(setf (gethash 'one *ht*) 'un)" },
    'u10-two': { title: 'GETHASH: two values', unit: 10, def: 'Returns the value (or NIL) and found? (T/NIL). Only found? tells a stored NIL from a missing key.', cost: '(multiple-value-list (gethash k ht))', lisp: '(multiple-value-bind (v found) (gethash k ht) ...)' },
    'u10-eql': { title: 'EQL vs EQUAL', unit: 10, def: 'Default test EQL: same object (symbols, numbers). EQUAL: same contents (strings, lists).', cost: "Strings as keys → :test 'equal", lisp: "(make-hash-table :test 'equal)" },
    'u10-ours': { title: 'Our HT', unit: 10, def: 'DEFSTRUCT HT (array, count, comp). HT-GET: start at (rem (sxhash k) size), probe +1 until match or NIL. HT-SET tests the index i, not v.', cost: 'HT-ADD: when full, grow to next power of 2 and re-add everything', lisp: '(rem (+ h1 i) size)' }
  };

  C.unitData[10] = {
    id: 10, title: 'Hash tables in Lisp', room: 'The Key Vault', bossTitle: 'The Vault Keeper',
    intro: 'The Key Vault\'s lookups keep "losing" keys that are right there. Find out which test, which value and which slot is to blame.',
    codes: CODES, tables: tables, lisp: lisp,
    source: [HT_STRUCT, HT_GET, HT_SET, HT_ADD, HT_CREATE].join('\n\n'), explain: {}, prompts: {}, templates: templates, concepts: concepts,
    briefing: briefing, games: games, trace: trace, boss: boss, cards: cards,
    summary: { canExplain: [
      'Why GETHASH returns two values, and when you need the second one.',
      'Why string keys need :test \'equal.',
      'How the lecture\'s HT-GET probes from (rem (sxhash k) size) until it finds the key or a NIL slot.',
      'Why HT-SET tests the index, not the value.',
      'Why growing the table means re-adding every entry instead of copying slots.'
    ] }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
