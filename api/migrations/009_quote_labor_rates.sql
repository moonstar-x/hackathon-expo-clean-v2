-- Price of an hour of labor. NULL works it out from the wage, as before.
ALTER TABLE quote_parameters ADD COLUMN labor_hourly_rate REAL CHECK (labor_hourly_rate IS NULL OR (labor_hourly_rate >= 0 AND labor_hourly_rate <= 1000000000));
UPDATE quote_parameters SET notes_json = json_set(notes_json,
  '$.laborHourlyRate', 'Precio por hora de mano de obra. Vacío: se calcula con el sueldo y las cargas.');

-- A quote's own values in place of the parameters' and of what the calculator works out (QuoteOverrides).
ALTER TABLE quotes ADD COLUMN overrides_json TEXT NOT NULL DEFAULT '{}';
