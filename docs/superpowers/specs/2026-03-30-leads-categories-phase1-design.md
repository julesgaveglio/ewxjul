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

SQL exact de la migration :

```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'site_web'
  CHECK (category IN ('site_web', 'automation_ai'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS industry_tier TEXT
  CHECK (industry_tier IS NULL OR industry_tier IN ('tier_1', 'tier_2'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS employee_count TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS revenue_range TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_title TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_linkedin TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pain_points JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget_estimate TEXT;
```

### Modification du statut existant

`status` est un type ENUM Postgres (`lead_status` défini en migration 001). Pour ajouter `proposal_sent` il faut :

```sql
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'proposal_sent';
```

Note : `ALTER TYPE ... ADD VALUE` ne peut pas être exécuté dans un bloc transactionnel. La migration doit l'exécuter hors transaction (Supabase SQL Editor l'accepte directement).

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
// LeadStatus étendu (était: 'to_call'|'contacted'|'demo_sent'|'sold'|'refused')
export type LeadStatus = 'to_call' | 'contacted' | 'demo_sent' | 'proposal_sent' | 'sold' | 'refused'
export type IndustryTier = 'tier_1' | 'tier_2'
// Note: ContactCategory existe déjà dans database.ts pour l'interface Contact — pas de collision

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

### Compteurs de badges (`countByView`)

Remplace `countByCountry` par un memo calculant les 4 combinaisons :

```typescript
const countByView = useMemo(() => ({
  site_web_fr: leads.filter(l => l.category === 'site_web' && (l.country ?? 'fr') === 'fr').length,
  site_web_nz: leads.filter(l => l.category === 'site_web' && l.country === 'nz').length,
  automation_ai_fr: leads.filter(l => l.category === 'automation_ai' && (l.country ?? 'fr') === 'fr').length,
  automation_ai_nz: leads.filter(l => l.category === 'automation_ai' && l.country === 'nz').length,
}), [leads])
```

Badge niveau 1 (catégorie) = somme des deux zones : ex. `countByView.site_web_fr + countByView.site_web_nz`.
Badge niveau 2 (géo) = valeur directe : ex. `countByView.site_web_fr`.

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
| `lib/types/database.ts` | Modifier — nouveaux types + champs Lead + LeadStatus étendu |
| `app/(dashboard)/leads/page.tsx` | Modifier — navigation 2 niveaux (category + geoTab), countByView |
| `components/leads/leads-table.tsx` | Modifier — prop `category`, colonnes adaptatives |
| `components/leads/leads-filters.tsx` | Modifier — filtres industry/tier pour Auto IA + option 'Proposition envoyée' dans status select |
| `components/ui/status-badge.tsx` | Modifier — ajouter `proposal_sent` dans STATUS_CONFIG |
| `components/leads/kanban-board.tsx` | Modifier — ajouter `proposal_sent` dans STATUSES[] |
| `components/leads/kanban-column.tsx` | Modifier — ajouter `proposal_sent` dans la config de colonnes |

---

## Ce qui ne change pas

- Page détail `/leads/[id]` : inchangée (demo, brand_data, scoring restent pour Site Web)
- Pipeline scan (`smart-scan.ts`, `smart-scan-nz.ts`) : inchangé (Phase 2)
- Scoring (`lib/scoring.ts`) : inchangé (Phase 2)
- Import CSV (`components/leads/leads-import.tsx`) : inchangé. Les leads importés reçoivent `category: 'site_web'` par défaut. Le mapping `category` n'est **pas** exposé dans l'interface d'import (la colonne n'est pas ajoutée à `IMPORTABLE_FIELDS` — trop risqué pour les utilisateurs). Si besoin, la catégorie peut être changée manuellement sur chaque lead après import.
- KanbanBoard (`kanban-board.tsx`, `kanban-column.tsx`) : modifiés uniquement pour ajouter `proposal_sent` dans les configs de statuts (voir section "Fichiers à modifier")

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
