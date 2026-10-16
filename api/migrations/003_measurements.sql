CREATE TABLE measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  notes TEXT,
  scanned_at TEXT NOT NULL,
  room_count INTEGER NOT NULL CHECK (room_count >= 1),
  total_floor_area REAL NOT NULL CHECK (total_floor_area >= 0),
  is_area_approximate INTEGER NOT NULL CHECK (is_area_approximate IN (0, 1)),
  footprint_width REAL,
  footprint_length REAL,
  is_merged INTEGER NOT NULL CHECK (is_merged IN (0, 1)),
  geometry_version INTEGER NOT NULL,
  rooms_json TEXT NOT NULL,
  app_version TEXT,
  device_model TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_measurements_created ON measurements(created_at);
CREATE INDEX idx_measurements_scanned ON measurements(scanned_at);
CREATE INDEX idx_measurements_user ON measurements(user_id);
CREATE TABLE measurement_files (
  measurement_id INTEGER NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('geometry','floorPlan','thumbnail','model','csv','raw')),
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  data BLOB NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (measurement_id, kind)
);
