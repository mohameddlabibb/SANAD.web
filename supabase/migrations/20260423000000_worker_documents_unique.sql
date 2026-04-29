-- Add unique constraint on (worker_id, document_type) so upsert works correctly.
-- First remove any duplicate rows keeping the most recent one.
DELETE FROM worker_documents
WHERE id NOT IN (
  SELECT DISTINCT ON (worker_id, document_type) id
  FROM worker_documents
  ORDER BY worker_id, document_type, uploaded_at DESC
);

ALTER TABLE worker_documents
  DROP CONSTRAINT IF EXISTS worker_documents_worker_id_document_type_key;

ALTER TABLE worker_documents
  ADD CONSTRAINT worker_documents_worker_id_document_type_key
  UNIQUE (worker_id, document_type);
