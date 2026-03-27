'use client'

import { useEffect, useRef } from 'react'
import type { ScrapingJob, ScanLogEntry } from '@/lib/types/database'

function logColor(type: ScanLogEntry['type']) {
  switch (type) {
    case 'success': return 'text-green-400'
    case 'error': return 'text-red-400'
    case 'analyzing': return 'text-yellow-400'
    default: return 'text-text-secondary'
  }
}

function logPrefix(type: ScanLogEntry['type']) {
  switch (type) {
    case 'success': return '✓'
    case 'error': return '✗'
    case 'analyzing': return '→'
    default: return '·'
  }
}

export function ScanProgress({ job }: { job: ScrapingJob | null }) {
  const logsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [job?.logs])

  if (!job) return null

  const isRunning = job.status === 'running'
  const isError = job.status === 'error'
  const isDone = job.status === 'completed'
  const logs = job.logs ?? []

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-sm font-medium">
              {isError && `Erreur : ${job.error_message}`}
              {isDone && `Scan terminé — ${job.leads_added} leads ajoutés`}
              {isRunning && (job.current_action ?? 'Scan en cours...')}
            </span>
            {isRunning && job.leads_found > 0 && (
              <p className="text-xs text-text-secondary">
                {job.leads_added} insérés · {job.leads_found} trouvés
              </p>
            )}
          </div>
          <span className="font-mono text-sm text-text-secondary tabular-nums">{job.progress}%</span>
        </div>
        <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isError ? 'bg-red-500' : isDone ? 'bg-green-500' : 'bg-accent'}`}
            style={{ width: `${job.progress}%` }}
          />
        </div>
      </div>

      {/* Live log terminal */}
      {logs.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-2 border-b border-border flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <span className="text-xs text-text-secondary font-mono ml-1">scan-log</span>
            {isRunning && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                live
              </span>
            )}
          </div>
          <div
            ref={logsRef}
            className="p-4 h-64 overflow-y-auto font-mono text-xs space-y-1 bg-[#050508]"
          >
            {logs.map((entry, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-text-secondary/40 shrink-0 tabular-nums">
                  {new Date(entry.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={`shrink-0 ${logColor(entry.type)}`}>{logPrefix(entry.type)}</span>
                <span className={logColor(entry.type)}>{entry.message}</span>
              </div>
            ))}
            {isRunning && (
              <div className="flex gap-2">
                <span className="text-text-secondary/40">{'   '}</span>
                <span className="text-accent animate-pulse">▋</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
