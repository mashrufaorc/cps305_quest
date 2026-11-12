;;;; CPS305 Quest — lisp/unit4.lisp
;;;; Canonical Lisp for Unit 4 (Recursion), following the lecture.

(defun fact-rec (n)
  (if (< n 2) 1
      (* n (fact-rec (- n 1)))))

(defun fact-tail (n &optional (f 1))
  (if (< n 2) f
      (fact-tail (- n 1) (* n f))))

(defun sum-rec (x)
  (if (null x) 0
      (+ (first x) (sum-rec (rest x)))))

(defun sum-tail (x &optional (acc 0))
  (if (null x) acc
      (sum-tail (rest x) (+ (first x) acc))))

(defun count-nums (a)
  (cond ((null a) 0)
        ((listp (first a)) (+ (count-nums (first a))
                              (count-nums (rest a))))
        (t (+ 1 (count-nums (rest a))))))

(defun flatten (a)
  (cond ((null a) a)
        ((listp (first a)) (append (flatten (first a))
                                   (flatten (rest a))))
        (t (cons (first a) (flatten (rest a))))))

(defun mystery (x)
  (if (null x) x
      (append (mystery (rest x)) (list (first x)))))

(defun tr-reverse (x &optional (acc nil))
  (if (null x) acc
      (tr-reverse (rest x) (cons (first x) acc))))

(defun fib-rec (n)
  (if (<= n 2) 1
      (+ (fib-rec (- n 1))
         (fib-rec (- n 2)))))
