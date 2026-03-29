'use client'

import { useState, useRef, useCallback } from 'react'
import Papa from 'papaparse'
import { Upload, ArrowRight, ArrowLeft, Download, Check, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Lead } from '@/lib/types/database'
import {
  buildInitialMapping, mapRowToLead, isDuplicate, downloadTemplateCsv,
  IMPORTABLE_FIELDS,
  type MappingEntry, type RawRow, type ImportableLeadField,
} from '@/lib/csv-import'

interface LeadsImportProps {
  allLeads: Lead[]
  onLeadsImported: () => void
  onSwitchToTable: () => void
}

type Step = 'upload' | 'mapping' | 'preview'

export function LeadsImport({ allLeads, onLeadsImported, onSwitchToTable }: LeadsImportProps) {
  const [step, setStep] = useState<Step>('upload')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<RawRow[]>([])
  const [mapping, setMapping] = useState<MappingEntry[]>([])

  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setError(null)
    setImportResult(null)

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Seuls les fichiers .csv sont acceptés.')
      return
    }

    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        if (!results.meta.fields || results.meta.fields.length === 0) {
          setError('CSV vide ou sans en-têtes.')
          return
        }
        if (results.data.length > 500) {
          setError('Fichier trop volumineux (max 500 leads par import).')
          return
        }
        setHeaders(results.meta.fields)
        setRows(results.data)
        setMapping(buildInitialMapping(results.meta.fields))
        setStep('mapping')
      },
      error() {
        setError('Impossible de lire ce fichier CSV.')
      },
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateMapping(index: number, field: ImportableLeadField) {
    setMapping(prev => prev.map((m, i) => i === index ? { ...m, field, autoDetected: false } : m))
  }

  const canPreview = mapping.some(m => m.field === 'company_name')

  const mappedRows = rows.map(row => mapRowToLead(row, mapping))
  const duplicateCount = mappedRows.filter(r => isDuplicate(r, allLeads)).length
  const toImport = mappedRows.filter(r => !isDuplicate(r, allLeads) && r.company_name.trim() !== '')

  async function handleImport() {
    setImporting(true)
    const supabase = createClient()
    const results = await Promise.allSettled(
      toImport.map(lead =>
        supabase.from('leads').insert(lead).then(({ error: err }) => {
          if (err) throw err
        })
      )
    )
    const success = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    setImporting(false)
    setImportResult({ success, failed })
    onLeadsImported()
    if (failed === 0) {
      setTimeout(() => {
        onSwitchToTable()
        resetWizard()
      }, 1500)
    }
  }

  function resetWizard() {
    setStep('upload')
    setError(null)
    setHeaders([])
    setRows([])
    setMapping([])
    setImportResult(null)
  }

  // ── STEP: UPLOAD ──────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="card p-8 flex flex-col items-center gap-6 max-w-lg mx-auto mt-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-text-primary">Importer des leads via CSV</h2>
          <p className="text-sm text-text-secondary mt-1">Glissez un fichier ou cliquez pour le sélectionner</p>
        </div>

        <div
          className={`w-full border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
            isDragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50 hover:bg-bg-hover'
          }`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={32} className="text-text-secondary" />
          <span className="text-sm text-text-secondary">Fichier .csv (max 500 lignes)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-danger text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <button
          onClick={downloadTemplateCsv}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors"
        >
          <Download size={14} />
          Télécharger un modèle CSV
        </button>
      </div>
    )
  }

  // ── STEP: MAPPING ─────────────────────────────────────────────
  if (step === 'mapping') {
    return (
      <div className="card p-6 flex flex-col gap-6 mt-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Mapper les colonnes</h2>
            <p className="text-sm text-text-secondary mt-0.5">
              {rows.length} lignes détectées — {headers.length} colonnes
            </p>
          </div>
          <button
            onClick={resetWizard}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={14} /> Changer de fichier
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-text-secondary font-medium">Colonne CSV</th>
                <th className="text-left py-2 px-3 text-text-secondary font-medium">Exemple</th>
                <th className="text-left py-2 px-3 text-text-secondary font-medium">Champ Lead</th>
                <th className="py-2 px-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {mapping.map((m, i) => (
                <tr key={m.csvHeader} className="border-b border-border/50">
                  <td className="py-2 px-3 font-mono text-text-primary text-xs">{m.csvHeader}</td>
                  <td className="py-2 px-3 text-text-secondary truncate max-w-[160px] text-xs">
                    {rows[0]?.[m.csvHeader] ?? '—'}
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={m.field}
                      onChange={e => updateMapping(i, e.target.value as ImportableLeadField)}
                      className="px-2 py-1 bg-bg border border-border rounded text-sm text-text-primary w-full"
                    >
                      {IMPORTABLE_FIELDS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    {m.autoDetected && m.field !== 'ignore' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">Auto</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!canPreview && (
          <p className="text-sm text-warning flex items-center gap-2">
            <AlertCircle size={14} /> Mappez au moins la colonne &quot;Nom de la société&quot; pour continuer.
          </p>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => setStep('preview')}
            disabled={!canPreview}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Prévisualiser <ArrowRight size={14} />
          </button>
        </div>
      </div>
    )
  }

  // ── STEP: PREVIEW ─────────────────────────────────────────────
  const retainedFields = mapping.filter(m => m.field !== 'ignore')

  return (
    <div className="card p-6 flex flex-col gap-6 mt-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Prévisualisation</h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-sm text-success font-medium">{toImport.length} leads à importer</span>
            {duplicateCount > 0 && (
              <span className="text-sm text-text-secondary">{duplicateCount} doublons ignorés</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setStep('mapping')}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={14} /> Modifier le mapping
        </button>
      </div>

      {importResult && (
        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg ${
          importResult.failed === 0 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
        }`}>
          <Check size={16} />
          {importResult.success} importés
          {importResult.failed > 0 ? `, ${importResult.failed} échoués` : ' — redirection en cours…'}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {retainedFields.map(m => (
                <th key={m.csvHeader} className="text-left py-2 px-3 text-text-secondary font-medium whitespace-nowrap text-xs">
                  {m.field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {toImport.slice(0, 10).map((lead, i) => (
              <tr key={i} className="border-b border-border/50">
                {retainedFields.map(m => (
                  <td key={m.csvHeader} className="py-2 px-3 text-text-primary truncate max-w-[200px] text-xs">
                    {String((lead as Record<string, unknown>)[m.field] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {toImport.length > 10 && (
          <p className="text-xs text-text-secondary mt-2 px-3">… et {toImport.length - 10} autres lignes</p>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button onClick={resetWizard} className="text-sm text-text-secondary hover:text-text-primary">
          Recommencer
        </button>
        <button
          onClick={handleImport}
          disabled={importing || toImport.length === 0 || !!importResult}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {importing ? 'Import en cours…' : `Importer ${toImport.length} leads`}
        </button>
      </div>
    </div>
  )
}
