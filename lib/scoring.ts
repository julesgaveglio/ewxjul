import type { ScoringStatus } from './types/database'

// Secteurs CRITIQUE (opportunité immédiate, besoin évident)
const TOP_SECTORS = [
  // BTP & artisans — meilleure niche (48% sans site, gros panier)
  'plombier', 'plomberie', 'électricien', 'electricien', 'menuisier', 'maçon', 'maconnerie',
  'charpente', 'couvreur', 'carrelage', 'peintre en bâtiment', 'chauffage', 'climatisation', 'serrurier', 'vitrier',
  // Agriculture — blue ocean (65% sans site, peu de concurrence)
  'agriculteur', 'maraîcher', 'producteur', 'ferme', 'éleveur', 'viticulteur', 'arboriculteur',
  // Services à la personne (55% sans site, forte demande Google locale)
  'aide à domicile', 'garde d\'enfants', 'auxiliaire de vie', 'ménage', 'jardinage', 'garde d\'animaux',
]

// Secteurs FORT (argent rapide, gros ROI)
const STRONG_SECTORS = [
  'restaurant', 'resto', 'brasserie', 'pizzeria', 'traiteur', 'bar', 'café', 'snack',
  'hôtel', 'hotel', 'gîte', 'chambre d\'hôte',
  // Professions santé (crédibilité + budget correct)
  'médecin', 'medecin', 'dentiste', 'kiné', 'kinésithérapeute', 'pharmacie', 'infirmier', 'orthophoniste',
]

// Secteurs MOYEN (volume correct)
const MEDIUM_SECTORS = [
  'artisan', 'coiffeur', 'coiffure', 'esthétique', 'beauté', 'nail bar', 'spa', 'massage', 'institut',
  'boulangerie', 'boucherie', 'fleuriste',
  'commerce', 'boutique', 'magasin',
  'garage', 'carrosserie',
  'artisan d\'art', 'potier', 'sculpteur', 'céramiste', 'luthier',
]

interface PlacesData {
  website_url: string | null
  google_rating: number | null
  google_reviews_count: number
  sector: string | null
  google_maps_url: string | null
  googleProfileComplete: boolean
  indexedPages: number
}

interface AuditData {
  isResponsive: boolean
  lighthouseScore: number
  hasHttps: boolean
  hasMetaTags: boolean
  indexedPages: number
  hasSitemap?: boolean
  loadTimeMs?: number
  visionScore?: number | null
}

interface ScoreResult {
  score: number
  scoring_status: ScoringStatus
}

export function calculateScore(places: PlacesData, audit?: AuditData): ScoreResult {
  let score = 0
  const hasWebsite = !!places.website_url

  if (!hasWebsite) {
    // 🔴 CRITIQUE — absence totale de site
    score += 40 // base : perd 100% du trafic Google

    // Signaux aggravants : encore plus invisible
    if (!places.googleProfileComplete) score += 15   // même fiche Google incomplète
    if (places.indexedPages < 1) score += 15         // 0 résultats Google
    if (places.google_reviews_count < 5) score += 10 // très peu d'avis = inconnu
    if (places.google_reviews_count >= 50) score += 5 // actif mais sans site = FOMO fort

    // Secteur (timing + besoin client Google)
    score += getSectorBonus(places.sector)

    return { score: Math.min(score, 100), scoring_status: 'complete' }
  }

  // A un site — évaluation de sa qualité
  if (!audit) {
    // Score partiel : on sait juste qu'il a un site
    if (isPrioritySectorTop(places.sector)) score += 8
    else if (isPrioritySectorStrong(places.sector)) score += 5
    if (places.google_reviews_count >= 50) score += 5
    return { score: Math.min(score, 100), scoring_status: 'partial' }
  }

  // 🟠 FORT — gros problèmes techniques (site qui ne sert à rien)
  if (!audit.isResponsive) score += 25                                     // pas mobile
  if ((audit.loadTimeMs ?? 0) > 3000 || audit.lighthouseScore < 50) score += 20  // lent ou perf nulle
  else if (audit.lighthouseScore < 70) score += 10                        // moyen
  if (!audit.hasHttps) score += 15                                         // non sécurisé
  if (audit.indexedPages < 3) score += 12                                  // pas indexé sur Google (SEO mort)
  else if (audit.indexedPages < 10) score += 6

  // 🟡 MOYEN — manque de conversion / contenu
  if (!audit.hasMetaTags) score += 10                                      // aucun SEO on-page
  if (!places.googleProfileComplete) score += 8                            // fiche Google négligée
  if (audit.hasSitemap === false) score += 5                               // pas de sitemap
  if (audit.visionScore && audit.visionScore > 65) {
    score += Math.round((audit.visionScore - 65) * 0.35)                   // design très vieux
  }

  // 📊 Signaux business (potentiel de vente)
  if (places.google_reviews_count >= 50) score += 8
  if (places.google_rating && places.google_rating > 4.0) score += 5
  score += getSectorBonus(places.sector)

  return { score: Math.min(score, 100), scoring_status: 'complete' }
}

function getSectorBonus(sector: string | null): number {
  if (isPrioritySectorTop(sector)) return 10
  if (isPrioritySectorStrong(sector)) return 7
  if (isPrioritySectorMedium(sector)) return 4
  return 0
}

function isPrioritySectorTop(sector: string | null): boolean {
  if (!sector) return false
  const lower = sector.toLowerCase()
  return TOP_SECTORS.some(s => lower.includes(s))
}

function isPrioritySectorStrong(sector: string | null): boolean {
  if (!sector) return false
  const lower = sector.toLowerCase()
  return STRONG_SECTORS.some(s => lower.includes(s))
}

function isPrioritySectorMedium(sector: string | null): boolean {
  if (!sector) return false
  const lower = sector.toLowerCase()
  return MEDIUM_SECTORS.some(s => lower.includes(s))
}
