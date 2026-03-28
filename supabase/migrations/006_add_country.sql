-- Add country field to leads for France / New Zealand segmentation
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS country TEXT CHECK (country IS NULL OR country IN ('fr', 'nz')) DEFAULT 'fr';
