-- How much floor a worker cleans in an hour without a machine and with one. Their ratio speeds up the
-- daily floor cleaning of a zone that has machines; each zone type's own rate stays the one without.
ALTER TABLE quote_parameters ADD COLUMN manual_rate_m2_per_hour REAL NOT NULL DEFAULT 300 CHECK (manual_rate_m2_per_hour > 0 AND manual_rate_m2_per_hour <= 1000000000);
ALTER TABLE quote_parameters ADD COLUMN machine_rate_m2_per_hour REAL NOT NULL DEFAULT 2300 CHECK (machine_rate_m2_per_hour > 0 AND machine_rate_m2_per_hour <= 1000000000);
UPDATE quote_parameters SET notes_json = json_set(notes_json,
  '$.manualRateM2PerHour', 'm² de piso que limpia una persona en una hora sin máquina (métrica general).',
  '$.machineRateM2PerHour', 'm² de piso que limpia una persona en una hora con máquina (métrica general).');

-- Per zone: the machines used, the floor without objects (NULL = the whole floor) and the floor that is
-- cleaned (NULL = the floor without objects).
ALTER TABLE quote_zones ADD COLUMN machines INTEGER NOT NULL DEFAULT 0 CHECK (machines >= 0 AND machines <= 1000);
ALTER TABLE quote_zones ADD COLUMN free_area REAL CHECK (free_area IS NULL OR free_area >= 0);
ALTER TABLE quote_zones ADD COLUMN cleaned_area REAL CHECK (cleaned_area IS NULL OR cleaned_area >= 0);
