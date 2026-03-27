'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadStatus, AssignedTo } from '@/lib/types/database'
import { ScoreBadge } from '@/components/ui/score-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  ArrowLeft, MapPin, Phone, Globe, Star, ExternalLink,
  Mail, User, Clock, Sparkles,
  Search, Loader2, CheckCircle, AlertCircle, Image,
  Palette, MessageSquare, Briefcase, Tag,
} from 'lucide-react'
import Link from 'next/link'

export default function LeadDetailPage() {
  const { id } = useParams()
  const supabase = createClient()
  const [lead, setLead] = useState<Lead | null>(null)
  const [enriching, setEnriching] = useState(false)
  const [generating, setGenerating] = useState(false)

  async function fetchLead() {
    const { data } = await supabase.from('leads').select('*').eq('id', id as string).single()
    if (data) setLead(data)
  }

  useEffect(() => {
    fetchLead()
    const channel = supabase
      .channel(`lead-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads', filter: `id=eq.${id}` }, fetchLead)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  async function updateLead(updates: Partial<Lead>) {
    await supabase.from('leads').update(updates).eq('id', id as string)
    fetchLead()
  }

  async function handleEnrich() {
    setEnriching(true)
    await fetch(`/api/leads/${id}/enrich`, { method: 'POST' })
    // Real-time subscription will update the lead automatically
    setTimeout(() => setEnriching(false), 30000) // safety timeout
  }

  async function handleGenerate() {
    setGenerating(true)
    await fetch(`/api/leads/${id}/generate`, { method: 'POST' })
    setTimeout(() => setGenerating(false), 120000)
  }

  if (!lead) return (
    <div className="flex items-center justify-center min-h-[40vh] text-text-secondary">
      Chargement...
    </div>
  )

  const bd = lead.brand_data
  const isEnriching = enriching || lead.demo_status === 'scraping'
  const isGenerating = generating || ['generating', 'deploying'].includes(lead.demo_status)

  return (
    <div className="max-w-6xl space-y-6">

      {/* Back */}
      <Link href="/leads" className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm">
        <ArrowLeft size={15} /> Retour aux leads
      </Link>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{lead.company_name}</h1>
              <StatusBadge status={lead.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-text-secondary flex-wrap">
              {lead.sector && <span className="capitalize">{lead.sector}</span>}
              {lead.city && <span className="flex items-center gap-1"><MapPin size={13} />{lead.city}</span>}
              {lead.google_rating && (
                <span className="flex items-center gap-1">
                  <Star size={13} className="text-yellow-400" fill="currentColor" />
                  {lead.google_rating} · {lead.google_reviews_count} avis
                </span>
              )}
              {lead.owner_name && (
                <span className="flex items-center gap-1 text-accent">
                  <User size={13} /> {lead.owner_name}
                </span>
              )}
            </div>
          </div>
          <ScoreBadge score={lead.score} size={60} />
        </div>
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: content (2/3) ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Contact & Coordonnées */}
          <Section title="Coordonnées" icon={<Phone size={15} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {lead.owner_name && (
                <InfoRow icon={<User size={14} />} label="Dirigeant" value={lead.owner_name} />
              )}
              {lead.phone && (
                <InfoRow icon={<Phone size={14} />} label="Téléphone">
                  <a href={`tel:${lead.phone}`} className="text-accent hover:underline">{lead.phone}</a>
                </InfoRow>
              )}
              {bd?.contact.email && (
                <InfoRow icon={<Mail size={14} />} label="Email">
                  <a href={`mailto:${bd.contact.email}`} className="text-accent hover:underline">{bd.contact.email}</a>
                </InfoRow>
              )}
              {lead.address && (
                <InfoRow icon={<MapPin size={14} />} label="Adresse" value={lead.address} />
              )}
              {bd?.contact.hours && (
                <InfoRow icon={<Clock size={14} />} label="Horaires" value={bd.contact.hours} />
              )}
              {lead.website_url && (
                <InfoRow icon={<Globe size={14} />} label="Site web">
                  <a href={lead.website_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate max-w-[200px] block">
                    {lead.website_url}
                  </a>
                </InfoRow>
              )}
              {lead.google_maps_url && (
                <InfoRow icon={<ExternalLink size={14} />} label="Google Maps">
                  <a href={lead.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    Voir sur Maps
                  </a>
                </InfoRow>
              )}
              {(bd?.social.instagram || bd?.social.facebook) && (
                <div className="sm:col-span-2 flex gap-3 pt-1">
                  {bd.social.instagram && (
                    <a href={bd.social.instagram} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-bg-hover hover:bg-border rounded-full transition-colors">
                      📷 Instagram
                    </a>
                  )}
                  {bd.social.facebook && (
                    <a href={bd.social.facebook} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-bg-hover hover:bg-border rounded-full transition-colors">
                      👥 Facebook
                    </a>
                  )}
                </div>
              )}
            </div>
          </Section>

          {/* Données de marque */}
          {bd ? (
            <>
              {/* Description */}
              {bd.description && (
                <Section title="Description" icon={<MessageSquare size={15} />}>
                  <p className="text-sm text-text-primary leading-relaxed">{bd.description}</p>
                  {bd.tagline && (
                    <p className="text-sm text-accent italic mt-2">&ldquo;{bd.tagline}&rdquo;</p>
                  )}
                </Section>
              )}

              {/* Services + Values */}
              {(bd.services.length > 0 || bd.values.length > 0) && (
                <Section title="Services & Valeurs" icon={<Briefcase size={15} />}>
                  {bd.services.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-text-secondary uppercase tracking-wide mb-2">Services</p>
                      <div className="flex flex-wrap gap-2">
                        {bd.services.map((s, i) => (
                          <span key={i} className="px-2.5 py-1 bg-accent/10 text-accent rounded-full text-xs">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {bd.values.length > 0 && (
                    <div>
                      <p className="text-xs text-text-secondary uppercase tracking-wide mb-2">Valeurs</p>
                      <div className="flex flex-wrap gap-2">
                        {bd.values.map((v, i) => (
                          <span key={i} className="px-2.5 py-1 bg-bg-hover rounded-full text-xs">{v}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </Section>
              )}

              {/* Identité visuelle */}
              <Section title="Identité visuelle" icon={<Palette size={15} />}>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-text-secondary mb-2">Couleurs</p>
                      <div className="flex gap-2">
                        {Object.entries(bd.colors).map(([key, color]) => (
                          <div key={key} className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded-lg border border-border shadow-sm" style={{ backgroundColor: color as string }} />
                            <span className="text-xs font-mono text-text-secondary">{color as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {bd.logo_url && (
                      <div>
                        <p className="text-xs text-text-secondary mb-2">Logo</p>
                        <img src={bd.logo_url} alt="Logo" className="h-12 w-auto object-contain bg-white rounded p-1" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-text-secondary mb-2">Ton</p>
                      <span className="px-2.5 py-1 bg-bg-hover rounded-full text-xs capitalize">{bd.tone}</span>
                    </div>
                  </div>

                  {/* Images */}
                  {bd.images.length > 0 && (
                    <div>
                      <p className="text-xs text-text-secondary mb-2 flex items-center gap-1"><Image size={12} /> Photos</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {bd.images.slice(0, 8).map((src, i) => (
                          <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                            <img src={src} alt="" className="w-full h-20 object-cover rounded-lg bg-bg-hover hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              {/* Avis Google */}
              {bd.reviews.length > 0 && (
                <Section title="Avis clients" icon={<Star size={15} />}>
                  <div className="space-y-3">
                    {bd.reviews.slice(0, 5).map((r, i) => (
                      <div key={i} className="p-3 bg-bg-hover rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <Star key={j} size={11} className={j < r.rating ? 'text-yellow-400' : 'text-border'} fill="currentColor" />
                            ))}
                          </div>
                          <span className="text-xs text-text-secondary">{r.author}</span>
                        </div>
                        <p className="text-xs text-text-primary leading-relaxed">{r.text}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          ) : (
            <div className="card p-6 text-center text-text-secondary text-sm border border-dashed border-border">
              Aucune donnée de marque. Cliquez sur <strong>Enrichir</strong> pour scraper le profil complet.
            </div>
          )}
        </div>

        {/* ── Right: management (1/3) ─────────────────────────────────── */}
        <div className="space-y-6">

          {/* Actions */}
          <Section title="Actions" icon={<Sparkles size={15} />}>
            <div className="space-y-3">
              {/* Enrich */}
              <div>
                <p className="text-xs text-text-secondary mb-1.5">
                  {bd ? 'Données de marque enrichies ✓' : 'Scraper le profil complet'}
                </p>
                {isEnriching ? (
                  <div className="flex items-center gap-2 text-sm text-accent">
                    <Loader2 size={15} className="animate-spin" />
                    Analyse en cours...
                  </div>
                ) : (
                  <button
                    onClick={handleEnrich}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border hover:bg-bg-hover rounded-md text-sm transition-colors"
                  >
                    <Search size={15} />
                    {bd ? 'Ré-enrichir' : 'Enrichir le profil'}
                  </button>
                )}
              </div>

              <div className="border-t border-border" />

              {/* Generate site */}
              <div>
                <p className="text-xs text-text-secondary mb-1.5">Site web démo</p>
                {lead.demo_status === 'deployed' && lead.demo_url ? (
                  <div className="space-y-2">
                    <a
                      href={lead.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-md text-sm transition-colors"
                    >
                      <ExternalLink size={15} />
                      Voir le site démo
                    </a>
                    <p className="text-xs text-text-secondary text-center">
                      {lead.demo_generated_at && `Généré le ${new Date(lead.demo_generated_at).toLocaleDateString('fr-FR')}`}
                    </p>
                    <button
                      onClick={handleGenerate}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-bg-hover hover:bg-border rounded-md text-sm transition-colors text-text-secondary"
                    >
                      <Sparkles size={14} /> Regénérer
                    </button>
                  </div>
                ) : isGenerating ? (
                  <div className="flex items-center gap-2 text-sm text-accent">
                    <Loader2 size={15} className="animate-spin" />
                    {lead.demo_status === 'generating' ? 'Génération IA...' : 'Déploiement...'}
                  </div>
                ) : lead.demo_status === 'error' ? (
                  <div className="space-y-2">
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle size={12} /> {lead.demo_error_message?.slice(0, 80)}
                    </p>
                    <button
                      onClick={handleGenerate}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-sm transition-colors"
                    >
                      <Sparkles size={15} /> Réessayer
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerate}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium transition-colors"
                  >
                    <Sparkles size={15} />
                    Générer le site démo
                  </button>
                )}
              </div>
            </div>
          </Section>

          {/* Gestion commerciale */}
          <Section title="Gestion" icon={<Tag size={15} />}>
            <div className="space-y-3">
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
                  <option value="sold">Vendu ✓</option>
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
                  <label className="block text-xs text-text-secondary mb-1">Prix de vente (€)</label>
                  <input
                    type="number"
                    value={lead.sale_price ?? ''}
                    onChange={e => updateLead({ sale_price: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-1.5 bg-bg border border-border rounded-md text-sm font-mono"
                    placeholder="0"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-text-secondary mb-1">Dernier contact</label>
                <input
                  type="date"
                  value={lead.last_contact_at?.split('T')[0] ?? ''}
                  onChange={e => updateLead({ last_contact_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full px-3 py-1.5 bg-bg border border-border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Notes</label>
                <textarea
                  value={lead.notes ?? ''}
                  onChange={e => updateLead({ notes: e.target.value || null })}
                  rows={4}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm resize-none"
                  placeholder="Notes libres..."
                />
              </div>
            </div>
          </Section>

          {/* Scoring */}
          <Section title="Scoring" icon={<CheckCircle size={15} />}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Score opportunité</span>
                <span className="font-bold text-lg">{lead.score}/100</span>
              </div>
              <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${lead.score}%`,
                    backgroundColor: lead.score >= 70 ? '#22c55e' : lead.score >= 40 ? '#f59e0b' : '#3b82f6',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-text-secondary">
                <span>{lead.scoring_status === 'complete' ? '✓ Complet' : '⚡ Partiel'}</span>
                {lead.website_url ? <span>A un site</span> : <span className="text-accent">Pas de site !</span>}
              </div>
            </div>
          </Section>

        </div>
      </div>
    </div>
  )
}

// ─── Helper components ─────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="card p-5 space-y-4">
      <h2 className="flex items-center gap-2 font-medium text-sm text-text-secondary uppercase tracking-wide">
        {icon} {title}
      </h2>
      {children}
    </div>
  )
}

function InfoRow({ icon, label, value, children }: { icon: React.ReactNode, label: string, value?: string, children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-text-secondary mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-text-secondary">{label}</p>
        {children ?? <p className="text-text-primary">{value}</p>}
      </div>
    </div>
  )
}
