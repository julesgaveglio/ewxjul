'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import type { Lead } from '@/lib/types/database'
import { ScoreBadge } from '@/components/ui/score-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Phone, ExternalLink, Search, Sparkles, Loader2, Copy, Check, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'

interface LeadsTableProps {
  leads: Lead[]
}

type EnrichState = 'idle' | 'running' | 'done' | 'error'

export function LeadsTable({ leads }: LeadsTableProps) {
  const [enrichStates, setEnrichStates] = useState<Record<string, EnrichState>>({})
  const [demoStatuses, setDemoStatuses] = useState<Record<string, Lead['demo_status']>>({})
  const [expandedPitch, setExpandedPitch] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  // Local cache for owner/pitch fetched during polling
  const [enrichedData, setEnrichedData] = useState<Record<string, { owner_name: string | null, cold_pitch: string | null }>>({})

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
    return enrichedData[lead.id]?.owner_name ?? lead.owner_name
  }

  function getColdPitch(lead: Lead): string | null {
    return enrichedData[lead.id]?.cold_pitch ?? lead.cold_pitch
  }

  async function handleEnrich(lead: Lead) {
    setEnrichStates(s => ({ ...s, [lead.id]: 'running' }))
    const res = await fetch(`/api/leads/${lead.id}/enrich`, { method: 'POST' })
    if (!res.ok) {
      setEnrichStates(s => ({ ...s, [lead.id]: 'error' }))
      return
    }
    // Poll until done
    const interval = setInterval(async () => {
      const r = await fetch(`/api/leads/${lead.id}/status`)
      if (!r.ok) return
      const data = await r.json()
      // Enrichment is done when demo_status returns to 'idle' after we set it to 'scraping'
      if (data.demo_status !== 'scraping') {
        clearInterval(interval)
        setEnrichStates(s => ({ ...s, [lead.id]: 'done' }))
        setEnrichedData(s => ({ ...s, [lead.id]: { owner_name: data.owner_name, cold_pitch: data.cold_pitch } }))
      }
    }, 2500)
  }

  async function handleGenerate(lead: Lead) {
    setDemoStatuses(s => ({ ...s, [lead.id]: 'generating' }))
    const res = await fetch(`/api/leads/${lead.id}/generate`, { method: 'POST' })
    if (!res.ok) {
      setDemoStatuses(s => ({ ...s, [lead.id]: 'error' }))
      return
    }
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

  function copyPitch(leadId: string, pitch: string) {
    navigator.clipboard.writeText(pitch)
    setCopied(leadId)
    setTimeout(() => setCopied(null), 2000)
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
            const coldPitch = getColdPitch(lead)
            const pitchExpanded = expandedPitch === lead.id
            const isDemoRunning = ['generating', 'deploying'].includes(demoStatus)
            const isDemoScraping = demoStatus === 'scraping'

            return (
              <Fragment key={lead.id}>
                {/* Main row */}
                <tr className="border-b border-border/50 hover:bg-bg-hover transition-colors">
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
                    {lead.phone ? (
                      <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-accent hover:underline">
                        <Phone size={14} />
                        {lead.phone}
                      </a>
                    ) : <span className="text-text-secondary">—</span>}
                  </td>

                  <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                  <td className="px-4 py-3 text-text-secondary capitalize">{lead.assigned_to ?? '—'}</td>

                  {/* ── Enrich column ────────────────────────────────── */}
                  <td className="px-4 py-3 text-center">
                    {enrichState === 'running' || isDemoScraping ? (
                      <span className="inline-flex items-center gap-1 text-xs text-accent">
                        <Loader2 size={13} className="animate-spin" />
                        Analyse...
                      </span>
                    ) : enrichState === 'done' ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-success flex items-center gap-1">
                          <Check size={12} /> Enrichi
                        </span>
                        {coldPitch ? (
                          <button
                            onClick={() => setExpandedPitch(pitchExpanded ? null : lead.id)}
                            className="text-xs text-text-secondary hover:text-accent flex items-center gap-0.5"
                          >
                            Pitch {pitchExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleEnrich(lead)}
                          className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-0.5"
                        >
                          <RotateCcw size={11} /> Relancer
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEnrich(lead)}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-bg-hover hover:bg-border text-text-primary rounded transition-colors border border-border"
                      >
                        <Search size={13} />
                        Enrichir
                      </button>
                    )}
                  </td>

                  {/* ── Site démo column ─────────────────────────────── */}
                  <td className="px-4 py-3 text-center">
                    {demoStatus === 'deployed' && lead.demo_url ? (
                      <a
                        href={lead.demo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-success hover:underline"
                      >
                        <ExternalLink size={13} />
                        Voir le site
                      </a>
                    ) : isDemoRunning ? (
                      <span className="inline-flex items-center gap-1 text-xs text-accent">
                        <Loader2 size={13} className="animate-spin" />
                        {demoStatus === 'generating' ? 'Génération...' : 'Déploiement...'}
                      </span>
                    ) : demoStatus === 'error' ? (
                      <button
                        onClick={() => handleGenerate(lead)}
                        className="text-xs text-danger hover:underline"
                        title={lead.demo_error_message ?? ''}
                      >
                        Erreur — Réessayer
                      </button>
                    ) : (
                      <button
                        onClick={() => handleGenerate(lead)}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded transition-colors"
                      >
                        <Sparkles size={13} />
                        Générer
                      </button>
                    )}
                  </td>
                </tr>

                {/* Pitch row (expanded) */}
                {pitchExpanded && coldPitch && (
                  <tr className="bg-accent/5 border-b border-border/30">
                    <td colSpan={9} className="px-6 py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                            Phrase d&apos;accroche cold calling
                          </p>
                          <p className="text-sm text-text-primary italic">&ldquo;{coldPitch}&rdquo;</p>
                        </div>
                        <button
                          onClick={() => copyPitch(lead.id, coldPitch)}
                          className="shrink-0 flex items-center gap-1 text-xs px-2 py-1 bg-bg-hover hover:bg-border text-text-secondary rounded transition-colors"
                        >
                          {copied === lead.id
                            ? <><Check size={12} className="text-success" /> Copié</>
                            : <><Copy size={12} /> Copier</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
