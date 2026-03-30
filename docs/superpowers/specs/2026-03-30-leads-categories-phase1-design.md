# Design : Leads — Catégories & Navigation 2 niveaux (Phase 1)

**Date :** 2026-03-30
**Scope :** Migration DB additive + UI navigation 2 niveaux (Site Web / Auto IA × France / NZ) + colonnes adaptatives par catégorie.
**Phase 2 (hors scope) :** Scraping par catégorie, scoring différencié.

---

## Contexte

L'app Ew X Jul gère des leads de prospection B2B. Jusqu'ici les leads sont mono-catégorie (tous "Site Web" implicitement) filtrés par pays (France / NZ). On ajoute une deuxième dimension : **catégorie de service** (`site_web` ou `automation_ai`).

La migration est **additive** : aucune donnée existante n'est perdue. Les leads existants reçoivent `category = 'site_web'` par défaut.

---

## Migration Supabase (additive)

### Nouvelles colonnes sur `leads`

| Colonne | Type SQL | Contrainte | Default |
|---|---|---|---|
| `category` | TEXT | CHECK ('site_web', 'automation_ai') NOT NULL | `'site_web'` |
| `industry` | TEXT | — | NULL |
| `industry_tier` | TEXT | CHECK ('tier_1', 'tier_2') | NULL |
| `employee_count` | TEXT | — | NULL (ex: '1-10', '10-50', '51-200') |
| `revenue_range` | TEXT | — | NULL (ex: '500k-2M', '2M-10M') |
| `contact_email` | TEXT | — | NULL |
| `contact_title` | TEXT | — | NULL |
| `contact_linkedin` | TEXT | — | NULL |
| `pain_points` | JSONB | — | NULL (array de strings) |
| `budget_estimate` | TEXT | — | NULL (ex: '3000-8000') |

### Modification du statut existant

Le CHECK constraint sur `status` est étendu pour inclure `'proposal_sent'` :

```sql
-- Ancien : 'to_call' | 'contacted' | 'demo_sent' | 'sold' | 'refused'
-- Nouveau : ajouter 'proposal_sent'
```

Les workflows par catégorie :
- **Site Web** : `to_call → contacted → demo_sent → sold / refused`
- **Auto IA** : `to_call → contacted → proposal_sent → sold / refused`

### Index

```sql
CREATE INDEX idx_leads_category ON leads(category);
CREATE INDEX idx_leads_industry ON leads(industry);
```

### Note sur `geo_zone`

La colonne `country` existante ('fr' | 'nz') joue le rôle de zone géographique. Pas de colonne `geo_zone` supplémentaire.

---

## Types TypeScript

### Nouveaux types dans `lib/types/database.ts`

```typescript
export type LeadCategory = 'site_web' | 'automation_ai'
export type LeadStatus = 'to_call' | 'contacted' | 'demo_sent' | 'proposal_sent' | 'sold' | 'refused'
export type IndustryTier = 'tier_1' | 'tier_2'

// Champs ajoutés à l'interface Lead :
category: LeadCategory           // default 'site_web'
industry: string | null
industry_tier: IndustryTier | null
employee_count: string | null
revenue_range: string | null
contact_email: string | null
contact_title: string | null
contact_linkedin: string | null
pain_points: string[] | null     // JSONB stocké comme array de strings
budget_estimate: string | null
```

---

## UI — Navigation 2 niveaux

### Remplacement des tabs Tous/France/NZ

**Niveau 1 — Catégorie** (nouvelle barre principale) :
```
[ 🌐 Site Web (N) ]  [ 🤖 Automatisation IA (N) ]
```

**Niveau 2 — Zone géo** (sous-barre, s'adapte à la catégorie active) :
```
[ 🇫🇷 France (N) ]  [ 🇳🇿 Nouvelle-Zélande (N) ]
```

Chaque badge affiche le nombre de leads pour la combinaison `category × country`.

Le state de navigation passe de `countryTab: 'all' | 'fr' | 'nz'` à :
- `category: LeadCategory` (défaut `'site_web'`)
- `geoTab: Country` (défaut `'fr'`)

Le filtre `filteredLeads` applique : `lead.category === category && (lead.country ?? 'fr') === geoTab`.

---

## UI — Colonnes adaptatives

### Site Web

| Colonne | Champ | Notes |
|---|---|---|
| Score | `score` | Badge coloré |
| Entreprise | `company_name` | Lien vers détail |
| Ville | `city` | — |
| Taille | `employee_count` | — |
| Téléphone | `phone` | — |
| Notes | `notes` | Truncated |
| Assigné | `assigned_to` | Avatar J/E |
| Statut | `status` | Dropdown inline |

### Automatisation IA

| Colonne | Champ | Notes |
|---|---|---|
| Score | `score` | Badge coloré |
| Entreprise | `company_name` | Lien vers détail |
| Secteur | `industry` | Pill colorée |
| Tier | `industry_tier` | Badge T1/T2 |
| Ville | `city` | — |
| CA | `revenue_range` | — |
| Budget pot. | `budget_estimate` | Highlight |
| Téléphone | `phone` | — |
| Assigné | `assigned_to` | Avatar J/E |
| Statut | `status` | Dropdown inline |

Le composant `LeadsTable` reçoit un prop `category: LeadCategory` et rend les colonnes correspondantes. Les colonnes `demo_status` / `scoring_status` restent absentes du tableau principal (présentes uniquement sur la page détail pour Site Web).

---

## UI — Filtres adaptatifs

`LeadsFilters` conserve les filtres communs (search, assignedTo, city, minScore, status) et affiche en plus :

- **Site Web uniquement** : rien de spécifique (secteur/taille pas encore scrapés pour cette catégorie)
- **Auto IA uniquement** : filtre `industry` (select des valeurs présentes), filtre `industry_tier` (Tier 1 / Tier 2)

---

## Fichiers à créer / modifier

| Fichier | Action |
|---|---|
| `supabase/migrations/009_add_category_fields.sql` | Créer — migration additive |
| `lib/types/database.ts` | Modifier — nouveaux types + champs Lead |
| `app/(dashboard)/leads/page.tsx` | Modifier — navigation 2 niveaux (category + geoTab) |
| `components/leads/leads-table.tsx` | Modifier — prop `category`, colonnes adaptatives |
| `components/leads/leads-filters.tsx` | Modifier — filtres industry/tier pour Auto IA |

---

## Ce qui ne change pas

- Page détail `/leads/[id]` : inchangée (demo, brand_data, scoring restent pour Site Web)
- Pipeline scan (`smart-scan.ts`, `smart-scan-nz.ts`) : inchangé (Phase 2)
- Scoring (`lib/scoring.ts`) : inchangé (Phase 2)
- Import CSV (`components/leads/leads-import.tsx`) : inchangé (les leads importés reçoivent `category: 'site_web'` par défaut, l'utilisateur peut mapper `category` si présente dans le CSV)
- KanbanBoard : inchangé

---

## Flux de navigation

```
/leads
  → category: 'site_web' (défaut)
    → geoTab: 'fr' (défaut)
      → filteredLeads: category=site_web AND country=fr
      → LeadsTable columns: [score, company_name, city, employee_count, phone, notes, assigned_to, status]
    → geoTab: 'nz'
      → filteredLeads: category=site_web AND country=nz
  → category: 'automation_ai'
    → geoTab: 'fr'
      → filteredLeads: category=automation_ai AND country=fr
      → LeadsTable columns: [score, company_name, industry, industry_tier, city, revenue_range, budget_estimate, phone, assigned_to, status]
    → geoTab: 'nz'
      → filteredLeads: category=automation_ai AND country=nz
```
