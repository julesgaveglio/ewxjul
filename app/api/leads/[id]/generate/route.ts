import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { scrapeBrand } from '@/lib/scraper/brand-scraper'
import { generateSite } from '@/lib/generator/claude-generate'
import { deployToVercel } from '@/lib/generator/vercel-deploy'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const db = createServiceClient()
  const { data: lead, error } = await db.from('leads').select('*').eq('id', params.id).single()
  if (error || !lead) return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 })

  const { data: generating } = await db
    .from('leads')
    .select('id')
    .in('demo_status', ['generating', 'deploying'])
    .limit(1)

  if (generating && generating.length > 0 && generating[0].id !== params.id) {
    return NextResponse.json({ error: 'Une génération est déjà en cours' }, { status: 409 })
  }

  await db.from('leads').update({ demo_status: 'generating', demo_error_message: null }).eq('id', params.id)

  runGenerate(db, params.id, lead).catch(console.error)
  return NextResponse.json({ status: 'started' })
}

async function runGenerate(db: any, leadId: string, lead: any) {
  try {
    // Use existing brand_data if already enriched, otherwise scrape now
    const brandData = lead.brand_data ?? await scrapeBrand(
      lead.company_name, lead.website_url, lead.google_maps_url, lead.phone, lead.address, lead.sector
    )

    const result = await generateSite(brandData)

    await db.from('leads').update({ demo_status: 'deploying' }).eq('id', leadId)

    const deployment = await deployToVercel(lead.company_name, result.files)

    await db.from('leads').update({
      demo_status: 'deployed',
      demo_url: deployment.url,
      demo_generated_at: new Date().toISOString(),
    }).eq('id', leadId)

  } catch (err: any) {
    await db.from('leads').update({
      demo_status: 'error',
      demo_error_message: err.message?.slice(0, 500),
    }).eq('id', leadId)
  }
}
