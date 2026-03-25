'use client'

import { useState } from 'react'
import type { DemoStatus } from '@/lib/types/database'
import { Sparkles, Loader2, ExternalLink, Copy, AlertCircle } from 'lucide-react'

interface GenerateButtonProps {
  leadId: string
  demoStatus: DemoStatus
  demoUrl: string | null
  demoError: string | null
  onGenerate: () => void
}

export function GenerateButton({ leadId, demoStatus, demoUrl, demoError, onGenerate }: GenerateButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    const res = await fetch(`/api/leads/${leadId}/generate`, { method: 'POST' })
    if (res.ok) onGenerate()
  }

  function copyUrl() {
    if (demoUrl) {
      navigator.clipboard.writeText(demoUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (demoStatus === 'deployed' && demoUrl) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <a
          href={demoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-md text-sm hover:bg-success/20"
        >
          <ExternalLink size={16} />
          Ouvrir la démo
        </a>
        <button
          onClick={copyUrl}
          className="flex items-center gap-2 px-4 py-2 bg-bg-hover text-text-secondary rounded-md text-sm hover:text-text-primary"
        >
          <Copy size={16} />
          {copied ? 'Copié !' : 'Copier le lien'}
        </button>
        <button
          onClick={handleGenerate}
          className="flex items-center gap-2 px-4 py-2 bg-bg-hover text-text-secondary rounded-md text-sm hover:text-text-primary"
        >
          <Sparkles size={16} />
          Regénérer
        </button>
      </div>
    )
  }

  if (['scraping', 'generating', 'deploying'].includes(demoStatus)) {
    const labels = { scraping: 'Scraping de la marque...', generating: 'Génération du site...', deploying: 'Déploiement...' }
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-md text-sm">
        <Loader2 size={16} className="animate-spin" />
        {labels[demoStatus as keyof typeof labels]}
      </div>
    )
  }

  if (demoStatus === 'error') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-danger text-sm">
          <AlertCircle size={16} />
          {demoError || 'Erreur lors de la génération'}
        </div>
        <button
          onClick={handleGenerate}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-sm"
        >
          <Sparkles size={16} />
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleGenerate}
      className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium transition-colors"
    >
      <Sparkles size={16} />
      Générer le site démo
    </button>
  )
}
