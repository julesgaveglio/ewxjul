'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LeadsFilters, type FiltersState } from '@/components/leads/leads-filters'
import { LeadsTable } from '@/components/leads/leads-table'
import { KanbanBoard } from '@/components/leads/kanban-board'
import { LeadsImport } from '@/components/leads/leads-import'
import type { Lead, Country } from '@/lib/types/database'

type CountryTab = Country | 'all'

const COUNTRY_TABS: { key: CountryTab; flag: string; label: string }[] = [
  { key: 'all', flag: '🌍', label: 'Tous' },
  { key: 'fr',  flag: '🇫🇷', label: 'France' },
  { key: 'nz',  flag: '🇳🇿', label: 'Nouvelle-Zélande' },
]

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [countryTab, setCountryTab] = useState<CountryTab>('all')
  const [view, setView] = useState<'table' | 'kanban' | 'import'>('table')
  const [filters, setFilters] = useState<FiltersState>({
    search: '',
    status: '',
    assignedTo: '',
    city: '',
    minScore: 0,
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

  // Count per country for tab badges
  const countByCountry = useMemo(() => {
    const fr = leads.filter(l => (l.country ?? 'fr') === 'fr').length
    const nz = leads.filter(l => l.country === 'nz').length
    return { all: leads.length, fr, nz }
  }, [leads])

  const filteredLeads = useMemo(() => {
    const result = leads.filter(lead => {
      // Country tab filter
      if (countryTab !== 'all') {
        const leadCountry = lead.country ?? 'fr' // legacy leads without country → France
        if (leadCountry !== countryTab) return false
      }
      if (filters.search) {
        const search = filters.search.toLowerCase()
        const match = lead.company_name.toLowerCase().includes(search) ||
          lead.city?.toLowerCase().includes(search) ||
          lead.sector?.toLowerCase().includes(search)
        if (!match) return false
      }
      if (filters.status && lead.status !== filters.status) return false
      if (filters.assignedTo && lead.assigned_to !== filters.assignedTo) return false
      if (filters.city && !lead.city?.toLowerCase().includes(filters.city.toLowerCase())) return false
      if (lead.score < filters.minScore) return false
      return true
    })
    // Refused leads always sink to the bottom
    result.sort((a, b) => {
      const aRefused = a.status === 'refused' ? 1 : 0
      const bRefused = b.status === 'refused' ? 1 : 0
      return aRefused - bRefused
    })
    return result
  }, [leads, countryTab, filters])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Leads</h1>

        {/* Country tabs */}
        <div className="card p-1 flex gap-1">
          {COUNTRY_TABS.map(({ key, flag, label }) => {
            const count = countByCountry[key] ?? 0
            const isActive = countryTab === key
            return (
              <button
                key={key}
                onClick={() => setCountryTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <span>{flag}</span>
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

      <LeadsFilters filters={filters} onChange={setFilters} view={view} onViewChange={setView} />

      {view === 'table' ? (
        <LeadsTable
          leads={filteredLeads}
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
