'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LeadsFilters, type FiltersState } from '@/components/leads/leads-filters'
import { LeadsTable } from '@/components/leads/leads-table'
import { KanbanBoard } from '@/components/leads/kanban-board'
import type { Lead } from '@/lib/types/database'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [view, setView] = useState<'table' | 'kanban'>('table')
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

    // Realtime subscription
    const channel = supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
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
  }, [leads, filters])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Leads</h1>
      <LeadsFilters filters={filters} onChange={setFilters} view={view} onViewChange={setView} />
      {view === 'table' ? (
        <LeadsTable leads={filteredLeads} />
      ) : (
        <KanbanBoard leads={filteredLeads} onLeadUpdate={() => {
          createClient().from('leads').select('*').order('score', { ascending: false }).then(({ data }) => {
            if (data) setLeads(data)
          })
        }} />
      )}
    </div>
  )
}
