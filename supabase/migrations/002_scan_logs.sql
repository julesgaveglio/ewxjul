ALTER TABLE scraping_jobs
  ADD COLUMN IF NOT EXISTS current_action TEXT,
  ADD COLUMN IF NOT EXISTS logs JSONB DEFAULT '[]'::jsonb;
