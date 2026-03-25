'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadStatus, AssignedTo } from '@/lib/types/database'
import { ScoreBadge } from '@/components/ui/score-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { GenerateButton } from '@/components/leads/generate-button'
import { ArrowLeft, MapPin, Phone, Globe, Star, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function LeadDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [lead, setLead] = useState<Lead | null>(null)

  async function fetchLead() {
    const { data } = await supabase.from('leads').select('*').eq('id', id).single()
    if (data) setLead(data)
  }

  useEffect(() => {
    fetchLead()
    const channel = supabase
      .channel(`lead-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads', filter: `id=eq.${id}` }, () => {
        fetchLead()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  async function updateLead(updates: Partial<Lead>) {
    await supabase.from('leads').update(updates).eq('id', id)
    fetchLead()
  }

  if (!lead) return <div className="text-text-secondary">Chargement...</div>

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/leads" className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm">
        <ArrowLeft size={16} /> Retour aux leads
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{lead.company_name}</h1>
          <div className="flex items-center gap-3 mt-1 text-text-secondary text-sm">
            {lead.city && <span className="flex items-center gap-1"><MapPin size={14} />{lead.city}</span>}
            {lead.sector && <span className="capitalize">{lead.sector}</span>}
            {lead.google_rating && (
              <span className="flex items-center gap-1">
                <Star size={14} className="text-warning" />
                {lead.google_rating} ({lead.google_reviews_count} avis)
              </span>
            )}
          </div>
        </div>
        <ScoreBadge score={lead.score} size={56} />
      </div>

      {/* Contact */}
      <div className="card p-4 space-y-3">
        <h2 className="font-medium text-sm text-text-secondary uppercase tracking-wide">Contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-accent hover:underline">
              <Phone size={16} />{lead.phone}
            </a>
          )}
          {lead.website_url && (
            <a href={lead.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-accent hover:underline">
              <Globe size={16} />{lead.website_url}
            </a>
          )}
          {lead.google_maps_url && (
            <a href={lead.google_maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-accent hover:underline">
              <ExternalLink size={16} />Google Maps
            </a>
          )}
          {lead.address && <p className="text-text-secondary text-sm">{lead.address}</p>}
        </div>
      </div>

      {/* Gestion */}
      <div className="card p-4 space-y-4">
        <h2 className="font-medium text-sm text-text-secondary uppercase tracking-wide">Gestion</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Statut</label>
            <select
              value={lead.status}
              onChange={e => updateLead({ status: e.target.value as LeadStatus })}
              className="w-full px-3 py-1.5 bg-bg border border-border rounded-md text-sm"
            >
              <option value="to_call">À appeler</option>
              <option value="contacted">Contacté</option>
              <option value="demo_sent">Démo envoyée</option>
              <option value="sold">Vendu</option>
              <option value="refused">Refus</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Assigné à</label>
            <select
              value={lead.assigned_to ?? ''}
              onChange={e => updateLead({ assigned_to: (e.target.value || null) as AssignedTo | null })}
              className="w-full px-3 py-1.5 bg-bg border border-border rounded-md text-sm"
            >
              <option value="">Non assigné</option>
              <option value="jules">Jules</option>
              <option value="ewan">Ewan</option>
            </select>
          </div>
          {lead.status === 'sold' && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Prix de vente (EUR)</label>
              <input
                type="number"
                value={lead.sale_price ?? ''}
                onChange={e => updateLead({ sale_price: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-3 py-1.5 bg-bg border border-border rounded-md text-sm font-mono"
                placeholder="0"
              />
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">Notes</label>
          <textarea
            value={lead.notes ?? ''}
            onChange={e => updateLead({ notes: e.target.value || null })}
            rows={3}
            className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm resize-none"
            placeholder="Notes libres..."
          />
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">Dernier contact</label>
          <input
            type="date"
            value={lead.last_contact_at?.split('T')[0] ?? ''}
            onChange={e => updateLead({ last_contact_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="px-3 py-1.5 bg-bg border border-border rounded-md text-sm"
          />
        </div>
      </div>

      {/* Brand Data */}
      {lead.brand_data && (
        <div className="card p-4 space-y-3">
          <h2 className="font-medium text-sm text-text-secondary uppercase tracking-wide">Données de marque</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-secondary mb-1">Couleurs</p>
              <div className="flex gap-2">
                {Object.entries(lead.brand_data.colors).map(([key, color]) => (
                  <div key={key} className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded border border-border" style={{ backgroundColor: color as string }} />
                    <span className="text-xs font-mono text-text-secondary">{color as string}</span>
                  </div>
                ))}
              </div>
            </div>
            {lead.brand_data.logo_url && (
              <div>
                <p className="text-text-secondary mb-1">Logo</p>
                <img src={lead.brand_data.logo_url} alt="Logo" className="h-10 object-contain" />
              </div>
            )}
            {lead.brand_data.services.length > 0 && (
              <div>
                <p className="text-text-secondary mb-1">Services</p>
                <div className="flex flex-wrap gap-1">
                  {lead.brand_data.services.map((s: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-bg-hover rounded text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-text-secondary mb-1">Ton</p>
              <span className="capitalize">{lead.brand_data.tone}</span>
            </div>
          </div>
        </div>
      )}

      {/* Génération de site démo */}
      <div className="card p-4 space-y-3">
        <h2 className="font-medium text-sm text-text-secondary uppercase tracking-wide">Site démo</h2>
        <GenerateButton
          leadId={lead.id}
          demoStatus={lead.demo_status}
          demoUrl={lead.demo_url}
          demoError={lead.demo_error_message}
          onGenerate={fetchLead}
        />
      </div>
    </div>
  )
}
