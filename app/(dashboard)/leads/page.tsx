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
            const count = countByView[`${key}_fr` as keyof typeof countByView] + countByView[`${key}_nz` as keyof typeof countByView]
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
