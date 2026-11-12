;;;; CPS305 Quest — lisp/unit11.lisp
;;;; Canonical Lisp for Unit 11 (Trees), following the lecture.
;;;; BT-IN-ORDER follows the same pattern as the lecture's pre/post-order.

;;; Binary trees
(defstruct (tree-node (:conc-name nil))
  key (lc nil) (rc nil))

(defun set-root (node item)
  (setf (key node) item))

(defun insert-left (node item)
  (if (null (lc node))
      (setf (lc node) (make-tree-node :key item))
      (setf (lc node) (make-tree-node :key item :lc (lc node)))))

(defun insert-right (node item)
  (if (null (rc node))
      (setf (rc node) (make-tree-node :key item))
      (setf (rc node) (make-tree-node :key item :rc (rc node)))))

(defvar *bt*
  (make-tree-node :key 8
    :lc (make-tree-node :key 3
          :lc (make-tree-node :key 1)
          :rc (make-tree-node :key 6
                :lc (make-tree-node :key 4)
                :rc (make-tree-node :key 7)))
    :rc (make-tree-node :key 10
          :rc (make-tree-node :key 14
                :lc (make-tree-node :key 13)))))

(defun bt-pre-order (node fn)
  (when node
    (funcall fn (key node))
    (bt-pre-order (lc node) fn)
    (bt-pre-order (rc node) fn)))

(defun bt-in-order (node fn)
  (when node
    (bt-in-order (lc node) fn)
    (funcall fn (key node))
    (bt-in-order (rc node) fn)))

(defun bt-post-order (node fn)
  (when node
    (bt-post-order (lc node) fn)
    (bt-post-order (rc node) fn)
    (funcall fn (key node))))

(defun bt-level-order (root fn)
  (let ((queue (list root))
        (node nil))
    (loop while queue do
      (setf node (pop queue))
      (funcall fn (key node))
      (when (lc node)
        (setf queue
              (append queue (list (lc node)))))
      (when (rc node)
        (setf queue
              (append queue (list (rc node))))))))

;;; N-ary trees as lists of lists
(defvar *tree* '(* (e (f)) (+ (d) (max (a) (b) (c)))))

(defun make-tree (label &rest subtrees)
  (cons label subtrees))

(defun add-subtree (tree subtree)
  (append tree (list subtree)))

(defun search-tree (item tree)
  (cond ((null tree) nil)
        ((atom tree) (eql item tree))
        (t (or (search-tree item (first tree))
               (search-tree item (rest tree))))))

(defun pre-order (tree fn)
  (funcall fn (first tree))
  (dolist (child (rest tree))
    (pre-order child fn)))

(defun post-order (tree fn)
  (dolist (child (rest tree))
    (post-order child fn))
  (funcall fn (first tree)))

(defun level-order (tree fn)
  (let ((queue (list tree))
        (node nil))
    (loop while queue do
      (setf node (pop queue))
      (funcall fn (first node))
      (dolist (child (rest node))
        (setf queue
              (append queue (list child)))))))
