-- A quote's own target margin on sales; NULL uses the parameters' targetMargin.
ALTER TABLE quotes ADD COLUMN target_margin REAL CHECK (target_margin IS NULL OR (target_margin >= 0 AND target_margin < 1));
