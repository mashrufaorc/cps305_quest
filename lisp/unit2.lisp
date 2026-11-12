;;;; CPS305 Quest — lisp/unit2.lisp
;;;; Canonical Lisp for Unit 2 (Big-O). FIRST-N-LIN and FIRST-N-CONST follow
;;;; the lecture's "tale of two algorithms". DOUBLING-LOOP is the lecture's
;;;; i*2 example wrapped in a DEFUN. The Big-O Detective snippets live in
;;;; content/unit2.js; tests/verify-lisp.js runs each one in SBCL with a step
;;;; counter and checks the game's interpreter gets the same counts.

(defun first-n-lin (n)
  (do ((i 1 (1+ i))
       (sum 0 (+ i sum)))
      ((> i n) sum)))

(defun first-n-const (n)
  (/ (* n (+ n 1)) 2))

(defun doubling-loop (n)
  (let ((k 0))
    (do ((i 1 (* i 2)))
        ((>= i n))
      (setf k (+ k (+ 2 2))))
    k))
