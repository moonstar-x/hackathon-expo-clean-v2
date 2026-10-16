CREATE TABLE categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL COLLATE NOCASE UNIQUE,
  description TEXT,
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

CREATE TABLE suppliers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL COLLATE NOCASE UNIQUE,
  contact_name TEXT,
  email        TEXT,
  phone        TEXT,
  notes        TEXT,
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL
);

CREATE TABLE products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  sku           TEXT    NOT NULL COLLATE NOCASE UNIQUE,
  name          TEXT    NOT NULL,
  description   TEXT,
  category_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  supplier_id   INTEGER          REFERENCES suppliers(id)  ON DELETE RESTRICT,
  unit          TEXT    NOT NULL CHECK (unit IN ('unit','box','pack','roll','pair','L','mL','gal','kg','g')),
  quantity      REAL    NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reorder_level REAL    NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  unit_cost     REAL    NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  location      TEXT,
  hazardous     INTEGER NOT NULL DEFAULT 0 CHECK (hazardous IN (0, 1)),
  sds_url       TEXT,
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL
);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);

CREATE TABLE stock_movements (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  type          TEXT    NOT NULL CHECK (type IN ('IN','OUT','ADJUSTMENT')),
  quantity      REAL    NOT NULL CHECK (quantity >= 0),
  delta         REAL    NOT NULL,
  balance_after REAL    NOT NULL CHECK (balance_after >= 0),
  reason        TEXT,
  reference     TEXT,
  created_by    TEXT    NOT NULL,
  created_at    TEXT    NOT NULL
);
CREATE INDEX idx_movements_product ON stock_movements(product_id, created_at);
CREATE INDEX idx_movements_created ON stock_movements(created_at);
