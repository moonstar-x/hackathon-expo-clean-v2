-- TDR documents (SPEC-009): each upload is also its own analysis job.
CREATE TABLE tdr_documents (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name       TEXT    NOT NULL,
  content_type    TEXT    NOT NULL CHECK (content_type IN ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size            INTEGER NOT NULL CHECK (size > 0),
  sha256          TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  run_after       TEXT    NOT NULL,
  error           TEXT,                                              -- a code (SPEC-009 §5.3)
  error_detail    TEXT,
  model           TEXT,
  extraction_json TEXT,                                              -- TdrExtraction, once done
  analyzed_at     TEXT,
  quote_id        INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
  created_by      TEXT    NOT NULL,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);
CREATE INDEX idx_tdr_documents_ready ON tdr_documents(status, run_after);
CREATE INDEX idx_tdr_documents_created ON tdr_documents(created_at);
