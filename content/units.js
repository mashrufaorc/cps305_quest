/* CPS305 Quest — content/units.js
 * The hub map: one lab room per unit. `built: false` rooms show as "under
 * construction". Adding a unit later (graphs, heaps...) = add an entry here
 * plus a content/unitN.js file that registers CQ.content.unitData[N].
 */
(function (root) {
  'use strict';
  var CQ = root.CQ = root.CQ || {};
  var C = CQ.content = CQ.content || {};
  C.unitData = C.unitData || {};

  C.units = [
    { id: 0, title: 'Why data structures?', room: 'The Loading Dock', topic: 'Topic 1', icon: '📦', built: false },
    { id: 1, title: 'Lisp bootcamp', room: 'The Paren Forge', topic: 'Topics 1–2', icon: '()', built: false },
    { id: 2, title: 'Big-O', room: 'The Growth Track', topic: 'Topic 2', icon: '📈', built: true },
    { id: 3, title: 'Arrays vs linked lists', room: 'The Pointer Workshop', topic: 'Topic 3', icon: '🔗', built: false },
    { id: 4, title: 'Recursion', room: 'The Mirror Hall', topic: 'Topic 4', icon: '🪞', built: false },
    { id: 5, title: 'Searching and sorting', room: 'The Archive', topic: 'Topic 5', icon: '🔎', built: true },
    { id: 6, title: 'Quicksort', room: 'The Partition Floor', topic: 'Topic 6', icon: '⚡', built: false },
    { id: 7, title: 'Merge sort', room: 'The Conveyor Room', topic: 'Topic 7', icon: '🔀', built: false },
    { id: 8, title: 'Stacks, queues, sets', room: 'The Loading Bay', topic: 'Topic 8', icon: '🥞', built: false },
    { id: 9, title: 'Hashing', room: 'Hash Hotel', topic: 'Topic 9', icon: '#', built: false },
    { id: 10, title: 'Hash tables in Lisp', room: 'The Key Vault', topic: 'Topic 10', icon: '🗝', built: false },
    { id: 11, title: 'Trees', room: 'The Greenhouse', topic: 'Topic 11', icon: '🌳', built: false }
  ];

  /* Shared glossary: lecture wording, shown at a term's first use. */
  C.glossary = {
    'linear search': 'Check every element, one by one, until you find the key or reach the end.',
    'binary search': 'Look at the middle of a sorted array; throw away the half that cannot hold the key; repeat.',
    'comparison sort': 'A sort that decides order only by comparing two elements at a time.',
    'stable sort': 'A sort where equal elements keep their original relative order.',
    'in-place': 'Sorting without any helper arrays.',
    'inversion': 'Any pair of elements that are out of order: i < j but a[i] > a[j].',
    'selection sort': 'Repeatedly find the smallest element of the unsorted region and swap it to the front of that region.',
    'insertion sort': 'Take the next element from the unsorted region and move it left into its place in the sorted region.',
    'bubble sort': 'Swap adjacent elements that are out of order, so the largest bubbles to the end; repeat.',
    'Big-O': 'How an algorithm\'s cost grows as the input size n grows: keep the fastest-growing term, drop coefficients.'
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
