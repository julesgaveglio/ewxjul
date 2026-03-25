'use client'

import type { ScrapingJob } from '@/lib/types/database'

export function ScanProgress({ job }: { job: ScrapingJob | null }) {
  if (!job) return null
  const isRunning = job.status === 'running'
  const isError = job.status === 'error'
  const isDone = job.status === 'completed'

  return (
    <div className="card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {isRunning && `Scan en cours — ${job.query_sector} à ${job.query_city}`}
          {isDone && `Scan terminé — ${job.leads_added} leads ajoutés sur ${job.leads_found} trouvés`}
          {isError && `Erreur : ${job.error_message}`}
        </span>
        <span className="font-mono text-sm text-text-secondary">{job.progress}%</span>
      </div>
      <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${isError ? 'bg-danger' : isDone ? 'bg-success' : 'bg-accent'}`} style={{ width: `${job.progress}%` }} />
      </div>
    </div>
  )
}
