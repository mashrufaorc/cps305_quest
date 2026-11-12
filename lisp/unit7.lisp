;;;; CPS305 Quest — lisp/unit7.lisp
;;;; Canonical Lisp for Unit 7 (Merge sort), following the lecture: merge sort
;;;; on linked lists, using only list-friendly operations (PUSH, then REVERSE).

(defun merge-lists (l1 l2 comp)
  "Merges the sorted lists l1 and l2 and returns the sorted resulting list"
  (let ((res ()))                       ; result starts as empty list
    (do ()                              ; no var initializations, no result-form
        ((and (null l1) (null l2)))     ; exit when both inputs are empty
      (let ((i1 (first l1))             ; get first element of each list
            (i2 (first l2)))
        (cond ((null i1)                ; i1 NIL, take rest of i2
               (dolist (i l2) (push i res))
               (return))
              ((null i2)                ; i2 NIL, take rest of i1
               (dolist (i l1) (push i res))
               (return))
              ((funcall comp i1 i2)     ; i1 appears before i2 in sorted list
               (push i1 res)
               (setf l1 (rest l1)))
              (t                        ; i2 appears before i1 in sorted list
               (push i2 res)
               (setf l2 (rest l2))))))
    (reverse res)))                     ; we've been prepending, must reverse

(defun merge-sort (list comp)
  "Sorts the list comparing items using comp"
  (if (null (rest list)) list           ; one element, already sorted
      (let ((half (floor (length list) 2)))
        (merge-lists (merge-sort (subseq list 0 half) comp)
                     (merge-sort (subseq list half) comp)
                     comp))))
