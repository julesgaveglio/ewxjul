'use client'

import Link from 'next/link'
import type { Lead } from '@/lib/types/database'
import { ScoreBadge } from '@/components/ui/score-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Phone, ExternalLink } from 'lucide-react'

interface LeadsTableProps {
  leads: Lead[]
}

export function LeadsTable({ leads }: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className="card p-12 text-center text-text-secondary">
        Aucun lead trouvé. Lancez un scan pour commencer.
      </div>
    )
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-text-secondary">
            <th className="px-4 py-3 font-medium">Score</th>
            <th className="px-4 py-3 font-medium">Entreprise</th>
            <th className="px-4 py-3 font-medium">Secteur</th>
            <th className="px-4 py-3 font-medium">Ville</th>
            <th className="px-4 py-3 font-medium">Téléphone</th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 font-medium">Assigné</th>
            <th className="px-4 py-3 font-medium">Démo</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
              <td className="px-4 py-3">
                <ScoreBadge score={lead.score} size={36} />
              </td>
              <td className="px-4 py-3">
                <Link href={`/leads/${lead.id}`} className="text-text-primary hover:text-accent font-medium">
                  {lead.company_name}
                </Link>
              </td>
              <td className="px-4 py-3 text-text-secondary capitalize">{lead.sector}</td>
              <td className="px-4 py-3 text-text-secondary">{lead.city}</td>
              <td className="px-4 py-3">
                {lead.phone ? (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-accent hover:underline">
                    <Phone size={14} />
                    {lead.phone}
                  </a>
                ) : (
                  <span className="text-text-secondary">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={lead.status} />
              </td>
              <td className="px-4 py-3 text-text-secondary capitalize">{lead.assigned_to ?? '—'}</td>
              <td className="px-4 py-3">
                {lead.demo_url ? (
                  <a href={lead.demo_url} target="_blank" rel="noopener noreferrer" className="text-success hover:underline flex items-center gap-1">
                    <ExternalLink size={14} />
                    Voir
                  </a>
                ) : (
                  <span className="text-text-secondary text-xs">
                    {lead.demo_status === 'idle' ? '—' : lead.demo_status}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
