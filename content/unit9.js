/* CPS305 Quest — content/unit9.js
 * Unit 9: Hashing and hash tables (Topic 9). DATA ONLY.
 * Every slot, probe sequence and statistic in the games is computed by
 * engine/hashing.js from the lecture's formulas.
 */
(function (root) {
  'use strict';
  var C = root.CQ.content;

  var explain = {
    'hotel.wrongProbe': { why: 'Probe #{n} for key {k} is {formula} = **{exp}**, not slot {choice}.', misconception: null },
    'hotel.skipCollision': { why: 'Slot {choice} comes later. Probe #{n} is slot {exp}: {formula}. Insert and search must follow the same probe sequence.' },
    'hotel.chain': { why: 'With chaining, {k} goes in bucket {k} mod {M} = **{exp}**, at the end of that bucket\'s list. No probing needed.' },
    'tomb.insert': { why: 'A DELETED slot is **free for inserting**. The probe sequence for {k} reaches slot {exp} first, so the new key reuses it.' }
  };

  var concepts = {
    'hash-function': 'Hash functions',
    'collisions': 'Collisions are unavoidable',
    'chaining': 'Chaining',
    'load-factor': 'Load factor',
    'linear-probing': 'Linear probing',
    'double-hashing': 'Double hashing',
    'quadratic-probing': 'Quadratic probing',
    'clustering': 'Clustering',
    'lazy-deletion': 'Lazy deletion',
    'alist-vs-hash': 'A-list vs hash table',
    'bonus': 'Cuckoo hashing (bonus)',
    'flashback': 'Earlier units (flashback)'
  };

  var briefing = {
    core: 'A hash table turns a key into an array index with a hash function, so a lookup jumps straight to the right slot (O(1) on average) instead of walking a list; collisions are unavoidable, so the table needs a plan for them.',
    steps: [
      { kind: 'alistRace', title: 'Walking vs jumping',
        text: 'An association list finds a key by walking the list, comparing as it goes. A hash table computes **k mod M** and jumps to that slot. Pick a key and compare.',
        after: 'The a-list\'s comparisons grow with its length: O(n). The hash table did one computation and one look, no matter how many keys: O(1) on average.' },
      { kind: 'collide', title: 'But two keys can want the same slot',
        text: 'Insert 15, 25 and 35 into a table of size 10 with H(k) = k mod 10.',
        after: 'They all hash to slot 5: a **collision**. With more keys than slots (pigeonhole principle) collisions are guaranteed, and the birthday paradox says they show up much sooner than you\'d think.' },
      { kind: 'check', title: 'Say it in one sentence',
        question: { id: 'brief9-core', type: 'mcq', concept: 'hash-function', prompt: 'What makes hash table lookup fast?',
          choices: ['The hash function computes the slot directly, so there is no walk through all the keys', 'The keys are kept sorted', 'Hash tables never have collisions', 'Hash tables use binary search'],
          answer: 0,
          explain: { correct: 'Yes. Compute the index, look there, done: O(1) on average.', wrong: { 1: 'Hash tables are unordered: they don\'t sort.', 2: 'Collisions are unavoidable; we resolve them by chaining or probing.', 3: 'No searching at all in the best case: the hash function says exactly where to look.' } } } }
    ]
  };

  var games = [
    {
      id: 'hotel', title: 'Hash Hotel', verb: 'Place guests', icon: '🏨',
      blurb: 'Guests are keys, rooms are slots. Compute the hash, follow the probe sequence, and seat every guest.',
      concepts: ['chaining', 'linear-probing', 'double-hashing', 'quadratic-probing'],
      levels: [
        { id: 'chain', mode: 'try', title: 'Chaining', goal: 'Each key goes to bucket k mod M. Collisions just join the bucket\'s list.', kind: 'hotel', strategy: 'chain', M: 7, tiers: [5, 7, 9] },
        { id: 'linear', mode: 'try', title: 'Linear probing', goal: 'Occupied? Try the next slot. Tap each slot the key probes.', kind: 'hotel', strategy: 'linear', M: 10, tiers: [5, 6, 7] },
        { id: 'double', mode: 'try', title: 'Double hashing', goal: 'Step by H2(k) = PRIME − (k mod PRIME) instead of 1.', kind: 'hotel', strategy: 'double', M: 11, tiers: [5, 6, 7] },
        { id: 'quad', mode: 'solo', title: 'Quadratic probing', goal: '(H1 + i + i²) mod M. No hints.', kind: 'hotel', strategy: 'quadratic', M: 10, tiers: [5, 6, 6] },
        { id: 'cuckoo', mode: 'watch', title: 'Bonus: Cuckoo kick-out', goal: 'Two hash functions, two possible rooms; a newcomer can kick the old guest out.', kind: 'cuckoo' }
      ]
    },
    {
      id: 'tomb', title: 'Tombstone Trap', verb: 'Delete & search', icon: '🪦',
      blurb: 'Delete a key by emptying its slot and watch another key "vanish". Then fix it with lazy deletion.',
      concepts: ['lazy-deletion'],
      levels: [
        { id: 'trap', mode: 'try', title: 'The vanishing key', goal: 'Predict what a search does after a naive delete, then after a lazy one.', kind: 'trap' },
        { id: 'reuse', mode: 'solo', title: 'Reusing tombstones', goal: 'DELETED is free for insert but occupied for search. No hints.', kind: 'reuse' }
      ]
    },
    {
      id: 'lab', title: 'Collision Lab', verb: 'Tune the table', icon: '🧫',
      blurb: 'Change the table size, the keys and the hash function, and watch the distribution. Then race linear probing against double hashing.',
      concepts: ['hash-function', 'collisions', 'load-factor', 'clustering'],
      levels: [
        { id: 'dist', mode: 'try', title: 'Good and bad hash functions', goal: 'Find the settings that pile keys into one bucket.', kind: 'dist' },
        { id: 'birthday', mode: 'watch', title: 'The birthday paradox', goal: 'How many people until a shared birthday is more likely than not?', kind: 'birthday' },
        { id: 'cluster', mode: 'solo', title: 'Clustering compare', goal: 'Same keys, linear probing vs double hashing. Count the probes.', kind: 'cluster' },
        { id: 'sandbox', mode: 'sandbox', title: 'Free lab', goal: 'Any keys, any size, any strategy.', kind: 'sandbox' }
      ]
    }
  ];

  var templates = {
    hotelIntro: { chain: 'Bucket = k mod {M}. Tap the bucket where each key goes.', linear: 'Probe i = (k mod {M} + i) mod {M}, i = 0, 1, 2, … Tap each slot in the order the key tries it.', double: 'H1 = k mod {M}, H2 = {P} − (k mod {P}). Probe i = (H1 + i·H2) mod {M}. Tap each slot in order.', quadratic: 'Probe i = (k mod {M} + i + i²) mod {M}. Tap each slot in order.' },
    hotelPrompt: 'Key **{k}**: probe #{n}. Which slot?',
    hotelChainPrompt: 'Key **{k}**: which bucket?',
    hotelHint: 'Probe #{n}: {formula} = {exp}.',
    hotelDone: '{n} keys placed with {probes} probes in total (load factor {lf}).',
    trap: {
      setup: 'Linear probing, M = 7. Keys {a}, {b}, {c} all hash to slot {s}, so they sit in slots {s}, {s1}, {s2}. Now we delete {b}.',
      q1: 'We delete {b} by **emptying** its slot. Then we search for {c}. What happens?',
      q1ok: 'The search probes slot {s} ({a}), then slot {s1}: empty! An empty slot means "the key can\'t be further on", so it stops: **{c} not found**, even though it\'s in slot {s2}.',
      q1bad: 'Search stops at the first empty slot. Slot {s1} is empty now, so the search never reaches slot {s2}.',
      misconception: 'Deleting means setting the slot to empty.',
      q2: 'Same table, but this time {b}\'s slot is marked **DELETED** (a tombstone). Search for {c}?',
      q2ok: 'DELETED counts as occupied for searching, so the probe continues past it and finds {c} in slot {s2}.',
      q2bad: 'A tombstone is not empty: the search keeps going, and finds {c}.',
      summary: 'Naive delete breaks probe chains; lazy deletion keeps them.'
    },
    reuse: { setup: 'Linear probing, M = 7. Slot {d} holds a tombstone († DEL). Insert {k} (hashes to {h}). Tap where it goes.', done: 'Reused the tombstone: {k} went to slot {exp}.' },
    dist: {
      intro: 'Each bar is a bucket; its height is how many keys landed there. A good hash function spreads keys out evenly.',
      q1: 'Keys 7, 14, 21, 28, 35, 42 with H(k) = k mod 7. How many land in the **same** bucket?',
      q1ok: 'All 6: every multiple of 7 is 0 mod 7. Keys that share a factor with M cluster badly.',
      q2: 'Keys that all end in 3 (13, 23, 33, …) with H(k) = k mod 10. How many buckets get used?',
      q2ok: 'Just 1: k mod 10 only looks at the last digit. A good hash function uses the **whole** key.',
      misconception: 'A low load factor guarantees fast lookups.'
    },
    birthday: { prompt: 'In a room of n people (365 possible birthdays), what is the smallest n for which a shared birthday is more likely than not?', ok: 'n = {n}: P = {p}%. With 365 "buckets" and only {n} "keys", a collision is already a coin flip.', summary: 'Collisions arrive long before the table is full.' },
    cluster: { prompt: 'Insert the same {n} keys into a table of size {M}. Which strategy needs fewer probes in total?', ok: 'Double hashing: {dp} probes vs {lp}. Linear probing builds runs of occupied slots (primary clusters), and every key landing in a run has to walk to its end.', lin: 'Linear probing grows clusters: a key that hits a run walks the whole run. Here it needed {lp} probes vs {dp}.', same: 'They differ: {lp} vs {dp}.', summary: 'Linear: {lp} probes, longest cluster {lc}. Double hashing: {dp} probes, longest cluster {dc}.' },
    cuckoo: { intro: 'Cuckoo hashing gives each key two possible slots: H1(k) = k mod {M} and H2(k) = (k div {M}) mod {M}. If both are taken, the newcomer takes a slot anyway and the old key moves to **its** other slot.' }
  };

  var trace = [
    { id: 'u9t1', type: 'predict', concept: 'hash-function', prompt: 'With H(k) = k mod 10, which slot does key 47 go to?', code: '(mod 47 10)', choices: ['7', '4', '47', '4.7'], answer: 0,
      explain: { correct: 'The remainder after dividing by 10 is the last digit: 7.', wrong: { 1: 'That\'s the quotient (47 div 10), not the remainder.', 2: 'The slot has to be in 0..9.', 3: 'MOD gives an integer remainder.' } },
      verify: { form: '(mod 47 10)', expect: '7' } },
    { id: 'u9t2', type: 'mcq', concept: 'hash-function', prompt: 'Why is H(k) = k mod 10 a weak hash function?', choices: ['Only the last digit of the key affects the slot', 'It isn\'t deterministic', 'It can return 10', 'It is too slow to compute'], answer: 0,
      explain: { correct: '123 and 9993 collide, so does every key ending in 3. A good hash function uses the whole key.', wrong: { 1: 'It is deterministic: the same key always gives the same slot. That part is fine.', 2: 'k mod 10 is always in 0..9.', 3: 'It\'s very cheap, which is good.' } } },
    { id: 'u9t3', type: 'predict', concept: 'double-hashing', prompt: 'M = 11, PRIME = 7. Key 25 collides at H1. Where is probe i = 1?', code: '(let* ((h1 (mod 25 11))\n       (h2 (- 7 (mod 25 7))))\n  (mod (+ h1 (* 1 h2)) 11))', choices: ['6', '4', '3', '7'], answer: 0,
      explain: { correct: 'H1 = 3, H2 = 7 − (25 mod 7) = 7 − 4 = 3, so probe 1 is (3 + 1·3) mod 11 = 6.', wrong: { 1: 'That\'s linear probing (3 + 1). Double hashing steps by H2.', 2: 'That\'s H1 itself (probe 0).', 3: 'Use H2 = PRIME − (k mod PRIME) = 3, not PRIME.' } },
      verify: { form: '(let* ((h1 (mod 25 11)) (h2 (- 7 (mod 25 7)))) (mod (+ h1 (* 1 h2)) 11))', expect: '6' } },
    { id: 'u9t4', type: 'predict', concept: 'quadratic-probing', prompt: 'Quadratic probing, M = 10, key 13. Where is probe i = 2?', code: '(mod (+ (mod 13 10) 2 (* 2 2)) 10)', choices: ['9', '5', '7', '4'], answer: 0,
      explain: { correct: '(3 + 2 + 4) mod 10 = 9.', wrong: { 1: 'That\'s probe i = 1: (3 + 1 + 1).', 2: 'Add i², not 2i: 3 + 2 + 4.', 3: 'Quadratic adds i + i², not just i... and wraps mod 10.' } },
      verify: { form: '(mod (+ (mod 13 10) 2 (* 2 2)) 10)', expect: '9' } },
    { id: 'u9t5', type: 'mcq', concept: 'load-factor', prompt: 'Chaining: 1000 buckets, 10,000 keys, spread evenly. Lookup compared with one plain linked list of all 10,000 keys is…',
      choices: ['About 1000× faster: walk ~10 nodes instead of ~10,000', 'Just as slow', 'Impossible: load factor can\'t exceed 1', 'Exactly O(1)'], answer: 0,
      explain: { correct: 'Load factor 10 means ~10 keys per bucket. Slower than load factor 1, but far faster than one long list.', wrong: { 1: 'Each bucket holds only about 10 keys.', 2: 'That limit is for open addressing. Chaining lets buckets grow.', 3: 'It\'s the length of a 10-node chain: proportional to the load factor.' } } },
    { id: 'u9t6', type: 'mcq', concept: 'load-factor', prompt: 'Two tables both have 1000 keys and 1000 buckets (load factor 1). Are lookups equally fast?',
      choices: ['Not necessarily: one might spread keys out, the other pile them in one bucket', 'Yes, same load factor means same speed', 'Yes, lookup is always O(1)', 'No, the second is always faster'], answer: 0,
      explain: { correct: 'Load factor is an average. Distribution matters: 1000 keys in one bucket is a 1000-node list.', wrong: { 1: 'Load factor doesn\'t say how keys are spread.', 2: 'If every key lands in one bucket, lookup is O(n).', 3: 'Nothing distinguishes the two tables but their distribution.' } },
      misconception: 'A low load factor guarantees speed.' },
    { id: 'u9t7', type: 'mcq', concept: 'lazy-deletion', prompt: 'Open addressing: why not delete a key by setting its slot to empty?',
      choices: ['A later search would stop at the empty slot and miss keys placed after it', 'Empty slots can\'t be reused', 'It would change the hash function', 'It makes the table bigger'], answer: 0,
      explain: { correct: 'Searches stop at empty slots. Keys that probed past the deleted one become unreachable. Mark it DELETED instead.', wrong: { 1: 'Empty slots are reused. The problem is searching.', 2: 'The hash function never changes.', 3: 'Deletion doesn\'t resize anything.' } },
      misconception: 'Deleting means setting the slot to empty.' },
    { id: 'u9t8', type: 'mcq', concept: 'hash-function', prompt: 'Could a hash function use a random number to spread keys out?',
      choices: ['No: the same key must always map to the same slot', 'Yes: randomness gives the best spread', 'Yes, as long as it\'s in 0..M−1', 'Only for string keys'], answer: 0,
      explain: { correct: 'A hash function must be deterministic, or you could never find a key again.', wrong: { 1: 'Insert and lookup would compute different slots.', 2: 'In range is required, but so is determinism.', 3: 'Every key type needs a deterministic hash.' } },
      misconception: 'A hash function may use randomness.' },
    { id: 'u9t9', type: 'mcq', concept: 'collisions', prompt: 'H(x) = H(y). What can you conclude?',
      choices: ['Nothing about x and y: different keys can share a hash value', 'x = y', 'The hash function is broken', 'The table is full'], answer: 0,
      explain: { correct: 'That\'s a collision. It\'s why each slot stores the key too, and why we compare keys on lookup.', wrong: { 1: 'Equal hash values don\'t mean equal keys: collisions are unavoidable.', 2: 'Every hash function has collisions (pigeonhole principle).', 3: 'Collisions happen even in nearly empty tables.' } },
      misconception: 'Equal hash values mean equal keys.' },
    { id: 'u9t10', type: 'mcq', concept: 'collisions', prompt: 'How many people do you need in a room for a better-than-even chance that two share a birthday?',
      choices: ['23', '183', '365', '366'], answer: 0,
      explain: { correct: 'With 23 people the chance is about 50.7%. Collisions show up far earlier than intuition says.', wrong: { 1: 'That\'s half of 365, but pairs grow much faster than people: 23 people make 253 pairs.', 2: 'With 366 people a collision is certain (pigeonhole). Even odds arrive much sooner.', 3: '366 guarantees it; 23 already gives 50%.' } } }
  ];

  var boss = [
    { id: 'u9b1', type: 'task', task: 'hotel', concept: 'linear-probing', strategy: 'linear', M: 7, keys: [10, 24, 17, 3, 31], prompt: 'Hands-on: seat these guests with linear probing, M = 7.' },
    { id: 'u9b2', type: 'mcq', concept: 'clustering', prompt: 'Why does double hashing usually beat linear probing as the table fills?',
      choices: ['It avoids long runs of occupied slots (clustering)', 'It never has collisions', 'It uses less memory', 'It allows load factor above 1'], answer: 0,
      explain: { correct: 'Keys that collide take different step sizes, so they scatter instead of piling into one run.', wrong: { 1: 'Collisions still happen at H1.', 2: 'Same array, same memory.', 3: 'Open addressing can\'t exceed load factor 1, whatever the probing.' } } },
    { id: 'u9b3', type: 'mcq', concept: 'double-hashing', prompt: 'Why must H2(k) never be 0?',
      choices: ['Probing would stay on the same slot forever', 'H1 would become invalid', 'It would break chaining', 'The table would resize'], answer: 0,
      explain: { correct: 'Probe i = (H1 + i·0) mod M is H1 every time: an infinite loop. PRIME − (k mod PRIME) is always at least 1.', wrong: { 1: 'H1 is unaffected; the step size is the problem.', 2: 'Chaining doesn\'t use H2.', 3: 'Nothing resizes automatically.' } } },
    { id: 'u9b4', type: 'mcq', concept: 'lazy-deletion', prompt: 'A slot marked DELETED is treated as…',
      choices: ['Empty when inserting, occupied when searching', 'Empty for both', 'Occupied for both', 'Occupied when inserting, empty when searching'], answer: 0,
      explain: { correct: 'Inserts may reuse it; searches must probe past it.', wrong: { 1: 'Then searches would stop there and miss keys after it.', 2: 'Then the space could never be reused.', 3: 'That\'s backwards.' } } },
    { id: 'u9b5', type: 'mcq', concept: 'load-factor', prompt: 'An open-addressing table has 70 keys in 100 slots. What does the lecture recommend?',
      choices: ['Resize: performance degrades past a load factor of about 0.7', 'Nothing: it can hold 30 more', 'Switch to a new hash function', 'Delete some keys'], answer: 0,
      explain: { correct: 'Probe sequences get long as the table fills, so tables resize around 0.7.', wrong: { 1: 'It can hold more, but probing gets slow well before it\'s full.', 2: 'The hash function isn\'t the problem; the fill level is.', 3: 'Deleting data isn\'t a fix.' } } },
    { id: 'u9b6', type: 'predict', concept: 'linear-probing', prompt: 'M = 10, linear probing. Slots 3 and 4 are taken. Where does key 13 go?', code: '(mod (+ (mod 13 10) 2) 10)', choices: ['5', '3', '4', '6'], answer: 0,
      explain: { correct: '13 mod 10 = 3 (taken), 4 (taken), then i = 2: slot 5.', wrong: { 1: 'Slot 3 is taken.', 2: 'Slot 4 is taken too.', 3: 'Linear probing tries 5 before 6.' } },
      verify: { form: '(mod (+ (mod 13 10) 2) 10)', expect: '5' } },
    { id: 'u9b7', type: 'mcq', concept: 'alist-vs-hash', prompt: 'Lookup in an association list vs a hash table:', choices: ['O(n) vs O(1) on average', 'O(1) vs O(1)', 'O(log n) vs O(1)', 'O(n) vs O(n)'], answer: 0,
      explain: { correct: 'ASSOC walks the list; the hash table computes the slot.', wrong: { 1: 'ASSOC has to compare keys one by one.', 2: 'An a-list isn\'t sorted, so no binary search.', 3: 'The hash table jumps straight to the slot (on average).' } } },
    { id: 'u9b8', type: 'bigo', concept: 'flashback', flashback: 'Unit 2 · Big-O', prompt: 'Every key hashes to the same chain of n keys. Lookup is…', choices: ['O(n)', 'O(1)', 'O(log n)', 'O(n²)'], answer: 0,
      explain: { correct: 'The chain is a linked list: walking it is linear. Hash lookup is O(1) only on average, with a good spread.', wrong: { 1: 'O(1) needs keys spread across buckets.', 2: 'A chain is an unsorted list, not a tree.', 3: 'One walk down one list is linear.' } },
      misconception: 'Hash lookup is always O(1).' }
  ];

  var cards = {
    'u9-fn': { title: 'Hash function', unit: 9, def: 'Turns a key into an index. Required: deterministic, result in 0..M−1. Desirable: uniform spread, uses the whole key, avoids clustering, cheap.', cost: 'k mod M; beware k mod 10 (last digit only)', lisp: '(mod key size)' },
    'u9-coll': { title: 'Collisions', unit: 9, def: 'Different keys, same slot. Unavoidable (pigeonhole), and early (birthday paradox: 23 people → 50%).', cost: 'Equal hash ≠ equal keys: store and compare keys', lisp: '(= (mod 15 10) (mod 25 10))  ; T' },
    'u9-chain': { title: 'Chaining', unit: 9, def: 'Each bucket holds a linked list. Load factor = keys ÷ buckets ≈ average chain length. Move-to-front speeds up repeat lookups.', cost: 'O(1 + load factor) average; O(n) if all keys collide', lisp: '; bucket (k mod M) -> list of keys' },
    'u9-open': { title: 'Open addressing', unit: 9, def: 'Probe for another slot. Linear: (H1+i) mod M (clusters). Quadratic: (H1+i+i²) mod M. Double: (H1+i·H2) mod M, H2 = PRIME − (k mod PRIME).', cost: 'Load factor ≤ 1; degrades past ~0.7 → resize', lisp: '(mod (+ h1 (* i h2)) size)' },
    'u9-lazy': { title: 'Lazy deletion', unit: 9, def: 'Mark a deleted slot DELETED: free for insert, occupied for search. Emptying it would cut probe chains.', cost: 'Tombstones slow searches until reused', lisp: '; slot -> DELETED, not NIL' }
  };

  C.unitData[9] = {
    id: 9, title: 'Hashing', room: 'Hash Hotel', bossTitle: 'The Night Manager',
    intro: 'Hash Hotel\'s front desk seats guests by walking down a list. Teach it to compute each guest\'s room, and to cope when two guests want the same one.',
    lisp: {}, explain: explain, prompts: {}, templates: templates, concepts: concepts, briefing: briefing,
    games: games, trace: trace, boss: boss, cards: cards,
    summary: { canExplain: [
      'How a hash function turns a key into a slot, and what makes one good or bad.',
      'Why collisions are unavoidable, and how chaining and open addressing handle them.',
      'How linear, quadratic and double hashing choose the next slot, and why linear probing clusters.',
      'What load factor means, and why it doesn\'t guarantee speed on its own.',
      'Why deletion needs tombstones (lazy deletion) in open addressing.'
    ] }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
