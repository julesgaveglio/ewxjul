'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Lead, LeadStatus } from '@/lib/types/database'
import { KanbanCard } from './kanban-card'

const COLUMN_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  to_call: { label: 'À appeler', color: 'bg-accent' },
  contacted: { label: 'Contacté', color: 'bg-warning' },
  demo_sent: { label: 'Démo envoyée', color: 'bg-purple-500' },
  sold: { label: 'Vendu', color: 'bg-success' },
  refused: { label: 'Refus', color: 'bg-danger' },
}

interface KanbanColumnProps {
  status: LeadStatus
  leads: Lead[]
}

export function KanbanColumn({ status, leads }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const config = COLUMN_CONFIG[status]

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[280px] w-[280px] rounded-lg transition-colors ${
        isOver ? 'bg-bg-hover' : ''
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        <span className="text-sm font-medium">{config.label}</span>
        <span className="ml-auto text-xs text-text-secondary font-mono">{leads.length}</span>
      </div>
      <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 px-1 pb-4 min-h-[200px]">
          {leads.map(lead => (
            <KanbanCard key={lead.id} lead={lead} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
