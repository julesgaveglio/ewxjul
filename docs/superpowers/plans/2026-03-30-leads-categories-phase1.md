# Leads — Catégories & Navigation 2 niveaux (Phase 1) — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter la dimension `category` (site_web / automation_ai) aux leads avec navigation 2 niveaux sur la page `/leads` et colonnes adaptatives par catégorie.

**Architecture:** Migration Supabase additive (ADD COLUMN IF NOT EXISTS) sans perte de données. Les leads existants reçoivent `category = 'site_web'` par défaut. La navigation passe de countryTab (all/fr/nz) à category × geoTab. LeadsTable reçoit un prop `category` et rend deux ensembles de colonnes distincts.

**Tech Stack:** Next.js 14 App Router, Supabase JS client, TypeScript, Tailwind CSS

---

## Chunk 1: DB + Types + Composants status

### Task 1: Migration Supabase

**Files:**
- Create: `supabase/migrations/009_add_category_fields.sql`

- [ ] **Step 1: Créer la migration**

Créer `supabase/migrations/009_add_category_fields.sql` :

```sql
-- Migration 009: Add category and new lead fields
-- Run in Supabase SQL Editor (two separate executions — see note below)

-- STEP A: Add new columns (run first)
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

CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);

-- STEP B: Extend lead_status ENUM (run separately — cannot run inside a transaction)
-- Execute this statement alone in the SQL Editor:
-- ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'proposal_sent';
```

- [ ] **Step 2: Appliquer la migration via Supabase SQL Editor**

1. Ouvrir le Supabase SQL Editor
2. Coller et exécuter le bloc STEP A complet (les ADD COLUMN)
3. Dans une nouvelle requête, exécuter **séparément** :
   ```sql
   ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'proposal_sent';
   ```
4. Vérifier : `SELECT column_name FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'category';` → doit retourner 1 ligne

- [ ] **Step 3: Commit du fichier migration**

```bash
cd "/Users/julesgaveglio/Ew X Jul" && git add supabase/migrations/009_add_category_fields.sql && git commit -m "feat: add category and AI automation fields to leads (migration 009)"
```

---

### Task 2: Mettre à jour les types TypeScript

**Files:**
- Modify: `lib/types/database.ts`

- [ ] **Step 1: Remplacer le contenu de `lib/types/database.ts`**

```typescript
export type LeadStatus = 'to_call' | 'contacted' | 'demo_sent' | 'proposal_sent' | 'sold' | 'refused'
export type LeadCategory = 'site_web' | 'automation_ai'
export type IndustryTier = 'tier_1' | 'tier_2'
export type DemoStatus = 'idle' | 'scraping' | 'generating' | 'deploying' | 'deployed' | 'error'
export type ScoringStatus = 'partial' | 'complete'
export type JobStatus = 'pending' | 'running' | 'completed' | 'error'
export type AssignedTo = 'jules' | 'ewan'
export type Country = 'fr' | 'nz'

export interface Lead {
  country: Country | null
  id: string
  created_at: string
  company_name: string
  sector: string | null
  city: string | null
  address: string | null
  phone: string | null
  website_url: string | null
  google_maps_url: string | null
  google_rating: number | null
  google_reviews_count: number
  score: number
  scoring_status: ScoringStatus
  status: LeadStatus
  assigned_to: AssignedTo | null
  sale_price: number | null
  notes: string | null
  demo_url: string | null
  demo_status: DemoStatus
  demo_error_message: string | null
  demo_generated_at: string | null
  last_contact_at: string | null
  brand_data: BrandData | null
  owner_name: string | null
  // Phase 1 additions
  category: LeadCategory
  industry: string | null
  industry_tier: IndustryTier | null
  employee_count: string | null
  revenue_range: string | null
  contact_email: string | null
  contact_title: string | null
  contact_linkedin: string | null
  pain_points: string[] | null
  budget_estimate: string | null
}

export interface BrandData {
  name: string
  tagline: string | null
  description: string
  services: string[]
  values: string[]
  tone: 'professionnel' | 'chaleureux' | 'premium' | 'artisanal'
  colors: {
    primary: string
    secondary: string
    accent: string
  }
  logo_url: string | null
  images: string[]
  contact: {
    phone: string
    email: string | null
    address: string
    hours: string | null
  }
  social: {
    instagram: string | null
    facebook: string | null
  }
  reviews: Array<{
    text: string
    rating: number
    author: string
  }>
}

export interface ScanLogEntry {
  time: string
  message: string
  type: 'info' | 'success' | 'error' | 'analyzing'
}

export type ContactCategory = 'reseau' | 'client' | 'partenaire' | 'fournisseur' | 'referent' | 'investisseur'

export interface Contact {
  id: string
  created_at: string
  name: string
  company: string | null
  phone: string | null
  email: string | null
  category: ContactCategory
  notes: string | null
  assigned_to: AssignedTo | null
}

export interface ScrapingJob {
  id: string
  created_at: string
  query_city: string
  query_sector: string
  status: JobStatus
  progress: number
  leads_found: number
  leads_added: number
  error_message: string | null
  current_action: string | null
  logs: ScanLogEntry[] | null
}
```

- [ ] **Step 2: Vérifier TypeScript (les erreurs attendues sont dans status-badge et kanban)**

```bash
cd "/Users/julesgaveglio/Ew X Jul" && npx tsc --noEmit 2>&1
```

Expected: erreurs sur `status-badge.tsx` (Record<LeadStatus> incomplet) et `kanban-column.tsx` (idem). Ces erreurs seront corrigées aux tasks 3 et 4.

- [ ] **Step 3: Commit**

```bash
cd "/Users/julesgaveglio/Ew X Jul" && git add lib/types/database.ts && git commit -m "feat: extend Lead type with category, industry, AI automation fields"
```

---

### Task 3: Mettre à jour `status-badge.tsx`

**Files:**
- Modify: `components/ui/status-badge.tsx`

- [ ] **Step 1: Ajouter `proposal_sent` dans STATUS_CONFIG**

Remplacer le contenu de `components/ui/status-badge.tsx` :

```typescript
import type { LeadStatus } from '@/lib/types/database'

const STATUS_CONFIG: Record<LeadStatus, { label: string; className: string }> = {
  to_call:       { label: 'À appeler',         className: 'bg-accent/10 text-accent' },
  contacted:     { label: 'Contacté',           className: 'bg-warning/10 text-warning' },
  demo_sent:     { label: 'Démo envoyée',       className: 'bg-purple-500/10 text-purple-400' },
  proposal_sent: { label: 'Proposition env.',   className: 'bg-cyan-500/10 text-cyan-400' },
  sold:          { label: 'Vendu',              className: 'bg-success/10 text-success' },
  refused:       { label: 'Refus',              className: 'bg-danger/10 text-danger' },
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
```

- [ ] **Step 2: Vérifier**

```bash
cd "/Users/julesgaveglio/Ew X Jul" && npx tsc --noEmit 2>&1 | grep status-badge
```

Expected: aucune erreur sur ce fichier

- [ ] **Step 3: Commit**

```bash
cd "/Users/julesgaveglio/Ew X Jul" && git add components/ui/status-badge.tsx && git commit -m "feat: add proposal_sent status to StatusBadge"
```

---

### Task 4: Mettre à jour Kanban (kanban-column + kanban-board)

**Files:**
- Modify: `components/leads/kanban-column.tsx`
- Modify: `components/leads/kanban-board.tsx`

- [ ] **Step 1: Mettre à jour `components/leads/kanban-column.tsx`**

Remplacer `COLUMN_CONFIG` :

```typescript
const COLUMN_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  to_call:       { label: 'À appeler',       color: 'bg-accent' },
  contacted:     { label: 'Contacté',        color: 'bg-warning' },
  demo_sent:     { label: 'Démo envoyée',    color: 'bg-purple-500' },
  proposal_sent: { label: 'Proposition',     color: 'bg-cyan-500' },
  sold:          { label: 'Vendu',           color: 'bg-success' },
  refused:       { label: 'Refus',           color: 'bg-danger' },
}
```

- [ ] **Step 2: Mettre à jour `components/leads/kanban-board.tsx`**

Remplacer `STATUSES` :

```typescript
const STATUSES: LeadStatus[] = ['to_call', 'contacted', 'demo_sent', 'proposal_sent', 'sold', 'refused']
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
cd "/Users/julesgaveglio/Ew X Jul" && npx tsc --noEmit 2>&1
```

Expected: 0 erreur

- [ ] **Step 4: Commit**

```bash
cd "/Users/julesgaveglio/Ew X Jul" && git add components/leads/kanban-column.tsx components/leads/kanban-board.tsx && git commit -m "feat: add proposal_sent column to Kanban"
```

---

## Chunk 2: Filtres + Table + Page

### Task 5: Mettre à jour `LeadsFilters`

**Files:**
- Modify: `components/leads/leads-filters.tsx`

- [ ] **Step 1: Remplacer le contenu de `components/leads/leads-filters.tsx`**

```tsx
'use client'

import type { LeadStatus, AssignedTo, LeadCategory, IndustryTier } from '@/lib/types/database'

interface FiltersState {
  search: string
  status: LeadStatus | ''
  assignedTo: AssignedTo | ''
  city: string
  minScore: number
  industry: string
  industryTier: IndustryTier | ''
}

interface LeadsFiltersProps {
  filters: FiltersState
  onChange: (filters: FiltersState) => void
  view: 'table' | 'kanban' | 'import'
  onViewChange: (view: 'table' | 'kanban' | 'import') => void
  category: LeadCategory
}

export function LeadsFilters({ filters, onChange, view, onViewChange, category }: LeadsFiltersProps) {
  return (
    <div className="card p-4 flex flex-wrap gap-3 items-center">
      {view !== 'import' && (
        <>
          <input
            type="text"
            placeholder="Rechercher..."
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
            className="px-3 py-1.5 bg-bg border border-border rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent w-48"
          />
          <select
            value={filters.status}
            onChange={e => onChange({ ...filters, status: e.target.value as LeadStatus | '' })}
            className="px-3 py-1.5 bg-bg border border-border rounded-md text-sm text-text-primary"
          >
            <option value="">Tous les statuts</option>
            <option value="to_call">À appeler</option>
            <option value="contacted">Contacté</option>
            <option value="demo_sent">Démo envoyée</option>
            <option value="proposal_sent">Proposition envoyée</option>
            <option value="sold">Vendu</option>
            <option value="refused">Refus</option>
          </select>
          <select
            value={filters.assignedTo}
            onChange={e => onChange({ ...filters, assignedTo: e.target.value as AssignedTo | '' })}
            className="px-3 py-1.5 bg-bg border border-border rounded-md text-sm text-text-primary"
          >
            <option value="">Tous</option>
            <option value="jules">Jules</option>
            <option value="ewan">Ewan</option>
          </select>
          <input
            type="text"
            placeholder="Ville..."
            value={filters.city}
            onChange={e => onChange({ ...filters, city: e.target.value })}
            className="px-3 py-1.5 bg-bg border border-border rounded-md text-sm text-text-primary w-32"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary">Score min</label>
            <input
              type="number"
              min={0}
              max={100}
              value={filters.minScore}
              onChange={e => onChange({ ...filters, minScore: Number(e.target.value) })}
              className="px-2 py-1.5 bg-bg border border-border rounded-md text-sm text-text-primary w-16 font-mono"
            />
          </div>

          {/* Filtres spécifiques Automatisation IA */}
          {category === 'automation_ai' && (
            <>
              <input
                type="text"
                placeholder="Secteur..."
                value={filters.industry}
                onChange={e => onChange({ ...filters, industry: e.target.value })}
                className="px-3 py-1.5 bg-bg border border-border rounded-md text-sm text-text-primary w-36"
              />
              <select
                value={filters.industryTier}
                onChange={e => onChange({ ...filters, industryTier: e.target.value as IndustryTier | '' })}
                className="px-3 py-1.5 bg-bg border border-border rounded-md text-sm text-text-primary"
              >
                <option value="">Tous les tiers</option>
                <option value="tier_1">Tier 1</option>
                <option value="tier_2">Tier 2</option>
              </select>
            </>
          )}
        </>
      )}

      <div className={`${view !== 'import' ? 'ml-auto' : ''} flex gap-1`}>
        <button
          onClick={() => onViewChange('table')}
          className={`px-3 py-1.5 rounded-md text-sm ${view === 'table' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg-hover'}`}
        >
          Table
        </button>
        <button
          onClick={() => onViewChange('kanban')}
          className={`px-3 py-1.5 rounded-md text-sm ${view === 'kanban' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg-hover'}`}
        >
          Kanban
        </button>
        <button
          onClick={() => onViewChange('import')}
          className={`px-3 py-1.5 rounded-md text-sm ${view === 'import' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg-hover'}`}
        >
          Import CSV
        </button>
      </div>
    </div>
  )
}

export type { FiltersState }
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd "/Users/julesgaveglio/Ew X Jul" && npx tsc --noEmit 2>&1 | grep leads-filters
```

Expected: des erreurs temporaires sur `page.tsx` (FiltersState et prop category manquants) — corrigé à la Task 7. Pas d'erreur sur `leads-filters.tsx` lui-même.

- [ ] **Step 3: Commit**

```bash
cd "/Users/julesgaveglio/Ew X Jul" && git add components/leads/leads-filters.tsx && git commit -m "feat: add proposal_sent + industry/tier filters to LeadsFilters"
```

---

### Task 6: Mettre à jour `LeadsTable` avec colonnes adaptatives

**Files:**
- Modify: `components/leads/leads-table.tsx`

- [ ] **Step 1: Remplacer le contenu de `components/leads/leads-table.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Lead, AssignedTo, LeadCategory, IndustryTier } from '@/lib/types/database'
import { ScoreBadge } from '@/components/ui/score-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Phone, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LeadsTableProps {
  leads: Lead[]
  category: LeadCategory
  onLeadUpdated?: (id: string, updates: Partial<Lead>) => void
}

const ASSIGNEES: { key: AssignedTo; label: string; initials: string; color: string; bg: string }[] = [
  { key: 'jules', label: 'Jules', initials: 'J', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  { key: 'ewan',  label: 'Ewan',  initials: 'E', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
]

const TIER_CONFIG: Record<IndustryTier, { label: string; className: string }> = {
  tier_1: { label: 'T1', className: 'bg-accent/10 text-accent' },
  tier_2: { label: 'T2', className: 'bg-warning/10 text-warning' },
}

export function LeadsTable({ leads, category, onLeadUpdated }: LeadsTableProps) {
  const [assignedStates, setAssignedStates] = useState<Record<string, AssignedTo | null>>({})
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const supabase = createClient()

  if (leads.length === 0) {
    return (
      <div className="card p-12 text-center text-text-secondary">
        Aucun lead trouvé. Lancez un scan ou importez un CSV pour commencer.
      </div>
    )
  }

  function getAssignee(lead: Lead): AssignedTo | null {
    return assignedStates[lead.id] !== undefined ? assignedStates[lead.id] : lead.assigned_to
  }

  async function handleAssign(lead: Lead, person: AssignedTo) {
    const current = getAssignee(lead)
    const next = current === person ? null : person
    setAssigningId(lead.id)
    setAssignedStates(s => ({ ...s, [lead.id]: next }))
    await supabase.from('leads').update({ assigned_to: next }).eq('id', lead.id)
    onLeadUpdated?.(lead.id, { assigned_to: next })
    setAssigningId(null)
  }

  const isAI = category === 'automation_ai'

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-text-secondary bg-bg-hover/50">
              <th className="px-3 py-3 font-medium w-14 text-center">Score</th>
              <th className="px-3 py-3 font-medium min-w-[160px]">Entreprise</th>

              {isAI ? (
                <>
                  <th className="px-3 py-3 font-medium hidden md:table-cell">Secteur</th>
                  <th className="px-3 py-3 font-medium hidden md:table-cell w-14">Tier</th>
                  <th className="px-3 py-3 font-medium hidden sm:table-cell w-24">Ville</th>
                  <th className="px-3 py-3 font-medium hidden lg:table-cell w-28">CA</th>
                  <th className="px-3 py-3 font-medium hidden xl:table-cell w-28">Budget</th>
                  <th className="px-3 py-3 font-medium hidden lg:table-cell w-36">Téléphone</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-3 font-medium hidden sm:table-cell w-24">Ville</th>
                  <th className="px-3 py-3 font-medium hidden md:table-cell w-28">Taille</th>
                  <th className="px-3 py-3 font-medium hidden lg:table-cell w-36">Téléphone</th>
                  <th className="px-3 py-3 font-medium hidden xl:table-cell">Notes</th>
                </>
              )}

              <th className="px-3 py-3 font-medium w-28">Statut</th>
              <th className="px-3 py-3 font-medium w-24 text-center">Assigné</th>
              <th className="px-3 py-3 font-medium w-8" />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const assignee = getAssignee(lead)
              const isAssigning = assigningId === lead.id

              return (
                <tr key={lead.id} className="border-b border-border/40 hover:bg-bg-hover/50 transition-colors group">

                  {/* Score */}
                  <td className="px-3 py-3 text-center">
                    <ScoreBadge score={lead.score} size={34} />
                  </td>

                  {/* Entreprise */}
                  <td className="px-3 py-3">
                    <div>
                      <Link href={`/leads/${lead.id}`} className="font-medium hover:text-accent transition-colors">
                        {lead.company_name}
                      </Link>
                      {lead.owner_name && (
                        <p className="text-xs text-text-secondary mt-0.5">👤 {lead.owner_name}</p>
                      )}
                      <p className="text-xs text-text-secondary mt-0.5 sm:hidden">
                        {[lead.city, isAI ? lead.industry : lead.sector].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </td>

                  {/* Colonnes Auto IA */}
                  {isAI ? (
                    <>
                      <td className="px-3 py-3 hidden md:table-cell text-text-secondary text-xs">
                        {lead.industry ?? '—'}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        {lead.industry_tier ? (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${TIER_CONFIG[lead.industry_tier].className}`}>
                            {TIER_CONFIG[lead.industry_tier].label}
                          </span>
                        ) : <span className="text-text-secondary text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell text-text-secondary text-xs">
                        {lead.city ?? '—'}
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell text-text-secondary text-xs">
                        {lead.revenue_range ?? '—'}
                      </td>
                      <td className="px-3 py-3 hidden xl:table-cell">
                        {lead.budget_estimate ? (
                          <span className="text-xs font-medium text-success">{lead.budget_estimate}</span>
                        ) : <span className="text-text-secondary text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        {lead.phone ? (
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-accent hover:underline text-xs">
                            <Phone size={12} />{lead.phone}
                          </a>
                        ) : <span className="text-text-secondary text-xs">—</span>}
                      </td>
                    </>
                  ) : (
                    /* Colonnes Site Web */
                    <>
                      <td className="px-3 py-3 hidden sm:table-cell text-text-secondary text-xs">
                        {lead.city ?? '—'}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell text-text-secondary text-xs">
                        {lead.employee_count ?? '—'}
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        {lead.phone ? (
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-accent hover:underline text-xs">
                            <Phone size={12} />{lead.phone}
                          </a>
                        ) : <span className="text-text-secondary text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3 hidden xl:table-cell max-w-[220px]">
                        {lead.notes ? (
                          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">{lead.notes}</p>
                        ) : <span className="text-text-secondary text-xs">—</span>}
                      </td>
                    </>
                  )}

                  {/* Statut */}
                  <td className="px-3 py-3">
                    <StatusBadge status={lead.status} />
                  </td>

                  {/* Assigné — picker inline */}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {ASSIGNEES.map(({ key, label, initials, color, bg }) => {
                        const isActive = assignee === key
                        return (
                          <button
                            key={key}
                            onClick={() => handleAssign(lead, key)}
                            disabled={isAssigning}
                            title={isActive ? `Désassigner ${label}` : `Assigner à ${label}`}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-150 disabled:opacity-50 focus:outline-none focus:ring-2 ring-offset-1"
                            style={{
                              backgroundColor: isActive ? bg : 'transparent',
                              color: isActive ? color : 'var(--color-text-secondary)',
                              border: `1.5px solid ${isActive ? color : 'var(--color-border)'}`,
                              boxShadow: isActive ? `0 0 0 1px ${color}33` : undefined,
                            }}
                          >
                            {initials}
                          </button>
                        )
                      })}
                    </div>
                  </td>

                  {/* Arrow → page detail */}
                  <td className="px-2 py-3">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight size={15} />
                    </Link>
                  </td>

                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd "/Users/julesgaveglio/Ew X Jul" && npx tsc --noEmit 2>&1 | grep leads-table
```

Expected: des erreurs temporaires sur `page.tsx` (prop category manquant) — corrigé à la Task 7. Pas d'erreur sur `leads-table.tsx` lui-même.

- [ ] **Step 3: Commit**

```bash
cd "/Users/julesgaveglio/Ew X Jul" && git add components/leads/leads-table.tsx && git commit -m "feat: adaptive columns in LeadsTable (Site Web / Auto IA)"
```

---

### Task 7: Mettre à jour la page `/leads`

**Files:**
- Modify: `app/(dashboard)/leads/page.tsx`

- [ ] **Step 1: Remplacer le contenu de `app/(dashboard)/leads/page.tsx`**

```tsx
'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LeadsFilters, type FiltersState } from '@/components/leads/leads-filters'
import { LeadsTable } from '@/components/leads/leads-table'
import { KanbanBoard } from '@/components/leads/kanban-board'
import { LeadsImport } from '@/components/leads/leads-import'
import type { Lead, Country, LeadCategory } from '@/lib/types/database'

const CATEGORY_TABS: { key: LeadCategory; icon: string; label: string }[] = [
  { key: 'site_web',      icon: '🌐', label: 'Site Web' },
  { key: 'automation_ai', icon: '🤖', label: 'Automatisation IA' },
]

const GEO_TABS: { key: Country; flag: string; label: string }[] = [
  { key: 'fr', flag: '🇫🇷', label: 'France' },
  { key: 'nz', flag: '🇳🇿', label: 'Nouvelle-Zélande' },
]

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [category, setCategory] = useState<LeadCategory>('site_web')
  const [geoTab, setGeoTab] = useState<Country>('fr')
  const [view, setView] = useState<'table' | 'kanban' | 'import'>('table')
  const [filters, setFilters] = useState<FiltersState>({
    search: '',
    status: '',
    assignedTo: '',
    city: '',
    minScore: 0,
    industry: '',
    industryTier: '',
  })

  useEffect(() => {
    const supabase = createClient()

    async function fetchLeads() {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .order('score', { ascending: false })
      if (data) setLeads(data)
    }
    fetchLeads()

    const channel = supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Compteurs pour les badges des tabs
  const countByView = useMemo(() => ({
    site_web_fr:      leads.filter(l => (l.category ?? 'site_web') === 'site_web'      && (l.country ?? 'fr') === 'fr').length,
    site_web_nz:      leads.filter(l => (l.category ?? 'site_web') === 'site_web'      && l.country === 'nz').length,
    automation_ai_fr: leads.filter(l => l.category === 'automation_ai' && (l.country ?? 'fr') === 'fr').length,
    automation_ai_nz: leads.filter(l => l.category === 'automation_ai' && l.country === 'nz').length,
  }), [leads])

  const filteredLeads = useMemo(() => {
    const result = leads.filter(lead => {
      // Category + geo filter
      if ((lead.category ?? 'site_web') !== category) return false
      if ((lead.country ?? 'fr') !== geoTab) return false

      if (filters.search) {
        const search = filters.search.toLowerCase()
        const match =
          lead.company_name.toLowerCase().includes(search) ||
          lead.city?.toLowerCase().includes(search) ||
          lead.sector?.toLowerCase().includes(search) ||
          lead.industry?.toLowerCase().includes(search)
        if (!match) return false
      }
      if (filters.status && lead.status !== filters.status) return false
      if (filters.assignedTo && lead.assigned_to !== filters.assignedTo) return false
      if (filters.city && !lead.city?.toLowerCase().includes(filters.city.toLowerCase())) return false
      if (lead.score < filters.minScore) return false
      if (filters.industry && !lead.industry?.toLowerCase().includes(filters.industry.toLowerCase())) return false
      if (filters.industryTier && lead.industry_tier !== filters.industryTier) return false
      return true
    })
    // Refused leads always sink to the bottom
    result.sort((a, b) => (a.status === 'refused' ? 1 : 0) - (b.status === 'refused' ? 1 : 0))
    return result
  }, [leads, category, geoTab, filters])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Leads</h1>

        {/* Niveau 1 : Catégorie */}
        <div className="card p-1 flex gap-1">
          {CATEGORY_TABS.map(({ key, icon, label }) => {
            const count = countByView[`${key}_fr`] + countByView[`${key}_nz`]
            const isActive = category === key
            return (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <span>{icon}</span>
                <span className="hidden sm:inline">{label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                  isActive ? 'bg-white/20' : 'bg-bg-hover'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Niveau 2 : Zone géo */}
      <div className="flex gap-2">
        {GEO_TABS.map(({ key, flag, label }) => {
          const count = countByView[`${category}_${key}` as keyof typeof countByView]
          const isActive = geoTab === key
          return (
            <button
              key={key}
              onClick={() => setGeoTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                isActive
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              <span>{flag}</span>
              <span className="hidden sm:inline">{label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                isActive ? 'bg-accent/20' : 'bg-bg-hover'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <LeadsFilters
        filters={filters}
        onChange={setFilters}
        view={view}
        onViewChange={setView}
        category={category}
      />

      {view === 'table' ? (
        <LeadsTable
          leads={filteredLeads}
          category={category}
          onLeadUpdated={(id, updates) => {
            setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
          }}
        />
      ) : view === 'kanban' ? (
        <KanbanBoard leads={filteredLeads} onLeadUpdate={() => {
          createClient().from('leads').select('*').order('score', { ascending: false }).then(({ data }) => {
            if (data) setLeads(data)
          })
        }} />
      ) : (
        <LeadsImport
          allLeads={leads}
          onLeadsImported={() => {
            createClient().from('leads').select('*').order('score', { ascending: false }).then(({ data }) => {
              if (data) setLeads(data)
            })
          }}
          onSwitchToTable={() => setView('table')}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Vérifier TypeScript complet**

```bash
cd "/Users/julesgaveglio/Ew X Jul" && npx tsc --noEmit 2>&1
```

Expected: 0 erreur

- [ ] **Step 3: Build de production**

```bash
cd "/Users/julesgaveglio/Ew X Jul" && npm run build 2>&1 | tail -20
```

Expected: build réussi sans erreur

- [ ] **Step 4: Commit**

```bash
cd "/Users/julesgaveglio/Ew X Jul" && git add "app/(dashboard)/leads/page.tsx" && git commit -m "feat: 2-level navigation (category × geo) on leads page"
```

---

### Task 8: Push et vérification finale

- [ ] **Step 1: Push sur GitHub**

```bash
cd "/Users/julesgaveglio/Ew X Jul" && git push
```

- [ ] **Step 2: Vérification manuelle**

1. Ouvrir `/leads`
2. Vérifier les tabs Niveau 1 : 🌐 Site Web | 🤖 Automatisation IA avec badges corrects
3. Vérifier les tabs Niveau 2 : 🇫🇷 France | 🇳🇿 Nouvelle-Zélande
4. Site Web → colonnes : Score, Entreprise, Ville, Taille, Téléphone, Notes, Statut, Assigné
5. Automatisation IA → colonnes : Score, Entreprise, Secteur, Tier, Ville, CA, Budget, Téléphone, Statut, Assigné
6. Auto IA → filtres affichent "Secteur..." et "Tous les tiers"
7. Status select → contient "Proposition envoyée"
8. Kanban → 6 colonnes (dont "Proposition")
