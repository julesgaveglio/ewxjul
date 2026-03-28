import type { RawCompany, AuditResult, ScoredLead } from '../types/pipeline'
import { buildBusinessIntelligence } from '../intelligence/business'
import { auditWebsite, concurrentMap, type LogFn } from './smart-scan'
import { deduplicateCompanies } from '../scrapers/deduplicator'
import { findEmail } from '../enrichment/hunter'
import { searchGoogleMaps } from '../scrapers/serpapi'

// ─── NZ Sectors & Cities ──────────────────────────────────────────────────────

const SECTORS_NZ = [
  // 🥇 Trades — best niche (many without websites, word-of-mouth only)
  'plumber', 'electrician', 'builder', 'roofer', 'painter', 'tiler',
  'drainlayer', 'landscaper', 'fencer', 'glazier', 'locksmith',

  // 🥈 Agriculture / horticulture — blue ocean (very low digital presence)
  'orchardist', 'market gardener', 'farmer', 'beekeeper', 'vineyard', 'winery',

  // Personal services at home (high local Google demand)
  'cleaning service', 'lawn mowing', 'home care', 'childcare',

  // 🥉 Hospitality — quick money (booking-dependance, sites often outdated)
  'restaurant', 'cafe', 'takeaway', 'bakery', 'hotel', 'motel', 'lodge', 'bed and breakfast',

  // Health professions
  'dentist', 'physiotherapist', 'osteopath', 'chiropractor',

  // Personal care
  'hairdresser', 'beauty salon', 'barber', 'nail salon', 'massage therapist',

  // Commerce & other
  'mechanic', 'panel beater', 'florist', 'photographer', 'real estate agent',
]

const CITIES_NZ = [
  'Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga',
  'Dunedin', 'Palmerston North', 'Nelson', 'Rotorua', 'New Plymouth',
  'Whangarei', 'Queenstown', 'Invercargill', 'Napier', 'Hastings',
  'Gisborne', 'Blenheim', 'Timaru', 'Wanganui', 'Kerikeri',
]

function pickRandom<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

// ─── NZ Competition scoring ───────────────────────────────────────────────────

const NZ_LARGE_CITIES = new Set(['auckland'])
const NZ_MEDIUM_CITIES = new Set(['wellington', 'christchurch', 'hamilton', 'tauranga'])

function scoreNZCompetition(city: string | null, googleReviews: number): number {
  let score = 25 // base (NZ market smaller → less competition than France)
  if (city) {
    const c = city.toLowerCase().trim()
    if (NZ_LARGE_CITIES.has(c)) score += 20
    else if (NZ_MEDIUM_CITIES.has(c)) score += 10
    else score += 3
  }
  if (googleReviews > 200) score += 25
  else if (googleReviews > 100) score += 15
  else if (googleReviews > 50) score += 8
  return Math.min(100, score)
}

// ─── NZ Sector priority ───────────────────────────────────────────────────────

function getNZSectorPriority(sector: string | null): number {
  if (!sector) return 40
  const s = sector.toLowerCase()
  // 🥇 Trades (95) — no website → losing all Google traffic
  if (/plumber|electrician|builder|roofer|painter|tiler|drainlayer|landscaper|fencer|glazier|locksmith/.test(s)) return 95
  // 🥈 Agriculture / horticulture (92) — blue ocean NZ
  if (/orchardist|market garden|farmer|beekeeper|vineyard|winery/.test(s)) return 92
  // Personal services at home (87)
  if (/cleaning|lawn mow|home care|childcare/.test(s)) return 87
  // 🥉 Hospitality (85)
  if (/restaurant|cafe|takeaway|bakery|hotel|motel|lodge|bed and breakfast/.test(s)) return 85
  // Health (75)
  if (/dentist|physiotherapist|osteopath|chiropractor/.test(s)) return 75
  // Personal care (78)
  if (/hairdresser|beauty salon|barber|nail salon|massage/.test(s)) return 78
  // Mechanic / panel beater (68)
  if (/mechanic|panel beater/.test(s)) return 68
  // Other commerce (60)
  if (/florist|photographer|real estate/.test(s)) return 60
  return 40
}

// ─── Phase 1: Collect NZ companies (Serper only — no NZ equivalent of PJ) ────

async function collectCompaniesNZ(
  sectors: string[],
  cities: string[],
  log: LogFn,
): Promise<RawCompany[]> {
  const all: RawCompany[] = []

  for (let i = 0; i < Math.min(sectors.length, cities.length); i++) {
    const sector = sectors[i]
    const city = cities[i]
    const query = `${sector} ${city} New Zealand`

    try {
      const results = await searchGoogleMaps(query)
      for (const p of results) {
        all.push({
          name: p.name,
          phone: p.phone,
          address: p.address,
          city,
          sector,
          naf_code: null,
          siret: null,
          website_url: p.website ?? null,
          google_maps_url: p.googleMapsUrl,
          google_rating: p.rating,
          google_reviews_count: p.reviewsCount,
          source: 'serper',
        })
      }
      await log(`✓ Serper: ${results.length} results for "${query}"`, 'success')
    } catch (e: any) {
      await log(`✗ Collection error "${query}": ${e.message}`, 'error')
    }
  }

  return all
}

// ─── Phase 2: Score a NZ lead ─────────────────────────────────────────────────

function computeScoreNZ(company: RawCompany, audit: AuditResult | null): number {
  let score = 0
  const priority = getNZSectorPriority(company.sector)
  const hasWebsite = !!company.website_url

  if (!hasWebsite) {
    // 🔴 CRITIQUE — no website = losing all Google traffic
    score += 40
    score += Math.min(priority * 0.35, 30) // sector priority bonus
    if (company.google_reviews_count < 5) score += 10   // quasi-unknown online
    if (company.google_reviews_count >= 50) score += 5  // active but no site = high FOMO
    return Math.min(Math.round(score), 100)
  }

  // Has website — audit quality
  if (audit) {
    // 🟠 FORT — technical problems
    if (!audit.is_responsive) score += 25
    if (audit.load_time_ms > 3000 || audit.lighthouse_score < 50) score += 20
    else if (audit.lighthouse_score < 70) score += 10
    if (!audit.has_https) score += 15
    if (audit.indexed_pages < 3) score += 12
    else if (audit.indexed_pages < 10) score += 6

    // 🟡 MEDIUM — conversion issues
    if (!audit.has_meta_tags) score += 10
    if (!audit.has_sitemap) score += 5
    if (!audit.has_robots) score += 3
    if (audit.vision_score && audit.vision_score > 65) {
      score += Math.round((audit.vision_score - 65) * 0.35)
    }
  }

  // Business signals
  if (company.google_reviews_count >= 50) score += 8
  if (company.google_rating && company.google_rating > 4.0) score += 5
  score += Math.min(priority * 0.12, 10)

  // NZ competition adjustment
  const competition = scoreNZCompetition(company.city, company.google_reviews_count)
  if (competition > 60) {
    const deduction = Math.round(((competition - 60) / 40) * 10)
    score = Math.max(0, score - deduction)
  }

  return Math.min(Math.round(score), 100)
}

// ─── Main NZ scan orchestrator ────────────────────────────────────────────────

export interface SmartScanNZOptions {
  sectorCount?: number
  auditSites?: boolean
  enrichWithHunter?: boolean
}

export async function runSmartScanNZ(
  log: LogFn,
  options: SmartScanNZOptions = {},
): Promise<ScoredLead[]> {
  const {
    sectorCount = 10,
    auditSites = true,
    enrichWithHunter = true,
  } = options

  // ── Step 1: Collect ──────────────────────────────────────────────────────
  await log('🔍 Collecting NZ businesses (Serper Google Maps)...', 'info', { progress: 5 })
  const sectors = pickRandom(SECTORS_NZ, sectorCount)
  const cities = pickRandom(CITIES_NZ, sectorCount)

  const rawCompanies = await collectCompaniesNZ(sectors, cities, log)
  await log(`✓ ${rawCompanies.length} companies collected`, 'success', { progress: 30, leads_found: rawCompanies.length })

  // ── Step 2: Deduplicate ──────────────────────────────────────────────────
  await log('🔎 Deduplication...', 'info', { progress: 32 })
  const dedupedCompanies = deduplicateCompanies(rawCompanies) as RawCompany[]
  await log(`✓ ${dedupedCompanies.length} unique companies`, 'success', { progress: 45 })

  // ── Step 3: Build scored leads ──────────────────────────────────────────
  const scoredLeads: ScoredLead[] = []
  const companiesWithSites = dedupedCompanies.filter(c => !!c.website_url)
  const companiesWithoutSites = dedupedCompanies.filter(c => !c.website_url)

  // No website → quick score
  for (const company of companiesWithoutSites) {
    const intel = buildBusinessIntelligence(company)
    const score = computeScoreNZ(company, null)
    scoredLeads.push({
      company_name: company.name,
      sector: company.sector,
      naf_code: null,
      siret: null,
      city: company.city,
      address: company.address,
      phone: company.phone,
      email: null,
      website_url: null,
      google_maps_url: company.google_maps_url,
      google_rating: company.google_rating,
      google_reviews_count: company.google_reviews_count,
      score,
      scoring_status: 'complete',
      audit: null,
      intelligence: intel,
    })
  }

  await log(`✓ ${companiesWithoutSites.length} no-site leads scored`, 'info', { progress: 50 })

  // With website → audit (4 parallel, shared browser)
  if (auditSites && companiesWithSites.length > 0) {
    await log(`🔬 Auditing ${companiesWithSites.length} NZ websites (4 parallel)...`, 'analyzing', { progress: 52 })
    const toAudit = companiesWithSites.slice(0, 40)

    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })
    let auditsDone = 0

    try {
      await concurrentMap(toAudit, async (company) => {
        const intel = buildBusinessIntelligence(company)
        let audit: AuditResult | null = null

        try {
          audit = await auditWebsite(company.website_url!, log, browser)
          const issues = []
          if (!audit.is_responsive) issues.push('not mobile')
          if (audit.lighthouse_score < 50) issues.push(`perf ${audit.lighthouse_score}/100`)
          if (!audit.has_https) issues.push('no HTTPS')
          if (!audit.has_meta_tags) issues.push('no SEO')
          if (audit.indexed_pages < 5) issues.push(`${audit.indexed_pages} indexed pages`)
          if (audit.cms) issues.push(`CMS: ${audit.cms}`)

          if (issues.length > 0) {
            await log(`⚠ ${audit.domain} — ${issues.join(', ')}`, 'success')
          } else {
            await log(`✓ ${audit.domain} — site OK`, 'info')
          }
        } catch (e: any) {
          await log(`✗ Audit failed ${company.website_url}: ${e.message}`, 'error')
        }

        const score = computeScoreNZ(company, audit)

        let email: string | null = null
        if (enrichWithHunter && audit?.domain) {
          try { email = await findEmail(audit.domain, company.name) } catch { /* optional */ }
        }

        scoredLeads.push({
          company_name: company.name,
          sector: company.sector,
          naf_code: null,
          siret: null,
          city: company.city,
          address: company.address,
          phone: company.phone,
          email,
          website_url: company.website_url,
          google_maps_url: company.google_maps_url,
          google_rating: company.google_rating,
          google_reviews_count: company.google_reviews_count,
          score,
          scoring_status: audit ? 'complete' : 'partial',
          audit,
          intelligence: intel,
        })

        auditsDone++
        const progress = 52 + Math.round((auditsDone / toAudit.length) * 40)
        await log('', 'info', { progress, leads_found: dedupedCompanies.length })
      }, 4)
    } finally {
      await browser.close()
    }

    // Remaining not audited
    for (const company of companiesWithSites.slice(40)) {
      const intel = buildBusinessIntelligence(company)
      const score = computeScoreNZ(company, null)
      scoredLeads.push({
        company_name: company.name,
        sector: company.sector,
        naf_code: null,
        siret: null,
        city: company.city,
        address: company.address,
        phone: company.phone,
        email: null,
        website_url: company.website_url,
        google_maps_url: company.google_maps_url,
        google_rating: company.google_rating,
        google_reviews_count: company.google_reviews_count,
        score,
        scoring_status: 'partial',
        audit: null,
        intelligence: intel,
      })
    }
  } else {
    for (const company of companiesWithSites) {
      const intel = buildBusinessIntelligence(company)
      const score = computeScoreNZ(company, null)
      scoredLeads.push({
        company_name: company.name,
        sector: company.sector,
        naf_code: null,
        siret: null,
        city: company.city,
        address: company.address,
        phone: company.phone,
        email: null,
        website_url: company.website_url,
        google_maps_url: company.google_maps_url,
        google_rating: company.google_rating,
        google_reviews_count: company.google_reviews_count,
        score,
        scoring_status: 'partial',
        audit: null,
        intelligence: intel,
      })
    }
  }

  scoredLeads.sort((a, b) => b.score - a.score)

  await log(`✓ ${scoredLeads.length} NZ leads scored`, 'success', { progress: 95, leads_found: scoredLeads.length })
  return scoredLeads
}
