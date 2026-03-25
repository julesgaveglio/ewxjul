# Ew X Jul — Plateforme de Prospection

Plateforme interne de prospection et génération de sites web démo.

## Setup

1. Cloner le repo
2. `npm install`
3. Copier `.env.local.example` en `.env.local` et remplir les clés
4. Exécuter la migration SQL dans Supabase Dashboard (fichier `supabase/migrations/001_initial_schema.sql`)
5. Créer 2 utilisateurs dans Supabase Auth Dashboard (Jules + Ewan)
6. `npm run dev`

## Variables d'environnement requises

| Variable | Description |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | URL du projet Supabase |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Clé anon Supabase |
| SUPABASE_SERVICE_ROLE_KEY | Clé service role Supabase |
| ANTHROPIC_API_KEY | Clé API Anthropic (Claude) |
| VERCEL_TOKEN | Token API Vercel |
| GOOGLE_PLACES_API_KEY | Clé API Google Places |
| SERPER_API_KEY | Clé API Serper.dev |

## Architecture

- `/app/(dashboard)` — Pages du dashboard (stats, leads, scan, stats)
- `/app/api` — API Routes (scan, analyze, generate)
- `/lib/scraper` — Google Places, site analyzer, brand scraper
- `/lib/generator` — Claude site generator, Vercel deployer
- `/lib/scoring.ts` — Logique de scoring /100
- `/components` — Composants React (UI, leads, scan, dashboard)

## Commandes

- `npm run dev` — Serveur de développement
- `npm run build` — Build production
- `npm test` — Tests unitaires (vitest)

## Notes

- Playwright nécessite un navigateur. En local : `npx playwright install chromium`
- L'audit de site (Playwright) ne fonctionne pas sur Vercel serverless. Utiliser un serveur long-running en prod.
