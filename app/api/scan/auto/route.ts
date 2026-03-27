import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { scrapeGoogleMaps, parseApifyPlace } from '@/lib/scraper/apify'
import { analyzeSite } from '@/lib/scraper/site-analyzer'
import { calculateScore } from '@/lib/scoring'

const SECTORS = [
  'plombier', 'électricien', 'menuisier', 'maçon', 'peintre en bâtiment',
  'coiffeur', 'institut de beauté', 'barbier',
  'restaurant', 'boulangerie', 'boucherie', 'pizzeria', 'traiteur',
  'garage automobile', 'carrosserie', 'vitrier', 'serrurier',
  'fleuriste', 'photographe', 'agent immobilier', 'expert comptable',
  'taxi', 'déménageur', 'nettoyage', 'pressing', 'cordonnerie',
]

const CITIES = [
  'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Montpellier',
  'Strasbourg', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Toulon',
  'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Le Mans', 'Brest',
  'Aix-en-Provence', 'Limoges', 'Tours', 'Amiens', 'Perpignan',
  'Metz', 'Besançon', 'Orléans', 'Caen', 'Mulhouse', 'Rouen',
  'Clermont-Ferrand', 'Nancy', 'Avignon', 'Poitiers', 'Pau',
  'Bayonne', 'Cannes', 'Antibes', 'Fréjus', 'Troyes', 'Valence',
]

function pickRandom<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const db = createServiceClient()

  const { data: runningJobs } = await db
    .from('scraping_jobs')
    .select('id')
    .eq('status', 'running')
    .limit(1)

  if (runningJobs && runningJobs.length > 0) {
    return NextResponse.json({ error: 'Un scan est déjà en cours' }, { status: 409 })
  }

  const { data: job, error: jobError } = await db
    .from('scraping_jobs')
    .insert({ query_city: 'Auto', query_sector: 'Multi-secteurs', status: 'running', progress: 0, logs: [] })
    .select()
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: `Erreur création job: ${jobError?.message ?? 'job null'}` }, { status: 500 })
  }

  runAutoScan(db, job.id).catch(console.error)
  return NextResponse.json({ job_id: job.id })
}

// ─── Logging helper ───────────────────────────────────────────────────────────

async function log(
  db: any,
  jobId: string,
  message: string,
  type: 'info' | 'success' | 'error' | 'analyzing' = 'info',
  extra?: Partial<{ progress: number; leads_found: number; leads_added: number }>
) {
  const entry = { time: new Date().toISOString(), message, type }
  const { data } = await db.from('scraping_jobs').select('logs').eq('id', jobId).single()
  const logs = Array.isArray(data?.logs) ? [...data.logs] : []
  logs.push(entry)
  if (logs.length > 150) logs.splice(0, logs.length - 150)
  await db.from('scraping_jobs').update({ logs, current_action: message, ...extra }).eq('id', jobId)
}

// ─── Main scan ────────────────────────────────────────────────────────────────

async function runAutoScan(db: any, jobId: string) {
  try {
    await log(db, jobId, 'Démarrage du scan automatique...', 'info', { progress: 5 })

    const sectors = pickRandom(SECTORS, 10)
    const cities = pickRandom(CITIES, 10)
    const queries = sectors.map((s, i) => `${s} à ${cities[i]}`)

    await log(db, jobId, `Apify — ${queries.length} requêtes : ${queries.slice(0, 3).join(', ')}...`, 'info', { progress: 10 })

    // ── Phase 1 : Scrape via Apify ──────────────────────────────────────────
    const places = await scrapeGoogleMaps(queries)
    await log(db, jobId, `✓ Apify terminé — ${places.length} entreprises récupérées`, 'success', { progress: 55, leads_found: places.length })

    // ── Phase 2 : Insert all leads immediately ──────────────────────────────
    await log(db, jobId, `Insertion de ${places.length} leads en base...`, 'info')

    let leadsAdded = 0
    let duplicates = 0
    let errors = 0

    for (let i = 0; i < places.length; i++) {
      const place = places[i]
      const leadData = parseApifyPlace(place, sectors[i % sectors.length])

      const scoreResult = calculateScore({
        website_url: leadData.website_url,
        google_rating: leadData.google_rating,
        google_reviews_count: leadData.google_reviews_count,
        sector: leadData.sector,
        google_maps_url: leadData.google_maps_url,
        googleProfileComplete: !!(leadData.phone && leadData.address),
        indexedPages: 0,
      })

      const { error: insertError } = await db.from('leads').insert({
        ...leadData,
        score: scoreResult.score,
        // websites need analysis; no-website = complete immediately
        scoring_status: leadData.website_url ? 'partial' : 'complete',
      })

      if (!insertError) {
        leadsAdded++
      } else if (insertError.code === '23505') {
        duplicates++
      } else {
        errors++
        if (errors <= 3) {
          await log(db, jobId, `⚠ Insert error: ${insertError.message}`, 'error')
        }
      }

      // Update progress + counter every 10 items
      if (i % 10 === 0) {
        const progress = 55 + Math.round((i / places.length) * 10)
        await db.from('scraping_jobs').update({ progress, leads_added: leadsAdded }).eq('id', jobId)
      }
    }

    await log(db, jobId,
      `✓ Insertion terminée — ${leadsAdded} nouveaux · ${duplicates} doublons · ${errors} erreurs`,
      'success',
      { progress: 65, leads_added: leadsAdded }
    )

    // ── Phase 3 : Analyze sites ─────────────────────────────────────────────
    const { data: leadsWithSites } = await db
      .from('leads')
      .select('id, website_url, google_rating, google_reviews_count, sector, google_maps_url, phone, address')
      .eq('scoring_status', 'partial')
      .not('website_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(40)

    const toAnalyze = leadsWithSites ?? []
    await log(db, jobId, `Analyse de ${toAnalyze.length} sites web...`, 'analyzing', { progress: 67 })

    let analyzed = 0
    for (const lead of toAnalyze) {
      let domain = ''
      try {
        domain = new URL(lead.website_url).hostname
        await log(db, jobId, `→ ${domain}`, 'analyzing')

        const audit = await analyzeSite(lead.website_url, domain)

        const issues: string[] = []
        if (!audit.isResponsive) issues.push('pas mobile')
        if (audit.lighthouseScore < 50) issues.push(`perf ${audit.lighthouseScore}/100`)
        if (!audit.hasHttps) issues.push('no HTTPS')
        if (!audit.hasMetaTags) issues.push('SEO vide')
        if (audit.indexedPages < 5) issues.push(`${audit.indexedPages} pages indexées`)

        const verdict = issues.length > 0
          ? `⚠ ${domain} — ${issues.join(', ')}`
          : `✓ ${domain} — site correct`

        await log(db, jobId, verdict, issues.length > 0 ? 'success' : 'info')

        const scoreResult = calculateScore(
          {
            website_url: lead.website_url,
            google_rating: lead.google_rating,
            google_reviews_count: lead.google_reviews_count,
            sector: lead.sector,
            google_maps_url: lead.google_maps_url,
            googleProfileComplete: !!(lead.phone && lead.address),
            indexedPages: audit.indexedPages,
          },
          audit
        )

        await db.from('leads').update({ score: scoreResult.score, scoring_status: 'complete' }).eq('id', lead.id)
      } catch (e: any) {
        await log(db, jobId, `✗ Échec ${domain || lead.website_url}: ${e.message}`, 'error')
        await db.from('leads').update({ scoring_status: 'complete' }).eq('id', lead.id)
      }

      analyzed++
      const progress = 67 + Math.round((analyzed / toAnalyze.length) * 32)
      await db.from('scraping_jobs').update({ progress, leads_added: leadsAdded }).eq('id', jobId)
    }

    await log(db, jobId,
      `✓ Scan terminé — ${leadsAdded} leads ajoutés, ${analyzed} sites analysés`,
      'success',
      { progress: 100, leads_added: leadsAdded }
    )
    await db.from('scraping_jobs').update({ status: 'completed' }).eq('id', jobId)

  } catch (err: any) {
    await log(db, jobId, `✗ Erreur fatale : ${err.message}`, 'error')
    await db.from('scraping_jobs').update({ status: 'error', error_message: err.message }).eq('id', jobId)
  }
}
