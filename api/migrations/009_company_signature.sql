CREATE TABLE quote_document_signature (
  id                 INTEGER PRIMARY KEY CHECK (id = 1),
  signer_name        TEXT    NOT NULL,
  issuer_name        TEXT    NOT NULL,
  serial_number      TEXT    NOT NULL,
  valid_from         TEXT    NOT NULL,
  valid_to           TEXT    NOT NULL,
  certificate_sha256 TEXT    NOT NULL,
  size               INTEGER NOT NULL CHECK (size > 0),
  sha256             TEXT    NOT NULL,
  updated_by         TEXT    NOT NULL,
  updated_at         TEXT    NOT NULL
);
