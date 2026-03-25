CREATE TYPE lead_status AS ENUM ('to_call', 'contacted', 'demo_sent', 'sold', 'refused');
CREATE TYPE demo_status_enum AS ENUM ('idle', 'scraping', 'generating', 'deploying', 'deployed', 'error');
CREATE TYPE scoring_status AS ENUM ('partial', 'complete');
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'error');

CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  company_name TEXT NOT NULL,
  sector TEXT,
  city TEXT,
  address TEXT,
  phone TEXT,
  website_url TEXT,
  google_maps_url TEXT,
  google_rating NUMERIC(2,1),
  google_reviews_count INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  scoring_status scoring_status DEFAULT 'partial',
  status lead_status DEFAULT 'to_call',
  assigned_to TEXT,
  sale_price NUMERIC(10,2),
  notes TEXT,
  demo_url TEXT,
  demo_status demo_status_enum DEFAULT 'idle',
  demo_error_message TEXT,
  demo_generated_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  brand_data JSONB,
  CONSTRAINT assigned_to_check CHECK (assigned_to IS NULL OR assigned_to IN ('jules', 'ewan'))
);

CREATE UNIQUE INDEX leads_google_maps_url_unique
  ON leads (google_maps_url) WHERE google_maps_url IS NOT NULL;

CREATE TABLE scraping_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  query_city TEXT NOT NULL,
  query_sector TEXT NOT NULL,
  status job_status DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  leads_found INTEGER DEFAULT 0,
  leads_added INTEGER DEFAULT 0,
  error_message TEXT
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_leads" ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_leads" ON leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_leads" ON leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_leads" ON leads FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_select_jobs" ON scraping_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_jobs" ON scraping_jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_jobs" ON scraping_jobs FOR UPDATE TO authenticated USING (true);
