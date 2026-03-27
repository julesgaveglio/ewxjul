-- Replace partial unique index with a proper UNIQUE CONSTRAINT
-- (partial indexes don't work with PostgREST/Supabase upsert ON CONFLICT)
DROP INDEX IF EXISTS leads_google_maps_url_unique;

ALTER TABLE leads
  ADD CONSTRAINT leads_google_maps_url_key UNIQUE (google_maps_url);
