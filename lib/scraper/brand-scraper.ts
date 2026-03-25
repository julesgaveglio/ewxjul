import type { BrandData } from '@/lib/types/database'

const SECTOR_PALETTES: Record<string, { primary: string; secondary: string; accent: string }> = {
  restaurant: { primary: '#1a1a2e', secondary: '#e94560', accent: '#0f3460' },
  boulangerie: { primary: '#4a3728', secondary: '#d4a574', accent: '#8b6914' },
  coiffeur: { primary: '#2d2d2d', secondary: '#c9a96e', accent: '#8b5e3c' },
  hotel: { primary: '#1b2838', secondary: '#c9b037', accent: '#2c5f7c' },
  default: { primary: '#1a1a2e', secondary: '#3b82f6', accent: '#8b5cf6' },
}

export async function scrapeBrand(
  companyName: string,
  websiteUrl: string | null,
  googleMapsUrl: string | null,
  phone: string | null,
  address: string | null,
  sector: string | null,
): Promise<BrandData> {
  const brand: BrandData = {
    name: companyName,
    tagline: null,
    description: '',
    services: [],
    values: [],
    tone: 'professionnel',
    colors: SECTOR_PALETTES[sector?.toLowerCase() ?? ''] ?? SECTOR_PALETTES.default,
    logo_url: null,
    images: [],
    contact: {
      phone: phone ?? '',
      email: null,
      address: address ?? '',
      hours: null,
    },
    social: { instagram: null, facebook: null },
    reviews: [],
  }

  // Scrape website if available
  if (websiteUrl) {
    try {
      const siteData = await scrapeWebsite(websiteUrl)
      if (siteData.description) brand.description = siteData.description
      if (siteData.colors) brand.colors = siteData.colors
      if (siteData.logo) brand.logo_url = siteData.logo
      if (siteData.images.length > 0) brand.images = siteData.images
      if (siteData.email) brand.contact.email = siteData.email
    } catch (e) {
      console.error('Website scrape failed:', e)
    }
  }

  // Scrape Google Maps via Serper
  try {
    const mapsData = await scrapeGoogleInfo(companyName, sector)
    if (mapsData.description && !brand.description) brand.description = mapsData.description
    if (mapsData.reviews.length > 0) brand.reviews = mapsData.reviews
  } catch (e) {
    console.error('Google scrape failed:', e)
  }

  // Generate description fallback
  if (!brand.description) {
    brand.description = `${companyName} est un(e) ${sector ?? 'entreprise'} situé(e) à ${address ?? 'votre ville'}.`
  }

  // Detect tone from sector
  if (sector) {
    const s = sector.toLowerCase()
    if (['restaurant', 'bar', 'café', 'boulangerie', 'traiteur'].some(t => s.includes(t))) {
      brand.tone = 'chaleureux'
    } else if (['hôtel', 'hotel', 'spa'].some(t => s.includes(t))) {
      brand.tone = 'premium'
    } else if (['artisan', 'menuisier', 'maçon', 'plombier', 'peintre'].some(t => s.includes(t))) {
      brand.tone = 'artisanal'
    }
  }

  return brand
}

async function scrapeWebsite(url: string) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })

    const data = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="description"]')
      const description = meta?.getAttribute('content') ?? ''

      // Extract colors from CSS
      const body = getComputedStyle(document.body)
      const bg = body.backgroundColor

      // Find logo
      const logoSelectors = ['img[alt*="logo" i]', 'header img', '.logo img', 'a[class*="logo"] img']
      let logo: string | null = null
      for (const sel of logoSelectors) {
        const el = document.querySelector(sel) as HTMLImageElement
        if (el?.src) { logo = el.src; break }
      }

      // Find images
      const images = Array.from(document.querySelectorAll('img'))
        .map(img => img.src)
        .filter(src => src.startsWith('http') && !src.includes('icon') && !src.includes('logo'))
        .slice(0, 6)

      // Find email
      const emailMatch = document.body.innerHTML.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
      const email = emailMatch?.[0] ?? null

      return { description, logo, images, email }
    })

    return { ...data, colors: null as any }
  } finally {
    await browser.close()
  }
}

async function scrapeGoogleInfo(companyName: string, sector: string | null) {
  const query = `${companyName} ${sector ?? ''} avis`
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, gl: 'fr', hl: 'fr' }),
  })

  if (!response.ok) return { description: '', reviews: [] }

  const data = await response.json()
  const description = data.knowledgeGraph?.description ?? ''
  const reviews = (data.knowledgeGraph?.reviews ?? [])
    .slice(0, 5)
    .map((r: any) => ({
      text: r.snippet ?? r.text ?? '',
      rating: r.rating ?? 5,
      author: r.author ?? 'Client',
    }))

  return { description, reviews }
}
