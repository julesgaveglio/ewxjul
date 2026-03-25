'use client'

import type { LeadStatus, AssignedTo } from '@/lib/types/database'

interface FiltersState {
  search: string
  status: LeadStatus | ''
  assignedTo: AssignedTo | ''
  city: string
  minScore: number
}

interface LeadsFiltersProps {
  filters: FiltersState
  onChange: (filters: FiltersState) => void
  view: 'table' | 'kanban'
  onViewChange: (view: 'table' | 'kanban') => void
}

export function LeadsFilters({ filters, onChange, view, onViewChange }: LeadsFiltersProps) {
  return (
    <div className="card p-4 flex flex-wrap gap-3 items-center">
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

      <div className="ml-auto flex gap-1">
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
      </div>
    </div>
  )
}

export type { FiltersState }
