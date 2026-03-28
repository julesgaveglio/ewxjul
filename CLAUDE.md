# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest unit tests (run once)
npm run test:watch   # Vitest in watch mode
npx tsc --noEmit     # TypeScript check without compiling
npx playwright install chromium  # Required for audit features locally
```

Run a single test file: `npx vitest run lib/__tests__/scoring.test.ts`

## Architecture

**Stack:** Next.js 14 App Router · Supabase (Postgres + Auth) · Tailwind CSS · Playwright (server-side) · Vitest

**Path alias:** `@/*` maps to the project root.

### Data flow

The app is a two-user (Jules + Ewan) B2B prospecting tool. The core loop is:

1. **Scan** → collect raw companies from Google Maps (Serper) + Pages Jaunes → deduplicate → enrich with Pappers (SIRET/NAF) → audit each website → score 0–100 → insert into `leads` table
2. **Leads** → browse, filter, assign, change status. Refused leads sort to bottom automatically.
3. **Lead detail** → enrich brand data (scrape website) → generate Claude-powered demo site → deploy to Vercel
4. **Contacts** → manual personal address book, separate from scanned leads

### Key directories

- `lib/pipeline/` — Main scan orchestration. `smart-scan.ts` (France) and `smart-scan-nz.ts` (NZ) share `concurrentMap`, `auditWebsite`, and `LogFn` exports. Audits run 4 concurrent with a shared Playwright browser.
- `lib/auditors/` — Individual website auditors (SSL, DNS, PageSpeed via Google API, CMS via Wappalyzer). All called in parallel inside `auditWebsite()`.
- `lib/intelligence/` — `sector-matrix.ts` holds the NAF code → priority/ticket mapping used for scoring. `competition.ts` adjusts scores by city size.
- `lib/scoring.ts` — Standalone scoring function used by the analyze API. The pipeline has its own `computeScore()` in `smart-scan.ts`.
- `lib/generator/` — `claude-generate.ts` calls Anthropic API to produce HTML, `vercel-deploy.ts` deploys it.
- `lib/scrapers/` vs `lib/scraper/` — Two separate directories: `scrapers/` contains the pipeline's data sources (serpapi, pagesjaunes, pappers, deduplicator); `scraper/` contains legacy/alternate scrapers (google-places, brand-scraper, apify).

### Database

Supabase migrations live in `supabase/migrations/` (numbered `001_` → `008_`). Apply in order. Key tables: `leads`, `contacts`, `scraping_jobs`, `domain_audit_cache`.

`leads.country` is `'fr'` or `'nz'` (default `'fr'`). NZ leads are identified by city name when the column was missing at scan time — migration `007` fixes historical misclassification.

`leads.assigned_to` and `contacts.assigned_to` are constrained to `'jules' | 'ewan'`.

Use `createServiceClient()` in API routes (bypasses RLS), `createClient()` in client components and server components that need user context.

### Scan pipeline concurrency

`concurrentMap<T,R>(items, fn, concurrency)` is exported from `smart-scan.ts` and used by both pipelines. Phase timings:
- Collection: all Serper calls in parallel, Pages Jaunes limited to 3 concurrent Playwright browsers
- Pappers enrichment: 5 concurrent
- Site audits: 4 concurrent, single shared Chromium browser instance
- DB inserts: `Promise.allSettled` (all parallel)

### UI conventions

Dark theme only. Custom Tailwind tokens: `bg`, `bg-surface`, `bg-hover`, `border`, `text-primary`, `text-secondary`, `accent`, `accent-hover`, `success`, `danger`, `warning`. Use `.card` utility class for surface cards.

Assignee picker pattern: two circular avatar buttons `J` (indigo) and `E` (amber), click toggles assignment, available in leads table and contacts form.

Country tabs `🌍 / 🇫🇷 / 🇳🇿` on the leads page filter by `lead.country`, with `?? 'fr'` fallback for legacy rows.

### Playwright in production

`auditWebsite()` launches Chromium. This does **not** work on Vercel serverless — it requires a long-running server. The scan API routes are designed to run on a persistent server or self-hosted environment.

## Environment variables

See `.env.local.example`. All scan features require `SERPER_API_KEY`. Lead generation requires `ANTHROPIC_API_KEY` + `VERCEL_TOKEN`. Vision scoring requires `GEMINI_API_KEY`. Email enrichment requires a Hunter.io key (`HUNTER_API_KEY`). Pappers enrichment is optional — skipped when `PAPPERS_API_KEY` is absent.
