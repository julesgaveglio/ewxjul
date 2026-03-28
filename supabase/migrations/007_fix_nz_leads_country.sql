-- Fix NZ leads misclassified as France (scanned before country column existed)
-- Detects by city name from the NZ cities list used in smart-scan-nz.ts
UPDATE leads
SET country = 'nz'
WHERE country IS NULL OR country = 'fr'
  AND city IN (
    'Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga',
    'Dunedin', 'Palmerston North', 'Nelson', 'Rotorua', 'New Plymouth',
    'Whangarei', 'Queenstown', 'Invercargill', 'Napier', 'Hastings',
    'Gisborne', 'Blenheim', 'Timaru', 'Wanganui', 'Kerikeri'
  );
