'use client'

import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Lead } from '@/lib/types/database'
import { ScoreBadge } from '@/components/ui/score-badge'
import { Phone, MapPin } from 'lucide-react'

export function KanbanCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { lead },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="card p-3 space-y-2 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/leads/${lead.id}`} className="font-medium text-sm hover:text-accent">
          {lead.company_name}
        </Link>
        <ScoreBadge score={lead.score} size={32} />
      </div>
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <MapPin size={12} />
        <span>{lead.city}</span>
        <span className="capitalize">· {lead.sector}</span>
      </div>
      {lead.phone && (
        <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-accent hover:underline">
          <Phone size={12} />
          {lead.phone}
        </a>
      )}
    </div>
  )
}
