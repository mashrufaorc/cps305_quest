;;;; CPS305 Quest — lisp/unit10.lisp
;;;; Canonical Lisp for Unit 10 (Hash tables in Lisp), following the lecture:
;;;; our own hash table on an array, open addressing with linear probing.

(defstruct ht
  array      ; where the key-values are stored
  (count 0)  ; number of entries currently in the table
  comp)      ; function used to compare keys

(defun ht-get (key ht)
  (let* ((size (length (ht-array ht)))
         (h1 (rem (sxhash key) size)))   ; SXHASH: integer hash code
    (do* ((i 0 (1+ i))
          (h h1 (rem (+ h1 i) size))     ; linear probing
          (item (aref (ht-array ht) h1) (aref (ht-array ht) h)))
         ((or (null item) (= i size))
          (values nil nil))              ; not found
      (when (funcall (ht-comp ht) key (car item))
        (return (values (cdr item) h))))))

(defun ht-set (key value ht)
  (multiple-value-bind (v i) (ht-get key ht)
    (when i      ; HT-GET found the key
      (setf (cdr (aref (ht-array ht) i)) value))))

(defun ht-add (key val ht)
  (let* ((temp (ht-array ht))
         (size (length temp)))
    (flet ((add-item (k v)        ; FLET: a local function
             (do ((i (rem (sxhash k) size) (rem (1+ i) size)))
                 ((null (aref (ht-array ht) i))   ; stop test
                  (setf (aref (ht-array ht) i) (cons k v))))))
      (when (= (ht-count ht) size)
        ;; full: grow to the next power of 2 ...
        (setf size (expt 2 (ceiling (log (1+ (ht-count ht)) 2)))
              (ht-array ht) (make-array size :initial-element nil))
        ;; ... and re-add the old contents
        (dotimes (j (length temp))
          (let ((item (aref temp j)))
            (add-item (car item) (cdr item)))))
      ;; add the new item
      (incf (ht-count ht))
      (add-item key val))))

(defun ht-create (kvs size &key (test #'eql))
  "Creates a hash table, adds the key-values from KVS, returns it"
  (let ((res (make-ht :array (make-array size :initial-element nil)
                      :comp test)))
    (loop for (k v) in kvs do
      (ht-add k v res))
    res))

(defun ht-map (f ht)
  "Maps function F on all entries in hash table HT"
  (let* ((kvs (ht-array ht))
         (size (length kvs)))
    (dotimes (i size)
      (let ((kv (aref kvs i)))
        (when kv
          (funcall f (car kv) (cdr kv)))))))
