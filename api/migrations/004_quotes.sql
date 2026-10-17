
ALTER TABLE measurements ADD COLUMN quoting_json TEXT;   -- location-level quoting inputs from the phone (§8.6)

CREATE TABLE quote_products (
  id                           INTEGER PRIMARY KEY AUTOINCREMENT,
  name                         TEXT    NOT NULL COLLATE NOCASE UNIQUE,
  use                          TEXT,
  presentation_size            REAL    NOT NULL CHECK (presentation_size > 0),
  unit                         TEXT    NOT NULL CHECK (unit IN ('L','kg')),
  published_price              REAL    NOT NULL CHECK (published_price >= 0),
  published_price_includes_vat INTEGER NOT NULL CHECK (published_price_includes_vat IN (0,1)),
  dose_per_liter               REAL    NOT NULL CHECK (dose_per_liter >= 0),
  stock_containers             REAL             CHECK (stock_containers IS NULL OR stock_containers >= 0),
  inventory_product_id         INTEGER REFERENCES products(id) ON DELETE SET NULL,
  presentation_status          TEXT,
  source_url                   TEXT,
  note                         TEXT,
  active                       INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE quote_schedules (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  code                  TEXT    NOT NULL UNIQUE,
  name                  TEXT    NOT NULL COLLATE NOCASE UNIQUE,
  service_hours_per_day REAL    NOT NULL CHECK (service_hours_per_day > 0 AND service_hours_per_day <= 24),
  night_hours_fraction  REAL    NOT NULL CHECK (night_hours_fraction BETWEEN 0 AND 1),
  includes_holidays     INTEGER NOT NULL CHECK (includes_holidays IN (0,1)),
  note TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE quote_zone_types (
  id                            INTEGER PRIMARY KEY AUTOINCREMENT,
  code                          TEXT    NOT NULL UNIQUE,
  name                          TEXT    NOT NULL COLLATE NOCASE UNIQUE,
  risk                          TEXT    NOT NULL CHECK (risk IN ('critical','semicritical','noncritical')),
  daily_rate_m2_per_hour        REAL    NOT NULL CHECK (daily_rate_m2_per_hour > 0),
  terminal_rate_m2_per_hour     REAL    NOT NULL CHECK (terminal_rate_m2_per_hour > 0),
  hours_between_low             REAL    NOT NULL CHECK (hours_between_low > 0),
  hours_between_medium          REAL    NOT NULL CHECK (hours_between_medium > 0),
  hours_between_high            REAL    NOT NULL CHECK (hours_between_high > 0),
  walls_in_terminal             INTEGER NOT NULL CHECK (walls_in_terminal IN (0,1)),
  suggested_terminals_per_month REAL    NOT NULL CHECK (suggested_terminals_per_month >= 0),
  cleaning_product_id           INTEGER NOT NULL REFERENCES quote_products(id) ON DELETE RESTRICT,
  daily_disinfectant_id         INTEGER NOT NULL REFERENCES quote_products(id) ON DELETE RESTRICT,
  terminal_disinfectant_id      INTEGER NOT NULL REFERENCES quote_products(id) ON DELETE RESTRICT,
  solution_liters_per_m2        REAL    NOT NULL CHECK (solution_liters_per_m2 >= 0),
  counts_fixtures               INTEGER NOT NULL DEFAULT 0 CHECK (counts_fixtures IN (0,1)),
  note TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE quote_location_types (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  location_type TEXT    NOT NULL UNIQUE,
  label         TEXT    NOT NULL,
  zone_type_id  INTEGER REFERENCES quote_zone_types(id) ON DELETE RESTRICT,
  updated_at    TEXT    NOT NULL
);

CREATE TABLE quote_parameters (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  revision    INTEGER NOT NULL DEFAULT 1,
  monthly_wage REAL NOT NULL CHECK (monthly_wage > 0 AND monthly_wage <= 1000000000),
  basic_wage REAL NOT NULL CHECK (basic_wage >= 0 AND basic_wage <= 1000000000),
  employer_contribution_rate REAL NOT NULL CHECK (employer_contribution_rate >= 0 AND employer_contribution_rate <= 1),
  reserve_fund_rate REAL NOT NULL CHECK (reserve_fund_rate >= 0 AND reserve_fund_rate <= 1),
  apply_reserve_fund INTEGER NOT NULL CHECK (apply_reserve_fund IN (0,1)),
  other_payroll_rate REAL NOT NULL CHECK (other_payroll_rate >= 0 AND other_payroll_rate <= 1),
  theoretical_workdays_per_year REAL NOT NULL CHECK (theoretical_workdays_per_year >= 0 AND theoretical_workdays_per_year <= 1000000000 AND theoretical_workdays_per_year <= 366 AND theoretical_workdays_per_year >= 1),
  non_worked_holidays_per_year REAL NOT NULL CHECK (non_worked_holidays_per_year >= 0 AND non_worked_holidays_per_year <= 1000000000),
  vacation_workdays_per_year REAL NOT NULL CHECK (vacation_workdays_per_year >= 0 AND vacation_workdays_per_year <= 1000000000),
  other_absence_days_per_year REAL NOT NULL CHECK (other_absence_days_per_year >= 0 AND other_absence_days_per_year <= 1000000000),
  hours_per_workday REAL NOT NULL CHECK (hours_per_workday > 0 AND hours_per_workday <= 1000000000 AND hours_per_workday <= 24),
  productive_fraction REAL NOT NULL CHECK (productive_fraction > 0 AND productive_fraction <= 1),
  night_surcharge_rate REAL NOT NULL CHECK (night_surcharge_rate >= 0 AND night_surcharge_rate <= 10),
  holiday_surcharge_rate REAL NOT NULL CHECK (holiday_surcharge_rate >= 0 AND holiday_surcharge_rate <= 10),
  national_holidays_per_year REAL NOT NULL CHECK (national_holidays_per_year >= 0 AND national_holidays_per_year <= 1000000000 AND national_holidays_per_year <= 365),
  supervisor_monthly_cost REAL NOT NULL CHECK (supervisor_monthly_cost >= 0 AND supervisor_monthly_cost <= 1000000000),
  operators_per_supervisor REAL NOT NULL CHECK (operators_per_supervisor > 0 AND operators_per_supervisor <= 1000000000),
  base_epp_per_fte REAL NOT NULL CHECK (base_epp_per_fte >= 0 AND base_epp_per_fte <= 1000000000),
  critical_epp_per_fte REAL NOT NULL CHECK (critical_epp_per_fte >= 0 AND critical_epp_per_fte <= 1000000000),
  mop_coverage_m2 REAL NOT NULL CHECK (mop_coverage_m2 > 0 AND mop_coverage_m2 <= 1000000000),
  mop_cost REAL NOT NULL CHECK (mop_cost >= 0 AND mop_cost <= 1000000000),
  mop_replacements_per_month REAL NOT NULL CHECK (mop_replacements_per_month >= 0 AND mop_replacements_per_month <= 1000000000),
  equipment_monthly REAL NOT NULL CHECK (equipment_monthly >= 0 AND equipment_monthly <= 1000000000),
  transport_monthly REAL NOT NULL CHECK (transport_monthly >= 0 AND transport_monthly <= 1000000000),
  insurance_monthly REAL NOT NULL CHECK (insurance_monthly >= 0 AND insurance_monthly <= 1000000000),
  administration_rate REAL NOT NULL CHECK (administration_rate >= 0 AND administration_rate <= 1),
  contingency_rate REAL NOT NULL CHECK (contingency_rate >= 0 AND contingency_rate <= 1),
  target_margin REAL NOT NULL CHECK (target_margin >= 0 AND target_margin < 1),
  minimum_margin REAL NOT NULL CHECK (minimum_margin >= 0 AND minimum_margin <= 1),
  vat_rate REAL NOT NULL CHECK (vat_rate >= 0 AND vat_rate <= 1),
  purchase_vat_rate REAL NOT NULL CHECK (purchase_vat_rate >= 0 AND purchase_vat_rate <= 1),
  target_waste_rate REAL NOT NULL CHECK (target_waste_rate >= 0 AND target_waste_rate <= 1),
  uncontrolled_waste_rate REAL NOT NULL CHECK (uncontrolled_waste_rate >= 0 AND uncontrolled_waste_rate <= 1),
  flat_rate_per_m2 REAL CHECK (flat_rate_per_m2 >= 0 AND flat_rate_per_m2 <= 1000000000),
  months_per_year REAL NOT NULL CHECK (months_per_year >= 0 AND months_per_year <= 1000000000 AND months_per_year <= 12 AND months_per_year >= 1 AND months_per_year = CAST(months_per_year AS INTEGER)),
  default_traffic TEXT CHECK (default_traffic IN ('low','medium','high')),
  default_schedule_id REAL REFERENCES quote_schedules(id) ON DELETE RESTRICT CHECK (default_schedule_id > 0),
  default_days_per_month REAL CHECK (default_days_per_month > 0 AND default_days_per_month <= 1000000000 AND default_days_per_month <= 31),
  default_zone_type_id REAL REFERENCES quote_zone_types(id) ON DELETE RESTRICT CHECK (default_zone_type_id > 0),
  default_fixture_visits_per_day REAL CHECK (default_fixture_visits_per_day > 0 AND default_fixture_visits_per_day <= 1000000000),
  default_minutes_per_fixture REAL CHECK (default_minutes_per_fixture > 0 AND default_minutes_per_fixture <= 1000000000),
  default_solution_liters_per_fixture REAL CHECK (default_solution_liters_per_fixture > 0 AND default_solution_liters_per_fixture <= 1000000000),
  default_paper_soap_per_fixture_monthly REAL CHECK (default_paper_soap_per_fixture_monthly >= 0 AND default_paper_soap_per_fixture_monthly <= 1000000000),
  fixture_defaults_exclude_floor INTEGER NOT NULL CHECK (fixture_defaults_exclude_floor IN (0,1)),
  notes_json  TEXT    NOT NULL DEFAULT '{}',
  updated_by  TEXT,
  updated_at  TEXT    NOT NULL,
  CHECK (minimum_margin <= target_margin)
);

CREATE TABLE quotes (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  measurement_id            INTEGER UNIQUE REFERENCES measurements(id) ON DELETE SET NULL,
  name                      TEXT    NOT NULL,
  installation_type         TEXT    CHECK (installation_type IN ('privateHospital','publicHospital','office','mall','other')),
  city                      TEXT,
  visit_date                TEXT,                                    -- YYYY-MM-DD
  measurement_origin        TEXT    NOT NULL DEFAULT 'siteVisit' CHECK (measurement_origin IN ('siteVisit','plans','estimate')),
  assumptions_confirmed     INTEGER NOT NULL DEFAULT 0 CHECK (assumptions_confirmed IN (0,1)),
  manual_price              REAL    CHECK (manual_price IS NULL OR manual_price >= 0),
  external_reference_price  REAL    CHECK (external_reference_price IS NULL OR external_reference_price > 0),
  notes                     TEXT,
  status                    TEXT    CHECK (status IN ('needsReview','simulation')),   -- NULL until the first calculation
  calculation_state         TEXT    NOT NULL DEFAULT 'pending' CHECK (calculation_state IN ('pending','running','done','failed')),
  calculation_error         TEXT,
  input_revision            INTEGER NOT NULL DEFAULT 0,
  calculated_input_revision INTEGER,
  parameters_revision       INTEGER,                                 -- settings revision used by the last calculation
  calculated_at             TEXT,
  -- copies of result values, for list columns and sorting:
  offered_price REAL, total_cost REAL, profit REAL, margin REAL,
  margin_status TEXT CHECK (margin_status IN ('loss','belowMinimum','acceptable','healthy')),
  total_floor_area REAL, fte REAL, active_zone_count INTEGER,
  result_json   TEXT,                                                -- EngineResult (§5.13)
  snapshot_json TEXT,                                                -- settings used (§7.3)
  created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX idx_quotes_created ON quotes(created_at);
CREATE INDEX idx_quotes_status  ON quotes(status);

CREATE TABLE quote_zones (
  id                         INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id                   INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  position                   INTEGER NOT NULL,
  origin                     TEXT    NOT NULL CHECK (origin IN ('scan','manual')),
  room_id                    TEXT,                                   -- measurement room UUID (lowercase) for scan zones
  name                       TEXT    NOT NULL,
  zone_type_id               INTEGER REFERENCES quote_zone_types(id) ON DELETE RESTRICT,
  floor_area                 REAL,
  wall_area                  REAL,
  is_floor_approximate       INTEGER NOT NULL DEFAULT 0 CHECK (is_floor_approximate IN (0,1)),
  traffic                    TEXT    CHECK (traffic IN ('low','medium','high')),
  schedule_id                INTEGER REFERENCES quote_schedules(id) ON DELETE RESTRICT,
  days_per_month             REAL,
  terminals_per_month        REAL,                                   -- NULL = the zone type's suggestion
  fixed_posts                INTEGER NOT NULL DEFAULT 0 CHECK (fixed_posts >= 0),
  measurement_source         TEXT    NOT NULL DEFAULT 'measured' CHECK (measurement_source IN ('measured','plans','estimated')),
  observation                TEXT,
  toilets INTEGER, urinals INTEGER, sinks INTEGER,                   -- NULL = pending (workbook: empty cell)
  fixture_visits_per_day     REAL,
  minutes_per_fixture        REAL,
  solution_liters_per_fixture REAL,
  paper_soap_monthly         REAL,
  fixtures_exclude_floor     INTEGER NOT NULL DEFAULT 0 CHECK (fixtures_exclude_floor IN (0,1)),
  sources_json               TEXT    NOT NULL DEFAULT '{}',          -- { field: 'scan' | 'app' | 'default' | 'manual' }
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  UNIQUE (quote_id, position)
);

CREATE TABLE quote_jobs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id     INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  kind         TEXT    NOT NULL CHECK (kind IN ('generate','recalculate','regenerate')),
  status       TEXT    NOT NULL CHECK (status IN ('pending','running','done','failed')),
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  run_after    TEXT    NOT NULL,
  requested_by TEXT,                                                 -- email; NULL when the trigger created it
  created_at   TEXT    NOT NULL,
  started_at   TEXT,
  finished_at  TEXT
);
CREATE INDEX idx_quote_jobs_ready ON quote_jobs(status, run_after);
CREATE UNIQUE INDEX idx_quote_jobs_one_pending ON quote_jobs(quote_id) WHERE status = 'pending';

CREATE TABLE quote_waste_controls (
  quote_id           INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  period             TEXT    NOT NULL CHECK (period GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
  product_id         INTEGER NOT NULL REFERENCES quote_products(id) ON DELETE RESTRICT,
  actual_consumption REAL    NOT NULL CHECK (actual_consumption >= 0),
  updated_by         TEXT    NOT NULL,
  updated_at         TEXT    NOT NULL,
  PRIMARY KEY (quote_id, period, product_id)
);

-- A new measurement is a quote job (§7.1).
CREATE TRIGGER trg_measurements_enqueue_quote AFTER INSERT ON measurements
BEGIN
  INSERT INTO quotes (measurement_id, name, visit_date, calculation_state, created_by, created_at, updated_at)
  VALUES (NEW.id, NEW.name, substr(NEW.scanned_at, 1, 10), 'pending', NEW.created_by, NEW.created_at, NEW.created_at);
  INSERT INTO quote_jobs (quote_id, kind, status, run_after, created_at)
  VALUES ((SELECT id FROM quotes WHERE measurement_id = NEW.id), 'generate', 'pending', NEW.created_at, NEW.created_at);
END;

CREATE TRIGGER trg_quote_products_rev_insert AFTER INSERT ON quote_products
BEGIN UPDATE quote_parameters SET revision = revision + 1; END;

CREATE TRIGGER trg_quote_products_rev_update AFTER UPDATE ON quote_products
BEGIN UPDATE quote_parameters SET revision = revision + 1; END;

CREATE TRIGGER trg_quote_products_rev_delete AFTER DELETE ON quote_products
BEGIN UPDATE quote_parameters SET revision = revision + 1; END;

CREATE TRIGGER trg_quote_schedules_rev_insert AFTER INSERT ON quote_schedules
BEGIN UPDATE quote_parameters SET revision = revision + 1; END;

CREATE TRIGGER trg_quote_schedules_rev_update AFTER UPDATE ON quote_schedules
BEGIN UPDATE quote_parameters SET revision = revision + 1; END;

CREATE TRIGGER trg_quote_schedules_rev_delete AFTER DELETE ON quote_schedules
BEGIN UPDATE quote_parameters SET revision = revision + 1; END;

CREATE TRIGGER trg_quote_zone_types_rev_insert AFTER INSERT ON quote_zone_types
BEGIN UPDATE quote_parameters SET revision = revision + 1; END;

CREATE TRIGGER trg_quote_zone_types_rev_update AFTER UPDATE ON quote_zone_types
BEGIN UPDATE quote_parameters SET revision = revision + 1; END;

CREATE TRIGGER trg_quote_zone_types_rev_delete AFTER DELETE ON quote_zone_types
BEGIN UPDATE quote_parameters SET revision = revision + 1; END;

CREATE TRIGGER trg_quote_location_types_rev_insert AFTER INSERT ON quote_location_types
BEGIN UPDATE quote_parameters SET revision = revision + 1; END;

CREATE TRIGGER trg_quote_location_types_rev_update AFTER UPDATE ON quote_location_types
BEGIN UPDATE quote_parameters SET revision = revision + 1; END;

CREATE TRIGGER trg_quote_location_types_rev_delete AFTER DELETE ON quote_location_types
BEGIN UPDATE quote_parameters SET revision = revision + 1; END;
-- Backfill: measurements that already exist get a quote and a job.
INSERT INTO quotes (measurement_id, name, visit_date, calculation_state, created_by, created_at, updated_at)
  SELECT id, name, substr(scanned_at, 1, 10), 'pending', created_by,
         strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM measurements;
INSERT INTO quote_jobs (quote_id, kind, status, run_after, created_at)
  SELECT id, 'generate', 'pending', created_at, created_at FROM quotes;
