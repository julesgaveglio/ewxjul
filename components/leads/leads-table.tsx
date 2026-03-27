'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Lead } from '@/lib/types/database'
import { ScoreBadge } from '@/components/ui/score-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Phone, ExternalLink, Search, Sparkles, Loader2, Check, RotateCcw } from 'lucide-react'

interface LeadsTableProps {
  leads: Lead[]
}

type EnrichState = 'idle' | 'running' | 'done' | 'error'

export function LeadsTable({ leads }: LeadsTableProps) {
  const [enrichStates, setEnrichStates] = useState<Record<string, EnrichState>>({})
  const [demoStatuses, setDemoStatuses] = useState<Record<string, Lead['demo_status']>>({})
  const [ownerNames, setOwnerNames] = useState<Record<string, string | null>>({})

  if (leads.length === 0) {
    return (
      <div className="card p-12 text-center text-text-secondary">
        Aucun lead trouvé. Lancez un scan pour commencer.
      </div>
    )
  }

  function getEnrichState(lead: Lead): EnrichState {
    if (enrichStates[lead.id]) return enrichStates[lead.id]
    if (lead.brand_data) return 'done'
    return 'idle'
  }

  function getDemoStatus(lead: Lead): Lead['demo_status'] {
    return demoStatuses[lead.id] ?? lead.demo_status
  }

  function getOwnerName(lead: Lead): string | null {
    return ownerNames[lead.id] !== undefined ? ownerNames[lead.id] : lead.owner_name
  }

  async function handleEnrich(lead: Lead) {
    setEnrichStates(s => ({ ...s, [lead.id]: 'running' }))
    const res = await fetch(`/api/leads/${lead.id}/enrich`, { method: 'POST' })
    if (!res.ok) { setEnrichStates(s => ({ ...s, [lead.id]: 'error' })); return }
    const interval = setInterval(async () => {
      const r = await fetch(`/api/leads/${lead.id}/status`)
      if (!r.ok) return
      const data = await r.json()
      if (data.demo_status !== 'scraping') {
        clearInterval(interval)
        setEnrichStates(s => ({ ...s, [lead.id]: 'done' }))
        setOwnerNames(s => ({ ...s, [lead.id]: data.owner_name }))
      }
    }, 2500)
  }

  async function handleGenerate(lead: Lead) {
    setDemoStatuses(s => ({ ...s, [lead.id]: 'generating' }))
    const res = await fetch(`/api/leads/${lead.id}/generate`, { method: 'POST' })
    if (!res.ok) { setDemoStatuses(s => ({ ...s, [lead.id]: 'error' })); return }
    const interval = setInterval(async () => {
      const r = await fetch(`/api/leads/${lead.id}/status`)
      if (!r.ok) return
      const data = await r.json()
      setDemoStatuses(s => ({ ...s, [lead.id]: data.demo_status }))
      if (!['generating', 'deploying'].includes(data.demo_status)) {
        clearInterval(interval)
        if (data.demo_status === 'deployed') window.location.reload()
      }
    }, 3000)
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
            <th className="px-4 py-3 font-medium text-center">Enrichir</th>
            <th className="px-4 py-3 font-medium text-center">Site démo</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const enrichState = getEnrichState(lead)
            const demoStatus = getDemoStatus(lead)
            const ownerName = getOwnerName(lead)
            const isDemoRunning = ['generating', 'deploying'].includes(demoStatus)
            const isEnriching = enrichState === 'running' || demoStatus === 'scraping'

            return (
              <tr key={lead.id} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                <td className="px-4 py-3">
                  <ScoreBadge score={lead.score} size={36} />
                </td>

                <td className="px-4 py-3">
                  <div className="space-y-0.5">
                    <Link href={`/leads/${lead.id}`} className="text-text-primary hover:text-accent font-medium">
                      {lead.company_name}
                    </Link>
                    {ownerName && (
                      <p className="text-xs text-text-secondary">👤 {ownerName}</p>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 text-text-secondary capitalize">{lead.sector ?? '—'}</td>
                <td className="px-4 py-3 text-text-secondary">{lead.city ?? '—'}</td>

                <td className="px-4 py-3">
                  {lead.phone
                    ? <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-accent hover:underline"><Phone size={14} />{lead.phone}</a>
                    : <span className="text-text-secondary">—</span>}
                </td>

                <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                <td className="px-4 py-3 text-text-secondary capitalize">{lead.assigned_to ?? '—'}</td>

                {/* Enrich */}
                <td className="px-4 py-3 text-center">
                  {isEnriching ? (
                    <span className="inline-flex items-center gap-1 text-xs text-accent">
                      <Loader2 size={13} className="animate-spin" /> Analyse...
                    </span>
                  ) : enrichState === 'done' ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-success flex items-center gap-1"><Check size={12} /> Enrichi</span>
                      <button onClick={() => handleEnrich(lead)} className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-0.5">
                        <RotateCcw size={11} /> Relancer
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEnrich(lead)}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 border border-border hover:bg-bg-hover rounded transition-colors"
                    >
                      <Search size={13} /> Enrichir
                    </button>
                  )}
                </td>

                {/* Site démo */}
                <td className="px-4 py-3 text-center">
                  {demoStatus === 'deployed' && lead.demo_url ? (
                    <a href={lead.demo_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-success hover:underline">
                      <ExternalLink size={13} /> Voir
                    </a>
                  ) : isDemoRunning ? (
                    <span className="inline-flex items-center gap-1 text-xs text-accent">
                      <Loader2 size={13} className="animate-spin" />
                      {demoStatus === 'generating' ? 'Génération...' : 'Déploiement...'}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleGenerate(lead)}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded transition-colors"
                    >
                      <Sparkles size={13} /> Générer
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
