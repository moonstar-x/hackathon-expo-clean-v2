CREATE TABLE quote_document_logo (
  id           INTEGER PRIMARY KEY CHECK (id = 1),
  content_type TEXT    NOT NULL CHECK (content_type IN ('image/png','image/jpeg')),
  width        INTEGER NOT NULL CHECK (width BETWEEN 1 AND 2000),
  height       INTEGER NOT NULL CHECK (height BETWEEN 1 AND 2000),
  size         INTEGER NOT NULL CHECK (size > 0),
  sha256       TEXT    NOT NULL,
  updated_by   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL
);
ALTER TABLE quote_document_settings ADD COLUMN brand_color TEXT NOT NULL DEFAULT '#4F46E5' CHECK (brand_color GLOB '#[0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F]');
