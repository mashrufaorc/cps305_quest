;;;; CPS305 Quest — lisp/unit8.lisp
;;;; Canonical Lisp for Unit 8 (Stacks, queues, sets), following the lecture.

(defun par-checker (list)
  "Returns T if the [ in list are matched with their ]"
  (let ((s nil))                        ; initialize stack s
    (dolist (symbol list (null s))
      (case symbol
        ([ (push symbol s))
        (] (if (null s) (return)) (pop s))   ; unbalanced []
        (otherwise (return))))))             ; invalid symbol

;;; Circular buffer queue
(defvar *size* 4)

(defstruct queue
  (data (make-array *size*)) (head 0) (tail 0) (count 0))

(defun is-empty (q)
  (and (= (queue-head q) (queue-tail q)) (= (queue-count q) 0)))

(defun is-full (q)
  (and (= (queue-head q) (queue-tail q)) (= (queue-count q) *size*)))

(defun enqueue (q x)
  (unless (is-full q)
    (incf (queue-count q))
    (setf (aref (queue-data q) (queue-tail q)) x)
    (if (= (queue-tail q) (1- *size*))
        (setf (queue-tail q) 0)
        (setf (queue-tail q) (1+ (queue-tail q))))))

(defun dequeue (q)
  (unless (is-empty q)
    (decf (queue-count q))
    (let ((x (aref (queue-data q) (queue-head q))))
      (if (= (queue-head q) (1- *size*))
          (setf (queue-head q) 0)
          (setf (queue-head q) (1+ (queue-head q))))
      x)))

;;; Deque from two stacks
(defstruct deque
  front    ; front stack
  back)    ; back stack

(defun push-front (item deque)
  (push item (deque-front deque)))

(defun push-back (item deque)
  (push item (deque-back deque)))

;;; Sets as lists
(defun insert-set (x set)
  (if (member x set)
      set
      (cons x set)))

(defun remove-set (x set &optional (acc ()))
  (cond ((null set) acc)
        ((equal x (first set)) (append acc (rest set)))
        (t (remove-set x (rest set) (cons (first set) acc)))))

(defun subset-set (a b)
  (dolist (item a t)
    (unless (member item b)
      (return nil))))

(defun subset-set-rec (a b)
  (if (null a) t
      (and (member (first a) b)
           (subset-set-rec (rest a) b))))
