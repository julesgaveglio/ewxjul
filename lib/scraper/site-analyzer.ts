export interface SiteAuditResult {
  isResponsive: boolean
  lighthouseScore: number
  hasHttps: boolean
  hasMetaTags: boolean
  indexedPages: number
}

export async function analyzeSite(websiteUrl: string, domain: string): Promise<SiteAuditResult> {
  const [browserAudit, indexedPages] = await Promise.all([
    auditWithPlaywright(websiteUrl),
    checkIndexedPages(domain),
  ])
  return { ...browserAudit, indexedPages }
}

async function auditWithPlaywright(url: string): Promise<Omit<SiteAuditResult, 'indexedPages'>> {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; SiteAuditor/1.0)',
    })
    const page = await context.newPage()

    const hasHttps = url.startsWith('https://')

    // Load with timeout — skip if site is too slow
    const startTime = Date.now()
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    } catch {
      // Site unreachable or too slow → still return what we know
      return { isResponsive: false, lighthouseScore: 0, hasHttps, hasMetaTags: false }
    }
    const loadTime = Date.now() - startTime

    // Performance score based on load time
    let lighthouseScore: number
    if (loadTime < 1500) lighthouseScore = 90
    else if (loadTime < 3000) lighthouseScore = 70
    else if (loadTime < 5000) lighthouseScore = 50
    else if (loadTime < 8000) lighthouseScore = 30
    else lighthouseScore = 10

    // Mobile responsiveness
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(500)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth).catch(() => 800)
    const isResponsive = scrollWidth <= 420

    // Meta tags
    const hasMetaTags = await page.evaluate(() => {
      const title = document.querySelector('title')?.textContent?.trim()
      const desc = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()
      return !!(title && title.length > 3 && desc && desc.length > 10)
    }).catch(() => false)

    return { isResponsive, lighthouseScore, hasHttps, hasMetaTags }
  } finally {
    await browser.close()
  }
}

async function checkIndexedPages(domain: string): Promise<number> {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: `site:${domain}`, gl: 'fr', num: 10 }),
    })
    if (!response.ok) return 0
    const data = await response.json()
    return data.searchInformation?.totalResults
      ? parseInt(data.searchInformation.totalResults.replace(/\D/g, ''), 10)
      : (data.organic?.length ?? 0)
  } catch {
    return 0
  }
}
