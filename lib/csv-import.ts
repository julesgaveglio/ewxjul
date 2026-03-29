import type { Lead, AssignedTo, Country } from '@/lib/types/database'

// Champs importables (subset de Lead, sans les champs auto-générés)
export type ImportableLeadField =
  | 'company_name' | 'phone' | 'city' | 'address'
  | 'website_url' | 'sector' | 'notes' | 'country'
  | 'owner_name' | 'score' | 'assigned_to' | 'ignore'

export const IMPORTABLE_FIELDS: { value: ImportableLeadField; label: string }[] = [
  { value: 'company_name', label: 'Nom de la société *' },
  { value: 'phone',        label: 'Téléphone' },
  { value: 'city',         label: 'Ville' },
  { value: 'address',      label: 'Adresse' },
  { value: 'website_url',  label: 'Site web' },
  { value: 'sector',       label: 'Secteur' },
  { value: 'notes',        label: 'Notes' },
  { value: 'country',      label: 'Pays' },
  { value: 'owner_name',   label: 'Gérant / Propriétaire' },
  { value: 'score',        label: 'Score' },
  { value: 'assigned_to',  label: 'Assigné à' },
  { value: 'ignore',       label: '— Ignorer —' },
]

// Table de synonymes : clé normalisée → champ Lead
const SYNONYMS: Record<string, ImportableLeadField> = {
  // company_name
  nom: 'company_name', company: 'company_name', societe: 'company_name',
  name: 'company_name', entreprise: 'company_name', 'raison sociale': 'company_name',
  raison_sociale: 'company_name', company_name: 'company_name',
  // phone
  telephone: 'phone', tel: 'phone', phone: 'phone',
  // city
  ville: 'city', city: 'city',
  // address
  adresse: 'address', address: 'address',
  // website_url
  site: 'website_url', website: 'website_url', url: 'website_url',
  'site web': 'website_url', site_web: 'website_url', website_url: 'website_url',
  // sector
  secteur: 'sector', sector: 'sector', activite: 'sector', activite2: 'sector',
  // notes
  note: 'notes', notes: 'notes', commentaire: 'notes', commentaires: 'notes',
  // country
  pays: 'country', country: 'country',
  // owner_name
  gerant: 'owner_name', proprietaire: 'owner_name',
  owner_name: 'owner_name', owner: 'owner_name',
  // score
  score: 'score',
  // assigned_to
  assigne: 'assigned_to', assigned_to: 'assigned_to', assigned: 'assigned_to',
}

/** Normalise un header CSV : lowercase, trim, supprime accents */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Retourne le champ Lead correspondant à un header CSV, ou 'ignore' */
export function autoDetectField(header: string): ImportableLeadField {
  const normalized = normalizeHeader(header)
  return SYNONYMS[normalized] ?? 'ignore'
}

/** Normalise une valeur `country` vers 'fr' | 'nz' */
export function normalizeCountry(value: string): Country {
  const v = value.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (v === 'nz' || v === 'nouvelle-zelande' || v === 'new zealand' || v === 'newzealand') return 'nz'
  return 'fr'
}

/** Normalise une valeur `assigned_to` vers 'jules' | 'ewan' | null */
export function normalizeAssignedTo(value: string): AssignedTo | null {
  const v = value.toLowerCase().trim()
  if (v === 'jules') return 'jules'
  if (v === 'ewan') return 'ewan'
  return null
}

export type MappingEntry = { csvHeader: string; field: ImportableLeadField; autoDetected: boolean }

/** Génère le mapping initial à partir des headers CSV */
export function buildInitialMapping(headers: string[]): MappingEntry[] {
  return headers.map(header => {
    const field = autoDetectField(header)
    return { csvHeader: header, field, autoDetected: field !== 'ignore' }
  })
}

export type RawRow = Record<string, string>

export type MappedLead = {
  company_name: string
  phone: string | null
  city: string | null
  address: string | null
  website_url: string | null
  sector: string | null
  notes: string | null
  country: Country
  owner_name: string | null
  score: number
  assigned_to: AssignedTo | null
  status: 'to_call'
  scoring_status: 'partial'
  demo_status: 'idle'
  google_reviews_count: number
  google_rating: null
  sale_price: null
  google_maps_url: null
  brand_data: null
  demo_url: null
  demo_error_message: null
  demo_generated_at: null
  last_contact_at: null
}

/** Convertit une ligne CSV brute en objet lead prêt à insérer */
export function mapRowToLead(row: RawRow, mapping: MappingEntry[]): MappedLead {
  const partial: Record<string, unknown> = {}

  for (const { csvHeader, field } of mapping) {
    if (field === 'ignore') continue
    const rawValue = row[csvHeader]?.trim() ?? ''
    if (!rawValue) continue

    if (field === 'country') {
      partial.country = normalizeCountry(rawValue)
    } else if (field === 'assigned_to') {
      partial.assigned_to = normalizeAssignedTo(rawValue)
    } else if (field === 'score') {
      const n = parseInt(rawValue, 10)
      partial.score = isNaN(n) ? 0 : n
    } else {
      partial[field] = rawValue
    }
  }

  return {
    company_name: (partial.company_name as string) ?? '',
    phone: (partial.phone as string) ?? null,
    city: (partial.city as string) ?? null,
    address: (partial.address as string) ?? null,
    website_url: (partial.website_url as string) ?? null,
    sector: (partial.sector as string) ?? null,
    notes: (partial.notes as string) ?? null,
    country: (partial.country as Country) ?? 'fr',
    owner_name: (partial.owner_name as string) ?? null,
    score: (partial.score as number) ?? 0,
    assigned_to: (partial.assigned_to as AssignedTo | null) ?? null,
    status: 'to_call',
    scoring_status: 'partial',
    demo_status: 'idle',
    google_reviews_count: 0,
    google_rating: null,
    sale_price: null,
    google_maps_url: null,
    brand_data: null,
    demo_url: null,
    demo_error_message: null,
    demo_generated_at: null,
    last_contact_at: null,
  }
}

/** Détecte si un lead mappé est doublon d'un lead existant */
export function isDuplicate(mapped: MappedLead, existingLeads: Lead[]): boolean {
  const name = mapped.company_name.toLowerCase().trim()
  const city = mapped.city?.toLowerCase().trim() ?? null
  return existingLeads.some(l => {
    const lName = l.company_name.toLowerCase().trim()
    const lCity = l.city?.toLowerCase().trim() ?? null
    return lName === name && lCity === city
  })
}

/** Génère et télécharge un CSV modèle vide */
export function downloadTemplateCsv() {
  const headers = [
    'company_name', 'phone', 'city', 'address', 'website_url',
    'sector', 'notes', 'country', 'owner_name', 'score', 'assigned_to',
  ]
  const csv = headers.join(',') + '\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'leads-modele.csv'
  a.click()
  URL.revokeObjectURL(url)
}
