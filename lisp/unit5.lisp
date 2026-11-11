;;;; CPS305 Quest — lisp/unit5.lisp
;;;; Canonical Lisp for Unit 5 (Searching and sorting). The game shows these
;;;; exact definitions; tests/verify-lisp.js loads this file into SBCL and
;;;; checks every printed result that appears in content/unit5.js.
;;;; LIN-SEARCH, BIN-SEARCH, SELECTION-SORT and INSERTION-SORT follow the
;;;; lecture. INSERTION-SORT-SHIFT, BINARY-INSERTION-SORT and BUBBLE-SORT are
;;;; written in the lecture's style (the slides describe them without code).

(defun lin-search (arr key)
  (dotimes (i (length arr))
    (if (= (aref arr i) key)
        (return i))))

(defun bin-search (arr key)
  (do ((i nil) (lb 0) (ub (1- (length arr))))
      ((> lb ub) nil)
    (setf i (floor (+ lb ub) 2))
    (let ((e (aref arr i)))
      (cond ((< e key) (setf lb (1+ i)))
            ((> e key) (setf ub (1- i)))
            (t (return i))))))

(defun selection-sort (vec comp)
  (dotimes (cur (1- (length vec)))
    (let ((best (aref vec cur))
          (idx cur))
      (do ((j (1+ cur) (1+ j)))
          ((= j (length vec)))
        (when (funcall comp (aref vec j) best)
          (setf best (aref vec j)
                idx j)))
      (rotatef (aref vec cur) (aref vec idx))))
  vec)

(defun insertion-sort (vec comp)
  (dotimes (i (1- (length vec)))
    (do ((j i (1- j)))          ; starts at i, counts down
        ((minusp j))            ; stop when j goes negative
      (if (funcall comp (aref vec (1+ j)) (aref vec j))
          (rotatef (aref vec (1+ j)) (aref vec j))
          (return))))
  vec)

(defun insertion-sort-shift (vec comp)
  (do ((i 1 (1+ i)))
      ((>= i (length vec)) vec)
    (let ((key (aref vec i))
          (j (1- i)))
      (do ()
          ((or (minusp j)
               (not (funcall comp key (aref vec j)))))
        (setf (aref vec (1+ j)) (aref vec j))   ; shift right
        (decf j))
      (setf (aref vec (1+ j)) key))))

(defun binary-insertion-sort (vec comp)
  (do ((i 1 (1+ i)))
      ((>= i (length vec)) vec)
    (let ((key (aref vec i)) (lb 0) (ub (1- i)))
      (do () ((> lb ub))                 ; binary search for the slot
        (let ((mid (floor (+ lb ub) 2)))
          (if (funcall comp key (aref vec mid))
              (setf ub (1- mid))
              (setf lb (1+ mid)))))
      (do ((j (1- i) (1- j))) ((< j lb)) ; shifting is still O(n)
        (setf (aref vec (1+ j)) (aref vec j)))
      (setf (aref vec lb) key))))

(defun bubble-sort (vec comp)
  (do ((end (1- (length vec)) (1- end)))
      ((< end 1) vec)
    (dotimes (j end)
      (when (funcall comp (aref vec (1+ j)) (aref vec j))
        (rotatef (aref vec j) (aref vec (1+ j)))))))
