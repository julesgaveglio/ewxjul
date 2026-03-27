export interface ApifyPlace {
  title?: string
  name?: string
  address?: string
  phone?: string
  phoneUnformatted?: string
  website?: string
  url?: string
  totalScore?: number
  reviewsCount?: number
  reviewCount?: number
  categoryName?: string
  categories?: string[]
  city?: string
  neighborhood?: string
  postalCode?: string
}

const APIFY_TOKEN = process.env.APIFY_API_KEY!
const ACTOR_ID = 'compass~crawler-google-places'

export async function scrapeGoogleMaps(queries: string[]): Promise<ApifyPlace[]> {
  const runRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchStringsArray: queries,
      language: 'fr',
      maxCrawledPlacesPerSearch: 20,
      includeWebResults: false,
      skipClosedPlaces: true,
    }),
  })

  if (!runRes.ok) {
    const err = await runRes.text()
    throw new Error(`Apify run failed: ${runRes.status} ${err}`)
  }

  const run = await runRes.json()
  const runId = run.data.id
  const datasetId = run.data.defaultDatasetId

  await waitForRun(runId)

  const dataRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json&limit=1000`
  )
  if (!dataRes.ok) throw new Error(`Apify dataset fetch failed: ${dataRes.status}`)

  const items = await dataRes.json()
  return items as ApifyPlace[]
}

async function waitForRun(runId: string, maxWaitMs = 180_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    await sleep(4000)
    const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`)
    if (!res.ok) continue
    const data = await res.json()
    const status = data.data?.status
    if (status === 'SUCCEEDED') return
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      throw new Error(`Apify run ended with status: ${status}`)
    }
  }
  throw new Error('Apify run timed out after 3 minutes')
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function normalizeUrl(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const withScheme = raw.startsWith('http') ? raw : `https://${raw}`
    return new URL(withScheme).href
  } catch {
    return null
  }
}

function extractCity(address: string | undefined): string | null {
  if (!address) return null
  const parts = address.split(',')
  if (parts.length >= 2) {
    // Try to get the city part (second to last, trimmed)
    const candidate = parts[parts.length - 2].trim()
    // Remove postal code if present (e.g. "75001 Paris" → "Paris")
    return candidate.replace(/^\d{4,6}\s*/, '').trim() || null
  }
  return null
}

export function parseApifyPlace(place: ApifyPlace, sector: string) {
  const name = place.title ?? place.name ?? 'Inconnu'
  const phone = place.phone ?? place.phoneUnformatted ?? null
  const website = normalizeUrl(place.website)
  const mapsUrl = place.url ?? null
  const rating = typeof place.totalScore === 'number' ? place.totalScore : null
  const reviews = place.reviewsCount ?? place.reviewCount ?? 0
  const category = place.categoryName ?? (place.categories?.[0]) ?? sector
  const city = place.city ?? extractCity(place.address)

  return {
    company_name: name,
    sector: category,
    city,
    address: place.address ?? null,
    phone,
    website_url: website,
    google_maps_url: mapsUrl,
    google_rating: rating,
    google_reviews_count: reviews,
  }
}
