'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SearchForm } from '@/components/scan/search-form'
import { ScanProgress } from '@/components/scan/scan-progress'
import type { ScrapingJob } from '@/lib/types/database'

export default function ScanPage() {
  const [currentJob, setCurrentJob] = useState<ScrapingJob | null>(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'error') return
    const supabase = createClient()
    const interval = setInterval(async () => {
      const { data } = await supabase.from('scraping_jobs').select('*').eq('id', currentJob.id).single()
      if (data) {
        setCurrentJob(data)
        if (data.status === 'completed' || data.status === 'error') setScanning(false)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [currentJob])

  async function handleScan(city: string, sector: string) {
    setScanning(true)
    const response = await fetch('/api/scan/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, sector }),
    })
    const data = await response.json()
    if (!response.ok) { alert(data.error); setScanning(false); return }
    const supabase = createClient()
    const { data: job } = await supabase.from('scraping_jobs').select('*').eq('id', data.job_id).single()
    setCurrentJob(job)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Scanner des prospects</h1>
      <SearchForm onSubmit={handleScan} disabled={scanning} />
      <ScanProgress job={currentJob} />
    </div>
  )
}
