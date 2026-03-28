CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  category TEXT CHECK (category IN ('reseau', 'client', 'partenaire', 'fournisseur', 'referent', 'investisseur')) DEFAULT 'reseau',
  notes TEXT,
  assigned_to TEXT CHECK (assigned_to IS NULL OR assigned_to IN ('jules', 'ewan'))
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage contacts"
  ON contacts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
