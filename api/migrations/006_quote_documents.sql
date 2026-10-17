CREATE TABLE quote_document_settings (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  trade_name     TEXT    NOT NULL,
  legal_name     TEXT,
  tax_id         TEXT    CHECK (tax_id IS NULL OR (length(tax_id) = 13 AND tax_id NOT GLOB '*[^0-9]*')),
  address        TEXT,
  city           TEXT,
  phone          TEXT,
  email          TEXT,
  website        TEXT,
  signer_name    TEXT,
  signer_title   TEXT,
  number_prefix  TEXT    NOT NULL DEFAULT 'COT',
  validity_days  INTEGER NOT NULL DEFAULT 30 CHECK (validity_days BETWEEN 1 AND 365),
  payment_terms  TEXT,
  intro_text     TEXT,
  terms_text     TEXT,
  paper_size     TEXT    NOT NULL DEFAULT 'A4' CHECK (paper_size IN ('A4','LETTER')),
  updated_by     TEXT,
  updated_at     TEXT    NOT NULL
);
INSERT INTO quote_document_settings (id, trade_name, intro_text, terms_text, updated_at)
VALUES (1, 'CleanCode', 'De nuestra consideración: ponemos a su disposición nuestra propuesta económica para el servicio de limpieza y desinfección de sus instalaciones, de acuerdo con el alcance que se detalla a continuación.', 'El valor mensual corresponde a la superficie, las frecuencias y los horarios descritos en el alcance del servicio. Cualquier cambio en el alcance requiere una nueva cotización.
El valor incluye mano de obra, supervisión, productos químicos, equipos de protección personal, utensilios, equipos, transporte y seguros.', strftime('%Y-%m-%dT%H:%M:%fZ','now'));

CREATE TABLE quote_documents (
  quote_id             INTEGER PRIMARY KEY REFERENCES quotes(id) ON DELETE CASCADE,
  client_legal_name    TEXT,
  client_tax_id        TEXT,
  client_contact_name  TEXT,
  client_contact_title TEXT,
  client_email         TEXT,
  client_phone         TEXT,
  client_address       TEXT,
  issue_date           TEXT,                                          -- YYYY-MM-DD
  validity_days        INTEGER CHECK (validity_days IS NULL OR validity_days BETWEEN 1 AND 365),
  payment_terms        TEXT,
  client_notes         TEXT,
  line_mode            TEXT    NOT NULL DEFAULT 'perZone' CHECK (line_mode IN ('perZone','single')),
  contract_months      INTEGER CHECK (contract_months IS NULL OR contract_months BETWEEN 1 AND 60),
  number               TEXT    UNIQUE,                                -- frozen at the first export
  updated_by           TEXT,
  updated_at           TEXT    NOT NULL
);

CREATE TABLE quote_document_exports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id      INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  format        TEXT    NOT NULL CHECK (format IN ('pdf','xlsx')),
  number        TEXT    NOT NULL,
  revision      INTEGER NOT NULL CHECK (revision >= 1),
  content_hash  TEXT    NOT NULL,
  document_json TEXT    NOT NULL,                                     -- the QuoteDocument exported (§7.1)
  exported_by   TEXT    NOT NULL,
  exported_at   TEXT    NOT NULL
);
CREATE INDEX idx_quote_document_exports_quote ON quote_document_exports(quote_id, id);
