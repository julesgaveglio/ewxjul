'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Lead, AssignedTo } from '@/lib/types/database'
import { ScoreBadge } from '@/components/ui/score-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Phone, ExternalLink, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LeadsTableProps {
  leads: Lead[]
  onLeadUpdated?: (id: string, updates: Partial<Lead>) => void
}

const ASSIGNEES: { key: AssignedTo; label: string; initials: string; color: string; bg: string }[] = [
  { key: 'jules', label: 'Jules', initials: 'J', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  { key: 'ewan',  label: 'Ewan',  initials: 'E', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
]

export function LeadsTable({ leads, onLeadUpdated }: LeadsTableProps) {
  const [assignedStates, setAssignedStates] = useState<Record<string, AssignedTo | null>>({})
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const supabase = createClient()

  if (leads.length === 0) {
    return (
      <div className="card p-12 text-center text-text-secondary">
        Aucun lead trouvé. Lancez un scan pour commencer.
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

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-text-secondary bg-bg-hover/50">
              <th className="px-3 py-3 font-medium w-14 text-center">Score</th>
              <th className="px-3 py-3 font-medium min-w-[160px]">Entreprise</th>
              <th className="px-3 py-3 font-medium hidden md:table-cell w-28">Secteur</th>
              <th className="px-3 py-3 font-medium hidden sm:table-cell w-24">Ville</th>
              <th className="px-3 py-3 font-medium hidden lg:table-cell w-36">Téléphone</th>
              <th className="px-3 py-3 font-medium hidden xl:table-cell">Notes</th>
              <th className="px-3 py-3 font-medium w-28">Statut</th>
              {/* Assigné — toujours visible, picker direct */}
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
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium hover:text-accent transition-colors"
                      >
                        {lead.company_name}
                      </Link>
                      {lead.owner_name && (
                        <p className="text-xs text-text-secondary mt-0.5">👤 {lead.owner_name}</p>
                      )}
                      {/* Sur mobile: secteur + ville sous le nom */}
                      <p className="text-xs text-text-secondary mt-0.5 sm:hidden">
                        {[lead.sector, lead.city].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </td>

                  {/* Secteur */}
                  <td className="px-3 py-3 hidden md:table-cell text-text-secondary capitalize text-xs">
                    {lead.sector ?? '—'}
                  </td>

                  {/* Ville */}
                  <td className="px-3 py-3 hidden sm:table-cell text-text-secondary text-xs">
                    {lead.city ?? '—'}
                  </td>

                  {/* Téléphone */}
                  <td className="px-3 py-3 hidden lg:table-cell">
                    {lead.phone ? (
                      <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-accent hover:underline text-xs">
                        <Phone size={12} />{lead.phone}
                      </a>
                    ) : (
                      <span className="text-text-secondary text-xs">—</span>
                    )}
                  </td>

                  {/* Notes */}
                  <td className="px-3 py-3 hidden xl:table-cell max-w-[220px]">
                    {lead.notes ? (
                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">{lead.notes}</p>
                    ) : (
                      <span className="text-text-secondary text-xs">—</span>
                    )}
                  </td>

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
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-150 disabled:opacity-50 ring-offset-1 focus:outline-none focus:ring-2"
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
