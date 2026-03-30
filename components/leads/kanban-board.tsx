'use client'

import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { Lead, LeadStatus } from '@/lib/types/database'
import { KanbanColumn } from './kanban-column'
import { createClient } from '@/lib/supabase/client'

const STATUSES: LeadStatus[] = ['to_call', 'contacted', 'demo_sent', 'proposal_sent', 'sold', 'refused']

interface KanbanBoardProps {
  leads: Lead[]
  onLeadUpdate: () => void
}

export function KanbanBoard({ leads, onLeadUpdate }: KanbanBoardProps) {
  const supabase = createClient()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const leadId = active.id as string
    const newStatus = over.id as LeadStatus

    if (!STATUSES.includes(newStatus)) return

    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.status === newStatus) return

    await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', leadId)

    onLeadUpdate()
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            leads={leads.filter(l => l.status === status)}
          />
        ))}
      </div>
    </DndContext>
  )
}
