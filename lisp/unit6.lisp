;;;; CPS305 Quest — lisp/unit6.lisp
;;;; Canonical Lisp for Unit 6 (Quicksort).
;;;; The lecture's QUICKSORT uses RTL:SLICE from the RUTILS library: a slice that
;;;; SHARES storage with the original vector (a displaced array). To run it in a
;;;; plain SBCL we define an equivalent RTL:SLICE here.

(defpackage :rtl (:use :cl) (:export #:slice))
(in-package :rtl)
(defun slice (vec start &optional (end (length vec)))
  (make-array (- end start) :displaced-to vec :displaced-index-offset start))
(in-package :cl-user)

(defun quicksort (vec comp)
  (when (> (length vec) 1)
    (let ((ppvt 0)
          (pivot (aref vec (1- (length vec)))))  ; last element
      (dotimes (i (1- (length vec)))             ; finds position of the pivot
        (when (funcall comp (aref vec i) pivot)
          (rotatef (aref vec i) (aref vec ppvt))
          (incf ppvt)))
      ;; swap the pivot (last element) to its proper place
      (rotatef (aref vec (1- (length vec))) (aref vec ppvt))
      (quicksort (rtl:slice vec 0 ppvt) comp)          ; sort left
      (quicksort (rtl:slice vec (1+ ppvt)) comp)))     ; sort right
  vec)

;;; Hoare's partition, written in the lecture's style (the slides describe it
;;; without Lisp code): the pivot is the FIRST element, i and j move inward.
(defun hoare-partition (vec lo hi comp)
  (let ((pivot (aref vec lo))       ; first element
        (i (1- lo))
        (j (1+ hi)))
    (loop
      (loop (incf i) (unless (funcall comp (aref vec i) pivot) (return)))
      (loop (decf j) (unless (funcall comp pivot (aref vec j)) (return)))
      (when (>= i j) (return j))
      (rotatef (aref vec i) (aref vec j)))))

(defun quicksort-hoare (vec comp &optional (lo 0) (hi (1- (length vec))))
  (when (< lo hi)
    (let ((p (hoare-partition vec lo hi comp)))
      (quicksort-hoare vec comp lo p)
      (quicksort-hoare vec comp (1+ p) hi)))
  vec)
