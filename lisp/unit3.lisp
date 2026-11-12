;;;; CPS305 Quest — lisp/unit3.lisp
;;;; Canonical Lisp for Unit 3 (Arrays vs linked lists), following the lecture.

(defun mymake-list-it (n elem)
  (let ((acc nil))
    (dotimes (i n acc)
      (setf acc (cons elem acc)))))

(defun mymake-list-rec (n element &optional (acc nil))
  (if (= n 0) acc                 ; if n is zero, we're done (return acc)
      (mymake-list-rec (1- n) element (cons element acc))))

(defstruct node data next)

(defstruct my-list
  (head nil :type (or node null))
  (size 0 :type (integer 0)))

(defun my-cons (data list)
  (let ((new-head (make-node :data data
                             :next (my-list-head list))))
    (make-my-list :head new-head
                  :size (1+ (my-list-size list)))))

(defun is-empty (list) (equalp list (make-my-list)))

(defun my-first (alist) (node-data (my-list-head alist)))

(defun my-rest (alist)
  (if (is-empty alist) alist
      (make-my-list :head (node-next (my-list-head alist))
                    :size (1- (my-list-size alist)))))
